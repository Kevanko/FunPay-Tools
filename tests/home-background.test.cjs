const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const model=vm.createContext({});vm.runInContext(fs.readFileSync('content/theme_core.js','utf8'),model);
test('homepage exposes photo, video and generated wallpaper without opaque root',()=>{
 const dom=new JSDOM('<html class="fpt-custom-theme-on"><head></head><body class="funpay-redesigned"><main class="fpt-home"></main></body></html>');
 try{for(const patch of [{bgImage:'data:image/png;base64,fixture'},{bgVideo:'https://example.test/video.mp4'},{wallpaper:'dunes'},{}]){
  model.patch=patch;const css=vm.runInContext('fptDesignCss({...DEFAULT_THEME,...patch})',model);dom.window.document.head.innerHTML='';const style=dom.window.document.createElement('style');style.textContent=css;dom.window.document.head.append(style);const background=dom.window.getComputedStyle(dom.window.document.querySelector('.fpt-home')).backgroundColor;
  if(Object.keys(patch).length)assert.equal(background,'rgba(0, 0, 0, 0)');else assert.match(css,/\.fpt-home\{background:var\(--fpt-p1\)/);
 }}finally{dom.window.close();}
});
test('terminal defaults do not replace an explicitly selected theme',()=>{
 assert.equal(vm.runInContext('DEFAULT_THEME.sitePreset',model),'obsidian');assert.equal(vm.runInContext('DEFAULT_THEME.font',model),'Consolas');assert.equal(vm.runInContext('({...DEFAULT_THEME,...fptPresetPatch("clay")}).sitePreset',model),'clay');
});
test('missing and unknown theme ids consistently fall back to terminal geometry',()=>{
 assert.equal(vm.runInContext('fptNormalizeToPreset({}).sitePreset',model),'obsidian');
 assert.equal(vm.runInContext('fptNormalizeToPreset({sitePreset:"removed-preset"}).sitePreset',model),'obsidian');
 assert.equal(vm.runInContext('fptDesignMetrics({}).font',model),'Consolas');
 assert.equal(vm.runInContext('fptDesignMetrics({}).radius',model),4);
 assert.equal(vm.runInContext('fptNormalizeToPreset({sitePreset:"clay"}).sitePreset',model),'clay');
});
test('support pages use terminal on a clean install and preserve selected light themes',async()=>{
 const dom=new JSDOM('<html><head></head><body></body></html>',{url:'https://support.funpay.com/'});let data={},changed;
 const context=vm.createContext({window:dom.window,document:dom.window.document,chrome:{storage:{local:{get:async()=>data},onChanged:{addListener:callback=>{changed=callback;}}}}});
 try{
  vm.runInContext(fs.readFileSync('content/theme_core.js','utf8'),context);vm.runInContext(fs.readFileSync('content/features/support_theme.js','utf8'),context);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(dom.window.document.documentElement.dataset.fptPreset,'obsidian');assert.match(dom.window.document.getElementById('fp-tools-support-theme').textContent,/font-family: "Consolas", ui-monospace, monospace/);
  data={fpToolsTheme:{sitePreset:'clay',font:'Manrope'}};changed({fpToolsTheme:{}},'local');await new Promise(resolve=>setImmediate(resolve));assert.equal(dom.window.document.documentElement.dataset.fptPreset,'clay');assert.match(dom.window.document.getElementById('fp-tools-support-theme').textContent,/font-family: "Manrope", system-ui, sans-serif/);
  data={enableCustomTheme:false};changed({enableCustomTheme:{}},'local');await new Promise(resolve=>setImmediate(resolve));assert.equal(dom.window.document.getElementById('fp-tools-support-theme').textContent,'');
 }finally{dom.window.close();}
});
