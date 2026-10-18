/* Школа щитовика — отрисовка: лицевые панели аппаратов, монтажная схема щита с проводами,
   однолинейная схема, таблицы. Единицы в монтажной схеме — миллиметры (1 модуль = 18 мм). */
(function () {
  'use strict';
  const S = window.SHK;
  const V = S.svg;
  const M = V.mono;
  const MW = 18, DH = 96;
  const sec = (s) => String(s).replace('.', ',');
  const esc = S.esc;

  /* ---------- лицевая панель аппарата ---------- */
  const TOG = (x, y, w, col) => V.rc(x + w / 2 - 5, y, 10, 20, { s: '#555', f: col || '#d4d8d4', rx: 2, w: 1 }) + V.rc(x + w / 2 - 4, y + 2, 8, 8, { s: null, f: '#8d948f', rx: 1.5 });
  function terminalsX(d, x, wpx, list) {
    const n = list.length || 1;
    return list.map((t, i) => [t, x + (i + 0.5) * (wpx / n)]);
  }
  S.devFace = function (d, x, y, o) {
    o = o || {};
    const wpx = (d.w || 1) * MW;
    const T = S.engine.TERMS(d);
    const g = [];
    const body = '#FAFAF7', edge = '#8E968F', txt = '#1d211f', sub = '#59615c';
    const type = d.type;
    if (type === 'meter' && d.mount === 'panel') return '';
    g.push(V.rc(x + 0.6, y, wpx - 1.2, DH, { s: edge, f: body, rx: 3, w: 1 }));
    g.push(V.rc(x + 0.6, y, wpx - 1.2, 16, { s: null, f: '#E9EBE6', rx: 3 }));
    g.push(V.rc(x + 0.6, y + DH - 16, wpx - 1.2, 16, { s: null, f: '#E9EBE6', rx: 3 }));
    terminalsX(d, x, wpx, T.top).forEach(([t, tx]) => { if (t) g.push(V.ci(tx, y + 8, 3.1, { s: '#6f766f', f: '#cdd1cc', w: 0.8 }) + V.ln(tx - 1.8, y + 8, tx + 1.8, y + 8, { s: '#6f766f', w: 0.8 })); });
    terminalsX(d, x, wpx, T.bot).forEach(([t, tx]) => { if (t) g.push(V.ci(tx, y + DH - 8, 3.1, { s: '#6f766f', f: '#cdd1cc', w: 0.8 }) + V.ln(tx - 1.8, y + DH - 8, tx + 1.8, y + DH - 8, { s: '#6f766f', w: 0.8 })); });
    const cx = x + wpx / 2;
    const idTxt = d.id || '';
    const small = wpx < 20;
    g.push(V.tx(cx, y + 26, esc(idTxt), { a: 'middle', size: small ? 5.2 : 6.4, fam: M, f: sub, wt: 600 }));
    let main = '', subt = '', tog = '#d4d8d4';
    if (type === 'mcb') { main = (d.curve || 'C') + (d.In || ''); subt = d.poles > 1 ? d.poles + 'P' : ''; }
    if (type === 'sw') { main = (d.In || '') + 'A'; subt = d.poles + 'P'; tog = '#d94b3d'; }
    if (type === 'rcd') { main = (d.In || '') + 'A'; subt = (d.ma || 30) + 'мА' + (d.sel ? ' S' : ''); tog = '#d6d9d5'; }
    if (type === 'rcbo') { main = (d.curve || 'C') + (d.In || ''); subt = (d.ma || 30) + 'мА'; }
    if (type === 'rn') { main = 'РН'; subt = (d.In || '') + 'А'; }
    if (type === 'spd') { main = 'УЗИП'; subt = d.cls || ''; }
    if (type === 'meter') { main = 'kWh'; subt = ''; }
    if (type === 'xt') { main = 'XT'; subt = d.poles === 4 ? 'L1 L2 L3 N' : 'L N'; }
    if (type === 'contactor') { main = 'KM'; subt = d.sub || ''; }
    if (type === 'timer') { main = d.rating || 'KT'; subt = d.sub || ''; }
    if (type === 'fuse') { main = d.rating || 'FU'; }
    if (type === 'nbus' || type === 'cross' || type === 'term' || type === 'ind' || type === 'sock') { main = d.rating || ''; }
    if (d.rating && !main) main = d.rating;
    g.push(V.tx(cx, y + 40, esc(main), { a: 'middle', size: small ? 7 : 8.6, fam: M, wt: 700, f: txt }));
    if (type === 'rn' || type === 'meter') {
      g.push(V.rc(x + 4, y + 46, wpx - 8, 12, { s: '#2b3a31', f: '#1f2a24', rx: 1.5, w: 0.8 }));
      g.push(V.tx(cx, y + 55, type === 'rn' ? '230' : '00123,4', { a: 'middle', size: 7, fam: M, f: '#7fe39d' }));
    } else if (type === 'spd') {
      for (let i = 0; i < Math.max(1, Math.round(d.w)); i++) g.push(V.rc(x + i * MW + 5, y + 48, 8, 6, { s: '#444', f: '#3cbf60', rx: 1, w: 0.6 }));
    } else if (type === 'xt') {
      const bars = d.poles === 4 ? ['L1', 'L2', 'L3', 'N'] : ['L', 'N'];
      bars.forEach((b, i) => g.push(V.rc(x + 4, y + 46 + i * 6, wpx - 8, 4, { s: null, f: V.wc[b], rx: 1 })));
    } else if (type === 'nbus' || type === 'term' || type === 'cross') {
      g.push(V.rc(x + 3, y + 48, wpx - 6, 10, { s: '#7a6a2a', f: '#c9b46a', rx: 1.5, w: 0.7 }));
    } else if (type === 'ind') {
      g.push(V.ci(cx, y + 56, 6, { s: '#555', f: '#f2b705' }));
    } else if (type === 'sock') {
      g.push(V.ci(cx, y + 58, 11, { s: '#555', f: '#ececec' })); g.push(V.ci(cx - 4, y + 58, 1.6, { f: '#333', s: null })); g.push(V.ci(cx + 4, y + 58, 1.6, { f: '#333', s: null }));
    } else if (type === 'timer') {
      g.push(V.ci(cx, y + 56, 9, { s: '#555', f: '#ececec' })); g.push(V.ln(cx, y + 56, cx + 5, y + 52, { s: '#333', w: 1 }));
    } else if (type === 'fuse') {
      g.push(V.rc(x + 4, y + 46, wpx - 8, 22, { s: '#555', f: '#e3e3e3', rx: 2 }));
    } else {
      const poles = Math.max(1, Math.round(d.type === 'rcbo' ? 1 : (d.w || 1)));
      if (type === 'mcb' || type === 'sw' || type === 'rcd' || type === 'rcbo' || type === 'contactor') {
        g.push(TOG(x, y + 48, wpx, tog));
        if (poles > 1 && wpx > 30) g.push(V.rc(x + 3, y + 51, wpx - 6, 3, { s: null, f: '#9aa09a', rx: 1 }));
      }
    }
    if (type === 'rcd' || type === 'rcbo') { g.push(V.rc(x + wpx - (small ? 9 : 11), y + 61, small ? 6 : 8, 6, { s: '#555', f: '#f2b705', rx: 1, w: 0.6 })); g.push(V.tx(x + wpx - (small ? 6 : 7), y + 66, 'T', { a: 'middle', size: 4.5, fam: M, f: '#111', wt: 700 })); }
    g.push(V.tx(cx, y + 78, esc(subt), { a: 'middle', size: small ? 4.8 : 6, fam: M, f: sub }));
    return `<g class="dev" data-dev="${esc(idTxt)}">${g.join('')}</g>`;
  };
  // отдельный аппарат для карточки справочника
  S.devCard = function (face) {
    const d = Object.assign({ w: face.w || (face.type === 'rcbo1' ? 1 : face.type === 'rcbo' ? 2 : face.type === 'meter1' ? 6 : face.type === 'meter3' ? 8 : face.poles || 1) }, face);
    if (d.type === 'rcbo1') { d.type = 'rcbo'; d.compact = true; d.w = 1; }
    if (d.type === 'meter1') { d.type = 'meter'; d.poles = 1; d.w = 6; d.mount = 'din'; }
    if (d.type === 'meter3') { d.type = 'meter'; d.poles = 3; d.w = 8; d.mount = 'din'; }
    if (d.type === 'rn') d.w = 2;
    if (d.type === 'spd') d.w = d.poles || 2;
    if (d.type === 'contactor') d.w = d.poles || 2;
    if (d.type === 'rcd') d.w = d.poles === 4 ? 4 : 2;
    if (d.type === 'rcbo' && !d.compact) d.w = 2;
    if (d.type === 'sw') d.w = d.poles || 2;
    if (d.type === 'mcb') d.w = d.poles || 1;
    if (typeof d.rating === 'string' && /^[BCD]\d+$/.test(d.rating)) { d.curve = d.rating[0]; d.In = d.rating.slice(1); }
    else if (d.rating && /А$/.test(d.rating)) d.In = parseInt(d.rating, 10);
    if (d.sub && /мА/.test(d.sub)) d.ma = parseInt(d.sub, 10);
    if (d.type === 'spd') d.cls = d.rating;
    d.id = '';
    const wpx = d.w * MW;
    const pad = 14;
    return V.svg(wpx + pad * 2, DH + 30, V.rc(4, 18, wpx + pad * 2 - 8, 10, { s: null, f: 'var(--rail)', rx: 2 }) + S.devFace(d, pad, 6), { width: Math.min(260, (wpx + pad * 2) * 2.1), label: 'Внешний вид аппарата' });
  };

  /* ---------- монтажная схема щита ---------- */
  S.renderPanel = function (R, opts) {
    opts = opts || {};
    const W = R.layout.W, rails = R.layout.rails;
    const GL = 54, GR = 54;
    const CH = 80, CH0 = 70;
    const meterBand = R.layout.meterPanel ? 190 : 0;
    const railLen = W * MW;
    const yTop = (r) => meterBand + CH0 + r * (DH + CH);
    const lastBot = yTop(rails - 1) + DH;
    const busY0 = lastBot + CH + 10;
    const nBuses = R.buses.filter((b) => b.kind === 'N');
    const busW = (b) => Math.max(40, (b.terms.length + 2) * 7);
    // ряды шин N
    const rowsN = [];
    let rowX = GL, row = [];
    nBuses.forEach((b) => { const w = busW(b); if (rowX + w > GL + railLen && row.length) { rowsN.push(row); row = []; rowX = GL; } row.push({ b, x: rowX, w }); rowX += w + 14; });
    if (row.length) rowsN.push(row);
    const busPos = {};
    rowsN.forEach((rw, i) => rw.forEach((it) => { busPos[it.b.id] = { x: it.x, y: busY0 + i * 30, w: it.w }; }));
    const peB = R.buses.find((b) => b.kind === 'PE');
    const peY = busY0 + rowsN.length * 30 + 6;
    busPos.PE = { x: GL, y: peY, w: Math.max(busW(peB), Math.min(railLen, busW(peB))) };
    if (busPos.PE.w > railLen) busPos.PE.w = railLen;
    const EW = GL + railLen + GR;
    const EH = peY + 46;
    const devs = R.devices;
    const devById = {};
    devs.forEach((d) => { devById[d.id] = d; });
    const meterBox = R.layout.meterPanel ? { x: GL + 10, y: 18, w: Math.min(railLen - 20, 190), h: 150 } : null;
    // координаты клемм
    const termPos = (end) => {
      if (end.bus) {
        const bp = busPos[end.bus];
        const b = R.buses.find((x) => x.id === end.bus);
        const n = b.terms.length;
        const step = Math.min(7, (bp.w - 10) / Math.max(1, n));
        return { x: bp.x + 6 + (end.slot + 0.5) * step, y: bp.y, side: 'top', ch: rails };
      }
      if (end.dev) {
        const d = devById[end.dev];
        const T = S.engine.TERMS(d);
        if (d.type === 'meter' && d.mount === 'panel') {
          const i = T.bot.indexOf(end.term);
          const n = T.bot.length;
          return { x: meterBox.x + 14 + (i + 0.5) * ((meterBox.w - 28) / n), y: meterBox.y + meterBox.h - 8, side: 'bot', ch: 0 };
        }
        const x0 = GL + d.x * MW, wpx = d.w * MW;
        let i = T.top.indexOf(end.term);
        if (i >= 0) return { x: x0 + (i + 0.5) * (wpx / T.top.length), y: yTop(d.rail) + 8, side: 'top', ch: d.rail };
        i = T.bot.indexOf(end.term);
        if (i >= 0) return { x: x0 + (i + 0.5) * (wpx / T.bot.length), y: yTop(d.rail) + DH - 8, side: 'bot', ch: d.rail + 1 };
        return { x: x0 + wpx / 2, y: yTop(d.rail) + 8, side: 'top', ch: d.rail };
      }
      return null;
    };
    // каналы и дорожки
    const chTop = (c) => c === 0 ? meterBand + 4 : yTop(c - 1) + DH + 4;
    const chBot = (c) => c === 0 ? yTop(0) - 14 : c === rails ? busY0 - 8 : yTop(c) - 14;
    const laneN = {};
    const lane = (c) => { const k = laneN[c] = (laneN[c] || 0) + 1; const span = Math.max(10, chBot(c) - chTop(c)); return chTop(c) + 3 + ((k * 3.4) % span); };
    let gl = 0, gr = 0;
    const gutter = (side) => side === 'L' ? GL - 6 - ((gl++ * 3.4) % (GL - 12)) : GL + railLen + 6 + ((gr++ * 3.4) % (GR - 12));
    const route = (a, b) => {
      if (a.ch === b.ch) { const y = lane(a.ch); return [[a.x, a.y], [a.x, y], [b.x, y], [b.x, b.y]]; }
      const side = (a.x + b.x) / 2 < GL + railLen / 2 ? 'L' : 'R';
      const gx = gutter(side), ya = lane(a.ch), yb = lane(b.ch);
      return [[a.x, a.y], [a.x, ya], [gx, ya], [gx, yb], [b.x, yb], [b.x, b.y]];
    };
    // вход кабеля
    let extK = 0;
    const extIn = (cond) => { const x = 10 + (extK++) * 5; return { x, y: 0, side: 'ext', ch: 0 }; };
    const g = [];
    // корпус
    g.push(V.rc(1, 1, EW - 2, EH - 2, { s: 'var(--enc-line)', f: 'var(--enc)', rx: 8, w: 2 }));
    for (let r = 0; r < rails; r++) {
      const y = yTop(r) + DH / 2 - 9;
      g.push(V.rc(GL - 8, y, railLen + 16, 18, { s: null, f: 'var(--rail)', rx: 2 }));
      for (let i = 0; i < W + 1; i++) g.push(V.rc(GL - 4 + i * MW, y + 5, 8, 8, { s: null, f: 'var(--enc)', rx: 3, o: 0.6 }));
    }
    if (meterBox) {
      const m = R.layout.meterPanel;
      const T = S.engine.TERMS(m);
      g.push(`<g class="dev" data-dev="${m.id}">` + V.rc(meterBox.x, meterBox.y, meterBox.w, meterBox.h, { s: '#8E968F', f: '#F4F5F2', rx: 6, w: 1.2 }) + V.rc(meterBox.x + 16, meterBox.y + 14, meterBox.w - 32, 30, { s: '#2b3a31', f: '#cfe3c9', rx: 3 }) + V.tx(meterBox.x + meterBox.w / 2, meterBox.y + 34, '012345,67', { a: 'middle', size: 14, fam: M, f: '#1d2a1d' }) + V.tx(meterBox.x + meterBox.w / 2, meterBox.y + 64, `${m.id} · счётчик ${m.poles === 3 ? '3ф' : '1ф'}`, { a: 'middle', size: 9, fam: M, f: '#333', wt: 700 }) + V.rc(meterBox.x + 8, meterBox.y + meterBox.h - 22, meterBox.w - 16, 22, { s: '#888', f: '#e5e6e1', rx: 2 }) + T.bot.map((t, i) => { const x = meterBox.x + 14 + (i + 0.5) * ((meterBox.w - 28) / T.bot.length); return V.ci(x, meterBox.y + meterBox.h - 8, 3, { s: '#666', f: '#ccc', w: 0.8 }) + V.tx(x, meterBox.y + meterBox.h - 16, t, { a: 'middle', size: 5.5, fam: M, f: '#333' }); }).join('') + '</g>');
    }
    // аппараты
    devs.forEach((d) => { if (!(d.type === 'meter' && d.mount === 'panel')) g.push(S.devFace(d, GL + d.x * MW, yTop(d.rail))); });
    // гребёнки
    (R.combs || []).forEach((c) => {
      const ds = c.devs.map((id) => devById[id]);
      const first = ds[0], last = ds[ds.length - 1];
      const y = yTop(first.rail) - 4;
      const x1 = GL + first.x * MW + 2, x2 = GL + (last.x + last.w) * MW - 2;
      const parts = [];
      c.conds.forEach((cd, k) => parts.push(V.rc(x1, y - 5 - k * 3, x2 - x1, 2.6, { s: null, f: V.wc[cd] || 'var(--w-l1)', rx: 1 })));
      ds.forEach((d, i) => {
        if (d.poles === 3) {
          ['L1', 'L2', 'L3'].forEach((p) => {
            const k = Math.max(0, c.conds.indexOf(p));
            const tp = termPos({ dev: d.id, term: p });
            parts.push(V.ln(tp.x, y - 5 - k * 3 + 1, tp.x, tp.y - 2, { s: V.wc[p], w: 2.2, lc: 'butt' }));
          });
          return;
        }
        const cd = c.conds[i % c.conds.length];
        const k = i % c.conds.length;
        const tp = termPos({ dev: d.id, term: 'L' });
        parts.push(V.ln(tp.x, y - 5 - k * 3 + 1, tp.x, tp.y - 2, { s: V.wc[cd] || 'var(--w-l1)', w: 2.2, lc: 'butt' }));
      });
      g.push(`<g class="comb" data-comb="${c.id}">${parts.join('')}</g>`);
    });
    // шины
    R.buses.forEach((b) => {
      const p = busPos[b.id];
      const col = b.kind === 'PE' ? 'var(--w-pe)' : '#c9b46a';
      const n = b.terms.length;
      const step = Math.min(7, (p.w - 10) / Math.max(1, n));
      let s = V.rc(p.x, p.y, p.w, 8, { s: '#6a5c22', f: col, rx: 2, w: 0.8 });
      for (let i = 0; i < n; i++) s += V.ci(p.x + 6 + (i + 0.5) * step, p.y + 4, 1.7, { s: '#5b4f1c', f: '#e8dca6', w: 0.6 });
      s += V.tx(p.x + p.w + 4, p.y + 7, esc(b.id), { size: 7, fam: M, wt: 700 });
      g.push(`<g class="bus" data-bus="${esc(b.id)}">${s}</g>`);
    });
    // провода
    const wireEls = [];
    const stubs = [];
    R.wires.forEach((w) => {
      let a = w.from.ext ? null : termPos(w.from);
      let b = w.to.ext ? null : termPos(w.to);
      let pts;
      if (w.from.ext === 'input') {
        const e = extIn(w.cond);
        if (b.ch === rails) { const gx = gutter('L'); const yb = lane(rails); pts = [[e.x, 0], [e.x, chTop(0) - 2], [gx, chTop(0) - 2], [gx, yb], [b.x, yb], [b.x, b.y]]; }
        else if (b.side === 'top' && b.ch === 0) { const y = lane(0); pts = [[e.x, 0], [e.x, y], [b.x, y], [b.x, b.y]]; }
        else { const gx = gutter('L'); const y = lane(b.ch); pts = [[e.x, 0], [e.x, chTop(0) - 2], [gx, chTop(0) - 2], [gx, y], [b.x, y], [b.x, b.y]]; }
      } else if (w.from.ext === 'ground') {
        pts = [[GL / 2, EH], [GL / 2, b.y + 18], [b.x, b.y + 18], [b.x, b.y + 8]];
      } else if (w.to.ext === 'line') {
        // отходящий кабель: короткий хвост вниз
        const len = 16;
        if (a.side === 'bot') pts = [[a.x, a.y], [a.x, a.y + len]];
        else pts = [[a.x, a.y + 8], [a.x, a.y + 8 + len]];
        stubs.push({ w, x: pts[1][0], y: pts[1][1] });
      } else {
        if (b.side === 'top' && w.to.bus) b = Object.assign({}, b);
        pts = route(a, b);
      }
      wireEls.push(`<g class="wire" data-w="${w.id}">${V.wire(pts, w.cond, { w: Math.max(1.4, Math.min(3.2, Math.sqrt(w.mm2) * 0.95)) })}</g>`);
    });
    stubs.forEach((s) => wireEls.push(`<g class="wire" data-w="${s.w.id}"><text x="${s.x}" y="${s.y + 7}" text-anchor="middle" style="font-size:5.6px;font-family:${M};fill:var(--ink-2);font-weight:700">${s.w.cable}</text></g>`));
    g.push(wireEls.join(''));
    // подписи кабеля ввода
    g.push(V.tx(10, -4 + 12, '', {}));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -14 ${EW + 4} ${EH + 16}" width="${EW + 4}" height="${EH + 16}" role="img" aria-label="Монтажная схема щита" class="panel-svg" style="font-family:var(--font-body)">${V.tx(8, -4, 'ввод ↓', { size: 7, fam: M, f: 'var(--ink-2)' })}${g.join('')}</svg>`;
  };
  S.panelHighlight = function (root, hl) {
    const svg = root.querySelector('.panel-svg');
    if (!svg) return;
    const on = !!hl;
    const set = (sel, attr, ids) => svg.querySelectorAll(sel).forEach((el) => {
      const id = el.getAttribute(attr);
      const hit = !!(ids && ids.includes(id));
      el.classList.toggle('dim', !!(on && !hit));
      el.classList.toggle('glow', !!(on && hit));
    });
    set('.wire', 'data-w', hl && hl.wires);
    set('.dev', 'data-dev', hl && hl.devs);
    set('.bus', 'data-bus', hl && hl.buses);
    set('.comb', 'data-comb', hl && hl.combs);
  };

  /* ---------- однолинейная схема ---------- */
  S.renderSingleLine = function (R) {
    const cfg = R.cfg;
    const three = R.three;
    const CW = 58, LW = 112, X0 = LW + 30;
    const cols = [];
    const forb = R.lines.filter((l) => l.how === 'forbid');
    forb.forEach((l) => cols.push({ l, kind: 'mcb', node: 'A' }));
    R.units.forEach((u) => {
      if (u.type === 'grp') u.lines.forEach((l, i) => cols.push({ l, kind: 'mcb', node: 'B', grp: u, first: i === 0, last: i === u.lines.length - 1 }));
      else if (u.type === 'grp4') cols.push({ l: u.lines[0], kind: 'grp4', node: 'B', u });
      else u.lines.forEach((l) => cols.push({ l, kind: u.type === 'rcbo' ? 'rcbo' : 'mcb', node: 'B' }));
    });
    const nCols = Math.max(cols.length, 1);
    const Wd = X0 + nCols * CW + 30;
    const g = [];
    const inp = R.devices.find((d) => d.role === 'input');
    const meter = R.devices.find((d) => d.role === 'meter');
    const spd = R.devices.find((d) => d.role === 'spd');
    const fire = R.devices.find((d) => d.role === 'fire');
    const rns = R.devices.filter((d) => d.role === 'rn');
    const feedX = X0 - 6;
    let y = 46;
    const sysTxt = { 'TN-C>S': 'TN-C → TN-C-S', 'TN-C-S': 'TN-C-S', 'TN-S': 'TN-S', TT: 'TT', 'TN-C': 'TN-C' }[cfg.earthing];
    g.push(V.tx(12, 18, esc(cfg.name || 'Щит'), { size: 15, wt: 700 }));
    g.push(V.tx(12, 34, `Ввод: ${three ? '3ф 400 В' : '1ф 230 В'} · ${S.fmt(cfg.kw)} кВт · ${sysTxt} · кабель ${R.input.mark} мм²`, { size: 10.5, fam: M, f: 'var(--ink-2)' }));
    const segL = (h) => { g.push(V.ln(feedX, y, feedX, y + h, { w: 1.8 })); y += h; };
    segL(10);
    const lab = (t1, t2) => { g.push(V.tx(feedX + 16, y + 22, t1, { size: 10.5, fam: M, wt: 700 })); if (t2) g.push(V.tx(feedX + 16, y + 35, t2, { size: 9.5, fam: M, f: 'var(--ink-2)' })); };
    const H = 48;
    lab(`${inp.id} ${inp.type === 'sw' ? 'ВН' : ''} ${inp.poles}P ${inp.curve || ''}${inp.In}${inp.type === 'sw' ? ' А' : ''}`, inp.label);
    g.push(inp.type === 'sw' ? V.sym.sw(feedX, y, H) : V.sym.mcb(feedX, y, H)); y += H;
    if (meter) { lab(`${meter.id}`, 'счётчик'); g.push(V.sym.meter(feedX, y, H)); y += H; }
    const yA = y;
    if (spd) {
      g.push(V.ln(feedX, yA + 6, feedX - 46, yA + 6, { w: 1.4 }));
      g.push(V.sym.spd(feedX - 46, yA + 6, 46));
      g.push(V.tx(feedX - 58, yA + 22, `${spd.id}`, { size: 9.5, fam: M, wt: 700, a: 'end' }));
      g.push(V.tx(feedX - 58, yA + 34, spd.cls, { size: 8.5, fam: M, a: 'end', f: 'var(--ink-2)' }));
      g.push(V.ci(feedX, yA + 6, 2.4, { f: 'var(--ink)' }));
    }
    segL(14);
    const yForb = y - 6;
    if (!three) rns.forEach((r) => { lab(`${r.id} РН ${r.In} А`, 'реле напряжения'); g.push(V.sym.rn(feedX, y, H)); y += H; });
    if (fire) { lab(`${fire.id} ${fire.poles}P ${fire.In}/${fire.ma} мА S`, 'УЗО противопожарное'); g.push(V.sym.rcd(feedX, y, H)); y += H; }
    if (three && rns.length) { lab(`${rns.map((r) => r.id).join(', ')} РН ${rns[0].In} А`, 'по одному на фазу'); g.push(V.sym.rn(feedX, y, H)); y += H; }
    segL(10);
    const yB = y;
    // шина A (сигнализация)
    const colX = (i) => X0 + i * CW + CW / 2;
    if (forb.length) {
      const xs = cols.map((c, i) => [c, colX(i)]).filter(([c]) => c.node === 'A').map(([, x]) => x);
      g.push(V.ln(feedX, yForb, Math.max(...xs), yForb, { w: 1.6 }));
      g.push(V.ci(feedX, yForb, 2.4, { f: 'var(--ink)' }));
    }
    const bXs = cols.map((c, i) => [c, colX(i)]).filter(([c]) => c.node === 'B').map(([, x]) => x);
    if (bXs.length) g.push(V.ln(feedX, yB, Math.max(...bXs), yB, { w: 2.4 }));
    // колонки
    const yDev = yB + 14;
    const yTbl = yDev + 140;
    cols.forEach((c, i) => {
      const x = colX(i);
      const l = c.l;
      const top = c.node === 'A' ? yForb : yB;
      if (c.kind === 'mcb' && c.grp) {
        const u = c.grp;
        const rx = colX(cols.findIndex((cc) => cc.grp === u));
        if (c.first) {
          g.push(V.ln(rx, yB, rx, yDev, { w: 1.6 }));
          g.push(V.sym.rcd(rx, yDev, 46));
          g.push(V.tx(rx + 15, yDev + 18, u.rcd.id, { size: 9, fam: M, wt: 700 }));
          g.push(V.tx(rx + 15, yDev + 30, `${u.rcd.In}А ${u.rcd.ma}мА ${u.rcd.rt}`, { size: 8, fam: M, f: 'var(--ink-2)' }));
          const lastX = colX(cols.findIndex((cc) => cc.grp === u) + u.lines.length - 1);
          g.push(V.ln(rx, yDev + 46, rx, yDev + 56, { w: 1.6 }));
          g.push(V.ln(rx, yDev + 56, lastX, yDev + 56, { w: 1.6 }));
        }
        g.push(V.ln(x, yDev + 56, x, yDev + 66, { w: 1.6 }));
        g.push(V.sym.mcb(x, yDev + 66, 44));
        g.push(V.ln(x, yDev + 110, x, yTbl, { w: 1.6 }));
      } else if (c.kind === 'grp4') {
        g.push(V.ln(x, top, x, yDev, { w: 1.6 }));
        g.push(V.sym.rcd(x, yDev, 46));
        g.push(V.tx(x + 15, yDev + 18, c.u.rcd.id, { size: 9, fam: M, wt: 700 }));
        g.push(V.tx(x + 15, yDev + 30, `4P ${c.u.rcd.ma}мА`, { size: 8, fam: M, f: 'var(--ink-2)' }));
        g.push(V.ln(x, yDev + 46, x, yDev + 66, { w: 1.6 }));
        g.push(V.sym.mcb(x, yDev + 66, 44));
        g.push(V.ln(x, yDev + 110, x, yTbl, { w: 1.6 }));
      } else {
        g.push(V.ln(x, top, x, yDev + 66, { w: 1.6 }));
        g.push(c.kind === 'rcbo' ? V.sym.rcbo(x, yDev + 66, 44) : V.sym.mcb(x, yDev + 66, 44));
        g.push(V.ln(x, yDev + 110, x, yTbl, { w: 1.6 }));
      }
      if (l.ph === 3 && three) g.push(V.pa(`M${x - 4} ${yDev + 122} l8 -6 M${x - 4} ${yDev + 127} l8 -6 M${x - 4} ${yDev + 132} l8 -6`, { w: 1 }));
      if (!(c.grp && !c.first)) g.push(V.ci(x, top, 2.2, { f: 'var(--ink)' }));
    });
    // таблица
    const rowsDef = [['Группа', (l) => String(l.num)], ['Аппарат', (l) => l.devId || ''], ['Защита', (l) => l.how === 'rcbo' ? `${l.curve}${l.In} ${l.ma}мА` : (l.ph === 3 && three ? '3P ' : '') + l.curve + l.In], ['Кабель', (l) => `${l.cores}×${sec(l.s)}`], ['Длина, м', (l) => l.len ? String(l.len) : '—'], ['P, кВт', (l) => S.fmt(l.p, 2)], ['I, А', (l) => S.fmt(l.I, 1)], ['Фаза', (l) => l.phase === 'L123' ? 'L1-3' : (three ? l.phase : 'L')], ['ΔU, %', (l) => l.len ? S.fmt(l.du, 1) : '—']];
    const rh = 16;
    rowsDef.forEach((rd, ri) => {
      const yy = yTbl + ri * rh;
      g.push(V.rc(12, yy, LW + 18 + nCols * CW, rh, { s: 'var(--line-2)', f: ri % 2 ? 'var(--surface)' : 'var(--surface-2)', w: 0.6 }));
      g.push(V.tx(18, yy + 11.5, rd[0], { size: 9.5, wt: 600 }));
      cols.forEach((c, i) => g.push(V.tx(colX(i), yy + 11.5, esc(rd[1](c.l)), { a: 'middle', size: 9, fam: M })));
    });
    const yName = yTbl + rowsDef.length * rh;
    const nameH = 150;
    g.push(V.rc(12, yName, LW + 18 + nCols * CW, nameH, { s: 'var(--line-2)', f: 'var(--surface)', w: 0.6 }));
    g.push(V.tx(18, yName + 14, 'Потребитель', { size: 9.5, wt: 600 }));
    cols.forEach((c, i) => {
      const x = colX(i);
      g.push(V.ln(x - CW / 2, yTbl, x - CW / 2, yName + nameH, { s: 'var(--line-2)', w: 0.6 }));
      const words = c.l.name.split(/\s+/);
      const lines = [];
      let cur = '';
      words.forEach((w) => { if ((cur + ' ' + w).trim().length > 24) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; });
      if (cur.trim()) lines.push(cur.trim());
      lines.slice(0, 3).forEach((t, k) => g.push(`<text transform="translate(${x - 8 + k * 11} ${yName + nameH - 6}) rotate(-90)" style="font-size:9.5px;fill:var(--ink)">${esc(t)}</text>`));
    });
    const Hd = yName + nameH + 16;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Wd + LW / 2} ${Hd}" width="${Wd + LW / 2}" height="${Hd}" role="img" aria-label="Однолинейная схема щита" class="sl-svg" style="font-family:var(--font-body);fill:var(--ink)">${g.join('')}</svg>`;
  };

  /* ---------- таблицы и списки ---------- */
  S.renderGroupsTable = (R) => `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>№</th><th>Линия</th><th>Аппарат</th><th>Защита</th><th>Кабель</th><th class="r">P, кВт</th><th class="r">I, А</th><th>Фаза</th></tr></thead><tbody>${R.groupsTable.map((r) => `<tr><td class="num">${r.num}</td><td>${esc(r.name)}${r.notes && r.notes.length ? `<div class="small muted">${r.notes.map(esc).join('; ')}</div>` : ''}</td><td class="mono">${esc(r.dev)}</td><td class="mono">${esc(r.prot)}</td><td class="mono" style="white-space:nowrap">${esc(r.cable)}${r.len ? `, ${r.len} м` : ''}</td><td class="r num">${S.fmt(r.p, 2)}</td><td class="r num">${S.fmt(r.I, 1)}</td><td class="mono">${esc(r.phase)}</td></tr>`).join('')}</tbody></table></div>`;
  S.renderBOM = (R) => `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Наименование</th><th class="r">Кол-во</th></tr></thead><tbody>${R.bom.map((b) => `<tr><td>${esc(b.name)}</td><td class="r num" style="white-space:nowrap">${S.fmt(b.qty, 1)} ${esc(b.unit)}</td></tr>`).join('')}</tbody><caption>Провода и наконечники — ориентировочно, с запасом 20 %. Аппараты одного производителя проще стыкуются гребёнками.</caption></table></div>`;
  S.renderChecks = (R) => `<div class="stack-sm">${R.checks.map((c) => `<div class="check-row ${c.level}">${S.icon(c.level === 'ok' ? 'check' : c.level === 'warn' ? 'alert' : 'x')}<div>${esc(c.text)}${c.ref ? `<span class="ref">${esc(c.ref)}</span>` : ''}</div></div>`).join('')}${(R.notes || []).map((n) => `<div class="check-row warn">${S.icon('info')}<div>${esc(n)}</div></div>`).join('')}</div>`;
  S.renderPhaseBars = (R) => {
    if (!R.three) return '';
    const mx = Math.max(0.1, ...['L1', 'L2', 'L3'].map((p) => R.phaseLoad[p]));
    return `<div class="phase-bars">${['L1', 'L2', 'L3'].map((p) => `<div class="pb"><span>${p}</span><div class="bar"><i style="width:${(R.phaseLoad[p] / mx * 100).toFixed(0)}%;background:${V.wc[p]};box-shadow:0 0 0 1px var(--w-edge)"></i></div><span class="num">${S.fmt(R.phaseLoad[p], 1)} кВт</span></div>`).join('')}</div>`;
  };

  /* ---------- текстовая выгрузка ---------- */
  S.exportText = (R) => {
    const L = [];
    L.push(`ЩИТ: ${R.cfg.name}`);
    L.push(`Ввод: ${R.three ? '3 фазы 400 В' : '1 фаза 230 В'}, ${R.cfg.kw} кВт, система ${R.cfg.earthing}, кабель ${R.input.mark} мм²`);
    L.push(`Корпус: ${R.enclosure.modules} модулей (${R.layout.rails} × ${R.layout.W})`);
    L.push('');
    L.push('АППАРАТЫ:');
    R.devices.forEach((d) => L.push(`  ${d.id}: ${d.label || ''} ${d.type === 'mcb' ? `${d.poles}P ${d.curve}${d.In}` : d.type === 'rcd' ? `${d.poles}P ${d.In}А ${d.ma}мА ${d.rt}${d.sel ? ' S' : ''}` : d.type === 'rcbo' ? `${d.curve}${d.In} ${d.ma}мА ${d.rt}` : d.In ? d.In + ' А' : ''}${d.line ? ' — ' + d.line.name : ''}`));
    L.push('');
    L.push('ГРУППЫ:');
    R.groupsTable.forEach((r) => L.push(`  ${r.num}. ${r.name} | ${r.dev} ${r.prot} | ${r.cable}${r.len ? ', ' + r.len + ' м' : ''} | ${S.fmt(r.p, 2)} кВт | ${S.fmt(r.I, 1)} А | ${r.phase}`));
    L.push('');
    L.push('СБОРКА ПО ШАГАМ:');
    R.steps.forEach((s, i) => L.push(`  ${i + 1}. ${s.title}: ${s.text}`));
    L.push('');
    L.push('ПРОВОДА (клемма → клемма):');
    R.wires.forEach((w) => L.push(`  ${w.text} — ${w.cond}, ${sec(w.mm2)} мм²`));
    L.push('');
    L.push('ПРОВЕРКИ:');
    R.checks.forEach((c) => L.push(`  [${c.level === 'ok' ? 'ок' : c.level === 'warn' ? 'внимание' : 'ошибка'}] ${c.text}${c.ref ? ' (' + c.ref + ')' : ''}`));
    L.push('');
    L.push('МАТЕРИАЛЫ:');
    R.bom.forEach((b) => L.push(`  ${b.name} — ${S.fmt(b.qty, 1)} ${b.unit}`));
    L.push('');
    L.push('Сгенерировано «Школой щитовика». Сверяй клеммы с паспортами своих аппаратов.');
    return L.join('\n');
  };
})();
