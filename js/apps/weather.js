/* Tiempo: previsión simulada + datos reales de Open‑Meteo al abrir la app (si hay conexión). */
(function () {
  'use strict';

  const { h, esc, seeded, fmt } = OS.util;

  const CITY = { name: 'Madrid', lat: 40.4168, lon: -3.7038 };
  const COND = {
    sun: { label: 'Despejado', icon: 'sun', bg: 'sunny' },
    cloudSun: { label: 'Parcialmente nublado', icon: 'cloudSun', bg: 'partly' },
    cloud: { label: 'Nublado', icon: 'cloud', bg: 'cloudy' },
    rain: { label: 'Lluvia', icon: 'rain', bg: 'rainy' },
  };

  /* ---------- Datos simulados deterministas ---------- */
  function mock() {
    const d = new Date();
    const rnd = seeded(d.getFullYear() * 1000 + d.getMonth() * 40 + d.getDate());
    const month = d.getMonth();
    const baseHi = [11, 13, 17, 19, 24, 30, 33, 33, 27, 20, 14, 11][month];
    const baseLo = [2, 3, 6, 8, 12, 17, 20, 20, 15, 11, 6, 3][month];
    const pick = () => { const r = rnd(); return r < 0.45 ? 'sun' : r < 0.75 ? 'cloudSun' : r < 0.9 ? 'cloud' : 'rain'; };
    const daily = Array.from({ length: 10 }, (_, i) => {
      const c = pick();
      const hi = Math.round(baseHi + (rnd() - 0.5) * 6 - (c === 'rain' ? 3 : 0));
      const lo = Math.round(baseLo + (rnd() - 0.5) * 4);
      return { date: new Date(Date.now() + i * 86400e3), cond: c, hi, lo, rain: c === 'rain' ? 60 + Math.round(rnd() * 30) : c === 'cloud' ? Math.round(rnd() * 30) : 0 };
    });
    const today = daily[0];
    const hourly = Array.from({ length: 25 }, (_, i) => {
      const hr = (d.getHours() + i) % 24;
      const k = Math.sin(((hr - 9) / 24) * Math.PI * 2);
      const t = Math.round(today.lo + (today.hi - today.lo) * (0.5 + 0.5 * k));
      const night = hr < 7 || hr > 20;
      return { hour: hr, temp: t, cond: night && today.cond === 'sun' ? 'moon' : today.cond };
    });
    return {
      source: 'simulado',
      city: CITY.name,
      temp: hourly[0].temp,
      cond: today.cond,
      hi: today.hi,
      lo: today.lo,
      feels: hourly[0].temp + (today.cond === 'sun' ? 2 : -1),
      humidity: 35 + Math.round(rnd() * 40),
      wind: 6 + Math.round(rnd() * 18),
      uv: today.cond === 'sun' ? 6 : 3,
      rainChance: today.rain,
      visibility: 10 + Math.round(rnd() * 20),
      pressure: 1008 + Math.round(rnd() * 16),
      sunrise: '07:59',
      sunset: '20:09',
      hourly,
      daily,
    };
  }

  let data = mock();

  function wmo(code) {
    if (code === 0 || code === 1) return 'sun';
    if (code === 2) return 'cloudSun';
    if (code === 3 || code === 45 || code === 48) return 'cloud';
    if (code >= 51) return 'rain';
    return 'cloudSun';
  }

  let fetched = false;
  async function fetchReal() {
    if (fetched) return;
    fetched = true;
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 5000);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${CITY.lat}&longitude=${CITY.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,surface_pressure,is_day&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset&timezone=auto&forecast_days=10`;
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(to);
      if (!res.ok) throw new Error(res.status);
      const j = await res.json();
      const now = new Date();
      const startIdx = Math.max(0, j.hourly.time.findIndex((t) => new Date(t).getHours() === now.getHours() && new Date(t).getDate() === now.getDate()));
      data = {
        source: 'Open‑Meteo',
        city: CITY.name,
        temp: Math.round(j.current.temperature_2m),
        cond: wmo(j.current.weather_code),
        hi: Math.round(j.daily.temperature_2m_max[0]),
        lo: Math.round(j.daily.temperature_2m_min[0]),
        feels: Math.round(j.current.apparent_temperature),
        humidity: Math.round(j.current.relative_humidity_2m),
        wind: Math.round(j.current.wind_speed_10m),
        uv: Math.round(j.daily.uv_index_max[0] || 0),
        rainChance: j.daily.precipitation_probability_max[0] || 0,
        visibility: 20,
        pressure: Math.round(j.current.surface_pressure),
        sunrise: (j.daily.sunrise[0] || '').slice(11, 16),
        sunset: (j.daily.sunset[0] || '').slice(11, 16),
        hourly: j.hourly.time.slice(startIdx, startIdx + 25).map((t, i) => {
          const hr = new Date(t).getHours();
          const c = wmo(j.hourly.weather_code[startIdx + i]);
          return { hour: hr, temp: Math.round(j.hourly.temperature_2m[startIdx + i]), cond: (hr < 7 || hr > 20) && c === 'sun' ? 'moon' : c };
        }),
        daily: j.daily.time.map((t, i) => ({ date: new Date(t + 'T12:00'), cond: wmo(j.daily.weather_code[i]), hi: Math.round(j.daily.temperature_2m_max[i]), lo: Math.round(j.daily.temperature_2m_min[i]), rain: j.daily.precipitation_probability_max[i] || 0 })),
      };
      OS.bus.emit('weather');
    } catch (e) {
      /* Sin conexión: seguimos con los datos simulados */
    }
  }

  OS.weatherNow = () => ({ city: data.city, temp: data.temp, cond: COND[data.cond].label, icon: COND[data.cond].icon, hi: data.hi, lo: data.lo, rainChance: data.rainChance });

  const iconFor = (c) => (c === 'moon' ? 'moon' : COND[c] ? COND[c].icon : 'sun');
  const colorFor = (c) => (c === 'sun' ? '#ffd60a' : c === 'moon' ? '#fff' : c === 'rain' ? '#7fd3ff' : '#fff');

  function sentence() {
    const c = COND[data.cond].label.toLowerCase();
    const later = data.hourly.find((x, i) => i > 2 && x.cond !== data.hourly[0].cond);
    return later ? `${COND[data.cond].label} ahora. Se espera ${COND[later.cond] ? COND[later.cond].label.toLowerCase() : 'cielo despejado'} hacia las ${later.hour}:00. Ráfagas de hasta ${data.wind + 8} km/h.`
      : `Condiciones de ${c} durante el resto del día. Ráfagas de viento de hasta ${data.wind + 8} km/h.`;
  }

  OS.registerApp('weather', {
    create(root) {
      root.classList.add('weather-app');

      function render() {
        const night = new Date().getHours() < 7 || new Date().getHours() > 20;
        root.dataset.sky = night ? 'night' : COND[data.cond].bg;
        const allLo = Math.min(...data.daily.map((d) => d.lo)), allHi = Math.max(...data.daily.map((d) => d.hi));
        const span = Math.max(1, allHi - allLo);
        root.innerHTML = `
          <div class="wx-sky"><i class="wx-sun"></i><i class="wx-cloud c1"></i><i class="wx-cloud c2"></i><i class="wx-cloud c3"></i><div class="wx-rain"></div><div class="wx-stars"></div></div>
          <div class="wx-scroll">
            <header class="wx-head">
              <small>MI UBICACIÓN</small>
              <h1>${esc(data.city)}</h1>
              <div class="wx-temp">${data.temp}°</div>
              <div class="wx-cond">${COND[data.cond].label}</div>
              <div class="wx-hl">Máx.: ${data.hi}° Mín.: ${data.lo}°</div>
            </header>
            <section class="wx-card glass-clear">
              <p class="wx-sum">${esc(sentence())}</p>
              <div class="wx-hours">${data.hourly.map((x, i) => `<div class="wx-h"><span>${i === 0 ? 'Ahora' : String(x.hour).padStart(2, '0')}</span><span class="wi" style="color:${colorFor(x.cond)}">${OS.icon(iconFor(x.cond))}</span><b>${x.temp}°</b></div>`).join('')}</div>
            </section>
            <section class="wx-card glass-clear">
              <h3>${OS.icon('calendar')} PREVISIÓN PARA 10 DÍAS</h3>
              ${data.daily.map((d, i) => `<div class="wx-day">
                <b>${i === 0 ? 'Hoy' : fmt.weekday(d.date, 'short').replace('.', '')}</b>
                <span class="wi" style="color:${colorFor(d.cond)}">${OS.icon(iconFor(d.cond))}${d.rain >= 30 ? `<em>${d.rain}%</em>` : ''}</span>
                <span class="lo">${d.lo}°</span>
                <span class="bar"><i style="left:${((d.lo - allLo) / span) * 100}%;right:${100 - ((d.hi - allLo) / span) * 100}%"></i>${i === 0 ? `<u style="left:${((data.temp - allLo) / span) * 100}%"></u>` : ''}</span>
                <span class="hi">${d.hi}°</span></div>`).join('')}
            </section>
            <div class="wx-grid">
              ${tile('thermometer', 'SENSACIÓN', data.feels + '°', data.feels > data.temp ? 'La humedad hace que parezca más calor.' : 'Parecida a la temperatura real.')}
              ${tile('drop', 'HUMEDAD', data.humidity + ' %', `El punto de rocío es ${Math.round(data.temp - (100 - data.humidity) / 5)}° ahora.`)}
              ${tile('wind', 'VIENTO', data.wind + ' km/h', `Rachas de ${data.wind + 8} km/h.`)}
              ${tile('sun', 'ÍNDICE UV', String(data.uv), data.uv >= 6 ? 'Alto. Usa protección solar.' : 'Moderado durante el resto del día.')}
              ${tile('rain', 'PRECIPITACIÓN', data.rainChance + ' %', 'Probabilidad para hoy.')}
              ${tile('sunSmall', 'AMANECER', data.sunrise, `Puesta de sol: ${data.sunset}`)}
            </div>
            <p class="wx-src">Datos: ${esc(data.source)} · ${esc(data.city)}</p>
          </div>
          <div class="toolbar wx-bar"><button class="glass-btn round glass-clear" data-map aria-label="Mapa">${OS.icon('location')}</button><span class="wx-dots"><i class="on"></i><i></i><i></i></span><button class="glass-btn round glass-clear" data-list aria-label="Ciudades">${OS.icon('list')}</button></div>`;
        root.querySelector('.wx-rain').innerHTML = Array.from({ length: 40 }, (_, i) => `<i style="left:${(i * 37) % 100}%;animation-delay:${(i % 10) * -0.13}s;animation-duration:${0.6 + (i % 5) * 0.08}s"></i>`).join('');
        root.querySelector('.wx-stars').innerHTML = Array.from({ length: 40 }, (_, i) => `<i style="left:${(i * 53) % 100}%;top:${(i * 29) % 60}%;animation-delay:${(i % 7) * -0.4}s"></i>`).join('');
        const scroll = root.querySelector('.wx-scroll');
        const head = root.querySelector('.wx-head');
        scroll.addEventListener('scroll', () => {
          const y = scroll.scrollTop;
          head.style.opacity = String(Math.max(0, 1 - y / 180));
          head.style.transform = `translateY(${y * 0.4}px)`;
        }, { passive: true });
        root.querySelector('[data-map]').addEventListener('click', () => OS.windows.open('maps'));
        root.querySelector('[data-list]').addEventListener('click', () => OS.ui.toast('Madrid · Mi ubicación', 'location'));
      }

      function tile(icon, label, value, note) {
        return `<div class="wx-tile glass-clear"><h3>${OS.icon(icon)} ${label}</h3><b>${value}</b><p>${esc(note)}</p></div>`;
      }

      render();
      const off = OS.bus.on('weather', render);
      return {
        statusStyle: 'light',
        onShow() { fetchReal(); },
        onDestroy() { off(); },
      };
    },
  });
})();
