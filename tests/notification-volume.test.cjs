const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');

test('native loud and quiet sounds respect volume, including zero and live switch from custom',async()=>{
 const dom=new JSDOM('<audio class="loud"></audio><audio class="quiet"></audio>');
 const store={notificationSound:'default',notificationVolume:.35},created=[];let changed;
 const context=vm.createContext({document:dom.window.document,console,URL,chrome:{runtime:{getURL:p=>'chrome-extension://test/'+p,sendMessage:async request=>{created.push(request);return {ok:true};}},storage:{local:{get:async()=>({...store})},onChanged:{addListener:fn=>changed=fn}}},Audio:function(){throw Error('Notification playback must not depend on tab Audio');}});
 vm.runInContext(fs.readFileSync('content/features/custom_sound.js','utf8'),context);
 try{
  await context.applyNotificationSound();const elements=[...dom.window.document.querySelectorAll('audio')];
  for(const e of elements){assert.equal(e.volume,.35);assert.equal(e.muted,false);e.dispatchEvent(new dom.window.Event('play'));}assert.equal(created.length,0);
  store.notificationVolume=0;changed({notificationVolume:{newValue:0}},'local');await context.applyNotificationSound();for(const e of elements){assert.equal(e.volume,0);assert.equal(e.muted,false);}
  Object.assign(store,{notificationSound:'vk',notificationVolume:65});await context.applyNotificationSound();for(const e of elements){assert.equal(e.muted,true);e.dispatchEvent(new dom.window.Event('play'));}assert.equal(created.length,2);assert.ok(created.every(e=>e.action==='fptPlayNotificationSound'));assert.ok(elements.every(e=>e.volume===.65));
  Object.assign(store,{notificationSound:'default',notificationVolume:.2});await context.applyNotificationSound();for(const e of elements){e.volume=1;e.dispatchEvent(new dom.window.Event('play'));assert.equal(e.muted,false);assert.equal(e.volume,.2);}assert.equal(created.length,2);
  const fresh=dom.window.document.createElement('audio');fresh.className='quiet';dom.window.document.body.append(fresh);await context.applyNotificationSound();assert.equal(fresh.volume,.2);assert.equal(fresh.muted,false);
 }finally{dom.window.close();}
});

test('resume and pageshow refresh settings; a failed relay restores native audio without recursion',async()=>{
 const dom=new JSDOM('<audio class="loud"></audio>');const store={notificationSound:'vk',notificationVolume:.2};let calls=0,plays=0;
 const context=vm.createContext({document:dom.window.document,MutationObserver:dom.window.MutationObserver,console,URL,
  chrome:{runtime:{getURL:p=>'chrome-extension://test/'+p,sendMessage:async()=>{calls++;return {ok:false};}},storage:{local:{get:async()=>({...store})},onChanged:{addListener(){}}}}});
 vm.runInContext(fs.readFileSync('content/features/custom_sound.js','utf8'),context);
 const audio=dom.window.document.querySelector('audio');audio.play=async()=>{plays++;audio.dispatchEvent(new dom.window.Event('play'));};
 try{context.initializeCustomSound();context.initializeCustomSound();await context.applyNotificationSound();store.notificationVolume=.7;dom.window.document.dispatchEvent(new dom.window.Event('resume'));await context.applyNotificationSound();assert.equal(audio.volume,.7);
  audio.dispatchEvent(new dom.window.Event('play'));await new Promise(r=>setImmediate(r));assert.equal(calls,1);assert.equal(plays,1);assert.equal(audio.muted,false);assert.equal(audio.volume,.7);
  store.notificationSound='default';dom.window.dispatchEvent(new dom.window.Event('pageshow'));await context.applyNotificationSound();assert.equal(audio.muted,false);
 }finally{dom.window.close();}
});

test('background reads current sound for each event and never accepts caller audio URLs',async()=>{
 const source=fs.readFileSync('background/notification_sound.js','utf8').replace("import { parseOffscreen } from './offscreen_client.js';",'const parseOffscreen=globalThis.soundParse;');
 const store={notificationSound:'vk',notificationVolume:35},requests=[];globalThis.soundParse=async(...args)=>{requests.push(args);return {ok:true};};globalThis.chrome={runtime:{getURL:p=>'chrome-extension://test/'+p},storage:{local:{get:async()=>({...store})}}};
 try{const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));await api.playNotificationSound();assert.equal(requests[0][2].volume,.35);assert.match(requests[0][2].url,/vk.mp3$/);
  store.notificationSound='tg';await api.playNotificationSound();assert.match(requests[1][2].url,/telegram.mp3$/);
  store.notificationVolume=0;assert.equal((await api.playNotificationSound()).silent,true);assert.equal(requests.length,2);
  store.notificationSound='custom';store.fpToolsCustomSoundData='https://attacker.invalid/audio.mp3';assert.equal((await api.playNotificationSound()).native,true);
 }finally{delete globalThis.soundParse;delete globalThis.chrome;}
});

test('offscreen audio cleans up on completion and refuses arbitrary remote sources',async()=>{
 const created=[],timers=new Map();let timer=0;
 const context=vm.createContext({chrome:{runtime:{getURL:p=>'chrome-extension://test/'+p}},setTimeout:fn=>{timers.set(++timer,fn);return timer;},clearTimeout:id=>timers.delete(id),Audio:function(url){this.src=url;this.play=()=>Promise.resolve();this.pause=()=>{this.paused=true;};this.removeAttribute=()=>{this.src='';};this.load=()=>{};created.push(this);}});
 vm.runInContext(fs.readFileSync('offscreen/notification_audio.js','utf8'),context);
 assert.equal((await context.fptPlayNotificationAudio({url:'https://attacker.invalid/sound'})).ok,false);
 const task=context.fptPlayNotificationAudio({url:'chrome-extension://test/sounds/vk.mp3',volume:.4});await Promise.resolve();assert.equal(created[0].volume,.4);created[0].onended();assert.equal((await task).ok,true);assert.equal(created[0].src,'');assert.equal(timers.size,0);
});

test('parser lifecycle does not recycle a document while notification audio is playing',async()=>{
 let now=0,closed=0;const context=vm.createContext({Date:{now:()=>now},chrome:{runtime:{getURL:p=>p,getContexts:async()=>[{}],sendMessage:async()=>({ok:true})},offscreen:{closeDocument:async()=>closed++,createDocument:async()=>{}}}});
 vm.runInContext(fs.readFileSync('background/offscreen_client.js','utf8').replace(/export /g,''),context);
 now=599999;await context.parseOffscreen('','fptPlayNotificationSound',{url:'fixture'});now=600001;await context.ensureParser();assert.equal(closed,0);
 await context.parseOffscreen('fixture','parseSalesPage');assert.equal(closed,0);
 now=630001;await context.ensureParser();assert.equal(closed,1);
});

test('site volume reader matches percent migration and rejects non-finite values',()=>{
 const context=vm.createContext({});vm.runInContext(fs.readFileSync('content/ui/settings_loader.js','utf8'),context);
 for(const [input,expected]of [[35,.35],[100,1],[.35,.35],[0,0],[-1,0],[101,1],[NaN,1],[Infinity,1],[undefined,1]])assert.equal(context.fptNotificationVolume(input),expected);
});
