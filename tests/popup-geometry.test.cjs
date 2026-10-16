const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');

function fixture(){
 const dom=new JSDOM('<div class="fp-tools-popup"></div>'),popup=dom.window.document.querySelector('div');
 Object.defineProperties(dom.window,{innerWidth:{value:1000,configurable:true},innerHeight:{value:800,configurable:true}});
 Object.defineProperties(popup,{offsetWidth:{get:()=>parseFloat(popup.style.width)||600},offsetHeight:{get:()=>parseFloat(popup.style.height)||400}});
 const context=vm.createContext({window:dom.window});vm.runInContext(fs.readFileSync('content/ui/settings_loader.js','utf8'),context);return {dom,popup,restore:settings=>context.fptRestorePopupGeometry(popup,settings)};
}
test('saved position is validated after restored size, resetting an obsolete drag position',()=>{
 const {dom,popup,restore}=fixture();try{popup.classList.add('no-transform');popup.style.left='300px';popup.style.top='300px';restore({fpToolsPopupDragged:true,fpToolsPopupPosition:{left:'300px',top:'300px'},fpToolsPopupSize:{width:'900px',height:'700px'}});assert.equal(popup.style.width,'900px');assert.equal(popup.classList.contains('no-transform'),false);assert.equal(popup.style.left,'');assert.equal(popup.style.top,'');}finally{dom.window.close();}
});
test('restores fitting position and bounds huge or tiny imported sizes',()=>{
 const {dom,popup,restore}=fixture();try{restore({fpToolsPopupDragged:true,fpToolsPopupPosition:{left:'100px',top:'50px'},fpToolsPopupSize:{width:'700px',height:'600px'}});assert.equal(popup.classList.contains('no-transform'),true);assert.equal(popup.style.left,'100px');restore({fpToolsPopupSize:{width:'99999px',height:'2px'}});assert.equal(popup.style.width,'976px');assert.equal(popup.style.height,'240px');restore({fpToolsPopupSize:{width:'calc(100px)',height:'-20px'}});assert.equal(popup.style.width,'976px');assert.equal(popup.style.height,'240px');}finally{dom.window.close();}
});
