// content/theme_core.js — ядро темизации (document_start).
// Палитры пресетов, генератор CSS, обои и видео-слой. Загружается ПЕРВЫМ,
// чтобы theme_flash_fix мгновенно применял ФИНАЛЬНЫЙ дизайн без «лесенки»
// (раньше у flash_fix был устаревший дубликат генератора — шапка и цвета
// мигали старыми, пока theme.js не перекрашивал на document_idle).
// theme.js (document_idle) использует эти же глобалы — один источник правды.

const GOOGLE_FONTS = ['Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Source Sans Pro'];
const DEFAULT_THEME = {
    bgColor1: '#5b86d8',
    bgColor2: '#8fb0e8',
    containerBgColor: '#191b20',
    containerBgOpacity: 1,
    textColor: '#f4f7fb',
    linkColor: '#5b86d8',
    bgImage: null,
    wallpaper: 'none',
    font: 'Helvetica Neue',
    bgBlur: 0,
    bgBrightness: 100,
    borderRadius: 8,
    enableCircleCustomization: false,
    showCircles: true,
    circleSize: 100,
    circleOpacity: 100,
    circleBlur: 0,
    enableImprovedSeparators: false,
    headerPosition: 'top',
    enableGlassmorphism: false,
    glassmorphismBlur: 10,
    enableCustomScrollbar: false,
    scrollbarThumbColor: '#555555',
    scrollbarTrackColor: '#222222',
    scrollbarWidth: 8,
    // Прозрачное меню FunPay Tools
    menuTransparent: false,
    menuTintColor: '#2a1033',   // тёмно-пурпурный
    menuOpacity: 3,             // %
    menuBlurEnabled: true,
    menuBlur: 8,                // px
    // Контур тексту
    textOutlineEnabled: false,
    textOutlineColor: '#000000',
    textOutlineWidth: 1,        // px
    // Редизайн-пресеты (funpay-redesign)
    sitePreset: 'graphite',     // graphite | obsidian | slate | light
    accentMode: 'static',       // static | rainbow
    bgVideo: null               // dataURL видео-обоев
};

// Пресеты тем сайта. Движок целиком на CSS-переменных (--fpt-p*),
// поэтому каждый пресет — включая «Светлую» — это просто палитра.
// pal: pA крупная полупрозрачная подложка · p1..p3 поверхности по возрастанию ·
// pTx/-Dim/-Faint текст · pLine линии · pInput поля · pHeader шапка (непрозрачная!) ·
// pVeil вуаль контента · pBadge бейджи · pShadow тень · pLogoFilter инверсия логотипа.
const FPT_SITE_PRESETS = {
    graphite: {
        containerBgColor: '#1d2028', textColor: '#f1f3f7', base: ['#15171c', '#121317'],
        pal: { pA: 'rgba(13,15,19,.62)', p1: '#16181d', p2: '#1d2026', p3: '#262a32',
               pTx: '#f1f3f7', pTxDim: '#c6cbd4', pTxFaint: '#8b92a0', pLine: 'rgba(255,255,255,.10)',
               pInput: '#101216', pHeader: '#191b20', pVeil: 'rgba(10,12,16,.45)',
               pBadge: 'rgba(13,15,19,.55)', pShadow: 'rgba(0,0,0,.5)', pLogoFilter: 'brightness(0) invert(1)' },
        scheme: 'dark'
    },
    obsidian: {
        containerBgColor: '#15161b', textColor: '#f2f3f7', base: ['#0d0e12', '#08090c'],
        pal: { pA: 'rgba(5,6,9,.66)', p1: '#0f1014', p2: '#15171c', p3: '#1e2027',
               pTx: '#f2f3f7', pTxDim: '#c4c8d2', pTxFaint: '#83899a', pLine: 'rgba(255,255,255,.09)',
               pInput: '#0a0b0e', pHeader: '#101116', pVeil: 'rgba(4,5,8,.5)',
               pBadge: 'rgba(5,6,9,.6)', pShadow: 'rgba(0,0,0,.6)', pLogoFilter: 'brightness(0) invert(1)' },
        scheme: 'dark'
    },
    slate: {
        containerBgColor: '#2b3650', textColor: '#f2f5fa', base: ['#26304a', '#1d2434'],
        pal: { pA: 'rgba(30,38,58,.62)', p1: '#242e44', p2: '#2b3650', p3: '#36425f',
               pTx: '#f2f5fa', pTxDim: '#cbd4e4', pTxFaint: '#93a0ba', pLine: 'rgba(255,255,255,.12)',
               pInput: '#20283c', pHeader: '#283450', pVeil: 'rgba(22,28,44,.45)',
               pBadge: 'rgba(30,38,58,.55)', pShadow: 'rgba(0,0,0,.5)', pLogoFilter: 'brightness(0) invert(1)' },
        scheme: 'dark'
    },
    light: {
        containerBgColor: '#ffffff', textColor: '#272b33', base: ['#eef0f3', '#e7e9ed'],
        pal: { pA: 'rgba(255,255,255,.82)', p1: '#ffffff', p2: '#f2f3f6', p3: '#e8eaef',
               pTx: '#272b33', pTxDim: '#535a66', pTxFaint: '#7e8593', pLine: 'rgba(20,25,35,.12)',
               pInput: '#ffffff', pHeader: '#ffffff', pVeil: 'rgba(255,255,255,.55)',
               pBadge: 'rgba(20,25,35,.07)', pShadow: 'rgba(40,50,70,.18)', pLogoFilter: 'none' },
        scheme: 'light'
    }
};

// Быстрые акценты (кружочки из референса).
const FPT_ACCENT_PRESETS = ['#5b86d8', '#3f9e7c', '#8b7fd0', '#c2703d', '#6b7280'];

// Нормализация устаревших полей под текущий пресет. containerBgColor/textColor
// могли остаться от прошлой темы, если sitePreset выставлен мимо кнопки
// (импорт настроек, прямая запись в storage): тёмные карточки на светлой теме
// и белые заголовки. Если хранимое значение — «пресетное» (из любого пресета,
// включая прежние ревизии палитр), приводим его к текущему пресету; уникальный
// пользовательский цвет из тонкой настройки не трогаем.
const FPT_KNOWN_PRESET_CONTAINERS = ['#1d2028', '#15161b', '#27303f', '#2b3650', '#ffffff', '#1c1f26', '#26303f', '#15171c', '#191b20'];
const FPT_KNOWN_PRESET_TEXTS = ['#f1f3f7', '#f2f3f7', '#f2f5fa', '#272b33', '#f4f7fb', '#f6f7fa', '#eef2f8', '#2a2d35'];
function fptNormalizeToPreset(settings) {
    const preset = FPT_SITE_PRESETS[settings.sitePreset] || FPT_SITE_PRESETS.graphite;
    const low = (v) => String(v || '').toLowerCase();
    if (FPT_KNOWN_PRESET_CONTAINERS.includes(low(settings.containerBgColor)))
        settings.containerBgColor = preset.containerBgColor;
    if (FPT_KNOWN_PRESET_TEXTS.includes(low(settings.textColor)))
        settings.textColor = preset.textColor;
    return settings;
}

// Осветление hex к белому (для пары bgColor2 к выбранному акценту).
function fptLightenHex(hex, k) {
    const n = (h) => parseInt(h, 16);
    let r, g, b;
    if (hex.length === 4) { r = n(hex[1] + hex[1]); g = n(hex[2] + hex[2]); b = n(hex[3] + hex[3]); }
    else { r = n(hex.slice(1, 3)); g = n(hex.slice(3, 5)); b = n(hex.slice(5, 7)); }
    const mix = (c) => Math.round(c + (255 - c) * k);
    return '#' + [mix(r), mix(g), mix(b)].map(c => c.toString(16).padStart(2, '0')).join('');
}

function hexToRgba(hex, alpha) {
    let r = 0, g = 0, b = 0;
    if (hex.length == 4) {
        r = "0x" + hex[1] + hex[1];
        g = "0x" + hex[2] + hex[2];
        b = "0x" + hex[3] + hex[3];
    } else if (hex.length == 7) {
        r = "0x" + hex[1] + hex[2];
        g = "0x" + hex[3] + hex[4];
        b = "0x" + hex[5] + hex[6];
    }
    return `rgba(${+r},${+g},${+b},${alpha})`;
}

function manageFontImports(settings) {
    const fontStyleId = 'fp-tools-google-fonts';
    let styleEl = document.getElementById(fontStyleId);
    const font = settings.font;
    const isGoogleFont = GOOGLE_FONTS.includes(font);
    const newContent = isGoogleFont ? `@import url('https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@400;700&display=swap');` : '';

    if (!styleEl) {
        // ВАЖНО: ядро работает и на document_start — head может ещё не существовать,
        // а хелпер createElement() из utils.js здесь недоступен.
        styleEl = document.createElement('style');
        styleEl.id = fontStyleId;
        (document.head || document.documentElement).appendChild(styleEl);
    }

    if (styleEl.textContent !== newContent) {
        styleEl.textContent = newContent;
    }
}

function getCustomThemeCss(settings) {
    const preset = FPT_SITE_PRESETS[settings.sitePreset] || FPT_SITE_PRESETS.graphite;
    const baseBg = `radial-gradient(120% 90% at 50% -20%, var(--fpt-c1-a06), transparent 55%), linear-gradient(180deg, ${preset.base[0]}, ${preset.base[1]})`;
    // Видео-обои рисуются отдельным <video>-слоем; body::before оставляем лёгкой затемняющей вуалью.
    const bgImageUrl = settings.bgVideo
        ? 'linear-gradient(rgba(0,0,0,.32), rgba(0,0,0,.32))'
        : (settings.bgImage ? `url(${settings.bgImage})` : baseBg);
    const containerBgRgba = hexToRgba(settings.containerBgColor, settings.containerBgOpacity);

    let baseCss = `
        body::before {
            content: ''; position: fixed; left: 0; top: 0; width: 100vw; height: 100vh;
            background: ${bgImageUrl} no-repeat center center fixed;
            background-size: cover;
            filter: blur(${settings.bgBlur}px) brightness(${settings.bgBrightness}%);
            z-index: -2; /* под слоем обоев (.fpt-wallbg, z:-1) */
            will-change: transform; /* Оптимизация для скролла */
            transform: translateZ(0); /* Форсируем GPU-слой */
        }
        .wrapper-content, .wrapper-footer, body, .wrapper, .content-orders, .bg-light-color #header, .bg-light-color #footer, .wrapper-footer { background: transparent !important; }
        .wrapper-content, .wrapper-footer { background-color: var(--fpt-pVeil) !important; }
        body { font-family: '${settings.font}', Helvetica Neue, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.428571429; color: #TEXT_COLOR# }
        .profile-cover-img { background-clip: border-box; background: url(https://funpay.com/img/layout/profile-header.jpg) no-repeat center bottom; background-size: 100% auto } .profile-cover { overflow: unset } .media-user-name { color: #TEXT_COLOR# } .media-user-name a { color: var(--fpt-pTx) } .bg-light-color { background-color: #fff0 } #header, .bg-light-color #header, #header .navbar-default { background: var(--fpt-pHeader) !important; border: 0 !important; box-shadow: none !important; } .game-title a { color: #ACCENT_COLOR#; text-decoration: none } .navbar-right.logged .dropdown-menu { border-radius: 8px } .user-link-name { color: #ACCENT_COLOR# } .product-page .page-content { background-color: var(--fpt-pA); border-radius: 10px; margin-top: 12px; margin-bottom: 20px; padding: 20px } .chat-btn-image { background-color: #ff6d1500; border: 0px; color: var(--fpt-pTx) } .chat-btn-image:hover { background-color: transparent; border: 0px; color: var(--fpt-pTx) } .chat-btn-image:focus { background-color: transparent; border: 0px; color: var(--fpt-pTx) } .btn-default:active:hover, .btn-default:active:focus, .btn-default:active.focus, .btn-default.active:hover, .btn-default.active:focus, .btn-default.active.focus { color: var(--fpt-pTx); background-color: #ff6d1500; border: 0px } .fa-info-circle:before { filter: var(--fpt-pLogoFilter) } .chat-form-input .form-group { transform: translate(-10px); width: 103% } .tc.table-hover .tc-item.transaction-status-waiting { background-color: #b17f2e94 } .tc.table-hover .tc-item.transaction-status-waiting:hover { background-color: #b37f2abf } .tc-finance .tc-header>div, .tc-finance .tc-item>div { border-bottom: var(--fpt-pLine) 1px solid; border-top: var(--fpt-pLine) 0px solid } .tc.table-hover .tc-item.info { background-color: #1f508994 } .tc.table-hover .tc-item.info:hover { background-color: #1f5089bf } .tc.table-hover .tc-item:hover { background-color: ${containerBgRgba} } .navbar-default .navbar-nav>.active>a, .navbar-default .navbar-nav>.active>a:hover, .navbar-default .navbar-nav>.active>a:focus { color: #LINK_COLOR#; font-weight: 700; background-color: #0000 } .counter-list .counter-item { background: var(--fpt-pA); border: 0px solid #feff00; border-radius: 20px; outline: 0 } .content-with-cd-wide { background: ${containerBgRgba}; border-radius: 10px } a.tc-item { color: #TEXT_COLOR#; text-decoration: none } .cd { position: relative; z-index: 100; border-radius: 50%; width: 700px; height: 700px; filter: brightness(.8); border: 0px } a.cd-satellite { transform: translate(-25px) } .offer { background: ${containerBgRgba}; padding: 20px; border-radius: 10px } .tc { background-color: ${containerBgRgba}; border-radius: 10px } .tc-finance { border-top: 0px solid var(--fpt-pLine); border-bottom: var(--fpt-pLine) 0px solid; border-left: var(--fpt-pLine) 0px solid; border-right: var(--fpt-pLine) 0px solid; border-radius: 10px } .modal-content { background-color: ${containerBgRgba}; border: 0px solid #999; border-radius: 10px; -webkit-box-shadow: 0 3px 9px rgba(0, 0, 0, .5); box-shadow: 0 3px 9px var(--fpt-pShadow); background-clip: padding-box; outline: 0 } label.control-label { color: #ffba4cc4 } .counter-item { background: var(--fpt-pA); color: #TEXT_COLOR# } .counter-item:hover, .counter-item:focus, .counter-item:active, .counter-item:active:hover { background: var(--fpt-pA); color: #TEXT_COLOR# } .counter-item.active { background: ${containerBgRgba}; color: var(--fpt-pTx) } .counter-item.active:hover, .counter-item.active:focus, .counter-item.active:active, .counter-item.active:active:hover { background: var(--fpt-p2); color: var(--fpt-pTx) } .counter-list .counter-item.active { background: ${containerBgRgba}; color: #TEXT_COLOR# } .counter-list .counter-item.active:hover { background: var(--fpt-p2); color: #TEXT_COLOR# } .form-control-box { background: transparent; border: 1px solid #fff; border-radius: 10px } h5, .h5, .form-group>label { color: var(--fpt-pTx) } .bootstrap-select .dropdown-menu.inner { background-color: var(--fpt-p1) } .lot-field .lot-field-radio-box button { background-color: var(--fpt-p2); color: var(--fpt-pTxDim) } .lot-field .lot-field-radio-box button:hover { color: var(--fpt-pTx); background-color: var(--fpt-p2) } .btn-dark { background-color: var(--fpt-p2); color: var(--fpt-pTx); border-radius: 10px; border-color: var(--fpt-pLine) } .btn-dark:hover { background-color: var(--fpt-p3); color: var(--fpt-pTx) } .btn-gray:hover { background-color: #2a5590; color: #fff; border-radius: 10px; border-color: #2a5590 } .chat-promo { border-radius: 10px; border: 0px; background: var(--fpt-pA); transform: translate(-10px) } .dropdown-menu { background-color: var(--fpt-p1); border-radius: 8px } .navbar-default { border-color: var(--fpt-pLine) } .chat-form-btn .btn-round { background-color: #cbcbcb1f; color: var(--fpt-pTx); border-radius: 100px; border: 0px } .chat-form-btn .btn-round:hover { background-color: #3466a1; color: var(--fpt-pTx) } .chat-img { border-radius: 8px } .btn-danger { border: 0px; border-radius: 8px } .btn-gray { background-color: #3466a1; border-radius: 8px; color: #fff; border: 0px } .btn-primary { border: 0px solid #fff; border-radius: 8px; background-color: #PRIMARY_COLOR#; color: var(--fpt-pTx) } .btn-primary:hover, .btn-primary:focus, .btn-primary:active, .btn-primary:active:hover, .btn-primary:active:focus, .btn-primary[disabled]:hover, .btn-primary[disabled]:focus, .btn-primary[disabled]:active, .btn-primary[disabled]:active:hover, .btn-primary[disabled]:active:focus { background-color: #1a3d6e; color: var(--fpt-pTx) } .btn-default { border: 0px solid #fff; border-radius: 8px; background-color: #PRIMARY_COLOR#60; color: var(--fpt-pTx) } .btn-default:hover, .btn-default:focus, .btn-default:active, .btn-default:active:hover, .btn-default:active:focus, .btn-default[disabled]:hover, .btn-default[disabled]:focus, .btn-default[disabled]:active, .btn-default[disabled]:active:hover, .btn-default[disabled]:active:focus { border: 0px solid #1e4f8700; background-color: #PRIMARY_COLOR#; color: var(--fpt-pTx) } .bg-light-style .btn-default { background-color: transparent; border: 0px; color: var(--fpt-pTx) } .block-info { color: var(--fpt-pTxDim) } .navbar-form .form-control { background-color: transparent } .logo-color, .footer-block-als { filter: var(--fpt-pLogoFilter) } .nav-abc ul .active a, .nav-abc ul .active a:hover, .nav-abc ul .active a:focus { text-decoration: none; cursor: default; color: #ACCENT_COLOR# } .nav-abc .nav>li>a:hover, .nav-abc .nav>li>a:focus { text-decoration: none; cursor: default; color: #ACCENT_COLOR# } a:focus { text-decoration: none; cursor: default; color: var(--fpt-pTx) } .list-inline>li:after { content: " ·"; color: var(--fpt-pTxFaint) } .media-user.style-circle .avatar-photo:after { background: #a6a6a6; border: 3px solid ${containerBgRgba} } .counter-list-wide { padding-bottom: 20px; padding-top: 20px } .dropdown-menu>li+li, .dropdown-menu .dropdown-menu>li { border-top: var(--fpt-pLine) 1px solid; border: 0px } .dropdown-menu>li:first-child>a { border-radius: 8px 8px 0 0 } .dropdown-menu>li:last-child>a { border-radius: 0 0 8px 8px } .navbar-nav>li>.dropdown-menu, .dropdown-menu, .nav-tabs .dropdown-menu { border-radius: 8px } .navbar-default .navbar-nav>li>a { color: var(--fpt-pTxDim) } .navbar-default .navbar-nav>li>a:hover, .navbar-default .navbar-nav>li>a:focus { color: var(--fpt-pTx) } .ajax-alert { border-radius: 10px } .navbar-default { background-color: transparent } .offer-tc-container { border-top: #ff0000 0px solid } .tc:not(.tc-selling):not(.tc-finance) .tc-item>div { border-top: var(--fpt-pLine) 1px solid } .review-container { border-top: var(--fpt-pLine) 1px solid } a:hover { color: #ACCENT_COLOR#; text-decoration: underline; } a.tc-item:hover, a.tc-item:hover div, a.tc-item:hover .tc-desc-text, a.tc-item:hover .tc-server { color: #TEXT_COLOR#; text-decoration: none; } .panel { background-color: var(--fpt-p2) } .contact-item:hover { background: #4040956b } a { color: #LINK_COLOR#; text-decoration: none } .panel-default>.panel-heading { background-color: var(--fpt-p2); border-color: var(--fpt-pLine) } .tc.table-hover .tc-item.warning { background-color: #b17f2e94 } .tc.table-hover .tc-item.warning:hover { background-color: #b37f2abf } .tc.table-hover .tc-item { background-color: ${containerBgRgba} } .tc.table-hover a.tc-item:hover { background-color: var(--fpt-p2) } .chat-not-selected .chat-message-container { border-top: 0px solid #fff } .chat-not-selected .chat-message-container { border-bottom: 0px solid #fff } .chat-message-container { border-left: 0px solid #fff; border-right: 0px solid #fff } .dropdown-menu>li>a:hover, .dropdown-menu>li>a:focus { color: var(--fpt-pTx); background-color: var(--fpt-p2) } .navbar-nav>li>.dropdown-menu>.active>a { background: #LINK_COLOR#85; color: var(--fpt-pTx) } .navbar-nav>li>.dropdown-menu>.active>a:hover { background: #LINK_COLOR#b5 } .navbar-default .navbar-nav>.open>a, .navbar-default .navbar-nav>.open>a:hover, .navbar-default .navbar-nav>.open>a:focus { color: #LINK_COLOR# } .btn-default:active, .btn-default.active, .open>.btn-default.dropdown-toggle { color: #4384d0; background-color: #ff6c1130; border-color: red } .contact-item-message { color: var(--fpt-pTxFaint) } .contact-item.active { background: #6f6dff90; color: var(--fpt-pTxDim) } .contact-item.active:hover, .contact-item.active:focus { background: #6f6dffb5 } .contact-item.unread { background: #ff9d00a1 } .contact-item.unread, .contact-item.unread .contact-item-message { color: var(--fpt-pTxDim) } .chat-form { border: #8924b100 0px solid } .chat-form-input .form-control, .chat-form-input .hiddendiv { padding: 11px 10px 10px; background-color: ${containerBgRgba}; border-radius: 10px } .badge { display: inline-block; min-width: 20px; padding: 3px 5px 5px; font-size: 12px; font-weight: 500; color: var(--fpt-pTx); line-height: 12px; vertical-align: middle; white-space: nowrap; text-align: center; background-color: var(--fpt-pBadge); border-radius: 10px } .navbar-right.logged>li>a>.badge { background-color: var(--fpt-uacc); color: #ffffff } .payment-card { background: var(--fpt-pA); padding: 20px; border-radius: 10px; margin: 12px 0 } .form-control { border: 0px solid #fff; background-color: var(--fpt-pInput); color: #TEXT_COLOR#; border-radius: 10px } .panel-default>.panel-heading { color: var(--fpt-pTxDim) } .review-item-answer { display: inline-block; padding: 15px; background: var(--fpt-p1); border-radius: 10px; position: relative; color: var(--fpt-pTx) } .setting-item .btn-gray { background-color: #LINK_COLOR#; color: #fff; border-radius: 8px } .setting-item .btn-gray:hover, .setting-item .btn-gray:focus, .setting-item .btn-gray:active { background-color: #244f81; color: #fff } p { color: var(--fpt-pTxDim) } .btn-success { border-radius: 8px; border: 0px } .drop-area { background-color: var(--fpt-p2); border-radius: 8px; color: var(--fpt-pTxDim); border: 1px solid var(--fpt-p1) } .drop-area.hover { background-color: var(--fpt-p3) } .drop-area.error { background: #ff3434c7; border: #f00; color: #TEXT_COLOR# } .btn-info { border-radius: 8px; background-color: #11a8d5; border: 0px; margin-right: 5px } .btn-warning { border-radius: 8px; background-color: #ffa002; border: 0px } .details, .form-narrow { background-color: var(--fpt-pA); padding: 20px; margin-bottom: 20px; border-radius: 10px } .form-narrow .btn-block, .form-narrow .form-control, .form-narrow .input-group { background-color: var(--fpt-p1); border-radius: 8px } .nav-tabs>li.active>a, .nav-tabs>li.active>a:hover, .nav-tabs>li.active>a:focus { color: var(--fpt-pTx); background-color: #0000 } .lot-fields-multilingual .nav-tabs a { color: var(--fpt-pTxDim) } table.table-clickable tbody tr a { color: #14e6a4; text-decoration: none } table.table-clickable tbody tr a:hover { color: var(--fpt-pTx); text-decoration: underline } .caret { color: var(--fpt-pTxFaint); } .sort::after { color: var(--fpt-pTxFaint) !important; } .bootstrap-select .dropdown-toggle .filter-option { background: #65a91a; height: 100%; width: 100%; border: 0px #fff solid; border-radius: 8px; color: var(--fpt-pTx) } .bootstrap-select .dropdown-toggle .filter-option:hover { background: #65a91a; border-radius: 8px } .bootstrap-select .dropdown-toggle .filter-option:focus { background: #65a91a; border-radius: 8px } .has-feedback .form-control { border-radius: 8px } .withdraw-box .slave { background-color: var(--fpt-p3); border-radius: 8px } .withdraw-box .slave:hover { background-color: var(--fpt-p3); border-radius: 8px } .input-group .form-control:first-child, .input-group-addon:first-child, .input-group-btn:first-child>.btn, .input-group-btn:first-child>.btn-group>.btn, .input-group-btn:first-child>.dropdown-toggle, .input-group-btn:last-child>.btn:not(:last-child):not(.dropdown-toggle), .input-group-btn:last-child>.btn-group:not(:last-child)>.btn { border-radius: 10px 0 0 10px } .bootstrap-select.input-lg .btn, .input-group-lg>.bootstrap-select.form-control .btn, .input-group-lg>.bootstrap-select.input-group-addon .btn, .input-group-lg>.input-group-btn>.bootstrap-select.btn .btn, .bootstrap-select.input-lg .dropdown-menu>li>a, .input-group-lg>.bootstrap-select.form-control .dropdown-menu>li>a, .input-group-lg>.bootstrap-select.input-group-addon .dropdown-menu>li>a, .input-group-lg>.input-group-btn>.bootstrap-select.btn .dropdown-menu>li>a, .input-group-lg>.input-group-btn>.bootstrap-select.btn .dropdown-menu>li>a:hover, .input-group-lg>.input-group-btn>.bootstrap-select.btn .dropdown-menu>li>a:focus { background: transparent; border-radius: 8px } :not(.input-group)>.bootstrap-select.form-control:not([class*=col-]) { background: transparent; border-radius: 8px } .btn-default.dropdown-toggle { color: var(--fpt-pTx); border: 0px; background-color: #PRIMARY_COLOR# } .btn-default.dropdown-toggle:hover, .btn-default.dropdown-toggle:focus, .btn-default.dropdown-toggle:active, .btn-default.dropdown-toggle:active:hover, .open>.btn-default.dropdown-toggle, .open>.btn-default.dropdown-toggle:hover, .open>.btn-default.dropdown-toggle:focus, .open>.btn-default.dropdown-toggle:active { color: var(--fpt-pTx); border: 0px; background-color: #1a3d6e } .form-control[disabled], .form-control[readonly], fieldset[disabled] .form-control { background-color: var(--fpt-p3) } .payment-title { color: var(--fpt-pTx); font-weight: old } .bootstrap-select .dropdown-menu>li>a { color: var(--fpt-pTxDim) } .bootstrap-select .dropdown-menu>.active>a, .bootstrap-select .dropdown-menu>.active>a:hover, .bootstrap-select .dropdown-menu>.active>a:focus { background-color: var(--fpt-p2); color: #82dd1e } .chat-header { border: #bd59be00 0px solid } .form-inline .form-control { background-color: var(--fpt-p1); border-radius: 8px } .chat-contacts, .chat-detail { background: var(--fpt-pA); border: #fff 0px solid } .chat-contacts { border-radius: 10px 0 0 10px } .chat-detail { border-radius: 0 10px 10px 0 } .chat { background: var(--fpt-pA); border-radius: 10px } .contact-item { border-bottom: #fff 0px } .chat-full-header { border-bottom: #fff 0px solid } .chat-full .chat { border-bottom: 0px solid #fff; background-color: var(--fpt-pA); border-radius: 0 } .chat { border-top: 0px solid #fff } .alert-info { background-color: #709fdc3b; border-color: #709fdc; color: var(--fpt-pTx) !important; border-radius: 8px } .alert-info, .alert-info .chat-msg-text, .alert-info .chat-msg-text * { color: var(--fpt-pTx) !important; } .alert-info a, .alert-info .chat-msg-text a { color: #LINK_COLOR# !important; } .fa-exclamation-circle:before { filter: var(--fpt-pLogoFilter) } .chat-message-list-date .inside { background-color: var(--fpt-p1); color: var(--fpt-pTx); border-radius: 8px } .custom-scroll::-webkit-scrollbar, .chat-message-list::-webkit-scrollbar, .chat-empty::-webkit-scrollbar, .chat-form-input .form-control::-webkit-scrollbar, .chat-form-input .hiddendiv::-webkit-scrollbar { background: #e600ff00; width: 5px; height: 10px } .custom-scroll::-webkit-scrollbar-thumb, .chat-message-list::-webkit-scrollbar-thumb, .chat-empty::-webkit-scrollbar-thumb, .chat-form-input .form-control::-webkit-scrollbar-thumb, .chat-form-input .hiddendiv::-webkit-scrollbar-thumb { background: var(--fpt-pLine) } .chat { border-bottom: 0px solid #90f; background: var(--fpt-pA); border-radius: 10px } .chat-form-input .form-control, .chat-form-input .hiddendiv { transform: translate(-10px) } .form-inline .form-control { background-color: var(--fpt-p2); border-radius: 10px } .theme-select { color: #d3cfc9; background-color: var(--fpt-p2); background-image: none; border-color: #383c3f; box-shadow: #00000012 0 1px 1px inset }
    `;

    // Акценты идут через CSS-переменные: мгновенная смена акцента и «радужный»
    // режим без пересборки всего CSS. Суффиксы #...#85/#...#60 — это hex-альфа,
    // их заменяем заранее на отдельные rgba-переменные.
    let themedCss = baseCss
        .replace(/#PRIMARY_COLOR#60/gi, 'var(--fpt-c1-a60)')
        .replace(/#LINK_COLOR#85/gi, 'var(--fpt-link-a85)')
        .replace(/#LINK_COLOR#b5/gi, 'var(--fpt-link-ab5)')
        .replace(/#ff6d15/gi, 'var(--fpt-c1)')
        .replace(/#PRIMARY_COLOR#/gi, 'var(--fpt-c1)')
        .replace(/#f4cf78/gi, 'var(--fpt-c2)')
        .replace(/#ACCENT_COLOR#/gi, 'var(--fpt-c2)')
        .replace(/#f0f0f0/gi, settings.textColor)
        .replace(/#TEXT_COLOR#/gi, settings.textColor)
        .replace(/#2d6bb3/gi, 'var(--fpt-link)')
        .replace(/#LINK_COLOR#/gi, 'var(--fpt-link)');

    // Палитра пресета: все поверхности/тексты/линии движка и шапка — переменные.
    const pal = preset.pal;
    const paletteBlock = `
            :root {
                --fpt-pA: ${pal.pA}; --fpt-p1: ${pal.p1}; --fpt-p2: ${pal.p2}; --fpt-p3: ${pal.p3};
                --fpt-pTx: ${pal.pTx}; --fpt-pTxDim: ${pal.pTxDim}; --fpt-pTxFaint: ${pal.pTxFaint};
                --fpt-pLine: ${pal.pLine}; --fpt-pInput: ${pal.pInput}; --fpt-pHeader: ${pal.pHeader};
                --fpt-pVeil: ${(settings.bgImage || settings.bgVideo) ? (preset.scheme === 'light' ? 'rgba(255,255,255,.14)' : 'rgba(10,12,16,.32)') : pal.pVeil}; --fpt-pBadge: ${pal.pBadge}; --fpt-pShadow: ${pal.pShadow};
                --fpt-pLogoFilter: ${pal.pLogoFilter};
                --fpt-wallBase: ${preset.base[1]};
                /* legacy-набор для сайтовых виджетов: задан мгновенно, чтобы
                   они рисовались в финальном цвете с первого кадра (раньше их
                   докрашивал отложенный пересчёт через 120–400мс) */
                --fpt-bg: ${pal.p1}; --fpt-surface: ${pal.p2}; --fpt-surface-2: ${pal.p3};
                --fpt-border: ${pal.pLine}; --fpt-hover: ${pal.p3};
                --fpt-text: ${pal.pTx}; --fpt-text-muted: ${pal.pTxDim};
                --fpt-shadow: ${pal.pShadow};
                --fpt-wallScrim: ${preset.scheme === 'light' ? 'linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.30))' : 'linear-gradient(180deg, rgba(18,19,23,.42), rgba(18,19,23,.72))'};
                color-scheme: ${preset.scheme};
            }`;

    // Пользовательский акцент — глобальные переменные, которыми красятся
    // редизайн-главная (.fpt-home) и окно FP Tools (--fpt-uacc*).
    if (settings.accentMode === 'rainbow') {
        themedCss = paletteBlock + `
            @property --fpt-hue { syntax: '<number>'; inherits: true; initial-value: 252; }
            :root {
                animation: fpt-hue-cycle 8s linear infinite;
                --fpt-c1: hsl(var(--fpt-hue) 60% 60%);
                --fpt-c2: hsl(var(--fpt-hue) 66% 74%);
                --fpt-link: hsl(var(--fpt-hue) 60% 64%);
                --fpt-c1-a60: hsl(var(--fpt-hue) 60% 60% / .38);
                --fpt-c1-a06: hsl(var(--fpt-hue) 60% 60% / .06);
                --fpt-link-a85: hsl(var(--fpt-hue) 60% 64% / .52);
                --fpt-link-ab5: hsl(var(--fpt-hue) 60% 64% / .71);
                --fpt-uacc: hsl(var(--fpt-hue) 60% 60%);
                --fpt-uacc-strong: hsl(var(--fpt-hue) 64% 52%);
                --fpt-uacc-soft: hsl(var(--fpt-hue) 60% 60% / .14);
                --fpt-uacc-line: hsl(var(--fpt-hue) 60% 60% / .32);
                --fpt-accent: hsl(var(--fpt-hue) 60% 60%);
                --fpt-accent-soft: hsl(var(--fpt-hue) 60% 60% / .16);
            }
            @keyframes fpt-hue-cycle { to { --fpt-hue: 612; } }
        ` + themedCss;
    } else {
        themedCss = paletteBlock + `
            :root {
                --fpt-c1: ${settings.bgColor1};
                --fpt-c2: ${settings.bgColor2};
                --fpt-link: ${settings.linkColor};
                --fpt-c1-a60: ${hexToRgba(settings.bgColor1, 0.38)};
                --fpt-c1-a06: ${hexToRgba(settings.bgColor1, 0.06)};
                --fpt-link-a85: ${hexToRgba(settings.linkColor, 0.52)};
                --fpt-link-ab5: ${hexToRgba(settings.linkColor, 0.71)};
                --fpt-uacc: ${settings.bgColor1};
                --fpt-uacc-strong: ${settings.bgColor1};
                --fpt-uacc-soft: ${hexToRgba(settings.bgColor1, 0.14)};
                --fpt-uacc-line: ${hexToRgba(settings.bgColor1, 0.32)};
                --fpt-accent: ${settings.bgColor1};
                --fpt-accent-soft: ${hexToRgba(settings.bgColor1, 0.16)};
            }
        ` + themedCss;
    }

    themedCss = themedCss.replace(/border-radius: \d+px/g, `border-radius: ${settings.borderRadius}px`);

    if (settings.enableCircleCustomization) {
        let circleCss = `.cd-container .cd, .corner-cd, .profile-cover-img {
            transition: transform 0.3s ease, filter 0.3s ease, opacity 0.3s ease;
            transform: scale(${settings.circleSize / 100});
            filter: blur(${settings.circleBlur}px);
            opacity: ${settings.circleOpacity / 100};
        }`;
        if (!settings.showCircles) {
            circleCss += ` .cd-container { display: none !important; }`;
        }
        themedCss += circleCss;
    }

    if (settings.enableImprovedSeparators) {
        themedCss += `
            .tc:not(.tc-selling):not(.tc-finance) .tc-item > div {
                position: relative;
                border-top: none !important;
            }
            .tc:not(.tc-selling):not(.tc-finance) .tc-item > div::before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 1px;
                background: rgba(255, 255, 255, 0.2);
                filter: blur(2px);
                pointer-events: none;
            }
        `;
    }

    if (settings.enableGlassmorphism) {
        const glassBg = hexToRgba(settings.containerBgColor, settings.containerBgOpacity);
        themedCss += `
            .offer, .tc, .modal-content, .chat-contacts, .chat-detail, .chat, .dropdown-menu, .panel, .content-with-cd-wide, .payment-card, .details, .form-narrow {
                background: ${glassBg} !important;
                backdrop-filter: blur(${settings.glassmorphismBlur}px);
                -webkit-backdrop-filter: blur(${settings.glassmorphismBlur}px);
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
            }
        `;
    }

    if (settings.enableCustomScrollbar) {
        themedCss += `
            ::-webkit-scrollbar {
                width: ${settings.scrollbarWidth}px;
            }
            ::-webkit-scrollbar-track {
                background: ${settings.scrollbarTrackColor};
            }
            ::-webkit-scrollbar-thumb {
                background: ${settings.scrollbarThumbColor};
                border-radius: ${settings.scrollbarWidth}px;
            }
            ::-webkit-scrollbar-thumb:hover {
                background: ${settings.scrollbarThumbColor}CC; 
            }
        `;
    }

    return themedCss;
}

// Generated wallpaper layer (matches funpay-redesign .fpx-wall). Applied site-wide.
const FPT_WALL_IDS = ['dunes', 'mesh', 'grid', 'cobalt', 'aurora', 'drift'];
function fptApplyWallpaperLayer(id) {
    let layer = document.getElementById('fpt-wallpaper-layer');
    const valid = FPT_WALL_IDS.includes(id);
    if (!valid) { if (layer) layer.remove(); return; }
    const host = document.body || document.documentElement;
    if (!host) return;
    if (!layer) {
        layer = document.createElement('div');
        layer.id = 'fpt-wallpaper-layer';
        host.insertBefore(layer, host.firstChild);
    }
    layer.className = 'fpt-wallbg wall-' + id;
}
if (typeof window !== 'undefined') window.fptApplyWallpaperLayer = fptApplyWallpaperLayer;

// Видео-обои: фиксированный <video>-слой под контентом (как фото-обои, но живой).
function fptApplyBgVideo(dataUrl) {
    let v = document.getElementById('fpt-bg-video');
    if (!dataUrl) { if (v) v.remove(); return; }
    if (!v) {
        v = document.createElement('video');
        v.id = 'fpt-bg-video';
        v.autoplay = true; v.muted = true; v.loop = true; v.playsInline = true;
        v.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;z-index:-3;pointer-events:none;';
        (document.body || document.documentElement).appendChild(v);
    }
    if (v.src !== dataUrl) v.src = dataUrl;
    v.play?.().catch(() => {});
}
if (typeof window !== 'undefined') window.fptApplyBgVideo = fptApplyBgVideo;
