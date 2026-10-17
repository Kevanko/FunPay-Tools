const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('content/content_script.js','utf8');
const listenerSource=source.slice(source.lastIndexOf('chrome.runtime.onMessage.addListener((request,sender,reply)=>{'));

async function request({sender='extension',status=200}={}){
 const dom=new JSDOM('<body data-app-data="{&quot;userId&quot;:111,&quot;csrf-token&quot;:&quot;old&quot;}">');
 let listener,calls=0;
 vm.runInNewContext(listenerSource,{chrome:{runtime:{id:'extension',onMessage:{addListener:fn=>listener=fn}}},document:dom.window.document,DOMParser:dom.window.DOMParser,AbortSignal,fetch:async(url,options)=>{
  calls++;assert.equal(url,'https://funpay.com/chat/');assert.equal(options.credentials,'include');assert.equal(options.cache,'no-store');
  return {ok:status===200,text:async()=>'<body data-app-data="{&quot;userId&quot;:222,&quot;csrf-token&quot;:&quot;fresh&quot;}">'};
 }});
 let result;
 const pending=listener({action:'fptReadAuthenticatedPage'},{id:sender},value=>result=value);
 if(pending)for(let i=0;i<10&&result===undefined;i++)await new Promise(resolve=>setImmediate(resolve));
 dom.window.close();return {result,calls,pending};
}
test('handoff authenticates a fresh response, ignoring an old account in the open tab',async()=>{
 const {result,calls,pending}=await request();assert.equal(result.userId,222);assert.equal(result.csrf_token,'fresh');assert.equal(calls,1);assert.equal(pending,true);
});
test('failed authentication never falls back to stale page credentials',async()=>{
 const {result}=await request({status:429});assert.equal(Object.keys(result).length,0);
});
test('other extensions cannot request authenticated page data',async()=>{
 const {result,calls,pending}=await request({sender:'other'});assert.equal(result,undefined);assert.equal(calls,0);assert.equal(pending,undefined);
});
