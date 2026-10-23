/* Школа щитовика — ядро: помощники, иконки, хранилище, роутер, общие компоненты */
(function () {
  'use strict';
  const S = (window.SHK = window.SHK || {});

  /* где запущено приложение: сайт на GitHub Pages, внутри Claude или просто файлом */
  S.env = window.SHK_ENV === 'pages' ? 'pages' : (window.claude && typeof window.claude.use === 'function') ? 'artifact' : 'local';
  S.REPO = 'Slowmeow/shkola-shchitovika';
  S.SITE = 'https://slowmeow.github.io/shkola-shchitovika/';
  S.ARTIFACT = 'https://claude.ai/artifact/HoEBPm7P3xJSGbZcSevAak';
  S.VERSION = '2.0';

  /* ---------- мелкие помощники ---------- */
  S.$ = (sel, root) => (root || document).querySelector(sel);
  S.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  S.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  S.fmt = (n, d = 1) => {
    if (n == null || !isFinite(n)) return '—';
    return Number(n).toLocaleString('ru-RU', { maximumFractionDigits: d, minimumFractionDigits: 0 });
  };
  S.fmtFixed = (n, d = 1) => (n == null || !isFinite(n)) ? '—' : Number(n).toLocaleString('ru-RU', { maximumFractionDigits: d, minimumFractionDigits: d });
  S.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  S.uid = () => Math.random().toString(36).slice(2, 9);
  S.strip = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  S.shuffle = (a) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  S.pick = (a) => a[Math.floor(Math.random() * a.length)];
  S.plural = (n, one, few, many) => {
    const n10 = n % 10, n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
    return many;
  };
  S.dayKey = (t) => { const d = t == null ? new Date() : new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  S.today = () => S.dayKey();
  S.ago = (t) => {
    const s = Math.round((Date.now() - t) / 1000);
    if (s < 60) return 'только что';
    const m = Math.round(s / 60); if (m < 60) return `${m} ${S.plural(m, 'минуту', 'минуты', 'минут')} назад`;
    const h = Math.round(m / 60); if (h < 24) return `${h} ${S.plural(h, 'час', 'часа', 'часов')} назад`;
    const d = Math.round(h / 24); if (d < 31) return `${d} ${S.plural(d, 'день', 'дня', 'дней')} назад`;
    return new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  /* шина событий: прогресс, награды, разборы */
  S.bus = {
    h: {},
    on(t, f) { (this.h[t] = this.h[t] || []).push(f); },
    off(t, f) { const h = this.h[t]; if (h) { const i = h.indexOf(f); if (i >= 0) h.splice(i, 1); } },
    emit(t, a) { (this.h[t] || []).slice().forEach((f) => { try { f(a); } catch (e) { console.error(e); } }); }
  };

  /* Профиль ученика: ответы на вопросы перед стартом */
  S.profile = {
    known: ['crimp', 'sockets', 'cabling'], // зачистка и обжим, розетки и выключатели, прокладка кабеля
    object: 'office'
  };

  /* ---------- иконки (24×24, линия) ---------- */
  const P = {
    book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 21.5A2.5 2.5 0 0 1 6.5 19H20v3H6.5"/><path d="M9 7h7M9 11h5"/>',
    ref: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 17.5h7M17.5 14v7"/>',
    practice: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    panel: '<rect x="3" y="2.5" width="18" height="19" rx="2"/><path d="M3 9h18M3 15.5h18"/><path d="M6.5 5v2.5M9.5 5v2.5M12.5 5v2.5M6.5 11.5V14M9.5 11.5V14M15 11.5V14"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01" stroke-width="2.6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
    back: '<path d="M15 5 8 12l7 7"/>',
    theme: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17A8.5 8.5 0 0 0 12 3.5z" fill="currentColor"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    play: '<path d="M7 4.5v15l12.5-7.5z"/>',
    next: '<path d="m9 5 7 7-7 7"/>',
    prev: '<path d="m15 5-7 7 7 7"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01" stroke-width="2.2"/>',
    alert: '<path d="M12 3 2.5 20h19z"/><path d="M12 10v4.5M12 17.3h.01" stroke-width="2.2"/>',
    shield: '<path d="M12 2.5 4 5.5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10v-6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    bolt: '<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13"/>',
    save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-6h8v6"/>',
    download: '<path d="M12 3v12M7 10.5l5 5 5-5M4 20h16"/>',
    upload: '<path d="M12 16V4M7 8.5l5-5 5 5M4 20h16"/>',
    camera: '<path d="M4 7.5h3.5L9 5h6l1.5 2.5H20V19H4z"/><circle cx="12" cy="13" r="3.6"/>',
    send: '<path d="M4 12 20 4l-5 16-3.2-6.8z"/><path d="m11.8 13.2 3-3"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    refresh: '<path d="M20 11A8 8 0 0 0 5.5 6.5L4 8M4 3.5V8h4.5M4 13a8 8 0 0 0 14.5 4.5L20 16m0 4.5V16h-4.5"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    doc: '<path d="M6 2.5h8.5L19 7v14.5H6z"/><path d="M14 2.5V7h5M9 12h7M9 16h7"/>',
    calc: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8 6.5h8M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h7" stroke-width="2"/>',
    hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5V4a1.5 1.5 0 0 1 3 0v6m0-4.5a1.5 1.5 0 0 1 3 0V12m0-3.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.4-2.6L3.3 15.6a1.6 1.6 0 0 1 2.4-2.1L8 15.6"/>',
    eye: '<path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"/><circle cx="12" cy="12" r="3"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" stroke-width="2"/>',
    game: '<rect x="2.5" y="7" width="19" height="11" rx="5.5"/><path d="M7.5 10.5v4M5.5 12.5h4M15.5 11h.01M18 13.5h.01" stroke-width="2"/>',
    photo: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 8.5"/>',
    cable: '<path d="M4 20c0-6 4-6 8-8s8-2 8-8"/><path d="M3 21.5 5 19.5M19 4.5l2-2" stroke-width="2.4"/>',
    plug: '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><path d="M12 6.5v1.6M12 15.9v1.6"/>',
    lamp: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>',
    stove: '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><circle cx="8.5" cy="8.5" r="2.2"/><circle cx="15.5" cy="8.5" r="2.2"/><circle cx="8.5" cy="15.5" r="2.2"/><circle cx="15.5" cy="15.5" r="2.2"/>',
    oven: '<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M3.5 8h17"/><rect x="7" y="11" width="10" height="6.5" rx="1"/><path d="M7 5.8h.01M10 5.8h.01" stroke-width="2"/>',
    washer: '<rect x="4" y="2.5" width="16" height="19" rx="2"/><path d="M4 7h16"/><circle cx="12" cy="14" r="4.3"/><path d="M7 4.8h.01M10 4.8h.01" stroke-width="2"/>',
    dish: '<rect x="4" y="2.5" width="16" height="19" rx="2"/><path d="M4 7h16M8 11h8M8 14.5h8M8 18h8"/>',
    boiler: '<rect x="6" y="2.5" width="12" height="17" rx="5"/><path d="M9.5 19.5V22M14.5 19.5V22M12 8v4M10 10h4"/>',
    flow: '<rect x="5" y="3" width="14" height="13" rx="2"/><path d="M9 16v5M15 16v5M9 8.5l3 3 3-3"/>',
    snow: '<path d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17"/><path d="m9.5 4 2.5 2 2.5-2M9.5 20l2.5-2 2.5 2"/>',
    floor: '<path d="M3 20h18"/><path d="M5 16c2-3 2-6 0-9M10 16c2-3 2-6 0-9M15 16c2-3 2-6 0-9M20 16c2-3 2-6 0-9"/>',
    pump: '<circle cx="11" cy="13" r="6"/><path d="M11 13 14.5 9.5M17 13h4.5M2.5 13H5M11 7V3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
    car: '<path d="M4 16.5V12l2.2-5h11.6l2.2 5v4.5z"/><path d="M4 12h16"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
    server: '<rect x="4" y="3" width="16" height="7.5" rx="1.5"/><rect x="4" y="13.5" width="16" height="7.5" rx="1.5"/><path d="M7.5 6.8h.01M7.5 17.3h.01" stroke-width="2.4"/>',
    fridge: '<rect x="5.5" y="2.5" width="13" height="19" rx="2"/><path d="M5.5 10h13M8.5 5.5v2M8.5 13v3"/>',
    flame: '<path d="M12 22c4 0 7-2.7 7-6.6 0-4-3.3-6.2-4.3-10.4-2 1.6-3 3.5-3 5.6-1.3-.8-2-2-2.2-3.4C7.2 9.2 5 11.6 5 15.4 5 19.3 8 22 12 22z"/>',
    motor: '<circle cx="12" cy="12" r="8.5"/><path d="M8 16V8l4 5 4-5v8"/>',
    feeder: '<rect x="7" y="2.5" width="10" height="6" rx="1"/><path d="M12 8.5V14M5 14h14M5 14v4M12 14v4M19 14v4"/>',
    dot: '<circle cx="12" cy="12" r="4"/>',
    gate: '<path d="M3 20V6h18v14"/><path d="M3 10h18M3 15h18M8 6v14M13.5 6v14"/>',
    garage: '<path d="M3 10 12 4l9 6v11H3z"/><path d="M7 21v-7h10v7M7 17h10"/>',
    tool: '<path d="m14.5 5.5 4 4L9 19l-4 1 1-4z"/><path d="m13 7 4 4"/>',
    kitchen: '<path d="M6 3v7a2 2 0 0 0 4 0V3M8 3v18M16 21V3c2 1 3 3.5 3 7h-3"/>',
    home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>',
    office: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10.5 21v-3h3v3"/>',
    shop: '<path d="M4 9h16l-1.5-5h-13z"/><path d="M5 9v11h14V9M9.5 20v-6h5v6"/>',
    flat: '<rect x="3.5" y="3" width="17" height="18" rx="1.5"/><path d="M3.5 12h17M12 3v18"/>',
    tree: '<path d="M12 2 6 10h3l-4 6h14l-4-6h3z"/><path d="M12 16v6"/>',
    meter: '<rect x="4" y="2.5" width="16" height="19" rx="2"/><rect x="7" y="5.5" width="10" height="4.5" rx="1"/><path d="M7 14h10M7 17.5h6"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    exam: '<path d="M6 2.5h12v19H6z"/><path d="m9 8 1.5 1.5L13 7M9 14l1.5 1.5L13 13M15 8.5h0M15 14.5h0"/>',
    sigma: '<path d="M18 4H6l7 8-7 8h12"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    sparkle: '<path d="M12 3c.6 3.8 2.2 5.4 6 6-3.8.6-5.4 2.2-6 6-.6-3.8-2.2-5.4-6-6 3.8-.6 5.4-2.2 6-6z"/><path d="M19 15c.3 1.6 1 2.3 2.5 2.5-1.6.3-2.3 1-2.5 2.5-.3-1.6-1-2.3-2.5-2.5 1.6-.3 2.3-1 2.5-2.5z"/>',
    copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"/>',
    inbox: '<path d="M3 13.5 5.5 4.5h13L21 13.5V19a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19z"/><path d="M3 13.5h5l1.5 2.5h5l1.5-2.5h5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5A3.5 3.5 0 0 1 16.5 11M12 14v3.5M8.5 21h7M9.5 17.5h5V21h-5z"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M4.2 6l2.6 1.5M17.2 16.5l2.6 1.5M4.2 18l2.6-1.5M17.2 7.5 19.8 6M2.5 12h3M18.5 12h3"/>',
    github: '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
    issue: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/>',
    done2: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.7 2.7L16 9.8"/>',
    link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10.5" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    install: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 7v7M9 11.5l3 3 3-3M10.5 18.5h3"/>',
    volume: '<path d="M4 9.5h4L13 5v14l-5-4.5H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
    mute: '<path d="M4 9.5h4L13 5v14l-5-4.5H4z"/><path d="m17 9.5 5 5M22 9.5l-5 5"/>',
    map: '<path d="m3 6.5 6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
    quest: '<path d="M6 3h12v18l-6-4-6 4z"/><path d="m9.5 9.5 2 2 3.5-4"/>'
  };
  S.icons = P;
  S.icon = (name, cls) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="ic${cls ? ' ' + cls : ''}">${P[name] || P.dot}</svg>`;

  /* ---------- блоки для текстов уроков ---------- */
  const box = (cls, label, icon, html) => `<div class="box ${cls}"><div class="lbl">${S.icon(icon)}${label}</div>${html}</div>`;
  S.B = {
    tip: (h) => box('tip', 'Запомни', 'check', h),
    warn: (h) => box('warn', 'Осторожно', 'alert', h),
    bad: (h) => box('bad', 'Частая ошибка', 'x', h),
    norm: (ref, h) => box('norm', 'Норматив · ' + ref, 'doc', h),
    skill: (h) => box('skill', 'Ты это уже делал', 'hand', h),
    ex: (h) => box('ex', 'Пример', 'calc', h),
    why: (h) => box('ex', 'Почему так', 'info', h),
    life: (h) => box('ex', 'Как на объекте', 'tool', h),
    goal: (items) => `<div class="box goal"><div class="lbl">${S.icon('target')}После урока ты сможешь</div><ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul></div>`,
    physics: (h) => box('phys', 'Физика процесса', 'bolt', h),
    history: (h) => box('hist', 'История', 'clock', h),
    survive: (h) => box('bad', 'Что делать, чтобы выжить', 'shield', h),
    onsite: (h) => box('ex', 'На объекте', 'tool', h),
    mistakes: (items) => box('bad', 'Ошибки и почему они опасны', 'x', `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`),
    fx: (f) => `<div class="fx">${f}</div>`,
    ill: (name, cap) => `<figure class="ill" data-ill="${name}">${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`,
    t: (id, text) => `<dfn data-term="${id}" tabindex="0">${text}</dfn>`,
    go: (route, text) => `<a class="lnk" href="#${route}" data-go="${route}">${text}</a>`,
    tbl: (head, rows, cap) => `<div class="tbl-wrap"><table class="tbl"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>${cap ? `<caption>${cap}</caption>` : ''}</table></div>`
  };

  /* ---------- безопасный markdown (разборы, ответы помощника) ---------- */
  const inl = (t) => {
    let s = S.esc(t);
    const codes = [];
    s = s.replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, url) => {
      const u = url.replace(/&amp;/g, '&');
      if (/^#[\w.\-]+$/.test(u)) return `<a href="${u}" data-go="${u.slice(1)}">${txt}</a>`;
      if (/^https?:\/\/[^\s"'<>]+$/i.test(u)) return `<a href="${S.esc(u)}" target="_blank" rel="noopener noreferrer">${txt}</a>`;
      return txt;
    });
    s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/(^|[\s(«])\*(\S[^*]*?)\*(?=[\s).,!?:;»]|$)/g, '$1<i>$2</i>')
      .replace(/(^|[\s(«])_(\S[^_]*?)_(?=[\s).,!?:;»]|$)/g, '$1<i>$2</i>');
    s = s.replace(/\u0000(\d+)\u0000/g, (m, k) => `<code class="k">${codes[Number(k)]}</code>`);
    return s;
  };
  const ALERTS = { NOTE: ['skill', 'Заметка', 'info'], TIP: ['tip', 'Совет', 'check'], IMPORTANT: ['norm', 'Важно', 'doc'], WARNING: ['warn', 'Осторожно', 'alert'], CAUTION: ['bad', 'Опасно', 'x'] };
  S.md = (src, depth) => {
    depth = depth || 0;
    const lines = String(src == null ? '' : src).replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let list = null, i = 0, m;
    const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
    const special = (n) => !n || /^(```|#{1,6}\s|>|[-•*+]\s|\d+[.)]\s|\|)/.test(n) || /^(-{3,}|\*{3,}|_{3,})$/.test(n);
    while (i < lines.length) {
      const t = lines[i].trim();
      if (/^```/.test(t)) {
        closeList();
        const buf = []; i++;
        while (i < lines.length && !/^```/.test(lines[i].trim())) { buf.push(lines[i]); i++; }
        i++;
        out.push(`<pre>${S.esc(buf.join('\n'))}</pre>`);
        continue;
      }
      if (!t) { closeList(); i++; continue; }
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { closeList(); out.push('<hr>'); i++; continue; }
      if ((m = t.match(/^(#{1,6})\s+(.*)$/))) { closeList(); out.push(`<h4>${inl(m[2])}</h4>`); i++; continue; }
      if (/^>/.test(t)) {
        closeList();
        const buf = [];
        while (i < lines.length && /^>/.test(lines[i].trim())) { buf.push(lines[i].trim().replace(/^>\s?/, '')); i++; }
        const am = buf[0] && buf[0].match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i);
        const inner = depth < 3 ? S.md(am ? buf.slice(1).join('\n') : buf.join('\n'), depth + 1) : `<p>${inl(buf.join(' '))}</p>`;
        if (am) { const a = ALERTS[am[1].toUpperCase()]; out.push(`<div class="box ${a[0]}"><div class="lbl">${S.icon(a[2])}${a[1]}</div>${inner}</div>`); }
        else out.push(`<blockquote>${inner}</blockquote>`);
        continue;
      }
      if (/^\|.*\|$/.test(t) && i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1].trim())) {
        closeList();
        const cells = (row) => row.slice(1, -1).split('|').map((c) => c.trim());
        const head = cells(t); const rows = []; i += 2;
        while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) { rows.push(cells(lines[i].trim())); i++; }
        out.push(`<div class="tbl-wrap"><table class="tbl"><thead><tr>${head.map((h) => `<th>${inl(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inl(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
        continue;
      }
      if ((m = t.match(/^[-•*+]\s+(.*)$/))) {
        if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; }
        const cb = m[1].match(/^\[( |x|X)\]\s+(.*)$/);
        out.push(`<li>${cb ? (cb[1] === ' ' ? '☐ ' : '☑ ') + inl(cb[2]) : inl(m[1])}</li>`);
        i++; continue;
      }
      if ((m = t.match(/^\d+[.)]\s+(.*)$/))) { if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; } out.push(`<li>${inl(m[1])}</li>`); i++; continue; }
      closeList();
      const buf = [t]; i++;
      while (i < lines.length && !special(lines[i].trim())) { buf.push(lines[i].trim()); i++; }
      out.push(`<p>${buf.map(inl).join('<br>')}</p>`);
    }
    closeList();
    return out.join('');
  };

  /* ---------- упаковка данных: резервные копии и отправка Claude ---------- */
  const b64u = (bytes) => {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const unb64u = (str) => {
    const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4));
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  };
  const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
  S.codec = {
    async encode(obj) {
      const bytes = new TextEncoder().encode(JSON.stringify(obj));
      if (typeof CompressionStream === 'function') {
        try { return 'SHK1z.' + b64u(await pipe(bytes, new CompressionStream('deflate-raw'))); } catch (e) { /* без сжатия */ }
      }
      return 'SHK1j.' + b64u(bytes);
    },
    async decode(str) {
      const m = String(str || '').replace(/\s+/g, '').match(/SHK1([zj])\.([A-Za-z0-9_-]+)/);
      if (!m) throw new Error('Это не код приложения');
      let bytes = unb64u(m[2]);
      if (m[1] === 'z') {
        if (typeof DecompressionStream !== 'function') throw new Error('Этот браузер не умеет распаковывать код');
        bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
      }
      return JSON.parse(new TextDecoder().decode(bytes));
    }
  };

  /* ---------- настройки устройства (не прогресс) ---------- */
  const SET_KEY = 'shk:set';
  S.settings = { sound: true, vibro: true, splash: true };
  try { Object.assign(S.settings, JSON.parse(localStorage.getItem(SET_KEY) || '{}')); } catch (e) { /* ignore */ }
  S.setSetting = (k, v) => { S.settings[k] = v; try { localStorage.setItem(SET_KEY, JSON.stringify(S.settings)); } catch (e) { /* ignore */ } };

  /* ---------- хранилище прогресса ---------- */
  const LS_KEY = 'shk:v1';
  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  const num = (x) => typeof x === 'number' && isFinite(x);
  const blank = () => ({ v: 2, done: {}, quiz: {}, games: {}, projects: {}, draft: null, last: null, updated: 0, xp: {}, act: {}, sent: {}, seen: {}, profile: { nick: '', seed: '', since: 0 } });
  /* приводит любые данные к правильному виду: битое отбрасывается, ничего не исполняется */
  S.cleanData = (raw) => {
    const d = blank();
    if (!isObj(raw)) return d;
    const strMap = (src, test) => { const o = {}; if (isObj(src)) for (const [k, v] of Object.entries(src)) if (typeof k === 'string' && k.length < 120 && test(v)) o[k] = v; return o; };
    d.done = strMap(raw.done, num);
    d.quiz = strMap(raw.quiz, (v) => isObj(v) && num(v.s) && num(v.t) && v.t > 0 && v.s >= 0 && v.s <= v.t);
    d.games = strMap(raw.games, (v) => num(v) && v >= 0 && v <= 100);
    d.projects = strMap(raw.projects, (v) => isObj(v) && typeof v.id === 'string' && isObj(v.cfg) && Array.isArray(v.cfg.lines));
    Object.values(d.projects).forEach((p) => { p.name = String(p.name || 'Щит').slice(0, 80); p.updated = num(p.updated) ? p.updated : 0; });
    d.draft = isObj(raw.draft) && isObj(raw.draft.cfg) && Array.isArray(raw.draft.cfg.lines) ? { cfg: raw.draft.cfg, id: typeof raw.draft.id === 'string' ? raw.draft.id : null, updated: num(raw.draft.updated) ? raw.draft.updated : 0 } : null;
    d.last = typeof raw.last === 'string' && raw.last.length < 80 ? raw.last : null;
    d.updated = num(raw.updated) ? raw.updated : 0;
    d.xp = strMap(raw.xp, (v) => Array.isArray(v) && num(v[0]) && v[0] >= 0 && v[0] <= 1000 && num(v[1]));
    d.act = {};
    if (isObj(raw.act)) for (const [k, v] of Object.entries(raw.act)) if (/^\d{4}-\d{2}-\d{2}$/.test(k) && isObj(v)) d.act[k] = strMap(v, (x) => num(x) && x >= 0 && x < 1e6);
    d.sent = strMap(raw.sent, (v) => isObj(v) && typeof v.id === 'string');
    Object.values(d.sent).forEach((s) => { s.title = String(s.title || '').slice(0, 140); s.text = String(s.text || '').slice(0, 4000); s.type = String(s.type || 'question').slice(0, 20); s.at = num(s.at) ? s.at : 0; s.via = String(s.via || '').slice(0, 20); s.issue = num(s.issue) ? s.issue : null; });
    d.seen = strMap(raw.seen, num);
    if (isObj(raw.profile)) {
      d.profile.nick = typeof raw.profile.nick === 'string' ? raw.profile.nick.slice(0, 24) : '';
      d.profile.seed = typeof raw.profile.seed === 'string' ? raw.profile.seed.slice(0, 32) : '';
      d.profile.since = num(raw.profile.since) ? raw.profile.since : 0;
    }
    return d;
  };
  const store = (S.store = {
    data: blank(),
    remote: null,
    load() {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) this.data = S.cleanData(JSON.parse(raw));
      } catch (e) { /* хранилище недоступно — работаем в памяти */ }
      const p = this.data.profile;
      if (!p.seed) p.seed = Math.random().toString(36).slice(2, 12);
      if (!p.since) p.since = Date.now();
      this.saveLocal();
    },
    saveLocal() {
      try { localStorage.setItem(LS_KEY, JSON.stringify(this.data)); return true; } catch (e) { return false; }
    },
    touch(reason) {
      this.data.updated = Date.now();
      this.saveLocal();
      this.scheduleRemote();
      S.bus.emit('change', reason || 'local');
    },
    bump(k, n) {
      const day = S.today();
      const a = (this.data.act[day] = this.data.act[day] || {});
      a[k] = (a[k] || 0) + (n || 1);
    },
    markDone(id) { if (!this.data.done[id]) { this.data.done[id] = Date.now(); this.bump('lesson'); this.touch(); S.bus.emit('lesson', id); } },
    unmarkDone(id) { if (this.data.done[id]) { delete this.data.done[id]; this.touch(); } },
    setQuiz(id, score, total) {
      const prev = this.data.quiz[id];
      this.bump('quiz');
      if (score === total) this.bump('perfect');
      if (prev && prev.s < prev.t) this.bump('retry');
      if (!prev || score / total > prev.s / prev.t) this.data.quiz[id] = { s: score, t: total, at: Date.now() };
      this.touch();
    },
    setGame(id, score) {
      const prev = this.data.games[id] || 0;
      this.bump('game');
      if (score >= 70) this.bump('game70');
      const rec = score > prev;
      if (rec) this.data.games[id] = score;
      this.touch();
      S.bus.emit('game', { id, score, prev });
      return rec;
    },
    setLast(route) { this.data.last = route; this.saveLocal(); },
    saveProject(p) {
      p.updated = Date.now();
      this.data.projects[p.id] = p;
      const ids = Object.keys(this.data.projects).sort((a, b) => this.data.projects[b].updated - this.data.projects[a].updated);
      ids.slice(30).forEach((id) => delete this.data.projects[id]);
      this.bump('build');
      this.touch();
    },
    deleteProject(id) { delete this.data.projects[id]; this.touch(); },
    /* слияние: значения только растут — чужая или старая копия ничего не стирает */
    merge(otherRaw) {
      const o = S.cleanData(otherRaw);
      const d = this.data;
      let n = 0;
      for (const [k, v] of Object.entries(o.done)) if (!d.done[k] || v < d.done[k]) { if (!d.done[k]) n++; d.done[k] = v; }
      for (const [k, v] of Object.entries(o.quiz)) { const p = d.quiz[k]; if (!p || v.s / v.t > p.s / p.t) { d.quiz[k] = v; n++; } }
      for (const [k, v] of Object.entries(o.games)) if (!(d.games[k] >= v)) { d.games[k] = v; n++; }
      for (const [k, v] of Object.entries(o.projects)) { const p = d.projects[k]; if (!p || v.updated > p.updated) { d.projects[k] = v; n++; } }
      if (o.draft && (!d.draft || o.draft.updated > (d.draft.updated || 0))) d.draft = o.draft;
      for (const [k, v] of Object.entries(o.xp)) { const p = d.xp[k]; if (!p) { d.xp[k] = v; n++; } else if (v[1] < p[1]) p[1] = v[1]; }
      for (const [day, a] of Object.entries(o.act)) { const t = (d.act[day] = d.act[day] || {}); for (const [k, v] of Object.entries(a)) if (!(t[k] >= v)) t[k] = v; }
      for (const [k, v] of Object.entries(o.sent)) { const p = d.sent[k]; if (!p) { d.sent[k] = v; n++; } else if (!p.issue && v.issue) p.issue = v.issue; }
      for (const [k, v] of Object.entries(o.seen)) if (!d.seen[k] || v < d.seen[k]) d.seen[k] = v;
      if (!d.profile.nick && o.profile.nick) d.profile.nick = o.profile.nick;
      if (o.profile.since && (!d.profile.since || o.profile.since < d.profile.since)) d.profile.since = o.profile.since;
      return n;
    },
    exportObj() { return { app: 'shkola-shchitovika', kind: 'progress', v: 2, at: new Date().toISOString(), data: JSON.parse(JSON.stringify(this.data)) }; },
    resetAll() {
      const keep = this.data.profile;
      this.data = blank();
      this.data.profile = { nick: keep.nick, seed: keep.seed, since: Date.now() };
      this.touch('import');
    },
    timer: null,
    writing: false,
    pending: false,
    scheduleRemote() {
      if (!this.remote) return;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.flush(), 1500);
    },
    async flush() {
      if (!this.remote) return;
      if (this.writing) { this.pending = true; return; }
      this.writing = true;
      try {
        await this.remote.set(JSON.parse(JSON.stringify(this.data)));
      } catch (e) {
        if (e && (e.code === 'invalid_argument' || e.code === 'revoked' || e.code === 'not_granted')) { this.remote = null; setSync(false); }
      }
      this.writing = false;
      if (this.pending) { this.pending = false; this.scheduleRemote(); }
    },
    async initRemote() {
      if (S.env !== 'artifact') return;
      try {
        const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
        if (!db || !user) return;
        S.db = db;
        S.bus.emit('db', db);
        const id = await user.id();
        if (!id) return;
        const ref = db.doc('data/users/' + id + '/app');
        const snap = await ref.get();
        if (snap.exists) {
          this.merge(snap.data());
          this.saveLocal();
          S.bus.emit('change', 'remote');
        }
        this.remote = ref;
        setSync(true);
        this.scheduleRemote();
      } catch (e) { /* без синхронизации */ }
    }
  });
  function setSync(on) { S.synced = !!on; S.bus.emit('sync', !!on); }

  /* ---------- сохранить файл ---------- */
  S.saveFile = async (filename, data, mime) => {
    if (S.env === 'artifact') {
      try {
        const d = await window.claude.use('downloads');
        if (d) { await d.save({ filename, data }); return 'saved'; }
      } catch (e) { if (e && e.code === 'declined') return 'declined'; }
    } else {
      try {
        const url = URL.createObjectURL(new Blob([data], { type: mime || 'application/octet-stream' }));
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.rel = 'noopener';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        return 'saved';
      } catch (e) { /* покажем текст */ }
    }
    S.sheet('Сохрани вручную', `<div class="stack-sm"><p class="small muted">Файл здесь не скачивается. Скопируй текст и сохрани его как <span class="mono">${S.esc(filename)}</span>:</p><textarea class="inp" readonly style="min-height:50vh;font-family:var(--font-mono);font-size:12px">${S.esc(data)}</textarea></div>`);
    return 'shown';
  };
  S.copy = async (text, okMsg) => {
    try { await navigator.clipboard.writeText(text); S.toast(okMsg || 'Скопировано'); return true; }
    catch (e) {
      S.sheet('Скопируй вручную', `<div class="stack-sm"><p class="small muted">Выдели текст и скопируй:</p><textarea class="inp" readonly style="min-height:40vh;font-family:var(--font-mono);font-size:12px">${S.esc(text)}</textarea></div>`, { mount(b) { const t = b.querySelector('textarea'); t.focus(); t.select(); } });
      return false;
    }
  };
  S.openExternal = (url) => {
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    document.body.appendChild(a); a.click(); a.remove();
  };

  /* ---------- роутер ---------- */
  S.views = {};
  S.view = (name, def) => { S.views[name] = def; };
  S.parse = (hash) => {
    const h = decodeURIComponent((hash || '').replace(/^#/, ''));
    const i = h.indexOf('.');
    return i < 0 ? { name: h || 'home', arg: '' } : { name: h.slice(0, i), arg: h.slice(i + 1) };
  };
  S.current = { name: 'home', arg: '' };
  let navDepth = 0;
  S.go = (route, opts) => {
    route = String(route || 'home').replace(/^#/, '');
    if (('#' + route) === location.hash) { S.render(); return; }
    navDepth++;
    let ok = false;
    try { location.hash = route; ok = decodeURIComponent(location.hash) === '#' + route; } catch (e) { ok = false; }
    if (!ok) { navDepth--; S.render(route); }
    if (opts && opts.replace && ok) navDepth--;
  };
  S.back = () => {
    const v = S.views[S.current.name];
    if (navDepth > 0) { navDepth--; history.back(); return; }
    const parent = v && v.parent ? (typeof v.parent === 'function' ? v.parent(S.current.arg) : v.parent) : 'home';
    S.go(parent);
  };
  S.cleanup = [];
  S.render = (forced) => {
    const r = S.parse(forced != null ? '#' + forced : location.hash);
    if (S.aliases && S.aliases[r.name]) { const a = S.aliases[r.name](r.arg); r.name = a.name; r.arg = a.arg; }
    let v = S.views[r.name];
    if (!v) { r.name = 'home'; r.arg = ''; v = S.views.home; }
    S.cleanup.forEach((f) => { try { f(); } catch (e) { /* ignore */ } });
    S.cleanup = [];
    S.closeSheet();
    S.current = r;
    const root = S.$('#view');
    let html = '';
    try { html = v.render(r.arg); } catch (e) { console.error(e); html = `<div class="wrap"><div class="empty">Не получилось открыть этот раздел. ${S.esc(e.message)}</div></div>`; }
    root.innerHTML = html;
    try { v.mount && v.mount(root, r.arg); } catch (e) { console.error(e); }
    S.enhance(root);
    const tab = typeof v.tab === 'function' ? v.tab(r.arg) : v.tab;
    S.$$('.tab').forEach((t) => t.setAttribute('aria-current', t.dataset.tab === tab ? 'page' : 'false'));
    const bb = S.$('#backBtn');
    const top = !!(typeof v.top === 'function' ? v.top(r.arg) : v.top);
    bb.hidden = top;
    window.scrollTo(0, 0);
    if (r.name === 'lesson') store.setLast('lesson.' + r.arg);
    S.bus.emit('route', r);
  };
  window.addEventListener('hashchange', () => S.render());

  /* ---------- пост-обработка разметки ---------- */
  S.enhance = (root) => {
    S.$$('[data-ill]', root).forEach((el) => {
      if (el.dataset.done) return;
      el.dataset.done = '1';
      const f = S.ill && S.ill[el.dataset.ill];
      if (f) {
        const cap = el.querySelector('figcaption');
        el.innerHTML = f() + (cap ? cap.outerHTML : '');
      }
    });
    S.$$('[data-calc]', root).forEach((el) => {
      if (el.dataset.done) return;
      el.dataset.done = '1';
      const f = S.formulaById && S.formulaById[el.dataset.calc];
      if (f) S.mountCalc(el, f);
    });
    S.$$('[data-zoom]', root).forEach((el) => { if (!el.dataset.done) { el.dataset.done = '1'; S.mountZoom(el); } });
  };

  /* делегированные клики: переходы, термины */
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]');
    if (g) { e.preventDefault(); S.go(g.dataset.go); return; }
    const t = e.target.closest('[data-term]');
    if (t) { e.preventDefault(); S.showTerm(t.dataset.term); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const t = e.target.closest && e.target.closest('dfn[data-term]');
      if (t) { e.preventDefault(); S.showTerm(t.dataset.term); }
    }
    if (e.key === 'Escape') S.closeSheet();
  });

  /* ---------- тост и шторка ---------- */
  let toastT = null;
  S.toast = (msg, action) => {
    let el = S.$('#toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.innerHTML = `<span>${S.esc(msg)}</span>${action ? `<button type="button">${S.esc(action.label)}</button>` : ''}`;
    if (action) el.querySelector('button').onclick = () => { el.hidden = true; action.run(); };
    el.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => { el.hidden = true; }, action ? 9000 : 2800);
  };
  S.sheet = (title, html, opts) => {
    S.closeSheet();
    const bg = document.createElement('div');
    bg.className = 'sheet-bg';
    bg.id = 'sheetBg';
    bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${S.esc(S.strip(title))}"><div class="sheet-head"><div class="h3">${title}</div><button class="icon-btn" type="button" data-close aria-label="Закрыть">${S.icon('x')}</button></div><div class="sheet-body">${html}</div></div>`;
    bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-close]')) S.closeSheet(); });
    bg.addEventListener('click', (e) => { if (e.target.closest('[data-go]')) S.closeSheet(); });
    document.body.appendChild(bg);
    const body = bg.querySelector('.sheet-body');
    S.enhance(body);
    if (opts && opts.mount) opts.mount(body);
    const f = bg.querySelector('input,textarea,button:not([data-close])');
    if (f && opts && opts.focus) f.focus();
    return body;
  };
  S.closeSheet = () => { const b = S.$('#sheetBg'); if (b) b.remove(); };
  /* перерисовка по фоновым событиям — не трогает открытое окно */
  S.softRender = () => { if (!S.$('#sheetBg')) S.render(); };

  S.showTerm = (id) => {
    const g = S.glossary && S.glossary.find((x) => x.id === id);
    if (!g) { S.toast('Термин пока не описан в словаре'); return; }
    S.sheet(S.esc(g.term), `<div class="stack"><p class="prose">${g.def}</p>${g.more ? `<div class="muted small">${g.more}</div>` : ''}${g.go ? `<div>${S.B.go(g.go, 'Подробнее в уроке')}</div>` : ''}<div><a class="btn sm" href="#ref.glossary" data-go="ref.glossary">${S.icon('book')}Весь словарь</a></div></div>`);
    S.bus.emit('term', id);
  };

  /* ---------- зум для больших схем ---------- */
  S.zoomBox = (svg, opts) => {
    const o = opts || {};
    return `<div class="svgbox" data-zoom data-min="${o.min || 0}" ${o.h ? `style="max-height:${o.h}"` : ''}><div class="zoombar"><button type="button" data-z="-" aria-label="Уменьшить">−</button><button type="button" data-z="+" aria-label="Увеличить">+</button><button type="button" data-z="0" aria-label="По ширине" style="font-size:13px">⤢</button></div><div class="zin">${svg}</div></div>`;
  };
  S.mountZoom = (el) => {
    const svg = el.querySelector('.zin > svg');
    if (!svg) return;
    const vb = (svg.getAttribute('viewBox') || '0 0 100 100').split(/\s+/).map(Number);
    const natural = vb[2];
    const min = Number(el.dataset.min) || 0;
    let k = 1;
    const fit = () => {
      const w = el.clientWidth - 2;
      const base = Math.max(w, min);
      svg.style.width = Math.round(base * k) + 'px';
      svg.style.height = 'auto';
      svg.style.maxWidth = 'none';
    };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-z]');
      if (!b) return;
      const z = b.dataset.z;
      if (z === '+') k = Math.min(k * 1.35, 5);
      else if (z === '-') k = Math.max(k / 1.35, 0.5);
      else k = 1;
      fit();
    });
    fit();
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(() => fit());
      ro.observe(el);
      S.cleanup.push(() => ro.disconnect());
    }
    el.dataset.natural = natural;
  };

  /* ---------- калькулятор формулы ---------- */
  S.mountCalc = (el, f) => {
    const c = f.calc;
    if (!c) return;
    const id = 'c' + S.uid();
    const inputs = c.inputs.map((inp, i) => {
      if (inp.options) {
        return `<div class="field"><label for="${id}-${i}">${inp.label}</label><select class="inp" id="${id}-${i}" data-k="${inp.k}">${inp.options.map((o) => `<option value="${o[0]}"${String(o[0]) === String(inp.v) ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></div>`;
      }
      return `<div class="field"><label for="${id}-${i}">${inp.label}${inp.u ? `, <span class="mono">${inp.u}</span>` : ''}</label><input class="inp num" id="${id}-${i}" data-k="${inp.k}" type="number" inputmode="decimal" step="any" value="${inp.v}"></div>`;
    }).join('');
    el.innerHTML = `<div class="card stack"><div class="row"><span class="eyebrow">${S.icon('calc')} Калькулятор</span><span class="spacer"></span><span class="badge xp" data-calcxp>+5 XP</span></div><div class="form-grid">${inputs}</div><div class="calc-out" aria-live="polite"></div></div>`;
    const out = el.querySelector('.calc-out');
    const xpb = el.querySelector('[data-calcxp]');
    if (S.store.data.xp['f:' + f.id]) { xpb.classList.add('got'); xpb.textContent = '✓ 5 XP'; }
    let used = false;
    const run = (user) => {
      const v = {};
      S.$$('[data-k]', el).forEach((x) => { v[x.dataset.k] = x.tagName === 'SELECT' ? x.value : parseFloat(String(x.value).replace(',', '.')); });
      let res;
      try { res = c.run(v); } catch (e) { res = [{ l: 'Ошибка', v: e.message }]; }
      out.innerHTML = `<div class="kv">${res.map((r) => `<dt>${r.l}</dt><dd><b class="num" style="color:var(--fg);font-size:18px">${r.v}</b>${r.u ? ` <span class="mono">${r.u}</span>` : ''}${r.n ? `<div class="small muted">${r.n}</div>` : ''}</dd>`).join('')}</div>`;
      if (user && !used) { used = true; S.bus.emit('calc', f.id); xpb.classList.add('got'); xpb.textContent = '✓ 5 XP'; }
    };
    el.addEventListener('input', () => run(true));
    el.addEventListener('change', () => run(true));
    run(false);
  };

  /* ---------- тест в конце урока ---------- */
  S.quizHTML = (qs, id) => `<div class="quiz" data-quiz="${id}">${qs.map((q, i) => `
    <div class="q" data-i="${i}"><div class="qt">${i + 1}. ${q.q}</div><div class="opts">${q.a.map((a, j) => `<button type="button" class="opt" data-j="${j}"><span class="mk">${'АБВГДЕ'[j]}</span><span>${a}</span></button>`).join('')}</div><div class="expl" hidden></div></div>`).join('')}
    <div data-qres hidden></div></div>`;
  S.mountQuiz = (root, qs, id, onDone) => {
    const el = root.querySelector(`[data-quiz="${id}"]`);
    if (!el) return;
    let answered = 0, right = 0;
    el.addEventListener('click', (e) => {
      const b = e.target.closest('.opt');
      if (!b || b.disabled) return;
      const qEl = b.closest('.q');
      const q = qs[Number(qEl.dataset.i)];
      const j = Number(b.dataset.j);
      S.$$('.opt', qEl).forEach((o) => { o.disabled = true; });
      const ok = j === q.c;
      b.classList.add(ok ? 'right' : 'wrong');
      if (!ok) qEl.querySelector(`.opt[data-j="${q.c}"]`).classList.add('right');
      const ex = qEl.querySelector('.expl');
      ex.innerHTML = (ok ? '<b>Верно.</b> ' : '<b>Не совсем.</b> ') + (q.e || '');
      ex.hidden = false;
      answered++; if (ok) right++;
      if (answered === qs.length) {
        const r = el.querySelector('[data-qres]');
        const pct = Math.round((right / qs.length) * 100);
        const stars = pct === 100 ? 3 : pct >= 80 ? 2 : pct >= 50 ? 1 : 0;
        r.innerHTML = `<div class="result"><div class="stars" aria-label="${stars} из 3 звёзд">${[0, 1, 2].map((k) => `<span class="${k < stars ? 'on' : ''}">★</span>`).join('')}</div><div class="big">${right}/${qs.length}</div><p class="muted">${pct === 100 ? 'Идеально! Тема понята полностью.' : pct >= 80 ? 'Отлично, тема понята.' : pct >= 50 ? 'Зачёт. Перечитай места, где ошибся.' : 'Пока не зачёт: перечитай урок и попробуй ещё раз.'}</p><button class="btn sm" type="button" data-qretry>${S.icon('refresh')}Пройти тест заново</button></div>`;
        r.hidden = false;
        store.setQuiz(id, right, qs.length);
        if (onDone) onDone(right, qs.length);
        S.bus.emit('quizdone', { id, right, total: qs.length });
      }
    });
    el.addEventListener('click', (e) => {
      if (!e.target.closest('[data-qretry]')) return;
      answered = 0; right = 0;
      S.$$('.q', el).forEach((qEl) => {
        S.$$('.opt', qEl).forEach((o) => { o.disabled = false; o.classList.remove('right', 'wrong', 'fx-ok', 'fx-bad'); delete o.dataset.fx; });
        const ex = qEl.querySelector('.expl'); ex.hidden = true; ex.innerHTML = '';
      });
      const r = el.querySelector('[data-qres]'); r.hidden = true; r.innerHTML = '';
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  /* ---------- тема ---------- */
  S.themeMode = () => { let t = null; try { t = localStorage.getItem('shk:theme'); } catch (e) { /* ignore */ } return t === 'light' || t === 'dark' ? t : 'auto'; };
  S.applyTheme = () => {
    const t = S.themeMode();
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
    const dark = t === 'dark' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    const meta = S.$('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#010409' : '#24292f');
  };
  S.setTheme = (t) => {
    try { if (t === 'auto') localStorage.removeItem('shk:theme'); else localStorage.setItem('shk:theme', t); } catch (e) { /* ignore */ }
    S.applyTheme();
  };
  S.cycleTheme = () => {
    const t = S.themeMode();
    const next = t === 'dark' ? 'light' : t === 'light' ? 'auto' : 'dark';
    S.setTheme(next);
    S.toast(next === 'dark' ? 'Тёмная тема' : next === 'light' ? 'Светлая тема' : 'Тема как в системе');
  };

  /* ---------- поиск по всему приложению ---------- */
  S.searchIndex = null;
  S.buildIndex = () => {
    const idx = [];
    (S.course || []).forEach((m) => m.lessons.forEach((l) => idx.push({ kind: 'Урок', title: l.title, sub: m.title, go: 'lesson.' + l.id, text: (l.title + ' ' + S.strip(typeof l.html === 'function' ? l.html() : l.html)).toLowerCase() })));
    (S.glossary || []).forEach((g) => idx.push({ kind: 'Термин', title: g.term, sub: S.strip(g.def).slice(0, 90), go: null, term: g.id, text: (g.term + ' ' + (g.alt || '') + ' ' + S.strip(g.def)).toLowerCase() }));
    (S.formulas || []).forEach((f) => idx.push({ kind: 'Формула', title: f.name, sub: S.strip(f.f), go: 'formula.' + f.id, text: (f.name + ' ' + S.strip(f.f) + ' ' + S.strip(f.about || '')).toLowerCase() }));
    (S.devices || []).forEach((d) => idx.push({ kind: 'Аппарат', title: d.name, sub: d.short || '', go: 'device.' + d.id, text: (d.name + ' ' + (d.alt || '') + ' ' + S.strip(d.what || '')).toLowerCase() }));
    (S.norms || []).forEach((n) => idx.push({ kind: 'Норматив', title: n.code, sub: n.title, go: 'norm.' + n.id, text: (n.code + ' ' + n.title + ' ' + S.strip(n.about || '')).toLowerCase() }));
    (S.projects || []).forEach((p) => idx.push({ kind: 'Проект', title: p.title, sub: p.sub || '', go: 'project.' + p.id, text: (p.title + ' ' + S.strip(p.intro || '')).toLowerCase() }));
    S.searchIndex = idx;
  };
  S.openSearch = () => {
    if (!S.searchIndex) S.buildIndex();
    S.sheet('Поиск', `<div class="stack"><input class="inp" id="sq" type="search" placeholder="Например: УЗО, сечение, PEN, гребёнка" autocomplete="off"><div id="sres" class="search-res"></div></div>`, {
      focus: true,
      mount(body) {
        const inp = body.querySelector('#sq');
        const res = body.querySelector('#sres');
        const run = () => {
          const q = inp.value.trim().toLowerCase();
          if (q.length < 2) { res.innerHTML = '<div class="muted small">Введи хотя бы две буквы.</div>'; return; }
          const words = q.split(/\s+/);
          const hits = S.searchIndex.map((x) => {
            let sc = 0;
            for (const w of words) {
              if (x.title.toLowerCase().includes(w)) sc += 5;
              if (x.text.includes(w)) sc += 1; else return null;
            }
            return { x, sc };
          }).filter(Boolean).sort((a, b) => b.sc - a.sc).slice(0, 40);
          res.innerHTML = hits.length ? `<div class="list">${hits.map(({ x }) => x.term
            ? `<button class="li" type="button" data-term="${x.term}"><span class="badge">${x.kind}</span><span class="t"><b>${S.esc(x.title)}</b><span>${S.esc(x.sub)}</span></span></button>`
            : `<a class="li" href="#${x.go}" data-go="${x.go}"><span class="badge">${x.kind}</span><span class="t"><b>${S.esc(x.title)}</b><span>${S.esc(x.sub)}</span></span></a>`).join('')}</div>` : '<div class="empty">Ничего не нашлось. Попробуй другое слово.</div>';
        };
        inp.addEventListener('input', run);
        run();
      }
    });
  };

  /* ---------- оболочка ---------- */
  S.tabsDef = [
    { id: 'home', label: 'Главная', icon: 'home' },
    { id: 'course', label: 'Курс', icon: 'book' },
    { id: 'ref', label: 'Справочник', icon: 'ref' },
    { id: 'practice', label: 'Практика', icon: 'game' },
    { id: 'builder', label: 'Конструктор', icon: 'panel' },
    { id: 'claude', label: 'Разборы', icon: 'inbox', x: true, sep: true },
    { id: 'profile', label: 'Профиль', icon: 'user', x: true }
  ];
  /* PWA: установка и обновления (только на сайте) */
  S.installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installEvt = e; S.bus.emit('install', true); });
  window.addEventListener('appinstalled', () => { S.installEvt = null; S.bus.emit('install', false); S.toast('Приложение установлено'); });
  S.isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  S.isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function registerSW() {
    if (S.env !== 'pages' || !('serviceWorker' in navigator) || !window.isSecureContext) return;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading) return; reloading = true; location.reload(); });
    navigator.serviceWorker.register('sw.js').then((reg) => {
      const offer = (w) => S.toast('Вышла новая версия приложения', { label: 'Обновить', run: () => w.postMessage('skip') });
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w); });
      });
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    }).catch(() => { /* офлайн-режим недоступен */ });
  }
  S.persist = { asked: false, granted: null };
  S.askPersist = async () => {
    try {
      if (navigator.storage && navigator.storage.persist) {
        S.persist.granted = (await navigator.storage.persisted()) || (await navigator.storage.persist());
      }
    } catch (e) { S.persist.granted = null; }
    S.persist.asked = true;
    return S.persist.granted;
  };

  S.boot = () => {
    if (S.env === 'local' && window.claude && typeof window.claude.use === 'function') S.env = 'artifact';
    S.applyTheme();
    if (window.matchMedia) { try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', S.applyTheme); } catch (e) { /* ignore */ } }
    store.load();
    S.$('#tabs').innerHTML = S.tabsDef.map((t) => `<a class="tab${t.x ? ' x' : ''}${t.sep ? ' sep' : ''}" href="#${t.id}" data-go="${t.id}" data-tab="${t.id}">${S.icon(t.icon)}<span>${t.label}</span>${t.id === 'claude' ? '<b class="cnt" data-rzcnt hidden></b>' : ''}</a>`).join('') + '<div class="side-me" id="sideMe"></div>';
    const bb = S.$('#backBtn');
    bb.innerHTML = S.icon('back');
    bb.addEventListener('click', () => S.back());
    S.$('#searchBtn').innerHTML = S.icon('search');
    S.$('#searchBtn').addEventListener('click', () => S.openSearch());
    S.$('#inboxBtn').innerHTML = S.icon('inbox') + '<span class="pip" data-rzpip hidden></span>';
    S.$('#inboxBtn').addEventListener('click', () => S.go('claude'));
    S.$('#meBtn').addEventListener('click', () => S.go('profile'));
    S.bus.on('change', (why) => {
      if (why !== 'remote' && why !== 'import') return;
      const v = S.views[S.current.name];
      if (v && v.live) S.softRender();
    });
    S.bus.emit('boot');
    S.render();
    store.initRemote();
    registerSW();
    S.askPersist();
  };
})();
