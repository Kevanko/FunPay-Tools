const ENDPOINT='https://github.com/Kevanko/FunPay-Tools/releases/latest/download/latest.json';
export function newerVersion(candidate,current){const a=String(candidate).split('.').map(Number),b=String(current).split('.').map(Number);if(!/^\d+\.\d+\.\d+$/.test(candidate))return false;for(let i=0;i<3;i++){if(a[i]>b[i])return true;if(a[i]<b[i])return false;}return false;}
export async function checkAppUpdate(){
 const response=await fetch(ENDPOINT,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Сервер обновлений недоступен');
 const text=await response.text();if(text.length>65536)throw Error('Неверный ответ сервера');const release=JSON.parse(text).extension;
 if(!release?.url?.startsWith('https://github.com/Kevanko/FunPay-Tools/releases/download/')||!release.url.endsWith('.zip'))throw Error('Неверная ссылка обновления');
 const update={...release,available:newerVersion(release.version,chrome.runtime.getManifest().version),checkedAt:Date.now()};await chrome.storage.local.set({fptAppUpdate:update});
 await chrome.action.setBadgeText({text:update.available?'NEW':''});if(update.available)await chrome.action.setBadgeBackgroundColor({color:'#a56545'});return update;
}
export function initializeAppUpdates(){
 chrome.alarms.create('fpt-app-update',{delayInMinutes:1,periodInMinutes:360});
 chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='fpt-app-update')checkAppUpdate().catch(()=>{});});
 chrome.runtime.onMessage.addListener((message,sender,respond)=>{if(message.action!=='checkAppUpdate')return;checkAppUpdate().then(update=>respond({ok:true,update}),error=>respond({ok:false,error:error.message}));return true;});
}
