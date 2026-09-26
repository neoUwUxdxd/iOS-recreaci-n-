/* Pantalla bloqueada: reloj (normal o compacto), widgets, notificaciones y desbloqueo. */
(function () {
  'use strict';

  const { h, esc, fmt, clamp, pt, animate, ease } = OS.util;
  const S = OS.state;

  const lock = document.getElementById('lock');
  lock.innerHTML = `
    <div class="lock-wp"></div>
    <div class="lock-content">
      <div class="lock-padlock">${OS.icon('lock')}</div>
      <div class="lock-head">
        <div class="lock-date"><span class="ldate"></span><span class="ctime"></span></div>
        <div class="lock-clock"></div>
        <div class="lock-widgets"></div>
      </div>
      <div class="lock-notifs"></div>
      <button class="lock-quick left glass-clear" data-q="torch" aria-label="Linterna">${OS.icon('flashlight')}</button>
      <button class="lock-quick right glass-clear" data-q="camera" aria-label="Cámara">${OS.icon('camera')}</button>
      <div class="lock-hint">Desliza hacia arriba para abrir</div>
    </div>`;

  const $wp = lock.querySelector('.lock-wp');
  const $date = lock.querySelector('.ldate');
  const $ctime = lock.querySelector('.ctime');
  const $clock = lock.querySelector('.lock-clock');
  const $widgets = lock.querySelector('.lock-widgets');
  const $notifs = lock.querySelector('.lock-notifs');
  const $pad = lock.querySelector('.lock-padlock');
  const $hint = lock.querySelector('.lock-hint');
  const $torch = lock.querySelector('[data-q="torch"]');

  let expanded = false;

  function renderClock() {
    $date.textContent = fmt.lockDate();
    const t = fmt.clock();
    $clock.textContent = t;
    $ctime.textContent = t;
  }

  function renderStyle() {
    lock.classList.toggle('compact', S.get('compactClock'));
    $clock.classList.toggle('glass-style', S.get('clockStyle') === 'glass');
    $clock.classList.toggle('solid-style', S.get('clockStyle') !== 'glass');
  }

  function renderWallpaper() {
    OS.wallpapers.apply($wp, S.get('wallpaper'));
    lock.classList.toggle('on-light', $wp.classList.contains('wp-light'));
  }

  function ring(v, color = '#fff') {
    const r = 21, c = 2 * Math.PI * r;
    return `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="${r}" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="4"/><circle cx="24" cy="24" r="${r}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${c * v} ${c}"/></svg>`;
  }

  function renderWidgets() {
    const b = S.get('battery');
    const w = OS.weatherNow ? OS.weatherNow() : { temp: 22, icon: 'sun' };
    const next = OS.nextEvent ? OS.nextEvent() : null;
    $widgets.innerHTML = `
      <div class="lw glass-clear" title="Batería"><div class="lw-ring">${ring(b.level, b.charging ? '#30d158' : 'currentColor')}<span style="font-size:13px;font-weight:700">${Math.round(b.level * 100)}</span></div></div>
      <div class="lw glass-clear" title="Tiempo">${OS.icon(w.icon || 'sun')}<b>${w.temp}°</b></div>
      <div class="lw lw-wide glass-clear" title="Calendario"><small>${next ? esc(next.when) : 'CALENDARIO'}</small><b>${next ? esc(next.title) : 'Sin eventos'}</b></div>`;
  }

  function renderNotifs() {
    const list = OS.notifs.list;
    const player = OS.music && OS.music.lockPlayerHTML ? OS.music.lockPlayerHTML() : '';
    const shown = expanded ? list.slice(0, 6) : list.slice(0, 3);
    let html = player;
    if (shown.length) {
      if (expanded || shown.length === 1) html += shown.map((n) => OS.notifs.itemHTML(n)).join('');
      else {
        const more = list.length - 1;
        html += `<div class="nstack">${OS.notifs.itemHTML(shown[0])}${shown.slice(1, 3).map((_, i) => `<i class="ghost glass g${i + 1}"></i>`).join('')}</div>
          <div class="nstack-more">${more} notificaci${more === 1 ? 'ón' : 'ones'} más</div>`;
      }
    }
    $notifs.innerHTML = html;
    $notifs.style.bottom = S.get('compactClock') ? '118px' : '118px';
  }

  $notifs.addEventListener('click', (e) => {
    const ctrl = e.target.closest('[data-mctrl]');
    if (ctrl) { e.stopPropagation(); OS.music && OS.music.control(ctrl.dataset.mctrl); return; }
    if (e.target.closest('.nstack-more')) { e.stopPropagation(); expanded = true; renderNotifs(); return; }
    const it = e.target.closest('.lnotif');
    if (!it) return;
    e.stopPropagation();
    const multiple = OS.notifs.list.length > 1;
    if (!expanded && multiple) { expanded = true; renderNotifs(); return; }
    const n = OS.notifs.list.find((x) => x.id === it.dataset.id);
    if (n) api.unlock(() => { OS.notifs.remove(n.id); OS.notifs.openFor(n); });
  });

  lock.addEventListener('click', (e) => {
    const q = e.target.closest('[data-q]');
    if (q) {
      e.stopPropagation();
      OS.util.haptic(15);
      if (q.dataset.q === 'torch') OS.system.torch(!S.get('torch'));
      else api.unlock(() => OS.windows.open('camera'));
      return;
    }
    if (!e.target.closest('.lock-notifs')) {
      if (expanded) { expanded = false; renderNotifs(); }
      showHint();
    }
  });

  let hintTimer = null;
  function showHint() {
    $hint.classList.add('show');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => $hint.classList.remove('show'), 2200);
  }

  /* ---------- Desbloqueo con gesto ---------- */
  const home = document.getElementById('home');
  const appsLayer = document.getElementById('apps-layer');

  function underlay(p) {
    // p: 0 (bloqueado) → 1 (desbloqueado)
    const target = OS.sys.current ? appsLayer : home;
    target.style.transition = 'none';
    target.style.transform = `scale(${1.12 - 0.12 * p})`;
    target.style.opacity = String(clamp(p * 1.4, 0, 1));
  }
  function clearUnderlay() {
    [home, appsLayer].forEach((t) => { t.style.transition = ''; t.style.transform = ''; t.style.opacity = ''; });
  }

  lock.addEventListener('pointerdown', (e) => startDrag(e));

  /** Arrastre de desbloqueo (también lo inicia el indicador de inicio). */
  function startDrag(e) {
    if (!S.get('locked') || e.button !== 0) return;
    if (e.target.closest('#lock button, [data-mctrl]')) return;
    const p0 = pt(e);
    if (p0.y < 50) return; // zona de sistema superior
    const t0 = performance.now();
    let dy = 0;
    let dragging = false;
    // Sin captura de puntero: así los toques en notificaciones siguen generando «click»
    const move = (ev) => {
      dy = Math.min(0, pt(ev).y - p0.y);
      if (!dragging && dy < -10) { dragging = true; lock.style.transition = 'none'; }
      if (dragging) {
        lock.style.transform = `translateY(${dy}px)`;
        underlay(clamp(-dy / (OS.H * 0.6), 0, 1));
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!dragging) return;
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 50);
      const v = dy / Math.max(1, performance.now() - t0);
      if (dy < -OS.H * 0.16 || v < -0.6) api.unlock();
      else {
        lock.style.transition = '';
        const a = animate(lock, [{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }], { duration: 380, easing: ease.springOut, fill: 'none' });
        lock.style.transform = '';
        a.onfinish = clearUnderlay;
        underlay(0);
        setTimeout(clearUnderlay, 60);
        showHint();
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }
  let suppressClick = false;
  lock.addEventListener('click', (e) => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); } }, true);

  const api = {
    el: lock,
    startDrag,
    unlock(cb) {
      if (!S.get('locked')) { cb && cb(); return; }
      const from = lock.style.transform || 'translateY(0)';
      lock.style.transition = 'none';
      $pad.innerHTML = OS.icon('lockOpen');
      OS.audio.unlock();
      const a = animate(lock, [{ transform: from }, { transform: `translateY(${-OS.H}px)` }], { duration: 420, easing: ease.smooth });
      const target = OS.sys.current ? appsLayer : home;
      target.style.transition = 'none';
      animate(target, [{ transform: target.style.transform || 'scale(1.12)', opacity: target.style.opacity || 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 560, easing: ease.spring, fill: 'none' });
      target.style.transform = ''; target.style.opacity = '';
      S.set('locked', false);
      expanded = false;
      OS.chrome.update();
      a.onfinish = () => {
        lock.classList.add('hidden');
        lock.style.transform = '';
        a.cancel();
        clearUnderlay();
        cb && cb();
      };
    },
    lock() {
      expanded = false;
      $pad.innerHTML = OS.icon('lock');
      lock.classList.remove('hidden');
      lock.style.transform = '';
      lock.style.transition = '';
      S.set('locked', true);
      if (OS.cc) OS.cc.close(true);
      if (OS.nc && OS.nc.isOpen) OS.nc.close();
      if (OS.siri) OS.siri.close();
      if (OS.spotlight) OS.spotlight.close();
      if (OS.home) OS.home.exitEdit();
      renderAll();
      OS.chrome.update();
    },
    render: renderAll,
    showHint,
  };

  function renderAll() {
    renderClock();
    renderStyle();
    renderWidgets();
    renderNotifs();
  }

  S.on('compactClock', renderStyle);
  S.on('clockStyle', renderStyle);
  S.on('wallpaper', renderWallpaper);
  S.on('battery', () => { if (S.get('locked')) renderWidgets(); });
  S.on('torch', (v) => $torch.classList.toggle('on', v));
  OS.bus.on('notifs', () => { if (S.get('locked')) renderNotifs(); });
  OS.bus.on('music', () => { if (S.get('locked')) renderNotifs(); });
  OS.bus.on('minute', () => { renderClock(); if (S.get('locked')) renderWidgets(); });

  renderWallpaper();
  OS.lock = api;
  OS.lockRender = renderAll;
})();
