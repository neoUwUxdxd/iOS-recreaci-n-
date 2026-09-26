/* Notificaciones: banners, lista persistente y Centro de notificaciones. */
(function () {
  'use strict';

  const { h, esc, fmt, uid, clamp, pt } = OS.util;
  const S = OS.state;

  const list = [];
  const bannersEl = document.getElementById('banners');

  function contentHTML(n) {
    const def = OS.appDefs[n.app];
    return `<div class="notif-icon">${OS.iconHTML(n.app)}</div>
      <div class="notif-body">
        <div class="notif-head"><span>${esc(n.title || (def ? def.name : ''))}</span><time data-ts="${n.ts}">${fmt.relative(n.ts)}</time></div>
        <div class="notif-text">${esc(n.body)}</div>
      </div>`;
  }

  function itemHTML(n, cls = '') {
    return `<div class="lnotif glass ${cls}" data-id="${n.id}">${contentHTML(n)}</div>`;
  }

  function openFor(n) {
    if (n.onTap) n.onTap();
    else if (n.app && OS.windows) OS.windows.open(n.app);
  }

  function remove(id) {
    const i = list.findIndex((n) => n.id === id);
    if (i >= 0) list.splice(i, 1);
    OS.bus.emit('notifs');
  }

  function showBanner(n) {
    const b = h(`<div class="banner glass from-island">${contentHTML(n)}</div>`);
    bannersEl.appendChild(b);
    requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add('show')));
    let gone = false;
    const hide = () => {
      if (gone) return;
      gone = true;
      b.classList.remove('show');
      setTimeout(() => b.remove(), 500);
    };
    const timer = setTimeout(hide, 4200);
    let y0 = null, dy = 0;
    b.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      b.setPointerCapture(e.pointerId);
      y0 = pt(e).y; dy = 0;
      b.style.transition = 'none';
    });
    b.addEventListener('pointermove', (e) => {
      if (y0 == null) return;
      dy = pt(e).y - y0;
      b.style.transform = `translateY(${dy < 0 ? dy : dy * 0.25}px)`;
    });
    b.addEventListener('pointerup', () => {
      if (y0 == null) return;
      y0 = null;
      b.style.transition = '';
      b.style.transform = '';
      if (dy < -30) { clearTimeout(timer); hide(); }
      else if (Math.abs(dy) < 6) { clearTimeout(timer); hide(); remove(n.id); openFor(n); }
    });
  }

  function notify(opts) {
    const n = { id: uid(), ts: Date.now(), app: 'settings', title: '', body: '', ...opts };
    list.unshift(n);
    if (list.length > 40) list.pop();
    OS.bus.emit('notifs');
    const quiet = S.get('focus');
    const sys = OS.sys || {};
    if (!quiet) OS.audio.notify();
    if (S.get('locked')) {
      if (!S.get('screenOn') && !quiet && OS.hardware) OS.hardware.wake(true);
    } else if (!quiet && n.banner !== false && !(sys.current === n.app && !sys.switcher)) {
      showBanner(n);
    }
    return n;
  }

  /* ---------- Centro de notificaciones ---------- */
  const nc = document.getElementById('notif-center');
  nc.innerHTML = `
    <div class="nc-sheet">
      <div class="nc-bg"></div>
      <div class="nc-head"><div class="lock-date"></div><div class="lock-clock glass-style"></div></div>
      <div class="nc-list"></div>
      <div class="nc-grab"></div>
    </div>`;
  const ncSheet = nc.querySelector('.nc-sheet');
  const ncList = nc.querySelector('.nc-list');

  function renderNC() {
    nc.querySelector('.lock-date').textContent = fmt.lockDate();
    nc.querySelector('.lock-clock').textContent = fmt.clock();
    if (!list.length) {
      ncList.innerHTML = '<div class="nc-empty">No hay notificaciones antiguas</div>';
      return;
    }
    ncList.innerHTML = `<div class="nc-title"><span>Notificaciones</span><button class="glass-clear" aria-label="Borrar todo">${OS.icon('close')}</button></div>` + list.map((n) => itemHTML(n)).join('');
  }

  ncList.addEventListener('click', (e) => {
    if (e.target.closest('.nc-title button')) {
      list.splice(0, list.length);
      OS.bus.emit('notifs');
      return;
    }
    const it = e.target.closest('.lnotif');
    if (!it) return;
    const n = list.find((x) => x.id === it.dataset.id);
    if (!n) return;
    if (S.get('locked')) {
      OS.lock.unlock(() => { remove(n.id); openFor(n); });
      closeNC();
      return;
    }
    closeNC();
    remove(n.id);
    openFor(n);
  });

  function setNC(p) { nc.style.setProperty('--p', clamp(p, 0, 1)); }

  function openNC() {
    renderNC();
    nc.classList.add('open', 'animating');
    nc.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => setNC(1));
    OS.sys.ncOpen = true;
    OS.chrome.update();
    setTimeout(() => nc.classList.remove('animating'), 520);
  }

  function closeNC() {
    nc.classList.add('animating');
    setNC(0);
    OS.sys.ncOpen = false;
    OS.chrome.update();
    setTimeout(() => { nc.classList.remove('animating', 'open'); nc.setAttribute('aria-hidden', 'true'); }, 500);
  }

  // Deslizar hacia arriba para cerrar
  ncSheet.addEventListener('pointerdown', (e) => {
    if (!nc.classList.contains('open')) return;
    if (e.target.closest('.lnotif, button')) return;
    const y0 = pt(e).y;
    let dy = 0;
    ncSheet.setPointerCapture(e.pointerId);
    const move = (ev) => { dy = pt(ev).y - y0; if (dy < 0) setNC(1 + dy / OS.H); };
    const up = () => {
      ncSheet.removeEventListener('pointermove', move);
      ncSheet.removeEventListener('pointerup', up);
      ncSheet.removeEventListener('pointercancel', up);
      if (dy < -60) closeNC();
      else { nc.classList.add('animating'); setNC(1); setTimeout(() => nc.classList.remove('animating'), 500); }
    };
    ncSheet.addEventListener('pointermove', move);
    ncSheet.addEventListener('pointerup', up);
    ncSheet.addEventListener('pointercancel', up);
  });

  OS.bus.on('notifs', () => { if (nc.classList.contains('open')) renderNC(); });
  setInterval(() => {
    document.querySelectorAll('.lnotif time[data-ts]').forEach((t) => { t.textContent = fmt.relative(+t.dataset.ts); });
  }, 30000);

  OS.notifs = { list, notify, remove, itemHTML, openFor };
  OS.notify = notify;
  OS.nc = {
    open: openNC,
    close: closeNC,
    drag(p) { if (!nc.classList.contains('open')) { renderNC(); nc.classList.add('open'); } setNC(p); },
    settle(open) { if (open) openNC(); else closeNC(); },
    get isOpen() { return !!(OS.sys && OS.sys.ncOpen); },
  };
})();
