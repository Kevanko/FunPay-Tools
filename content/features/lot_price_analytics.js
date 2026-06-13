// content/features/lot_price_analytics.js — пер-лотный индикатор цены на профиле.
// У каждого лота показываем цветную точку (зелёная — цена конкурентна, жёлтая — внимание,
// красная — дороже рынка, серая — категория-демпинг) и при наведении — подробности. Пока
// данные собираются — каркасный (wireframe) кружок «собираем данные».
//
// Бережём сайт и плавность страницы:
//  • категории грузим ЛЕНИВО (когда секция в зоне видимости), по одной с троттлингом;
//  • при 429 (Too Many Requests) — экспоненциальная пауза и повтор, без флуда;
//  • тяжёлую аналитику считаем БАТЧАМИ с уступанием главного потока (requestIdleCallback),
//    индекс категории (df/токены) считаем ОДИН раз — иначе прокрутка лагала;
//  • результат кэшируем (память + storage) надолго, чтобы повторные визиты были мгновенны.
// Хелперы статистики/схожести — в utils.js (fptBuildOfferIndex, fptRecommendedFromIndex).
(function () {
    'use strict';

    const CACHE_TTL = 90 * 60 * 1000;       // повторный визит в течение 1.5 ч — без запросов
    const THROTTLE_MS = 1100;               // пауза между запросами категорий (бережём сайт)
    const PREWARM_MS = 8 * 60 * 1000;       // прогрев своего профиля не чаще раза в 8 мин
    const CACHE_MAX = 150;                  // сколько категорий держим в storage-кэше
    const SAMPLE_MAX = 1500;                // лотов на категорию для анализа (равномерная выборка)
    const FRAME_BUDGET = 8;                 // мс работы на кадр; дальше уступаем поток (без лагов)
    const RETRY_MAX = 4;                    // повторов категории при 429
    const BACKOFF = [8000, 15000, 30000, 60000];

    const _mem = {};                 // catId -> { ts, offers }
    const _inflight = {};            // catId -> Promise (дедуп одновременных запросов)
    const _queue = [];
    let _pumping = false;
    let _tipEl = null;
    let _memHydrated = false;
    let _backoffUntil = 0;
    let _backoffStep = 0;
    let _rendering = 0;              // секций в процессе покраски (чтобы кнопка не врала «Готово»)
    const _dirtyCache = new Set();   // catId с несохранёнными данными (батч-запись в storage)
    let _flushTimer = null, _flushDeadline = 0;
    const _now = () => (window.performance && performance.now ? performance.now() : Date.now());

    const _idle = () => new Promise(r => (window.requestIdleCallback
        ? requestIdleCallback(() => r(), { timeout: 150 }) : setTimeout(r, 0)));
    const _wait = ms => new Promise(r => setTimeout(r, ms));

    function _catId(href) { const m = String(href || '').match(/\/lots\/(\d+)/); return m ? m[1] : href; }
    function _secHref(sec) { return sec.querySelector('a[href*="/lots/"]')?.href || ''; }
    function _cachedOffers(href) { const e = _mem[_catId(href)]; return (e && e.offers && Date.now() - e.ts < CACHE_TTL) ? e.offers : null; }

    // Запрос категории. Возвращает { offers:[...] } | { rateLimited:true }.
    async function _fetchOffers(href) {
        try {
            const res = await fetch(href, { credentials: 'include' });
            if (res.status === 429) {
                _backoffUntil = Date.now() + BACKOFF[Math.min(_backoffStep, BACKOFF.length - 1)];
                _backoffStep++;
                return { rateLimited: true };
            }
            _backoffStep = 0;                                   // любое не-429 завершение сбрасывает эскалацию
            if (!res.ok) return { offers: [] };
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            let items = Array.from(doc.querySelectorAll('a.tc-item'));
            if (items.length > SAMPLE_MAX) {                    // равномерная выборка РОВНО до SAMPLE_MAX, без перекоса по цене
                const n = items.length, out = [];
                for (let j = 0; j < SAMPLE_MAX; j++) out.push(items[Math.round(j * (n - 1) / (SAMPLE_MAX - 1))]);
                items = out;
            }
            const offers = items.map(r => ({
                price: parseFloat(r.querySelector('.tc-price')?.dataset?.s),
                title: (r.querySelector('.tc-desc-text')?.textContent || '').trim(),
                reviews: parseInt((r.querySelector('.rating-mini-count')?.textContent || '0').replace(/\D/g, ''), 10) || 0,
                online: !!r.querySelector('.media-user.online'),
            })).filter(o => isFinite(o.price) && o.price > 0);
            return { offers };
        } catch (_) { return { offers: [] }; }
    }

    // Возвращает массив офферов (из кэша/сети) ИЛИ { rateLimited:true }.
    async function _getOffers(href) {
        const id = _catId(href);
        if (_mem[id] && Date.now() - _mem[id].ts < CACHE_TTL) return _mem[id].offers;
        try {
            const { fptLotAnalyticsCache: c = {} } = await chrome.storage.local.get('fptLotAnalyticsCache');
            if (c[id] && Date.now() - c[id].ts < CACHE_TTL) { _mem[id] = c[id]; return c[id].offers; }
        } catch (_) {}
        if (_inflight[id]) return _inflight[id];               // уже тянем эту категорию — присоединяемся
        const p = (async () => {
            const r = await _fetchOffers(href);
            if (r.rateLimited) return { rateLimited: true };
            const offers = r.offers || [];
            if (offers.length) { _mem[id] = { ts: Date.now(), offers }; _scheduleFlush(id); }
            return offers;
        })().finally(() => { delete _inflight[id]; });
        _inflight[id] = p;
        return p;
    }

    // Запись кэша в storage БАТЧЕМ: копим изменения и пишем один раз (через ~3 с после
    // последней категории, но не позже 15 с) и при уходе со страницы. Иначе read-modify-write
    // всего объекта на КАЖДУЮ категорию давал O(n²) запись растущего блоба и тормоза.
    function _scheduleFlush(id) {
        _dirtyCache.add(id);
        const now = Date.now();
        if (!_flushDeadline) _flushDeadline = now + 15000;
        if (_flushTimer) clearTimeout(_flushTimer);
        _flushTimer = setTimeout(_flushCache, Math.min(3000, Math.max(0, _flushDeadline - now)));
    }
    async function _flushCache() {
        if (_flushTimer) { clearTimeout(_flushTimer); _flushTimer = null; }
        _flushDeadline = 0;
        if (!_dirtyCache.size) return;
        const ids = [..._dirtyCache]; _dirtyCache.clear();
        try {
            const { fptLotAnalyticsCache: c = {} } = await chrome.storage.local.get('fptLotAnalyticsCache');
            for (const id of ids) if (_mem[id]) c[id] = _mem[id];
            const keys = Object.keys(c);
            if (keys.length > CACHE_MAX) {                       // вытесняем самые СТАРЫЕ по времени (ts), а не по id
                keys.sort((a, b) => (c[a].ts || 0) - (c[b].ts || 0));
                for (const k of keys.slice(0, keys.length - CACHE_MAX)) delete c[k];
            }
            await chrome.storage.local.set({ fptLotAnalyticsCache: c });
        } catch (_) {}
    }
    window.addEventListener('pagehide', () => { if (_dirtyCache.size) _flushCache(); });

    function _enqueue(task) { _queue.push(task); _pump(); }
    async function _pump() {
        if (_pumping) return;
        _pumping = true;
        try {
            while (_queue.length) {
                const back = _backoffUntil - Date.now();
                if (back > 0) await _wait(back);               // ждём, если поймали 429
                const t = _queue.shift();
                try { await t(); } catch (_) {}
                await _wait(THROTTLE_MS);                       // троттлинг запросов
            }
        } finally { _pumping = false; }
    }

    // ── классификация и отрисовка точки ──────────────────────────────────────────────
    function _classify(price, rec) {
        if (rec.dumped) return { c: 'grey', verdict: 'Категория завалена лотами по 1 ₽ — рыночная оценка не показательна' };
        const r = rec.recommended || price;
        const hi = Math.max(rec.p75 || r, r * 1.3);
        const lo = Math.min(rec.p25 || r, r * 0.7);
        if (price > hi * 1.5) return { c: 'red', verdict: 'Заметно дороже рынка — может плохо продаваться' };
        if (price > hi * 1.05) return { c: 'yellow', verdict: 'Выше рыночного коридора' };
        if (price < lo * 0.7) return { c: 'yellow', verdict: 'Заметно дешевле рынка — можно поднять' };
        return { c: 'green', verdict: 'Конкурентная цена' };
    }

    function _colorLot(lot, rec) {
        const priceEl = lot.querySelector('.tc-price');
        if (!priceEl) return;
        const existing = priceEl.querySelector('.fpt-price-dot');
        if (existing && !existing.classList.contains('fpt-price-pending')) return;   // уже посчитан
        const price = parseFloat(priceEl.dataset.s);
        if (!isFinite(price) || !rec.recommended) { if (existing) existing.remove(); return; }
        const ratio = price / rec.recommended;
        const k = _classify(price, rec);
        const dot = existing || document.createElement('span');
        dot.className = `fpt-price-dot fpt-price-${k.c}`;
        dot.dataset.tip = JSON.stringify({
            cls: k.c, verdict: k.verdict, rec: rec.recommended, price, dumped: !!rec.dumped,
            diff: Math.round((ratio - 1) * 100), comparable: rec.comparable, p25: rec.p25, p75: rec.p75,
        });
        if (!existing) priceEl.insertBefore(dot, priceEl.firstChild);
    }

    // Каркасный (wireframe) кружок «собираем данные» — пока категория грузится/считается.
    function _markPending(sec) {
        sec.querySelectorAll('a.tc-item .tc-price').forEach(cell => {
            if (cell.querySelector('.fpt-price-dot')) return;
            const d = document.createElement('span');
            d.className = 'fpt-price-dot fpt-price-pending';
            d.dataset.tip = '{"pending":true}';
            cell.insertBefore(d, cell.firstChild);
        });
    }
    function _clearPending(sec) { sec.querySelectorAll('.fpt-price-pending').forEach(d => d.remove()); }

    // Покраска секции с уступанием потока. Индекс категории считаем ОДИН раз, результат
    // мемоизируем по заголовку (в категории много одинаковых названий — «тот же товар,
    // разные продавцы» — это рушит O(лоты×офферы) до числа РАЗНЫХ названий). Режем работу
    // по БЮДЖЕТУ КАДРА (~8 мс), а не фиксированным числом лотов — нет лагов прокрутки.
    async function _renderSection(sec, offers) {
        if (!offers || !offers.length) { _clearPending(sec); return; }
        _rendering++;
        try {
            const idx = (typeof fptBuildOfferIndex === 'function') ? fptBuildOfferIndex(offers) : null;
            const memo = new Map();
            const recOf = (title) => {
                if (memo.has(title)) return memo.get(title);
                const r = idx ? fptRecommendedFromIndex(title, idx)
                    : (typeof fptRecommendedPrice === 'function' ? fptRecommendedPrice(title, offers) : null);
                memo.set(title, r);
                return r;
            };
            const lots = Array.from(sec.querySelectorAll('a.tc-item'));
            let i = 0;
            while (i < lots.length) {
                const deadline = _now() + FRAME_BUDGET;
                while (i < lots.length && _now() < deadline) {
                    const lot = lots[i++];
                    const title = (lot.querySelector('.tc-desc-text')?.textContent || '').trim();
                    const rec = recOf(title);
                    if (rec && rec.recommended) _colorLot(lot, rec);
                    else { const p = lot.querySelector('.tc-price .fpt-price-pending'); if (p) p.remove(); }
                }
                if (i < lots.length) await _idle();            // отдаём кадр браузеру
            }
        } finally { _clearPending(sec); _rendering--; }         // не оставляем «висящих» каркасов даже при сбое
    }

    // Категория через очередь: показать каркас, тянуть, при 429 — повтор, иначе покрасить.
    function _enqueueCategory(sec, href, retry) {
        _enqueue(async () => {
            if (_cachedOffers(href)) { await _renderSection(sec, _cachedOffers(href)); return; }
            _markPending(sec);
            const r = await _getOffers(href);
            if (r && r.rateLimited) {
                if (retry < RETRY_MAX) _enqueueCategory(sec, href, retry + 1);   // повтор после паузы
                else _clearPending(sec);
                return;
            }
            await _renderSection(sec, r || []);
        });
    }
    function _analyzeSection(sec) { const href = _secHref(sec); if (href) _enqueueCategory(sec, href, 0); }
    // Мгновенно из кэша (без сети и каркаса). Вернёт false, если категории нет в памяти.
    function _analyzeInstant(sec) {
        const offers = _cachedOffers(_secHref(sec));
        if (!offers) return false;
        _renderSection(sec, offers);
        return true;
    }

    // ── всплывающая подсказка ────────────────────────────────────────────────────────
    function _ensureTip() {
        if (_tipEl) return _tipEl;
        _tipEl = document.createElement('div');
        _tipEl.className = 'fpt-price-tip';
        _tipEl.style.display = 'none';
        document.body.appendChild(_tipEl);
        return _tipEl;
    }
    function _showTip(dot, anchor) {
        let t; try { t = JSON.parse(dot.dataset.tip); } catch (_) { return; }
        const tip = _ensureTip();
        if (t.pending) {
            tip.innerHTML = '<div class="fpt-price-tip-head">Собираем данные о ценах…</div>' +
                '<div class="fpt-price-tip-note">Анализируем предложения этой категории, чтобы сравнить вашу цену с рынком.</div>';
        } else if (t.dumped) {
            tip.innerHTML =
                `<div class="fpt-price-tip-head fpt-price-${t.cls}">${t.verdict}</div>` +
                `<div class="fpt-price-tip-row"><span>Ваша цена</span><b>${t.price.toFixed(2)} ₽</b></div>` +
                `<div class="fpt-price-tip-row"><span>Сравнимых предложений</span><b>${t.comparable}</b></div>` +
                `<div class="fpt-price-tip-note">Большинство лотов категории стоят ≤ 2 ₽ (накрутка сортировки). Сравнивать цену не с чем — ориентируйтесь на свой товар.</div>`;
        } else {
            const sign = t.diff > 0 ? '+' : '';
            tip.innerHTML =
                `<div class="fpt-price-tip-head fpt-price-${t.cls}">${t.verdict}</div>` +
                `<div class="fpt-price-tip-row"><span>Рынок (по продажам)</span><b>${t.rec.toFixed(2)} ₽</b></div>` +
                `<div class="fpt-price-tip-row"><span>Ваша цена</span><b>${t.price.toFixed(2)} ₽ (${sign}${t.diff}%)</b></div>` +
                `<div class="fpt-price-tip-row"><span>Сравнимых предложений</span><b>${t.comparable}</b></div>` +
                `<div class="fpt-price-tip-row"><span>Коридор рынка</span><b>${t.p25.toFixed(0)}–${t.p75.toFixed(0)} ₽</b></div>`;
        }
        tip.style.display = 'block';
        const r = (anchor || dot).getBoundingClientRect();
        const w = tip.offsetWidth || 260;
        tip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left)) + 'px';
        tip.style.top = (window.scrollY + r.bottom + 6) + 'px';
    }
    function _hideTip() { if (_tipEl) _tipEl.style.display = 'none'; }
    function _wireTooltip() {
        document.addEventListener('mouseover', e => {
            const cell = e.target.closest?.('.tc-price');
            const d = cell && cell.querySelector('.fpt-price-dot');
            if (d) _showTip(d, cell);
        });
        document.addEventListener('mouseout', e => {
            const cell = e.target.closest?.('.tc-price');
            if (cell && cell.querySelector('.fpt-price-dot') && !cell.contains(e.relatedTarget)) _hideTip();
        });
        document.addEventListener('scroll', _hideTip, true);
    }

    // ── прогрев своего профиля + кэш ──────────────────────────────────────────────────
    async function _hydrateMem() {
        if (_memHydrated) return; _memHydrated = true;
        try {
            const { fptLotAnalyticsCache: c = {} } = await chrome.storage.local.get('fptLotAnalyticsCache');
            const now = Date.now();
            for (const [id, e] of Object.entries(c)) if (e && e.offers && now - e.ts < CACHE_TTL) _mem[id] = e;
        } catch (_) {}
    }
    function _catHrefsFromDoc(doc) {
        const out = [];
        doc.querySelectorAll('.offer a[href*="/lots/"]').forEach(a => {
            const h = a.getAttribute('href'); if (!h) return;
            try { out.push(new URL(h, 'https://funpay.com').href); } catch (_) {}
        });
        return [...new Set(out)];
    }
    // Фоновый прогрев категорий СВОЕГО профиля (ссылка из шапки) — чтобы на своей странице
    // точки появлялись мгновенно. На ЛЮБОЙ странице FunPay, не чаще раза в 8 мин.
    async function _prewarmOwn() {
        try {
            const own = document.querySelector('.user-link')?.href || '';
            if (!/\/users\/\d+\//.test(own)) return;
            const { fptLotAnalyticsPrewarmTs: ts = 0 } = await chrome.storage.local.get('fptLotAnalyticsPrewarmTs');
            if (Date.now() - ts < PREWARM_MS) return;
            await chrome.storage.local.set({ fptLotAnalyticsPrewarmTs: Date.now() });
            await _hydrateMem();
            const onOwn = /^\/users\/\d+\//.test(location.pathname) &&
                location.href.split('#')[0].replace(/\/$/, '') === own.replace(/\/$/, '');
            let hrefs;
            if (onOwn) {
                hrefs = [...new Set([...document.querySelectorAll('.offer a[href*="/lots/"]')].map(a => a.href))];
            } else {
                const back = _backoffUntil - Date.now();
                if (back > 0) await _wait(back);               // не лезем в активное окно бэк-оффа (429)
                const res = await fetch(own, { credentials: 'include' });
                if (res.status === 429) { _backoffUntil = Date.now() + BACKOFF[Math.min(_backoffStep, BACKOFF.length - 1)]; _backoffStep++; return; }
                if (!res.ok) return;
                hrefs = _catHrefsFromDoc(new DOMParser().parseFromString(await res.text(), 'text/html'));
            }
            hrefs.filter(h => !_cachedOffers(h)).forEach(h => _enqueue(async () => { await _getOffers(h); }));
        } catch (_) {}
    }

    // ── кнопка «Проверить цены» ───────────────────────────────────────────────────────
    function _injectCheckButton(sections) {
        if (document.getElementById('fpt-price-check-btn')) return;
        const first = sections[0]; if (!first || !first.parentElement) return;
        const btn = document.createElement('button');
        btn.id = 'fpt-price-check-btn';
        btn.type = 'button';
        btn.className = 'fpt-price-check-btn';
        const label = '<span class="material-symbols-rounded">price_check</span> Проверить цены';
        btn.innerHTML = label;
        btn.addEventListener('click', () => {
            if (btn.disabled) return;
            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-rounded fpt-spin">progress_activity</span> Проверяю…';
            sections.forEach(sec => { if (!_analyzeInstant(sec)) _analyzeSection(sec); });
            const t = setInterval(() => {
                if (!_queue.length && !_pumping && _rendering === 0) {
                    clearInterval(t);
                    btn.disabled = false;
                    btn.innerHTML = '<span class="material-symbols-rounded">check</span> Готово';
                    setTimeout(() => { btn.innerHTML = label; }, 2200);
                }
            }, 400);
        });
        first.parentElement.insertBefore(btn, first);
    }

    async function init() {
        try { const { fptLotAnalyticsEnabled = true } = await chrome.storage.local.get('fptLotAnalyticsEnabled'); if (fptLotAnalyticsEnabled === false) return; } catch (_) {}
        _prewarmOwn();                                   // фоновый прогрев своего профиля (любая страница)
        if (!/^\/users\/\d+\//.test(location.pathname)) return;
        const sections = document.querySelectorAll('.offer');
        if (!sections.length) return;
        _wireTooltip();
        _injectCheckButton(sections);
        await _hydrateMem();                             // кэш в память → мгновенная отрисовка
        const io = new IntersectionObserver(entries => {
            entries.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); _analyzeSection(e.target); } });
        }, { rootMargin: '250px' });
        sections.forEach(s => {
            if (_analyzeInstant(s)) return;              // уже в кэше — мгновенно, без сети/каркаса
            io.observe(s);                               // нет — ленивая дозагрузка при прокрутке
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
