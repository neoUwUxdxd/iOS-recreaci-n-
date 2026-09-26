/* Botones físicos, pantalla apagada/siempre activa, linterna, volumen y brillo. */
(function () {
  'use strict';

  const { h, clamp, longPress } = OS.util;
  const S = OS.state;
  const screen = document.getElementById('screen');
  const hud = document.getElementById('hud');
  const dimmer = document.getElementById('dimmer');
  const torchGlow = document.getElementById('torch-glow');
  const off = document.getElementById('screen-off');

  hud.innerHTML = `<div class="vol-hud glass-clear"><i></i>${OS.icon('speaker')}</div>`;
  const volHud = hud.querySelector('.vol-hud');
  let volTimer = null;

  function showVolume() {
    const v = S.get('volume');
    volHud.querySelector('i').style.height = v * 100 + '%';
    volHud.querySelector('.ico').outerHTML = OS.icon(v === 0 ? 'speakerMute' : v < 0.4 ? 'speakerLow' : 'speaker');
    volHud.classList.add('show');
    clearTimeout(volTimer);
    volTimer = setTimeout(() => volHud.classList.remove('show'), 1400);
  }

  function changeVolume(d) {
    S.set('volume', Math.round(clamp(S.get('volume') + d, 0, 1) * 100) / 100);
    if (!OS.sys.ccOpen) showVolume();
    OS.audio.volume();
  }

  function applyBrightness() {
    dimmer.style.opacity = String((1 - S.get('brightness')) * 0.7);
  }

  function torch(on) {
    S.set('torch', !!on);
    torchGlow.classList.toggle('on', !!on);
    OS.util.haptic(12);
  }

  function powerOff() {
    OS.audio.lock();
    OS.lock.lock();
    S.set('screenOn', false);
    screen.classList.add('off');
    screen.classList.toggle('aod', S.get('aod'));
    OS.island.collapse();
  }

  function wake(temporary = false) {
    S.set('screenOn', true);
    screen.classList.remove('off');
    OS.lock.render();
    OS.chrome.update();
    if (temporary) {
      clearTimeout(wake._t);
      wake._t = setTimeout(() => { if (S.get('locked') && S.get('screenOn')) powerOff(); }, 8000);
    }
  }

  function power() {
    if (!S.get('screenOn')) wake();
    else powerOff();
  }

  function action() {
    const a = S.get('actionButton');
    OS.util.haptic(20);
    if (a === 'flashlight') { torch(!S.get('torch')); OS.island.flash({ icon: 'flashlight', color: S.get('torch') ? '#ffd60a' : '#8e8e93', title: 'Linterna', sub: S.get('torch') ? 'Activada' : 'Desactivada' }, 1400); }
    else if (a === 'siri') OS.siri.toggle();
    else if (a === 'camera') OS.windows.open('camera');
    else if (a === 'silent') {
      const v = S.toggle('silent');
      OS.island.flash({ icon: v ? 'bellSlash' : 'bell', color: v ? '#ff453a' : '#fff', title: v ? 'Modo silencio' : 'Modo sonido', sub: v ? 'Activado' : 'Desactivado' }, 1600);
    }
  }

  // Botones del marco
  document.querySelectorAll('.hw').forEach((b) => {
    const k = b.dataset.hw;
    if (k === 'power') {
      longPress(b, 520, () => { if (!S.get('screenOn')) wake(); OS.siri.open(); }, () => power());
    } else {
      b.addEventListener('click', () => {
        if (k === 'volup') changeVolume(0.0625);
        else if (k === 'voldown') changeVolume(-0.0625);
        else if (k === 'action') action();
        else if (k === 'camera') { if (!S.get('screenOn')) wake(); OS.windows.open('camera'); }
      });
    }
  });

  off.addEventListener('click', () => wake());
  S.on('brightness', applyBrightness);
  S.on('aod', (v) => screen.classList.toggle('aod', v));
  applyBrightness();

  OS.hardware = { power, powerOff, wake, showVolume, changeVolume, action };
  OS.system = { torch };
})();
