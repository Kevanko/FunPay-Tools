import QRCode from 'qrcode';
import {gzipSync,strToU8} from 'fflate';

async function paint(canvas,value){const modules=QRCode.create(value,{errorCorrectionLevel:'M'}).modules.size+8;const available=Math.min(360,canvas.parentElement?.clientWidth||280);const scale=Math.max(2,Math.floor(available/modules));await QRCode.toCanvas(canvas,value,{scale,margin:4,errorCorrectionLevel:'M',color:{dark:'#302822',light:'#ffffff'}});canvas.style.width=canvas.width+'px';canvas.style.maxWidth='100%';}
export function frames(raw,id=crypto.randomUUID().replaceAll('-','')){
 const compressed=gzipSync(strToU8(raw));let binary='';for(const byte of compressed)binary+=String.fromCharCode(byte);const data=btoa(binary),count=Math.ceil(data.length/600);
 if(count>128)throw Error('Для такого объёма используйте экспорт .fpconfig');
 return Array.from({length:count},(_,i)=>`FPTQR1:${id}:${i+1}:${count}:${data.slice(i*600,(i+1)*600)}`);
}
export async function mountPhoneTransfer(root,data){
 root.classList.add('fpt-phone-flow');
 root.innerHTML='<section class="fpt-phone-section fpt-phone-install"><div><p class="fpt-phone-step">01 / Приложение</p><h2 class="fpt-h2">Установите FunPay Pocket</h2><p class="fpt-desc">Наведите камеру телефона на QR, чтобы скачать актуальный APK.</p><a class="fpt-phone-link" href="https://github.com/Kevanko/FunPay-Tools/releases/latest/download/FunPay-Pocket-latest.apk" target="_blank" rel="noopener noreferrer">Скачать APK ↗</a></div><div class="fpt-phone-download-qr"><canvas id="apk-qr" aria-label="QR скачивания APK"></canvas></div></section><section class="fpt-phone-section" id="phone-settings-section"><p class="fpt-phone-step">03 / По желанию</p><h2 class="fpt-h2">Перенесите настройки</h2><p class="fpt-desc">Оформление, шаблоны и правила расширения. На телефоне выберите «Перенести по QR».</p><button class="btn btn-soft" id="show-transfer">Показать QR настроек</button><div id="settings-qr-area" hidden><canvas id="settings-qr" aria-label="QR переноса настроек"></canvas><p id="qr-position" role="status"></p><div class="fpt-qr-controls"><button class="btn btn-soft" id="qr-prev">Назад</button><button class="btn btn-soft" id="qr-next">Следующий QR</button><button class="btn btn-ghost" id="qr-hide">Скрыть</button></div></div></section>';
 await paint(root.querySelector('#apk-qr'),'https://github.com/Kevanko/FunPay-Tools/releases/latest/download/FunPay-Pocket-latest.apk');
 let payload=[],index=0;const area=root.querySelector('#settings-qr-area');
 const draw=async()=>{await paint(root.querySelector('#settings-qr'),payload[index]);root.querySelector('#qr-position').textContent=`QR ${index+1} из ${payload.length}. Сканируйте все коды по порядку.`;root.querySelector('#qr-prev').disabled=index===0;root.querySelector('#qr-next').disabled=index===payload.length-1;};
 root.querySelector('#show-transfer').onclick=async()=>{try{const current=await chrome.storage.local.get(null);payload=frames(FPTSettingsSchema.encode(current,chrome.runtime.getManifest().version));index=0;area.hidden=false;await draw();}catch(e){root.querySelector('#qr-position').textContent=e.message;area.hidden=false;}};
 root.querySelector('#qr-prev').onclick=()=>{if(index>0){index--;draw();}};root.querySelector('#qr-next').onclick=()=>{if(index<payload.length-1){index++;draw();}};
 root.querySelector('#qr-hide').onclick=()=>{area.hidden=true;payload=[];const canvas=root.querySelector('#settings-qr');canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);};
 const section=document.createElement('section');section.className='fpt-phone-section';
 section.innerHTML='<p class="fpt-phone-step">02 / Аккаунт</p><h2 class="fpt-h2">Войдите на телефоне</h2><p class="fpt-desc">Выберите «Войти по QR с компьютера» в приложении. Затем введите код, показанный рядом с QR. Показывайте его только своему телефону.</p><button class="btn btn-soft" id="login-create">Создать QR входа</button><p id="login-status" class="fpt-desc" role="status"></p><div id="login-transfer" hidden><canvas id="login-qr" aria-label="QR входа на телефоне"></canvas><p class="fpt-desc">Код подтверждения</p><code id="login-code"></code><button id="login-hide" class="btn btn-ghost">Скрыть QR и код</button></div>';
 root.insertBefore(section,root.querySelector('#phone-settings-section'));
 const loginArea=section.querySelector('#login-transfer'),loginStatus=section.querySelector('#login-status'),create=section.querySelector('#login-create');let timer,epoch=0;
 const clear=()=>{epoch++;clearInterval(timer);document.removeEventListener('visibilitychange',onVisibility);loginArea.hidden=true;section.querySelector('#login-code').textContent='';const c=section.querySelector('#login-qr');c.getContext('2d').clearRect(0,0,c.width,c.height);create.disabled=false;};
 const onVisibility=()=>{if(document.hidden){clear();loginStatus.textContent='QR скрыт. Для входа создайте новый.';}};
 section.querySelector('#login-hide').onclick=()=>{clear();loginStatus.textContent='';};
 const popup=globalThis.location?.href===chrome.runtime.getURL('popup/popup.html');
 if(!popup){create.hidden=true;loginStatus.textContent='Для входа по QR откройте окно расширения через значок в браузере.';}
 create.onclick=async()=>{
  clear();const current=epoch;create.disabled=true;loginStatus.textContent='Проверяю аккаунт FunPay…';let timeout;
  try{
   const result=await Promise.race([chrome.runtime.sendMessage({action:'fptCreateLoginQR',deadline:Date.now()+30000}),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Проверка заняла слишком долго. Откройте FunPay и повторите.')),30000);})]);
   if(current!==epoch)return;
   if(!result?.ok)throw Error(result?.error||'Не удалось создать QR');
   if(document.hidden||!root.isConnected){clear();loginStatus.textContent='Для входа создайте новый QR.';return;}
   await paint(section.querySelector('#login-qr'),result.qr);
   if(current!==epoch)return;
   section.querySelector('#login-code').textContent=result.code;loginArea.hidden=false;document.addEventListener('visibilitychange',onVisibility);
   const tick=()=>{if(!root.isConnected||Date.now()>=result.expires){clear();loginStatus.textContent='Срок QR истёк. Создайте новый.';return;}const seconds=Math.ceil((result.expires-Date.now())/1000);loginStatus.textContent=`Действует ещё ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;};
   tick();if(!loginArea.hidden)timer=setInterval(tick,1000);
  }catch(e){if(current===epoch){clear();loginStatus.textContent=e.message;}}
  finally{clearTimeout(timeout);}
 };
}
globalThis.FPTPhoneTransfer={mount:mountPhoneTransfer};
