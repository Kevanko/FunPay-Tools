const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const repo=require('node:path').resolve(__dirname,'..');
function harness(initial={}) {
 const store=structuredClone(initial),writes=[],styles={};
 const nodes={ 'fpt-content':{innerHTML:'',querySelectorAll:()=>[]}, 'ui-error':{textContent:''} };
 const sandbox={ console, URL, document:{addEventListener(){},getElementById:id=>nodes[id]||null,documentElement:{style:{setProperty:(k,v)=>styles[k]=v}}}, chrome:{storage:{local:{async get(keys){if(keys===null)return structuredClone(store);if(typeof keys==='string')keys=[keys];return Object.fromEntries(keys.map(k=>[k,structuredClone(store[k])]));},async set(p){writes.push(structuredClone(p));Object.assign(store,structuredClone(p));}}}},window:{} };
 vm.createContext(sandbox);
 vm.runInContext(fs.readFileSync(repo+'/content/theme_core.js','utf8'),sandbox);
 const popup=fs.readFileSync(repo+'/popup/popup.js','utf8').replace(/\}\)\(\);\s*$/,'globalThis.uiTest={adapter,setToggle,setPreset,saveTheme,calculate,state};})();');
 vm.runInContext(popup,sandbox);sandbox.uiTest.state.loaded=true;
 return {api:sandbox.uiTest,store,writes,styles,nodes,sandbox};
}
test('individual autoreply toggles once and preserves sibling fields',async()=>{
 const h=harness({fpToolsAutoReplies:{greetingEnabled:false,greetingText:'Текст',newOrderReplyEnabled:true}});
 await h.api.setToggle('ar:greetingEnabled');assert.equal(h.store.fpToolsAutoReplies.greetingEnabled,true);assert.equal(h.writes.length,1);
 await h.api.setToggle('ar:greetingEnabled');assert.equal(h.store.fpToolsAutoReplies.greetingEnabled,false);assert.equal(h.writes.length,2);assert.equal(h.store.fpToolsAutoReplies.greetingText,'Текст');assert.equal(h.store.fpToolsAutoReplies.newOrderReplyEnabled,true);
});
test('turning bump off disables both modes',async()=>{const h=harness({autoBumpEnabled:false,fpToolsSmartBumpEnabled:true});await h.api.setToggle('autoBumpEnabled');assert.equal(h.store.autoBumpEnabled,false);assert.equal(h.store.fpToolsSmartBumpEnabled,false);});
test('default-on promo and stats switches really turn off',async()=>{for(const k of ['viewSellersPromo','showSalesStats']){const h=harness();await h.api.setToggle(k);assert.equal(h.store[k],false);}});
test('templates adapter reads actual schema without fictional rows',()=>{const h=harness();const a=h.api.adapter({fpToolsTemplateSettings:{standard:{x:{label:'Реальный'}},custom:[{text:'Свой'}]}});assert.equal(a.templates.length,2);assert.equal(h.api.adapter({}).templates.length,0);});
test('theme switch preserves custom colors, images and other settings',async()=>{const h=harness({fpToolsTheme:{sitePreset:'graphite',containerBgColor:'#334455',textColor:'#ddeeff',bgColor1:'#123456',linkColor:'#456789',bgImage:'data:image/png;base64,AA',borderRadius:17}});await h.api.setPreset('paper');const t=h.store.fpToolsTheme;assert.equal(t.sitePreset,'paper');assert.equal(t.containerBgColor,'#334455');assert.equal(t.textColor,'#ddeeff');assert.equal(t.bgColor1,'#123456');assert.equal(t.bgImage,'data:image/png;base64,AA');assert.equal(t.borderRadius,17);});
test('stock palette switches to clay and uses shared native colors',async()=>{const h=harness({fpToolsTheme:{sitePreset:'graphite',containerBgColor:'#1d2028',textColor:'#f1f3f7',bgColor1:'#5b86d8',linkColor:'#5b86d8'}});await h.api.setPreset('clay');assert.equal(h.store.fpToolsTheme.containerBgColor,'#e8dbce');assert.equal(h.store.fpToolsTheme.textColor,'#3c302b');assert.equal(h.store.fpToolsTheme.linkColor,'#a56545');assert.equal(h.styles['--font-ui'],'"Segoe UI", system-ui, sans-serif');});
test('commission rejects 100 percent instead of Infinity',()=>{const h=harness();h.nodes.price={value:'1000'};h.nodes.fee={value:'100'};h.nodes['calc-output']={};h.api.calculate();assert.match(h.nodes['calc-output'].textContent,/Введите/);h.nodes.fee.value='7';h.api.calculate();assert.match(h.nodes['calc-output'].textContent,/930.00/);});
test('safe font whitelist gives serif, mono and unknown fallback',()=>{const h=harness();assert.match(vm.runInContext('fptFontStack("Georgia")',h.sandbox),/serif/);assert.match(vm.runInContext('fptFontStack("Consolas")',h.sandbox),/monospace/);assert.equal(vm.runInContext('fptFontStack("invalid")',h.sandbox),'system-ui, sans-serif');});
