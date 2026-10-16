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
 assert.equal((await provider.saveAIConnection({provider:'groq',model:'invalid model',apiKey:key})).success,false);
});

test('custom providers normalize base URLs, use their own models and never receive Groq-only options',async()=>{
 reset();await configure();
 const config=await provider.saveAIConnection({provider:'custom',baseUrl:'https://example.test/proxy/v1/chat/completions/',model:'glm-5.3',apiKey:'sk_TEST_CUSTOM'});
 assert.equal(config.success,true);assert.equal(config.baseUrl,'https://example.test/proxy/v1');assert.equal(JSON.stringify(config).includes('sk_TEST_CUSTOM'),false);
 await provider.requestGroq('Превет','editor');const {url,options}=calls[0],payload=JSON.parse(options.body);
 assert.equal(url,'https://example.test/proxy/v1/chat/completions');assert.equal(options.headers.Authorization,'Bearer sk_TEST_CUSTOM');assert.equal(payload.model,'glm-5.3');assert.equal(payload.max_tokens,2048);assert.equal('include_reasoning' in payload,false);assert.equal('reasoning_effort' in payload,false);
});

test('paid presets use fixed API destinations, compatible token limits and a clear insufficient-balance error',async()=>{
 for(const [id,base] of [['openai','https://api.openai.com/v1'],['openrouter','https://openrouter.ai/api/v1'],['deepseek','https://api.deepseek.com/v1'],['plakcel','https://api.plakcel.xyz/v1']]){
  reset();await provider.saveAIConnection({provider:id,baseUrl:'https://wrong.test/v1',model:'test-model',apiKey:'sk_TEST_PAID'});await provider.requestGroq('hello','editor');
  assert.equal(calls[0].url,base+'/chat/completions');const body=JSON.parse(calls[0].options.body);assert.equal(body[id==='openai'?'max_completion_tokens':'max_tokens'],2048);assert.equal(body.include_reasoning,undefined);
  reply={ok:false,status:402};assert.match((await provider.requestGroq('hello','editor')).error,/Недостаточно/);
 }
});

test('saved connections isolate credentials by provider and endpoint, including after restart and key removal',async()=>{
 reset();await configure();
 await provider.saveAIConnection({provider:'custom',baseUrl:'https://one.test/v1',model:'one',apiKey:''});assert.equal(saved.apiKey,'');
 await provider.saveAIConnection({provider:'custom',baseUrl:'https://one.test/v1',model:'one',apiKey:'sk_ONE'});
 await provider.saveAIConnection({provider:'custom',baseUrl:'https://two.test/v1',model:'two',apiKey:'sk_TWO'});
 await provider.saveAIConnection({provider:'custom',baseUrl:'https://one.test/v1',model:'one',apiKey:''});assert.equal(saved.apiKey,'sk_ONE');
 await provider.saveAIConnection({provider:'custom',baseUrl:'https://one.test/v1',model:'one',clearKey:true});assert.equal(saved.apiKey,'');
 await provider.saveAIConnection({provider:'groq',model:provider.AI_MODELS[0]});assert.equal(saved.apiKey,key);
 const status=await provider.aiConnectionStatus();assert.equal(status.connections.length,3);assert.equal(JSON.stringify(status).includes('sk_TWO'),false);
});

test('provider endpoints reject page links, credentials, insecure remote HTTP and query keys without storing or sending',async()=>{
 reset();for(const baseUrl of ['https://example.test/k/PRIVATE','https://user:pass@example.test/v1','https://example.test/v1?key=PRIVATE','http://example.test/v1','file:///tmp/api','https://example.test/v1#secret'])assert.equal((await provider.saveAIConnection({provider:'custom',baseUrl,model:'m',apiKey:'SECRET'})).success,false);
 assert.equal(saved,undefined);assert.equal(calls.length,0);assert.equal(provider.normalizeAIEndpoint('http://localhost:11434/v1/'),'http://localhost:11434/v1');
});

test('model discovery uses only the saved endpoint and filters malformed IDs; missing model never spends a generation',async()=>{
 reset();await provider.saveAIConnection({provider:'custom',baseUrl:'https://example.test/v1',model:'',apiKey:'sk_MODELS'});
 assert.equal((await provider.requestGroq('hello','editor')).success,false);assert.equal(calls.length,0);
 reply={ok:true,json:async()=>({data:[{id:'glm-5.3'},{id:'glm-5.3'},{id:'<script>'},{id:42}]})};assert.deepEqual(await provider.listAIModels(),{success:true,models:['glm-5.3']});assert.equal(calls[0].url,'https://example.test/v1/models');assert.equal(calls[0].options.redirect,'error');
 permission=false;assert.equal((await provider.listAIModels()).success,false);assert.equal(calls.length,1);
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
