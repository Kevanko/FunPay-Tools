// home.jsx — redesigned FunPay homepage.
(function () {
  const { useState } = React;
  const Icon = window.Icon;
  const D = window.FPX_DATA;

  // real favicon with monogram fallback
  function GameIcon({ g, size = 46 }) {
    const [failed, setFailed] = useState(false);
    const src = `https://www.google.com/s2/favicons?sz=64&domain=${g.domain}`;
    return (
      React.createElement('div', { className: 'gcard-mark' },
        failed
          ? React.createElement('span', { className: 'mono gcard-mono' }, g.mark)
          : React.createElement('img', {
              className: 'gcard-favicon', src, alt: g.name, loading: 'lazy',
              onError: () => setFailed(true),
            })
      )
    );
  }

  function Stat({ label, value, sub, trend, hidden, onToggle }) {
    return (
      React.createElement('div', { className: 'cc-stat' },
        React.createElement('div', { className: 'cc-stat-top' },
          React.createElement('span', { className: 'cc-stat-label eyebrow' }, label),
          onToggle ? React.createElement('button', { className: 'cc-eye', onClick: onToggle, title: hidden ? 'Показать' : 'Скрыть' },
            React.createElement(Icon, { name: hidden ? 'EyeOff' : 'Eye', size: 14 })) : null,
        ),
        React.createElement('div', { className: 'cc-stat-value mono' }, hidden ? '••••• ₽' : value),
        React.createElement('div', { className: 'cc-stat-sub' },
          trend ? React.createElement('span', { className: 'cc-trend ' + (trend > 0 ? 'up' : 'down') },
            React.createElement(Icon, { name: trend > 0 ? 'TrendingUp' : 'TrendingDown', size: 13 }),
            (trend > 0 ? '+' : '') + trend + '%') : null,
          React.createElement('span', { className: 'faint' }, sub),
        ),
      )
    );
  }

  // collapsible chat rail (replaces the old standalone chat — now docked + useful)
  function ChatRail() {
    const [open, setOpen] = useState(false);
    const [autoRead, setAutoRead] = useState(true);
    const [draft, setDraft] = useState('');
    const [polished, setPolished] = useState(false);
    const templates = ['Приветствие', 'Заказ выполнен', 'Попросить отзыв', 'Спасибо'];
    const msgs = [
      { who: 'in', text: 'Здравствуйте! Аккаунт ещё в наличии?', t: '09:52' },
      { who: 'out', text: 'Здравствуйте! Да, в наличии — оформляйте заказ.', t: '09:52', auto: true },
      { who: 'in', text: 'Оплатил, жду выдачу', t: '09:54' },
      { who: 'out', text: 'Спасибо за заказ! Данные отправил выше.', t: '09:54', auto: true },
    ];
    const aiPolish = () => {
      if (!draft.trim()) return;
      setPolished(true);
      setDraft('Здравствуйте! Благодарю за обращение — отвечу в течение пары минут и помогу с заказом.');
      setTimeout(() => setPolished(false), 1400);
    };
    return (
      React.createElement('div', { className: 'cc-chat' + (open ? ' is-open' : '') },
        !open
          ? React.createElement('button', { className: 'cc-chat-tab', onClick: () => setOpen(true) },
              React.createElement('span', { className: 'cc-chat-tab-ic' },
                React.createElement(Icon, { name: 'MessageSquare', size: 17 }),
                React.createElement('span', { className: 'cc-chat-badge mono' }, '3')),
              React.createElement('span', { className: 'cc-chat-tab-label' }, 'Чат'),
            )
          : React.createElement(React.Fragment, null,
              React.createElement('div', { className: 'cc-chat-head' },
                React.createElement('div', { className: 'cc-chat-peer' },
                  React.createElement('span', { className: 'cc-chat-av' }, '#'),
                  React.createElement('div', { className: 'cc-chat-peer-txt' },
                    React.createElement('span', { className: 'cc-chat-name' }, 'Покупатель #184'),
                    React.createElement('span', { className: 'cc-chat-auto' },
                      React.createElement('span', { className: 'cc-dot-live' }), 'Авто-ответы включены')),
                ),
                React.createElement('button', { className: 'btn btn-quiet btn-sm btn-icon', onClick: () => setOpen(false) },
                  React.createElement(Icon, { name: 'ChevronsRight', size: 16 })),
              ),
              React.createElement('div', { className: 'cc-chat-msgs fpx-scroll' },
                msgs.map((m, i) =>
                  React.createElement('div', { key: i, className: 'cc-msg cc-msg-' + m.who },
                    React.createElement('span', { className: 'cc-msg-bubble' }, m.text),
                    React.createElement('span', { className: 'cc-msg-meta faint' },
                      m.auto ? React.createElement('span', { className: 'cc-msg-auto' },
                        React.createElement(Icon, { name: 'Zap', size: 10 }), 'авто') : null,
                      m.t,
                      m.who === 'out' ? React.createElement(Icon, { name: autoRead ? 'CheckCheck' : 'Check', size: 13, className: 'cc-msg-read' }) : null),
                  )),
              ),
              React.createElement('div', { className: 'cc-chat-templates' },
                templates.map((t) => React.createElement('button', { key: t, className: 'cc-tpl-chip', onClick: () => setDraft(t === 'Приветствие' ? 'Здравствуйте! Чем могу помочь?' : t) }, t)),
              ),
              React.createElement('div', { className: 'cc-chat-input' },
                React.createElement('input', { value: draft, onChange: (e) => setDraft(e.target.value), placeholder: 'Сообщение…' }),
                React.createElement('button', { className: 'cc-ai-btn' + (polished ? ' busy' : ''), onClick: aiPolish, title: 'ИИ: улучшить текст' },
                  React.createElement(Icon, { name: 'Sparkles', size: 15 })),
                React.createElement('button', { className: 'cc-send-btn' }, React.createElement(Icon, { name: 'ArrowUp', size: 16 })),
              ),
              React.createElement('div', { className: 'cc-chat-foot' },
                React.createElement('label', { className: 'cc-foot-toggle' },
                  React.createElement('span', { className: 'tgl', 'data-on': String(autoRead), onClick: () => setAutoRead(!autoRead) }),
                  'Авто-прочтение'),
                React.createElement('span', { className: 'faint cc-foot-hint' },
                  React.createElement(Icon, { name: 'Languages', size: 13 }), 'Авто-перевод EN'),
              ),
            ),
      )
    );
  }

  function ControlCenter({ onOpenTools, balanceHidden, onToggleBalance }) {
    const actions = [
      { icon: 'ArrowUpNarrowWide', label: 'Поднять все лоты', meta: 'через 14 мин', on: true },
      { icon: 'Zap', label: 'Авто-выдача', meta: '32 лота активно', on: true },
      { icon: 'MessageSquareText', label: 'Авто-ответы', meta: 'включены', on: true },
      { icon: 'ShieldCheck', label: 'Защита от просадки', meta: 'мониторинг цен', on: false },
    ];
    const orders = [
      { id: '#FP-90241', name: 'ChatGPT Plus · 30 дней', amt: '189 ₽', status: 'Оплачен', tone: 'ok' },
      { id: '#FP-90238', name: 'DBD · снятие HWID', amt: '961 ₽', status: 'Выдан', tone: 'done' },
      { id: '#FP-90235', name: 'Brawl · 30k кубков', amt: '2 100 ₽', status: 'Новый', tone: 'new' },
    ];
    return (
      React.createElement('section', { className: 'cc card-glass' },
        React.createElement('div', { className: 'cc-left' },
          React.createElement('div', { className: 'cc-head' },
            React.createElement('div', { className: 'cc-head-l' },
              React.createElement('div', { className: 'cc-badge' },
                React.createElement(Icon, { name: 'Activity', size: 14 })),
              React.createElement('div', null,
                React.createElement('div', { className: 'cc-title' }, 'Командный центр'),
                React.createElement('div', { className: 'cc-sub faint' }, 'Сводка за сегодня · обновлено только что'),
              ),
            ),
            React.createElement('button', { className: 'btn btn-soft btn-sm', onClick: onOpenTools },
              'Открыть FP Tools', React.createElement(Icon, { name: 'ArrowUpRight', size: 15 })),
          ),
          React.createElement('div', { className: 'cc-stats' },
            React.createElement(Stat, { label: 'Продажи', value: '14 320 ₽', sub: 'сегодня', trend: 18 }),
            React.createElement(Stat, { label: 'Заказов', value: '23', sub: '4 в работе', trend: 9 }),
            React.createElement(Stat, { label: 'Баланс', value: '24 180 ₽', sub: 'к выводу', hidden: balanceHidden, onToggle: onToggleBalance }),
          ),
          React.createElement('div', { className: 'cc-body' },
            React.createElement('div', { className: 'cc-actions' },
              React.createElement('div', { className: 'cc-colhead eyebrow' }, 'Автоматизация'),
              actions.map((a) =>
                React.createElement('button', { key: a.label, className: 'cc-action' },
                  React.createElement('span', { className: 'cc-action-ic' }, React.createElement(Icon, { name: a.icon, size: 17 })),
                  React.createElement('span', { className: 'cc-action-txt' },
                    React.createElement('span', { className: 'cc-action-label' }, a.label),
                    React.createElement('span', { className: 'cc-action-meta faint' }, a.meta),
                  ),
                  React.createElement('span', { className: 'tgl', 'data-on': String(a.on) }),
                )
              ),
            ),
            React.createElement('div', { className: 'cc-orders' },
              React.createElement('div', { className: 'cc-colhead eyebrow' }, 'Последние заказы'),
              orders.map((o) =>
                React.createElement('div', { key: o.id, className: 'cc-order' },
                  React.createElement('div', { className: 'cc-order-main' },
                    React.createElement('span', { className: 'cc-order-id mono faint' }, o.id),
                    React.createElement('span', { className: 'cc-order-name' }, o.name),
                  ),
                  React.createElement('div', { className: 'cc-order-r' },
                    React.createElement('span', { className: 'cc-order-amt mono' }, o.amt),
                    React.createElement('span', { className: 'cc-status cc-status-' + o.tone }, o.status),
                  ),
                )
              ),
            ),
          ),
        ),
        React.createElement(ChatRail, null),
      )
    );
  }

  function GameCard({ g, hot }) {
    return (
      React.createElement('a', { className: 'gcard' },
        React.createElement('div', { className: 'gcard-top' },
          React.createElement(GameIcon, { g }),
          React.createElement('div', { className: 'gcard-titlewrap' },
            React.createElement('div', { className: 'gcard-title' }, g.name),
            React.createElement('div', { className: 'gcard-meta faint' },
              hot ? React.createElement('span', { className: 'gcard-hot' },
                React.createElement(Icon, { name: 'Flame', size: 12 }), 'Популярно') : null,
              React.createElement('span', { className: 'mono' }, (120 + g.name.length * 37), ' предложений'),
            ),
          ),
          React.createElement(Icon, { name: 'ArrowUpRight', size: 16, className: 'gcard-go' }),
        ),
        React.createElement('div', { className: 'gcard-cats' },
          g.cats.map((c) => React.createElement('span', { key: c, className: 'gcard-cat' }, c)),
        ),
      )
    );
  }

  function Home({ onOpenTools, balanceHidden, onToggleBalance }) {
    const [q, setQ] = useState('');
    const list = D.GAMES.filter((g) =>
      !q || g.name.toLowerCase().includes(q.toLowerCase()) ||
      g.cats.some((c) => c.toLowerCase().includes(q.toLowerCase())));
    return (
      React.createElement('div', { className: 'home fpx-scroll' },
        React.createElement('div', { className: 'home-inner' },
          React.createElement('div', { className: 'home-hero' },
            React.createElement('div', { className: 'home-hero-text' },
              React.createElement('div', { className: 'home-eyebrow eyebrow' }, 'FunPay · кабинет продавца'),
              React.createElement('h1', { className: 'home-h1' }, 'С возвращением'),
              React.createElement('p', { className: 'home-lead' },
                'Биржа игровых ценностей без визуального шума. Всё, что нужно для торговли — в одном спокойном интерфейсе.'),
            ),
          ),
          React.createElement(ControlCenter, { onOpenTools, balanceHidden, onToggleBalance }),
          React.createElement('div', { className: 'home-catalog' },
            React.createElement('div', { className: 'home-cat-head' },
              React.createElement('div', null,
                React.createElement('h2', { className: 'home-h2' }, 'Каталог игр'),
                React.createElement('p', { className: 'faint home-h2-sub' }, '830 игр и сервисов · обновляется в реальном времени'),
              ),
              React.createElement('div', { className: 'home-search' },
                React.createElement(Icon, { name: 'Search', size: 17 }),
                React.createElement('input', {
                  className: 'home-search-input', value: q, onChange: (e) => setQ(e.target.value),
                  placeholder: 'Начните вводить название игры или категории…',
                }),
                q ? React.createElement('button', { className: 'home-search-x', onClick: () => setQ('') },
                  React.createElement(Icon, { name: 'X', size: 15 })) : null,
              ),
            ),
            React.createElement('div', { className: 'gcards' },
              list.map((g) => React.createElement(GameCard, { key: g.name, g, hot: D.HOT.includes(g.name) })),
            ),
            list.length === 0 ? React.createElement('div', { className: 'home-empty' },
              React.createElement(Icon, { name: 'SearchX', size: 22 }),
              React.createElement('span', null, 'Ничего не нашлось по запросу «', q, '»')) : null,
          ),
        ),
      )
    );
  }

  window.Home = Home;
})();
