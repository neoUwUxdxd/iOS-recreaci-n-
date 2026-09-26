/* Pantalla de inicio: páginas, widgets, Dock, búsqueda y modo edición con reordenación. */
(function () {
  'use strict';

  const { h, esc, fmt, clamp, pt, store, animate, ease } = OS.util;
  const S = OS.state;

  const home = document.getElementById('home');
  let layout = normalize(S.get('layout'));
  let page = 0;
  let editing = false;
  let interacting = false;
  let geo = null;
  let pagesEl, dockEl, searchEl;
  const badges = {};

  function normalize(l) {
    const def = JSON.parse(JSON.stringify(OS.DEFAULT_LAYOUT));
    if (!l || !Array.isArray(l.pages) || !Array.isArray(l.dock)) return def;
    // Asegura que todas las apps existen y no se pierde ninguna
    const known = new Set(OS.appList.map((a) => a.id));
    l.pages.forEach((p) => { p.apps = (p.apps || []).filter((id) => known.has(id)); p.widgets = p.widgets || []; });
    l.dock = l.dock.filter((id) => known.has(id));
    return l;
  }

  function computeGeo() {
    const W = OS.W, H = OS.H;
    const padX = Math.round(W * 0.06);
    const colW = (W - padX * 2) / 4;
    const icon = W >= 428 ? 64 : 62;
    const top = 68;
    const bottomLimit = H - 158;
    const rowH = Math.min(112, (bottomLimit - top) / 6);
    return { W, H, padX, colW, icon, top, rowH, itemW: Math.min(colW, 86) };
  }

  function cellPos(col, row) {
    const g = geo;
    return { x: g.padX + col * g.colW + (g.colW - g.itemW) / 2, y: g.top + row * g.rowH };
  }

  /* ---------- Widgets ---------- */
  function widgetHTML(id, x, y, w, hgt) {
    const style = `left:${x}px;top:${y}px;width:${w}px;height:${hgt}px`;
    const label = (t) => `<div class="widget-label" style="left:${x}px;top:${y + hgt + 6}px;width:${w}px">${t}</div>`;
    if (id === 'weather') {
      const wn = OS.weatherNow ? OS.weatherNow() : { city: 'Madrid', temp: 22, cond: 'Soleado', hi: 26, lo: 14, icon: 'sun' };
      return `<div class="widget w-weather" data-open="weather" style="${style}">
        <div class="city">${esc(wn.city)} ${OS.icon('location')}</div>
        <div class="temp">${wn.temp}°</div>
        <div class="cond">${OS.icon(wn.icon)}${esc(wn.cond)}<div class="hl">Máx.: ${wn.hi}° Mín.: ${wn.lo}°</div></div>
      </div>${label('Tiempo')}`;
    }
    if (id === 'calendar') {
      const now = new Date();
      const evs = OS.todayEvents ? OS.todayEvents().slice(0, 2) : [];
      return `<div class="widget w-calendar" data-open="calendar" style="${style}">
        <div class="wd">${fmt.weekday(now)}</div>
        <div class="dn">${now.getDate()}</div>
        ${evs.length ? evs.map((e) => `<div class="ev" style="--c:${e.color}"><b>${esc(e.title)}</b><span>${esc(e.time)}</span></div>`).join('') : '<div class="ev" style="--c:#8e8e93"><b>Sin eventos</b><span>Hoy</span></div>'}
      </div>${label('Calendario')}`;
    }
    if (id === 'photosLarge') {
      return `<div class="widget w-photos" data-open="photos" style="${style}">
        <img alt="" data-photo-widget>
        <div class="cap"><b>Recuerdos del verano</b><span>${now().getFullYear()}</span></div>
      </div>${label('Fotos')}`;
    }
    return '';
  }
  const now = () => new Date();

  function itemHTML(id, x, y, extra = '') {
    const def = OS.appDefs[id];
    const b = badges[id] ? `<span class="badge">${badges[id]}</span>` : '';
    return `<div class="home-item ${extra}" data-id="${id}" style="transform:translate(${x}px,${y}px);width:${geo.itemW}px">
      <div class="icon-wrap">${OS.iconHTML(id)}${b}</div>
      <div class="home-label">${esc(def.name)}</div>
    </div>`;
  }

  function pageHTML(p, pi) {
    let html = '';
    let rowStart = 0;
    const g = geo;
    if (p.widgets.length) {
      rowStart = 2;
      const wSmall = g.colW + g.icon;
      const hW = Math.min(wSmall, g.rowH + g.icon - 4);
      let col = 0;
      p.widgets.forEach((wid) => {
        const x0 = g.padX + col * g.colW + (g.colW - g.icon) / 2;
        if (wid === 'photosLarge') {
          html += widgetHTML(wid, x0, g.top + 4, g.colW * 3 + g.icon, hW);
          col += 4;
        } else {
          html += widgetHTML(wid, x0, g.top + 4, wSmall, hW);
          col += 2;
        }
      });
    }
    p.apps.forEach((id, i) => {
      const col = i % 4, row = rowStart + Math.floor(i / 4);
      const { x, y } = cellPos(col, row);
      html += itemHTML(id, x, y);
    });
    return `<div class="home-page" data-page="${pi}" style="width:${g.W}px">${html}</div>`;
  }

  function render() {
    geo = computeGeo();
    home.style.setProperty('--icon', geo.icon + 'px');
    home.innerHTML = `
      <div class="edit-bar"><span></span><button class="glass-btn glass-clear" data-edit-done>Listo</button></div>
      <div class="home-pages" style="width:${geo.W * layout.pages.length}px">${layout.pages.map(pageHTML).join('')}</div>
      <div class="home-search glass-clear refract" role="button" aria-label="Buscar">
        <span class="txt">${OS.icon('search')}Buscar</span>
        <span class="dots">${layout.pages.map((_, i) => `<i class="${i === page ? 'on' : ''}"></i>`).join('')}</span>
      </div>
      <div class="dock glass-clear refract">${layout.dock.map((id) => `<div class="dock-item" data-id="${id}"><div class="icon-wrap">${OS.iconHTML(id)}${badges[id] ? `<span class="badge">${badges[id]}</span>` : ''}</div></div>`).join('')}</div>`;
    pagesEl = home.querySelector('.home-pages');
    dockEl = home.querySelector('.dock');
    searchEl = home.querySelector('.home-search');
    home.classList.toggle('wp-light-home', !!(OS.wallpapers.byId[S.get('wallpaper')] || {}).light);
    setPage(page, false);
    OS.updateDynamicIcons(home);
    fillPhotoWidget();
  }

  function fillPhotoWidget() {
    const img = home.querySelector('[data-photo-widget]');
    if (img && OS.photosLib) {
      const src = OS.photosLib.featured();
      if (src) img.src = src;
    }
  }

  function setPage(i, animated = true) {
    page = clamp(i, 0, layout.pages.length - 1);
    if (!pagesEl) return;
    pagesEl.style.transition = animated ? 'transform .45s cubic-bezier(.2,.9,.24,1)' : 'none';
    pagesEl.style.transform = `translateX(${-page * geo.W}px)`;
    home.querySelectorAll('.home-search .dots i').forEach((d, k) => d.classList.toggle('on', k === page));
  }

  function flashDots() {
    searchEl.classList.add('paging');
    clearTimeout(flashDots._t);
    flashDots._t = setTimeout(() => searchEl.classList.remove('paging'), 900);
  }

  /* ---------- Modo edición ---------- */
  function enterEdit() {
    if (editing) return;
    editing = true;
    home.classList.add('editing');
    OS.util.haptic(15);
  }
  function exitEdit() {
    if (!editing) return;
    editing = false;
    home.classList.remove('editing');
    S.set('layout', JSON.parse(JSON.stringify(layout)));
  }

  function relayoutPage(pi, skipId) {
    const p = layout.pages[pi];
    const rowStart = p.widgets.length ? 2 : 0;
    const pageEl = pagesEl.children[pi];
    p.apps.forEach((id, i) => {
      if (id === skipId) return;
      const it = pageEl.querySelector(`.home-item[data-id="${id}"]`);
      if (!it) return;
      const { x, y } = cellPos(i % 4, rowStart + Math.floor(i / 4));
      it.style.transform = `translate(${x}px,${y}px)`;
    });
  }

  /* ---------- Gestos ---------- */
  home.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('[data-edit-done]')) return;
    const start = pt(e);
    const t0 = performance.now();
    const item = e.target.closest('.home-item, .dock-item');
    const widget = e.target.closest('.widget');
    const onSearch = e.target.closest('.home-search');
    let mode = null; // 'page' | 'spot' | 'drag'
    let moved = false;
    let longFired = false;
    let dragInfo = null;
    interacting = true;
    home.setPointerCapture(e.pointerId);

    const lp = (item || widget) ? setTimeout(() => {
      longFired = true;
      enterEdit();
      if (item && item.classList.contains('home-item')) beginDrag(item, start);
    }, 480) : null;

    function beginDrag(it, p) {
      const pi = +it.closest('.home-page').dataset.page;
      const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(it.style.transform);
      dragInfo = { it, pi, id: it.dataset.id, x0: +m[1], y0: +m[2], p0: p };
      it.classList.add('dragging');
      mode = 'drag';
    }

    const move = (ev) => {
      const p = pt(ev);
      const dx = p.x - start.x, dy = p.y - start.y;
      if (!moved && Math.hypot(dx, dy) > 8) {
        moved = true;
        if (lp) clearTimeout(lp);
        if (!mode) {
          if (editing && item && item.classList.contains('home-item')) beginDrag(item, start);
          else if (Math.abs(dx) > Math.abs(dy)) { mode = 'page'; flashDots(); }
          else if (dy > 0 && !editing) mode = 'spot';
          else mode = 'none';
        }
      }
      if (mode === 'page') {
        let off = -page * geo.W + dx;
        const max = 0, min = -(layout.pages.length - 1) * geo.W;
        if (off > max) off = max + (off - max) * 0.35;
        if (off < min) off = min + (off - min) * 0.35;
        pagesEl.style.transition = 'none';
        pagesEl.style.transform = `translateX(${off}px)`;
        searchEl.classList.add('paging');
      } else if (mode === 'spot') {
        const prog = clamp(dy / 160, 0, 1);
        home.style.transition = 'none';
        home.style.transform = `translateY(${dy * 0.15}px)`;
        if (OS.spotlight) OS.spotlight.peek(prog);
      } else if (mode === 'drag' && dragInfo) {
        const d = dragInfo;
        const x = d.x0 + (p.x - d.p0.x), y = d.y0 + (p.y - d.p0.y);
        d.it.style.transform = `translate(${x}px,${y}px)`;
        const pg = layout.pages[d.pi];
        const rowStart = pg.widgets.length ? 2 : 0;
        const col = clamp(Math.floor((p.x - geo.padX) / geo.colW), 0, 3);
        const row = Math.floor((p.y - geo.top) / geo.rowH) - rowStart;
        if (row >= 0) {
          const idx = clamp(row * 4 + col, 0, pg.apps.length - 1);
          const cur = pg.apps.indexOf(d.id);
          if (idx !== cur) {
            pg.apps.splice(cur, 1);
            pg.apps.splice(idx, 0, d.id);
            relayoutPage(d.pi, d.id);
          }
        }
      }
    };

    const up = (ev) => {
      home.removeEventListener('pointermove', move);
      home.removeEventListener('pointerup', up);
      home.removeEventListener('pointercancel', up);
      interacting = false;
      if (lp) clearTimeout(lp);
      const p = pt(ev);
      const dx = p.x - start.x, dy = p.y - start.y;
      if (mode === 'page') {
        const v = dx / Math.max(1, performance.now() - t0);
        let target = page;
        if (dx < -geo.W * 0.25 || v < -0.45) target = page + 1;
        else if (dx > geo.W * 0.25 || v > 0.45) target = page - 1;
        setPage(target);
        flashDots();
        return;
      }
      if (mode === 'spot') {
        home.style.transition = '';
        home.style.transform = '';
        if (OS.spotlight) { if (dy > 70) OS.spotlight.open(); else OS.spotlight.peek(0); }
        return;
      }
      if (mode === 'drag' && dragInfo) {
        dragInfo.it.classList.remove('dragging');
        relayoutPage(dragInfo.pi);
        dragInfo = null;
        S.set('layout', JSON.parse(JSON.stringify(layout)));
        return;
      }
      if (moved || longFired) return;
      // Toque
      if (editing) { if (!item && !widget) exitEdit(); return; }
      if (onSearch) { OS.spotlight && OS.spotlight.open(); return; }
      if (item) {
        const icon = item.querySelector('.app-icon');
        OS.windows.open(item.dataset.id, icon);
        return;
      }
      if (widget) {
        OS.windows.open(widget.dataset.open, widget);
      }
    };
    home.addEventListener('pointermove', move);
    home.addEventListener('pointerup', up);
    home.addEventListener('pointercancel', up);
  });

  home.addEventListener('click', (e) => { if (e.target.closest('[data-edit-done]')) exitEdit(); });
  home.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 30) {
      const now2 = Date.now();
      if (now2 - (home._wheelT || 0) < 450) return;
      home._wheelT = now2;
      setPage(page + (e.deltaX > 0 ? 1 : -1));
      flashDots();
    }
  }, { passive: true });

  /** Posición del icono de una app visible, sin transformaciones (para abrir/cerrar apps). */
  function iconRect(id) {
    if (!geo) return null;
    const di = dockEl && dockEl.querySelector(`.dock-item[data-id="${id}"]`);
    if (di) {
      return { x: dockEl.offsetLeft + di.offsetLeft, y: dockEl.offsetTop + di.offsetTop, w: geo.icon, h: geo.icon };
    }
    const pg = pagesEl && pagesEl.children[page];
    const it = pg && pg.querySelector(`.home-item[data-id="${id}"]`);
    if (!it) return null;
    const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(it.style.transform);
    if (!m) return null;
    return { x: +m[1] + (geo.itemW - geo.icon) / 2, y: +m[2], w: geo.icon, h: geo.icon };
  }

  function setBadge(id, n) {
    badges[id] = n || 0;
    home.querySelectorAll(`[data-id="${id}"] .icon-wrap`).forEach((w) => {
      let b = w.querySelector('.badge');
      if (!n) { if (b) b.remove(); return; }
      if (!b) { b = h('<span class="badge"></span>'); w.appendChild(b); }
      b.textContent = n;
    });
  }

  S.on('wallpaper', () => home.classList.toggle('wp-light-home', !!(OS.wallpapers.byId[S.get('wallpaper')] || {}).light));
  const refresh = () => { if (!editing && !interacting) { const pg = page; render(); setPage(pg, false); } };
  OS.bus.on('minute', refresh);
  OS.bus.on('weather', refresh);

  OS.home = {
    render,
    setPage,
    get page() { return page; },
    iconRect,
    enterEdit,
    exitEdit,
    setBadge,
    resetLayout() { layout = normalize(null); S.set('layout', null); render(); },
    goFirstPage() { setPage(0); },
    el: home,
  };
})();
