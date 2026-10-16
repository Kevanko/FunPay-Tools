import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { createLoginTransfer, trustedLoginSender } = await import('data:text/javascript;base64,' + Buffer.from(readFileSync('background/login_transfer.js')).toString('base64'));
const auth = { userId: 424242, username: 'Тест QR', golden_key: 'fixture_session_only_0123456789' };
async function decode(value, code = value.code) {
 const e = JSON.parse(value.qr.slice('FPTLOGIN1:'.length));
 const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(code.replaceAll('-', '')), 'PBKDF2', false, ['deriveKey']);
 const key = await crypto.subtle.deriveKey({ name:'PBKDF2', salt:Buffer.from(e.salt,'base64'), iterations:210000, hash:'SHA-256' }, material, { name:'AES-GCM', length:256 }, false, ['decrypt']);
 return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(e.iv,'base64'),additionalData:new TextEncoder().encode('FPTLOGIN1:')},key,Buffer.from(e.ct,'base64'))));
}
test('login QR encrypts session and expires in five minutes, separate code is not embedded', async () => {
 const now=1700000000000,value=await createLoginTransfer(auth,now),decoded=await decode(value);
 assert.equal(decoded.golden_key,auth.golden_key);assert.equal(decoded.uid,'424242');assert.equal(decoded.issued,now);assert.equal(decoded.expires,now+300000);
 assert.match(value.code,/^[A-HJ-NP-Z2-9]{4}(?:-[A-HJ-NP-Z2-9]{4}){3}$/);assert.ok(!value.qr.includes(auth.golden_key));assert.ok(!value.qr.includes(value.code));
 assert.notEqual((await createLoginTransfer(auth,now)).qr,value.qr);
 await assert.rejects(decode(value,'AAAA-AAAA-AAAA-AAAA'));
 const e=JSON.parse(value.qr.slice(10));e.ct=e.ct.slice(0,-5)+'AAAAA';await assert.rejects(decode({...value,qr:'FPTLOGIN1:'+JSON.stringify(e)}));
});
test('unauthenticated or malformed session never produces QR', async () => {
 for(const bad of [{},{...auth,userId:0},{...auth,golden_key:'bad; Path=/'},{...auth,userId:'other'}])await assert.rejects(createLoginTransfer(bad));
});
test('QR carries only encrypted account-bound sync capability and rejects another account',async()=>{
 const cloud={schema:1,accountId:String(auth.userId),id:'p_'+'a'.repeat(64),token:'b'.repeat(64)};
 const value=await createLoginTransfer(auth,1700000000000,cloud),decoded=await decode(value);
 assert.deepEqual(decoded.cloud,cloud);assert.ok(!value.qr.includes(cloud.token));
 await assert.rejects(createLoginTransfer(auth,1700000000000,{...cloud,accountId:'43'}));
});
test('session export allowed only from own popup, never site content scripts', () => {
 const runtime={id:'fixture',getURL:p=>'chrome-extension://fixture/'+p},sender={id:'fixture',url:'chrome-extension://fixture/popup/popup.html'};
 assert.equal(trustedLoginSender(sender,runtime),true);
 assert.equal(trustedLoginSender({...sender,tab:{}},runtime),true);
 assert.equal(trustedLoginSender({...sender,url:runtime.getURL('popup/phone.html')},runtime),true);
 for(const bad of [{...sender,id:'other'},{...sender,url:'https://funpay.com/'},{...sender,url:sender.url+'?x'},{}])assert.equal(trustedLoginSender(bad,runtime),false);
});
