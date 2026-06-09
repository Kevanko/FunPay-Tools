// fptools.jsx — the redesigned FP Tools window (overlay over FunPay).
(function () {
  const { useState } = React;
  const Icon = window.Icon;
  const D = window.FPX_DATA;

  /* ---------- small shared bits ---------- */
  function PageHead({ title, desc, action }) {
    return (
      React.createElement('div', { className: 'fpt-pagehead' },
        React.createElement('div', null,
          React.createElement('h2', { className: 'fpt-h2' }, title),
          desc ? React.createElement('p', { className: 'fpt-desc' }, desc) : null,
        ),
        action || null,
      )
    );
  }

  function Field({ label, children, hint }) {
    return (
      React.createElement('label', { className: 'fpt-field' },
        React.createElement('span', { className: 'fpt-field-label' }, label),
        children,
        hint ? React.createElement('span', { className: 'fpt-field-hint' }, hint) : null,
      )
    );
  }

  function ToggleRow({ icon, title, desc, on, onToggle }) {
    return (
      React.createElement('div', { className: 'fpt-togrow' },
        icon ? React.createElement('span', { className: 'fpt-togrow-ic' }, React.createElement(Icon, { name: icon, size: 17 })) : null,
        React.createElement('div', { className: 'fpt-togrow-txt' },
          React.createElement('span', { className: 'fpt-togrow-title' }, title),
          desc ? React.createElement('span', { className: 'fpt-togrow-desc' }, desc) : null,
        ),
        React.createElement('span', { className: 'tgl', 'data-on': String(!!on), onClick: onToggle }),
      )
    );
  }

  /* ---------- pages ---------- */
  function OverviewPage({ go }) {
    const [tog, setTog] = useState({ stats: true, hideBal: false, promo: true });
    const fav = [
      { id: 'lots', icon: 'Package', label: 'Лоты' },
      { id: 'autobump', icon: 'ArrowUpNarrowWide', label: 'Авто-поднятие' },
      { id: 'templates', icon: 'MessageSquareText', label: 'Шаблоны' },
      { id: 'currency', icon: 'ArrowLeftRight', label: 'Валюты' },
    ];
    return (
      React.createElement('div', { className: 'fpt-page' },
        React.createElement(PageHead, { title: 'Обзор', desc: 'Сводка инструментов и быстрый доступ к частым действиям.' }),
        React.createElement('div', { className: 'fpt-grid3' },
          [['Активных лотов', '38'], ['Авто-выдача', '32'], ['Шаблонов', '14']].map(([l, v]) =>
            React.createElement('div', { key: l, className: 'fpt-metric' },
              React.createElement('span', { className: 'eyebrow' }, l),
              React.createElement('span', { className: 'fpt-metric-v mono' }, v))),
        ),
        React.createElement('div', { className: 'eyebrow fpt-blocklabel' }, 'Избранное'),
        React.createElement('div', { className: 'fpt-fav' },
          fav.map((f) =>
            React.createElement('button', { key: f.id, className: 'fpt-fav-card', onClick: () => go(f.id) },
              React.createElement(Icon, { name: f.icon, size: 19 }),
              React.createElement('span', null, f.label))),
        ),
        React.createElement('div', { className: 'eyebrow fpt-blocklabel' }, 'Общие переключатели'),
        React.createElement('div', { className: 'fpt-card' },
          React.createElement(ToggleRow, { icon: 'BarChart3', title: 'Статистика продаж в разделе «Продажи»', on: tog.stats, onToggle: () => setTog({ ...tog, stats: !tog.stats }) }),
          React.createElement('div', { className: 'hr' }),
          React.createElement(ToggleRow, { icon: 'EyeOff', title: 'Скрывать баланс', on: tog.hideBal, onToggle: () => setTog({ ...tog, hideBal: !tog.hideBal }) }),
          React.createElement('div', { className: 'hr' }),
          React.createElement(ToggleRow, { icon: 'Sparkles', title: 'Иконки промо-лотов', on: tog.promo, onToggle: () => setTog({ ...tog, promo: !tog.promo }) }),
        ),
      )
    );
  }

  function CurrencyPage() {
    const [amt, setAmt] = useState(100);
    const rate = 91.4;
    return (
      React.createElement('div', { className: 'fpt-page' },
        React.createElement(PageHead, { title: 'Калькулятор валют', desc: 'Курсы обновляются раз в день через открытый API.' }),
        React.createElement('div', { className: 'fpt-card fpt-cur' },
          React.createElement('div', { className: 'fpt-cur-row' },
            React.createElement('input', { className: 'input input-lg mono', type: 'number', value: amt, onChange: (e) => setAmt(parseFloat(e.target.value) || 0) }),
            React.createElement('div', { className: 'fpt-cur-sel' }, 'USD ', React.createElement(Icon, { name: 'ChevronDown', size: 15 })),
          ),
          React.createElement('div', { className: 'fpt-cur-mid' },
            React.createElement('span', { className: 'fpt-cur-swap' }, React.createElement(Icon, { name: 'ArrowUpDown', size: 16 })),
            React.createElement('span', { className: 'fpt-cur-rate mono faint' }, '1 USD ≈ ', rate, ' RUB'),
          ),
          React.createElement('div', { className: 'fpt-cur-row' },
            React.createElement('input', { className: 'input input-lg mono', readOnly: true, value: (amt * rate).toFixed(2) }),
            React.createElement('div', { className: 'fpt-cur-sel' }, 'RUB ', React.createElement(Icon, { name: 'ChevronDown', size: 15 })),
          ),
        ),
      )
    );
  }

  function SettingsPage() {
    const [sound, setSound] = useState('VK');
    const [vol, setVol] = useState(100);
    return (
      React.createElement('div', { className: 'fpt-page' },
        React.createElement(PageHead, { title: 'Настройки уведомлений', desc: 'Звук и поведение оповещений о новых сообщениях и заказах.' }),
        React.createElement('div', { className: 'eyebrow fpt-blocklabel' }, 'Звук уведомления'),
        React.createElement('div', { className: 'fpt-soundgrid' },
          D.NOTIF_SOUNDS.map((s) =>
            React.createElement('button', { key: s, className: 'fpt-soundchip' + (sound === s ? ' is-active' : ''), onClick: () => setSound(s) },
              React.createElement('span', { className: 'fpt-radio' + (sound === s ? ' on' : '') }),
              s)),
        ),
        React.createElement('div', { className: 'eyebrow fpt-blocklabel' }, 'Громкость'),
        React.createElement('div', { className: 'fpt-card fpt-vol' },
          React.createElement('input', { className: 'fpt-range', type: 'range', min: 0, max: 100, value: vol, onChange: (e) => setVol(+e.target.value), style: { '--p': vol + '%' } }),
          React.createElement('span', { className: 'fpt-vol-v mono' }, vol, '%'),
          React.createElement('button', { className: 'btn btn-soft btn-sm btn-icon' }, React.createElement(Icon, { name: 'Play', size: 15 })),
        ),
        React.createElement('div', { className: 'eyebrow fpt-blocklabel' }, 'Уведомления в Discord'),
        React.createElement('div', { className: 'fpt-card' },
          React.createElement(ToggleRow, { icon: 'Bell', title: 'Дублировать новые сообщения в Discord', desc: 'Через вебхук вашего сервера', on: false }),
        ),
      )
    );
  }

  function AppearancePage({ tweaks, setTweak, fonts, wallpapers }) {
    const themes = [
      { id: 'graphite', label: 'Графит' }, { id: 'obsidian', label: 'Обсидиан' },
      { id: 'slate', label: 'Сине-серый' }, { id: 'light', label: 'Светлая' },
    ];
    const accents = ['#5b86d8', '#6b7280', '#3f9e7c', '#8b7fd0', '#c2703d'];
    return (
      React.createElement('div', { className: 'fpt-page' },
        React.createElement(PageHead, { title: 'Оформление', desc: 'Тема, обои и типографика. Применяется ко всему интерфейсу FunPay и FP Tools.' }),
        React.createElement('div', { className: 'eyebrow fpt-blocklabel' }, 'Тема'),
        React.createElement('div', { className: 'fpt-themes' },
          themes.map((th) =>
            React.createElement('button', { key: th.id, className: 'fpt-theme' + (tweaks.theme === th.id ? ' is-active' : ''), onClick: () => setTweak('theme', th.id) },
              React.createElement('span', { className: 'fpt-theme-prev', 'data-t': th.id }),
              React.createElement('span', { className: 'fpt-theme-label' }, th.label),
            )),
        ),
        React.createElement('div', { className: 'eyebrow fpt-blocklabel' }, 'Обои'),
        React.createElement('div', { className: 'fpt-walls' },
          wallpapers.map((w) =>
            React.createElement('button', { key: w.id, className: 'fpt-wall' + (tweaks.wallpaper === w.id ? ' is-active' : ''), onClick: () => setTweak('wallpaper', w.id) },
              React.createElement('span', { className: 'fpt-wall-prev wall-' + w.id }),
              React.createElement('span', { className: 'fpt-wall-label' }, w.label,
                /live/.test(w.label) ? React.createElement('span', { className: 'fpt-live' }, 'live') : null),
            )),
        ),
        React.createElement('div', { className: 'fpt-upload' },
          React.createElement(Icon, { name: 'ImagePlus', size: 17 }),
          React.createElement('span', null, 'Загрузить своё фото или видео-обои'),
          React.createElement('span', { className: 'btn btn-soft btn-sm' }, 'Выбрать файл'),
        ),
        React.createElement('div', { className: 'eyebrow fpt-blocklabel' }, 'Акцент'),
        React.createElement('div', { className: 'fpt-accents' },
          accents.map((a) =>
            React.createElement('button', { key: a, className: 'fpt-accent' + (tweaks.accent === a ? ' is-active' : ''), style: { '--sw': a }, onClick: () => setTweak('accent', a) })),
        ),
        React.createElement('div', { className: 'eyebrow fpt-blocklabel' }, 'Шрифт'),
        React.createElement('div', { className: 'fpt-fonts' },
          [['geist', 'Geist', 'Suisse-подобный гротеск'], ['grotesk', 'Space Grotesk', 'Геометрический, характерный'], ['mixed', 'Clash + Geist', 'Дисплейный заголовок']].map(([id, name, note]) =>
            React.createElement('button', { key: id, className: 'fpt-font' + (tweaks.font === id ? ' is-active' : ''), onClick: () => setTweak('font', id), style: { fontFamily: fonts[id].disp } },
              React.createElement('span', { className: 'fpt-font-aa' }, 'Aa'),
              React.createElement('span', { className: 'fpt-font-name' }, name),
              React.createElement('span', { className: 'fpt-font-note' }, note))),
        ),
      )
    );
  }

  // generic but intentional scaffold for the remaining tools
  function FeaturePage({ icon, title, desc, primary, status, body }) {
    return (
      React.createElement('div', { className: 'fpt-page' },
        React.createElement(PageHead, {
          title, desc,
          action: primary ? React.createElement('button', { className: 'btn btn-primary' },
            React.createElement(Icon, { name: primary.icon, size: 16 }), primary.label) : null,
        }),
        status ? React.createElement('div', { className: 'fpt-status' },
          React.createElement('span', { className: 'fpt-status-dot ' + (status.on ? 'on' : '') }),
          React.createElement('span', null, status.text)) : null,
        body || null,
      )
    );
  }

  function pageFor(id, ctx) {
    switch (id) {
      case 'home': return React.createElement(OverviewPage, { go: ctx.go });
      case 'currency': return React.createElement(CurrencyPage);
      case 'settings': return React.createElement(SettingsPage);
      case 'appearance': return React.createElement(AppearancePage, ctx);
      case 'lots': return React.createElement(FeaturePage, {
        title: 'Лоты', desc: 'Экспорт, импорт, массовое редактирование и клонирование лотов.',
        primary: { icon: 'Pencil', label: 'Массово изменить' },
        status: { on: true, text: 'Управление выделением и действиями доступно на странице профиля.' },
        body: React.createElement('div', { className: 'fpt-twocol' },
          [['Upload', 'Импорт из файла', 'Перенести лоты с другого аккаунта'],
           ['Download', 'Экспорт в файл', 'Сохранить копию всех лотов'],
           ['Copy', 'Клонировать лот', 'Создать дубликат с новыми параметрами'],
           ['ListChecks', 'Массовое редактирование', 'Название, описание, цена сразу у многих']].map(([ic, t, d]) =>
            React.createElement('button', { key: t, className: 'fpt-tile' },
              React.createElement('span', { className: 'fpt-tile-ic' }, React.createElement(Icon, { name: ic, size: 18 })),
              React.createElement('span', { className: 'fpt-tile-t' }, t),
              React.createElement('span', { className: 'fpt-tile-d' }, d))),
        ),
      });
      case 'autobump': return React.createElement(FeaturePage, {
        title: 'Авто-поднятие', desc: 'Автоматически поднимает выбранные категории, как только истекает таймер.',
        primary: { icon: 'Plus', label: 'Выбрать категории' },
        status: { on: true, text: 'Активно · 6 категорий · следующее поднятие через 14 мин' },
        body: React.createElement('div', { className: 'fpt-console' },
          ['[12:04] Поднято: ChatGPT — Аккаунты', '[12:04] Поднято: DBD — Прочее', '[11:50] Ожидание таймера…'].map((l, i) =>
            React.createElement('div', { key: i, className: 'fpt-console-line mono' }, l))),
      });
      case 'delivery': return React.createElement(FeaturePage, {
        title: 'Авто-выдача', desc: 'Мгновенно отправляет товар покупателю после оплаты.',
        primary: { icon: 'Plus', label: 'Новое правило' },
        status: { on: true, text: 'Активно для 32 лотов' },
      });
      case 'templates': return React.createElement(FeaturePage, {
        title: 'Шаблоны ответов', desc: 'Готовые сообщения с переменными для быстрых ответов в чате.',
        primary: { icon: 'Plus', label: 'Новый шаблон' },
        body: React.createElement('div', { className: 'fpt-card' },
          [['Приветствие', 'Здравствуйте, {buyer}! Отвечу в течение пары минут.'],
           ['Выдача', 'Спасибо за заказ! Ваши данные: {data}'],
           ['Отзыв', 'Буду благодарен за отзыв — это очень помогает.']].map(([t, b], i, a) =>
            React.createElement('div', { key: t },
              React.createElement('div', { className: 'fpt-tpl' },
                React.createElement('div', { className: 'fpt-tpl-txt' },
                  React.createElement('span', { className: 'fpt-tpl-name' }, t),
                  React.createElement('span', { className: 'fpt-tpl-body' }, b)),
                React.createElement('button', { className: 'btn btn-quiet btn-sm btn-icon' }, React.createElement(Icon, { name: 'Pencil', size: 15 }))),
              i < a.length - 1 ? React.createElement('div', { className: 'hr' }) : null))),
      });
      case 'replies': return React.createElement(FeaturePage, {
        title: 'Авто-ответы', desc: 'Автоматический ответ на отзывы и первое сообщение покупателя.',
        primary: { icon: 'Plus', label: 'Новое правило' }, status: { on: true, text: 'Включено · 3 правила' },
      });
      case 'commands': return React.createElement(FeaturePage, {
        title: 'Слэш-команды', desc: 'Быстрые подстановки текста в поле чата по «/команде».',
        primary: { icon: 'Plus', label: 'Добавить команду' },
      });
      case 'blacklist': return React.createElement(FeaturePage, {
        title: 'Чёрный список', desc: 'Покупатели, для которых отключены отдельные действия и авто-выдача.',
        primary: { icon: 'UserPlus', label: 'Добавить' }, status: { on: false, text: 'В списке: 2 покупателя' },
      });
      case 'piggy': return React.createElement(FeaturePage, {
        title: 'Копилки', desc: 'Финансовые цели: откладывайте процент с каждой продажи.',
        primary: { icon: 'Plus', label: 'Новая цель' },
      });
      case 'calc': return React.createElement(FeaturePage, {
        title: 'Калькулятор', desc: 'Расчёт комиссии, прибыли и итоговой цены лота.',
      });
      case 'accounts': return React.createElement(FeaturePage, {
        title: 'Аккаунты', desc: 'Быстрое переключение между сохранёнными аккаунтами FunPay.',
        primary: { icon: 'Plus', label: 'Добавить аккаунт' }, status: { on: true, text: 'Активен: Vidali' },
      });
      default: return React.createElement(FeaturePage, { title: id, desc: 'Раздел в разработке.' });
    }
  }

  /* ---------- window ---------- */
  function FPTools({ onClose, tweaks, setTweak, fonts, wallpapers }) {
    const [page, setPage] = useState('home');
    const [q, setQ] = useState('');
    const flat = D.FPNAV.flatMap((g) => g.items);
    const filtered = q ? flat.filter((i) => i.label.toLowerCase().includes(q.toLowerCase())) : null;
    return (
      React.createElement('div', { className: 'fpt-overlay', onMouseDown: (e) => { if (e.target.classList.contains('fpt-overlay')) onClose(); } },
        React.createElement('div', { className: 'fpt-window card-glass' },
          React.createElement('div', { className: 'fpt-titlebar' },
            React.createElement('div', { className: 'fpt-titlebar-l' },
              React.createElement('span', { className: 'fp-tools-launch-mark' }, React.createElement('span', null, 'F'), React.createElement('span', null, 'P')),
              React.createElement('span', { className: 'fpt-titlebar-name' }, 'FP Tools'),
              React.createElement('span', { className: 'badge badge-muted' }, 'v3.0'),
            ),
            React.createElement('div', { className: 'fpt-titlebar-r' },
              React.createElement('button', { className: 'btn btn-quiet btn-sm btn-icon', title: 'Свернуть' }, React.createElement(Icon, { name: 'Minus', size: 16 })),
              React.createElement('button', { className: 'btn btn-quiet btn-sm btn-icon', onClick: onClose, title: 'Закрыть' }, React.createElement(Icon, { name: 'X', size: 16 })),
            ),
          ),
          React.createElement('div', { className: 'fpt-main' },
            React.createElement('nav', { className: 'fpt-nav fpx-scroll' },
              React.createElement('div', { className: 'fpt-search' },
                React.createElement(Icon, { name: 'Search', size: 15 }),
                React.createElement('input', { value: q, onChange: (e) => setQ(e.target.value), placeholder: 'Поиск по функциям' })),
              filtered
                ? React.createElement('div', { className: 'fpt-navgroup' },
                    filtered.length === 0 ? React.createElement('div', { className: 'fpt-navempty' }, 'Ничего не найдено')
                    : filtered.map((it) => navItem(it, page, setPage, setQ)))
                : D.FPNAV.map((g) =>
                    React.createElement('div', { key: g.group, className: 'fpt-navgroup' },
                      React.createElement('div', { className: 'fpt-navlabel eyebrow' }, g.group),
                      g.items.map((it) => navItem(it, page, setPage, setQ)))),
            ),
            React.createElement('main', { className: 'fpt-content fpx-scroll' },
              pageFor(page, { go: setPage, tweaks, setTweak, fonts, wallpapers }),
            ),
          ),
        ),
      )
    );
  }

  function navItem(it, page, setPage, setQ) {
    return React.createElement('button', {
      key: it.id, className: 'fpt-navitem' + (page === it.id ? ' is-active' : ''),
      onClick: () => { setPage(it.id); setQ(''); },
    },
      React.createElement(Icon, { name: it.icon, size: 17 }),
      React.createElement('span', null, it.label));
  }

  window.FPTools = FPTools;
})();
