// icons.jsx — thin-line icon component built on Lucide icon data (loaded via UMD).
// Renders inline SVG so it survives React re-renders. 1.6px stroke = restrained/premium.
(function () {
  const KEBAB = {
    // svg child attrs that React wants camelCased
    'stroke-width': 'strokeWidth', 'stroke-linecap': 'strokeLinecap',
    'stroke-linejoin': 'strokeLinejoin', 'stroke-dasharray': 'strokeDasharray',
    'fill-rule': 'fillRule', 'clip-rule': 'clipRule',
  };
  function attrs(o) {
    const out = {};
    for (const k in o) out[KEBAB[k] || k] = o[k];
    return out;
  }

  function Icon({ name, size = 18, strokeWidth = 1.6, className = '', style }) {
    const lib = window.lucide && (window.lucide.icons || window.lucide);
    const node = lib && lib[name];
    // node = ["svg", {attrs}, [ [tag, attrs], ... ]]
    const kids = node && Array.isArray(node[2]) ? node[2] : null;
    if (!kids) {
      // graceful fallback dot so layout never breaks if an icon name is off
      return React.createElement('span', {
        className: 'lucide',
        style: { display: 'inline-block', width: size, height: size, ...style },
      });
    }
    const children = kids.map((c, i) =>
      React.createElement(c[0], { key: i, ...attrs(c[1]) })
    );
    return React.createElement('svg', {
      className: 'lucide ' + className,
      width: size, height: size, viewBox: '0 0 24 24',
      fill: 'none', stroke: 'currentColor', strokeWidth,
      strokeLinecap: 'round', strokeLinejoin: 'round',
      style,
    }, children);
  }

  window.Icon = Icon;
})();
