import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync('background/app_updates.js','utf8');
const module=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('release comparison handles patch, minor and malformed versions',()=>{
 assert.equal(module.newerVersion('3.14.2','3.14.1'),true);
 assert.equal(module.newerVersion('3.14.2','3.14.2'),false);
 assert.equal(module.newerVersion('3.14.2','3.15.0'),false);
 assert.equal(module.newerVersion('3.100.0','3.99.9'),true);
 assert.equal(module.newerVersion('invalid','3.14.2'),false);
});
test('managed update installs through native host, preserves failure reporting and coalesces checks',async()=>{
 const previous={fetch:globalThis.fetch,chrome:globalThis.chrome,setTimeout:globalThis.setTimeout};let failed=false,reloads=0,requests=0;const saved=[];
 globalThis.setTimeout=callback=>{callback();return 0;};
 globalThis.chrome={runtime:{getManifest:()=>({version:'3.14.1'}),reload:()=>reloads++,sendNativeMessage:async(host,{action})=>{assert.equal(host,'tools.funpay.updater');return action==='status'?{ok:true,managed:true}:failed?{ok:false,error:'SHA256 mismatch'}:{ok:true,version:'3.14.2'};}},storage:{local:{set:async v=>saved.push(v)}},action:{setBadgeText:async()=>{},setBadgeBackgroundColor:async()=>{}}};
 globalThis.fetch=async()=>{requests++;return {ok:true,text:async()=>JSON.stringify({extension:{version:'3.14.2',url:'https://github.com/Kevanko/FunPay-Tools/releases/download/v3.14.2/extension.zip'}})};};
 try{
  const [a,b]=await Promise.all([module.checkAppUpdate(),module.checkAppUpdate()]);assert.equal(a,b);assert.equal(requests,1);assert.equal(a.installed,true);assert.equal(reloads,1);
  failed=true;const update=await module.checkAppUpdate();assert.equal(update.available,true);assert.equal(update.installError,'SHA256 mismatch');assert.equal(reloads,1);assert.equal(saved.length,2);
 }finally{Object.assign(globalThis,previous);}
});
test('available update sets badge; current release clears it; invalid asset is rejected',async()=>{
 const previous={fetch:globalThis.fetch,chrome:globalThis.chrome};const state={};
 globalThis.chrome={runtime:{getManifest:()=>({version:'3.14.1'})},storage:{local:{set:async value=>Object.assign(state,value)}},action:{setBadgeText:async value=>state.badge=value.text,setBadgeBackgroundColor:async()=>{}}};
 const release={version:'3.14.2',url:'https://github.com/Kevanko/FunPay-Tools/releases/download/v3.14.2/FunPay-Tools-3.14.2.zip'};
 globalThis.fetch=async()=>({ok:true,text:async()=>JSON.stringify({extension:release})});
 try{assert.equal((await module.checkAppUpdate()).available,true);assert.equal(state.badge,'NEW');globalThis.chrome.runtime.getManifest=()=>({version:'3.14.2'});assert.equal((await module.checkAppUpdate()).available,false);assert.equal(state.badge,'');release.url='https://example.com/file.zip';await assert.rejects(module.checkAppUpdate(),/Неверная ссылка/);}finally{Object.assign(globalThis,previous);}
});
