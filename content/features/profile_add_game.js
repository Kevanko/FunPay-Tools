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
        // в начале списка лотов — перед первым разделом (после панели управления лотами)
        offers[0].before(card);
        card.addEventListener('click', openModal);
    }

    function openModal() {
        if (document.querySelector('.fpt-addgame-overlay')) return;
        const overlay = document.createElement('div');
        overlay.className = 'fpt-addgame-overlay';
        overlay.innerHTML = `
            <div class="fpt-addgame-modal">
                <div class="fpt-addgame-head">
                    <button type="button" class="fpt-addgame-back" style="display:none;"><span class="material-symbols-rounded">arrow_back</span></button>
                    <span class="fpt-addgame-title-h">Добавить лот по игре</span>
                    <button type="button" class="fpt-addgame-close"><span class="material-symbols-rounded">close</span></button>
                </div>
                <div class="fpt-addgame-body">
                    <div class="fpt-addgame-view fpt-addgame-view-main">
                        <div class="fpt-addgame-step">
                            <div class="fpt-addgame-steplabel">1 · Выберите игру</div>
                            <input type="text" class="fpt-addgame-search" placeholder="Начните вводить название игры…" autocomplete="off">
                            <div class="fpt-addgame-suggest"></div>
                            <div class="fpt-addgame-chosen" style="display:none;"></div>
                        </div>
                        <div class="fpt-addgame-step fpt-addgame-step2" style="display:none;">
                            <div class="fpt-addgame-steplabel">2 · Раздел игры</div>
                            <select class="fpt-addgame-cat template-input"></select>
                            <div class="fpt-addgame-cathint">У каждой игры свои разделы — выберите, куда добавить лот.</div>
                        </div>
                        <div class="fpt-addgame-step fpt-addgame-step3" style="display:none;">
                            <div class="fpt-addgame-steplabel">3 · Как создать лот</div>
                            <div class="fpt-addgame-modes">
                                <label class="fpt-addgame-mode"><input type="radio" name="fpt-addgame-mode" value="empty" checked><span class="material-symbols-rounded">note_add</span><span class="fpt-addgame-mode-t">Пустой лот<small>создать чистый, без настроек</small></span></label>
                                <label class="fpt-addgame-mode"><input type="radio" name="fpt-addgame-mode" value="copy"><span class="material-symbols-rounded">content_copy</span><span class="fpt-addgame-mode-t">Скопировать существующий<small>перенести выбранные лоты</small></span></label>
                                <label class="fpt-addgame-mode"><input type="radio" name="fpt-addgame-mode" value="ai"><span class="material-symbols-rounded">auto_awesome</span><span class="fpt-addgame-mode-t">Создать с ИИ<small>опишите задачу — ИИ соберёт готовый вариант</small></span></label>
                            </div>
                            <div class="fpt-addgame-lots" style="display:none;"></div>
                            <div class="fpt-addgame-ainote" style="display:none;">Выберите «Создать с ИИ» и нажмите кнопку ниже — откроется окно, где можно описать лот или собрать его на основе ваших существующих лотов.</div>
                        </div>
                    </div>
                    <div class="fpt-addgame-view fpt-addgame-view-ai" style="display:none;"></div>
                </div>
                <div class="fpt-addgame-foot">
                    <span class="fpt-addgame-note">Каркас. Реальная публикация лота включится после вашего подтверждения.</span>
                    <div class="fpt-addgame-actions">
                        <button type="button" class="fpt-addgame-cancel">Отмена</button>
                        <button type="button" class="fpt-addgame-create" disabled>Создать лот</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
        overlay.querySelector('.fpt-addgame-close').addEventListener('click', close);
        overlay.querySelector('.fpt-addgame-cancel').addEventListener('click', close);

        const viewMain = overlay.querySelector('.fpt-addgame-view-main');
        const viewAi = overlay.querySelector('.fpt-addgame-view-ai');
        const backBtn = overlay.querySelector('.fpt-addgame-back');
        const titleH = overlay.querySelector('.fpt-addgame-title-h');
        const foot = overlay.querySelector('.fpt-addgame-foot');
        const search = overlay.querySelector('.fpt-addgame-search');
        const suggest = overlay.querySelector('.fpt-addgame-suggest');
        const chosen = overlay.querySelector('.fpt-addgame-chosen');
        const step2 = overlay.querySelector('.fpt-addgame-step2');
        const step3 = overlay.querySelector('.fpt-addgame-step3');
        const catSel = overlay.querySelector('.fpt-addgame-cat');
        const lotsBox = overlay.querySelector('.fpt-addgame-lots');
        const aiNote = overlay.querySelector('.fpt-addgame-ainote');
        const createBtn = overlay.querySelector('.fpt-addgame-create');
        let chosenGame = null;

        const lots = collectExistingLots();

        const showMain = () => {
            viewAi.style.display = 'none';
            viewMain.style.display = '';
            backBtn.style.display = 'none';
            foot.style.display = '';
            titleH.textContent = 'Добавить лот по игре';
        };
        backBtn.addEventListener('click', showMain);

        const currentMode = () => overlay.querySelector('input[name="fpt-addgame-mode"]:checked')?.value || 'empty';
        const updateCreate = () => {
            const mode = currentMode();
            // копирование НЕ обязательно: пустой/ИИ — достаточно игры; копирование — нужен хотя бы один лот
            let ok = !!chosenGame;
            if (mode === 'copy') ok = ok && !!overlay.querySelector('.fpt-addgame-lot input:checked');
            createBtn.disabled = !ok;
            createBtn.textContent = mode === 'copy' ? 'Создать и скопировать' : (mode === 'ai' ? 'Открыть ИИ-генератор' : 'Создать пустой лот');
        };

        // переключение способа создания
        step3.addEventListener('change', e => {
            if (e.target.name === 'fpt-addgame-mode') {
                const mode = currentMode();
                lotsBox.style.display = mode === 'copy' ? '' : 'none';
                aiNote.style.display = mode === 'ai' ? '' : 'none';
                if (mode === 'copy' && !lotsBox.dataset.filled) {
                    lotsBox.dataset.filled = '1';
                    lotsBox.innerHTML = lots.length
                        ? lots.map((l, i) => `<label class="fpt-addgame-lot"><input type="checkbox" data-lot="${i}"><span class="fpt-addgame-lot-desc">${escapeHtml(l.desc)}</span><span class="fpt-addgame-lot-meta">${escapeHtml(l.game)}${l.price ? ' · ' + escapeHtml(l.price) : ''}</span></label>`).join('')
                        : '<div class="fpt-addgame-empty">Лоты не найдены на странице.</div>';
                }
            }
            updateCreate();
        });

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
            chosenGame = games.find(g => g.url === b.dataset.url) || { name: b.textContent.trim(), url: b.dataset.url, cats: [] };
            chosen.style.display = '';
            chosen.innerHTML = `<span class="material-symbols-rounded">check_circle</span>Игра: <b>${escapeHtml(chosenGame.name)}</b>`;
            suggest.innerHTML = '';
            search.value = chosenGame.name;
            // разделы выбранной игры (у каждой игры свои)
            const cats = chosenGame.cats || [];
            catSel.innerHTML = cats.length
                ? cats.map(c => `<option value="${escapeHtml(c.url)}">${escapeHtml(c.name)}</option>`).join('')
                : '<option value="">У игры нет доступных разделов</option>';
            catSel.disabled = !cats.length;
            step2.style.display = '';
            step3.style.display = '';
            updateCreate();
        });

        createBtn.addEventListener('click', () => {
            const mode = currentMode();
            if (mode === 'ai') {
                openAiCompose({ overlay, viewMain, viewAi, backBtn, titleH, foot, lots, chosenGame, catSel });
                return;
            }
            // empty / copy — публикация пока ЗАГЕЙЧЕНА (каркас)
            const map = { empty: 'создаст пустой лот', copy: 'создаст лоты копированием выбранных' };
            if (typeof showNotification === 'function') {
                showNotification(`Каркас. Скажите «включить» — кнопка ${map[mode]} в выбранном разделе игры.`, false);
            }
        });
    }

    // ── Окно ИИ-генератора: описать задачу или собрать на основе своих лотов ──
    function openAiCompose(ctx) {
        const { viewMain, viewAi, backBtn, titleH, foot, lots, chosenGame, catSel } = ctx;
        const gameName = chosenGame ? chosenGame.name : '';
        const catName = catSel && catSel.selectedOptions[0] ? catSel.selectedOptions[0].textContent.trim() : '';

        viewAi.innerHTML = `
            <div class="fpt-aigen">
                <div class="fpt-aigen-target">
                    <span class="material-symbols-rounded">auto_awesome</span>
                    <span>${escapeHtml(gameName || 'Игра')}${catName ? ' · <b>' + escapeHtml(catName) + '</b>' : ''}</span>
                </div>

                <label class="fpt-aigen-label">Что нужно создать?</label>
                <textarea class="fpt-aigen-prompt" rows="3" placeholder="Опишите лот: что продаёте, ключевые особенности, условия выдачи. Например: «Аккаунт Rust с 500+ часов, Steam Guard снят, моментальная выдача»"></textarea>

                <div class="fpt-aigen-baselabel">
                    <span>На основе ваших лотов</span><small>необязательно — ИИ переймёт ваш стиль</small>
                </div>
                <div class="fpt-aigen-base"></div>

                <label class="fpt-aigen-check">
                    <input type="checkbox" class="fpt-aigen-buyermsg"><span>Сообщение покупателю после оплаты</span>
                </label>

                <button type="button" class="fpt-aigen-run"><span class="material-symbols-rounded">auto_awesome</span><span class="fpt-aigen-run-t">Сгенерировать вариант</span></button>

                <div class="fpt-aigen-result" style="display:none;">
                    <div class="fpt-aigen-reshead">Готовый вариант — отредактируйте при необходимости</div>
                    <label class="fpt-aigen-label">Название лота</label>
                    <input type="text" class="fpt-aigen-rtitle template-input">
                    <label class="fpt-aigen-label">Описание</label>
                    <textarea class="fpt-aigen-rdesc" rows="7"></textarea>
                    <div class="fpt-aigen-rmsg-wrap" style="display:none;">
                        <label class="fpt-aigen-label">Сообщение покупателю</label>
                        <textarea class="fpt-aigen-rmsg" rows="3"></textarea>
                    </div>
                    <div class="fpt-aigen-resact">
                        <button type="button" class="fpt-aigen-copy"><span class="material-symbols-rounded">content_copy</span>Скопировать текст</button>
                        <button type="button" class="fpt-aigen-regen"><span class="material-symbols-rounded">refresh</span>Сгенерировать заново</button>
                    </div>
                </div>
            </div>`;

        // список лотов для выбора «основы» (мультивыбор чипами)
        const base = viewAi.querySelector('.fpt-aigen-base');
        base.innerHTML = lots.length
            ? lots.map((l, i) => `<button type="button" class="fpt-aigen-chip" data-lot="${i}">${escapeHtml(l.desc.slice(0, 48))}</button>`).join('')
            : '<div class="fpt-addgame-empty">На странице нет лотов для основы — опишите задачу текстом.</div>';
        base.addEventListener('click', e => {
            const chip = e.target.closest('.fpt-aigen-chip');
            if (chip) chip.classList.toggle('is-on');
        });

        // переход во view ИИ
        viewMain.style.display = 'none';
        viewAi.style.display = '';
        backBtn.style.display = '';
        foot.style.display = 'none';   // у окна ИИ свои кнопки
        titleH.textContent = 'ИИ-генератор лота';

        const promptEl = viewAi.querySelector('.fpt-aigen-prompt');
        const buyerMsgEl = viewAi.querySelector('.fpt-aigen-buyermsg');
        const runBtn = viewAi.querySelector('.fpt-aigen-run');
        const runT = viewAi.querySelector('.fpt-aigen-run-t');
        const resBox = viewAi.querySelector('.fpt-aigen-result');
        const rTitle = viewAi.querySelector('.fpt-aigen-rtitle');
        const rDesc = viewAi.querySelector('.fpt-aigen-rdesc');
        const rMsgWrap = viewAi.querySelector('.fpt-aigen-rmsg-wrap');
        const rMsg = viewAi.querySelector('.fpt-aigen-rmsg');
        const copyBtn = viewAi.querySelector('.fpt-aigen-copy');
        const regenBtn = viewAi.querySelector('.fpt-aigen-regen');

        const run = async () => {
            const idea = promptEl.value.trim();
            const picked = [...base.querySelectorAll('.fpt-aigen-chip.is-on')].map(c => lots[+c.dataset.lot]).filter(Boolean);
            if (!idea && !picked.length) {
                if (typeof showNotification === 'function') showNotification('Опишите задачу или выберите хотя бы один лот за основу.', true);
                return;
            }
            const styleSource = (picked.length ? picked : lots).map(l => l.desc).filter(Boolean).slice(0, 20);
            const styleExamples = styleSource.length ? styleSource.join('\n') : 'Стиль не найден, используй живой стиль продавца FunPay.';
            const baseNote = picked.length ? `\nЗа основу взяты лоты: ${picked.map(l => l.desc.slice(0, 60)).join(' | ')}` : '';

            runBtn.disabled = true;
            runT.textContent = 'Генерирую…';
            runBtn.classList.add('is-loading');
            try {
                const resp = await chrome.runtime.sendMessage({
                    action: 'generateAILot',
                    data: {
                        promptTitle: idea || (picked[0] ? picked[0].desc : gameName),
                        promptDesc: (idea || 'Создай лот в стиле моих существующих объявлений') + baseNote,
                        genBuyerMsg: buyerMsgEl.checked,
                        styleExamples,
                        gameCategory: catName || gameName || 'категория FunPay'
                    }
                });
                if (!resp || !resp.success) throw new Error(resp && resp.error ? resp.error : 'ИИ недоступен. Проверьте ключ в настройках.');
                rTitle.value = resp.data.title || '';
                rDesc.value = resp.data.description || '';
                if (buyerMsgEl.checked && resp.data.buyerMessage) {
                    rMsg.value = resp.data.buyerMessage;
                    rMsgWrap.style.display = '';
                } else {
                    rMsgWrap.style.display = 'none';
                }
                resBox.style.display = '';
                resBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } catch (err) {
                if (typeof showNotification === 'function') showNotification('Ошибка генерации: ' + err.message, true);
            } finally {
                runBtn.disabled = false;
                runT.textContent = 'Сгенерировать вариант';
                runBtn.classList.remove('is-loading');
            }
        };

        runBtn.addEventListener('click', run);
        regenBtn.addEventListener('click', run);
        copyBtn.addEventListener('click', () => {
            const parts = [rTitle.value.trim(), '', rDesc.value.trim()];
            if (rMsgWrap.style.display !== 'none' && rMsg.value.trim()) parts.push('', '— Сообщение покупателю —', rMsg.value.trim());
            const text = parts.join('\n');
            try {
                navigator.clipboard.writeText(text).then(() => {
                    if (typeof showNotification === 'function') showNotification('Текст лота скопирован — вставьте в форму добавления.', false);
                }).catch(() => {});
            } catch (_) {}
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
