/* Fotos: biblioteca generada por código, visor, edición y «Extender» con IA (iOS 27). */
(function () {
  'use strict';

  const { h, esc, seeded, store, uid, pt, clamp } = OS.util;

  /* ======================= Generador de paisajes ======================= */
  function ridge(ctx, rnd, W, H, base, amp, color, rough = 0.55) {
    // Desplazamiento de punto medio
    let arr = [rnd() * amp, rnd() * amp];
    for (let it = 0; it < 7; it++) {
      const next = [];
      for (let i = 0; i < arr.length - 1; i++) {
        next.push(arr[i], (arr[i] + arr[i + 1]) / 2 + (rnd() - 0.5) * amp * Math.pow(rough, it + 1) * 2);
      }
      next.push(arr[arr.length - 1]);
      arr = next;
    }
    ctx.beginPath();
    ctx.moveTo(0, H);
    arr.forEach((v, i) => ctx.lineTo((i / (arr.length - 1)) * W, base - v));
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  const PALETTES = {
    sunset: [['#1d2b64', '#f8cdda'], ['#ff7e5f', '#feb47b'], ['#6a3093', '#a044ff'], ['#ee9ca7', '#ffdde1']],
    day: [['#56ccf2', '#e0f7ff'], ['#2980b9', '#6dd5fa'], ['#74b9ff', '#dff9fb']],
    night: [['#0f2027', '#2c5364'], ['#141e30', '#243b55'], ['#000428', '#004e92']],
  };

  function drawScene(seed, W, H) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const rnd = seeded(seed * 7919 + 13);
    const kinds = ['mountains', 'sea', 'city', 'forest', 'aurora', 'desert', 'flowers', 'lake'];
    const kind = kinds[seed % kinds.length];
    const time = kind === 'aurora' || kind === 'city' ? 'night' : rnd() < 0.5 ? 'sunset' : 'day';
    const pal = PALETTES[time][Math.floor(rnd() * PALETTES[time].length)];
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.75);
    sky.addColorStop(0, pal[0]);
    sky.addColorStop(1, pal[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Estrellas o aurora
    if (time === 'night') {
      for (let i = 0; i < 160; i++) { ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.8})`; ctx.fillRect(rnd() * W, rnd() * H * 0.6, 1.4, 1.4); }
    }
    if (kind === 'aurora') {
      for (let b = 0; b < 3; b++) {
        const g = ctx.createLinearGradient(0, H * 0.1, 0, H * 0.55);
        const hue = 130 + b * 40 + rnd() * 30;
        g.addColorStop(0, `hsla(${hue},90%,60%,0)`);
        g.addColorStop(0.5, `hsla(${hue},90%,60%,.45)`);
        g.addColorStop(1, `hsla(${hue},90%,60%,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, H * 0.3);
        for (let x = 0; x <= W; x += 20) ctx.lineTo(x, H * (0.2 + b * 0.06) + Math.sin(x / 60 + b + rnd()) * 40);
        for (let x = W; x >= 0; x -= 20) ctx.lineTo(x, H * (0.45 + b * 0.05) + Math.sin(x / 70 + b) * 30);
        ctx.fill();
      }
    }
    // Sol o luna
    const sx = W * (0.2 + rnd() * 0.6), sy = H * (time === 'sunset' ? 0.5 : 0.22);
    const sr = time === 'sunset' ? W * 0.12 : W * 0.06;
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 4);
    glow.addColorStop(0, time === 'night' ? 'rgba(255,255,240,.35)' : 'rgba(255,240,200,.6)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = time === 'night' ? '#f4f1e1' : time === 'sunset' ? '#ffd9a0' : '#fffbe6';
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();

    const dark = (a) => (time === 'night' ? `rgba(10,15,35,${a})` : time === 'sunset' ? `rgba(60,20,70,${a})` : `rgba(30,70,90,${a})`);
    if (kind === 'mountains' || kind === 'aurora' || kind === 'lake') {
      ridge(ctx, rnd, W, H, H * 0.62, H * 0.3, dark(0.45));
      ridge(ctx, rnd, W, H, H * 0.72, H * 0.22, dark(0.7));
      ridge(ctx, rnd, W, H, H * 0.84, H * 0.12, dark(0.95));
    }
    if (kind === 'lake' || kind === 'sea') {
      const hz = kind === 'sea' ? H * 0.6 : H * 0.8;
      const wg = ctx.createLinearGradient(0, hz, 0, H);
      wg.addColorStop(0, pal[1]);
      wg.addColorStop(1, pal[0]);
      ctx.fillStyle = wg;
      ctx.fillRect(0, hz, W, H - hz);
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      for (let i = 0; i < 60; i++) { const y = hz + rnd() * (H - hz); ctx.fillRect(sx - 60 + rnd() * 120 * (1 + (y - hz) / H), y, 10 + rnd() * 40, 1.5); }
    }
    if (kind === 'city') {
      for (let i = 0; i < 26; i++) {
        const bw = 20 + rnd() * 50, bh = H * (0.15 + rnd() * 0.4), bx = (i / 26) * W - 10 + rnd() * 10;
        ctx.fillStyle = `rgba(15,18,35,${0.85 + rnd() * 0.15})`;
        ctx.fillRect(bx, H - bh, bw, bh);
        for (let y = H - bh + 8; y < H - 6; y += 12) for (let x = bx + 5; x < bx + bw - 5; x += 9) if (rnd() < 0.35) { ctx.fillStyle = `rgba(255,${200 + rnd() * 55},120,.85)`; ctx.fillRect(x, y, 4, 6); }
      }
    }
    if (kind === 'forest') {
      ridge(ctx, rnd, W, H, H * 0.7, H * 0.15, dark(0.5));
      for (let i = 0; i < 40; i++) {
        const x = rnd() * W, base = H * (0.75 + rnd() * 0.25), th = 60 + rnd() * 140;
        ctx.fillStyle = `rgba(${10 + rnd() * 20},${40 + rnd() * 40},${30 + rnd() * 20},.95)`;
        ctx.beginPath(); ctx.moveTo(x, base - th); ctx.lineTo(x - th * 0.28, base); ctx.lineTo(x + th * 0.28, base); ctx.fill();
      }
    }
    if (kind === 'desert') {
      ctx.fillStyle = '#e0a45c'; ridge(ctx, rnd, W, H, H * 0.75, H * 0.1, 'rgba(214,150,80,.95)', 0.4);
      ctx.fillStyle = '#c47f3c'; ridge(ctx, rnd, W, H, H * 0.88, H * 0.1, 'rgba(180,110,55,.98)', 0.4);
    }
    if (kind === 'flowers') {
      const fg = ctx.createLinearGradient(0, H * 0.6, 0, H);
      fg.addColorStop(0, '#3c8d2f'); fg.addColorStop(1, '#1e4d1a');
      ctx.fillStyle = fg; ctx.fillRect(0, H * 0.62, W, H);
      for (let i = 0; i < 220; i++) {
        const y = H * 0.62 + Math.pow(rnd(), 0.7) * H * 0.38, r = 1.5 + ((y - H * 0.62) / (H * 0.38)) * 7;
        ctx.fillStyle = `hsla(${[330, 50, 280, 10, 200][Math.floor(rnd() * 5)]},90%,${60 + rnd() * 20}%,.95)`;
        ctx.beginPath(); ctx.arc(rnd() * W, y, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Viñeteado y grano
    const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.9);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.28)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    return { canvas: c, kind };
  }

  const KIND_NAMES = { mountains: 'Montañas', sea: 'Playa', city: 'Ciudad', forest: 'Bosque', aurora: 'Aurora', desert: 'Desierto', flowers: 'Flores', lake: 'Lago' };

  /* ======================= Biblioteca ======================= */
  let library = null;
  const favs = new Set(store.get('photoFavs', []));

  function ensure() {
    if (library) return library;
    library = [];
    const now = Date.now();
    for (let i = 0; i < 24; i++) {
      const { canvas, kind } = drawScene(i + 1, 480, 640);
      library.push({ id: 'g' + i, src: canvas.toDataURL('image/jpeg', 0.82), date: now - (24 - i) * 86400e3 * 3.3, kind, place: ['Madrid', 'Asturias', 'Cádiz', 'Lisboa', 'Tromsø', 'Granada', 'Mallorca', 'Pirineos'][i % 8] });
    }
    store.get('camPhotos', []).forEach((p) => library.push(p));
    return library;
  }

  const lib = {
    list: () => ensure(),
    count: () => ensure().length,
    featured() {
      const L = ensure().filter((x) => ['mountains', 'lake', 'aurora', 'sea'].includes(x.kind));
      return L.length ? L[new Date().getDate() % L.length].src : ensure()[0].src;
    },
    add(src, meta = {}) {
      ensure();
      const p = { id: uid(), src, date: Date.now(), kind: meta.kind || 'camera', place: meta.place || 'Madrid' };
      library.push(p);
      // Guarda (con límite) las fotos hechas con la cámara
      const cams = library.filter((x) => !x.id.startsWith('g')).slice(-10);
      if (!store.set('camPhotos', cams)) store.set('camPhotos', cams.slice(-3));
      OS.bus.emit('photos');
      return p;
    },
    remove(id) {
      ensure();
      library = library.filter((x) => x.id !== id);
      store.set('camPhotos', library.filter((x) => !x.id.startsWith('g')));
      OS.bus.emit('photos');
    },
    toggleFav(id) {
      if (favs.has(id)) favs.delete(id); else favs.add(id);
      store.set('photoFavs', [...favs]);
      return favs.has(id);
    },
    isFav: (id) => favs.has(id),
    drawScene,
  };
  OS.photosLib = lib;

  /* «Extender» (iOS 27): amplía la imagen generando bordes coherentes. */
  function extend(src, ratio = 402 / 874) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const W = 720, H = Math.round(W / ratio);
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const ctx = c.getContext('2d');
        // Fondo: la imagen ampliada y desenfocada
        const cover = Math.max(W / img.width, H / img.height) * 1.1;
        if ('filter' in ctx) ctx.filter = 'blur(28px) saturate(1.2)';
        ctx.drawImage(img, (W - img.width * cover) / 2, (H - img.height * cover) / 2, img.width * cover, img.height * cover);
        if ('filter' in ctx) ctx.filter = 'none';
        // Reflejos arriba y abajo para continuar la escena
        const s = W / img.width, ih = img.height * s, y0 = (H - ih) / 2;
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.translate(0, y0);
        ctx.scale(1, -1);
        ctx.drawImage(img, 0, 0, img.width, img.height * 0.35, 0, 0, W, ih * 0.35);
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.translate(0, y0 + ih * 2);
        ctx.scale(1, -1);
        ctx.drawImage(img, 0, img.height * 0.65, img.width, img.height * 0.35, 0, ih * 0.65, W, ih * 0.35);
        ctx.restore();
        // Imagen original con bordes difuminados
        const tmp = document.createElement('canvas');
        tmp.width = W; tmp.height = Math.round(ih);
        const t = tmp.getContext('2d');
        t.drawImage(img, 0, 0, W, ih);
        t.globalCompositeOperation = 'destination-in';
        const m = t.createLinearGradient(0, 0, 0, ih);
        m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(0.08, '#000'); m.addColorStop(0.92, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)');
        t.fillStyle = m;
        t.fillRect(0, 0, W, ih);
        ctx.drawImage(tmp, 0, y0);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.src = src;
    });
  }

  const FILTERS = [
    ['none', 'Original', 'none'], ['vivid', 'Intenso', 'saturate(1.45) contrast(1.08)'], ['drama', 'Dramático', 'contrast(1.35) brightness(.9) saturate(1.1)'],
    ['warm', 'Cálido', 'sepia(.28) saturate(1.3) hue-rotate(-8deg)'], ['cool', 'Frío', 'hue-rotate(12deg) saturate(1.1) brightness(1.03)'], ['mono', 'Mono', 'grayscale(1) contrast(1.1)'], ['noir', 'Noir', 'grayscale(1) contrast(1.5) brightness(.85)'],
  ];

  function bake(src, filter) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d');
        if ('filter' in ctx) ctx.filter = filter;
        ctx.drawImage(img, 0, 0);
        resolve(c.toDataURL('image/jpeg', 0.88));
      };
      img.src = src;
    });
  }

  /* ======================= App ======================= */
  OS.registerApp('photos', {
    create(root) {
      root.classList.add('plain', 'photos-app');
      root.innerHTML = '<div class="ph-view"></div>';
      const view = root.querySelector('.ph-view');
      let tab = 'library';
      let cols = 3;

      const tabs = OS.ui.tabbar([{ id: 'library', icon: 'photos', label: 'Biblioteca' }, { id: 'collections', icon: 'grid', label: 'Colecciones' }], tab, (id) => { tab = id; render(); }, { search: true });
      root.appendChild(tabs);
      const searchBtn = h(`<button class="tab-search glass" aria-label="Buscar">${OS.icon('search')}</button>`);
      root.appendChild(searchBtn);
      searchBtn.addEventListener('click', async () => {
        const q = await OS.ui.alert({ title: 'Buscar en Fotos', message: 'Prueba: montañas, playa, ciudad, bosque, aurora, flores…', input: { placeholder: 'Buscar' }, buttons: [{ label: 'Cancelar', cancel: true }, { label: 'Buscar', primary: true }], host: root });
        if (!q) return;
        const nq = OS.util.norm(q);
        const hits = lib.list().filter((p) => OS.util.norm(KIND_NAMES[p.kind] || '').includes(nq) || OS.util.norm(p.place).includes(nq));
        tab = 'library';
        tabs.set('library');
        render(hits, `«${q}»`);
      });

      function render(subset = null, label = null) {
        const L = subset || lib.list();
        if (tab === 'library') {
          const first = L[0], last = L[L.length - 1];
          const range = first ? `${new Date(first.date).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })} – ${new Date(last.date).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}` : '';
          view.innerHTML = `
            <div class="ph-head"><div><h1>${label ? esc(label) : 'Biblioteca'}</h1><small>${L.length} elementos · ${range}</small></div>
              <div class="ph-actions"><button class="glass-btn" data-zoom>${OS.icon('grid')}</button><button class="glass-btn" data-select>Seleccionar</button></div></div>
            <div class="ph-scroll"><div class="ph-grid" style="--cols:${cols}">${L.map((p) => `<button class="ph-cell" data-id="${p.id}" style="background-image:url(${p.src})">${lib.isFav(p.id) ? `<span class="ph-fav">${OS.icon('heart')}</span>` : ''}</button>`).join('')}</div></div>`;
          const sc = view.querySelector('.ph-scroll');
          requestAnimationFrame(() => { sc.scrollTop = sc.scrollHeight; });
          view.querySelector('[data-zoom]').addEventListener('click', () => { cols = cols === 3 ? 5 : cols === 5 ? 1 : 3; view.querySelector('.ph-grid').style.setProperty('--cols', cols); });
          view.querySelector('[data-select]').addEventListener('click', () => OS.ui.toast('Toca las fotos para seleccionarlas', 'circleCheck'));
          view.querySelector('.ph-grid').addEventListener('click', (e) => {
            const c = e.target.closest('.ph-cell');
            if (c) openViewer(L, L.findIndex((p) => p.id === c.dataset.id), c);
          });
        } else {
          const kinds = [...new Set(L.map((p) => p.kind))];
          const favList = L.filter((p) => lib.isFav(p.id));
          view.innerHTML = `
            <div class="ph-scroll ph-coll">
              <h1 class="large-title">Colecciones</h1>
              <h3 class="ph-sec">Recuerdos ${OS.icon('chevronRight')}</h3>
              <div class="ph-mem">${kinds.slice(0, 5).map((k) => { const p = L.filter((x) => x.kind === k).pop(); return `<button class="ph-memc" data-kind="${k}" style="background-image:url(${p.src})"><b>${KIND_NAMES[k] || 'Recuerdo'}</b><span>${esc(p.place)}</span></button>`; }).join('')}</div>
              <h3 class="ph-sec">Álbumes fijados ${OS.icon('chevronRight')}</h3>
              <div class="ph-albums">
                ${album('Favoritos', favList, 'heart')}${album('Recientes', L.slice(-12), 'clock')}${album('Cámara', L.filter((p) => p.kind === 'camera'), 'camera')}${album('Paisajes', L.filter((p) => p.kind !== 'camera'), 'photo')}
              </div>
              <h3 class="ph-sec">Lugares ${OS.icon('chevronRight')}</h3>
              <div class="ph-places">${[...new Set(L.map((p) => p.place))].map((pl) => `<span class="chip">${OS.icon('pin')} ${esc(pl)}</span>`).join('')}</div>
            </div>`;
          view.querySelectorAll('[data-kind]').forEach((b) => b.addEventListener('click', () => { tab = 'library'; tabs.set('library'); render(L.filter((p) => p.kind === b.dataset.kind), KIND_NAMES[b.dataset.kind]); }));
          view.querySelectorAll('[data-album]').forEach((b) => b.addEventListener('click', () => {
            const n = b.dataset.album;
            const sub = n === 'Favoritos' ? favList : n === 'Recientes' ? L.slice(-12) : n === 'Cámara' ? L.filter((p) => p.kind === 'camera') : L.filter((p) => p.kind !== 'camera');
            tab = 'library'; tabs.set('library'); render(sub, n);
          }));
        }
      }

      function album(name, arr, icon) {
        const cover = arr[arr.length - 1];
        return `<button class="ph-album" data-album="${name}"><div class="ph-alb-img" style="${cover ? `background-image:url(${cover.src})` : ''}">${cover ? '' : OS.icon(icon)}</div><b>${name}</b><span>${arr.length}</span></button>`;
      }

      /* ---------- Visor ---------- */
      function openViewer(L, index, fromEl) {
        let i = index;
        const v = h(`<div class="ph-viewer">
          <div class="pv-track"></div>
          <header class="pv-top"><button class="glass-btn round glass-clear" data-close aria-label="Cerrar">${OS.icon('chevronLeft')}</button><div class="pv-title glass-clear"></div><button class="glass-btn glass-clear" data-edit>Editar</button></header>
          <footer class="pv-bar"><button class="glass-btn round glass-clear" data-share>${OS.icon('share')}</button><div class="pv-mid glass-clear"><button data-fav>${OS.icon('heartLine')}</button><button data-info>${OS.icon('info')}</button><button data-extend>${OS.icon('sparkles')}</button></div><button class="glass-btn round glass-clear" data-del>${OS.icon('trash')}</button></footer>
        </div>`);
        root.appendChild(v);
        const track = v.querySelector('.pv-track');
        const img = () => track.querySelector('img');

        function show(animFrom) {
          const p = L[i];
          track.innerHTML = `<img src="${p.src}" alt="${esc(KIND_NAMES[p.kind] || 'Foto')}" draggable="false">`;
          v.querySelector('.pv-title').innerHTML = `<b>${new Date(p.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</b><small>${esc(p.place)}</small>`;
          v.querySelector('[data-fav]').innerHTML = OS.icon(lib.isFav(p.id) ? 'heart' : 'heartLine');
          v.querySelector('[data-fav]').classList.toggle('on', lib.isFav(p.id));
          if (animFrom) {
            const r = OS.util.rectIn(animFrom), rr = OS.util.rectIn(v);
            const s = r.w / rr.w;
            img().animate([{ transform: `translate(${r.x + r.w / 2 - rr.w / 2}px, ${r.y + r.h / 2 - rr.h / 2}px) scale(${s * 1.3})`, opacity: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.9,.24,1)' });
          }
        }
        show(fromEl);
        requestAnimationFrame(() => v.classList.add('show'));

        const close = () => { v.classList.remove('show'); setTimeout(() => v.remove(), 300); render(); };
        v.querySelector('[data-close]').addEventListener('click', close);

        // Gestos: horizontal para navegar, hacia abajo para cerrar
        track.addEventListener('pointerdown', (e) => {
          const s = pt(e);
          let dx = 0, dy = 0, axis = null;
          track.setPointerCapture(e.pointerId);
          const move = (ev) => {
            const q = pt(ev);
            dx = q.x - s.x; dy = q.y - s.y;
            if (!axis && Math.hypot(dx, dy) > 8) axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
            if (axis === 'h') img().style.transform = `translateX(${dx}px)`;
            if (axis === 'v' && dy > 0) { img().style.transform = `translateY(${dy}px) scale(${1 - dy / 1200})`; v.style.setProperty('--bgA', String(1 - dy / 400)); }
          };
          const up = () => {
            track.removeEventListener('pointermove', move);
            track.removeEventListener('pointerup', up);
            if (axis === 'h' && Math.abs(dx) > 60) {
              const n = clamp(i + (dx < 0 ? 1 : -1), 0, L.length - 1);
              if (n !== i) { i = n; show(); img().animate([{ transform: `translateX(${dx < 0 ? 80 : -80}px)`, opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'ease-out' }); return; }
            }
            if (axis === 'v' && dy > 110) { close(); return; }
            if (!axis) { v.classList.toggle('chrome-off'); }
            img().style.transform = '';
            v.style.removeProperty('--bgA');
          };
          track.addEventListener('pointermove', move);
          track.addEventListener('pointerup', up);
        });
        track.addEventListener('dblclick', () => img().classList.toggle('zoomed'));

        v.querySelector('[data-fav]').addEventListener('click', () => { lib.toggleFav(L[i].id); show(); OS.util.haptic(8); });
        v.querySelector('[data-info]').addEventListener('click', () => {
          const p = L[i];
          OS.ui.alert({ title: KIND_NAMES[p.kind] || 'Foto', message: `${new Date(p.date).toLocaleString('es-ES')}\n${p.place} · ${p.kind === 'camera' ? 'Cámara del iPhone' : '480 × 640 · generada'}`, host: root });
        });
        v.querySelector('[data-share]').addEventListener('click', async () => {
          const i2 = await OS.ui.alert({ title: 'Compartir', buttons: [{ label: 'Usar como fondo de pantalla' }, { label: 'Cancelar' }], host: root });
          if (i2 === 0) setWallpaper(L[i]);
        });
        v.querySelector('[data-del]').addEventListener('click', async () => {
          const i2 = await OS.ui.alert({ title: 'Eliminar foto', message: 'Esta foto se eliminará de la biblioteca.', buttons: [{ label: 'Cancelar' }, { label: 'Eliminar', destructive: true }], host: root });
          if (i2 !== 1) return;
          lib.remove(L[i].id);
          L.splice(i, 1);
          if (!L.length) { close(); return; }
          i = Math.min(i, L.length - 1);
          show();
        });
        v.querySelector('[data-extend]').addEventListener('click', () => setWallpaper(L[i]));
        v.querySelector('[data-edit]').addEventListener('click', () => openEditor(L[i], (nsrc) => { const np = lib.add(nsrc, { kind: L[i].kind, place: L[i].place }); L.push(np); i = L.length - 1; show(); }));
      }

      async function setWallpaper(p) {
        const ov = h(`<div class="ai-overlay"><div class="ai-card glass"><span class="ai-badge">${OS.icon('sparkles')} Apple Intelligence</span><b>Extendiendo la foto…</b><small>Generando el fondo que falta para que llene la pantalla</small><div class="ai-bar"><i></i></div></div></div>`);
        root.appendChild(ov);
        const src = await extend(p.src);
        await OS.util.wait(900);
        ov.remove();
        const choice = await OS.ui.alert({ title: 'Foto extendida', message: 'La imagen se ha ampliado para llenar la pantalla. ¿Usarla como fondo?', buttons: [{ label: 'Cancelar' }, { label: 'Usar como fondo', primary: true }], host: root });
        if (choice !== 1) return;
        OS.wallpapers.setCustom(src);
        OS.ui.toast('Fondo de pantalla actualizado', 'check');
      }

      function openEditor(p, onSave) {
        let filter = FILTERS[0];
        const content = h(`<div class="ph-editor">
          <div class="pe-img"><img src="${p.src}" alt=""></div>
          <div class="pe-filters">${FILTERS.map((f) => `<button data-f="${f[0]}" class="${f[0] === 'none' ? 'on' : ''}"><img src="${p.src}" style="filter:${f[2]}" alt=""><span>${f[1]}</span></button>`).join('')}</div>
          <button class="btn gray block pe-extend" style="margin-top:12px">${OS.icon('sparkles')} Extender con Apple Intelligence</button>
        </div>`);
        const sh = OS.ui.sheet({
          title: 'Editar', content, host: root,
          left: { icon: 'close' },
          right: { icon: 'check', primary: true, onClick: async (s) => { if (filter[0] !== 'none') onSave(await bake(p.src, filter[2])); s.close(); } },
        });
        content.querySelector('.pe-filters').addEventListener('click', (e) => {
          const b = e.target.closest('[data-f]');
          if (!b) return;
          filter = FILTERS.find((f) => f[0] === b.dataset.f);
          content.querySelectorAll('[data-f]').forEach((x) => x.classList.toggle('on', x === b));
          content.querySelector('.pe-img img').style.filter = filter[2];
        });
        content.querySelector('.pe-extend').addEventListener('click', async () => {
          const btn = content.querySelector('.pe-extend');
          btn.textContent = 'Extendiendo…';
          const src = await extend(p.src, 3 / 4.6);
          content.querySelector('.pe-img img').src = src;
          btn.innerHTML = `${OS.icon('check')} Extendida`;
          onSave(src);
          sh.close();
        });
      }

      render();
      const off = OS.bus.on('photos', () => { if (!root.querySelector('.ph-viewer')) render(); });
      return { statusStyle: 'auto', onDestroy() { off(); } };
    },
  });

  OS.photosExtend = extend;
})();
