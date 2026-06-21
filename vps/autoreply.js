// FP Tools VPS — авто-ответ за аккаунт (порт браузерной логики runMultiAccountAutoReply).
// Каждый аккаунт ходит через СВОЙ прокси, под своим golden_key (+PHPSESSID из Set-Cookie).
// Зеркалит браузер: на первом проходе только засеваем lastSeen (не спамим старое),
// отвечаем лишь на НЕсистемные новые сообщения, приветствие — только в чаты, где
// продавец ещё не писал. Свои ответы метим BOT_MARKER, чужие/ручные не трогаем.

import { parse } from 'node-html-parser';

const BOT_MARKER = '⁡';
const UA = 'Mozilla/5.0';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function randomTag() { return Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0'); }

let _ProxyAgent = null;
async function dispatcherFor(proxy) {
    if (!proxy) return undefined;
    if (!_ProxyAgent) ({ ProxyAgent: _ProxyAgent } = await import('undici'));
    return new _ProxyAgent(proxy);
}
async function fpFetch(acc, url, opts = {}) {
    const dispatcher = await dispatcherFor(acc.proxy);
    return fetch(url, { ...opts, dispatcher, headers: { 'user-agent': UA, ...(opts.headers || {}) } });
}

// ── системные сообщения FunPay (как RX в autoresponder.js) ──────────────────
const RX = {
    ORDER_PURCHASED: /(оплатил заказ|has paid for order) #([A-Z0-9]{8})/i,
    ORDER_CONFIRMED: /(подтвердил успешное выполнение заказа|has confirmed that order) #([A-Z0-9]{8})/i,
    NEW_FEEDBACK: /(написал отзыв к заказу|has given feedback to the order) #([A-Z0-9]{8})/i,
    FEEDBACK_CHANGED: /(изменил отзыв к заказу|has edited their feedback to the order) #([A-Z0-9]{8})/i,
    FEEDBACK_DELETED: /(удалил отзыв к заказу|has deleted their feedback to the order)/i,
    ORDER_REOPENED: /(заказ #([A-Z0-9]{8}) открыт повторно|order #([A-Z0-9]{8}) reopened)/i,
    REFUND: /(вернул деньги покупателю|returned the money to the buyer|refund)/i,
    PARTIAL_REFUND: /(часть средств по заказу .+ возвращена|part of the funds for order)/i,
    DEAR_VENDORS: /(уважаемые продавцы|dear vendors|dear sellers)/i,
};
export function getMessageType(text) {
    if (!text) return 'NON_SYSTEM';
    for (const k of Object.keys(RX)) if (RX[k].test(text)) return k === 'DEAR_VENDORS' ? 'DEAR_VENDORS' : k;
    return 'NON_SYSTEM';
}

export function applyVariables(template, vars = {}) {
    const h = new Date().getHours();
    const welcome = h >= 5 && h < 12 ? 'Доброе утро!' : h >= 12 && h < 18 ? 'Добрый день!' : 'Добрый вечер!';
    const now = new Date(); const pad = n => String(n).padStart(2, '0');
    const dateStr = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    return String(template || '')
        .replace(/{buyername}/gi, vars.buyerName || '').replace(/\$username/g, vars.buyerName || '').replace(/\$chat_name/g, vars.buyerName || '')
        .replace(/{welcome}/gi, welcome)
        .replace(/{date}/gi, `${dateStr} ${timeStr}`).replace(/\$date/g, dateStr).replace(/\$time/g, timeStr);
}

export function matchKeywordReply(text, s) {
    if (!s.keywordsEnabled || !Array.isArray(s.keywords) || !s.keywords.length) return null;
    const clean = (text || '').replace(/[​‌‍﻿⁠]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    for (const rule of s.keywords) {
        const kw = (rule.keyword || '').replace(/[​‌‍﻿⁠]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
        if (!kw) continue;
        const hit = rule.matchMode === 'contains' ? clean.includes(kw) : clean === kw;
        if (hit) return { text: applyVariables(rule.response, {}) };
    }
    return null;
}

// ── парсеры (node-html-parser, как DOMParser в offscreen) ───────────────────
export function parseChatList(html) {
    const root = parse(html || '');
    const OLD = '⁤';
    return root.querySelectorAll('a.contact-item').map(item => {
        const rawMsg = item.querySelector('.contact-item-message')?.text || '';
        const nodeMsg = parseInt(item.getAttribute('data-node-msg'), 10);
        return {
            chatId: item.getAttribute('data-id'),
            chatName: (item.querySelector('.media-user-name')?.text || 'Unknown').trim(),
            nodeMsg: Number.isNaN(nodeMsg) ? null : nodeMsg,
            messageText: rawMsg.replace(/[⁡⁤]/g, '').trim(),
            lastByBot: rawMsg.startsWith(BOT_MARKER) || rawMsg.startsWith(OLD),
            isUnread: item.classList.contains('unread')
        };
    });
}
function parseChatAuthors(html) {
    const root = parse(html || '');
    const ids = new Set();
    root.querySelectorAll('.chat-msg-author-link').forEach(a => { const m = (a.getAttribute('href') || '').match(/\/users\/(\d+)\//); if (m) ids.add(m[1]); });
    return ids;
}

// ── сетевые операции под аккаунтом ──────────────────────────────────────────
async function accountAuth(acc) {
    const res = await fpFetch(acc, 'https://funpay.com/', { headers: { cookie: `golden_key=${acc.golden_key}` } });
    const html = await res.text();
    const m = html.match(/data-app-data="([^"]*)"/);
    if (!m) return null;
    let u; try { const d = JSON.parse(m[1].replace(/&quot;/g, '"')); u = Array.isArray(d) ? d[0] : d; } catch { return null; }
    if (!u || !u['csrf-token'] || !u.userId) return null;
    let phpsessid = '';
    const sc = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
    for (const c of sc) { const mm = c.match(/PHPSESSID=([^;]+)/); if (mm) phpsessid = mm[1]; }
    return { csrf_token: u['csrf-token'], userId: String(u.userId), username: u.userName || '', golden_key: acc.golden_key, phpsessid };
}
function cookieOf(auth) { return auth.phpsessid ? `golden_key=${auth.golden_key}; PHPSESSID=${auth.phpsessid}` : `golden_key=${auth.golden_key}`; }

async function fetchChats(acc, auth) {
    const body = new URLSearchParams({ objects: JSON.stringify([{ type: 'chat_bookmarks', id: auth.userId, tag: randomTag(), data: false }]), request: false, csrf_token: auth.csrf_token });
    const res = await fpFetch(acc, 'https://funpay.com/runner/', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', 'x-requested-with': 'XMLHttpRequest', cookie: cookieOf(auth) }, body });
    if (!res.ok) throw new Error(`runner HTTP ${res.status}`);
    const data = await res.json();
    const obj = data.objects?.find(o => o.type === 'chat_bookmarks');
    return obj?.data?.html ? parseChatList(obj.data.html) : [];
}
async function sellerWrote(acc, auth, chatId) {
    const res = await fpFetch(acc, `https://funpay.com/chat/?node=${chatId}`, { headers: { cookie: cookieOf(auth) } });
    if (!res.ok) return 'error';
    return parseChatAuthors(await res.text()).has(auth.userId) ? 'wrote' : 'clean';
}
async function sendMessage(acc, auth, chatId, text) {
    const marked = text.startsWith(BOT_MARKER) ? text : BOT_MARKER + text;
    const body = new URLSearchParams({
        objects: JSON.stringify([{ type: 'chat_node', id: chatId, tag: '00000000', data: { node: chatId, last_message: -1, content: '' } }]),
        request: JSON.stringify({ action: 'chat_message', data: { node: chatId, last_message: -1, content: marked } }),
        csrf_token: auth.csrf_token
    });
    const res = await fpFetch(acc, 'https://funpay.com/runner/', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', 'x-requested-with': 'XMLHttpRequest', cookie: cookieOf(auth) }, body });
    if (!res.ok) throw new Error(`send HTTP ${res.status}`);
    const json = await res.json().catch(() => null);
    if (json?.error) throw new Error(json.error);
}

// Один проход авто-ответа по аккаунту. Мутирует acc.arState (caller сохраняет data.json).
// Возвращает число отправленных. log(msg) — для журнала.
export async function runAutoReply(acc, log = () => {}) {
    const s = acc.autoReplies || {};
    if (!s.greetingEnabled && !s.keywordsEnabled) return 0;
    const auth = await accountAuth(acc);
    if (!auth) { log(`${acc.name}: авторизация не удалась (ключ/прокси?)`); return 0; }

    const chats = await fetchChats(acc, auth);
    const st = acc.arState || (acc.arState = { seeded: false, lastSeen: {}, greeted: [] });
    const greeted = new Set(st.greeted || []);
    const lastSeen = st.lastSeen || {};
    let sent = 0;

    for (const chat of chats) {
        const prev = lastSeen[chat.chatId] || 0;
        const isNew = chat.nodeMsg != null ? chat.nodeMsg > prev : !!chat.isUnread;
        if (chat.lastByBot) { if (chat.nodeMsg != null) lastSeen[chat.chatId] = Math.max(prev, chat.nodeMsg); continue; }
        if (!isNew) continue;
        if (chat.nodeMsg != null) lastSeen[chat.chatId] = Math.max(prev, chat.nodeMsg);
        if (!st.seeded) continue;                                  // первый проход — только отметка
        if (getMessageType(chat.messageText) !== 'NON_SYSTEM') continue;

        const kw = matchKeywordReply(chat.messageText, s);
        let reply = null, kind = null;
        if (kw) { reply = kw.text; kind = 'keyword'; }
        else if (s.greetingEnabled && s.greetingText && !greeted.has(chat.chatId)) { reply = applyVariables(s.greetingText, { buyerName: chat.chatName, chatId: chat.chatId }); kind = 'greeting'; }
        if (!reply) continue;
        if (kind === 'greeting') {
            const w = await sellerWrote(acc, auth, chat.chatId);
            if (w === 'wrote') { greeted.add(chat.chatId); continue; }
            if (w === 'error') continue;
        }
        try { await sendMessage(acc, auth, chat.chatId, reply); if (kind === 'greeting') greeted.add(chat.chatId); sent++; await sleep(800); }
        catch (e) { log(`${acc.name}/${chat.chatId}: ${e.message}`); }
    }
    st.lastSeen = lastSeen; st.greeted = [...greeted]; st.seeded = true;
    if (sent) log(`${acc.name}: отправлено ответов: ${sent}`);
    return sent;
}

// ── selftest (без сети) ──────────────────────────────────────────────────────
export function _selftest() {
    const html = `<a class="contact-item unread" data-id="55" data-node-msg="120"><div class="media-user-name">Petya</div><div class="contact-item-message">привет, есть в наличии?</div></a>
        <a class="contact-item" data-id="56" data-node-msg="80"><div class="media-user-name">Vasya</div><div class="contact-item-message">⁡уже ответил</div></a>`;
    const list = parseChatList(html);
    console.assert(list.length === 2, 'chat count', list);
    console.assert(list[0].chatId === '55' && list[0].nodeMsg === 120 && list[0].isUnread === true, 'chat0', list[0]);
    console.assert(list[0].lastByBot === false && list[1].lastByBot === true, 'lastByBot', list);
    console.assert(getMessageType('Покупатель оплатил заказ #ABCD1234') === 'ORDER_PURCHASED', 'sys type');
    console.assert(getMessageType('привет') === 'NON_SYSTEM', 'non-sys');
    console.assert(matchKeywordReply('Есть в наличии?', { keywordsEnabled: true, keywords: [{ keyword: 'наличии', matchMode: 'contains', response: 'да' }] })?.text === 'да', 'kw');
    console.log('autoreply selftest OK');
}
