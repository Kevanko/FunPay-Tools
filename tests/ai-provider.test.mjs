import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source = fs.readFileSync('background/ai_provider.js', 'utf8');
const provider = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
let saved, calls = [], permission = true, reply;
globalThis.chrome = {permissions:{contains:async()=>permission}};
globalThis.indexedDB = {open(){const open={};queueMicrotask(()=>{open.result={close(){},transaction(){const tx={objectStore(){return {get(){return request(false);},put(value){return request(true,value);}};}};function request(write,value){const r={};queueMicrotask(()=>{if(write)saved=structuredClone(value);r.result=write?'connection':structuredClone(saved);r.onsuccess?.();tx.oncomplete?.();});return r;}return tx;}};open.onsuccess();});return open;}};
globalThis.fetch = async (url,options)=>{calls.push({url,options});return reply;};
function reset(){saved=undefined;calls=[];permission=true;reply={ok:true,json:async()=>({choices:[{message:{content:'Привет'},finish_reason:'stop'}]})};}
const key='gsk_TEST_NOT_A_REAL_KEY';
const configure=()=>provider.saveAIConnection({provider:'groq',model:provider.AI_MODELS[0],apiKey:key});

test('Groq requires a local key, never silently calls the author server',async()=>{
 reset();assert.match((await provider.requestGroq('test','editor')).error,/Подключите/);assert.equal(calls.length,0);
});
test('configuration never returns credentials; empty update preserves key and delete removes it',async()=>{
 reset();const status=await configure();assert.equal(status.configured,true);assert.equal(JSON.stringify(status).includes(key),false);
 await provider.saveAIConnection({provider:'groq',model:provider.AI_MODELS[1],apiKey:''});assert.equal(saved.apiKey,key);
 await provider.saveAIConnection({provider:'groq',model:provider.AI_MODELS[1],clearKey:true});assert.equal((await provider.aiConnectionStatus()).configured,false);
 assert.equal((await provider.saveAIConnection({provider:'groq',model:'unknown',apiKey:key})).success,false);
});
test('requests go directly to Groq with credentials omitted, redirects rejected and bounded output',async()=>{
 reset();await configure();assert.deepEqual(await provider.requestGroq(' Превет ','editor'),{success:true,data:'Привет'});
 assert.equal(calls.length,1);const {url,options}=calls[0];assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');
 const payload=JSON.parse(options.body);assert.equal(payload.model,provider.AI_MODELS[0]);assert.equal(payload.messages[1].content,'Превет');assert.equal(payload.include_reasoning,false);assert.equal(payload.max_completion_tokens,2048);
});
test('permission denial and oversized requests do not send text anywhere',async()=>{
 reset();await configure();permission=false;assert.equal((await provider.requestGroq('test','editor')).success,false);permission=true;
 assert.equal((await provider.requestGroq('x'.repeat(18001),'editor')).success,false);assert.equal(calls.length,0);
});
test('quota, rejected credentials, truncated and malformed output remain errors without leaking provider bodies',async()=>{
 reset();await configure();
 for(const status of [400,401,403,404,413,429,500]){reply={ok:false,status,json:async()=>({secret:key})};const result=await provider.requestGroq('test','editor');assert.equal(result.success,false);assert.equal(JSON.stringify(result).includes(key),false);if(status===429)assert.match(result.error,/квота/);}
 for(const choice of [{message:{content:{}}},{message:{content:''}},{message:{content:'partial'},finish_reason:'length'}]){reply={ok:true,json:async()=>({choices:[choice]})};assert.equal((await provider.requestGroq('test','editor')).success,false);}
});
test('only explicit author selection permits legacy transport and only settings page can edit credentials',async()=>{
 reset();await provider.saveAIConnection({provider:'author',model:provider.AI_MODELS[0]});assert.equal(await provider.requestGroq('test','editor'),null);assert.equal(calls.length,0);
 const runtime={id:'test',getURL:path=>'chrome-extension://test/'+path};
 assert.equal(provider.isAISettingsSender({id:'test',url:runtime.getURL('popup/ai.html')},runtime),true);
 for(const url of ['https://funpay.com/','chrome-extension://other/popup/ai.html',runtime.getURL('popup/ai.html')+'?evil'])assert.equal(provider.isAISettingsSender({id:'test',url},runtime),false);
});
