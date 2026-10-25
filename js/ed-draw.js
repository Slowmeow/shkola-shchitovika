/* Школа щитовика — отрисовка щита редактора в миллиметрах: корпус, каналы, рейки, аппараты по брендам, шины, гребёнки,
   провода с наконечниками, ввод и кабели линий. Используется и на экране, и на листе для печати. */
(function () {
  'use strict';
  const S = window.SHK;
  const V = S.svg;
  const esc = S.esc;
  const C = () => S.edCore;
  const F = 'font-family:var(--font-body)';
  const t = (x, y, s, size, o = {}) => `<text x="${x}" y="${y}" text-anchor="${o.a || 'middle'}" style="${F};font-size:${size}px;fill:${o.f || '#2b2f2c'};${o.wt ? `font-weight:${o.wt};` : ''}">${esc(s)}</text>`;
  const r = (x, y, w, h, f, s, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx || 0}" style="fill:${f};stroke:${s || 'none'};stroke-width:${o.w || 0.5}"/>`;
  const BODY = { abb: '#eceeec', iek: '#ffffff', ekf: '#ffffff', se: '#ffffff', gen: '#f7f7f5', my: '#ffffff' };

  const ratingText = (d) => {
    if (d.type === 'mcb' || d.type === 'rcbo') return `${d.curve || ''}${d.In || ''}`;
    if (d.type === 'rcd') return `${d.In || ''} А`;
    if (d.type === 'sw') return `${d.In || ''} А`;
    if (d.type === 'rn') return `${d.In || ''} А`;
    if (d.type === 'km') return `${d.In || ''} А`;
    if (d.type === 'spd') return d.cls || 'T2';
    return '';
  };

  /* надписи у клемм: 1/2, 3/4… по полюсам (вход нечётный, выход чётный), N — у нейтрали УЗО и дифавтоматов, L и N у реле напряжения */
  function termLabel(d, T, tm) {
    if (['mcb', 'sw', 'rcd', 'rcbo'].includes(d.type)) {
      const rc = d.type === 'rcd' || d.type === 'rcbo';
      if (rc && /^N/.test(tm.t)) return 'N';
      const ph = (tm.side === 'top' ? T.top : T.bot).filter((x) => !(rc && /^N/.test(x)));
      const i = ph.indexOf(tm.t);
      return i < 0 ? '' : String(tm.side === 'top' ? 2 * i + 1 : 2 * i + 2);
    }
    if (d.type === 'rn') return tm.t === 'N' ? 'N' : tm.t ? 'L' : '';
    if (d.type === 'km' || d.type === 'spd') return tm.t;
    return '';
  }
  function screw(x, y) {
    return `<circle cx="${x}" cy="${y}" r="2.6" style="fill:#cfd4d1;stroke:#5f6662;stroke-width:0.45"/><line x1="${x - 1.7}" y1="${y - 1.1}" x2="${x + 1.7}" y2="${y + 1.1}" style="stroke:#5f6662;stroke-width:0.55"/>`;
  }

  function device(P, d, o) {
    const K = C();
    const g = K.devGeo(d);
    const sel = o.sel && ((o.sel.kind === 'dev' && o.sel.id === d.id) || (o.sel.kind === 'devs' && o.sel.ids.includes(d.id)));
    if (d.type === 'stop') {
      const cy0 = K.railY(d.row);
      let st = r(g.x, cy0 - 24, g.w, 48, '#f2b705', '#7a5d10', { rx: 1, w: 0.5 }) + r(g.x + 1, cy0 - 21, g.w - 2, 42, 'none', '#b88a06', { rx: 0.6, w: 0.3 }) + `<circle cx="${g.x + g.w / 2}" cy="${cy0}" r="${Math.min(3, g.w / 2 - 0.8)}" style="fill:#cfd4d1;stroke:#5f6662;stroke-width:0.4"/>`;
      if (sel) st += r(g.x - 1.2, cy0 - 25.2, g.w + 2.4, 50.4, 'none', 'var(--accent)', { rx: 2, w: 1.1 });
      return `<g data-dev="${esc(d.id)}" style="cursor:${o.interactive ? 'grab' : 'default'}"><title>Ограничитель на DIN-рейку</title>${st}</g>`;
    }
    const s = K.spec(d) || {};
    const brand = (S.edLib.BRANDS[d.brand || s.brand] || {}).name || '';
    const out = [];
    const cx = g.x + g.w / 2, cy = K.railY(d.row);
    out.push(r(g.x, g.y, g.w, g.h, BODY[d.brand || s.brand] || '#fff', '#6f7772', { rx: 1.6, w: 0.6 }));
    out.push(r(g.x + 0.6, g.y + 0.6, g.w - 1.2, 13, '#e6e9e7', null, { rx: 1 }), r(g.x + 0.6, g.y + g.h - 13.6, g.w - 1.2, 13, '#e6e9e7', null, { rx: 1 }));
    const fy = cy - 22.5;
    if (d.type !== 'blank' && d.type !== 'dbus') out.push(r(g.x + 1.2, fy, g.w - 2.4, 45, '#fafbfa', '#b7bdb9', { rx: 1, w: 0.4 }));
    if (K.VIEW(P).stickers) { const rx = Math.min(g.w / 2 - 0.6, 2.2 + d.id.length * 1.15); out.push(`<ellipse cx="${cx}" cy="${fy - 3.3}" rx="${rx}" ry="2.7" style="fill:#ffe94d;stroke:#8a7a00;stroke-width:0.35"/>`, t(cx, fy - 2.1, d.id, 3.1, { wt: 700, f: '#1d1d1d' })); }
    else out.push(t(cx, fy - 2, d.id, 3.4, { wt: 700 }));
    /* маркировка лицевой панели как на аппарате: изготовитель, серия, «C16», отключающая способность в амперах,
       «I» и «O» у рукоятки, каталожный номер (ГОСТ IEC 60898-1, раздел 6) */
    const fam = d.brand || s.brand;
    const small = g.w < 16;
    const brandTxt = fam === 'gen' || fam === 'my' ? '' : g.w < 30 ? ({ se: 'Schneider', sys: 'Systeme' }[fam] || brand) : brand;
    const face = fam === 'gen' ? '' : K.faceOf(d), art = K.artOf(d);
    const fit = (str, n) => (str.length > n ? str.slice(0, n - 1) + '…' : str);
    if (brandTxt && d.type !== 'blank' && d.type !== 'dbus') out.push(t(cx, fy + 3.7, brandTxt, small ? 2.2 : 2.6, { f: '#30363a', wt: 700 }));
    if (face && d.type !== 'blank' && d.type !== 'dbus') out.push(t(cx, fy + 6.6, fit(face, Math.floor(g.w / 1.25)), small ? 1.8 : 2.1, { f: '#4a504c' }));
    const dark = '#33383a';
    if (d.type === 'mcb' || d.type === 'sw' || d.type === 'rcbo' || d.type === 'rcd') {
      const tw = Math.min(g.w - 5, 6 + (d.poles - 1) * 15);
      out.push(t(cx, cy - 10.2, 'I', 2.3, { wt: 700, f: '#30363a' }));
      out.push(r(cx - tw / 2, cy - 9, tw, 15, d.type === 'sw' ? '#7a2d22' : dark, '#1e2224', { rx: 1.6, w: 0.4 }));
      out.push(r(cx - tw / 2 + 1, cy - 8, tw - 2, 5, '#5b6164', null, { rx: 1 }));
      out.push(t(cx, cy + 9.2, 'O', 2.3, { wt: 700, f: '#30363a' }));
      out.push(t(cx, cy + 14.3, ratingText(d), small ? 3.7 : 4.6, { wt: 700 }));
      /* вторая строка: отключающая способность в рамке, класс токоограничения в квадрате, уставка и тип УЗО */
      const items = [];
      if ((d.type === 'mcb' || d.type === 'rcbo') && s.icu) items.push(['box', String(Math.round(s.icu * 1000))]);
      if (d.type === 'mcb' && s.elc) items.push(['box', String(s.elc)]);
      if (d.type === 'rcd' || d.type === 'rcbo') { items.push(['txt', `${d.ma || 30} мА`]); items.push(['box', d.rt || 'AC']); }
      const fs = small ? 1.8 : 2.1, cw = fs * 0.62;
      const wOf = ([k, v]) => v.length * cw + (k === 'box' ? 1.4 : 0);
      let x0 = cx - (items.reduce((a, it) => a + wOf(it), 0) + Math.max(0, items.length - 1) * 0.9) / 2;
      items.forEach((it) => { const w0 = wOf(it); if (it[0] === 'box') out.push(r(x0, cy + 16.3, w0, fs + 1.2, 'none', '#30363a', { w: 0.25 })); out.push(t(x0 + w0 / 2, cy + 16.3 + fs + 0.05, it[1], fs, { f: '#30363a', wt: 700 })); x0 += w0 + 0.9; });
      if (art) out.push(t(cx, cy + 21.6, fit(art, Math.floor(g.w / 0.95)), small ? 1.45 : 1.7, { f: '#4a504c' }));
      if (d.type === 'rcd' || d.type === 'rcbo') out.push(`<circle cx="${g.x + g.w - 4.2}" cy="${cy - 12.6}" r="2.2" style="fill:#e3b341;stroke:#7a5d10;stroke-width:0.4"/>`, t(g.x + g.w - 4.2, cy - 11.6, 'T', 2.3, { wt: 700 }));
    } else if (d.type === 'rn') {
      out.push(r(g.x + 3, cy - 10, g.w - 6, 10, '#17201b', null, { rx: 1 }), t(cx, cy - 2.4, '230', 6.2, { f: '#7CFC9A', wt: 700 }));
      out.push(`<circle cx="${cx - 5}" cy="${cy + 5}" r="1.8" style="fill:#c9ced0"/><circle cx="${cx + 5}" cy="${cy + 5}" r="1.8" style="fill:#c9ced0"/>`, t(cx, cy + 14, ratingText(d), 3.4, { wt: 700 }));
    } else if (d.type === 'spd') {
      const pw = g.w / d.poles;
      for (let i = 0; i < d.poles; i++) { const x = g.x + i * pw; out.push(r(x + 1.6, cy - 12, pw - 3.2, 24, '#eef0ee', '#8a918d', { rx: 1, w: 0.4 }), r(x + pw / 2 - 2.2, cy - 7, 4.4, 4.4, '#3fae5c', null, { rx: 0.6 })); }
      out.push(t(cx, cy + 17.8, ratingText(d), 3));
    } else if (d.type === 'meter') {
      out.push(r(g.x + 4, cy - 14, g.w - 8, 12, '#c9d3c4', '#59625a', { rx: 1, w: 0.4 }), t(cx, cy - 5.6, '00123.4', 5, { f: '#1d241e', wt: 700 }), t(cx, cy + 3, 'kWh', 2.8), `<circle cx="${g.x + g.w - 7}" cy="${cy + 6}" r="1.4" style="fill:#d0312d"/>`);
    } else if (d.type === 'km') {
      out.push(r(cx - 4, cy - 8, 8, 8, '#2f3437', null, { rx: 1 }), t(cx, cy + 8, 'A1–A2', 2.6), t(cx, cy + 14, ratingText(d), 3.4, { wt: 700 }));
    } else if (d.type === 'xt') {
      out.push(r(g.x + 3, cy - 10, g.w - 6, 20, '#e4e7e5', '#8a918d', { rx: 1, w: 0.4 }), t(cx, cy + 1.6, 'XT', 4, { wt: 700 }));
    } else if (d.type === 'dbus') {
      const pe = d.cond === 'PE';
      out.push(r(g.x + 2, cy - 12, g.w - 4, 24, pe ? '#e9f3e6' : '#e6eefb', pe ? '#2f9b4a' : '#2a6cd6', { rx: 1.5, w: 0.6 }));
      if (pe) out.push(`<rect x="${g.x + 2}" y="${cy - 3}" width="${g.w - 4}" height="6" style="fill:var(--w-pe)"/><rect x="${g.x + 2}" y="${cy - 3}" width="${g.w - 4}" height="6" style="fill:none;stroke:var(--w-pey);stroke-width:2;stroke-dasharray:4 4"/>`);
      else out.push(r(g.x + 2, cy - 3, g.w - 4, 6, 'var(--w-n)', null));
      out.push(t(cx, cy + 9.5, pe ? 'PE' : 'N', 4.2, { wt: 700, f: pe ? '#1d5e2c' : '#1c4a94' }));
    } else if (d.type === 'blank') {
      out.push(`<path d="M${g.x + 2} ${cy - 15} l${g.w - 4} 30" style="stroke:#b9bfbb;stroke-width:0.5"/>`);
    }
    /* назначение — полоской под лицевой панелью, как наклейка на щите */
    if (d.label) { out.push(r(g.x + 1.2, cy + 23.4, g.w - 2.4, 4.6, '#fffbe6', '#c9b46a', { rx: 0.6, w: 0.25 }), t(cx, cy + 26.6, fit(String(d.label), Math.max(4, Math.floor(g.w / 1.25))), 2.2, { f: '#3d4340' }), `<title>${esc(d.label)}</title>`); }
    const TN = K.termNames(d);
    K.terms(d).forEach((tm) => { out.push(screw(tm.x, tm.y)); const L = termLabel(d, TN, tm); if (L) out.push(t(tm.x + 3.9, tm.y + 1, L, 2.2, { a: 'start', f: '#4a504c', wt: 700 })); });
    if (sel) out.push(r(g.x - 1.2, g.y - 1.2, g.w + 2.4, g.h + 2.4, 'none', 'var(--accent)', { rx: 2.4, w: 1.1 }));
    return `<g data-dev="${esc(d.id)}" style="cursor:${o.interactive ? 'grab' : 'default'}">${out.join('')}</g>`;
  }

  function enclosure(P) {
    const K = C(), G = K.G, Wd = K.W(P), Hd = K.H(P);
    const out = [r(-6, -6, Wd + 12, Hd + 12, 'var(--enc)', 'var(--enc-line)', { rx: 5, w: 1 }), r(0, 0, Wd, Hd, '#f6f7f5', '#c4cac6', { rx: 2, w: 0.5 })];
    const duct = (x, y, w, h, vert) => {
      let s = r(x, y, w, h, '#e7eae8', '#a9b0ab', { w: 0.4 });
      const n = Math.floor((vert ? h : w) / 9);
      for (let i = 1; i < n; i++) s += vert ? `<line x1="${x}" y1="${y + i * 9}" x2="${x + 2.4}" y2="${y + i * 9}" style="stroke:#a9b0ab;stroke-width:0.4"/><line x1="${x + w - 2.4}" y1="${y + i * 9}" x2="${x + w}" y2="${y + i * 9}" style="stroke:#a9b0ab;stroke-width:0.4"/>` : `<line x1="${x + i * 9}" y1="${y}" x2="${x + i * 9}" y2="${y + 2.4}" style="stroke:#a9b0ab;stroke-width:0.4"/><line x1="${x + i * 9}" y1="${y + h - 2.4}" x2="${x + i * 9}" y2="${y + h}" style="stroke:#a9b0ab;stroke-width:0.4"/>`;
      return s;
    };
    out.push(duct(2, G.BUSZ, G.SD - 4, Hd - 2 * G.BUSZ, true), duct(Wd - G.SD + 2, G.BUSZ, G.SD - 4, Hd - 2 * G.BUSZ, true));
    for (let k = 0; k <= P.rows; k++) out.push(duct(G.SD - 2, K.ductTop(k) + 2, Wd - 2 * G.SD + 4, K.ductH(k) - 4, false));
    for (let i = 0; i < P.rows; i++) {
      const y = K.railY(i);
      out.push(r(G.SD - 6, y - 17.5, Wd - 2 * G.SD + 12, 35, 'var(--rail)', '#8c938e', { w: 0.5 }), r(G.SD - 6, y - 4, Wd - 2 * G.SD + 12, 8, '#9aa19c', null));
      for (let x = G.SD; x < Wd - G.SD; x += 25) out.push(r(x, y - 2.6, 11, 5.2, '#7f8682', null, { rx: 2.6 }));
      out.push(t(G.SD - 9, y + 1.4, String(i + 1), 4, { f: '#7b827e', wt: 700 }));
      const freeM = P.mods - P.devs.filter((d) => d.row === i).reduce((s, d) => s + d.w, 0);
      out.push(t(Wd - G.SD - 1, K.rowTop(i) - 2.2, freeM > 0 ? `свободно ${String(freeM).replace('.', ',')} мод.` : 'рейка заполнена', 3, { a: 'end', f: freeM > 0 ? '#6f7772' : '#b0442c' }));
      for (let m = 0; m <= P.mods; m++) out.push(`<line x1="${G.SD + m * G.MOD}" y1="${K.rowTop(i) - 0.5}" x2="${G.SD + m * G.MOD}" y2="${K.rowTop(i) + 2.5}" style="stroke:#9aa19c;stroke-width:0.35"/>`);
    }
    return out.join('');
  }

  function bus(P, b, o) {
    const K = C(), g = K.busGeo(P, b);
    const isPE = b.kind === 'PE';
    const out = [r(g.x, g.y - g.h / 2, g.w, g.h, isPE ? '#c7a43a' : '#c99a5a', '#6e5a2a', { rx: 1, w: 0.5 })];
    if (isPE) out.push(`<rect x="${g.x}" y="${g.y - g.h / 2}" width="${g.w}" height="${g.h}" style="fill:none;stroke:var(--w-pe);stroke-width:1.2;stroke-dasharray:4 4"/>`);
    else out.push(r(g.x - 2.5, g.y - g.h / 2 - 1.5, 3, g.h + 3, '#2a6cd6', null, { rx: 0.8 }), r(g.x + g.w - 0.5, g.y - g.h / 2 - 1.5, 3, g.h + 3, '#2a6cd6', null, { rx: 0.8 }));
    for (let k = 0; k < b.n; k++) { const p = K.busSlot(P, b, k); out.push(screw(p.x, p.y)); }
    out.push(t(g.x, b.zone === 'top' ? g.y - g.h / 2 - 2.2 : g.y + g.h / 2 + 4.6, b.id + (isPE ? ' — защитная' : ' — нулевая'), 3, { a: 'start', wt: 700, f: '#2b2f2c' }));
    if (o.sel && o.sel.kind === 'bus' && o.sel.id === b.id) out.push(r(g.x - 2, g.y - g.h / 2 - 2, g.w + 4, g.h + 4, 'none', 'var(--accent)', { rx: 2, w: 1 }));
    return `<g data-bus="${esc(b.id)}" style="cursor:${o.interactive ? 'grab' : 'default'}">${out.join('')}</g>`;
  }

  function comb(P, c) {
    const K = C();
    const ds = c.devs.map((id) => P.devs.find((d) => d.id === id)).filter(Boolean);
    if (!ds.length) return '';
    const keys = new Set(K.combGroups(P, c).reduce((a, b) => a.concat(b), []));
    const ts = ds.map((d) => K.terms(d).filter((x) => x.side === 'top' && keys.has(`d:${d.id}:${x.t}`))).reduce((a, b) => a.concat(b), []);
    if (!ts.length) return '';
    const x1 = Math.min(...ts.map((x) => x.x)) - 3, x2 = Math.max(...ts.map((x) => x.x)) + 3, y = ts[0].y - 6.5;
    return `<g data-comb="${esc(c.id)}">${r(x1, y - 2.4, x2 - x1, 4.8, '#9b6b2c', '#5e3f15', { rx: 1, w: 0.4 })}${ts.map((x) => r(x.x - 1.1, y + 1.6, 2.2, 4, '#b07a35', null)).join('')}</g>`;
  }

  const widthOf = (mm2) => ({ 0.75: 1.1, 1: 1.2, 1.5: 1.35, 2.5: 1.6, 4: 1.9, 6: 2.2, 10: 2.7, 16: 3.1, 25: 3.6, 35: 4 }[mm2] || 1.6);
  const f2 = (v) => Math.round(v * 100) / 100;
  const pathD = (pts) => {
    if (pts.length < 2) return '';
    let d = `M${f2(pts[0][0])} ${f2(pts[0][1])}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const r1 = Math.min(pts.round || 3, Math.hypot(x1 - x0, y1 - y0) / 2, Math.hypot(x2 - x1, y2 - y1) / 2);
      const ax = x1 - Math.sign(x1 - x0) * r1, ay = y1 - Math.sign(y1 - y0) * r1;
      const bx = x1 + Math.sign(x2 - x1) * r1, by = y1 + Math.sign(y2 - y1) * r1;
      d += ` L${f2(ax)} ${f2(ay)} Q${f2(x1)} ${f2(y1)} ${f2(bx)} ${f2(by)}`;
    }
    const l = pts[pts.length - 1];
    return d + ` L${f2(l[0])} ${f2(l[1])}`;
  };

  /* точка на ломаной на расстоянии dist от начала и направление в ней */
  function along(pts, dist) {
    let left = dist;
    for (let k = 1; k < pts.length; k++) {
      const [x0, y0] = pts[k - 1], [x1, y1] = pts[k];
      const L = Math.hypot(x1 - x0, y1 - y0);
      if (L >= left || k === pts.length - 1) { const f = L ? Math.min(1, left / L) : 0; return { x: x0 + (x1 - x0) * f, y: y0 + (y1 - y0) * f, dx: L ? (x1 - x0) / L : 0, dy: L ? (y1 - y0) / L : 1 }; }
      left -= L;
    }
    return { x: pts[0][0], y: pts[0][1], dx: 0, dy: 1 };
  }
  /* цвет кольца по цифре: 0 чёрный, 1 коричневый, 2 красный, 3 оранжевый, 4 жёлтый, 5 зелёный, 6 синий, 7 фиолетовый, 8 серый, 9 белый */
  const DIG = ['#1d1d1d', '#8a5426', '#d0312d', '#f08a1c', '#f2d21b', '#2f9b4a', '#2a6cd6', '#8a4fc4', '#9aa0a6', '#f4f4f4'];
  const DIG_INK = ['#fff', '#fff', '#fff', '#1d1d1d', '#1d1d1d', '#fff', '#fff', '#fff', '#1d1d1d', '#1d1d1d'];
  function markers(P, pts, num, colored) {
    const digits = String(num).split('');
    const total = pathLenOf(pts);
    let s = '';
    [pts, pts.slice().reverse()].forEach((line) => {
      digits.forEach((ch, i) => {
        const a = along(line, Math.min(total / 2, 9 + i * 3.9 + 1.9));
        const vert = Math.abs(a.dy) >= Math.abs(a.dx);
        const wR = vert ? 4.4 : 3.7, hR = vert ? 3.7 : 4.4;
        const n = Number(ch);
        const fill = colored && !isNaN(n) ? DIG[n] : '#fff', ink = colored && !isNaN(n) ? DIG_INK[n] : '#1d1d1d';
        s += `<rect x="${f2(a.x - wR / 2)}" y="${f2(a.y - hR / 2)}" width="${wR}" height="${hR}" rx="0.7" style="fill:${fill};stroke:rgba(0,0,0,.55);stroke-width:0.3"/><text x="${f2(a.x)}" y="${f2(a.y + 1.15)}" text-anchor="middle" style="${F};font-size:3.2px;font-weight:700;fill:${ink}">${esc(ch)}</text>`;
      });
    });
    return s;
  }
  const pathLenOf = (pts) => pts.reduce((a, q, k) => (k ? a + Math.hypot(q[0] - pts[k - 1][0], q[1] - pts[k - 1][1]) : 0), 0);
  function wire(P, w, i, o) {
    const K = C();
    const pts = K.route(P, w, i);
    if (!pts) return '';
    const own = w.color && K.WCOL[w.color];
    const col = own ? own[1] : K.COND_COL[w.cond] || '#5d6360';
    const sw = widthOf(w.mm2);
    const d = pts.bez ? `M${f2(pts.bez[0][0])} ${f2(pts.bez[0][1])} C${pts.bez.slice(1).map((q) => `${f2(q[0])} ${f2(q[1])}`).join(' ')}` : pathD(pts);
    const isPE = w.color ? w.color === 'yg' : w.cond === 'PE' || w.cond === 'PEN';
    const sel = o.sel && o.sel.kind === 'wire' && o.sel.id === w.id;
    let s = '';
    /* при перетаскивании — только цветная линия, без тени, полосы PE и наконечников */
    if (o.fast) return `<g data-wire="${esc(w.id)}"><path d="${d}" style="fill:none;stroke:${col};stroke-width:${sw};stroke-linejoin:round"/></g>`;
    if (sel) s += `<path d="${d}" style="fill:none;stroke:var(--accent);stroke-width:${sw + 2.2};opacity:.45;stroke-linejoin:round"/>`;
    s += `<path d="${d}" style="fill:none;stroke:rgba(0,0,0,.35);stroke-width:${sw + 0.6};stroke-linejoin:round"/><path d="${d}" style="fill:none;stroke:${col};stroke-width:${sw};stroke-linejoin:round"/>`;
    if (isPE) s += `<path d="${d}" style="fill:none;stroke:var(--w-pey);stroke-width:${sw * 0.55};stroke-dasharray:3 3;stroke-linejoin:round"/>`;
    if (w.cond === 'PEN' && !w.color) s += `<path d="${d}" style="fill:none;stroke:var(--w-n);stroke-width:${sw * 0.3};stroke-dasharray:0.8 9"/>`;
    const fer = K.FERRULE[w.mm2] || '#2a6cd6';
    if (K.VIEW(P).ferrules) [[pts[0], pts[1], w.a], [pts[pts.length - 1], pts[pts.length - 2], w.b]].forEach(([p, q, e]) => {
      if (!e.dev && !e.bus) return;
      const dy = Math.sign(q[1] - p[1]) || 1;
      s += `<rect x="${f2(p[0] - sw / 2 - 0.5)}" y="${f2(dy > 0 ? p[1] + 2.4 : p[1] - 7.4)}" width="${sw + 1}" height="5" rx="0.6" style="fill:${fer};stroke:rgba(0,0,0,.4);stroke-width:0.3"/>`;
    });
    const wn = K.WN(P);
    if (wn.show && w.num !== '' && w.num != null) s += markers(P, pts, w.num, wn.color);
    if (o.interactive && !o.fast && (pts.bez || pts.length === 2 && K.styleOf(P, w) === 'line')) {
      s += `<path d="${d}" data-seg="c" data-wire="${esc(w.id)}" style="fill:none;stroke:transparent;stroke-width:${sw + 4};cursor:pointer"/>`;
    } else if (o.interactive && !o.fast) {
      for (let k = 1; k < pts.length; k++) {
        const [x0, y0] = pts[k - 1], [x1, y1] = pts[k];
        const hz = Math.abs(y1 - y0) < 0.01;
        s += `<line x1="${f2(x0)}" y1="${f2(y0)}" x2="${f2(x1)}" y2="${f2(y1)}" data-seg="${hz ? 'h' : 'v'}" data-wire="${esc(w.id)}" style="stroke:transparent;stroke-width:${sw + 4};cursor:${hz ? 'ns-resize' : 'ew-resize'}"/>`;
      }
    }
    return `<g data-wire="${esc(w.id)}">${s}</g>`;
  }

  /* размерные линии: длина реек, шаг между осями реек, высота корпуса */
  function dims(P) {
    const K = C(), G = K.G, Wd = K.W(P), Hd = K.H(P);
    const ink = 'var(--fg, #2b2f2c)';
    const line = (x1, y1, x2, y2) => `<line x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}" style="stroke:${ink};stroke-width:0.35"/>`;
    const tick = (x, y) => `<line x1="${f2(x - 1.5)}" y1="${f2(y + 1.5)}" x2="${f2(x + 1.5)}" y2="${f2(y - 1.5)}" style="stroke:${ink};stroke-width:0.5"/>`;
    const vtext = (x, y, s2) => `<text transform="translate(${f2(x)} ${f2(y)}) rotate(-90)" text-anchor="middle" style="${F};font-size:3.4px;fill:${ink}">${esc(s2)}</text>`;
    let s = '';
    const x0 = G.SD, x1 = Wd - G.SD, yT = -9;
    s += line(x0, yT, x1, yT) + tick(x0, yT) + tick(x1, yT) + line(x0, yT - 2, x0, 1) + line(x1, yT - 2, x1, 1);
    s += t((x0 + x1) / 2, yT - 1.4, `рейка ${S.fmt(P.mods * G.MOD, 1)} мм (${P.mods} мод.)`, 3.4, { f: ink });
    const xr = Wd + 9;
    for (let k = 0; k + 1 < P.rows; k++) {
      const ya = K.railY(k), yb = K.railY(k + 1);
      s += line(xr, ya, xr, yb) + tick(xr, ya) + tick(xr, yb) + line(Wd + 1, ya, xr + 2, ya) + line(Wd + 1, yb, xr + 2, yb) + vtext(xr - 1.6, (ya + yb) / 2, `${S.fmt(K.pitchOf(P, k), 0)}`);
    }
    const xh = Wd + 19;
    s += line(xh, 0, xh, Hd) + tick(xh, 0) + tick(xh, Hd) + line(Wd + 1, 0, xh + 2, 0) + line(Wd + 1, Hd, xh + 2, Hd) + vtext(xh - 1.6, Hd / 2, `${Math.round(Hd)} мм`);
    return s;
  }

  function feed(P, o = {}) {
    const K = C();
    const cs = K.feedCores(P);
    const x0 = 6 + (cs.length - 1) * 2.25;
    let s = `<path d="M${x0} -40 L${x0} -20" style="stroke:#3c4240;stroke-width:${cs.length * 4.5 + 3};stroke-linecap:round"/>`;
    cs.forEach((c) => { const p = K.feedPt(P, c); s += `<path d="M${x0} -20 L${p.x} ${p.y}" style="stroke:${K.COND_COL[c]};stroke-width:2.2"/><circle cx="${p.x}" cy="${p.y}" r="1.8" data-feed="${c}" style="fill:${K.COND_COL[c]};stroke:#1c1f1d;stroke-width:0.4;cursor:crosshair"/>${o.interactive ? `<rect x="${p.x - 2.2}" y="${p.y - 4}" width="4.4" height="8" data-feed="${c}" style="fill:transparent;cursor:crosshair"><title>Ввод ${c}</title></rect>` : ''}`; });
    s += t(x0 + cs.length * 3 + 8, -30, `Ввод ${P.feed.phases === 3 ? '3ф' : '1ф'}: ${cs.join(', ')}`, 4, { a: 'start', wt: 700, f: 'var(--fg, #2b2f2c)' });
    return s;
  }

  function lines(P, o) {
    const K = C();
    return P.lines.map((l) => {
      const cs = K.lineCores(P, l), gx = K.glandX(P, l), y = K.H(P);
      let s = `<path d="M${gx} ${y + 18} L${gx} ${y + 46}" style="stroke:#3c4240;stroke-width:${cs.length * 3.2 + 2};stroke-linecap:round"/>`;
      cs.forEach((c) => { const p = K.linePt(P, l, c); s += `<circle cx="${p.x}" cy="${p.y}" r="1.5" data-line="${esc(l.id)}" data-core="${c}" style="fill:${K.COND_COL[c]};stroke:#1c1f1d;stroke-width:0.4;cursor:crosshair"/>${o.interactive ? `<rect x="${p.x - 1.6}" y="${p.y - 4.5}" width="3.2" height="9" data-line="${esc(l.id)}" data-core="${c}" style="fill:transparent;cursor:crosshair"><title>Линия ${esc(String(l.num))} · ${c}</title></rect>` : ''}`; });
      s += `<text transform="translate(${gx + 2.4} ${y + 52}) rotate(90)" style="${F};font-size:3.6px;fill:var(--fg, #2b2f2c);font-weight:700">${esc(`${l.num}. ${l.name}`.slice(0, 30))}</text>`;
      const sel = o.sel && o.sel.kind === 'line' && o.sel.id === l.id;
      if (sel) s += r(gx - 7, y + 10, 14, 44, 'none', 'var(--accent)', { rx: 2, w: 1 });
      return `<g data-lineg="${esc(l.id)}">${s}</g>`;
    }).join('');
  }

  function terminalsHit(P, o) {
    if (!o.interactive || o.fast) return '';
    const K = C();
    let s = '';
    P.devs.forEach((d) => K.terms(d).forEach((tm) => {
      const on = o.wireStart && o.wireStart.dev === d.id && o.wireStart.term === tm.t;
      s += `<circle cx="${tm.x}" cy="${tm.y}" r="3.4" data-tdev="${esc(d.id)}" data-tpin="${esc(tm.t)}" style="fill:${on ? 'var(--accent)' : 'transparent'};fill-opacity:.5;stroke:${o.tool === 'wire' ? 'var(--accent)' : 'transparent'};stroke-width:0.5;cursor:crosshair"><title>${esc(d.id)} · ${esc(tm.t)}</title></circle>`;
    }));
    P.buses.forEach((b) => { for (let k = 0; k < b.n; k++) { const p = K.busSlot(P, b, k); s += `<circle cx="${p.x}" cy="${p.y}" r="3.2" data-tbus="${esc(b.id)}" data-slot="${k}" style="fill:transparent;stroke:${o.tool === 'wire' ? 'var(--accent)' : 'transparent'};stroke-width:0.5;cursor:crosshair"/>`; } });
    return s;
  }

  /* выноски: рамка с текстом и линия к точке на щите */
  const wrapText = (str, n) => { const out = []; String(str).split(/\n/).forEach((para) => { let cur = ''; para.split(/\s+/).forEach((w) => { if ((cur + ' ' + w).trim().length > n && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }); out.push(cur); }); return out; };
  function notes(P, o) {
    return (P.notes || []).map((n) => {
      const lines = wrapText(n.text || '', 30).slice(0, 6);
      const w = Math.max(22, Math.max(...lines.map((l) => l.length)) * 1.78 + 4), h = lines.length * 4.4 + 3.4;
      const sel = o.sel && o.sel.kind === 'note' && o.sel.id === n.id;
      const bx = Math.max(n.x, Math.min(n.ax, n.x + w)), by = Math.max(n.y, Math.min(n.ay, n.y + h));
      let s2 = `<line x1="${f2(bx)}" y1="${f2(by)}" x2="${f2(n.ax)}" y2="${f2(n.ay)}" style="stroke:#c0392b;stroke-width:0.5"/><circle cx="${f2(n.ax)}" cy="${f2(n.ay)}" r="1.3" style="fill:#c0392b"/>`;
      if (o.interactive) s2 += `<circle cx="${f2(n.ax)}" cy="${f2(n.ay)}" r="3.2" data-nanchor="${esc(n.id)}" style="fill:transparent;cursor:move"><title>Потяни, чтобы показать на другое место</title></circle>`;
      s2 += `<g data-note="${esc(n.id)}" style="cursor:${o.interactive ? 'move' : 'default'}"><rect x="${f2(n.x)}" y="${f2(n.y)}" width="${f2(w)}" height="${f2(h)}" rx="1" style="fill:#fff8c4;stroke:${sel ? 'var(--accent)' : '#b08d00'};stroke-width:${sel ? 0.9 : 0.4}"/>${lines.map((l, i) => `<text x="${f2(n.x + 2)}" y="${f2(n.y + 4.6 + i * 4.4)}" style="${F};font-size:3.3px;fill:#2b2f2c">${esc(l)}</text>`).join('')}</g>`;
      return s2;
    }).join('');
  }

  /* слой поверх щита: место под аппарат, место под шину, рамка выделения, тянущийся провод */
  function overlay(P, o) {
    const K = C();
    const Hd = K.H(P);
    const body = [];
    if (o.ghost) {
      const gh = o.ghost, x = K.G.SD + gh.x * K.G.MOD, y = K.railY(gh.row) - 44;
      body.push(r(x - 0.6, y, gh.w * K.G.MOD + 1.2, 88, gh.ok ? 'rgba(31,136,61,.14)' : 'rgba(209,36,47,.16)', gh.ok ? 'var(--success)' : 'var(--danger)', { rx: 2, w: 1 }));
      if (gh.ok && gh.snap) body.push(`<line x1="${x}" y1="${y - 4}" x2="${x}" y2="${y + 92}" style="stroke:var(--success);stroke-width:0.8;stroke-dasharray:2 2"/>`);
    }
    if (o.busGhost) { const bg = o.busGhost; body.push(r(K.G.SD + bg.x - 1, (bg.zone === 'top' ? K.G.BUSZ / 2 : Hd - K.G.BUSZ / 2) - 6.5, bg.w + 2, 13, bg.ok ? 'rgba(31,136,61,.14)' : 'rgba(209,36,47,.16)', bg.ok ? 'var(--success)' : 'var(--danger)', { rx: 2, w: 0.8 })); }
    if (o.ruler) {
      const q = o.ruler, L = Math.hypot(q.x2 - q.x1, q.y2 - q.y1), mx = (q.x1 + q.x2) / 2, my = (q.y1 + q.y2) / 2, lab = `${S.fmt(L, 1)} мм`;
      body.push(`<line x1="${f2(q.x1)}" y1="${f2(q.y1)}" x2="${f2(q.x2)}" y2="${f2(q.y2)}" style="stroke:#c0392b;stroke-width:0.7;pointer-events:none"/><circle cx="${f2(q.x1)}" cy="${f2(q.y1)}" r="1.2" style="fill:#c0392b"/><circle cx="${f2(q.x2)}" cy="${f2(q.y2)}" r="1.2" style="fill:#c0392b"/><rect x="${f2(mx - lab.length * 1.05 - 1.5)}" y="${f2(my - 7.5)}" width="${f2(lab.length * 2.1 + 3)}" height="6" rx="1" style="fill:#fff;stroke:#c0392b;stroke-width:0.4;pointer-events:none"/><text x="${f2(mx)}" y="${f2(my - 3.2)}" text-anchor="middle" style="${F};font-size:3.6px;font-weight:700;fill:#c0392b;pointer-events:none">${esc(lab)}</text>`);
    }
    if (o.band) { const b = o.band; body.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" style="fill:var(--accent);fill-opacity:.08;stroke:var(--accent);stroke-width:0.8;stroke-dasharray:3 2;pointer-events:none"/>`); }
    if (o.preview) { const p = o.preview; body.push(`<line x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}" style="stroke:${p.ok === false ? 'var(--danger)' : p.ok ? 'var(--success)' : 'var(--accent)'};stroke-width:1.2;stroke-dasharray:3 2;pointer-events:none"/><circle cx="${p.x1}" cy="${p.y1}" r="3.2" style="fill:var(--accent);fill-opacity:.35;stroke:var(--accent);stroke-width:0.8;pointer-events:none"/>`); }
    return body.join('');
  }

  /* весь щит; o: { sel, interactive, tool, wireStart, ghost } */
  S.edDraw = function (P, o = {}) {
    const K = C();
    K.sync(P);
    const Wd = K.W(P), Hd = K.H(P);
    const dm = K.VIEW(P).dims;
    const vb = [-14, -48, Wd + 28 + (dm ? 26 : 0), Hd + 48 + (P.lines.length ? 128 : 30)];
    const body = [enclosure(P), P.buses.map((b) => bus(P, b, o)).join(''), P.devs.map((d) => device(P, d, o)).join(''), P.combs.map((c) => comb(P, c)).join(''), feed(P, o), lines(P, o), P.wires.map((w, i) => wire(P, w, i, o)).join(''), terminalsHit(P, o)];
    /* ручки на концах выделенного провода: потяни, чтобы перекинуть конец на другую клемму */
    if (o.interactive && !o.fast && o.sel && o.sel.kind === 'wire') {
      const i = P.wires.findIndex((w) => w.id === o.sel.id);
      const pts = i >= 0 && K.route(P, P.wires[i], i);
      if (pts) [['a', pts[0]], ['b', pts[pts.length - 1]]].forEach(([k, q]) => body.push(`<circle cx="${q[0]}" cy="${q[1]}" r="2.6" data-wend="${k}" data-wire="${esc(o.sel.id)}" style="fill:var(--bg, #fff);stroke:var(--accent);stroke-width:1;cursor:move"><title>Потяни конец провода на другую клемму</title></circle>`));
    }
    if (dm) body.push(dims(P));
    body.push(notes(P, o));
    body.push(`<g data-overlay>${overlay(P, o)}</g>`);
    return { vb, svg: body.join('') };
  };
  S.edDraw.pathD = pathD;
  S.edDraw.overlay = overlay;
  S.edDraw.wire = wire;
  S.edDraw.device = device;
})();
