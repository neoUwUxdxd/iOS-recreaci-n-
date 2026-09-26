/* Notas: lista, editor, búsqueda y Herramientas de escritura simuladas. */
(function () {
  'use strict';

  const { h, esc, store, uid, fmt } = OS.util;

  let notes = store.get('notes', null) || [
    { id: uid(), text: 'Novedades de iOS 27\nSiri con app propia y conversación natural.\nLiquid Glass con translucidez ajustable.\nReloj compacto en la pantalla bloqueada.\nExtender fotos con Apple Intelligence.', updated: Date.now() - 3600e3 },
    { id: uid(), text: 'Lista de la compra\n- Pan\n- Leche de avena\n- Tomates\n- Café', updated: Date.now() - 86400e3 },
    { id: uid(), text: 'Ideas para el viaje\nReservar el tren antes del viernes y mirar museos gratis el domingo.', updated: Date.now() - 4 * 86400e3 },
  ];
  const save = () => { store.set('notes', notes); OS.bus.emit('notes'); };

  const title = (n) => (n.text.split('\n')[0] || 'Nota nueva').trim() || 'Nota nueva';
  const preview = (n) => (n.text.split('\n').slice(1).join(' ').trim() || 'Sin texto adicional');

  function create(text = '') {
    const n = { id: uid(), text, updated: Date.now() };
    notes.unshift(n);
    save();
    return n;
  }

  OS.notesIndex = () => notes.map((n) => ({ id: n.id, title: title(n), text: n.text }));

  /* Herramientas de escritura (versión local y sencilla) */
  const tools = {
    proofread(t) {
      return t.replace(/[ \t]+/g, ' ').replace(/ ([,.;:!?])/g, '$1').replace(/(^|[.!?]\s+|\n)([a-záéíóúñ])/g, (m, a, b) => a + b.toUpperCase()).replace(/\bq\b/gi, 'que').replace(/\bxq\b/gi, 'porque').trim();
    },
    friendly(t) { return tools.proofread(t).replace(/\.(\s|$)/g, ' 😊$1').replace(/^/, '¡Hola! '); },
    professional(t) { return tools.proofread(t).replace(/\bguay\b/gi, 'excelente').replace(/\bvale\b/gi, 'de acuerdo').replace(/!+/g, '.').replace(/[😀-🙏✨💜👋]/gu, ''); },
    summary(t) {
      const lines = t.split('\n').map((l) => l.trim()).filter(Boolean);
      const head = lines[0] || '';
      const pts = lines.slice(1).map((l) => l.replace(/^[-•]\s*/, '').split(/[.;]/)[0]).filter(Boolean).slice(0, 4);
      return `${head}\nResumen:\n${pts.map((p) => '• ' + p).join('\n') || '• ' + head}`;
    },
    list(t) { const lines = t.split('\n'); return [lines[0], ...lines.slice(1).filter((l) => l.trim()).map((l) => '• ' + l.replace(/^[-•]\s*/, ''))].join('\n'); },
  };

  OS.registerApp('notes', {
    create(root) {
      root.classList.add('grouped', 'notes-app');
      const nav = OS.ui.navStack(root);
      let query = '';

      const list = OS.ui.page({ title: 'Notas', actions: `<button class="glass-btn round" data-more>${OS.icon('ellipsis')}</button>` });
      list.body.innerHTML = `<label class="search-field">${OS.icon('search')}<input placeholder="Buscar" aria-label="Buscar notas">${OS.icon('mic')}</label><div class="notes-list"></div>`;
      const $list = list.body.querySelector('.notes-list');
      const toolbar = h(`<div class="toolbar"><span></span><span class="glass-btn notes-count" style="pointer-events:none;font-size:13px;height:40px"></span><button class="glass-btn round" data-new aria-label="Nueva nota" style="color:var(--yellow)">${OS.icon('compose')}</button></div>`);
      list.appendChild(toolbar);

      function renderList() {
        const q = OS.util.norm(query);
        const items = notes.filter((n) => !q || OS.util.norm(n.text).includes(q)).sort((a, b) => b.updated - a.updated);
        const today = new Date().toDateString();
        const groups = [['Hoy', items.filter((n) => new Date(n.updated).toDateString() === today)], ['Últimos 30 días', items.filter((n) => new Date(n.updated).toDateString() !== today)]];
        $list.innerHTML = groups.filter(([, arr]) => arr.length).map(([g, arr]) => `
          <div class="group-head notes-head">${g}</div>
          <div class="group">${arr.map((n) => `<div class="cell tap note-row" data-id="${n.id}"><div class="cell-label"><b>${esc(title(n))}</b><small><span>${new Date(n.updated).toDateString() === today ? fmt.time(new Date(n.updated)) : new Date(n.updated).toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric', year: '2-digit' })}</span> ${esc(preview(n))}</small></div></div>`).join('')}</div>`).join('') ||
          `<div class="empty-state">${OS.icon('note')}<b>${query ? 'Sin resultados' : 'No hay notas'}</b></div>`;
        toolbar.querySelector('.notes-count').textContent = `${notes.length} nota${notes.length === 1 ? '' : 's'}`;
      }

      list.body.querySelector('input').addEventListener('input', (e) => { query = e.target.value; renderList(); });
      $list.addEventListener('click', (e) => {
        const r = e.target.closest('.note-row');
        if (r) openNote(r.dataset.id);
      });
      toolbar.querySelector('[data-new]').addEventListener('click', () => { const n = create(''); openNote(n.id, true); });
      list.querySelector('[data-more]').addEventListener('click', () => OS.ui.toast(`${notes.length} notas en «iPhone»`, 'note'));

      function openNote(id, focus = false) {
        const n = notes.find((x) => x.id === id);
        if (!n) return;
        nav.popToRoot();
        const p = OS.ui.page({ title: '', large: false, back: () => nav.pop(), actions: `<button class="glass-btn round" data-share aria-label="Compartir">${OS.icon('share')}</button><button class="glass-btn round tinted" data-done aria-label="Listo" style="background:var(--yellow);color:#000">${OS.icon('check')}</button>` });
        p.querySelector('.nav-back').style.color = 'var(--yellow)';
        p.classList.add('note-page');
        p.body.innerHTML = `<div class="note-date">${new Date(n.updated).toLocaleString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div><div class="note-editor" contenteditable="true" spellcheck="false"></div>`;
        const ed = p.body.querySelector('.note-editor');
        ed.innerText = n.text;
        const tb = h(`<div class="toolbar note-tools">
          <button class="glass-btn round" data-del aria-label="Eliminar">${OS.icon('trash')}</button>
          <button class="glass-btn wt-btn" data-wt>${OS.icon('sparkles')}<span>Herramientas de escritura</span></button>
          <button class="glass-btn round" data-new aria-label="Nueva nota" style="color:var(--yellow)">${OS.icon('compose')}</button></div>`);
        p.appendChild(tb);
        const commit = () => {
          const t = ed.innerText.replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '');
          if (t !== n.text) { n.text = t; n.updated = Date.now(); save(); }
        };
        ed.addEventListener('input', commit);
        ed.addEventListener('keydown', (e) => e.stopPropagation());
        p.addEventListener('popped', () => {
          commit();
          if (!n.text.trim()) { notes = notes.filter((x) => x !== n); save(); }
          renderList();
        });
        p.querySelector('[data-done]').addEventListener('click', () => { commit(); ed.blur(); });
        p.querySelector('[data-share]').addEventListener('click', async () => {
          commit();
          try { if (navigator.share) await navigator.share({ title: title(n), text: n.text }); else { await navigator.clipboard.writeText(n.text); OS.ui.toast('Nota copiada', 'check'); } } catch (e) { /* cancelado */ }
        });
        tb.querySelector('[data-del]').addEventListener('click', async () => {
          const i = await OS.ui.alert({ title: '¿Eliminar nota?', message: 'Esta acción no se puede deshacer.', buttons: [{ label: 'Cancelar' }, { label: 'Eliminar', destructive: true }] });
          if (i === 1) { n.text = ''; nav.pop(); }
        });
        tb.querySelector('[data-new]').addEventListener('click', () => { commit(); const nn = create(''); openNote(nn.id, true); });
        tb.querySelector('[data-wt]').addEventListener('click', () => {
          commit();
          const content = h(`<div style="padding:0 16px 10px">
            <div class="wt-grid">
              <button data-tool="proofread">${OS.icon('check')}<span>Corregir</span></button>
              <button data-tool="professional">${OS.icon('edit')}<span>Profesional</span></button>
              <button data-tool="friendly">${OS.icon('heart')}<span>Amistoso</span></button>
            </div>
            <div class="group" style="margin:14px 0 0">
              <div class="cell tap" data-tool="summary"><span class="cell-label">Resumen</span>${OS.icon('list')}</div>
              <div class="cell tap" data-tool="list"><span class="cell-label">Lista</span>${OS.icon('list')}</div>
            </div>
            <p style="font-size:12px;color:var(--label2);text-align:center;margin:14px 0 0">Herramientas de escritura · simuladas localmente</p></div>`);
          const sh = OS.ui.sheet({ title: 'Herramientas de escritura', content, left: { icon: 'close' }, host: root });
          content.addEventListener('click', (e) => {
            const b = e.target.closest('[data-tool]');
            if (!b) return;
            ed.classList.add('ai-working');
            sh.close();
            setTimeout(() => {
              ed.innerText = tools[b.dataset.tool](n.text);
              ed.classList.remove('ai-working');
              commit();
            }, 900);
          });
        });
        nav.push(p);
        if (focus) setTimeout(() => { ed.focus(); }, 500);
      }

      nav.push(list, false);
      renderList();
      const off = OS.bus.on('notes', () => { if (nav.depth === 1) renderList(); });

      OS.notesApp = { create: (t) => { const n = create(t); renderList(); return n; }, openNote };
      return {
        statusStyle: 'auto',
        onShow() { renderList(); },
        onDestroy() { off(); OS.notesApp = fallback; },
      };
    },
  });

  const fallback = { create, openNote() {} };
  OS.notesApp = fallback;
})();
