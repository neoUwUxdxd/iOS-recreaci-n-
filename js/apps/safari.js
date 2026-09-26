/* Safari: página de inicio, barra de direcciones de Liquid Glass y navegación en un iframe. */
(function () {
  'use strict';

  const { esc } = OS.util;

  const FAVS = [
    { name: 'Wikipedia', url: 'https://es.wikipedia.org/wiki/IOS_27', color: '#e8e8e8', ink: '#000', letter: 'W' },
    { name: 'OpenStreetMap', url: 'https://www.openstreetmap.org/export/embed.html?bbox=-3.72,40.40,-3.68,40.43&layer=mapnik', color: '#7ebc6f', ink: '#fff', letter: 'O' },
    { name: 'Example', url: 'https://example.com/', color: '#5e5ce6', ink: '#fff', letter: 'E' },
    { name: 'Wikcionario', url: 'https://es.wiktionary.org/wiki/cristal', color: '#fff', ink: '#333', letter: 'Wk' },
    { name: 'Open‑Meteo', url: 'https://open-meteo.com/', color: '#ff9f0a', ink: '#fff', letter: 'M' },
    { name: 'Wikimedia', url: 'https://commons.m.wikimedia.org/wiki/Main_Page', color: '#069', ink: '#fff', letter: 'C' },
    { name: 'RAE', url: 'https://dle.rae.es/', color: '#9b1b30', ink: '#fff', letter: 'R' },
    { name: 'Archive', url: 'https://archive.org/', color: '#222', ink: '#fff', letter: 'A' },
  ];

  const toUrl = (q) => {
    const t = q.trim();
    if (/^https?:\/\//i.test(t)) return t;
    if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(t)) return 'https://' + t;
    return 'https://es.wikipedia.org/w/index.php?search=' + encodeURIComponent(t);
  };
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } };

  OS.registerApp('safari', {
    create(root) {
      root.classList.add('grouped', 'safari-app');
      const hist = [];
      let current = null;

      root.innerHTML = `
        <div class="sf-start page-scroll">
          <h2 class="sf-h">Favoritos</h2>
          <div class="sf-favs">${FAVS.map((f, i) => `<button class="sf-fav" data-i="${i}"><span style="background:${f.color};color:${f.ink}">${f.letter}</span><small>${esc(f.name)}</small></button>`).join('')}</div>
          <h2 class="sf-h">Informe de privacidad</h2>
          <div class="group sf-privacy"><div class="cell">${OS.icon('shield')}<span class="cell-label">Safari ha evitado que <b>27 rastreadores</b> creen tu perfil en los últimos 7 días.</span><b class="sf-num">27</b></div></div>
          <h2 class="sf-h">Novedades de iOS 27</h2>
          <div class="group">
            <div class="cell tap" data-go="https://es.wikipedia.org/wiki/IOS_27">${OS.icon('globe')}<span class="cell-label">iOS 27 — Wikipedia<small>es.wikipedia.org</small></span></div>
            <div class="cell tap" data-go="https://es.wikipedia.org/wiki/Liquid_Glass">${OS.icon('globe')}<span class="cell-label">Liquid Glass<small>es.wikipedia.org</small></span></div>
            <div class="cell tap" data-go="https://es.wikipedia.org/wiki/Siri">${OS.icon('globe')}<span class="cell-label">Siri<small>es.wikipedia.org</small></span></div>
          </div>
        </div>
        <div class="sf-web"><div class="sf-progress"><i></i></div><iframe title="Página web" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
          <div class="sf-note"><span>¿No se ve la página? Algunos sitios no permiten mostrarse dentro de otra web.</span><a class="link" data-ext href="#" target="_blank" rel="noopener noreferrer">Abrir fuera</a></div></div>
        <form class="sf-bar">
          <button type="button" class="glass-btn round sf-back" aria-label="Atrás">${OS.icon('chevronLeft')}</button>
          <label class="sf-addr glass refract">${OS.icon('search')}<input type="text" inputmode="url" autocomplete="off" spellcheck="false" placeholder="Buscar o escribir sitio web"><button type="button" class="sf-reload" aria-label="Recargar">${OS.icon('reload')}</button></label>
          <button type="button" class="glass-btn round sf-more" aria-label="Más">${OS.icon('ellipsis')}</button>
        </form>`;

      const start = root.querySelector('.sf-start');
      const frame = root.querySelector('iframe');
      const input = root.querySelector('.sf-addr input');
      const prog = root.querySelector('.sf-progress');
      const form = root.querySelector('.sf-bar');

      function showStart() {
        current = null;
        root.classList.remove('browsing');
        input.value = '';
        frame.removeAttribute('src');
      }

      function go(q, push = true) {
        const url = toUrl(q);
        if (push && current) hist.push(current);
        current = url;
        root.classList.add('browsing');
        input.value = host(url);
        prog.classList.remove('done');
        void prog.offsetWidth;
        prog.classList.add('loading');
        frame.src = url;
        ext.href = url;
        input.blur();
      }
      frame.addEventListener('load', () => { if (!current) return; prog.classList.remove('loading'); prog.classList.add('done'); });

      start.addEventListener('click', (e) => {
        const f = e.target.closest('.sf-fav');
        const g = e.target.closest('[data-go]');
        if (f) go(FAVS[+f.dataset.i].url);
        else if (g) go(g.dataset.go);
      });
      form.addEventListener('submit', (e) => { e.preventDefault(); if (input.value.trim()) go(input.value); });
      input.addEventListener('focus', () => { if (current) input.value = current; input.select(); });
      input.addEventListener('blur', () => { if (current) input.value = host(current); });
      input.addEventListener('keydown', (e) => e.stopPropagation());
      root.querySelector('.sf-back').addEventListener('click', () => {
        if (hist.length) go(hist.pop(), false);
        else if (current) showStart();
      });
      root.querySelector('.sf-reload').addEventListener('click', () => { if (current) go(current, false); });
      const ext = root.querySelector('[data-ext]');
      ext.addEventListener('click', (e) => { if (!current) e.preventDefault(); });
      const openOutside = (url) => {
        const a = document.createElement('a');
        a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        document.body.appendChild(a); a.click(); a.remove();
      };
      root.querySelector('.sf-more').addEventListener('click', async () => {
        const i = await OS.ui.alert({ title: current ? host(current) : 'Safari', buttons: [{ label: 'Página de inicio' }, { label: 'Abrir en el navegador' }, { label: 'Copiar enlace' }, { label: 'Cancelar' }], host: root });
        if (i === 0) showStart();
        if (i === 1 && current) openOutside(current);
        if (i === 2 && current) { try { await navigator.clipboard.writeText(current); OS.ui.toast('Enlace copiado', 'check'); } catch (e) { /* sin portapapeles */ } }
      });

      OS.safari = { go };
      return {
        statusStyle: 'auto',
        onDestroy() { OS.safari = null; },
      };
    },
  });
})();
