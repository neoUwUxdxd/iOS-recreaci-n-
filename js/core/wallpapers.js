/* Fondos de pantalla generados con degradados y manchas animadas (sin imágenes externas). */
(function () {
  'use strict';

  const W = [
    {
      id: 'liquid', name: 'Líquido',
      base: 'linear-gradient(165deg,#10245e 0%,#2a2a8a 45%,#5a1f7a 100%)',
      blobs: ['#4fd1ff', '#7b5cff', '#ff5fae', '#ffb35c'],
    },
    {
      id: 'sunset', name: 'Atardecer',
      base: 'linear-gradient(170deg,#ff8a5b 0%,#f2557a 50%,#4b1d6b 100%)',
      blobs: ['#ffd36e', '#ff6f91', '#9b5de5', '#ff9a3c'],
    },
    {
      id: 'aurora', name: 'Aurora',
      base: 'linear-gradient(170deg,#021c24 0%,#07333a 55%,#0c1a3a 100%)',
      blobs: ['#2cf5b0', '#1fb5ff', '#7a4dff', '#12a37f'],
    },
    {
      id: 'ocean', name: 'Océano',
      base: 'linear-gradient(175deg,#00264d 0%,#004e7c 55%,#001428 100%)',
      blobs: ['#00c6ff', '#0057ff', '#00f0c8', '#5b2cff'],
    },
    {
      id: 'bloom', name: 'Flor',
      base: 'linear-gradient(165deg,#ffd6e3 0%,#e9d6ff 55%,#c9e4ff 100%)',
      blobs: ['#ff8fbf', '#b69cff', '#ffc98a', '#8fc8ff'],
      light: true,
    },
    {
      id: 'graphite', name: 'Grafito',
      base: 'linear-gradient(170deg,#101014 0%,#1d1d25 60%,#0a0a0d 100%)',
      blobs: ['#3c3c52', '#5c5c78', '#23232e', '#77779a'],
    },
  ];

  const byId = {};
  W.forEach((w) => { byId[w.id] = w; });

  function html(w) {
    return `<div class="wp" style="background:${w.base}">
      ${w.blobs.map((c, i) => `<i class="blob b${i + 1}" style="--c:${c}"></i>`).join('')}
      <i class="wp-grain"></i>
    </div>`;
  }

  let memCustom = null;
  function customSrc() { return memCustom || OS.util.store.get('customWallpaper', null); }

  /** Aplica el fondo actual a un contenedor. */
  function apply(container, id) {
    const src = id === 'custom' ? customSrc() : null;
    if (src) {
      container.innerHTML = `<div class="wp wp-photo" style="background:#000 url(${src}) center/cover no-repeat"></div>`;
      container.dataset.wallpaper = 'custom';
      container.classList.remove('wp-light');
      return;
    }
    const w = byId[id] || W[0];
    container.innerHTML = html(w);
    container.dataset.wallpaper = w.id;
    container.classList.toggle('wp-light', !!w.light);
  }

  /** Usa una foto (p. ej. extendida con IA) como fondo de pantalla. */
  function setCustom(src) {
    memCustom = src;
    OS.util.store.set('customWallpaper', src);
    if (OS.state.get('wallpaper') === 'custom') OS.bus.emit('change:wallpaper', 'custom');
    else OS.state.set('wallpaper', 'custom');
  }

  OS.wallpapers = { list: W, byId, html, apply, setCustom, customSrc };
})();
