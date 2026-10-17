const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const fs=require('node:fs');
const vm=require('node:vm');
test('site AI settings use an extension-owned frame and never place API key controls in the site DOM',()=>{
 const dom=new JSDOM('',{url:'https://funpay.com/'});
 const context=vm.createContext({document:dom.window.document,chrome:{runtime:{getURL:path=>'chrome-extension://fixture/'+path}},FPTIcons:{svg:()=>'<svg></svg>'}});
 try{vm.runInContext(fs.readFileSync('content/ui/main_popup.js','utf8'),context);const root=context.createMainPopup(),page=root.querySelector('[data-page=ai_connection].fp-tools-page-content');assert.equal(page.querySelector('iframe').getAttribute('src'),'chrome-extension://fixture/popup/ai.html');assert.equal(page.querySelector('input[type=password]'),null);assert.equal(page.querySelector('a'),null);}finally{dom.window.close();}
});

test('preference rows toggle once from their padding, label and switch while help remains separate',()=>{
 const dom=new JSDOM('',{url:'https://funpay.com/'}),context=vm.createContext({document:dom.window.document,chrome:{runtime:{getURL:path=>path}},FPTIcons:{svg:()=>'<svg></svg>'}});
 try{vm.runInContext(fs.readFileSync('content/ui/main_popup.js','utf8'),context);const root=context.createMainPopup();dom.window.document.body.append(root);const control=root.querySelector('#hideBalanceCheckbox'),row=control.closest('.checkbox-label-inline'),label=row.querySelector('label');assert.equal(control.checked,false);row.click();assert.equal(control.checked,true);label.click();assert.equal(control.checked,false);control.click();assert.equal(control.checked,true);assert.ok(root.querySelector('#autoBumpCooldown').closest('.template-container').querySelector('.fpt-help-note'));assert.equal(root.querySelectorAll('.fpt-help-note input').length,0);assert.equal(root.querySelector('li[data-page=phone]').parentElement,root.querySelector('.fp-tools-nav>ul'));assert.equal(root.querySelectorAll('.fp-tools-nav li[data-page=phone]').length,1);assert.equal(root.querySelector('li[data-page=phone]').querySelector('span:last-child').textContent,'На телефон');}finally{dom.window.close();}
});

test('settings pages preserve controls while separating notifications and providing section navigation',()=>{
 const dom=new JSDOM('',{url:'https://funpay.com/'});
 const context=vm.createContext({document:dom.window.document,chrome:{runtime:{getURL:path=>path}},FPTIcons:{svg:()=>'<svg aria-hidden="true"></svg>'}});
 vm.runInContext(fs.readFileSync('content/ui/main_popup.js','utf8'),context);
 const root=context.createMainPopup();dom.window.document.body.append(root);
 const pages=[...root.querySelectorAll('.fp-tools-page-content')];
 const nav=[...root.querySelectorAll('.fp-tools-nav li[data-page]')];
 assert.equal(pages.length,28);assert.equal(new Set(pages.map(p=>p.dataset.page)).size,28);
 assert.equal(root.querySelector('[data-page="ai_connection"] a').textContent,'ИИ');
 assert.equal(root.querySelector('.fp-tools-page-content[data-page="ai_connection"] iframe').title,'Провайдер и основная модель ИИ');
 for(const item of nav)assert.equal(pages.filter(p=>p.dataset.page===item.dataset.page).length,1,item.dataset.page);
 for(const id of ['notificationSoundGroup','notificationVolume','fptCustomSoundInput','discordWebhookUrl']){
  const control=root.querySelector('#'+id);assert.ok(control,id);assert.equal(root.querySelectorAll('#'+id).length,1);assert.equal(control.closest('[data-page]').dataset.page,'notifications');
 }
 assert.equal(root.querySelector('#notificationVolume').closest('.template-container').classList.contains('fpt-setting-range'),true);
 assert.equal(root.querySelector('#showSalesStatsCheckbox').closest('[data-page]').dataset.page,'general');
 assert.equal(root.querySelector('.support-promo').closest('[data-page]').dataset.page,'general');
 const replies=root.querySelector('.fp-tools-page-content[data-page="auto_review"]');
 assert.equal(replies.querySelectorAll('.fpt-page-sections button').length,6);
 const tabs=[...replies.querySelectorAll('.fpt-page-sections>[role="tab"]')],panels=[...replies.querySelectorAll('.fpt-settings-panel')];
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

test('grouped settings retain every tool and search opens the matching appearance tab',()=>{
 const dom=new JSDOM('',{url:'https://funpay.com/'});
 const context=vm.createContext({document:dom.window.document,chrome:{runtime:{getURL:path=>path}},FPTIcons:{svg:()=>'<svg></svg>'}});
 vm.runInContext(fs.readFileSync('content/ui/main_popup.js','utf8'),context);
 const root=context.createMainPopup();dom.window.document.body.append(root);context.setupMenuSearch(root);
 assert.equal(root.querySelectorAll('.fpt-nav-group').length,6);assert.equal(root.querySelectorAll('.fpt-command-center').length,0);
 assert.equal(root.querySelector('.fp-tools-page-content[data-page=general] .fpt-settings-pagehead h2').textContent,'Сайт и продажи');
 const groups=[...root.querySelectorAll('.fpt-nav-group')],automation=groups[1],button=automation.querySelector('button'),list=automation.querySelector('ul');
 assert.equal(list.hidden,true);assert.equal(root.querySelector('.fpt-settings-catalog').hidden,false);
 assert.equal(root.querySelectorAll('.fpt-settings-category').length,6);button.click();
 assert.equal(root.querySelector('.fpt-settings-catalog h2').textContent,'Автоматизация');assert.equal(root.querySelectorAll('.fpt-settings-tool').length,4);
 const theme=root.querySelector('.fp-tools-page-content[data-page="theme"]'),tabs=[...theme.querySelectorAll('[role=tab]')];
 assert.deepEqual(tabs.map(node=>node.textContent),['Тема','Фон','Текст','Цвета','Элементы','Перенос']);
 const blur=theme.querySelector('#themeBgBlur');assert.equal(blur.closest('[role=tabpanel]').hidden,true);
 const label=theme.querySelector('label[for=themeBgBlur]');label.scrollIntoView=()=>{};
 const search=root.querySelector('#fpToolsMenuSearch');search.value='размытие';search.dispatchEvent(new dom.window.Event('input'));
 root.querySelector('.fp-tools-nav li[data-page=theme] a').click();assert.equal(blur.closest('[role=tabpanel]').hidden,false);assert.equal(dom.window.document.activeElement,blur);
 search.value='';search.dispatchEvent(new dom.window.Event('input'));assert.equal(root.querySelector('.fp-tools-nav li[data-page=theme]').closest('ul').hidden,false);
 assert.equal(root.querySelector('.fpt-variable-help').open,false);assert.equal(root.querySelectorAll('#fpt-review-5').length,1);
 dom.window.close();
});

test('preferences keep rating drafts and synchronize compact sound choice with existing controls',async()=>{
 const dom=new JSDOM('',{url:'https://funpay.com/'}),listeners=[];
 const context=vm.createContext({document:dom.window.document,chrome:{runtime:{getURL:path=>path},storage:{local:{get:async()=>({notificationSound:'tg'})},onChanged:{addListener:fn=>listeners.push(fn)}}},FPTIcons:{svg:()=>'<svg></svg>'}});
 vm.runInContext(fs.readFileSync('content/ui/main_popup.js','utf8'),context);const root=context.createMainPopup();dom.window.document.body.append(root);context.setupMenuSearch(root);await new Promise(r=>setImmediate(r));
 const select=root.querySelector('#fpt-notification-sound-select');assert.equal(select.value,'tg');let changed=0;
 root.querySelector('#notificationSoundGroup').addEventListener('change',()=>changed++);select.value='vk';select.dispatchEvent(new dom.window.Event('change',{bubbles:true}));assert.equal(root.querySelector('input[name=notificationSound]:checked').value,'vk');assert.equal(changed,1);
 for(const listener of listeners)listener({notificationSound:{newValue:'discord'}},'local');assert.equal(select.value,'discord');
 const ratings=[...root.querySelectorAll('.fpt-review-rating-tabs button')],reviews=root.querySelector('.fpt-review-editor');
 root.querySelector('#fpt-review-5').value='Спасибо за отзыв';ratings[2].click();root.querySelector('#fpt-review-3').value='Давайте разберёмся';ratings[0].click();assert.equal(root.querySelector('#fpt-review-5').value,'Спасибо за отзыв');assert.equal(root.querySelector('#fpt-review-3').value,'Давайте разберёмся');assert.equal([...reviews.children].filter(panel=>!panel.hidden).length,1);
 const label=root.querySelector('label[for=fpt-review-3]');label.scrollIntoView=()=>{};const search=root.querySelector('#fpToolsMenuSearch');search.value='3 звезды';search.dispatchEvent(new dom.window.Event('input'));root.querySelector('.fp-tools-nav li[data-page=auto_review] a').click();assert.equal(root.querySelector('#fpt-review-editor-3').hidden,false);assert.equal(dom.window.document.activeElement.id,'fpt-review-3');
 root.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true,cancelable:true}));assert.equal(dom.window.document.activeElement,search);
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
