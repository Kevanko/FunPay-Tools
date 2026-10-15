const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const fs=require('node:fs');
const vm=require('node:vm');
test('requested editor page wins over stored last page during lazy panel creation',async()=>{
 const dom=new JSDOM('<button id="launcher"></button><div class="fp-tools-popup"><nav class="fp-tools-nav"><li data-page="theme"></li></nav></div>',{url:'https://funpay.com/#fpt-page=theme'});
 const {window}=dom;let restoreCount=0,selected=0;window.__fpEnsurePopup=async()=>{await Promise.resolve();window.document.querySelector('.fp-tools-popup').classList.add('active');};window.document.querySelector('li').onclick=()=>selected++;
 const source=fs.readFileSync('content/content_script.js','utf8'),start=source.indexOf('function wireFpToolsButton('),end=source.indexOf('function addFpToolsButton(',start);
 const context=vm.createContext({window,document:window.document,location:window.location,history:window.history,setTimeout:()=>0,clearTimeout:()=>{},loadLastActivePage:async()=>restoreCount++});vm.runInContext(source.slice(start,end),context);
 const callbacks={};const button={addEventListener:(event,fn)=>callbacks[event]=fn};context.wireFpToolsButton(button);await callbacks.click();assert.equal(selected,1);assert.equal(restoreCount,0);assert.equal(window.location.hash,'');window.document.querySelector('.fp-tools-popup').classList.remove('active');await callbacks.click();assert.equal(restoreCount,0); // builder already restored the explicit selection
 dom.window.close();
});
test('site navigation keeps core tools visible and finds secondary tools without expanding everything',()=>{
 const dom=new JSDOM(`<div class="fp-tools-popup"><nav class="fp-tools-nav"><input id="fpToolsMenuSearch"><div class="fpt-nav-empty" hidden></div><ul><li class="fp-nav-divider">Работа</li><li data-page="general" class="active">Обзор</li><li data-page="phone">На телефон</li><li class="fp-nav-divider">Сервис</li><li data-page="calculator">Калькулятор</li><li data-page="effects">Эффекты</li></ul><button class="fpt-nav-more" aria-expanded="false">Ещё инструменты</button></nav></div>`);
 const source=fs.readFileSync('content/ui/main_popup.js','utf8');const start=source.indexOf('function setupMenuSearch('),end=source.indexOf('// 3.0: add an image-insert',start);const context=vm.createContext({});vm.runInContext(source.slice(start,end),context);
 const root=dom.window.document.querySelector('.fp-tools-popup');context.setupMenuSearch(root);
 const get=id=>root.querySelector(`[data-page="${id}"]`),input=root.querySelector('input'),more=root.querySelector('button');const query=value=>{input.value=value;input.dispatchEvent(new dom.window.Event('input'));};
 assert.equal(get('phone').hidden,false);assert.equal(get('calculator').hidden,true);assert.equal(get('effects').hidden,true);
 query('кальк');assert.equal(get('calculator').hidden,false);assert.equal(get('phone').hidden,true);assert.equal(more.hidden,true);
 get('general').classList.remove('active');get('calculator').classList.add('active');query('');assert.equal(get('calculator').hidden,false);assert.equal(get('effects').hidden,true);
 more.click();assert.equal(get('effects').hidden,false);assert.equal(more.getAttribute('aria-expanded'),'true');more.click();assert.equal(get('effects').hidden,true);
 query('нет такого раздела');assert.equal(root.querySelector('.fpt-nav-empty').hidden,false);assert.ok([...root.querySelectorAll('.fp-nav-divider')].every(node=>node.hidden));
 dom.window.close();
});
