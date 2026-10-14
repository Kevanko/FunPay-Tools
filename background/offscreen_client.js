// The service worker owns creation and teardown; offscreen has only runtime API.
const PATH = 'offscreen/offscreen.html';
let lifecycle = Promise.resolve();
let lastWorkAt = Date.now();
let documentBornAt = Date.now();
const MAX_DOCUMENT_AGE_MS = 10 * 60 * 1000;
function serialize(fn) {
    const next = lifecycle.then(fn, fn);
    lifecycle = next.catch(() => {});
    return next;
}
async function ensure() {
    let contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'], documentUrls: [chrome.runtime.getURL(PATH)] });
    if (contexts.length && Date.now() - documentBornAt >= MAX_DOCUMENT_AGE_MS) {
        await chrome.offscreen.closeDocument();
        contexts = [];
    }
    if (!contexts.length) {
        await chrome.offscreen.createDocument({ url: PATH, reasons: ['DOM_PARSER'], justification: 'Parse FunPay HTML' });
        documentBornAt = Date.now();
    }
}
export function ensureParser() { return serialize(ensure); }
export function parseOffscreen(html, action, extra = {}) {
    return serialize(async () => {
        lastWorkAt = Date.now();
        await ensure();
        try { return await chrome.runtime.sendMessage({ target: 'offscreen', action, html, ...extra }); }
        finally { lastWorkAt = Date.now(); }
    });
}
export function closeIdleParser(idleAt, automationEnabled) {
    return serialize(async () => {
        if (automationEnabled || Date.now() - Math.max(lastWorkAt, idleAt || 0) < 90000) return false;
        try { await chrome.offscreen.closeDocument(); } catch (_) {}
        return true;
    });
}
