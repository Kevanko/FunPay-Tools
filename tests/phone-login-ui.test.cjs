const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');

function screen(response){
 const dom=new JSDOM('<main id="root"></main>',{url:'chrome-extension://fixture/popup/popup.html',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.TextEncoder=TextEncoder;w.HTMLCanvasElement.prototype.getContext=()=>({createImageData:(x,y)=>({data:new Uint8ClampedArray(x*y*4)}),putImageData(){},clearRect(){}});
 w.chrome={runtime:{getURL:path=>'chrome-extension://fixture/'+path,sendMessage:async()=>response}};
 w.eval(fs.readFileSync('popup/phone_transfer.bundle.js','utf8'));return dom;
}
test('missing account leaves login QR hidden and allows retry',async()=>{
 const dom=screen({ok:false,error:'Сначала войдите в FunPay'}),w=dom.window;
 try{await w.FPTPhoneTransfer.mount(w.document.querySelector('#root'),{});await w.document.querySelector('#login-create').onclick();assert.equal(w.document.querySelector('#login-transfer').hidden,true);assert.equal(w.document.querySelector('#login-code'),null);assert.equal(w.document.querySelector('#login-create').disabled,false);assert.match(w.document.querySelector('#login-status').textContent,/Сначала войдите/);}finally{w.close();}
});
test('scan-only login has no code field and hides session QR when extension loses visibility',async()=>{
 const dom=screen({ok:true,qr:'FPTLOGIN2:synthetic-fixture',accounts:2,expires:Date.now()+300000}),w=dom.window;
 try{await w.FPTPhoneTransfer.mount(w.document.querySelector('#root'),{});await w.document.querySelector('#login-create').onclick();assert.equal(w.document.querySelector('#login-transfer').hidden,false);assert.equal(w.document.querySelector('#login-code'),null);assert.match(w.document.querySelector('#login-position').textContent,/Наведите/);Object.defineProperty(w.document,'hidden',{value:true,configurable:true});w.document.dispatchEvent(new w.Event('visibilitychange'));assert.equal(w.document.querySelector('#login-transfer').hidden,true);assert.equal(w.document.querySelector('#login-code'),null);assert.equal(w.document.querySelector('#login-create').disabled,false);}finally{w.close();}
});

test('failed settings encoding hides empty canvas and exposes a readable error',async()=>{
 const dom=screen({ok:false}),w=dom.window;w.chrome.storage={local:{get:async()=>({})}};w.chrome.runtime.getManifest=()=>({version:'test'});w.FPTSettingsSchema={encode(){throw Error('Слишком большой файл настроек');}};
 try{await w.FPTPhoneTransfer.mount(w.document.querySelector('#root'),{});await w.document.querySelector('#show-transfer').onclick();assert.equal(w.document.querySelector('#settings-qr').hidden,true);assert.match(w.document.querySelector('#qr-position').textContent,/Слишком большой/);assert.equal(w.document.querySelector('#qr-next').hidden,true);assert.ok(w.document.querySelector('#settings-file'));}finally{w.close();}
});

test('site login button requests a trusted extension page instead of exposing login data in site DOM',async()=>{
 const dom=screen({ok:true}),w=dom.window;dom.reconfigure({url:'https://funpay.com/'});const requests=[];w.chrome.runtime.sendMessage=async value=>{requests.push(value);return {success:true};};
 try{await w.FPTPhoneTransfer.mount(w.document.querySelector('#root'),{});await w.document.querySelector('#login-create').onclick();assert.equal(requests[0].action,'fptOpenSettingsPanel');assert.equal(requests[0].panel,'phone');assert.equal(w.document.querySelector('#login-transfer').hidden,true);}finally{w.close();}
});

test('oversized media can be explicitly omitted without losing ordinary settings',async()=>{
 const dom=screen({ok:false}),w=dom.window;let transferred;
 w.crypto.randomUUID=()=> 'fixture-transfer';w.chrome.storage={local:{get:async()=>({fpToolsTheme:{font:'Consolas',bgImage:'data:image/png;base64,LARGE'},autoBumpCooldown:30})}};w.chrome.runtime.getManifest=()=>({version:'test'});
 w.FPTSettingsSchema={encode(data){if(data.fpToolsTheme.bgImage)throw Error('Используйте файл');transferred=data;return JSON.stringify(data);}};
 try{await w.FPTPhoneTransfer.mount(w.document.querySelector('#root'),{});w.document.querySelector('#settings-include-media').checked=true;await w.document.querySelector('#show-transfer').onclick();assert.equal(w.document.querySelector('#settings-light').hidden,false);await w.document.querySelector('#settings-light').onclick();assert.equal(w.document.querySelector('#settings-qr').hidden,false);assert.equal(transferred.fpToolsTheme.font,'Consolas');assert.equal(transferred.fpToolsTheme.bgImage,'');assert.equal(transferred.autoBumpCooldown,30);assert.match(w.document.querySelector('#qr-position').textContent,/не включены/);}finally{w.close();}
});
