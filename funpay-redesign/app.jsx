// app.jsx — root: theming, wallpaper, surface switcher, Tweaks, FP Tools overlay.
(function () {
  const { useState, useEffect } = React;
  const Icon = window.Icon;
  const {
    useTweaks, TweaksPanel, TweakSection, TweakRow,
    TweakToggle, TweakSelect, TweakColor,
  } = window;

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "theme": "graphite",
    "wallpaper": "none",
    "accent": "#5b86d8",
    "font": "geist",
    "density": "regular"
  }/*EDITMODE-END*/;

  // diverse pairings — distinct personalities, not "one grotesk"
  const FONTS = {
    geist:   { ui: '"Geist", system-ui, sans-serif',         disp: '"Geist", system-ui, sans-serif',          mono: '"Geist Mono", ui-monospace, monospace', note: 'Suisse-подобный гротеск' },
    grotesk: { ui: '"Space Grotesk", system-ui, sans-serif', disp: '"Space Grotesk", system-ui, sans-serif',   mono: '"Space Mono", ui-monospace, monospace', note: 'Геометрический, характерный' },
    syne:    { ui: '"Geist", system-ui, sans-serif',         disp: '"Syne", system-ui, sans-serif',            mono: '"Geist Mono", ui-monospace, monospace', note: 'Выразительный заголовок' },
    serif:   { ui: '"Geist", system-ui, sans-serif',         disp: '"Instrument Serif", Georgia, serif',       mono: '"Geist Mono", ui-monospace, monospace', note: 'Редакционный, серьёзный' },
    mixed:   { ui: '"Geist", system-ui, sans-serif',         disp: '"Clash Display", system-ui, sans-serif',   mono: '"Geist Mono", ui-monospace, monospace', note: 'Дисплейный, премиум' },
    mono:    { ui: '"Space Mono", ui-monospace, monospace',  disp: '"Space Mono", ui-monospace, monospace',    mono: '"Space Mono", ui-monospace, monospace', note: 'Industrial / технический' },
  };
  window.FPX_FONTS = FONTS;

  const WALLPAPERS = [
    { id: 'none',   label: 'Нет' },
    { id: 'dunes',  label: 'Дюны' },
    { id: 'mesh',   label: 'Меш' },
    { id: 'grid',   label: 'Сетка' },
    { id: 'aurora', label: 'Аврора · live' },
    { id: 'drift',  label: 'Дрейф · live' },
  ];
  window.FPX_WALLS = WALLPAPERS;

  const ACCENTS = ['#5b86d8', '#6b7280', '#3f9e7c', '#c2703d', '#8b7fd0', '#c45b8c'];
  window.FPX_ACCENTS = ACCENTS;

  // shared accent picker: swatches + color wheel + rainbow shimmer
  function AccentPicker({ value, onChange }) {
    const ref = React.useRef(null);
    return (
      React.createElement('div', { className: 'accentpick' },
        ACCENTS.map((a) =>
          React.createElement('button', { key: a, className: 'accentpick-sw' + (value === a ? ' is-active' : ''), style: { '--sw': a }, onClick: () => onChange(a) })),
        React.createElement('button', {
          className: 'accentpick-wheel' + (value && value[0] === '#' && !ACCENTS.includes(value) ? ' is-active' : ''),
          onClick: () => ref.current && ref.current.click(), title: 'Свой цвет',
          style: { '--sw': (value && value[0] === '#') ? value : '#888' },
        },
          React.createElement(Icon, { name: 'Pipette', size: 14 }),
          React.createElement('input', { ref, type: 'color', className: 'accentpick-input', value: (value && value[0] === '#') ? value : '#5b86d8', onChange: (e) => onChange(e.target.value) }),
        ),
        React.createElement('button', {
          className: 'accentpick-rainbow' + (value === 'rainbow' ? ' is-active' : ''),
          onClick: () => onChange('rainbow'), title: 'Радужный перелив',
        }),
      )
    );
  }
  window.AccentPicker = AccentPicker;

  function applyAccent(r, accent, theme) {
    if (accent === 'rainbow') {
      r.classList.add('accent-rainbow');
      ['--accent', '--accent-strong', '--accent-soft', '--accent-line'].forEach((p) => r.style.removeProperty(p));
      r.style.setProperty('--accent-fg', theme === 'light' ? '#fff' : '#0b0d10');
    } else if (accent) {
      r.classList.remove('accent-rainbow');
      r.style.setProperty('--accent', accent);
      r.style.setProperty('--accent-strong', accent);
      r.style.setProperty('--accent-soft', hexA(accent, 0.15));
      r.style.setProperty('--accent-line', hexA(accent, 0.36));
      r.style.setProperty('--accent-fg', theme === 'light' ? '#fff' : '#0b0d10');
    }
  }

  function App() {
    const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
    const [surface, setSurface] = useState('home');
    const [toolsOpen, setToolsOpen] = useState(false);
    const [balanceHidden, setBalanceHidden] = useState(false);

    useEffect(() => {
      const r = document.querySelector('.fpx-root');
      if (!r) return;
      r.setAttribute('data-theme', t.theme);
      r.setAttribute('data-density', t.density);
      const f = FONTS[t.font] || FONTS.geist;
      r.style.setProperty('--font-ui', f.ui);
      r.style.setProperty('--font-display', f.disp);
      r.style.setProperty('--font-mono', f.mono);
      applyAccent(r, t.accent, t.theme);
    }, [t.theme, t.accent, t.font, t.density]);

    const surfaces = [
      { id: 'home', label: 'Главная', icon: 'Home' },
      { id: 'lots', label: 'Профиль · Лоты', icon: 'Package' },
      { id: 'logo', label: 'Айдентика', icon: 'Hexagon' },
    ];
    const toggleBalance = () => setBalanceHidden((v) => !v);

    return (
      React.createElement('div', { className: 'fpx-stage' },
        React.createElement('div', { className: 'fpx-wall wall-' + t.wallpaper }),
        surface !== 'logo'
          ? React.createElement(React.Fragment, null,
              React.createElement(window.FunpayHeader, { onOpenTools: () => setToolsOpen(true), toolsActive: toolsOpen, balanceHidden, onToggleBalance: toggleBalance }),
              surface === 'home'
                ? React.createElement(window.Home, { onOpenTools: () => setToolsOpen(true), balanceHidden, onToggleBalance: toggleBalance })
                : React.createElement(window.Lots, null),
            )
          : React.createElement(window.LogoLab, { setTweak, tweaks: t }),

        toolsOpen ? React.createElement(window.FPTools, { onClose: () => setToolsOpen(false), tweaks: t, setTweak, fonts: FONTS, wallpapers: WALLPAPERS }) : null,

        React.createElement('div', { className: 'fpx-switch' },
          surfaces.map((s) =>
            React.createElement('button', {
              key: s.id, className: 'fpx-switch-btn' + (surface === s.id ? ' is-active' : ''),
              onClick: () => setSurface(s.id),
            },
              React.createElement(Icon, { name: s.icon, size: 15 }),
              React.createElement('span', null, s.label),
            )
          ),
        ),

        React.createElement(TweaksPanel, null,
          React.createElement(TweakSection, { label: 'Тема' }),
          React.createElement(TweakSelect, {
            label: 'Оформление', value: t.theme,
            options: [
              { value: 'graphite', label: 'Графит' },
              { value: 'obsidian', label: 'Обсидиан' },
              { value: 'slate', label: 'Сине-серый' },
              { value: 'light', label: 'Светлая' },
            ],
            onChange: (v) => setTweak('theme', v),
          }),
          React.createElement(TweakSelect, {
            label: 'Обои', value: t.wallpaper,
            options: WALLPAPERS.map((w) => ({ value: w.id, label: w.label })),
            onChange: (v) => setTweak('wallpaper', v),
          }),
          React.createElement(TweakRow, { label: 'Акцент' },
            React.createElement(AccentPicker, { value: t.accent, onChange: (v) => setTweak('accent', v) })),
          React.createElement(TweakSection, { label: 'Типографика' }),
          React.createElement(TweakSelect, {
            label: 'Шрифт', value: t.font,
            options: Object.keys(FONTS).map((k) => ({ value: k, label: ({ geist: 'Geist', grotesk: 'Space Grotesk', syne: 'Syne', serif: 'Instrument Serif', mixed: 'Clash Display', mono: 'Space Mono' })[k] })),
            onChange: (v) => setTweak('font', v),
          }),
          React.createElement(TweakSelect, {
            label: 'Плотность', value: t.density,
            options: [
              { value: 'compact', label: 'Компактно' },
              { value: 'regular', label: 'Обычно' },
              { value: 'comfy', label: 'Просторно' },
            ],
            onChange: (v) => setTweak('density', v),
          }),
        ),
      )
    );
  }

  function hexA(hex, a) {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  window.FPXApp = App;
})();
