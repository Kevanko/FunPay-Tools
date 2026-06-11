// content/theme_flash_fix.js

(async () => {
    const HIDE_STYLE_ID = 'fp-tools-flash-hide-style';
    const THEME_STYLE_ID = 'fp-tools-custom-theme';
    const FONT_STYLE_ID = 'fp-tools-google-fonts';

    // Прячем страницу ДО любых отрисовок; фон вспышки задаётся ниже под тему.
    const hideStyle = document.createElement('style');
    hideStyle.id = HIDE_STYLE_ID;
    hideStyle.textContent = `body { visibility: hidden !important; }`;
    document.documentElement.appendChild(hideStyle);

    try {
        const data = await chrome.storage.local.get([
            'enableCustomTheme', 'fpToolsTheme', 'enableRedesignedHomepage',
            'hideBalance', 'fpToolsDisabledFeatures'
        ]);

        // Маска баланса до перерисовки JS-ом (число не мигает на перезагрузке).
        if (data.hideBalance === true) {
            const balStyle = document.createElement('style');
            balStyle.id = 'fp-tools-balance-prehide';
            balStyle.textContent = `
                .badge-balance, .balances-value { color: transparent !important; text-shadow: none !important; }
                .badge-balance::after { content: '••••'; color: #9099b8; }
            `;
            document.documentElement.appendChild(balStyle);
        }

        // «Что тебе нужно»: отключённые элементы скрываются с первого кадра.
        const disabled = Array.isArray(data.fpToolsDisabledFeatures) ? data.fpToolsDisabledFeatures : [];
        if (disabled.length) {
            const SELECTOR_MAP = {
                rmthub_seller_search: '#fp-rmthub-form',
                chat_ai_rewrite_btn: '#aiModeToggleBtn',
                chat_char_counter: '#fp-chat-char-count',
                profanity_warning: '#fpToolsProfanityWarning',
                chat_read_all_btn: '#fp-tools-read-all-btn',
                chat_filter_marked_btn: '#fp-tools-filter-marked-btn',
                chat_menu_buyer_history: '#fp-buyer-hist-menu-btn',
                chat_menu_translate: '#fp-translate-menu-btn',
                chat_menu_export: '#fp-export-chat-menu-btn',
                chat_menu_blacklist: '#fp-blacklist-menu-btn',
                chat_image_generator_btn: '#fpToolsGenerateImageBtn, .generate-btn-container',
                lot_ai_gen_btn: '#fp-tools-ai-gen-btn-wrapper',
                lot_font_controls: '.fp-tools-font-controls, .fp-tools-symbols-panel',
                lot_keyboard_btn: '#fpToolsKeyboardToggleBtn',
                lot_translate_btn: '#fp-tools-translate-btn',
                lot_exact_price_btn: '.set-exact-price',
                lot_paste_bar: '#fp-tools-paste-bar',
                lot_clone_btn: '.fp-tools-clone-btn',
                lot_import_btn: '.fp-tools-import-btn',
                lot_public_clone_btn: '#fp-tools-public-clone-btn',
                lot_search_bar: '#fp-lot-search-bar',
                lot_select_btn: '#fp-tools-select-lots-btn',
                lot_reactivate_btn: '#fp-tools-reactivate-lots-btn',
                lot_pinned_container: '#fp-tools-pinned-lots-container',
                market_analytics_btn: '#fpTools-market-analytics-btn-wrapper',
                sales_stats_expand: '#fpTools-stats-extra, #fpTools-stats-expand-btn',
                notes_add_status_btn: '#fp-tools-add-status-btn'
            };
            const selectors = disabled.map(id => SELECTOR_MAP[id]).filter(Boolean);
            if (selectors.length) {
                const offStyle = document.createElement('style');
                offStyle.id = 'fp-tools-disabled-features';
                offStyle.textContent = selectors.join(', ') + ' { display: none !important; }';
                document.documentElement.appendChild(offStyle);
            }
        }
        const enabled = data.enableCustomTheme !== false;
        const settings = fptNormalizeToPreset({ ...DEFAULT_THEME, ...(data.fpToolsTheme || {}) });
        const preset = FPT_SITE_PRESETS[settings.sitePreset] || FPT_SITE_PRESETS.graphite;

        // Пресет на <html> сразу: все [data-fpt-preset]-правила (light-оверрайды,
        // палитра попапа, светлые обои) активны с первого кадра.
        document.documentElement.setAttribute('data-fpt-preset', enabled ? settings.sitePreset : 'native');
        document.documentElement.classList.toggle('fpt-custom-theme-on', enabled);
        document.documentElement.classList.toggle('fpt-custom-theme-off', !enabled);

        // Цвет вспышки под итоговую тему (а не всегда тёмный).
        hideStyle.textContent = 'body { visibility: hidden !important; background: ' + (enabled ? preset.base[1] : '#ffffff') + ' !important; }';

        if (enabled) {
            // Контент показываем ОДНИМ разом, когда idle-бандл уже встроил виджеты
            // (статистика продаж, кнопки и т.п.) — иначе страница «съезжает», когда
            // они добавляются. Шапка и фон видны сразу (тема стоит мгновенно).
            // Снимает content/zz_reveal.js (последний в бандле); failsafe — 2.5с.
            const hold = document.createElement('style');
            hold.id = 'fp-tools-content-hold';
            hold.textContent = '#content, #content-body { opacity: 0 !important; }';
            document.documentElement.appendChild(hold);
            setTimeout(() => document.getElementById('fp-tools-content-hold')?.remove(), 2500);

            // ФИНАЛЬНЫЙ CSS тем же генератором, что и theme.js — никакой «лесенки».
            manageFontImports(settings);
            let themeStyle = document.getElementById(THEME_STYLE_ID);
            if (!themeStyle) {
                themeStyle = document.createElement('style');
                themeStyle.id = THEME_STYLE_ID;
                document.documentElement.appendChild(themeStyle);
            }
            themeStyle.textContent = getCustomThemeCss(settings);

            // Слой обоев/видео — как только появится body.
            const applyLayers = () => {
                try {
                    fptApplyWallpaperLayer((settings.bgImage || settings.bgVideo) ? 'none' : settings.wallpaper);
                    fptApplyBgVideo(settings.bgVideo || null);
                } catch (_) {}
            };
            if (document.body) applyLayers();
            else document.addEventListener('DOMContentLoaded', applyLayers, { once: true });

            // Geist для редизайн-главной: display=optional — без скачка текста
            // (если шрифт не успел из кэша, остаётся системный без перевёрстки).
            const p = location.pathname;
            const isHome = p === '/' || p === '/en' || p === '/en/';
            if (isHome && data.enableRedesignedHomepage !== false && !document.getElementById('fpt-home-redesign-fonts')) {
                const l = document.createElement('link');
                l.id = 'fpt-home-redesign-fonts';
                l.rel = 'stylesheet';
                l.href = 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=optional';
                document.documentElement.appendChild(l);
                // Шрифт редизайна сразу: правило body.funpay-redesigned { Geist }
                // включается только в idle вместе с классом — до того шапка
                // рисуется Helvetica, и после смены шрифта бейджи счётчиков
                // становились шире, сдвигая пункты меню на 2-7px.
                if (!document.getElementById('fpt-home-early-font')) {
                    const fs = document.createElement('style');
                    fs.id = 'fpt-home-early-font';
                    fs.textContent = "body { font-family: 'Geist', 'Segoe UI Variable', 'Segoe UI', sans-serif; }";
                    document.documentElement.appendChild(fs);
                }
            }
        }
    } catch (error) {
        console.error('FP Tools Flash Fix Error:', error);
    } finally {
        requestAnimationFrame(() => {
            const styleToRemove = document.getElementById(HIDE_STYLE_ID);
            if (styleToRemove) styleToRemove.remove();
        });
    }
})();
// Ранний плейсхолдер кнопки «FP Tools» в шапке: настоящая кнопка раньше
// появлялась только из idle-бандла и на долю секунды сдвигала соседние
// пункты меню. Вставляем её на document_start, как только распарсится
// правая навигация — до первой отрисовки; idle-скрипт (content_script.js
// addFpToolsButton) увидит её и лишь навесит обработчики.
(function fptEarlyHeaderButton() {
    if (window !== window.top) return; // не работаем в iframe
    const tryInsert = () => {
        if (document.getElementById('fpToolsButton')) return true;
        const rightNav = document.querySelector('ul.nav.navbar-nav.navbar-right.logged');
        if (!rightNav) return false;
        const li = document.createElement('li');
        li.className = 'dropdown fp-tools-header-item';
        li.innerHTML = '<a role="button" tabindex="0" style="font-weight: 650; cursor: pointer; user-select: none;" id="fpToolsButton" data-fpt-location="header">FP Tools<span></span></a>';
        const userMenuItem = rightNav.querySelector('li.dropdown.hidden-sm.hidden-xs');
        if (userMenuItem) rightNav.insertBefore(li, userMenuItem);
        else rightNav.appendChild(li);
        return true;
    };
    tryInsert();
    // Наблюдаем до полной загрузки, а не до первой вставки: на некоторых
    // страницах (напр. /account/balance) сайт пере-рендерит шапку во время
    // парсинга и выбрасывает нашу кнопку — возвращаем её сразу же.
    const mo = new MutationObserver(() => { tryInsert(); });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    const stop = () => { tryInsert(); mo.disconnect(); };
    if (document.readyState === 'complete') stop();
    else window.addEventListener('load', stop, { once: true });
    // Финальный стиль кнопки тоже сразу: header_button_styler из idle-бандла
    // задаёт font-size — без раннего стиля кнопка «дышала» на ~4px и двигала
    // соседние пункты. Тег с тем же id styler потом просто перезапишет.
    try {
        chrome.storage.local.get('fpToolsHeaderButtonStyles', (d) => {
            if (document.getElementById('fp-tools-header-button-styles')) return;
            const s = Object.assign({ color: '#5b86d8', size: 14, opacity: 100 }, (d && d.fpToolsHeaderButtonStyles) || {});
            const tag = document.createElement('style');
            tag.id = 'fp-tools-header-button-styles';
            tag.textContent = '#fpToolsButton{--fpt-btn-color:' + s.color + ';color:' + s.color + ' !important;font-size:' + s.size + 'px !important;opacity:' + (s.opacity / 100) + ' !important;}' +
                '#fpToolsButton::before{background:' + s.color + ' !important;}';
            (document.head || document.documentElement).appendChild(tag);
        });
    } catch (_) {}
})();
