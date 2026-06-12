// content/features/cloud_sync.js — FunPay Tools cloud settings sync (Model A, hardened).
// Backend: Cloudflare Worker + D1 (https://fpt-sync.vidalifete.workers.dev).
//
// Keyed per FunPay account: the storage key is derived from the userId (read from app-data)
// via SHA-256(salt:userId) so it is not the raw public id — settings load automatically on
// login, no codes. Open-ish by design (no secrets synced); see notes on the residual write
// trust in the project memo.
//
// Updates: optimistic concurrency (monotonic `version` + server compare-and-swap, 409 on
// stale baseVersion) with FIELD-LEVEL merge by per-key timestamp (strictly-newer wins, ties
// -> cloud) and deletion tombstones, so concurrent edits AND resets on two devices both
// converge. Pull on load + focus + 60s interval; debounce-8s push; serialized op chain;
// pull-before-push; never uploads golden_key/cookies/wallpaper binaries.

const FPT_CLOUD_KEYS = [
    'fpToolsAutoReplies', 'reviewTemplates', 'fpToolsSlashCommands',
    'fpToolsTemplateSettings', 'fpToolsTheme', 'enableCustomTheme', 'notificationSound',
    'notificationVolume', 'fpToolsCursorFx', 'keywords', 'greetingText',
    'autoBumpEnabled', 'autoBumpCooldown', 'fpToolsSmartBumpEnabled',
    'fpToolsLiveStyles', 'enableRedesignedHomepage', 'showSalesStats', 'hideBalance',
    'viewSellersPromo', 'fpToolsDisabledFeatures', 'fpToolsHeaderButtonStyles',
    'fpToolsShowPaymentType', 'fpToolsShowUnconfirmed'
];
const FPT_CLOUD_KEYSET = new Set(FPT_CLOUD_KEYS);
const FPT_CLOUD_THEME_STRIP = ['bgImage', 'bgVideo', 'bgData', 'bgVideoData'];   // wallpaper stays local
const FPT_CLOUD_VISUAL = ['fpToolsTheme', 'enableCustomTheme', 'fpToolsLiveStyles', 'enableRedesignedHomepage', 'fpToolsCursorFx', 'hideBalance', 'showSalesStats', 'viewSellersPromo', 'fpToolsDisabledFeatures', 'fpToolsHeaderButtonStyles'];
const FPT_CLOUD_DEBOUNCE_MS = 8000;
const FPT_CLOUD_INTERVAL_MS = 60000;
const FPT_CLOUD_RETRY_MS = 20000;
const FPT_CLOUD_SALT = 'fpt-sync-v1';

const _fptC = { uid: '', name: '', key: '', ver: 0, fieldTs: {}, lastHash: '' };
let _fptCloudOn = false;            // cached enabled flag (synchronous gate for onChanged)
let _fptCloudReadyFlag = false;     // true only after the first reconcile (pull-before-push)
let _fptCloudApplied = {};          // {key: stableValue} written by our last apply (self-write suppression)
let _fptCloudAppliedUntil = 0;
let _fptCloudSuspendUntil = 0;      // account-switch suspension
let _fptCloudPushTimer = null;
let _fptCloudRetryTimer = null;
let _fptCloudIntervalSet = false;
let _fptCloudChain = Promise.resolve();

function _fptCloudRun(fn) { const p = _fptCloudChain.then(() => fn()).catch(() => {}); _fptCloudChain = p.catch(() => {}); return p; }
function _fptCloudAlive() { try { return !!(chrome && chrome.runtime && chrome.runtime.id); } catch (_) { return false; } }
function _fptCloudUser() {
    if (typeof _fptActiveUser === 'function') { try { return _fptActiveUser(); } catch (_) {} }
    try { const d = JSON.parse(document.body.dataset.appData); const u = Array.isArray(d) ? d[0] : d; return { id: u && u.userId ? String(u.userId) : '', name: (u && u.userName) || '' }; } catch (_) { return { id: '', name: '' }; }
}
async function _fptCloudDeriveKey(uid) {
    try {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(FPT_CLOUD_SALT + ':' + uid));
        const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        return 'u' + hex.slice(0, 40);
    } catch (_) { return 'u_' + uid; }
}
async function _fptCloudEnabled() { const { fptCloudSyncEnabled = false } = await chrome.storage.local.get('fptCloudSyncEnabled'); return !!fptCloudSyncEnabled; }

function _fptCloudStable(v) {
    if (Array.isArray(v)) return '[' + v.map(_fptCloudStable).join(',') + ']';
    if (v && typeof v === 'object') { const ks = Object.keys(v).sort(); return '{' + ks.map(k => JSON.stringify(k) + ':' + _fptCloudStable(v[k])).join(',') + '}'; }
    return JSON.stringify(v === undefined ? null : v);
}
function _fptCloudHash(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 0x01000193) >>> 0; } return h.toString(16); }
function _fptCloudStrip(settings) {
    const o = { ...(settings || {}) };
    if (o.fpToolsTheme && typeof o.fpToolsTheme === 'object') { const t = { ...o.fpToolsTheme }; FPT_CLOUD_THEME_STRIP.forEach(f => delete t[f]); o.fpToolsTheme = t; }
    return o;
}
function _fptCloudCanonHash(settings) { return _fptCloudHash(_fptCloudStable(_fptCloudStrip(settings))); }
// keep only allowlisted keys (defends against a malicious cloud record injecting arbitrary keys)
function _fptCloudPick(obj) { const o = {}; if (obj && typeof obj === 'object') FPT_CLOUD_KEYS.forEach(k => { if (Object.prototype.hasOwnProperty.call(obj, k)) o[k] = obj[k]; }); return o; }
function _fptCloudSanitizeCloud(payload) {
    const p = (payload && typeof payload === 'object') ? payload : {};
    const s = _fptCloudStrip(_fptCloudPick(p.s || {}));
    const t = {}; const rawT = (p.t && typeof p.t === 'object') ? p.t : {};
    FPT_CLOUD_KEYS.forEach(k => { if (typeof rawT[k] === 'number' && isFinite(rawT[k])) t[k] = rawT[k]; });
    return { s, t };
}

async function _fptCloudCollect() {
    const cur = await chrome.storage.local.get(FPT_CLOUD_KEYS);
    const out = {};
    FPT_CLOUD_KEYS.forEach(k => { if (cur[k] !== undefined) out[k] = cur[k]; });
    return _fptCloudStrip(out);
}

// field-level merge with deletion tombstones. Returns {s, t, del}:
//  - s = surviving values, t = per-key timestamps (incl. tombstones for deleted keys),
//  - del = keys resolved as deleted (caller removes the locally-present ones).
function _fptCloudMerge(localS, localT, cloudS, cloudT) {
    const s = {}, t = {}, del = [];
    const keys = new Set([...FPT_CLOUD_KEYS, ...Object.keys(localS || {}), ...Object.keys(cloudS || {}), ...Object.keys(localT || {}), ...Object.keys(cloudT || {})]);
    keys.forEach(k => {
        const lHas = localS && Object.prototype.hasOwnProperty.call(localS, k);
        const cHas = cloudS && Object.prototype.hasOwnProperty.call(cloudS, k);
        const lt = (localT && localT[k]) || 0, ct = (cloudT && cloudT[k]) || 0;
        if (lHas && cHas) { if (lt > ct) { s[k] = localS[k]; t[k] = lt; } else { s[k] = cloudS[k]; t[k] = ct; } }
        else if (lHas && !cHas) { if (ct > lt) { del.push(k); t[k] = ct; } else { s[k] = localS[k]; if (lt) t[k] = lt; } }
        else if (!lHas && cHas) { if (lt > ct) { del.push(k); t[k] = lt; } else { s[k] = cloudS[k]; if (ct) t[k] = ct; } }
        else { const m = Math.max(lt, ct); if (m) { t[k] = m; del.push(k); } }
    });
    return { s, t, del };
}
// never lose a timestamp that advanced during an await: take the per-key max
function _fptCloudMergeFieldTs(into, incoming) {
    const out = { ...(into || {}) };
    Object.keys(incoming || {}).forEach(k => { out[k] = Math.max(out[k] || 0, incoming[k] || 0); });
    return out;
}
function _fptCloudVisualDiff(a, b) { return FPT_CLOUD_VISUAL.some(k => _fptCloudStable(a && a[k]) !== _fptCloudStable(b && b[k])); }
function _fptCloudNotifyVisual() { try { if (typeof showNotification === 'function') showNotification('Настройки обновлены с другого устройства — обновите страницу, чтобы применить тему.', false); } catch (_) {} }
function _fptCloudNotifyTooLarge() { try { if (typeof showNotification === 'function') showNotification('Слишком много данных для облака — синхронизация настроек этого аккаунта приостановлена.', true); } catch (_) {} }
function _fptCloudNotifyIfVisual(before, after) { if (_fptCloudVisualDiff(before, after)) _fptCloudNotifyVisual(); }

// apply merged settings to this device: set survivors, remove tombstoned keys, preserve local
// wallpaper, and record exactly what we wrote so onChanged can tell our writes from user edits.
async function _fptCloudApply(mergedS, delKeys) {
    const incoming = _fptCloudStrip(mergedS);
    if (incoming.fpToolsTheme && typeof incoming.fpToolsTheme === 'object') {
        const { fpToolsTheme: localTheme = {} } = await chrome.storage.local.get('fpToolsTheme');
        incoming.fpToolsTheme = { ...incoming.fpToolsTheme };
        FPT_CLOUD_THEME_STRIP.forEach(f => { if (localTheme && localTheme[f] !== undefined) incoming.fpToolsTheme[f] = localTheme[f]; });
    }
    const toRemove = (delKeys || []).filter(k => FPT_CLOUD_KEYSET.has(k));
    _fptCloudApplied = {}; _fptCloudAppliedUntil = Date.now() + 6000;
    Object.keys(incoming).forEach(k => { _fptCloudApplied[k] = _fptCloudStable(incoming[k]); });
    toRemove.forEach(k => { _fptCloudApplied[k] = _fptCloudStable(undefined); });
    if (toRemove.length) await chrome.storage.local.remove(toRemove);
    await chrome.storage.local.set(incoming);
    try {
        if (typeof fptGetProfiles === 'function' && _fptC.name) {
            const p = await fptGetProfiles(); const b = { ...(p[_fptC.name] || {}), ...incoming };
            toRemove.forEach(k => { delete b[k]; });
            p[_fptC.name] = b; await chrome.storage.local.set({ fptProfiles: p });
        }
    } catch (_) {}
}

async function _fptCloudLoadState() {
    try {
        const o = await chrome.storage.local.get(['fptCloudVer', 'fptCloudFieldTs', 'fptCloudLastHash']);
        _fptC.ver = (o.fptCloudVer || {})[_fptC.uid] || 0;
        _fptC.fieldTs = (o.fptCloudFieldTs || {})[_fptC.uid] || {};
        _fptC.lastHash = (o.fptCloudLastHash || {})[_fptC.uid] || '';
    } catch (_) { _fptC.ver = 0; _fptC.fieldTs = {}; _fptC.lastHash = ''; }
}
async function _fptCloudPersist() {
    try {
        const o = await chrome.storage.local.get(['fptCloudVer', 'fptCloudFieldTs', 'fptCloudLastHash']);
        const ver = o.fptCloudVer || {}, fts = o.fptCloudFieldTs || {}, lh = o.fptCloudLastHash || {};
        ver[_fptC.uid] = _fptC.ver; fts[_fptC.uid] = _fptC.fieldTs; lh[_fptC.uid] = _fptC.lastHash;
        await chrome.storage.local.set({ fptCloudVer: ver, fptCloudFieldTs: fts, fptCloudLastHash: lh });
    } catch (_) {}
}

function _fptCloudPushNet(key, payload, baseVersion) { return chrome.runtime.sendMessage({ action: 'fptCloudPush', id: key, settings: payload, updatedAt: Date.now(), baseVersion: baseVersion || 0 }); }
function _fptCloudPullNet(key) { return chrome.runtime.sendMessage({ action: 'fptCloudPull', id: key }); }

// push with compare-and-swap + merge-on-conflict. Re-collects each attempt so a concurrent
// edit is never sent under a stale snapshot. Returns a result object the UI can inspect.
async function _fptCloudPushCAS() {
    if (!_fptCloudAlive() || !_fptC.uid || !(await _fptCloudEnabled())) return { ok: false, disabled: true };
    if (!_fptC.key) _fptC.key = await _fptCloudDeriveKey(_fptC.uid);
    let baseVersion = _fptC.ver || 0;
    for (let attempt = 0; attempt < 4; attempt++) {
        const localS = await _fptCloudCollect();
        const r = await _fptCloudPushNet(_fptC.key, { s: localS, t: _fptC.fieldTs }, baseVersion).catch(() => null);
        if (!r) { _fptCloudScheduleRetry(); return { ok: false, network: true }; }
        if (r.ok && typeof r.version === 'number') {
            _fptC.ver = r.version; _fptC.lastHash = _fptCloudCanonHash(localS); await _fptCloudPersist();
            if (_fptCloudRetryTimer) { clearTimeout(_fptCloudRetryTimer); _fptCloudRetryTimer = null; }
            return { ok: true, version: r.version };
        }
        if (r.status === 413) {                                        // oversized -> stop re-pushing this payload
            _fptC.lastHash = _fptCloudCanonHash(localS); await _fptCloudPersist();
            _fptCloudNotifyTooLarge();
            return { ok: false, tooLarge: true };
        }
        if (r.status === 409) {
            const cloud = _fptCloudSanitizeCloud(r.settings);
            const cloudVer = (typeof r.version === 'number') ? r.version : 0;
            const merged = _fptCloudMerge(localS, _fptC.fieldTs, cloud.s, cloud.t);
            const changed = _fptCloudCanonHash(merged.s) !== _fptCloudCanonHash(localS) || merged.del.some(k => Object.prototype.hasOwnProperty.call(localS, k));
            if (changed) { _fptCloudNotifyIfVisual(localS, merged.s); await _fptCloudApply(merged.s, merged.del); }
            _fptC.fieldTs = _fptCloudMergeFieldTs(_fptC.fieldTs, merged.t);
            _fptC.ver = cloudVer; baseVersion = cloudVer; await _fptCloudPersist();
            continue;
        }
        _fptCloudScheduleRetry(); return { ok: false, status: r.status };
    }
    _fptCloudScheduleRetry(); return { ok: false, conflictExhausted: true };
}

async function _fptCloudReconcile(trigger) {
    try {
        if (!_fptCloudAlive() || !_fptC.uid || !(await _fptCloudEnabled())) { _fptCloudReadyFlag = true; return; }
        _fptCloudOn = true;
        if (!_fptC.key) _fptC.key = await _fptCloudDeriveKey(_fptC.uid);
        const r = await _fptCloudPullNet(_fptC.key).catch(() => null);
        const localS = await _fptCloudCollect();
        const localHash = _fptCloudCanonHash(localS);

        if (r && r.ok && r.exists) {
            const cloud = _fptCloudSanitizeCloud(r.settings);
            const cloudS = cloud.s, cloudT = cloud.t;
            const cloudVer = (typeof r.version === 'number') ? r.version : 0;

            if (cloudVer > (_fptC.ver || 0)) {
                const merged = _fptCloudMerge(localS, _fptC.fieldTs, cloudS, cloudT);
                const afterHash = _fptCloudCanonHash(merged.s);
                const changedLocal = afterHash !== localHash || merged.del.some(k => Object.prototype.hasOwnProperty.call(localS, k));
                if (changedLocal) await _fptCloudApply(merged.s, merged.del);
                _fptC.fieldTs = _fptCloudMergeFieldTs(_fptC.fieldTs, merged.t); _fptC.ver = cloudVer;
                const pushUp = afterHash !== _fptCloudCanonHash(cloudS) || merged.del.some(k => Object.prototype.hasOwnProperty.call(cloudS, k));
                if (pushUp) { _fptC.lastHash = ''; await _fptCloudPersist(); await _fptCloudPushCAS(); }
                else { _fptC.lastHash = afterHash; await _fptCloudPersist(); }
                _fptCloudReadyFlag = true;
                if (changedLocal && trigger === 'load') { setTimeout(() => { try { location.reload(); } catch (_) {} }, 400); return; }
                if (changedLocal && (trigger === 'focus' || trigger === 'interval') && _fptCloudVisualDiff(localS, merged.s)) _fptCloudNotifyVisual();
                return;
            }

            _fptCloudReadyFlag = true;
            const cloudHash = _fptCloudCanonHash(cloudS);
            if (localHash !== cloudHash) { await _fptCloudPushCAS(); }
            else if (_fptC.lastHash !== localHash || (_fptC.ver || 0) < cloudVer) { _fptC.lastHash = localHash; _fptC.ver = Math.max(_fptC.ver || 0, cloudVer); await _fptCloudPersist(); }
            return;
        }

        _fptCloudReadyFlag = true;
        if (r && r.ok && !r.exists) await _fptCloudPushCAS();   // no cloud record yet -> baseline
    } catch (_) { _fptCloudReadyFlag = true; }
}

function _fptCloudSchedulePush() {
    if (_fptCloudPushTimer) clearTimeout(_fptCloudPushTimer);
    _fptCloudPushTimer = setTimeout(() => { _fptCloudPushTimer = null; _fptCloudRun(_fptCloudPushCAS); }, FPT_CLOUD_DEBOUNCE_MS);
}
function _fptCloudScheduleRetry() {
    if (_fptCloudRetryTimer) return;
    _fptCloudRetryTimer = setTimeout(() => { _fptCloudRetryTimer = null; if (_fptCloudOn) _fptCloudRun(_fptCloudPushCAS); }, FPT_CLOUD_RETRY_MS);
}
function _fptCloudOnChanged(changes, area) {
    if (area !== 'local' || !_fptCloudOn || !_fptCloudReadyFlag || !_fptC.uid) return;
    if (Date.now() < _fptCloudSuspendUntil) return;                 // account switch in progress
    if (Date.now() > _fptCloudAppliedUntil) _fptCloudApplied = {};
    const now = Date.now(); let touched = false;
    for (const k of Object.keys(changes)) {
        if (!FPT_CLOUD_KEYSET.has(k)) continue;
        const nv = _fptCloudStable(changes[k] ? changes[k].newValue : undefined);
        if (_fptCloudApplied[k] !== undefined && _fptCloudApplied[k] === nv) { delete _fptCloudApplied[k]; continue; }   // our own apply-write
        _fptC.fieldTs[k] = now; touched = true;
    }
    if (touched) { _fptCloudPersist(); _fptCloudSchedulePush(); }
}
function _fptCloudStartInterval() {
    if (_fptCloudIntervalSet) return; _fptCloudIntervalSet = true;
    setInterval(() => { if (_fptCloudOn && document.visibilityState === 'visible') _fptCloudRun(() => _fptCloudReconcile('interval')); }, FPT_CLOUD_INTERVAL_MS);
}

// called by accounts.js before an in-page account swap so the swap's storage writes are not
// recorded/pushed under the current account's cloud record.
function fptCloudSuspendSync(ms) {
    _fptCloudSuspendUntil = Date.now() + (ms || 30000);
    if (_fptCloudPushTimer) { clearTimeout(_fptCloudPushTimer); _fptCloudPushTimer = null; }
}

// ===================== UI (Settings -> «Импорт/экспорт» page) =====================
function _fptCloudSay(msg) { const el = document.getElementById('fpt-cloud-status'); if (el) el.textContent = msg || ''; }
async function _fptCloudRefreshUI() {
    const t = document.getElementById('fpt-cloud-toggle'); if (!t) return;
    const on = await _fptCloudEnabled(); t.checked = on;
    const panel = document.getElementById('fpt-cloud-panel'); if (panel) panel.style.display = on ? 'flex' : 'none';
    if (on) { const u = _fptCloudUser(); _fptCloudSay(u.id ? `Аккаунт: ${u.name || '—'} (id ${u.id}) · облачная версия ${_fptC.ver || 0}` : 'Войдите в аккаунт FunPay, чтобы синхронизировать.'); }
}
function fptCloudInitUI() {
    const t = document.getElementById('fpt-cloud-toggle');
    if (!t) return;
    if (!t.dataset.wired) {
        t.dataset.wired = '1';
        t.addEventListener('change', async () => {
            const on = t.checked;
            await chrome.storage.local.set({ fptCloudSyncEnabled: on });
            const panel = document.getElementById('fpt-cloud-panel'); if (panel) panel.style.display = on ? 'flex' : 'none';
            if (on) {
                const u = _fptCloudUser();
                if (!u.id) { _fptCloudSay('Войдите в аккаунт FunPay, чтобы синхронизировать.'); return; }
                _fptC.uid = u.id; _fptC.name = u.name || '';
                _fptC.key = await _fptCloudDeriveKey(_fptC.uid);
                await _fptCloudLoadState();
                // stamp current config so this device's settings carry real timestamps
                // (otherwise an empty-timestamp baseline makes every tie go to the cloud).
                const cur = await _fptCloudCollect(); const now = Date.now();
                Object.keys(cur).forEach(k => { if (_fptC.fieldTs[k] === undefined) _fptC.fieldTs[k] = now; });
                await _fptCloudPersist();
                _fptCloudOn = true; _fptCloudReadyFlag = true;
                _fptCloudSay('Включаю…');
                await _fptCloudRun(() => _fptCloudReconcile('focus'));
                _fptCloudStartInterval();
                await _fptCloudRefreshUI();
                _fptCloudSay('Готово ✓ Настройки привязаны к аккаунту и подтягиваются автоматически.');
            } else {
                _fptCloudOn = false;
                if (_fptCloudPushTimer) { clearTimeout(_fptCloudPushTimer); _fptCloudPushTimer = null; }
                if (_fptCloudRetryTimer) { clearTimeout(_fptCloudRetryTimer); _fptCloudRetryTimer = null; }
                _fptCloudSay('Синхронизация выключена (данные в облаке сохранены).');
            }
        });
        document.getElementById('fpt-cloud-push-btn')?.addEventListener('click', async () => {
            if (!(await _fptCloudEnabled())) { _fptCloudSay('Сначала включите синхронизацию.'); return; }
            _fptCloudSay('Отправляю…');
            const r = await _fptCloudRun(_fptCloudPushCAS);
            await _fptCloudRefreshUI();
            if (r && r.ok) _fptCloudSay('Отправлено ✓');
            else if (r && r.tooLarge) _fptCloudSay('Слишком много данных для облака — синхронизация приостановлена.');
            else _fptCloudSay('Не удалось отправить — повторю автоматически.');
        });
        document.getElementById('fpt-cloud-pull-btn')?.addEventListener('click', async () => {
            if (!(await _fptCloudEnabled())) { _fptCloudSay('Сначала включите синхронизацию.'); return; }
            if (!confirm('Загрузить настройки из облака и заменить локальные для этого аккаунта?')) return;
            _fptCloudSay('Загружаю из облака…');
            _fptC.fieldTs = {}; _fptC.ver = 0; _fptC.lastHash = ''; await _fptCloudPersist();   // make cloud win
            await _fptCloudRun(() => _fptCloudReconcile('load'));
            await _fptCloudRefreshUI();
        });
    }
    _fptCloudRefreshUI();
}

// ===================== boot =====================
try { if (_fptCloudAlive() && chrome.storage && chrome.storage.onChanged) chrome.storage.onChanged.addListener(_fptCloudOnChanged); } catch (_) {}
try { document.addEventListener('visibilitychange', () => { if (_fptCloudOn && document.visibilityState === 'visible') _fptCloudRun(() => _fptCloudReconcile('focus')); }); } catch (_) {}
(async () => {
    try {
        const u = _fptCloudUser(); _fptC.uid = u.id || ''; _fptC.name = u.name || '';
        if (!_fptC.uid) { _fptCloudReadyFlag = true; return; }
        _fptCloudOn = await _fptCloudEnabled();
        await _fptCloudLoadState();
        if (_fptCloudOn) _fptC.key = await _fptCloudDeriveKey(_fptC.uid);
        await _fptCloudRun(() => _fptCloudReconcile('load'));
        if (_fptCloudOn) _fptCloudStartInterval();
    } catch (_) { _fptCloudReadyFlag = true; }
})();
