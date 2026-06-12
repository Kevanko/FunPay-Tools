// content/features/support_theme.js
// Кастомная тема FP Tools для сайта поддержки (support.funpay.com).
// Палитра берётся из FPT_SITE_PRESETS (content/theme_core.js, в манифесте
// грузится ПЕРВЫМ) — те же пресеты graphite/obsidian/slate/light и акцент
// пользователя, что и на funpay.com: единый стиль на всех под-сайтах.
// Сайт на Bootstrap 5 с переменными --bs-*: вместо борьбы с классами
// переопределяем переменные Bootstrap под палитру пресета.

(function () {
    'use strict';

    const STYLE_ID = 'fp-tools-support-theme';
    const FONT_ID  = 'fp-tools-support-fonts';

    const GOOGLE_FONTS = [
        'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Raleway',
        'Poppins', 'Nunito', 'Inter', 'Ubuntu', 'Rubik', 'Manrope', 'PT Sans'
    ];

    function toRgb(hex) {
        let r = 0, g = 0, b = 0;
        if (!hex) return '22,24,29';
        if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
            r = parseInt(hex.slice(1, 3), 16);
            g = parseInt(hex.slice(3, 5), 16);
            b = parseInt(hex.slice(5, 7), 16);
        }
        return `${r},${g},${b}`;
    }
    function rgba(hex, a) { return `rgba(${toRgb(hex)},${a})`; }

    // Осветлить/затемнить hex на величину amt (-255..255)
    function shade(hex, amt) {
        const [r, g, b] = toRgb(hex).split(',').map(Number);
        const cl = v => Math.max(0, Math.min(255, v + amt));
        const h = v => cl(v).toString(16).padStart(2, '0');
        return `#${h(r)}${h(g)}${h(b)}`;
    }

    function manageFont(font) {
        let el = document.getElementById(FONT_ID);
        const isGoogle = GOOGLE_FONTS.includes(font);
        const content = isGoogle
            ? `@import url('https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@400;600;700&display=swap');`
            : '';
        if (!el) {
            el = document.createElement('style');
            el.id = FONT_ID;
            (document.head || document.documentElement).appendChild(el);
        }
        if (el.textContent !== content) el.textContent = content;
    }

    // Слой сгенерированных обоев и его скрим — копия правил из
    // content_styles.css (тот на support не инжектится). Переменные
    // --fpt-uacc / --fpt-wallBase / --fpt-wallScrim публикуются в buildCss().
    const WALLPAPER_CSS = `
        #fpt-wallpaper-layer { position: fixed; inset: 0; z-index: -1; pointer-events: none; overflow: hidden; }
        #fpt-wallpaper-layer::after { content: ''; position: absolute; inset: 0;
            background: var(--fpt-wallScrim, linear-gradient(180deg, rgba(18,19,23,.42), rgba(18,19,23,.72))); }
        .wall-dunes { background:
            radial-gradient(120% 80% at 80% -10%, color-mix(in srgb, var(--fpt-uacc, #5b86d8) 42%, transparent), transparent 60%),
            radial-gradient(90% 70% at 0% 110%, color-mix(in srgb, var(--fpt-uacc, #5b86d8) 26%, transparent), transparent 55%),
            var(--fpt-wallBase, #121317); }
        .wall-mesh { background:
            radial-gradient(60% 60% at 18% 20%, color-mix(in srgb, var(--fpt-uacc, #5b86d8) 34%, transparent), transparent 60%),
            radial-gradient(55% 55% at 82% 30%, color-mix(in srgb, var(--fpt-uacc, #5b86d8) 26%, transparent), transparent 60%),
            radial-gradient(70% 70% at 50% 105%, color-mix(in srgb, var(--fpt-uacc, #5b86d8) 30%, transparent), transparent 55%),
            var(--fpt-wallBase, #121317); }
        .wall-grid { background:
            linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px) 0 0 / 46px 46px,
            linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px) 0 0 / 46px 46px,
            radial-gradient(80% 60% at 50% 0%, color-mix(in srgb, var(--fpt-uacc, #5b86d8) 30%, transparent), transparent 60%),
            var(--fpt-wallBase, #121317); }
        .wall-cobalt { background:
            radial-gradient(55% 78% at 84% 30%, rgba(46,86,205,.85), transparent 62%),
            radial-gradient(48% 62% at 10% 92%, rgba(30,42,120,.72), transparent 62%),
            linear-gradient(150deg, #1a2745, #0c1226); }
        .wall-aurora { background: var(--fpt-wallBase, #121317); }
        .wall-aurora::before { content: ''; position: absolute; inset: -30%;
            background:
                radial-gradient(40% 50% at 30% 40%, color-mix(in srgb, var(--fpt-uacc, #5b86d8) 42%, transparent), transparent 60%),
                radial-gradient(35% 45% at 70% 55%, color-mix(in srgb, var(--fpt-uacc, #5b86d8) 32%, transparent), transparent 60%),
                radial-gradient(45% 40% at 55% 80%, color-mix(in srgb, var(--fpt-uacc, #5b86d8) 28%, transparent), transparent 60%);
            filter: blur(20px); animation: fptAurora 22s ease-in-out infinite alternate; }
        @keyframes fptAurora {
            0%   { transform: translate3d(-4%,-2%,0) scale(1.05) rotate(0deg); }
            50%  { transform: translate3d(3%,3%,0) scale(1.12) rotate(6deg); }
            100% { transform: translate3d(-2%,4%,0) scale(1.06) rotate(-4deg); } }
        .wall-drift { background: var(--fpt-wallBase, #121317); }
        .wall-drift::before, .wall-drift::after { content: ''; position: absolute; border-radius: 50%; filter: blur(40px); }
        .wall-drift::before { width: 60%; height: 60%; left: -10%; top: -20%;
            background: radial-gradient(circle, color-mix(in srgb, var(--fpt-uacc, #5b86d8) 32%, transparent), transparent 65%);
            animation: fptDrift1 26s linear infinite; }
        .wall-drift::after { width: 50%; height: 50%; right: -8%; bottom: -22%;
            background: radial-gradient(circle, color-mix(in srgb, var(--fpt-uacc, #5b86d8) 26%, transparent), transparent 65%);
            animation: fptDrift2 32s linear infinite; }
        @keyframes fptDrift1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(20%,15%); } }
        @keyframes fptDrift2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-18%,-12%); } }
        @media (prefers-reduced-motion: reduce) { .wall-aurora::before, .wall-drift::before, .wall-drift::after { animation: none; } }
        [data-fpt-preset="light"] .wall-dunes { background:
            radial-gradient(120% 80% at 80% -10%, color-mix(in srgb, var(--fpt-uacc, #5b86d8) 16%, transparent), transparent 60%),
            radial-gradient(90% 70% at 0% 110%, color-mix(in srgb, var(--fpt-uacc, #5b86d8) 10%, transparent), transparent 55%),
            #fbfcfe; }
        [data-fpt-preset="light"] .wall-mesh { background:
            radial-gradient(60% 60% at 18% 20%, color-mix(in srgb, var(--fpt-uacc, #5b86d8) 14%, transparent), transparent 60%),
            radial-gradient(55% 55% at 82% 30%, color-mix(in srgb, var(--fpt-uacc, #5b86d8) 10%, transparent), transparent 60%),
            radial-gradient(70% 70% at 50% 105%, color-mix(in srgb, var(--fpt-uacc, #5b86d8) 12%, transparent), transparent 55%),
            #fbfcfe; }
        [data-fpt-preset="light"] .wall-grid { background:
            linear-gradient(rgba(35, 45, 70, .17) 1px, transparent 1px) 0 0 / 46px 46px,
            linear-gradient(90deg, rgba(35, 45, 70, .17) 1px, transparent 1px) 0 0 / 46px 46px,
            radial-gradient(80% 60% at 50% 0%, color-mix(in srgb, var(--fpt-uacc, #5b86d8) 9%, transparent), transparent 60%),
            #fcfdff; }
        [data-fpt-preset="light"] .wall-cobalt { background:
            radial-gradient(55% 78% at 84% 30%, color-mix(in srgb, var(--fpt-uacc, #5b86d8) 24%, transparent), transparent 62%),
            radial-gradient(48% 62% at 10% 92%, color-mix(in srgb, var(--fpt-uacc, #5b86d8) 14%, transparent), transparent 62%),
            linear-gradient(150deg, #eef3fc, #dfe9f8); }
        [data-fpt-preset="light"] .wall-aurora { background: #fbfcfe; }
        [data-fpt-preset="light"] .wall-aurora::before { background:
            radial-gradient(40% 50% at 30% 40%, color-mix(in srgb, var(--fpt-uacc, #5b86d8) 18%, transparent), transparent 60%),
            radial-gradient(35% 45% at 70% 55%, color-mix(in srgb, var(--fpt-uacc, #5b86d8) 13%, transparent), transparent 60%),
            radial-gradient(45% 40% at 55% 80%, color-mix(in srgb, var(--fpt-uacc, #5b86d8) 11%, transparent), transparent 60%); }
        [data-fpt-preset="light"] .wall-drift { background: #fbfcfe; }
        [data-fpt-preset="light"] .wall-drift::before { background: radial-gradient(circle, color-mix(in srgb, var(--fpt-uacc, #5b86d8) 15%, transparent), transparent 65%); }
        [data-fpt-preset="light"] .wall-drift::after { background: radial-gradient(circle, color-mix(in srgb, var(--fpt-uacc, #5b86d8) 11%, transparent), transparent 65%); }
    `;

    function buildCss(s, preset) {
        const pal = preset.pal;
        const scheme = preset.scheme;
        const isLight = scheme === 'light';
        const rainbow = s.accentMode === 'rainbow';

        const accentHex = s.bgColor1 || '#5b86d8';
        const accent = rainbow ? 'hsl(var(--fpt-hue) 60% 60%)' : accentHex;
        const accentSoft = rainbow ? 'hsl(var(--fpt-hue) 60% 60% / .14)' : rgba(accentHex, .14);
        // hover-сдвиг акцента с учётом схемы; для радуги цвет статичен по яркости
        const accentHover = rainbow ? 'hsl(var(--fpt-hue) 64% 52%)' : shade(accentHex, isLight ? -25 : 25);
        const linkHex = s.linkColor || accentHex;
        const link = rainbow ? 'hsl(var(--fpt-hue) 60% 64%)' : linkHex;
        const linkHover = rainbow ? 'hsl(var(--fpt-hue) 60% 70%)' : shade(linkHex, isLight ? -30 : 30);

        const rr = `${s.borderRadius ?? 8}px`;
        const hasCustomBg = !!(s.bgImage || s.bgVideo);

        // Фон страницы: пользовательские фото/видео-обои либо базовый градиент
        // пресета — та же формула, что body::before на funpay.com.
        const baseBg = `radial-gradient(120% 90% at 50% -20%, ${rgba(accentHex, .06)}, transparent 55%), linear-gradient(180deg, ${preset.base[0]}, ${preset.base[1]})`;
        const bgImageUrl = s.bgVideo
            ? 'linear-gradient(rgba(0,0,0,.32), rgba(0,0,0,.32))'
            : (s.bgImage ? `url(${s.bgImage})` : baseBg);

        // Поверх обоев панели полупрозрачные (pA), на чистом пресете — плотные.
        const card = hasCustomBg ? pal.pA : pal.p2;
        const wallScrim = isLight
            ? 'linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.30))'
            : 'linear-gradient(180deg, rgba(18,19,23,.42), rgba(18,19,23,.72))';

        const rainbowBlock = rainbow ? `
        @property --fpt-hue { syntax: '<number>'; inherits: true; initial-value: 252; }
        :root { animation: fpt-hue-cycle 8s linear infinite; }
        @keyframes fpt-hue-cycle { to { --fpt-hue: 612; } }
        ` : '';

        return `
        ${rainbowBlock}
        /* ── Палитра пресета: те же переменные, что движок тем на funpay.com ── */
        :root {
            --fpt-pA: ${pal.pA}; --fpt-p1: ${pal.p1}; --fpt-p2: ${pal.p2}; --fpt-p3: ${pal.p3};
            --fpt-pTx: ${pal.pTx}; --fpt-pTxDim: ${pal.pTxDim}; --fpt-pTxFaint: ${pal.pTxFaint};
            --fpt-pLine: ${pal.pLine}; --fpt-pInput: ${pal.pInput}; --fpt-pHeader: ${pal.pHeader};
            --fpt-pShadow: ${pal.pShadow}; --fpt-pLogoFilter: ${pal.pLogoFilter};
            --fpt-uacc: ${accent}; --fpt-uacc-strong: ${rainbow ? accentHover : shade(accentHex, isLight ? -35 : 0)};
            --fpt-uacc-soft: ${accentSoft}; --fpt-uacc-line: ${rainbow ? 'hsl(var(--fpt-hue) 60% 60% / .32)' : rgba(accentHex, .32)};
            --fpt-wallBase: ${preset.base[1]};
            --fpt-wallScrim: ${wallScrim};
        }

        /* ── Обои ── */
        html, body { background: transparent !important; }
        body::before {
            content: ''; position: fixed; inset: 0; width: 100vw; height: 100vh;
            background: ${bgImageUrl} no-repeat center center fixed; background-size: cover;
            filter: blur(${s.bgBlur || 0}px) brightness(${s.bgBrightness || 100}%);
            z-index: -2; transform: translateZ(0);
        }
        ${WALLPAPER_CSS}

        /* ── ГЛАВНОЕ: переменные Bootstrap из палитры пресета ──
           Так перекрашивается ВСЁ разом, а обводки берут цвет из
           --bs-border-color. color-scheme следует схеме пресета. */
        :root, [data-bs-theme=light], [data-bs-theme=dark], html[data-bs-theme=dark] {
            --bs-body-color: ${pal.pTx};
            --bs-body-color-rgb: ${toRgb(pal.pTx)};
            --bs-body-bg: ${pal.p1};
            --bs-body-bg-rgb: ${toRgb(pal.p1)};
            --bs-emphasis-color: ${pal.pTx};
            --bs-emphasis-color-rgb: ${toRgb(pal.pTx)};
            --bs-secondary-color: ${pal.pTxDim};
            --bs-secondary-color-rgb: ${toRgb(pal.pTxDim)};
            --bs-secondary-bg: ${pal.p2};
            --bs-secondary-bg-rgb: ${toRgb(pal.p2)};
            --bs-tertiary-color: ${pal.pTxFaint};
            --bs-tertiary-color-rgb: ${toRgb(pal.pTxFaint)};
            --bs-tertiary-bg: ${pal.p3};
            --bs-tertiary-bg-rgb: ${toRgb(pal.p3)};
            --bs-heading-color: ${pal.pTx};

            --bs-link-color: ${link};
            --bs-link-color-rgb: ${toRgb(linkHex)};
            --bs-link-hover-color: ${linkHover};
            --bs-link-hover-color-rgb: ${toRgb(linkHex)};

            --bs-primary: ${accent};
            --bs-primary-rgb: ${toRgb(accentHex)};
            --bs-primary-text-emphasis: ${shade(accentHex, isLight ? -60 : 60)};
            --bs-primary-bg-subtle: ${accentSoft};
            --bs-primary-border-subtle: ${rgba(accentHex, .30)};

            --bs-border-color: ${pal.pLine};
            --bs-border-color-translucent: ${pal.pLine};
            --bs-border-radius: ${rr};
            --bs-border-radius-sm: ${Math.max(4, (s.borderRadius ?? 8) - 2)}px;
            --bs-border-radius-lg: ${(s.borderRadius ?? 8) + 4}px;

            --bs-box-shadow: 0 .5rem 1.5rem ${pal.pShadow};
            --bs-box-shadow-sm: 0 .25rem .5rem ${pal.pShadow};
            color-scheme: ${scheme};
        }

        body {
            font-family: '${s.font || 'Helvetica Neue'}', 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
            color: ${pal.pTx};
        }

        /* ── Навбар: непрозрачная шапка пресета, как #header на funpay.com ── */
        .navbar.navbar-dark, nav.navbar { background: ${hasCustomBg ? pal.pA : pal.pHeader} !important; backdrop-filter: blur(8px); }
        .navbar .nav-link, .navbar .navbar-brand, .navbar span { color: ${pal.pTx} !important; }
        .navbar .nav-link.active { color: ${accent} !important; }
        .navbar .logo-image > path { fill: ${pal.pTx} !important; }
        .navbar .btn-light, .nav-button.btn-light {
            --bs-btn-bg: ${accent}; --bs-btn-border-color: ${accent}; --bs-btn-color: #fff;
            --bs-btn-hover-bg: ${accentHover}; --bs-btn-hover-border-color: ${accentHover}; --bs-btn-hover-color: #fff;
        }

        /* ── Карточки / панели ── */
        .ticket-card { background: ${card} !important; box-shadow: 0 .5rem 1.5rem ${pal.pShadow} !important; outline: none !important; }
        .ticket-info-panel, .ticket-search-panel { background: ${hasCustomBg ? pal.pA : pal.p2} !important; }
        .comment-form-wrapper { background: transparent !important; }

        /* ── Комментарии тикета ── */
        .comment-body, .bg-light-subtle { background: ${pal.p3} !important; }
        .bg-primary-subtle { background: ${rgba(linkHex, .15)} !important; }
        .comment-username .username { color: ${accent} !important; }
        blockquote { border-left: .25em solid ${accent} !important; }

        /* ── Summernote редактор ── */
        .note-editor.note-frame { background: ${pal.p2} !important; border-color: ${pal.pLine} !important; }
        .note-toolbar.card-header { background: ${pal.p3} !important; }
        .note-editing-area, .note-editable, .note-codable { background: ${pal.pInput} !important; color: ${pal.pTx} !important; }
        .note-btn { --bs-btn-bg: ${pal.p3}; --bs-btn-color: ${pal.pTx}; }

        /* ── Вложения ── */
        .attachment-item > * { border-color: ${pal.pLine} !important; }

        /* ── Алерты: мягкие, статусные тона семантические (обе схемы) ── */
        .alert {
            background: ${pal.p2} !important;
            color: ${pal.pTx} !important;
            border: 1px solid ${pal.pLine} !important;
            border-radius: ${rr} !important;
        }
        .alert-secondary { background: ${pal.p2} !important; }
        .alert-warning { background: ${rgba('#f5a623', .12)} !important; border-color: ${rgba('#f5a623', .3)} !important; }
        .alert-danger  { background: ${rgba('#dd4b39', .12)} !important; border-color: ${rgba('#dd4b39', .3)} !important; }
        .alert-info    { background: ${rgba(linkHex, .12)} !important; border-color: ${rgba(linkHex, .3)} !important; }
        .alert .alert-icon, .alert i, .alert svg { fill: ${pal.pTxDim} !important; color: ${pal.pTxDim} !important; }

        /* ── Бейджи статусов: на светлой схеме белый текст на янтарном ~2:1 —
           мягкий фон + тёмно-янтарный текст, в тон .alert-warning; на тёмных
           схемах нативный белый на янтарном читается нормально ── */
        ${isLight ? `.badge.bg-warning, .badge.text-bg-warning {
            background: ${rgba('#f5a623', .18)} !important;
            color: #5b3a00 !important;
        }` : ''}

        /* ── Кнопка закрытия модалки: инверсия только на тёмной схеме ── */
        ${isLight ? '' : '.btn-close { filter: invert(1) grayscale(1) brightness(1.6); }'}

        /* ── Тултипы ── */
        .tooltip { --bs-tooltip-bg: ${pal.p3}; --bs-tooltip-color: ${pal.pTx}; }
        .tooltip .tooltip-inner { border-color: ${pal.pLine}; }

        /* ── Скроллбар ── */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${isLight ? '#c3c8d2' : pal.p3}; border-radius: 8px; }
        `;
    }

    function ensureStyle() {
        let el = document.getElementById(STYLE_ID);
        if (!el) {
            el = document.createElement('style');
            el.id = STYLE_ID;
            (document.head || document.documentElement).appendChild(el);
        }
        return el;
    }

    function applyLayers(s) {
        // Слои обоев требуют document.body; на document_start его ещё нет —
        // повторный apply() на DOMContentLoaded доделает.
        if (!document.body) return;
        if (typeof window.fptApplyWallpaperLayer === 'function')
            window.fptApplyWallpaperLayer((s.bgImage || s.bgVideo) ? 'none' : s.wallpaper);
        if (typeof window.fptApplyBgVideo === 'function')
            window.fptApplyBgVideo(s.bgVideo || null);
    }

    async function apply() {
        let data = {};
        try { data = await chrome.storage.local.get(['enableCustomTheme', 'fpToolsTheme']); }
        catch { return; }

        // Палитры из theme_core.js (в манифесте идёт первым). Если ядро не
        // загрузилось — оставляем сайт нетронутым, не красим легаси-цветами.
        if (typeof FPT_SITE_PRESETS === 'undefined') return;

        const styleEl = ensureStyle();
        if (data.enableCustomTheme === false) {
            styleEl.textContent = '';
            const f = document.getElementById(FONT_ID);
            if (f) f.textContent = '';
            delete document.documentElement.dataset.fptPreset;
            const wall = document.getElementById('fpt-wallpaper-layer');
            if (wall) wall.remove();
            const vid = document.getElementById('fpt-bg-video');
            if (vid) vid.remove();
            return;
        }

        const s = (typeof fptNormalizeToPreset === 'function')
            ? fptNormalizeToPreset({ ...(data.fpToolsTheme || {}) })
            : { ...(data.fpToolsTheme || {}) };
        const presetId = FPT_SITE_PRESETS[s.sitePreset] ? s.sitePreset : 'graphite';
        const preset = FPT_SITE_PRESETS[presetId];

        document.documentElement.dataset.fptPreset = presetId;
        manageFont(s.font || 'Helvetica Neue');
        styleEl.textContent = buildCss(s, preset);
        applyLayers(s);
    }

    apply();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', apply);
    }
    if (chrome?.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== 'local') return;
            if (changes.fpToolsTheme || changes.enableCustomTheme) apply();
        });
    }
})();
