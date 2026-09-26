/* Música: canciones generadas en tiempo real con Web Audio, reproductor, isla y pantalla bloqueada. */
(function () {
  'use strict';

  const { h, esc, fmt, clamp, pt } = OS.util;
  const S = OS.state;

  const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const art = (a, b, c) => `radial-gradient(circle at 28% 25%, rgba(255,255,255,.45), transparent 38%), radial-gradient(circle at 80% 85%, ${c}, transparent 55%), linear-gradient(135deg, ${a}, ${b})`;

  const TRACKS = [
    { title: 'Cristal líquido', artist: 'Aurora Norte', bpm: 92, chords: ['C', 'Am', 'F', 'G'], art: art('#4facfe', '#7b5cff', '#ff5fae'), color: '#7b9cff', lead: 'sine' },
    { title: 'Veintisiete', artist: 'Los Isla', bpm: 112, chords: ['G', 'D', 'Em', 'C'], art: art('#f7971e', '#ff5f6d', '#ffd200'), color: '#ff8a5c', lead: 'triangle' },
    { title: 'Luz de septiembre', artist: 'Marea', bpm: 84, chords: ['Dm', 'Bb', 'F', 'C'], art: art('#ee9ca7', '#8e54e9', '#ffdde1'), color: '#e79bd8', lead: 'sine' },
    { title: 'Orbe', artist: 'Siri & The Echoes', bpm: 100, chords: ['Am', 'F', 'C', 'G'], art: art('#0f0c29', '#302b63', '#ff4fd8'), color: '#b06bff', lead: 'square' },
    { title: 'Dynamic', artist: 'Ísola', bpm: 122, chords: ['Em', 'C', 'G', 'D'], art: art('#11998e', '#38ef7d', '#0575e6'), color: '#3ee08f', lead: 'sawtooth' },
    { title: 'Modo avión', artist: 'Nube 9', bpm: 76, chords: ['F', 'Dm', 'Bb', 'C'], art: art('#a1c4fd', '#c2e9fb', '#667eea'), color: '#8fb8ff', lead: 'sine' },
    { title: 'Cupertino Nights', artist: 'Neón Sur', bpm: 104, chords: ['Bb', 'Gm', 'Eb', 'F'], art: art('#fc466b', '#3f5efb', '#f9d423'), color: '#ff5f9e', lead: 'triangle' },
    { title: 'Tintado', artist: 'La Translúcida', bpm: 96, chords: ['E', 'C#m', 'A', 'B'], art: art('#434343', '#000000', '#e0c3fc'), color: '#d7b8ff', lead: 'sine' },
  ];
  const BARS = 16;

  function chordNotes(name) {
    const m = /^([A-G][#b]?)(m?)$/.exec(name);
    const root = NOTE[m[1]];
    const minor = m[2] === 'm';
    return [root, root + (minor ? 3 : 4), root + 7];
  }
  const freq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  /* ======================= Motor ======================= */
  const player = {
    index: 0,
    playing: false,
    loaded: false,
    pos: 0,          // segundos dentro de la canción
    startedAt: 0,    // tiempo del AudioContext en el que pos = 0
    nextBeat: 0,
    beat: 0,
    timer: null,
    out: null,
  };

  const track = () => TRACKS[player.index];
  const beatLen = () => 60 / track().bpm;
  const length = () => BARS * 4 * beatLen();

  function currentPos() {
    if (!player.playing) return player.pos;
    const ctx = OS.audio.ctx;
    return clamp(ctx.currentTime - player.startedAt, 0, length());
  }

  function voice(type, f, t, dur, gain, attack = 0.01, dest) {
    const ctx = OS.audio.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest || player.out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function kick(t) {
    const ctx = OS.audio.ctx;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g).connect(player.out);
    o.start(t); o.stop(t + 0.3);
  }

  let noiseBuf = null;
  function hat(t, gain = 0.05) {
    const ctx = OS.audio.ctx;
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    }
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 7000;
    const g = ctx.createGain(); g.gain.value = gain;
    s.connect(f).connect(g).connect(player.out);
    s.start(t);
  }

  function scheduleBeat(b, t) {
    const tr = track();
    const bar = Math.floor(b / 4) % tr.chords.length;
    const inBar = b % 4;
    const ch = chordNotes(tr.chords[bar]);
    const bl = beatLen();
    const section = Math.floor(b / 16); // intro, estrofa, estribillo, final
    if (inBar === 0) {
      ch.forEach((n) => voice('triangle', freq(48 + n + 12), t, bl * 4, 0.035, 0.3));
    }
    if (inBar === 0 || inBar === 2) {
      voice('sine', freq(36 + ch[0]), t, bl * 1.8, 0.16, 0.01);
      if (section > 0) kick(t);
    }
    if (section > 0) { hat(t + bl / 2, 0.04); if (section === 2) hat(t + bl / 4, 0.025); }
    // Arpegio en corcheas
    const pattern = [0, 1, 2, 1];
    for (let k = 0; k < 2; k++) {
      const note = ch[pattern[(inBar * 2 + k) % 4]] + 60 + (section === 2 && k === 1 ? 12 : 0);
      voice(tr.lead, freq(note), t + (k * bl) / 2, bl * 0.45, section === 0 ? 0.03 : 0.045, 0.005);
    }
  }

  function scheduler() {
    const ctx = OS.audio.ctx;
    while (player.nextBeat < ctx.currentTime + 0.15) {
      if (player.beat >= BARS * 4) { next(true); return; }
      scheduleBeat(player.beat, player.nextBeat);
      player.nextBeat += beatLen();
      player.beat += 1;
    }
  }

  function ensureOut() {
    const ctx = OS.audio.ctx;
    if (!ctx) return false;
    if (!player.out) {
      player.out = ctx.createGain();
      const comp = ctx.createDynamicsCompressor();
      player.out.connect(comp).connect(OS.audio.master);
    }
    player.out.gain.value = S.get('volume') * 1.2;
    return true;
  }

  function play() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* no disponible */ }
    if (!ensureOut()) { OS.ui.toast('Tu navegador no admite audio web', 'speakerMute'); return; }
    const ctx = OS.audio.ctx;
    if (player.playing) return;
    player.loaded = true;
    player.playing = true;
    const bl = beatLen();
    player.beat = Math.floor(player.pos / bl);
    player.startedAt = ctx.currentTime + 0.05 - player.pos;
    player.nextBeat = player.startedAt + player.beat * bl;
    player.out.gain.cancelScheduledValues(ctx.currentTime);
    player.out.gain.setValueAtTime(S.get('volume') * 1.2, ctx.currentTime);
    clearInterval(player.timer);
    player.timer = setInterval(scheduler, 25);
    scheduler();
    changed();
  }

  function pause() {
    if (!player.playing) return;
    player.pos = currentPos();
    player.playing = false;
    clearInterval(player.timer);
    const ctx = OS.audio.ctx;
    if (player.out && ctx) {
      player.out.gain.setValueAtTime(player.out.gain.value, ctx.currentTime);
      player.out.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      // Reconecta una salida limpia para cortar las notas programadas
      const old = player.out;
      setTimeout(() => { try { old.disconnect(); } catch (e) { /* nada */ } }, 150);
      player.out = null;
    }
    changed();
  }

  function load(i, autoplay) {
    const was = player.playing || autoplay;
    if (player.playing) pause();
    player.index = (i + TRACKS.length) % TRACKS.length;
    player.pos = 0;
    player.loaded = true;
    if (was) play(); else changed();
  }
  function next(auto) { load(player.index + 1, auto || player.playing); }
  function prev() { if (currentPos() > 3) seek(0); else load(player.index - 1, player.playing); }
  function seek(sec) {
    const was = player.playing;
    if (was) pause();
    player.pos = clamp(sec, 0, length() - 0.1);
    if (was) play(); else changed();
  }

  function changed() {
    OS.bus.emit('music');
    if (player.loaded) islandOn(); else OS.island.clear('music');
  }

  S.on('volume', (v) => { if (player.out) player.out.gain.value = v * 1.2; });

  function islandOn() {
    if (!player.loaded) return;
    OS.island.set('music', {
      priority: 3,
      width: 200,
      expandedHeight: 188,
      left: () => `<span class="isl-art" style="background-image:${track().art}"></span>`,
      right: () => `<span class="isl-bars ${player.playing ? '' : 'paused'}" style="--c:${track().color}"><i></i><i></i><i></i><i></i></span>`,
      expanded: () => {
        const p = currentPos() / length();
        return `<div class="isl-row"><span class="isl-art" style="width:52px;height:52px;border-radius:12px;background-image:${track().art}"></span>
            <div style="flex:1;min-width:0"><div class="isl-title">${esc(track().title)}</div><div class="isl-sub">${esc(track().artist)}</div></div>
            <span class="isl-bars ${player.playing ? '' : 'paused'}" style="--c:${track().color}"><i></i><i></i><i></i><i></i></span></div>
          <div class="isl-row" style="font-size:11px;color:rgba(255,255,255,.6);gap:8px"><span>${fmt.duration(currentPos() * 1000)}</span><div class="isl-progress" style="flex:1"><i style="width:${p * 100}%"></i></div><span>-${fmt.duration((length() - currentPos()) * 1000)}</span></div>
          <div class="isl-row" style="justify-content:center;gap:34px"><button class="isl-btn plain" data-act="prev">${OS.icon('prev')}</button><button class="isl-btn plain" data-act="toggle">${OS.icon(player.playing ? 'pause' : 'play')}</button><button class="isl-btn plain" data-act="next">${OS.icon('next')}</button></div>`;
      },
      onAction(a) { control(a); },
    });
  }

  function control(cmd) {
    if (cmd === 'toggle') { if (player.playing) pause(); else play(); }
    else if (cmd === 'play') play();
    else if (cmd === 'pause') pause();
    else if (cmd === 'next') next();
    else if (cmd === 'prev') prev();
  }

  // Actualiza la isla ampliada y el avance cada segundo
  OS.bus.on('tick', () => {
    if (!player.playing) return;
    OS.island.update('music');
    OS.bus.emit('music:tick');
  });

  OS.music = {
    control,
    play() { if (!player.loaded) load(0, true); else play(); },
    pause,
    count: () => TRACKS.length,
    info() { if (!player.loaded) return null; const t = track(); return { title: t.title, artist: t.artist, art: t.art, playing: player.playing }; },
    lockPlayerHTML() {
      if (!player.loaded) return '';
      const t = track();
      return `<div class="lock-player glass">
        <div class="lp-top"><span class="lp-art" style="background-image:${t.art}"></span><div class="lp-meta"><b>${esc(t.title)}</b><span>${esc(t.artist)}</span></div><span class="isl-bars ${player.playing ? '' : 'paused'}" style="--c:${t.color}"><i></i><i></i><i></i><i></i></span></div>
        <div class="lp-bar"><i style="width:${(currentPos() / length()) * 100}%"></i></div>
        <div class="lp-ctrl"><button data-mctrl="prev" aria-label="Anterior">${OS.icon('prev')}</button><button data-mctrl="toggle" aria-label="Reproducir o pausar">${OS.icon(player.playing ? 'pause' : 'play')}</button><button data-mctrl="next" aria-label="Siguiente">${OS.icon('next')}</button></div></div>`;
    },
  };

  /* ======================= App ======================= */
  OS.registerApp('music', {
    create(root) {
      root.classList.add('plain', 'music-app');
      let tab = 'library';
      root.innerHTML = `<div class="mu-view"></div>
        <div class="mu-mini glass refract"><span class="mu-mini-art"></span><div class="mu-mini-meta"><b></b><span></span></div><button data-m="toggle" aria-label="Reproducir"></button><button data-m="next" aria-label="Siguiente">${OS.icon('next')}</button></div>`;
      const view = root.querySelector('.mu-view');
      const mini = root.querySelector('.mu-mini');
      const tabs = OS.ui.tabbar([{ id: 'home', icon: 'house', label: 'Inicio' }, { id: 'new', icon: 'grid', label: 'Novedades' }, { id: 'radio', icon: 'waveform', label: 'Radio' }, { id: 'library', icon: 'note', label: 'Biblioteca' }], tab, (id) => { tab = id; render(); }, { search: true });
      root.appendChild(tabs);
      const sb = h(`<button class="tab-search glass" aria-label="Buscar">${OS.icon('search')}</button>`);
      root.appendChild(sb);
      sb.addEventListener('click', () => OS.siri.open('Reproduce música'));

      function songRow(t, i) {
        const on = player.loaded && player.index === i;
        return `<div class="mu-song ${on ? 'on' : ''}" data-i="${i}"><span class="mu-art" style="background-image:${t.art}">${on ? `<span class="isl-bars ${player.playing ? '' : 'paused'}" style="--c:#fff"><i></i><i></i><i></i><i></i></span>` : ''}</span><div><b>${esc(t.title)}</b><span>${esc(t.artist)}</span></div><button class="mu-more" aria-label="Más">${OS.icon('ellipsis')}</button></div>`;
      }

      function render() {
        if (tab === 'library') {
          view.innerHTML = `<div class="page-scroll"><h1 class="large-title">Biblioteca</h1>
            <div class="mu-cats">${[['list', 'Playlists'], ['person', 'Artistas'], ['grid', 'Álbumes'], ['note', 'Canciones']].map(([i, l]) => `<div class="mu-cat">${OS.icon(i)}<span>${l}</span>${OS.icon('chevronRight')}</div>`).join('')}</div>
            <h2 class="mu-h2">Canciones</h2>
            <div class="mu-actions"><button class="btn gray" data-all="play">${OS.icon('play')} Reproducir</button><button class="btn gray" data-all="shuffle">${OS.icon('rotate')} Aleatorio</button></div>
            <div class="mu-songs">${TRACKS.map(songRow).join('')}</div></div>`;
        } else {
          const title = { home: 'Inicio', new: 'Novedades', radio: 'Radio' }[tab];
          view.innerHTML = `<div class="page-scroll"><h1 class="large-title">${title}</h1>
            <h2 class="mu-h2">${tab === 'radio' ? 'Emisoras' : 'Escuchado recientemente'}</h2>
            <div class="mu-cards">${TRACKS.slice(tab === 'new' ? 4 : 0).concat(TRACKS.slice(0, tab === 'new' ? 4 : 0)).map((t) => `<button class="mu-card" data-i="${TRACKS.indexOf(t)}"><span class="mu-card-art" style="background-image:${t.art}"></span><b>${esc(tab === 'radio' ? t.artist + ' Radio' : t.title)}</b><span>${esc(t.artist)}</span></button>`).join('')}</div>
            <h2 class="mu-h2">Hecho para ti</h2>
            <div class="mu-cards">${['Mix favoritos', 'Mix descubrimiento', 'Mix relax', 'Mix iOS 27'].map((n, i) => `<button class="mu-card" data-i="${(i * 3) % TRACKS.length}"><span class="mu-card-art" style="background-image:${TRACKS[(i * 3 + 1) % TRACKS.length].art}"><em>${n}</em></span><b>${n}</b><span>Actualizado hoy</span></button>`).join('')}</div></div>`;
        }
        renderMini();
      }

      function renderMini() {
        mini.classList.toggle('show', player.loaded);
        if (!player.loaded) return;
        const t = track();
        mini.querySelector('.mu-mini-art').style.backgroundImage = t.art;
        mini.querySelector('b').textContent = t.title;
        mini.querySelector('.mu-mini-meta span').textContent = t.artist;
        mini.querySelector('[data-m="toggle"]').innerHTML = OS.icon(player.playing ? 'pause' : 'play');
      }

      view.addEventListener('click', (e) => {
        const s = e.target.closest('[data-i]');
        const all = e.target.closest('[data-all]');
        if (all) { load(all.dataset.all === 'shuffle' ? Math.floor(Math.random() * TRACKS.length) : 0, true); return; }
        if (e.target.closest('.mu-more')) { OS.ui.toast('Añadida a «Favoritas»', 'heart'); return; }
        if (s) {
          const i = +s.dataset.i;
          if (player.loaded && player.index === i) { if (!player.playing) play(); openNowPlaying(); }
          else load(i, true);
        }
      });
      mini.addEventListener('click', (e) => {
        const b = e.target.closest('[data-m]');
        if (b) { e.stopPropagation(); control(b.dataset.m); return; }
        openNowPlaying();
      });

      /* ---------- Ahora suena ---------- */
      function openNowPlaying() {
        const np = h(`<div class="np">
          <div class="np-bg"></div>
          <div class="np-grab"></div>
          <div class="np-art"></div>
          <div class="np-meta"><div><b></b><span></span></div><button class="glass-btn round glass-clear" data-fav>${OS.icon('star')}</button></div>
          <div class="np-seek"><div class="np-track"><i></i></div><div class="np-times"><span class="a"></span><span class="b"></span></div></div>
          <div class="np-ctrl"><button data-m="prev">${OS.icon('prev')}</button><button data-m="toggle" class="big"></button><button data-m="next">${OS.icon('next')}</button></div>
          <div class="np-vol">${OS.icon('speakerLow')}<div class="np-vtrack"><i></i></div>${OS.icon('speaker')}</div>
          <div class="np-foot"><button>${OS.icon('note')}</button><button>${OS.icon('mirror')}</button><button>${OS.icon('list')}</button></div>
        </div>`);
        root.appendChild(np);
        requestAnimationFrame(() => np.classList.add('show'));
        const upd = () => {
          const t = track();
          np.querySelector('.np-bg').style.backgroundImage = t.art;
          np.querySelector('.np-art').style.backgroundImage = t.art;
          np.querySelector('.np-art').classList.toggle('paused', !player.playing);
          np.querySelector('.np-meta b').textContent = t.title;
          np.querySelector('.np-meta span').textContent = t.artist;
          np.querySelector('[data-m="toggle"]').innerHTML = OS.icon(player.playing ? 'pause' : 'play');
          const cp = currentPos();
          np.querySelector('.np-track i').style.width = (cp / length()) * 100 + '%';
          np.querySelector('.np-times .a').textContent = fmt.duration(cp * 1000);
          np.querySelector('.np-times .b').textContent = '-' + fmt.duration((length() - cp) * 1000);
          np.querySelector('.np-vtrack i').style.width = S.get('volume') * 100 + '%';
        };
        upd();
        const o1 = OS.bus.on('music', upd), o2 = OS.bus.on('music:tick', upd), o3 = S.on('volume', upd);
        const close = () => { np.classList.remove('show'); o1(); o2(); o3(); setTimeout(() => np.remove(), 450); };
        np.querySelector('.np-grab').addEventListener('click', close);
        np.addEventListener('click', (e) => {
          const b = e.target.closest('[data-m]');
          if (b) control(b.dataset.m);
          if (e.target.closest('[data-fav]')) OS.ui.toast('Añadida a favoritas', 'star');
        });
        const bindTrack = (el, onV) => el.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          const r = OS.util.rectIn(el);
          const set = (ev) => onV(clamp((pt(ev).x - r.x) / r.w, 0, 1));
          set(e);
          el.setPointerCapture(e.pointerId);
          el.onpointermove = set;
          el.onpointerup = () => { el.onpointermove = null; };
        });
        bindTrack(np.querySelector('.np-track'), (v) => seek(v * length()));
        bindTrack(np.querySelector('.np-vtrack'), (v) => S.set('volume', Math.round(v * 100) / 100));
        // Deslizar hacia abajo para cerrar
        np.addEventListener('pointerdown', (e) => {
          if (e.target.closest('button, .np-track, .np-vtrack')) return;
          const y0 = pt(e).y;
          let dy = 0;
          np.setPointerCapture(e.pointerId);
          np.style.transition = 'none';
          const mv = (ev) => { dy = Math.max(0, pt(ev).y - y0); np.style.transform = `translateY(${dy}px)`; };
          const up = () => {
            np.removeEventListener('pointermove', mv);
            np.removeEventListener('pointerup', up);
            np.style.transition = '';
            np.style.transform = '';
            if (dy > 120) close();
          };
          np.addEventListener('pointermove', mv);
          np.addEventListener('pointerup', up);
        });
      }

      render();
      const off = OS.bus.on('music', () => { if (tab === 'library') { const sc = view.querySelector('.page-scroll'); const top = sc ? sc.scrollTop : 0; render(); const sc2 = view.querySelector('.page-scroll'); if (sc2) sc2.scrollTop = top; } else renderMini(); });
      return { statusStyle: 'auto', onDestroy() { off(); } };
    },
  });
})();
