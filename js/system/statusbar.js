/* Barra de estado + coordinación del color del "cromo" del sistema. */
(function () {
  'use strict';

  const { h, fmt } = OS.util;
  const S = OS.state;

  const bar = document.getElementById('status-bar');
  const indicator = document.getElementById('home-indicator');

  bar.innerHTML = `
    <div class="sb-left"><span class="sb-time">9:41</span><span class="sb-focus sb-hidden">${OS.icon('moon')}</span></div>
    <div class="sb-right">
      <span class="sb-plane sb-hidden">${OS.icon('airplane')}</span>
      <span class="sb-signal"><i></i><i></i><i></i><i></i></span>
      <svg class="sb-wifi" viewBox="0 0 17 12" fill="currentColor" aria-hidden="true">
        <path d="M8.5 2.3c2.4 0 4.6.9 6.3 2.5l1.2-1.2A10.6 10.6 0 0 0 8.5.6C5.6.6 3 1.7 1 3.6l1.2 1.2a9 9 0 0 1 6.3-2.5z"/>
        <path d="M8.5 5.6c1.5 0 2.9.6 4 1.6l1.2-1.2a7.4 7.4 0 0 0-10.4 0l1.2 1.2c1.1-1 2.5-1.6 4-1.6z"/>
        <path d="M8.5 8.9c.6 0 1.2.2 1.7.7L8.5 11.3 6.8 9.6c.5-.5 1.1-.7 1.7-.7z"/>
      </svg>
      <span class="sb-battery"><b></b><em></em></span>
    </div>`;

  const $t = bar.querySelector('.sb-time');
  const $sig = bar.querySelector('.sb-signal');
  const $wifi = bar.querySelector('.sb-wifi');
  const $plane = bar.querySelector('.sb-plane');
  const $bat = bar.querySelector('.sb-battery');
  const $focus = bar.querySelector('.sb-focus');

  function renderTime() { $t.textContent = fmt.clock(); }

  function renderConn() {
    const air = S.get('airplane');
    $plane.classList.toggle('sb-hidden', !air);
    $sig.classList.toggle('sb-hidden', air && !S.get('cellular'));
    $sig.classList.toggle('off', !S.get('cellular'));
    $wifi.classList.toggle('sb-hidden', !S.get('wifi'));
    $focus.classList.toggle('sb-hidden', !S.get('focus'));
  }

  function renderBattery() {
    const b = S.get('battery');
    const lvl = Math.round(b.level * 100);
    $bat.querySelector('b').style.width = Math.max(8, lvl) + '%';
    $bat.querySelector('em').textContent = lvl;
    $bat.classList.toggle('low', lvl <= 20 && !b.charging);
    $bat.classList.toggle('saver', S.get('lowPower'));
    $bat.classList.toggle('charging', b.charging);
    $bat.classList.toggle('pct', S.get('batteryPercent'));
    $bat.setAttribute('aria-label', `Batería ${lvl} %`);
  }

  ['airplane', 'wifi', 'cellular', 'focus'].forEach((k) => S.on(k, renderConn));
  ['battery', 'lowPower', 'batteryPercent'].forEach((k) => S.on(k, renderBattery));

  // Batería real si el navegador la expone; si no, una simulación suave.
  if (navigator.getBattery) {
    navigator.getBattery().then((bt) => {
      const sync = () => S.set('battery', { level: bt.level, charging: bt.charging });
      sync();
      bt.addEventListener('levelchange', sync);
      bt.addEventListener('chargingchange', sync);
    }).catch(() => {});
  } else {
    setInterval(() => {
      const b = S.get('battery');
      S.set('battery', { level: Math.max(0.15, b.level - 0.002), charging: false });
    }, 60000);
  }

  renderTime();
  renderConn();
  renderBattery();

  /* ---------- Color del cromo (barra de estado + indicador de inicio) ---------- */
  const chrome = {
    update() {
      const sys = OS.sys || {};
      let dark = false;
      let hideIndicator = false;
      const wpLight = OS.wallpapers.byId[S.get('wallpaper')]?.light && !S.isDark();
      if (sys.ccOpen || sys.ncOpen || sys.siriOpen || sys.switcher) dark = false;
      else if (S.get('locked')) dark = !!wpLight;
      else if (sys.spotlight) dark = !S.isDark();
      else if (sys.current) {
        const style = sys.currentStyle || 'auto';
        dark = style === 'dark' || (style === 'auto' && !S.isDark());
      } else dark = !!wpLight;
      if (sys.ccOpen) hideIndicator = true;
      bar.classList.toggle('dark', dark);
      indicator.classList.toggle('dark', dark && !sys.ccOpen);
      indicator.classList.toggle('hidden', hideIndicator);
      bar.classList.toggle('hidden', !!sys.hideStatus && !sys.ccOpen && !sys.ncOpen);
    },
  };

  OS.statusbar = { renderTime, el: bar };
  OS.chrome = chrome;
})();
