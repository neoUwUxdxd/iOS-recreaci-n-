/* Teléfono: teclado, recientes, contactos y pantalla de llamada (con Actividad en vivo). */
(function () {
  'use strict';

  const { h, esc, store, fmt } = OS.util;

  const CONTACTS = [
    { name: 'Mamá', num: '+34 600 123 456', fav: true },
    { name: 'Lucía', num: '+34 611 222 333', fav: true },
    { name: 'Carlos', num: '+34 622 444 555', fav: true },
    { name: 'Abuela', num: '+34 915 555 010', fav: false },
    { name: 'Dentista', num: '+34 913 000 111', fav: false },
    { name: 'Pablo', num: '+34 633 777 888', fav: false },
    { name: 'Sara', num: '+34 644 999 000', fav: false },
  ];
  const KEYS = [['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['*', ''], ['0', '+'], ['#', '']];
  let recents = store.get('recents', [
    { who: 'Mamá', ts: Date.now() - 3600e3 * 3, type: 'in' },
    { who: 'Carlos', ts: Date.now() - 86400e3, type: 'missed' },
    { who: '+34 910 000 000', ts: Date.now() - 2 * 86400e3, type: 'out' },
  ]);

  let call = null;

  function startCall(who, host) {
    if (call) return;
    const c = CONTACTS.find((x) => OS.util.norm(x.name) === OS.util.norm(who));
    const label = c ? c.name : who;
    recents.unshift({ who: label, ts: Date.now(), type: 'out' });
    store.set('recents', recents.slice(0, 30));
    call = { label, start: 0, muted: false, speaker: false };
    const el = h(`<div class="call-screen">
      <div class="call-bg"></div>
      <div class="call-who"><span class="call-av">${esc(label.replace(/[^\p{L}]/gu, '').slice(0, 2).toUpperCase() || '#')}</span><b>${esc(label)}</b><small class="call-st">Llamando…</small></div>
      <div class="call-grid">
        ${[['speaker', 'Altavoz', 'speaker'], ['video', 'FaceTime', 'video'], ['mute', 'Silenciar', 'mic'], ['add', 'Añadir', 'plus'], ['end', 'Colgar', 'phoneDown'], ['keypad', 'Teclado', 'keypad']].map(([k, l, i]) => `<button class="call-b ${k === 'end' ? 'end' : ''}" data-c="${k}"><span>${OS.icon(i)}</span><small>${l}</small></button>`).join('')}
      </div></div>`);
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    const st = el.querySelector('.call-st');
    const connectT = setTimeout(() => { call.start = Date.now(); OS.audio.tone({ freq: 880, dur: 0.08, gain: 0.06 }); }, 2600);
    // Tonos de llamada
    const ring = setInterval(() => { if (call && !call.start) { OS.audio.tone({ freq: 425, dur: 0.9, gain: 0.05 }); } }, 2000);
    OS.audio.tone({ freq: 425, dur: 0.9, gain: 0.05 });
    const tick = OS.bus.on('tick', () => {
      if (!call) return;
      st.textContent = call.start ? fmt.duration(Date.now() - call.start) : 'Llamando…';
      OS.island.update('call');
    });
    OS.island.set('call', {
      priority: 8,
      width: 200,
      left: () => `<span class="isl-call">${OS.icon('phone')}</span>`,
      right: () => `<span class="isl-call">${call && call.start ? fmt.duration(Date.now() - call.start) : '···'}</span>`,
      onTap: () => { OS.windows.open('phone'); },
    });
    const end = () => {
      clearTimeout(connectT); clearInterval(ring); tick();
      OS.island.clear('call');
      OS.audio.tone({ freq: 480, dur: 0.15, gain: 0.06 });
      el.classList.remove('show');
      setTimeout(() => el.remove(), 350);
      call = null;
      OS.bus.emit('calls');
    };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-c]');
      if (!b) return;
      const k = b.dataset.c;
      if (k === 'end') end();
      else if (k === 'mute' || k === 'speaker') { call[k === 'mute' ? 'muted' : 'speaker'] = !call[k === 'mute' ? 'muted' : 'speaker']; b.classList.toggle('on'); }
      else OS.ui.toast('No disponible durante la llamada', 'info');
    });
  }

  OS.registerApp('phone', {
    create(root) {
      root.classList.add('plain', 'phone-app');
      let tab = 'keypad';
      let digits = '';
      const view = h('<div class="ph-v"></div>');
      root.appendChild(view);
      const tabs = OS.ui.tabbar([{ id: 'favs', icon: 'star', label: 'Favoritos' }, { id: 'recents', icon: 'clock', label: 'Recientes' }, { id: 'contacts', icon: 'personCircle', label: 'Contactos' }, { id: 'keypad', icon: 'keypad', label: 'Teclado' }], tab, (id) => { tab = id; render(); });
      root.appendChild(tabs);

      function render() {
        if (tab === 'keypad') {
          view.innerHTML = `<div class="kp">
            <div class="kp-num">${esc(digits)}</div>
            <div class="kp-add">${digits ? '<button class="link">Añadir número</button>' : ''}</div>
            <div class="kp-grid">${KEYS.map(([d, l]) => `<button class="kp-k" data-k="${d}"><b>${d}</b><small>${l}</small></button>`).join('')}</div>
            <div class="kp-row"><span></span><button class="kp-call" aria-label="Llamar">${OS.icon('phone')}</button><button class="kp-del ${digits ? '' : 'hide'}" aria-label="Borrar">${OS.icon('arrowLeft')}</button></div></div>`;
        } else {
          const title = { favs: 'Favoritos', recents: 'Recientes', contacts: 'Contactos' }[tab];
          let rows = '';
          if (tab === 'favs') rows = CONTACTS.filter((c) => c.fav).map((c) => `<div class="cell tap" data-call="${esc(c.name)}"><span class="msg-av" style="width:40px;height:40px;background:linear-gradient(180deg,#b0b0b8,#7c7c85);font-size:15px">${esc(c.name.slice(0, 2).toUpperCase())}</span><span class="cell-label">${esc(c.name)}<small>móvil</small></span><span class="cell-value" style="color:var(--tint)">${OS.icon('info')}</span></div>`).join('');
          if (tab === 'recents') rows = recents.map((r) => `<div class="cell tap" data-call="${esc(r.who)}"><span class="cell-label" style="${r.type === 'missed' ? 'color:var(--red)' : ''}">${r.type === 'out' ? `<span style="color:var(--label2);font-size:13px">${OS.icon('phone')}</span>` : ''}${esc(r.who)}<small>${r.type === 'missed' ? 'Perdida' : r.type === 'in' ? 'Entrante' : 'Saliente'}</small></span><span class="cell-value" style="font-size:15px">${fmt.relative(r.ts)}</span></div>`).join('');
          if (tab === 'contacts') rows = CONTACTS.slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => `<div class="cell tap" data-call="${esc(c.name)}"><span class="cell-label">${esc(c.name)}<small>${esc(c.num)}</small></span></div>`).join('');
          view.innerHTML = `<div class="page-scroll"><h1 class="large-title">${title}</h1>${tab === 'contacts' ? `<div class="profile" style="margin:0 16px 16px;padding:0"><div class="avatar" style="background:linear-gradient(180deg,#7fb2ff,#4a6cf7)">AG</div><div><b>${esc(OS.state.get('userName'))}</b><small>Mi tarjeta</small></div></div>` : ''}<div class="group">${rows}</div></div>`;
        }
      }

      view.addEventListener('click', (e) => {
        const k = e.target.closest('[data-k]');
        if (k) {
          if (digits.length < 16) digits += k.dataset.k;
          OS.audio.tone({ freq: 697 + (Number(k.dataset.k) || 5) * 40, dur: 0.12, gain: 0.06 });
          render();
          return;
        }
        if (e.target.closest('.kp-del')) { digits = digits.slice(0, -1); render(); return; }
        if (e.target.closest('.kp-call')) {
          if (!digits) { digits = recents.find((r) => r.type === 'out')?.who || ''; render(); return; }
          startCall(digits, root);
          digits = '';
          render();
          return;
        }
        const c = e.target.closest('[data-call]');
        if (c) startCall(c.dataset.call, root);
      });

      render();
      const off = OS.bus.on('calls', () => { if (tab === 'recents') render(); });
      OS.phoneApp = { call: (who) => startCall(who, root) };
      return { statusStyle: 'auto', onDestroy() { off(); } };
    },
  });
})();
