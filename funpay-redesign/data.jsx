// data.jsx — mock content for the prototype (games, lots, FP Tools nav).
(function () {
  // ---- Homepage catalog ----
  const GAMES = [
    { name: 'Counter-Strike 2', mark: 'CS', domain: 'counter-strike.net', cats: ['Скины', 'Аккаунты', 'Прайм'] },
    { name: 'Dota 2', mark: 'D2', domain: 'dota2.com', cats: ['Аккаунты', 'Буст MMR', 'Предметы'] },
    { name: 'Roblox', mark: 'RB', domain: 'roblox.com', cats: ['Robux', 'Аккаунты', 'Прокачка'] },
    { name: 'Brawl Stars', mark: 'BS', domain: 'brawlstars.com', cats: ['Аккаунты', 'Гемы', 'Прокачка'] },
    { name: 'Genshin Impact', mark: 'GI', domain: 'hoyoverse.com', cats: ['Аккаунты', 'Кристаллы', 'Услуги'] },
    { name: 'Steam', mark: 'ST', domain: 'store.steampowered.com', cats: ['Пополнение', 'Ключи', 'Аккаунты'] },
    { name: 'Fortnite', mark: 'FN', domain: 'fortnite.com', cats: ['Аккаунты', 'В-баксы', 'Буст'] },
    { name: 'Valorant', mark: 'VL', domain: 'playvalorant.com', cats: ['Аккаунты', 'VP', 'Буст'] },
    { name: 'Telegram', mark: 'TG', domain: 'telegram.org', cats: ['Premium', 'Звёзды', 'Подписка'] },
    { name: 'ChatGPT', mark: 'AI', domain: 'openai.com', cats: ['Подписки', 'Аккаунты', 'API'] },
    { name: 'World of Tanks', mark: 'WT', domain: 'worldoftanks.ru', cats: ['Аккаунты', 'Голда', 'Прокачка'] },
    { name: 'Discord', mark: 'DC', domain: 'discord.com', cats: ['Nitro', 'Буст', 'Аккаунты'] },
  ];

  const HOT = ['Counter-Strike 2', 'Roblox', 'Brawl Stars', 'ChatGPT', 'Steam'];

  // ---- Seller lots (profile) ----
  const SECTIONS = [
    {
      id: 's1', game: 'ChatGPT', cat: 'Аккаунты', count: 2,
      cols: ['desc', 'price'],
      lots: [
        { id: 4827193, auto: true, on: true, title: 'ChatGPT Plus · 30 дней · полный доступ + почта', sub: 'GPT-5.5 & Codex, с подпиской', price: 189.41, stock: '∞' },
        { id: 4827194, auto: false, on: true, title: 'ChatGPT Plus · личный · полный доступ + почта', sub: '30 дней, с подпиской', price: 488.80, stock: '12' },
      ],
    },
    {
      id: 's2', game: 'Dead by Daylight', cat: 'Прочее', count: 3,
      cols: ['platform', 'desc', 'stock', 'price'],
      lots: [
        { id: 5011882, auto: true, on: true, platform: 'PC (Steam)', title: 'Снятие блокировки по железу — навсегда', sub: 'HWID unban, гарантия', price: 961.30, stock: '9994' },
        { id: 5011883, auto: true, on: false, platform: 'PC (Steam)', title: 'Разбан аккаунта · ручная работа', sub: 'Срок 1–3 дня', price: 1240.00, stock: '57' },
        { id: 5011884, auto: false, on: true, platform: 'PC', title: 'Прокачка уровня · 1–50', sub: 'Без читов, ручками', price: 430.00, stock: '8' },
      ],
    },
    {
      id: 's3', game: 'Brawl Stars', cat: 'Аккаунты', count: 3,
      cols: ['desc', 'stock', 'price'],
      lots: [
        { id: 6120033, auto: true, on: true, title: 'Аккаунт · 30 000+ кубков · все бойцы', sub: 'Привязка на почту', price: 2100.00, stock: '3' },
        { id: 6120034, auto: false, on: true, title: 'Аккаунт · 15 000 кубков · 40 бойцов', sub: 'Чистая привязка', price: 890.00, stock: '5' },
        { id: 6120035, auto: false, on: false, title: 'Прокачка кубков · +1000', sub: 'Свой аккаунт, 1–2 дня', price: 150.00, stock: '20' },
      ],
    },
  ];

  // ---- FP Tools menu ----
  const FPNAV = [
    { group: 'Рабочий стол', items: [
      { id: 'home', label: 'Обзор', icon: 'LayoutGrid' },
      { id: 'lots', label: 'Лоты', icon: 'Package' },
      { id: 'autobump', label: 'Авто-поднятие', icon: 'ArrowUpNarrowWide' },
      { id: 'delivery', label: 'Авто-выдача', icon: 'Zap' },
    ]},
    { group: 'Чат и продажи', items: [
      { id: 'templates', label: 'Шаблоны', icon: 'MessageSquareText' },
      { id: 'replies', label: 'Авто-ответы', icon: 'Reply' },
      { id: 'commands', label: 'Слэш-команды', icon: 'TerminalSquare' },
      { id: 'blacklist', label: 'Чёрный список', icon: 'UserX' },
    ]},
    { group: 'Финансы', items: [
      { id: 'currency', label: 'Валюты', icon: 'ArrowLeftRight' },
      { id: 'piggy', label: 'Копилки', icon: 'PiggyBank' },
      { id: 'calc', label: 'Калькулятор', icon: 'Calculator' },
    ]},
    { group: 'Система', items: [
      { id: 'appearance', label: 'Оформление', icon: 'Palette' },
      { id: 'accounts', label: 'Аккаунты', icon: 'Users' },
      { id: 'settings', label: 'Настройки', icon: 'Settings' },
    ]},
  ];

  const NOTIF_SOUNDS = ['Стандарт', 'VK', 'Telegram', 'iPhone', 'Discord', 'Своя'];

  window.FPX_DATA = { GAMES, HOT, SECTIONS, FPNAV, NOTIF_SOUNDS };
})();
