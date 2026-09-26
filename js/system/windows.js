/* Gestor de ventanas: abrir/cerrar apps con animación desde el icono y gesto de inicio. */
(function () {
  'use strict';

  const { h, clamp, animate, ease } = OS.util;
  const S = OS.state;

  OS.sys = OS.sys || { current: null, currentStyle: 'auto', switcher: false };

  const layer = document.getElementById('apps-layer');
  const home = document.getElementById('home');
  const wins = new Map(); // id -> { id, el, root, inst }
  const running = [];     // más reciente primero

  const R = () => (document.documentElement.classList.contains('fullscreen') ? 0 : 56);

  function touch(id) {
    const i = running.indexOf(id);
    if (i >= 0) running.splice(i, 1);
    running.unshift(id);
  }

  function create(id) {
    const def = OS.appDefs[id];
    const el = h(`<div class="app-window hidden" data-app="${id}"><div class="app-root"></div></div>`);
    layer.appendChild(el);
    const root = el.querySelector('.app-root');
    const mod = OS.appModules[id] || OS.appModules.placeholder;
    const w = { id, el, root, inst: {} };
    const ctx = {
      id,
      def,
      root,
      win: el,
      close: () => api.goHome(),
      setStatus(style) { w.inst.statusStyle = style; if (OS.sys.current === id) { OS.sys.currentStyle = style; OS.chrome.update(); } },
      get visible() { return OS.sys.current === id && !OS.sys.switcher; },
    };
    wins.set(id, w);
    try {
      w.inst = mod.create(root, ctx) || {};
    } catch (err) {
      console.error('Error al crear la app', id, err);
      root.innerHTML = `<div class="empty-state" style="height:100%">${OS.icon('info')}<b>No se pudo abrir ${def ? def.name : id}</b><span>${String(err.message || err)}</span></div>`;
      w.inst = {};
    }
    return w;
  }

  function styleOf(w) {
    const s = w.inst.statusStyle;
    return typeof s === 'function' ? s() : (s || 'auto');
  }

  /** Rectángulo de origen de la animación (icono en inicio, elemento o centro). */
  function originRect(id, originEl) {
    let r = null;
    if (!S.get('locked') && !OS.sys.switcher) r = OS.home.iconRect(id);
    if (!r && originEl && originEl.isConnected && !originEl.closest('#home')) r = OS.util.rectIn(originEl);
    if (!r && originEl && originEl.isConnected) r = OS.util.rectIn(originEl);
    if (!r || !r.w) {
      const sz = 62;
      r = { x: OS.W / 2 - sz / 2, y: OS.H / 2 - sz / 2, w: sz, h: sz };
    }
    return r;
  }

  function iconFrame(r) {
    const W = OS.W, H = OS.H;
    const size = Math.max(r.w, r.h);
    const s = size / W;
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const vi = (H - W) / 2;
    return {
      transform: `translate(${cx - W / 2}px, ${cy - H / 2}px) scale(${s})`,
      clipPath: `inset(${vi}px 0px ${vi}px 0px round ${W * 0.27}px)`,
    };
  }
  const fullFrame = () => ({ transform: 'translate(0px, 0px) scale(1)', clipPath: `inset(0px 0px 0px 0px round ${R()}px)` });

  function addSplash(w) {
    let sp = w.el.querySelector(':scope > .app-splash');
    if (!sp) {
      sp = h(`<div class="app-splash"><div style="position:absolute;left:0;width:100%;top:${(OS.H - OS.W) / 2}px">${OS.iconHTML(w.id)}</div></div>`);
      w.el.appendChild(sp);
    }
    return sp;
  }

  function setForeground(id) {
    OS.sys.current = id;
    const w = wins.get(id);
    OS.sys.currentStyle = w ? styleOf(w) : 'auto';
    OS.sys.hideStatus = !!(w && w.inst.hideStatus);
    OS.chrome.update();
  }

  let busy = false;

  const api = {
    running,
    get(id) { return wins.get(id); },

    open(id, originEl) {
      if (!OS.appDefs[id]) return;
      if (S.get('locked')) { OS.lock.unlock(() => api.open(id, originEl)); return; }
      if (OS.sys.switcher) {
        if (wins.has(id)) { OS.switcher.openApp(id); return; }
        OS.switcher.close();
      }
      if (OS.spotlight && OS.spotlight.isOpen) OS.spotlight.close();
      if (OS.cc && OS.cc.isOpen) OS.cc.close();
      if (OS.home) OS.home.exitEdit();
      const prev = OS.sys.current;
      if (prev === id) return;
      if (prev) api.hideWindow(prev);
      let w = wins.get(id);
      const fresh = !w;
      if (!w) w = create(id);
      touch(id);
      const r = originRect(id, originEl);
      const el = w.el;
      el.classList.remove('hidden', 'in-switcher');
      el.style.zIndex = '5';
      const sp = addSplash(w);
      const from = iconFrame(r);
      const to = fullFrame();
      home.classList.add('behind');
      busy = true;
      const a = animate(el, [from, to], { duration: 560, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'none' });
      animate(sp, [{ opacity: 1 }, { opacity: 0, offset: 0.45 }, { opacity: 0 }], { duration: 560, easing: 'linear', fill: 'forwards' });
      el.style.transform = '';
      el.style.clipPath = '';
      setForeground(id);
      a.onfinish = () => {
        busy = false;
        sp.remove();
        el.style.zIndex = '';
      };
      try { w.inst.onShow && w.inst.onShow(fresh); } catch (e) { console.error(e); }
      OS.bus.emit('app:open', id);
    },

    /** Oculta una ventana sin animación (al cambiar de app). */
    hideWindow(id) {
      const w = wins.get(id);
      if (!w) return;
      w.el.classList.add('hidden');
      try { w.inst.onHide && w.inst.onHide(); } catch (e) { console.error(e); }
    },

    /** Vuelve a inicio animando la app hacia su icono. from: estado actual del gesto. */
    goHome(fromState) {
      const id = OS.sys.current;
      if (OS.sys.switcher) { OS.switcher.close(); return; }
      if (OS.spotlight && OS.spotlight.isOpen) { OS.spotlight.close(); return; }
      if (!id) { OS.home.exitEdit(); OS.home.goFirstPage(); return; }
      const w = wins.get(id);
      if (!w) return;
      const el = w.el;
      const r = originRect(id);
      const from = fromState || fullFrame();
      const to = iconFrame(r);
      const sp = addSplash(w);
      home.classList.remove('behind');
      busy = true;
      el.style.zIndex = '5';
      const a = animate(el, [from, to], { duration: 480, easing: 'cubic-bezier(.3,1,.4,1)', fill: 'forwards' });
      animate(sp, [{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: 1 }], { duration: 480, easing: 'linear', fill: 'forwards' });
      OS.sys.current = null;
      OS.sys.hideStatus = false;
      OS.chrome.update();
      a.onfinish = () => {
        el.classList.add('hidden');
        a.cancel();
        el.style.transform = '';
        el.style.clipPath = '';
        el.style.zIndex = '';
        sp.remove();
        busy = false;
      };
      try { w.inst.onHide && w.inst.onHide(); } catch (e) { console.error(e); }
      OS.bus.emit('app:home', id);
    },

    /** Cierra (termina) una app. */
    kill(id) {
      const w = wins.get(id);
      if (!w) return;
      try { w.inst.onDestroy && w.inst.onDestroy(); } catch (e) { console.error(e); }
      w.el.remove();
      wins.delete(id);
      const i = running.indexOf(id);
      if (i >= 0) running.splice(i, 1);
      if (OS.sys.current === id) { OS.sys.current = null; home.classList.remove('behind'); OS.chrome.update(); }
    },

    /** Cambia a la app anterior (deslizar lateralmente sobre el indicador). */
    switchTo(id, dir = 1) {
      const cur = OS.sys.current;
      const w = wins.get(id) || create(id);
      touch(id);
      const W = OS.W;
      w.el.classList.remove('hidden', 'in-switcher');
      animate(w.el, [{ transform: `translateX(${-dir * W}px)` }, { transform: 'translateX(0)' }], { duration: 420, easing: ease.spring, fill: 'none' });
      if (cur) {
        const cw = wins.get(cur);
        const a = animate(cw.el, [{ transform: 'translateX(0)' }, { transform: `translateX(${dir * W}px)` }], { duration: 420, easing: ease.spring, fill: 'forwards' });
        a.onfinish = () => { cw.el.classList.add('hidden'); a.cancel(); };
        try { cw.inst.onHide && cw.inst.onHide(); } catch (e) { console.error(e); }
      }
      setForeground(id);
      try { w.inst.onShow && w.inst.onShow(false); } catch (e) { console.error(e); }
    },

    /* ---------- Gesto interactivo desde el indicador de inicio ---------- */
    dragStart() {
      const id = OS.sys.current;
      if (!id || busy) return false;
      const w = wins.get(id);
      w.el.classList.add('interacting');
      home.classList.remove('behind');
      home.style.transition = 'none';
      return true;
    },
    dragMove(dx, dy) {
      const id = OS.sys.current;
      const w = id && wins.get(id);
      if (!w) return;
      const up = Math.max(0, -dy);
      const p = clamp(up / (OS.H * 0.6), 0, 1);
      const s = 1 - p * 0.55;
      const rr = R() + p * 30;
      w.el.style.transform = `translate(${dx * 0.9}px, ${-up * 0.55}px) scale(${s})`;
      w.el.style.clipPath = `inset(0px 0px 0px 0px round ${rr / Math.max(s, 0.3)}px)`;
      home.style.transform = `scale(${1.08 - p * 0.08})`;
      home.style.opacity = String(clamp(p * 2, 0, 1));
      home.style.filter = `blur(${(1 - p) * 4}px)`;
      w._drag = { dx, dy, s, p };
    },
    dragEnd(action) {
      const id = OS.sys.current;
      const w = id && wins.get(id);
      home.style.transition = '';
      home.style.transform = '';
      home.style.opacity = '';
      home.style.filter = '';
      if (!w) return;
      w.el.classList.remove('interacting');
      const fromState = { transform: w.el.style.transform || 'none', clipPath: w.el.style.clipPath || `inset(0px round ${R()}px)` };
      w.el.style.transform = '';
      w.el.style.clipPath = '';
      if (action === 'home') api.goHome(fromState);
      else if (action === 'switcher') OS.switcher.open(fromState);
      else {
        home.classList.add('behind');
        animate(w.el, [fromState, fullFrame()], { duration: 380, easing: ease.springOut, fill: 'none' });
      }
    },
    get busy() { return busy; },
    fullFrame,
    iconFrame,
    originRect,
    setForeground,
    touch,
    create,
    wins,
  };

  OS.windows = api;
})();
