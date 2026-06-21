// FP Tools — VPS-сервис. Держит несколько аккаунтов FunPay онлайн (каждый через
// свой прокси) и отдаёт по ним актуальную статистику расширению по HTTP+токену.
//
// Лёгкий по дизайну: один файл, http-модуль Node, единственная зависимость — undici
// (она же штатный HTTP-движок Node) ради per-request прокси. Конфиг — один JSON-файл.
//
// Запуск:  node server.js               (порт 8787, токен из data.json или новый)
//          node server.js --selftest    (проверка парсера, без сети)
//
// КЛЮЧИ: golden_key'и аккаунтов лежат в data.json на ЭТОМ сервере и в гит не попадают.

import http from 'node:http';
import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(DIR, 'data.json');
const PORT = parseInt(process.env.FPT_PORT || '8787', 10);
const REFRESH_MS = 3 * 60 * 1000;      // как онлайн-heartbeat в расширении

// undici подгружаем лениво (selftest не требует сети/зависимостей).
let ProxyAgent = null;
async function getProxyAgent(url) {
    if (!url) return undefined;
    if (!ProxyAgent) ({ ProxyAgent } = await import('undici'));
    return new ProxyAgent(url);
}

// ── конфиг ──────────────────────────────────────────────────────────────────
function loadData() {
    if (existsSync(DATA_FILE)) {
        try { return JSON.parse(readFileSync(DATA_FILE, 'utf8')); } catch (_) {}
    }
    return { token: randomBytes(24).toString('hex'), accounts: [] };
}
function saveData(d) {
    const tmp = DATA_FILE + '.tmp';
    writeFileSync(tmp, JSON.stringify(d, null, 2));
    renameSync(tmp, DATA_FILE);     // атомарно
}

const data = loadData();
saveData(data);                     // зафиксировать токен при первом запуске

// ── парсер снимка аккаунта (регэксп, без DOM) ───────────────────────────────
// Источник истины — data-app-data на <body> (JSON, кавычки внутри = &quot;).
export function parseSnapshot(html) {
    const out = { username: '', userId: null, balance: '', unread: 0, loggedIn: false };
    if (!html) return out;
    const m = html.match(/data-app-data="([^"]*)"/);
    if (m) {
        try {
            const d = JSON.parse(m[1].replace(/&quot;/g, '"'));
            const u = Array.isArray(d) ? d[0] : d;
            out.username = u.userName || '';
            out.userId = u.userId ? String(u.userId) : (u.id ? String(u.id) : null);
            const c = (u.counters && (u.counters.chat || u.counters.messages)) || (u.badges && u.badges.chat);
            if (c != null) { const n = parseInt(c, 10); if (!isNaN(n)) out.unread = n; }
        } catch (_) {}
    }
    if (!out.username) {
        const nm = html.match(/class="user-link-name"[^>]*>([^<]+)</);
        if (nm) out.username = nm[1].trim();
    }
    out.loggedIn = !!out.username;

    const bm = html.match(/class="badge-balance"[^>]*>([^<]+)</) || html.match(/class="user-link-balance"[^>]*>([^<]+)</);
    if (bm) { const r = bm[1].replace(/\s+/g, ' ').trim(); const mm = r.match(/[\d][\d\s.,]*\s*[₽$€]/); out.balance = mm ? mm[0].replace(/\s+/g, ' ').trim() : ''; }
    if (!out.balance && out.loggedIn) out.balance = '0 ₽';   // FunPay прячет бейдж при 0

    if (!out.unread) {
        const um = html.match(/menu-icon-chat[\s\S]{0,200}?badge[^>]*>\s*(\d+)/);
        if (um) out.unread = parseInt(um[1], 10) || 0;
    }
    return out;
}

// ── пинг + снимок одного аккаунта через его прокси ──────────────────────────
async function refreshAccount(acc) {
    const stat = { id: acc.id, name: acc.name, online: false, balance: '', unread: 0, userId: null, error: null, ts: Date.now() };
    if (!acc.golden_key) { stat.error = 'нет golden_key'; return stat; }
    try {
        const dispatcher = await getProxyAgent(acc.proxy);
        const res = await fetch('https://funpay.com/', {
            headers: { cookie: `golden_key=${acc.golden_key}`, 'user-agent': 'Mozilla/5.0' },
            dispatcher, redirect: 'follow'
        });
        const html = await res.text();
        const snap = parseSnapshot(html);
        // защита от заражения: имя из снимка должно совпасть с сохранённым (если задано).
        if (acc.name && snap.username && snap.username !== acc.name) { stat.error = 'снимок чужого аккаунта (прокси/ключ?)'; return stat; }
        stat.online = snap.loggedIn;
        stat.balance = snap.balance;
        stat.unread = snap.unread;
        stat.userId = snap.userId;
        if (!snap.loggedIn) stat.error = 'не залогинен (ключ протух?)';
    } catch (e) {
        stat.error = e.message;
    }
    return stat;
}

const statsCache = new Map();   // id -> stat
async function refreshAll() {
    for (const acc of data.accounts) {
        statsCache.set(acc.id, await refreshAccount(acc));
        await new Promise(r => setTimeout(r, 500));   // не долбим разом
    }
}

// ── HTTP API ────────────────────────────────────────────────────────────────
function send(res, code, body) {
    res.writeHead(code, {
        'content-type': 'application/json; charset=utf-8',
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'authorization,content-type',
        'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS'
    });
    res.end(JSON.stringify(body));
}
function authed(req, url) {
    const h = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const t = h || url.searchParams.get('token');
    return t && t === data.token;
}
function readBody(req) {
    return new Promise((resolve) => {
        let b = ''; req.on('data', c => b += c); req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch (_) { resolve({}); } });
    });
}
function publicAccounts() {   // без golden_key наружу
    return data.accounts.map(a => ({ id: a.id, name: a.name, proxy: a.proxy ? a.proxy.replace(/:[^:@/]+@/, ':***@') : '', autoReply: !!a.autoReply }));
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'OPTIONS') return send(res, 204, {});
    if (url.pathname === '/health') return send(res, 200, { ok: true });
    if (!authed(req, url)) return send(res, 401, { error: 'bad token' });

    if (url.pathname === '/stats' && req.method === 'GET') {
        return send(res, 200, { accounts: data.accounts.map(a => statsCache.get(a.id) || { id: a.id, name: a.name, online: false, pending: true }) });
    }
    if (url.pathname === '/accounts' && req.method === 'GET') {
        return send(res, 200, { accounts: publicAccounts() });
    }
    if (url.pathname === '/accounts' && req.method === 'POST') {
        const b = await readBody(req);
        if (!b.golden_key && !b.id) return send(res, 400, { error: 'нужен golden_key' });
        let acc = b.id ? data.accounts.find(a => a.id === b.id) : null;
        if (acc) {                                  // обновление
            if (b.name != null) acc.name = b.name;
            if (b.golden_key) acc.golden_key = b.golden_key;
            if (b.proxy != null) acc.proxy = b.proxy;
            if (b.autoReply != null) acc.autoReply = !!b.autoReply;
            if (b.autoReplies != null) acc.autoReplies = b.autoReplies;   // текст авто-ответов (картинки не шлём)
        } else {                                    // добавление
            acc = { id: randomBytes(6).toString('hex'), name: b.name || '', golden_key: b.golden_key, proxy: b.proxy || '', autoReply: !!b.autoReply, autoReplies: b.autoReplies || {} };
            data.accounts.push(acc);
        }
        saveData(data);
        statsCache.set(acc.id, await refreshAccount(acc));   // сразу обновим снимок
        return send(res, 200, { ok: true, id: acc.id, stat: statsCache.get(acc.id) });
    }
    if (url.pathname === '/accounts' && req.method === 'DELETE') {
        const id = url.searchParams.get('id');
        data.accounts = data.accounts.filter(a => a.id !== id);
        statsCache.delete(id);
        saveData(data);
        return send(res, 200, { ok: true });
    }
    return send(res, 404, { error: 'not found' });
});

// ── selftest ────────────────────────────────────────────────────────────────
function selftest() {
    const html = `<body data-app-data="{&quot;userId&quot;:777,&quot;userName&quot;:&quot;Vidali&quot;,&quot;counters&quot;:{&quot;chat&quot;:3}}">
        <span class="badge-balance">Финансы 1 234,50 ₽</span></body>`;
    const s = parseSnapshot(html);
    console.assert(s.username === 'Vidali', 'username', s);
    console.assert(s.userId === '777', 'userId', s);
    console.assert(s.unread === 3, 'unread', s);
    console.assert(s.balance === '1 234,50 ₽', 'balance', s);
    console.assert(s.loggedIn === true, 'loggedIn', s);
    // не залогинен → пустой снимок
    const empty = parseSnapshot('<body data-app-data="{&quot;userId&quot;:0}"><div></div></body>');
    console.assert(empty.loggedIn === false, 'logged-out', empty);
    console.log('selftest OK');
}

if (process.argv.includes('--selftest')) {
    selftest();
} else {
    refreshAll();
    setInterval(refreshAll, REFRESH_MS);
    server.listen(PORT, () => {
        console.log(`FP Tools VPS на порту ${PORT}`);
        console.log(`ТОКЕН: ${data.token}`);
    });
}
