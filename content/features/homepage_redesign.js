function stringToHslColor(str, s = 60, l = 40) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${hash % 360}, ${s}%, ${l}%)`;
}

// Strip emoji, box-drawing, geometric/decorative symbols and collapse the result.
// Sellers pad lot titles with ▂▃▄█🔥🔮❖►◄ etc.; we show clean readable text only.
function cleanText(str) {
    return String(str ?? '')
        .replace(/[\u{1F000}-\u{1FAFF}]/gu, '')   // emoji & symbols
        .replace(/[\u{2600}-\u{27BF}]/gu, '')      // misc symbols, dingbats
        .replace(/[\u{2B00}-\u{2BFF}]/gu, '')      // arrows/stars
        .replace(/[\u{2190}-\u{21FF}]/gu, '')      // arrows
        .replace(/[\u{2300}-\u{23FF}]/gu, '')      // technical
        .replace(/[\u{2500}-\u{259F}]/gu, '')      // box drawing + block elements ▂▃▄█
        .replace(/[\u{25A0}-\u{25FF}]/gu, '')      // geometric shapes ■●◆
        .replace(/[\u{FE00}-\u{FE0F}\u{200D}]/gu, '') // variation selectors, ZWJ
        .replace(/[\u{2000}-\u{200A}]/gu, ' ')     // exotic spaces
        .replace(/\s{2,}/g, ' ')
        .replace(/^[\s,·|—–\-]+|[\s,·|—–\-]+$/g, '')
        .trim();
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));
}

function loadRedesignFonts() {
    if (document.getElementById('fpt-home-redesign-fonts')) return;
    const link = document.createElement('link');
    link.id = 'fpt-home-redesign-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=optional';
    document.head.appendChild(link);
}

function getSellerDisplayName() {
    const node = document.querySelector('.user-link-name, .navbar-right.logged .dropdown-toggle');
    if (!node) return '';
    const text = node.textContent.replace(/\s+/g, ' ').trim();
    if (!text || text.length > 32) return '';
    const lower = text.toLowerCase();
    if (lower.includes('войти') || lower.includes('зарегистрироваться')) return '';
    return text;
}

function getUniqueCategoryCount(games) {
    const categories = new Set();
    games.forEach(game => {
        game.categories.forEach(category => {
            if (category.name) categories.add(category.name);
        });
    });
    return categories.size;
}

function extractGamesFromContainer(container) {
    if (!container) return [];
    const gameItems = container.querySelectorAll('.promo-game-item');
    const data = [];
    gameItems.forEach(item => {
        const titleElement = item.querySelector('.game-title a');
        if (titleElement) {
            const gameName = titleElement.textContent.trim();
            if (data.some(g => g.name === gameName)) return;
            const game = { name: gameName, url: titleElement.href, categories: [] };
            const categoryList = item.querySelector('.list-inline:not(.hidden)');
            if(categoryList) {
                 categoryList.querySelectorAll('li a').forEach(cat => {
                    game.categories.push({ name: cat.textContent.trim(), url: cat.href });
                });
            }
            data.push(game);
        }
    });
    return data;
}

// ── Real data scraping ────────────────────────────────────────────────────────
async function getHomepageRealData() {
    const result = { balance: null, username: '', ordersActive: null, recentOrders: null };

    // Username from app data JSON embedded in page
    try {
        const raw = document.body?.dataset?.appData;
        if (raw) {
            const d = JSON.parse(raw);
            const ad = Array.isArray(d) ? d[0] : d;
            if (ad?.userName) result.username = ad.userName;
        }
    } catch(e) {}
    if (!result.username) result.username = getSellerDisplayName();

    // Balance from header badge
    const balEl = document.querySelector('.badge-balance, .balances-value, .user-balance-sum, .navbar-balance');
    if (balEl) {
        const txt = balEl.textContent.replace(/[^\d\s.,₽]/g, '').replace(/\s+/g, ' ').trim();
        if (txt) result.balance = txt + (txt.includes('₽') ? '' : ' ₽');
    }

    // Orders + automation toggle states from chrome.storage
    try {
        const store = await chrome.storage.local.get([
            'fpToolsSalesData', 'autoBumpEnabled', 'fpToolsSmartBumpEnabled', 'fpToolsAutoReplies', 'fpToolsSlashCommands'
        ]);
        const fpToolsSalesData = store.fpToolsSalesData;
        if (fpToolsSalesData && typeof fpToolsSalesData === 'object') {
            const all = Object.values(fpToolsSalesData);
            result.salesCount = all.length;
            result.ordersActive = all.filter(o => ['new', 'paid'].includes(o.orderStatus)).length;
            result.recentOrders = [...all]
                .sort((a, b) => (b.orderDate || 0) - (a.orderDate || 0))   // newest first
                .slice(0, 4)
                .map(o => {
                    const clean = cleanText(o.description) || cleanText(o.subcategoryName) || 'Заказ';
                    return {
                        id: '#' + (o.orderId || '—'),
                        name: clean.length > 64 ? clean.slice(0, 63) + '…' : clean,
                        amt: o.price != null ? Math.round(o.price).toLocaleString('ru-RU') + ' ₽' : '—',
                        status: o.orderStatus === 'paid' ? 'Оплачен' : o.orderStatus === 'closed' ? 'Закрыт' : o.orderStatus === 'refunded' ? 'Возврат' : 'Новый',
                        tone: o.orderStatus === 'paid' ? 'ok' : o.orderStatus === 'closed' ? 'done' : o.orderStatus === 'refunded' ? 'ref' : 'new',
                    };
                });
        }
        result.toggles = fptHomeTogglesFrom(store);
    } catch(e) {}

    return result;
}

// Флаги «Авто-ответы» — все подфункции вкладки; тоггл главной показывает,
// включена ли ХОТЬ ОДНА, и гасит все разом при выключении.
const FPT_AR_FLAGS = ['autoReviewEnabled', 'greetingEnabled', 'keywordsEnabled',
    'newOrderReplyEnabled', 'orderConfirmReplyEnabled', 'bonusForReviewEnabled'];

function fptHomeTogglesFrom(store) {
    const ar = store.fpToolsAutoReplies || {};
    return {
        // авто-поднятие включено, если работает любой из режимов (умное или по таймеру)
        autobump: !!store.autoBumpEnabled || !!store.fpToolsSmartBumpEnabled,
        delivery: !!ar.autoDeliveryEnabled,
        autoreview: FPT_AR_FLAGS.some(f => !!ar[f]),
        // слэш-команды живут в объекте fpToolsSlashCommands; включены по умолчанию
        slash: (store.fpToolsSlashCommands || {}).enabled !== false,
    };
}

// Переключение автоматизаций прямо с главной (как в funpay-redesign).
// Каждый ключ пишется именно туда, откуда его читает соответствующая фича.
async function setHomeAutomation(key, on) {
    if (key === 'autobump') {
        // вкл — таймерный режим; выкл — гасим оба режима
        if (on) await chrome.storage.local.set({ autoBumpEnabled: true });
        else await chrome.storage.local.set({ autoBumpEnabled: false, fpToolsSmartBumpEnabled: false });
    } else if (key === 'slash') {
        const { fpToolsSlashCommands = {} } = await chrome.storage.local.get('fpToolsSlashCommands');
        fpToolsSlashCommands.enabled = on;
        await chrome.storage.local.set({ fpToolsSlashCommands });
    } else if (key === 'delivery') {
        const { fpToolsAutoReplies = {} } = await chrome.storage.local.get('fpToolsAutoReplies');
        fpToolsAutoReplies.autoDeliveryEnabled = on;
        await chrome.storage.local.set({ fpToolsAutoReplies });
    } else if (key === 'autoreview') {
        const { fpToolsAutoReplies = {} } = await chrome.storage.local.get('fpToolsAutoReplies');
        if (on) fpToolsAutoReplies.autoReviewEnabled = true;
        else FPT_AR_FLAGS.forEach(f => { fpToolsAutoReplies[f] = false; });
        await chrome.storage.local.set({ fpToolsAutoReplies });
    }
}

// Live-синк тогглов главной с настройками: изменил в панели — обновилось тут.
function fptWatchHomeToggles() {
    if (window.__fptHomeTglWatch) return;
    window.__fptHomeTglWatch = true;
    try {
        chrome.storage.onChanged.addListener(async (changes, area) => {
            if (area !== 'local') return;
            if (!changes.autoBumpEnabled && !changes.fpToolsSmartBumpEnabled &&
                !changes.fpToolsAutoReplies && !changes.fpToolsSlashCommands) return;
            const store = await chrome.storage.local.get([
                'autoBumpEnabled', 'fpToolsSmartBumpEnabled', 'fpToolsAutoReplies', 'fpToolsSlashCommands']);
            const tg = fptHomeTogglesFrom(store);
            for (const [key, on] of Object.entries(tg)) {
                const row = document.querySelector('.cc-action[data-auto-key="' + key + '"]');
                if (!row) continue;
                const t = row.querySelector('.tgl');
                if (t) { t.setAttribute('data-on', String(on)); t.setAttribute('aria-checked', String(on)); }
                const meta = row.querySelector('.cc-action-meta');
                if (meta) meta.textContent = on ? 'включено' : 'выключено';
            }
        });
    } catch(e) {}
}

// ── Mini FPT Global Chat (homepage widget) ────────────────────────────────────
const FPT_HOME_GC_URL = 'https://fpt-chat.starobinskiy01.workers.dev';
let _hgcLastTs = 0;
let _hgcTimer = null;
let _hgcRenderedIds = new Set();

function _hgcEsc(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
}

async function _hgcPost(payload) {
    const r = await fetch(FPT_HOME_GC_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    return r.json().catch(() => ({}));
}

function _hgcRender(msgs) {
    const feed = document.getElementById('fpt-home-gc-feed');
    if (!feed) return;
    feed.querySelector('.fpt-home-gc-loading')?.remove();

    let added = false;
    (msgs || []).forEach(m => {
        if (!m?.id || _hgcRenderedIds.has(m.id)) return;
        _hgcRenderedIds.add(m.id);
        added = true;
        if (m.ts && m.ts > _hgcLastTs) _hgcLastTs = m.ts;

        const av = _hgcEsc((m.nick || 'U').charAt(0).toUpperCase());
        const time = m.ts ? new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const row = document.createElement('div');
        row.className = 'cc-secret-row';
        row.innerHTML =
            `<div class="cc-secret-av">${av}</div>` +
            `<div class="cc-secret-body">` +
              `<div class="cc-secret-top">` +
                `<span class="cc-secret-name">${_hgcEsc(m.nick || 'Аноним')}</span>` +
                `<span class="cc-secret-time faint mono">${_hgcEsc(time)}</span>` +
              `</div>` +
              `<div class="cc-secret-text">${_hgcEsc(m.text || '')}</div>` +
            `</div>`;
        feed.appendChild(row);
    });

    if (added && feed.scrollHeight - feed.scrollTop - feed.clientHeight < 120)
        feed.scrollTop = feed.scrollHeight;
}

async function _hgcFetch() {
    try {
        const data = await _hgcPost({ action: 'fetch', since: _hgcLastTs });
        if (Array.isArray(data?.messages)) _hgcRender(data.messages);
    } catch(e) {}
}

async function _hgcSend() {
    const input = document.getElementById('fpt-home-gc-input');
    const btn = document.getElementById('fpt-home-gc-send');
    if (!input) return;
    const text = (input.value || '').trim();
    if (!text) return;

    let token = null;
    try {
        const d = await chrome.storage.local.get('fpToolsGCToken');
        token = d.fpToolsGCToken;
    } catch(e) {}

    if (!token) {
        // Open FPT popup → global chat tab
        document.getElementById('fpToolsButton')?.click();
        setTimeout(() => document.querySelector('.fp-tools-popup li[data-page="global_chat"]')?.click(), 350);
        return;
    }

    let nick = '';
    try {
        const raw = document.body?.dataset?.appData;
        const ad = JSON.parse(raw || '{}');
        nick = (Array.isArray(ad) ? ad[0] : ad)?.userName || '';
    } catch(e) {}
    if (!nick) nick = getSellerDisplayName() || 'FunPay user';

    if (btn) btn.disabled = true;
    try {
        const r = await fetch(FPT_HOME_GC_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'send', token, nick, avatar: '', url: '', text }),
        });
        if (r.ok) { input.value = ''; await _hgcFetch(); }
    } catch(e) {}
    if (btn) btn.disabled = false;
}

function initHomeGlobalChat() {
    _hgcRenderedIds = new Set();
    _hgcLastTs = 0;
    const feed = document.getElementById('fpt-home-gc-feed');
    if (feed) feed.innerHTML = '<div class="fpt-home-gc-loading home-secret-time" style="padding:14px 16px;">Загрузка…</div>';

    _hgcFetch();
    if (_hgcTimer) clearInterval(_hgcTimer);
    _hgcTimer = setInterval(() => {
        const rail = document.querySelector('.cc-chat');
        if (rail && !rail.classList.contains('is-collapsed')) _hgcFetch();
    }, 15000);

    document.getElementById('fpt-home-gc-send')?.addEventListener('click', _hgcSend);
    document.getElementById('fpt-home-gc-input')?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _hgcSend(); }
    });
}

function createGameIcon(game) {
    const link = document.createElement('a');
    link.href = game.url;
    link.className = 'hero-game-icon';
    link.target = '_blank';
    link.title = game.name;
    link.setAttribute('aria-label', game.name);
    link.style.animationDelay = `-${(Math.random() * 8).toFixed(2)}s`;
    link.style.animationDuration = `${(Math.random() * 5 + 8).toFixed(2)}s`;
    const firstLetter = game.name.charAt(0).toUpperCase();
    const avatarColor = stringToHslColor(game.name, 70, 60);
    let domain;
    if (game.name.toLowerCase() === 'telegram') {
        domain = 'web.telegram.org';
    } else {
        const cleanGameName = game.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9-]/g, '');
        domain = `${cleanGameName}.com`;
    }
    const iconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
    link.innerHTML = `
        <div class="fp-fallback-icon" style="background-color: ${avatarColor};">${firstLetter}</div>
        <img class="fp-game-icon" data-src="${iconUrl}" alt="${game.name}" style="display: none;">
    `;
    return link;
}

// ── Lucide inline icons (thin line, matches funpay-redesign reference) ──────────
const HOME_ICON_PATHS = {
    Activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    ArrowUpRight: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
    ArrowUpNarrowWide: '<path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="M11 12h4"/><path d="M11 16h7"/><path d="M11 20h10"/>',
    Zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    MessageSquareText: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M13 8H7"/><path d="M17 12H7"/>',
    TerminalSquare: '<path d="m7 11 2-2-2-2"/><path d="M11 13h4"/><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>',
    Lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    ChevronsRight: '<path d="m6 17 5-5-5-5"/><path d="m13 17 5-5-5-5"/>',
    ArrowUp: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    ShieldAlert: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    Search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    X: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
};
function hic(name, size) {
    const p = HOME_ICON_PATHS[name] || '';
    const s = size || 16;
    return `<svg class="fpt-ico" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}

function gameDomain(name) {
    if (name.toLowerCase() === 'telegram') return 'web.telegram.org';
    const clean = name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9-]/g, '');
    return `${clean}.com`;
}

// ── Посещения игр: личная статистика для «Недавно» и «Частые» ────────────────
// localStorage — синхронная запись на клик переживает переход страницы, данные
// привязаны к funpay.com, где и нужны. FunPay не отдаёт глобальную популярность,
// поэтому «популярное» = то, что чаще открывает сам пользователь.
// Русское склонение: 1 раздел / 2 раздела / 5 разделов.
function fptPlural(n, forms) {
    const a = Math.abs(n) % 100, b = n % 10;
    if (a > 10 && a < 20) return forms[2];
    if (b > 1 && b < 5) return forms[1];
    if (b === 1) return forms[0];
    return forms[2];
}

// Выбранный режим сортировки каталога ('freq' | 'az'). Пусто = авто-выбор.
const FPT_SORT_KEY = 'fptCatalogSort';
function fptGetSortMode() {
    try { const m = localStorage.getItem(FPT_SORT_KEY); return (m === 'freq' || m === 'az') ? m : null; } catch (_) { return null; }
}
function fptSetSortMode(mode) {
    try { localStorage.setItem(FPT_SORT_KEY, mode); } catch (_) {}
}
// Единый источник правды: сохранённый выбор пользователя, иначе авто —
// «Частые», если есть отмеченные частые карточки, иначе «А–Я».
function fptResolveSortMode(grid) {
    return fptGetSortMode() || ((grid && grid.querySelector('.gcard-fav')) ? 'freq' : 'az');
}

const FPT_VISITS_KEY = 'fptGameVisits';
function fptGetGameVisits() {
    try { return JSON.parse(localStorage.getItem(FPT_VISITS_KEY)) || {}; } catch (_) { return {}; }
}
function fptRecordGameVisit(name, url) {
    if (!url) return;
    try {
        const v = fptGetGameVisits();
        const e = v[url] || { name, url, count: 0, last: 0 };
        if (name) e.name = name;
        e.url = url;
        e.count = (e.count || 0) + 1;
        e.last = Date.now();
        v[url] = e;
        const keys = Object.keys(v);
        if (keys.length > 60) {
            keys.sort((a, b) => (v[b].last || 0) - (v[a].last || 0)).slice(60).forEach(k => delete v[k]);
        }
        localStorage.setItem(FPT_VISITS_KEY, JSON.stringify(v));
    } catch (_) {}
}

function createRedesignedUI(allGamesData, yourGamesData, realData) {
    const rd = realData || {};
    const tg = rd.toggles || {};
    const displayName = rd.username || getSellerDisplayName();
    const titleText = displayName ? `С возвращением, ${escapeHtml(displayName)}` : 'FunPay';
    const categoryCount = getUniqueCategoryCount(allGamesData);

    // Личная статистика посещений → «Недавно посещённые» + сортировка «Частые».
    const visits = fptGetGameVisits();
    const visitList = Object.values(visits);
    const recentGames = visitList.filter(v => v.last).sort((a, b) => b.last - a.last).slice(0, 6);
    const topByCount = visitList.filter(v => (v.count || 0) > 0).sort((a, b) => b.count - a.count);
    const freqSet = new Set(topByCount.slice(0, 8).map(v => v.url));

    const recentHTML = recentGames.length ? `
        <div class="home-recent">
            <span class="home-recent-label eyebrow">Недавно посещённые</span>
            <div class="home-recent-row fpx-scroll">
                ${recentGames.map(g => {
                    const nm = escapeHtml(g.name || 'Игра');
                    const lt = escapeHtml((g.name || 'G').charAt(0).toUpperCase());
                    return `<a href="${escapeHtml(g.url)}" class="home-recent-chip" data-name="${nm}" data-url="${escapeHtml(g.url)}"><span class="home-recent-mark mono">${lt}</span><span class="home-recent-name">${nm}</span></a>`;
                }).join('')}
            </div>
        </div>` : '';

    const sortHTML = `
        <div class="home-cat-bar">
            <div class="home-cat-sort" id="fpt-home-sort" role="tablist">
                <button type="button" data-sort="freq">Частые</button>
                <button type="button" data-sort="az">А–Я</button>
            </div>
        </div>`;

    const balanceText = rd.balance || '—';
    const ordersActive = rd.ordersActive != null ? String(rd.ordersActive) : '—';
    const salesTotal = rd.salesCount != null ? String(rd.salesCount) : '—';

    // Реальные автоматизации: тоггл показывает сохранённое состояние и
    // переключает его кликом; клик по строке открывает вкладку FP Tools.
    const automationActions = [
        { icon: 'ArrowUpNarrowWide', label: 'Авто-поднятие', page: 'autobump', key: 'autobump', on: !!tg.autobump },
        { icon: 'Zap', label: 'Авто-выдача', page: 'auto_delivery', key: 'delivery', on: !!tg.delivery },
        { icon: 'MessageSquareText', label: 'Авто-ответы', page: 'auto_review', key: 'autoreview', on: !!tg.autoreview },
        { icon: 'TerminalSquare', label: 'Слэш-команды', page: 'slash_commands', key: 'slash', on: !!tg.slash },
    ];

    const recentOrders = (rd.recentOrders && rd.recentOrders.length > 0) ? rd.recentOrders : null;

    const statsHTML = `
        <div class="cc-stat">
            <span class="cc-stat-label eyebrow">Баланс</span>
            <div class="cc-stat-value mono" id="fpt-home-stat-balance">${escapeHtml(balanceText)}</div>
            <div class="cc-stat-sub"><span class="faint">к выводу</span></div>
        </div>
        <div class="cc-stat">
            <span class="cc-stat-label eyebrow">Заказов в работе</span>
            <div class="cc-stat-value mono" id="fpt-home-stat-orders">${escapeHtml(ordersActive)}</div>
            <div class="cc-stat-sub"><span class="faint">ожидают</span></div>
        </div>
        <div class="cc-stat">
            <span class="cc-stat-label eyebrow">Продаж всего</span>
            <div class="cc-stat-value mono">${escapeHtml(salesTotal)}</div>
            <div class="cc-stat-sub"><span class="faint">за всё время</span></div>
        </div>
    `;

    const actionsHTML = automationActions.map(a => `
        <button type="button" class="cc-action" data-open-page="${a.page}" data-auto-key="${a.key}">
            <span class="cc-action-ic">${hic(a.icon, 17)}</span>
            <span class="cc-action-txt">
                <span class="cc-action-label">${escapeHtml(a.label)}</span>
                <span class="cc-action-meta faint">${a.on ? 'включено' : 'выключено'}</span>
            </span>
            <span class="tgl" data-on="${String(a.on)}" role="switch" aria-checked="${String(a.on)}" tabindex="0"></span>
        </button>`).join('');

    const ordersHTML = recentOrders
        ? recentOrders.map(o => `
            <div class="cc-order">
                <div class="cc-order-main">
                    <span class="cc-order-id mono faint">${escapeHtml(o.id)}</span>
                    <span class="cc-order-name">${escapeHtml(o.name)}</span>
                </div>
                <div class="cc-order-r">
                    <span class="cc-order-amt mono">${escapeHtml(o.amt)}</span>
                    <span class="cc-status cc-status-${escapeHtml(o.tone)}">${escapeHtml(o.status)}</span>
                </div>
            </div>`).join('')
        : '<div class="cc-orders-empty faint">Откройте «Продажи», чтобы здесь появились заказы</div>';

    const uiWrapper = document.createElement('div');
    uiWrapper.className = 'fpt-home fpx-root';
    uiWrapper.innerHTML = `
        <div class="home-inner">
            <div class="home-hero">
                <span class="home-eyebrow eyebrow">FunPay · кабинет продавца</span>
                <h1 class="home-h1" id="fpt-home-h1" data-has-name="${displayName ? '1' : '0'}">${titleText}</h1>
                <p class="home-lead">Биржа игровых ценностей без визуального шума. Всё, что нужно для торговли — в одном спокойном интерфейсе.</p>
            </div>

            <section class="cc card-glass">
                <div class="cc-left">
                    <div class="cc-head">
                        <div class="cc-head-l">
                            <div class="cc-badge">${hic('Activity', 17)}</div>
                            <div>
                                <div class="cc-title">Командный центр</div>
                                <div class="cc-sub faint">Сводка · обновлено только что</div>
                            </div>
                        </div>
                        <button type="button" class="btn btn-soft btn-sm" data-home-open-tools>Открыть FP Tools ${hic('ArrowUpRight', 15)}</button>
                    </div>
                    <div class="cc-stats">${statsHTML}</div>
                    <div class="cc-body">
                        <div class="cc-actions">
                            <div class="cc-colhead eyebrow">Автоматизация</div>
                            ${actionsHTML}
                        </div>
                        <div class="cc-orders">
                            <div class="cc-colhead eyebrow">Последние заказы</div>
                            ${ordersHTML}
                        </div>
                    </div>
                </div>

                <div class="cc-chat is-collapsed" aria-label="Секретный чат">
                    <button type="button" class="cc-chat-tab" data-secret-toggle>
                        <span class="cc-chat-tab-ic">${hic('Lock', 16)}</span>
                        <span class="cc-chat-tab-label">Секретный чат</span>
                    </button>
                    <div class="cc-chat-open">
                        <div class="cc-chat-head">
                            <div class="cc-chat-peer">
                                <span class="cc-chat-lockav">${hic('Lock', 15)}</span>
                                <div class="cc-chat-peer-txt">
                                    <span class="cc-chat-name">Секретный чат</span>
                                    <span class="cc-chat-auto"><span class="cc-dot-live"></span>сообщество</span>
                                </div>
                            </div>
                            <button type="button" class="btn btn-quiet btn-sm btn-icon" data-secret-toggle title="Свернуть">${hic('ChevronsRight', 16)}</button>
                        </div>
                        <div class="cc-chat-msgs cc-secret-msgs fpx-scroll" id="fpt-home-gc-feed">
                            <div class="fpt-home-gc-loading faint" style="padding:14px;">Загрузка…</div>
                        </div>
                        <div class="cc-chat-input cc-secret-input">
                            <input type="text" id="fpt-home-gc-input" placeholder="Сообщение в общий чат…" aria-label="Сообщение в общий чат">
                            <button type="button" class="cc-send-btn" id="fpt-home-gc-send" aria-label="Отправить">${hic('ArrowUp', 16)}</button>
                        </div>
                        <div class="cc-chat-foot cc-secret-foot">
                            <span class="faint cc-foot-hint">${hic('ShieldAlert', 13)} Торговля в чате запрещена</span>
                        </div>
                    </div>
                </div>
            </section>

            <div class="home-catalog">
                <div class="home-cat-head">
                    <div>
                        <h2 class="home-h2">Каталог игр</h2>
                        <p class="home-h2-sub faint">${allGamesData.length.toLocaleString('ru-RU')} игр · ${categoryCount.toLocaleString('ru-RU')} разделов · фильтр без перезагрузки</p>
                    </div>
                    <div class="home-search">
                        ${hic('Search', 17)}
                        <input type="text" class="home-search-input" id="fpt-home-search" placeholder="Начните вводить название игры или категории…" autocomplete="off" spellcheck="false">
                        <button type="button" class="home-search-x" id="fpt-home-search-x" style="display:none;">${hic('X', 15)}</button>
                    </div>
                </div>
                ${recentHTML}
                ${sortHTML}
                <div class="gcards" id="fpt-gcards"></div>
                <div class="home-empty" id="fpt-home-empty" style="display:none;">${hic('Search', 22)}<span></span></div>
            </div>
        </div>
    `;

    // Build game cards (real games scraped from the page)
    const grid = uiWrapper.querySelector('#fpt-gcards');
    allGamesData.forEach(game => {
        const card = document.createElement('div');
        const visitCount = (visits[game.url] && visits[game.url].count) || 0;
        const isFreq = freqSet.has(game.url);
        card.className = 'gcard' + (isFreq ? ' gcard-fav' : '');
        card.dataset.name = game.name;
        card.dataset.url = game.url;
        card.dataset.count = String(visitCount);
        const letter = escapeHtml((game.name.charAt(0) || 'G').toUpperCase());
        const safeName = escapeHtml(game.name);
        const iconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${gameDomain(game.name)}`;
        const vis = game.categories.slice(0, 5);
        const catsHTML = vis.map(c => `<a href="${c.url}" class="gcard-cat">${escapeHtml(c.name)}</a>`).join('');
        const hidden = game.categories.length - vis.length;
        card.innerHTML = `
            <a href="${game.url}" class="gcard-link" aria-label="${safeName}"></a>
            <div class="gcard-top">
                <div class="gcard-mark">
                    <span class="gcard-mono mono">${letter}</span>
                    <img class="gcard-favicon" data-src="${iconUrl}" alt="" style="display:none;">
                </div>
                <div class="gcard-titlewrap">
                    <div class="gcard-title">${safeName}</div>
                    <div class="gcard-meta faint"><span class="mono">${game.categories.length} ${fptPlural(game.categories.length, ['раздел', 'раздела', 'разделов'])}</span>${isFreq ? '<span class="gcard-freq">часто</span>' : ''}</div>
                </div>
                <span class="gcard-go">${hic('ArrowUpRight', 16)}</span>
            </div>
            <div class="gcard-cats">${catsHTML}${hidden > 0 ? `<span class="gcard-cat gcard-cat-more">+${hidden}</span>` : ''}</div>
        `;
        grid.appendChild(card);
    });

    // Стартовая сортировка до отрисовки (grid ещё вне документа) — тем же
    // режимом, что применит setupCatalogSort после вставки. Без рассинхрона.
    fptApplyCatalogSort(grid, fptResolveSortMode(grid));

    // ── events ──
    uiWrapper.querySelectorAll('[data-home-open-tools]').forEach(b =>
        b.addEventListener('click', () => document.getElementById('fpToolsButton')?.click()));

    uiWrapper.querySelectorAll('[data-open-page]').forEach(b =>
        b.addEventListener('click', (e) => {
            // Клик по тогглу переключает функцию на месте, не открывая панель.
            const tgl = e.target.closest('.tgl');
            if (tgl) {
                e.preventDefault();
                e.stopPropagation();
                const next = tgl.getAttribute('data-on') !== 'true';
                tgl.setAttribute('data-on', String(next));
                tgl.setAttribute('aria-checked', String(next));
                const meta = b.querySelector('.cc-action-meta');
                if (meta) meta.textContent = next ? 'включено' : 'выключено';
                setHomeAutomation(b.getAttribute('data-auto-key'), next);
                return;
            }
            const page = b.getAttribute('data-open-page');
            document.getElementById('fpToolsButton')?.click();
            setTimeout(() => document.querySelector(`.fp-tools-popup li[data-page="${page}"] a`)?.click(), 320);
        }));

    function toggleSecretChat() {
        const rail = uiWrapper.querySelector('.cc-chat');
        if (!rail) return;
        const willExpand = rail.classList.contains('is-collapsed');
        rail.classList.toggle('is-collapsed');
        if (willExpand) initHomeGlobalChat();
    }
    uiWrapper.querySelectorAll('[data-secret-toggle]').forEach(b => b.addEventListener('click', toggleSecretChat));

    fptWatchHomeToggles();

    return uiWrapper;
}

function setupLazyLoadObserver() {
    const itemsToLoad = document.querySelectorAll('.gcard');
    if (!itemsToLoad.length) return;
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const item = entry.target;
            const img = item.querySelector('.gcard-favicon');
            const fallback = item.querySelector('.gcard-mono');
            const dataSrc = img && img.getAttribute('data-src');
            if (dataSrc) {
                img.src = dataSrc;
                img.removeAttribute('data-src');
                img.onload = () => {
                    if (img.naturalWidth > 16 && img.naturalHeight > 16) {
                        if (fallback) fallback.style.display = 'none';
                        img.style.display = 'block';
                    }
                };
            }
            observer.unobserve(item);
        });
    }, { root: null, rootMargin: '0px 0px 200px 0px' });
    itemsToLoad.forEach(item => observer.observe(item));
}

// Переупорядочивает карточки каталога: 'freq' — по числу посещений (потом А–Я),
// 'az' — по алфавиту. Не трогает видимость (ей управляет поиск).
function fptApplyCatalogSort(grid, mode) {
    if (!grid) return;
    const cards = Array.from(grid.children);
    cards.sort((a, b) => {
        if (mode === 'freq') {
            const d = (parseInt(b.dataset.count, 10) || 0) - (parseInt(a.dataset.count, 10) || 0);
            if (d) return d;
        }
        return (a.dataset.name || '').localeCompare(b.dataset.name || '', 'ru');
    });
    cards.forEach(c => grid.appendChild(c));
    const bar = document.getElementById('fpt-home-sort');
    if (bar) bar.querySelectorAll('[data-sort]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.sort === mode));
}

function setupCatalogSort() {
    const bar = document.getElementById('fpt-home-sort');
    const grid = document.getElementById('fpt-gcards');
    if (!bar || !grid) return;
    // порядок и активная кнопка — из одного режима (сохранённый или авто)
    fptApplyCatalogSort(grid, fptResolveSortMode(grid));
    bar.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-sort]');
        if (!btn) return;
        fptSetSortMode(btn.dataset.sort);   // запоминаем выбор пользователя
        fptApplyCatalogSort(grid, btn.dataset.sort);
    });
}

// Запоминаем открытие игры (клик по карточке, её разделу или чипу «недавних»).
// mousedown — срабатывает до перехода и для средней кнопки/нового таба.
function setupVisitTracking() {
    const root = document.querySelector('.fpt-home');
    if (!root) return;
    root.addEventListener('mousedown', (e) => {
        const chip = e.target.closest('.home-recent-chip');
        if (chip) { fptRecordGameVisit(chip.dataset.name, chip.dataset.url); return; }
        const card = e.target.closest('.gcard');
        if (card) fptRecordGameVisit(card.dataset.name, card.dataset.url);
    }, true);
}

function setupSearchFilter() {
    const searchInput = document.getElementById('fpt-home-search');
    if (!searchInput) return;
    const clearBtn = document.getElementById('fpt-home-search-x');
    const empty = document.getElementById('fpt-home-empty');

    const cards = Array.from(document.querySelectorAll('#fpt-gcards .gcard')).map(card => {
        const title = (card.querySelector('.gcard-title')?.textContent || '').toLowerCase();
        const tags = Array.from(card.querySelectorAll('.gcard-cat')).map(t => t.textContent.toLowerCase());
        return { element: card, fullText: [title, ...tags].join(' ') };
    });

    let t;
    const filter = () => {
        const q = searchInput.value.toLowerCase().trim();
        if (clearBtn) clearBtn.style.display = q ? 'flex' : 'none';
        let shown = 0;
        cards.forEach(c => {
            const match = q === '' || c.fullText.includes(q);
            c.element.style.display = match ? '' : 'none';
            if (match) shown++;
        });
        if (empty) {
            empty.style.display = shown === 0 ? 'flex' : 'none';
            const label = empty.querySelector('span');
            if (label) label.textContent = `Ничего не нашлось по запросу «${searchInput.value.trim()}»`;
        }
    };

    searchInput.addEventListener('input', () => { clearTimeout(t); t = setTimeout(filter, 160); });
    if (clearBtn) clearBtn.addEventListener('click', () => { searchInput.value = ''; filter(); searchInput.focus(); });
}

function anonymizeHomepageChat(chatElement) {
    if (!chatElement) return;
    chatElement.classList.add('fpt-anonymous-home-chat');

    const hiddenPreviewText = 'Сообщение скрыто на главном экране';
    let aliasIndex = 1;
    const nextAlias = () => `Покупатель #${String(aliasIndex++).padStart(2, '0')}`;
    const nameSelectors = [
        '.user-link-name',
        '.media-user-name',
        '.media-heading a',
        '.media-heading',
        '.chat-user-name',
        '.chat-name',
        '.contact-name',
        'a[href*="/users/"]',
        'a[href*="/user/"]'
    ];

    chatElement.querySelectorAll(nameSelectors.join(',')).forEach(node => {
        const text = node.textContent.trim();
        if (!text || text.length > 64) return;
        if (node.dataset.fptAnonName) return;
        node.dataset.fptAnonName = '1';
        node.textContent = nextAlias();
        node.removeAttribute('title');
    });

    const previewSelectors = [
        '.chat-last-message',
        '.message-preview',
        '.chat-msg-text',
        '.chat-msg-body',
        '.media-message',
        '.media-body small',
        '.media-body .text-muted'
    ];
    chatElement.querySelectorAll(previewSelectors.join(',')).forEach(node => {
        const text = node.textContent.trim();
        if (!text || node.dataset.fptAnonPreview) return;
        node.dataset.fptAnonPreview = '1';
        node.textContent = hiddenPreviewText;
        node.removeAttribute('title');
    });

    chatElement.querySelectorAll('img, .avatar, .user-avatar, .media-object').forEach(node => {
        node.classList.add('fpt-anonymous-avatar');
        if (node.tagName === 'IMG') {
            node.alt = 'Анонимный пользователь';
            node.removeAttribute('title');
        }
    });

    if (!chatElement.dataset.fptAnonObserver) {
        chatElement.dataset.fptAnonObserver = '1';
        let timer = null;
        const observer = new MutationObserver(() => {
            clearTimeout(timer);
            timer = setTimeout(() => anonymizeHomepageChat(chatElement), 100);
        });
        observer.observe(chatElement, { childList: true, subtree: true });
    }
}

async function initializeRedesign() {
    loadRedesignFonts();

    // Поиск по играм из шапки (.promo-games-filter в навбаре) оставляем — раньше
    // его удаляли целиком, и на главной поиск по играм пропадал. Убираем только
    // если форма лежит внутри промо-контента (его всё равно заменяет редизайн).
    const promoFilterForm = document.querySelector('.promo-games-filter');
    if (promoFilterForm && !promoFilterForm.closest('.navbar, #header, .navbar-default')) {
        promoFilterForm.remove();
    }

    if (document.body.classList.contains('funpay-redesigned')) return;
    const originalContentContainer = document.querySelector('#content');
    if (!originalContentContainer) return;

    const headers = Array.from(document.querySelectorAll('.title-mini'));
    const yourGamesHeader = headers.find(h => h.textContent.trim() === 'Ваши игры');
    const yourGamesContainer = yourGamesHeader ? yourGamesHeader.closest('.promo-game-list-header').nextElementSibling : null;
    const allGamesContainer = document.querySelector('.promo-games-all');
    const allGamesData = extractGamesFromContainer(allGamesContainer);
    const yourGamesData = extractGamesFromContainer(yourGamesContainer);

    if (allGamesData.length === 0) {
        document.body.style.visibility = 'visible';
        originalContentContainer.style.visibility = 'visible';
        return;
    }

    // Fetch real data before building UI
    let realData = {};
    try { realData = await getHomepageRealData(); } catch(e) {}

    const newUI = createRedesignedUI(allGamesData, yourGamesData, realData);
    originalContentContainer.innerHTML = '';
    originalContentContainer.appendChild(newUI);
    originalContentContainer.classList.add('redesigned-content-container');
    document.body.classList.add('funpay-redesigned');
    setupSearchFilter();
    setupLazyLoadObserver();
    setupCatalogSort();
    setupVisitTracking();

    // Re-check balance after DOM is ready (might have been hidden by theme_flash_fix)
    setTimeout(() => {
        const balEl = document.querySelector('.badge-balance, .balances-value, .user-balance-sum');
        if (balEl) {
            const txt = balEl.textContent.replace(/[^\d\s.,₽]/g, '').replace(/\s+/g, ' ').trim();
            if (txt) {
                const el = document.getElementById('fpt-home-stat-balance');
                if (el) el.textContent = txt + (txt.includes('₽') ? '' : ' ₽');
            }
        }
    }, 1200);

    // Имя продавца в шапке порой не готово в момент сборки (appData/шапка
    // дорисовываются после смены аккаунта и при первой загрузке). Дожидаемся
    // имени короткими повторами и обновляем заголовок без перерисовки.
    fptKeepHeroNameFresh();
}

// Подхватывает имя продавца, когда оно появится (после смены аккаунта/загрузки),
// и проставляет «С возвращением, …» вместо запасного «FunPay».
function fptKeepHeroNameFresh() {
    const h1 = document.getElementById('fpt-home-h1');
    if (!h1 || h1.dataset.hasName === '1') return;
    let tries = 0;
    const tick = () => {
        const h = document.getElementById('fpt-home-h1');
        if (!h) return;
        let name = '';
        try {
            const raw = document.body?.dataset?.appData;
            if (raw) { const d = JSON.parse(raw); const ad = Array.isArray(d) ? d[0] : d; if (ad?.userName) name = ad.userName; }
        } catch (_) {}
        if (!name) name = getSellerDisplayName();
        if (name) {
            h.textContent = `С возвращением, ${name}`;
            h.dataset.hasName = '1';
            return;
        }
        if (++tries < 12) setTimeout(tick, 250);   // ~3 c ожидания
    };
    setTimeout(tick, 200);
}

async function handleHomepageRedesign() {
    const {
        enableRedesignedHomepage = true,
        enableCustomTheme = true,
        fpToolsTheme = {}
    } = await chrome.storage.local.get(['enableRedesignedHomepage', 'enableCustomTheme', 'fpToolsTheme']);
    const path = window.location.pathname;
    const isHomepage = path === '/' || path === '/en' || path === '/en/';
    // Редизайн-главная работает на всех пресетах: её токены переключаются
    // селектором [data-fpt-preset] (включая светлый). Отключается только
    // вместе с кастомной темой.
    if (enableRedesignedHomepage && enableCustomTheme && isHomepage) {
        await initializeRedesign();
    } else {
        const content = document.querySelector('#content');
        if (content) content.style.visibility = 'visible';
    }
}
