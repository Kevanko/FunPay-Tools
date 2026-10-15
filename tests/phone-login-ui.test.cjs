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
 try{await w.FPTPhoneTransfer.mount(w.document.querySelector('#root'),{});await w.document.querySelector('#login-create').onclick();assert.equal(w.document.querySelector('#login-transfer').hidden,true);assert.equal(w.document.querySelector('#login-code').textContent,'');assert.equal(w.document.querySelector('#login-create').disabled,false);assert.match(w.document.querySelector('#login-status').textContent,/Сначала войдите/);}finally{w.close();}
});
test('hiding extension clears both session QR and separate code from DOM',async()=>{
 const dom=screen({ok:true,qr:'FPTLOGIN1:synthetic-fixture',code:'ABCD-EFGH-JKLM-NPQR',expires:Date.now()+300000}),w=dom.window;
 try{await w.FPTPhoneTransfer.mount(w.document.querySelector('#root'),{});await w.document.querySelector('#login-create').onclick();assert.equal(w.document.querySelector('#login-transfer').hidden,false);assert.match(w.document.querySelector('#login-code').textContent,/ABCD/);Object.defineProperty(w.document,'hidden',{value:true,configurable:true});w.document.dispatchEvent(new w.Event('visibilitychange'));assert.equal(w.document.querySelector('#login-transfer').hidden,true);assert.equal(w.document.querySelector('#login-code').textContent,'');assert.equal(w.document.querySelector('#login-create').disabled,false);}finally{w.close();}
});
