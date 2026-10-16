const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('enabling sync reports a server failure instead of a completed connection',async()=>{
 const source=fs.readFileSync('content/features/cloud_sync.js','utf8'),start=source.indexOf('async function fptCloudSetSync('),end=source.indexOf("if (typeof window",start);let message='';
 const context=vm.createContext({chrome:{storage:{local:{set:async()=>{}}}},document:{getElementById:()=>null},_fptC:{},_fptCloudOn:false,_fptCloudReadyFlag:false,_fptCloudLastError:'',_fptCloudSyncRing:()=>{},_fptCloudUser:()=>({id:'42',name:'Fixture'}),_fptCloudDeriveKey:async()=> 'fixture',_fptCloudLoadState:async()=>{},_fptCloudCollect:async()=>({}),_fptCloudPersist:async()=>{},_fptCloudRun:fn=>fn(),_fptCloudReconcile:async()=>{context._fptCloudLastError='Сервер требует обновления';},_fptCloudStartInterval:()=>{},_fptCloudRefreshUI:async()=>{},_fptCloudSay:text=>{message=text;}});
 vm.runInContext(source.slice(start,end),context);const result=await context.fptCloudSetSync(true);
 assert.equal(result.ok,false);assert.equal(result.error,'Сервер требует обновления');assert.equal(message,'Сервер требует обновления');
});
test('background distinguishes a missing private profile from an unsupported private API',async()=>{
 const source=fs.readFileSync('background/background.js','utf8'),start=source.indexOf('async function fptCloudPull('),end=source.indexOf('// --- Главный обработчик',start);let body={error:'not_found'};
 const context=vm.createContext({AbortSignal,FPT_CLOUD_ENDPOINT:'https://sync.invalid',fptGetCloudCapability:async()=>({id:'p_'+'a'.repeat(64),token:'b'.repeat(64)}),fetch:async()=>({status:404,json:async()=>body})});
 vm.runInContext(source.slice(start,end),context);let result=await context.fptCloudPull('42');assert.equal(result.ok,false);assert.equal(result.error,'server_upgrade_required');
 body={exists:false};result=await context.fptCloudPull('42');assert.equal(result.ok,true);assert.equal(result.exists,false);
});
