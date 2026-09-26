/* Mapas: mapa vectorial generado, desplazamiento/zoom, lugares, rutas y navegación en la isla. */
(function () {
  'use strict';

  const { esc, seeded, pt, clamp } = OS.util;

  const SIZE = 2400;
  const ME = { x: 1200, y: 1200 };
  const PLACES = [
    { id: 'home', name: 'Casa', sub: 'Calle del Cristal, 27', x: 1010, y: 1330, icon: 'house', color: '#0a84ff' },
    { id: 'work', name: 'Trabajo', sub: 'Av. Liquid Glass, 8', x: 1560, y: 900, icon: 'grid', color: '#8e8e93' },
    { id: 'cafe', name: 'Café Orbe', sub: 'Cafetería · 4,7 ★', x: 1330, y: 1080, icon: 'cart', color: '#ff9500' },
    { id: 'park', name: 'Parque de la Isla', sub: 'Parque', x: 820, y: 900, icon: 'sparkle', color: '#34c759' },
    { id: 'museum', name: 'Museo del Vidrio', sub: 'Museo · Abierto hasta las 20:00', x: 1680, y: 1460, icon: 'photo', color: '#af52de' },
    { id: 'station', name: 'Estación Norte', sub: 'Tren y metro', x: 1200, y: 640, icon: 'location', color: '#ff3b30' },
  ];

  function buildMap() {
    const rnd = seeded(2027);
    let s = '';
    // Agua (río)
    s += `<path class="mp-water" d="M-50 520 C 400 600, 600 380, 900 560 S 1400 760, 1700 600 S 2200 420, 2500 560 L 2500 700 C 2200 560, 1900 760, 1700 740 S 1300 900, 900 700 S 400 740, -50 660 Z"/>`;
    s += `<path class="mp-water" d="M1900 1700 q 160 -60 300 40 t 260 80 v 700 h -700 q 40 -300 140 -820z"/>`;
    // Parques
    s += `<path class="mp-park" d="M700 820 h 260 l 30 170 l -90 90 h -210 z"/>`;
    s += `<path class="mp-park" d="M1440 1540 h 180 v 160 h -180 z"/><path class="mp-park" d="M300 1500 q 120 -80 240 0 t 120 200 q -120 120 -260 60 t -100 -260z"/>`;
    // Manzanas
    for (let gx = 0; gx < SIZE; gx += 150) {
      for (let gy = 760; gy < SIZE; gy += 150) {
        if (rnd() < 0.12) continue;
        s += `<rect class="mp-block" x="${gx + 18}" y="${gy + 18}" width="${114 - rnd() * 20}" height="${114 - rnd() * 20}" rx="6"/>`;
      }
    }
    // Calles
    let roads = '';
    for (let x = 0; x <= SIZE; x += 150) roads += `M${x} 740 V${SIZE} `;
    for (let y = 750; y <= SIZE; y += 150) roads += `M0 ${y} H${SIZE} `;
    s += `<path class="mp-road-b" d="${roads}"/><path class="mp-road" d="${roads}"/>`;
    // Avenidas principales
    const av = 'M0 1200 H2400 M1200 740 V2400 M300 2400 L1500 780 M0 900 C 600 860, 1800 1000, 2400 950';
    s += `<path class="mp-av-b" d="${av}"/><path class="mp-av" d="${av}"/>`;
    // Puentes
    s += `<path class="mp-av-b" d="M1200 400 V760 M600 300 V760"/><path class="mp-av" d="M1200 400 V760 M600 300 V760"/>`;
    // Rótulos
    const labels = [['Av. Liquid Glass', 1800, 1190, 0], ['Calle Siri', 1190, 1650, -90], ['Paseo de la Isla', 820, 1720, -52], ['Río Cristal', 1500, 690, -8], ['Parque de la Isla', 850, 960, 0], ['Calle del Cristal', 700, 1340, 0]];
    s += labels.map(([t, x, y, r]) => `<text class="mp-label" x="${x}" y="${y}" transform="rotate(${r} ${x} ${y})" text-anchor="middle">${t}</text>`).join('');
    return s;
  }

  OS.registerApp('maps', {
    create(root) {
      root.classList.add('maps-app');
      let view = { x: ME.x, y: ME.y, z: 0.62 };
      let selected = null;

      root.innerHTML = `
        <div class="mp-stage"><svg class="mp-svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">${buildMap()}<g class="mp-route"></g><g class="mp-pins">${PLACES.map((p) => `<g class="mp-pin" data-id="${p.id}" transform="translate(${p.x} ${p.y})"><circle r="17" fill="${p.color}" stroke="#fff" stroke-width="3"/><g transform="translate(-9 -9) scale(.75)" fill="#fff" color="#fff">${OS.glyphs[p.icon]}</g><text y="36" text-anchor="middle" class="mp-pinlabel">${esc(p.name)}</text></g>`).join('')}</g><g class="mp-me" transform="translate(${ME.x} ${ME.y})"><circle class="mp-me-halo" r="40"/><circle r="11" fill="#0a84ff" stroke="#fff" stroke-width="4"/></g></svg></div>
        <div class="mp-ctrls"><button class="glass-btn round" data-loc aria-label="Mi ubicación">${OS.icon('location')}</button><button class="glass-btn round" data-zin aria-label="Acercar">${OS.icon('plus')}</button><button class="glass-btn round" data-zout aria-label="Alejar">${OS.icon('minus')}</button></div>
        <div class="mp-sheet glass">
          <div class="sheet-grab"></div>
          <label class="search-field mp-search">${OS.icon('search')}<input placeholder="Buscar en Mapas" aria-label="Buscar en Mapas">${OS.icon('mic')}</label>
          <div class="mp-content"></div>
        </div>`;

      const svg = root.querySelector('.mp-svg');
      const stage = root.querySelector('.mp-stage');
      const content = root.querySelector('.mp-content');
      const sheet = root.querySelector('.mp-sheet');

      function apply(animated = false) {
        const W = OS.W, H = OS.H;
        svg.style.transition = animated ? 'transform .6s cubic-bezier(.2,.9,.24,1)' : 'none';
        svg.style.transform = `translate(${W / 2 - view.x * view.z}px, ${H * 0.42 - view.y * view.z}px) scale(${view.z})`;
      }

      function list(filter = '') {
        const q = OS.util.norm(filter);
        const arr = PLACES.filter((p) => !q || OS.util.norm(p.name + ' ' + p.sub).includes(q));
        content.innerHTML = `${!q ? `<div class="mp-quick">${PLACES.slice(0, 4).map((p) => `<button data-p="${p.id}"><span style="background:${p.color}">${OS.icon(p.icon)}</span><small>${esc(p.name)}</small></button>`).join('')}</div><h3 class="mp-h">Lugares cercanos</h3>` : ''}
          <div class="mp-list">${arr.map((p) => `<div class="mp-row" data-p="${p.id}"><span style="background:${p.color}">${OS.icon(p.icon)}</span><div><b>${esc(p.name)}</b><small>${esc(p.sub)} · ${dist(p)}</small></div></div>`).join('') || '<p class="mp-empty">Sin resultados</p>'}</div>`;
      }

      function dist(p) {
        const d = Math.hypot(p.x - ME.x, p.y - ME.y) * 1.6;
        return d > 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(d / 10) * 10 + ' m';
      }

      function select(id) {
        const p = PLACES.find((x) => x.id === id);
        if (!p) return;
        selected = p;
        view = { x: p.x, y: p.y + 140 / Math.max(view.z, 0.8), z: Math.max(view.z, 0.8) };
        apply(true);
        root.querySelectorAll('.mp-pin').forEach((g) => g.classList.toggle('sel', g.dataset.id === id));
        const mins = Math.max(2, Math.round(Math.hypot(p.x - ME.x, p.y - ME.y) / 60));
        content.innerHTML = `<div class="mp-place"><div class="mp-ph"><div><h2>${esc(p.name)}</h2><small>${esc(p.sub)} · ${dist(p)}</small></div><button class="glass-btn round" data-close aria-label="Cerrar">${OS.icon('close')}</button></div>
          <div class="mp-btns"><button class="btn" data-route>${OS.icon('location')} ${mins} min</button><button class="btn gray" data-call>${OS.icon('phone')}</button><button class="btn gray" data-web>${OS.icon('globe')}</button></div>
          <div class="mp-info"><div><small>HORARIO</small><b>Abierto</b></div><div><small>VALORACIÓN</small><b>4,${6 + (p.x % 3)} ★</b></div><div><small>DISTANCIA</small><b>${dist(p)}</b></div></div></div>`;
        sheet.classList.add('tall');
      }

      function drawRoute(p) {
        const pts = [[ME.x, ME.y], [p.x, ME.y], [p.x, p.y]];
        root.querySelector('.mp-route').innerHTML = `<polyline points="${pts.map((q) => q.join(',')).join(' ')}" class="mp-rt-b"/><polyline points="${pts.map((q) => q.join(',')).join(' ')}" class="mp-rt"/>`;
        const len = Math.abs(p.x - ME.x) + Math.abs(p.y - ME.y);
        const mins = Math.max(2, Math.round(len / 60));
        view = { x: (ME.x + p.x) / 2, y: (ME.y + p.y) / 2 + 100, z: clamp(700 / Math.max(300, len), 0.35, 1.2) };
        apply(true);
        const turn = p.x > ME.x ? 'derecha' : 'izquierda';
        OS.island.set('nav', {
          priority: 4,
          width: 206,
          expandedHeight: 120,
          left: () => `<span style="color:#30d158">${OS.icon(p.x > ME.x ? 'arrowRight' : 'arrowLeft')}</span>`,
          right: () => `<span style="color:#30d158">${Math.round(Math.abs(p.x - ME.x) * 1.6)} m</span>`,
          expanded: () => `<div class="isl-row"><span style="font-size:34px;color:#30d158">${OS.icon(p.x > ME.x ? 'arrowRight' : 'arrowLeft')}</span><div style="flex:1"><div class="isl-title" style="font-size:20px">${Math.round(Math.abs(p.x - ME.x) * 1.6)} m</div><div class="isl-sub">Gira a la ${turn} hacia ${esc(p.name)}</div></div><button class="isl-btn red" data-act="end">${OS.icon('close')}</button></div>`,
          onAction: (a) => { if (a === 'end') endRoute(); },
          onTap: () => OS.windows.open('maps'),
        });
        content.innerHTML = `<div class="mp-place"><div class="mp-ph"><div><h2>${mins} min</h2><small>${(len * 1.6 / 1000).toFixed(1).replace('.', ',')} km · Llegada ${OS.util.fmt.time(new Date(Date.now() + mins * 60000))}</small></div><button class="btn" style="background:var(--red)" data-end>Finalizar</button></div>
          <div class="mp-step">${OS.icon(p.x > ME.x ? 'arrowRight' : 'arrowLeft')}<div><b>Gira a la ${turn}</b><small>en ${Math.round(Math.abs(p.x - ME.x) * 1.6)} m hacia ${esc(p.name)}</small></div></div></div>`;
      }

      function endRoute() {
        root.querySelector('.mp-route').innerHTML = '';
        OS.island.clear('nav');
        sheet.classList.remove('tall');
        list();
      }

      content.addEventListener('click', (e) => {
        const p = e.target.closest('[data-p]');
        if (p) { select(p.dataset.p); return; }
        if (e.target.closest('[data-close]')) { selected = null; sheet.classList.remove('tall'); root.querySelectorAll('.mp-pin').forEach((g) => g.classList.remove('sel')); list(); return; }
        if (e.target.closest('[data-route]') && selected) { drawRoute(selected); return; }
        if (e.target.closest('[data-end]')) { endRoute(); return; }
        if (e.target.closest('[data-call]')) { OS.ui.toast('Llamando a ' + selected.name + '…', 'phone'); return; }
        if (e.target.closest('[data-web]')) OS.ui.toast('Sitio web no disponible', 'globe');
      });
      root.querySelector('.mp-search input').addEventListener('input', (e) => { sheet.classList.add('tall'); list(e.target.value); });
      root.querySelector('.mp-search input').addEventListener('keydown', (e) => e.stopPropagation());
      root.querySelector('[data-loc]').addEventListener('click', () => { view = { x: ME.x, y: ME.y, z: 0.62 }; apply(true); });
      root.querySelector('[data-zin]').addEventListener('click', () => { view.z = clamp(view.z * 1.4, 0.3, 3); apply(true); });
      root.querySelector('[data-zout]').addEventListener('click', () => { view.z = clamp(view.z / 1.4, 0.3, 3); apply(true); });
      svg.addEventListener('click', (e) => { const g = e.target.closest('.mp-pin'); if (g) select(g.dataset.id); });

      // Arrastrar para desplazar, rueda para zoom
      stage.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.mp-pin')) return;
        const s = pt(e), v0 = { ...view };
        stage.setPointerCapture(e.pointerId);
        const move = (ev) => {
          const q = pt(ev);
          view.x = clamp(v0.x - (q.x - s.x) / view.z, 0, SIZE);
          view.y = clamp(v0.y - (q.y - s.y) / view.z, 0, SIZE);
          apply();
        };
        const up = () => { stage.removeEventListener('pointermove', move); stage.removeEventListener('pointerup', up); };
        stage.addEventListener('pointermove', move);
        stage.addEventListener('pointerup', up);
      });
      stage.addEventListener('wheel', (e) => { e.preventDefault(); view.z = clamp(view.z * (e.deltaY < 0 ? 1.12 : 0.89), 0.3, 3); apply(); }, { passive: false });
      stage.addEventListener('dblclick', () => { view.z = clamp(view.z * 1.6, 0.3, 3); apply(true); });

      // Hoja inferior: arrastrar para expandir
      sheet.querySelector('.sheet-grab').addEventListener('click', () => sheet.classList.toggle('tall'));

      list();
      apply();
      return { statusStyle: () => (OS.state.isDark() ? 'light' : 'dark'), onShow() { apply(); } };
    },
  });
})();
