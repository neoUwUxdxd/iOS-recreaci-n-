/* Calculadora con expresión visible y prioridad de operadores (como en iOS 18+). */
(function () {
  'use strict';

  const { h, calc, fmt, pt } = OS.util;

  const KEYS = [
    ['back', 'fn'], ['neg', 'fn'], ['%', 'fn'], ['÷', 'op'],
    ['7', 'num'], ['8', 'num'], ['9', 'num'], ['×', 'op'],
    ['4', 'num'], ['5', 'num'], ['6', 'num'], ['−', 'op'],
    ['1', 'num'], ['2', 'num'], ['3', 'num'], ['+', 'op'],
    ['mode', 'fn2'], ['0', 'num'], [',', 'num'], ['=', 'op eq'],
  ];

  OS.registerApp('calculator', {
    create(root) {
      root.classList.add('calc');
      root.innerHTML = `
        <div class="calc-display">
          <div class="calc-hist"></div>
          <div class="calc-main">0</div>
        </div>
        <div class="calc-keys">${KEYS.map(([k, t]) => `<button class="ck ${t}" data-k="${k}" aria-label="${k}">${label(k)}</button>`).join('')}</div>`;

      const $hist = root.querySelector('.calc-hist');
      const $main = root.querySelector('.calc-main');
      const $back = root.querySelector('[data-k="back"]');

      let expr = '';
      let done = false;
      let result = null;
      let activeOp = null;

      function label(k) {
        if (k === 'back') return 'AC';
        if (k === 'neg') return '<span style="font-size:.8em">+/−</span>';
        if (k === 'mode') return OS.icon('calculator');
        return k;
      }

      const isOp = (c) => '+−×÷'.includes(c);
      const toCalc = (s) => s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/,/g, '.');
      const fromNum = (v) => String(v).replace('-', '−').replace('.', ',');

      function pretty(s) {
        // Agrupa miles en cada número para mostrarlo
        return s.replace(/\d+/g, (m, off, str) => (str[off - 1] === ',' ? m : m.length > 3 ? Number(m).toLocaleString('es-ES') : m));
      }

      function render() {
        let text;
        if (done && result != null) {
          $hist.textContent = pretty(expr);
          text = isFinite(result) ? fmt.number(result, 10) : 'Error';
        } else {
          $hist.textContent = '';
          text = expr ? pretty(expr) : '0';
        }
        $main.textContent = text;
        const len = text.length;
        $main.style.fontSize = (len <= 6 ? 88 : len <= 8 ? 72 : len <= 11 ? 56 : len <= 15 ? 42 : 32) + 'px';
        $back.innerHTML = !expr || done ? 'AC' : OS.icon('arrowLeft');
        root.querySelectorAll('.ck.op').forEach((b) => b.classList.toggle('active', b.dataset.k === activeOp));
      }

      function lastNumber() {
        const m = /(\(−)?(\d+(?:,\d*)?%?)\)?$/.exec(expr);
        return m;
      }

      function press(k) {
        OS.audio.tick();
        activeOp = null;
        if (/^\d$/.test(k)) {
          if (done) { expr = ''; done = false; }
          const ln = lastNumber();
          if (ln && ln[2].replace(/\D/g, '').length >= 15) return;
          if (ln && ln[2] === '0' && !ln[1]) expr = expr.slice(0, -1);
          if (/%\)?$/.test(expr)) expr += '×';
          expr += k;
        } else if (k === ',') {
          if (done) { expr = ''; done = false; }
          const ln = lastNumber();
          if (ln && ln[2].includes(',')) return;
          if (!expr || isOp(expr.slice(-1))) expr += '0';
          expr += ',';
        } else if (isOp(k)) {
          if (done) { expr = fromNum(result); done = false; }
          if (!expr) expr = '0';
          if (isOp(expr.slice(-1))) expr = expr.slice(0, -1);
          if (expr.endsWith(',')) expr = expr.slice(0, -1);
          expr += k;
          activeOp = k;
        } else if (k === '=') {
          if (!expr || done) return;
          let e = expr;
          while (e && (isOp(e.slice(-1)) || e.endsWith(','))) e = e.slice(0, -1);
          try { result = calc(toCalc(e)); } catch (err) { result = NaN; }
          expr = e;
          done = true;
        } else if (k === '%') {
          if (done) { expr = fromNum(result); done = false; }
          if (expr && /\d$/.test(expr)) expr += '%';
        } else if (k === 'neg') {
          if (done) { expr = fromNum(result); done = false; }
          const m = /(\(−(\d+(?:,\d*)?%?)\)|(\d+(?:,\d*)?%?))$/.exec(expr);
          if (m) {
            const start = expr.length - m[0].length;
            if (m[2] != null) expr = expr.slice(0, start) + m[2];
            else if (start === 0 && expr.startsWith('−')) expr = expr.slice(1);
            else if (start === 1 && expr[0] === '−') expr = expr.slice(1);
            else expr = expr.slice(0, start) + (start === 0 ? '−' + m[3] : `(−${m[3]})`);
          } else if (!expr) expr = '−';
        } else if (k === 'back') {
          if (!expr || done) { expr = ''; result = null; done = false; }
          else expr = expr.slice(0, -1);
        } else if (k === 'mode') {
          OS.ui.toast('Modo científico: gira el iPhone', 'rotate');
        }
        render();
      }

      root.querySelector('.calc-keys').addEventListener('click', (e) => {
        const b = e.target.closest('.ck');
        if (b) press(b.dataset.k);
      });

      // Deslizar sobre la pantalla para borrar el último dígito
      const disp = root.querySelector('.calc-display');
      disp.addEventListener('pointerdown', (e) => {
        const x0 = pt(e).x;
        const up = (ev) => {
          disp.removeEventListener('pointerup', up);
          if (Math.abs(pt(ev).x - x0) > 40 && expr && !done) press('back');
        };
        disp.addEventListener('pointerup', up);
      });

      // Teclado físico mientras la app está visible
      const onKey = (e) => {
        if (OS.sys.current !== 'calculator' || OS.sys.switcher || OS.sys.siriOpen || OS.sys.ccOpen) return;
        const map = { '*': '×', x: '×', '/': '÷', '-': '−', '+': '+', Enter: '=', '=': '=', Backspace: 'back', '.': ',', ',': ',', '%': '%', Delete: 'back' };
        const k = /^\d$/.test(e.key) ? e.key : map[e.key];
        if (k) { e.preventDefault(); e.stopPropagation(); press(k); }
      };
      window.addEventListener('keydown', onKey, true);

      render();
      return { statusStyle: 'light', onDestroy() { window.removeEventListener('keydown', onKey, true); } };
    },
  });
})();
