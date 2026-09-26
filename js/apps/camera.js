/* Cámara: controles personalizables sobre el visor (iOS 27), zoom, modos, estilos y captura. */
(function () {
  'use strict';

  const { h, store } = OS.util;

  const ALL_CONTROLS = {
    flash: { label: 'Flash', icon: 'bolt' },
    live: { label: 'Live Photo', icon: 'live' },
    timer: { label: 'Temporizador', icon: 'timer' },
    exposure: { label: 'Exposición', icon: 'sunSmall' },
    styles: { label: 'Estilos', icon: 'sparkle' },
    aspect: { label: 'Formato', icon: 'grid' },
  };
  const STYLES = [['Estándar', 'none'], ['Intenso', 'saturate(1.4) contrast(1.08)'], ['Cálido', 'sepia(.25) saturate(1.25)'], ['Frío', 'hue-rotate(12deg) saturate(1.1)'], ['Mono', 'grayscale(1) contrast(1.1)']];
  const ASPECTS = [['4:3', 3 / 4], ['16:9', 9 / 16], ['1:1', 1]];

  OS.registerApp('camera', {
    create(root) {
      root.classList.add('camera-app');
      let controls = store.get('camControls', ['flash', 'live']);
      const st = { flash: false, live: true, timer: 0, exposure: 0, style: 0, aspect: 0, zoom: 1, mode: 'FOTO', front: false, recording: false, recStart: 0 };
      let stream = null;
      let sim = null;

      root.innerHTML = `
        <div class="cam-controls"></div>
        <div class="cam-view">
          <div class="cam-feed"><video playsinline muted autoplay></video><canvas class="cam-sim"></canvas></div>
          <div class="cam-grid"></div>
          <div class="cam-count"></div>
          <div class="cam-rec"></div>
          <button class="cam-real glass-clear">${OS.icon('video')}<span>Usar la cámara real</span></button>
          <div class="cam-zoom">${[0.5, 1, 2, 8].map((z) => `<button data-z="${z}" class="${z === 1 ? 'on' : ''}">${z === 1 ? '1×' : String(z).replace('.', ',')}</button>`).join('')}</div>
        </div>
        <div class="cam-modes">${['CÁMARA LENTA', 'VÍDEO', 'FOTO', 'RETRATO', 'PANO'].map((m) => `<button data-m="${m}" class="${m === 'FOTO' ? 'on' : ''}">${m}</button>`).join('')}</div>
        <div class="cam-bottom">
          <button class="cam-thumb" aria-label="Última foto"></button>
          <button class="cam-shutter" aria-label="Hacer foto"><i></i></button>
          <button class="cam-flip glass-dark" aria-label="Cambiar cámara">${OS.icon('rotate')}</button>
        </div>
        <div class="cam-flash"></div>`;

      const $ctrl = root.querySelector('.cam-controls');
      const $view = root.querySelector('.cam-view');
      const $feed = root.querySelector('.cam-feed');
      const video = root.querySelector('video');
      const simC = root.querySelector('.cam-sim');
      const $thumb = root.querySelector('.cam-thumb');
      const $count = root.querySelector('.cam-count');
      const $rec = root.querySelector('.cam-rec');
      const $real = root.querySelector('.cam-real');
      const $shutter = root.querySelector('.cam-shutter');

      function renderControls() {
        $ctrl.innerHTML = controls.map((k) => {
          const c = ALL_CONTROLS[k];
          let on = false, label = '';
          if (k === 'flash') { on = st.flash; label = OS.icon(st.flash ? 'bolt' : 'boltSlash'); }
          else if (k === 'live') { on = st.live; label = OS.icon('live'); }
          else if (k === 'timer') { on = !!st.timer; label = `${OS.icon('timer')}${st.timer ? `<em>${st.timer}s</em>` : ''}`; }
          else if (k === 'exposure') { on = !!st.exposure; label = `${OS.icon('sunSmall')}${st.exposure ? `<em>${st.exposure > 0 ? '+' : ''}${String(st.exposure).replace('.', ',')}</em>` : ''}`; }
          else if (k === 'styles') { on = !!st.style; label = `${OS.icon('sparkle')}${st.style ? `<em>${STYLES[st.style][0]}</em>` : ''}`; }
          else if (k === 'aspect') { label = `<em style="margin:0">${ASPECTS[st.aspect][0]}</em>`; }
          return `<button class="cam-c glass-dark ${on ? 'on' : ''}" data-c="${k}" aria-label="${c.label}">${label}</button>`;
        }).join('') + `<button class="cam-c glass-dark" data-c="more" aria-label="Personalizar controles">${OS.icon('ellipsis')}</button>`;
      }

      function applyView() {
        $feed.style.filter = `${STYLES[st.style][1] === 'none' ? '' : STYLES[st.style][1]} brightness(${1 + st.exposure * 0.35})`;
        $feed.style.transform = `scale(${Math.max(1, st.zoom)}) ${st.front ? 'scaleX(-1)' : ''}`;
        $view.style.aspectRatio = String(ASPECTS[st.aspect][1]);
        $view.classList.toggle('portrait', st.mode === 'RETRATO');
        $view.querySelector('.cam-grid').style.display = store.get('camGrid', false) ? '' : 'none';
        $shutter.classList.toggle('video', st.mode === 'VÍDEO' || st.mode === 'CÁMARA LENTA');
        $shutter.classList.toggle('recording', st.recording);
      }

      $ctrl.addEventListener('click', (e) => {
        const b = e.target.closest('[data-c]');
        if (!b) return;
        const k = b.dataset.c;
        OS.audio.tick();
        if (k === 'flash') st.flash = !st.flash;
        else if (k === 'live') { st.live = !st.live; OS.ui.toast(st.live ? 'LIVE activado' : 'LIVE desactivado', 'live', 1000); }
        else if (k === 'timer') st.timer = st.timer === 0 ? 3 : st.timer === 3 ? 10 : 0;
        else if (k === 'exposure') st.exposure = st.exposure === 0 ? 0.7 : st.exposure === 0.7 ? -0.7 : 0;
        else if (k === 'styles') st.style = (st.style + 1) % STYLES.length;
        else if (k === 'aspect') st.aspect = (st.aspect + 1) % ASPECTS.length;
        else if (k === 'more') return customize();
        renderControls();
        applyView();
      });

      function customize() {
        const content = h(`<div style="padding:0 0 10px"><div class="group">${Object.entries(ALL_CONTROLS).map(([k, c]) => `<div class="cell tap" data-k="${k}"><span class="cell-icon" style="background:#1c1c1e">${OS.icon(c.icon)}</span><span class="cell-label">${c.label}</span><span class="cell-check" style="visibility:${controls.includes(k) ? 'visible' : 'hidden'}">${OS.icon('check')}</span></div>`).join('')}</div>
          <p style="margin:0 32px;font-size:13px;color:var(--label2)">Novedad de iOS 27: elige los controles que quieres ver encima del visor.</p></div>`);
        OS.ui.sheet({ title: 'Controles de la cámara', content, host: root, right: { label: 'OK', primary: true } });
        content.addEventListener('click', (e) => {
          const c = e.target.closest('[data-k]');
          if (!c) return;
          const k = c.dataset.k;
          if (controls.includes(k)) controls = controls.filter((x) => x !== k); else controls.push(k);
          controls = Object.keys(ALL_CONTROLS).filter((x) => controls.includes(x));
          store.set('camControls', controls);
          c.querySelector('.cell-check').style.visibility = controls.includes(k) ? 'visible' : 'hidden';
          renderControls();
        });
      }

      root.querySelector('.cam-zoom').addEventListener('click', (e) => {
        const b = e.target.closest('[data-z]');
        if (!b) return;
        st.zoom = +b.dataset.z;
        root.querySelectorAll('.cam-zoom button').forEach((x) => x.classList.toggle('on', x === b));
        OS.audio.tick();
        applyView();
      });
      root.querySelector('.cam-modes').addEventListener('click', (e) => {
        const b = e.target.closest('[data-m]');
        if (!b || st.recording) return;
        st.mode = b.dataset.m;
        root.querySelectorAll('.cam-modes button').forEach((x) => x.classList.toggle('on', x === b));
        const modes = root.querySelector('.cam-modes');
        modes.style.setProperty('--off', `${-(b.offsetLeft + b.offsetWidth / 2 - modes.offsetWidth / 2)}px`);
        applyView();
      });

      /* ---------- Visor simulado ---------- */
      function startSim() {
        const { canvas } = OS.photosLib.drawScene(7 + Math.floor(Math.random() * 20), 640, 860);
        simC.width = canvas.width; simC.height = canvas.height;
        const ctx = simC.getContext('2d');
        let t0 = performance.now();
        const loop = (t) => {
          if (!sim) return;
          const k = (t - t0) / 1000;
          ctx.drawImage(canvas, Math.sin(k * 0.3) * 18 - 18, Math.cos(k * 0.23) * 12 - 12, canvas.width + 36, canvas.height + 24);
          sim = requestAnimationFrame(loop);
        };
        sim = requestAnimationFrame(loop);
        simC.style.display = '';
        video.style.display = 'none';
      }
      function stopSim() { if (sim) cancelAnimationFrame(sim); sim = null; }

      async function startReal() {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: st.front ? 'user' : 'environment' }, audio: false });
          video.srcObject = stream;
          await video.play().catch(() => {});
          stopSim();
          video.style.display = '';
          simC.style.display = 'none';
          $real.style.display = 'none';
        } catch (e) {
          OS.ui.toast('No se ha podido acceder a la cámara', 'camera', 2200);
        }
      }
      function stopReal() {
        if (stream) stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
      $real.addEventListener('click', startReal);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) $real.style.display = 'none';

      /* ---------- Captura ---------- */
      function capture() {
        const src = stream ? video : simC;
        const sw = stream ? video.videoWidth : simC.width, sh = stream ? video.videoHeight : simC.height;
        if (!sw || !sh) return;
        const ratio = ASPECTS[st.aspect][1];
        let cw = sw, ch = sw / ratio;
        if (ch > sh) { ch = sh; cw = sh * ratio; }
        cw /= st.zoom > 1 ? st.zoom : 1; ch /= st.zoom > 1 ? st.zoom : 1;
        const out = document.createElement('canvas');
        const scale = Math.min(1, 720 / cw);
        out.width = Math.round(cw * scale); out.height = Math.round(ch * scale);
        const ctx = out.getContext('2d');
        if ('filter' in ctx) ctx.filter = $feed.style.filter || 'none';
        if (st.front) { ctx.translate(out.width, 0); ctx.scale(-1, 1); }
        ctx.drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, out.width, out.height);
        if (st.mode === 'RETRATO') {
          ctx.filter = 'none';
          const g = ctx.createRadialGradient(out.width / 2, out.height * 0.45, out.width * 0.25, out.width / 2, out.height / 2, out.width * 0.8);
          g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)');
          ctx.fillStyle = g; ctx.fillRect(0, 0, out.width, out.height);
        }
        const url = out.toDataURL('image/jpeg', 0.8);
        OS.photosLib.add(url, { kind: 'camera' });
        setThumb(url);
        OS.audio.shutter();
        const fl = root.querySelector('.cam-flash');
        fl.classList.remove('go', 'strong');
        void fl.offsetWidth;
        fl.classList.add('go');
        if (st.flash) fl.classList.add('strong');
      }

      function setThumb(url) { $thumb.style.backgroundImage = url ? `url(${url})` : ''; }

      let countT = null;
      $shutter.addEventListener('click', () => {
        if (st.mode === 'VÍDEO' || st.mode === 'CÁMARA LENTA') {
          st.recording = !st.recording;
          st.recStart = Date.now();
          $rec.classList.toggle('show', st.recording);
          if (!st.recording) OS.ui.toast('Vídeo guardado (simulado)', 'video');
          applyView();
          OS.audio.tick();
          return;
        }
        if (countT) return;
        if (st.timer) {
          let n = st.timer;
          $count.textContent = n;
          $count.classList.add('show');
          countT = setInterval(() => {
            n -= 1;
            if (n <= 0) { clearInterval(countT); countT = null; $count.classList.remove('show'); capture(); }
            else { $count.textContent = n; OS.audio.tick(); }
          }, 1000);
        } else capture();
      });
      root.querySelector('.cam-flip').addEventListener('click', () => {
        st.front = !st.front;
        $feed.animate([{ transform: $feed.style.transform + ' rotateY(0deg)' }, { transform: $feed.style.transform + ' rotateY(90deg)', filter: 'blur(8px)' }, { transform: $feed.style.transform + ' rotateY(0deg)' }], { duration: 450 });
        if (stream) { stopReal(); startReal(); }
        applyView();
      });
      $thumb.addEventListener('click', () => OS.windows.open('photos'));

      const tickOff = OS.bus.on('tick', () => {
        if (st.recording) $rec.textContent = OS.util.fmt.duration(Date.now() - st.recStart).padStart(5, '0');
      });

      renderControls();
      applyView();
      const L = OS.photosLib.list();
      const lastCam = L.filter((p) => p.kind === 'camera').pop() || L[L.length - 1];
      setThumb(lastCam && lastCam.src);

      return {
        statusStyle: 'light',
        onShow() {
          startSim();
          applyView();
          if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'camera' }).then((p) => { if (p.state === 'granted') startReal(); }).catch(() => {});
          }
        },
        onHide() { stopSim(); stopReal(); $real.style.display = navigator.mediaDevices ? '' : 'none'; st.recording = false; $rec.classList.remove('show'); },
        onDestroy() { stopSim(); stopReal(); tickOff(); if (countT) clearInterval(countT); },
      };
    },
  });
})();
