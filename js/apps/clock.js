/* Reloj: hora mundial, alarmas, cronómetro y temporizador (con Actividad en vivo en la isla). */
(function () {
  'use strict';

  const { h, esc, fmt, store, uid } = OS.util;
  const S = OS.state;

  /* ======================= Servicio de temporizador ======================= */
  const timer = {
    running: false,
    paused: false,
    total: 0,
    endAt: 0,
    left: 0,
    remaining() {
      if (!this.running) return 0;
      return this.paused ? this.left : Math.max(0, this.endAt - Date.now());
    },
    start(ms) {
      this.running = true; this.paused = false; this.total = ms; this.endAt = Date.now() + ms; this.left = ms;
      islandOn();
      OS.bus.emit('timer');
    },
    pause() { if (!this.running || this.paused) return; this.left = this.remaining(); this.paused = true; OS.bus.emit('timer'); OS.island.update('timer'); },
    resume() { if (!this.running || !this.paused) return; this.endAt = Date.now() + this.left; this.paused = false; OS.bus.emit('timer'); OS.island.update('timer'); },
    toggle() { if (this.paused) this.resume(); else this.pause(); },
    cancel() { this.running = false; this.paused = false; OS.island.clear('timer'); OS.bus.emit('timer'); },
  };

  function ringSVG(p, size = 22, color = '#ff9f0a', stroke = 3) {
    const r = size / 2 - stroke, c = 2 * Math.PI * r;
    return `<svg class="isl-ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="transform:rotate(-90deg)"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,159,10,.3)" stroke-width="${stroke}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c * p} ${c}"/></svg>`;
  }

  function islandOn() {
    OS.island.set('timer', {
      priority: 5,
      width: 190,
      expandedHeight: 150,
      left: () => `<span class="isl-timer" style="font-size:18px">${OS.icon('timer')}</span>`,
      right: () => `<span class="isl-timer">${fmt.duration(timer.remaining() + 999)}</span>`,
      expanded: () => `<div class="isl-row" style="margin-top:8px">
          <button class="isl-btn orange" data-act="toggle">${OS.icon(timer.paused ? 'play' : 'pause')}</button>
          <button class="isl-btn" data-act="cancel">${OS.icon('close')}</button>
          <div style="margin-left:auto;text-align:right"><div class="isl-sub">Temporizador</div><div class="isl-big" style="font-size:44px">${fmt.duration(timer.remaining() + 999)}</div></div>
        </div>`,
      onAction(a) { if (a === 'toggle') timer.toggle(); if (a === 'cancel') timer.cancel(); },
      onTap: null,
    });
  }

  function timerDone() {
    timer.running = false;
    OS.island.clear('timer');
    OS.bus.emit('timer');
    OS.audio.alarm(3);
    OS.util.haptic([200, 100, 200]);
    OS.island.flash({ icon: 'timer', color: '#ff9f0a', title: 'Temporizador', sub: '¡Tiempo!', right: '<span class="isl-btn orange" style="width:40px;height:40px">' + OS.icon('close') + '</span>' }, 4500);
    OS.notify({ app: 'clock', title: 'Temporizador', body: 'El temporizador ha terminado.', banner: false });
    if (S.get('locked') && !S.get('screenOn')) OS.hardware.wake(true);
  }

  /* ======================= Alarmas ======================= */
  let alarms = store.get('alarms', [
    { id: uid(), h: 7, m: 30, label: 'Despertador', on: true },
    { id: uid(), h: 8, m: 15, label: 'Gimnasio', on: false },
  ]);
  const saveAlarms = () => { store.set('alarms', alarms); OS.bus.emit('alarms'); };
  let lastFire = '';

  OS.bus.on('tick', (now) => {
    if (timer.running && !timer.paused) {
      if (timer.remaining() <= 0) timerDone();
      else OS.island.update('timer');
    }
    const key = `${now.getHours()}:${now.getMinutes()}`;
    if (now.getSeconds() === 0 && key !== lastFire) {
      alarms.filter((a) => a.on && a.h === now.getHours() && a.m === now.getMinutes()).forEach((a) => {
        lastFire = key;
        OS.audio.alarm(5);
        OS.island.flash({ icon: 'alarm', color: '#ff9f0a', title: a.label || 'Alarma', sub: fmt.time(now) }, 6000);
        OS.notify({ app: 'clock', title: 'Alarma', body: `${a.label || 'Alarma'} · ${fmt.time(now)}`, banner: false });
        if (!S.get('screenOn')) OS.hardware.wake(true);
      });
    }
  });

  /* ======================= Hora mundial ======================= */
  const CITY_POOL = [
    ['Madrid', 'Europe/Madrid'], ['Ciudad de México', 'America/Mexico_City'], ['Buenos Aires', 'America/Argentina/Buenos_Aires'],
    ['Nueva York', 'America/New_York'], ['Tokio', 'Asia/Tokyo'], ['Londres', 'Europe/London'], ['Bogotá', 'America/Bogota'],
    ['Santiago', 'America/Santiago'], ['Lima', 'America/Lima'], ['Cupertino', 'America/Los_Angeles'], ['Sídney', 'Australia/Sydney'],
    ['París', 'Europe/Paris'], ['Dubái', 'Asia/Dubai'], ['Pekín', 'Asia/Shanghai'], ['Caracas', 'America/Caracas'], ['Montevideo', 'America/Montevideo'],
  ];
  let cities = store.get('cities', ['Madrid', 'Ciudad de México', 'Buenos Aires', 'Tokio']);

  function cityTime(tz) {
    const now = new Date();
    const t = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz });
    const local = new Date(now.toLocaleString('en-US'));
    const there = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    const diffH = Math.round((there - local) / 3600000);
    const dayDiff = there.getDate() - local.getDate();
    const day = dayDiff === 0 ? 'Hoy' : dayDiff > 0 || dayDiff < -20 ? 'Mañana' : 'Ayer';
    return { t, sub: `${day}, ${diffH >= 0 ? '+' : ''}${diffH} h` };
  }

  /* ======================= App ======================= */
  OS.registerApp('clock', {
    create(root) {
      root.classList.add('plain', 'clock-app');
      root.innerHTML = '<div class="clock-pages"></div>';
      const pages = root.querySelector('.clock-pages');
      let current = 'world';
      let editing = false;

      // Cronómetro
      const sw = { running: false, start: 0, acc: 0, laps: [], lapStart: 0 };
      const swElapsed = () => sw.acc + (sw.running ? Date.now() - sw.start : 0);
      let raf = null;

      const tabs = OS.ui.tabbar([
        { id: 'world', icon: 'globe', label: 'Hora mundial' },
        { id: 'alarm', icon: 'alarm', label: 'Alarmas' },
        { id: 'stopwatch', icon: 'stopwatch', label: 'Cronómetro' },
        { id: 'timer', icon: 'timer', label: 'Temporizador' },
      ], current, (id) => show(id));
      root.appendChild(tabs);

      function page(title, actions = '') {
        const p = OS.ui.page({ title, actions });
        p.classList.add('clock-page');
        return p;
      }

      function renderWorld() {
        const p = page('Hora mundial', `<button class="glass-btn" data-edit>${editing ? 'OK' : 'Editar'}</button><button class="glass-btn round" data-add>${OS.icon('plus')}</button>`);
        const list = h('<div class="wc-list"></div>');
        cities.forEach((name) => {
          const c = CITY_POOL.find((x) => x[0] === name);
          if (!c) return;
          const ct = cityTime(c[1]);
          list.appendChild(h(`<div class="wc-row"><div>${editing ? `<button class="del-dot" data-del="${esc(name)}">${OS.icon('minus')}</button>` : ''}<small>${ct.sub}</small><b>${esc(name)}</b></div><span class="wc-time">${ct.t}</span></div>`));
        });
        p.body.appendChild(list);
        p.querySelector('[data-edit]').addEventListener('click', () => { editing = !editing; show('world'); });
        p.querySelector('[data-add]').addEventListener('click', () => {
          const content = h(`<div>${CITY_POOL.filter((c) => !cities.includes(c[0])).map((c) => `<div class="cell tap" data-city="${esc(c[0])}"><span class="cell-label">${esc(c[0])}</span><span class="cell-value">${cityTime(c[1]).t}</span></div>`).join('')}</div>`);
          const sh = OS.ui.sheet({ title: 'Elige una ciudad', content, left: { icon: 'close' }, host: root });
          content.addEventListener('click', (e) => {
            const r = e.target.closest('[data-city]');
            if (!r) return;
            cities.push(r.dataset.city);
            store.set('cities', cities);
            sh.close();
            show('world');
          });
        });
        list.addEventListener('click', (e) => {
          const d = e.target.closest('[data-del]');
          if (d) { cities = cities.filter((c) => c !== d.dataset.del); store.set('cities', cities); show('world'); }
        });
        return p;
      }

      function renderAlarms() {
        const p = page('Alarmas', `<button class="glass-btn" data-edit>${editing ? 'OK' : 'Editar'}</button><button class="glass-btn round" data-add>${OS.icon('plus')}</button>`);
        const list = h('<div class="al-list"></div>');
        alarms.sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m)).forEach((a) => {
          const row = h(`<div class="al-row ${a.on ? '' : 'off'}">${editing ? `<button class="del-dot" data-del="${a.id}">${OS.icon('minus')}</button>` : ''}<div style="flex:1"><div class="al-time">${String(a.h).padStart(2, '0')}:${String(a.m).padStart(2, '0')}</div><small>${esc(a.label || 'Alarma')}</small></div></div>`);
          if (!editing) row.appendChild(OS.ui.toggle(a.on, (v) => { a.on = v; row.classList.toggle('off', !v); saveAlarms(); }));
          list.appendChild(row);
        });
        if (!alarms.length) list.appendChild(h(`<div class="empty-state">${OS.icon('alarm')}<b>Sin alarmas</b><span>Pulsa + para crear una.</span></div>`));
        p.body.appendChild(list);
        p.querySelector('[data-edit]').addEventListener('click', () => { editing = !editing; show('alarm'); });
        list.addEventListener('click', (e) => {
          const d = e.target.closest('[data-del]');
          if (d) { alarms = alarms.filter((a) => a.id !== d.dataset.del); saveAlarms(); show('alarm'); }
        });
        p.querySelector('[data-add]').addEventListener('click', () => {
          const now = new Date();
          const content = h(`<div style="padding:10px 16px 20px">
            <input type="time" class="time-input" value="${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}">
            <div class="group" style="margin:18px 0 0"><div class="cell"><span class="cell-label">Etiqueta</span><input class="cell-input" placeholder="Alarma" data-label></div></div></div>`);
          OS.ui.sheet({
            title: 'Añadir alarma', content, host: root,
            left: { icon: 'close' },
            right: { icon: 'check', primary: true, onClick: (sh) => {
              const [hh, mm] = content.querySelector('.time-input').value.split(':').map(Number);
              api.addAlarm(hh || 0, mm || 0, content.querySelector('[data-label]').value);
              sh.close();
            } },
          });
        });
        return p;
      }

      function renderStopwatch() {
        const p = page('Cronómetro');
        p.body.innerHTML = `
          <div class="sw-face"><div class="sw-digits">${fmt.duration(swElapsed(), true)}</div></div>
          <div class="sw-btns">
            <button class="round-btn gray" data-sw="lap">${sw.running ? 'Vuelta' : swElapsed() ? 'Reiniciar' : 'Vuelta'}</button>
            <button class="round-btn ${sw.running ? 'red' : 'green'}" data-sw="go">${sw.running ? 'Detener' : 'Iniciar'}</button>
          </div>
          <div class="sw-laps"></div>`;
        const laps = p.body.querySelector('.sw-laps');
        const renderLaps = () => {
          const cur = swElapsed() - sw.lapStart;
          const all = [cur, ...sw.laps];
          const done = sw.laps;
          const min = done.length > 1 ? Math.min(...done) : null, max = done.length > 1 ? Math.max(...done) : null;
          laps.innerHTML = (swElapsed() ? all : []).map((v, i) => {
            const n = all.length - i;
            const cls = i > 0 && v === min ? 'best' : i > 0 && v === max ? 'worst' : '';
            return `<div class="lap ${cls}"><span>Vuelta ${n}</span><span>${fmt.duration(v, true)}</span></div>`;
          }).join('');
        };
        renderLaps();
        p.body.addEventListener('click', (e) => {
          const b = e.target.closest('[data-sw]');
          if (!b) return;
          OS.audio.tick();
          if (b.dataset.sw === 'go') {
            if (sw.running) { sw.acc += Date.now() - sw.start; sw.running = false; }
            else { sw.start = Date.now(); sw.running = true; }
          } else if (sw.running) {
            const t = swElapsed();
            sw.laps.unshift(t - sw.lapStart);
            sw.lapStart = t;
          } else { sw.acc = 0; sw.laps = []; sw.lapStart = 0; }
          show('stopwatch');
        });
        const digits = p.body.querySelector('.sw-digits');
        cancelAnimationFrame(raf);
        const loop = () => {
          if (current !== 'stopwatch' || !p.isConnected) return;
          digits.textContent = fmt.duration(swElapsed(), true);
          if (sw.running) renderLaps();
          raf = requestAnimationFrame(loop);
        };
        if (sw.running) raf = requestAnimationFrame(loop);
        return p;
      }

      function wheel(max, value, label) {
        const items = Array.from({ length: max + 1 }, (_, i) => `<div class="wh-item">${i}</div>`).join('');
        const w = h(`<div class="wheel"><div class="wh-scroll"><div class="wh-pad"></div>${items}<div class="wh-pad"></div></div><span class="wh-label">${label}</span></div>`);
        const sc = w.querySelector('.wh-scroll');
        requestAnimationFrame(() => { sc.scrollTop = value * 34; });
        w.value = () => Math.round(sc.scrollTop / 34);
        sc.addEventListener('scroll', () => {
          const v = w.value();
          if (v !== w._last) { w._last = v; OS.audio.tick(); }
        }, { passive: true });
        return w;
      }

      let lastTimer = store.get('lastTimer', [0, 5, 0]);

      function renderTimer() {
        const p = page('Temporizador');
        if (!timer.running) {
          const box = h('<div class="wheels"><div class="wh-sel"></div></div>');
          const wh = wheel(23, lastTimer[0], 'h'), wm = wheel(59, lastTimer[1], 'min'), ws = wheel(59, lastTimer[2], 's');
          box.append(wh, wm, ws);
          p.body.appendChild(box);
          p.body.appendChild(h(`<div class="sw-btns"><button class="round-btn gray" data-t="cancel" disabled>Cancelar</button><button class="round-btn green" data-t="start">Iniciar</button></div>`));
          p.body.appendChild(h(`<div class="group-head" style="margin-top:26px">Recientes</div>`));
          const presets = h(`<div class="presets">${[1, 3, 5, 10, 15, 25].map((m) => `<button class="chip" data-min="${m}">${m} min</button>`).join('')}</div>`);
          p.body.appendChild(presets);
          p.body.addEventListener('click', (e) => {
            const st = e.target.closest('[data-t="start"]');
            const pr = e.target.closest('[data-min]');
            if (st) {
              const ms = (wh.value() * 3600 + wm.value() * 60 + ws.value()) * 1000;
              if (!ms) return;
              lastTimer = [wh.value(), wm.value(), ws.value()];
              store.set('lastTimer', lastTimer);
              timer.start(ms);
            } else if (pr) timer.start(+pr.dataset.min * 60000);
          });
        } else {
          const rem = timer.remaining();
          const R = 140, C = 2 * Math.PI * R;
          p.body.innerHTML = `
            <div class="tm-ring"><svg viewBox="0 0 300 300"><circle cx="150" cy="150" r="${R}" fill="none" stroke="var(--fill)" stroke-width="8"/><circle class="tm-arc" cx="150" cy="150" r="${R}" fill="none" stroke="#ff9f0a" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - rem / timer.total)}" transform="rotate(-90 150 150)"/></svg>
              <div class="tm-center"><div class="tm-left">${fmt.duration(rem + 999)}</div><div class="tm-end">${OS.icon('bell')} ${fmt.time(new Date(Date.now() + rem))}</div></div></div>
            <div class="sw-btns"><button class="round-btn gray" data-t="cancel">Cancelar</button><button class="round-btn ${timer.paused ? 'green' : 'orange'}" data-t="toggle">${timer.paused ? 'Reanudar' : 'Pausa'}</button></div>`;
          p.body.addEventListener('click', (e) => {
            const b = e.target.closest('[data-t]');
            if (!b) return;
            if (b.dataset.t === 'cancel') timer.cancel(); else timer.toggle();
          });
          p._arc = { C, R };
        }
        return p;
      }

      function show(id) {
        if (id !== current) editing = false;
        current = id;
        tabs.set(id);
        const build = { world: renderWorld, alarm: renderAlarms, stopwatch: renderStopwatch, timer: renderTimer }[id];
        const p = build();
        pages.innerHTML = '';
        pages.appendChild(p);
        const sc = p.querySelector('.page-scroll'), nav = p.querySelector('.nav');
        sc.addEventListener('scroll', () => nav.classList.toggle('scrolled', sc.scrollTop > 30), { passive: true });
      }

      const offTick = OS.bus.on('tick', () => {
        if (OS.sys.current !== 'clock') return;
        if (current === 'timer' && timer.running) {
          const p = pages.firstElementChild;
          const rem = timer.remaining();
          const t = p.querySelector('.tm-left');
          if (t) t.textContent = fmt.duration(rem + 999);
          const arc = p.querySelector('.tm-arc');
          if (arc && p._arc) arc.setAttribute('stroke-dashoffset', p._arc.C * (1 - rem / timer.total));
        }
        if (current === 'world' && new Date().getSeconds() === 0) show('world');
      });
      const offTimer = OS.bus.on('timer', () => { if (current === 'timer') show('timer'); });
      const offAlarms = OS.bus.on('alarms', () => { if (current === 'alarm') show('alarm'); });

      const api = {
        tab(id) { show(id); },
        addAlarm(hh, mm, label = '') {
          alarms.push({ id: uid(), h: hh, m: mm, label: label || 'Alarma', on: true });
          saveAlarms();
          if (current === 'alarm') show('alarm');
        },
      };
      OS.clockApp = api;
      show(current);

      return {
        statusStyle: 'auto',
        onShow() { if (current === 'stopwatch' || current === 'world') show(current); },
        onDestroy() { offTick(); offTimer(); offAlarms(); cancelAnimationFrame(raf); OS.clockApp = fallbackApi; },
      };
    },
  });

  // API disponible aunque la app no esté abierta (Siri)
  const fallbackApi = {
    tab() {},
    addAlarm(hh, mm, label = '') {
      alarms.push({ id: uid(), h: hh, m: mm, label: label || 'Alarma', on: true });
      saveAlarms();
    },
  };
  OS.clockApp = fallbackApi;
  OS.timer = timer;
  OS.timerRing = ringSVG;
})();
