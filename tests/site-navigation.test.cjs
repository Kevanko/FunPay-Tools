const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const fs=require('node:fs');
const vm=require('node:vm');
test('settings pages preserve controls while separating notifications and providing section navigation',()=>{
 const dom=new JSDOM('',{url:'https://funpay.com/'});
 const context=vm.createContext({document:dom.window.document,chrome:{runtime:{getURL:path=>path}},FPTIcons:{svg:()=>'<svg aria-hidden="true"></svg>'}});
 vm.runInContext(fs.readFileSync('content/ui/main_popup.js','utf8'),context);
 const root=context.createMainPopup();dom.window.document.body.append(root);
 const pages=[...root.querySelectorAll('.fp-tools-page-content')];
 const nav=[...root.querySelectorAll('.fp-tools-nav li[data-page]')];
 assert.equal(pages.length,28);assert.equal(new Set(pages.map(p=>p.dataset.page)).size,28);
 assert.equal(root.querySelector('[data-page="ai_connection"] a').textContent,'ИИ');
 assert.equal(root.querySelector('.fp-tools-page-content[data-page="ai_connection"] a').getAttribute('href'),'popup/ai.html');
 for(const item of nav)assert.equal(pages.filter(p=>p.dataset.page===item.dataset.page).length,1,item.dataset.page);
 for(const id of ['notificationSoundGroup','notificationVolume','fptCustomSoundInput','discordWebhookUrl']){
  const control=root.querySelector('#'+id);assert.ok(control,id);assert.equal(root.querySelectorAll('#'+id).length,1);assert.equal(control.closest('[data-page]').dataset.page,'notifications');
 }
 assert.equal(root.querySelector('#notificationVolume').closest('.template-container').classList.contains('fpt-setting-range'),true);
 assert.equal(root.querySelector('#showSalesStatsCheckbox').closest('[data-page]').dataset.page,'general');
 assert.equal(root.querySelector('.support-promo').closest('[data-page]').dataset.page,'general');
 const replies=root.querySelector('.fp-tools-page-content[data-page="auto_review"]');
 assert.equal(replies.querySelectorAll('.fpt-page-sections button').length,6);
 const tabs=[...replies.querySelectorAll('[role="tab"]')],panels=[...replies.querySelectorAll('[role="tabpanel"]')];
 assert.equal(panels.length,6);assert.equal(panels.filter(panel=>!panel.hidden).length,1);
 assert.deepEqual(tabs.map(tab=>tab.textContent),['Отзывы','Бонусы','Приветствие','Новый заказ','Подтверждение','Дополнительно']);
 const themes=[...root.querySelectorAll('.fpt-theme-sw')];assert.equal(themes[0].dataset.fptTheme,'obsidian');assert.equal(themes[0].textContent,'Терминал');
 tabs[2].click();assert.equal(panels[2].hidden,false);assert.equal(panels[0].hidden,true);assert.equal(tabs[2].getAttribute('aria-selected'),'true');
 tabs[2].dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(panels[3].hidden,false);assert.equal(dom.window.document.activeElement,tabs[3]);
 dom.window.close();
});
test('requested editor page wins over stored last page during lazy panel creation',async()=>{
 const dom=new JSDOM('<button id="launcher"></button><div class="fp-tools-popup"><nav class="fp-tools-nav"><li data-page="theme"></li></nav></div>',{url:'https://funpay.com/#fpt-page=theme'});
 const {window}=dom;let restoreCount=0,selected=0;window.__fpEnsurePopup=async()=>{await Promise.resolve();window.document.querySelector('.fp-tools-popup').classList.add('active');};window.document.querySelector('li').onclick=()=>selected++;
 const source=fs.readFileSync('content/content_script.js','utf8'),start=source.indexOf('function wireFpToolsButton('),end=source.indexOf('function addFpToolsButton(',start);
 const context=vm.createContext({window,document:window.document,location:window.location,history:window.history,setTimeout:()=>0,clearTimeout:()=>{},loadLastActivePage:async()=>restoreCount++});vm.runInContext(source.slice(start,end),context);
 const callbacks={};const button={addEventListener:(event,fn)=>callbacks[event]=fn};context.wireFpToolsButton(button);await callbacks.click();assert.equal(selected,1);assert.equal(restoreCount,0);assert.equal(window.location.hash,'');window.document.querySelector('.fp-tools-popup').classList.remove('active');await callbacks.click();assert.equal(restoreCount,0); // builder already restored the explicit selection
 dom.window.close();
});
test('settings search finds controls inside sections and reveals collapsed matching settings',()=>{
 const dom=new JSDOM('<div class="fp-tools-popup"><nav class="fp-tools-nav"><input id="fpToolsMenuSearch"><div class="fpt-nav-empty" hidden></div><ul><li data-page="theme"><a>Оформление</a></li><li data-page="notifications"><a>Уведомления</a></li></ul><button class="fpt-nav-more" aria-expanded="false"></button></nav><div class="fp-tools-page-content" data-page="theme"><details><summary>Эффекты</summary><label for="blur">Размытие фона</label><input id="blur" type="range"></details></div><div class="fp-tools-page-content" data-page="notifications"><label>Громкость уведомлений</label></div></div>');
 const source=fs.readFileSync('content/ui/main_popup.js','utf8'),start=source.indexOf('function setupMenuSearch('),end=source.indexOf('// 3.0: add an image-insert',start),context=vm.createContext({});vm.runInContext(source.slice(start,end),context);
 const root=dom.window.document.querySelector('.fp-tools-popup');context.setupMenuSearch(root);const search=root.querySelector('input'),theme=root.querySelector('li[data-page="theme"]'),notifications=root.querySelector('li[data-page="notifications"]');
 search.value='размытие фона';search.dispatchEvent(new dom.window.Event('input'));assert.equal(theme.hidden,false);assert.equal(notifications.hidden,true);
 let scrolled=false;root.querySelector('label').scrollIntoView=()=>{scrolled=true;};theme.querySelector('a').click();assert.ok(scrolled);assert.equal(root.querySelector('details').open,true);assert.equal(dom.window.document.activeElement.id,'blur');
 search.value='громкость';search.dispatchEvent(new dom.window.Event('input'));assert.equal(theme.hidden,true);assert.equal(notifications.hidden,false);dom.window.close();
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
