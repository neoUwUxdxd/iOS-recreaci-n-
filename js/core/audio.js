/* Sonidos del sistema sintetizados con Web Audio. */
(function () {
  'use strict';

  let ctx = null;
  let master = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function vol() { return OS.state.get('volume'); }

  function tone({ freq = 880, type = 'sine', dur = 0.12, gain = 0.2, attack = 0.005, when = 0, slide = 0 }) {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * vol()), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noise(dur = 0.05, gain = 0.2, when = 0, hp = 2000) {
    const c = ensure();
    if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    const g = c.createGain();
    g.gain.value = gain * vol();
    src.connect(f).connect(g).connect(master);
    src.start(c.currentTime + when);
  }

  const muted = () => OS.state.get('silent');

  const sounds = {
    lock() { if (muted()) return; noise(0.04, 0.5, 0, 1200); tone({ freq: 180, dur: 0.06, gain: 0.25, type: 'triangle' }); },
    unlock() { if (muted()) return; tone({ freq: 1320, dur: 0.05, gain: 0.05 }); },
    tick() { if (muted()) return; noise(0.012, 0.18, 0, 4000); },
    key() { if (muted()) return; noise(0.02, 0.22, 0, 2500); },
    shutter() { noise(0.05, 0.6, 0, 1500); noise(0.06, 0.5, 0.09, 1500); },
    send() { if (muted()) return; tone({ freq: 500, dur: 0.18, gain: 0.12, slide: 700 }); },
    receive() { if (muted()) return; tone({ freq: 1180, dur: 0.12, gain: 0.12 }); tone({ freq: 1560, dur: 0.18, gain: 0.1, when: 0.1 }); },
    notify() { if (muted()) return; tone({ freq: 988, dur: 0.14, gain: 0.12 }); tone({ freq: 1318, dur: 0.22, gain: 0.1, when: 0.12 }); },
    alarm(times = 3) {
      for (let r = 0; r < times; r++) {
        [0, 0.16, 0.32].forEach((w) => tone({ freq: 1046, dur: 0.12, gain: 0.25, type: 'square', when: r * 0.9 + w }));
      }
    },
    siri() { tone({ freq: 660, dur: 0.12, gain: 0.08 }); tone({ freq: 990, dur: 0.2, gain: 0.08, when: 0.08 }); },
    siriEnd() { tone({ freq: 990, dur: 0.1, gain: 0.07 }); tone({ freq: 660, dur: 0.16, gain: 0.07, when: 0.07 }); },
    volume() { tone({ freq: 1400, dur: 0.05, gain: 0.08 }); },
  };

  OS.audio = { ensure, tone, noise, ...sounds, get ctx() { return ensure(); }, get master() { ensure(); return master; } };
})();
