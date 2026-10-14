import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';

test('web and Android use identical vector geometry for every shared icon',()=>{
 const icons=JSON.parse(fs.readFileSync('icons/ui-icons.json','utf8'));
 const dom=new JSDOM('<main class="fp-tools-popup"><span class="material-symbols-rounded">inventory_2</span></main><aside><span class="material-symbols-rounded">inventory_2</span></aside>');
 const context=vm.createContext({document:dom.window.document,MutationObserver:dom.window.MutationObserver,requestAnimationFrame:()=>{}});
 vm.runInContext(fs.readFileSync('content/ui/icons.js','utf8'),context);
 for(const [name,d] of Object.entries(icons)){
  assert.ok(context.FPTIcons.svg(name).includes(`d="${d}"`),name);
  assert.ok(fs.readFileSync(`android/app/src/main/res/drawable/ic_ui_${name}.xml`,'utf8').includes(`android:pathData="${d}"`),name);
 }
 assert.equal(dom.window.document.querySelector('main svg').getAttribute('aria-hidden'),'true');
 assert.equal(dom.window.document.querySelector('aside span').textContent,'inventory_2');
 dom.window.close();
});
