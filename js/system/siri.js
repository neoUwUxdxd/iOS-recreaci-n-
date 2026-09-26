/* Siri AI (iOS 27): orbe en la Dynamic Island, panel conversacional y motor de intenciones local. */
(function () {
  'use strict';

  const { h, esc, fmt, calc, wait } = OS.util;
  const S = OS.state;

  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/[¿?¡!;]+/g, ' ')
    .replace(/[.,](?!\d)|(?<!\d)[.,]/g, ' ')
    .replace(/\s+/g, ' ').trim();

  const APP_ALIASES = {
    ajustes: 'settings', configuracion: 'settings', preferencias: 'settings',
    calculadora: 'calculator', reloj: 'clock', alarma: 'clock', alarmas: 'clock', cronometro: 'clock', temporizador: 'clock',
    calendario: 'calendar', agenda: 'calendar', notas: 'notes', nota: 'notes', recordatorios: 'reminders',
    tiempo: 'weather', clima: 'weather', fotos: 'photos', galeria: 'photos', camara: 'camera',
    mensajes: 'messages', whatsapp: 'messages', telefono: 'phone', llamadas: 'phone', safari: 'safari', navegador: 'safari', internet: 'safari',
    musica: 'music', mapas: 'maps', mapa: 'maps', siri: 'siri', correo: 'mail', email: 'mail', mail: 'mail', archivos: 'files',
    salud: 'health', cartera: 'wallet', podcasts: 'podcasts', casa: 'home', libros: 'books', fitness: 'fitness', traducir: 'translate', traductor: 'translate',
  };

  const JOKES = [
    '¿Qué le dice un bit a otro? Nos vemos en el bus.',
    '¿Por qué el libro de matemáticas estaba triste? Porque tenía demasiados problemas.',
    'Le pregunté a mi batería cómo estaba y me dijo: «al 100 %… de ganas de cargarme».',
    '¿Cuál es el colmo de un iPhone? Que le pidan que sea más Android… y no tenga Siri para quejarse.',
  ];

  const NUM_WORDS = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, quince: 15, veinte: 20, treinta: 30, media: 0.5 };
  const wordsToNum = (s) => s.replace(/\b(un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|quince|veinte|treinta)\b/g, (m) => NUM_WORDS[m]);

  function findApp(word) {
    const w = norm(word).replace(/^(la |el |app |aplicacion )+/, '').replace(/^de /, '').split(' ')[0];
    if (APP_ALIASES[w]) return APP_ALIASES[w];
    const hit = OS.appList.find((a) => norm(a.name) === w || norm(a.name).startsWith(w));
    return hit ? hit.id : null;
  }

  /** Motor de intenciones. Devuelve { text, card, chips, run } */
  function understand(raw) {
    const q = norm(raw);
    const qn = wordsToNum(q);
    const r = (text, extra = {}) => ({ text, ...extra });

    if (!q) return r('¿Sí? Te escucho.');

    if (/^(hola|buenas|hey|buenos dias|buenas tardes|buenas noches|oye siri|ey)\b/.test(q) && q.split(' ').length <= 4) {
      const hr = new Date().getHours();
      const sal = hr < 13 ? 'Buenos días' : hr < 20 ? 'Buenas tardes' : 'Buenas noches';
      return r(`${sal}, ${S.get('userName').split(' ')[0]}. ¿En qué puedo ayudarte?`, { chips: ['¿Qué tiempo hace?', 'Pon un temporizador de 5 minutos', 'Novedades de iOS 27'] });
    }
    if (/\b(gracias|muchas gracias)\b/.test(q)) return r('¡De nada! Aquí estoy para lo que necesites.');
    if (/(quien eres|que eres|como te llamas|que puedes hacer|ayuda)/.test(q)) {
      return r('Soy Siri, tu asistente personal. En esta recreación de iOS 27 puedo abrir apps, cambiar ajustes, poner temporizadores y alarmas, crear notas y recordatorios, enviar mensajes, hacer cálculos, controlar la música y mucho más.', { chips: ['Activa el modo oscuro', 'Crea una nota: comprar pan', 'Cuánto es 15 por 23'] });
    }
    if (/(novedades|que hay de nuevo|que trae|nuevo en) .*ios|ios 27/.test(q)) {
      return r('iOS 27 trae un Siri renovado con app propia y conversación natural, Liquid Glass con translucidez ajustable, reloj compacto en la pantalla bloqueada, Extender y Reencuadrar en Fotos, controles de cámara personalizables sobre el visor y más controles parentales.', {
        card: `<div class="chips">${['Siri AI', 'Liquid Glass ajustable', 'Reloj compacto', 'Extender en Fotos', 'Cámara personalizable'].map((c) => `<span class="siri-chip">${c}</span>`).join('')}</div>`,
      });
    }
    if (/(que hora es|la hora|dime la hora)/.test(q)) {
      const t = fmt.time();
      return r(`Son las ${t}.`, { card: `<div class="big">${t}</div>` });
    }
    if (/(que dia es|que fecha|fecha de hoy|dia es hoy)/.test(q)) {
      const d = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      return r(`Hoy es ${d}.`);
    }
    if (/(tiempo|clima|temperatura|llover|lluvia|calor|frio)/.test(q) && !/temporizador/.test(q)) {
      const w = OS.weatherNow ? OS.weatherNow() : { city: 'Madrid', temp: 22, cond: 'Soleado', hi: 26, lo: 14, icon: 'sun' };
      const rain = /llover|lluvia/.test(q);
      const text = rain
        ? `${w.rainChance > 40 ? 'Es probable que llueva' : 'No parece que vaya a llover'} hoy en ${w.city}: ${w.rainChance || 0} % de probabilidad.`
        : `Ahora hace ${w.temp}° en ${w.city} y está ${w.cond.toLowerCase()}. Máxima de ${w.hi}° y mínima de ${w.lo}°.`;
      return r(text, {
        card: `<div style="display:flex;align-items:center;gap:14px"><div style="font-size:38px;color:#ffd60a">${OS.icon(w.icon)}</div><div><div class="big">${w.temp}°</div><div style="opacity:.7;font-size:14px">${esc(w.city)} · ${esc(w.cond)}</div></div></div>`,
        run: null,
        app: 'weather',
      });
    }

    // Temporizador
    let m = /(temporizador|timer|cuenta atras|avisame en|avisame dentro de)\D*(\d+(?:[.,]\d+)?)\s*(segundos?|seg|minutos?|min|horas?|h)\b/.exec(qn) || /(\d+(?:[.,]\d+)?)\s*(segundos?|minutos?|horas?)\s*de temporizador/.exec(qn);
    if (m) {
      const n = parseFloat((m[2] && !/^(seg|min|h)/.test(m[2]) ? m[2] : m[1]).replace(',', '.'));
      const unit = m[3] || m[2];
      const ms = n * (/^h/.test(unit) ? 3600000 : /^min/.test(unit) ? 60000 : 1000);
      return r(`Vale, temporizador de ${fmt.duration(ms)} en marcha.`, { run: () => OS.timer.start(ms), card: `<div class="big" style="color:#ff9f0a">${fmt.duration(ms)}</div>` });
    }
    if (/(cancela|para|deten|quita) (el )?temporizador/.test(q)) return r('He cancelado el temporizador.', { run: () => OS.timer.cancel() });

    // Alarma
    m = /(alarma|despiertame|despertador)\D*(\d{1,2})(?:[:.h ](\d{2}))?\s*(de la manana|de la tarde|de la noche|am|pm)?/.exec(qn);
    if (m) {
      let hh = +m[2];
      const mm = m[3] ? +m[3] : 0;
      if (/tarde|noche|pm/.test(m[4] || '') && hh < 12) hh += 12;
      const label = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      return r(`Alarma puesta para las ${label}.`, { run: () => OS.clockApp && OS.clockApp.addAlarm(hh, mm), card: `<div class="big">${label}</div>` });
    }

    // Ajustes rápidos
    m = /(activa|enciende|pon|conecta|desactiva|apaga|quita|desconecta)\s+(el |la |los |las )?(wi ?fi|wifi|bluetooth|modo avion|modo oscuro|modo claro|linterna|no molestar|modo concentracion|concentracion|bajo consumo|modo de bajo consumo|datos( moviles)?|modo silencio|silencio)/.exec(q);
    if (m) {
      const on = !/^(desactiva|apaga|quita|desconecta)/.test(m[1]);
      const what = m[3];
      const map = [
        [/wi ?fi/, 'wifi', 'el Wi‑Fi'], [/bluetooth/, 'bluetooth', 'el Bluetooth'], [/avion/, 'airplane', 'el modo avión'],
        [/no molestar|concentracion/, 'focus', 'No molestar'], [/bajo consumo/, 'lowPower', 'el modo de bajo consumo'], [/datos/, 'cellular', 'los datos móviles'],
        [/silencio/, 'silent', 'el modo silencio'],
      ];
      if (/modo oscuro|modo claro/.test(what)) {
        const dark = /oscuro/.test(what) ? on : !on;
        return r(`Listo, he ${on ? 'activado' : 'desactivado'} el ${/oscuro/.test(what) ? 'modo oscuro' : 'modo claro'}.`, { run: () => S.set('theme', dark ? 'dark' : 'light') });
      }
      if (/linterna/.test(what)) return r(on ? 'Linterna encendida.' : 'Linterna apagada.', { run: () => OS.system.torch(on) });
      const hit = map.find(([re]) => re.test(what));
      if (hit) return r(`He ${on ? 'activado' : 'desactivado'} ${hit[2]}.`, { run: () => S.set(hit[1], on) });
    }
    m = /(sube|aumenta|baja|reduce|disminuye)\s+(el |la )?(brillo|volumen)/.exec(q);
    if (m) {
      const up = /(sube|aumenta)/.test(m[1]);
      const key = m[3] === 'brillo' ? 'brightness' : 'volume';
      return r(`${m[3] === 'brillo' ? 'Brillo' : 'Volumen'} ${up ? 'subido' : 'bajado'}.`, { run: () => { S.set(key, Math.max(0, Math.min(1, S.get(key) + (up ? 0.25 : -0.25)))); if (key === 'volume') OS.hardware.showVolume(); } });
    }
    if (/(cambia|pon otro|siguiente) (el )?fondo/.test(q)) {
      const L = OS.wallpapers.list;
      const i = L.findIndex((w) => w.id === S.get('wallpaper'));
      const next = L[(i + 1) % L.length];
      return r(`He cambiado el fondo de pantalla a «${next.name}».`, { run: () => S.set('wallpaper', next.id) });
    }
    if (/(bloquea|bloquear) (el )?(iphone|telefono|movil|pantalla)/.test(q)) return r('Bloqueando el iPhone.', { run: () => setTimeout(() => OS.hardware.powerOff(), 600) });

    // Música
    if (/(pausa|para|deten|detén) (la )?(musica|cancion|reproduccion)/.test(q)) return r('Música en pausa.', { run: () => OS.music && OS.music.pause() });
    if (/(siguiente cancion|salta (la )?cancion|pasa de cancion|otra cancion)/.test(q)) return r('Siguiente canción.', { run: () => OS.music && OS.music.control('next') });
    if (/(reproduce|pon|escuchar|play|quiero oir).*(musica|cancion|algo|canciones)/.test(q) || /^(reproduce|pon musica)/.test(q)) {
      return r('Reproduciendo tu música.', { run: () => OS.music && OS.music.play() });
    }

    // Notas, recordatorios, mensajes
    m = /(crea|anota|apunta|toma|nueva|haz)\s+(una )?nota( que diga| diciendo)?:?\s*(.*)/.exec(q);
    if (m) {
      const body = raw.replace(/^.*?nota(\s+que diga|\s+diciendo)?:?\s*/i, '').trim() || 'Nota nueva';
      return r(`He creado una nota: «${body}».`, { run: () => OS.notesApp && OS.notesApp.create(body), app: 'notes' });
    }
    m = /(recuerdame|recordatorio( de| para)?|anade a recordatorios)\s+(.*)/.exec(q);
    if (m) {
      const body = raw.replace(/^.*?(recuérdame|recuerdame|recordatorio( de| para)?|añade a recordatorios)\s*/i, '').trim();
      return r(`Te lo recordaré: «${body}».`, { run: () => OS.remindersApp && OS.remindersApp.add(body), app: 'reminders' });
    }
    m = /(envia|manda|escribe)\s+(un )?(mensaje|whatsapp|sms) a (\w+)\s*(diciendo|que diga|:)?\s*(.*)/.exec(q);
    if (m) {
      const who = m[4];
      const body = raw.replace(/^.*?\b(diciendo|que diga|:)\s*/i, '').trim();
      const text = m[5] ? body : (m[6] || 'Hola 👋');
      return r(`Mensaje enviado a ${who.charAt(0).toUpperCase() + who.slice(1)}: «${text}».`, { run: () => OS.messagesApp && OS.messagesApp.sendTo(who, text), app: 'messages' });
    }
    m = /llama(r)? a (\w+)/.exec(q);
    if (m) return r(`Llamando a ${m[2].charAt(0).toUpperCase() + m[2].slice(1)}…`, { run: () => { OS.windows.open('phone'); setTimeout(() => OS.phoneApp && OS.phoneApp.call(m[2]), 450); } });

    // Abrir apps
    m = /(abre|abrir|lanza|inicia|muestra|ve a|ir a|quiero ver)\s+(la |el |mis |app |aplicacion )*(de )?(.+)/.exec(q);
    if (m) {
      const id = findApp(m[4]);
      if (id) return r(`Abriendo ${OS.appDefs[id].name}.`, { run: () => { OS.siri.close(); setTimeout(() => OS.windows.open(id), 250); } });
    }

    // Cálculos
    let expr = qn.replace(/^(cuanto es|cuanto son|calcula|cual es el resultado de|resuelve)\s+/, '');
    expr = expr.replace(/\bmas\b/g, '+').replace(/\bmenos\b/g, '-').replace(/\b(por|multiplicado por|x)\b/g, '*').replace(/\b(entre|dividido entre|dividido por)\b/g, '/').replace(/\belevado a\b/g, '^').replace(/\bpor ciento\b/g, '%');
    m = /(raiz cuadrada de)\s*([\d.,]+)/.exec(q);
    if (m) {
      const v = Math.sqrt(parseFloat(m[2].replace(',', '.')));
      return r(`La raíz cuadrada es ${fmt.number(v, 6)}.`, { card: `<div class="big">${fmt.number(v, 6)}</div>` });
    }
    if (/^[\d\s+\-*/^%().,]+$/.test(expr) && /\d/.test(expr) && /[+\-*/^%]/.test(expr)) {
      try {
        const v = calc(expr);
        return r(`${expr.replace(/\*/g, '×').replace(/\//g, '÷').replace(/\./g, ',')} = ${fmt.number(v)}`, { card: `<div class="big">${fmt.number(v)}</div>` });
      } catch (e) { /* sigue */ }
    }

    if (/(chiste|hazme reir|algo gracioso)/.test(q)) return r(JOKES[Math.floor(Math.random() * JOKES.length)]);
    if (/(te quiero|eres la mejor|eres genial)/.test(q)) return r('¡Qué amable! Yo también disfruto mucho ayudándote. 💜');
    if (/(cara o cruz|lanza una moneda)/.test(q)) return r(`Ha salido… ¡${Math.random() < 0.5 ? 'cara' : 'cruz'}!`);
    if (/(tira|lanza) (un )?dado/.test(q)) return r(`Ha salido un ${1 + Math.floor(Math.random() * 6)}.`);
    if (/(bateria|carga)/.test(q)) {
      const b = S.get('battery');
      return r(`Tienes un ${Math.round(b.level * 100)} % de batería${b.charging ? ' y se está cargando' : ''}.`);
    }

    m = /(busca|buscar|que es|quien es|quien fue|informacion sobre)\s+(en internet |en la web |en google )?(.+)/.exec(q);
    if (m) {
      const term = m[3];
      return r(`Esto es lo que he encontrado en la web sobre «${term}».`, {
        run: () => { OS.siri.close(); setTimeout(() => { OS.windows.open('safari'); setTimeout(() => OS.safari && OS.safari.go(term), 450); }, 250); },
      });
    }

    return r('No estoy segura de cómo ayudarte con eso todavía. ¿Quieres que lo busque en la web?', { chips: [`Busca ${raw}`, '¿Qué puedes hacer?'] });
  }

  /* ---------- Voz ---------- */
  function speak(text) {
    if (!S.get('siriVoice') || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[«»“”]/g, ''));
      u.lang = 'es-ES';
      u.rate = 1.05;
      u.volume = S.get('volume');
      const v = window.speechSynthesis.getVoices().find((x) => /^es(-|_)/i.test(x.lang));
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
    } catch (e) { /* sin síntesis */ }
  }

  function listen(onText, onEnd) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { OS.ui.toast('El dictado no está disponible en este navegador', 'mic', 2400); onEnd && onEnd(); return null; }
    const rec = new SR();
    rec.lang = 'es-ES';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const res = e.results[e.results.length - 1];
      onText(res[0].transcript, res.isFinal);
    };
    rec.onend = () => onEnd && onEnd();
    rec.onerror = () => onEnd && onEnd();
    try { rec.start(); } catch (e) { onEnd && onEnd(); return null; }
    return rec;
  }

  /** Ejecuta una consulta y devuelve la respuesta (compartido con la app Siri). */
  async function ask(text) {
    await wait(450 + Math.random() * 350);
    const res = understand(text);
    if (res.run) { try { res.run(); } catch (e) { console.error(e); } }
    return res;
  }

  /* ---------- Superposición ---------- */
  const layer = document.getElementById('siri-layer');
  layer.innerHTML = `
    <div class="siri-scrim"></div>
    <div class="siri-halo"></div>
    <div class="siri-panel">
      <div class="siri-convo"></div>
      <form class="siri-input glass refract" autocomplete="off">
        <span class="mini-orb"><span class="siri-orb"><i></i><i></i><i></i></span></span>
        <input type="text" placeholder="Pregunta a Siri" aria-label="Pregunta a Siri">
        <button type="button" class="s-btn mic" aria-label="Dictar">${OS.icon('mic')}</button>
        <button type="submit" class="s-btn send" aria-label="Enviar">${OS.icon('arrowUp')}</button>
      </form>
    </div>`;
  const convo = layer.querySelector('.siri-convo');
  const form = layer.querySelector('form');
  const input = form.querySelector('input');
  const micBtn = form.querySelector('.mic');
  let rec = null;

  function addQ(text) {
    convo.appendChild(h(`<div class="siri-q">${esc(text)}</div>`));
    convo.scrollTop = convo.scrollHeight;
  }

  function cardHTML(res) {
    return `<div class="siri-card glass"><div class="src">${OS.icon('sparkles')} Siri</div><div>${esc(res.text)}</div>${res.card ? `<div class="rich">${res.card}</div>` : ''}${res.chips ? `<div class="chips">${res.chips.map((c) => `<button type="button" class="siri-chip" data-chip="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}</div>`;
  }

  async function submit(text) {
    text = text.trim();
    if (!text) return;
    input.value = '';
    addQ(text);
    const thinking = h(`<div class="siri-card glass"><span class="siri-typing"><i></i><i></i><i></i></span></div>`);
    convo.appendChild(thinking);
    convo.scrollTop = convo.scrollHeight;
    layer.classList.add('thinking');
    const res = await ask(text);
    layer.classList.remove('thinking');
    thinking.replaceWith(h(cardHTML(res)));
    convo.scrollTop = convo.scrollHeight;
    speak(res.text);
    OS.bus.emit('siri:answer', { q: text, a: res.text });
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); submit(input.value); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape') api.close(); e.stopPropagation(); });
  convo.addEventListener('click', (e) => {
    const c = e.target.closest('[data-chip]');
    if (c) submit(c.dataset.chip);
  });
  micBtn.addEventListener('click', () => {
    if (rec) { rec.stop(); return; }
    micBtn.classList.add('listening');
    input.placeholder = 'Escuchando…';
    rec = listen((t, fin) => { input.value = t; if (fin) submit(t); }, () => {
      rec = null;
      micBtn.classList.remove('listening');
      input.placeholder = 'Pregunta a Siri';
    });
  });
  layer.querySelector('.siri-scrim').addEventListener('click', () => api.close());

  const api = {
    open(query) {
      if (!S.get('siriEnabled')) { OS.ui.toast('Siri está desactivada en Ajustes', 'sparkles'); return; }
      if (OS.cc && OS.cc.isOpen) OS.cc.close(true);
      if (OS.spotlight && OS.spotlight.isOpen) OS.spotlight.close();
      if (!OS.sys.siriOpen) {
        convo.innerHTML = '';
        OS.audio.siri();
      }
      OS.sys.siriOpen = true;
      layer.classList.add('open');
      layer.setAttribute('aria-hidden', 'false');
      OS.island.siri(true);
      OS.chrome.update();
      if (query) setTimeout(() => submit(query), 350);
      else setTimeout(() => input.focus({ preventScroll: true }), 380);
    },
    close() {
      if (!OS.sys.siriOpen) return;
      OS.sys.siriOpen = false;
      if (rec) { try { rec.stop(); } catch (e) { /* nada */ } }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      layer.classList.remove('open', 'thinking');
      layer.setAttribute('aria-hidden', 'true');
      input.blur();
      OS.island.siri(false);
      OS.audio.siriEnd();
      OS.chrome.update();
    },
    toggle() { if (OS.sys.siriOpen) api.close(); else api.open(); },
    get isOpen() { return !!OS.sys.siriOpen; },
  };

  OS.siri = api;
  OS.siriBrain = { understand, ask, speak, listen, cardHTML };
})();
