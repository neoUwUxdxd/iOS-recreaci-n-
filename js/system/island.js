/* Dynamic Island: actividades en vivo, avisos breves y el orbe de Siri. */
(function () {
  'use strict';

  const { h, longPress } = OS.util;
  const el = document.getElementById('island');
  el.innerHTML = '<div class="island-inner"></div><div class="island-cam"></div>';
  const inner = el.querySelector('.island-inner');

  const activities = new Map(); // id -> spec
  let transient = null;
  let transientTimer = null;
  let expandedId = null;
  let siri = false;
  let mode = 'idle';
  let modeKey = '';

  function screenW() { return OS.W || 402; }

  function top() {
    let best = null;
    activities.forEach((spec, id) => { if (!best || (spec.priority || 0) > (best.priority || 0)) best = { ...spec, id }; });
    return best;
  }

  function dims(m, spec) {
    const W = screenW();
    switch (m) {
      case 'siri': return { w: 196, h: 46, r: 23, t: 9 };
      case 'transient': return { w: Math.min(W - 24, 360), h: 74, r: 37, t: 11 };
      case 'expanded': return { w: W - 20, h: (spec && spec.expandedHeight) || 170, r: 46, t: 9 };
      case 'compact': return { w: Math.min((spec && spec.width) || 188, 188, W - 200), h: 37, r: 19, t: 11 };
      default: return { w: 125, h: 37, r: 19, t: 11 };
    }
  }

  function contentFor(m, spec) {
    if (m === 'siri') return '<div class="isl-siri"><div style="position:relative;width:34px;height:34px"><div class="siri-orb" style="inset:0"><i></i><i></i><i></i></div></div></div>';
    if (m === 'transient') {
      const t = transient;
      return `<div class="isl-msg">${t.iconHTML || (t.icon ? `<span style="color:${t.color || '#fff'}">${OS.icon(t.icon)}</span>` : '')}<div style="flex:1;min-width:0"><div class="isl-msg-t">${t.title || ''}</div>${t.sub ? `<div class="isl-msg-s">${t.sub}</div>` : ''}</div>${t.right || ''}</div>`;
    }
    if (m === 'expanded') return `<div class="isl-expanded">${spec.expanded ? spec.expanded() : ''}</div>`;
    if (m === 'compact') return `<div class="isl-compact"><div class="l">${spec.left ? spec.left() : ''}</div><div class="r">${spec.right ? spec.right() : ''}</div></div>`;
    return '';
  }

  function render(force = false) {
    const spec = top();
    let m = 'idle';
    if (siri) m = 'siri';
    else if (transient) m = 'transient';
    else if (spec && expandedId === spec.id && spec.expanded) m = 'expanded';
    else if (spec) m = 'compact';
    const key = m + ':' + (spec ? spec.id : '') + ':' + (transient ? transient.key : '');
    const d = dims(m, spec);
    const changed = key !== modeKey;
    mode = m;
    modeKey = key;

    el.style.width = d.w + 'px';
    el.style.height = d.h + 'px';
    el.style.marginLeft = -d.w / 2 + 'px';
    el.style.borderRadius = d.r + 'px';
    el.style.top = d.t + 'px';
    el.classList.toggle('expanded', m === 'expanded' || m === 'transient');
    el.classList.toggle('has-content', m !== 'idle');

    if (changed) {
      el.classList.add('morphing');
      clearTimeout(render._t);
      render._t = setTimeout(() => {
        inner.innerHTML = contentFor(mode, top());
        el.classList.remove('morphing');
      }, 170);
    } else if (force || m === 'compact' || m === 'expanded') {
      if (!el.classList.contains('morphing')) inner.innerHTML = contentFor(m, spec);
    }
  }

  let justLong = false;
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    if (justLong) { justLong = false; return; }
    const spec = top();
    const act = e.target.closest('[data-act]');
    if (act && spec && spec.onAction) { spec.onAction(act.dataset.act); render(true); return; }
    if (mode === 'transient' && transient && transient.onTap) { transient.onTap(); clearTransient(); return; }
    if (mode === 'expanded') { expandedId = null; render(); return; }
    if (spec && spec.onTap) { spec.onTap(); return; }
    if (spec && spec.expanded) { expandedId = spec.id; render(); return; }
    // Pequeño rebote en reposo
    el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.3,1.4,.5,1)' });
  });

  longPress(el, 420, () => {
    const spec = top();
    if (spec && spec.expanded) { justLong = true; expandedId = spec.id; OS.util.haptic(10); render(); setTimeout(() => { justLong = false; }, 600); }
  });

  // Cerrar la vista ampliada al tocar fuera
  document.getElementById('screen').addEventListener('pointerdown', (e) => {
    if (expandedId && !el.contains(e.target)) { expandedId = null; render(); }
  }, true);

  function clearTransient() {
    transient = null;
    clearTimeout(transientTimer);
    render();
  }

  const api = {
    set(id, spec) { activities.set(id, spec); render(true); },
    update(id) { if (activities.has(id)) render(false); },
    clear(id) { activities.delete(id); if (expandedId === id) expandedId = null; render(); },
    has(id) { return activities.has(id); },
    flash(t, ms = 2600) {
      transient = { ...t, key: Math.random() };
      clearTimeout(transientTimer);
      render();
      transientTimer = setTimeout(clearTransient, ms);
    },
    siri(on) { siri = !!on; render(); },
    collapse() { expandedId = null; render(); },
    get mode() { return mode; },
    el,
  };

  OS.island = api;
  render();
})();
