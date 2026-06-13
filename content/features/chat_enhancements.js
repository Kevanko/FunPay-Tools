// content/features/chat_enhancements.js
// Chat quality-of-life improvements:
// 1. Unread total badge on the "Сообщения" nav link
// 2. Timestamp relative refresh ("только что", "2 мин назад", etc.) 
// 3. Ctrl+Enter to send
// 4. Draft saving per chat (survives page navigation)

(function () {
    'use strict';

    // --- 1. Ctrl+Enter to send ---
    function initCtrlEnterSend() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                const input = document.querySelector('.chat-form-input .form-control');
                if (input && document.activeElement === input) {
                    const form = input.closest('form');
                    const submitBtn = form?.querySelector('button[type="submit"]');
                    if (submitBtn && !submitBtn.disabled) {
                        e.preventDefault();
                        submitBtn.click();
                    }
                }
            }
        });
    }

    // --- 2. Draft saving per chat ---
    const DRAFT_KEY = 'fpToolsChatDrafts';
    let _drafts = {};

    async function loadDrafts() {
        const d = await chrome.storage.local.get(DRAFT_KEY);
        _drafts = d[DRAFT_KEY] || {};
    }

    async function saveDraft(chatId, text) {
        if (!chatId) return;
        _drafts[chatId] = text;
        // Trim to last 200 chats
        const keys = Object.keys(_drafts);
        if (keys.length > 200) {
            keys.slice(0, keys.length - 200).forEach(k => delete _drafts[k]);
        }
        await chrome.storage.local.set({ [DRAFT_KEY]: _drafts });
    }

    function getChatIdFromUrl() {
        const m = window.location.search.match(/[?&]node=(\d+)/);
        return m ? m[1] : null;
    }

    // Tracks which chat the listener is currently bound to. On SPA chat switches the
    // node= changes but the same <textarea> stays in the DOM, so we must re-read the
    // chatId instead of capturing it once.
    let _draftBoundInput = null;
    let _draftTimer = null;

    function initDraftSaving() {
        loadDrafts().then(() => {
            const input = document.querySelector('.chat-form-input .form-control');
            if (!input) return;

            const currentChatId = getChatIdFromUrl();

            // Restore draft for the chat we're actually looking at right now.
            // Only restore into a genuinely empty field, and never overwrite text the
            // user already has. We mark the restore as programmatic so it isn't re-saved.
            if (currentChatId && _drafts[currentChatId] && !input.value) {
                window.__fptProgrammaticInput = true;
                input.value = _drafts[currentChatId];
                input.dispatchEvent(new Event('input', { bubbles: true }));
                window.__fptProgrammaticInput = false;
            }

            // Attach the input listener only once per textarea element.
            if (_draftBoundInput !== input) {
                _draftBoundInput = input;

                input.addEventListener('input', () => {
                    // Ignore input events that WE triggered (templates, autoresponder,
                    // AI rewrite, draft restore). Those must never be persisted as drafts,
                    // which was causing drafts to appear "out of nowhere".
                    if (window.__fptProgrammaticInput) return;

                    // Always resolve the chatId live - the bound textarea is reused across
                    // chats in FunPay's SPA, so a captured id would be stale.
                    const chatId = getChatIdFromUrl();
                    if (!chatId) return;

                    clearTimeout(_draftTimer);
                    _draftTimer = setTimeout(() => {
                        const text = input.value.trim();
                        if (text) saveDraft(chatId, text);
                        else {
                            delete _drafts[chatId];
                            chrome.storage.local.set({ [DRAFT_KEY]: _drafts });
                        }
                    }, 800);
                });

                // Очистка черновика при ОТПРАВКЕ. FunPay шлёт сообщение через JS
                // (кнопка + runner) и чистит поле программно — событие 'submit' часто
                // не срабатывает, а программная очистка поля НЕ генерит 'input'. Поэтому
                // ловим саму отправку: клик по кнопке отправки и Enter (без Shift).
                const form = input.closest('form');
                // На ПОПЫТКУ отправки: (1) СРАЗУ сохраняем черновик — если FunPay вернёт
                // «перезагрузите страницу», набранный текст не потеряется при перезагрузке;
                // (2) через 0.5 c проверяем поле: очистилось → отправка УСПЕШНА → убираем
                // черновик; текст на месте → отправка НЕ прошла → ОСТАВЛЯЕМ черновик.
                // (Раньше черновик стирался по клику безусловно — текст пропадал при ошибке.)
                const onSendAttempt = () => {
                    const chatId = getChatIdFromUrl();
                    if (!chatId) return;
                    const text = input.value.trim();
                    if (text) { clearTimeout(_draftTimer); saveDraft(chatId, text); }
                    setTimeout(() => {
                        if (input.value.trim()) return;            // текст на месте → отправка не прошла → не трогаем
                        if (_drafts[chatId] !== undefined) {
                            delete _drafts[chatId];
                            try { chrome.storage.local.set({ [DRAFT_KEY]: _drafts }); } catch (_) {}
                        }
                    }, 500);
                };
                form?.addEventListener('submit', onSendAttempt);
                const sendBtn = form?.querySelector('button[type="submit"], button.btn-round, .chat-form-btn button');
                sendBtn?.addEventListener('click', onSendAttempt);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) onSendAttempt();
                });
            }
        });
    }

    // --- 3. Character counter on chat input ---
    function initCharCounter() {
        const input = document.querySelector('.chat-form-input .form-control');
        if (!input || document.getElementById('fp-chat-char-count')) return;

        const counter = document.createElement('span');
        counter.id = 'fp-chat-char-count';
        counter.className = 'fp-chat-char-count';
        counter.textContent = '';

        const formGroup = document.querySelector('#comments');
        if (formGroup) {
            formGroup.style.position = 'relative';
            formGroup.appendChild(counter);
        }

        input.addEventListener('input', () => {
            const len = input.value.length;
            if (len > 0) {
                counter.textContent = len;
                counter.style.display = 'block';
                counter.style.color = len > 900 ? '#ff5c5c' : len > 700 ? '#ffa500' : '#4a5070';
            } else {
                counter.style.display = 'none';
            }
        });
    }

    // --- Init ---
    // Когда композер/полоса шаблонов уезжают НИЖЕ окна (FunPay задаёт .chat-message-list
    // абсолютную высоту по JS и не учитывает добавленную нами полосу шаблонов, либо окно
    // низкое) — последнее сообщение оказывается за нижним краем и до него не долистать.
    // Подрезаем высоту списка ровно на «вылет», чтобы низ списка и композер влезли в экран.
    // Срабатывает ТОЛЬКО при реальном вылете (иначе — no-op); только уменьшает высоту.
    let _fitT = null;
    function fitChatList() {
        // ТОЛЬКО на полной странице чата (/chat/). На странице профиля пользователя
        // (/users/<id>/) есть встроенный мини-чат с ДРУГОЙ раскладкой — там подгонка по
        // высоте окна растягивала ленту и текст вылезал за пределы виджета.
        if (!location.pathname.includes('/chat/')) return;
        // FunPay держит ленту сообщений в .chat-message-container (flex:1), а сам список —
        // абсолютным внутри него; высоту он считает по JS и НЕ учитывает нашу полосу шаблонов,
        // поэтому композер+полоса уезжают за низ окна и последнее сообщение прячется. Двигать
        // надо КОНТЕЙНЕР (он позиционирует композер), а не список. Считаем доступную высоту
        // ленты так, чтобы композер+полоса влезли в окно, и подгоняем контейнер и список.
        const list = document.querySelector('.chat-message-list');
        const container = document.querySelector('.chat-message-container');
        const form = document.querySelector('.chat-form');
        if (!list || !container || !form) return;
        const cTop = container.getBoundingClientRect().top;
        const formH = form.getBoundingClientRect().height;
        const strip = document.querySelector('.chat-buttons-container');
        const stripH = strip ? strip.getBoundingClientRect().height : 0;
        const avail = Math.round(window.innerHeight - cTop - formH - stripH - 8);
        if (avail < 140) return;                              // слишком мало / не та раскладка — не трогаем
        if (Math.abs(container.getBoundingClientRect().height - avail) < 3) return;   // уже верно
        const atBottom = list.scrollHeight - list.clientHeight - list.scrollTop < 50;
        container.style.flex = '0 0 auto';
        container.style.minHeight = '0';
        container.style.height = avail + 'px';
        list.style.height = avail + 'px';                     // абсолютный список заполняет контейнер
        if (atBottom) list.scrollTop = list.scrollHeight;     // оставляем пользователя у последнего сообщения
    }
    function scheduleFit() { if (_fitT) clearTimeout(_fitT); _fitT = setTimeout(fitChatList, 120); }
    function initChatListFit() {
        scheduleFit();
        const list = document.querySelector('.chat-message-list');
        if (list && !list.dataset.fptFit) {
            list.dataset.fptFit = '1';
            // новые сообщения / смена раскладки — пересчитываем (на childList, не на style → без петли)
            new MutationObserver(scheduleFit).observe(list, { childList: true });
        }
        // Полоса шаблонов («Приветствие», «Заказ выполнен») рендерится АСИНХРОННО, уже после
        // нашей первой подгонки → высота считается без неё, и при появлении полоса/композер
        // «вдавливаются» и сжимаются. Следим за панелью чата: появилась/сменилась полоса →
        // пересчитываем. Плюс пара отложенных пересчётов, чтобы поймать позднюю отрисовку.
        const panel = list && list.closest('.chat, .chat-app, .chat-full');
        if (panel && !panel.dataset.fptFitPanel) {
            panel.dataset.fptFitPanel = '1';
            new MutationObserver(scheduleFit).observe(panel, { childList: true });
        }
        setTimeout(scheduleFit, 500);
        setTimeout(scheduleFit, 1500);
    }

    // Метим body классом ТОЛЬКО на полной странице чата (/chat/), чтобы стили чата
    // (flex-shrink композера/полосы) не задевали встроенный мини-чат в профиле.
    function markChatPage() { try { document.body.classList.toggle('fpt-chatpage', location.pathname.includes('/chat/')); } catch (_) {} }

    function init() {
        initCtrlEnterSend();
        markChatPage();
        window.addEventListener('resize', scheduleFit);

        // For chat pages, init draft + char counter
        const isChatPage = window.location.pathname.includes('/chat/') ||
            window.location.pathname.includes('/users/') && document.querySelector('.chat-form-input');

        if (document.querySelector('.chat-form-input')) {
            initDraftSaving();
            initCharCounter();
            initChatListFit();
        }

        // Watch for chat form appearing (SPA routing)
        const root = document.getElementById('content') || document.body;
        let _initDone = !!document.querySelector('.chat-form-input');
        let _lastUrl = window.location.href;
        new MutationObserver(() => {
            if (!_initDone && document.querySelector('.chat-form-input')) {
                _initDone = true;
                initDraftSaving();
                initCharCounter();
                initChatListFit();
            }
            if (_initDone && !document.querySelector('.chat-form-input')) {
                _initDone = false;
            }
            // SPA navigation between chats keeps the form mounted but changes node=.
            // Re-run draft init so the correct chat's draft is restored and the live
            // chatId is used for saving.
            if (window.location.href !== _lastUrl) {
                _lastUrl = window.location.href;
                markChatPage();
                if (document.querySelector('.chat-form-input')) { initDraftSaving(); initChatListFit(); }
            }
        }).observe(root, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();