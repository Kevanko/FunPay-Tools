/* ============================================================
   FunPay Tools — локальные настройки и переходы к редактору сайта.
   ============================================================ */
(function () {
  "use strict";

  /* ── Icons (Lucide subset, stroke-based SVG) ──────────────────── */
  const P = {
    LayoutGrid:
      '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    Package:
      '<path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/>',
    ArrowUpNarrowWide:
      '<path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="M11 12h4"/><path d="M11 16h7"/><path d="M11 20h10"/>',
    Zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    MessageSquareText:
      '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M13 8H7"/><path d="M17 12H7"/>',
    Reply:
      '<polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>',
    TerminalSquare:
      '<path d="m7 11 2-2-2-2"/><path d="M11 13h4"/><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>',
    UserX:
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" x2="22" y1="8" y2="13"/><line x1="22" x2="17" y1="8" y2="13"/>',
    ArrowLeftRight:
      '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
    PiggyBank:
      '<path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z"/><path d="M2 9v1a2 2 0 0 0 2 2h1"/><path d="M16 11h.01"/>',
    Calculator:
      '<rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/>',
    Palette:
      '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.476-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
    Users:
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    Settings:
      '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    Search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
    X: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    Minus: '<path d="M5 12h14"/>',
    Plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    BarChart3:
      '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    EyeOff:
      '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>',
    Sparkles:
      '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
    Bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    Pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    Upload:
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
    Download:
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    Copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    ListChecks:
      '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
    Play: '<polygon points="5 3 19 12 5 21 5 3"/>',
    ArrowUpDown:
      '<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>',
    ImagePlus:
      '<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><line x1="16" x2="22" y1="5" y2="5"/><line x1="19" x2="19" y1="2" y2="8"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    Pipette:
      '<path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8Z"/>',
    ExternalLink:
      '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/>',
    Send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    ChevronDown: '<path d="m6 9 6 6 6-6"/>',
    ChevronRight: '<path d="m9 18 6-6-6-6"/>',
    User: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    LogOut:
      '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
    Telegram: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    Star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  };

  function ic(name, size) {
    const shared={ExternalLink:"external",Send:"send",Search:"search",X:"close",Plus:"plus",Upload:"upload",Download:"download",User:"user",Settings:"settings",Palette:"palette",Package:"lots",LayoutGrid:"home"};
    if(shared[name])return FPTIcons.svg(shared[name],size||16);
    size = size || 16;
    const d = P[name] || "";
    return `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  }

  const EXT = typeof chrome !== "undefined" && !!chrome.storage;
  const AR_FLAGS = [
    "greetingEnabled",
    "keywordsEnabled",
    "autoReviewEnabled",
    "bonusForReviewEnabled",
    "newOrderReplyEnabled",
    "orderConfirmReplyEnabled",
  ];
  const PAGES = {
    home: ["Главная", "general"],
    phone: ["На телефон", "phone"],
    lots: ["Лоты", "lot_io"],
    autobump: ["Поднятие лотов", "autobump"],
    delivery: ["Выдача товаров", "auto_delivery"],
    templates: ["Шаблоны", "templates"],
    replies: ["Автоответы", "auto_review"],
    commands: ["Команды", "slash_commands"],
    blacklist: ["Блокировки", "blacklist"],
    currency: ["Курсы валют", "currency_calc"],
    piggy: ["Цели накопления", "piggy_banks"],
    calc: ["Калькулятор", "calculator"],
    appearance: ["Оформление", "theme"],
    accounts: ["Аккаунты", "accounts"],
    ai: ["ИИ", "ai_connection"],
    settings: ["Уведомления", "notifications"],
  };
  const LABELS = {
    graphite: "Студия",
    obsidian: "Терминал",
    slate: "Сланец",
    light: "Белая",
    clay: "Глина",
    paper: "Бумага",
    forest: "Лес",
    ink: "Чернила",
  };
  let state = { page: "home", data: {}, loaded: false, error: "" };
  let busy = false;
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  function adapter(data) {
    const ts = data.fpToolsTemplateSettings || {};
    return {
      templates: [
        ...Object.values(ts.standard || {}),
        ...(Array.isArray(ts.custom) ? ts.custom : []),
      ],
      accounts: Array.isArray(data.fpToolsAccounts) ? data.fpToolsAccounts : [],
      ar: data.fpToolsAutoReplies || {},
    };
  }
  function deliveryDiagnostics(data) {
    const uncertain = Object.entries(data)
      .filter(
        ([key, value]) =>
          key.startsWith("fptOutbox__") && value && typeof value === "object",
      )
      .flatMap(([key, records]) =>
        Object.entries(records).map(([id, record]) => ({
          ...record,
          id,
          accountId: key.slice("fptOutbox__".length),
        })),
      )
      .filter(
        (record) =>
          record?.status === "uncertain" && /^\d+$/.test(String(record.chatId)),
      );
    if (!uncertain.length) return "";
    return (
      '<section class="fpt-card"><h2 class="fpt-h2">Проверьте отправку</h2><p class="fpt-desc">Для ' +
      uncertain.length +
      " сообщений сервер не подтвердил результат. Автоматический повтор остановлен, чтобы не отправить дубликат. Проверьте переписку вручную.</p>" +
      uncertain
        .slice(0, 10)
        .map(
          (record) =>
            '<p><a class="btn btn-soft" href="https://funpay.com/chat/?node=' +
            encodeURIComponent(record.chatId) +
            '" target="_blank" rel="noopener noreferrer">Открыть чат ' +
            esc(record.chatId) +
            '</a> <button class="btn btn-ghost" data-retry-id="' +
            esc(record.id) +
            '" data-retry-account="' +
            esc(record.accountId) +
            '">Повторить после проверки</button></p>',
        )
        .join("") +
      "</section>"
    );
  }
  function applyAppearance() {
    const t = state.data.fpToolsTheme || {};
    const p = FPT_SITE_PRESETS[t.sitePreset] || FPT_SITE_PRESETS.obsidian;
    const v = {
      "--bg": p.pal.p1,
      "--bg-deep": p.base[1],
      "--surface-1": t.containerBgColor || p.pal.p2,
      "--surface-2": p.pal.p2,
      "--surface-3": p.pal.p3,
      "--text": t.textColor || p.pal.pTx,
      "--text-dim": p.pal.pTxDim,
      "--text-faint": p.pal.pTxFaint,
      "--line": p.pal.pLine,
      "--line-strong": p.pal.pLine,
      "--brand-filter": p.pal.pLogoFilter || "none",
      "--font-ui": fptFontStack(t.font || FPT_DESIGN_PROFILES[t.sitePreset||'obsidian']?.font || 'Consolas'),
      "--font-display": fptFontStack(t.font || FPT_DESIGN_PROFILES[t.sitePreset||'obsidian']?.font || 'Consolas'),
    };
    const accent = t.linkColor || t.bgColor1 || "#5b86d8";
    v["--accent"] = accent;
    v["--accent-strong"] = accent;
    v["--accent-soft"] = accent + "22";
    v["--accent-line"] = accent + "77";
    v["--accent-fg"] = p.scheme === "light" ? "#ffffff" : "#101216";
    Object.entries(v).forEach(([k, value]) =>
      document.documentElement.style.setProperty(k, value),
    );
    const profile=fptDesignMetrics(t);
    document.documentElement.style.setProperty("--r-md",profile.radius+"px");
    document.documentElement.style.setProperty("--r-lg",profile.panel+"px");
    document.documentElement.style.setProperty("--design-gap",profile.gap+"px");
    document.documentElement.setAttribute?.("data-design",t.sitePreset||"obsidian");
    document.documentElement.style.colorScheme = p.scheme;
  }
  function nav(filter = "") {
    const el = document.getElementById("nav-groups");
    if (!el) return;
    el.innerHTML =
      Object.entries(PAGES)
        .filter(([, v]) => v[0].toLowerCase().includes(filter.toLowerCase()))
        .map(
          ([id, [name]]) =>
            '<button class="fpt-navitem' +
            (state.page === id ? " is-active" : "") +
            '" data-page="' +
            id +
            '" ' +
            (state.page === id ? 'aria-current="page"' : "") +
            ">" +
            FPTIcons.svg(({home:"home",phone:"qr",lots:"lots",autobump:"bump",delivery:"bolt",templates:"document",replies:"reply",commands:"terminal",blacklist:"block",currency:"exchange",piggy:"wallet",calc:"calculator",appearance:"palette",accounts:"users",ai:"sparkles",settings:"bell"})[id],19) + "<span>" + esc(name) +
            "</span></button>",
        )
        .join("") || '<p class="fpt-navempty">Ничего не найдено</p>';
    el.querySelectorAll("[data-page]").forEach((b) =>
      b.addEventListener("click", () => {
        state.page = b.dataset.page;
        render();
        nav(filter);
        el.querySelector('[data-page="' + state.page + '"]')?.focus();
      }),
    );
  }
  function editButton(id, label = "Настроить на FunPay") {
    return (
      '<button class="btn btn-soft" data-editor="' +
      id +
      '">' +
      esc(label) +
      " " +
      ic("ExternalLink") +
      "</button>"
    );
  }
  function toggle(key, label, on) {
    return (
      '<div class="fpt-togrow"><span class="fpt-togrow-txt">' +
      esc(label) +
      '</span><button type="button" class="tgl" role="switch" aria-label="' +
      esc(label) +
      '" aria-checked="' +
      !!on +
      '" data-on="' +
      !!on +
      '" data-toggle="' +
      key +
      '" ' +
      (!state.loaded ? "disabled" : "") +
      "></button></div>"
    );
  }
  function render() {
    const previousFocus = document.activeElement;
    const focusId = previousFocus?.id;
    const focusToggle = previousFocus?.dataset?.toggle;
    const d = state.data,
      a = adapter(d),
      id = state.page;
    let body = "";
    const heading =
      '<div class="fpt-pagehead"><div><h1 class="fpt-h2">' +
      PAGES[id][0] +
      '</h1><p class="fpt-desc">' +
      (id === "home"
        ? "Состояние настроек на этом устройстве."
        : id === "phone" ? "Приложение, вход и ваши настройки." : id === "ai" ? "Свой аккаунт Groq с бесплатной квотой." : "Редактор полных настроек доступен на сайте FunPay.") +
      "</p></div></div>";
    if (id === "home")
      body =
        '<div class="fpt-card">' +
        toggle(
          "autoBumpEnabled",
          "Авто-поднятие",
          d.autoBumpEnabled || d.fpToolsSmartBumpEnabled,
        ) +
        toggle(
          "ar",
          "Автоответы",
          AR_FLAGS.some((k) => a.ar[k]),
        ) +
        toggle("hideBalance", "Скрывать баланс", d.hideBalance) +
        toggle(
          "showSalesStats",
          "Статистика продаж",
          d.showSalesStats !== false,
        ) +
        toggle(
          "viewSellersPromo",
          "Иконки промо-лотов",
          d.viewSellersPromo !== false,
        ) +
        '</div><p class="fpt-blocklabel">Сохранённые настройки</p><p class="fpt-desc">Шаблонов: ' +
        (state.loaded ? a.templates.length : "—") +
        " · Аккаунтов: " +
        (state.loaded ? a.accounts.length : "—") +
        "</p>" +
        editButton("home", "Открыть панель FunPay");
    else if (id === "replies")
      body =
        '<div class="fpt-card">' +
        [
          ["greetingEnabled", "Приветствие"],
          ["keywordsEnabled", "Ключевые слова"],
          ["autoReviewEnabled", "Автоотзыв"],
          ["bonusForReviewEnabled", "Бонус за отзыв"],
          ["newOrderReplyEnabled", "Новый заказ"],
          ["orderConfirmReplyEnabled", "Подтверждение заказа"],
        ]
          .map(([k, n]) => toggle("ar:" + k, n, a.ar[k]))
          .join("") +
        "</div>" +
        editButton(id, "Редактировать тексты и правила");
    else if (id === "autobump")
      body =
        '<div class="fpt-card">' +
        toggle(
          "autoBumpEnabled",
          "Авто-поднятие",
          d.autoBumpEnabled || d.fpToolsSmartBumpEnabled,
        ) +
        '</div><p class="fpt-desc">Включённая настройка не означает, что категории уже выбраны. Таймеры и журнал проверяйте в панели.</p>' +
        editButton(id, "Выбрать категории и посмотреть журнал");
    else if (id === "delivery")
      body =
        '<div class="fpt-card">' +
        toggle(
          "ar:autoDeliveryEnabled",
          "Авто-выдача",
          a.ar.autoDeliveryEnabled,
        ) +
        "</div>" +
        editButton(id, "Настроить товары и правила");
    else if (id === "templates")
      body =
        '<div class="fpt-card">' +
        (a.templates.length
          ? a.templates
              .map(
                (t) =>
                  '<div class="fpt-tpl"><div class="fpt-tpl-txt"><span class="fpt-tpl-name">' +
                  esc(t.label || t.name || "Шаблон") +
                  '</span><span class="fpt-tpl-body">' +
                  esc(t.text || t.body || "") +
                  "</span></div></div>",
              )
              .join("")
          : '<p class="fpt-desc">Сохранённых шаблонов пока нет. Стандартные шаблоны доступны в редакторе.</p>') +
        "</div>" +
        editButton(id, "Создать или редактировать шаблоны");
    else if (id === "accounts")
      body =
        '<div class="fpt-card">' +
        (a.accounts.length
          ? a.accounts
              .map(
                (x) =>
                  '<div class="fpt-tpl"><span>' +
                  esc(x.name || "Аккаунт") +
                  "</span></div>",
              )
              .join("")
          : '<p class="fpt-desc">Нет сохранённых аккаунтов.</p>') +
        '</div><p class="fpt-desc">Добавление и переключение выполняются в панели сайта.</p>' +
        editButton(id, "Управлять аккаунтами");
    else if (id === "currency")
      body =
        '<p class="fpt-desc">Калькулятор на FunPay загружает настоящие курсы и показывает время обновления. Здесь фиксированный курс не используется.</p>' +
        editButton(id, "Открыть калькулятор валют");
    else if (id === "calc")
      body =
        '<label>Цена лота (₽)<input class="inp" id="price" type="number" min="0" step="any" value="1000"></label><label>Комиссия (%)<input class="inp" id="fee" type="number" min="0" max="99.99" step="any" value="7"></label><p id="calc-output" role="status"></p><p class="fpt-desc">Оценка по введённой комиссии. Фактические условия проверяйте на FunPay.</p>';
    else if (id === "appearance") {
      const t = d.fpToolsTheme || {};
      body =
        '<div class="fpt-themes">' +
        Object.keys(FPT_SITE_PRESETS)
          .map(
            (k) =>
              '<button class="fpt-theme" data-preset="' +
              k +
              '" aria-pressed="' +
              (t.sitePreset === k) +
              '"><span class="fpt-theme-prev" style="background:' +
              FPT_SITE_PRESETS[k].containerBgColor +
              '"></span><span class="fpt-theme-label">' +
              (FPT_DESIGN_PROFILES[k]?.label||LABELS[k]) +
              "</span></button>",
          )
          .join("") +
        '</div><label>Шрифт интерфейса<select class="inp" id="font">' +
        FPT_UI_FONTS.map(
          (f) =>
            "<option " +
            (t.font === f ? "selected" : "") +
            ">" +
            esc(f) +
            "</option>",
        ).join("") +
        '</select></label><div class="fpt-appearance-fields"><label>Акцент<input id="theme-accent" type="color" value="'+esc(t.bgColor1||FPT_THEME_ACCENTS[t.sitePreset]||'#5b86d8')+'"></label><label>Панели<input id="theme-surface" type="color" value="'+esc(t.containerBgColor||'#1d2028')+'"></label><label>Текст<input id="theme-text" type="color" value="'+esc(t.textColor||'#f1f3f7')+'"></label></div><label>Скругления<input id="theme-radius" type="range" min="0" max="28" value="'+Number(t.borderRadius??10)+'"></label><label>Обои<select class="inp" id="theme-wallpaper">'+[['none','Без обоев'],['dunes','Дюны'],['mesh','Сетка цвета'],['grid','Чертёж'],['cobalt','Кобальт'],['aurora','Сияние'],['drift','Плавное движение']].map(([value,label])=>'<option value="'+value+'" '+((t.wallpaper||'none')===value?'selected':'')+'>'+label+'</option>').join('')+'</select></label><p class="fpt-desc">Профиль меняет палитру, шрифт, плотность и скругления. Индивидуальные настройки задаются после выбора профиля.</p>' +
        editButton(id, "Цвета, обои и дополнительные настройки");
    } else if (id === "settings")
      body =
        '<label>Звук<select class="inp" id="sound">' +
        [
          ["default", "Стандартный"],
          ["vk", "VK"],
          ["tg", "Telegram"],
          ["iphone", "iPhone"],
          ["discord", "Discord"],
          ["whatsapp", "WhatsApp"],
        ]
          .map(
            ([k, n]) =>
              '<option value="' +
              k +
              '" ' +
              ((d.notificationSound || "default") === k ? "selected" : "") +
              ">" +
              n +
              "</option>",
          )
          .join("") +
        '</select></label><label>Громкость<input id="volume" type="range" min="0" max="100" value="' +
        Math.round((d.notificationVolume ?? 1)*100) +
        '"><output id="volume-output">' +
        Math.round((d.notificationVolume ?? 1)*100) +
        '%</output></label><button class="btn btn-soft" id="preview">' +
        ((d.notificationSound || "default") === "default"
          ? "Настроить стандартный звук"
          : "Прослушать") +
        "</button>" +
        editButton(id, "Все настройки уведомлений") + '<hr><button class="btn btn-soft" id="check-app-update">'+FPTIcons.svg("refresh")+'Проверить обновления</button><p id="app-update-result" class="fpt-desc" role="status"></p>';
    else if(id === "ai")body='<p class="fpt-desc">Корректировка сообщений, переводы и описания. Ключ хранится только в этом браузере; в QR и облако он не попадает.</p><a class="btn btn-soft" href="'+chrome.runtime.getURL('popup/ai.html')+'" target="_blank" rel="noopener">Подключить Groq</a>';
    else if(id === "phone")body="";
    else
      body =
        '<p class="fpt-desc">' +
        {
          lots: "Импорт, экспорт и массовое редактирование лотов.",
          commands: "Команды и подстановки сообщений.",
          blacklist: "Правила для выбранных покупателей.",
          piggy: "Финансовые цели и правила накопления.",
        }[id] +
        "</p>" +
        editButton(id);
    if (id === "home" || id === "replies") body += deliveryDiagnostics(d);
    const root = document.getElementById("fpt-content");
    root.innerHTML =
      '<div class="fpt-page">' +
      heading +
      '<p id="ui-error" role="alert">' +
      esc(state.error) +
      "</p>" +
      (!state.loaded ? '<p role="status">Загрузка настроек…</p>' : "") +
      body +
      "</div>";
    root
      .querySelectorAll("[data-editor]")
      .forEach((b) => (b.onclick = () => openEditor(b.dataset.editor)));
    root
      .querySelectorAll("[data-toggle]")
      .forEach((b) => (b.onclick = () => setToggle(b.dataset.toggle)));
    root
      .querySelectorAll("[data-preset]")
      .forEach((b) => (b.onclick = () => setPreset(b.dataset.preset)));
    root.querySelectorAll("[data-retry-id]").forEach((button) => {
      button.onclick = async () => {
        if (
          !window.confirm(
            "Вы проверили чат и убедились, что сообщение не отправлено? Повторная отправка возможна.",
          )
        )
          return;
        button.disabled = true;
        try {
          const result = await chrome.runtime.sendMessage({
            action: "fptRetryUncertain",
            accountId: button.dataset.retryAccount,
            id: button.dataset.retryId,
          });
          if (!result?.ok)
            throw new Error(result?.error || "Не удалось разрешить повтор.");
          await load();
        } catch (error) {
          showError(error.message || "Не удалось разрешить повтор.");
        } finally {
          button.disabled = false;
        }
      };
    });
    if (focusId) document.getElementById(focusId)?.focus?.();
    else if (focusToggle)
      root.querySelector?.('[data-toggle="' + focusToggle + '"]')?.focus?.();
    if(id === "phone"){const area=document.createElement("div");area.id="phone-transfer";root.querySelector('.fpt-page').appendChild(area);FPTPhoneTransfer.mount(area,state.data);}
    if (id === "calc") {
      ["price", "fee"].forEach(
        (k) => (document.getElementById(k).oninput = calculate),
      );
      calculate();
    }
    if (id === "appearance")
      document.getElementById("font").onchange = (e) =>
        saveTheme({ font: e.target.value });
    if(id === "appearance"){for(const [field,key] of [["theme-accent","bgColor1"],["theme-surface","containerBgColor"],["theme-text","textColor"],["theme-radius","borderRadius"],["theme-wallpaper","wallpaper"]])document.getElementById(field).onchange=e=>{const value=key==="borderRadius"?Number(e.target.value):e.target.value;saveTheme({[key]:value,...(key==="bgColor1"?{linkColor:value,accentMode:"static"}:{}),...(key==="wallpaper"?{bgImage:"",bgVideo:""}:{})});};}
    if (id === "settings") {
      document.getElementById("check-app-update").onclick=async()=>{let out=document.getElementById("app-update-result");out.textContent="Проверяю…";try{const r=await chrome.runtime.sendMessage({action:"checkAppUpdate"});out=document.getElementById("app-update-result");if(!out)return;if(!r?.ok)throw Error(r?.error||"Нет ответа расширения");out.textContent=r.update.installed?"Версия "+r.update.version+" установлена. Перезапускаю расширение…":r.update.installError?"Версия "+r.update.version+": "+r.update.installError:r.update.available?"Доступна версия "+r.update.version+". Для автоматической установки подключите компонент обновлений ПК. Сейчас можно скачать ZIP.":"Установлена актуальная версия "+chrome.runtime.getManifest().version+(r.update.managed?". Автообновление включено.":". Компонент автообновления ПК не подключён.");if(r.update.available){const a=document.createElement("a");a.href=r.update.url;a.textContent=" Скачать ZIP";a.target="_blank";a.rel="noopener noreferrer";out.appendChild(a);}}catch(e){out=document.getElementById("app-update-result");if(out)out.textContent="Проверка не завершена: "+e.message;}};
      document.getElementById("sound").onchange = (e) =>
        save({ notificationSound: e.target.value });
      document.getElementById("volume").oninput = (e) =>
        (document.getElementById("volume-output").textContent =
          e.target.value + "%");
      document.getElementById("volume").onchange = (e) =>
        save({ notificationVolume: Number(e.target.value)/100 });
      document.getElementById("preview").onclick = () => {
        const k = state.data.notificationSound || "default";
        if (k === "default") {
          openEditor("settings");
          return;
        }
        const file = k === "tg" ? "telegram" : k;
        const audio = new Audio(
          chrome.runtime.getURL("sounds/" + file + ".mp3"),
        );
        audio.volume = Math.max(0,Math.min(1,state.data.notificationVolume ?? 1));
        audio.play().catch(() => showError("Не удалось проиграть звук."));
      };
    }
  }
  function calculate() {
    const p = Number(document.getElementById("price").value),
      f = Number(document.getElementById("fee").value);
    document.getElementById("calc-output").textContent =
      !document.getElementById("price").value ||
      !document.getElementById("fee").value ||
      !Number.isFinite(p) ||
      !Number.isFinite(f) ||
      p < 0 ||
      f < 0 ||
      f >= 100
        ? "Введите цену от 0 и комиссию от 0 до 100% (не включая 100)."
        : "Выплата: " +
          (p * (1 - f / 100)).toFixed(2) +
          " ₽ · Цена до комиссии: " +
          (p / (1 - f / 100)).toFixed(2) +
          " ₽";
  }
  function showError(message) {
    state.error = message;
    const e = document.getElementById("ui-error");
    if (e) e.textContent = message;
  }
  async function save(patch) {
    if (!EXT || busy) return;
    busy = true;
    try {
      await chrome.storage.local.set(patch);
      Object.assign(state.data, patch);
      state.error = "";
      applyAppearance();
      render();
    } catch (e) {
      showError("Настройки не сохранены. Повторите действие.");
    } finally {
      busy = false;
    }
  }
  async function saveTheme(patch) {
    if (!EXT || busy) return;
    try {
      const d = await chrome.storage.local.get("fpToolsTheme");
      await save({
        fpToolsTheme: { ...(d.fpToolsTheme || {}), ...patch },
        enableCustomTheme: true,
      });
    } catch (e) {
      showError("Не удалось прочитать настройки темы.");
    }
  }
  async function setPreset(id) {
    if (!FPT_SITE_PRESETS[id] || !EXT) return;
    try {
      const d = await chrome.storage.local.get("fpToolsTheme");
      const patch = fptPresetPatch(id);
      await saveTheme(patch);
    } catch (e) {
      showError("Не удалось применить тему.");
    }
  }
  let togglePending = false;
  async function setToggle(key) {
    if (!EXT || busy || togglePending) return;
    togglePending = true;
    try {
      const d = await chrome.storage.local.get([
        "fpToolsAutoReplies",
        "autoBumpEnabled",
        "fpToolsSmartBumpEnabled",
        key,
      ]);
      let patch;
      if (key.startsWith("ar")) {
        const ar = { ...(d.fpToolsAutoReplies || {}) };
        if (key === "ar") {
          const next = !AR_FLAGS.some((k) => ar[k]);
          if (next) ar.greetingEnabled = true;
          else AR_FLAGS.forEach((k) => (ar[k] = false));
        } else {
          const k = key.slice(3);
          ar[k] = !ar[k];
        }
        patch = { fpToolsAutoReplies: ar };
      } else if (key === "autoBumpEnabled") {
        const next = !(d.autoBumpEnabled || d.fpToolsSmartBumpEnabled);
        patch = {
          autoBumpEnabled: next,
          ...(!next ? { fpToolsSmartBumpEnabled: false } : {}),
        };
      } else {
        const current = ["showSalesStats", "viewSellersPromo"].includes(key)
          ? d[key] !== false
          : !!d[key];
        patch = { [key]: !current };
      }
      await save(patch);
    } catch (e) {
      showError("Не удалось изменить настройку.");
    } finally {
      togglePending = false;
    }
  }
  async function openEditor(id) {
    const page = PAGES[id]?.[1] || "general";
    try {
      await chrome.storage.local.set({ fpToolsLastPage: page });
      const tabs = await chrome.tabs.query({ url: "https://funpay.com/*" });
      if (tabs.length) {
        const tab = tabs[0];
        const url = new URL(tab.url);
        url.hash = "fpt-page=" + page;
        await chrome.tabs.update(tab.id, { url: url.href, active: true });
        await chrome.windows.update(tab.windowId, { focused: true });
      } else
        await chrome.tabs.create({
          url: "https://funpay.com/#fpt-page=" + page,
        });
      window.close();
    } catch (e) {
      showError("Не удалось открыть FunPay. Откройте сайт и кнопку FP Tools.");
    }
  }
  async function load() {
    try {
      state.data = await chrome.storage.local.get(null);
      if(typeof state.data.notificationVolume==='number'&&state.data.notificationVolume>1&&state.data.notificationVolume<=100){state.data.notificationVolume/=100;await chrome.storage.local.set({notificationVolume:state.data.notificationVolume});}
      state.loaded = true;
      state.error = "";
      applyAppearance();
      render();
    } catch (e) {
      showError("Не удалось загрузить настройки. Закройте и откройте окно.");
    }
  }
  document.addEventListener("DOMContentLoaded", () => {
    nav();
    render();
    document.getElementById("nav-search").oninput = (e) => nav(e.target.value);
    document.getElementById("nav-search").onkeydown = (event) => {
      if (event.key === 'Escape') { event.target.value = ''; nav(); }
    };
    document.getElementById("open-funpay-btn").onclick = () =>
      openEditor("home");
    const tg = document.getElementById("telegram-btn");
    tg.textContent = "TG";
    tg.setAttribute("aria-label", "Telegram-сообщество");
    tg.href = "https://t.me/FPTools";
    tg.target = "_blank";
    tg.rel = "noopener noreferrer";
    if (EXT) {
      document.getElementById("version-badge").textContent =
        "v" + chrome.runtime.getManifest().version;
      load();
      chrome.storage.onChanged.addListener((ch, area) => {
        if (area === "local") {
          Object.entries(ch).forEach(([k, v]) => {
            if (v.newValue === undefined) delete state.data[k];
            else state.data[k] = v.newValue;
          });
          if(Object.keys(ch).every(k=>k==="fptAppUpdate"))return;
          applyAppearance();
          // Keep an in-progress QR transfer intact when runtime counters change.
          // Settings QR reads storage on demand, so a full redraw is unnecessary.
          if(state.page === "phone")return;
          render();
        }
      });
      chrome.tabs
        .query({ url: "https://funpay.com/*" })
        .then(
          (t) =>
            (document.getElementById("status-label").textContent = t.length
              ? "FunPay открыт"
              : "FunPay не открыт"),
        );
    }
  });
})();
