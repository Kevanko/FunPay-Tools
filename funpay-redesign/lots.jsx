// lots.jsx — profile page with lot selection + bulk actions + quick create/copy/move.
(function () {
  const { useState, useMemo } = React;
  const Icon = window.Icon;
  const D = window.FPX_DATA;

  let _uid = 9000000;
  const nid = () => ++_uid;

  function Lots() {
    const [sections, setSections] = useState(() => JSON.parse(JSON.stringify(D.SECTIONS)));
    const [selecting, setSelecting] = useState(false);
    const [sel, setSel] = useState(() => new Set());
    const [filter, setFilter] = useState('all');
    const [q, setQ] = useState('');
    const [modal, setModal] = useState(null); // {type:'price'|'copy'|'move'|'create', section?}
    const [toast, setToast] = useState(null);

    const allLots = useMemo(() => sections.flatMap((s) => s.lots.map((l) => ({ ...l, sid: s.id }))), [sections]);
    const selCount = sel.size;

    const flash = (text) => { setToast(text); clearTimeout(window.__fpxT); window.__fpxT = setTimeout(() => setToast(null), 2600); };

    const toggle = (id) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };
    const toggleSection = (s) => {
      const ids = s.lots.map((l) => l.id);
      const all = ids.every((i) => sel.has(i));
      const n = new Set(sel);
      ids.forEach((i) => all ? n.delete(i) : n.add(i));
      setSel(n);
    };
    const selectAll = () => {
      const ids = visibleIds();
      const all = ids.length && ids.every((i) => sel.has(i));
      setSel(all ? new Set() : new Set(ids));
    };
    const clearSel = () => setSel(new Set());
    const exitSelect = () => { setSelecting(false); clearSel(); };

    const matches = (l) => (filter === 'all' || l.auto) && (!q || l.title.toLowerCase().includes(q.toLowerCase()));
    const visibleIds = () => sections.flatMap((s) => s.lots.filter(matches).map((l) => l.id));

    // ---- bulk operations ----
    const applyDelete = () => {
      setSections((prev) => prev.map((s) => ({ ...s, lots: s.lots.filter((l) => !sel.has(l.id)), count: s.lots.filter((l) => !sel.has(l.id)).length })));
      flash(`Удалено лотов: ${selCount}`); clearSel();
    };
    const applyToggleActive = () => {
      setSections((prev) => prev.map((s) => ({ ...s, lots: s.lots.map((l) => sel.has(l.id) ? { ...l, on: !l.on } : l) })));
      flash(`Изменён статус: ${selCount}`); clearSel();
    };
    const applyPin = () => {
      setSections((prev) => prev.map((s) => ({ ...s, lots: s.lots.map((l) => sel.has(l.id) ? { ...l, pinned: !l.pinned } : l) })));
      flash(`Закрепление обновлено: ${selCount}`); clearSel();
    };
    const applyDuplicate = () => {
      setSections((prev) => prev.map((s) => {
        const dupes = s.lots.filter((l) => sel.has(l.id)).map((l) => ({ ...l, id: nid(), title: l.title + ' (копия)', pinned: false }));
        const lots = [...s.lots, ...dupes];
        return { ...s, lots, count: lots.length };
      }));
      flash(`Дублировано: ${selCount}`); clearSel();
    };
    const applyPrice = ({ mode, value }) => {
      const calc = (p) => {
        let n = p;
        if (mode === 'set') n = value; else if (mode === 'add') n = p + value;
        else if (mode === 'sub') n = p - value; else if (mode === 'pup') n = p * (1 + value / 100);
        else if (mode === 'pdown') n = p * (1 - value / 100);
        return Math.max(0, Math.round(n * 100) / 100);
      };
      setSections((prev) => prev.map((s) => ({ ...s, lots: s.lots.map((l) => sel.has(l.id) ? { ...l, price: calc(l.price) } : l) })));
      setModal(null); flash(`Цена изменена у ${selCount} лот.`); clearSel();
    };
    const applyCopyMove = (targetId, move) => {
      let moving = [];
      const stripped = sections.map((s) => {
        const keep = []; s.lots.forEach((l) => { if (sel.has(l.id)) moving.push({ ...l }); else keep.push(l); });
        return move ? { ...s, lots: keep, count: keep.length } : s;
      });
      const out = stripped.map((s) => s.id === targetId
        ? { ...s, lots: [...s.lots, ...moving.map((l) => ({ ...l, id: nid(), pinned: false }))], count: s.lots.length + moving.length }
        : s);
      setSections(out); setModal(null);
      flash(`${move ? 'Перемещено' : 'Скопировано'}: ${moving.length} → ${out.find((s) => s.id === targetId).game}`);
      clearSel();
    };
    const createLot = ({ sid, title, price, auto }) => {
      setSections((prev) => prev.map((s) => s.id === sid
        ? { ...s, lots: [{ id: nid(), title, sub: 'Новый лот', price: parseFloat(price) || 0, stock: '∞', auto, on: true, isNew: true }, ...s.lots], count: s.lots.length + 1 }
        : s));
      setModal(null); flash('Лот создан');
    };

    return (
      React.createElement('div', { className: 'lots fpx-scroll' },
        React.createElement('div', { className: 'lots-inner' },
          // profile header
          React.createElement('div', { className: 'pf' },
            React.createElement('div', { className: 'pf-avatar' }, 'V', React.createElement('span', { className: 'pf-online' })),
            React.createElement('div', { className: 'pf-meta' },
              React.createElement('div', { className: 'pf-namerow' },
                React.createElement('h1', { className: 'pf-name' }, 'Vidali'),
                React.createElement('span', { className: 'pf-status' }, React.createElement('span', { className: 'pf-status-dot' }), 'Онлайн'),
              ),
              React.createElement('div', { className: 'pf-stats' },
                React.createElement('span', null, React.createElement(Icon, { name: 'Star', size: 14, className: 'pf-star' }), React.createElement('b', { className: 'mono' }, '4.7'), React.createElement('span', { className: 'faint' }, ' · 327 отзывов')),
                React.createElement('span', { className: 'pf-sep' }),
                React.createElement('span', { className: 'faint' }, 'На FunPay с 2019 · 7 лет'),
              ),
            ),
            React.createElement('button', { className: 'btn btn-ghost btn-sm' }, React.createElement(Icon, { name: 'Pencil', size: 15 }), 'Профиль'),
          ),

          // toolbar
          React.createElement('div', { className: 'lots-toolbar' },
            React.createElement('div', { className: 'lots-toolbar-l' },
              React.createElement('h2', { className: 'lots-h2' }, 'Предложения'),
              React.createElement('span', { className: 'lots-count mono faint' }, allLots.length, ' лотов'),
            ),
            React.createElement('div', { className: 'lots-toolbar-r' },
              React.createElement('div', { className: 'lots-search' },
                React.createElement(Icon, { name: 'Search', size: 16 }),
                React.createElement('input', { value: q, onChange: (e) => setQ(e.target.value), placeholder: 'Поиск по лотам…' })),
              React.createElement('div', { className: 'lots-chips' },
                React.createElement('button', { className: 'chip' + (filter === 'all' ? ' chip-active' : ''), onClick: () => setFilter('all') }, 'Все'),
                React.createElement('button', { className: 'chip' + (filter === 'auto' ? ' chip-active' : ''), onClick: () => setFilter('auto') },
                  React.createElement(Icon, { name: 'Zap', size: 13 }), 'Автовыдача'),
              ),
              selecting
                ? React.createElement('button', { className: 'btn btn-ghost btn-sm', onClick: exitSelect }, 'Готово')
                : React.createElement('button', { className: 'btn btn-soft btn-sm', onClick: () => setSelecting(true) },
                    React.createElement(Icon, { name: 'CircleCheck', size: 15 }), 'Выбрать'),
              React.createElement('button', { className: 'btn btn-primary btn-sm', onClick: () => setModal({ type: 'create' }) },
                React.createElement(Icon, { name: 'Plus', size: 16 }), 'Создать лот'),
            ),
          ),

          selecting ? React.createElement('div', { className: 'lots-selbar' },
            React.createElement('button', { className: 'lots-selall', onClick: selectAll },
              React.createElement('span', { className: 'lots-cbox' + (selCount && selCount === visibleIds().length ? ' on' : '') },
                selCount === visibleIds().length && selCount ? React.createElement(Icon, { name: 'Check', size: 13 }) : null),
              'Выбрать все'),
            React.createElement('span', { className: 'faint', style: { fontSize: 13 } }, 'Отмечено: ', React.createElement('b', { className: 'mono' }, selCount)),
          ) : null,

          // sections
          sections.map((s) => {
            const lots = s.lots.filter(matches);
            if (q && lots.length === 0) return null;
            const secIds = s.lots.map((l) => l.id);
            const secAll = secIds.length && secIds.every((i) => sel.has(i));
            const secSome = secIds.some((i) => sel.has(i));
            return React.createElement('div', { key: s.id, className: 'lsec card' },
              React.createElement('div', { className: 'lsec-head' },
                selecting ? React.createElement('button', { className: 'lots-cbox' + (secAll ? ' on' : secSome ? ' part' : ''), onClick: () => toggleSection(s) },
                  secAll ? React.createElement(Icon, { name: 'Check', size: 13 }) : secSome ? React.createElement('span', { className: 'lots-dash' }) : null) : null,
                React.createElement('div', { className: 'lsec-title' },
                  React.createElement('span', { className: 'lsec-game' }, s.game),
                  React.createElement('span', { className: 'lsec-cat faint' }, ' · ', s.cat),
                ),
                React.createElement('span', { className: 'lsec-num mono faint' }, lots.length),
                React.createElement('button', { className: 'btn btn-quiet btn-sm btn-icon', onClick: () => setModal({ type: 'create', sid: s.id }) }, React.createElement(Icon, { name: 'Plus', size: 16 })),
                React.createElement('button', { className: 'btn btn-quiet btn-sm btn-icon' }, React.createElement(Icon, { name: 'Pencil', size: 15 })),
              ),
              React.createElement('div', { className: 'ltable' },
                React.createElement('div', { className: 'ltable-head' + (s.cols.includes('platform') ? ' has-plat' : '') + (s.cols.includes('stock') ? ' has-stock' : '') },
                  selecting ? React.createElement('span', null) : null,
                  s.cols.includes('platform') ? React.createElement('span', null, 'Платформа') : null,
                  React.createElement('span', null, 'Описание'),
                  s.cols.includes('stock') ? React.createElement('span', { className: 'ltc-r' }, 'Наличие') : null,
                  React.createElement('span', { className: 'ltc-r' }, 'Цена'),
                  React.createElement('span', null),
                ),
                lots.map((l) => {
                  const on = sel.has(l.id);
                  return React.createElement('div', {
                    key: l.id, className: 'lrow' + (on ? ' is-sel' : '') + (!l.on ? ' is-off' : '') + (l.isNew ? ' is-new' : '') +
                      (s.cols.includes('platform') ? ' has-plat' : '') + (s.cols.includes('stock') ? ' has-stock' : ''),
                    onClick: () => selecting && toggle(l.id),
                  },
                    selecting ? React.createElement('span', { className: 'lots-cbox' + (on ? ' on' : '') },
                      on ? React.createElement(Icon, { name: 'Check', size: 13 }) : null) : null,
                    s.cols.includes('platform') ? React.createElement('span', { className: 'lrow-plat faint' }, l.platform) : null,
                    React.createElement('span', { className: 'lrow-desc' },
                      React.createElement('span', { className: 'lrow-title' },
                        l.pinned ? React.createElement('span', { className: 'lrow-pin' }, React.createElement(Icon, { name: 'Pin', size: 12 })) : null,
                        l.title),
                      React.createElement('span', { className: 'lrow-sub faint' }, l.sub),
                      React.createElement('span', { className: 'lrow-badges' },
                        l.auto ? React.createElement('span', { className: 'badge badge-auto' }, React.createElement(Icon, { name: 'Zap', size: 11 }), 'Авто') : null,
                        !l.on ? React.createElement('span', { className: 'badge badge-muted' }, 'Откл.') : null),
                    ),
                    s.cols.includes('stock') ? React.createElement('span', { className: 'lrow-stock mono ltc-r faint' }, l.stock) : null,
                    React.createElement('span', { className: 'lrow-price mono ltc-r' }, l.price.toFixed(2), ' ₽'),
                    React.createElement('button', { className: 'btn btn-quiet btn-sm btn-icon lrow-act', onClick: (e) => e.stopPropagation() }, React.createElement(Icon, { name: 'Pencil', size: 14 })),
                  );
                }),
              ),
            );
          }),
        ),

        // bulk action bar
        selecting && selCount > 0 ? React.createElement('div', { className: 'bulkbar card-glass' },
          React.createElement('div', { className: 'bulk-count' },
            React.createElement('span', { className: 'bulk-count-n mono' }, selCount),
            React.createElement('span', { className: 'faint' }, 'выбрано'),
            React.createElement('button', { className: 'bulk-clear', onClick: clearSel }, React.createElement(Icon, { name: 'X', size: 14 })),
          ),
          React.createElement('div', { className: 'bulk-actions' },
            bulkBtn('SlidersHorizontal', 'Цена', () => setModal({ type: 'price' })),
            bulkBtn('Copy', 'Дублировать', applyDuplicate),
            bulkBtn('FolderInput', 'Копировать в…', () => setModal({ type: 'copy' })),
            bulkBtn('FolderSymlink', 'Переместить', () => setModal({ type: 'move' })),
            bulkBtn('Pin', 'Закрепить', applyPin),
            bulkBtn('Power', 'Вкл/Откл', applyToggleActive),
            React.createElement('div', { className: 'bulk-div' }),
            bulkBtn('Trash2', 'Удалить', applyDelete, true),
          ),
        ) : null,

        toast ? React.createElement('div', { className: 'lots-toast' },
          React.createElement(Icon, { name: 'Check', size: 15 }), toast) : null,

        modal ? React.createElement(Modals, { modal, sections, selCount, onClose: () => setModal(null), applyPrice, applyCopyMove, createLot }) : null,
      )
    );
  }

  function bulkBtn(icon, label, onClick, danger) {
    return React.createElement('button', { key: label, className: 'bulk-btn' + (danger ? ' danger' : ''), onClick },
      React.createElement(Icon, { name: icon, size: 16 }), React.createElement('span', null, label));
  }

  /* ---------- modals ---------- */
  function Modals({ modal, sections, selCount, onClose, applyPrice, applyCopyMove, createLot }) {
    return React.createElement('div', { className: 'lm-overlay', onMouseDown: (e) => { if (e.target.classList.contains('lm-overlay')) onClose(); } },
      React.createElement('div', { className: 'lm card-glass' },
        modal.type === 'price' ? React.createElement(PriceModal, { selCount, onClose, applyPrice })
        : modal.type === 'create' ? React.createElement(CreateModal, { sections, sid: modal.sid, onClose, createLot })
        : React.createElement(PickerModal, { sections, selCount, move: modal.type === 'move', onClose, applyCopyMove }),
      ));
  }

  function PriceModal({ selCount, onClose, applyPrice }) {
    const [mode, setMode] = useState('set');
    const [value, setValue] = useState('');
    const modes = [['set', 'Установить'], ['add', '+ Прибавить'], ['sub', '− Вычесть'], ['pup', '% Поднять'], ['pdown', '% Снизить']];
    const unit = mode === 'pup' || mode === 'pdown' ? '%' : '₽';
    return React.createElement(React.Fragment, null,
      React.createElement(LmHead, { title: 'Изменение цены', sub: `Применится к ${selCount} выбранным лотам`, onClose }),
      React.createElement('div', { className: 'lm-body' },
        React.createElement('div', { className: 'lm-modes' },
          modes.map(([m, l]) => React.createElement('button', { key: m, className: 'lm-mode' + (mode === m ? ' on' : ''), onClick: () => setMode(m) }, l))),
        React.createElement('div', { className: 'lm-inputrow' },
          React.createElement('input', { className: 'input input-lg mono', type: 'number', autoFocus: true, value, onChange: (e) => setValue(e.target.value), placeholder: '0' }),
          React.createElement('span', { className: 'lm-unit' }, unit)),
      ),
      React.createElement('div', { className: 'lm-foot' },
        React.createElement('button', { className: 'btn btn-ghost', onClick: onClose }, 'Отмена'),
        React.createElement('button', { className: 'btn btn-primary', onClick: () => applyPrice({ mode, value: parseFloat(value) || 0 }) }, 'Применить')),
    );
  }

  function PickerModal({ sections, selCount, move, onClose, applyCopyMove }) {
    const [target, setTarget] = useState(null);
    return React.createElement(React.Fragment, null,
      React.createElement(LmHead, { title: move ? 'Переместить в раздел' : 'Копировать в раздел', sub: `${selCount} лот. → выбранная категория`, onClose }),
      React.createElement('div', { className: 'lm-body' },
        React.createElement('div', { className: 'lm-picker' },
          sections.map((s) => React.createElement('button', { key: s.id, className: 'lm-pick' + (target === s.id ? ' on' : ''), onClick: () => setTarget(s.id) },
            React.createElement('span', { className: 'lm-pick-ic' }, React.createElement(Icon, { name: 'Folder', size: 16 })),
            React.createElement('span', { className: 'lm-pick-txt' },
              React.createElement('span', { className: 'lm-pick-name' }, s.game),
              React.createElement('span', { className: 'lm-pick-sub faint' }, s.cat, ' · ', s.lots.length, ' лот.')),
            target === s.id ? React.createElement(Icon, { name: 'Check', size: 16, className: 'lm-pick-check' }) : null)),
          React.createElement('button', { className: 'lm-pick lm-pick-new' },
            React.createElement('span', { className: 'lm-pick-ic' }, React.createElement(Icon, { name: 'Plus', size: 16 })),
            React.createElement('span', { className: 'lm-pick-name' }, 'Новый раздел…')),
        ),
      ),
      React.createElement('div', { className: 'lm-foot' },
        React.createElement('button', { className: 'btn btn-ghost', onClick: onClose }, 'Отмена'),
        React.createElement('button', { className: 'btn btn-primary', disabled: !target, onClick: () => target && applyCopyMove(target, move) }, move ? 'Переместить' : 'Копировать')),
    );
  }

  function CreateModal({ sections, sid, onClose, createLot }) {
    const [section, setSection] = useState(sid || sections[0].id);
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [auto, setAuto] = useState(true);
    return React.createElement(React.Fragment, null,
      React.createElement(LmHead, { title: 'Быстрое создание лота', sub: 'Заполните основное — детали можно отредактировать позже', onClose }),
      React.createElement('div', { className: 'lm-body lm-form' },
        React.createElement('label', { className: 'lm-label' }, 'Раздел',
          React.createElement('select', { className: 'select', value: section, onChange: (e) => setSection(e.target.value) },
            sections.map((s) => React.createElement('option', { key: s.id, value: s.id }, s.game, ' · ', s.cat)))),
        React.createElement('label', { className: 'lm-label' }, 'Название лота',
          React.createElement('input', { className: 'input', autoFocus: true, value: title, onChange: (e) => setTitle(e.target.value), placeholder: 'Например: Аккаунт · все бойцы' })),
        React.createElement('div', { className: 'lm-form2' },
          React.createElement('label', { className: 'lm-label' }, 'Цена, ₽',
            React.createElement('input', { className: 'input mono', type: 'number', value: price, onChange: (e) => setPrice(e.target.value), placeholder: '0' })),
          React.createElement('div', { className: 'lm-label' }, 'Авто-выдача',
            React.createElement('div', { className: 'lm-autorow' },
              React.createElement('span', { className: 'tgl', 'data-on': String(auto), onClick: () => setAuto(!auto) }),
              React.createElement('span', { className: 'faint', style: { fontSize: 13 } }, auto ? 'Включена' : 'Выключена'))),
        ),
      ),
      React.createElement('div', { className: 'lm-foot' },
        React.createElement('button', { className: 'btn btn-ghost', onClick: onClose }, 'Отмена'),
        React.createElement('button', { className: 'btn btn-primary', disabled: !title.trim(), onClick: () => createLot({ sid: section, title: title.trim(), price, auto }) },
          React.createElement(Icon, { name: 'Plus', size: 16 }), 'Создать лот')),
    );
  }

  function LmHead({ title, sub, onClose }) {
    return React.createElement('div', { className: 'lm-head' },
      React.createElement('div', null,
        React.createElement('h3', { className: 'lm-title' }, title),
        sub ? React.createElement('p', { className: 'lm-sub faint' }, sub) : null),
      React.createElement('button', { className: 'btn btn-quiet btn-sm btn-icon', onClick: onClose }, React.createElement(Icon, { name: 'X', size: 16 })));
  }

  window.Lots = Lots;
})();
