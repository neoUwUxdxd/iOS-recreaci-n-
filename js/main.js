/* Arranque: tamaño del dispositivo, tema, fondo, reloj del sistema y notificaciones iniciales. */
(function () {
  'use strict';

  const S = OS.state;
  const root = document.documentElement;
  const device = document.getElementById('device');
  const screen = document.getElementById('screen');

  const BASE_W = 402, BASE_H = 874, BEZ = 13;

  // Sonda para leer env(safe-area-inset-*) a través de las variables CSS
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:var(--sat) var(--sar) var(--sab) var(--sal)';
  document.body.appendChild(probe);
  function safeInsets() {
    const cs = getComputedStyle(probe);
    return { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
  }

  const standalone = !!(navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches));
  root.classList.toggle('standalone', standalone);

  function layoutDevice() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const full = vw <= 540 || (window.matchMedia('(pointer: coarse)').matches && vw < 820);
    root.classList.toggle('fullscreen', full);
    let W = BASE_W, H = BASE_H, scale = 1;
    if (full) {
      const ins = safeInsets();
      W = Math.round(vw - ins.l - ins.r);
      H = Math.round(vh - ins.t - ins.b);
      // Barra de estado real de iOS visible encima (web app a pantalla completa)
      root.classList.toggle('real-bars', ins.t >= 20);
    } else {
      const panel = vw > 860 ? 356 : 0;
      scale = Math.min(1, (vh - 36) / (H + BEZ * 2), (vw - panel - 40) / (W + BEZ * 2));
      scale = Math.max(0.45, scale);
    }
    OS.W = W; OS.H = H; OS.scale = scale;
    root.style.setProperty('--W', W + 'px');
    root.style.setProperty('--H', H + 'px');
    device.style.setProperty('--scale', scale);
    requestAnimationFrame(() => { OS.screenRect = screen.getBoundingClientRect(); });
  }

  function applyTheme() {
    const dark = S.isDark();
    screen.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]').setAttribute('content', dark ? '#000000' : '#0b0b0f');
    OS.chrome && OS.chrome.update();
    OS.bus.emit('theme', dark);
  }

  function applyGlass() { screen.style.setProperty('--glass', S.get('glass')); }
  function applyIcons() {
    screen.dataset.icons = S.get('iconStyle');
    screen.style.setProperty('--tint-h', S.get('tintHue'));
  }
  function applyWallpaper() {
    OS.wallpapers.apply(document.getElementById('wallpaper'), S.get('wallpaper'));
    OS.chrome && OS.chrome.update();
  }

  // Refracción real de Liquid Glass (backdrop-filter con SVG solo funciona en Chromium)
  const brands = (navigator.userAgentData && navigator.userAgentData.brands) || [];
  if (brands.some((b) => /Chromium|Google Chrome|Microsoft Edge/.test(b.brand))) root.classList.add('refraction');

  ['a11y-bold', 'a11y-motion', 'a11y-contrast'].forEach((c) => screen.classList.toggle(c, !!OS.util.store.get('a11y:' + c, false)));

  layoutDevice();
  applyTheme();
  applyGlass();
  applyIcons();
  applyWallpaper();

  S.on('theme', applyTheme);
  S.on('glass', applyGlass);
  S.on('iconStyle', applyIcons);
  S.on('tintHue', applyIcons);
  S.on('wallpaper', applyWallpaper);
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onMq = () => { if (S.get('theme') === 'auto') applyTheme(); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
  }

  let resizeT = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      const prevW = OS.W, prevH = OS.H;
      layoutDevice();
      if (prevW !== OS.W || prevH !== OS.H) OS.home.render();
    }, 120);
  });
  window.addEventListener('scroll', () => { OS.screenRect = screen.getBoundingClientRect(); }, true);

  OS.home.render();
  OS.lock.render();
  OS.chrome.update();

  /* ---------- Reloj del sistema ---------- */
  let lastMinute = new Date().getMinutes();
  setInterval(() => {
    const now = new Date();
    OS.statusbar.renderTime();
    if (!OS.sys.current) OS.updateDynamicIcons(document.getElementById('home'));
    if (now.getMinutes() !== lastMinute) {
      lastMinute = now.getMinutes();
      OS.bus.emit('minute', now);
    }
    OS.bus.emit('tick', now);
  }, 1000);

  /* ---------- Notificaciones de bienvenida ---------- */
  const firstRun = !OS.util.store.get('welcomed', false);
  const seed = [
    { app: 'siri', title: 'Siri', body: 'Nuevo en iOS 27: mantén pulsado el botón lateral o pulsa «S» para hablar conmigo.', ts: Date.now() - 60000 * 3 },
    { app: 'messages', title: 'Lucía', body: '¿Has probado ya iOS 27? El nuevo Liquid Glass es precioso ✨', ts: Date.now() - 60000 * 12 },
    { app: 'settings', title: 'Ajustes', body: 'Ajusta la transparencia de Liquid Glass en Ajustes → Liquid Glass.', ts: Date.now() - 60000 * 40 },
  ];
  seed.forEach((n) => OS.notifs.list.push({ id: OS.util.uid(), ...n }));
  OS.bus.emit('notifs');
  if (firstRun) OS.util.store.set('welcomed', true);

  // Primer arranque: muestra la indicación de desbloqueo
  setTimeout(() => OS.lock.showHint(), 1200);

  // Precalienta el audio con la primera interacción (política de autoplay)
  const warm = () => { OS.audio.ensure(); window.removeEventListener('pointerdown', warm); };
  window.addEventListener('pointerdown', warm);

  document.body.classList.add('ready');
})();
