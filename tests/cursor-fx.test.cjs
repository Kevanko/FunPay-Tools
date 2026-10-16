const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
function setup(){
 const dom=new JSDOM('',{url:'https://funpay.com/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,calls={draw:0,clear:0};
 w.HTMLCanvasElement.prototype.getContext=()=>({setTransform(...args){calls.scale=args;},clearRect(){calls.clear++;},beginPath(){},arc(){calls.draw++;},fill(){}});
 w.createElement=(tag,attrs)=>Object.assign(w.document.createElement(tag),attrs);w.chrome={storage:{local:{get:async()=>({})},onChanged:{addListener(){}}}};
 let frame=0;w.requestAnimationFrame=()=>++frame;w.cancelAnimationFrame=()=>{};
 w.eval(fs.readFileSync('content/features/cursor_fx.js','utf8')+';window.subject=cursorFx;');return {dom,w,fx:w.subject,calls};
}
test('cursor particles start on first movement, restart cleanly, and disappear immediately when disabled or hidden',()=>{
 const {dom,w,fx,calls}=setup();try{
  fx.updateConfig({enabled:true,count:100,type:'trail',rgb:false,color1:'invalid',color2:'#abcdef'});
  w.dispatchEvent(new w.MouseEvent('mousemove',{clientX:40,clientY:50}));assert.ok(fx.particles.length>0);assert.ok(calls.draw>0);assert.ok(fx.animationFrame);assert.equal(fx.config.color1,'#5b86d8');
  fx.stop();assert.equal(fx.particles.length,0);assert.equal(fx.animationFrame,null);fx.start();fx.createParticle();assert.ok(fx.particles.length>0);
  Object.defineProperty(w.document,'hidden',{value:true,configurable:true});w.document.dispatchEvent(new w.Event('visibilitychange'));assert.equal(fx.particles.length,0);assert.equal(fx.animationFrame,null);
 }finally{dom.window.close();}
});
test('particle speed uses elapsed time and canvas scales for high DPI',()=>{
 const {dom,w,fx,calls}=setup();try{
  Object.defineProperty(w,'devicePixelRatio',{value:2});fx.resize();assert.equal(fx.canvas.width,w.innerWidth*2);assert.equal(calls.scale[0],2);
  fx.isEnabled=true;fx.particles=[{x:0,y:0,vx:1,vy:0,life:100,duration:100,size:1,color:'#fff'}];fx.animate(1000);fx.animate(1000+1000/120);assert.ok(Math.abs(fx.particles[0].x-1.5)<.01);fx.stop();
 }finally{dom.window.close();}
});
