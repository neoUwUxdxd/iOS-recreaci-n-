/* Componentes reutilizables: interruptores, deslizadores, pila de navegación, alertas... */
(function () {
  'use strict';

  const { h, esc, clamp, animate, ease } = OS.util;
  const screen = () => document.getElementById('screen');

  /** Interruptor. onChange(valor) */
  function toggle(on, onChange) {
    const t = h(`<div class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${!!on}" tabindex="0"></div>`);
    t.addEventListener('click', (e) => {
      e.stopPropagation();
      const v = !t.classList.contains('on');
      t.classList.toggle('on', v);
      t.setAttribute('aria-checked', v);
      OS.util.haptic(6);
      onChange && onChange(v);
    });
    t.set = (v) => { t.classList.toggle('on', !!v); t.setAttribute('aria-checked', !!v); };
    return t;
  }

  /** Deslizador horizontal. value 0..1 */
  function slider(value, onInput, opts = {}) {
    const s = h(`<div class="slider" role="slider" aria-valuemin="0" aria-valuemax="100"><div class="track"></div><div class="fill"></div><div class="thumb"></div></div>`);
    const fill = s.querySelector('.fill'), thumb = s.querySelector('.thumb');
    if (opts.color) fill.style.background = opts.color;
    const set = (v) => {
      v = clamp(v, 0, 1);
      fill.style.width = v * 100 + '%';
      thumb.style.left = `calc(19px + ${v} * (100% - 38px))`;
      s.setAttribute('aria-valuenow', Math.round(v * 100));
      s.value = v;
    };
    set(value);
    const fromEvent = (e) => {
      const r = s.getBoundingClientRect();
      return clamp((e.clientX - r.left - 19 * (OS.scale || 1)) / (r.width - 38 * (OS.scale || 1)), 0, 1);
    };
    s.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      s.setPointerCapture(e.pointerId);
      s.classList.add('active');
      const v = fromEvent(e); set(v); onInput && onInput(v);
      const move = (ev) => { const v2 = fromEvent(ev); set(v2); onInput && onInput(v2); };
      const up = () => { s.classList.remove('active'); s.removeEventListener('pointermove', move); s.removeEventListener('pointerup', up); s.removeEventListener('pointercancel', up); opts.onEnd && opts.onEnd(s.value); };
      s.addEventListener('pointermove', move);
      s.addEventListener('pointerup', up);
      s.addEventListener('pointercancel', up);
    });
    s.set = set;
    return s;
  }

  /** Control segmentado con lente de cristal. */
  function segmented(options, current, onChange) {
    const seg = h(`<div class="segmented"><div class="lens"></div>${options.map((o) => `<button data-v="${esc(o.value)}">${esc(o.label)}</button>`).join('')}</div>`);
    const lens = seg.querySelector('.lens');
    const place = () => {
      const btns = [...seg.querySelectorAll('button')];
      const idx = Math.max(0, btns.findIndex((b) => b.dataset.v === String(current)));
      btns.forEach((b, i) => b.classList.toggle('on', i === idx));
      const w = 100 / btns.length;
      lens.style.width = `calc(${w}% - ${6 / btns.length}px)`;
      lens.style.transform = `translateX(calc(${idx * 100}% + 3px))`;
    };
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      current = b.dataset.v;
      place();
      onChange && onChange(current);
    });
    requestAnimationFrame(place);
    place();
    seg.set = (v) => { current = v; place(); };
    return seg;
  }

  /** Pila de navegación con transiciones de empuje. */
  function navStack(container) {
    const stack = [];
    const wrap = h('<div class="nav-stack"></div>');
    container.appendChild(wrap);

    function attachScroll(page) {
      const sc = page.querySelector('.page-scroll');
      const nav = page.querySelector('.nav');
      if (sc && nav) sc.addEventListener('scroll', () => nav.classList.toggle('scrolled', sc.scrollTop > 30), { passive: true });
    }

    function edgeSwipe(page) {
      // Deslizar desde el borde izquierdo para volver
      page.addEventListener('pointerdown', (e) => {
        if (stack.length < 2 || stack[stack.length - 1] !== page) return;
        const p = OS.util.pt(e);
        const r = OS.util.rectIn(page);
        if (p.x - r.x > 24) return;
        e.stopPropagation();
        page.setPointerCapture(e.pointerId);
        const prev = stack[stack.length - 2];
        const W = r.w;
        let dx = 0;
        const move = (ev) => {
          dx = clamp(OS.util.pt(ev).x - p.x, 0, W);
          page.style.transform = `translateX(${dx}px)`;
          prev.style.transform = `translateX(${-28 + (dx / W) * 28}%)`;
        };
        const up = () => {
          page.removeEventListener('pointermove', move);
          page.removeEventListener('pointerup', up);
          page.removeEventListener('pointercancel', up);
          if (dx > W * 0.35) api.pop();
          else {
            animate(page, [{ transform: `translateX(${dx}px)` }, { transform: 'translateX(0)' }], { duration: 300, fill: 'none' });
            page.style.transform = '';
            prev.style.transform = '';
          }
        };
        page.addEventListener('pointermove', move);
        page.addEventListener('pointerup', up);
        page.addEventListener('pointercancel', up);
      });
    }

    const api = {
      el: wrap,
      get depth() { return stack.length; },
      get top() { return stack[stack.length - 1]; },
      push(page, animated = true) {
        const prev = stack[stack.length - 1];
        stack.push(page);
        wrap.appendChild(page);
        attachScroll(page);
        edgeSwipe(page);
        if (prev && animated) {
          animate(page, [{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }], { duration: 480, easing: ease.spring, fill: 'none' });
          animate(prev, [{ transform: 'translateX(0)', filter: 'brightness(1)' }, { transform: 'translateX(-28%)', filter: 'brightness(.92)' }], { duration: 480, easing: ease.spring, fill: 'none' });
        }
        if (prev) prev.classList.add('below');
        return page;
      },
      pop(animated = true) {
        if (stack.length < 2) return;
        const page = stack.pop();
        const prev = stack[stack.length - 1];
        prev.classList.remove('below');
        prev.style.transform = '';
        const from = page.style.transform || 'translateX(0)';
        page.style.transform = '';
        if (animated) {
          animate(prev, [{ transform: 'translateX(-28%)', filter: 'brightness(.92)' }, { transform: 'translateX(0)', filter: 'brightness(1)' }], { duration: 420, easing: ease.spring, fill: 'none' });
          const a = animate(page, [{ transform: from }, { transform: 'translateX(100%)' }], { duration: 420, easing: ease.spring });
          a.onfinish = () => { page.remove(); page.dispatchEvent(new CustomEvent('popped')); };
        } else { page.remove(); page.dispatchEvent(new CustomEvent('popped')); }
      },
      popToRoot() { while (stack.length > 1) api.pop(false); },
    };
    return api;
  }

  /** Crea una página con barra de navegación. */
  function page({ title = '', large = true, back = null, actions = '', cls = '' } = {}) {
    const p = h(`<section class="page ${cls}">
      <header class="nav ${large ? '' : 'always'}">
        ${back ? `<button class="glass-btn round nav-back" aria-label="Atrás">${OS.icon('chevronLeft')}</button>` : ''}
        <div class="nav-title">${esc(title)}</div>
        <div class="nav-spacer"></div>
        <div class="nav-actions">${actions}</div>
      </header>
      <div class="page-scroll">${large && title ? `<h1 class="large-title">${esc(title)}</h1>` : '<div style="height:52px"></div>'}<div class="page-body"></div></div>
    </section>`);
    if (back) p.querySelector('.nav-back').addEventListener('click', back);
    p.body = p.querySelector('.page-body');
    p.scroller = p.querySelector('.page-scroll');
    return p;
  }

  /** Barra de pestañas flotante de Liquid Glass. */
  function tabbar(tabs, current, onChange, { search = false } = {}) {
    const bar = h(`<nav class="tabbar glass refract ${search ? 'with-search' : 'full'}"><div class="lens"></div>${tabs.map((t) => `<button class="tab" data-id="${t.id}">${OS.icon(t.icon)}<span>${esc(t.label)}</span></button>`).join('')}</nav>`);
    const lens = bar.querySelector('.lens');
    const place = (animate = true) => {
      const btns = [...bar.querySelectorAll('.tab')];
      const b = btns.find((x) => x.dataset.id === current) || btns[0];
      btns.forEach((x) => x.classList.toggle('on', x === b));
      if (!animate) lens.style.transition = 'none';
      lens.style.width = b.offsetWidth + 'px';
      lens.style.transform = `translateX(${b.offsetLeft}px)`;
      if (!animate) requestAnimationFrame(() => { lens.style.transition = ''; });
    };
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('.tab');
      if (!b) return;
      current = b.dataset.id;
      place();
      OS.util.haptic(5);
      onChange && onChange(current);
    });
    bar.place = place;
    bar.set = (id) => { current = id; place(); };
    requestAnimationFrame(() => place(false));
    return bar;
  }

  /** Alerta modal. Devuelve una promesa con el índice pulsado (o el texto si hay campo). */
  function alert({ title, message = '', buttons = [{ label: 'OK', primary: true }], input = null, host = null }) {
    return new Promise((resolve) => {
      const parent = host || screen();
      const col = buttons.length > 2;
      const ov = h(`<div class="overlay"><div class="alert glass">
        ${title ? `<h3>${esc(title)}</h3>` : ''}${message ? `<p>${esc(message)}</p>` : ''}
        ${input ? `<input class="alert-input" placeholder="${esc(input.placeholder || '')}" value="${esc(input.value || '')}">` : ''}
        <div class="alert-btns ${col ? 'col' : ''}">${buttons.map((b, i) => `<button data-i="${i}" class="${b.primary ? 'primary' : ''} ${b.destructive ? 'destructive' : ''}">${esc(b.label)}</button>`).join('')}</div>
      </div></div>`);
      parent.appendChild(ov);
      requestAnimationFrame(() => ov.classList.add('show'));
      const field = ov.querySelector('.alert-input');
      if (field) setTimeout(() => field.focus(), 250);
      const close = (i) => {
        ov.classList.remove('show');
        setTimeout(() => ov.remove(), 300);
        resolve(input ? (i === null || buttons[i].cancel ? null : field.value) : i);
      };
      ov.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-i]');
        if (b) close(+b.dataset.i);
      });
      if (field) field.addEventListener('keydown', (e) => { if (e.key === 'Enter') close(buttons.findIndex((b) => b.primary)); });
    });
  }

  /** Hoja inferior. content: elemento. Devuelve { close } */
  function sheet({ title = '', content, left = null, right = null, host = null, onClose = null }) {
    const parent = host || screen();
    const ov = h(`<div class="overlay sheet-overlay"><div class="sheet">
      <div class="sheet-grab"></div>
      <div class="sheet-head"><div class="sh-l"></div><h3>${esc(title)}</h3><div class="sh-r"></div></div>
      <div class="sheet-body"></div></div></div>`);
    const body = ov.querySelector('.sheet-body');
    body.appendChild(content);
    const api = {
      el: ov,
      close() {
        ov.classList.remove('show');
        setTimeout(() => ov.remove(), 450);
        onClose && onClose();
      },
    };
    const mk = (spec, slot) => {
      if (!spec) return;
      const b = h(`<button class="glass-btn ${spec.icon ? 'round' : ''} ${spec.primary ? 'tinted' : ''}">${spec.icon ? OS.icon(spec.icon) : esc(spec.label)}</button>`);
      b.addEventListener('click', () => spec.onClick ? spec.onClick(api) : api.close());
      ov.querySelector(slot).appendChild(b);
    };
    mk(left, '.sh-l');
    mk(right, '.sh-r');
    ov.addEventListener('click', (e) => { if (e.target === ov) api.close(); });
    // Arrastrar para cerrar
    const sh = ov.querySelector('.sheet');
    const grab = ov.querySelector('.sheet-grab');
    [grab, ov.querySelector('.sheet-head')].forEach((handle) => handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      e.stopPropagation();
      handle.setPointerCapture(e.pointerId);
      const y0 = OS.util.pt(e).y;
      let dy = 0;
      sh.style.transition = 'none';
      const move = (ev) => { dy = Math.max(0, OS.util.pt(ev).y - y0); sh.style.transform = `translateY(${dy}px)`; };
      const up = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        sh.style.transition = '';
        sh.style.transform = '';
        if (dy > 120) api.close();
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
    }));
    parent.appendChild(ov);
    requestAnimationFrame(() => requestAnimationFrame(() => ov.classList.add('show')));
    return api;
  }

  let toastTimer = null;
  function toast(text, icon = null, ms = 1800) {
    let t = screen().querySelector(':scope > .toast');
    if (!t) { t = h('<div class="toast glass"></div>'); screen().appendChild(t); }
    t.innerHTML = `${icon ? OS.icon(icon) : ''}<span>${esc(text)}</span>`;
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  /** Celda de lista. */
  function cell({ icon, color, label, sub, value, chevron, check, right, onClick, cls = '' }) {
    const c = h(`<div class="cell ${icon ? 'has-icon' : ''} ${onClick ? 'tap' : ''} ${cls}">
      ${icon ? `<span class="cell-icon" style="background:${color || 'var(--gray)'}">${icon.startsWith('<') ? icon : OS.icon(icon)}</span>` : ''}
      <span class="cell-label">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</span>
      ${value != null ? `<span class="cell-value">${esc(value)}</span>` : ''}
      ${check ? `<span class="cell-check">${OS.icon('check')}</span>` : ''}
      ${chevron ? `<span class="cell-chev">${OS.icon('chevronRight')}</span>` : ''}
    </div>`);
    if (right) c.appendChild(right);
    if (onClick) c.addEventListener('click', onClick);
    return c;
  }

  function group(cells, { head, foot } = {}) {
    const frag = document.createDocumentFragment();
    if (head) frag.appendChild(h(`<div class="group-head">${esc(head)}</div>`));
    const g = h('<div class="group"></div>');
    cells.filter(Boolean).forEach((c) => g.appendChild(c));
    frag.appendChild(g);
    if (foot) frag.appendChild(h(`<div class="group-foot">${esc(foot)}</div>`));
    return frag;
  }

  OS.ui = { toggle, slider, segmented, navStack, page, tabbar, alert, sheet, toast, cell, group };
})();
