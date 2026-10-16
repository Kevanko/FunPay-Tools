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
