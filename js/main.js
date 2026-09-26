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
      // Barra de estado real de iOS visible encima (web app a pantalla completa):
      // la franja de estado simulada se esconde bajo ella (ver base.css)
      const realBars = ins.t >= 20;
      root.classList.toggle('real-bars', realBars);
      H = Math.round(vh - (realBars ? ins.t - 30 : ins.t) - ins.b);
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
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#000000' : '#0b0b0f');
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

  // Si la página que nos contiene fija un tema en <html data-theme>, síguelo en «Automático»
  if (window.MutationObserver) {
    new MutationObserver(() => { if (S.get('theme') === 'auto') applyTheme(); })
      .observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }

  // Teclado virtual (iPhone): sube las barras inferiores para que no queden tapadas
  if (window.visualViewport) {
    const vv = window.visualViewport;
    const onVV = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty('--kb', (kb > 80 ? kb / (OS.scale || 1) : 0) + 'px');
      root.classList.toggle('kb-open', kb > 80);
    };
    vv.addEventListener('resize', onVV);
    vv.addEventListener('scroll', onVV);
  }

  // En iOS Safari, :active solo se aplica si hay algún manejador de toque
  document.addEventListener('touchstart', () => {}, { passive: true });

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

  // Animación de encendido: el fondo aparece desde negro y el reloj sube a su sitio
  if (!OS.util.reducedMotion()) {
    OS.util.animate(document.querySelector('#lock .lock-wp'), [{ opacity: 0, transform: 'scale(1.08)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 1100, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'none' });
    OS.util.animate(document.querySelector('#lock .lock-content'), [{ opacity: 0, transform: 'translateY(18px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 900, delay: 250, easing: 'cubic-bezier(.2,.9,.24,1)', fill: 'backwards' });
  }

  // Primer arranque: muestra la indicación de desbloqueo
  setTimeout(() => OS.lock.showHint(), 1400);

  // Bienvenida (solo la primera vez): explica los gestos, sobre todo en el móvil
  OS.bus.on('unlocked', () => {
    if (OS.util.store.get('onboarded', false)) return;
    OS.util.store.set('onboarded', true);
    setTimeout(showWelcome, 500);
  });

  function showWelcome() {
    const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const tips = [
      ['arrowUp', '#0a84ff', 'Ir a inicio', touch ? 'Desliza hacia arriba desde la barrita inferior. Desliza y mantén para ver las apps abiertas.' : 'Desliza hacia arriba desde abajo o pulsa Esc. Mantén el gesto (o pulsa A) para la multitarea.'],
      ['grid', '#8e8e93', 'Centro de control', touch ? 'Desliza hacia abajo desde la esquina superior derecha.' : 'Desliza hacia abajo desde la esquina superior derecha o pulsa C.'],
      ['sparkles', '#bf5af2', 'Siri AI', 'Abre la app Siri o mantén pulsado el botón lateral y pide lo que quieras.'],
      ['droplet', '#30b0c7', 'Liquid Glass a tu gusto', 'En Ajustes → Liquid Glass elige entre transparente y tintado.'],
    ];
    const content = OS.util.h(`<div class="welcome">
      <div class="welcome-badge">27</div>
      <h2>Bienvenido a iOS 27</h2>
      <div class="welcome-tips">${tips.map(([i, c, t, d]) => `<div class="welcome-tip"><span style="color:${c}">${OS.icon(i)}</span><div><b>${t}</b><p>${d}</p></div></div>`).join('')}</div>
      <button class="btn block" data-go>Continuar</button></div>`);
    const sh = OS.ui.sheet({ title: '', content });
    content.querySelector('[data-go]').addEventListener('click', () => sh.close());
  }

  // Precalienta el audio con la primera interacción (política de autoplay)
  const warm = () => { OS.audio.ensure(); window.removeEventListener('pointerdown', warm); };
  window.addEventListener('pointerdown', warm);

  document.body.classList.add('ready');
})();
