/* Mensajes: conversaciones con respuestas automáticas, reacciones y notificaciones. */
(function () {
  'use strict';

  const { h, esc, store, uid, fmt } = OS.util;

  const PERSONAS = {
    'Lucía': { color: 'linear-gradient(180deg,#ff9a9e,#f06292)', replies: ['¡Jajaja, me encanta! 😂', 'Oye, ¿quedamos este finde?', '¡Qué guay! Cuéntame más ✨', 'Vale, ¡hablamos luego! 💜'] },
    'Mamá': { color: 'linear-gradient(180deg,#a8e063,#56ab2f)', replies: ['¿Has comido bien, cariño?', 'Llámame cuando puedas ❤️', '¡Qué bien! Me alegro mucho.', 'Acuérdate de coger chaqueta, que refresca.'] },
    'Carlos': { color: 'linear-gradient(180deg,#89f7fe,#66a6ff)', replies: ['Buenísimo 👌', '¿Has visto el partido?', 'Dale, me parece bien.', 'Te paso el enlace luego.'] },
    'Amigos 🎉': { color: 'linear-gradient(180deg,#fbc2eb,#a18cd1)', group: true, replies: ['Pablo: ¡Yo me apunto!', 'Sara: ¿A qué hora?', 'Pablo: 🔥🔥🔥', 'Sara: Llevo yo las pizzas 🍕'] },
  };

  const now = Date.now();
  let convos = store.get('messages', null) || [
    { id: 'c1', name: 'Lucía', unread: 1, msgs: [
      { me: false, text: '¡Hola! ¿Qué tal todo?', ts: now - 3600e3 * 5 },
      { me: true, text: 'Genial, estrenando iOS 27 🤩', ts: now - 3600e3 * 4.9 },
      { me: false, text: '¿Has probado ya iOS 27? El nuevo Liquid Glass es precioso ✨', ts: now - 60000 * 12 },
    ] },
    { id: 'c2', name: 'Mamá', unread: 0, msgs: [
      { me: false, text: 'No te olvides de la cena del domingo', ts: now - 86400e3 },
      { me: true, text: '¡Claro que no! Allí estaré 😊', ts: now - 86400e3 + 600e3, react: '❤️' },
    ] },
    { id: 'c3', name: 'Carlos', unread: 0, msgs: [{ me: false, text: '¿Te vienes al cine mañana?', ts: now - 2 * 86400e3 }, { me: true, text: '¡Vale! ¿A qué hora?', ts: now - 2 * 86400e3 + 100e3 }] },
    { id: 'c4', name: 'Amigos 🎉', unread: 0, msgs: [{ me: false, text: 'Sara: ¿Hacemos algo el sábado?', ts: now - 3 * 86400e3 }] },
  ];
  const save = () => { store.set('messages', convos); OS.bus.emit('messages'); updateBadge(); };
  function updateBadge() { if (OS.home) OS.home.setBadge('messages', convos.reduce((a, c) => a + (c.unread || 0), 0)); }

  const persona = (c) => PERSONAS[c.name] || { color: 'linear-gradient(180deg,#b0b0b8,#7c7c85)', replies: ['👍', '¡Recibido!', 'Jaja, vale', '¡Gracias por avisar!'] };
  const initials = (n) => n.replace(/[^\p{L}\s]/gu, '').trim().split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase() || '👥';

  let openId = null;
  let typing = {};

  function smartReply(c, text) {
    const t = OS.util.norm(text);
    const p = persona(c);
    const pre = p.group ? ['Pablo: ', 'Sara: '][Math.floor(Math.random() * 2)] : '';
    if (/hola|buenas|hey/.test(t)) return pre + '¡Hola! 👋 ¿Qué tal?';
    if (/gracias/.test(t)) return pre + '¡De nada! 😊';
    if (/\?$/.test(text.trim()) && /hora|cuando/.test(t)) return pre + 'Sobre las 8 me va bien.';
    if (/ios|iphone|siri|liquid/.test(t)) return pre + 'Yo también lo tengo, ¡el Siri nuevo es otro nivel! 🤯';
    if (/te quiero|besos|❤|💜/.test(text)) return pre + '¡Y yo a ti! ❤️';
    return p.replies[Math.floor(Math.random() * p.replies.length)];
  }

  function send(c, text) {
    c.msgs.push({ me: true, text, ts: Date.now() });
    save();
    OS.audio.send();
    // Respuesta automática
    setTimeout(() => { typing[c.id] = true; OS.bus.emit('messages'); }, 900);
    setTimeout(() => {
      typing[c.id] = false;
      const reply = smartReply(c, text);
      c.msgs.push({ me: false, text: reply, ts: Date.now() });
      const visible = OS.sys.current === 'messages' && !OS.sys.switcher && openId === c.id && !OS.state.get('locked');
      if (!visible) {
        c.unread = (c.unread || 0) + 1;
        OS.notify({ app: 'messages', title: c.name, body: reply, onTap: () => { OS.windows.open('messages'); setTimeout(() => OS.messagesApp.open(c.id), 420); } });
      } else OS.audio.receive();
      save();
    }, 2300 + Math.random() * 1500);
  }

  function findOrCreate(name) {
    const n = OS.util.norm(name);
    let c = convos.find((x) => OS.util.norm(x.name).startsWith(n));
    if (!c) {
      c = { id: uid(), name: name.charAt(0).toUpperCase() + name.slice(1), unread: 0, msgs: [] };
      convos.unshift(c);
    }
    return c;
  }

  const api = {
    sendTo(name, text) { send(findOrCreate(name), text); },
    open() {},
  };
  OS.messagesApp = api;

  OS.registerApp('messages', {
    create(root) {
      root.classList.add('plain', 'msg-app');
      const nav = OS.ui.navStack(root);
      const list = OS.ui.page({ title: 'Mensajes', actions: `<button class="glass-btn round" data-filter aria-label="Filtros">${OS.icon('list')}</button><button class="glass-btn round" data-new aria-label="Nuevo mensaje">${OS.icon('compose')}</button>` });
      list.body.innerHTML = `<label class="search-field">${OS.icon('search')}<input placeholder="Buscar" aria-label="Buscar"></label><div class="msg-list"></div>`;
      const $list = list.body.querySelector('.msg-list');
      let q = '';

      function avatar(c, size = 50) {
        return `<span class="msg-av" style="width:${size}px;height:${size}px;background:${persona(c).color};font-size:${size * 0.4}px">${esc(initials(c.name))}</span>`;
      }

      function renderList() {
        const arr = convos.filter((c) => !q || OS.util.norm(c.name + ' ' + c.msgs.map((m) => m.text).join(' ')).includes(OS.util.norm(q)))
          .sort((a, b) => (b.msgs[b.msgs.length - 1]?.ts || 0) - (a.msgs[a.msgs.length - 1]?.ts || 0));
        $list.innerHTML = arr.map((c) => {
          const last = c.msgs[c.msgs.length - 1];
          const when = last ? (Date.now() - last.ts < 86400e3 ? fmt.time(new Date(last.ts)) : new Date(last.ts).toLocaleDateString('es-ES', { weekday: 'long' })) : '';
          return `<div class="msg-row" data-id="${c.id}">
            <span class="msg-dot ${c.unread ? 'on' : ''}"></span>${avatar(c)}
            <div class="msg-meta"><div class="msg-top"><b>${esc(c.name)}</b><time>${when} ${OS.icon('chevronRight')}</time></div>
            <p>${typing[c.id] ? '<i>Escribiendo…</i>' : esc(last ? (last.me ? 'Tú: ' : '') + last.text : '')}</p></div></div>`;
        }).join('');
      }

      list.body.querySelector('input').addEventListener('input', (e) => { q = e.target.value; renderList(); });
      $list.addEventListener('click', (e) => { const r = e.target.closest('.msg-row'); if (r) openChat(r.dataset.id); });
      list.querySelector('[data-new]').addEventListener('click', async () => {
        const name = await OS.ui.alert({ title: 'Nuevo mensaje', message: '¿A quién quieres escribir?', input: { placeholder: 'Nombre' }, buttons: [{ label: 'Cancelar', cancel: true }, { label: 'Siguiente', primary: true }], host: root });
        if (name && name.trim()) { const c = findOrCreate(name.trim()); save(); openChat(c.id); }
      });
      list.querySelector('[data-filter]').addEventListener('click', () => OS.ui.toast('Filtrando: todos los mensajes', 'list'));

      let chat = null;
      function openChat(id) {
        const c = convos.find((x) => x.id === id);
        if (!c) return;
        nav.popToRoot();
        openId = id;
        c.unread = 0;
        save();
        const p = OS.ui.page({ title: '', large: false, back: () => nav.pop(), actions: `<button class="glass-btn round" data-video aria-label="FaceTime">${OS.icon('video')}</button>` });
        p.classList.add('chat-page');
        p.querySelector('.nav-title').innerHTML = `<button class="chat-who glass">${avatar(c, 34)}<span>${esc(c.name)} ${OS.icon('chevronRight')}</span></button>`;
        p.querySelector('.nav-title').style.pointerEvents = 'auto';
        p.querySelector('.nav-title').style.top = '50px';
        p.querySelector('.nav-title').style.height = '64px';
        p.body.innerHTML = '<div class="bubbles"></div>';
        const $b = p.body.querySelector('.bubbles');
        const bar = h(`<form class="chat-bar"><button type="button" class="glass-btn round chat-plus" aria-label="Más">${OS.icon('plus')}</button>
          <label class="chat-field glass"><input placeholder="iMessage" aria-label="Mensaje"><button type="submit" class="chat-send" aria-label="Enviar">${OS.icon('arrowUp')}</button><span class="chat-mic">${OS.icon('mic')}</span></label></form>`);
        p.appendChild(bar);
        const input = bar.querySelector('input');
        const sendBtn = bar.querySelector('.chat-send');
        input.addEventListener('input', () => bar.classList.toggle('has-text', !!input.value.trim()));
        input.addEventListener('keydown', (e) => e.stopPropagation());
        bar.addEventListener('submit', (e) => {
          e.preventDefault();
          const t = input.value.trim();
          if (!t) return;
          input.value = '';
          bar.classList.remove('has-text');
          send(c, t);
          render(true);
        });
        void sendBtn;
        bar.querySelector('.chat-plus').addEventListener('click', () => {
          const content = h(`<div class="group" style="margin:0 16px 10px">${[['camera', 'Cámara'], ['photos', 'Fotos'], ['sparkles', 'Genmoji'], ['location', 'Ubicación'], ['edit', 'Dibujo (nuevo)']].map(([i, l]) => `<div class="cell tap" data-a="${l}"><span class="cell-icon" style="background:var(--fill);color:var(--tint)">${OS.icon(i)}</span><span class="cell-label">${l}</span></div>`).join('')}</div>`);
          const sh = OS.ui.sheet({ title: '', content, host: root });
          content.addEventListener('click', (e) => {
            const a = e.target.closest('[data-a]');
            if (!a) return;
            sh.close();
            const l = a.dataset.a;
            if (l === 'Ubicación') send(c, '📍 Mi ubicación: Madrid');
            else if (l === 'Genmoji') send(c, ['🦄✨', '🐱‍🚀', '🌮🎉', '🐙💜'][Math.floor(Math.random() * 4)]);
            else if (l === 'Fotos' || l === 'Cámara') send(c, '📷 Foto');
            else send(c, '🎨 Dibujo');
            render(true);
          });
        });
        p.querySelector('[data-video]').addEventListener('click', () => OS.ui.toast('FaceTime no disponible en la recreación', 'video'));

        function render(scroll = false) {
          let lastDay = '';
          $b.innerHTML = c.msgs.map((m, i) => {
            const day = new Date(m.ts).toDateString();
            const sep = day !== lastDay ? `<div class="b-day">${new Date(m.ts).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })} ${fmt.time(new Date(m.ts))}</div>` : '';
            lastDay = day;
            const next = c.msgs[i + 1];
            const tail = !next || next.me !== m.me;
            return `${sep}<div class="bubble ${m.me ? 'me' : 'them'} ${tail ? 'tail' : ''}" data-i="${i}">${esc(m.text)}${m.react ? `<span class="react">${m.react}</span>` : ''}</div>`;
          }).join('') + (typing[c.id] ? '<div class="bubble them tail typing"><span class="siri-typing"><i></i><i></i><i></i></span></div>' : '') +
            (c.msgs.length && c.msgs[c.msgs.length - 1].me ? '<div class="b-status">Entregado</div>' : '');
          if (scroll) requestAnimationFrame(() => { p.scroller.scrollTop = p.scroller.scrollHeight; });
        }
        $b.addEventListener('dblclick', (e) => {
          const b = e.target.closest('.bubble[data-i]');
          if (!b) return;
          const m = c.msgs[+b.dataset.i];
          m.react = m.react ? null : '❤️';
          save();
          render();
          OS.util.haptic(8);
        });
        p.addEventListener('popped', () => { openId = null; chat = null; renderList(); });
        chat = { id, render };
        nav.push(p);
        render(true);
        setTimeout(() => { p.scroller.scrollTop = p.scroller.scrollHeight; }, 50);
      }

      nav.push(list, false);
      renderList();
      updateBadge();
      const off = OS.bus.on('messages', () => { renderList(); if (chat) chat.render(true); });
      api.open = openChat;
      return {
        statusStyle: 'auto',
        onShow() { renderList(); if (chat) { const c = convos.find((x) => x.id === chat.id); if (c) { c.unread = 0; save(); } } },
        onHide() { },
        onDestroy() { off(); api.open = () => {}; openId = null; },
      };
    },
  });

  setTimeout(updateBadge, 0);
})();
