/* Recordatorios: listas inteligentes, añadir, completar y borrar. */
(function () {
  'use strict';

  const { h, esc, store, uid } = OS.util;

  let items = store.get('reminders', null) || [
    { id: uid(), text: 'Probar el nuevo Siri de iOS 27', done: false, flag: true, today: true },
    { id: uid(), text: 'Llamar al dentista', done: false, flag: false, today: true },
    { id: uid(), text: 'Comprar regalo para Lucía', done: false, flag: false, today: false },
    { id: uid(), text: 'Actualizar el iPhone', done: true, flag: false, today: false },
  ];
  const save = () => { store.set('reminders', items); OS.bus.emit('reminders'); };

  function add(text, today = true) {
    items.unshift({ id: uid(), text: text || 'Recordatorio', done: false, flag: false, today });
    save();
  }

  OS.registerApp('reminders', {
    create(root) {
      root.classList.add('grouped', 'rem-app');
      const nav = OS.ui.navStack(root);
      let showDone = false;
      let quiet = false;

      const home = OS.ui.page({ title: '', large: false, actions: `<button class="glass-btn round" data-more>${OS.icon('ellipsis')}</button>` });
      home.body.innerHTML = `<label class="search-field" style="margin-top:8px">${OS.icon('search')}<input placeholder="Buscar" aria-label="Buscar"></label>
        <div class="rem-cards"></div>
        <div class="large-title" style="font-size:22px;margin:22px 20px 8px">Mis listas</div>
        <div class="group"><div class="cell tap" data-list="all"><span class="cell-icon" style="background:var(--blue);border-radius:50%">${OS.icon('list')}</span><span class="cell-label">Recordatorios</span><span class="cell-value rem-count"></span><span class="cell-chev">${OS.icon('chevronRight')}</span></div></div>`;
      const cards = home.body.querySelector('.rem-cards');
      const bottom = h(`<div class="toolbar"><button class="glass-btn rem-add" data-add>${OS.icon('plus')}<span>Nuevo recordatorio</span></button><span></span></div>`);
      home.appendChild(bottom);

      const DEFS = [
        ['today', 'Hoy', 'calendar', '#0a84ff', (x) => x.today && !x.done],
        ['scheduled', 'Programado', 'clock', '#ff3b30', (x) => !x.today && !x.done],
        ['all', 'Todos', 'tray', '#5b5b60', (x) => !x.done],
        ['flag', 'Con indicador', 'flag', '#ff9500', (x) => x.flag && !x.done],
        ['done', 'Terminados', 'check', '#8e8e93', (x) => x.done],
      ];

      function renderHome() {
        cards.innerHTML = DEFS.map(([id, label, icon, color, fn]) => `<button class="rem-card" data-list="${id}"><span class="rc-ic" style="background:${color}">${OS.icon(icon)}</span><b>${items.filter(fn).length}</b><span>${label}</span></button>`).join('');
        home.body.querySelector('.rem-count').textContent = items.filter((x) => !x.done).length;
      }

      function listPage(id) {
        const def = DEFS.find((d) => d[0] === id) || DEFS[2];
        const p = OS.ui.page({ title: def[1], back: () => nav.pop(), actions: `<button class="glass-btn" data-toggle-done>${showDone ? 'Ocultar' : 'Mostrar'} terminados</button>` });
        p.classList.add('rem-list-page');
        p.querySelector('.large-title').style.color = def[3] === '#5b5b60' ? 'var(--label)' : def[3];
        const wrap = h('<div class="rem-items"></div>');
        p.body.appendChild(wrap);
        const render = () => {
          const arr = items.filter((x) => (id === 'done' ? x.done : (showDone || !x.done) && (id === 'all' || def[4]({ ...x, done: false }))));
          wrap.innerHTML = arr.map((x) => `<div class="rem-item ${x.done ? 'done' : ''}" data-id="${x.id}">
              <button class="rem-check" style="--c:${def[3] === '#5b5b60' ? 'var(--blue)' : def[3]}" aria-label="Completar"></button>
              <div class="rem-text" contenteditable="true" spellcheck="false">${esc(x.text)}</div>
              ${x.flag ? `<span style="color:var(--orange)">${OS.icon('flag')}</span>` : ''}
              <button class="rem-del" aria-label="Eliminar">${OS.icon('close')}</button></div>`).join('') ||
            `<div class="empty-state">${OS.icon('circleCheck')}<b>Todo hecho</b><span>No hay recordatorios.</span></div>`;
        };
        wrap.addEventListener('click', (e) => {
          const row = e.target.closest('.rem-item');
          if (!row) return;
          const it = items.find((x) => x.id === row.dataset.id);
          if (e.target.closest('.rem-check')) {
            it.done = !it.done;
            row.classList.toggle('done', it.done);
            OS.audio.tick();
            quiet = true;
            save();
            quiet = false;
            setTimeout(render, 700);
          } else if (e.target.closest('.rem-del')) {
            items = items.filter((x) => x !== it);
            save();
            render();
          }
        });
        wrap.addEventListener('focusout', (e) => {
          const row = e.target.closest('.rem-item');
          if (!row) return;
          const it = items.find((x) => x.id === row.dataset.id);
          const t = e.target.innerText.trim();
          if (!t) { items = items.filter((x) => x !== it); save(); render(); } else if (t !== it.text) { it.text = t; save(); }
        });
        wrap.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });
        p.querySelector('[data-toggle-done]').addEventListener('click', (e) => { showDone = !showDone; e.currentTarget.textContent = `${showDone ? 'Ocultar' : 'Mostrar'} terminados`; render(); });
        const tb = h(`<div class="toolbar"><button class="glass-btn rem-add" style="color:${def[3] === '#5b5b60' ? 'var(--blue)' : def[3]}">${OS.icon('plus')}<span>Nuevo recordatorio</span></button><span></span></div>`);
        tb.querySelector('button').addEventListener('click', () => {
          add('', id !== 'scheduled');
          items[0].text = '';
          render();
          const first = wrap.querySelector('.rem-text');
          if (first) first.focus();
        });
        p.appendChild(tb);
        p.addEventListener('popped', renderHome);
        render();
        p._render = render;
        return p;
      }

      home.body.addEventListener('click', (e) => {
        const l = e.target.closest('[data-list]');
        if (l) nav.push(listPage(l.dataset.list));
      });
      home.body.querySelector('input').addEventListener('input', (e) => {
        const q = OS.util.norm(e.target.value.trim());
        if (!q) return;
        const hit = items.find((x) => OS.util.norm(x.text).includes(q));
        if (hit && e.target.value.length > 2) OS.ui.toast(hit.text, 'search');
      });
      bottom.querySelector('[data-add]').addEventListener('click', async () => {
        const t = await OS.ui.alert({ title: 'Nuevo recordatorio', input: { placeholder: 'Título' }, buttons: [{ label: 'Cancelar', cancel: true }, { label: 'Añadir', primary: true }], host: root });
        if (t && t.trim()) { add(t.trim()); renderHome(); }
      });
      home.querySelector('[data-more]').addEventListener('click', () => OS.ui.toast('Lista «Recordatorios»', 'list'));

      nav.push(home, false);
      renderHome();
      const off = OS.bus.on('reminders', () => { renderHome(); const top = nav.top; if (!quiet && top && top._render) top._render(); });

      OS.remindersApp = { add };
      return { statusStyle: 'auto', onShow: renderHome, onDestroy() { off(); } };
    },
  });

  OS.remindersApp = { add };
})();
