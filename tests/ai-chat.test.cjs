const {test}=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),fs=require('node:fs'),vm=require('node:vm');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const dom=new JSDOM('<body data-app-data=\'{"userId":42}\'><span class="user-link-name">Seller</span><div class="chat chat-full"><div class="chat-msg-item"><span class="chat-msg-author-link">Buyer</span><span class="chat-msg-text">Вопрос покупателя</span></div><form><input name="node" value="7"><div class="chat-form-input"><textarea class="form-control"></textarea></div><div class="chat-form-attach"></div><button type="submit">Отправить</button></form></div></body>',{url:'https://funpay.com/chat/?node=7'});
 const {window}=dom,requests=[],notifications=[];let submitted=0;
 const context=vm.createContext({window,document:window.document,location:window.location,Event:window.Event,aiModeActive:true,console:{error:()=>{}},FPTIcons:{svg:()=>'<svg aria-hidden="true"></svg>'},showNotification:message=>notifications.push(message),createElement:(tag,attributes={})=>{const node=window.document.createElement(tag);for(const [name,value]of Object.entries(attributes))node.setAttribute(name,value);return node;},chrome:{runtime:{getURL:path=>path,sendMessage:request=>new Promise((resolve,reject)=>requests.push({request,resolve,reject}))},storage:{local:{set:async()=>{},get:async()=>({fpToolsTemplateSettings:{sendTemplatesImmediately:true}})}}}});
 vm.runInContext(fs.readFileSync('content/features/ai_chat.js','utf8'),context);context.setupAIChatFeature();
 const input=window.document.querySelector('textarea'),button=window.document.getElementById('aiModeToggleBtn');
 window.document.querySelector('form').addEventListener('submit',event=>{event.preventDefault();submitted++;});
 const enter=(options={})=>{const event=new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true,...options});input.dispatchEvent(event);return event;};
 return {dom,window,context,input,button,requests,notifications,enter,submitted:()=>submitted};
}
test('rewrite intercepts site Enter, uses full-page context, and sends only after confirmation',async()=>{
 const f=fixture();try{let nativeEnter=0;f.window.document.addEventListener('keydown',()=>nativeEnter++);f.input.value='Превет';
 assert.equal(f.enter().defaultPrevented,true);assert.equal(nativeEnter,0);assert.equal(f.submitted(),0);assert.equal(f.requests.length,1);
 assert.match(f.requests[0].request.context,/Buyer: Вопрос покупателя/);assert.equal(f.button.getAttribute('aria-busy'),'true');
 f.enter();assert.equal(f.requests.length,1);
 f.requests[0].resolve({success:true,data:'Привет'});await flush();assert.equal(f.input.value,'Привет');assert.equal(f.input.disabled,false);assert.equal(f.button.hasAttribute('aria-busy'),false);assert.equal(f.submitted(),0);
 f.enter();assert.equal(f.submitted(),1);assert.equal(f.requests.length,1);
 }finally{f.dom.window.close();}
});
test('failed and malformed AI responses preserve the exact draft and release loading controls',async()=>{
 for(const response of [{success:false,error:'Модель недоступна'},{success:true,data:{}},{success:true,data:'  '}]){
  const f=fixture();try{const draft='  Не меняй пробелы\n\n';f.input.value=draft;f.enter();f.requests[0].resolve(response);await flush();
  assert.equal(f.input.value,draft);assert.equal(f.input.disabled,false);assert.equal(f.input.classList.contains('ai-loading-textarea'),false);assert.equal(f.submitted(),0);assert.equal(f.notifications.length,1);assert.ok(!f.notifications[0].includes('undefined'));
  }finally{f.dom.window.close();}
 }
});
test('a disconnected extension leaves the draft editable',async()=>{
 const f=fixture();try{f.input.value='Черновик';f.enter();f.requests[0].reject(new Error('port closed'));await flush();assert.equal(f.input.value,'Черновик');assert.equal(f.input.disabled,false);assert.equal(f.submitted(),0);}finally{f.dom.window.close();}
});
test('late rewrite is ignored after chat switch, account switch, edit, mode toggle or composer removal',async()=>{
 for(const change of [f=>{f.window.document.querySelector('input[name=node]').value='8';},f=>{f.window.document.body.dataset.appData='{"userId":43}';},f=>{f.input.value='Другой черновик';},f=>f.button.click(),f=>f.input.remove()]){
  const f=fixture();try{f.input.value='Оригинал';f.enter();change(f);const draft=f.input.value;f.requests[0].resolve({success:true,data:'Устаревший ответ'});await flush();assert.equal(f.input.value,draft);assert.equal(f.submitted(),0);assert.equal(f.input.disabled,false);}finally{f.dom.window.close();}
 }
});
test('editing the suggestion requires a new rewrite; Shift+Enter and IME do not request AI',async()=>{
 const f=fixture();try{f.input.value='Превет';assert.equal(f.enter({shiftKey:true}).defaultPrevented,false);assert.equal(f.enter({isComposing:true}).defaultPrevented,false);assert.equal(f.requests.length,0);
 f.enter();f.requests[0].resolve({success:true,data:'Привет'});await flush();f.input.value='Привет ещё';f.input.dispatchEvent(new f.window.Event('input',{bubbles:true}));f.enter();assert.equal(f.requests.length,2);assert.equal(f.submitted(),0);f.requests[1].resolve({success:false,error:'offline'});await flush();
 }finally{f.dom.window.close();}
});
test('a suggestion from a previous chat cannot authorize sending in the next chat',async()=>{
 const f=fixture();try{f.input.value='Превет';f.enter();f.requests[0].resolve({success:true,data:'Привет'});await flush();
 f.window.document.querySelector('input[name=node]').value='8';f.enter();assert.equal(f.submitted(),0);assert.equal(f.requests.length,2);f.requests[1].resolve({success:false,error:'offline'});await flush();
 }finally{f.dom.window.close();}
});
test('an unavailable AI variable aborts immediate template text and image sending',async()=>{
 const f=fixture();try{vm.runInContext(fs.readFileSync('content/features/templates.js','utf8'),f.context);f.input.value='Мой черновик';
 const task=f.context.useTemplate({text:'Ответ: {ai:Приветствие}',images:['data:image/png;base64,FIXTURE']});await flush();assert.equal(f.requests.length,1);assert.equal(f.requests[0].request.action,'getAIProcessedText');f.requests[0].resolve({success:false,error:'Модель недоступна'});await task;
 assert.equal(f.input.value,'Мой черновик');assert.equal(f.input.disabled,false);assert.equal(f.submitted(),0);assert.equal(f.requests.length,1);
 }finally{f.dom.window.close();}
});
