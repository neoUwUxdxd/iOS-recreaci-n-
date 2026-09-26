/* Gestos de sistema (bordes superior e inferior) y atajos de teclado. */
(function () {
  'use strict';

  const { pt, clamp } = OS.util;
  const S = OS.state;
  const screen = document.getElementById('screen');

  function closeOverlays() {
    if (OS.sys.siriOpen) { OS.siri.close(); return true; }
    if (OS.cc.isOpen) { OS.cc.close(); return true; }
    if (OS.nc.isOpen) { OS.nc.close(); return true; }
    if (OS.spotlight.isOpen) { OS.spotlight.close(); return true; }
    return false;
  }

  /** Acción "ir a inicio" (gesto, tecla Esc o botón del panel). */
  function goHome() {
    if (!S.get('screenOn')) { OS.hardware.wake(); return; }
    if (closeOverlays()) return;
    if (S.get('locked')) { OS.lock.unlock(); return; }
    if (OS.sys.switcher) { OS.switcher.close(); return; }
    if (OS.sys.current) { OS.windows.goHome(); return; }
    OS.home.exitEdit();
    OS.home.goFirstPage();
  }

  function openSwitcher() {
    if (S.get('locked') || !S.get('screenOn')) return;
    closeOverlays();
    if (OS.sys.switcher) { OS.switcher.close(); return; }
    if (OS.sys.current) {
      const w = OS.windows.get(OS.sys.current);
      OS.switcher.open(OS.windows.fullFrame());
      return void w;
    }
    OS.switcher.open();
  }

  screen.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !S.get('screenOn')) return;
    const p = pt(e);
    const W = OS.W, H = OS.H;
    const topZone = p.y < 50 && !OS.island.el.contains(e.target);
    const bottomZone = p.y > H - 30;
    if (!topZone && !bottomZone) return;
    if (e.target.closest('.overlay')) return;

    /* ----- Borde superior: Centro de control / notificaciones ----- */
    if (topZone) {
      if (OS.cc.isOpen || OS.nc.isOpen) return;
      if (OS.sys.siriOpen) OS.siri.close();
      const which = p.x > W * 0.62 ? 'cc' : 'nc';
      e.stopPropagation();
      screen.setPointerCapture(e.pointerId);
      let dy = 0;
      let started = false;
      const t0 = performance.now();
      const move = (ev) => {
        dy = pt(ev).y - p.y;
        if (!started && dy > 8) started = true;
        if (!started) return;
        const prog = clamp(dy / (which === 'cc' ? 260 : H * 0.7), 0, 1);
        if (which === 'cc') OS.cc.drag(prog); else OS.nc.drag(prog);
      };
      const up = () => {
        screen.removeEventListener('pointermove', move);
        screen.removeEventListener('pointerup', up);
        screen.removeEventListener('pointercancel', up);
        const v = dy / Math.max(1, performance.now() - t0);
        if (!started) {
          // Un toque en la esquina derecha abre el Centro de control (útil con ratón);
          // en el resto de la barra de estado, sube al principio como en iOS.
          if (which === 'cc') OS.cc.open();
          else scrollToTop();
          return;
        }
        const open = dy > (which === 'cc' ? 90 : 140) || v > 0.5;
        if (which === 'cc') OS.cc.settle(open); else OS.nc.settle(open);
      };
      screen.addEventListener('pointermove', move);
      screen.addEventListener('pointerup', up);
      screen.addEventListener('pointercancel', up);
      return;
    }

    /* ----- Borde inferior: indicador de inicio ----- */
    if (S.get('locked') && !OS.nc.isOpen && !OS.cc.isOpen && !OS.sys.siriOpen) { OS.lock.startDrag(e); return; } // desbloqueo
    e.stopPropagation();
    screen.setPointerCapture(e.pointerId);
    const t0 = performance.now();
    let dx = 0, dy = 0;
    let appDrag = false;
    let lastMoveT = t0, lastY = p.y;
    let pauseTimer = null;
    let paused = false;
    let axis = null;

    const move = (ev) => {
      const q = pt(ev);
      dx = q.x - p.x; dy = q.y - p.y;
      const now = performance.now();
      if (!axis && Math.hypot(dx, dy) > 8) axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'h' : 'v';
      if (OS.sys.current && !OS.sys.switcher && !OS.cc.isOpen && !OS.nc.isOpen && !OS.sys.siriOpen && !OS.spotlight.isOpen && axis === 'v') {
        if (!appDrag) appDrag = OS.windows.dragStart();
        if (appDrag) {
          OS.windows.dragMove(dx, dy);
          const speed = Math.abs(q.y - lastY) / Math.max(1, now - lastMoveT);
          lastMoveT = now; lastY = q.y;
          clearTimeout(pauseTimer);
          paused = false;
          if (dy < -70 && speed < 0.4) pauseTimer = setTimeout(() => { paused = true; OS.util.haptic(10); }, 220);
        }
      }
    };

    const up = () => {
      screen.removeEventListener('pointermove', move);
      screen.removeEventListener('pointerup', up);
      screen.removeEventListener('pointercancel', up);
      clearTimeout(pauseTimer);
      const dt = Math.max(1, performance.now() - t0);
      const vy = dy / dt;
      if (appDrag) {
        if (paused && dy < -70) OS.windows.dragEnd('switcher');
        else if (dy < -90 || vy < -0.5) OS.windows.dragEnd('home');
        else OS.windows.dragEnd('cancel');
        return;
      }
      if (axis === 'h' && OS.sys.current && !OS.sys.switcher && Math.abs(dx) > 60) {
        // Cambiar a la app anterior / siguiente
        const list = OS.windows.running;
        const i = list.indexOf(OS.sys.current);
        const next = dx > 0 ? list[i + 1] : list[i - 1];
        if (next) OS.windows.switchTo(next, dx > 0 ? 1 : -1);
        return;
      }
      if (dy < -40 || vy < -0.4) {
        if (!OS.sys.current && !OS.sys.switcher && !closeOverlaysPeek() && dt > 450 && dy < -80) openSwitcher();
        else goHome();
      }
    };
    screen.addEventListener('pointermove', move);
    screen.addEventListener('pointerup', up);
    screen.addEventListener('pointercancel', up);
  }, true);

  function scrollToTop() {
    const w = OS.sys.current && !OS.sys.switcher && OS.windows.get(OS.sys.current);
    if (!w) return;
    const cands = [...w.el.querySelectorAll('.page-scroll, .wx-scroll, .ph-scroll, .sa-scroll, .cal-body')].filter((x) => x.offsetParent && x.scrollTop > 0);
    cands.forEach((x) => x.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  function closeOverlaysPeek() {
    return OS.sys.siriOpen || OS.cc.isOpen || OS.nc.isOpen || OS.spotlight.isOpen;
  }

  /* ---------- Teclado ---------- */
  window.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
      if (e.key === 'Escape') t.blur();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    const map = {
      escape: goHome,
      h: goHome,
      a: openSwitcher,
      c: () => { if (S.get('screenOn')) OS.cc.toggle(); },
      n: () => { if (!S.get('screenOn')) return; if (OS.nc.isOpen) OS.nc.close(); else OS.nc.open(); },
      s: () => { if (!S.get('screenOn')) OS.hardware.wake(); OS.siri.toggle(); },
      l: () => OS.hardware.power(),
      arrowup: () => OS.hardware.changeVolume(0.0625),
      arrowdown: () => OS.hardware.changeVolume(-0.0625),
      ' ': () => { if (S.get('locked') && S.get('screenOn')) OS.lock.unlock(); },
      enter: () => { if (S.get('locked') && S.get('screenOn')) OS.lock.unlock(); },
    };
    if (map[k]) { e.preventDefault(); map[k](); }
  });

  /* ---------- Panel lateral ---------- */
  document.getElementById('panel').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const a = b.dataset.act;
    ({
      home: goHome,
      switcher: openSwitcher,
      cc: () => { if (!S.get('screenOn')) OS.hardware.wake(); OS.cc.toggle(); },
      nc: () => { if (!S.get('screenOn')) OS.hardware.wake(); if (OS.nc.isOpen) OS.nc.close(); else OS.nc.open(); },
      siri: () => { if (!S.get('screenOn')) OS.hardware.wake(); OS.siri.toggle(); },
      lock: () => OS.hardware.power(),
      volup: () => OS.hardware.changeVolume(0.0625),
      voldown: () => OS.hardware.changeVolume(-0.0625),
    })[a]();
  });

  OS.gestures = { goHome, openSwitcher };
})();
