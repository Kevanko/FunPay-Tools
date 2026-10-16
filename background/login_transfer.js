const PREFIX = 'FPTLOGIN1:';
const AAD = new TextEncoder().encode(PREFIX);
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const b64 = bytes => btoa(String.fromCharCode(...bytes));

// Separate protocol: ordinary settings exports must never contain a session.
export function trustedLoginSender(sender, runtime) {
    return sender?.id === runtime.id && sender.url === runtime.getURL('popup/popup.html');
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
    const payload = new TextEncoder().encode(JSON.stringify({ uid: String(auth.userId), name: String(auth.username || 'Аккаунт FunPay').slice(0, 80), golden_key: auth.golden_key, issued: now, expires, ...(cloud?{cloud:{schema:1,accountId:cloud.accountId,id:cloud.id,token:cloud.token}}:{}) }));
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: AAD }, key, payload));
    return { qr: PREFIX + JSON.stringify({ salt: b64(salt), iv: b64(iv), ct: b64(ciphertext) }), code: plainCode.match(/.{4}/g).join('-'), expires };
}
