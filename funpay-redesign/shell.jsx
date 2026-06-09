// shell.jsx — FunPay top bar (restyled) with working nav dropdowns + balance toggle.
(function () {
  const { useState, useRef, useEffect } = React;
  const Icon = window.Icon;

  function FunpayMark() {
    return (
      React.createElement('div', { className: 'fp-brand', 'aria-label': 'FunPay' },
        React.createElement('span', null, 'FUN'),
        React.createElement('span', { className: 'fp-brand-dot' }),
        React.createElement('span', null, 'PAY'),
      )
    );
  }

  function ToolsLauncher({ onOpen, active }) {
    return (
      React.createElement('button', { className: 'fp-tools-launch' + (active ? ' is-active' : ''), onClick: onOpen },
        React.createElement('span', { className: 'fp-tools-launch-mark' },
          React.createElement('span', null, 'F'), React.createElement('span', null, 'P')),
        React.createElement('span', { className: 'fp-tools-launch-label' }, 'Tools'),
      )
    );
  }

  function MenuBody({ id, balanceHidden }) {
    if (id === 'Покупки') return menuList('Недавние покупки', [
      ['Discord Nitro · 1 мес', '349 ₽', 'Выполнен'],
      ['Steam · пополнение 500', '520 ₽', 'Выполнен'],
    ], 'Все покупки');
    if (id === 'Продажи') return menuList('Продажи сегодня', [
      ['Brawl · 30k кубков', '2 100 ₽', 'Новый'],
      ['ChatGPT Plus · 30 дней', '189 ₽', 'Оплачен'],
      ['DBD · снятие HWID', '961 ₽', 'Выдан'],
    ], 'Все продажи');
    if (id === 'Сообщения') return chatMenu();
    if (id === 'Финансы') return financeMenu(balanceHidden);
    return null;
  }

  function menuList(title, rows, cta) {
    return React.createElement('div', { className: 'fp-menu' },
      React.createElement('div', { className: 'fp-menu-head eyebrow' }, title),
      rows.map((r, i) =>
        React.createElement('div', { key: i, className: 'fp-menu-row' },
          React.createElement('span', { className: 'fp-menu-name' }, r[0]),
          React.createElement('span', { className: 'fp-menu-r' },
            React.createElement('span', { className: 'mono fp-menu-amt' }, r[1]),
            React.createElement('span', { className: 'fp-menu-tag' }, r[2])))),
      React.createElement('button', { className: 'fp-menu-cta' }, cta, React.createElement(Icon, { name: 'ArrowRight', size: 14 })),
    );
  }

  function chatMenu() {
    const chats = [
      ['sergey543522f', 'Оплатил, жду выдачу', 'S', true],
      ['molekylaswag', 'Здравствуйте! Я отвечу вам…', 'M', false],
      ['Zombak', 'спасибо, всё пришло', 'Z', false],
    ];
    return React.createElement('div', { className: 'fp-menu' },
      React.createElement('div', { className: 'fp-menu-head eyebrow' }, 'Сообщения'),
      chats.map((c, i) =>
        React.createElement('div', { key: i, className: 'fp-chatrow' },
          React.createElement('span', { className: 'fp-chatrow-av' }, c[2], c[3] ? React.createElement('span', { className: 'fp-chatrow-unread' }) : null),
          React.createElement('span', { className: 'fp-chatrow-txt' },
            React.createElement('span', { className: 'fp-chatrow-name' }, c[0]),
            React.createElement('span', { className: 'fp-chatrow-last faint' }, c[1])))),
      React.createElement('button', { className: 'fp-menu-cta' }, 'Открыть чат', React.createElement(Icon, { name: 'ArrowRight', size: 14 })),
    );
  }

  function financeMenu(hidden) {
    return React.createElement('div', { className: 'fp-menu fp-menu-fin' },
      React.createElement('div', { className: 'fp-fin-bal' },
        React.createElement('span', { className: 'eyebrow' }, 'Доступно к выводу'),
        React.createElement('span', { className: 'fp-fin-amt mono' }, hidden ? '••••• ₽' : '24 180 ₽')),
      React.createElement('div', { className: 'fp-fin-grid' },
        React.createElement('div', null, React.createElement('span', { className: 'faint' }, 'В обороте'), React.createElement('span', { className: 'mono' }, hidden ? '••••' : '8 400 ₽')),
        React.createElement('div', null, React.createElement('span', { className: 'faint' }, 'За месяц'), React.createElement('span', { className: 'mono' }, hidden ? '••••' : '186 220 ₽'))),
      React.createElement('button', { className: 'btn btn-primary btn-sm', style: { width: '100%' } },
        React.createElement(Icon, { name: 'Wallet', size: 15 }), 'Вывести средства'),
    );
  }

  function FunpayHeader({ onOpenTools, toolsActive, balanceHidden, onToggleBalance }) {
    const [open, setOpen] = useState(null);
    const wrapRef = useRef(null);
    useEffect(() => {
      const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(null); };
      document.addEventListener('mousedown', h);
      return () => document.removeEventListener('mousedown', h);
    }, []);
    const navMid = ['Продавец', 'Помощь', 'Игры'];
    const navRight = [
      { label: 'Покупки' }, { label: 'Продажи', n: 1 },
      { label: 'Сообщения', n: 3 }, { label: 'Финансы' },
    ];
    const toggle = (id) => setOpen((o) => (o === id ? null : id));

    return (
      React.createElement('header', { className: 'fp-header', ref: wrapRef },
        React.createElement('div', { className: 'fp-header-inner' },
          React.createElement('div', { className: 'fp-header-left' },
            React.createElement(FunpayMark),
            React.createElement('div', { className: 'fp-search' },
              React.createElement(Icon, { name: 'Search', size: 16 }),
              React.createElement('input', { className: 'fp-search-input', placeholder: 'Поиск по 830 играм', readOnly: true }),
            ),
          ),
          React.createElement('nav', { className: 'fp-nav-mid' },
            navMid.map((l) =>
              React.createElement('button', { key: l, className: 'fp-nav-link', onClick: () => toggle(l) },
                l, React.createElement(Icon, { name: 'ChevronDown', size: 14, className: 'fp-nav-caret' + (open === l ? ' open' : '') }),
              )
            ),
          ),
          React.createElement('div', { className: 'fp-header-right' },
            navRight.map((it) =>
              React.createElement('div', { key: it.label, className: 'fp-nav-wrap' },
                React.createElement('button', { className: 'fp-nav-link' + (open === it.label ? ' is-current' : ''), onClick: () => toggle(it.label) },
                  it.label,
                  it.n ? React.createElement('span', { className: 'fp-pill' }, it.n) : null,
                ),
                open === it.label ? React.createElement('div', { className: 'fp-dropdown card-glass' },
                  React.createElement(MenuBody, { id: it.label, balanceHidden })) : null,
              )
            ),
            React.createElement('div', { className: 'fp-balance' },
              React.createElement('span', { className: 'mono' }, balanceHidden ? '••••• ₽' : '24 180 ₽'),
              React.createElement('button', { className: 'fp-balance-eye', onClick: onToggleBalance, title: balanceHidden ? 'Показать баланс' : 'Скрыть баланс' },
                React.createElement(Icon, { name: balanceHidden ? 'EyeOff' : 'Eye', size: 15 })),
            ),
            React.createElement('div', { className: 'fp-avatar' },
              React.createElement('div', { className: 'fp-avatar-img' }, 'V'),
              React.createElement('span', { className: 'fp-avatar-online' }),
            ),
            React.createElement(ToolsLauncher, { onOpen: onOpenTools, active: toolsActive }),
          ),
        ),
      )
    );
  }

  window.FunpayHeader = FunpayHeader;
  window.FunpayMark = FunpayMark;
})();
