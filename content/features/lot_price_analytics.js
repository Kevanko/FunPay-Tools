// content/features/lot_price_analytics.js — пер-лотный индикатор цены на профиле.
// На странице профиля у каждого лота показываем цветную точку (зелёная — цена
// конкурентна, жёлтая — внимание, красная — сильно дороже рынка) и при наведении —
// подробности. Рекомендованную цену берём как медиану ПОХОЖИХ предложений категории
// с отсевом выбросов (лоты за 1 ₽ и за 1 000 000 ₽ не учитываются).
//
// Бережём сайт от флуда: категории грузим ЛЕНИВО (только когда секция попала в
// зону видимости), по одной с троттлингом, и кэшируем результат (память + storage,
// 30 мин). Хелперы статистики/схожести — в utils.js (fptRobustPriceStats,
// fptRecommendedPrice, fptTitleTokens).
(function () {
    'use strict';

    const CACHE_TTL = 30 * 60 * 1000;
    const THROTTLE_MS = 700;
    const _mem = {};                 // catId -> { ts, offers }
    const _queue = [];
    let _pumping = false;
    let _tipEl = null;

    function _catId(href) { const m = String(href || '').match(/\/lots\/(\d+)/); return m ? m[1] : href; }

    async function _fetchOffers(href) {
        try {
            const res = await fetch(href, { credentials: 'include' });
            if (!res.ok) return null;
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            return Array.from(doc.querySelectorAll('a.tc-item')).map(r => ({
                price: parseFloat(r.querySelector('.tc-price')?.dataset?.s),
                title: (r.querySelector('.tc-desc-text')?.textContent || '').trim(),
                // популярность продавца (≈ число продаж) и онлайн — вес для рекомендованной цены
                reviews: parseInt((r.querySelector('.rating-mini-count')?.textContent || '0').replace(/\D/g, ''), 10) || 0,
                online: !!r.querySelector('.media-user.online'),
            })).filter(o => isFinite(o.price) && o.price > 0);
        } catch (_) { return null; }
    }

    async function _getOffers(href) {
        const id = _catId(href);
        if (_mem[id] && Date.now() - _mem[id].ts < CACHE_TTL) return _mem[id].offers;
        try {
            const { fptLotAnalyticsCache: c = {} } = await chrome.storage.local.get('fptLotAnalyticsCache');
            if (c[id] && Date.now() - c[id].ts < CACHE_TTL) { _mem[id] = c[id]; return c[id].offers; }
        } catch (_) {}
        const offers = await _fetchOffers(href);
        if (offers && offers.length) {
            _mem[id] = { ts: Date.now(), offers };
            try {
                const { fptLotAnalyticsCache: c = {} } = await chrome.storage.local.get('fptLotAnalyticsCache');
                c[id] = _mem[id];
                const ids = Object.keys(c); if (ids.length > 80) delete c[ids[0]];   // не раздуваем кэш
                await chrome.storage.local.set({ fptLotAnalyticsCache: c });
            } catch (_) {}
        }
        return offers || [];
    }

    function _enqueue(task) { _queue.push(task); _pump(); }
    async function _pump() {
        if (_pumping) return;
        _pumping = true;
        try {
            while (_queue.length) {
                const t = _queue.shift();
                try { await t(); } catch (_) {}
                await new Promise(r => setTimeout(r, THROTTLE_MS));   // троттлинг запросов
            }
        } finally { _pumping = false; }
    }

    // Классификация по КОРИДОРУ рынка (p25–p75), а не по «голому» отношению к медиане:
    // лот на верхней границе коридора — это норма, а не «красный». Коридор расширяем
    // рекомендованной ценой, чтобы он не вырождался. dumped → нейтральный серый.
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
        if (!priceEl || priceEl.querySelector('.fpt-price-dot')) return;
        const price = parseFloat(priceEl.dataset.s);
        if (!isFinite(price) || !rec.recommended) return;
        const ratio = price / rec.recommended;
        const k = _classify(price, rec);
        const dot = document.createElement('span');
        dot.className = `fpt-price-dot fpt-price-${k.c}`;
        dot.dataset.tip = JSON.stringify({
            cls: k.c, verdict: k.verdict, rec: rec.recommended, price, dumped: !!rec.dumped,
            diff: Math.round((ratio - 1) * 100), comparable: rec.comparable, p25: rec.p25, p75: rec.p75,
        });
        priceEl.insertBefore(dot, priceEl.firstChild);
    }

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
        const sign = t.diff > 0 ? '+' : '';
        if (t.dumped) {
            tip.innerHTML =
                `<div class="fpt-price-tip-head fpt-price-${t.cls}">${t.verdict}</div>` +
                `<div class="fpt-price-tip-row"><span>Ваша цена</span><b>${t.price.toFixed(2)} ₽</b></div>` +
                `<div class="fpt-price-tip-row"><span>Сравнимых предложений</span><b>${t.comparable}</b></div>` +
                `<div class="fpt-price-tip-note">Большинство лотов категории стоят ≤ 2 ₽ (накрутка сортировки). Сравнивать цену не с чем — ориентируйтесь на свой товар.</div>`;
        } else {
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
        // Навешиваемся на ВСЮ ячейку цены (.tc-price), а не на крошечную точку —
        // так гораздо легче навести курсор для подробностей.
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

    function _analyzeSection(sec) {
        const href = sec.querySelector('a[href*="/lots/"]')?.href;
        if (!href) return;
        _enqueue(async () => {
            const offers = await _getOffers(href);
            if (!offers || !offers.length) return;
            sec.querySelectorAll('a.tc-item').forEach(lot => {
                const title = (lot.querySelector('.tc-desc-text')?.textContent || '').trim();
                const rec = (typeof fptRecommendedPrice === 'function') ? fptRecommendedPrice(title, offers) : null;
                if (rec && rec.recommended) _colorLot(lot, rec);
            });
        });
    }

    async function init() {
        if (!/^\/users\/\d+\//.test(location.pathname)) return;
        try { const { fptLotAnalyticsEnabled = true } = await chrome.storage.local.get('fptLotAnalyticsEnabled'); if (fptLotAnalyticsEnabled === false) return; } catch (_) {}
        const sections = document.querySelectorAll('.offer');
        if (!sections.length) return;
        _wireTooltip();
        const io = new IntersectionObserver(entries => {
            entries.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); _analyzeSection(e.target); } });
        }, { rootMargin: '250px' });
        sections.forEach(s => io.observe(s));
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
