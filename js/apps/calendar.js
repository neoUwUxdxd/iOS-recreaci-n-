/* Calendario: vista mensual, eventos del día y creación de eventos. */
(function () {
  'use strict';

  const { h, esc, store, uid, fmt, seeded, pt } = OS.util;

  const COLORS = ['#ff3b30', '#0a84ff', '#34c759', '#af52de', '#ff9500', '#5e5ce6'];
  const key = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

  let userEvents = store.get('events', []);

  /** Eventos generados de forma determinista para cualquier día. */
  function generated(d) {
    const rnd = seeded(d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate());
    const pool = [['Reunión de equipo', 10, 0], ['Comida con Lucía', 14, 30], ['Gimnasio', 19, 0], ['Dentista', 17, 15], ['Llamada con Carlos', 12, 0], ['Clase de inglés', 18, 30], ['Revisión del proyecto', 11, 30], ['Cena familiar', 21, 0]];
    const out = [];
    const n = d.getDay() === 0 ? 0 : rnd() < 0.35 ? 0 : 1 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) {
      const p = pool[Math.floor(rnd() * pool.length)];
      if (out.some((e) => e.title === p[0])) continue;
      out.push({ id: 'g' + i, title: p[0], h: p[1], m: p[2], dur: 60, color: COLORS[Math.floor(rnd() * COLORS.length)] });
    }
    return out;
  }

  function eventsOn(d) {
    const k = key(d);
    return [...generated(d), ...userEvents.filter((e) => e.day === k)].sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m));
  }

  const hm = (e) => `${String(e.h).padStart(2, '0')}:${String(e.m).padStart(2, '0')}`;

  OS.todayEvents = () => {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    return eventsOn(now).filter((e) => e.h * 60 + e.m + e.dur > mins).map((e) => ({ title: e.title, time: hm(e), color: e.color }));
  };
  OS.nextEvent = () => {
    const t = OS.todayEvents()[0];
    if (t) return { title: t.title, when: `HOY · ${t.time}` };
    const tm = new Date(Date.now() + 86400e3);
    const e = eventsOn(tm)[0];
    return e ? { title: e.title, when: `MAÑANA · ${hm(e)}` } : null;
  };

  OS.registerApp('calendar', {
    create(root) {
      root.classList.add('plain', 'cal-app');
      let view = new Date();
      view.setDate(1);
      let sel = new Date();

      root.innerHTML = `
        <header class="cal-top"><button class="glass-btn cal-year">${OS.icon('chevronLeft')} <span></span></button><div class="nav-spacer"></div><button class="glass-btn round" data-today aria-label="Hoy">${OS.icon('calendar')}</button><button class="glass-btn round" data-add aria-label="Añadir evento">${OS.icon('plus')}</button></header>
        <div class="cal-body">
          <h1 class="cal-month"></h1>
          <div class="cal-wd">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => `<span>${d}</span>`).join('')}</div>
          <div class="cal-grid"></div>
          <div class="cal-day-title"></div>
          <div class="cal-events"></div>
        </div>`;
      const grid = root.querySelector('.cal-grid');

      function render() {
        const y = view.getFullYear(), m = view.getMonth();
        root.querySelector('.cal-month').textContent = fmt.month(view);
        root.querySelector('.cal-year span').textContent = y;
        const first = (new Date(y, m, 1).getDay() + 6) % 7;
        const days = new Date(y, m + 1, 0).getDate();
        const today = new Date();
        let html = '';
        for (let i = 0; i < first; i++) html += '<span></span>';
        for (let d = 1; d <= days; d++) {
          const date = new Date(y, m, d);
          const isToday = key(date) === key(today);
          const isSel = key(date) === key(sel);
          const has = eventsOn(date).length > 0;
          html += `<button class="cal-d ${isToday ? 'today' : ''} ${isSel ? 'sel' : ''} ${date.getDay() % 6 === 0 ? 'we' : ''}" data-d="${d}"><span>${d}</span>${has ? '<i></i>' : ''}</button>`;
        }
        grid.innerHTML = html;
        renderEvents();
      }

      function renderEvents() {
        const evs = eventsOn(sel);
        root.querySelector('.cal-day-title').textContent = sel.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        root.querySelector('.cal-events').innerHTML = evs.length ? evs.map((e) => `<div class="cal-ev" style="--c:${e.color}"><div><b>${esc(e.title)}</b><small>${hm(e)} – ${hm({ h: e.h + Math.floor((e.m + e.dur) / 60), m: (e.m + e.dur) % 60 })}</small></div>${e.id.startsWith('g') ? '' : `<button data-del="${e.id}" aria-label="Eliminar">${OS.icon('trash')}</button>`}</div>`).join('')
          : `<div class="cal-none">No hay eventos</div>`;
      }

      grid.addEventListener('click', (e) => {
        const b = e.target.closest('[data-d]');
        if (!b) return;
        sel = new Date(view.getFullYear(), view.getMonth(), +b.dataset.d);
        render();
      });
      root.querySelector('.cal-events').addEventListener('click', (e) => {
        const d = e.target.closest('[data-del]');
        if (d) { userEvents = userEvents.filter((x) => x.id !== d.dataset.del); store.set('events', userEvents); render(); }
      });
      const shift = (n) => { view = new Date(view.getFullYear(), view.getMonth() + n, 1); render(); };
      root.querySelector('.cal-year').addEventListener('click', () => shift(-1));
      root.querySelector('[data-today]').addEventListener('click', () => { view = new Date(); view.setDate(1); sel = new Date(); render(); });
      grid.addEventListener('pointerdown', (e) => {
        const x0 = pt(e).x;
        const up = (ev) => { grid.removeEventListener('pointerup', up); const dx = pt(ev).x - x0; if (Math.abs(dx) > 50) shift(dx < 0 ? 1 : -1); };
        grid.addEventListener('pointerup', up);
      });
      root.querySelector('[data-add]').addEventListener('click', () => {
        const content = h(`<div style="padding:0 0 10px">
          <div class="group"><div class="cell"><input class="cell-input" style="text-align:left;color:var(--label)" placeholder="Título" data-t></div></div>
          <div class="group"><div class="cell"><span class="cell-label">Fecha</span><span class="cell-value">${sel.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
          <div class="cell"><span class="cell-label">Hora</span><input type="time" class="cell-input" value="12:00" data-h></div></div></div>`);
        OS.ui.sheet({
          title: 'Nuevo evento', content, host: root, left: { icon: 'close' },
          right: { icon: 'check', primary: true, onClick: (sh) => {
            const t = content.querySelector('[data-t]').value.trim() || 'Nuevo evento';
            const [hh, mm] = (content.querySelector('[data-h]').value || '12:00').split(':').map(Number);
            userEvents.push({ id: uid(), day: key(sel), title: t, h: hh, m: mm, dur: 60, color: COLORS[userEvents.length % COLORS.length] });
            store.set('events', userEvents);
            sh.close();
            render();
            OS.bus.emit('minute');
          } },
        });
        setTimeout(() => content.querySelector('[data-t]').focus(), 400);
      });

      render();
      return { statusStyle: 'auto', onShow: render };
    },
  });
})();
