// content/features/vps_panel.js
// Секция «Настройки → VPS»: подключение к своему VPS-сервису (URL+токен), добавление
// аккаунтов на VPS (имя+golden_key+прокси) и живая статистика по ним.
//
// Запросы идут ПРЯМО из контент-скрипта (сервис отдаёт CORS *). VPS обязан быть по
// HTTPS: страница funpay.com — https, fetch на http блокируется как mixed-content, и
// слать golden_key открытым http небезопасно. Связь с VPS = плоскость управления;
// сам VPS держит аккаунты онлайн и отвечает (см. vps/server.js).

async function _vpsCfg() { const { fptVps } = await chrome.storage.local.get('fptVps'); return fptVps || {}; }

async function _vpsApi(path, method = 'GET', body) {
    const { url, token } = await _vpsCfg();
    if (!url || !token) throw new Error('нет подключения');
    const res = await fetch(url.replace(/\/+$/, '') + path, {
        method,
        headers: { authorization: 'Bearer ' + token, ...(body ? { 'content-type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined
    });
    if (res.status === 401) throw new Error('неверный токен');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
}

function _vpsSay(msg, err) {
    const el = document.getElementById('fpt-vps-status');
    if (el) { el.textContent = msg || ''; el.style.color = err ? 'var(--fpt-danger, #e05252)' : 'var(--fpt-text-dim, #9aa)'; }
}

// Список имён аккаунтов, отданных на VPS — координация (анти-дубль) читает его.
async function _vpsSetManaged(names) {
    await chrome.storage.local.set({ fptVpsManaged: Array.from(new Set(names)) });
}

function _vpsEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

async function _vpsRenderList() {
    const list = document.getElementById('fpt-vps-list');
    if (!list) return;
    try {
        const data = await _vpsApi('/stats');
        const accounts = (data && data.accounts) || [];
        await _vpsSetManaged(accounts.map(a => a.name).filter(Boolean));
        if (!accounts.length) { list.innerHTML = '<p class="template-info">На VPS пока нет аккаунтов. Добавьте ниже.</p>'; return; }
        list.innerHTML = accounts.map(a => {
            const dot = a.online ? 'var(--fpt-success, #4caf82)' : 'var(--fpt-danger, #e05252)';
            const err = a.error ? `<div style="color:var(--fpt-danger,#e05252);font-size:11px;">${_vpsEsc(a.error)}</div>` : '';
            const meta = a.pending ? 'обновляется…' : `${_vpsEsc(a.balance || '—')} · непрочит.: ${a.unread || 0}`;
            return `<div class="fpt-vps-row" data-id="${_vpsEsc(a.id)}" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--fpt-line,rgba(255,255,255,.08));border-radius:8px;margin-bottom:6px;">
                <span style="width:9px;height:9px;border-radius:50%;background:${dot};flex:none;"></span>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;">${_vpsEsc(a.name || '(без имени)')}</div>
                    <div style="font-size:12px;color:var(--fpt-text-dim,#9aa);">${meta}</div>${err}
                </div>
                <button class="btn btn-default fpt-vps-del" data-id="${_vpsEsc(a.id)}" style="padding:5px 10px;">Снять с VPS</button>
            </div>`;
        }).join('');
        list.querySelectorAll('.fpt-vps-del').forEach(b => b.addEventListener('click', async () => {
            if (!confirm('Снять аккаунт с VPS? Управление вернётся в браузер.')) return;
            try { await _vpsApi('/accounts?id=' + encodeURIComponent(b.dataset.id), 'DELETE'); await _vpsRenderList(); }
            catch (e) { _vpsSay('Ошибка: ' + e.message, true); }
        }));
    } catch (e) {
        list.innerHTML = `<p class="template-info" style="color:var(--fpt-danger,#e05252);">Не удалось получить статистику: ${_vpsEsc(e.message)}</p>`;
    }
}

async function _vpsFillAccountPicker() {
    const sel = document.getElementById('fpt-vps-add-account');
    if (!sel) return;
    const { fpToolsAccounts = [] } = await chrome.storage.local.get('fpToolsAccounts');
    const { fptVpsManaged = [] } = await chrome.storage.local.get('fptVpsManaged');
    const avail = fpToolsAccounts.filter(a => a && a.key && a.name && !fptVpsManaged.includes(a.name));
    sel.innerHTML = avail.length
        ? avail.map(a => `<option value="${_vpsEsc(a.name)}">${_vpsEsc(a.name)}</option>`).join('')
        : '<option value="">— нет доступных аккаунтов —</option>';
}

async function _vpsConnect() {
    let url = (document.getElementById('fpt-vps-url')?.value || '').trim();
    const token = (document.getElementById('fpt-vps-token')?.value || '').trim();
    if (!url || !token) { _vpsSay('Укажите URL и токен.', true); return; }
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    if (/^http:\/\//i.test(url)) { _vpsSay('Нужен HTTPS — по http браузер заблокирует запрос, и ключи нельзя слать открыто.', true); return; }
    await chrome.storage.local.set({ fptVps: { url, token } });
    _vpsSay('Проверяю…');
    try {
        await _vpsApi('/stats');
        _vpsSay('Подключено ✓');
        const body = document.getElementById('fpt-vps-body');
        if (body) body.style.display = 'block';
        await _vpsFillAccountPicker();
        await _vpsRenderList();
    } catch (e) {
        _vpsSay('Не подключилось: ' + e.message, true);
        const body = document.getElementById('fpt-vps-body');
        if (body) body.style.display = 'none';
    }
}

async function _vpsAddAccount() {
    const name = document.getElementById('fpt-vps-add-account')?.value || '';
    const proxy = (document.getElementById('fpt-vps-add-proxy')?.value || '').trim();
    if (!name) { _vpsSay('Выберите аккаунт.', true); return; }
    const { fpToolsAccounts = [] } = await chrome.storage.local.get('fpToolsAccounts');
    const acc = fpToolsAccounts.find(a => a && a.name === name);
    if (!acc || !acc.key) { _vpsSay('У аккаунта нет сохранённого ключа.', true); return; }
    _vpsSay('Отправляю на VPS…');
    try {
        // авто-ответы аккаунта (текст) сразу уезжают на VPS — чтобы VPS отвечал так же.
        const { fptProfiles = {} } = await chrome.storage.local.get('fptProfiles');
        const autoReplies = (fptProfiles[name] || {}).fpToolsAutoReplies || {};
        await _vpsApi('/accounts', 'POST', { name, golden_key: acc.key, proxy, autoReplies: _vpsStripImgs(autoReplies) });
        const proxyEl = document.getElementById('fpt-vps-add-proxy'); if (proxyEl) proxyEl.value = '';
        _vpsSay('Аккаунт на VPS ✓ — в браузере его авто-ответ и онлайн-пинг отключены.');
        await _vpsFillAccountPicker();
        await _vpsRenderList();
    } catch (e) { _vpsSay('Ошибка: ' + e.message, true); }
}

// картинки (base64) на VPS не нужны для текстовых ответов — режем, как в облаке.
function _vpsStripImgs(ar) {
    if (!ar || typeof ar !== 'object') return ar;
    const a = { ...ar };
    ['greetingImages', 'newOrderReplyImages', 'orderConfirmReplyImages', 'reviewTemplateImages'].forEach(f => delete a[f]);
    if (Array.isArray(a.keywords)) a.keywords = a.keywords.map(r => (r && typeof r === 'object' && 'images' in r) ? (() => { const c = { ...r }; delete c.images; return c; })() : r);
    return a;
}

// Онгоинг авто-синк: текст авто-ответов активного аккаунта едет на VPS при каждом
// изменении (если этот аккаунт отдан на VPS). Работает и при закрытой панели.
let _vpsSyncTimer = null;
async function _vpsSyncActiveAutoReplies() {
    try {
        const cfg = await _vpsCfg();
        if (!cfg.url || !cfg.token) return;
        const name = document.querySelector('.user-link-name')?.textContent.trim();
        if (!name) return;
        const { fptVpsManaged = [], fpToolsAutoReplies = {} } = await chrome.storage.local.get(['fptVpsManaged', 'fpToolsAutoReplies']);
        if (!fptVpsManaged.includes(name)) return;
        await _vpsApi('/accounts', 'POST', { name, autoReplies: _vpsStripImgs(fpToolsAutoReplies) });
    } catch (_) { /* повторим при следующем изменении */ }
}
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes.fpToolsAutoReplies) return;
        clearTimeout(_vpsSyncTimer);
        _vpsSyncTimer = setTimeout(_vpsSyncActiveAutoReplies, 1500);   // дебаунс серии правок
    });
}

async function fptVpsInitUI() {
    const connectBtn = document.getElementById('fpt-vps-connect');
    if (!connectBtn) return;
    if (!connectBtn.dataset.wired) {
        connectBtn.dataset.wired = '1';
        connectBtn.addEventListener('click', _vpsConnect);
        document.getElementById('fpt-vps-add-btn')?.addEventListener('click', _vpsAddAccount);
    }
    const cfg = await _vpsCfg();
    const urlEl = document.getElementById('fpt-vps-url'); if (urlEl && cfg.url) urlEl.value = cfg.url;
    const tokEl = document.getElementById('fpt-vps-token'); if (tokEl && cfg.token) tokEl.value = cfg.token;
    if (cfg.url && cfg.token) {
        const body = document.getElementById('fpt-vps-body'); if (body) body.style.display = 'block';
        await _vpsFillAccountPicker();
        await _vpsRenderList();
    }
}
