/* Centro de control con conectividad, reproductor, deslizadores y controles rápidos. */
(function () {
  'use strict';

  const { esc, clamp, pt } = OS.util;
  const S = OS.state;
  const cc = document.getElementById('control-center');

  cc.innerHTML = `
    <div class="cc-bg"></div>
    <div class="cc-top">
      <button class="cc-mini glass-dark" data-cc="edit" aria-label="Añadir controles">${OS.icon('plus')}</button>
      <button class="cc-mini glass-dark" data-cc="power" aria-label="Apagar">${OS.icon('power')}</button>
    </div>
    <div class="cc-grid">
      <div class="cc-mod cc-2x2 cc-conn glass-dark">
        <button class="cc-c" data-k="airplane" aria-label="Modo avión">${OS.icon('airplane')}</button>
        <button class="cc-c" data-k="cellular" aria-label="Datos móviles">${OS.icon('antenna')}</button>
        <button class="cc-c" data-k="wifi" aria-label="Wi-Fi">${OS.icon('wifi')}</button>
        <button class="cc-c" data-k="bluetooth" aria-label="Bluetooth">${OS.icon('bluetooth')}</button>
      </div>
      <div class="cc-mod cc-2x2 cc-media glass-dark"></div>
      <button class="cc-btn glass-dark" data-t="orientationLock" aria-label="Bloqueo de orientación">${OS.icon('orientationLock')}</button>
      <button class="cc-btn glass-dark" data-cc="mirror" aria-label="Duplicar pantalla">${OS.icon('mirror')}</button>
      <div class="cc-mod cc-1x2 cc-slider glass-dark" data-slider="brightness" aria-label="Brillo"><div class="fill"></div>${OS.icon('sun')}</div>
      <div class="cc-mod cc-1x2 cc-slider glass-dark" data-slider="volume" aria-label="Volumen"><div class="fill"></div>${OS.icon('speaker')}</div>
      <button class="cc-mod cc-2x1 cc-focus glass-dark" data-t="focus"><span class="f-ic">${OS.icon('moon')}</span><span><b>Concentración</b><small class="f-st">Desactivado</small></span></button>
      <button class="cc-btn glass-dark torch" data-cc="torch" aria-label="Linterna">${OS.icon('flashlight')}</button>
      <button class="cc-btn glass-dark" data-cc="timer" aria-label="Temporizador">${OS.icon('timer')}</button>
      <button class="cc-btn glass-dark" data-cc="calculator" aria-label="Calculadora">${OS.icon('calculator')}</button>
      <button class="cc-btn glass-dark" data-cc="camera" aria-label="Cámara">${OS.icon('camera')}</button>
      <button class="cc-btn glass-dark" data-cc="dark" aria-label="Modo oscuro">${OS.icon('eye')}</button>
      <button class="cc-btn glass-dark" data-t="lowPower" aria-label="Modo de bajo consumo">${OS.icon('battery')}</button>
      <div class="cc-mod cc-2x1 cc-signal glass-dark" aria-label="Señal móvil">
        <span class="sig-bars"><i style="height:6px"></i><i style="height:11px"></i><i style="height:16px"></i><i style="height:21px"></i></span>
        <span><b class="sig-t">5G · Movistar</b><small class="sig-s">Excelente</small></span>
      </div>
    </div>`;

  const grid = cc.querySelector('.cc-grid');
  const media = cc.querySelector('.cc-media');

  function renderToggles() {
    cc.querySelectorAll('.cc-c').forEach((b) => b.classList.toggle('on', !!S.get(b.dataset.k)));
    cc.querySelectorAll('[data-t]').forEach((b) => b.classList.toggle('on', !!S.get(b.dataset.t)));
    cc.querySelector('[data-cc="torch"]').classList.toggle('on', !!S.get('torch'));
    cc.querySelector('[data-cc="dark"]').classList.toggle('on', S.isDark());
    cc.querySelector('.f-st').textContent = S.get('focus') ? 'No molestar · Activado' : 'Desactivado';
    cc.querySelector('[data-cc="timer"]').classList.toggle('on', !!(OS.timer && OS.timer.running));
    const air = S.get('airplane'), cell = S.get('cellular');
    const bars = cc.querySelectorAll('.sig-bars i');
    const strength = air || !cell ? 0 : 3 + (new Date().getMinutes() % 2);
    bars.forEach((b, i) => b.classList.toggle('dim', i >= strength));
    cc.querySelector('.sig-t').textContent = air ? 'Modo avión' : cell ? '5G · Movistar' : 'Datos desactivados';
    cc.querySelector('.sig-s').textContent = air || !cell ? 'Sin conexión móvil' : strength >= 4 ? 'Excelente · −78 dBm' : 'Buena · −91 dBm';
  }

  function renderSliders() {
    cc.querySelectorAll('[data-slider]').forEach((s) => {
      const v = S.get(s.dataset.slider);
      s.querySelector('.fill').style.height = v * 100 + '%';
      if (s.dataset.slider === 'volume') {
        s.querySelector('.ico').outerHTML = OS.icon(v === 0 ? 'speakerMute' : v < 0.4 ? 'speakerLow' : 'speaker');
      }
    });
  }

  function renderMedia() {
    const m = OS.music ? OS.music.info() : null;
    const playing = m && m.playing;
    media.innerHTML = `
      <div class="m-top">
        <div class="m-art" style="${m && m.art ? `background-image:${m.art}` : ''}">${m && m.art ? '' : OS.icon('note')}</div>
        <div class="m-meta"><b>${m ? esc(m.title) : 'No suena nada'}</b><span>${m ? esc(m.artist) : 'Música'}</span></div>
      </div>
      <div class="m-ctrl">
        <button data-m="prev" aria-label="Anterior">${OS.icon('prev')}</button>
        <button data-m="toggle" aria-label="${playing ? 'Pausa' : 'Reproducir'}">${OS.icon(playing ? 'pause' : 'play')}</button>
        <button data-m="next" aria-label="Siguiente">${OS.icon('next')}</button>
      </div>`;
  }

  function renderAll() { renderToggles(); renderSliders(); renderMedia(); }

  cc.addEventListener('click', (e) => {
    const c = e.target.closest('.cc-c');
    if (c) {
      const k = c.dataset.k;
      const v = S.toggle(k);
      if (k === 'airplane') { if (v) { S.set('wifi', false); S.set('bluetooth', false); S.set('cellular', false); } else { S.set('cellular', true); S.set('wifi', true); S.set('bluetooth', true); } }
      if (k === 'wifi' && v && S.get('airplane')) { /* se permite Wi-Fi en modo avión */ }
      OS.util.haptic(6);
      renderToggles();
      return;
    }
    const t = e.target.closest('[data-t]');
    if (t) {
      const v = S.toggle(t.dataset.t);
      if (t.dataset.t === 'focus') OS.island.flash({ icon: 'moon', color: '#8e8cff', title: 'No molestar', sub: v ? 'Activado' : 'Desactivado' }, 1800);
      if (t.dataset.t === 'orientationLock') OS.island.flash({ icon: 'orientationLock', color: '#ff453a', title: 'Bloqueo de orientación', sub: v ? 'Activado' : 'Desactivado' }, 1600);
      OS.util.haptic(6);
      renderToggles();
      return;
    }
    const m = e.target.closest('[data-m]');
    if (m) { OS.music && OS.music.control(m.dataset.m); return; }
    const b = e.target.closest('[data-cc]');
    if (b) {
      const a = b.dataset.cc;
      if (a === 'torch') { OS.system.torch(!S.get('torch')); renderToggles(); }
      else if (a === 'dark') { S.set('theme', S.isDark() ? 'light' : 'dark'); renderToggles(); }
      else if (a === 'calculator' || a === 'camera') { api.close(); OS.windows.open(a); }
      else if (a === 'timer') { api.close(); OS.windows.open('clock'); setTimeout(() => OS.clockApp && OS.clockApp.tab('timer'), 400); }
      else if (a === 'power') { api.close(true); OS.hardware.powerOff(); }
      else if (a === 'mirror') OS.ui.toast('Buscando dispositivos…', 'mirror');
      else if (a === 'edit') OS.ui.toast('Mantén pulsado un control para editar', 'plus');
      return;
    }
    if (e.target === cc.querySelector('.cc-bg') || e.target === grid) api.close();
  });

  // Deslizadores verticales
  cc.querySelectorAll('[data-slider]').forEach((s) => {
    s.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      s.setPointerCapture(e.pointerId);
      const key = s.dataset.slider;
      const r = OS.util.rectIn(s);
      const y0 = pt(e).y;
      const v0 = S.get(key);
      s.querySelector('.fill').style.transition = 'none';
      const move = (ev) => {
        const v = clamp(v0 + (y0 - pt(ev).y) / r.h, 0, 1);
        S.set(key, Math.round(v * 100) / 100);
        renderSliders();
      };
      const up = () => {
        s.removeEventListener('pointermove', move);
        s.removeEventListener('pointerup', up);
        s.querySelector('.fill').style.transition = '';
        if (key === 'volume') OS.audio.volume();
      };
      s.addEventListener('pointermove', move);
      s.addEventListener('pointerup', up);
    });
  });

  // Deslizar hacia arriba para cerrar
  cc.addEventListener('pointerdown', (e) => {
    if (!cc.classList.contains('open') || e.target.closest('button, [data-slider], .cc-mod')) return;
    const y0 = pt(e).y;
    let dy = 0;
    cc.setPointerCapture(e.pointerId);
    const move = (ev) => { dy = pt(ev).y - y0; if (dy < 0) api.drag(1 + dy / 300); };
    const up = () => {
      cc.removeEventListener('pointermove', move);
      cc.removeEventListener('pointerup', up);
      if (dy < -50) api.close();
      else if (Math.abs(dy) < 6) api.close();
      else api.settle(true);
    };
    cc.addEventListener('pointermove', move);
    cc.addEventListener('pointerup', up);
  });

  function setP(p) { cc.style.setProperty('--p', clamp(p, 0, 1)); }

  const api = {
    open() {
      renderAll();
      cc.classList.add('open', 'animating');
      cc.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => setP(1));
      OS.sys.ccOpen = true;
      OS.chrome.update();
      clearTimeout(api._t);
      api._t = setTimeout(() => cc.classList.remove('animating'), 520);
    },
    close(instant = false) {
      if (!cc.classList.contains('open')) return;
      OS.sys.ccOpen = false;
      OS.chrome.update();
      cc.setAttribute('aria-hidden', 'true');
      if (instant) { cc.classList.remove('open', 'animating'); setP(0); return; }
      cc.classList.add('animating');
      setP(0);
      clearTimeout(api._t);
      api._t = setTimeout(() => cc.classList.remove('animating', 'open'), 450);
    },
    drag(p) {
      if (!cc.classList.contains('open')) { renderAll(); cc.classList.add('open'); }
      cc.classList.remove('animating');
      setP(p);
    },
    settle(open) { if (open) api.open(); else api.close(); },
    toggle() { if (OS.sys.ccOpen) api.close(); else api.open(); },
    get isOpen() { return !!OS.sys.ccOpen; },
  };

  ['airplane', 'wifi', 'bluetooth', 'cellular', 'focus', 'orientationLock', 'lowPower', 'torch', 'theme'].forEach((k) => S.on(k, () => { if (OS.sys.ccOpen) renderToggles(); }));
  ['brightness', 'volume'].forEach((k) => S.on(k, () => { if (OS.sys.ccOpen) renderSliders(); }));
  OS.bus.on('music', () => { if (OS.sys.ccOpen) renderMedia(); });
  OS.bus.on('timer', () => { if (OS.sys.ccOpen) renderToggles(); });

  OS.cc = api;
})();
