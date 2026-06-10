/* ============================================================
   FunPay Tools — Popup 3.0
   Matches funpay-redesign reference design.
   ============================================================ */
(function () {
  'use strict';

  /* ── Icons (Lucide subset, stroke-based SVG) ──────────────────── */
  const P = {
    LayoutGrid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    Package: '<path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/>',
    ArrowUpNarrowWide: '<path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="M11 12h4"/><path d="M11 16h7"/><path d="M11 20h10"/>',
    Zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    MessageSquareText: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M13 8H7"/><path d="M17 12H7"/>',
    Reply: '<polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>',
    TerminalSquare: '<path d="m7 11 2-2-2-2"/><path d="M11 13h4"/><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>',
    UserX: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" x2="22" y1="8" y2="13"/><line x1="22" x2="17" y1="8" y2="13"/>',
    ArrowLeftRight: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
    PiggyBank: '<path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z"/><path d="M2 9v1a2 2 0 0 0 2 2h1"/><path d="M16 11h.01"/>',
    Calculator: '<rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/>',
    Palette: '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.476-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
    Users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    Settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    Search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
    X: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    Minus: '<path d="M5 12h14"/>',
    Plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    BarChart3: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    EyeOff: '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>',
    Sparkles: '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
    Bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    Pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    Upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
    Download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    Copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    ListChecks: '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
    Play: '<polygon points="5 3 19 12 5 21 5 3"/>',
    ArrowUpDown: '<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>',
    ImagePlus: '<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><line x1="16" x2="22" y1="5" y2="5"/><line x1="19" x2="19" y1="2" y2="8"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    Pipette: '<path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8Z"/>',
    ExternalLink: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/>',
    Send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    ChevronDown: '<path d="m6 9 6 6 6-6"/>',
    ChevronRight: '<path d="m9 18 6-6-6-6"/>',
    User: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    LogOut: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    Telegram: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    Star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  };

  function ic(name, size) {
    size = size || 16;
    const d = P[name] || '';
    return `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  }

  /* ── State ────────────────────────────────────────────────────── */
  const state = {
    page: 'home',
    theme: 'graphite',
    accent: '#5b86d8',
    wallpaper: 'none',
    font: 'geist',
    sound: 'Стандартный',
    vol: 100,
    // from storage
    autoBumpEnabled: false,
    autoReplies: {},
    templates: [],
    accounts: [],
    activeAccount: null,
    lotsCount: 0,
    deliveryCount: 0,
    templatesCount: 0,
    autoBumpLog: [],
  };

  /* ── Nav structure (from data.jsx) ───────────────────────────── */
  const NAV = [
    { group: 'Рабочий стол', items: [
      { id: 'home',     label: 'Обзор',          icon: 'LayoutGrid' },
      { id: 'lots',     label: 'Лоты',            icon: 'Package' },
      { id: 'autobump', label: 'Авто-поднятие',   icon: 'ArrowUpNarrowWide' },
      { id: 'delivery', label: 'Авто-выдача',     icon: 'Zap' },
    ]},
    { group: 'Чат и продажи', items: [
      { id: 'templates', label: 'Шаблоны',         icon: 'MessageSquareText' },
      { id: 'replies',   label: 'Авто-ответы',     icon: 'Reply' },
      { id: 'commands',  label: 'Слэш-команды',    icon: 'TerminalSquare' },
      { id: 'blacklist', label: 'Чёрный список',   icon: 'UserX' },
    ]},
    { group: 'Финансы', items: [
      { id: 'currency',  label: 'Валюты',          icon: 'ArrowLeftRight' },
      { id: 'piggy',     label: 'Копилки',         icon: 'PiggyBank' },
      { id: 'calc',      label: 'Калькулятор',     icon: 'Calculator' },
    ]},
    { group: 'Система', items: [
      { id: 'appearance', label: 'Оформление',     icon: 'Palette' },
      { id: 'accounts',   label: 'Аккаунты',       icon: 'Users' },
      { id: 'settings',   label: 'Настройки',      icon: 'Settings' },
    ]},
  ];

  const ALL_ITEMS = NAV.flatMap(g => g.items);

  /* ── Build nav sidebar ────────────────────────────────────────── */
  function buildNav(filter) {
    const wrap = document.getElementById('nav-groups');
    if (!wrap) return;
    wrap.innerHTML = '';

    let items = filter
      ? ALL_ITEMS.filter(i => i.label.toLowerCase().includes(filter.toLowerCase()))
      : null;

    if (items !== null) {
      const grp = document.createElement('div');
      grp.className = 'fpt-navgroup';
      if (items.length === 0) {
        grp.innerHTML = '<div class="fpt-navempty">Ничего не найдено</div>';
      } else {
        items.forEach(item => grp.appendChild(navItem(item)));
      }
      wrap.appendChild(grp);
      return;
    }

    NAV.forEach(group => {
      const grp = document.createElement('div');
      grp.className = 'fpt-navgroup';
      const lbl = document.createElement('span');
      lbl.className = 'fpt-navlabel';
      lbl.textContent = group.group;
      grp.appendChild(lbl);
      group.items.forEach(item => grp.appendChild(navItem(item)));
      wrap.appendChild(grp);
    });
  }

  function navItem(item) {
    const btn = document.createElement('button');
    btn.className = 'fpt-navitem' + (state.page === item.id ? ' is-active' : '');
    btn.innerHTML = `<span class="nic">${ic(item.icon, 16)}</span><span>${item.label}</span>`;
    btn.addEventListener('click', () => {
      const searchEl = document.getElementById('nav-search');
      if (searchEl) searchEl.value = '';
      go(item.id);
    });
    return btn;
  }

  /* ── Navigate ─────────────────────────────────────────────────── */
  function go(id) {
    state.page = id;
    buildNav();
    renderPage(id);
  }

  /* ── Render page ─────────────────────────────────────────────── */
  function renderPage(id) {
    const content = document.getElementById('fpt-content');
    if (!content) return;

    switch (id) {
      case 'home':       content.innerHTML = pageHome(); break;
      case 'lots':       content.innerHTML = pageLots(); break;
      case 'autobump':   content.innerHTML = pageAutobump(); break;
      case 'delivery':   content.innerHTML = pageDelivery(); break;
      case 'templates':  content.innerHTML = pageTemplates(); break;
      case 'replies':    content.innerHTML = pageReplies(); break;
      case 'commands':   content.innerHTML = pageCommands(); break;
      case 'blacklist':  content.innerHTML = pageBlacklist(); break;
      case 'currency':   content.innerHTML = pageCurrency(); break;
      case 'piggy':      content.innerHTML = pagePiggy(); break;
      case 'calc':       content.innerHTML = pageCalc(); break;
      case 'appearance': content.innerHTML = pageAppearance(); break;
      case 'accounts':   content.innerHTML = pageAccounts(); break;
      case 'settings':   content.innerHTML = pageSettings(); break;
      default:           content.innerHTML = pageDefault(id); break;
    }

    bindPageEvents(id);
  }

  /* ── Page: Home ──────────────────────────────────────────────── */
  function pageHome() {
    const arOn = state.autoReplies.greetingEnabled || state.autoReplies.keywordsEnabled
               || state.autoReplies.autoReviewEnabled || state.autoReplies.bonusForReviewEnabled;
    return `<div class="fpt-page">
      <div class="fpt-pagehead">
        <div>
          <div class="fpt-h2">Обзор</div>
          <div class="fpt-desc">Сводка инструментов и быстрый доступ к частым действиям.</div>
        </div>
      </div>

      <div class="fpt-grid3">
        ${metric('Активных лотов',  String(state.lotsCount))}
        ${metric('Авто-выдача',     String(state.deliveryCount))}
        ${metric('Шаблонов',        String(state.templatesCount))}
      </div>

      <div class="fpt-blocklabel">Избранное</div>
      <div class="fpt-fav">
        ${favCard('lots',     'Package',           'Лоты')}
        ${favCard('autobump', 'ArrowUpNarrowWide', 'Авто-поднятие')}
        ${favCard('templates','MessageSquareText', 'Шаблоны')}
        ${favCard('currency', 'ArrowLeftRight',    'Валюты')}
      </div>

      <div class="fpt-blocklabel">Общие переключатели</div>
      <div class="fpt-card">
        ${togRow('BarChart3',  'Статистика продаж',              '',                               'tog-stats',  true)}
        <div class="hr"></div>
        ${togRow('EyeOff',     'Скрывать баланс',                '',                               'tog-hidbal', false)}
        <div class="hr"></div>
        ${togRow('Bell',       'Авто-ответы включены',           '',                               'tog-ar',     arOn)}
        <div class="hr"></div>
        ${togRow('ArrowUpNarrowWide', 'Авто-поднятие',           '',                               'tog-bump',   state.autoBumpEnabled)}
        <div class="hr"></div>
        ${togRow('Sparkles',   'Иконки промо-лотов',             '',                               'tog-promo',  true)}
      </div>
    </div>`;
  }

  function metric(label, val) {
    return `<div class="fpt-metric">
      <span class="fpt-metric-label">${label}</span>
      <span class="fpt-metric-v mono">${val}</span>
    </div>`;
  }

  function favCard(id, iconName, label) {
    return `<button class="fpt-fav-card" data-fav="${id}">
      <span class="nic">${ic(iconName, 19)}</span>
      <span>${label}</span>
    </button>`;
  }

  function togRow(iconName, title, desc, id, on) {
    return `<div class="fpt-togrow">
      <span class="fpt-togrow-ic">${ic(iconName, 17)}</span>
      <div class="fpt-togrow-txt">
        <span class="fpt-togrow-title">${title}</span>
        ${desc ? `<span class="fpt-togrow-desc">${desc}</span>` : ''}
      </div>
      <span class="tgl" data-tgl="${id}" data-on="${on ? 'true' : 'false'}"></span>
    </div>`;
  }

  /* ── Page: Lots ──────────────────────────────────────────────── */
  function pageLots() {
    return `<div class="fpt-page">
      <div class="fpt-pagehead">
        <div>
          <div class="fpt-h2">Лоты</div>
          <div class="fpt-desc">Экспорт, импорт, массовое редактирование и клонирование лотов.</div>
        </div>
        <button class="btn btn-primary">${ic('Pencil',16)} Массово изменить</button>
      </div>
      <div class="fpt-statusbar">
        <span class="fpt-sbar-dot on"></span>
        <span>Управление лотами доступно на странице профиля FunPay.</span>
      </div>
      <div class="fpt-twocol">
        ${tile('Upload',     'Импорт из файла',       'Перенести лоты с другого аккаунта')}
        ${tile('Download',   'Экспорт в файл',        'Сохранить резервную копию всех лотов')}
        ${tile('Copy',       'Клонировать лот',       'Создать дубликат с новыми параметрами')}
        ${tile('ListChecks', 'Массовое редактирование','Название, описание, цена сразу у многих')}
      </div>
    </div>`;
  }

  function tile(iconName, title, desc) {
    return `<button class="fpt-tile">
      <span class="fpt-tile-ic">${ic(iconName, 18)}</span>
      <span class="fpt-tile-t">${title}</span>
      <span class="fpt-tile-d">${desc}</span>
    </button>`;
  }

  /* ── Page: Autobump ──────────────────────────────────────────── */
  function pageAutobump() {
    const on = state.autoBumpEnabled;
    const log = state.autoBumpLog.length > 0 ? state.autoBumpLog : [
      { cls: 'wait', t: '—' },
    ];
    const logLines = log.slice(-6).map(l =>
      `<div class="fpt-console-line ${l.cls || ''}">${l.t}</div>`
    ).join('');
    return `<div class="fpt-page">
      <div class="fpt-pagehead">
        <div>
          <div class="fpt-h2">Авто-поднятие</div>
          <div class="fpt-desc">Автоматически поднимает выбранные категории, как только истекает таймер.</div>
        </div>
        <button class="btn btn-primary">${ic('Plus',16)} Выбрать категории</button>
      </div>
      <div class="fpt-statusbar">
        <span class="fpt-sbar-dot ${on ? 'on' : ''}"></span>
        <span>${on ? 'Активно · ожидание таймера…' : 'Выключено'}</span>
        <span style="margin-left:auto">${togSmall('tog-bump-page', on)}</span>
      </div>
      <div class="fpt-blocklabel">Журнал</div>
      <div class="fpt-console">${logLines || '<div class="fpt-console-line wait">Журнал пуст</div>'}</div>
    </div>`;
  }

  function togSmall(id, on) {
    return `<span class="tgl" data-tgl="${id}" data-on="${on ? 'true' : 'false'}" style="transform:scale(0.9)"></span>`;
  }

  /* ── Page: Delivery ──────────────────────────────────────────── */
  function pageDelivery() {
    return `<div class="fpt-page">
      <div class="fpt-pagehead">
        <div>
          <div class="fpt-h2">Авто-выдача</div>
          <div class="fpt-desc">Мгновенно отправляет товар покупателю после оплаты заказа.</div>
        </div>
        <button class="btn btn-primary">${ic('Plus',16)} Новое правило</button>
      </div>
      <div class="fpt-statusbar">
        <span class="fpt-sbar-dot ${state.deliveryCount > 0 ? 'on' : ''}"></span>
        <span>${state.deliveryCount > 0 ? `Активно для ${state.deliveryCount} лотов` : 'Нет активных правил'}</span>
      </div>
      <div class="fpt-blocklabel">Инструкция</div>
      <div class="fpt-card" style="padding: 14px; font-size: 12.5px; color: var(--text-dim); line-height: 1.55;">
        Перейдите на FunPay и откройте раздел <strong style="color:var(--text)">Профиль → FP Tools → Авто-выдача</strong>
        для настройки правил автоматической выдачи товаров.
      </div>
    </div>`;
  }

  /* ── Page: Templates ─────────────────────────────────────────── */
  function pageTemplates() {
    const tpls = state.templates.length > 0 ? state.templates : [
      { name: 'Приветствие', body: 'Здравствуйте, {buyer}! Отвечу в течение пары минут.' },
      { name: 'Выдача',      body: 'Спасибо за заказ! Ваши данные: {data}' },
      { name: 'Отзыв',       body: 'Буду благодарен за отзыв — это очень помогает.' },
    ];
    const rows = tpls.map((t, i, a) => `
      <div class="fpt-tpl">
        <div class="fpt-tpl-txt">
          <span class="fpt-tpl-name">${escHtml(t.name)}</span>
          <span class="fpt-tpl-body">${escHtml(t.body)}</span>
        </div>
        <button class="btn btn-quiet btn-sm btn-icon" style="width:30px;height:30px;">${ic('Pencil',15)}</button>
      </div>
      ${i < a.length - 1 ? '<div class="hr"></div>' : ''}
    `).join('');
    return `<div class="fpt-page">
      <div class="fpt-pagehead">
        <div>
          <div class="fpt-h2">Шаблоны ответов</div>
          <div class="fpt-desc">Готовые сообщения с переменными для быстрых ответов в чате.</div>
        </div>
        <button class="btn btn-primary">${ic('Plus',16)} Новый шаблон</button>
      </div>
      <div class="fpt-card">${rows}</div>
    </div>`;
  }

  /* ── Page: Auto-replies ──────────────────────────────────────── */
  function pageReplies() {
    const ar = state.autoReplies;
    return `<div class="fpt-page">
      <div class="fpt-pagehead">
        <div>
          <div class="fpt-h2">Авто-ответы</div>
          <div class="fpt-desc">Автоматический ответ на отзывы и первое сообщение покупателя.</div>
        </div>
        <button class="btn btn-primary">${ic('Plus',16)} Новое правило</button>
      </div>
      <div class="fpt-card">
        ${togRow('MessageSquareText', 'Приветствие',         'Ответ на первое сообщение',   'tog-ar-greet',  !!ar.greetingEnabled)}
        <div class="hr"></div>
        ${togRow('Search',            'Ключевые слова',       'Автоответ по триггерам',       'tog-ar-kw',     !!ar.keywordsEnabled)}
        <div class="hr"></div>
        ${togRow('Star',              'Авто-отзыв',           'Автоматически оставлять отзыв','tog-ar-review', !!ar.autoReviewEnabled)}
        <div class="hr"></div>
        ${togRow('Sparkles',          'Бонус за отзыв',       'Отправлять бонус за отзыв',   'tog-ar-bonus',  !!ar.bonusForReviewEnabled)}
      </div>
    </div>`;
  }

  /* ── Page: Slash commands ────────────────────────────────────── */
  function pageCommands() {
    return `<div class="fpt-page">
      <div class="fpt-pagehead">
        <div>
          <div class="fpt-h2">Слэш-команды</div>
          <div class="fpt-desc">Быстрые подстановки текста в поле чата по <span class="mono" style="font-size:12px">/команде</span>.</div>
        </div>
        <button class="btn btn-primary">${ic('Plus',16)} Добавить</button>
      </div>
      <div class="fpt-statusbar">
        <span class="fpt-sbar-dot on"></span>
        <span>Команды доступны в поле сообщения на FunPay</span>
      </div>
      <div class="fpt-card" style="padding: 14px; font-size: 12.5px; color: var(--text-dim); line-height: 1.55;">
        Управление слэш-командами доступно в окне <strong style="color:var(--text)">FP Tools → Слэш-команды</strong> на сайте FunPay.
      </div>
    </div>`;
  }

  /* ── Page: Blacklist ─────────────────────────────────────────── */
  function pageBlacklist() {
    return `<div class="fpt-page">
      <div class="fpt-pagehead">
        <div>
          <div class="fpt-h2">Чёрный список</div>
          <div class="fpt-desc">Покупатели, для которых отключены отдельные действия и авто-выдача.</div>
        </div>
        <button class="btn btn-primary">${ic('Plus',16)} Добавить</button>
      </div>
      <div class="fpt-statusbar">
        <span class="fpt-sbar-dot"></span>
        <span>Список пуст</span>
      </div>
      <div class="fpt-card" style="padding: 14px; font-size: 12.5px; color: var(--text-dim); line-height: 1.55;">
        Управление чёрным списком доступно в окне <strong style="color:var(--text)">FP Tools → Чёрный список</strong> на сайте FunPay.
      </div>
    </div>`;
  }

  /* ── Page: Currency ──────────────────────────────────────────── */
  function pageCurrency() {
    return `<div class="fpt-page">
      <div class="fpt-pagehead">
        <div>
          <div class="fpt-h2">Калькулятор валют</div>
          <div class="fpt-desc">Курсы обновляются раз в день через открытый API.</div>
        </div>
      </div>
      <div class="fpt-card fpt-cur">
        <div class="fpt-cur-row">
          <input class="inp" id="cur-from-val" type="number" value="100" min="0" step="any">
          <div class="fpt-cur-sel">${ic('ChevronDown',14)} USD</div>
        </div>
        <div class="fpt-cur-mid">
          <span class="fpt-cur-swap">${ic('ArrowUpDown',16)}</span>
          <span class="fpt-cur-rate" id="cur-rate">1 USD ≈ 91.4 RUB</span>
        </div>
        <div class="fpt-cur-row">
          <input class="inp" id="cur-to-val" type="number" value="9140" readonly style="color:var(--text-faint)">
          <div class="fpt-cur-sel">${ic('ChevronDown',14)} RUB</div>
        </div>
      </div>
    </div>`;
  }

  /* ── Page: Piggy bank ────────────────────────────────────────── */
  function pagePiggy() {
    return `<div class="fpt-page">
      <div class="fpt-pagehead">
        <div>
          <div class="fpt-h2">Копилки</div>
          <div class="fpt-desc">Финансовые цели: откладывайте процент с каждой продажи.</div>
        </div>
        <button class="btn btn-primary">${ic('Plus',16)} Новая цель</button>
      </div>
      <div class="fpt-statusbar">
        <span class="fpt-sbar-dot"></span>
        <span>Нет активных копилок</span>
      </div>
      <div class="fpt-card" style="padding: 14px; font-size: 12.5px; color: var(--text-dim); line-height: 1.55;">
        Управление копилками доступно в окне <strong style="color:var(--text)">FP Tools → Копилки</strong> на сайте FunPay.
      </div>
    </div>`;
  }

  /* ── Page: Calculator ────────────────────────────────────────── */
  function pageCalc() {
    return `<div class="fpt-page">
      <div class="fpt-pagehead">
        <div>
          <div class="fpt-h2">Калькулятор</div>
          <div class="fpt-desc">Расчёт комиссии FunPay, прибыли и итоговой цены лота.</div>
        </div>
      </div>
      <div class="fpt-card" style="padding:18px; display:flex; flex-direction:column; gap:14px;">
        <label style="display:flex;flex-direction:column;gap:6px;font-size:12.5px;color:var(--text-dim);">
          Цена лота (₽)
          <input class="inp" id="calc-price" type="number" value="1000" min="0" step="any" placeholder="0">
        </label>
        <label style="display:flex;flex-direction:column;gap:6px;font-size:12.5px;color:var(--text-dim);">
          Комиссия FunPay (%)
          <input class="inp" id="calc-fee" type="number" value="7" min="0" max="100" step="0.1" placeholder="7">
        </label>
        <div class="hr"></div>
        <div class="fpt-grid3" style="gap:9px">
          ${calcResult('Выплата', 'calc-result-net')}
          ${calcResult('Комиссия', 'calc-result-fee')}
          ${calcResult('Цена + налог', 'calc-result-gross')}
        </div>
      </div>
    </div>`;
  }

  function calcResult(label, id) {
    return `<div class="fpt-metric">
      <span class="fpt-metric-label">${label}</span>
      <span class="fpt-metric-v mono" id="${id}">—</span>
    </div>`;
  }

  /* ── Page: Appearance ────────────────────────────────────────── */
  function pageAppearance() {
    const themes = [
      { id: 'graphite', label: 'Графит' },
      { id: 'obsidian', label: 'Обсидиан' },
      { id: 'slate',    label: 'Сине-серый' },
      { id: 'light',    label: 'Светлая' },
    ];
    const walls = [
      { id: 'none',   label: 'Нет' },
      { id: 'dunes',  label: 'Дюны' },
      { id: 'mesh',   label: 'Меш' },
      { id: 'grid',   label: 'Сетка' },
      { id: 'cobalt', label: 'Кобальт' },
      { id: 'aurora', label: 'Аврора', live: true },
      { id: 'drift',  label: 'Дрейф',  live: true },
    ];
    const accents = ['#5b86d8','#6b7280','#3f9e7c','#c2703d','#8b7fd0','#c45b8c'];
    const fonts = [
      { id: 'geist',   name: 'Geist',            note: 'Suisse-подобный', ff: '"Geist", system-ui, sans-serif' },
      { id: 'grotesk', name: 'Space Grotesk',     note: 'Геометрический',  ff: '"Space Grotesk", system-ui, sans-serif' },
      { id: 'mono',    name: 'Space Mono',         note: 'Industrial',      ff: '"Space Mono", monospace' },
    ];

    return `<div class="fpt-page">
      <div class="fpt-pagehead">
        <div>
          <div class="fpt-h2">Оформление</div>
          <div class="fpt-desc">Тема, обои и типографика. Применяется ко всему интерфейсу FP Tools.</div>
        </div>
      </div>

      <div class="fpt-blocklabel">Тема</div>
      <div class="fpt-themes">
        ${themes.map(t => `<button class="fpt-theme${state.theme === t.id ? ' is-active' : ''}" data-theme-pick="${t.id}">
          <span class="fpt-theme-prev" data-t="${t.id}"></span>
          <span class="fpt-theme-label">${t.label}</span>
        </button>`).join('')}
      </div>

      <div class="fpt-blocklabel">Обои</div>
      <div class="fpt-walls">
        ${walls.map(w => `<button class="fpt-wall${state.wallpaper === w.id ? ' is-active' : ''}" data-wall-pick="${w.id}">
          <span class="fpt-wall-prev wall-${w.id}"></span>
          <span class="fpt-wall-label">${w.label}${w.live ? ` <span class="fpt-live">live</span>` : ''}</span>
        </button>`).join('')}
      </div>

      <div class="fpt-upload">
        ${ic('ImagePlus', 17)}
        <span>Загрузить своё фото или видео-обои</span>
        <span class="btn btn-soft btn-sm">Выбрать файл</span>
      </div>

      <div class="fpt-blocklabel">Акцент</div>
      <div class="accentpick">
        ${accents.map(a => `<button class="accentpick-sw${state.accent === a ? ' is-active' : ''}" style="--sw:${a}" data-acc="${a}"></button>`).join('')}
        <button class="accentpick-rainbow${state.accent === 'rainbow' ? ' is-active' : ''}" data-acc="rainbow" title="Радужный перелив"></button>
      </div>

      <div class="fpt-blocklabel">Шрифт</div>
      <div class="fpt-fonts">
        ${fonts.map(f => `<button class="fpt-font${state.font === f.id ? ' is-active' : ''}" data-font-pick="${f.id}" style="font-family:${f.ff}">
          <span class="fpt-font-aa" style="font-family:${f.ff}">Aa</span>
          <span class="fpt-font-name">${f.name}</span>
          <span class="fpt-font-note">${f.note}</span>
        </button>`).join('')}
      </div>
    </div>`;
  }

  /* ── Page: Accounts ──────────────────────────────────────────── */
  function pageAccounts() {
    const accts = state.accounts.length > 0 ? state.accounts : [
      { id: '__current__', initials: 'V', name: 'Текущий аккаунт', sub: 'funpay.com', active: true },
    ];
    const rows = accts.map(a => `
      <div class="fpt-acct-card${a.active ? ' is-active' : ''}" data-acct="${a.id}">
        <div class="fpt-acct-av">${escHtml(a.initials || a.name[0] || '?')}</div>
        <div class="fpt-acct-info">
          <div class="fpt-acct-name">${escHtml(a.name)}</div>
          <div class="fpt-acct-sub">${escHtml(a.sub || '')}</div>
        </div>
        ${a.active ? '<span class="fpt-acct-badge">Активен</span>' : ''}
      </div>
    `).join('');
    return `<div class="fpt-page">
      <div class="fpt-pagehead">
        <div>
          <div class="fpt-h2">Аккаунты</div>
          <div class="fpt-desc">Быстрое переключение между сохранёнными аккаунтами FunPay.</div>
        </div>
        <button class="btn btn-primary">${ic('Plus',16)} Добавить</button>
      </div>
      <div class="fpt-acct-list">${rows}</div>
    </div>`;
  }

  /* ── Page: Settings ──────────────────────────────────────────── */
  function pageSettings() {
    const sounds = ['Стандартный','VK','Telegram','iPhone','Discord','WhatsApp'];
    return `<div class="fpt-page">
      <div class="fpt-pagehead">
        <div>
          <div class="fpt-h2">Настройки уведомлений</div>
          <div class="fpt-desc">Звук и поведение оповещений о новых сообщениях и заказах.</div>
        </div>
      </div>

      <div class="fpt-blocklabel">Звук уведомления</div>
      <div class="fpt-soundgrid">
        ${sounds.map(s => `<button class="fpt-soundchip${state.sound === s ? ' is-active' : ''}" data-sound="${s}">
          <span class="fpt-radio${state.sound === s ? ' on' : ''}"></span>
          ${escHtml(s)}
        </button>`).join('')}
      </div>

      <div class="fpt-blocklabel">Громкость</div>
      <div class="fpt-card fpt-vol">
        <input class="fpt-range" id="vol-range" type="range" min="0" max="100" value="${state.vol}" style="--p:${state.vol}%">
        <span class="fpt-vol-v" id="vol-label">${state.vol}%</span>
        <button class="btn btn-soft btn-sm btn-icon">${ic('Play',15)}</button>
      </div>

      <div class="fpt-blocklabel">Уведомления Discord</div>
      <div class="fpt-card">
        ${togRow('Bell', 'Дублировать сообщения в Discord', 'Через вебхук вашего сервера', 'tog-discord', false)}
      </div>

      <div class="fpt-blocklabel">О расширении</div>
      <div class="fpt-card" style="padding:14px;">
        <div class="row spread">
          <span style="font-size:12.5px;color:var(--text-dim)">Версия</span>
          <span class="badge badge-muted" id="settings-version">v2.8</span>
        </div>
        <div class="hr" style="margin:12px 0"></div>
        <div class="row gap-2" style="justify-content:center;">
          <a class="btn btn-quiet btn-sm" id="settings-tg" href="#">${ic('Send',14)} Telegram</a>
          <a class="btn btn-quiet btn-sm" id="settings-review" href="#">${ic('Star',14)} Оценить</a>
        </div>
      </div>
    </div>`;
  }

  function pageDefault(id) {
    return `<div class="fpt-page">
      <div class="fpt-pagehead">
        <div>
          <div class="fpt-h2">${id}</div>
          <div class="fpt-desc">Раздел в разработке.</div>
        </div>
      </div>
    </div>`;
  }

  /* ── Bind page-specific events ───────────────────────────────── */
  function bindPageEvents(id) {
    // Favorites quick-nav
    document.querySelectorAll('[data-fav]').forEach(el => {
      el.addEventListener('click', () => go(el.dataset.fav));
    });

    // Toggles
    document.querySelectorAll('[data-tgl]').forEach(el => {
      el.addEventListener('click', () => handleToggle(el));
    });

    // Currency
    if (id === 'currency') {
      const from = document.getElementById('cur-from-val');
      const to   = document.getElementById('cur-to-val');
      const rate = 91.4;
      if (from) from.addEventListener('input', () => {
        if (to) to.value = (parseFloat(from.value) * rate).toFixed(2);
      });
    }

    // Calculator
    if (id === 'calc') {
      const priceEl = document.getElementById('calc-price');
      const feeEl   = document.getElementById('calc-fee');
      function recalc() {
        const p = parseFloat(priceEl && priceEl.value) || 0;
        const f = parseFloat(feeEl && feeEl.value) || 0;
        const feeAmt = p * f / 100;
        const net = p - feeAmt;
        const gross = p / (1 - f / 100);
        document.getElementById('calc-result-net')   && (document.getElementById('calc-result-net').textContent   = fmt(net));
        document.getElementById('calc-result-fee')   && (document.getElementById('calc-result-fee').textContent   = fmt(feeAmt));
        document.getElementById('calc-result-gross') && (document.getElementById('calc-result-gross').textContent = fmt(gross));
      }
      if (priceEl) priceEl.addEventListener('input', recalc);
      if (feeEl)   feeEl.addEventListener('input', recalc);
      recalc();
    }

    // Settings: volume
    if (id === 'settings') {
      const range = document.getElementById('vol-range');
      const label = document.getElementById('vol-label');
      if (range) range.addEventListener('input', () => {
        state.vol = +range.value;
        range.style.setProperty('--p', state.vol + '%');
        if (label) label.textContent = state.vol + '%';
        saveSettings();
      });
      document.querySelectorAll('[data-sound]').forEach(el => {
        el.addEventListener('click', () => {
          state.sound = el.dataset.sound;
          saveSettings();
          // re-render to update active chips
          renderPage('settings');
        });
      });
      const tgBtn = document.getElementById('settings-tg');
      const rvBtn = document.getElementById('settings-review');
      if (tgBtn) tgBtn.addEventListener('click', e => { e.preventDefault(); openTab('https://t.me/FPTools'); });
      if (rvBtn) rvBtn.addEventListener('click', e => { e.preventDefault(); openTab('https://chromewebstore.google.com/detail/funpay-tools/pibmnjjfpojnakckilflcboodkndkibb/reviews'); });
      const verEl = document.getElementById('settings-version');
      if (verEl) {
        try { verEl.textContent = 'v' + chrome.runtime.getManifest().version; } catch(e) {}
      }
    }

    // Appearance
    if (id === 'appearance') {
      document.querySelectorAll('[data-theme-pick]').forEach(el => {
        el.addEventListener('click', () => {
          state.theme = el.dataset.themePick;
          document.documentElement.setAttribute('data-theme', state.theme);
          // реальный пресет сайта (вкладки FunPay подхватят через onChanged)
          saveSiteTheme({ sitePreset: state.theme, ...(POPUP_PRESET_COLORS[state.theme] || {}) });
          renderPage('appearance');
        });
      });
      document.querySelectorAll('[data-wall-pick]').forEach(el => {
        el.addEventListener('click', () => {
          state.wallpaper = el.dataset.wallPick;
          saveSiteTheme({ wallpaper: state.wallpaper, bgImage: null, bgVideo: null });
          renderPage('appearance');
        });
      });
      document.querySelectorAll('[data-acc]').forEach(el => {
        el.addEventListener('click', () => {
          state.accent = el.dataset.acc;
          applyAccent(state.accent);
          saveSiteTheme({ accentMode: 'static', bgColor1: state.accent, bgColor2: lighten(state.accent, 0.32), linkColor: state.accent });
          renderPage('appearance');
        });
      });
      document.querySelectorAll('[data-font-pick]').forEach(el => {
        el.addEventListener('click', () => {
          state.font = el.dataset.fontPick;
          saveSettings();
          renderPage('appearance');
        });
      });
    }

    // Auto-replies toggles → write to storage
    ['tog-ar-greet','tog-ar-kw','tog-ar-review','tog-ar-bonus'].forEach(togId => {
      const el = document.querySelector(`[data-tgl="${togId}"]`);
      if (!el) return;
      el.addEventListener('click', () => {
        const key = { 'tog-ar-greet': 'greetingEnabled', 'tog-ar-kw': 'keywordsEnabled',
                      'tog-ar-review': 'autoReviewEnabled', 'tog-ar-bonus': 'bonusForReviewEnabled' }[togId];
        state.autoReplies[key] = el.dataset.on !== 'true';
        el.dataset.on = String(state.autoReplies[key]);
        saveAutoReplies();
      });
    });
  }

  /* ── Toggles ─────────────────────────────────────────────────── */
  function handleToggle(el) {
    const id  = el.dataset.tgl;
    const was = el.dataset.on === 'true';
    el.dataset.on = String(!was);

    if (id === 'tog-bump' || id === 'tog-bump-page') {
      state.autoBumpEnabled = !was;
      if (EXT) chrome.storage.local.set({ autoBumpEnabled: state.autoBumpEnabled });
      // sync both toggles
      document.querySelectorAll('[data-tgl="tog-bump"], [data-tgl="tog-bump-page"]').forEach(t => {
        t.dataset.on = String(state.autoBumpEnabled);
      });
      // update status dot in autobump page
      const dot = document.querySelector('.fpt-sbar-dot');
      if (dot) dot.className = 'fpt-sbar-dot' + (state.autoBumpEnabled ? ' on' : '');
    }
  }

  /* ── Apply accent ────────────────────────────────────────────── */
  function applyAccent(accent) {
    const root = document.documentElement;
    if (accent === 'rainbow') {
      root.style.setProperty('--accent', 'oklch(0.70 0.16 252)');
    } else {
      root.style.setProperty('--accent', accent);
      root.style.setProperty('--accent-strong', shadeHex(accent, -0.1));
      root.style.setProperty('--accent-soft', hexAlpha(accent, 0.14));
      root.style.setProperty('--accent-line', hexAlpha(accent, 0.32));
    }
  }

  function hexAlpha(hex, a) {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c+c).join('');
    const n = parseInt(h, 16);
    return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
  }

  function shadeHex(hex, pct) {
    let h = hex.replace('#','');
    if (h.length === 3) h = h.split('').map(c=>c+c).join('');
    const n = parseInt(h,16);
    const r = Math.min(255, Math.max(0, ((n>>16)&255) + Math.round(255*pct)));
    const g = Math.min(255, Math.max(0, ((n>>8)&255) + Math.round(255*pct)));
    const b = Math.min(255, Math.max(0, (n&255) + Math.round(255*pct)));
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  }

  /* ── Save/load settings ──────────────────────────────────────────
     ВАЖНО: пишем в ТЕ ЖЕ структуры, что использует сайт.
     fpToolsTheme — ОБЪЕКТ настроек темы сайта (sitePreset/палитра/обои/акцент):
     писать туда строку = уничтожить настройки. Тема/акцент/обои отсюда — это
     реальный пульт сайта; звук — реальные notificationSound/notificationVolume. */
  const POPUP_PRESET_COLORS = {
    graphite: { containerBgColor: '#1d2028', textColor: '#f1f3f7' },
    obsidian: { containerBgColor: '#15161b', textColor: '#f2f3f7' },
    slate:    { containerBgColor: '#2b3650', textColor: '#f2f5fa' },
    light:    { containerBgColor: '#ffffff', textColor: '#272b33' },
  };
  const POPUP_SOUND_MAP = { 'Стандартный': 'default', 'VK': 'vk', 'Telegram': 'tg', 'iPhone': 'iphone', 'Discord': 'discord', 'WhatsApp': 'whatsapp' };

  function lighten(hex, k) {
    const n = (h) => parseInt(h, 16);
    const r = n(hex.slice(1,3)), g = n(hex.slice(3,5)), b = n(hex.slice(5,7));
    const mix = (c) => Math.round(c + (255 - c) * k);
    return '#' + [mix(r), mix(g), mix(b)].map(c => c.toString(16).padStart(2,'0')).join('');
  }

  async function saveSiteTheme(patch) {
    if (!EXT) return;
    const { fpToolsTheme = {} } = await chrome.storage.local.get('fpToolsTheme');
    const cur = (fpToolsTheme && typeof fpToolsTheme === 'object') ? fpToolsTheme : {};
    await chrome.storage.local.set({ fpToolsTheme: { ...cur, ...patch }, enableCustomTheme: true });
  }

  function saveSettings() {
    if (!EXT) return;
    chrome.storage.local.set({
      fpToolsPopupFont:  state.font,                          // типографика самого попапа
      notificationSound: POPUP_SOUND_MAP[state.sound] || 'default',
      notificationVolume: state.vol,
    });
  }

  function saveAutoReplies() {
    if (!EXT) return;
    chrome.storage.local.set({ fpToolsAutoReplies: state.autoReplies });
  }

  function loadStorage() {
    if (!EXT) return;
    chrome.storage.local.get([
      'autoBumpEnabled',
      'fpToolsAutoReplies',
      'fpToolsTheme',
      'fpToolsPopupFont',
      'notificationSound',
      'notificationVolume',
      'fpToolsTemplates',
      'fpToolsAccounts',
      'fpToolsActiveAccount',
      'fpToolsAutoBumpLog',
    ], data => {
      state.autoBumpEnabled   = !!data.autoBumpEnabled;
      state.autoReplies       = data.fpToolsAutoReplies || {};
      // fpToolsTheme — объект настроек темы сайта (единый с панелью на сайте)
      const siteTheme         = (data.fpToolsTheme && typeof data.fpToolsTheme === 'object') ? data.fpToolsTheme : {};
      state.theme             = siteTheme.sitePreset || 'graphite';
      state.accent            = siteTheme.bgColor1 || '#5b86d8';
      state.wallpaper         = siteTheme.wallpaper || 'none';
      state.font              = data.fpToolsPopupFont || 'geist';
      const SOUND_BACK        = { default: 'Стандартный', vk: 'VK', tg: 'Telegram', iphone: 'iPhone', discord: 'Discord', whatsapp: 'WhatsApp' };
      state.sound             = SOUND_BACK[data.notificationSound] || 'Стандартный';
      state.vol               = data.notificationVolume !== undefined ? data.notificationVolume : 100;
      state.templates         = Array.isArray(data.fpToolsTemplates) ? data.fpToolsTemplates : [];
      state.accounts          = Array.isArray(data.fpToolsAccounts) ? data.fpToolsAccounts : [];
      state.activeAccount     = data.fpToolsActiveAccount || null;
      state.autoBumpLog       = Array.isArray(data.fpToolsAutoBumpLog) ? data.fpToolsAutoBumpLog : [];

      state.templatesCount    = state.templates.length;
      state.lotsCount         = 0;
      state.deliveryCount     = 0;

      // Apply saved theme + accent
      document.documentElement.setAttribute('data-theme', state.theme);
      applyAccent(state.accent);

      // Re-render current page with fresh data
      buildNav();
      renderPage(state.page);
    });

    // Also get lot counts from separate storage keys
    chrome.storage.local.get(['fpToolsLotsCount','fpToolsDeliveryCount'], data => {
      if (data.fpToolsLotsCount)    state.lotsCount    = data.fpToolsLotsCount;
      if (data.fpToolsDeliveryCount) state.deliveryCount = data.fpToolsDeliveryCount;
      if (state.page === 'home') renderPage('home');
    });
  }

  /* ── Helpers ─────────────────────────────────────────────────── */
  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function fmt(n) {
    return n.toFixed(2).replace(/\.?0+$/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  const EXT = typeof chrome !== 'undefined' && chrome.tabs;

  function openTab(url) {
    if (EXT) { chrome.tabs.create({ url }); window.close(); }
    else window.open(url, '_blank');
  }

  /* ── Init ────────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    // Render UI immediately (no chrome API needed)
    const si = document.getElementById('search-icon-slot');
    if (si) si.innerHTML = ic('Search', 14);

    const btn = document.getElementById('open-funpay-btn');
    if (btn) {
      btn.innerHTML = ic('ExternalLink', 14) + ' Открыть FunPay';
      btn.addEventListener('click', () => {
        if (!EXT) { openTab('https://funpay.com/'); return; }
        chrome.tabs.query({ url: 'https://funpay.com/*' }, tabs => {
          if (tabs && tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, { active: true });
            chrome.windows.update(tabs[0].windowId, { focused: true });
          } else {
            chrome.tabs.create({ url: 'https://funpay.com/' });
          }
          window.close();
        });
      });
    }

    const tgBtn = document.getElementById('telegram-btn');
    if (tgBtn) {
      tgBtn.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-1.37.2-1.64l16.44-5.99c.73-.27 1.36.17 1.15.99l-2.28 10.82c-.15.71-.56 1.01-1.2 1.01l-4.82-.01-1.15 4.35c-.32.74-1.23.46-1.42-.47z"/></svg>`;
      tgBtn.addEventListener('click', e => { e.preventDefault(); openTab('https://t.me/FPTools'); });
    }

    const searchEl = document.getElementById('nav-search');
    if (searchEl) searchEl.addEventListener('input', () => buildNav(searchEl.value));

    // Render nav and default page before any async calls
    buildNav();
    renderPage(state.page);

    // Then wire up chrome APIs
    if (!EXT) return;

    // Version badge
    try {
      const v = chrome.runtime.getManifest().version;
      const el = document.getElementById('version-badge');
      if (el) el.textContent = 'v' + v;
    } catch (e) {}

    // Status dot
    try {
      chrome.tabs.query({ url: 'https://funpay.com/*' }, tabs => {
        const dot   = document.getElementById('status-dot');
        const label = document.getElementById('status-label');
        if (tabs && tabs.length > 0) {
          if (dot) dot.classList.add('online');
          if (label) label.textContent = 'FunPay открыт';
        } else {
          if (dot) dot.classList.add('offline');
          if (label) label.textContent = 'Не открыт';
        }
      });
    } catch (e) {}

    // Load real data (will re-render with actual values)
    loadStorage();
  });

})();
