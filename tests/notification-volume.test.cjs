const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');

test('native loud and quiet sounds respect volume, including zero and live switch from custom',async()=>{
 const dom=new JSDOM('<audio class="loud"></audio><audio class="quiet"></audio>');
 const store={notificationSound:'default',notificationVolume:.35},created=[];let changed;
 const context=vm.createContext({document:dom.window.document,console,URL,chrome:{runtime:{getURL:p=>'chrome-extension://test/'+p},storage:{local:{get:async()=>({...store})},onChanged:{addListener:fn=>changed=fn}}},Audio:function(url){this.src=url;this.play=()=>{created.push(this);return Promise.resolve();};}});
 vm.runInContext(fs.readFileSync('content/features/custom_sound.js','utf8'),context);
 try{
  await context.applyNotificationSound();const elements=[...dom.window.document.querySelectorAll('audio')];
  for(const e of elements){assert.equal(e.volume,.35);assert.equal(e.muted,false);e.dispatchEvent(new dom.window.Event('play'));}assert.equal(created.length,0);
  store.notificationVolume=0;changed({notificationVolume:{newValue:0}},'local');await context.applyNotificationSound();for(const e of elements){assert.equal(e.volume,0);assert.equal(e.muted,false);}
  Object.assign(store,{notificationSound:'vk',notificationVolume:65});await context.applyNotificationSound();for(const e of elements){assert.equal(e.muted,true);e.dispatchEvent(new dom.window.Event('play'));}assert.equal(created.length,2);assert.ok(created.every(e=>e.volume===.65));
  Object.assign(store,{notificationSound:'default',notificationVolume:.2});await context.applyNotificationSound();for(const e of elements){e.volume=1;e.dispatchEvent(new dom.window.Event('play'));assert.equal(e.muted,false);assert.equal(e.volume,.2);}assert.equal(created.length,2);
  const fresh=dom.window.document.createElement('audio');fresh.className='quiet';dom.window.document.body.append(fresh);await context.applyNotificationSound();assert.equal(fresh.volume,.2);assert.equal(fresh.muted,false);
 }finally{dom.window.close();}
});

test('site volume reader matches percent migration and rejects non-finite values',()=>{
 const context=vm.createContext({});vm.runInContext(fs.readFileSync('content/ui/settings_loader.js','utf8'),context);
 for(const [input,expected]of [[35,.35],[100,1],[.35,.35],[0,0],[-1,0],[101,1],[NaN,1],[Infinity,1],[undefined,1]])assert.equal(context.fptNotificationVolume(input),expected);
});
