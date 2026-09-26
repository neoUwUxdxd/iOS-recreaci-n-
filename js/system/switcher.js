/* Selector de apps (multitarea): tarjetas deslizables, cerrar apps y cambiar entre ellas. */
(function () {
  'use strict';

  const { h, esc, clamp, pt } = OS.util;
  const layer = document.getElementById('apps-layer');
  const backdrop = document.getElementById('switcher');
  const home = document.getElementById('home');
  backdrop.innerHTML = '<div class="switcher-empty">No hay apps abiertas</div>';
  const labels = h('<div class="sw-labels" style="position:absolute;inset:0;pointer-events:none;z-index:200"></div>');

  let offset = 0;
  let order = [];
  const S_CARD = 0.64;
  const TRANS = 'transform .5s cubic-bezier(.3,1.08,.4,1), clip-path .5s cubic-bezier(.3,1.08,.4,1), opacity .3s';

  const spacing = () => OS.W * S_CARD * 0.8;

  function frame(i) {
    const W = OS.W, H = OS.H;
    const cx = W / 2 - i * spacing() + offset;
    const cy = H * 0.46;
    const depth = clamp((cx - W / 2) / W, -1, 1);
    const s = S_CARD * (1 - Math.max(0, -depth) * 0.06);
    return {
      transform: `translate(${cx - W / 2}px, ${cy - H / 2}px) scale(${s})`,
      clipPath: `inset(0px 0px 0px 0px round ${38 / s}px)`,
      cx, cy, s,
    };
  }

  function apply(animated) {
    labels.innerHTML = '';
    order.forEach((id, i) => {
      const w = OS.windows.get(id);
      if (!w) return;
      const f = frame(i);
      w.el.style.transition = animated ? TRANS : 'none';
      w.el.style.transform = f.transform;
      w.el.style.clipPath = f.clipPath;
      w.el.style.zIndex = String(100 - i);
      const cardW = OS.W * f.s, cardH = OS.H * f.s;
      const lb = h(`<div class="sw-label" style="left:${f.cx - cardW / 2 + 6}px;top:${f.cy - cardH / 2 - 40}px">${OS.iconHTML(id)}<span>${esc(OS.appDefs[id].name)}</span></div>`);
      lb.style.opacity = f.cx < -cardW / 2 || f.cx > OS.W + cardW / 2 ? '0' : '1';
      labels.appendChild(lb);
    });
    backdrop.querySelector('.switcher-empty').classList.toggle('show', !order.length);
  }

  function clearStyles(el) {
    el.style.transition = '';
    el.style.transform = '';
    el.style.clipPath = '';
    el.style.zIndex = '';
    el.style.opacity = '';
    el.classList.remove('in-switcher');
  }

  const api = {
    open(fromState) {
      if (OS.sys.switcher) return;
      if (OS.cc && OS.cc.isOpen) OS.cc.close(true);
      if (OS.spotlight && OS.spotlight.isOpen) OS.spotlight.close();
      OS.home.exitEdit();
      order = OS.windows.running.slice(0, 10);
      offset = 0;
      OS.sys.switcher = true;
      const cur = OS.sys.current;
      backdrop.classList.add('open');
      layer.style.pointerEvents = 'auto';
      layer.classList.add('switching');
      layer.appendChild(labels);
      home.classList.remove('behind');
      order.forEach((id) => {
        const w = OS.windows.get(id);
        w.el.classList.remove('hidden');
        w.el.classList.add('in-switcher');
        w.el.style.transition = 'none';
        if (id === cur && fromState) {
          w.el.style.transform = fromState.transform;
          w.el.style.clipPath = fromState.clipPath;
        } else if (id !== cur) {
          const f = frame(order.indexOf(id));
          w.el.style.transform = f.transform.replace(/scale\(([\d.]+)\)/, (m, v) => `scale(${v * 0.9})`);
          w.el.style.opacity = '0';
        }
      });
      void layer.offsetWidth;
      order.forEach((id) => { const w = OS.windows.get(id); w.el.style.opacity = ''; });
      apply(true);
      OS.chrome.update();
    },

    close() {
      if (!OS.sys.switcher) return;
      OS.sys.switcher = false;
      OS.sys.current = null;
      backdrop.classList.remove('open');
      labels.remove();
      layer.classList.remove('switching');
      layer.style.pointerEvents = '';
      order.forEach((id) => {
        const w = OS.windows.get(id);
        if (!w) return;
        w.el.style.transition = TRANS;
        w.el.style.opacity = '0';
        w.el.style.transform = frame(order.indexOf(id)).transform.replace(/scale\(([\d.]+)\)/, (m, v) => `scale(${v * 0.85})`);
        setTimeout(() => { if (OS.sys.current !== id && !OS.sys.switcher) { w.el.classList.add('hidden'); clearStyles(w.el); } }, 320);
        try { w.inst.onHide && w.inst.onHide(); } catch (e) { console.error(e); }
      });
      OS.chrome.update();
    },

    openApp(id) {
      const w = OS.windows.get(id);
      if (!w) return;
      OS.sys.switcher = false;
      backdrop.classList.remove('open');
      labels.remove();
      layer.classList.remove('switching');
      layer.style.pointerEvents = '';
      order.forEach((oid) => {
        const ow = OS.windows.get(oid);
        if (!ow || oid === id) return;
        ow.el.style.transition = TRANS;
        ow.el.style.opacity = '0';
        setTimeout(() => { if (OS.sys.current !== oid && !OS.sys.switcher) { ow.el.classList.add('hidden'); clearStyles(ow.el); } }, 300);
      });
      w.el.style.transition = TRANS;
      w.el.style.zIndex = '200';
      const full = OS.windows.fullFrame();
      w.el.style.transform = full.transform;
      w.el.style.clipPath = full.clipPath;
      home.classList.add('behind');
      OS.windows.touch(id);
      OS.windows.setForeground(id);
      setTimeout(() => clearStyles(w.el), 520);
      try { w.inst.onShow && w.inst.onShow(false); } catch (e) { console.error(e); }
    },

    get isOpen() { return !!OS.sys.switcher; },
  };

  /* ---------- Gestos dentro del selector ---------- */
  layer.addEventListener('pointerdown', (e) => {
    if (!OS.sys.switcher) return;
    const start = pt(e);
    const t0 = performance.now();
    const card = e.target.closest('.app-window');
    const id = card && card.dataset.app;
    let mode = null;
    let dx = 0, dy = 0;
    const off0 = offset;
    layer.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const p = pt(ev);
      dx = p.x - start.x; dy = p.y - start.y;
      if (!mode && Math.hypot(dx, dy) > 8) mode = Math.abs(dx) > Math.abs(dy) ? 'h' : (dy < 0 && id ? 'v' : 'none');
      if (mode === 'h') {
        const max = Math.max(0, (order.length - 1) * spacing());
        let o = off0 + dx;
        if (o < 0) o *= 0.35;
        if (o > max) o = max + (o - max) * 0.35;
        offset = o;
        apply(false);
      } else if (mode === 'v') {
        const w = OS.windows.get(id);
        const f = frame(order.indexOf(id));
        w.el.style.transition = 'none';
        w.el.style.transform = `translate(${f.cx - OS.W / 2}px, ${f.cy - OS.H / 2 + Math.min(0, dy)}px) scale(${f.s})`;
      }
    };
    const up = () => {
      layer.removeEventListener('pointermove', move);
      layer.removeEventListener('pointerup', up);
      layer.removeEventListener('pointercancel', up);
      if (mode === 'h') {
        const v = dx / Math.max(1, performance.now() - t0);
        const max = Math.max(0, (order.length - 1) * spacing());
        let target = offset + v * 180;
        target = clamp(Math.round(target / spacing()) * spacing(), 0, max);
        offset = target;
        apply(true);
      } else if (mode === 'v') {
        const v = dy / Math.max(1, performance.now() - t0);
        if (dy < -120 || v < -0.7) {
          const w = OS.windows.get(id);
          w.el.style.transition = 'transform .35s cubic-bezier(.4,0,1,1), opacity .35s';
          w.el.style.transform += ` translateY(${-OS.H * 1.4}px)`;
          w.el.style.opacity = '0';
          OS.util.haptic(8);
          setTimeout(() => {
            OS.windows.kill(id);
            order = order.filter((x) => x !== id);
            offset = clamp(offset, 0, Math.max(0, (order.length - 1) * spacing()));
            apply(true);
            if (!order.length) setTimeout(() => api.close(), 250);
          }, 300);
        } else apply(true);
      } else if (!mode) {
        OS.util.swallowClick();
        if (id) api.openApp(id);
        else api.close();
      }
    };
    layer.addEventListener('pointermove', move);
    layer.addEventListener('pointerup', up);
    layer.addEventListener('pointercancel', up);
  });

  backdrop.addEventListener('click', () => { if (OS.sys.switcher && !order.length) api.close(); });

  OS.switcher = api;
})();
