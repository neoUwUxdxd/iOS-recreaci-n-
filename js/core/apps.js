/* Catálogo de apps: nombre, estilo de icono y diseño por defecto de la pantalla de inicio. */
(function () {
  'use strict';

  const G = OS.glyphs;

  /** Reutiliza un glifo 24×24 dentro del lienzo 60×60 de un icono. */
  const ui = (name, s = 1.55, dx, dy) => {
    const off = 30 - 12 * s;
    return `<g style="color:var(--g1)" fill="currentColor" transform="translate(${dx ?? off} ${dy ?? off}) scale(${s})">${G[name]}</g>`;
  };

  const petals = ['#ff9f0a', '#ffd60a', '#34c759', '#30b0c7', '#0a84ff', '#5e5ce6', '#bf5af2', '#ff375f']
    .map((c, i) => `<ellipse class="pt m${(i % 2) + 1}" cx="30" cy="18.5" rx="6.6" ry="11.2" fill="${c}" transform="rotate(${i * 45} 30 30)"/>`)
    .join('');

  const ticks = Array.from({ length: 12 }, (_, i) => {
    const big = i % 3 === 0;
    return `<rect class="tick" x="${big ? 29.1 : 29.4}" y="9" width="${big ? 1.8 : 1.2}" height="${big ? 4.4 : 3}" rx=".6" transform="rotate(${i * 30} 30 30)"/>`;
  }).join('');

  const DEFS = [
    {
      id: 'settings', name: 'Ajustes', bg: 'linear-gradient(180deg,#d4d4d9,#8c8c93)', fg: '#4a4a50', fg2: '#e9e9ee', acc: '#aeaeb2', acc2: '#3a3a3c',
      art: `<path class="g1" fill-rule="evenodd" d="${OS.gearPath(30, 30, 25.5, 21.5, 36, 0)}"/><circle class="g2" cx="30" cy="30" r="17.5"/><path class="g1" fill-rule="evenodd" d="${OS.gearPath(30, 30, 13.5, 10, 8, 4.5)}"/>`,
    },
    {
      id: 'calculator', name: 'Calculadora', bg: 'linear-gradient(180deg,#3a3a3c,#141416)', acc: '#ff9f0a',
      art: `<circle class="m2" cx="19.5" cy="19.5" r="9.5" fill="#d4d4d2"/><circle class="m1" cx="40.5" cy="19.5" r="9.5" fill="#ff9f0a"/><circle class="m3" cx="19.5" cy="40.5" r="9.5" fill="#5b5b5f"/><circle class="m1" cx="40.5" cy="40.5" r="9.5" fill="#ff9f0a"/>
        <g class="sym" stroke-width="2.4" stroke-linecap="round" fill="none"><path d="M15.5 19.5h8" stroke="#1c1c1e"/><path d="M36.5 19.5h8M40.5 15.5v8" stroke="#fff"/><path d="M16.6 37.6l5.8 5.8M22.4 37.6l-5.8 5.8" stroke="#fff"/><path d="M36.5 38.5h8M36.5 42.5h8" stroke="#fff"/></g>`,
    },
    {
      id: 'clock', name: 'Reloj', bg: 'linear-gradient(180deg,#1c1c1e,#000)', fg: '#fff', acc: '#fff',
      art: `<circle class="g1" cx="30" cy="30" r="24"/>${ticks}
        <rect class="hand hh" x="28.8" y="16.5" width="2.4" height="15" rx="1.2"/>
        <rect class="hand mh" x="29" y="11" width="2" height="20.5" rx="1"/>
        <g class="sh"><rect class="m1" x="29.4" y="10" width="1.2" height="25" rx=".6" fill="#ff9500"/><circle class="m1" cx="30" cy="30" r="2.1" fill="#ff9500"/></g>
        <circle cx="30" cy="30" r=".9" fill="#fff"/>`,
    },
    {
      id: 'calendar', name: 'Calendario', bg: '#ffffff', fg: '#1c1c1e', acc: '#fff',
      art: `<text class="m1 cal-day" x="30" y="17.5" text-anchor="middle" font-size="9.5" font-weight="600" letter-spacing=".4" fill="#ff3b30">LUN</text>
        <text class="g1 cal-num" x="30" y="46" text-anchor="middle" font-size="30" font-weight="300">1</text>`,
    },
    {
      id: 'notes', name: 'Notas', bg: '#ffffff', fg: '#ffcc00', fg2: '#d1d1d6', acc: '#ffd60a', acc2: '#48484a',
      art: `<rect class="g1" x="0" y="0" width="60" height="17"/><g class="g2">${Array.from({ length: 11 }, (_, i) => `<circle cx="${5 + i * 5}" cy="20.5" r="1"/>`).join('')}
        <rect x="7" y="30" width="46" height="1.6" rx=".8"/><rect x="7" y="38.5" width="46" height="1.6" rx=".8"/><rect x="7" y="47" width="46" height="1.6" rx=".8"/></g>`,
    },
    {
      id: 'reminders', name: 'Recordatorios', bg: '#ffffff', fg: '#d1d1d6', acc: '#48484a',
      art: `${[['#0a84ff', 16], ['#ff3b30', 30], ['#ff9f0a', 44]].map(([c, y], i) => `<circle class="m${i + 1}" cx="15" cy="${y}" r="5.2" fill="${c}"/><circle cx="15" cy="${y}" r="2.8" fill="#fff" class="hole"/><rect class="g1" x="25" y="${y - 1}" width="26" height="2" rx="1"/>`).join('')}`,
    },
    {
      id: 'weather', name: 'Tiempo', bg: 'linear-gradient(180deg,#58a8f8,#1f6fdc)', acc: '#5ac8fa',
      art: `<circle class="m1" cx="22" cy="22" r="10.5" fill="#ffd60a"/><path class="g1" d="M19 46a8.6 8.6 0 0 1-1.2-17.1 11.5 11.5 0 0 1 21.8 3A7.4 7.4 0 0 1 39 46z"/>`,
    },
    {
      id: 'photos', name: 'Fotos', bg: '#ffffff', acc: '#fff',
      art: `<g class="petals">${petals}</g>`,
    },
    {
      id: 'camera', name: 'Cámara', bg: 'linear-gradient(180deg,#ececf0,#a2a2a9)', fg: '#2c2c2e', fg2: '#d8d8dc', acc: '#d8d8dc', acc2: '#1c1c1e',
      art: `<path class="g1" d="M22 15h16l2.6 4H47a5 5 0 0 1 5 5v18a5 5 0 0 1-5 5H13a5 5 0 0 1-5-5V24a5 5 0 0 1 5-5h6.4z"/><circle class="g2" cx="30" cy="33" r="10"/><circle class="g1" cx="30" cy="33" r="6.5"/><circle cx="27.6" cy="30.6" r="1.6" fill="#fff" opacity=".6"/><circle class="m1" cx="45" cy="24.5" r="1.8" fill="#ffd60a"/>`,
    },
    {
      id: 'messages', name: 'Mensajes', bg: 'linear-gradient(180deg,#6ef07e,#0bc13c)', acc: '#30d158',
      art: `<path class="g1" d="M30 11c11.6 0 21 7.6 21 17s-9.4 17-21 17c-2 0-4-.2-5.8-.7-2.6 2.2-6.4 3.6-10.5 3.7 1.8-1.7 3-3.7 3.4-6C12 38.8 9 33.8 9 28c0-9.4 9.4-17 21-17z"/>`,
    },
    {
      id: 'phone', name: 'Teléfono', bg: 'linear-gradient(180deg,#6ef07e,#0bc13c)', acc: '#30d158',
      art: ui('phone', 1.75, 9, 9.5),
    },
    {
      id: 'safari', name: 'Safari', bg: '#ffffff', acc: '#0a84ff',
      art: `<circle class="m1" cx="30" cy="30" r="24" fill="#1a8cff"/><circle cx="30" cy="30" r="21" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray=".8 3.5" class="dial"/>
        <path class="m2" d="M30 30l13-13-7.6 16.4z" fill="#ff3b30"/><path class="needle" d="M30 30L17 43l7.6-16.4z" fill="#fff"/>`,
    },
    {
      id: 'music', name: 'Música', bg: 'linear-gradient(180deg,#ff6c84,#f9233f)', acc: '#ff375f',
      art: ui('note', 1.6, 10.5, 11),
    },
    {
      id: 'maps', name: 'Mapas', bg: 'linear-gradient(135deg,#f5f3ea,#dcecc9)', fg: '#ffffff', fg2: '#b4dc98', acc: '#8e8e93', acc2: '#3a3a3c',
      art: `<path class="g2" d="M0 38c10-2 16 4 24 2s8-10 18-12 14 2 18 2v30H0z"/><path class="g1" d="M-2 22L62 44" stroke="#fff" stroke-width="7"/><path class="m1 road" d="M-2 22L62 44" stroke="#ffcc3d" stroke-width="3" fill="none"/>
        <path class="m2" d="M30 10a8 8 0 0 1 8 8c0 6-8 14-8 14s-8-8-8-14a8 8 0 0 1 8-8z" fill="#ff3b30"/><circle cx="30" cy="18" r="3" fill="#fff"/>`,
    },
    {
      id: 'siri', name: 'Siri', bg: 'radial-gradient(circle at 50% 120%,#1a1030,#000 70%)', acc: '#fff',
      html: '<div class="siri-orb"><i></i><i></i><i></i></div>',
    },
    {
      id: 'mail', name: 'Correo', bg: 'linear-gradient(180deg,#3ab6ff,#0a6af4)', acc: '#0a84ff',
      art: ui('envelope', 1.75, 9, 7.5),
    },
    {
      id: 'files', name: 'Archivos', bg: '#ffffff', fg: '#1a8cff', acc: '#1a8cff',
      art: `<path class="m2" d="M8 17a4 4 0 0 1 4-4h11l4 4h21a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z" fill="#6ab8ff"/><path class="g1" d="M8 24a4 4 0 0 1 4-4h36a4 4 0 0 1 4 4v19a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z"/>`,
    },
    {
      id: 'health', name: 'Salud', bg: '#ffffff', acc: '#ff2d55',
      art: `<path class="m1" d="M44 34s-13-7.6-13-16.6A7 7 0 0 1 44 13.8a7 7 0 0 1 13 3.6C57 26.4 44 34 44 34z" fill="#ff2d55" transform="translate(-14 4) scale(1.05)"/>`,
    },
    {
      id: 'wallet', name: 'Cartera', bg: 'linear-gradient(180deg,#1c1c1e,#000)', acc: '#fff',
      art: `<rect class="m1" x="10" y="13" width="40" height="12" rx="3" fill="#30c3f0"/><rect class="m2" x="10" y="18" width="40" height="12" rx="3" fill="#ffc53d"/><rect class="m3" x="10" y="23" width="40" height="12" rx="3" fill="#ff9f0a"/><rect class="m1" x="10" y="28" width="40" height="12" rx="3" fill="#ff5a4f"/>
        <path class="g1" d="M8 33h14c1.2 3.5 4.3 5.6 8 5.6s6.8-2.1 8-5.6h14v12a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z" fill="#2c2c2e" style="fill:var(--g1)"/>`,
      fg: '#3a3a3c',
    },
    {
      id: 'podcasts', name: 'Podcasts', bg: 'linear-gradient(180deg,#d770fd,#8a33e0)', acc: '#bf5af2',
      art: `<g fill="none" stroke-width="3" stroke-linecap="round" class="rings"><path d="M19.8 40.2a14.4 14.4 0 1 1 20.4 0" style="stroke:var(--g1)"/><path d="M24 35.5a8.4 8.4 0 1 1 12 0" style="stroke:var(--g1)"/></g><circle class="g1" cx="30" cy="29.5" r="3.6"/><rect class="g1" x="27.6" y="35" width="4.8" height="14" rx="2.4"/>`,
    },
    {
      id: 'home', name: 'Casa', bg: 'linear-gradient(180deg,#ffb23f,#ff8200)', acc: '#ff9f0a',
      art: ui('house', 1.6, 10.8, 10),
    },
    {
      id: 'books', name: 'Libros', bg: 'linear-gradient(180deg,#ffa63c,#ff7700)', acc: '#ff9f0a',
      art: ui('book', 1.55, 11.4, 11),
    },
    {
      id: 'fitness', name: 'Fitness', bg: '#000000', acc: '#fff',
      art: `<g fill="none" stroke-linecap="round" stroke-width="5.2"><circle class="ms1" cx="30" cy="30" r="20" stroke="#fa114f" stroke-dasharray="100 200" transform="rotate(-90 30 30)"/><circle class="ms2" cx="30" cy="30" r="13.8" stroke="#a6ff00" stroke-dasharray="70 200" transform="rotate(-90 30 30)"/><circle class="ms3" cx="30" cy="30" r="7.6" stroke="#00f0ff" stroke-dasharray="40 200" transform="rotate(-90 30 30)"/></g>`,
    },
    {
      id: 'translate', name: 'Traducir', bg: 'linear-gradient(180deg,#2d7cf6,#0b3fb3)', acc: '#0a84ff',
      art: ui('translate', 1.55, 11, 11.5),
    },
  ];

  const byId = {};
  DEFS.forEach((d) => { byId[d.id] = d; });

  const DEFAULT_LAYOUT = {
    pages: [
      { widgets: ['weather', 'calendar'], apps: ['photos', 'camera', 'clock', 'maps', 'notes', 'reminders', 'weather', 'siri', 'mail', 'calculator', 'wallet', 'settings', 'health', 'files', 'podcasts', 'calendar'] },
      { widgets: ['photosLarge'], apps: ['home', 'books', 'fitness', 'translate'] },
    ],
    dock: ['phone', 'safari', 'messages', 'music'],
  };

  /** HTML de un icono de app. */
  function iconHTML(id, extra = '') {
    const d = byId[id];
    if (!d) return '';
    const style = [
      `--bg:${d.bg}`,
      `--fg:${d.fg || '#fff'}`,
      `--fg2:${d.fg2 || 'rgba(255,255,255,.65)'}`,
      `--acc:${d.acc || d.fg || '#fff'}`,
      `--acc2:${d.acc2 || 'rgba(255,255,255,.35)'}`,
    ].join(';');
    const art = d.html ? d.html : `<svg viewBox="0 0 60 60" aria-hidden="true">${d.art}</svg>`;
    return `<div class="app-icon ${extra}" data-app="${id}" style="${style}"><div class="app-icon-art">${art}</div></div>`;
  }

  /** Actualiza iconos dinámicos (reloj y calendario). */
  function updateDynamicIcons(root = document) {
    const now = new Date();
    const s = now.getSeconds(), m = now.getMinutes(), hh = now.getHours() % 12;
    root.querySelectorAll('.app-icon[data-app="clock"] svg').forEach((svg) => {
      const H = svg.querySelector('.hh'), M = svg.querySelector('.mh'), Sg = svg.querySelector('.sh');
      if (H) H.setAttribute('transform', `rotate(${hh * 30 + m * 0.5} 30 30)`);
      if (M) M.setAttribute('transform', `rotate(${m * 6 + s * 0.1} 30 30)`);
      if (Sg) Sg.setAttribute('transform', `rotate(${s * 6} 30 30)`);
    });
    const day = now.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '').toUpperCase();
    root.querySelectorAll('.app-icon[data-app="calendar"] svg').forEach((svg) => {
      const a = svg.querySelector('.cal-day'), b = svg.querySelector('.cal-num');
      if (a && a.textContent !== day) a.textContent = day;
      if (b && b.textContent !== String(now.getDate())) b.textContent = now.getDate();
    });
  }

  OS.appDefs = byId;
  OS.appList = DEFS;
  OS.DEFAULT_LAYOUT = DEFAULT_LAYOUT;
  OS.iconHTML = iconHTML;
  OS.updateDynamicIcons = updateDynamicIcons;

  /* Registro de módulos de apps. Cada módulo implementa create(root, ctx). */
  OS.appModules = {};
  OS.registerApp = function (id, mod) { OS.appModules[id] = mod; };
})();
