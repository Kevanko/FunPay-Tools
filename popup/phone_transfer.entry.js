import QRCode from 'qrcode';
import {gzipSync,strToU8} from 'fflate';

async function paint(canvas,value){await QRCode.toCanvas(canvas,value,{scale:5,margin:4,errorCorrectionLevel:'M',color:{dark:'#302822',light:'#ffffff'}});}
export function frames(raw,id=crypto.randomUUID().replaceAll('-','')){
 const compressed=gzipSync(strToU8(raw));let binary='';for(const byte of compressed)binary+=String.fromCharCode(byte);const data=btoa(binary),count=Math.ceil(data.length/600);
 if(count>128)throw Error('Для такого объёма используйте экспорт .fpconfig');
 return Array.from({length:count},(_,i)=>`FPTQR1:${id}:${i+1}:${count}:${data.slice(i*600,(i+1)*600)}`);
}
export async function mountPhoneTransfer(root,data){
 root.innerHTML='<section class="fpt-card"><h2 class="fpt-h2">Установить на телефон</h2><p class="fpt-desc">Сканируйте камерой телефона. Ссылка ведёт на актуальный APK.</p><canvas id="apk-qr" aria-label="QR скачивания APK"></canvas><p><a href="https://github.com/Kevanko/FunPay-Tools/releases/latest/download/FunPay-Pocket-latest.apk" target="_blank" rel="noopener noreferrer">Скачать актуальный APK</a></p></section><section class="fpt-card"><h2 class="fpt-h2">Перенести настройки</h2><p class="fpt-desc">На стартовом экране приложения выберите «Сканировать QR». Аккаунт подключается отдельно через FunPay. Настройки показываются локально, без загрузки на сервер.</p><button class="btn btn-soft" id="show-transfer">Показать QR настроек</button><div id="settings-qr-area" hidden><canvas id="settings-qr" aria-label="QR переноса настроек"></canvas><p id="qr-position" role="status"></p><div class="fpt-qr-controls"><button class="btn btn-soft" id="qr-prev">Назад</button><button class="btn btn-soft" id="qr-next">Следующий QR</button><button class="btn btn-ghost" id="qr-hide">Скрыть</button></div></div></section>';
 await paint(root.querySelector('#apk-qr'),'https://github.com/Kevanko/FunPay-Tools/releases/latest/download/FunPay-Pocket-latest.apk');
 let payload=[],index=0;const area=root.querySelector('#settings-qr-area');
 const draw=async()=>{await paint(root.querySelector('#settings-qr'),payload[index]);root.querySelector('#qr-position').textContent=`QR ${index+1} из ${payload.length}. Сканируйте все коды по порядку.`;root.querySelector('#qr-prev').disabled=index===0;root.querySelector('#qr-next').disabled=index===payload.length-1;};
 root.querySelector('#show-transfer').onclick=async()=>{try{payload=frames(FPTSettingsSchema.encode(data,chrome.runtime.getManifest().version));index=0;area.hidden=false;await draw();}catch(e){root.querySelector('#qr-position').textContent=e.message;area.hidden=false;}};
 root.querySelector('#qr-prev').onclick=()=>{if(index>0){index--;draw();}};root.querySelector('#qr-next').onclick=()=>{if(index<payload.length-1){index++;draw();}};
 root.querySelector('#qr-hide').onclick=()=>{area.hidden=true;payload=[];const canvas=root.querySelector('#settings-qr');canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);};
}
globalThis.FPTPhoneTransfer={mount:mountPhoneTransfer};
