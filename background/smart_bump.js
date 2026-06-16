// background/smart_bump.js - FunPay Tools 2.8
// "Smart" auto-raise mode, ported from FP Tools's FP Tools.raise_lots().
//
// The old autobump just raised every category on a fixed interval (e.g. every 245 min) and
// ate FunPay's "wait N minutes" errors. Smart mode instead:
//   - reads FunPay's actual response after each raise attempt,
//   - parses the exact remaining wait time per category (parseWaitTime, ported 1:1 from
//     FP Tools's utils.parse_wait_time),
//   - stores a per-category nextRaiseAt timestamp,
//   - only raises categories that are actually due.
//
// Cadence: a PERIODIC alarm ticks every SMART_BUMP_PERIOD_MIN minutes (see startSmartBump).
// Each tick raises only due categories (gated by nextRaiseAt), so between cooldowns it costs
// just a couple of requests. We deliberately traded the old "fire exactly when due" one-shot
// alarm for this: the one-shot died permanently on any transient failure, the periodic one
// can't. Worst case a category is raised up to one period late - an acceptable price for
// never silently stopping.

import { fpFetch, fpIsRateLimited, withCookieLock, notifyRaised } from './autoresponder.js';

export const SMART_BUMP_ALARM = 'fpToolsSmartBump';
// ПЕРИОДИЧЕСКИЙ будильник (а не одноразовый «перевзвод»): раньше цикл сам пересоздавал
// одноразовый alarm в конце — и при любом сбое (нет авторизации, сетевой обрыв, исключение)
// перевзвод не доходил → умное поднятие НАВСЕГДА вставало до перезапуска. Теперь alarm
// тикает сам по себе каждые N минут, а сам цикл поднимает только «созревшие» категории
// (nextRaiseAt), поэтому лишних запросов нет. Просто и надёжно — как обычное авто-поднятие.
const SMART_BUMP_PERIOD_MIN = 10;
const STATE_KEY = 'fpToolsSmartBumpState'; // { [categoryUrl]: { nextRaiseAt, name } }
const OFFSCREEN_PATH = 'offscreen/offscreen.html';

// Ported from FP Tools utils.parse_wait_time - returns seconds to wait.
function parseWaitTime(msg) {
    const s = String(msg || '');
    // Берём ПЕРВОЕ число в сообщении, а не склейку всех цифр: «Подождите 1 час 30 минут»
    // раньше превращалось в 130 → ~5 суток ожидания и заморозку категории на дни.
    const m = s.match(/\d+/);
    const n = m ? parseInt(m[0], 10) : 0;
    if (/секунд|second/i.test(s)) return n || 2;
    if (/минут|хвилин|minute/i.test(s)) return ((n || 2) - 1) * 60;
    if (/час|годин|hour/i.test(s)) return Math.round(((n || 1) - 0.5) * 3600);
    return 10;
}

async function parseHtmlViaOffscreen(html, action) {
    const existing = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(OFFSCREEN_PATH)]
    });
    if (!existing.length) {
        await chrome.offscreen.createDocument({ url: OFFSCREEN_PATH, reasons: ['DOM_PARSER'], justification: 'parse' });
    }
    return chrome.runtime.sendMessage({ target: 'offscreen', action, html });
}

async function getAuth() {
    // Авторизация идёт ambient-кукой активного аккаунта (credentials:'include'). Ручной
    // заголовок Cookie в service worker браузер ВЫРЕЗАЕТ (forbidden header).
    const gk = await chrome.cookies.get({ url: 'https://funpay.com', name: 'golden_key' });
    if (!gk?.value) return null;

    // ИСТОЧНИК ИСТИНЫ об АКТИВНОМ аккаунте — главная с ambient-кукой: она всегда отдаёт
    // данные того аккаунта, чьим golden_key мы залогинены сейчас. Раньше первым шёл перебор
    // вкладок (getAppData), и в мульти-аккаунте он мог вернуть userId ДРУГОГО аккаунта из
    // несвёрнутой вкладки → грузили чужой профиль (без кнопок поднятия) → «ничего не
    // поднимается, консоль пустая». Поэтому главная — приоритетна, вкладки лишь fallback.
    try {
        // под cookie-замком: heartbeat/переключение аккаунта не должны подменить golden_key
        // во время этого запроса, иначе главная вернёт данные ДРУГОГО аккаунта (как в autobump).
        const res = await withCookieLock(() => fpFetch('https://funpay.com/', { credentials: 'include', cache: 'no-store' }));
        const text = await res.text();
        const m = text.match(/<body[^>]*data-app-data="([^"]+)"/);
        if (m) {
            const d = JSON.parse(m[1].replace(/&quot;/g, '"'));
            const u = Array.isArray(d) ? d[0] : d;
            if (u?.['csrf-token'] && u.userId) return { csrfToken: u['csrf-token'], userId: u.userId };
        }
    } catch (_) {}

    // Fallback: активная вкладка FunPay (если главную не удалось распарсить).
    const tabs = await chrome.tabs.query({ url: 'https://funpay.com/*' });
    for (const tab of tabs) {
        if (tab.discarded) continue;
        try {
            const r = await chrome.tabs.sendMessage(tab.id, { action: 'getAppData' });
            if (r?.success) {
                const d = Array.isArray(r.data) ? r.data[0] : r.data;
                if (d?.['csrf-token'] && d.userId) return { csrfToken: d['csrf-token'], userId: d.userId };
            }
        } catch (_) {}
    }
    return null;
}

// Raise one category. Returns { ok, waitSec, name } - waitSec is when to try again.
async function raiseCategory(categoryUrl, auth) {
    // Cookie НЕ ставим вручную (forbidden header, вырезается) — браузер приложит ambient-куку
    // активного аккаунта благодаря credentials:'include'. Все запросы идут через fpFetch:
    // общий темп (800мс) + бэк-офф на 429/5xx, чтобы поднятие не упиралось в rate-limit.
    const headers = {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'x-requested-with': 'XMLHttpRequest',
        'x-csrf-token': auth.csrfToken
    };

    // Load category page to discover game_id / node_id and name.
    const pageRes = await fpFetch(categoryUrl, { credentials: 'include', cache: 'no-store' });
    if (!pageRes.ok) return { ok: false, waitSec: 600, name: categoryUrl };
    const pageHtml = await pageRes.text();
    const nameMatch = pageHtml.match(/<span class="inside">([^<]+)<\/span>/);
    const name = nameMatch ? nameMatch[1].trim() : categoryUrl;
    const btn = pageHtml.match(/<button[^>]+class="[^"]*js-lot-raise[^"]*"[^>]*data-game="(\d+)"[^>]*data-node="([^"]+)"/);
    if (!btn) return { ok: false, waitSec: 600, name };

    const gameId = btn[1], nodeId = btn[2];

    // First attempt (single node).
    let body = new URLSearchParams({ game_id: gameId, node_id: nodeId });
    let res = await fpFetch('https://funpay.com/lots/raise', { method: 'POST', headers, body: body.toString(), credentials: 'include' });
    let json = await res.json().catch(() => ({}));

    // FunPay may ask to confirm multiple subcategories via a modal.
    if (json.modal) {
        const ids = Array.from(json.modal.matchAll(/<input[^>]*value="(\d+)"/g), m => m[1]);
        if (ids.length) {
            body = new URLSearchParams();
            body.append('game_id', gameId);
            body.append('node_id', nodeId);
            ids.forEach(id => body.append('node_ids[]', id));
            res = await fpFetch('https://funpay.com/lots/raise', { method: 'POST', headers, body: body.toString(), credentials: 'include' });
            json = await res.json().catch(() => ({}));
        }
    }

    // HTTP-ответ обязан быть успешным: 429/5xx или HTML-редирект на логин дают пустой json={}.
    if (!res.ok) return { ok: false, waitSec: 600, name };

    const msg = String(json.msg || '');
    // Сначала отсеиваем ожидание/редирект/ошибку.
    if (/(Подожди|Please wait|Зачекай)/i.test(msg)) {
        return { ok: false, waitSec: parseWaitTime(msg), name };
    }
    if (json.url) {
        return { ok: false, waitSec: 7200, name };
    }
    if (json.error) {
        return { ok: false, waitSec: 600, name };
    }
    // УСПЕХ подтверждаем ПОЗИТИВНО (как обычное поднятие проверяет 'подняты'/'raised'), а НЕ
    // по отсутствию ошибки. Иначе 200-страница логина/капчи или модалка без распознанных
    // чекбоксов дают json={} → ложный тост «Лоты подняты» + заморозка категории на 4ч.
    if (/подня|підня|raised/i.test(msg)) {
        return { ok: true, waitSec: 4 * 3600, name }; // дефолтный кулдаун FunPay ~4ч
    }
    // Непонятный ответ — НЕ считаем успехом; пробуем снова скоро (а не замораживаем на 4ч).
    return { ok: false, waitSec: 600, name };
}

async function getState() {
    const { [STATE_KEY]: st = {} } = await chrome.storage.local.get(STATE_KEY);
    return st;
}
async function setState(st) {
    await chrome.storage.local.set({ [STATE_KEY]: st });
}

function logToTabs(message) {
    const line = `[${new Date().toLocaleTimeString()}] ${message}`;
    chrome.tabs.query({ url: 'https://funpay.com/*' }).then(tabs => {
        tabs.forEach(t => chrome.tabs.sendMessage(t.id, { action: 'logToAutoBumpConsole', message: line }).catch(() => {}));
    });
    console.log('[FP Tools SmartBump]', line);
}

// Run one smart-bump pass. Raises only due categories and updates per-category nextRaiseAt.
// Cadence is driven by the PERIODIC alarm (see startSmartBump) — the pass no longer re-arms
// anything, so a transient failure can never stop future passes.
let _smartBumpRunning = false;
export async function runSmartBumpCycle() {
    // Защита от наложения: периодический alarm может сработать, пока предыдущий проход ещё
    // идёт (много категорий). Два прохода разом гонялись бы за общим state (read-modify-write)
    // и могли бы поднять дважды — поэтому второй просто пропускаем.
    if (_smartBumpRunning) return;
    _smartBumpRunning = true;

    // Цикл НИКОГДА не падает наружу: периодический alarm и так разбудит нас снова, но любой
    // throw здесь оставил бы лог-консоль без записи. Поднятые в этом проходе категории
    // копим и в конце показываем одним аккуратным уведомлением.
    const raisedNames = [];
    try {
        // FunPay под бэк-оффом (после 429/5xx) — пропускаем проход, периодический alarm
        // вернётся через ~10 мин; сам fpFetch тоже соблюдает паузу.
        if (fpIsRateLimited()) {
            logToTabs('Умное поднятие: FunPay под бэк-оффом (rate-limit), пропуск прохода.');
            return;
        }

        const state = await getState();
        const now = Date.now();

        // Дешёвый ранний выход: если по сохранённому состоянию ни одна категория ещё не созрела,
        // не делаем тяжёлую работу (фетч главной + профиля + offscreen-парс) — периодический alarm
        // вернётся через ~10 мин. Молча, чтобы не засорять консоль каждый тик. Новая категория,
        // добавленная позже, подхватится при ближайшем полном проходе (когда созреет любая из
        // существующих; при пустом состоянии — сразу, на первом проходе).
        const entries = Object.values(state);
        if (entries.length && entries.every(e => e && e.nextRaiseAt > now)) return;

        const { fpToolsSelectiveBumpEnabled, fpToolsSelectedBumpCategories, fpToolsBumpOnlyAutoDelivery } =
            await chrome.storage.local.get(['fpToolsSelectiveBumpEnabled', 'fpToolsSelectedBumpCategories', 'fpToolsBumpOnlyAutoDelivery']);

        const auth = await getAuth();
        if (!auth) { logToTabs('Умное поднятие: нет авторизации (откройте вкладку FunPay).'); return; }

        const userUrl = `https://funpay.com/users/${auth.userId}/`;
        const userHtml = await (await fpFetch(userUrl, { credentials: 'include', cache: 'no-store' })).text();
        let categories = await parseHtmlViaOffscreen(userHtml, 'parseUserCategories');
        if (!Array.isArray(categories)) categories = [];

        const totalFound = categories.length;
        if (fpToolsBumpOnlyAutoDelivery) categories = categories.filter(c => c.hasAutoDelivery);
        if (fpToolsSelectiveBumpEnabled && fpToolsSelectedBumpCategories?.length) {
            categories = categories.filter(c => fpToolsSelectedBumpCategories.includes(c.id));
        } else if (fpToolsSelectiveBumpEnabled) {
            logToTabs('Умное поднятие: выборочный режим включён, но категории не выбраны.');
            return;
        }

        // Диагностика, чтобы консоль не молчала: видно, на каком аккаунте и сколько категорий.
        logToTabs(`Умное поднятие: аккаунт #${auth.userId}, категорий найдено: ${totalFound}, к проверке после фильтров: ${categories.length}.`);
        if (totalFound === 0) {
            logToTabs('Умное поднятие: на профиле активного аккаунта нет категорий с кнопкой поднятия. Убедитесь, что вы вошли именно в нужный аккаунт и у него есть активные лоты.');
            return;
        }

        for (const cat of categories) {
            const url = new URL(cat.id, 'https://funpay.com/').href;
            const entry = state[url];
            if (entry && entry.nextRaiseAt > now) continue; // ещё не созрело

            try {
                const { ok, waitSec, name } = await raiseCategory(url, auth);
                state[url] = { nextRaiseAt: now + Math.max(waitSec, 30) * 1000, name };
                if (ok) {
                    raisedNames.push(name);
                    logToTabs(`Поднято: ${name}. Следующее через ~${Math.round(waitSec / 60)} мин.`);
                } else {
                    logToTabs(`Не поднято: ${name}. Повтор через ~${Math.round(waitSec / 60)} мин.`);
                }
            } catch (e) {
                state[url] = { nextRaiseAt: now + 600000, name: url };
                logToTabs(`Ошибка поднятия ${url}: ${e.message}. Повтор через ~10 мин.`);
            }
            // Персистим ПОСЛЕ КАЖДОЙ категории: если MV3 усыпит воркер в середине прохода,
            // уже поднятые категории сохранят свой nextRaiseAt и не будут подняты повторно
            // (раньше state писался только в конце → eviction приводил к двойному поднятию → 429).
            await setState(state);
            await new Promise(r => setTimeout(r, 3000)); // pacing between categories
        }
    } catch (e) {
        logToTabs(`Умное поднятие: сбой прохода (${e.message}). Повтор по расписанию.`);
    } finally {
        _smartBumpRunning = false;
        if (raisedNames.length) await notifyRaised(raisedNames);
    }
}

export async function startSmartBump() {
    // Периодический alarm: тикает сам, проход не обязан его «перевзводить».
    await chrome.alarms.create(SMART_BUMP_ALARM, { delayInMinutes: 0.1, periodInMinutes: SMART_BUMP_PERIOD_MIN });
    await runSmartBumpCycle();
}

export async function stopSmartBump() {
    await chrome.alarms.clear(SMART_BUMP_ALARM);
    await chrome.storage.local.remove(STATE_KEY);
}
