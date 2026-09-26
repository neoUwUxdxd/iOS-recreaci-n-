/* Iconografía: glifos de interfaz (24×24) dibujados a mano para esta recreación. */
(function () {
  'use strict';

  /** Envuelve trazos en un grupo con estilo de línea. */
  const S = (inner, w = 2) => `<g fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`;

  /** Genera la silueta de un engranaje. */
  function gearPath(cx, cy, ro, ri, teeth, hole) {
    const pts = [];
    const step = (Math.PI * 2) / teeth;
    for (let i = 0; i < teeth; i++) {
      const a = i * step - Math.PI / 2;
      const w = step * 0.26;
      pts.push([a - step / 2 + w * 0.2, ri], [a - w, ro], [a + w, ro], [a + step / 2 - w * 0.2, ri]);
    }
    let d = pts.map(([a, r], i) => `${i ? 'L' : 'M'}${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`).join('') + 'Z';
    if (hole) d += `M${cx + hole} ${cy}a${hole} ${hole} 0 1 0 ${-hole * 2} 0a${hole} ${hole} 0 1 0 ${hole * 2} 0Z`;
    return d;
  }

  const G = {
    chevronRight: S('<path d="M9 5l7 7-7 7"/>', 2.6),
    chevronLeft: S('<path d="M15 5l-7 7 7 7"/>', 2.6),
    chevronDown: S('<path d="M5 9l7 7 7-7"/>', 2.6),
    chevronUp: S('<path d="M5 15l7-7 7 7"/>', 2.6),
    close: S('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>', 2.4),
    plus: S('<path d="M12 5v14M5 12h14"/>', 2.4),
    minus: S('<path d="M5 12h14"/>', 2.6),
    check: S('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 2.6),
    search: S('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20.5 20.5"/>', 2.4),
    airplane: '<path d="M12 2.4c.9 0 1.5.8 1.5 1.9v5.3l7.7 4.5v2.1l-7.7-2.3v4.7l2.2 1.6v1.7L12 21l-3.7 1v-1.7l2.2-1.6v-4.7L2.8 16.2v-2.1l7.7-4.5V4.3c0-1.1.6-1.9 1.5-1.9z"/>',
    wifi: S('<path d="M2.6 9.2a13.6 13.6 0 0 1 18.8 0"/><path d="M5.9 12.6a8.9 8.9 0 0 1 12.2 0"/><path d="M9.2 16a4.2 4.2 0 0 1 5.6 0"/>', 2.3) + '<circle cx="12" cy="19.3" r="1.7"/>',
    bluetooth: S('<path d="M7 7.5l10 9-5 4.5V3l5 4.5-10 9"/>', 2.1),
    antenna: '<rect x="3" y="15" width="3.4" height="6" rx="1"/><rect x="8" y="11.5" width="3.4" height="9.5" rx="1"/><rect x="13" y="8" width="3.4" height="13" rx="1"/><rect x="18" y="4" width="3.4" height="17" rx="1"/>',
    link: S('<rect x="2.5" y="8.5" width="11" height="7" rx="3.5"/><rect x="10.5" y="8.5" width="11" height="7" rx="3.5"/>', 2.1),
    gear: `<path fill-rule="evenodd" d="${gearPath(12, 12, 10, 7.6, 10, 3.2)}"/>`,
    accessibility: '<circle cx="12" cy="4.4" r="2"/>' + S('<path d="M4.5 8.5l7.5 1.6 7.5-1.6M12 10.1v5M12 15l-3.6 6M12 15l3.6 6"/>', 2.2),
    sun: '<circle cx="12" cy="12" r="4.4"/>' + S('<path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>', 2),
    sunSmall: '<circle cx="12" cy="12" r="3.6"/>' + S('<path d="M12 4v1.6M12 18.4V20M4 12h1.6M18.4 12H20M6.3 6.3l1.1 1.1M16.6 16.6l1.1 1.1M6.3 17.7l1.1-1.1M16.6 7.4l1.1-1.1"/>', 1.8),
    moon: '<path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1z"/>',
    sparkle: '<path d="M12 2l2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3z"/>',
    sparkles: '<path d="M10 3l1.9 5.6L17.5 10.5l-5.6 1.9L10 18l-1.9-5.6L2.5 10.5l5.6-1.9z"/><path d="M18.5 13.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z"/>',
    grid: '<rect x="3.5" y="3.5" width="7.3" height="7.3" rx="2"/><rect x="13.2" y="3.5" width="7.3" height="7.3" rx="2"/><rect x="3.5" y="13.2" width="7.3" height="7.3" rx="2"/><rect x="13.2" y="13.2" width="7.3" height="7.3" rx="2"/>',
    droplet: '<path d="M12 2.5s6.6 7.1 6.6 11.7a6.6 6.6 0 0 1-13.2 0C5.4 9.6 12 2.5 12 2.5z"/>',
    speaker: '<path d="M3.5 9h3.7L12 4.8v14.4L7.2 15H3.5z"/>' + S('<path d="M15.5 8.6a4.8 4.8 0 0 1 0 6.8M18.2 6a8.6 8.6 0 0 1 0 12"/>', 2),
    speakerLow: '<path d="M5.5 9h3.7L14 4.8v14.4L9.2 15H5.5z"/>',
    speakerMute: '<path d="M3.5 9h3.7L12 4.8v14.4L7.2 15H3.5z"/>' + S('<path d="M15.5 9.5l5 5M20.5 9.5l-5 5"/>', 2),
    bell: '<path d="M12 2.8a5.6 5.6 0 0 0-5.6 5.6v4.2L4.3 16v1.2h15.4V16l-2.1-3.4V8.4A5.6 5.6 0 0 0 12 2.8zM9.6 18.6a2.4 2.4 0 0 0 4.8 0z"/>',
    bellSlash: '<path d="M12 2.8a5.6 5.6 0 0 0-5.6 5.6v4.2L4.3 16v1.2h15.4V16l-2.1-3.4V8.4A5.6 5.6 0 0 0 12 2.8zM9.6 18.6a2.4 2.4 0 0 0 4.8 0z"/>' + S('<path d="M3.5 3.5l17 17"/>', 2.2),
    hourglass: S('<path d="M6 3h12M6 21h12M7.2 3c0 5 4.8 6.2 4.8 9s-4.8 4-4.8 9M16.8 3c0 5-4.8 6.2-4.8 9s4.8 4 4.8 9"/>', 2),
    faceid: S('<path d="M3.5 8V6a2.5 2.5 0 0 1 2.5-2.5h2M16 3.5h2A2.5 2.5 0 0 1 20.5 6v2M20.5 16v2a2.5 2.5 0 0 1-2.5 2.5h-2M8 20.5H6A2.5 2.5 0 0 1 3.5 18v-2M8.5 9v1.5M15.5 9v1.5M12 9v4h-1M9 16a4.5 4.5 0 0 0 6 0"/>', 1.9),
    shield: '<path d="M12 2.5l7.6 3v6.1c0 4.6-3.2 8.3-7.6 10.1-4.4-1.8-7.6-5.5-7.6-10.1V5.5z"/>',
    hand: '<path d="M9 3.5a1.3 1.3 0 0 1 2.6 0V11h.6V2.8a1.3 1.3 0 0 1 2.6 0V11h.6V4.6a1.3 1.3 0 0 1 2.6 0v9.7c0 4.3-2.9 7.2-6.6 7.2-2.6 0-4.3-1.3-5.8-3.7L3.2 13a1.3 1.3 0 0 1 2.2-1.4L7.8 15V5.8a1.3 1.3 0 0 1 2.6 0z" transform="translate(-.6 .4)"/>',
    battery: '<rect x="2" y="7" width="17.5" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="4" y="9" width="11" height="6" rx="1.4"/><path d="M21 10.3v3.4a1.8 1.8 0 0 0 0-3.4z"/>',
    info: '<path fill-rule="evenodd" d="M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19zm-1.2 8v7h2.4v-7zm1.2-4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10.5" rx="2.6"/>' + S('<path d="M8.2 10.5V7.6a3.8 3.8 0 0 1 7.6 0v2.9"/>', 2.1),
    lockOpen: '<rect x="5" y="10.5" width="14" height="10.5" rx="2.6"/>' + S('<path d="M8.2 10.5V7.6a3.8 3.8 0 0 1 7.6 0"/>', 2.1),
    camera: '<path fill-rule="evenodd" d="M9 4.5h6l1.6 2.3h2.6A2.3 2.3 0 0 1 21.5 9v9a2.3 2.3 0 0 1-2.3 2.3H4.8A2.3 2.3 0 0 1 2.5 18V9a2.3 2.3 0 0 1 2.3-2.2h2.6zM12 9.3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>',
    flashlight: '<path d="M7.5 2.5h9v3.8l-2.4 3.4v11a1.3 1.3 0 0 1-1.3 1.3h-1.6a1.3 1.3 0 0 1-1.3-1.3v-11L7.5 6.3z"/><rect x="11" y="11.5" width="2" height="3.6" rx="1" fill="#000" opacity=".35"/>',
    timer: '<path fill-rule="evenodd" d="M12 4.8a8.4 8.4 0 1 1 0 16.8 8.4 8.4 0 0 1 0-16.8zm-.9 3.4v5.6l4 2.4.9-1.4-3.3-2V8.2zM9.5 1.8h5v1.9h-5z"/>',
    calculator: '<path fill-rule="evenodd" d="M6.5 2.5h11a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2zm1 2.5v4h9V5zm.3 6.5v2h2v-2zm3.2 0v2h2v-2zm3.2 0v2h2v-2zm-6.4 3.5v2h2v-2zm3.2 0v2h2v-2zm3.2 0v2h2v-2z"/>',
    orientationLock: S('<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.6 3.8v3.4h-3.4"/>', 2) + '<rect x="9" y="11" width="6" height="5" rx="1.2"/>' + S('<path d="M10.3 11V9.8a1.7 1.7 0 0 1 3.4 0V11"/>', 1.5),
    mirror: S('<rect x="3" y="4" width="14" height="10" rx="2"/><path d="M7 14v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-2"/>', 2),
    play: '<path d="M7 4.4c0-.8.9-1.3 1.6-.9l11 6.9c.7.4.7 1.4 0 1.8l-11 6.9c-.7.4-1.6-.1-1.6-.9z"/>',
    pause: '<rect x="5.5" y="4" width="4.6" height="16" rx="1.4"/><rect x="13.9" y="4" width="4.6" height="16" rx="1.4"/>',
    next: '<path d="M2.5 6.4c0-.8.9-1.3 1.6-.8l7.4 5.6c.5.4.5 1.2 0 1.6l-7.4 5.6c-.7.5-1.6 0-1.6-.8zM12 6.4c0-.8.9-1.3 1.6-.8L21 11.2c.5.4.5 1.2 0 1.6l-7.4 5.6c-.7.5-1.6 0-1.6-.8z"/>',
    prev: '<path d="M21.5 6.4c0-.8-.9-1.3-1.6-.8l-7.4 5.6c-.5.4-.5 1.2 0 1.6l7.4 5.6c.7.5 1.6 0 1.6-.8zM12 6.4c0-.8-.9-1.3-1.6-.8L3 11.2c-.5.4-.5 1.2 0 1.6l7.4 5.6c.7.5 1.6 0 1.6-.8z"/>',
    mic: '<rect x="8.5" y="2.5" width="7" height="12" rx="3.5"/>' + S('<path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v4"/>', 2),
    heart: '<path d="M12 20.6S3.8 15.8 3.8 9.9a4.4 4.4 0 0 1 8.2-2.3 4.4 4.4 0 0 1 8.2 2.3c0 5.9-8.2 10.7-8.2 10.7z"/>',
    heartLine: S('<path d="M12 20S4 15.4 4 9.9a4.2 4.2 0 0 1 8-2 4.2 4.2 0 0 1 8 2C20 15.4 12 20 12 20z"/>', 2),
    share: S('<path d="M12 3v12M7.5 7.3L12 3l4.5 4.3M8 10H6.5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2H16"/>', 2),
    trash: S('<path d="M4 6.5h16M9.5 6.5V4.5h5v2M6.5 6.5l.9 12.6a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9l.9-12.6M10 10.5v6.5M14 10.5v6.5"/>', 1.9),
    compose: S('<path d="M11 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V13"/><path d="M17.8 3.6a1.9 1.9 0 0 1 2.7 2.7L12.4 14.4 9 15.1l.7-3.4z"/>', 1.9),
    ellipsis: '<circle cx="5.5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="18.5" cy="12" r="1.9"/>',
    arrowUp: S('<path d="M12 19.5V5M6 10.5L12 4.5l6 6"/>', 2.6),
    arrowLeft: S('<path d="M19 12H5M10.5 6L4.5 12l6 6"/>', 2.4),
    arrowRight: S('<path d="M5 12h14M13.5 6l6 6-6 6"/>', 2.4),
    phone: '<path d="M6.8 3.1l2.5-.5 2.1 4.7-1.9 1.5a11 11 0 0 0 5.8 5.8l1.5-1.9 4.7 2.1-.5 2.5c-.2 1-1.1 1.7-2.2 1.7C10.6 19 5.1 13.4 5.1 5.3c0-1.1.7-2 1.7-2.2z"/>',
    phoneDown: '<path d="M3.2 14.6c-.6-.6-.6-1.6 0-2.2C8 7.9 16 7.9 20.8 12.4c.6.6.6 1.6 0 2.2l-1.7 1.6-3.8-1.6.1-2.3a9.8 9.8 0 0 0-6.8 0l.1 2.3-3.8 1.6z"/>',
    video: '<rect x="2.5" y="6" width="13" height="12" rx="2.6"/><path d="M16.5 10.5l5-3v9l-5-3z"/>',
    location: '<path d="M20.6 3.4L3.4 10.6c-.8.3-.7 1.5.2 1.7l6.9 1.2 1.2 6.9c.2.9 1.4 1 1.7.2z"/>',
    pin: '<path fill-rule="evenodd" d="M12 2.2a7 7 0 0 1 7 7c0 5.2-7 12.6-7 12.6S5 14.4 5 9.2a7 7 0 0 1 7-7zm0 4.3a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4z"/>',
    star: '<path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"/>',
    clock: '<path fill-rule="evenodd" d="M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19zm-1 4.5v6l4.5 2.8 1-1.6-3.5-2.2V7z"/>',
    globe: S('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/>', 1.8),
    alarm: '<path fill-rule="evenodd" d="M12 4.6a8.2 8.2 0 1 1 0 16.4 8.2 8.2 0 0 1 0-16.4zm-.9 3.5v5.4l3.8 2.2.9-1.5-3-1.7V8.1z"/>' + S('<path d="M3.5 6l3-2.5M20.5 6l-3-2.5"/>', 2),
    stopwatch: '<path fill-rule="evenodd" d="M12 5a8.3 8.3 0 1 1 0 16.6A8.3 8.3 0 0 1 12 5zm-.9 3.4v5.4h1.8V8.4zM9.5 1.8h5v1.9h-5z"/>',
    list: '<circle cx="4.5" cy="6" r="1.6"/><circle cx="4.5" cy="12" r="1.6"/><circle cx="4.5" cy="18" r="1.6"/>' + S('<path d="M9 6h11M9 12h11M9 18h11"/>', 2),
    photo: '<path fill-rule="evenodd" d="M5 3.5h14A2.5 2.5 0 0 1 21.5 6v12a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 18V6A2.5 2.5 0 0 1 5 3.5zm-.5 13.3V18c0 .3.2.5.5.5h14c.3 0 .5-.2.5-.5v-2.6l-4-4.3-4.3 4.6-2.7-2.6zM8.5 6.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>',
    photos: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>',
    person: '<circle cx="12" cy="7.5" r="4.2"/><path d="M3.8 20.5c.6-4.2 4-6.6 8.2-6.6s7.6 2.4 8.2 6.6z"/>',
    personCircle: '<path fill-rule="evenodd" d="M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19zm0 3.8a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6zm0 8.4c-2.6 0-4.8 1.1-5.9 2.9a7.6 7.6 0 0 0 11.8 0c-1.1-1.8-3.3-2.9-5.9-2.9z"/>',
    keypad: '<circle cx="6" cy="4.5" r="1.9"/><circle cx="12" cy="4.5" r="1.9"/><circle cx="18" cy="4.5" r="1.9"/><circle cx="6" cy="10" r="1.9"/><circle cx="12" cy="10" r="1.9"/><circle cx="18" cy="10" r="1.9"/><circle cx="6" cy="15.5" r="1.9"/><circle cx="12" cy="15.5" r="1.9"/><circle cx="18" cy="15.5" r="1.9"/><circle cx="12" cy="21" r="1.9"/>',
    rotate: S('<path d="M4.5 12a7.5 7.5 0 0 1 13-5.1M19.5 12a7.5 7.5 0 0 1-13 5.1M17.8 3.5v3.7h-3.7M6.2 20.5v-3.7h3.7"/>', 2),
    bolt: '<path d="M13.5 2L4.8 13.4h6.1L9.9 22l8.8-11.5h-6.2z"/>',
    boltSlash: '<path d="M13.5 2L4.8 13.4h6.1L9.9 22l8.8-11.5h-6.2z"/>' + S('<path d="M3.5 3.5l17 17"/>', 2),
    live: S('<circle cx="12" cy="12" r="9" stroke-dasharray="1.2 2.6"/><circle cx="12" cy="12" r="5.6"/>', 1.6) + '<circle cx="12" cy="12" r="2.6"/>',
    book: '<path d="M3 5.2c3-1.1 6-.9 8.2.8v14c-2.2-1.5-5.2-1.7-8.2-.6zM21 5.2c-3-1.1-6-.9-8.2.8v14c2.2-1.5 5.2-1.7 8.2-.6z"/>',
    folder: '<path d="M2.5 6.5a2 2 0 0 1 2-2h4.8l2 2.2h8.2a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2z"/>',
    tray: S('<path d="M3.5 13.5h5l1.5 2.5h4l1.5-2.5h5M5.5 5h13l2 8.5V18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-4.5z"/>', 1.9),
    envelope: '<path d="M3.5 5.5h17a1.5 1.5 0 0 1 1.5 1.5v.4l-10 6.2-10-6.2V7a1.5 1.5 0 0 1 1.5-1.5zM2 9.6l10 6.2 10-6.2V17a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 17z"/>',
    note: S('<path d="M9 18V5.5l11-2V16"/>', 2) + '<circle cx="6.5" cy="18" r="2.8"/><circle cx="17.5" cy="16" r="2.8"/>',
    waveform: S('<path d="M3 10v4M7 7v10M11 4v16M15 8v8M19 10.5v3"/>', 2.2),
    keyboard: '<path fill-rule="evenodd" d="M4 5.5h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2zm1.5 3v2h2v-2zm3.5 0v2h2v-2zm3.5 0v2h2v-2zm3.5 0v2h2v-2zM5.5 12v2h2v-2zm3.5 0v2h2v-2zm3.5 0v2h2v-2zm3.5 0v2h2v-2zM7.5 15.3v1.4h9v-1.4z"/>',
    bookmark: '<path d="M6.5 3h11a1 1 0 0 1 1 1v17l-6.5-4-6.5 4V4a1 1 0 0 1 1-1z"/>',
    tabs: S('<rect x="3.5" y="7.5" width="13" height="13" rx="3"/><path d="M7.5 3.5h10a3 3 0 0 1 3 3v10"/>', 2),
    reload: S('<path d="M19.5 12a7.5 7.5 0 1 1-2.3-5.4M19.5 4v4.5H15"/>', 2.2),
    aa: '<text x="1" y="18.5" font-size="12" font-weight="700" font-family="-apple-system,Inter,sans-serif">A</text><text x="9" y="18.5" font-size="17" font-weight="700" font-family="-apple-system,Inter,sans-serif">A</text>',
    circle: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    circleCheck: '<path fill-rule="evenodd" d="M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19zm4.4 5.6l-5.8 6.3-3-2.8-1.3 1.4 4.4 4.1 7.2-7.7z"/>',
    flag: '<path d="M5 21V4M5 4.5c4-2.2 7 2 11.5 0V13c-4.5 2-7.5-2.2-11.5 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 4.5c4-2.2 7 2 11.5 0V13c-4.5 2-7.5-2.2-11.5 0z"/>',
    calendar: '<path fill-rule="evenodd" d="M6 4h12a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3zm-1 5.5V18a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5z"/><rect x="7" y="2" width="2" height="4" rx="1"/><rect x="15" y="2" width="2" height="4" rx="1"/>',
    house: '<path d="M12 3.2l9 7.6-1.3 1.5-1.2-1V20a1 1 0 0 1-1 1h-3.8v-5.5h-3.4V21H6.5a1 1 0 0 1-1-1v-8.7l-1.2 1L3 10.8z"/>',
    cloud: '<path d="M7 19a4.5 4.5 0 0 1-.7-9 6 6 0 0 1 11.5 1.6A3.8 3.8 0 0 1 17.4 19z"/>',
    cloudSun: '<circle cx="8" cy="8" r="3.4" fill="#ffd60a"/><path d="M8.5 20a4 4 0 0 1-.6-8 5.3 5.3 0 0 1 10.2 1.4A3.3 3.3 0 0 1 17.8 20z"/>',
    rain: '<path d="M7 15a4.5 4.5 0 0 1-.7-9 6 6 0 0 1 11.5 1.6A3.8 3.8 0 0 1 17.4 15z"/>' + S('<path d="M8 17.5l-1 2.5M12.5 17.5l-1 2.5M17 17.5l-1 2.5"/>', 1.8),
    wind: S('<path d="M3 9h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 17h7"/>', 2),
    drop: '<path d="M12 3s6 6.5 6 10.6a6 6 0 0 1-12 0C6 9.5 12 3 12 3z"/>',
    thermometer: S('<path d="M12 14.5V5M9.5 14.8V5.5a2.5 2.5 0 0 1 5 0v9.3a4 4 0 1 1-5 0z"/>', 1.9),
    eye: S('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>', 1.9),
    power: S('<path d="M12 3v8.5M7 5.8a8 8 0 1 0 10 0"/>', 2.4),
    edit: S('<path d="M15.5 4.5l4 4L8.5 19.5 3.5 20.5l1-5z"/>', 2),
    focus: '<path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1z"/>',
    signal5g: '<text x="12" y="17" text-anchor="middle" font-size="12" font-weight="700" font-family="-apple-system,Inter,sans-serif">5G</text>',
    translate: '<path d="M3 4h10v2H9.3c-.5 2.8-1.7 5-3.5 6.6 1 .7 2.2 1.2 3.6 1.6l-.6 1.9c-1.8-.5-3.3-1.2-4.6-2.2-1 .7-2.2 1.3-3.6 1.7l-.6-1.9c1.1-.3 2-.7 2.8-1.2A11 11 0 0 1 .9 8h2.1a9 9 0 0 0 1.8 3.9A9.3 9.3 0 0 0 7.3 6H3z" transform="translate(1.5 1)"/><path d="M16 9h2.2l4.3 12h-2.2l-1-2.9h-4.4l-1 2.9h-2.2zm1.1 2.9l-1.6 4.4h3.2z"/>',
    figure: '<circle cx="13.5" cy="4" r="2.2"/><path d="M11 7.5l-4 3 1.2 1.6 2.8-2-.8 4.9-3.7 5.4 1.7 1.2 3.6-5 2.4 2.4V23h2v-5.8l-2.6-2.7.7-3.6 1.4 1.8h3.8v-2h-2.8l-2.5-3.3z"/>',
    cart: '<path d="M2.5 3.5h3l2.2 11.3a1.6 1.6 0 0 0 1.6 1.2h8.6a1.6 1.6 0 0 0 1.6-1.2l1.8-7.3H6.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.5" cy="20" r="1.7"/><circle cx="17.5" cy="20" r="1.7"/>',
    wallet: '<rect x="2.5" y="6" width="19" height="14" rx="3"/><path d="M4.5 6.5L16 3.3a1.5 1.5 0 0 1 1.9 1.1l.4 1.6z"/>',
  };

  /** Devuelve un SVG de interfaz. */
  function icon(name, cls = '') {
    const inner = G[name] || G.circle;
    return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${inner}</svg>`;
  }

  OS.glyphs = G;
  OS.icon = icon;
  OS.gearPath = gearPath;
})();
