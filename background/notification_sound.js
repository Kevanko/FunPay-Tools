import { parseOffscreen } from './offscreen_client.js';

export async function playNotificationSound() {
    const settings = await chrome.storage.local.get(['notificationSound', 'notificationVolume', 'fpToolsCustomSoundData']);
    const files = { vk: 'vk.mp3', tg: 'telegram.mp3', iphone: 'iphone.mp3', discord: 'discord.mp3', whatsapp: 'whatsapp.mp3' };
    const value = settings.notificationVolume;
    const volume = Number.isFinite(value) ? Math.max(0, Math.min(1, value > 1 && value <= 100 ? value / 100 : value)) : 1;
    let url;
    if (files[settings.notificationSound]) url = chrome.runtime.getURL('sounds/' + files[settings.notificationSound]);
    else if (settings.notificationSound === 'custom' && /^data:audio\/[a-z0-9.+-]+(?:;[^,]*)?,/i.test(settings.fpToolsCustomSoundData || '')) url = settings.fpToolsCustomSoundData;
    if (!url) return { ok: true, native: true, volume };
    if (volume === 0) return { ok: true, silent: true };
    return parseOffscreen('', 'fptPlayNotificationSound', { url, volume });
}
