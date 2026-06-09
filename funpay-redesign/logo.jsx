// logo.jsx — FP Tools identity exploration (wordmark + marks).
(function () {
  const Icon = window.Icon;

  // ---- the marks (geometry only: squares, hexagon, dot, slash — no illustration) ----
  const Marks = {
    tile: () => React.createElement('span', { className: 'mk mk-tile mono' }, 'FP'),
    outline: () => React.createElement('span', { className: 'mk mk-outline mono' }, 'FP'),
    hex: () => React.createElement('span', { className: 'mk mk-hex' }, React.createElement('span', { className: 'mono' }, 'FP')),
    slash: () => React.createElement('span', { className: 'mk mk-slash mono' },
      React.createElement('span', null, 'F'), React.createElement('span', { className: 'mk-slash-bar' }), React.createElement('span', null, 'P')),
    dot: () => React.createElement('span', { className: 'mk mk-dot' },
      'fp', React.createElement('span', { className: 'mk-dot-d' }), React.createElement('span', { className: 'mk-dot-t' }, 'tools')),
    stack: () => React.createElement('span', { className: 'mk mk-stack mono' },
      React.createElement('b', null, 'FP'), React.createElement('span', null, 'TOOLS')),
  };

  const CONCEPTS = [
    { id: 'tile', name: 'Монограмма', note: 'Скруглённый тайл, акцентная плашка. Основной знак — компактный, читаемый в шапке.' },
    { id: 'outline', name: 'Контур', note: 'Тот же тайл, но обводкой. Тише, для светлой темы и водяных знаков.' },
    { id: 'hex', name: 'Гексагон', note: 'Грань-метка. Технологичный, «инструментальный» характер.' },
    { id: 'slash', name: 'Слэш', note: 'F / P через акцентную черту. Намёк на слэш-команды.' },
    { id: 'dot', name: 'Точка', note: 'Строчный логотип с акцентной точкой. Для подвалов и текста.' },
    { id: 'stack', name: 'Стек', note: 'FP над TOOLS. Для аватара расширения и сторов.' },
  ];

  function LogoLab() {
    return (
      React.createElement('div', { className: 'logo-lab fpx-scroll' },
        React.createElement('div', { className: 'logo-inner' },
          React.createElement('div', { className: 'logo-hero' },
            React.createElement('div', { className: 'eyebrow', style: { color: 'var(--accent)' } }, 'Айдентика · FP Tools'),
            React.createElement('h1', { className: 'logo-h1' }, 'Знак и логотип'),
            React.createElement('p', { className: 'logo-lead' },
              'Монохром + один акцент. Геометрия вместо иллюстрации. Знак работает в шапке FunPay, в окне инструментов и как иконка расширения.'),
          ),

          // primary lockup
          React.createElement('div', { className: 'logo-primary card' },
            React.createElement('div', { className: 'logo-primary-l' },
              React.createElement('div', { className: 'eyebrow' }, 'Основной знак'),
              React.createElement('div', { className: 'logo-lockup' },
                React.createElement(Marks.tile),
                React.createElement('div', { className: 'logo-wordmark' },
                  React.createElement('span', { className: 'logo-wm-fp' }, 'FP'),
                  React.createElement('span', { className: 'logo-wm-tools' }, 'Tools')),
              ),
              React.createElement('p', { className: 'faint logo-primary-note' },
                'Тайл + словесный знак Geist. В шапке используется только тайл со словом «Tools».'),
            ),
            React.createElement('div', { className: 'logo-primary-r' },
              React.createElement('div', { className: 'logo-chiprow' },
                React.createElement('span', { className: 'fp-tools-launch is-active', style: { margin: 0 } },
                  React.createElement('span', { className: 'fp-tools-launch-mark' }, React.createElement('span', null, 'F'), React.createElement('span', null, 'P')),
                  React.createElement('span', { className: 'fp-tools-launch-label' }, 'Tools')),
                React.createElement('span', { className: 'faint logo-ctx-note' }, 'в шапке'),
              ),
            ),
          ),

          // concept grid
          React.createElement('div', { className: 'eyebrow logo-blocklabel' }, 'Варианты знака'),
          React.createElement('div', { className: 'logo-grid' },
            CONCEPTS.map((c) =>
              React.createElement('div', { key: c.id, className: 'logo-card' },
                React.createElement('div', { className: 'logo-card-stage' }, React.createElement(Marks[c.id])),
                React.createElement('div', { className: 'logo-card-meta' },
                  React.createElement('span', { className: 'logo-card-name' }, c.name),
                  React.createElement('p', { className: 'logo-card-note faint' }, c.note)),
              )),
          ),

          // swatches: mark on light + dark + accent
          React.createElement('div', { className: 'eyebrow logo-blocklabel' }, 'На разных фонах'),
          React.createElement('div', { className: 'logo-swatches' },
            React.createElement('div', { className: 'logo-sw sw-dark' }, React.createElement(Marks.tile)),
            React.createElement('div', { className: 'logo-sw sw-light' }, React.createElement(Marks.outline)),
            React.createElement('div', { className: 'logo-sw sw-accent' }, React.createElement('span', { className: 'mk mk-tile mk-onacc mono' }, 'FP')),
          ),
        )
      )
    );
  }

  window.LogoLab = LogoLab;
})();
