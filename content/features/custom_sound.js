// content/features/custom_sound.js
//
// Подмена звука уведомлений. Раньше мы свопали <source src> у <audio class="loud">
// и гонялись с FunPay за тот же элемент (race на load(), плюс мы вообще не трогали
// <audio class="quiet"> — звук в открытом чате → дефолт). Итог: «не всегда кастомный»
// и иногда немо. Новая модель проще и надёжнее: глушим нативный <audio> (muted) и на
// его событие 'play' проигрываем СВОЙ звук. Покрывает loud и quiet одинаково, без race.

const soundMap = {
    vk: 'vk.mp3',
    tg: 'telegram.mp3',
    iphone: 'iphone.mp3',
    discord: 'discord.mp3',
    whatsapp: 'whatsapp.mp3'
};

const cfg = { sound: 'default', volume: 1, customUrl: null, customSrc: null };

async function _loadCfg() {
    const { notificationSound, notificationVolume, fpToolsCustomSoundData } =
        await chrome.storage.local.get(['notificationSound', 'notificationVolume', 'fpToolsCustomSoundData']);
    cfg.sound = notificationSound || 'default';
    cfg.volume = (typeof notificationVolume === 'number') ? Math.max(0, Math.min(1, notificationVolume)) : 1;

    // data: URL своей мелодии → blob: URL один раз (blob не попадает под CSP на data:-медиа).
    if (fpToolsCustomSoundData) {
        if (cfg.customSrc !== fpToolsCustomSoundData) {
            try {
                const blob = await (await fetch(fpToolsCustomSoundData)).blob();
                if (cfg.customUrl) { try { URL.revokeObjectURL(cfg.customUrl); } catch (_) {} }
                cfg.customUrl = URL.createObjectURL(blob);
                cfg.customSrc = fpToolsCustomSoundData;
            } catch (_) {
                cfg.customUrl = fpToolsCustomSoundData; // fallback: напрямую data URL
                cfg.customSrc = fpToolsCustomSoundData;
            }
        }
    } else {
        if (cfg.customUrl && cfg.customSrc !== cfg.customUrl) { try { URL.revokeObjectURL(cfg.customUrl); } catch (_) {} }
        cfg.customUrl = null;
        cfg.customSrc = null;
    }
}

// URL звука, который надо проиграть вместо нативного. null = играть нативный (default).
function _chosenUrl() {
    if (cfg.sound === 'default') return null;
    if (cfg.sound === 'custom') return cfg.customUrl; // нет своей мелодии → null → нативный
    if (soundMap[cfg.sound]) return chrome.runtime.getURL(`sounds/${soundMap[cfg.sound]}`);
    return null;
}

// Глушим нативные <audio> только когда выбран НЕ дефолт (иначе пусть FunPay играет сам).
function _applyMute() {
    const mute = _chosenUrl() != null;
    document.querySelectorAll('audio.loud, audio.quiet').forEach(el => { el.muted = mute; });
}

function _hook(el) {
    if (!el || el.dataset.fptSoundHook) return;
    el.dataset.fptSoundHook = '1';
    el.muted = _chosenUrl() != null;
    el.addEventListener('play', () => {
        const url = _chosenUrl();
        if (!url) { el.muted = false; return; } // default — нативный звук
        el.muted = true;                         // заглушить нативный chime
        const a = new Audio(url);
        a.volume = cfg.volume;
        a.play().catch(() => {});
    }, true);
}

function _hookAll() {
    document.querySelectorAll('audio.loud, audio.quiet').forEach(_hook);
}

// Перечитать настройки и применить (зовётся из misc.js после сохранения и из storage.onChanged).
let _chain = Promise.resolve();
function applyNotificationSound() {
    const run = async () => { await _loadCfg(); _hookAll(); _applyMute(); };
    _chain = _chain.then(run, run);
    return _chain;
}

// Превью из попапа: проигрываем выбранный звук на выбранной громкости.
async function previewNotificationSound(soundValue, volume) {
    try {
        let url;
        if (!soundValue || soundValue === 'default') url = 'https://funpay.com/audio/chat_loud.mp3';
        else if (soundValue === 'custom') {
            const { fpToolsCustomSoundData } = await chrome.storage.local.get('fpToolsCustomSoundData');
            if (!fpToolsCustomSoundData) { if (typeof showNotification === 'function') showNotification('Своя мелодия ещё не сохранена.', true); return; }
            url = fpToolsCustomSoundData;
        }
        else if (soundMap[soundValue]) url = chrome.runtime.getURL(`sounds/${soundMap[soundValue]}`);
        else return;
        const a = new Audio(url);
        a.volume = (typeof volume === 'number') ? Math.max(0, Math.min(1, volume)) : 1;
        await a.play().catch(() => {});
    } catch (_) {}
}

function initializeCustomSound() {
    applyNotificationSound();

    // FunPay может пересоздать <audio> при SPA-навигации — подцепляем новые элементы.
    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (node.nodeType === 1 && (node.matches('audio.loud, audio.quiet') || node.querySelector('audio.loud, audio.quiet'))) {
                    _hookAll();
                    _applyMute();
                    return;
                }
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

// Мгновенно переприменить при смене звука/громкости в попапе (без перезагрузки).
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        if (changes.notificationSound || changes.notificationVolume || changes.fpToolsCustomSoundData) {
            applyNotificationSound();
        }
    });
}
