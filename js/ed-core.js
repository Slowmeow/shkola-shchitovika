/* Школа щитовика — ядро редактора щита: модель, геометрия в миллиметрах, клеммы, цепи, трассировка проводов по каналам,
   проверки, импорт из конструктора, спецификация и однолинейная схема. Отрисовка — S.edDraw, интерфейс — js/editor.js. */
(function () {
  'use strict';
  const S = window.SHK;

  /* ---------- размеры, мм ---------- */
  const G = { MOD: 17.5, ZONE: 92, DUCT: 42, SD: 34, BUSZ: 28, LANES: 11, LANE: 3.2 };
  const PREFIX = { mcb: 'QF', sw: 'QS', rcd: 'QD', rcbo: 'QFD', rn: 'KV', spd: 'FV', meter: 'PI', xt: 'XT', km: 'KM', blank: 'Z' };
  const COND_COL = { L: 'var(--w-l1)', L1: 'var(--w-l1)', L2: 'var(--w-l2)', L3: 'var(--w-l3)', N: 'var(--w-n)', PE: 'var(--w-pe)', PEN: 'var(--w-pe)' };
  /* цвета наконечников НШВИ по сечению — DIN 46228-4 */
  const FERRULE = { 0.5: '#f4f4f4', 0.75: '#9aa0a6', 1: '#d0312d', 1.5: '#1b1b1b', 2.5: '#2a6cd6', 4: '#9aa0a6', 6: '#e2be14', 10: '#d0312d', 16: '#2a6cd6', 25: '#e2be14', 35: '#d0312d' };
  const SECTIONS = [0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35];

  const blank = () => ({
    v: 1, name: 'Новый щит', rows: 2, mods: 12,
    feed: { phases: 1, earthing: 'TN-C-S' },
    devs: [], buses: [{ id: 'N1', kind: 'N', zone: 'top', x: 6, n: 10 }, { id: 'PE', kind: 'PE', zone: 'bottom', x: 6, n: 12 }],
    wires: [], combs: [], lines: [],
    meta: { object: '', author: '', checker: '', org: '', code: '', stage: 'Р', sheet: 1, sheets: 1, date: '' }
  });

  /* ---------- геометрия ---------- */
  const W = (P) => P.mods * G.MOD + 2 * G.SD;
  const H = (P) => G.BUSZ + G.DUCT + P.rows * (G.ZONE + G.DUCT) + G.BUSZ;
  const rowTop = (i) => G.BUSZ + G.DUCT + i * (G.ZONE + G.DUCT);
  const railY = (i) => rowTop(i) + G.ZONE / 2;
  const ductTop = (k) => G.BUSZ + k * (G.ZONE + G.DUCT); // канал k — над рейкой k, канал rows — под последней
  const lib = () => S.edLib;
  const spec = (d) => (lib() && lib().byId(d.sid)) || null;
  const devH = (d) => (spec(d) && spec(d).h) || 85;
  const devGeo = (d) => { const h = devH(d); return { x: G.SD + d.x * G.MOD + 0.25, y: railY(d.row) - h / 2, w: d.w * G.MOD - 0.5, h }; };

  const termNames = (d) => {
    if (d.type === 'km') { const p = d.poles; const t = ['1', '3', '5', '7'].slice(0, p), b = ['2', '4', '6', '8'].slice(0, p); return { top: t.concat(['A1']), bot: b.concat(['A2']) }; }
    if (d.type === 'blank') return { top: [], bot: [] };
    return S.engine ? S.engine.TERMS(d) : { top: [], bot: [] };
  };
  const terms = (d) => {
    const g = devGeo(d), T = termNames(d), out = [];
    const put = (arr, side) => arr.forEach((t, i) => { if (!t) return; out.push({ t, side, x: g.x + g.w * (i + 0.5) / arr.length, y: side === 'top' ? g.y + 7 : g.y + g.h - 7 }); });
    put(T.top, 'top'); put(T.bot, 'bot');
    return out;
  };
  /* шины: N — в верхней зоне, PE — в нижней; шаг винтов 8 мм */
  const busGeo = (P, b) => { const y = b.zone === 'top' ? G.BUSZ / 2 : H(P) - G.BUSZ / 2; const x = G.SD + b.x; return { x, y, w: 10 + (b.n - 1) * 8 + 10, h: 9 }; };
  const busSlot = (P, b, k) => { const g = busGeo(P, b); return { x: g.x + 10 + k * 8, y: g.y }; };
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
      const p = busSlot(P, b, e.slot || 0);
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
  const laneY = (k, lane, dy) => ductTop(k) + 5 + (lane % G.LANES) * G.LANE + (dy || 0);

  /* трасса: вертикально в канал, по каналу, при смене канала — через боковой канал */
  function route(P, w, idx) {
    const a = endInfo(P, w.a), b = endInfo(P, w.b);
    if (!a || !b) return null;
    const lane = idx % G.LANES;
    const sideLane = 4 + (idx % 7) * 3.6 + (w.dx || 0);
    const pts = [];
    if (a.side === 'feed' || b.side === 'feed') {
      const f = a.side === 'feed' ? a : b, t = a.side === 'feed' ? b : a;
      const ly = laneY(t.duct, lane, w.dy);
      const sx = f.x + (w.dx || 0);
      pts.push([f.x, f.y], [sx, f.y + 4], [sx, ly], [t.x, ly], [t.x, t.y]);
      return a.side === 'feed' ? pts : pts.reverse();
    }
    const lyA = laneY(a.duct, lane, w.dy), lyB = laneY(b.duct, lane, w.dy);
    if (a.duct === b.duct) {
      pts.push([a.x, a.y], [a.x, lyA], [b.x, lyA], [b.x, b.y]);
    } else {
      const left = Math.abs(a.x - 0) + Math.abs(b.x - 0) <= Math.abs(W(P) - a.x) + Math.abs(W(P) - b.x);
      const sx = left ? sideLane : W(P) - sideLane;
      pts.push([a.x, a.y], [a.x, lyA], [sx, lyA], [sx, lyB], [b.x, lyB], [b.x, b.y]);
    }
    return pts;
  }
  const pathLen = (pts) => pts.reduce((s, p, i) => (i ? s + Math.abs(p[0] - pts[i - 1][0]) + Math.abs(p[1] - pts[i - 1][1]) : 0), 0);

  /* ---------- цепи и классы проводников ---------- */
  const keyOf = (e) => (e.dev ? `d:${e.dev}:${e.term}` : e.bus ? `b:${e.bus}` : e.feed ? `f:${e.feed}` : e.line ? `l:${e.line}:${e.core}` : '?');
  function uf() {
    const p = {};
    const f = (x) => { if (p[x] === undefined) p[x] = x; while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; };
    return { find: f, union: (a, b) => { const ra = f(a), rb = f(b); if (ra !== rb) p[ra] = rb; } };
  }
  /* сквозные связи аппарата: верхняя клемма ↔ нижняя (для определения класса проводника) */
  function passPairs(d) {
    const T = termNames(d);
    if (d.type === 'rn') return [['Lin', 'Lout']];
    if (d.type === 'km') return T.top.filter((t) => t !== 'A1').map((t, i) => [t, T.bot[i]]);
    if (d.type === 'xt') return [];
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
    P.devs.filter((d) => d.type === 'xt').forEach((d) => { const T = termNames(d); (d.outs || []).forEach((o, i) => { const src = T.top.find((t) => t.startsWith(o.replace(/out.*/, '').slice(0, 2))) || T.top[o.startsWith('N') ? T.top.length - 1 : 0]; if (T.bot[i]) U.union(`d:${d.id}:${T.bot[i]}`, `d:${d.id}:${src}`); }); });
    if (opt.pass) P.devs.forEach((d) => passPairs(d).forEach(([a, b]) => U.union(`d:${d.id}:${a}`, `d:${d.id}:${b}`)));
    return U;
  }
  const classOf = (k) => (k.startsWith('f:') ? k.slice(2) : k.startsWith('l:') ? k.split(':')[2] : null);
  const busClass = (P, k) => { const b = P.buses.find((x) => 'b:' + x.id === k); return b ? b.kind : null; };
  /* классы, встречающиеся в каждой связной группе (через аппараты) */
  function classes(P, extra) {
    const U = nets(P, { pass: true });
    if (extra) U.union(keyOf(extra.a), keyOf(extra.b));
    const groups = {};
    const add = (k, c) => { if (!c) return; const r = U.find(k); (groups[r] = groups[r] || new Set()).add(c); };
    P.wires.forEach((w) => [w.a, w.b].forEach((e) => { const k = keyOf(e); add(k, classOf(k) || busClass(P, k)); }));
    P.buses.forEach((b) => add('b:' + b.id, b.kind));
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
  /* можно ли добавить провод */
  function canWire(P, w) {
    const ka = keyOf(w.a), kb = keyOf(w.b);
    if (ka === kb) return 'Провод соединяет клемму саму с собой.';
    const combKeys = new Set();
    P.combs.forEach((c) => combGroups(P, c).forEach((ks) => ks.forEach((k) => combKeys.add(k))));
    const used = (k) => P.wires.filter((x) => keyOf(x.a) === k || keyOf(x.b) === k).length + (combKeys.has(k) ? 1 : 0);
    for (const e of [w.a, w.b]) if (e.dev && used(keyOf(e)) >= 2) return `В клемму ${e.dev} «${e.term}» уже заведены два проводника — третий не прижмётся.`;
    for (const e of [w.a, w.b]) if (e.line && P.wires.some((x) => keyOf(x.a) === keyOf(e) || keyOf(x.b) === keyOf(e))) return 'Эта жила кабеля уже подключена.';
    const { U, groups } = classes(P, w);
    const r = U.find(ka);
    return conflict(groups[r] || new Set(), P);
  }
  /* класс проводника для нового провода */
  function guessCond(P, w) {
    const { U, groups } = classes(P, w);
    const set = groups[U.find(keyOf(w.a))];
    if (!set || !set.size) return '';
    const c = [...set];
    return c.find((x) => /^L\d/.test(x)) || c.find((x) => x === 'L') || (c.includes('N') ? 'N' : c.includes('PEN') ? 'PEN' : c.includes('PE') ? 'PE' : '');
  }

  /* ---------- проверки ---------- */
  function upstream(P, U, key, seen = new Set()) {
    // аппараты, через которые цепь питается сверху: ищем нижние клеммы аппаратов в той же цепи
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
    const res = [];
    const add = (level, text, ref) => res.push({ level, text, ref: ref || '' });
    const used = P.devs.reduce((s, d) => s + d.w, 0), cap = P.rows * P.mods;
    P.devs.forEach((d) => { if (d.x + d.w > P.mods + 1e-6) add('err', `${d.id} выходит за край рейки ${d.row + 1}.`); });
    const free = cap ? (cap - used) / cap : 0;
    add(free < 0.15 ? 'warn' : 'ok', `Занято ${S.fmt(used, 1)} из ${cap} модулей, свободно ${Math.round(free * 100)} %${free < 0.15 ? ' — запаса меньше 15 %, новую линию ставить будет некуда' : ''}.`);
    const per = {};
    P.wires.forEach((w) => [w.a, w.b].forEach((e) => { if (e.dev) { const k = keyOf(e); per[k] = (per[k] || 0) + 1; } }));
    Object.entries(per).forEach(([k, n]) => { if (n > 2) add('err', `Клемма ${k.slice(2).replace(':', ' «')}» — ${n} проводника; больше двух одинаковых сечений не заводят.`); });
    const { U: Uc, groups } = classes(P);
    Object.values(groups).forEach((set) => { const m = conflict(set, P); if (m) add('err', m); });
    const U = nets(P);
    const inp = P.devs.filter((d) => ['mcb', 'sw'].includes(d.type)).find((d) => termNames(d).top.some((t) => P.wires.some((w) => (w.a.feed && keyOf(w.b) === `d:${d.id}:${t}`) || (w.b.feed && keyOf(w.a) === `d:${d.id}:${t}`))));
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
      }
      if (cs.includes('PE') && !conn('PE')) add('warn', `Линия ${l.num} «${l.name}»: PE кабеля не подключён.`);
    });
    P.devs.filter((d) => d.type === 'rcd').forEach((d) => {
      const T = termNames(d);
      const down = P.devs.filter((x) => (x.type === 'mcb') && termNames(x).top.some((t) => U.find(`d:${x.id}:${t}`) === U.find(`d:${d.id}:${T.bot[0]}`)));
      const up = upstream(P, nets(P, {}), `d:${d.id}:${T.top[0]}`).find((x) => x.type === 'mcb');
      const sum = down.reduce((s, x) => s + (x.In || 0), 0);
      if (down.length && !(up && up.In <= d.In) && sum > d.In) add('warn', `${d.id} ${d.In} А: сумма автоматов после него ${sum} А, а автомата не больше ${d.In} А выше нет — проверь защиту УЗО от перегрузки.`, 'ПУЭ п. 7.1.76');
    });
    if (!P.lines.length) add('warn', 'Не добавлено ни одной отходящей линии — проверки защиты линий не выполнялись.');
    void Uc;
    return res;
  }

  /* ---------- импорт из конструктора ---------- */
  const BRAND_SID = {
    ekf: { mcb: 'ekf-av6', rcd: 'ekf-vd100n', rcbo2: 'ekf-dva6', rcbo4: 'ekf-avdt63n', sw: 'ekf-vn63n', spd: 'ekf-opvc', rn: 'ekf-rvb', xt: 'ekf-cm' },
    iek: { mcb: 'iek-va4729', rcd: 'iek-vd163', rcbo2: 'iek-avdt32', rcbo4: 'iek-avdt34', sw: 'iek-vn32', spd: 'iek-ops1', rn: 'iek-rnd', xt: 'ekf-cm' },
    abb: { mcb: 'abb-s200', rcd: 'abb-f200', rcbo2: 'abb-ds200', rcbo4: 'ekf-avdt63n', sw: 'abb-sd200', spd: 'abb-ovr', rn: 'ekf-rvb', xt: 'ekf-cm' },
    se: { mcb: 'se-ez9f', rcd: 'se-ez9r', rcbo2: 'iek-avdt32', rcbo4: 'ekf-avdt63n', sw: 'se-ez9s', spd: 'ekf-opvc', rn: 'ekf-rvb', xt: 'ekf-cm' }
  };
  function fromBuilder(R, brand = 'ekf') {
    const cfg = R.cfg || {};
    const map = BRAND_SID[brand] || BRAND_SID.ekf;
    const P = blank();
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
    let xt = 4, xb = 4;
    P.buses = R.buses.map((b) => { const n = Math.max(b.terms.length + 2, 6); const zone = b.kind === 'PE' ? 'bottom' : 'top'; const x = zone === 'top' ? xt : xb; const o = { id: b.id, kind: b.kind, zone, x, n }; const wmm = 20 + (n - 1) * 8 + 6; if (zone === 'top') xt += wmm; else xb += wmm; return o; });
    P.lines = R.lines.map((l) => ({ id: l.id, num: l.num, name: l.name, cable: `${l.cableMark} ${l.cores}×${String(l.s).replace('.', ',')}`, len: l.len, ph: l.ph, cores: l.ph === 3 && R.three ? (l.noN ? ['L1', 'L2', 'L3', 'PE'] : ['L1', 'L2', 'L3', 'N', 'PE']) : ['L', 'N', 'PE'], mm2: l.s }));
    const slot = {};
    const end = (e) => {
      if (e.dev) return { dev: e.dev, term: e.term };
      if (e.bus) return { bus: e.bus, slot: e.slot };
      if (e.ext === 'input') return { feed: e.cond === 'L' && R.three ? 'L1' : e.cond };
      if (e.ext === 'line') { const ln = P.lines.find((x) => x.id === e.line); const core = ln && !ln.cores.includes(e.cond) && /^L/.test(e.cond) ? (ln.cores.find((c) => /^L/.test(c)) || e.cond) : e.cond; return { line: e.line, core }; }
      return null;
    };
    P.wires = R.wires.map((w) => ({ id: w.id, a: end(w.from), b: end(w.to), cond: w.cond, mm2: w.mm2 })).filter((w) => w.a && w.b);
    void slot;
    P.combs = (R.combs || []).map((c) => ({ id: c.id, devs: c.devs.slice(), conds: c.conds.slice() }));
    P.meta.object = cfg.name || '';
    const W0 = W(P);
    const need = Math.max(...P.buses.map((b) => G.SD + b.x + 20 + (b.n - 1) * 8 + 6), 0);
    if (need > W0) P.buses.forEach((b, i) => { b.x = 4 + (i % 2) * ((W0 - 2 * G.SD) / 2); });
    return P;
  }

  /* ---------- спецификация ---------- */
  function bom(P) {
    const rows = {};
    const add = (k, name, n, unit) => { rows[k] = rows[k] || { name, qty: 0, unit: unit || 'шт' }; rows[k].qty += n; };
    P.devs.forEach((d) => {
      const s = spec(d) || {};
      const br = (lib().BRANDS[s.brand] || {}).name || '';
      const parts = [br, s.series || d.type, d.poles ? d.poles + 'P' : '', d.curve ? d.curve + (d.In || '') : d.In ? d.In + ' А' : '', d.ma ? d.ma + ' мА' : '', d.rt ? 'тип ' + d.rt : ''].filter(Boolean);
      add('d' + parts.join('|'), parts.join(' '), 1);
    });
    P.combs.forEach((c) => add('comb' + c.conds.length, `Шина гребёнчатая ${c.conds.length === 3 ? '3P' : '1P'} (отрезок)`, 1));
    P.buses.forEach((b) => add('bus' + b.kind + b.n, `Шина ${b.kind === 'PE' ? 'PE' : 'N'} на ${b.n} отверстий`, 1));
    const lens = {}, ferr = {};
    P.wires.forEach((w, i) => {
      const pts = route(P, w, i);
      if (!pts) return;
      const k = (w.cond || '?') + '|' + (w.mm2 || 2.5);
      lens[k] = (lens[k] || 0) + pathLen(pts) / 1000 + 0.1;
      [w.a, w.b].forEach((e) => { if (e.dev || e.bus) ferr[w.mm2 || 2.5] = (ferr[w.mm2 || 2.5] || 0) + 1; });
    });
    const col = { L: 'коричневый', L1: 'коричневый', L2: 'чёрный', L3: 'серый', N: 'синий', PE: 'жёлто-зелёный', PEN: 'жёлто-зелёный с синими метками', '?': 'цвет по назначению' };
    Object.keys(lens).sort().forEach((k) => { const [c, m] = k.split('|'); add('w' + k, `Провод ПуГВ ${String(m).replace('.', ',')} мм², ${col[c] || c}`, Math.ceil(lens[k] * 1.2 * 10) / 10, 'м'); });
    Object.keys(ferr).sort((a, b) => a - b).forEach((m) => add('f' + m, `Наконечник НШВИ ${String(m).replace('.', ',')} мм²`, Math.ceil(ferr[m] * 1.2)));
    add('enc', `Корпус на ${P.rows * P.mods} модулей (${P.rows} × ${P.mods})`, 1);
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

  const nextId = (P, type) => {
    const p = PREFIX[type] || 'X';
    const n = P.devs.filter((d) => d.id.startsWith(p) && /^\d+$/.test(d.id.slice(p.length)) && (p !== 'QF' || !d.id.startsWith('QFD'))).map((d) => Number(d.id.slice(p.length)));
    return p + ((n.length ? Math.max(...n) : 0) + 1);
  };
  const fits = (P, row, x, w, ignore) => x >= -1e-6 && x + w <= P.mods + 1e-6 && row >= 0 && row < P.rows && !P.devs.some((d) => d.id !== ignore && d.row === row && x < d.x + d.w - 1e-6 && d.x < x + w - 1e-6);
  /* поставить с раздвижкой соседей вправо */
  function placeShift(P, row, x, w, ignore) {
    if (fits(P, row, x, w, ignore)) return true;
    const rowDevs = P.devs.filter((d) => d.row === row && d.id !== ignore).sort((a, b) => a.x - b.x);
    const after = rowDevs.filter((d) => d.x + d.w > x + 1e-6);
    const before = rowDevs.filter((d) => d.x + d.w <= x + 1e-6);
    if (before.some((d) => d.x + d.w > x + 1e-6)) return false;
    let cur = x + w;
    const moves = [];
    for (const d of after) { const nx = Math.max(d.x, cur); moves.push([d, nx]); cur = nx + d.w; }
    if (cur > P.mods + 1e-6) return false;
    moves.forEach(([d, nx]) => { d.x = nx; });
    return true;
  }

  S.edCore = { combGroups, G, PREFIX, COND_COL, FERRULE, SECTIONS, blank, W, H, rowTop, railY, ductTop, devGeo, devH, terms, termNames, busGeo, busSlot, feedCores, feedPt, lineCores, linePt, glandX, endInfo, route, pathLen, keyOf, nets, canWire, guessCond, checks, fromBuilder, bom, groups, nextId, fits, placeShift, spec };
})();
