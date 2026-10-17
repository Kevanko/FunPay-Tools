import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { createLoginTransfer, createQuickLoginTransfer, trustedLoginSender } = await import('data:text/javascript;base64,' + Buffer.from(readFileSync('background/login_transfer.js')).toString('base64'));
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

async function decodeQuick(transfer){
 const envelope=JSON.parse(transfer.qr.slice('FPTLOGIN2:'.length));
 const key=await crypto.subtle.importKey('raw',Buffer.from(envelope.key,'base64'),'AES-GCM',false,['decrypt']);
 const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(envelope.iv,'base64'),additionalData:new TextEncoder().encode('FPTLOGIN2:')},key,Buffer.from(envelope.ct,'base64'));
 const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
 return JSON.parse(await new Response(stream).text());
}
test('scan-only QR carries both accounts and settings without a separately typed code',async()=>{
 const second={uid:'424243',name:'Second',golden_key:'fixture_second_session_0123456789',settings:{autoBumpEnabled:true}};
 const transfer=await createQuickLoginTransfer({...auth,settings:{fpToolsTheme:{sitePreset:'clay'}}},[second],1700000000000);
 const value=await decodeQuick(transfer);assert.equal(transfer.code,undefined);assert.equal(transfer.accounts,2);
 assert.equal(value.accounts[0].uid,'424242');assert.equal(value.accounts[1].uid,'424243');assert.equal(value.accounts[1].settings.autoBumpEnabled,true);assert.equal(value.expires,1700000300000);
 assert.ok(!transfer.qr.includes(auth.golden_key));assert.ok(!transfer.qr.includes(second.golden_key));
});
test('scan-only QR payload keeps only uid,name,issued,expires,accounts at top level',async()=>{
 const value=await decodeQuick(await createQuickLoginTransfer({...auth,settings:{autoBumpEnabled:true},cookies:{golden_seal:'a.b'}},[],1700000000000,{schema:1}));
 assert.deepEqual(Object.keys(value).sort(),['accounts','expires','issued','name','uid']);
 assert.equal(value.accounts[0].settings.autoBumpEnabled,true);
});
test('scan-only QR drops heavy media then refuses honestly when still too large',async()=>{
 const noise=()=>Buffer.from(crypto.getRandomValues(new Uint8Array(65536))).toString('base64');
 const heavy={fpToolsTheme:{sitePreset:'clay',bgImage:'data:image/png;base64,'+noise()}};
 const value=await decodeQuick(await createQuickLoginTransfer({...auth,settings:heavy},[],1700000000000));
 assert.ok(value.accounts[0].settings.fpToolsTheme.bgImage==='');assert.equal(value.accounts[0].settings.fpToolsTheme.sitePreset,'clay');
 await assert.rejects(createQuickLoginTransfer({...auth,settings:{fpToolsUserNotes:noise()}}),/файлом \.fpconfig/);
});
test('scan-only QR validates accounts and deduplicates primary',async()=>{
 assert.equal((await createQuickLoginTransfer(auth,[{uid:'424242',golden_key:auth.golden_key}])).accounts,1);
 await assert.rejects(createQuickLoginTransfer(auth,[{uid:'no',golden_key:auth.golden_key}]));
 await assert.rejects(createQuickLoginTransfer(auth,Array.from({length:8},(_,i)=>({uid:String(100+i),golden_key:auth.golden_key}))));
});

test('login QR encrypts only supported session cookies and strips header injection', async () => {
 const cookies={golden_seal:'v1.fixture-seal.123',PHPSESSID:'fixture%2Csession',analytics:'private-tracking',evil:'x; Path=/'};
 const value=await createLoginTransfer({...auth,cookies}),decoded=await decode(value);
 assert.deepEqual(decoded.cookies,{golden_seal:cookies.golden_seal,PHPSESSID:cookies.PHPSESSID});
 assert.ok(!value.qr.includes(cookies.golden_seal));
 const invalid=await decode(await createLoginTransfer({...auth,cookies:{golden_seal:'x; Path=/',PHPSESSID:'x\r\nCookie: bad'}}));
 assert.deepEqual(invalid.cookies,{});
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
