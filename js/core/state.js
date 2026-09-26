/* Estado global del sistema con persistencia. */
(function () {
  'use strict';

  const { store } = OS.util;
  const bus = OS.bus;

  const DEFAULTS = {
    theme: 'auto',          // light | dark | auto
    wallpaper: 'liquid',
    glass: 0.35,            // 0 = transparente · 1 = tintado (novedad de iOS 27)
    iconStyle: 'default',   // default | dark | clear | tinted
    tintHue: 212,
    compactClock: false,    // reloj compacto en la pantalla bloqueada (iOS 27)
    clockStyle: 'glass',    // solid | glass
    brightness: 0.9,
    volume: 0.5,
    wifi: true,
    bluetooth: true,
    airplane: false,
    cellular: true,
    hotspot: false,
    focus: false,
    orientationLock: true,
    lowPower: false,
    batteryPercent: false,
    aod: true,
    siriVoice: true,
    siriEnabled: true,
    silent: false,
    actionButton: 'flashlight', // flashlight | siri | camera | silent
    deviceName: 'iPhone',
    userName: 'Alex García',
    layout: null,
  };

  const saved = store.get('settings', {});
  const data = Object.assign({}, DEFAULTS, saved);

  const runtime = {
    locked: true,
    screenOn: true,
    torch: false,
    battery: { level: 0.82, charging: false },
  };

  let saveTimer = null;
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const out = {};
      Object.keys(DEFAULTS).forEach((k) => { out[k] = data[k]; });
      store.set('settings', out);
    }, 150);
  }

  const state = {
    get(key) { return key in data ? data[key] : runtime[key]; },
    set(key, value) {
      const target = key in data ? data : runtime;
      if (target[key] === value) return;
      target[key] = value;
      if (target === data) persist();
      bus.emit('change:' + key, value);
      bus.emit('change', { key, value });
    },
    toggle(key) { state.set(key, !state.get(key)); return state.get(key); },
    on(key, fn, immediate = false) {
      const off = bus.on('change:' + key, fn);
      if (immediate) fn(state.get(key));
      return off;
    },
    reset() {
      store.clearAll();
      location.reload();
    },
    defaults: DEFAULTS,
    /** Tema efectivo (resuelve "auto"). */
    isDark() {
      const t = data.theme;
      if (t === 'auto') {
        const forced = document.documentElement.getAttribute('data-theme');
        if (forced === 'dark' || forced === 'light') return forced === 'dark';
        return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      }
      return t === 'dark';
    },
  };

  OS.state = state;
})();
