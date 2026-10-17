const PREFIX = 'FPTLOGIN1:';
const AAD = new TextEncoder().encode(PREFIX);
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const b64 = bytes => {let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);};

// Separate protocol: ordinary settings exports must never contain a session.
export function trustedLoginSender(sender, runtime) {
    return sender?.id === runtime.id && ['popup/popup.html','popup/phone.html'].some(path=>sender.url === runtime.getURL(path));
}

export async function createLoginTransfer(auth, now = Date.now(), cloud = null) {
    if (!/^[1-9]\d{0,19}$/.test(String(auth.userId || '')) || !/^[A-Za-z0-9_-]{16,256}$/.test(auth.golden_key || '')) {
        throw Error('Сначала войдите в FunPay в этом браузере');
    }
    const random = crypto.getRandomValues(new Uint8Array(16));
    const plainCode = Array.from(random, byte => alphabet[byte & 31]).join('');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(plainCode), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const expires = now + 5 * 60 * 1000;
    if(cloud && (cloud.schema!==1 || cloud.accountId!==String(auth.userId) || !/^p_[a-f0-9]{64}$/.test(cloud.id||'') || !/^[a-f0-9]{64}$/.test(cloud.token||'')))throw Error('Ключ синхронизации не соответствует аккаунту');
    const payload = new TextEncoder().encode(JSON.stringify({ uid: String(auth.userId), name: String(auth.username || 'Аккаунт FunPay').slice(0, 80), golden_key: auth.golden_key, cookies: Object.fromEntries(Object.entries(auth.cookies || {}).filter(([name,value]) => ['golden_seal','PHPSESSID'].includes(name) && typeof value === 'string' && /^[A-Za-z0-9_~.%+\/-]{1,512}$/.test(value))), issued: now, expires, ...(cloud?{cloud:{schema:1,accountId:cloud.accountId,id:cloud.id,token:cloud.token}}:{}) }));
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: AAD }, key, payload));
    return { qr: PREFIX + JSON.stringify({ salt: b64(salt), iv: b64(iv), ct: b64(ciphertext) }), code: plainCode.match(/.{4}/g).join('-'), expires };
}

// Scan-to-connect envelope. Possession of this QR grants account access;
// there is no separately typed secret and no external relay service.
export async function createQuickLoginTransfer(auth, accounts = [], now = Date.now(), cloud = null) {
    const primary = {uid:String(auth.userId||''),name:String(auth.username||'Аккаунт FunPay').slice(0,80),golden_key:auth.golden_key,cookies:auth.cookies||{},settings:auth.settings||{},...(cloud?{cloud}: {})};
    const unique = new Map();
    for(const account of [primary,...accounts]){
        if(!/^[1-9]\d{0,19}$/.test(String(account.uid||''))||!/^[A-Za-z0-9_-]{16,256}$/.test(account.golden_key||''))throw Error('Подтвердите аккаунты в расширении перед переносом');
        if(unique.has(String(account.uid)))continue;
        const cookies=Object.fromEntries(Object.entries(account.cookies||{}).filter(([name,value])=>['golden_seal','PHPSESSID'].includes(name)&&typeof value==='string'&&/^[A-Za-z0-9_~.%+\/-]{1,512}$/.test(value)));
        unique.set(String(account.uid),{...account,uid:String(account.uid),name:String(account.name||'Аккаунт FunPay').slice(0,80),cookies});
    }
    if(unique.size>8)throw Error('За один перенос можно подключить до 8 аккаунтов');
    const expires=now+300000,build=list=>new TextEncoder().encode(JSON.stringify({uid:primary.uid,name:primary.name,accounts:list,issued:now,expires}));
    const gzip=async bytes=>new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
    // The display layer allows 128 frames x 600 chars; keep the inner limit consistent with it.
    const LIMIT=54000;
    let list=[...unique.values()],bytes=build(list),compressed=await gzip(bytes);
    if(compressed.length>LIMIT){
        // Heavy media (data: URIs) is what blows the budget; the phone does not need it to log in.
        const strip=v=>typeof v==='string'&&/^data:/.test(v)?'':Array.isArray(v)?v.map(strip):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,strip(x)])):v;
        list=list.map(a=>a.settings?{...a,settings:strip(a.settings)}:a);bytes=build(list);compressed=await gzip(bytes);
    }
    if(compressed.length>LIMIT)throw Error('Настройки не помещаются в QR даже без фото, видео и звуков. Перенесите их файлом .fpconfig');
    const secret=crypto.getRandomValues(new Uint8Array(32)),iv=crypto.getRandomValues(new Uint8Array(12));
    const key=await crypto.subtle.importKey('raw',secret,'AES-GCM',false,['encrypt']);
    const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode('FPTLOGIN2:')},key,compressed));
    return {qr:'FPTLOGIN2:'+JSON.stringify({key:b64(secret),iv:b64(iv),ct:b64(ct),zip:true}),expires,accounts:unique.size};
}
