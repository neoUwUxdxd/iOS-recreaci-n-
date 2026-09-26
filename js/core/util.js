/* Utilidades compartidas: DOM, formato, eventos y almacenamiento. */
(function () {
  'use strict';

  const OS = (window.OS = window.OS || {});

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /** Crea un elemento a partir de HTML. Devuelve el primer nodo. */
  function h(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const uid = () => Math.random().toString(36).slice(2, 10);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Generador pseudoaleatorio determinista (mulberry32). */
  function seeded(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- Bus de eventos ---------- */
  const listeners = {};
  const bus = {
    on(evt, fn) { (listeners[evt] = listeners[evt] || new Set()).add(fn); return () => listeners[evt].delete(fn); },
    off(evt, fn) { listeners[evt] && listeners[evt].delete(fn); },
    emit(evt, data) { (listeners[evt] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); },
  };

  /* ---------- Almacenamiento seguro ---------- */
  const PREFIX = 'ios27:';
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(PREFIX + key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; } catch (e) { return false; }
    },
    remove(key) { try { localStorage.removeItem(PREFIX + key); } catch (e) { /* sin almacenamiento */ } },
    clearAll() {
      try { Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* nada */ }
    },
  };

  /* ---------- Formato (es-ES) ---------- */
  const LOCALE = 'es-ES';
  const fmt = {
    time(d = new Date(), opts = {}) {
      return d.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false, ...opts });
    },
    clock(d = new Date()) {
      const hh = d.getHours();
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    },
    lockDate(d = new Date()) {
      const s = d.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
      return s.charAt(0).toUpperCase() + s.slice(1);
    },
    weekday(d = new Date(), style = 'long') {
      const s = d.toLocaleDateString(LOCALE, { weekday: style });
      return s.charAt(0).toUpperCase() + s.slice(1);
    },
    month(d = new Date(), style = 'long') {
      const s = d.toLocaleDateString(LOCALE, { month: style });
      return s.charAt(0).toUpperCase() + s.slice(1);
    },
    relative(ts) {
      const diff = Math.round((Date.now() - ts) / 1000);
      if (diff < 60) return 'ahora';
      if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
      if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
      return new Date(ts).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
    },
    duration(ms, withCentis = false) {
      const total = Math.max(0, ms);
      const h = Math.floor(total / 3600000);
      const m = Math.floor((total % 3600000) / 60000);
      const s = Math.floor((total % 60000) / 1000);
      const cs = Math.floor((total % 1000) / 10);
      const pad = (n) => String(n).padStart(2, '0');
      if (withCentis) return `${h ? h + ':' : ''}${pad(m)}:${pad(s)},${pad(cs)}`;
      return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
    },
    number(n, digits = 10) {
      if (!isFinite(n)) return 'Error';
      const abs = Math.abs(n);
      if (abs !== 0 && (abs >= 1e15 || abs < 1e-9)) return n.toExponential(5).replace('.', ',');
      return n.toLocaleString(LOCALE, { maximumFractionDigits: digits, useGrouping: abs >= 10000 });
    },
  };

  /* ---------- Animación ---------- */
  const ease = {
    spring: 'cubic-bezier(.2,.9,.24,1)',
    springOut: 'cubic-bezier(.32,1.25,.5,1)',
    smooth: 'cubic-bezier(.4,0,.2,1)',
    decel: 'cubic-bezier(0,0,.2,1)',
  };

  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function animate(elm, keyframes, opts) {
    const o = typeof opts === 'number' ? { duration: opts } : { ...opts };
    if (reducedMotion()) o.duration = Math.min(o.duration || 200, 120);
    o.easing = o.easing || ease.spring;
    o.fill = o.fill || 'forwards';
    const a = elm.animate(keyframes, o);
    return a;
  }

  /** Convierte coordenadas de puntero en coordenadas de pantalla (compensa el escalado). */
  function pt(e) {
    const r = OS.screenRect || document.getElementById('screen').getBoundingClientRect();
    const s = OS.scale || 1;
    return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
  }

  function rectIn(elm) {
    const r = elm.getBoundingClientRect();
    const sr = OS.screenRect || document.getElementById('screen').getBoundingClientRect();
    const s = OS.scale || 1;
    return { x: (r.left - sr.left) / s, y: (r.top - sr.top) / s, w: r.width / s, h: r.height / s };
  }

  /** Detecta pulsación larga. */
  function longPress(elm, ms, onLong, onTap) {
    let timer = null, start = null, fired = false;
    elm.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      fired = false;
      start = { x: e.clientX, y: e.clientY };
      timer = setTimeout(() => { fired = true; timer = null; onLong(e); }, ms);
    });
    const cancel = () => { if (timer) clearTimeout(timer); timer = null; };
    elm.addEventListener('pointermove', (e) => {
      if (!start) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) cancel();
    });
    elm.addEventListener('pointerup', (e) => {
      const wasTimer = !!timer;
      cancel();
      if (!fired && wasTimer && onTap) onTap(e);
      start = null;
    });
    elm.addEventListener('pointercancel', () => { cancel(); start = null; });
    elm.addEventListener('pointerleave', cancel);
    elm.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  function haptic(ms = 8) {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* nada */ }
  }

  /** Evalúa expresiones aritméticas de forma segura (sin eval). */
  function calc(expr) {
    const src = String(expr)
      .replace(/×|x(?=\s*[\d(])/gi, '*')
      .replace(/÷/g, '/')
      .replace(/−|–/g, '-')
      .replace(/,/g, '.')
      .replace(/\s+/g, '');
    let i = 0;
    const peek = () => src[i];
    const num = () => {
      const m = /^\d*\.?\d+(e[+-]?\d+)?/i.exec(src.slice(i));
      if (!m) throw new Error('num');
      i += m[0].length;
      let v = parseFloat(m[0]);
      if (peek() === '%') { i++; v /= 100; }
      return v;
    };
    const factor = () => {
      if (peek() === '-') { i++; return -factor(); }
      if (peek() === '+') { i++; return factor(); }
      if (peek() === '(') {
        i++;
        const v = expr_();
        if (peek() !== ')') throw new Error('paren');
        i++;
        return v;
      }
      return num();
    };
    const power = () => {
      let b = factor();
      while (peek() === '^') { i++; b = Math.pow(b, factor()); }
      return b;
    };
    const term = () => {
      let v = power();
      while (peek() === '*' || peek() === '/') {
        const op = src[i++];
        const r = power();
        v = op === '*' ? v * r : v / r;
      }
      return v;
    };
    const expr_ = () => {
      let v = term();
      while (peek() === '+' || peek() === '-') {
        const op = src[i++];
        const r = term();
        v = op === '+' ? v + r : v - r;
      }
      return v;
    };
    const v = expr_();
    if (i !== src.length) throw new Error('trailing');
    return Math.round(v * 1e12) / 1e12;
  }

  /** Minúsculas y sin tildes, para búsquedas. */
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  OS.util = { norm, $, $$, h, esc, clamp, lerp, uid, wait, seeded, store, fmt, ease, animate, pt, rectIn, longPress, haptic, calc, reducedMotion };
  OS.bus = bus;
})();
