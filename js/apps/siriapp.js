/* App Siri (nueva en iOS 27): conversación completa con historial. */
(function () {
  'use strict';

  const { h, esc, store } = OS.util;

  let history = store.get('siriHistory', []);
  const save = () => store.set('siriHistory', history.slice(-60));
  OS.siriHistory = { clear() { history = []; save(); OS.bus.emit('siri:history'); } };

  const SUGGEST = [
    ['sun', '¿Qué tiempo hace hoy?'],
    ['timer', 'Pon un temporizador de 10 minutos'],
    ['note', 'Crea una nota: ideas para el finde'],
    ['sparkles', '¿Qué hay de nuevo en iOS 27?'],
    ['moon', 'Activa el modo oscuro'],
    ['calculator', 'Cuánto es 128 por 7'],
  ];

  OS.registerApp('siri', {
    create(root) {
      root.classList.add('siri-app');
      root.innerHTML = `
        <div class="sa-bg"><i></i><i></i><i></i></div>
        <header class="sa-top"><button class="glass-btn round" data-new aria-label="Nueva conversación">${OS.icon('compose')}</button><span class="sa-title">Siri</span><button class="glass-btn round" data-hist aria-label="Historial">${OS.icon('clock')}</button></header>
        <div class="sa-scroll"><div class="sa-intro">
            <div class="sa-orb"><span class="siri-orb"><i></i><i></i><i></i></span></div>
            <h1>¿En qué puedo ayudarte?</h1>
            <p>Pregunta lo que quieras, pídeme que haga cosas en tus apps o que cambie ajustes.</p>
            <div class="sa-sugg">${SUGGEST.map(([i, t]) => `<button class="glass" data-q="${esc(t)}">${OS.icon(i)}<span>${esc(t)}</span></button>`).join('')}</div>
          </div><div class="sa-convo"></div></div>
        <form class="sa-bar glass refract" autocomplete="off">
          <input placeholder="Pregunta a Siri" aria-label="Pregunta a Siri">
          <button type="button" class="s-btn mic" aria-label="Dictar">${OS.icon('mic')}</button>
          <button type="submit" class="s-btn send" aria-label="Enviar">${OS.icon('arrowUp')}</button>
        </form>`;

      const scroll = root.querySelector('.sa-scroll');
      const convo = root.querySelector('.sa-convo');
      const intro = root.querySelector('.sa-intro');
      const form = root.querySelector('form');
      const input = form.querySelector('input');
      const mic = form.querySelector('.mic');
      let rec = null;

      function bubble(m) {
        if (m.me) return `<div class="sa-q">${esc(m.text)}</div>`;
        return `<div class="sa-a">${OS.icon('sparkles')}<div>${esc(m.text)}${m.card ? `<div class="rich">${m.card}</div>` : ''}</div></div>`;
      }

      function render() {
        intro.style.display = history.length ? 'none' : '';
        convo.innerHTML = history.map(bubble).join('');
        requestAnimationFrame(() => { scroll.scrollTop = scroll.scrollHeight; });
      }

      async function ask(text) {
        text = text.trim();
        if (!text) return;
        input.value = '';
        history.push({ me: true, text });
        render();
        const think = h('<div class="sa-a thinking"><span class="siri-typing"><i></i><i></i><i></i></span></div>');
        convo.appendChild(think);
        scroll.scrollTop = scroll.scrollHeight;
        root.classList.add('thinking');
        const res = await OS.siriBrain.ask(text);
        root.classList.remove('thinking');
        history.push({ me: false, text: res.text, card: res.card || '' });
        save();
        render();
        OS.siriBrain.speak(res.text);
      }

      form.addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });
      input.addEventListener('keydown', (e) => e.stopPropagation());
      root.querySelector('.sa-sugg').addEventListener('click', (e) => { const b = e.target.closest('[data-q]'); if (b) ask(b.dataset.q); });
      root.querySelector('[data-new]').addEventListener('click', () => { history = []; save(); render(); });
      root.querySelector('[data-hist]').addEventListener('click', () => OS.ui.toast(`${history.filter((m) => m.me).length} preguntas en esta conversación`, 'clock'));
      mic.addEventListener('click', () => {
        if (rec) { rec.stop(); return; }
        mic.classList.add('listening');
        input.placeholder = 'Escuchando…';
        rec = OS.siriBrain.listen((t, fin) => { input.value = t; if (fin) ask(t); }, () => { rec = null; mic.classList.remove('listening'); input.placeholder = 'Pregunta a Siri'; });
      });

      render();
      const off = OS.bus.on('siri:history', render);
      return { statusStyle: 'light', onDestroy() { off(); if (rec) rec.stop(); } };
    },
  });
})();
