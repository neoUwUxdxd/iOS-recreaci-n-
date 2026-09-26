/* Ajustes: conectividad, pantalla, Liquid Glass (iOS 27), fondo, Siri, batería y más. */
(function () {
  'use strict';

  const { h, esc, fmt, clamp } = OS.util;
  const S = OS.state;
  const { cell, group, toggle, slider, segmented } = OS.ui;

  const C = { orange: '#ff9500', blue: '#0a84ff', green: '#34c759', gray: '#8e8e93', indigo: '#5e5ce6', red: '#ff3b30', pink: '#ff2d55', cyan: '#30b0c7', purple: '#af52de' };
  const SIRI_ICON = '<span class="siri-orb" style="inset:3px"><i></i><i></i><i></i></span>';

  const NETWORKS = [
    { name: 'Casa_5G', lock: true, bars: 3 },
    { name: 'Movistar_7A2C', lock: true, bars: 2 },
    { name: 'Cafetería Sol', lock: false, bars: 2 },
    { name: 'DIRECT-roku-TV', lock: true, bars: 1 },
    { name: 'Vodafone-Free', lock: false, bars: 1 },
  ];
  let wifiNet = OS.util.store.get('wifiNet', 'Casa_5G');

  /** Suscripción que se limpia al salir de la página. */
  function bind(page, key, fn) {
    const off = S.on(key, fn);
    page.addEventListener('popped', off, { once: true });
  }

  function switchCell(page, opts) {
    const t = toggle(S.get(opts.key), (v) => { S.set(opts.key, v); opts.after && opts.after(v); });
    if (page) bind(page, opts.key, (v) => t.set(v));
    return cell({ icon: opts.icon, color: opts.color, label: opts.label, sub: opts.sub, right: t });
  }

  OS.settingsIndex = [
    { label: 'Wi‑Fi', path: 'wifi' }, { label: 'Bluetooth', path: 'bluetooth' }, { label: 'Datos móviles', path: 'cellular' },
    { label: 'General', path: 'general' }, { label: 'Información', path: 'about' }, { label: 'Actualización de software', path: 'update' },
    { label: 'Almacenamiento', path: 'storage' }, { label: 'Accesibilidad', path: 'accessibility' }, { label: 'Botón de acción', path: 'action' },
    { label: 'Pantalla y brillo', path: 'display' }, { label: 'Modo oscuro', path: 'display' }, { label: 'Brillo', path: 'display' },
    { label: 'Pantalla de inicio', path: 'homescreen' }, { label: 'Iconos oscuros', path: 'homescreen' }, { label: 'Liquid Glass', path: 'glass' },
    { label: 'Transparencia', path: 'glass' }, { label: 'Fondo de pantalla', path: 'wallpaper' }, { label: 'Reloj compacto', path: 'wallpaper' },
    { label: 'Siri', path: 'siri' }, { label: 'Notificaciones', path: 'notifications' }, { label: 'Sonidos y vibraciones', path: 'sounds' },
    { label: 'Concentración', path: 'focus' }, { label: 'No molestar', path: 'focus' }, { label: 'Tiempo de uso', path: 'screentime' },
    { label: 'Batería', path: 'battery' }, { label: 'Porcentaje de batería', path: 'battery' }, { label: 'Privacidad y seguridad', path: 'privacy' },
    { label: 'Face ID y código', path: 'faceid' }, { label: 'Restablecer', path: 'reset' },
  ];

  OS.registerApp('settings', {
    create(root) {
      root.classList.add('grouped');
      const nav = OS.ui.navStack(root);

      /* ---------- Página raíz ---------- */
      const home = OS.ui.page({ title: 'Ajustes' });
      const b = home.body;
      const search = h(`<label class="search-field">${OS.icon('search')}<input placeholder="Buscar" aria-label="Buscar en Ajustes"></label>`);
      b.appendChild(search);
      const results = h('<div></div>');
      const main = h('<div></div>');
      b.appendChild(results);
      b.appendChild(main);

      search.querySelector('input').addEventListener('input', (e) => {
        const q = OS.util.norm(e.target.value.trim());
        results.innerHTML = '';
        main.style.display = q ? 'none' : '';
        if (!q) return;
        const hits = OS.settingsIndex.filter((s) => OS.util.norm(s.label).includes(q));
        results.appendChild(group(hits.length ? hits.map((s) => cell({ label: s.label, chevron: true, onClick: () => go(s.path) })) : [cell({ label: 'Sin resultados' })]));
      });

      const initials = S.get('userName').split(' ').map((x) => x[0]).join('').slice(0, 2);
      const profile = h(`<div class="group"><div class="profile cell tap"><div class="avatar" style="background:linear-gradient(180deg,#7fb2ff,#4a6cf7)">${esc(initials)}</div><div style="flex:1"><b>${esc(S.get('userName'))}</b><small>Cuenta, iCloud, contenido y compras</small></div><span class="cell-chev">${OS.icon('chevronRight')}</span></div></div>`);
      profile.addEventListener('click', () => go('about'));
      main.appendChild(profile);

      const wifiValue = () => (S.get('wifi') ? wifiNet : 'No');
      const btValue = () => (S.get('bluetooth') ? 'Sí' : 'No');
      const cWifi = cell({ icon: 'wifi', color: C.blue, label: 'Wi‑Fi', value: wifiValue(), chevron: true, onClick: () => go('wifi') });
      const cBt = cell({ icon: 'bluetooth', color: C.blue, label: 'Bluetooth', value: btValue(), chevron: true, onClick: () => go('bluetooth') });
      main.appendChild(group([
        switchCell(null, { key: 'airplane', icon: 'airplane', color: C.orange, label: 'Modo avión' }),
        cWifi,
        cBt,
        cell({ icon: 'antenna', color: C.green, label: 'Datos móviles', chevron: true, onClick: () => go('cellular') }),
        cell({ icon: 'link', color: C.green, label: 'Punto de acceso personal', value: 'No', chevron: true, onClick: () => go('hotspot') }),
      ]));
      const refreshConn = () => {
        cWifi.querySelector('.cell-value').textContent = wifiValue();
        cBt.querySelector('.cell-value').textContent = btValue();
      };
      ['wifi', 'bluetooth', 'airplane'].forEach((k) => S.on(k, refreshConn));
      home.addEventListener('refresh', refreshConn);

      main.appendChild(group([
        cell({ icon: 'gear', color: C.gray, label: 'General', chevron: true, onClick: () => go('general') }),
        cell({ icon: 'accessibility', color: C.blue, label: 'Accesibilidad', chevron: true, onClick: () => go('accessibility') }),
        cell({ icon: 'bolt', color: C.blue, label: 'Botón de acción', chevron: true, onClick: () => go('action') }),
        cell({ icon: 'camera', color: C.gray, label: 'Cámara', chevron: true, onClick: () => go('camera') }),
        cell({ icon: 'grid', color: C.gray, label: 'Centro de control', chevron: true, onClick: () => go('control') }),
        cell({ icon: 'sun', color: C.blue, label: 'Pantalla y brillo', chevron: true, onClick: () => go('display') }),
        cell({ icon: 'grid', color: C.indigo, label: 'Pantalla de inicio y biblioteca de apps', chevron: true, onClick: () => go('homescreen') }),
        cell({ icon: 'droplet', color: 'linear-gradient(135deg,#5ee7ff,#3a7bff 55%,#9a5cff)', label: 'Liquid Glass', value: 'Nuevo', chevron: true, onClick: () => go('glass') }),
        cell({ icon: 'sparkle', color: C.cyan, label: 'Fondo de pantalla', chevron: true, onClick: () => go('wallpaper') }),
        cell({ icon: SIRI_ICON, color: '#000', label: 'Siri', chevron: true, onClick: () => go('siri') }),
        cell({ icon: 'search', color: C.gray, label: 'Buscar', chevron: true, onClick: () => go('search') }),
      ]));
      main.appendChild(group([
        cell({ icon: 'bell', color: C.red, label: 'Notificaciones', chevron: true, onClick: () => go('notifications') }),
        cell({ icon: 'speaker', color: C.pink, label: 'Sonidos y vibraciones', chevron: true, onClick: () => go('sounds') }),
        cell({ icon: 'moon', color: C.indigo, label: 'Concentración', chevron: true, onClick: () => go('focus') }),
        cell({ icon: 'hourglass', color: C.indigo, label: 'Tiempo de uso', chevron: true, onClick: () => go('screentime') }),
      ]));
      main.appendChild(group([
        cell({ icon: 'faceid', color: C.green, label: 'Face ID y código', chevron: true, onClick: () => go('faceid') }),
        cell({ icon: 'hand', color: C.blue, label: 'Privacidad y seguridad', chevron: true, onClick: () => go('privacy') }),
        cell({ icon: 'battery', color: C.green, label: 'Batería', chevron: true, onClick: () => go('battery') }),
      ]));
      main.appendChild(group([
        cell({ icon: 'wallet', color: '#1c1c1e', label: 'Cartera y Apple Pay', chevron: true, onClick: () => OS.windows.open('wallet') }),
      ]));
      main.appendChild(h(`<div class="group-foot" style="margin-top:-10px;text-align:center">iOS 27 · recreación web no oficial</div>`));

      nav.push(home, false);

      /* ---------- Subpáginas ---------- */
      function sub(title, build, opts = {}) {
        const p = OS.ui.page({ title, back: () => nav.pop(), large: opts.large !== false });
        build(p, p.body);
        return p;
      }

      const PAGES = {
        wifi: () => sub('Wi‑Fi', (p, body) => {
          body.appendChild(h(`<div style="text-align:center;margin:0 30px 20px;color:var(--label2);font-size:14px;line-height:1.4"><div style="font-size:44px;color:var(--blue);margin-bottom:6px;display:inline-block">${OS.icon('wifi')}</div><br>Conéctate a Internet mediante Wi‑Fi y ve las redes disponibles.</div>`));
          const list = h('<div></div>');
          const render = () => {
            list.innerHTML = '';
            if (!S.get('wifi')) return;
            list.appendChild(group([cell({ label: wifiNet, check: true, right: h(`<span class="cell-value">${OS.icon('lock')}</span>`) })]));
            list.appendChild(group(NETWORKS.filter((n) => n.name !== wifiNet).map((n) => cell({
              label: n.name,
              right: h(`<span class="cell-value" style="display:flex;gap:8px;font-size:15px">${n.lock ? OS.icon('lock') : ''}${OS.icon('wifi')}</span>`),
              onClick: async () => {
                if (n.lock) {
                  const pw = await OS.ui.alert({ title: `Introduce la contraseña de «${n.name}»`, input: { placeholder: 'Contraseña' }, buttons: [{ label: 'Cancelar', cancel: true }, { label: 'Conectarse', primary: true }] });
                  if (pw == null) return;
                  if (pw.length < 8) { OS.ui.alert({ title: 'Contraseña incorrecta', message: 'La contraseña debe tener al menos 8 caracteres.' }); return; }
                }
                wifiNet = n.name;
                OS.util.store.set('wifiNet', wifiNet);
                render();
                home.dispatchEvent(new Event('refresh'));
              },
            })), { head: 'Otras redes' }));
          };
          body.appendChild(group([switchCell(p, { key: 'wifi', label: 'Wi‑Fi', after: render })]));
          body.appendChild(list);
          bind(p, 'wifi', render);
          render();
        }),

        bluetooth: () => sub('Bluetooth', (p, body) => {
          const list = h('<div></div>');
          const devs = [['AirPods Pro de Alex', 'Conectado'], ['Apple Watch', 'Conectado'], ['Altavoz de la cocina', 'No conectado'], ['Coche', 'No conectado']];
          const render = () => {
            list.innerHTML = '';
            if (!S.get('bluetooth')) return;
            list.appendChild(group(devs.map(([n, st]) => cell({ label: n, value: st, right: h(`<span class="cell-value" style="color:var(--tint);font-size:20px">${OS.icon('info')}</span>`) })), { head: 'Mis dispositivos' }));
          };
          body.appendChild(group([switchCell(p, { key: 'bluetooth', label: 'Bluetooth', after: render })], { foot: `Ahora visible como «${S.get('deviceName')}».` }));
          body.appendChild(list);
          bind(p, 'bluetooth', render);
          render();
        }),

        cellular: () => sub('Datos móviles', (p, body) => {
          body.appendChild(group([switchCell(p, { key: 'cellular', label: 'Datos móviles' }), cell({ label: 'Opciones', value: '5G automático', chevron: true })]));
          body.appendChild(group([cell({ label: 'Periodo actual', value: '12,4 GB' }), cell({ label: 'Itinerancia del periodo actual', value: '0 KB' })], { head: 'Datos móviles' }));
          body.appendChild(group([cell({ label: 'Movistar', sub: 'Principal', check: true }), cell({ label: 'Trabajo (eSIM)', sub: 'Secundaria · Novedad de iOS 27: dos números en un mismo iPhone' })], { head: 'SIM' }));
        }),

        hotspot: () => sub('Punto de acceso personal', (p, body) => {
          body.appendChild(group([cell({ label: 'Permitir a otros conectarse', right: toggle(S.get('hotspot'), (v) => S.set('hotspot', v)) }), cell({ label: 'Contraseña Wi‑Fi', value: 'sol-luna-27' })], { foot: 'Otros usuarios pueden buscar tu red compartida mediante Wi‑Fi y Bluetooth.' }));
        }),

        general: () => sub('General', (p, body) => {
          body.appendChild(group([
            cell({ label: 'Información', chevron: true, onClick: () => go('about', true) }),
            cell({ label: 'Actualización de software', chevron: true, onClick: () => go('update', true) }),
          ]));
          body.appendChild(group([
            cell({ label: 'Almacenamiento del iPhone', chevron: true, onClick: () => go('storage', true) }),
            cell({ label: 'Actualización en segundo plano', chevron: true }),
          ]));
          body.appendChild(group([
            cell({ label: 'Fecha y hora', chevron: true, onClick: () => go('datetime', true) }),
            cell({ label: 'Idioma y región', value: 'Español', chevron: true }),
            cell({ label: 'Teclado', chevron: true }),
          ]));
          body.appendChild(group([
            cell({ label: 'Transferir o restablecer el iPhone', chevron: true, onClick: () => go('reset', true) }),
            cell({ label: 'Apagar', cls: 'action', onClick: () => { OS.windows.goHome(); setTimeout(() => OS.hardware.powerOff(), 500); } }),
          ]));
        }),

        about: () => sub('Información', (p, body) => {
          const name = h(`<input class="cell-input" value="${esc(S.get('deviceName'))}" aria-label="Nombre">`);
          name.addEventListener('change', () => S.set('deviceName', name.value || 'iPhone'));
          const nameCell = cell({ label: 'Nombre' });
          nameCell.appendChild(name);
          body.appendChild(group([
            nameCell,
            cell({ label: 'Versión de iOS', value: '27.0' }),
            cell({ label: 'Nombre del modelo', value: 'iPhone 17 Pro' }),
            cell({ label: 'Número de modelo', value: 'MG8X4QL/A' }),
            cell({ label: 'Número de serie', value: 'F2LXQ27IOS0' }),
          ]));
          body.appendChild(group([
            cell({ label: 'Canciones', value: String(OS.music ? OS.music.count() : 8) }),
            cell({ label: 'Fotos', value: String(OS.photosLib ? OS.photosLib.count() : 24) }),
            cell({ label: 'Apps', value: String(OS.appList.length) }),
            cell({ label: 'Capacidad', value: '256 GB' }),
            cell({ label: 'Disponible', value: '171,3 GB' }),
          ]));
          body.appendChild(group([
            cell({ label: 'Navegador', value: navigator.userAgentData ? (navigator.userAgentData.brands.find((x) => !/Not/.test(x.brand)) || {}).brand || 'Web' : 'Web' }),
            cell({ label: 'Resolución', value: `${OS.W} × ${OS.H}` }),
          ], { head: 'Recreación' }));
        }),

        update: () => sub('Actualización de software', (p, body) => {
          body.appendChild(h(`<div style="text-align:center;padding:30px 30px 20px">
            <div style="width:84px;height:84px;margin:0 auto 14px;border-radius:20px;display:grid;place-items:center;font-size:34px;font-weight:800;color:#fff;background:linear-gradient(135deg,#6ee7ff,#7c5cff 50%,#ff5ca8);box-shadow:inset 0 1px 1px rgba(255,255,255,.6)">27</div>
            <b style="font-size:20px">iOS 27.0</b>
            <p style="color:var(--label2);font-size:15px;line-height:1.4;margin:8px 0 0">Tu software está actualizado.<br>Publicado el 14 de septiembre de 2026.</p></div>`));
          body.appendChild(group([cell({ label: 'Actualizaciones automáticas', value: 'Sí', chevron: true }), cell({ label: 'Actualizaciones beta', value: 'No', chevron: true })]));
          body.appendChild(group([cell({ label: 'iOS 27.2', sub: 'Próximamente: nueva app Salud con Apple Intelligence y Siri AI en más idiomas, incluido el español.' })], { head: 'Próximamente' }));
        }),

        storage: () => sub('Almacenamiento', (p, body) => {
          const parts = [['Apps', 38, C.red], ['Fotos', 22, C.orange], ['Mensajes', 9, C.green], ['iOS', 14, C.gray], ['Datos del sistema', 7, '#c7c7cc']];
          body.appendChild(h(`<div class="group" style="padding:16px">
            <div style="display:flex;justify-content:space-between;font-size:15px;margin-bottom:10px"><b>iPhone</b><span style="color:var(--label2)">84,7 GB de 256 GB usados</span></div>
            <div style="display:flex;height:22px;border-radius:6px;overflow:hidden;background:var(--fill2)">${parts.map(([, v, c]) => `<i style="width:${(v / 256) * 100 * 3}%;max-width:40%;background:${c}"></i>`).join('')}</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:10px;font-size:13px;color:var(--label2)">${parts.map(([n, , c]) => `<span style="display:flex;align-items:center;gap:5px"><i style="width:9px;height:9px;border-radius:50%;background:${c}"></i>${n}</span>`).join('')}</div></div>`));
          body.appendChild(group(OS.appList.slice(0, 10).map((a, i) => {
            const c = cell({ label: a.name, value: `${(9.8 / (i + 1)).toFixed(1).replace('.', ',')} GB` });
            c.insertBefore(h(`<span style="width:34px;height:34px;flex:none">${OS.iconHTML(a.id)}</span>`), c.firstChild);
            c.querySelector('.app-icon').style.cssText = 'width:34px;height:34px;border-radius:9px';
            return c;
          })));
        }),

        datetime: () => sub('Fecha y hora', (p, body) => {
          body.appendChild(group([cell({ label: 'Formato de 24 horas', right: toggle(true, () => {}) }), cell({ label: 'Ajuste automático', right: toggle(true, () => {}) }), cell({ label: 'Zona horaria', value: Intl.DateTimeFormat().resolvedOptions().timeZone })]));
          body.appendChild(group([cell({ label: fmt.lockDate(), value: fmt.time() })]));
        }),

        reset: () => sub('Restablecer', (p, body) => {
          body.appendChild(group([
            cell({ label: 'Restablecer pantalla de inicio', cls: 'action', onClick: async () => {
              const i = await OS.ui.alert({ title: 'Restablecer pantalla de inicio', message: 'La pantalla de inicio volverá a su disposición original.', buttons: [{ label: 'Cancelar' }, { label: 'Restablecer', destructive: true }] });
              if (i === 1) { OS.home.resetLayout(); OS.ui.toast('Pantalla de inicio restablecida', 'check'); }
            } }),
            cell({ label: 'Restablecer todos los ajustes', cls: 'destructive', onClick: async () => {
              const i = await OS.ui.alert({ title: '¿Restablecer todo?', message: 'Se borrarán ajustes, notas, mensajes, alarmas y fotos guardadas en esta recreación.', buttons: [{ label: 'Cancelar' }, { label: 'Restablecer', destructive: true }] });
              if (i === 1) S.reset();
            } }),
          ]));
        }),

        accessibility: () => sub('Accesibilidad', (p, body) => {
          const screen = document.getElementById('screen');
          const opt = (label, cls, sub2) => {
            const on = OS.util.store.get('a11y:' + cls, false);
            screen.classList.toggle(cls, on);
            return cell({ label, sub: sub2, right: toggle(on, (v) => { screen.classList.toggle(cls, v); OS.util.store.set('a11y:' + cls, v); }) });
          };
          body.appendChild(group([
            cell({ label: 'Reducir transparencia', sub: 'Hace que Liquid Glass sea opaco', right: toggle(S.get('glass') >= 1, (v) => S.set('glass', v ? 1 : 0.35)) }),
            opt('Texto en negrita', 'a11y-bold'),
            opt('Reducir movimiento', 'a11y-motion', 'Reduce las animaciones de la interfaz'),
            opt('Aumentar contraste', 'a11y-contrast'),
          ], { head: 'Visión' }));
        }),

        action: () => sub('Botón de acción', (p, body) => {
          const opts = [['flashlight', 'Linterna', 'flashlight'], ['siri', 'Siri', 'sparkles'], ['camera', 'Cámara', 'camera'], ['silent', 'Modo silencio', 'bellSlash']];
          const list = h('<div></div>');
          const render = () => {
            list.innerHTML = '';
            list.appendChild(group(opts.map(([v, l, ic]) => cell({ icon: ic, color: C.blue, label: l, check: S.get('actionButton') === v, onClick: () => { S.set('actionButton', v); render(); } })), { foot: 'Pulsa el botón de acción (lateral izquierdo, arriba) para usarlo.' }));
          };
          body.appendChild(list);
          render();
        }),

        camera: () => sub('Cámara', (p, body) => {
          body.appendChild(group([cell({ label: 'Controles sobre el visor', sub: 'Novedad de iOS 27: elige qué controles aparecen encima del encuadre', value: 'Flash, Live', chevron: true }), cell({ label: 'Cuadrícula', right: toggle(OS.util.store.get('camGrid', false), (v) => OS.util.store.set('camGrid', v)) }), cell({ label: 'Nivel', right: toggle(true, () => {}) })]));
        }),

        control: () => sub('Centro de control', (p, body) => {
          body.appendChild(group([cell({ label: 'Acceso desde apps', right: toggle(true, () => {}) })], { foot: 'Desliza hacia abajo desde la esquina superior derecha para abrir el Centro de control. En iOS 27 incluye información de la señal móvil.' }));
        }),

        display: () => sub('Pantalla y brillo', (p, body) => {
          const pick = h(`<div class="group" style="padding:18px 10px 14px;display:flex;justify-content:space-around">
            ${[['light', 'Claro', '#f2f2f7', '#fff'], ['dark', 'Oscuro', '#1c1c1e', '#2c2c2e']].map(([v, l, bg, fg]) => `
              <button class="theme-pick" data-v="${v}" style="display:flex;flex-direction:column;align-items:center;gap:8px">
                <div style="width:78px;height:156px;border-radius:14px;border:3px solid #000;background:${bg};padding:22px 8px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;align-content:start;box-shadow:0 2px 8px rgba(0,0,0,.15)">${('<i style="aspect-ratio:1;border-radius:5px;background:' + fg + '"></i>').repeat(9)}</div>
                <span style="font-size:15px">${l}</span><span class="radio" style="width:22px;height:22px;border-radius:50%;border:1.5px solid var(--label3);display:grid;place-items:center;color:#fff"></span></button>`).join('')}
          </div>`);
          const renderPick = () => pick.querySelectorAll('.theme-pick').forEach((b2) => {
            const on = (S.isDark() ? 'dark' : 'light') === b2.dataset.v;
            const r = b2.querySelector('.radio');
            r.style.background = on ? 'var(--tint)' : 'transparent';
            r.style.borderColor = on ? 'var(--tint)' : 'var(--label3)';
            r.innerHTML = on ? OS.icon('check') : '';
          });
          pick.addEventListener('click', (e) => {
            const b2 = e.target.closest('.theme-pick');
            if (b2) { S.set('theme', b2.dataset.v); renderPick(); autoT.set(false); }
          });
          renderPick();
          const autoT = toggle(S.get('theme') === 'auto', (v) => { S.set('theme', v ? 'auto' : (S.isDark() ? 'dark' : 'light')); renderPick(); });
          body.appendChild(h('<div class="group-head">Aspecto</div>'));
          body.appendChild(pick);
          pick.style.borderRadius = '26px 26px 0 0';
          pick.style.marginBottom = '0';
          const autoGroup = group([cell({ label: 'Automático', sub: 'Sigue el tema del sistema', right: autoT })]);
          autoGroup.querySelector('.group').style.borderRadius = '0 0 26px 26px';
          autoGroup.querySelector('.group').style.borderTop = '.5px solid var(--sep)';
          body.appendChild(autoGroup);
          const br = h(`<div class="slider-row">${OS.icon('sunSmall')}</div>`);
          const sl = slider(S.get('brightness'), (v) => S.set('brightness', Math.max(0.05, v)));
          br.appendChild(sl);
          br.appendChild(h(`<span style="font-size:22px;color:var(--label2)">${OS.icon('sun')}</span>`));
          bind(p, 'brightness', (v) => sl.set(v));
          body.appendChild(h('<div class="group-head">Brillo</div>'));
          const g = h('<div class="group"></div>');
          g.appendChild(br);
          body.appendChild(g);
          body.appendChild(group([
            switchCell(p, { key: 'aod', label: 'Pantalla siempre activa', sub: 'Muestra la pantalla bloqueada atenuada' }),
            cell({ label: 'Bloqueo automático', value: '30 segundos', chevron: true }),
          ]));
        }),

        homescreen: () => sub('Pantalla de inicio', (p, body) => {
          const styles = [['default', 'Por defecto'], ['dark', 'Oscuro'], ['clear', 'Transparente'], ['tinted', 'Tintado']];
          const tiles = h(`<div class="group icon-style-picker" style="padding:14px 8px;display:grid;grid-template-columns:repeat(4,1fr);gap:4px">${styles.map(([v, l]) => `
            <button data-v="${v}" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px 0;border-radius:18px">
              <div class="isp-prev" data-icons="${v}" style="position:relative;width:64px;height:64px;border-radius:16px;overflow:hidden;background:${OS.wallpapers.list[0].base}">
                <div style="position:absolute;inset:8px;display:grid;grid-template-columns:1fr 1fr;gap:5px">${['messages', 'photos', 'weather', 'music'].map((id) => OS.iconHTML(id)).join('')}</div>
              </div><span style="font-size:12px">${l}</span></button>`).join('')}</div>`);
          tiles.querySelectorAll('.isp-prev .app-icon').forEach((ic) => { ic.style.cssText += ';width:21px;height:21px;border-radius:6px;box-shadow:none'; });
          const renderTiles = () => tiles.querySelectorAll('button').forEach((bt) => { bt.style.background = bt.dataset.v === S.get('iconStyle') ? 'var(--fill2)' : 'transparent'; });
          tiles.addEventListener('click', (e) => {
            const bt = e.target.closest('button');
            if (bt) { S.set('iconStyle', bt.dataset.v); renderTiles(); hueRow.style.display = bt.dataset.v === 'tinted' ? '' : 'none'; }
          });
          renderTiles();
          body.appendChild(h('<div class="group-head">Aspecto de los iconos</div>'));
          body.appendChild(tiles);
          const hueRow = h('<div class="group" style="padding:14px 16px"></div>');
          const hueSl = slider(S.get('tintHue') / 360, (v) => S.set('tintHue', Math.round(v * 360)), { color: 'transparent' });
          hueSl.querySelector('.track').style.background = 'linear-gradient(90deg,hsl(0 80% 60%),hsl(60 80% 55%),hsl(120 70% 50%),hsl(180 80% 50%),hsl(240 80% 65%),hsl(300 80% 60%),hsl(360 80% 60%))';
          hueSl.querySelector('.track').style.height = '10px';
          hueSl.querySelector('.track').style.top = '11px';
          hueSl.querySelector('.track').style.borderRadius = '5px';
          hueRow.appendChild(h('<div style="font-size:13px;color:var(--label2);margin-bottom:4px">Color del tintado</div>'));
          hueRow.appendChild(hueSl);
          hueRow.style.display = S.get('iconStyle') === 'tinted' ? '' : 'none';
          body.appendChild(hueRow);
          body.appendChild(group([
            cell({ label: 'Editar pantalla de inicio', cls: 'action', onClick: () => { OS.windows.goHome(); setTimeout(() => OS.home.enterEdit(), 550); } }),
            cell({ label: 'Restablecer disposición', cls: 'action', onClick: () => { OS.home.resetLayout(); OS.ui.toast('Disposición restablecida', 'check'); } }),
          ], { foot: 'Consejo: mantén pulsado cualquier icono y arrástralo para reordenar.' }));
        }),

        glass: () => sub('Liquid Glass', (p, body) => {
          const prev = h(`<div class="group glass-preview" style="position:relative;height:230px;overflow:hidden;padding:0">
            <div class="gp-wp" style="position:absolute;inset:0"></div>
            <div style="position:absolute;left:18px;right:18px;top:20px;display:flex;justify-content:space-between">
              <span class="glass-btn round">${OS.icon('chevronLeft')}</span><span class="glass-btn">Editar</span></div>
            <div class="glass" style="position:absolute;left:18px;right:18px;top:80px;border-radius:24px;padding:12px 14px;display:flex;gap:10px;align-items:center">
              <div style="width:36px;height:36px">${OS.iconHTML('messages')}</div><div style="font-size:14px;line-height:1.3"><b>Lucía</b><br>¡Mira qué bien se ve el cristal! ✨</div></div>
            <div class="glass refract" style="position:absolute;left:40px;right:40px;bottom:18px;height:56px;border-radius:28px;display:flex;justify-content:space-around;align-items:center;font-size:22px">${OS.icon('photos')}${OS.icon('heart')}${OS.icon('search')}</div>
          </div>`);
          OS.wallpapers.apply(prev.querySelector('.gp-wp'), S.get('wallpaper'));
          prev.querySelectorAll('.app-icon').forEach((ic) => { ic.style.cssText += ';width:36px;height:36px;border-radius:10px'; });
          body.appendChild(prev);
          const seg = segmented([{ value: 'clear', label: 'Transparente' }, { value: 'mid', label: 'Equilibrado' }, { value: 'tinted', label: 'Tintado' }], S.get('glass') < 0.2 ? 'clear' : S.get('glass') > 0.75 ? 'tinted' : 'mid', (v) => {
            const val = v === 'clear' ? 0.05 : v === 'tinted' ? 0.9 : 0.35;
            S.set('glass', val);
            sl.set(val);
          });
          const g2 = h('<div class="group" style="padding-top:14px"></div>');
          g2.appendChild(seg);
          const row = h(`<div class="slider-row" style="padding-top:0">${OS.icon('droplet')}</div>`);
          const sl = slider(S.get('glass'), (v) => { S.set('glass', v); seg.set(v < 0.2 ? 'clear' : v > 0.75 ? 'tinted' : 'mid'); });
          row.appendChild(sl);
          row.appendChild(h(`<span style="font-size:20px;color:var(--label2)">${OS.icon('circleCheck')}</span>`));
          g2.appendChild(row);
          g2.appendChild(h('<div class="slider-labels"><span>Transparente</span><span>Tintado</span></div>'));
          body.appendChild(h('<div class="group-head">Translucidez</div>'));
          body.appendChild(g2);
          body.appendChild(h('<div class="group-foot">Novedad de iOS 27: elige cuánto se ve el fondo a través de los controles, menús y notificaciones. El modo tintado mejora la legibilidad.</div>'));
          body.appendChild(group([cell({ label: 'Refracción', sub: document.documentElement.classList.contains('refraction') ? 'Activa en este navegador' : 'Requiere un navegador basado en Chromium', value: document.documentElement.classList.contains('refraction') ? 'Sí' : 'No' })]));
        }),

        wallpaper: () => sub('Fondo de pantalla', (p, body) => {
          const cur = h(`<div class="group" style="padding:18px;display:flex;justify-content:center;gap:18px">
            <div class="wp-prev lockp" style="position:relative;width:118px;height:250px;border-radius:20px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,.2)"></div>
            <div class="wp-prev homep" style="position:relative;width:118px;height:250px;border-radius:20px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,.2)"></div></div>`);
          const renderCur = () => {
            const lockp = cur.querySelector('.lockp'), homep = cur.querySelector('.homep');
            OS.wallpapers.apply(lockp, S.get('wallpaper'));
            OS.wallpapers.apply(homep, S.get('wallpaper'));
            const compact = S.get('compactClock');
            lockp.insertAdjacentHTML('beforeend', `<div style="position:absolute;left:0;right:0;top:${compact ? 22 : 26}px;text-align:center;color:#fff;font-weight:600">${compact ? `<div style="font-size:9px">${fmt.lockDate().split(',')[0]} · <b>${fmt.clock()}</b></div>` : `<div style="font-size:8px;opacity:.9">${fmt.lockDate()}</div><div style="font-size:34px;font-weight:700;line-height:1">${fmt.clock()}</div>`}</div>`);
            homep.insertAdjacentHTML('beforeend', `<div style="position:absolute;inset:26px 10px;display:grid;grid-template-columns:repeat(4,1fr);gap:9px 6px;align-content:start">${'<i style="aspect-ratio:1;border-radius:6px;background:rgba(255,255,255,.55)"></i>'.repeat(16)}</div><div style="position:absolute;left:6px;right:6px;bottom:6px;height:30px;border-radius:12px;background:rgba(255,255,255,.3)"></div>`);
          };
          renderCur();
          body.appendChild(h('<div class="group-head">Actual</div>'));
          body.appendChild(cur);
          const wlist = OS.wallpapers.customSrc() ? [...OS.wallpapers.list, { id: 'custom', name: 'Tu foto' }] : OS.wallpapers.list;
          const grid = h(`<div class="group" style="padding:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px">${wlist.map((w) => `
            <button data-wp="${w.id}" style="display:flex;flex-direction:column;align-items:center;gap:6px"><div class="wpt" style="position:relative;width:100%;aspect-ratio:9/16;border-radius:14px;overflow:hidden"></div><span style="font-size:12px">${esc(w.name)}</span></button>`).join('')}</div>`);
          grid.querySelectorAll('[data-wp]').forEach((bt) => OS.wallpapers.apply(bt.querySelector('.wpt'), bt.dataset.wp));
          const renderSel = () => grid.querySelectorAll('[data-wp]').forEach((bt) => { bt.querySelector('.wpt').style.outline = bt.dataset.wp === S.get('wallpaper') ? '3px solid var(--tint)' : 'none'; bt.querySelector('.wpt').style.outlineOffset = '2px'; });
          renderSel();
          grid.addEventListener('click', (e) => { const bt = e.target.closest('[data-wp]'); if (bt) { S.set('wallpaper', bt.dataset.wp); renderSel(); renderCur(); } });
          body.appendChild(h('<div class="group-head">Colección</div>'));
          body.appendChild(grid);
          body.appendChild(h('<div class="group-foot" style="margin:-18px 32px 26px">Consejo: en Fotos, toca ✨ para extender una foto con Apple Intelligence y usarla como fondo.</div>'));
          body.appendChild(group([
            switchCell(p, { key: 'compactClock', label: 'Reloj compacto', sub: 'Novedad de iOS 27: la hora se muestra junto a la fecha', after: renderCur }),
          ], { head: 'Pantalla bloqueada' }));
          const clockSeg = segmented([{ value: 'glass', label: 'Cristal' }, { value: 'solid', label: 'Sólido' }], S.get('clockStyle'), (v) => S.set('clockStyle', v));
          const cg = h('<div class="group" style="padding-top:14px"></div>');
          cg.appendChild(clockSeg);
          body.appendChild(h('<div class="group-head">Estilo del reloj</div>'));
          body.appendChild(cg);
        }),

        siri: () => sub('Siri', (p, body) => {
          body.appendChild(h(`<div style="text-align:center;padding:4px 30px 22px"><div style="position:relative;width:80px;height:80px;margin:0 auto 10px">${OS.iconHTML('siri')}</div><b style="font-size:22px">Siri AI</b><p style="color:var(--label2);font-size:14px;line-height:1.4;margin:6px 0 0">Conversación natural, contexto personal y acciones en apps. Ahora con su propia app.</p></div>`));
          body.querySelector('.app-icon').style.cssText += ';width:80px;height:80px';
          body.appendChild(group([
            switchCell(p, { key: 'siriEnabled', label: 'Siri', sub: 'Botón lateral, tecla S o app Siri' }),
            switchCell(p, { key: 'siriVoice', label: 'Respuestas habladas' }),
            cell({ label: 'Idioma', value: 'Español (España)', chevron: true }),
            cell({ label: 'Voz de Siri', value: 'Voz 2', chevron: true }),
          ]));
          body.appendChild(group([
            cell({ label: 'Borrar historial de Siri', cls: 'destructive', onClick: () => { OS.siriHistory && OS.siriHistory.clear(); OS.ui.toast('Historial borrado', 'trash'); } }),
          ], { foot: 'En esta recreación, Siri funciona localmente en tu navegador: no se envía nada a ningún servidor.' }));
        }),

        search: () => sub('Buscar', (p, body) => {
          body.appendChild(group([cell({ label: 'Mostrar sugerencias', right: toggle(true, () => {}) }), cell({ label: 'Mostrar recientes', right: toggle(true, () => {}) })], { foot: 'Desliza hacia abajo en la pantalla de inicio o toca «Buscar» para abrir la búsqueda.' }));
        }),

        notifications: () => sub('Notificaciones', (p, body) => {
          body.appendChild(group([cell({ label: 'Mostrar previsualizaciones', value: 'Siempre', chevron: true }), cell({ label: 'Resúmenes de notificaciones', sub: 'Con Apple Intelligence', right: toggle(true, () => {}) })]));
          body.appendChild(group(['messages', 'mail', 'calendar', 'clock', 'reminders', 'weather'].map((id) => {
            const c = cell({ label: OS.appDefs[id].name, value: 'Avisos', chevron: true });
            c.insertBefore(h(`<span style="width:30px;height:30px;flex:none">${OS.iconHTML(id)}</span>`), c.firstChild);
            c.querySelector('.app-icon').style.cssText += ';width:30px;height:30px;border-radius:8px';
            return c;
          }), { head: 'Estilo de notificación' }));
          body.appendChild(group([cell({ label: 'Enviar notificación de prueba', cls: 'action', onClick: () => { OS.notify({ app: 'settings', title: 'Prueba', body: 'Así se ve una notificación en iOS 27.' }); } })]));
        }),

        sounds: () => sub('Sonidos y vibraciones', (p, body) => {
          const row = h(`<div class="slider-row">${OS.icon('speakerLow')}</div>`);
          const sl = slider(S.get('volume'), (v) => S.set('volume', Math.round(v * 100) / 100), { onEnd: () => OS.audio.notify() });
          row.appendChild(sl);
          row.appendChild(h(`<span style="font-size:20px;color:var(--label2)">${OS.icon('speaker')}</span>`));
          bind(p, 'volume', (v) => sl.set(v));
          body.appendChild(h('<div class="group-head">Tono y avisos</div>'));
          const g = h('<div class="group"></div>');
          g.appendChild(row);
          body.appendChild(g);
          body.appendChild(group([switchCell(p, { key: 'silent', label: 'Modo silencio' }), cell({ label: 'Tono de llamada', value: 'Reflexión', chevron: true }), cell({ label: 'Tono de mensaje', value: 'Nota', chevron: true })]));
        }),

        focus: () => sub('Concentración', (p, body) => {
          body.appendChild(group([
            switchCell(p, { key: 'focus', icon: 'moon', color: C.indigo, label: 'No molestar' }),
            cell({ icon: 'person', color: C.cyan, label: 'Personal', chevron: true }),
            cell({ icon: 'bed' in OS.glyphs ? 'bed' : 'moon', color: C.orange, label: 'Descanso', chevron: true }),
            cell({ icon: 'briefcase' in OS.glyphs ? 'briefcase' : 'grid', color: C.blue, label: 'Trabajo', chevron: true }),
          ], { foot: 'Con No molestar activado no se mostrarán avisos ni sonarán las notificaciones.' }));
        }),

        screentime: () => sub('Tiempo de uso', (p, body) => {
          const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
          const vals = [3.2, 4.1, 2.6, 5.0, 3.8, 6.2, 4.4];
          body.appendChild(h(`<div class="group" style="padding:16px">
            <div style="font-size:13px;color:var(--label2)">Media diaria</div><div style="font-size:28px;font-weight:700">4 h 11 min</div>
            <div style="display:flex;align-items:flex-end;gap:10px;height:120px;margin-top:14px">${vals.map((v, i) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px"><i style="width:100%;height:${v * 16}px;border-radius:5px;background:linear-gradient(180deg,#5e5ce6,#0a84ff)"></i><span style="font-size:11px;color:var(--label2)">${days[i]}</span></div>`).join('')}</div></div>`));
          body.appendChild(group([cell({ label: 'Límites de uso de apps', chevron: true }), cell({ label: 'Controles parentales', sub: 'Novedad de iOS 27: más opciones para cuentas infantiles', chevron: true })]));
        }),

        faceid: () => sub('Face ID y código', (p, body) => {
          body.appendChild(group([cell({ label: 'Desbloqueo del iPhone', right: toggle(true, () => {}) }), cell({ label: 'Apple Pay', right: toggle(true, () => {}) }), cell({ label: 'Autorrelleno de contraseñas', right: toggle(true, () => {}) })], { head: 'Usar Face ID para' }));
          body.appendChild(group([cell({ label: 'Configurar otro aspecto', cls: 'action' }), cell({ label: 'Desactivar código', cls: 'action' })]));
        }),

        privacy: () => sub('Privacidad y seguridad', (p, body) => {
          body.appendChild(group(['Localización', 'Seguimiento', 'Contactos', 'Calendarios', 'Fotos', 'Micrófono', 'Cámara'].map((l) => cell({ label: l, chevron: true }))));
          body.appendChild(group([cell({ label: 'Comprobación de seguridad', chevron: true }), cell({ label: 'Modo de aislamiento', value: 'No', chevron: true })]));
        }),

        battery: () => sub('Batería', (p, body) => {
          const bt = S.get('battery');
          const hours = Array.from({ length: 24 }, (_, i) => 30 + 50 * Math.abs(Math.sin(i / 3.5)) * (i < 8 ? 0.3 : 1));
          body.appendChild(h(`<div class="group" style="padding:16px">
            <div style="display:flex;align-items:baseline;gap:8px"><span style="font-size:34px;font-weight:700">${Math.round(bt.level * 100)} %</span><span style="color:var(--label2);font-size:14px">${bt.charging ? 'Cargando' : 'Última carga completa: hace 6 h'}</span></div>
            <div style="display:flex;align-items:flex-end;gap:3px;height:90px;margin-top:12px">${hours.map((v) => `<i style="flex:1;height:${v}%;border-radius:2px;background:${S.get('lowPower') ? '#ffcc00' : '#34c759'}"></i>`).join('')}</div>
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--label2);margin-top:4px"><span>0 h</span><span>6 h</span><span>12 h</span><span>18 h</span></div></div>`));
          body.appendChild(group([
            switchCell(p, { key: 'batteryPercent', label: 'Porcentaje de batería' }),
            switchCell(p, { key: 'lowPower', label: 'Modo de bajo consumo', sub: 'Reduce la actividad en segundo plano temporalmente' }),
          ]));
          body.appendChild(group([cell({ label: 'Estado de la batería', value: '100 %', chevron: true }), cell({ label: 'Carga optimizada', value: 'Sí', chevron: true })]));
        }),
      };

      function go(path, keep = false) {
        if (!PAGES[path]) return;
        if (!keep) nav.popToRoot();
        nav.push(PAGES[path]());
      }

      OS.settingsApp = { go };
      return {
        statusStyle: 'auto',
        onShow(fresh) { if (!fresh) refreshConn(); },
      };
    },
  });
})();
