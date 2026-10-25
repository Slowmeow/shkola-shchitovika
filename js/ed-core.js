/* Школа щитовика — ядро редактора щита: модель, геометрия в миллиметрах, клеммы, цепи, трассировка проводов по каналам,
   вставка аппаратов с раздвижкой и прилипанием, автоподключение линий, проверки, импорт из конструктора, спецификация.
   Отрисовка — S.edDraw, интерфейс — js/editor.js. */
(function () {
  'use strict';
  const S = window.SHK;

  /* ---------- размеры, мм ---------- */
  const G = { MOD: 17.5, ZONE: 92, DUCT: 42, SD: 34, BUSZ: 28, LANES: 11 };
  const PITCHES = [125, 134, 150, 175]; // расстояние между осями реек, мм
  const PRESETS = [[1, 12], [2, 12], [3, 12], [4, 12], [2, 18], [3, 18], [4, 18], [3, 24], [4, 24], [5, 24], [6, 24]];
  const PREFIX = { stop: 'ZS', mcb: 'QF', sw: 'QS', rcd: 'QD', rcbo: 'QFD', rn: 'KV', spd: 'FV', meter: 'PI', xt: 'XT', km: 'KM', blank: 'Z', dbus: 'XS' };
  const COND_COL = { L: 'var(--w-l1)', L1: 'var(--w-l1)', L2: 'var(--w-l2)', L3: 'var(--w-l3)', N: 'var(--w-n)', PE: 'var(--w-pe)', PEN: 'var(--w-pe)' };
  /* цвета наконечников НШВИ по сечению — DIN 46228-4 */
  const FERRULE = { 0.5: '#f4f4f4', 0.75: '#9aa0a6', 1: '#d0312d', 1.5: '#1b1b1b', 2.5: '#2a6cd6', 4: '#9aa0a6', 6: '#e2be14', 10: '#d0312d', 16: '#2a6cd6', 25: '#e2be14', 35: '#d0312d' };
  const SECTIONS = [0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35];
  const EPS = 1e-6;

  const blank = (rows, mods) => ({
    v: 1, name: 'Новый щит', rows: rows || 2, mods: mods || 12, pitch: 134,
    feed: { phases: 1, earthing: 'TN-C-S' },
    devs: [], buses: [{ id: 'N1', kind: 'N', zone: 'top', x: 6, n: 10 }, { id: 'PE', kind: 'PE', zone: 'bottom', x: 6, n: 12 }],
    wires: [], combs: [], lines: [],
    wireStyle: 'duct', slack: 20, wn: { show: true, color: true, start: 1, auto: true }, view: { ferrules: true, stickers: false, dims: false },
    meta: { object: '', author: '', checker: '', org: '', code: '', stage: 'Р', sheet: 1, sheets: 1, date: '' }
  });

  /* ---------- геометрия ---------- */
  /* каналы: k — над рейкой k, rows — под последней. Верхний и нижний — по общему шагу P.pitch,
     канал между рейками k-1 и k — по своему шагу P.pitches[k-1] (расстояние между осями реек), если он задан */
  const sync = (P) => {
    const base = Math.max(30, (P && P.pitch ? P.pitch : 134) - G.ZONE);
    G.DUCT = base;
    const n = P && P.rows ? P.rows : 0;
    G.dH = []; G.dT = [];
    let y = G.BUSZ;
    for (let k = 0; k <= n; k++) {
      const pk = k > 0 && k < n && P.pitches && P.pitches[k - 1];
      const h = pk ? Math.max(30, pk - G.ZONE) : base;
      G.dT.push(y); G.dH.push(h);
      y += h + (k < n ? G.ZONE : 0);
    }
  };
  const ductH = (k) => (G.dH && G.dH[k] != null ? G.dH[k] : G.DUCT);
  const ductTop = (k) => (G.dT && G.dT[k] != null ? G.dT[k] : G.BUSZ + k * (G.ZONE + G.DUCT));
  const W = (P) => P.mods * G.MOD + 2 * G.SD;
  const H = (P) => { sync(P); return ductTop(P.rows) + ductH(P.rows) + G.BUSZ; };
  const rowTop = (i) => ductTop(i) + ductH(i);
  const railY = (i) => rowTop(i) + G.ZONE / 2;
  /* шаг между осями реек k и k+1 */
  const pitchOf = (P, k) => (P.pitches && P.pitches[k]) || P.pitch || 134;
  const lib = () => S.edLib;
  const spec = (d) => (lib() && lib().byId(d.sid)) || null;
  /* артикул: свой у аппарата, иначе по шаблону каталога серии */
  const artOf = (d) => { if (d.art) return d.art; const s = spec(d); if (!s || !s.art) return ''; return typeof s.art === 'function' ? s.art(d) : String(s.art); };
  const faceOf = (d) => { const s = spec(d); if (!s) return ''; const f = s.face || s.series || ''; return typeof f === 'function' ? f(d) : f; };
  const devH = (d) => (spec(d) && spec(d).h) || 85;
  const devGeo = (d) => { const h = devH(d); return { x: G.SD + d.x * G.MOD + 0.25, y: railY(d.row) - h / 2, w: d.w * G.MOD - 0.5, h }; };

  const termNames = (d) => {
    if (d.type === 'km') { const p = d.poles; const t = ['1', '3', '5', '7'].slice(0, p), b = ['2', '4', '6', '8'].slice(0, p); return { top: t.concat(['A1']), bot: b.concat(['A2']) }; }
    if (d.type === 'blank') return { top: [], bot: [] };
    if (d.type === 'dbus') { const n = Math.max(2, Math.round(d.w * 2)); const c = d.cond || 'N'; return { top: [...Array(n).keys()].map((i) => `${c}${i + 1}`), bot: [...Array(n).keys()].map((i) => `${c}${n + i + 1}`) }; }
    return S.engine ? S.engine.TERMS(d) : { top: [], bot: [] };
  };
  const terms = (d) => {
    const g = devGeo(d), T = termNames(d), out = [];
    const put = (arr, side) => arr.forEach((t, i) => { if (!t) return; out.push({ t, side, x: g.x + g.w * (i + 0.5) / arr.length, y: side === 'top' ? g.y + 7 : g.y + g.h - 7 }); });
    put(T.top, 'top'); put(T.bot, 'bot');
    return out;
  };
  /* шины на корпусе: в верхней или нижней зоне; шаг винтов 8 мм */
  const busW = (b) => 20 + (b.n - 1) * 8;
  const busGeo = (P, b) => { const y = b.zone === 'top' ? G.BUSZ / 2 : H(P) - G.BUSZ / 2; const x = G.SD + b.x; return { x, y, w: busW(b), h: 9 }; };
  const busSlot = (P, b, k) => { const g = busGeo(P, b); return { x: g.x + 10 + k * 8, y: g.y }; };
  const busMaxX = (P, b) => W(P) - 2 * G.SD - busW(b);
  const feedCores = (P) => {
    const ph = P.feed.phases === 3 ? ['L1', 'L2', 'L3'] : ['L'];
    if (P.feed.earthing === 'TN-C>S' || P.feed.earthing === 'TN-C') return ph.concat(['PEN']);
    return ph.concat(['N', 'PE']);
  };
  const feedPt = (P, c) => { const i = feedCores(P).indexOf(c); return { x: 6 + i * 4.5, y: -14 }; };
  const lineCores = (P, l) => l.cores || (P.feed.phases === 3 && l.ph === 3 ? ['L1', 'L2', 'L3', 'N', 'PE'] : ['L', 'N', 'PE']);
  const glandX = (P, l) => G.SD + 8 + P.lines.indexOf(l) * 15;
  const linePt = (P, l, core) => { const cs = lineCores(P, l); return { x: glandX(P, l) - (cs.length - 1) * 1.6 + cs.indexOf(core) * 3.2, y: H(P) + 16 }; };

  /* координаты конца провода и канал, в который он выходит */
  function endInfo(P, e) {
    sync(P);
    if (e.dev) {
      const d = P.devs.find((x) => x.id === e.dev);
      if (!d) return null;
      const t = terms(d).find((x) => x.t === e.term);
      if (!t) return null;
      return { x: t.x, y: t.y, duct: t.side === 'top' ? d.row : d.row + 1 };
    }
    if (e.bus) {
      const b = P.buses.find((x) => x.id === e.bus);
      if (!b) return null;
      const p = busSlot(P, b, Math.min(e.slot || 0, b.n - 1));
      return { x: p.x, y: p.y, duct: b.zone === 'top' ? 0 : P.rows };
    }
    if (e.feed) { const p = feedPt(P, e.feed); return { x: p.x, y: p.y, side: 'feed' }; }
    if (e.line) {
      const l = P.lines.find((x) => x.id === e.line);
      if (!l) return null;
      const p = linePt(P, l, e.core);
      return { x: p.x, y: p.y, duct: P.rows, gland: true };
    }
    return null;
  }
  const laneY = (k, lane, dy) => { const h = ductH(k), sp = (h - 8) / G.LANES; return Math.max(ductTop(k) + 3, Math.min(ductTop(k) + h - 3, ductTop(k) + 4 + (lane % G.LANES + 0.5) * sp + (dy || 0))); };

  /* трасса: вертикально в канал, по каналу, при смене канала — через боковой канал */
  /* как проложен провод: по кабель-каналам, петлёй напрямую (как в небольших щитках) или прямой линией */
  const styleOf = (P, w) => w.style || P.wireStyle || 'duct';
  /* куда провод уходит от конца: вниз (+1) с нижних клемм, верхней шины и ввода; вверх (−1) с верхних клемм, нижней шины и кабелей линий */
  function exitDir(P, e) {
    if (e.dev) { const d = P.devs.find((x) => x.id === e.dev); const t = d && terms(d).find((x) => x.t === e.term); return t && t.side === 'top' ? -1 : 1; }
    if (e.bus) { const b = P.buses.find((x) => x.id === e.bus); return b && b.zone === 'top' ? 1 : -1; }
    return e.feed ? 1 : -1;
  }
  function route(P, w, idx) {
    const a = endInfo(P, w.a), b = endInfo(P, w.b);
    if (!a || !b) return null;
    const st = styleOf(P, w);
    if (st === 'line') return [[a.x, a.y], [b.x, b.y]];
    /* петля напрямую — только в одном промежутке между рейками; с рейки на рейку провод обходит аппараты сбоку */
    const dA = a.side === 'feed' ? 0 : a.duct, dB = b.side === 'feed' ? 0 : b.duct;
    if (st === 'loop' && dA === dB) {
      const da = exitDir(P, w.a), db = exitDir(P, w.b);
      const k = Math.max(14, Math.min(70, Math.hypot(b.x - a.x, b.y - a.y) * 0.45)) + (w.dy || 0);
      const c1 = [a.x, a.y + da * k], c2 = [b.x, b.y + db * k];
      const pts = [];
      for (let i = 0; i <= 24; i++) { const t = i / 24, u = 1 - t; pts.push([u * u * u * a.x + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * b.x, u * u * u * a.y + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * b.y]); }
      pts.bez = [[a.x, a.y], c1, c2, [b.x, b.y]];
      return pts;
    }
    const lane = idx % G.LANES;
    const sideLane = Math.max(2, Math.min(G.SD - 4, 4 + (idx % 7) * 3.6 + (w.dx || 0)));
    const pts = [];
    if (a.side === 'feed' || b.side === 'feed') {
      const f = a.side === 'feed' ? a : b, t = a.side === 'feed' ? b : a;
      if (t.side === 'feed') return [[f.x, f.y], [t.x, t.y]];
      const ly = laneY(t.duct, lane, w.dy);
      const sx = Math.max(2, Math.min(G.SD - 4, f.x + (w.dx || 0)));
      pts.push([f.x, f.y], [sx, f.y + 4], [sx, ly], [t.x, ly], [t.x, t.y]);
      if (st === 'loop') pts.round = 9;
      return a.side === 'feed' ? pts : pts.reverse();
    }
    const lyA = laneY(a.duct, lane, w.dy), lyB = laneY(b.duct, lane, w.dy);
    if (a.duct === b.duct) {
      pts.push([a.x, a.y], [a.x, lyA], [b.x, lyA], [b.x, b.y]);
    } else {
      const left = w.side ? w.side === 'L' : Math.abs(a.x) + Math.abs(b.x) <= Math.abs(W(P) - a.x) + Math.abs(W(P) - b.x);
      const sx = left ? sideLane : W(P) - sideLane;
      pts.push([a.x, a.y], [a.x, lyA], [sx, lyA], [sx, lyB], [b.x, lyB], [b.x, b.y]);
    }
    if (st === 'loop') pts.round = 9;
    return pts;
  }
  const pathLen = (pts) => pts.reduce((s, p, i) => (i ? s + Math.abs(p[0] - pts[i - 1][0]) + Math.abs(p[1] - pts[i - 1][1]) : 0), 0);

  /* ---------- номера проводов, длина, кабельный журнал ---------- */
  const WN = (P) => Object.assign({ show: true, color: true, start: 1, auto: true }, P.wn || {});
  const VIEW = (P) => Object.assign({ ferrules: true, stickers: false, dims: false }, P.view || {});
  const nextWireNum = (P) => Math.max(WN(P).start - 1, ...P.wires.map((w) => Number(w.num) || 0)) + 1;
  /* all — перенумеровать все провода сверху вниз и слева направо; иначе дать номера только тем, у кого их нет */
  function numberWires(P, all) {
    sync(P);
    if (all) {
      const key = (w) => { const p = [endInfo(P, w.a), endInfo(P, w.b)].filter(Boolean); return p.length ? [Math.min(...p.map((q) => q.y)), Math.min(...p.map((q) => q.x))] : [1e9, 1e9]; };
      const order = P.wires.map((w) => [w, key(w)]).sort((p, q) => p[1][0] - q[1][0] || p[1][1] - q[1][1]);
      order.forEach(([w], i) => { w.num = WN(P).start + i; });
    } else P.wires.forEach((w) => { if (w.num == null || w.num === '') w.num = nextWireNum(P); });
  }
  /* длина провода: трасса + 0,1 м на разделку, плюс запас в процентах */
  function wireLen(P, w, i) {
    const pts = route(P, w, i < 0 ? P.wires.indexOf(w) : i);
    if (!pts) return 0;
    const slack = w.slack != null && w.slack !== '' ? Number(w.slack) : P.slack != null ? Number(P.slack) : 0;
    return Math.round((pathLen(pts) / 1000 + 0.1) * (1 + slack / 100) * 100) / 100;
  }
  const WCOL = { brown: ['коричневый', '#8A5426'], black: ['чёрный', '#1D1D1D'], grey: ['серый', '#8E9497'], blue: ['синий', '#2A6CD6'], lblue: ['голубой', '#5FB0E8'], yg: ['жёлто-зелёный', '#2F9B4A'], red: ['красный', '#D0312D'], white: ['белый', '#F2F2F2'] };
  const CONDCOL = { L: 'коричневый', L1: 'коричневый', L2: 'чёрный', L3: 'серый', N: 'синий', PE: 'жёлто-зелёный', PEN: 'жёлто-зелёный с синими метками' };
  const wireColor = (w) => (w.color && WCOL[w.color] ? WCOL[w.color][0] : CONDCOL[w.cond] || 'цвет по назначению');
  const MARK = 'ПуГВнг(А)-LS';
  function endName(P, e) {
    if (e.dev) return `${e.dev} : ${e.term}`;
    if (e.bus) return `${e.bus} : отв. ${(e.slot || 0) + 1}`;
    if (e.feed) return `Ввод : ${e.feed}`;
    if (e.line) { const l = P.lines.find((x) => x.id === e.line); return `Кабель гр. ${l ? l.num : '?'} : ${e.core}`; }
    return '?';
  }
  /* кабельный журнал: каждый провод щита — номер, откуда, куда, марка, сечение, цвет, длина */
  function journal(P) {
    sync(P);
    return P.wires.map((w, i) => ({ id: w.id, num: w.num == null ? '' : w.num, from: endName(P, w.a), to: endName(P, w.b), mark: w.mark || MARK, mm2: w.mm2 || 2.5, color: wireColor(w), len: wireLen(P, w, i) }))
      .sort((a, b) => (a.num === '' ? 1e9 : a.num) - (b.num === '' ? 1e9 : b.num));
  }

  /* ---------- цепи и классы проводников ---------- */
  const keyOf = (e) => (e.dev ? `d:${e.dev}:${e.term}` : e.bus ? `b:${e.bus}` : e.feed ? `f:${e.feed}` : e.line ? `l:${e.line}:${e.core}` : '?');
  function uf() {
    const p = {};
    const f = (x) => { if (p[x] === undefined) p[x] = x; while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; };
    return { find: f, union: (a, b) => { const ra = f(a), rb = f(b); if (ra !== rb) p[ra] = rb; } };
  }
  /* сквозные связи аппарата: верхняя клемма ↔ нижняя */
  function passPairs(d) {
    const T = termNames(d);
    if (d.type === 'rn') return [['Lin', 'Lout']];
    if (d.type === 'km') return T.top.filter((t) => t !== 'A1').map((t, i) => [t, T.bot[i]]);
    if (d.type === 'xt' || d.type === 'dbus' || d.type === 'blank') return [];
    if (d.type === 'meter') return T.top.map((t, i) => [t, T.bot[i]]);
    return T.top.filter((t, i) => T.bot[i] === t + '>').map((t) => [t, t + '>']);
  }
  /* группы клемм, которые соединяет гребёнка: 1ф — все фазные клеммы; 3ф на однополюсных — каждая третья; 3ф на трёхполюсных — по фазам */
  function combGroups(P, c) {
    const ds = c.devs.map((id) => P.devs.find((d) => d.id === id)).filter(Boolean);
    const ph = (d) => termNames(d).top.filter((t) => /^L/.test(t));
    if (c.conds.length === 1) return [ds.map((d) => ph(d)[0] && `d:${d.id}:${ph(d)[0]}`).filter(Boolean)];
    if (ds.every((d) => ph(d).length === 1)) return c.conds.map((_, j) => ds.filter((_, i) => i % c.conds.length === j).map((d) => `d:${d.id}:${ph(d)[0]}`));
    return c.conds.map((cond, j) => ds.map((d) => { const t = ph(d)[j] || ph(d).find((x) => x === cond); return t && `d:${d.id}:${t}`; }).filter(Boolean));
  }
  function nets(P, opt = {}) {
    const U = uf();
    P.wires.forEach((w) => U.union(keyOf(w.a), keyOf(w.b)));
    P.combs.forEach((c) => combGroups(P, c).forEach((ks) => ks.slice(1).forEach((k) => U.union(ks[0], k))));
    P.devs.forEach((d) => {
      if (d.type === 'xt') { const T = termNames(d); (d.outs || []).forEach((o, i) => { const src = T.top.find((t) => t.startsWith(o.replace(/out.*/, '').slice(0, 2))) || T.top[o.startsWith('N') ? T.top.length - 1 : 0]; if (T.bot[i]) U.union(`d:${d.id}:${T.bot[i]}`, `d:${d.id}:${src}`); }); }
      if (d.type === 'dbus') { const T = termNames(d); T.top.concat(T.bot).forEach((t) => U.union(`d:${d.id}:${T.top[0]}`, `d:${d.id}:${t}`)); }
    });
    if (opt.pass) P.devs.forEach((d) => passPairs(d).forEach(([a, b]) => U.union(`d:${d.id}:${a}`, `d:${d.id}:${b}`)));
    return U;
  }
  const classOf = (k) => (k.startsWith('f:') ? k.slice(2) : k.startsWith('l:') ? k.split(':')[2] : null);
  const busClass = (P, k) => { const b = P.buses.find((x) => 'b:' + x.id === k); return b ? b.kind : null; };
  /* назначение клеммы по её имени: фазная, нулевая или защитная */
  const ownClass = (d, t) => (['km', 'meter', 'blank', 'dbus'].includes(d.type) || !t ? null : /^PE/.test(t) ? 'PE' : /^L/.test(t) ? 'L' : /^N/.test(t) ? 'N' : null);
  function classes(P, extra) {
    const U = nets(P, { pass: true });
    if (extra) U.union(keyOf(extra.a), keyOf(extra.b));
    const groups = {};
    const add = (k, c) => { if (!c) return; const r = U.find(k); (groups[r] = groups[r] || new Set()).add(c); };
    P.wires.forEach((w) => [w.a, w.b].forEach((e) => { const k = keyOf(e); add(k, classOf(k) || busClass(P, k)); }));
    P.buses.forEach((b) => add('b:' + b.id, b.kind));
    P.devs.filter((d) => d.type === 'dbus').forEach((d) => add(`d:${d.id}:${termNames(d).top[0]}`, d.cond || 'N'));
    P.devs.forEach((d) => { const T = termNames(d); T.top.concat(T.bot).forEach((t) => add(`d:${d.id}:${t}`, ownClass(d, t))); });
    if (extra) [extra.a, extra.b].forEach((e) => { const k = keyOf(e); add(k, classOf(k) || busClass(P, k)); });
    return { U, groups };
  }
  function conflict(set, P) {
    const c = [...set];
    const ph = c.filter((x) => /^L/.test(x));
    if (new Set(ph.filter((x) => x !== 'L')).size > 1) return 'Нельзя соединить разные фазы между собой — это межфазное замыкание.';
    if (ph.length && (c.includes('N') || c.includes('PE') || c.includes('PEN'))) return 'Нельзя соединить фазу с нулевым или защитным проводником — это короткое замыкание.';
    const split = P.feed.earthing === 'TN-C>S';
    if (c.includes('N') && c.includes('PE') && !split) return 'N и PE нельзя объединять: в этом щите они разделены (ПУЭ п. 1.7.135).';
    return '';
  }
  /* все замыкания и обходы УЗО в щите */
  function faults(P) {
    const { groups } = classes(P);
    const out = new Set();
    Object.values(groups).forEach((set) => { const m = conflict(set, P); if (m) out.add(m); });
    rcdFaults(P, nets(P)).forEach((m) => out.add(m));
    return [...out];
  }
  const combKeySet = (P) => { const s = new Set(); P.combs.forEach((c) => combGroups(P, c).forEach((ks) => ks.forEach((k) => s.add(k)))); return s; };
  /* проводов в клемме; штырь гребёнки входит в своё гнездо зажима и в счёт не идёт — как в конструкторе */
  const usedAt = (P, k) => P.wires.filter((x) => keyOf(x.a) === k || keyOf(x.b) === k).length;
  /* обход УЗО и объединение выходов разных УЗО */
  function rcdFaults(P, U) {
    const out = [], seen = {};
    P.devs.filter((d) => d.type === 'rcd' || d.type === 'rcbo').forEach((d) => passPairs(d).forEach(([t, b]) => {
      const rt = U.find(`d:${d.id}:${t}`), rb = U.find(`d:${d.id}:${b}`);
      if (rt === rb) out.push(`Вход и выход ${d.id} («${t}») соединены напрямую — ток пойдёт мимо УЗО: оно не защитит или будет срабатывать без причины.`);
      if (seen[rb] && seen[rb] !== d.id) out.push(`Выходы ${seen[rb]} и ${d.id} соединены между собой — после разных УЗО цепи не объединяют, иначе оба будут срабатывать без причины.`);
      else seen[rb] = d.id;
    }));
    return out;
  }
  /* можно ли добавить провод */
  function canWire(P, w) {
    const ka = keyOf(w.a), kb = keyOf(w.b);
    if (ka === kb) return 'Провод соединяет клемму саму с собой.';
    if (w.a.feed && w.b.feed) return 'Жилы ввода между собой не соединяют.';
    for (const e of [w.a, w.b]) if (e.dev && usedAt(P, keyOf(e)) >= 2) return `В клемму ${e.dev} «${e.term}» уже заведены два проводника — третий не прижмётся.`;
    for (const e of [w.a, w.b]) if (e.line && P.wires.some((x) => keyOf(x.a) === keyOf(e) || keyOf(x.b) === keyOf(e))) return 'Эта жила кабеля уже подключена.';
    for (const e of [w.a, w.b]) if (e.bus && P.wires.some((x) => (x.a.bus === e.bus && x.a.slot === e.slot) || (x.b.bus === e.bus && x.b.slot === e.slot))) return 'Это отверстие шины занято: каждому проводнику — свой зажим.';
    if (P.wires.some((x) => (keyOf(x.a) === ka && keyOf(x.b) === kb) || (keyOf(x.a) === kb && keyOf(x.b) === ka))) return 'Эти клеммы уже соединены.';
    const { U, groups } = classes(P, w);
    const c = conflict(groups[U.find(ka)] || new Set(), P);
    if (c) return c;
    const U0 = nets(P);
    U0.union(ka, kb);
    return rcdFaults(P, U0)[0] || '';
  }
  /* класс проводника для нового провода */
  function guessCond(P, w) {
    const { U, groups } = classes(P, w);
    const set = groups[U.find(keyOf(w.a))];
    if (!set || !set.size) return '';
    const c = [...set];
    return c.find((x) => /^L\d/.test(x)) || c.find((x) => x === 'L') || (c.includes('N') ? 'N' : c.includes('PEN') ? 'PEN' : c.includes('PE') ? 'PE' : '');
  }
  const busFree = (P, b) => { for (let k = 0; k < b.n; k++) if (!P.wires.some((w) => (w.a.bus === b.id && w.a.slot === k) || (w.b.bus === b.id && w.b.slot === k))) return k; return -1; };

  /* ---------- проверки ---------- */
  function upstream(P, U, key, seen = new Set()) {
    const r = U.find(key);
    const out = [];
    P.devs.forEach((d) => passPairs(d).forEach(([top, bot]) => {
      if (U.find(`d:${d.id}:${bot}`) !== r || seen.has(d.id + bot)) return;
      seen.add(d.id + bot);
      out.push(d);
      upstream(P, U, `d:${d.id}:${top}`, seen).forEach((x) => out.push(x));
    }));
    return out;
  }
  function checks(P) {
    sync(P);
    const res = [];
    const add = (level, text, ref) => res.push({ level, text, ref: ref || '' });
    const used = P.devs.reduce((s, d) => s + d.w, 0), cap = P.rows * P.mods;
    P.devs.forEach((d) => { if (d.x + d.w > P.mods + EPS || d.row >= P.rows) add('err', `${d.id} выходит за пределы реек.`); });
    const free = cap ? (cap - used) / cap : 0;
    add(free < 0.15 ? 'warn' : 'ok', `Занято ${S.fmt(used, 1)} из ${cap} модулей, свободно ${Math.round(free * 100)} %${free < 0.15 ? ' — запаса меньше 15 %, новую линию ставить будет некуда' : ''}.`);
    const per = {}, secs = {};
    P.wires.forEach((w) => [w.a, w.b].forEach((e) => { if (e.dev) { const k = keyOf(e); per[k] = (per[k] || 0) + 1; (secs[k] = secs[k] || new Set()).add(w.mm2); } }));
    Object.entries(per).forEach(([k, n]) => { if (n > 2) add('err', `Клемма ${k.slice(2).replace(':', ' «')}» — ${n} проводника; больше двух в одну клемму не заводят.`); });
    const ckS = combKeySet(P);
    Object.entries(per).forEach(([k, n]) => { if (n === 2 && ckS.has(k)) add('warn', `Клемма ${k.slice(2).replace(':', ' «')}»: гребёнка и два провода. Так можно, только если у аппарата раздельный зажим для шины и для провода — смотри паспорт.`); });
    Object.entries(secs).forEach(([k, s]) => { if (s.size > 1) add('warn', `В клемму ${k.slice(2).replace(':', ' «')}» заведены провода разного сечения — тонкий прижмётся плохо. Используй двойной наконечник или гребёнку.`); });
    const { groups: G2 } = classes(P);
    const seenMsg = new Set();
    Object.values(G2).forEach((set) => { const m = conflict(set, P); if (m && !seenMsg.has(m)) { seenMsg.add(m); add('err', m); } });
    rcdFaults(P, nets(P)).forEach((m) => { if (!seenMsg.has(m)) { seenMsg.add(m); add('err', m); } });
    const fed = P.wires.filter((w) => w.a.feed || w.b.feed);
    if (!fed.length) add('warn', 'Ввод не подключён: нажми на жилу ввода вверху слева, затем на клемму вводного аппарата или шины.');
    const U = nets(P);
    const Up = nets(P, { pass: true });
    const feedKeys = feedCores(P).map((c) => 'f:' + c);
    const reachesFeed = (k) => feedKeys.some((f) => Up.find(f) === Up.find(k));
    P.devs.forEach((d) => {
      const pp = passPairs(d);
      if (!pp.length) return;
      const botUsed = pp.some(([, b]) => P.wires.some((w) => keyOf(w.a) === `d:${d.id}:${b}` || keyOf(w.b) === `d:${d.id}:${b}`));
      const topL = pp.find(([t]) => /^L|^1$|^Lin$/.test(t));
      if (fed.length && botUsed && topL && !reachesFeed(`d:${d.id}:${topL[0]}`)) add('warn', `${d.id} не запитан сверху: к его верхней клемме не приходит фаза с ввода.`);
    });
    const peBus = P.buses.filter((b) => b.kind === 'PE');
    if (fed.length && peBus.length && P.lines.length && !peBus.some((b) => reachesFeed('b:' + b.id))) add('err', 'Шина PE не соединена с PE (PEN) ввода — защитный проводник линий никуда не ведёт.', 'ПУЭ п. 1.7.135');
    const inp = P.devs.filter((d) => ['mcb', 'sw'].includes(d.type)).find((d) => termNames(d).top.some((t) => P.wires.some((w) => (w.a.feed && keyOf(w.b) === `d:${d.id}:${t}`) || (w.b.feed && keyOf(w.a) === `d:${d.id}:${t}`))));
    P.devs.filter((d) => d.type === 'rn' && inp && inp.In && d.In < inp.In).forEach((d) => add('warn', `${d.id}: реле напряжения ${d.In} А меньше вводного ${inp.In} А — контакты реле перегреются.`));
    P.lines.forEach((l) => {
      const cs = lineCores(P, l);
      const lc = cs.find((c) => /^L/.test(c));
      const conn = (c) => P.wires.some((w) => keyOf(w.a) === `l:${l.id}:${c}` || keyOf(w.b) === `l:${l.id}:${c}`);
      if (!conn(lc)) { add('warn', `Линия ${l.num} «${l.name}»: фаза кабеля не подключена.`); return; }
      const upL = upstream(P, U, `l:${l.id}:${lc}`);
      const prot = upL.find((d) => d.type === 'mcb' || d.type === 'rcbo');
      if (!prot) add('err', `Линия ${l.num} «${l.name}» не защищена автоматом.`);
      else if (inp && inp.In && prot.In >= inp.In && prot !== inp) add('warn', `Линия ${l.num}: автомат ${prot.id} ${prot.In} А не меньше вводного ${inp.In} А — нет селективности по перегрузке.`);
      if (cs.includes('N') && conn('N')) {
        const rcdL = upL.filter((d) => d.type === 'rcd' || d.type === 'rcbo').map((d) => d.id).sort().join(',');
        const rcdN = upstream(P, U, `l:${l.id}:N`).filter((d) => d.type === 'rcd' || d.type === 'rcbo').map((d) => d.id).sort().join(',');
        if (rcdL !== rcdN) { const via = (x) => (x ? `через ${x}` : 'мимо УЗО'); add('err', `Линия ${l.num} «${l.name}»: фаза идёт ${via(rcdL)}, а нуль — ${via(rcdN)}. УЗО будет ложно срабатывать: нуль линии берут только с шины своего УЗО.`, 'ПУЭ п. 7.1.36'); }
        if (/розет/i.test(l.name) && !rcdL) add('err', `Линия ${l.num} «${l.name}»: розеточная группа без УЗО 30 мА.`, 'ПУЭ п. 7.1.79');
      } else if (cs.includes('N')) add('warn', `Линия ${l.num} «${l.name}»: нуль кабеля не подключён.`);
      if (cs.includes('PE') && !conn('PE')) add('warn', `Линия ${l.num} «${l.name}»: PE кабеля не подключён.`);
    });
    P.devs.filter((d) => d.type === 'rcd').forEach((d) => {
      const T = termNames(d);
      const down = P.devs.filter((x) => (x.type === 'mcb') && termNames(x).top.some((t) => U.find(`d:${x.id}:${t}`) === U.find(`d:${d.id}:${T.bot[0]}`)));
      const up = upstream(P, U, `d:${d.id}:${T.top[0]}`).find((x) => x.type === 'mcb');
      const sum = down.reduce((s, x) => s + (x.In || 0), 0);
      if (down.length && !(up && up.In <= d.In) && sum > d.In) add('warn', `${d.id} ${d.In} А: сумма автоматов после него ${sum} А, а автомата не больше ${d.In} А выше нет — проверь защиту УЗО от перегрузки.`, 'ПУЭ п. 7.1.76');
    });
    if (!P.lines.length) add('warn', 'Не добавлено ни одной отходящей линии — проверки защиты линий не выполнялись.');
    return res;
  }

  /* ---------- вставка аппарата: раздвижка соседей вправо и влево, прилипание к соседям ---------- */
  function placeInsert(P, row, x, w, ignore, opt = {}) {
    if (row < 0 || row >= P.rows || w > P.mods + EPS) return null;
    x = Math.max(0, Math.min(P.mods - w, Math.round(x * 2) / 2));
    const ign = new Set([].concat(ignore || []));
    const rowDevs = P.devs.filter((d) => d.row === row && !ign.has(d.id)).sort((a, b) => a.x - b.x);
    const mid = x + w / 2;
    const left = rowDevs.filter((d) => d.x + d.w / 2 < mid - EPS), right = rowDevs.filter((d) => d.x + d.w / 2 >= mid - EPS);
    const prevEnd = left.length ? left[left.length - 1].x + left[left.length - 1].w : 0;
    const nextStart = right.length ? right[0].x : P.mods;
    if (opt.snap !== false) {
      if (x - prevEnd > 0 && x - prevEnd <= 0.5 + EPS) x = prevEnd;
      else if (nextStart - (x + w) > 0 && nextStart - (x + w) <= 0.5 + EPS && nextStart - w >= prevEnd - EPS) x = nextStart - w;
    }
    const pos = new Map();
    let cur = Math.max(x, prevEnd);
    const nx = cur;
    cur += w;
    for (const d of right) { const v = Math.max(d.x, cur); pos.set(d, v); cur = v + d.w; }
    let overflow = cur - P.mods;
    let start = nx;
    if (overflow > EPS) {
      // не помещается справа — сдвигаем вставляемый аппарат и левых соседей влево
      start = nx - overflow;
      let edge = start;
      for (let i = left.length - 1; i >= 0; i--) { const d = left[i]; const v = Math.min(d.x, edge - d.w); pos.set(d, v); edge = v; }
      if (edge < -EPS) return null;
      let c2 = start + w;
      for (const d of right) { const v = Math.max(Math.min(pos.get(d), d.x), c2); pos.set(d, v); c2 = v + d.w; }
      if (c2 > P.mods + EPS) return null;
    }
    if (opt.apply !== false) pos.forEach((v, d) => { d.x = Math.round(v * 2) / 2; });
    return { x: Math.round(start * 2) / 2, moved: [...pos.entries()].filter(([d, v]) => Math.abs(d.x - v) > EPS || opt.apply !== false).length };
  }
  /* перенос группы аппаратов одной рейки целиком: промежутки между ними сохраняются */
  function placeBlock(P, row, x, ids, opt = {}) {
    const ds = ids.map((id) => P.devs.find((d) => d.id === id)).filter(Boolean);
    if (!ds.length || new Set(ds.map((d) => d.row)).size > 1) return null;
    const x0 = Math.min(...ds.map((d) => d.x)), span = Math.max(...ds.map((d) => d.x + d.w)) - x0;
    const r = placeInsert(P, row, x, span, ids, opt);
    if (!r) return null;
    if (opt.apply !== false) ds.forEach((d) => { const off = d.x - x0; d.row = row; d.x = r.x + off; });
    return Object.assign(r, { span, x0 });
  }
  const fits = (P, row, x, w, ignore) => x >= -EPS && x + w <= P.mods + EPS && row >= 0 && row < P.rows && !P.devs.some((d) => d.id !== ignore && d.row === row && x < d.x + d.w - EPS && d.x < x + w - EPS);
  const placeShift = (P, row, x, w, ignore) => { const r = placeInsert(P, row, x, w, ignore, { snap: false }); return !!r && Math.abs(r.x - x) < EPS; };

  /* гребёнка лежит только на соседних аппаратах одной рейки: разрывы режут её на части, одиночные аппараты снимаются */
  function fixCombs(P) {
    const notes = [];
    const out = [];
    P.combs.forEach((c) => {
      const ds = c.devs.map((id) => P.devs.find((d) => d.id === id)).filter(Boolean).sort((a, b) => a.row - b.row || a.x - b.x);
      const runs = [];
      ds.forEach((d) => { const r = runs[runs.length - 1]; const last = r && r[r.length - 1]; if (last && last.row === d.row && Math.abs(last.x + last.w - d.x) < EPS) r.push(d); else runs.push([d]); });
      const keep = runs.filter((r) => r.length > 1);
      const dropped = runs.filter((r) => r.length === 1).map((r) => r[0].id);
      if (keep.length === 1 && keep[0].length === c.devs.length && keep[0].every((d, i) => d.id === c.devs[i])) { out.push(c); return; }
      keep.forEach((r, i) => out.push({ id: i ? c.id + '-' + i : c.id, devs: r.map((d) => d.id), conds: c.conds.slice() }));
      if (dropped.length) notes.push(`${dropped.join(', ')} ${dropped.length > 1 ? 'сняты' : 'снят'} с гребёнки`);
      else if (keep.length > 1) notes.push('Гребёнка разрезана на части — подай питание на каждую');
    });
    P.combs = out;
    return notes;
  }

  /* изменить размеры корпуса без потери аппаратов */
  const busBad = (P) => P.buses.some((b) => b.x < -EPS || b.x > busMaxX(P, b) + EPS) || ['top', 'bottom'].some((z) => { const bs = P.buses.filter((b) => b.zone === z); return bs.some((a, i) => bs.slice(i + 1).some((b) => a.x < b.x + busW(b) && b.x < a.x + busW(a))); });
  const busUsedMax = (P, b) => Math.max(-1, ...P.wires.map((w) => [w.a, w.b].filter((e) => e.bus === b.id).map((e) => e.slot || 0)).flat());
  function resize(P, rows, mods) {
    if (P.devs.some((d) => d.row >= rows)) return `На рейке ${rows + 1} стоят аппараты — сначала перенеси их.`;
    if (P.devs.some((d) => d.x + d.w > mods + EPS)) return `Аппараты занимают больше ${mods} модулей в ряду — сначала сдвинь их.`;
    const T = JSON.parse(JSON.stringify(P));
    T.rows = rows; T.mods = mods;
    const maxN = Math.floor((mods * G.MOD - 20) / 8) + 1;
    for (const b of T.buses) {
      if (b.n > maxN) { if (busUsedMax(T, b) >= maxN) return `Шина ${b.id} не помещается в корпус шириной ${mods} модулей: на ней заняты дальние отверстия.`; b.n = Math.max(2, maxN); }
      b.x = Math.max(0, Math.min(b.x, busMaxX(T, b)));
    }
    if (busBad(T)) { arrangeBuses(T); balanceBuses(T); }
    if (busBad(T)) return `Шины не помещаются в корпус шириной ${mods} модулей — убери лишнюю шину или укороти шины.`;
    P.rows = rows; P.mods = mods; P.buses = T.buses;
    if (P.pitches) P.pitches = P.pitches.slice(0, Math.max(0, rows - 1));
    return '';
  }
  /* рейки по одной: вставить пустую перед k, убрать пустую k, поменять k и k+1 местами */
  function railOp(P, op, k) {
    if (op === 'insert') {
      if (P.rows >= 8) return 'Больше восьми реек в редакторе не бывает — возьми второй щит.';
      P.devs.forEach((d) => { if (d.row >= k) d.row += 1; });
      if (P.pitches) P.pitches.splice(Math.max(0, k - 1), 0, P.pitch || 134);
      P.rows += 1;
      return '';
    }
    if (op === 'remove') {
      if (P.rows <= 1) return 'Последнюю рейку не убрать.';
      if (P.devs.some((d) => d.row === k)) return `На рейке ${k + 1} стоят аппараты — сначала перенеси их.`;
      P.devs.forEach((d) => { if (d.row > k) d.row -= 1; });
      if (P.pitches) P.pitches.splice(Math.max(0, k - 1), 1);
      P.rows -= 1;
      return '';
    }
    if (op === 'swap') {
      if (k < 0 || k + 1 >= P.rows) return 'Ниже этой рейки нет.';
      P.devs.forEach((d) => { if (d.row === k) d.row = k + 1; else if (d.row === k + 1) d.row = k; });
      return '';
    }
    return '';
  }
  /* ограничители (стопоры) на DIN-рейку по краям аппаратов каждой рейки */
  function autoStops(P) {
    let added = 0, miss = 0;
    const put = (row, x) => {
      const r = placeInsert(P, row, x, 0.5, null, { snap: false });
      if (!r) { miss += 1; return; }
      const d = lib().make('gen-stop');
      d.id = nextId(P, 'stop'); d.row = row; d.x = r.x; d.label = '';
      P.devs.push(d);
      added += 1;
    };
    for (let row = 0; row < P.rows; row++) {
      const ds = () => P.devs.filter((d) => d.row === row && d.type !== 'stop').sort((a, b) => a.x - b.x);
      if (!ds().length) continue;
      const x0 = ds()[0].x;
      if (!P.devs.some((d) => d.row === row && d.type === 'stop' && Math.abs(d.x + d.w - x0) < EPS)) put(row, Math.max(0, x0 - 0.5));
      const last = ds()[ds().length - 1], x1 = last.x + last.w;
      if (!P.devs.some((d) => d.row === row && d.type === 'stop' && Math.abs(d.x - x1) < EPS)) put(row, Math.min(x1, P.mods - 0.5));
    }
    return { added, miss };
  }
  /* буфер обмена: аппараты, провода между ними и их гребёнки */
  function copyDevs(P, ids) {
    const set = new Set(ids);
    const cl = (x) => JSON.parse(JSON.stringify(x));
    return {
      devs: P.devs.filter((d) => set.has(d.id)).sort((a, b) => a.row - b.row || a.x - b.x).map(cl),
      wires: P.wires.filter((w) => set.has(w.a.dev) && set.has(w.b.dev)).map(cl),
      combs: P.combs.filter((c) => c.devs.every((x) => set.has(x))).map(cl)
    };
  }
  /* вставка: аппараты встают подряд, с теми же промежутками, в конец первой рейки, где хватает места */
  function pasteDevs(P, clip, prefRow) {
    if (!clip || !clip.devs.length) return { err: 'Буфер пуст: сначала скопируй аппараты (Ctrl+C).' };
    const ds = clip.devs;
    const rel = [];
    ds.forEach((d, i) => { if (!i) { rel.push(0); return; } const p = ds[i - 1]; rel.push(rel[i - 1] + p.w + (d.row === p.row ? Math.max(0, d.x - p.x - p.w) : 0)); });
    const span = rel[rel.length - 1] + ds[ds.length - 1].w;
    if (span > P.mods + EPS) return { err: 'Скопированные аппараты длиннее рейки.' };
    const order = [...Array(P.rows).keys()];
    if (prefRow != null && prefRow >= 0 && prefRow < P.rows) order.unshift(...order.splice(prefRow, 1));
    let place = null;
    for (const row of order) { const end = P.devs.filter((d) => d.row === row).reduce((m, d) => Math.max(m, d.x + d.w), 0); if (end + span <= P.mods + EPS) { place = { row, x: end }; break; } }
    for (let row = 0; row < P.rows && !place; row++) for (let x = 0; x + span <= P.mods + EPS; x += 0.5) if (fits(P, row, x, span)) { place = { row, x }; break; }
    if (!place) return { err: 'Для вставки нет места: освободи рейку или добавь новую.' };
    const map = {};
    ds.forEach((d, i) => { const nd = JSON.parse(JSON.stringify(d)); nd.id = nextId(P, d.type, d.cond); map[d.id] = nd.id; nd.row = place.row; nd.x = place.x + rel[i]; P.devs.push(nd); });
    clip.wires.forEach((w) => { const nw = JSON.parse(JSON.stringify(w)); nw.id = 'w' + Math.random().toString(36).slice(2, 8); nw.a.dev = map[w.a.dev]; nw.b.dev = map[w.b.dev]; delete nw.dx; delete nw.dy; nw.num = WN(P).auto ? nextWireNum(P) : ''; P.wires.push(nw); });
    clip.combs.forEach((c) => P.combs.push({ id: 'c' + Math.random().toString(36).slice(2, 7), devs: c.devs.map((x) => map[x]), conds: c.conds.slice(), kind: c.kind }));
    return { ids: ds.map((d) => map[d.id]) };
  }
  /* разложить шины корпуса без наложений */
  function arrangeBuses(P) {
    ['top', 'bottom'].forEach((z) => { let x = 4; P.buses.filter((b) => b.zone === z).sort((a, b) => a.x - b.x).forEach((b) => { b.x = x; x += busW(b) + 6; }); });
  }
  /* если шины не помещаются в своей зоне — переносим лишние в другую зону */
  function balanceBuses(P) {
    const room = W(P) - 2 * G.SD;
    const tot = (z) => P.buses.filter((b) => b.zone === z).reduce((s, b) => s + busW(b) + 6, 0) - 2;
    for (let guard = 0; guard < 10; guard++) {
      const over = ['top', 'bottom'].find((z) => tot(z) > room);
      if (!over) break;
      const other = over === 'top' ? 'bottom' : 'top';
      const cand = P.buses.filter((b) => b.zone === over).sort((a, b) => busW(a) - busW(b)).find((b) => tot(other) + busW(b) + 6 <= room);
      if (!cand) break;
      cand.zone = other;
      arrangeBuses(P);
    }
  }
  /* поставить шину в зону с прилипанием к соседним шинам; возвращает итоговый x или null */
  function busPlace(P, b, zone, x) {
    const others = P.buses.filter((o) => o !== b && o.zone === zone).sort((a, c) => a.x - c.x);
    const w = busW(b), maxX = busMaxX(P, b);
    x = Math.max(0, Math.min(maxX, Math.round(x)));
    for (const o of others) {
      const oe = o.x + busW(o);
      if (Math.abs(x - (oe + 4)) < 6) x = oe + 4;
      if (Math.abs(x + w + 4 - o.x) < 6) x = o.x - w - 4;
    }
    const clash = others.some((o) => x < o.x + busW(o) + 2 && o.x < x + w + 2);
    if (clash || x < -EPS || x > maxX + EPS) return null;
    return x;
  }

  /* ---------- автоподключение линии к аппарату ---------- */
  function autoLine(P, devId, opt = {}) {
    const d = P.devs.find((x) => x.id === devId);
    if (!d || !['mcb', 'rcbo', 'sw', 'km'].includes(d.type)) return { err: 'Линию выводят от автомата, дифавтомата или контактора.' };
    const T = termNames(d);
    const bots = T.bot.filter((t) => /^L|^[2468]$/.test(t));
    const three = bots.length >= 3 && P.feed.phases === 3;
    const freeT = (t) => usedAt(P, `d:${d.id}:${t}`) < 2;
    if (!bots.length) return { err: 'У аппарата нет нижних фазных клемм.' };
    const U = nets(P);
    /* у полной шины добавляем отверстие, если рядом есть место */
    const grown = [];
    const grow = (b) => { b.n += 1; const nx = busPlace(P, b, b.zone, b.x); if (nx == null) { b.n -= 1; return false; } grown.push([b, b.x]); b.x = nx; return true; };
    const ungrow = () => grown.forEach(([b, x]) => { b.n -= 1; b.x = x; });
    const cores = three ? ['L1', 'L2', 'L3', 'N', 'PE'] : ['L', 'N', 'PE'];
    const In = d.In || 16;
    const mm2 = In <= 10 ? 1.5 : In <= 16 ? 2.5 : In <= 25 ? 4 : In <= 32 ? 6 : In <= 50 ? 10 : 16;
    const n = P.lines.reduce((m, l) => Math.max(m, l.num || 0), 0) + 1;
    const l = { id: 'l' + Math.random().toString(36).slice(2, 7), num: n, name: opt.name || d.label || `Линия ${n}`, cable: `ВВГнг(А)-LS ${cores.length}×${String(mm2).replace('.', ',')}`, len: 15, cores, mm2 };
    const ws = [];
    const W0 = (a, b, cond) => ws.push({ id: 'w' + Math.random().toString(36).slice(2, 8), a, b, cond, mm2 });
    // фазы
    (three ? bots.slice(0, 3) : [bots[0]]).forEach((t, i) => W0({ dev: d.id, term: t }, { line: l.id, core: three ? ['L1', 'L2', 'L3'][i] : 'L' }, three ? ['L1', 'L2', 'L3'][i] : (guessCond(P, { a: { dev: d.id, term: t }, b: { dev: d.id, term: t } }) || 'L')));
    // нуль: свой зажим аппарата, иначе шина своего УЗО, иначе шина N без УЗО
    const nOwn = T.bot.find((t) => t === 'N>');
    if (nOwn && freeT(nOwn)) W0({ dev: d.id, term: nOwn }, { line: l.id, core: 'N' }, 'N');
    else {
      const rcd = upstream(P, U, `d:${d.id}:${T.top[0]}`).find((x) => x.type === 'rcd');
      const want = rcd ? U.find(`d:${rcd.id}:${termNames(rcd).bot.find((t) => t.startsWith('N'))}`) : null;
      const choose = (nb) => (rcd ? nb.find((b) => U.find('b:' + b.id) === want) : nb.find((b) => !upstream(P, U, 'b:' + b.id).some((x) => x.type === 'rcd' || x.type === 'rcbo')) || nb[0]);
      let pick = choose(P.buses.filter((b) => b.kind === 'N' && busFree(P, b) >= 0));
      if (!pick) { const full = choose(P.buses.filter((b) => b.kind === 'N')); if (full && grow(full)) pick = full; }
      if (!pick) { ungrow(); return { err: rcd ? `Нет шины N группы ${rcd.id} со свободным отверстием: соедини нижний N ${rcd.id} с шиной N.` : (P.buses.some((b) => b.kind === 'N') ? 'Шина N заполнена, а удлинить её некуда: передвинь соседнюю шину или добавь ещё одну шину N.' : 'В щите нет шины N — добавь её в свойствах щита.') }; }
      W0({ bus: pick.id, slot: busFree(P, pick) }, { line: l.id, core: 'N' }, 'N');
    }
    // PE
    let pb = P.buses.find((b) => b.kind === 'PE' && busFree(P, b) >= 0);
    if (!pb) { const full = P.buses.find((b) => b.kind === 'PE'); if (full && grow(full)) pb = full; }
    if (pb) W0({ bus: pb.id, slot: busFree(P, pb) }, { line: l.id, core: 'PE' }, 'PE');
    const T2 = JSON.parse(JSON.stringify(P));
    T2.lines.push(l);
    for (const w of ws) {
      // свободное отверстие шины может совпасть у N и PE — берём следующее
      if (w.a.bus) { const b = T2.buses.find((x) => x.id === w.a.bus); w.a.slot = busFree(T2, b); }
      const e = canWire(T2, w);
      if (e) { ungrow(); return { err: e }; }
      T2.wires.push(w);
    }
    if (opt.apply !== false) { P.lines.push(l); ws.forEach((w) => { if (WN(P).auto) w.num = nextWireNum(P); P.wires.push(w); }); } else ungrow();
    return { line: l, wires: ws };
  }

  /* ---------- импорт из конструктора ---------- */
  const BRAND_SID = {
    ekf: { mcb: 'ekf-av6', rcd: 'ekf-vd100n', rcbo2: 'ekf-dva6', rcbo4: 'ekf-avdt63n', sw: 'ekf-vn63n', spd: 'ekf-opvc', rn: 'ekf-rvb', xt: 'ekf-cm' },
    iek: { mcb: 'iek-va4729', rcd: 'iek-vd163', rcbo2: 'iek-avdt32', rcbo4: 'iek-avdt34', sw: 'iek-vn32', spd: 'iek-ops1', rn: 'iek-rnd', xt: 'ekf-cm' },
    abb: { mcb: 'abb-s200', rcd: 'abb-f200', rcbo2: 'abb-ds200', rcbo4: 'ekf-avdt63n', sw: 'abb-sd200', spd: 'abb-ovr', rn: 'ekf-rvb', xt: 'ekf-cm' },
    sys: { mcb: 'sys-c9f', rcd: 'se-ez9r', rcbo2: 'iek-avdt32', rcbo4: 'ekf-avdt63n', sw: 'se-ez9s', spd: 'ekf-opvc', rn: 'ekf-rvb', xt: 'ekf-cm' },
    se: { mcb: 'se-ez9f', rcd: 'se-ez9r', rcbo2: 'iek-avdt32', rcbo4: 'ekf-avdt63n', sw: 'se-ez9s', spd: 'ekf-opvc', rn: 'ekf-rvb', xt: 'ekf-cm' }
  };
  function fromBuilder(R, brand = 'ekf') {
    const cfg = R.cfg || {};
    const map = BRAND_SID[brand] || BRAND_SID.ekf;
    const P = blank();
    sync(P);
    P.name = cfg.name || 'Щит из конструктора';
    P.rows = R.layout.rails;
    P.mods = R.layout.W;
    P.feed = { phases: R.three ? 3 : 1, earthing: cfg.earthing || 'TN-C-S' };
    P.devs = R.devices.filter((d) => d.rail != null).map((d) => {
      const key = d.type === 'rcbo' ? (d.poles > 2 ? 'rcbo4' : 'rcbo2') : d.type;
      const sid = d.type === 'meter' ? (d.poles === 3 ? 'gen-meter3' : 'gen-meter1') : map[key] || 'gen-blank';
      const o = { id: d.id, sid, type: d.type, poles: d.poles, w: d.w, row: d.rail, x: d.x, label: d.label || '', brand: (lib().byId(sid) || {}).brand };
      ['In', 'curve', 'ma', 'rt', 'cls', 'scheme', 'mount', 'compact', 'outs', 'phase'].forEach((k) => { if (d[k] != null) o[k] = d[k]; });
      return o;
    });
    P.buses = R.buses.map((b) => ({ id: b.id, kind: b.kind, zone: b.kind === 'PE' ? 'bottom' : 'top', x: 0, n: Math.max(b.terms.length + 2, 6) }));
    arrangeBuses(P);
    const room = W(P) - 2 * G.SD;
    ['top', 'bottom'].forEach((z) => { const bs = P.buses.filter((b) => b.zone === z); let tot = bs.reduce((s, b) => s + busW(b) + 6, 0); while (tot > room && bs.some((b) => b.n > 4)) { const b = bs.sort((a, c) => c.n - a.n)[0]; b.n -= 1; tot -= 8; } });
    arrangeBuses(P);
    P.lines = R.lines.map((l) => ({ id: l.id, num: l.num, name: l.name, cable: `${l.cableMark} ${l.cores}×${String(l.s).replace('.', ',')}`, len: l.len, ph: l.ph, cores: l.ph === 3 && R.three ? (l.noN ? ['L1', 'L2', 'L3', 'PE'] : ['L1', 'L2', 'L3', 'N', 'PE']) : ['L', 'N', 'PE'], mm2: l.s }));
    const end = (e) => {
      if (e.dev) return { dev: e.dev, term: e.term };
      if (e.bus) return { bus: e.bus, slot: e.slot };
      if (e.ext === 'input') return { feed: e.cond === 'L' && R.three ? 'L1' : e.cond };
      if (e.ext === 'line') { const ln = P.lines.find((x) => x.id === e.line); const core = ln && !ln.cores.includes(e.cond) && /^L/.test(e.cond) ? (ln.cores.find((c) => /^L/.test(c)) || e.cond) : e.cond; return { line: e.line, core }; }
      return null;
    };
    P.wires = R.wires.map((w) => ({ id: w.id, a: end(w.from), b: end(w.to), cond: w.cond, mm2: w.mm2 })).filter((w) => w.a && w.b);
    // отверстия шин, укороченных под ширину корпуса, перенумеровываем подряд
    P.buses.forEach((b) => { let k = 0; P.wires.forEach((w) => [w.a, w.b].forEach((e) => { if (e.bus === b.id) { e.slot = k; k += 1; } })); if (k > b.n) b.n = k; });
    arrangeBuses(P);
    balanceBuses(P);
    P.combs = (R.combs || []).map((c) => ({ id: c.id, devs: c.devs.slice(), conds: c.conds.slice() }));
    P.meta.object = cfg.name || '';
    numberWires(P, true);
    return P;
  }

  /* наименование аппарата для спецификации и перечня элементов */
  function devName(d) {
    if (d.name) return d.name;
    const s = spec(d) || {};
    const br = (lib().BRANDS[s.brand] || {}).name || '';
    if (d.type === 'dbus') return `Шина ${d.cond || 'N'} на DIN-рейку ${S.fmt(d.w, 1)} мод.`;
    if (d.type === 'stop') return 'Ограничитель на DIN-рейку';
    return [br === 'Общие' || br === 'Мои' ? '' : br, s.series || d.type, d.poles ? d.poles + 'P' : '', d.curve ? d.curve + (d.In || '') : d.In ? d.In + ' А' : '', d.ma ? d.ma + ' мА' : '', d.rt ? 'тип ' + d.rt : '', s.icu && (d.type === 'mcb' || d.type === 'rcbo') ? S.fmt(s.icu, 1) + ' кА' : ''].filter(Boolean).join(' ');
  }
  /* перечень элементов: одинаковые аппараты — одной строкой, обозначения подряд сжимаются: QF1–QF3 */
  function elements(P) {
    const rows = {};
    P.devs.filter((d) => !d.noBom && !['stop', 'blank'].includes(d.type)).forEach((d) => {
      const name = devName(d), art = artOf(d), k = name + '|' + art;
      (rows[k] = rows[k] || { name, art, ids: [] }).ids.push(d.id);
    });
    const split = (id) => { const m = /^(.*?)(\d+)$/.exec(id); return m ? [m[1], Number(m[2])] : [id, NaN]; };
    const pack = (ids) => {
      const sorted = ids.slice().sort((a, b) => { const [pa, na] = split(a), [pb, nb] = split(b); return pa.localeCompare(pb) || na - nb; });
      const out = [];
      sorted.forEach((id) => { const [p, n] = split(id); const last = out[out.length - 1]; if (last && last.p === p && !isNaN(n) && n === last.to + 1) last.to = n; else out.push({ p, from: n, to: n, id }); });
      return out.map((r) => (isNaN(r.from) ? r.id : r.to > r.from + 1 ? `${r.p}${r.from}–${r.p}${r.to}` : r.to === r.from + 1 ? `${r.p}${r.from}, ${r.p}${r.to}` : `${r.p}${r.from}`)).join(', ');
    };
    return Object.values(rows).map((r) => ({ pos: pack(r.ids), name: r.name, qty: r.ids.length, note: r.art, first: r.ids.slice().sort()[0] }))
      .sort((a, b) => a.first.localeCompare(b.first, 'ru', { numeric: true }));
  }

  /* ---------- спецификация: наименование, артикул, количество ---------- */
  function bom(P) {
    sync(P);
    const rows = {};
    const add = (k, name, n, unit, art) => { rows[k] = rows[k] || { name, qty: 0, unit: unit || 'шт', art: art || '' }; rows[k].qty += n; };
    P.devs.forEach((d) => {
      if (d.noBom) return;
      const name = devName(d), art = artOf(d);
      add('d' + name + '|' + art, name, 1, 'шт', art);
    });
    P.combs.forEach((c) => add('comb' + (c.kind || 'PIN') + c.conds.length, `Шина соединительная ${c.kind === 'FORK' ? 'FORK (вилка)' : 'PIN (штырь)'} ${c.conds.length === 3 ? '3P' : '1P'}, отрезок`, 1));
    P.buses.forEach((b) => add('bus' + b.kind + b.n, `Шина ${b.kind === 'PE' ? 'PE' : 'N'} на ${b.n} отверстий`, 1));
    const lens = {};
    P.wires.forEach((w, i) => {
      const L = wireLen(P, w, i);
      if (!L) return;
      const k = (w.mark || MARK) + '|' + (w.mm2 || 2.5) + '|' + wireColor(w);
      lens[k] = (lens[k] || 0) + L;
    });
    Object.keys(lens).sort().forEach((k) => { const [mk, m, c] = k.split('|'); add('w' + k, `Провод ${mk} 1×${String(m).replace('.', ',')} мм², ${c}`, Math.ceil(lens[k] * 10) / 10, 'м'); });
    /* наконечники: два провода одного сечения в одной клемме — один двойной НШВИ2 */
    const at = {};
    P.wires.forEach((w) => [w.a, w.b].forEach((e) => { if (e.dev || e.bus) { const k = e.dev ? keyOf(e) : `b:${e.bus}:${e.slot}`; (at[k] = at[k] || []).push(w.mm2 || 2.5); } }));
    const one = {}, two = {};
    Object.values(at).forEach((arr) => { if (arr.length === 2 && arr[0] === arr[1]) two[arr[0]] = (two[arr[0]] || 0) + 1; else arr.forEach((m) => { one[m] = (one[m] || 0) + 1; }); });
    Object.keys(one).sort((a, b) => a - b).forEach((m) => add('f' + m, `Наконечник НШВИ ${String(m).replace('.', ',')} мм²`, Math.ceil(one[m] * 1.2)));
    Object.keys(two).sort((a, b) => a - b).forEach((m) => add('f2' + m, `Наконечник двойной НШВИ2 ${String(m).replace('.', ',')} мм²`, Math.ceil(two[m] * 1.2)));
    /* маркеры покупают по цифрам: на каждый конец провода — по маркеру на каждую цифру номера */
    if (WN(P).show) {
      const dig = {};
      P.wires.forEach((w) => { if (w.num === '' || w.num == null) return; String(w.num).split('').forEach((c) => { dig[c] = (dig[c] || 0) + 2; }); });
      Object.keys(dig).sort().forEach((c) => add('mk' + c, `Маркер провода «${c}»`, dig[c]));
    }
    add('enc', `Корпус на ${P.rows * P.mods} модулей (${P.rows} × ${P.mods}), шаг реек ${P.pitch || 134} мм`, 1);
    return Object.values(rows);
  }

  /* ---------- группы для однолинейной схемы и таблицы ---------- */
  function groups(P) {
    const U = nets(P);
    return P.lines.map((l) => {
      const cs = lineCores(P, l);
      const lc = cs.find((c) => /^L/.test(c));
      const up = upstream(P, U, `l:${l.id}:${lc}`);
      const prot = up.find((d) => d.type === 'mcb' || d.type === 'rcbo');
      const rcd = up.find((d) => d.type === 'rcd');
      return { l, prot, rcd, chain: up };
    });
  }

  const nextId = (P, type, cond) => {
    const p = type === 'dbus' ? (cond === 'PE' ? 'XPE' : 'XN') : PREFIX[type] || 'X';
    const n = P.devs.filter((d) => d.id.startsWith(p) && /^\d+$/.test(d.id.slice(p.length))).map((d) => Number(d.id.slice(p.length)));
    return p + ((n.length ? Math.max(...n) : 0) + 1);
  };
  /* переименовать аппарат во всех ссылках */
  function renameDev(P, from, to) {
    P.wires.forEach((w) => [w.a, w.b].forEach((x) => { if (x.dev === from) x.dev = to; }));
    P.combs.forEach((c) => { c.devs = c.devs.map((x) => (x === from ? to : x)); });
    const d = P.devs.find((x) => x.id === from); if (d) d.id = to;
  }
  /* перенумеровать аппараты слева направо, сверху вниз */
  function renumber(P) {
    const order = P.devs.slice().sort((a, b) => a.row - b.row || a.x - b.x);
    const tmp = order.map((d, i) => { const t = `__${i}`; renameDev(P, d.id, t); return d; });
    const cnt = {};
    tmp.forEach((d) => { const p = d.type === 'dbus' ? (d.cond === 'PE' ? 'XPE' : 'XN') : PREFIX[d.type] || 'X'; cnt[p] = (cnt[p] || 0) + 1; renameDev(P, d.id, p + cnt[p]); });
  }
  /* проверка целостности модели (используется в тестах) */
  function validate(P) {
    const errs = [];
    P.devs.forEach((d) => { if (d.row < 0 || d.row >= P.rows || d.x < -EPS || d.x + d.w > P.mods + EPS) errs.push('out:' + d.id); });
    P.devs.forEach((a, i) => P.devs.slice(i + 1).forEach((b) => { if (a.row === b.row && a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS) errs.push('overlap:' + a.id + '/' + b.id); }));
    if (new Set(P.devs.map((d) => d.id)).size !== P.devs.length) errs.push('dup-id');
    P.wires.forEach((w, i) => { if (!endInfo(P, w.a) || !endInfo(P, w.b)) errs.push('dangling:' + w.id); else if (!route(P, w, i)) errs.push('noroute:' + w.id); });
    P.combs.forEach((c) => {
      const ds = c.devs.map((id) => P.devs.find((d) => d.id === id));
      if (ds.some((d) => !d)) errs.push('comb:' + c.id);
      else if (ds.length < 2 || ds.some((d, i) => i && (d.row !== ds[i - 1].row || Math.abs(ds[i - 1].x + ds[i - 1].w - d.x) > EPS))) errs.push('comb-gap:' + c.id);
    });
    P.buses.forEach((b) => { if (b.x < -EPS || b.x > busMaxX(P, b) + EPS) errs.push('bus-out:' + b.id); });
    ['top', 'bottom'].forEach((z) => { const bs = P.buses.filter((b) => b.zone === z); bs.forEach((a, i) => bs.slice(i + 1).forEach((b) => { if (a.x < b.x + busW(b) && b.x < a.x + busW(a)) errs.push('bus-overlap:' + a.id + '/' + b.id); })); });
    const seen = new Set();
    P.wires.forEach((w) => [w.a, w.b].forEach((e) => { if (e.dev) { const k = keyOf(e); if (!seen.has(k)) { seen.add(k); if (usedAt(P, k) > 2) errs.push('over:' + k); } } }));
    return errs;
  }

  S.edCore = { artOf, faceOf, devName, elements, usedAt, styleOf, exitDir, WN, VIEW, nextWireNum, numberWires, wireLen, WCOL, wireColor, MARK, endName, journal, autoStops, copyDevs, pasteDevs, ductH, pitchOf, railOp, placeBlock, fixCombs, faults, busBad, rcdFaults, ownClass, combGroups, G, PITCHES, PRESETS, PREFIX, COND_COL, FERRULE, SECTIONS, blank, sync, W, H, rowTop, railY, ductTop, devGeo, devH, terms, termNames, busW, busGeo, busSlot, busMaxX, busFree, busPlace, arrangeBuses, balanceBuses, feedCores, feedPt, lineCores, linePt, glandX, endInfo, route, pathLen, keyOf, nets, canWire, guessCond, checks, fromBuilder, bom, groups, nextId, fits, placeShift, placeInsert, resize, autoLine, renameDev, renumber, validate, spec, passPairs };
})();
