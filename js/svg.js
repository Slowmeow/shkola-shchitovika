/* Школа щитовика — SVG: примитивы, провода, условные обозначения (УГО) и иллюстрации к урокам */
(function () {
  'use strict';
  const S = window.SHK;
  const V = (S.svg = {});

  /* ---------- примитивы ---------- */
  const st = (o) => {
    let s = '';
    if (o.f !== undefined) s += `fill:${o.f};`;
    if (o.s) s += `stroke:${o.s};`;
    if (o.w != null) s += `stroke-width:${o.w};`;
    if (o.d) s += `stroke-dasharray:${o.d};`;
    if (o.o != null) s += `opacity:${o.o};`;
    if (o.lc) s += `stroke-linecap:${o.lc};`;
    if (o.lj) s += `stroke-linejoin:${o.lj};`;
    return s;
  };
  V.st = st;
  V.ln = (x1, y1, x2, y2, o = {}) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="${st({ s: o.s || 'var(--ink)', w: o.w || 1.6, d: o.d, o: o.o, lc: o.lc || 'round' })}"/>`;
  V.pl = (pts, o = {}) => `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" style="${st({ f: o.f || 'none', s: o.s || 'var(--ink)', w: o.w || 1.6, d: o.d, o: o.o, lj: 'round', lc: 'round' })}"/>`;
  V.pg = (pts, o = {}) => `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" style="${st({ f: o.f || 'none', s: o.s || 'var(--ink)', w: o.w == null ? 1.6 : o.w, o: o.o, lj: 'round' })}"/>`;
  V.rc = (x, y, w, h, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx || 0}" style="${st({ f: o.f || 'none', s: o.s === null ? 'none' : (o.s || 'var(--ink)'), w: o.w == null ? 1.6 : o.w, d: o.d, o: o.o })}"/>`;
  V.ci = (cx, cy, r, o = {}) => `<circle cx="${cx}" cy="${cy}" r="${r}" style="${st({ f: o.f || 'none', s: o.s === null ? 'none' : (o.s || 'var(--ink)'), w: o.w == null ? 1.6 : o.w, d: o.d, o: o.o })}"/>`;
  V.el = (cx, cy, rx, ry, o = {}) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" style="${st({ f: o.f || 'none', s: o.s || 'var(--ink)', w: o.w == null ? 1.6 : o.w, d: o.d, o: o.o })}"/>`;
  V.pa = (d, o = {}) => `<path d="${d}" style="${st({ f: o.f || 'none', s: o.s === null ? 'none' : (o.s || 'var(--ink)'), w: o.w == null ? 1.6 : o.w, d: o.d, o: o.o, lj: 'round', lc: 'round' })}"/>`;
  V.tx = (x, y, str, o = {}) => `<text x="${x}" y="${y}" text-anchor="${o.a || 'start'}"${o.db ? ` dominant-baseline="${o.db}"` : ''}${o.rot ? ` transform="rotate(${o.rot} ${x} ${y})"` : ''} style="font-size:${o.size || 12}px;fill:${o.f || 'var(--ink)'};${o.wt ? `font-weight:${o.wt};` : ''}${o.fam ? `font-family:${o.fam};` : ''}${o.o != null ? `opacity:${o.o};` : ''}">${str}</text>`;
  V.tl = (x, y, lines, o = {}) => {
    const lh = o.lh || (o.size || 12) * 1.3;
    return `<text x="${x}" y="${y}" text-anchor="${o.a || 'start'}" style="font-size:${o.size || 12}px;fill:${o.f || 'var(--ink)'};${o.wt ? `font-weight:${o.wt};` : ''}${o.fam ? `font-family:${o.fam};` : ''}">${lines.map((l, i) => `<tspan x="${x}" dy="${i ? lh : 0}">${l}</tspan>`).join('')}</text>`;
  };
  V.arrow = (x1, y1, x2, y2, o = {}) => {
    const a = Math.atan2(y2 - y1, x2 - x1), L = o.head || 8;
    const p1 = [x2 - L * Math.cos(a - 0.4), y2 - L * Math.sin(a - 0.4)], p2 = [x2 - L * Math.cos(a + 0.4), y2 - L * Math.sin(a + 0.4)];
    return V.ln(x1, y1, x2, y2, o) + V.pg([[x2, y2], p1, p2], { f: o.s || 'var(--ink)', s: o.s || 'var(--ink)', w: 1 });
  };
  V.svg = (w, h, inner, o = {}) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${o.width || w}" ${o.noH ? '' : `height="${o.height || h}"`} role="img" aria-label="${S.esc(o.label || 'Иллюстрация')}" style="font-family:var(--font-body);fill:var(--ink);${o.style || ''}">${inner}</svg>`;
  V.mono = 'var(--font-mono)';

  /* ---------- провода ---------- */
  const WC = { L: 'var(--w-l1)', L1: 'var(--w-l1)', L2: 'var(--w-l2)', L3: 'var(--w-l3)', N: 'var(--w-n)', PE: 'var(--w-pe)', PEN: 'var(--w-n)', C: 'var(--ink-2)' };
  V.wc = WC;
  V.condName = { L: 'фаза', L1: 'фаза L1', L2: 'фаза L2', L3: 'фаза L3', N: 'ноль N', PE: 'земля PE', PEN: 'PEN', C: 'управление' };
  V.wire = (pts, cond, o = {}) => {
    const d = pts.map((p, i) => (i ? 'L' : 'M') + (+p[0]).toFixed(1) + ' ' + (+p[1]).toFixed(1)).join(' ');
    const w = o.w || 3;
    const op = o.o != null ? `opacity:${o.o};` : '';
    const col = WC[cond] || cond;
    let s = `<path d="${d}" style="fill:none;stroke:var(--w-edge);stroke-width:${w + 1.4};stroke-linejoin:round;stroke-linecap:round;${op}"/>`;
    s += `<path d="${d}" style="fill:none;stroke:${col};stroke-width:${w};stroke-linejoin:round;stroke-linecap:round;${op}"/>`;
    if (cond === 'PE' || cond === 'PEN') s += `<path d="${d}" style="fill:none;stroke:var(--w-pey);stroke-width:${w};stroke-dasharray:${(w * 2).toFixed(1)} ${(w * 2).toFixed(1)};stroke-linejoin:round;${op}"/>`;
    return s;
  };
  V.swatch = (cond) => cond === 'PE' ? 'background:repeating-linear-gradient(90deg,var(--w-pe) 0 6px,var(--w-pey) 6px 12px)'
    : cond === 'PEN' ? 'background:repeating-linear-gradient(90deg,var(--w-n) 0 6px,var(--w-pey) 6px 12px)' : `background:${WC[cond] || cond}`;

  /* ---------- УГО (ГОСТ 2.755, 2.721, 2.722, 2.727, 2.728, 2.729, 21.210) — вертикальная линия сверху вниз ---------- */
  const sym = (V.sym = {});
  // Контакт: линия, разрыв, подвижный контакт. Знаки функции на неподвижной части (ГОСТ 2.755-87, табл. 1): 'qf' — выключатель (крест),
  // 'qs' — разъединитель (черта), 'qsw' — выключатель-разъединитель (черта и кружок), 'km' — контактор (полукруг), 'qd' — черта (УЗО в этом приложении);
  // o.auto — знак автоматического срабатывания (квадратик) на подвижной части
  sym.contact = (x, y, h, kind, o = {}) => {
    const s = o.s || 'var(--ink)', w = o.w || 1.6;
    const a = y + h * 0.36, b = y + h * 0.64;
    let g = V.ln(x, y, x, a, { s, w }) + V.ln(x, b, x, y + h, { s, w }) + V.ln(x, b, x - h * 0.2, a + 1.5, { s, w });
    if (kind === 'qf') g += V.ln(x - 4, a - 4, x + 4, a + 4, { s, w }) + V.ln(x - 4, a + 4, x + 4, a - 4, { s, w });
    if (kind === 'qs' || kind === 'qd') g += V.ln(x - 4.5, a, x + 4.5, a, { s, w });
    if (kind === 'qsw') g += V.ln(x - 4.5, a, x + 4.5, a, { s, w }) + V.ci(x, a + 3.4, 2.4, { s, w: 1.3, f: 'var(--surface)' });
    if (kind === 'km') g += V.pa(`M${x} ${a - 8} A4 4 0 0 0 ${x} ${a}`, { s, w }); // полукруг сбоку от неподвижной части, как в ГОСТ 2.755-87
    if (o.auto) { const t = 0.5, px = x - h * 0.2 * t, py = b - (b - a - 1.5) * t; g += V.rc(px - 2.8, py - 2.8, 5.6, 5.6, { s, w: 1.3, f: 'var(--surface)' }); }
    return g;
  };
  sym.mcb = (x, y, h, o) => sym.contact(x, y, h, 'qf', o);
  sym.mcbFull = (x, y, h, o = {}) => sym.contact(x, y, h, 'qf', Object.assign({ auto: true }, o));
  sym.sw = (x, y, h, o) => sym.contact(x, y, h, 'qs', o);
  sym.swd = (x, y, h, o) => sym.contact(x, y, h, 'qsw', o);
  sym.km = (x, y, h, o) => sym.contact(x, y, h, 'km', o);
  // катушка с дополнительным полем слева (ГОСТ 2.756-76, табл. 1): 'on' — замедление при срабатывании (крест в поле),
  // 'off' — замедление при отпускании (поле с диагональю и залитым треугольником), 'th' — воспринимающая часть электротеплового реле, иначе — текст в поле
  sym.coilX = (x, y, kind, label = '', o = {}) => {
    const s = o.s || 'var(--ink)', w = 30, h = 14, f = 12;
    let g = V.ln(x, y - h / 2 - 8, x, y - h / 2, { s }) + V.ln(x, y + h / 2, x, y + h / 2 + 8, { s });
    if (kind === 'th') return g + V.rc(x - 10, y - h / 2, 20, h, { s, f: 'var(--surface)' }) + V.pa(`M${x - 10} ${y + 3} H${x - 3} V${y - 3} H${x + 3} V${y + 3} H${x + 10}`, { s, w: 1.3 }) + (label ? V.tx(x + 14, y + 4, label, { size: 9.5, fam: V.mono, wt: 600 }) : '');
    const x0 = x - w / 2 + 2;
    g += V.rc(x0, y - h / 2, w, h, { s, f: 'var(--surface)' }) + V.rc(x0 - f, y - h / 2, f, h, { s, f: 'var(--surface)' });
    if (kind === 'on') g += V.ln(x0 - f, y - h / 2, x0, y + h / 2, { s, w: 1.2 }) + V.ln(x0 - f, y + h / 2, x0, y - h / 2, { s, w: 1.2 });
    else if (kind === 'off') g += V.pa(`M${x0 - f} ${y + h / 2} L${x0} ${y - h / 2} L${x0} ${y + h / 2} Z`, { s, w: 1.2, f: s });
    else if (kind) g += V.tx(x0 - f / 2, y + 3.5, kind, { a: 'middle', size: 8, fam: V.mono, wt: 700 });
    return g + (label ? V.tx(x0 + w / 2, y + 3.5, label, { a: 'middle', size: 9, fam: V.mono, wt: 600 }) : '');
  };
  // контакт замыкающий с замедлением при срабатывании (ГОСТ 2.755-87, табл. 2, п. 15): дуга на подвижной части, замедление — при движении от дуги к её центру
  sym.noDelay = (x, y, h, o = {}) => {
    const s = o.s || 'var(--ink)';
    const a = y + h * 0.36, b = y + h * 0.64, mx = x - h * 0.1, my = (a + b) / 2;
    return sym.contact(x, y, h, '', o) + V.ln(mx, my - 1.5, mx - 9, my - 1.5, { s, w: 1.2 }) + V.ln(mx, my + 1.5, mx - 9, my + 1.5, { s, w: 1.2 }) + V.pa(`M${mx - 9} ${my - 6} A6 6 0 0 0 ${mx - 9} ${my + 6}`, { s, w: 1.3 });
  };
  // кнопка: контакт и нажимной привод (знак «E») на линии механической связи; nc — размыкающая
  sym.button = (x, y, h, nc, o = {}) => {
    const s = o.s || 'var(--ink)';
    const a = y + h * 0.36, b = y + h * 0.64, mx = x - h * 0.1, my = (a + b) / 2;
    let g = V.ln(x, y, x, a, { s }) + V.ln(x, b, x, y + h, { s });
    if (nc) g += V.ln(x, a, x - h * 0.24, a, { s }) + V.ln(x, b, x - h * 0.28, a - 3, { s });
    else g += V.ln(x, b, x - h * 0.2, a + 1.5, { s });
    const ex = mx - 18;
    return g + V.ln(mx, my, ex, my, { s, w: 1.2, d: '3 2.5' }) + V.pa(`M${ex + 2} ${my - 6} H${ex - 3} V${my + 6} H${ex + 2} M${ex - 3} ${my} H${ex}`, { s, w: 1.4 });
  };
  // сигнальная лампа с кодом цвета по ГОСТ 2.732-68 (C2 — красный, C5 — зелёный…)
  sym.lampC = (x, y, code, o = {}) => sym.lamp(x, y, 9, o) + (code ? V.tx(x + 12, y - 6, code, { size: 9, fam: V.mono, wt: 700 }) : '');
  // трансформатор тока (ГОСТ 2.723-68, табл., п. 30): первичная цепь проходит через окружность, выводы вторичной обмотки — вправо
  sym.ta = (x, y, h, o = {}) => {
    const s = o.s || 'var(--ink)', c = y + h / 2, r = 8;
    return V.ln(x, y, x, y + h, { s }) + V.ci(x, y + 4, 2.2, { s: null, f: s }) + V.ci(x, y + h - 4, 2.2, { s: null, f: s }) + V.ci(x, c, r, { s }) + V.ln(x + r, c - 2.5, x + r + 12, c - 2.5, { s }) + V.ln(x + r, c + 2.5, x + r + 12, c + 2.5, { s });
  };
  // показывающий прибор (ГОСТ 2.729-68): окружность с буквой величины
  sym.gauge = (x, y, letter, o = {}) => V.ci(x, y, 11, { s: o.s || 'var(--ink)', f: 'var(--surface)' }) + V.tx(x, y + 4.5, letter, { a: 'middle', size: 12, wt: 700 });
  // интегрирующий прибор — счётчик: прямоугольник с полосой сверху (ГОСТ 2.729-68)
  sym.meterG = (x, y, o = {}) => { const s = o.s || 'var(--ink)'; return V.rc(x - 14, y - 12, 28, 24, { s, f: 'var(--surface)' }) + V.ln(x - 14, y - 6, x + 14, y - 6, { s }) + V.tx(x, y + 8, 'Wh', { a: 'middle', size: 10, wt: 700 }); };
  // варистор (ГОСТ 2.728-74, табл. 1, п. 14): резистор, перечёркнутый ломаной линией, и буква U
  sym.varistor = (x, y, h, o = {}) => { const s = o.s || 'var(--ink)'; const c = y + h / 2; return V.ln(x, y, x, y + h, { s }) + V.rc(x - 5, c - 12, 10, 24, { s, f: 'var(--surface)' }) + V.pa(`M${x - 11} ${c + 15} H${x - 6} L${x + 9} ${c - 15}`, { s, w: 1.3 }) + V.tx(x + 10, c + 15, 'U', { size: 9.5, wt: 700 }); };
  // разрядник, общее обозначение (ГОСТ 2.727-68, табл. 1, п. 2): прямоугольник со стрелкой
  sym.arrester = (x, y, h, o = {}) => { const s = o.s || 'var(--ink)'; const c = y + h / 2; return V.ln(x, y, x, c - 12, { s }) + V.ln(x, c + 12, x, y + h, { s }) + V.rc(x - 5, c - 12, 10, 24, { s, f: 'var(--surface)' }) + V.ln(x, c - 12, x, c + 4, { s }) + V.pa(`M${x - 3.5} ${c - 1} L${x} ${c + 6} L${x + 3.5} ${c - 1} Z`, { s, f: s, w: 1 }); };
  // изображения на планах (ГОСТ 21.210-2014, табл. 4–6)
  sym.planSocket = (x, y, o = {}) => {
    const s = o.s || 'var(--ink)', r = 6;
    let g = V.pa(`M${x - r} ${y} A${r} ${r} 0 0 1 ${x + r} ${y} Z`, { s, f: o.ip44 ? s : 'var(--surface)', w: 1.6 }) + V.ln(x, y - r, x, y - r - 6, { s, w: 1.6 });
    if (o.pe) g += V.ln(x - 5, y - r - 3, x + 5, y - r - 3, { s, w: 1.6 });
    if (o.hidden) g += V.ln(x, y, x, y - r, { s, w: 1.4 });
    return g;
  };
  sym.planSwitch = (x, y, o = {}) => {
    const s = o.s || 'var(--ink)', keys = o.keys || 1;
    let g = V.ci(x, y, 2.8, { s, f: o.ip44 ? s : 'var(--surface)', w: 1.6 });
    for (let k = 0; k < keys; k++) {
      const ang = -Math.PI / 4 + (k - (keys - 1) / 2) * 0.45, ex = x + 13 * Math.cos(ang), ey = y + 13 * Math.sin(ang);
      g += V.ln(x + 2.8 * Math.cos(ang), y + 2.8 * Math.sin(ang), ex, ey, { s, w: 1.6 });
      const px = -Math.sin(ang), py = Math.cos(ang); // перпендикуляр к линии
      g += o.hidden ? V.ln(ex - px * 3.5, ey - py * 3.5, ex + px * 3.5, ey + py * 3.5, { s, w: 1.6 }) : V.ln(ex, ey, ex + px * 4, ey + py * 4, { s, w: 1.6 });
    }
    return g;
  };
  sym.planLamp = (x, y, o = {}) => (o.linear ? V.rc(x - 10, y - 2.5, 20, 5, { s: o.s || 'var(--ink)', f: 'var(--surface)', w: 1.6 }) : V.ci(x, y, 5, { s: o.s || 'var(--ink)', f: 'var(--surface)', w: 1.6 }));
  sym.planBoard = (x, y, o = {}) => { const s = o.s || 'var(--ink)'; return o.cabinet ? V.rc(x - 9, y - 4, 18, 8, { s: null, f: s }) + V.rc(x - 6, y - 1, 12, 2, { s: null, f: 'var(--surface)' }) : V.rc(x - 9, y - 4, 18, 8, { s: null, f: s }); };
  // защитное заземление — знак заземления в круге (ГОСТ 2.721-74)
  sym.pe = (x, y, o = {}) => { const s = o.s || 'var(--ink)'; return V.ln(x, y - 16, x, y - 4, { s }) + V.ci(x, y + 2, 11, { s }) + V.ln(x - 7, y - 3, x + 7, y - 3, { s }) + V.ln(x - 4.5, y + 1.5, x + 4.5, y + 1.5, { s }) + V.ln(x - 2, y + 6, x + 2, y + 6, { s }); };
  sym.rcd = (x, y, h, o = {}) => {
    const s = o.s || 'var(--ink)';
    const c = y + h * 0.84;
    return sym.contact(x, y, h * 0.62, 'qd', o) + V.ln(x, y + h * 0.62, x, y + h, { s }) + V.el(x, c, 8, 4.2, { s }) + V.pa(`M${x + 8} ${c} H${x + 13} V${y + h * 0.3} H${x + 3}`, { s, w: 1.1, d: '3 2.5' });
  };
  sym.rcbo = (x, y, h, o = {}) => {
    const s = o.s || 'var(--ink)';
    const c = y + h * 0.84;
    return sym.contact(x, y, h * 0.62, 'qf', o) + V.ln(x, y + h * 0.62, x, y + h, { s }) + V.el(x, c, 8, 4.2, { s }) + V.pa(`M${x + 8} ${c} H${x + 13} V${y + h * 0.3} H${x + 5}`, { s, w: 1.1, d: '3 2.5' });
  };
  sym.fuse = (x, y, h, o = {}) => { const s = o.s || 'var(--ink)'; return V.ln(x, y, x, y + h, { s }) + V.rc(x - 5, y + h * 0.25, 10, h * 0.5, { s, f: 'var(--surface)' }) + V.ln(x, y + h * 0.25, x, y + h * 0.75, { s }); };
  sym.box = (x, y, h, label, o = {}) => { const s = o.s || 'var(--ink)'; const bw = o.bw || 26; return V.ln(x, y, x, y + h * 0.2, { s }) + V.rc(x - bw / 2, y + h * 0.2, bw, h * 0.6, { s, f: 'var(--surface)' }) + V.tx(x, y + h * 0.5 + 4, label, { a: 'middle', size: o.size || 10, fam: V.mono, wt: 600 }) + V.ln(x, y + h * 0.8, x, y + h, { s }); };
  sym.meter = (x, y, h, o) => sym.box(x, y, h, 'Wh', Object.assign({ bw: 28 }, o));
  sym.rn = (x, y, h, o) => sym.box(x, y, h, 'U', Object.assign({ bw: 24 }, o));
  sym.ground = (x, y, o = {}) => { const s = o.s || 'var(--ink)'; return V.ln(x, y, x, y + 6, { s }) + V.ln(x - 8, y + 6, x + 8, y + 6, { s }) + V.ln(x - 5, y + 10, x + 5, y + 10, { s }) + V.ln(x - 2, y + 14, x + 2, y + 14, { s }); };
  sym.spd = (x, y, h, o = {}) => {
    const s = o.s || 'var(--ink)';
    return V.ln(x, y, x, y + h * 0.22, { s }) + V.rc(x - 6, y + h * 0.22, 12, h * 0.42, { s, f: 'var(--surface)' }) + V.ln(x - 9, y + h * 0.62, x + 9, y + h * 0.26, { s, w: 1.2 }) + V.ln(x, y + h * 0.64, x, y + h * 0.8, { s }) + sym.ground(x, y + h * 0.8, { s });
  };
  sym.lamp = (x, y, r = 9, o = {}) => { const s = o.s || 'var(--ink)'; return V.ci(x, y, r, { s, f: 'var(--surface)' }) + V.ln(x - r * 0.7, y - r * 0.7, x + r * 0.7, y + r * 0.7, { s }) + V.ln(x - r * 0.7, y + r * 0.7, x + r * 0.7, y - r * 0.7, { s }); };
  sym.socket = (x, y, o = {}) => { const s = o.s || 'var(--ink)'; return V.pa(`M${x - 9} ${y} A9 9 0 0 1 ${x + 9} ${y} Z`, { s, f: 'var(--surface)' }) + V.ln(x - 11, y, x + 11, y, { s }) + V.ln(x, y - 9, x, y - 14, { s }); };
  sym.motor = (x, y, r = 12, o = {}) => V.ci(x, y, r, { s: o.s || 'var(--ink)', f: 'var(--surface)' }) + V.tx(x, y + 4.5, 'M', { a: 'middle', size: 13, wt: 700 });
  sym.coil = (x, y, w = 26, h = 14, label = '', o = {}) => V.rc(x - w / 2, y - h / 2, w, h, { s: o.s || 'var(--ink)', f: 'var(--surface)' }) + (label ? V.tx(x, y + 4, label, { a: 'middle', size: 9.5, fam: V.mono, wt: 600 }) : '');
  sym.heater = (x, y, w = 30, h = 12, o = {}) => V.rc(x - w / 2, y - h / 2, w, h, { s: o.s || 'var(--ink)', f: 'var(--surface)' }) + V.pa(`M${x - w / 2 + 4} ${y} l3 -4 l4 8 l4 -8 l4 8 l4 -8 l3 4`, { s: o.s || 'var(--ink)', w: 1.2 });
  sym.ct = (x, y, o = {}) => V.ci(x, y, 7, { s: o.s || 'var(--ink)' });
  // кнопки и контакты для схем управления (горизонтальные, слева направо)
  sym.noH = (x, y, len = 34, o = {}) => { const s = o.s || 'var(--ink)'; const a = x + len * 0.3, b = x + len * 0.7; return V.ln(x, y, a, y, { s }) + V.ln(b, y, x + len, y, { s }) + V.ln(a, y, b - 1, y - 9, { s }); };
  sym.ncH = (x, y, len = 34, o = {}) => { const s = o.s || 'var(--ink)'; const a = x + len * 0.3, b = x + len * 0.7; return V.ln(x, y, a, y, { s }) + V.ln(b, y, x + len, y, { s }) + V.ln(a, y, b + 2, y - 7, { s }) + V.ln(b, y, b, y - 9, { s }); };

  /* ---------- иллюстрации к урокам ---------- */
  const I = (S.ill = {});
  const M = V.mono;

  I.water = () => V.svg(400, 210, [
    V.rc(20, 20, 70, 110, { s: 'var(--ink-2)', f: 'none', w: 2 }),
    V.rc(22, 45, 66, 83, { s: null, f: 'var(--w-n)', o: 0.28 }),
    V.ln(20, 45, 90, 45, { s: 'var(--w-n)', w: 1.5 }),
    V.tl(55, 70, ['Бак', 'высоко'], { a: 'middle', size: 12, wt: 600 }),
    V.pa('M90 112 H190 M90 128 H190', { s: 'var(--ink-2)', w: 2 }),
    V.pa('M190 112 L215 116 H265 L290 112 H370 V175 H40 V130', { s: 'var(--ink-2)', w: 2 }),
    V.pa('M190 128 L215 124 H265 L290 128 H354 V159 H56 V130', { s: 'var(--ink-2)', w: 2 }),
    V.rc(91, 113, 98, 14, { s: null, f: 'var(--w-n)', o: 0.28 }),
    V.rc(216, 117, 48, 6, { s: null, f: 'var(--w-n)', o: 0.28 }),
    V.rc(291, 113, 62, 14, { s: null, f: 'var(--w-n)', o: 0.28 }),
    V.arrow(110, 120, 160, 120, { s: 'var(--w-n)', w: 2 }),
    V.arrow(300, 120, 345, 120, { s: 'var(--w-n)', w: 2 }),
    V.ci(240, 167, 9, { s: 'var(--ink-2)', f: 'var(--surface)' }),
    V.pa('M231 167 H249 M240 158 V176', { s: 'var(--ink-2)', w: 1.4 }),
    V.tx(240, 196, 'полезная работа (лампа, чайник)', { a: 'middle', size: 11, f: 'var(--ink-2)' }),
    V.tx(110, 18, 'Напряжение U = давление', { size: 12.5, wt: 700 }),
    V.tx(110, 34, '(насколько высоко подняли воду)', { size: 11, f: 'var(--ink-2)' }),
    V.tx(150, 104, 'Ток I = поток воды', { a: 'middle', size: 12.5, wt: 700 }),
    V.tx(240, 92, 'R = узкое место', { a: 'middle', size: 12.5, wt: 700 }),
    V.arrow(240, 96, 240, 112, { s: 'var(--ink)', w: 1.2, head: 6 })
  ].join(''), { label: 'Аналогия: электричество как вода в трубах' });

  I.ohm = () => V.svg(380, 220, [
    V.pg([[190, 18], [320, 196], [60, 196]], { s: 'var(--ink)', w: 2, f: 'var(--signal-soft)' }),
    V.ln(110, 128, 270, 128, { w: 2 }), V.ln(190, 128, 190, 196, { w: 2 }),
    V.tx(190, 104, 'U', { a: 'middle', size: 34, wt: 700, fam: M }),
    V.tx(145, 177, 'I', { a: 'middle', size: 30, wt: 700, fam: M }),
    V.tx(236, 177, 'R', { a: 'middle', size: 30, wt: 700, fam: M }),
    V.tx(330, 60, 'U = I · R', { a: 'end', size: 14, fam: M }),
    V.tx(330, 80, 'I = U / R', { a: 'end', size: 14, fam: M }),
    V.tx(330, 100, 'R = U / I', { a: 'end', size: 14, fam: M }),
    V.tx(190, 214, 'Закрой пальцем то, что ищешь, — останется формула', { a: 'middle', size: 11.5, f: 'var(--ink-2)' })
  ].join(''), { label: 'Треугольник закона Ома' });

  I.power = () => V.svg(380, 220, [
    V.pg([[190, 18], [320, 196], [60, 196]], { s: 'var(--ink)', w: 2, f: 'var(--signal-soft)' }),
    V.ln(110, 128, 270, 128, { w: 2 }), V.ln(190, 128, 190, 196, { w: 2 }),
    V.tx(190, 104, 'P', { a: 'middle', size: 34, wt: 700, fam: M }),
    V.tx(145, 177, 'U', { a: 'middle', size: 30, wt: 700, fam: M }),
    V.tx(236, 177, 'I', { a: 'middle', size: 30, wt: 700, fam: M }),
    V.tx(338, 60, 'P = U · I', { a: 'end', size: 14, fam: M }),
    V.tx(338, 80, 'I = P / U', { a: 'end', size: 14, fam: M }),
    V.tx(338, 100, 'U = P / I', { a: 'end', size: 14, fam: M }),
    V.tx(190, 214, 'Мощность в ваттах, напряжение в вольтах, ток в амперах', { a: 'middle', size: 11.5, f: 'var(--ink-2)' })
  ].join(''), { label: 'Треугольник мощности' });

  const sine = (x0, y0, w, amp, periods, phase, steps = 120) => {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      pts.push([x0 + t * w, y0 - amp * Math.sin(2 * Math.PI * periods * t + phase)]);
    }
    return pts;
  };
  I.ac = () => {
    const x0 = 50, w = 300, y0 = 105;
    return V.svg(400, 215, [
      V.ln(x0, y0, x0 + w + 12, y0, { s: 'var(--ink-3)' }), V.ln(x0, 20, x0, 190, { s: 'var(--ink-3)' }),
      V.ln(x0, y0 - 80, x0 + w, y0 - 80, { s: 'var(--ink-3)', d: '3 4', w: 1 }), V.ln(x0, y0 + 80, x0 + w, y0 + 80, { s: 'var(--ink-3)', d: '3 4', w: 1 }),
      V.ln(x0, y0 - 56.6, x0 + w, y0 - 56.6, { s: 'var(--ok)', d: '6 4', w: 1.2 }),
      V.pl(sine(x0, y0, w, 80, 2, 0), { s: 'var(--w-l1)', w: 2.6 }),
      V.tx(x0 - 6, y0 - 76, '+325', { a: 'end', size: 11, fam: M }), V.tx(x0 - 6, y0 + 84, '−325', { a: 'end', size: 11, fam: M }),
      V.tx(x0 - 6, y0 + 4, '0', { a: 'end', size: 11, fam: M }),
      V.tx(x0 + w - 4, y0 - 61, '230 В — действующее значение', { a: 'end', size: 11, f: 'var(--ok)', wt: 600 }),
      V.pa(`M${x0} ${y0 + 96} H${x0 + w / 2}`, { s: 'var(--ink)', w: 1.2 }), V.ln(x0, y0 + 91, x0, y0 + 101, { w: 1.2 }), V.ln(x0 + w / 2, y0 + 91, x0 + w / 2, y0 + 101, { w: 1.2 }),
      V.tx(x0 + w / 4, y0 + 110, '20 мс = 1 период (50 в секунду)', { a: 'middle', size: 11.5 }),
      V.tx(x0 + w + 10, y0 + 16, 't', { size: 12, fam: M }), V.tx(x0 + 6, 18, 'U, В', { size: 11, fam: M })
    ].join(''), { label: 'Синусоида переменного напряжения 230 В, 50 Гц' });
  };

  I.three = () => {
    const x0 = 20, w = 230, y0 = 100, a = 62;
    const cx = 330, cy = 100, r = 52;
    const pts = [0, 1, 2].map((k) => [cx + r * Math.cos(-Math.PI / 2 + k * 2 * Math.PI / 3), cy + r * Math.sin(-Math.PI / 2 + k * 2 * Math.PI / 3)]);
    return V.svg(400, 205, [
      V.ln(x0, y0, x0 + w, y0, { s: 'var(--ink-3)' }),
      V.pl(sine(x0, y0, w, a, 1.5, 0), { s: 'var(--w-l1)', w: 2.4 }),
      V.pl(sine(x0, y0, w, a, 1.5, -2 * Math.PI / 3), { s: 'var(--w-l2)', w: 2.4 }),
      V.pl(sine(x0, y0, w, a, 1.5, -4 * Math.PI / 3), { s: 'var(--w-l3)', w: 2.4 }),
      V.tx(x0, 192, 'Три синусоиды сдвинуты на треть периода (120°)', { size: 11, f: 'var(--ink-2)' }),
      ...pts.map((p, k) => V.wire([[cx, cy], p], ['L1', 'L2', 'L3'][k], { w: 2.4 })),
      V.ci(cx, cy, 4, { f: 'var(--w-n)', s: 'var(--w-n)' }),
      V.ln(pts[1][0], pts[1][1], pts[2][0], pts[2][1], { s: 'var(--ink)', d: '4 3', w: 1.3 }),
      V.tx(pts[0][0] + 6, pts[0][1] + 4, 'L1', { size: 12, fam: M, wt: 700 }),
      V.tx(pts[1][0] + 4, pts[1][1] + 14, 'L2', { size: 12, fam: M, wt: 700 }),
      V.tx(pts[2][0] - 22, pts[2][1] + 14, 'L3', { size: 12, fam: M, wt: 700 }),
      V.tx(cx + 8, cy + 4, 'N', { size: 12, fam: M, wt: 700, f: 'var(--w-n)' }),
      V.tx(cx - 30, cy - 22, '230', { size: 11, fam: M, a: 'end' }),
      V.tx(cx, pts[1][1] + 32, '400 В между фазами', { size: 11, a: 'middle', fam: M }),
      V.tx(cx - 60, cy - 50, 'фаза–ноль', { size: 10.5, f: 'var(--ink-2)', a: 'end' })
    ].join(''), { label: 'Три фазы: 230 В между фазой и нулём, 400 В между фазами' });
  };

  /* системы заземления */
  const earthSys = (type) => {
    const W = 440, H = 200;
    const sx = 40; // источник
    const ys = { L1: 40, L2: 58, L3: 76, N: 94, PE: 112 };
    const g = [];
    // трансформатор
    g.push(V.rc(10, 30, 50, 96, { s: 'var(--ink-2)', f: 'var(--surface-2)', rx: 6 }));
    g.push(V.tx(35, 24, 'ТП', { a: 'middle', size: 12, wt: 700 }));
    g.push(V.ci(30, 84, 13, { s: 'var(--ink-2)' }));
    g.push(V.pa('M30 84 L30 74 M30 84 L21 90 M30 84 L39 90', { s: 'var(--ink-2)', w: 1.4 }));
    const xEnd = 300, xSplit = 210;
    const lines = [];
    ['L1', 'L2', 'L3'].forEach((p) => lines.push(V.wire([[sx + 20, ys[p]], [xEnd, ys[p]]], p, { w: 2.6 })));
    g.push(V.tx(sx + 24, ys.L1 - 5, 'L1 L2 L3', { size: 10, fam: M, f: 'var(--ink-2)' }));
    // нейтраль источника
    const neutralX = 30;
    if (type === 'IT') {
      g.push(V.pa(`M${neutralX} 97 V150`, { s: 'var(--ink-3)', w: 1.4, d: '4 3' }));
      g.push(V.tx(neutralX + 6, 146, 'изолирована', { size: 10, f: 'var(--ink-2)' }));
    } else {
      g.push(V.ln(neutralX, 97, neutralX, 150, { s: 'var(--ink)', w: 1.6 }));
      g.push(sym.ground(neutralX, 150));
    }
    // нейтраль и защитные проводники
    if (type === 'TN-C') {
      lines.push(V.wire([[neutralX, 120], [neutralX + 30, ys.N], [xEnd, ys.N]], 'PEN', { w: 2.6 }));
      g.push(V.tx(xSplit - 50, ys.N - 5, 'PEN', { size: 11, fam: M, wt: 700 }));
    } else if (type === 'TN-S') {
      lines.push(V.wire([[neutralX, 120], [neutralX + 30, ys.N], [xEnd, ys.N]], 'N', { w: 2.6 }));
      lines.push(V.wire([[neutralX, 128], [neutralX + 30, ys.PE], [xEnd, ys.PE]], 'PE', { w: 2.6 }));
      g.push(V.tx(xSplit - 30, ys.N - 5, 'N', { size: 11, fam: M, wt: 700 }));
      g.push(V.tx(xSplit - 30, ys.PE + 15, 'PE', { size: 11, fam: M, wt: 700 }));
    } else if (type === 'TN-C-S') {
      lines.push(V.wire([[neutralX, 120], [neutralX + 30, ys.N], [xSplit, ys.N]], 'PEN', { w: 2.6 }));
      lines.push(V.wire([[xSplit, ys.N], [xEnd, ys.N]], 'N', { w: 2.6 }));
      lines.push(V.wire([[xSplit, ys.N], [xSplit, ys.PE], [xEnd, ys.PE]], 'PE', { w: 2.6 }));
      g.push(V.ci(xSplit, ys.N, 3.6, { f: 'var(--ink)', s: 'var(--ink)' }));
      g.push(V.ln(xSplit, ys.PE, xSplit, 150, { w: 1.4 }));
      g.push(sym.ground(xSplit, 150));
      g.push(V.tx(120, ys.N - 5, 'PEN', { size: 11, fam: M, wt: 700 }));
      g.push(V.tx(xSplit + 8, 172, 'разделение PEN', { size: 10.5, f: 'var(--ink-2)' }));
      g.push(V.tx(xSplit + 8, 185, 'на вводе + повт. заземление', { size: 10.5, f: 'var(--ink-2)' }));
    } else if (type === 'TT' || type === 'IT') {
      if (type === 'TT') {
        lines.push(V.wire([[neutralX, 120], [neutralX + 30, ys.N], [xEnd, ys.N]], 'N', { w: 2.6 }));
        g.push(V.tx(xSplit - 30, ys.N - 5, 'N', { size: 11, fam: M, wt: 700 }));
      }
    }
    // потребитель
    g.push(V.rc(xEnd, 28, 120, 110, { s: 'var(--ink-2)', f: 'var(--surface)', rx: 8 }));
    g.push(V.tx(xEnd + 60, 22, 'Потребитель', { a: 'middle', size: 12, wt: 700 }));
    g.push(V.rc(xEnd + 30, 56, 64, 48, { s: 'var(--ink)', f: 'var(--surface-2)', rx: 4, w: 2 }));
    g.push(V.tx(xEnd + 62, 84, 'корпус', { a: 'middle', size: 11 }));
    // присоединение корпуса
    if (type === 'TN-C') g.push(V.wire([[xEnd + 62, 104], [xEnd + 62, ys.N + 30], [xEnd + 10, ys.N + 30], [xEnd + 10, ys.N]], 'PEN', { w: 2 }));
    if (type === 'TN-S' || type === 'TN-C-S') g.push(V.wire([[xEnd + 62, 104], [xEnd + 62, ys.PE], [xEnd, ys.PE]], 'PE', { w: 2 }));
    if (type === 'TT' || type === 'IT') {
      g.push(V.wire([[xEnd + 62, 104], [xEnd + 62, 150]], 'PE', { w: 2 }));
      g.push(sym.ground(xEnd + 62, 150));
      g.push(V.tx(xEnd + 50, 164, 'свой заземлитель', { a: 'end', size: 10.5, f: 'var(--ink-2)' })); // слева от знака земли, чтобы не обрезалось
    }
    const names = {
      'TN-C': 'TN-C: ноль и земля — один провод PEN (старые дома)',
      'TN-S': 'TN-S: N и PE раздельно от самой подстанции',
      'TN-C-S': 'TN-C-S: до ввода PEN, в здании — отдельные N и PE',
      'TT': 'TT: земля у потребителя своя, с нейтралью не связана',
      'IT': 'IT: нейтраль источника изолирована (больницы, производство)'
    };
    g.push(V.tx(10, H - 4, names[type], { size: 11.5, wt: 600 }));
    return V.svg(W, H, g.join('') + lines.join(''), { label: names[type] });
  };
  ['TN-C', 'TN-S', 'TN-C-S', 'TT', 'IT'].forEach((t) => { I[t.toLowerCase().replace(/-/g, '')] = () => earthSys(t); });

  I.body = () => {
    const x0 = 20, w = 360, y = 100;
    const xs = (mA) => x0 + (Math.log10(mA) + 0.3) / (Math.log10(500) + 0.3) * w;
    const z = [[0.5, 1, 'var(--ok)'], [1, 10, 'var(--signal)'], [10, 50, 'var(--warn)'], [50, 500, 'var(--bad)']];
    const marks = [[1, '1 мА', 'чувствуешь'], [10, '10 мА', 'не отпустить провод'], [30, '30 мА', 'уставка УЗО'], [100, '100 мА', 'остановка сердца']];
    return V.svg(400, 180, [
      ...z.map(([a, b, c]) => V.rc(xs(a), y - 12, xs(b) - xs(a), 24, { s: null, f: c, o: 0.75 })),
      V.rc(x0, y - 12, w, 24, { s: 'var(--ink-2)', w: 1 }),
      ...marks.map(([v, l, t], i) => V.ln(xs(v), y - 18, xs(v), y + 18, { w: 1.6 }) + V.tx(xs(v), i % 2 ? y + 34 : y - 26, l, { a: 'middle', size: 12, fam: M, wt: 700 }) + V.tx(xs(v), i % 2 ? y + 49 : y - 41, t, { a: 'middle', size: 11, f: 'var(--ink-2)' })),
      V.tx(x0, 170, 'Ток через тело человека (переменный, 50 Гц), шкала логарифмическая', { size: 10.5, f: 'var(--ink-3)' })
    ].join(''), { label: 'Опасность тока для человека' });
  };

  I.mcb = () => V.svg(400, 250, [
    V.rc(110, 20, 150, 210, { s: 'var(--ink)', f: 'var(--surface)', rx: 10, w: 2 }),
    V.rc(160, 8, 50, 12, { s: 'var(--ink-2)', f: 'var(--surface-2)' }), V.tx(185, 17, '1', { a: 'middle', size: 9, fam: M }),
    V.rc(160, 230, 50, 12, { s: 'var(--ink-2)', f: 'var(--surface-2)' }), V.tx(185, 239, '2', { a: 'middle', size: 9, fam: M }),
    V.wire([[185, 20], [185, 40], [150, 40], [150, 52]], 'L', { w: 2.2 }),
    V.pa('M138 52 h24 M138 58 q12 6 24 0 M138 66 q12 6 24 0 M138 74 q12 6 24 0 M138 82 q12 6 24 0 M138 90 h24', { s: 'var(--w-l1)', w: 2 }),
    V.wire([[150, 92], [150, 120], [176, 132]], 'L', { w: 2.2 }),
    V.ln(176, 132, 196, 122, { s: 'var(--ink)', w: 3 }),
    V.ci(198, 121, 3, { f: 'var(--ink)' }),
    V.rc(206, 104, 40, 48, { s: 'var(--ink-2)', f: 'var(--surface-2)' }),
    V.pa('M210 112 h32 M210 120 h32 M210 128 h32 M210 136 h32 M210 144 h32', { s: 'var(--ink-3)', w: 1.4 }),
    V.wire([[196, 140], [185, 160], [185, 178]], 'L', { w: 2.2 }),
    V.pa('M180 178 C178 192 192 196 190 210', { s: 'var(--warn)', w: 4 }),
    V.wire([[185, 212], [185, 230]], 'L', { w: 2.2 }),
    V.rc(122, 150, 26, 40, { s: 'var(--ink)', f: 'var(--surface-3)', rx: 4 }), V.tx(135, 174, 'I/0', { a: 'middle', size: 9, fam: M }),
    V.arrow(102, 70, 136, 70, { s: 'var(--ink-2)', w: 1.2, head: 6 }), V.tl(98, 64, ['катушка:', 'КЗ → мгновенно'], { a: 'end', size: 11 }),
    V.arrow(102, 196, 176, 196, { s: 'var(--ink-2)', w: 1.2, head: 6 }), V.tl(98, 190, ['биметалл:', 'перегрузка → нагрев'], { a: 'end', size: 11 }),
    V.arrow(300, 128, 248, 128, { s: 'var(--ink-2)', w: 1.2, head: 6 }), V.tl(304, 122, ['дугогасительная', 'камера'], { size: 11 }),
    V.arrow(300, 92, 202, 120, { s: 'var(--ink-2)', w: 1.2, head: 6 }), V.tl(304, 86, ['контакты'], { size: 11 }),
    V.tl(304, 196, ['верх — питание,', 'низ — нагрузка'], { size: 11, f: 'var(--ink-2)' })
  ].join(''), { label: 'Устройство автоматического выключателя' });

  I.curves = () => {
    const x0 = 46, y0 = 14, W = 330, H = 200;
    const lx = (m) => x0 + Math.log10(m) / Math.log10(40) * W;
    const ly = (t) => y0 + (Math.log10(10000) - Math.log10(t)) / (Math.log10(10000) - Math.log10(0.005)) * H;
    const g = [];
    [1, 2, 3, 5, 10, 20, 40].forEach((m) => { g.push(V.ln(lx(m), y0, lx(m), y0 + H, { s: 'var(--line)', w: 1 })); g.push(V.tx(lx(m), y0 + H + 14, String(m), { a: 'middle', size: 10.5, fam: M })); });
    [[0.01, '0,01'], [0.1, '0,1'], [1, '1'], [10, '10'], [100, '100'], [1000, '1000'], [10000, '10⁴']].forEach(([t, l]) => { g.push(V.ln(x0, ly(t), x0 + W, ly(t), { s: 'var(--line)', w: 1 })); g.push(V.tx(x0 - 5, ly(t) + 4, l, { a: 'end', size: 10, fam: M })); });
    const band = (lo, hi, col, name) => {
      const up = [[1.45, 3600], [2, 300], [3, 50], [4, 20], [hi, 8], [hi, 0.005]];
      const low = [[1.13, 10000], [1.3, 2000], [1.6, 300], [2, 60], [3, 8], [lo, 3], [lo, 0.005]];
      const d = 'M' + up.map((p) => `${lx(p[0]).toFixed(1)} ${ly(p[1]).toFixed(1)}`).join(' L') + ' L' + low.slice().reverse().map((p) => `${lx(p[0]).toFixed(1)} ${ly(p[1]).toFixed(1)}`).join(' L') + ' Z';
      return V.pa(d, { f: col, s: col, w: 1, o: 0.32 }) + V.tx(lx((lo + hi) / 2), ly(0.02), name, { a: 'middle', size: 13, wt: 700, fam: M });
    };
    g.push(band(3, 5, 'var(--ok)', 'B'));
    g.push(band(5, 10, 'var(--signal)', 'C'));
    g.push(band(10, 20, 'var(--bad)', 'D'));
    g.push(V.rc(x0, y0, W, H, { s: 'var(--ink-3)', w: 1 }));
    g.push(V.tx(x0 + W / 2, y0 + H + 30, 'Ток, во сколько раз больше номинала (I / Iн)', { a: 'middle', size: 11 }));
    g.push(V.tx(12, y0 + H / 2, 'время, с', { a: 'middle', size: 11, rot: -90 }));
    g.push(V.tx(lx(2.1), ly(1500), 'перегрузка: греется биметалл', { size: 10.5, f: 'var(--ink-2)' }));
    g.push(V.tx(lx(5.6), ly(0.16), 'КЗ: катушка', { size: 10.5, f: 'var(--ink-2)' }));
    return V.svg(400, 262, g.join(''), { label: 'Времятоковые характеристики B, C, D' });
  };

  I.rcd = () => V.svg(400, 230, [
    V.el(150, 100, 52, 24, { s: 'var(--ink)', w: 6, o: 0.22 }),
    V.el(150, 100, 52, 24, { s: 'var(--ink)', w: 1.4 }),
    V.wire([[20, 88], [330, 88], [330, 120]], 'L', { w: 3 }),
    V.wire([[20, 112], [300, 112], [300, 140]], 'N', { w: 3 }),
    sym.lamp(315, 150, 16),
    V.tx(20, 80, 'L →  ток туда  10 А', { size: 11.5, fam: M }),
    V.tx(20, 132, 'N ←  ток обратно 10 А', { size: 11.5, fam: M }),
    V.pa('M150 124 V170 H210', { s: 'var(--ink-2)', w: 1.4 }),
    V.rc(210, 160, 70, 22, { s: 'var(--ink)', f: 'var(--surface)', rx: 4 }), V.tx(245, 175, 'расцепитель', { a: 'middle', size: 10.5 }),
    V.tx(150, 66, 'тороидальный трансформатор', { a: 'middle', size: 11, f: 'var(--ink-2)' }),
    V.pa('M330 168 Q340 190 352 214', { s: 'var(--bad)', w: 2, d: '5 4' }),
    V.tx(372, 205, 'утечка', { a: 'end', size: 11.5, f: 'var(--bad)', wt: 700 }),
    V.tx(372, 220, 'через человека', { a: 'end', size: 11, f: 'var(--bad)' }),
    V.tl(20, 196, ['Пока ток «туда» равен току «обратно» — магнитные поля', 'гасят друг друга. Утекло 30 мА мимо — разница → отключение.'], { size: 11 })
  ].join(''), { label: 'Принцип работы УЗО' });

  I.chain = () => {
    const items = [
      ['Вводной кабель', 'от этажного щита / опоры / ВРУ'],
      ['Вводной аппарат', 'автомат или рубильник — отключает всё'],
      ['Счётчик', 'если учёт в этом щите'],
      ['УЗИП', 'от грозы и импульсов (особенно ВЛ)'],
      ['Реле напряжения', 'от обрыва нуля и скачков'],
      ['УЗО противопожарное', '100–300 мА, тип S (по желанию)'],
      ['УЗО групп / дифавтоматы', '30 мА — защищают людей'],
      ['Автоматы групп', 'защищают кабели линий'],
      ['Линии к потребителям', 'свет, розетки, техника']
    ];
    const g = [];
    items.forEach((it, i) => {
      const y = 8 + i * 46;
      g.push(V.rc(40, y, 300, 36, { s: i === 0 || i === 8 ? 'var(--ink-3)' : 'var(--ink)', f: i === 6 ? 'var(--signal-soft)' : 'var(--surface)', rx: 7, d: i === 2 || i === 5 ? '4 3' : null }));
      g.push(V.tx(52, y + 15, it[0], { size: 13, wt: 700 }));
      g.push(V.tx(52, y + 29, it[1], { size: 11, f: 'var(--ink-2)' }));
      g.push(V.tx(26, y + 23, String(i + 1), { a: 'middle', size: 12, fam: M, wt: 700, f: 'var(--ink-3)' }));
      if (i < items.length - 1) g.push(V.arrow(190, y + 36, 190, y + 46, { s: 'var(--ink-2)', w: 1.4, head: 5 }));
    });
    g.push(V.tx(350, 130, 'пунктир — бывает не всегда', { size: 10.5, f: 'var(--ink-3)', rot: 90 }));
    return V.svg(380, 420, g.join(''), { label: 'Порядок аппаратов в щите от ввода к потребителям' });
  };

  I.colors = () => {
    const rows = [['L1', 'Коричневый', 'фаза (L1 / A)'], ['L2', 'Чёрный', 'фаза (L2 / B)'], ['L3', 'Серый', 'фаза (L3 / C)'], ['N', 'Синий (голубой)', 'нулевой рабочий N'], ['PE', 'Жёлто-зелёный', 'защитный PE («земля»)'], ['PEN', 'Синий + жёлто-зелёные метки', 'совмещённый PEN']];
    return V.svg(380, 250, rows.map((r, i) => {
      const y = 20 + i * 36;
      return V.wire([[16, y], [96, y]], r[0], { w: 8 }) + V.tx(112, y - 2, r[1], { size: 13, wt: 700 }) + V.tx(112, y + 13, r[2], { size: 11, f: 'var(--ink-2)' }) + V.tx(372, y + 4, r[0], { a: 'end', size: 13, fam: M, wt: 700 });
    }).join('') + V.tx(16, 242, 'ГОСТ Р 50462-2009 (IEC 60446), ПУЭ 1.1.29', { size: 10.5, f: 'var(--ink-3)' }), { label: 'Цвета проводников' });
  };

  I.cablemark = () => {
    const s = 'ВВГнг(А)-LS 3×2,5';
    const cw = 13.4, x0 = 60, y0 = 54, fs = 22;
    const ch = (i) => x0 + i * cw + cw / 2;
    const parts = [
      [0, 0, 'В', 'изоляция жил — ПВХ'],
      [1, 1, 'В', 'оболочка — ПВХ'],
      [2, 2, 'Г', '«голый»: без брони'],
      [3, 7, 'нг(А)', 'не распространяет горение в пучке'],
      [9, 10, 'LS', 'мало дыма при пожаре'],
      [12, 12, '3', 'жилы: L, N, PE'],
      [14, 16, '2,5', 'сечение жилы, мм²']
    ];
    const g = [V.tx(x0, y0, s, { size: fs, wt: 700, fam: M })];
    parts.forEach((p, i) => {
      const xa = ch(p[0]) - cw / 2 + 1, xb = ch(p[1]) + cw / 2 - 1;
      const xm = (xa + xb) / 2;
      const ty = 92 + i * 22;
      g.push(V.pa(`M${xa} ${y0 + 8} H${xb}`, { s: 'var(--signal)', w: 3 }));
      g.push(V.pa(`M${xm} ${y0 + 10} V${ty - 4} H${30}`, { s: 'var(--ink-3)', w: 1 }));
      g.push(V.tx(36, ty, `<tspan style="font-family:${M};font-weight:700">${p[2]}</tspan> — ${p[3]}`, { size: 12 }));
    });
    return V.svg(330, 250, g.join(''), { label: 'Расшифровка маркировки кабеля ВВГнг(А)-LS 3×2,5' });
  };

  I.bath = () => {
    const g = [];
    g.push(V.ln(20, 210, 380, 210, { w: 2 }));
    g.push(V.ln(20, 20, 20, 210, { w: 2 }));
    g.push(V.rc(20, 30, 110, 180, { s: null, f: 'var(--info-soft)', o: 0.9 }));
    g.push(V.rc(130, 30, 60, 180, { s: null, f: 'var(--signal-soft)', o: 0.9 }));
    g.push(V.rc(190, 30, 160, 180, { s: null, f: 'var(--surface-2)', o: 0.9 }));
    g.push(V.pa('M24 160 h102 v42 q0 8 -8 8 h-86 q-8 0 -8 -8z', { s: 'var(--ink)', f: 'var(--surface)', w: 2 }));
    g.push(V.rc(26, 168, 98, 34, { s: null, f: 'var(--w-n)', o: 0.25 }));
    g.push(V.tx(75, 190, 'зона 0', { a: 'middle', size: 12, wt: 700 }));
    g.push(V.tx(75, 96, 'зона 1', { a: 'middle', size: 13, wt: 700 }));
    g.push(V.tx(75, 112, 'над ванной', { a: 'middle', size: 10.5, f: 'var(--ink-2)' }));
    g.push(V.tx(160, 96, 'зона 2', { a: 'middle', size: 13, wt: 700 }));
    g.push(V.tx(160, 112, '0,6 м', { a: 'middle', size: 10.5, f: 'var(--ink-2)' }));
    g.push(V.tx(270, 96, 'зона 3 (по ПУЭ)', { a: 'middle', size: 13, wt: 700 }));
    g.push(V.tx(270, 112, 'ещё 2,4 м', { a: 'middle', size: 10.5, f: 'var(--ink-2)' }));
    g.push(V.tx(270, 150, 'здесь можно розетку', { a: 'middle', size: 11 }));
    g.push(V.tx(270, 164, 'через УЗО ≤ 30 мА', { a: 'middle', size: 11 }));
    g.push(V.ln(360, 30, 360, 210, { s: 'var(--ink-3)', w: 1 }));
    g.push(V.tx(366, 34, '2,25 м', { size: 10.5, fam: M, rot: 90 }));
    g.push(V.tx(20, 228, 'IPX7 · IPX5 · IPX4 · IPX1 — защита от воды по зонам 0–3 (ПУЭ 7.1.47)', { size: 10.5, f: 'var(--ink-2)' }));
    return V.svg(400, 236, g.join(''), { label: 'Зоны ванной комнаты' });
  };

  I.comb = () => {
    const g = [];
    const dev = (x, y, lbl) => V.rc(x, y, 34, 60, { s: 'var(--dev-line)', f: 'var(--dev)', rx: 3 }) + V.tx(x + 17, y + 38, lbl, { a: 'middle', size: 10, fam: M, wt: 600, f: '#222' }) + V.rc(x + 11, y + 44, 12, 10, { s: '#666', f: '#cfd3cf', rx: 2 });
    for (let i = 0; i < 6; i++) g.push(dev(20 + i * 36, 50, 'C16'));
    g.push(V.rc(16, 34, 220, 10, { s: 'var(--ink)', f: 'var(--w-l1)', rx: 3 }));
    for (let i = 0; i < 6; i++) g.push(V.ln(37 + i * 36, 44, 37 + i * 36, 56, { s: 'var(--w-l1)', w: 4 }));
    g.push(V.tx(16, 24, 'Гребёнка 1Ф: одна фаза на все автоматы', { size: 12, wt: 700 }));
    for (let i = 0; i < 6; i++) g.push(dev(20 + i * 36, 170, ['L1', 'L2', 'L3'][i % 3]));
    ['L1', 'L2', 'L3'].forEach((p, k) => g.push(V.rc(16, 134 + k * 8, 220, 6, { s: null, f: V.wc[p], rx: 2 })));
    for (let i = 0; i < 6; i++) g.push(V.ln(37 + i * 36, 134 + (i % 3) * 8 + 6, 37 + i * 36, 176, { s: V.wc[['L1', 'L2', 'L3'][i % 3]], w: 4 }));
    g.push(V.tx(16, 124, 'Гребёнка 3Ф: фазы чередуются L1–L2–L3', { size: 12, wt: 700 }));
    g.push(V.tl(254, 60, ['PIN — штырь', 'заходит в клемму', 'рядом с проводом'], { size: 11 }));
    g.push(V.tl(254, 180, ['FORK — вилка', 'зажимается под', 'винт клеммы'], { size: 11 }));
    g.push(V.tx(16, 248, 'Тип гребёнки должен подходить к клеммам автоматов', { size: 10.5, f: 'var(--ink-2)' }));
    return V.svg(380, 256, g.join(''), { label: 'Гребёнчатые шины' });
  };

  I.ferrule = () => V.svg(400, 170, [
    V.rc(20, 60, 150, 26, { s: 'var(--ink-2)', f: 'var(--w-l1)', rx: 4 }),
    V.pa('M170 64 h40 M170 68 h40 M170 72 h40 M170 76 h40 M170 80 h40', { s: '#b87333', w: 2 }),
    V.tx(95, 52, 'изоляция провода', { a: 'middle', size: 11 }),
    V.tx(190, 52, 'жилки', { a: 'middle', size: 11 }),
    V.arrow(225, 73, 250, 73, { s: 'var(--ink-2)', w: 1.4 }),
    V.pa('M260 58 h26 l8 6 v18 l-8 6 h-26 z', { s: 'var(--ink)', f: 'var(--w-n)', o: 0.9 }),
    V.rc(294, 64, 70, 18, { s: '#777', f: '#cfcfcf', rx: 2 }),
    V.tx(312, 52, 'НШВИ: воротник + трубка', { a: 'middle', size: 11 }),
    V.tl(20, 120, ['1. Сними изоляцию на длину трубки (обычно 8–12 мм).', '2. Скрути жилки, вставь до упора в воротник.', '3. Обожми пресс-клещами под своё сечение (квадрат/шестигранник).', '4. Подёргай: гильза не должна слезать.'], { size: 11.5, lh: 15 })
  ].join(''), { label: 'Опрессовка наконечника НШВИ' });

  I.pensplit = () => {
    const g = [];
    g.push(V.rc(120, 20, 240, 190, { s: 'var(--ink-2)', f: 'var(--surface)', rx: 8 }));
    g.push(V.tx(240, 14, 'Вводной щит', { a: 'middle', size: 12, wt: 700 }));
    g.push(V.wire([[10, 60], [170, 60]], 'PEN', { w: 3.4 }));
    g.push(V.tx(14, 52, 'PEN с ввода', { size: 11, wt: 600 }));
    g.push(V.rc(170, 50, 120, 18, { s: 'var(--ink)', f: '#c9b46a', rx: 3 }));
    g.push(V.tx(230, 63, 'шина PE', { a: 'middle', size: 11, wt: 700, f: '#222' }));
    g.push(V.rc(170, 130, 120, 18, { s: 'var(--ink)', f: '#c9b46a', rx: 3 }));
    g.push(V.tx(230, 143, 'шина N', { a: 'middle', size: 11, wt: 700, f: '#222' }));
    g.push(V.wire([[280, 68], [280, 130]], 'PEN', { w: 3.4 }));
    g.push(V.tx(288, 104, 'перемычка', { size: 10.5 }));
    g.push(V.wire([[190, 68], [190, 92], [80, 92], [80, 200]], 'PE', { w: 2.6 }));
    g.push(sym.ground(80, 200));
    g.push(V.tx(14, 120, 'к контуру', { size: 10.5 }));
    g.push(V.tx(14, 133, 'заземления', { size: 10.5 }));
    g.push(V.wire([[250, 68], [250, 100], [380, 100]], 'PE', { w: 2.6 }));
    g.push(V.wire([[250, 148], [250, 180], [380, 180]], 'N', { w: 2.6 }));
    g.push(V.tx(378, 94, 'PE дальше', { a: 'end', size: 10.5 }));
    g.push(V.tx(378, 174, 'N дальше', { a: 'end', size: 10.5 }));
    g.push(V.tx(10, 236, 'PEN сначала на шину PE, потом перемычка на N. После — не соединять!', { size: 11, wt: 600 }));
    return V.svg(390, 244, g.join(''), { label: 'Разделение PEN на PE и N (ПУЭ 1.7.135)' });
  };

  I.spd = () => {
    const g = [];
    const box = (x, y, l) => V.rc(x, y, 44, 66, { s: 'var(--dev-line)', f: 'var(--dev)', rx: 4 }) + V.tx(x + 22, y + 38, l, { a: 'middle', size: 10, fam: M, f: '#222', wt: 600 });
    g.push(V.tx(10, 16, 'УЗИП 1ф, схема «1+1» (TN-C-S, TN-S, TT)', { size: 12, wt: 700 }));
    g.push(box(150, 40, 'L–N'));
    g.push(box(200, 40, 'N–PE'));
    g.push(V.wire([[10, 50], [172, 50], [172, 40]], 'L', { w: 2.6 }));
    g.push(V.wire([[10, 66], [130, 66], [130, 124], [172, 124], [172, 106]], 'N', { w: 2.6 }));
    g.push(V.wire([[130, 124], [130, 30], [222, 30], [222, 40]], 'N', { w: 2.6 }));
    g.push(V.wire([[222, 106], [222, 140], [320, 140]], 'PE', { w: 2.6 }));
    g.push(V.tx(12, 44, 'L после вводного', { size: 10.5 }));
    g.push(V.tx(12, 80, 'N', { size: 10.5 }));
    g.push(V.tx(318, 134, 'на шину PE', { a: 'end', size: 10.5 }));
    g.push(V.tl(256, 56, ['варистор', '+ разрядник'], { size: 10.5, f: 'var(--ink-2)' }));
    g.push(V.tl(10, 172, ['• Ставь после вводного автомата, до УЗО и реле напряжения.', '• Провода к УЗИП как можно короче: в сумме ≤ 0,5 м.', '• Сечение PE к УЗИП не меньше, чем требует паспорт (обычно 6–16 мм²).', '• 3ф — схема «3+1»: три L–N и один N–PE.'], { size: 11.5, lh: 15 }));
    return V.svg(390, 236, g.join(''), { label: 'Подключение УЗИП' });
  };

  I.rn = () => {
    const g = [];
    g.push(V.rc(150, 40, 54, 80, { s: 'var(--dev-line)', f: 'var(--dev)', rx: 4 }));
    g.push(V.rc(158, 60, 38, 16, { s: '#333', f: '#1f2a24', rx: 2 }));
    g.push(V.tx(177, 72, '230', { a: 'middle', size: 10, fam: M, f: '#7fe39d' }));
    g.push(V.tx(177, 98, 'РН', { a: 'middle', size: 11, fam: M, f: '#222', wt: 700 }));
    ['N', 'L вх'].forEach((t, i) => g.push(V.tx(162 + i * 26, 36, t, { a: 'middle', size: 9.5, fam: M })));
    g.push(V.tx(188, 134, 'L вых', { a: 'middle', size: 9.5, fam: M }));
    g.push(V.wire([[10, 26], [190, 26], [190, 40]], 'L', { w: 2.6 }));
    g.push(V.wire([[10, 150], [110, 150], [110, 16], [162, 16], [162, 40]], 'N', { w: 2.2 }));
    g.push(V.wire([[190, 120], [190, 150], [370, 150]], 'L', { w: 2.6 }));
    g.push(V.wire([[110, 150], [110, 186], [370, 186]], 'N', { w: 2.6 }));
    g.push(V.tx(12, 20, 'L от вводного автомата', { size: 10.5 }));
    g.push(V.tx(12, 144, 'N с вводной шины', { size: 10.5 }));
    g.push(V.tx(368, 144, 'L к УЗО / автоматам', { a: 'end', size: 10.5 }));
    g.push(V.tx(368, 180, 'N к нагрузке — с шины, не через РН', { a: 'end', size: 10.5 }));
    g.push(V.tx(10, 214, 'Через реле идёт фаза. Ноль нужен ему только «для измерения».', { size: 11, wt: 600 }));
    g.push(V.tx(10, 230, 'Номинал РН ≥ номинала вводного автомата. Клеммы — сверяй с корпусом.', { size: 11, f: 'var(--ink-2)' }));
    return V.svg(390, 238, g.join(''), { label: 'Подключение реле напряжения' });
  };

  I.meter1 = () => {
    const g = [];
    g.push(V.rc(80, 20, 220, 90, { s: 'var(--ink-2)', f: 'var(--surface)', rx: 8 }));
    g.push(V.rc(110, 32, 100, 26, { s: '#333', f: '#cfe3c9', rx: 3 }));
    g.push(V.tx(160, 50, '012345,6', { a: 'middle', size: 13, fam: M, f: '#1d2a1d' }));
    g.push(V.tx(250, 50, 'кВт·ч', { a: 'middle', size: 11 }));
    const tx = [120, 160, 200, 240];
    tx.forEach((x, i) => { g.push(V.rc(x - 14, 82, 28, 24, { s: '#555', f: '#e9e9e2', rx: 3 })); g.push(V.tx(x, 99, String(i + 1), { a: 'middle', size: 12, fam: M, wt: 700, f: '#222' })); });
    g.push(V.wire([[120, 106], [120, 150], [40, 150]], 'L', { w: 2.6 }));
    g.push(V.wire([[160, 106], [160, 190], [340, 190]], 'L', { w: 2.6 }));
    g.push(V.wire([[200, 106], [200, 166], [40, 166]], 'N', { w: 2.6 }));
    g.push(V.wire([[240, 106], [240, 206], [340, 206]], 'N', { w: 2.6 }));
    g.push(V.tx(36, 146, 'из сети', { a: 'end', size: 10.5 }));
    g.push(V.tx(36, 170, 'из сети', { a: 'end', size: 10.5 }));
    g.push(V.tx(344, 186, 'в квартиру', { size: 10.5 }));
    g.push(V.tx(344, 210, 'в квартиру', { size: 10.5 }));
    g.push(V.tl(10, 232, ['1 — фаза вход · 2 — фаза выход · 3 — ноль вход · 4 — ноль выход', 'Это самая частая схема у однофазных счётчиков. Всегда сверяй со схемой на крышке.'], { size: 11 }));
    return V.svg(400, 262, g.join(''), { label: 'Клеммы однофазного счётчика' });
  };

  I.meter3 = () => {
    const g = [];
    const terms = [['1', 'L1', 'in'], ['3', 'L1', 'out'], ['4', 'L2', 'in'], ['6', 'L2', 'out'], ['7', 'L3', 'in'], ['9', 'L3', 'out'], ['10', 'N', 'in'], ['12', 'N', 'out']];
    g.push(V.rc(20, 10, 360, 60, { s: 'var(--ink-2)', f: 'var(--surface)', rx: 8 }));
    g.push(V.tx(200, 34, 'СКАТ 315 (EKF), прямое включение', { a: 'middle', size: 12, wt: 700 }));
    g.push(V.tx(200, 52, 'клеммы 2, 5, 8, 11 у этой модели отсутствуют', { a: 'middle', size: 10.5, f: 'var(--ink-2)' }));
    terms.forEach((t, i) => {
      const x = 44 + i * 44;
      g.push(V.rc(x - 16, 74, 32, 24, { s: '#555', f: '#e9e9e2', rx: 3 }));
      g.push(V.tx(x, 91, t[0], { a: 'middle', size: 12, fam: M, wt: 700, f: '#222' }));
      const yEnd = t[2] === 'in' ? 128 + (i / 2) * 0 : 200;
      if (t[2] === 'in') { g.push(V.wire([[x, 98], [x, 140]], t[1], { w: 2.6 })); g.push(V.tx(x, 154, t[1], { a: 'middle', size: 10.5, fam: M })); g.push(V.tx(x, 166, 'сеть', { a: 'middle', size: 9.5, f: 'var(--ink-2)' })); }
      else { g.push(V.wire([[x, 98], [x, 196]], t[1], { w: 2.6 })); g.push(V.tx(x, 210, t[1], { a: 'middle', size: 10.5, fam: M })); g.push(V.tx(x, 222, 'нагр.', { a: 'middle', size: 9.5, f: 'var(--ink-2)' })); }
      void yEnd;
    });
    g.push(V.tx(10, 246, 'Паспорт СКАТ 315: 1→3 фаза A, 4→6 фаза B, 7→9 фаза C, 10→12 нейтраль', { size: 10.5, f: 'var(--ink-2)' }));
    return V.svg(400, 254, g.join(''), { label: 'Клеммы трёхфазного счётчика СКАТ 315' });
  };

  I.contactor = () => {
    const g = [];
    g.push(V.rc(110, 40, 150, 120, { s: 'var(--dev-line)', f: 'var(--dev)', rx: 5 }));
    g.push(V.tx(185, 96, 'КМ', { a: 'middle', size: 16, fam: M, wt: 700, f: '#222' }));
    g.push(V.tx(185, 114, 'контактор', { a: 'middle', size: 11, f: '#444' }));
    const top = [['A1', 124], ['1/L1', 154], ['3/L2', 186], ['5/L3', 218], ['13NO', 246]];
    const bot = [['A2', 124], ['2/T1', 154], ['4/T2', 186], ['6/T3', 218], ['14NO', 246]];
    top.forEach(([t, x]) => { g.push(V.ci(x, 48, 4, { s: '#555', f: '#ddd' })); g.push(V.tx(x, 32, t, { a: 'middle', size: 9.5, fam: M })); });
    bot.forEach(([t, x]) => { g.push(V.ci(x, 152, 4, { s: '#555', f: '#ddd' })); g.push(V.tx(x, 176, t, { a: 'middle', size: 9.5, fam: M })); });
    g.push(V.tl(10, 210, ['A1–A2 — катушка: подал 230 В — контакты замкнулись.', '1-3-5 → 2-4-6 — силовые контакты (нагрузка).', '13-14 — вспомогательный контакт (NO = нормально открытый).'], { size: 11.5, lh: 15 }));
    return V.svg(380, 256, g.join(''), { label: 'Клеммы контактора' });
  };

  I.vdrop = () => {
    const g = [];
    g.push(V.rc(20, 60, 50, 70, { s: 'var(--ink)', f: 'var(--surface-2)', rx: 4 }));
    g.push(V.tx(45, 100, 'щит', { a: 'middle', size: 11, wt: 700 }));
    g.push(V.wire([[70, 84], [340, 84]], 'L', { w: 3 }));
    g.push(V.wire([[70, 104], [340, 104]], 'N', { w: 3 }));
    g.push(sym.heater(356, 94, 26, 40));
    g.push(V.tx(45, 50, '230 В', { a: 'middle', size: 12, fam: M, wt: 700 }));
    g.push(V.tx(356, 50, '219 В', { a: 'middle', size: 12, fam: M, wt: 700, f: 'var(--bad)' }));
    g.push(V.tx(205, 76, '50 м · 2,5 мм² · 16 А', { a: 'middle', size: 11.5, fam: M }));
    g.push(V.tl(20, 152, ['Провод — тоже сопротивление. Чем длиннее и тоньше,', 'тем больше вольт «теряется» по дороге и греет провод.', 'По СП 256: до света не больше 3 %, до прочих — 4 % от ВРУ.'], { size: 11.5, lh: 15 }));
    return V.svg(390, 200, g.join(''), { label: 'Падение напряжения на длинной линии' });
  };

  I.selectivity = () => {
    const g = [];
    g.push(V.wire([[190, 10], [190, 40]], 'L', { w: 2.6 }));
    g.push(sym.mcb(190, 40, 46));
    g.push(V.tx(204, 66, 'QF1  C40', { size: 11, fam: M, wt: 700 }));
    g.push(V.tx(204, 80, 'не сработал', { size: 10.5, f: 'var(--ok)', wt: 600 }));
    g.push(V.wire([[190, 86], [190, 100]], 'L', { w: 2.6 }));
    g.push(V.wire([[60, 100], [320, 100]], 'L', { w: 2.6 }));
    [[60, 'C10', 'свет'], [190, 'C16', 'розетки'], [320, 'C16', 'кухня']].forEach(([x, r, n], i) => {
      g.push(sym.mcb(x, 100, 46, i === 2 ? { s: 'var(--bad)', w: 2.2 } : {}));
      g.push(V.tx(x + 12, 128, r, { size: 11, fam: M, wt: 700 }));
      g.push(V.wire([[x, 146], [x, 176]], 'L', { w: 2.6, o: i === 2 ? 0.35 : 1 }));
      g.push(V.tx(x, 194, n, { a: 'middle', size: 11.5 }));
    });
    g.push(V.pa('M332 170 l10 -12 l-4 10 l10 -2 l-12 14', { s: 'var(--bad)', f: 'var(--bad)', w: 1 }));
    g.push(V.tx(320, 214, 'КЗ → сработал только он', { a: 'middle', size: 11, f: 'var(--bad)', wt: 700 }));
    g.push(V.tx(10, 236, 'Селективность: отключается ближайший к аварии аппарат, остальное работает.', { size: 11 }));
    return V.svg(390, 244, g.join(''), { label: 'Селективность защиты' });
  };

  I.switch1 = () => {
    const g = [];
    g.push(V.rc(10, 20, 60, 120, { s: 'var(--ink-2)', f: 'var(--surface-2)', rx: 6 }));
    g.push(V.tx(40, 14, 'щит', { a: 'middle', size: 11, wt: 700 }));
    g.push(V.ci(190, 60, 22, { s: 'var(--ink-2)', f: 'var(--surface)' }));
    g.push(V.tx(190, 32, 'коробка', { a: 'middle', size: 10.5 }));
    g.push(V.wire([[70, 50], [178, 50]], 'L', { w: 2.6 }));
    g.push(V.wire([[70, 66], [200, 66]], 'N', { w: 2.6 }));
    g.push(V.wire([[70, 82], [160, 82], [160, 74]], 'PE', { w: 2.2 }));
    g.push(V.wire([[180, 50], [180, 140], [150, 140]], 'L', { w: 2.4 }));
    g.push(V.wire([[150, 160], [196, 160], [196, 70]], 'L1', { w: 2.4 }));
    g.push(V.rc(110, 130, 40, 40, { s: 'var(--ink)', f: 'var(--surface)', rx: 5 }));
    g.push(V.ln(122, 160, 138, 142, { w: 2 }));
    g.push(V.tx(130, 186, 'выключатель', { a: 'middle', size: 10.5 }));
    g.push(V.wire([[202, 60], [320, 60], [320, 90]], 'L', { w: 2.4 }));
    g.push(V.wire([[205, 70], [300, 70], [300, 92]], 'N', { w: 2.4 }));
    g.push(V.wire([[168, 80], [340, 80], [340, 96]], 'PE', { w: 2 }));
    g.push(sym.lamp(320, 110, 16));
    g.push(V.tx(320, 146, 'светильник', { a: 'middle', size: 10.5 }));
    g.push(V.tl(10, 210, ['Выключатель рвёт ФАЗУ (ПУЭ 6.6.28): выключил — на лампе нет 230 В.', 'Чёрный провод от выключателя к лампе — «отходящая фаза».'], { size: 11 }));
    return V.svg(390, 232, g.join(''), { label: 'Схема одноклавишного выключателя' });
  };

  I.passthrough = () => {
    const g = [];
    const sw = (x, y, pos) => V.rc(x - 26, y - 26, 52, 52, { s: 'var(--ink)', f: 'var(--surface)', rx: 6 }) + V.ci(x - 14, y, 3, { f: 'var(--ink)' }) + V.ci(x + 14, y - 12, 3, { f: 'var(--ink)' }) + V.ci(x + 14, y + 12, 3, { f: 'var(--ink)' }) + V.ln(x - 14, y, x + 13, pos ? y - 11 : y + 11, { w: 2.2 });
    g.push(V.wire([[10, 90], [76, 90]], 'L', { w: 2.6 }));
    g.push(sw(100, 90, 1)); g.push(sw(270, 90, 1));
    g.push(V.wire([[114, 78], [256, 78]], 'L1', { w: 2.4 }));
    g.push(V.wire([[114, 102], [256, 102]], 'L3', { w: 2.4 }));
    g.push(V.wire([[296, 90], [350, 90], [350, 130]], 'L', { w: 2.4 }));
    g.push(sym.lamp(350, 146, 15));
    g.push(V.wire([[10, 190], [350, 190], [350, 161]], 'N', { w: 2.4 }));
    g.push(V.tx(10, 84, 'L', { size: 11, fam: M, wt: 700 }));
    g.push(V.tx(10, 184, 'N', { size: 11, fam: M, wt: 700 }));
    g.push(V.tx(185, 70, 'две «перекидки» между выключателями', { a: 'middle', size: 10.5 }));
    g.push(V.tx(100, 136, 'у двери', { a: 'middle', size: 10.5 }));
    g.push(V.tx(270, 136, 'у кровати', { a: 'middle', size: 10.5 }));
    g.push(V.tx(10, 222, 'Проходные: свет можно включить и выключить из двух мест.', { size: 11 }));
    return V.svg(390, 232, g.join(''), { label: 'Проходные выключатели' });
  };

  I.socketwiring = () => {
    const g = [];
    const sock = (x, y) => V.rc(x - 18, y - 18, 36, 36, { s: 'var(--ink)', f: 'var(--surface)', rx: 8 }) + V.ci(x - 6, y, 2.6, { f: 'var(--ink)' }) + V.ci(x + 6, y, 2.6, { f: 'var(--ink)' });
    g.push(V.tx(10, 18, 'Шлейф: от розетки к розетке', { size: 12, wt: 700 }));
    [80, 180, 280].forEach((x) => g.push(sock(x, 60)));
    g.push(V.wire([[10, 50], [70, 50], [70, 56]], 'L', { w: 2.2 })); g.push(V.wire([[90, 50], [170, 50], [170, 56]], 'L', { w: 2.2 })); g.push(V.wire([[190, 50], [270, 50], [270, 56]], 'L', { w: 2.2 }));
    g.push(V.tx(10, 104, 'Дёшево, но плохой контакт в одной розетке гасит все дальше.', { size: 11, f: 'var(--ink-2)' }));
    g.push(V.tx(10, 136, 'Звезда / шлейф через коробку с клеммами', { size: 12, wt: 700 }));
    g.push(V.ci(180, 160, 14, { s: 'var(--ink-2)', f: 'var(--surface)' }));
    g.push(V.wire([[10, 160], [166, 160]], 'L', { w: 2.2 }));
    [80, 180, 280].forEach((x) => { g.push(sock(x, 210)); g.push(V.wire([[180, 172], [x, 186], [x, 196]], 'L', { w: 2 })); });
    g.push(V.tx(10, 250, 'Надёжнее: каждая розетка подключена отдельным отводом.', { size: 11, f: 'var(--ink-2)' }));
    return V.svg(390, 258, g.join(''), { label: 'Подключение розеток шлейфом и через коробку' });
  };

  I.zerobreak = () => {
    const g = [];
    g.push(V.wire([[10, 30], [380, 30]], 'L1', { w: 2.4 }));
    g.push(V.wire([[10, 50], [380, 50]], 'L2', { w: 2.4 }));
    g.push(V.wire([[10, 70], [380, 70]], 'L3', { w: 2.4 }));
    g.push(V.wire([[10, 180], [120, 180]], 'PEN', { w: 2.4 }));
    g.push(V.pa('M126 172 l8 16 M136 172 l8 16', { s: 'var(--bad)', w: 2.4 }));
    g.push(V.tx(140, 168, 'ОБРЫВ НУЛЯ', { size: 11, wt: 700, f: 'var(--bad)' }));
    g.push(V.wire([[150, 180], [380, 180]], 'N', { w: 2.4 }));
    [[200, 'L1', 30, 'чайник', '2 кВт', '≈ 135 В'], [270, 'L2', 50, 'обогреватель', '1 кВт', '≈ 264 В'], [340, 'L3', 70, 'лампа', '100 Вт', '≈ 340 В']].forEach(([x, p, y, n, pw, v], i) => {
      g.push(V.wire([[x, y], [x, 100]], p, { w: 2 }));
      g.push(V.rc(x - 29, 100, 58, 46, { s: 'var(--ink)', f: 'var(--surface)', rx: 4 }));
      g.push(V.tx(x, 128, v, { a: 'middle', size: 10, fam: M, wt: 700, f: i ? 'var(--bad)' : 'var(--warn)' }));
      g.push(V.wire([[x, 146], [x, 180]], 'N', { w: 2 }));
      g.push(V.tx(x, 198, n, { a: 'middle', size: 9.5, f: 'var(--ink-2)' }));
      g.push(V.tx(x, 211, pw, { a: 'middle', size: 9.5, f: 'var(--ink-2)' }));
    });
    g.push(V.tl(10, 234, ['Без нуля общая точка нагрузок смещается к самой мощной из них.', 'Чем меньше мощность нагрузки, тем выше на ней напряжение.'], { size: 11 }));
    return V.svg(390, 262, g.join(''), { label: 'Что происходит при обрыве нуля' });
  };

  I.nmix = () => {
    const g = [];
    const dev = (x, y, l) => V.rc(x, y, 50, 60, { s: 'var(--dev-line)', f: 'var(--dev)', rx: 4 }) + V.tx(x + 25, y + 34, l, { a: 'middle', size: 10, fam: M, wt: 700, f: '#222' });
    g.push(dev(40, 30, 'УЗО1')); g.push(dev(220, 30, 'УЗО2'));
    g.push(V.rc(40, 150, 120, 14, { s: 'var(--ink)', f: '#c9b46a', rx: 3 })); g.push(V.tx(100, 182, 'шина N1', { a: 'middle', size: 11 }));
    g.push(V.rc(220, 150, 120, 14, { s: 'var(--ink)', f: '#c9b46a', rx: 3 })); g.push(V.tx(280, 182, 'шина N2', { a: 'middle', size: 11 }));
    g.push(V.wire([[78, 90], [78, 150]], 'N', { w: 2.4 }));
    g.push(V.wire([[258, 90], [258, 150]], 'N', { w: 2.4 }));
    g.push(V.wire([[140, 164], [140, 200], [300, 200], [300, 164]], 'N', { w: 2.4 }));
    g.push(V.pa('M206 192 l16 16 M222 192 l-16 16', { s: 'var(--bad)', w: 3 }));
    g.push(V.tl(10, 228, ['Нельзя: ноль группы под УЗО1 посадили на шину УЗО2.', 'Ток уходит через «чужое» УЗО — оба видят утечку и выбивают.'], { size: 11 }));
    return V.svg(390, 250, g.join(''), { label: 'Ошибка: смешаны нули разных УЗО' });
  };

  I.loop = () => {
    const g = [];
    g.push(V.rc(10, 40, 60, 120, { s: 'var(--ink-2)', f: 'var(--surface-2)', rx: 6 }));
    g.push(V.tx(40, 32, 'ТП', { a: 'middle', size: 11, wt: 700 }));
    g.push(V.wire([[70, 70], [330, 70], [330, 100]], 'L', { w: 3 }));
    g.push(V.wire([[70, 130], [300, 130]], 'N', { w: 3 }));
    g.push(V.rc(300, 100, 60, 50, { s: 'var(--ink)', f: 'var(--surface)', rx: 5 }));
    g.push(V.pa('M330 100 l-8 18 l10 -4 l-6 18', { s: 'var(--bad)', w: 2.6 }));
    g.push(V.pa('M80 58 H320', { s: 'var(--bad)', w: 1.4, d: '5 4' }));
    g.push(V.arrow(200, 58, 230, 58, { s: 'var(--bad)', w: 1.4 }));
    g.push(V.pa('M290 142 H80', { s: 'var(--bad)', w: 1.4, d: '5 4' }));
    g.push(V.arrow(200, 142, 170, 142, { s: 'var(--bad)', w: 1.4 }));
    g.push(V.tx(200, 50, 'ток КЗ идёт по петле «фаза – ноль»', { a: 'middle', size: 11, f: 'var(--bad)' }));
    g.push(V.tl(10, 186, ['Iкз = U₀ / Zпетли. Чем длиннее и тоньше провод, тем больше Z', 'и тем меньше ток КЗ. Если ток мал — автомат не отключит мгновенно.', 'Для C16 нужно не меньше 160 А (10 × Iн).'], { size: 11.5, lh: 15 }));
    return V.svg(390, 236, g.join(''), { label: 'Петля фаза-ноль' });
  };

  I.ground = () => {
    const g = [];
    g.push(V.ln(10, 70, 380, 70, { s: 'var(--ink-2)', w: 2 }));
    g.push(V.rc(10, 74, 370, 120, { s: null, f: 'var(--surface-2)', o: 0.8 }));
    g.push(V.tx(14, 62, 'уровень земли', { size: 10.5, f: 'var(--ink-2)' }));
    g.push(V.rc(260, 14, 110, 56, { s: 'var(--ink)', f: 'var(--surface)', rx: 4 }));
    g.push(V.tx(315, 40, 'дом:', { a: 'middle', size: 11, wt: 700 }));
    g.push(V.tx(315, 56, 'ГЗШ / шина PE', { a: 'middle', size: 10.5 }));
    [70, 140, 210].forEach((x) => { g.push(V.rc(x - 3, 92, 6, 90, { s: '#555', f: '#9aa09a' })); });
    g.push(V.pa('M70 96 H210', { s: '#666', w: 5 }));
    g.push(V.pa('M210 96 H290 V70', { s: '#666', w: 5 }));
    g.push(V.wire([[290, 70], [290, 70]], 'PE'));
    g.push(V.tx(140, 116, '≈ 0,5–0,8 м в глубину', { a: 'middle', size: 10.5 }));
    g.push(V.tx(140, 206, 'электроды 2–3 м, между ними ≥ длины электрода', { a: 'middle', size: 10.5 }));
    g.push(V.tx(10, 228, 'Сталь круглая: вертикальные Ø16 (чёрная) / Ø12 (оцинк.) — ПУЭ табл. 1.7.4', { size: 10.5, f: 'var(--ink-2)' }));
    return V.svg(390, 236, g.join(''), { label: 'Контур заземления частного дома' });
  };

  I.din = () => {
    const g = [];
    g.push(V.rc(20, 60, 350, 22, { s: '#777', f: 'var(--rail)' }));
    for (let i = 0; i < 16; i++) g.push(V.rc(30 + i * 21, 67, 12, 8, { s: null, f: 'var(--surface)', rx: 4 }));
    g.push(V.rc(60, 20, 18, 100, { s: 'var(--dev-line)', f: 'var(--dev)', rx: 2 }));
    g.push(V.rc(78, 20, 36, 100, { s: 'var(--dev-line)', f: 'var(--dev)', rx: 2 }));
    g.push(V.rc(114, 20, 54, 100, { s: 'var(--dev-line)', f: 'var(--dev)', rx: 2 }));
    g.push(V.tx(69, 140, '1P', { a: 'middle', size: 11, fam: M, wt: 700 }));
    g.push(V.tx(96, 140, '2P', { a: 'middle', size: 11, fam: M, wt: 700 }));
    g.push(V.tx(141, 140, '3P', { a: 'middle', size: 11, fam: M, wt: 700 }));
    g.push(V.pa('M60 154 H78 M60 150 V158 M78 150 V158', { s: 'var(--ink)', w: 1.2 }));
    g.push(V.tx(69, 172, '1 модуль = 17,5–18 мм', { size: 11, fam: M }));
    g.push(V.tl(200, 110, ['DIN-рейка TH35:', 'ширина 35 мм', 'аппараты защёлкиваются', 'на неё сверху'], { size: 11.5, lh: 15 }));
    g.push(V.tx(20, 204, 'Корпус выбирают по числу модулей: ЩРН-12, -24, -36, -48, -54, -72…', { size: 11, f: 'var(--ink-2)' }));
    return V.svg(390, 212, g.join(''), { label: 'DIN-рейка и модули' });
  };

  I.ip = () => {
    const g = [];
    g.push(V.tx(110, 50, 'IP', { size: 40, fam: M, wt: 700 }));
    g.push(V.tx(176, 50, '5', { size: 40, fam: M, wt: 700, f: 'var(--warn)' }));
    g.push(V.tx(206, 50, '4', { size: 40, fam: M, wt: 700, f: 'var(--w-n)' }));
    g.push(V.pa('M188 58 V80 H40', { s: 'var(--warn)', w: 1.4 }));
    g.push(V.pa('M218 58 V80 H350', { s: 'var(--w-n)', w: 1.4 }));
    g.push(V.tl(14, 98, ['1-я цифра — пыль и предметы:', '0 нет защиты · 2 палец · 3 провод 2,5 мм', '4 проволока 1 мм · 5 пылезащита', '6 пыленепроницаемый'], { size: 11, lh: 15 }));
    g.push(V.tl(206, 98, ['2-я цифра — вода:', '0 нет · 1 капли · 3 дождь', '4 брызги со всех сторон', '5 струи · 7 погружение'], { size: 11, lh: 15 }));
    g.push(V.tx(14, 176, 'Щит в квартире — не ниже IP31 (ПУЭ 7.1.28). На улице — IP54/65.', { size: 11, wt: 600 }));
    return V.svg(390, 184, g.join(''), { label: 'Расшифровка степени защиты IP' });
  };

  I.stardelta = () => {
    const g = [];
    const cx = 100, cy = 105, r = 60;
    const ends = [0, 1, 2].map((k) => [cx + r * Math.cos(-Math.PI / 2 + k * 2.0944), cy + r * Math.sin(-Math.PI / 2 + k * 2.0944)]);
    ends.forEach((p, k) => g.push(V.wire([[cx, cy], p], ['L1', 'L2', 'L3'][k], { w: 2.4 })));
    g.push(V.ci(cx, cy, 4, { f: 'var(--ink)' }));
    g.push(V.tx(cx, 195, 'Звезда: обмотка на 230 В', { a: 'middle', size: 11.5, wt: 600 }));
    const tx = 290, ty = 105, tr = 64;
    const tp = [0, 1, 2].map((k) => [tx + tr * Math.cos(-Math.PI / 2 + k * 2.0944), ty + tr * Math.sin(-Math.PI / 2 + k * 2.0944)]);
    g.push(V.pg(tp, { s: 'var(--ink)', w: 2.4 }));
    tp.forEach((p) => g.push(V.ci(p[0], p[1], 4, { f: 'var(--ink)' })));
    g.push(V.tx(tx, 195, 'Треугольник: обмотка на 400 В', { a: 'middle', size: 11.5, wt: 600 }));
    g.push(V.tx(195, 224, 'На табличке «Δ/Y 230/400 В»: в сети 400 В — звезда.', { a: 'middle', size: 11 }));
    return V.svg(390, 232, g.join(''), { label: 'Соединение обмоток звездой и треугольником' });
  };

  I.kz = () => {
    const g = [];
    g.push(V.wire([[20, 60], [300, 60]], 'L', { w: 3 }));
    g.push(V.wire([[20, 120], [300, 120]], 'N', { w: 3 }));
    g.push(V.pa('M300 60 Q330 90 300 120', { s: 'var(--bad)', w: 3 }));
    g.push(V.pa('M318 82 l14 -10 l-6 12 l14 -4 l-16 14', { s: 'var(--bad)', f: 'var(--bad)', w: 1 }));
    g.push(V.tx(20, 44, 'Перегрузка: ток чуть больше нормы долго → провод нагревается', { size: 11 }));
    g.push(V.tx(20, 150, 'Короткое замыкание: фаза встретила ноль без нагрузки →', { size: 11 }));
    g.push(V.tx(20, 166, 'сопротивление почти ноль → ток в сотни ампер за миг', { size: 11 }));
    g.push(V.tx(20, 194, 'Утечка: ток ушёл «в землю» мимо нуля → его ловит УЗО', { size: 11 }));
    return V.svg(390, 204, g.join(''), { label: 'Три беды: перегрузка, КЗ, утечка' });
  };

  I.equip = () => {
    const g = [];
    g.push(V.rc(150, 90, 90, 22, { s: 'var(--ink)', f: '#c9b46a', rx: 3 }));
    g.push(V.tx(195, 105, 'ГЗШ', { a: 'middle', size: 12, wt: 700, f: '#222' }));
    const items = [[56, 30, 'PE / PEN ввода'], [195, 20, 'контур заземления'], [334, 30, 'молниезащита'], [50, 180, 'трубы воды'], [195, 196, 'отопление'], [328, 180, 'вентиляция, каркас']];
    items.forEach(([x, y, l]) => {
      g.push(V.wire([[195, 101], [x, y + (y < 90 ? 14 : -14)]], 'PE', { w: 2 }));
      g.push(V.tx(x, y, l, { a: 'middle', size: 11 }));
    });
    g.push(V.tx(10, 226, 'Основная система уравнивания потенциалов на вводе (ПУЭ 1.7.82, 7.1.87)', { size: 10.5, f: 'var(--ink-2)' }));
    return V.svg(390, 234, g.join(''), { label: 'Главная заземляющая шина и уравнивание потенциалов' });
  };

  I.ladder = () => {
    const g = [];
    g.push(V.wire([[20, 30], [20, 200]], 'L', { w: 2.4 }));
    g.push(V.wire([[370, 30], [370, 200]], 'N', { w: 2.4 }));
    g.push(V.tx(20, 22, 'L', { a: 'middle', size: 11, fam: M, wt: 700 }));
    g.push(V.tx(370, 22, 'N', { a: 'middle', size: 11, fam: M, wt: 700 }));
    g.push(V.ln(20, 80, 60, 80));
    g.push(sym.ncH(60, 80, 44)); g.push(V.tx(82, 102, 'SB1 СТОП', { a: 'middle', size: 10.5, fam: M }));
    g.push(V.ln(104, 80, 130, 80));
    g.push(sym.noH(130, 80, 44)); g.push(V.tx(152, 102, 'SB2 ПУСК', { a: 'middle', size: 10.5, fam: M }));
    g.push(V.ln(174, 80, 220, 80));
    g.push(V.ln(214, 80, 214, 80));
    g.push(V.ln(220, 80, 270, 80));
    g.push(sym.coil(300, 80, 44, 18, 'KM1'));
    g.push(V.ln(322, 80, 370, 80));
    g.push(V.ln(116, 80, 116, 140)); g.push(V.ln(116, 140, 140, 140));
    g.push(sym.noH(140, 140, 44)); g.push(V.tx(162, 162, 'KM1 (13–14)', { a: 'middle', size: 10.5, fam: M }));
    g.push(V.ln(184, 140, 200, 140)); g.push(V.ln(200, 140, 200, 80));
    g.push(V.ci(116, 80, 2.6, { f: 'var(--ink)' })); g.push(V.ci(200, 80, 2.6, { f: 'var(--ink)' }));
    g.push(V.tl(20, 186, ['Нажал ПУСК → катушка KM1 включилась → её контакт 13–14', 'замкнулся и «подхватил» кнопку. Отпустил — мотор работает.', 'СТОП разрывает цепь — всё отключается.'], { size: 11, lh: 14 }));
    return V.svg(390, 236, g.join(''), { label: 'Схема пуска с самоподхватом' });
  };

  /* ---------- курс «Обозначения на схемах» ---------- */
  I.symTimeline = () => {
    const ev = [
      ['1906', 'МЭК: учредительное заседание в Лондоне'],
      ['1968', 'Первые стандарты ЕСКД, введены с 1971 г.'],
      ['1976', 'ГОСТ 2.756-76: катушки реле и контакторов'],
      ['1981', 'ГОСТ 2.710-81: буквенные коды'],
      ['1987', 'ГОСТ 2.755-87: контакты и выключатели'],
      ['2008', 'ГОСТ 2.701-2008: виды и типы схем'],
      ['2011', 'ГОСТ 2.702-2011: правила выполнения схем'],
      ['2014', 'ГОСТ 21.613 и 21.210: проекты, с 2015 г.']
    ];
    const g = [], x = 58, y0 = 20, dy = 28;
    g.push(V.ln(x, y0 - 8, x, y0 + dy * (ev.length - 1) + 8, { s: 'var(--line-2)', w: 2 }));
    ev.forEach(([yr, t], i) => {
      const y = y0 + i * dy;
      g.push(V.ci(x, y, 5, { s: 'var(--accent)', f: 'var(--surface)', w: 2 }));
      g.push(V.tx(x - 12, y + 4, yr, { a: 'end', size: 12, fam: M, wt: 700 }));
      g.push(V.tx(x + 14, y + 4, t, { size: 11.5 }));
    });
    return V.svg(400, y0 + dy * ev.length, g.join(''), { label: 'Как складывались стандарты на схемы' });
  };

  I.symContacts = () => {
    const g = [], h = 90, y = 24;
    g.push(sym.contact(80, y, h, ''));
    g.push(V.ln(84, y + 18, 124, y + 12, { s: 'var(--ink-3)', w: 1 }));
    g.push(V.tl(128, y + 10, ['неподвижная', 'контакт-деталь'], { size: 10.5, lh: 13 }));
    g.push(V.ln(72, y + 50, 124, y + 62, { s: 'var(--ink-3)', w: 1 }));
    g.push(V.tl(128, y + 60, ['подвижная', 'контакт-деталь'], { size: 10.5, lh: 13 }));
    g.push(V.tx(80, y + h + 20, 'Замыкающий', { a: 'middle', size: 12, wt: 700 }));
    const x2 = 310, a = y + h * 0.36, b = y + h * 0.64;
    g.push(V.ln(x2, y, x2, a)); g.push(V.ln(x2, a, x2 - h * 0.24, a)); g.push(V.ln(x2, b, x2 - h * 0.28, a - 3)); g.push(V.ln(x2, b, x2, y + h));
    g.push(V.tx(x2, y + h + 20, 'Размыкающий', { a: 'middle', size: 12, wt: 700 }));
    g.push(V.tl(10, y + h + 40, ['Оба в начальном положении: пусковая система обесточена', '(ГОСТ 2.755-87, п. 1.1).'], { size: 10.5, lh: 13, f: 'var(--ink-2)' }));
    return V.svg(420, y + h + 60, g.join(''), { label: 'Замыкающий и размыкающий контакты' });
  };

  I.symSigns = () => {
    const g = [];
    const it = [['km', {}, ['контактор'], 'полукруг'], ['qf', {}, ['выключатель'], 'крест'], ['qs', {}, ['разъединитель'], 'черта'],
      ['qsw', {}, ['выключатель-', 'разъединитель'], 'черта и кружок'], ['', { auto: true }, ['автоматическое', 'срабатывание'], 'квадратик']];
    it.forEach(([k, o, name, sign], i) => {
      const x = 44 + i * 82;
      g.push(sym.contact(x, 12, 74, k, o));
      g.push(V.tl(x, 104, name, { a: 'middle', size: 10.5, lh: 13, wt: 600 }));
      g.push(V.tx(x, 136, sign, { a: 'middle', size: 10.5, f: 'var(--ink-2)' }));
    });
    g.push(V.tl(8, 156, ['ГОСТ 2.755-87, табл. 1. Квадратик ставят на подвижную часть,', 'остальные знаки — на неподвижную.'], { size: 10, lh: 12, f: 'var(--ink-2)' }));
    return V.svg(420, 176, g.join(''), { label: 'Знаки функции на контактах' });
  };

  I.symFamily = () => {
    const g = [];
    const it = [
      [(x) => sym.sw(x, 12, 76), 'QS', ['разъединитель']],
      [(x) => sym.swd(x, 12, 76), 'QS', ['выключатель-', 'разъединитель']],
      [(x) => sym.mcbFull(x, 12, 76) + V.tx(x + 8, 36, 'I>', { size: 10, fam: M }), 'QF', ['автоматический', 'выключатель']],
      [(x) => sym.fuse(x, 12, 76), 'FU', ['плавкий', 'предохранитель']],
      [(x) => sym.rcd(x, 12, 76), 'QD', ['УЗО', '(вариант)']],
      [(x) => sym.rcbo(x, 12, 76), 'QFD', ['дифавтомат', '(вариант)']]
    ];
    it.forEach(([f, code, name], i) => {
      const x = 36 + i * 69;
      g.push(f(x));
      g.push(V.tx(x, 106, code, { a: 'middle', size: 12, fam: M, wt: 700 }));
      g.push(V.tl(x, 121, name, { a: 'middle', size: 9.5, lh: 12 }));
    });
    g.push(V.tl(8, 154, ['QS, QF, FU — ГОСТ 2.710-81; для QD и QFD ГОСТа нет,', 'их поясняют на поле схемы.'], { size: 10, lh: 12, f: 'var(--ink-2)' }));
    return V.svg(420, 174, g.join(''), { label: 'Значки частых силовых аппаратов' });
  };

  I.symCode = () => {
    const g = [];
    g.push(V.tx(210, 38, '=A1-QF5:2', { a: 'middle', size: 30, fam: M, wt: 700 }));
    const rows = [['=A1', 'знак «=» — обозначение устройства', 'входит в щит A1'], ['-QF', 'знак «−» и буквенный код вида', 'автоматический выключатель'],
      ['5', 'номер элемента этого вида', 'пятый автомат в щите'], [':2', 'знак «:» — обозначение контакта', 'его вывод 2']];
    rows.forEach(([p, what, mean], i) => {
      const y = 74 + i * 28;
      g.push(V.tx(14, y, p, { size: 13, fam: M, wt: 700 }));
      g.push(V.tx(74, y, what, { size: 11 }));
      g.push(V.tx(406, y, mean, { a: 'end', size: 11, f: 'var(--ink-2)' }));
      g.push(V.ln(14, y + 9, 406, y + 9, { s: 'var(--line)', w: 1 }));
    });
    g.push(V.tx(14, 200, 'ГОСТ 2.710-81: знаки — табл. 1, устройство — п. 2.2.8, вид и номер — п. 2.2.11.', { size: 10, f: 'var(--ink-2)' }));
    return V.svg(420, 208, g.join(''), { label: 'Из чего состоит буквенно-цифровое обозначение' });
  };

  I.symForm3 = () => {
    const g = [], W = 650;
    const head = [[10, ['Распред.', 'устройство']], [84, ['Аппарат отходящей линии:', 'обозначение, тип, ток']], [236, ['Кабель: обозначение, марка,', 'жилы × сечение, длина']], [424, ['Электроприёмник: обозначение,', 'P, I, наименование']]];
    g.push(V.rc(4, 6, W - 8, 34, { s: 'var(--line)', f: 'var(--surface-2)', w: 1 }));
    head.forEach(([x, t]) => g.push(V.tl(x, 20, t, { size: 9.5, lh: 12, wt: 600 })));
    g.push(V.tl(10, 64, ['ЩР1', '3NPE', '~50 Гц', '220/380 В'], { size: 10, lh: 13, fam: M }));
    g.push(V.ln(76, 54, 76, 176, { w: 4 }));
    const rows = [['QF2  ВА 47-63 1P C16', 'н1  ВВГнг(А)-LS 3×1,5  24 м', '1  0,8 кВт  3,5 А  Освещение'],
      ['QF3  ВА 47-63 1P C16', 'н2  ВВГнг(А)-LS 3×2,5  18 м', '2  2,0 кВт  8,7 А  Розетки кухни'],
      ['QFD1  АВДТ C16, 30 мА', 'н3  ВВГнг(А)-LS 3×2,5  12 м', '3  2,2 кВт  9,6 А  Стиральная машина']];
    rows.forEach(([ap, cab, rec], i) => {
      const y = 82 + i * 40;
      g.push(V.ln(76, y, W - 10, y, { w: 3 }));
      g.push(V.tx(86, y - 7, ap, { size: 10, fam: M }));
      g.push(V.tx(238, y - 7, cab, { size: 10, fam: M }));
      g.push(V.tx(426, y - 7, rec, { size: 10, fam: M }));
    });
    g.push(V.tx(10, 200, 'Упрощённый вид формы 3 ГОСТ 21.613-2014: значки аппаратов, как правило, не рисуют — данные пишут над линией (п. 6.1.7).', { size: 10, f: 'var(--ink-2)' }));
    return V.svg(W, 208, g.join(''), { label: 'Принципиальная схема распределительной сети по форме 3' });
  };

  I.symCtrl = () => {
    const g = [];
    const lab = (x, y, lines) => g.push(V.tl(x, y, lines, { a: 'middle', size: 9.5, lh: 11.5 }));
    g.push(V.ln(46, 30, 46, 41) + sym.coil(46, 48, 30, 14, 'KM') + V.ln(46, 55, 46, 66)); lab(46, 90, ['катушка', 'общее']);
    g.push(sym.coilX(128, 48, 'on', 'KT')); lab(128, 90, ['замедление', 'при срабатывании']);
    g.push(sym.coilX(212, 48, 'off', 'KT')); lab(212, 90, ['замедление', 'при отпускании']);
    g.push(sym.coilX(290, 48, 'th', 'KK')); lab(290, 90, ['тепловое', 'реле']);
    g.push(sym.noDelay(378, 16, 64)); lab(370, 90, ['контакт', 'с замедлением']);
    g.push(sym.button(70, 112, 60, false)); lab(56, 192, ['кнопка', 'замыкающая']);
    g.push(sym.button(170, 112, 60, true)); lab(156, 192, ['кнопка', 'размыкающая']);
    g.push(V.ln(262, 120, 262, 133) + sym.lampC(262, 142, 'C2') + V.ln(262, 151, 262, 164)); lab(262, 192, ['лампа', 'красная']);
    g.push(V.ln(352, 120, 352, 133) + sym.lampC(352, 142, 'C5') + V.ln(352, 151, 352, 164)); lab(352, 192, ['лампа', 'зелёная']);
    g.push(V.tx(8, 222, 'Катушки — ГОСТ 2.756-76, контакты и кнопки — ГОСТ 2.755-87, лампы — ГОСТ 2.732-68.', { size: 10, f: 'var(--ink-2)' }));
    return V.svg(420, 230, g.join(''), { label: 'Значки схем управления' });
  };

  I.symSpread = () => {
    const g = [], M2 = M;
    // силовая цепь
    g.push(V.tx(70, 12, 'L1', { a: 'middle', size: 10, fam: M2, wt: 700 }));
    g.push(sym.mcb(70, 18, 50) + V.tx(84, 40, 'QF1', { size: 9.5, fam: M2, wt: 600 }));
    g.push(sym.km(70, 68, 50) + V.tx(84, 90, 'KM1', { size: 9.5, fam: M2, wt: 700, f: 'var(--accent)' }));
    g.push(V.ln(70, 118, 70, 136) + sym.motor(70, 150, 14) + V.tx(92, 154, 'M1', { size: 9.5, fam: M2, wt: 600 }));
    g.push(V.tx(70, 186, 'силовая цепь', { a: 'middle', size: 10, f: 'var(--ink-2)' }));
    // цепь управления
    const cx = 250;
    g.push(V.tx(cx, 12, 'L', { a: 'middle', size: 10, fam: M2, wt: 700 }));
    g.push(sym.button(cx, 18, 50, true) + V.tx(cx + 10, 40, 'SB1 «Стоп»', { size: 9.5, fam: M2 }));
    g.push(sym.button(cx, 68, 50, false) + V.tx(cx - 70, 96, 'SB2 «Пуск»', { size: 9.5, fam: M2 }));
    g.push(V.ln(cx, 68, 320, 68) + V.ln(cx, 118, 320, 118) + sym.contact(320, 68, 50, '') + V.ci(cx, 68, 2.4, { s: null, f: 'var(--ink)' }) + V.ci(cx, 118, 2.4, { s: null, f: 'var(--ink)' }));
    g.push(V.tx(330, 96, 'KM1:13–14', { size: 9.5, fam: M2, wt: 700, f: 'var(--accent)' }));
    g.push(V.ln(cx, 118, cx, 135) + sym.coil(cx, 142, 34, 14, 'KM1') + V.ln(cx, 149, cx, 166) + V.tx(cx, 178, 'N', { a: 'middle', size: 10, fam: M2, wt: 700 }));
    g.push(V.tx(cx + 30, 186, 'цепь управления', { a: 'middle', size: 10, f: 'var(--ink-2)' }));
    g.push(V.tx(8, 206, 'Катушка KM1 и её контакты — в разных цепях; связывает их обозначение KM1 (ГОСТ 2.702-2011, п. 5.3.14).', { size: 9.5, f: 'var(--ink-2)' }));
    return V.svg(420, 214, g.join(''), { label: 'Разнесённый способ: катушка и контакты контактора в разных цепях' });
  };

  I.symLines = () => {
    const g = [];
    const lab = (x, lines) => g.push(V.tl(x, 98, lines, { a: 'middle', size: 9.5, lh: 11.5 }));
    g.push(V.ln(16, 50, 70, 50) + V.ln(43, 22, 43, 78)); lab(43, ['пересечение', 'без соединения']);
    g.push(V.ln(96, 50, 150, 50) + V.ln(123, 50, 123, 78) + V.ci(123, 50, 3, { s: null, f: 'var(--ink)' })); lab(123, ['соединение', '(точка)']);
    g.push(V.rc(176, 44, 56, 8, { s: 'var(--ink)', f: 'var(--surface)' }) + V.rc(200, 52, 8, 26, { s: 'var(--ink)', f: 'var(--surface)' })); lab(204, ['шина', 'и ответвление']);
    g.push(V.ln(256, 50, 312, 50, { w: 1.2, d: '10 3 2 3' })); lab(284, ['PE —', 'штрихпунктир']);
    g.push(V.ln(336, 50, 404, 50, { w: 2.4 }) + V.ln(364, 58, 376, 42) + V.tx(380, 40, '3', { size: 11, wt: 700 })); lab(370, ['три провода', 'одной линией']);
    g.push(V.tx(8, 138, 'ГОСТ 2.721-74: линии электрической связи, шины, ответвления; PE допускается тонкой штрихпунктирной линией.', { size: 9.5, f: 'var(--ink-2)' }));
    return V.svg(420, 146, g.join(''), { label: 'Линии, соединения и шины на схемах' });
  };

  I.symWireNum = () => {
    const g = [], x = 110, n = 230;
    const seg = (y1, y2, t) => { g.push(V.ln(x, y1, x, y2)); g.push(V.tx(x - 10, (y1 + y2) / 2 + 4, t, { a: 'end', size: 11, fam: M, wt: 700, f: 'var(--accent)' })); };
    seg(14, 30, 'L1'); g.push(sym.mcb(x, 30, 44) + V.tx(x + 12, 52, 'QF1', { size: 9.5, fam: M }));
    seg(74, 92, 'L11'); g.push(sym.km(x, 92, 44) + V.tx(x + 12, 114, 'KM1', { size: 9.5, fam: M }));
    seg(136, 152, 'L12'); g.push(sym.heater(x, 164, 30, 12) + V.tx(x + 20, 168, 'EK1', { size: 9.5, fam: M }));
    g.push(V.ln(x, 170, x, 190) + V.ln(x, 190, n, 190) + V.ln(n, 190, n, 14) + V.tx(n + 8, 104, 'N', { size: 11, fam: M, wt: 700, f: 'var(--accent)' }));
    g.push(V.tl(258, 40, ['Участки, разделённые', 'контактами, имеют разные', 'номера; через клемму', 'номер не меняется.', '', 'ГОСТ 2.709-89,', 'пп. 5.3, 5.4, 5.7'], { size: 10, lh: 13, f: 'var(--ink-2)' }));
    return V.svg(420, 200, g.join(''), { label: 'Обозначение участков цепи' });
  };

  I.symRare = () => {
    const g = [];
    const it = [[(x) => sym.ta(x, 14, 76), 'TA', ['трансформатор', 'тока']], [(x) => V.ln(x, 14, x, 41) + sym.gauge(x, 52, 'A') + V.ln(x, 63, x, 90), 'PA', ['амперметр']],
      [(x) => V.ln(x, 14, x, 41) + sym.gauge(x, 52, 'V') + V.ln(x, 63, x, 90), 'PV', ['вольтметр']], [(x) => V.ln(x, 14, x, 40) + sym.meterG(x, 52) + V.ln(x, 64, x, 90), 'PI', ['счётчик', 'активной энергии']],
      [(x) => sym.varistor(x, 14, 76), 'RU', ['варистор']], [(x) => sym.arrester(x, 14, 76), 'FV', ['разрядник']]];
    it.forEach(([f, code, name], i) => {
      const x = 34 + i * 70;
      g.push(f(x));
      g.push(V.tx(x, 108, code, { a: 'middle', size: 12, fam: M, wt: 700 }));
      g.push(V.tl(x, 122, name, { a: 'middle', size: 9.5, lh: 11.5 }));
    });
    g.push(V.tx(8, 158, 'ГОСТ 2.723-68, 2.729-68, 2.728-74, 2.727-68; коды — ГОСТ 2.710-81.', { size: 10, f: 'var(--ink-2)' }));
    return V.svg(420, 166, g.join(''), { label: 'Трансформатор тока, приборы, варистор и разрядник' });
  };

  I.symPlan = () => {
    const g = [];
    const cell = (i, row, draw, lines) => { const x = 36 + i * 70, y = row ? 132 : 44; g.push(draw(x, y)); g.push(V.tl(x, y + 26, lines, { a: 'middle', size: 9, lh: 11 })); };
    cell(0, 0, (x, y) => sym.planSocket(x, y, { pe: true }), ['розетка с PE', 'открытая']);
    cell(1, 0, (x, y) => sym.planSocket(x, y, { pe: true, hidden: true }), ['розетка с PE', 'скрытая']);
    cell(2, 0, (x, y) => sym.planSocket(x, y, { pe: true, ip44: true }), ['розетка с PE', 'IP44']);
    cell(3, 0, (x, y) => sym.planSwitch(x - 4, y + 2), ['выключатель', 'открытый']);
    cell(4, 0, (x, y) => sym.planSwitch(x - 4, y + 2, { hidden: true }), ['выключатель', 'скрытый']);
    cell(5, 0, (x, y) => sym.planSwitch(x - 4, y + 2, { ip44: true }), ['выключатель', 'IP44']);
    cell(0, 1, (x, y) => sym.planSwitch(x - 4, y + 2, { keys: 2 }), ['выключатель', 'сдвоенный']);
    cell(1, 1, (x, y) => sym.planLamp(x, y - 3), ['светильник,', 'лампа накаливания']);
    cell(2, 1, (x, y) => sym.planLamp(x, y - 3, { linear: true }), ['светильник', 'линейный']);
    cell(3, 1, (x, y) => sym.planBoard(x, y - 3), ['щиток рабочего', 'освещения']);
    cell(4, 1, (x, y) => sym.planBoard(x, y - 3, { cabinet: true }), ['шкаф', 'распределительный']);
    g.push(V.tx(8, 196, 'ГОСТ 21.210-2014, табл. 4–6 (рисунок не в масштабе).', { size: 10, f: 'var(--ink-2)' }));
    return V.svg(430, 204, g.join(''), { label: 'Изображения электрооборудования на планах' });
  };

  I.symPlanRoom = () => {
    const g = [], W = 'var(--ink)';
    // стены с дверным проёмом внизу слева
    g.push(V.pa('M120 200 H400 V20 H20 V200 H70', { s: W, w: 4 }));
    g.push(V.pa('M70 200 A50 50 0 0 1 120 150', { s: 'var(--ink-3)', w: 1, d: '3 3' }));
    // провода — внутри комнаты вдоль стен
    const wire = (d) => g.push(V.pa(d, { s: 'var(--accent)', w: 1.2 }));
    const tag = (x, y, t) => g.push(V.tx(x, y, t, { size: 10, fam: M, wt: 700, f: 'var(--accent)' }));
    wire('M34 172 V100 H204'); wire('M140 176 V100'); g.push(V.ci(140, 100, 2.2, { s: null, f: 'var(--accent)' })); tag(48, 94, 'гр. 1');
    wire('M42 182 V190 H300 M300 190 H388 V30 H300'); tag(318, 184, 'гр. 2');
    g.push(sym.planBoard(34, 182) + V.tx(48, 176, 'ЩК', { size: 10, fam: M, wt: 700 }));
    g.push(sym.planLamp(210, 100));
    g.push(sym.planSwitch(140, 182, { hidden: true }));
    g.push(sym.planSocket(300, 197, { pe: true, hidden: true }));
    g.push(`<g transform="rotate(-90 397 110)">${sym.planSocket(397, 110, { pe: true, hidden: true })}</g>`);
    g.push(`<g transform="rotate(180 300 23)">${sym.planSocket(300, 23, { pe: true, hidden: true })}</g>`);
    g.push(V.tl(10, 216, ['Номера групп на плане совпадают с обозначениями на схеме', '(ГОСТ 21.613-2014, п. 6.4.2). Рисунок не в масштабе.'], { size: 9.5, lh: 12, f: 'var(--ink-2)' }));
    return V.svg(420, 236, g.join(''), { label: 'Пример плана комнаты: щиток, светильник, выключатель, розетки' });
  };

  I.leak = () => {
    const g = [];
    const rows = [['Розеточная линия, 10 А нагрузки', '10 × 0,4 = 4 мА'], ['Кабель 30 м', '30 × 0,01 = 0,3 мА'], ['Итого', '≈ 4,3 мА'], ['Допустимо на УЗО 30 мА', '≤ 10 мА (1/3)']];
    rows.forEach((r, i) => { const y = 30 + i * 30; g.push(V.tx(14, y, r[0], { size: 12, wt: i >= 2 ? 700 : 400 })); g.push(V.tx(376, y, r[1], { a: 'end', size: 12, fam: M, wt: 700 })); g.push(V.ln(14, y + 10, 376, y + 10, { s: 'var(--line)', w: 1 })); });
    g.push(V.tx(14, 160, 'ПУЭ 7.1.83 / СП 256 А.1.2: 0,4 мА на 1 А, 10 мкА на 1 м', { size: 10.5, f: 'var(--ink-2)' }));
    return V.svg(390, 170, g.join(''), { label: 'Расчёт фонового тока утечки' });
  };

  I.panelfront = () => {
    // пример лицевой части квартирного щита
    const g = [];
    g.push(V.rc(10, 10, 370, 230, { s: 'var(--enc-line)', f: 'var(--enc)', rx: 10, w: 2 }));
    const rail = (y) => V.rc(24, y, 342, 10, { s: null, f: 'var(--rail)' });
    g.push(rail(58)); g.push(rail(158));
    const dev = (x, y, w, lbl, sub, col) => V.rc(x, y, w, 68, { s: 'var(--dev-line)', f: 'var(--dev)', rx: 3 }) + V.tx(x + w / 2, y + 26, lbl, { a: 'middle', size: 9.5, fam: M, wt: 700, f: '#222' }) + V.tx(x + w / 2, y + 38, sub || '', { a: 'middle', size: 8.5, fam: M, f: '#555' }) + V.rc(x + w / 2 - 5, y + 44, 10, 14, { s: '#555', f: col || '#cfd3cf', rx: 2 });
    let x = 30;
    g.push(dev(x, 29, 36, 'QF1', '2P C40')); x += 38;
    g.push(dev(x, 29, 36, 'KV1', 'РН 50А', '#7fe39d')); x += 38;
    g.push(dev(x, 29, 36, 'QD1', '40/30', '#f2b705')); x += 38;
    for (let i = 0; i < 3; i++) { g.push(dev(x, 29, 18, 'QF' + (2 + i), 'C16')); x += 19; }
    x += 6;
    g.push(dev(x, 29, 36, 'QD2', '40/30', '#f2b705')); x += 38;
    for (let i = 0; i < 2; i++) { g.push(dev(x, 29, 18, 'QF' + (5 + i), 'C16')); x += 19; }
    x = 30;
    g.push(dev(x, 129, 36, 'QFD1', 'C32 30')); x += 38;
    g.push(dev(x, 129, 36, 'QFD2', 'C16 10')); x += 38;
    for (let i = 0; i < 3; i++) { g.push(dev(x, 129, 18, 'QF' + (7 + i), 'C10')); x += 19; }
    g.push(V.rc(260, 205, 100, 10, { s: '#555', f: '#c9b46a', rx: 2 })); g.push(V.tx(310, 230, 'N-шины', { a: 'middle', size: 10 }));
    g.push(V.rc(150, 205, 100, 10, { s: '#555', f: 'var(--w-pe)', rx: 2 })); g.push(V.tx(200, 230, 'PE-шина', { a: 'middle', size: 10 }));
    return V.svg(390, 250, g.join(''), { label: 'Пример раскладки квартирного щита' });
  };
})();
