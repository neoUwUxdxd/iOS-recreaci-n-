/* App genérica para las apps que no están recreadas por completo. */
(function () {
  'use strict';

  const { esc } = OS.util;

  const BLURBS = {
    health: 'En iOS 27.2 llegará una app Salud rediseñada con información de salud generada por Apple Intelligence.',
    wallet: 'Tus tarjetas, pases y llaves digitales, siempre a mano.',
    files: 'Accede a los archivos de tu iPhone, iCloud Drive y otros servicios.',
    podcasts: 'Descubre y escucha tus programas favoritos.',
    home: 'Controla los accesorios de tu casa desde un único lugar.',
    books: 'Tu biblioteca de libros y audiolibros.',
    fitness: 'Cierra tus anillos cada día.',
    translate: 'Traduce conversaciones y texto al instante.',
    mail: 'Tu bandeja de entrada, organizada por categorías.',
  };

  OS.registerApp('placeholder', {
    create(root, ctx) {
      const def = ctx.def;
      root.classList.add('grouped');
      root.innerHTML = `
        <div class="empty-state" style="height:100%;gap:14px">
          <div style="width:110px;height:110px">${OS.iconHTML(def.id).replace('class="app-icon ', 'class="app-icon big ')}</div>
          <b style="font-size:28px;margin-top:6px">${esc(def.name)}</b>
          <span style="max-width:290px;line-height:1.4">${esc(BLURBS[def.id] || 'Esta app forma parte de iOS 27.')}</span>
          <span style="font-size:13px;margin-top:8px">Esta app no está recreada en la versión web.</span>
          <button class="btn" style="margin-top:18px" data-home>Volver a inicio</button>
        </div>`;
      const icon = root.querySelector('.app-icon');
      icon.style.width = '110px';
      icon.style.height = '110px';
      root.querySelector('[data-home]').addEventListener('click', () => ctx.close());
      return { statusStyle: 'auto' };
    },
  });
})();
