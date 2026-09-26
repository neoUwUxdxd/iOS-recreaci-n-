/* Búsqueda (Spotlight): apps, notas, ajustes, cálculos, web y Siri. */
(function () {
  'use strict';

  const { h, esc, calc, fmt } = OS.util;
  const el = document.getElementById('spotlight');
  el.innerHTML = `
    <div class="spot-bg"></div>
    <div class="spot-content"></div>
    <div class="spot-field glass">${OS.icon('search')}<input type="search" placeholder="Buscar" autocomplete="off" spellcheck="false" aria-label="Buscar"><button class="spot-cancel link" style="font-size:16px">Cancelar</button></div>`;
  const content = el.querySelector('.spot-content');
  const input = el.querySelector('input');

  const SUGGESTED = ['messages', 'safari', 'camera', 'photos', 'notes', 'siri', 'settings', 'weather'];

  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  function appsGrid(ids) {
    return `<div class="spot-apps glass">${ids.map((id) => `<div class="spot-app" data-app="${id}">${OS.iconHTML(id)}<div class="home-label">${esc(OS.appDefs[id].name)}</div></div>`).join('')}</div>`;
  }

  function render() {
    const q = input.value.trim();
    if (!q) {
      content.innerHTML = `<div class="spot-section"><h3>Sugerencias de Siri</h3>${appsGrid(SUGGESTED)}</div>`;
      return;
    }
    const nq = norm(q);
    const apps = OS.appList.filter((a) => norm(a.name).includes(nq)).map((a) => a.id).slice(0, 8);
    const rows = [];
    // Cálculo
    if (/[\d)]\s*[-+*/x×÷^%]\s*[\d(]/.test(q)) {
      try {
        const v = calc(q);
        rows.push(`<div class="spot-row" data-copy="${v}">${OS.iconHTML('calculator')}<div><b>= ${fmt.number(v)}</b><small>Calculadora</small></div></div>`);
      } catch (e) { /* no es una expresión */ }
    }
    // Ajustes
    (OS.settingsIndex || []).filter((s) => norm(s.label).includes(nq)).slice(0, 4).forEach((s) => {
      rows.push(`<div class="spot-row" data-setting="${esc(s.path)}">${OS.iconHTML('settings')}<div><b>${esc(s.label)}</b><small>Ajustes</small></div></div>`);
    });
    // Notas
    (OS.notesIndex ? OS.notesIndex() : []).filter((n) => norm(n.text).includes(nq)).slice(0, 3).forEach((n) => {
      rows.push(`<div class="spot-row" data-note="${n.id}">${OS.iconHTML('notes')}<div><b>${esc(n.title)}</b><small>Notas</small></div></div>`);
    });
    rows.push(`<div class="spot-row" data-siri="${esc(q)}">${OS.iconHTML('siri')}<div><b>Preguntar a Siri</b><small>“${esc(q)}”</small></div></div>`);
    rows.push(`<div class="spot-row" data-web="${esc(q)}">${OS.iconHTML('safari')}<div><b>${esc(q)}</b><small>Buscar en la web</small></div></div>`);
    content.innerHTML = (apps.length ? `<div class="spot-section"><h3>Apps</h3>${appsGrid(apps)}</div>` : '') +
      `<div class="spot-section"><h3>Resultados</h3><div class="spot-list glass">${rows.join('')}</div></div>`;
  }

  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = content.querySelector('.spot-app, .spot-row');
      if (first) first.click();
    }
    if (e.key === 'Escape') api.close();
    e.stopPropagation();
  });

  content.addEventListener('click', (e) => {
    const a = e.target.closest('[data-app]');
    const r = e.target.closest('.spot-row');
    if (a) { api.close(); OS.windows.open(a.dataset.app); return; }
    if (!r) { if (e.target === content) api.close(); return; }
    if (r.dataset.siri) { api.close(); OS.siri.open(r.dataset.siri); return; }
    if (r.dataset.web) { api.close(); OS.windows.open('safari'); setTimeout(() => OS.safari && OS.safari.go(r.dataset.web), 450); return; }
    if (r.dataset.note) { api.close(); OS.windows.open('notes'); setTimeout(() => OS.notesApp && OS.notesApp.openNote(r.dataset.note), 450); return; }
    if (r.dataset.setting) { api.close(); OS.windows.open('settings'); setTimeout(() => OS.settingsApp && OS.settingsApp.go(r.dataset.setting), 450); return; }
    if (r.dataset.copy) { try { navigator.clipboard.writeText(r.dataset.copy); OS.ui.toast('Copiado', 'check'); } catch (err) { /* sin portapapeles */ } }
  });
  el.querySelector('.spot-cancel').addEventListener('click', () => api.close());
  el.querySelector('.spot-bg').addEventListener('click', () => api.close());

  const api = {
    open(q = '') {
      el.classList.add('open');
      el.style.opacity = '';
      el.setAttribute('aria-hidden', 'false');
      input.value = q;
      render();
      OS.sys.spotlight = true;
      OS.home.el.classList.add('dim');
      OS.chrome.update();
      setTimeout(() => input.focus({ preventScroll: true }), 120);
    },
    close() {
      if (!OS.sys.spotlight && !el.classList.contains('open')) return;
      el.classList.remove('open');
      el.style.opacity = '';
      el.setAttribute('aria-hidden', 'true');
      input.blur();
      OS.sys.spotlight = false;
      OS.home.el.classList.remove('dim');
      OS.chrome.update();
    },
    peek(p) {
      if (p <= 0) { el.style.opacity = ''; return; }
      el.style.opacity = String(p * 0.9);
    },
    get isOpen() { return !!OS.sys.spotlight; },
  };
  OS.spotlight = api;
})();
