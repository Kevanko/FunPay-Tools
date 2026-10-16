async function fptPlayNotificationAudio(message) {
    const allowed = message.url?.startsWith(chrome.runtime.getURL('sounds/')) || /^data:audio\/[a-z0-9.+-]+(?:;[^,]*)?,/i.test(message.url || '');
    if (!allowed) return { ok: false };
    const audio = new Audio(message.url);
    audio.volume = Number.isFinite(message.volume) ? Math.max(0, Math.min(1, message.volume)) : 1;
    return new Promise(resolve => {
        let finished = false, started = false;
        const finish = ok => {
            if (finished) return;
            finished = true; clearTimeout(timer); audio.onended = audio.onerror = null;
            audio.pause(); audio.removeAttribute('src'); audio.load(); resolve({ ok });
        };
        const timer = setTimeout(() => finish(started), 30000);
        audio.onended = () => finish(true);
        audio.onerror = () => finish(false);
        try { audio.play().then(() => { started = true; resolve({ ok: true }); }, () => finish(false)); } catch (_) { finish(false); }
    });
}
