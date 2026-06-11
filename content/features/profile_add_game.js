// content/features/profile_add_game.js
// Каркас «Добавить лоты по игре» на странице своего профиля: карточка-заглушка
// после разделов с лотами → модалка (выбор игры + выбор существующих лотов для
// копирования). Реальное создание лотов пока ЗАГЕЙЧЕНО (включим после подтверждения).
(function () {
    'use strict';

    let _gamesCache = null;

    function isOwnProfile() {
        if (!/\/users\/\d+\//.test(location.pathname)) return false;
        if (document.querySelector('.chat-profile-container')) return false;
        try {
            const d = JSON.parse(document.body.dataset.appData);
            const uid = String((Array.isArray(d) ? d[0] : d).userId || '');
            const m = location.pathname.match(/\/users\/(\d+)\//);
            return m && uid && m[1] === uid;
        } catch (_) { return false; }
    }

    // Список игр FunPay (одной загрузкой главной, кэш на сессию).
    async function loadGames() {
        if (_gamesCache) return _gamesCache;
        try {
            const res = await fetch('https://funpay.com/', { credentials: 'include' });
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const games = [];
            doc.querySelectorAll('.promo-games-all .promo-game-item').forEach(item => {
                const a = item.querySelector('.game-title a');
                if (!a) return;
                const cats = [...item.querySelectorAll('.list-inline:not(.hidden) li a')].map(c => ({ name: c.textContent.trim(), url: c.href }));
                games.push({ name: a.textContent.trim(), url: a.href, cats });
            });
            _gamesCache = games;
        } catch (_) { _gamesCache = []; }
        return _gamesCache;
    }

    // Существующие лоты пользователя со страницы профиля (для выбора «что копировать»).
    function collectExistingLots() {
        const lots = [];
        document.querySelectorAll('.offer').forEach(offer => {
            const game = offer.querySelector('.offer-list-title h3 a')?.textContent.trim() || 'Без категории';
            offer.querySelectorAll('a.tc-item').forEach(it => {
                const desc = it.querySelector('.tc-desc-text, .order-desc div')?.textContent.trim()
                    || it.textContent.replace(/\s+/g, ' ').trim().slice(0, 60);
                const price = it.querySelector('.tc-price')?.textContent.trim() || '';
                const m = (it.getAttribute('href') || '').match(/(?:offer=|id=)(\d+)/);
                lots.push({ id: m ? m[1] : null, game, desc, price });
            });
        });
        return lots;
    }

    function buildCard() {
        const container = document.querySelector('.col-md-7.profile-data-container, .profile-data-container');
        const offers = container ? container.querySelectorAll('.offer') : [];
        if (!container || !offers.length) return;
        if (document.getElementById('fpt-addgame-card')) return;

        const card = document.createElement('div');
        card.id = 'fpt-addgame-card';
        card.className = 'fpt-addgame-card';
        card.innerHTML =
            '<div class="fpt-addgame-ic"><span class="material-symbols-rounded">add</span></div>' +
            '<div class="fpt-addgame-txt"><div class="fpt-addgame-title">Добавить лоты по игре</div>' +
            '<div class="fpt-addgame-sub">Выберите игру и скопируйте в новый раздел существующие лоты</div></div>' +
            '<span class="material-symbols-rounded fpt-addgame-go">chevron_right</span>';
        offers[offers.length - 1].after(card);
        card.addEventListener('click', openModal);
    }

    function openModal() {
        if (document.querySelector('.fpt-addgame-overlay')) return;
        const overlay = document.createElement('div');
        overlay.className = 'fpt-addgame-overlay';
        overlay.innerHTML = `
            <div class="fpt-addgame-modal">
                <div class="fpt-addgame-head">
                    <span>Добавить лоты по игре</span>
                    <button type="button" class="fpt-addgame-close"><span class="material-symbols-rounded">close</span></button>
                </div>
                <div class="fpt-addgame-body">
                    <div class="fpt-addgame-step">
                        <div class="fpt-addgame-steplabel">1 · Выберите игру</div>
                        <input type="text" class="fpt-addgame-search" placeholder="Начните вводить название игры…" autocomplete="off">
                        <div class="fpt-addgame-suggest"></div>
                        <div class="fpt-addgame-chosen" style="display:none;"></div>
                    </div>
                    <div class="fpt-addgame-step">
                        <div class="fpt-addgame-steplabel">2 · Какие лоты скопировать</div>
                        <div class="fpt-addgame-lots"></div>
                    </div>
                </div>
                <div class="fpt-addgame-foot">
                    <span class="fpt-addgame-note">Каркас. Реальное создание лотов включим после вашего подтверждения.</span>
                    <div class="fpt-addgame-actions">
                        <button type="button" class="fpt-addgame-cancel">Отмена</button>
                        <button type="button" class="fpt-addgame-create" disabled>Создать раздел и скопировать</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
        overlay.querySelector('.fpt-addgame-close').addEventListener('click', close);
        overlay.querySelector('.fpt-addgame-cancel').addEventListener('click', close);

        // лоты для копирования
        const lotsBox = overlay.querySelector('.fpt-addgame-lots');
        const lots = collectExistingLots();
        if (!lots.length) {
            lotsBox.innerHTML = '<div class="fpt-addgame-empty">Лоты не найдены на странице.</div>';
        } else {
            lotsBox.innerHTML = lots.map((l, i) => `
                <label class="fpt-addgame-lot">
                    <input type="checkbox" data-lot="${i}">
                    <span class="fpt-addgame-lot-desc">${escapeHtml(l.desc)}</span>
                    <span class="fpt-addgame-lot-meta">${escapeHtml(l.game)}${l.price ? ' · ' + escapeHtml(l.price) : ''}</span>
                </label>`).join('');
        }

        // выбор игры
        const search = overlay.querySelector('.fpt-addgame-search');
        const suggest = overlay.querySelector('.fpt-addgame-suggest');
        const chosen = overlay.querySelector('.fpt-addgame-chosen');
        const createBtn = overlay.querySelector('.fpt-addgame-create');
        let chosenGame = null;

        const updateCreate = () => {
            const anyLot = !!overlay.querySelector('.fpt-addgame-lot input:checked');
            createBtn.disabled = !(chosenGame && anyLot);
        };
        lotsBox.addEventListener('change', updateCreate);

        let games = [];
        loadGames().then(g => { games = g; });

        let t;
        search.addEventListener('input', () => {
            clearTimeout(t);
            t = setTimeout(() => {
                const q = search.value.trim().toLowerCase();
                if (!q) { suggest.innerHTML = ''; return; }
                const matches = games.filter(g => g.name.toLowerCase().includes(q)).slice(0, 8);
                suggest.innerHTML = matches.length
                    ? matches.map(g => `<button type="button" class="fpt-addgame-sg" data-url="${escapeHtml(g.url)}">${escapeHtml(g.name)}<small>${g.cats.length} раздел.</small></button>`).join('')
                    : '<div class="fpt-addgame-empty">Ничего не найдено</div>';
            }, 180);
        });
        suggest.addEventListener('click', e => {
            const b = e.target.closest('.fpt-addgame-sg');
            if (!b) return;
            chosenGame = games.find(g => g.url === b.dataset.url) || { name: b.textContent.trim(), url: b.dataset.url };
            chosen.style.display = '';
            chosen.innerHTML = `<span class="material-symbols-rounded">check_circle</span>Игра: <b>${escapeHtml(chosenGame.name)}</b>`;
            suggest.innerHTML = '';
            search.value = chosenGame.name;
            updateCreate();
        });

        // создание — пока ЗАГЕЙЧЕНО
        createBtn.addEventListener('click', () => {
            if (typeof showNotification === 'function') {
                showNotification('Это каркас. Скажите «включить» — и кнопка начнёт реально создавать раздел и копировать выбранные лоты.', false);
            }
        });
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function init() {
        if (window !== window.top || !isOwnProfile()) return;
        const tryBuild = () => buildCard();
        tryBuild();
        // профиль может дорисовываться — наблюдаем недолго
        const mo = new MutationObserver(() => tryBuild());
        mo.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => mo.disconnect(), 12000);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
