/* Школа щитовика — движок конструктора щита.
   Вход: конфигурация (ввод + линии). Выход: аппараты, раскладка по рейкам, шины, гребёнки,
   провода «клемма → клемма», шаги сборки, проверки по нормам, спецификация.
   Клеммы: верхние — 'L', 'N', 'L1'…; нижние — те же с '>' ('L>', 'N>'). Особые аппараты — см. TERMS. */
(function () {
  'use strict';
  const S = window.SHK;
  const K = S.K;
  const SQ3 = Math.sqrt(3);
  const RHO = 0.0225;
  const PH = ['L1', 'L2', 'L3'];
  const fmt = (n, d) => S.fmt(n, d == null ? 1 : d);
  const sec = (s) => String(s).replace('.', ',');

  /* ---------- каталог потребителей ---------- */
  const KINDS = {
    light: { name: 'Освещение', icon: 'lamp', p: 0.5, ph: 1, cos: 0.95, sec: 1.5, brk: 10, rcd: 'no', kc: 0.8, len: 20 },
    'light-out': { name: 'Уличное освещение', icon: 'sun', p: 0.4, ph: 1, cos: 0.95, sec: 1.5, brk: 10, rcd: 'must', room: 'out', kc: 1, len: 30 },
    sockets: { name: 'Розетки комнаты', icon: 'plug', p: 2.5, ph: 1, cos: 0.95, sec: 2.5, brk: 16, rcd: 'must', kc: 0.3, len: 20 },
    'sockets-kitchen': { name: 'Розетки кухни', icon: 'kitchen', p: 3, ph: 1, cos: 0.95, sec: 2.5, brk: 16, rcd: 'must', kc: 0.4, len: 15 },
    'sockets-work': { name: 'Розетки рабочих мест', icon: 'office', p: 2, ph: 1, cos: 0.95, sec: 2.5, brk: 16, rcd: 'must', kc: 0.6, len: 25 },
    'sockets-out': { name: 'Розетки на улице', icon: 'plug', p: 2, ph: 1, cos: 0.95, sec: 2.5, brk: 16, rcd: 'must', room: 'out', kc: 0.3, len: 25 },
    stove1: { name: 'Электроплита (1 фаза)', icon: 'stove', p: 7, ph: 1, cos: 1, sec: 6, brk: 32, rcd: 'rec', rt: 'A', ded: true, kc: 0.65, len: 10 },
    stove3: { name: 'Электроплита (3 фазы)', icon: 'stove', p: 9, ph: 3, cos: 1, sec: 2.5, brk: 16, rcd: 'rec', rt: 'A', ded: true, kc: 0.65, len: 10 },
    hob: { name: 'Варочная панель', icon: 'stove', p: 6.5, ph: 1, cos: 1, sec: 4, brk: 25, rcd: 'rec', rt: 'A', ded: true, kc: 0.65, len: 10 },
    oven: { name: 'Духовой шкаф', icon: 'oven', p: 3.5, ph: 1, cos: 1, sec: 2.5, brk: 16, rcd: 'rec', rt: 'A', ded: true, kc: 0.6, len: 10 },
    dishwasher: { name: 'Посудомоечная машина', icon: 'dish', p: 2.2, ph: 1, cos: 0.95, sec: 2.5, brk: 16, rcd: 'must', rt: 'A', ded: true, kc: 0.5, len: 10 },
    washer: { name: 'Стиральная машина', icon: 'washer', p: 2.3, ph: 1, cos: 0.95, sec: 2.5, brk: 16, rcd: 'must', rt: 'A', ded: true, kc: 0.5, len: 12 },
    dryer: { name: 'Сушильная машина', icon: 'washer', p: 2.5, ph: 1, cos: 0.95, sec: 2.5, brk: 16, rcd: 'must', rt: 'A', ded: true, kc: 0.5, len: 12 },
    boiler: { name: 'Водонагреватель (бойлер)', icon: 'boiler', p: 2, ph: 1, cos: 1, sec: 2.5, brk: 16, rcd: 'must', ded: true, kc: 0.8, len: 12 },
    'flow-heater': { name: 'Проточный водонагреватель', icon: 'flow', p: 7, ph: 1, cos: 1, sec: 6, brk: 32, rcd: 'must', ded: true, kc: 0.8, len: 10 },
    floor: { name: 'Тёплый пол', icon: 'floor', p: 1.5, ph: 1, cos: 1, sec: 2.5, brk: 16, rcd: 'must', kc: 0.7, len: 15 },
    ac: { name: 'Кондиционер', icon: 'snow', p: 1.5, ph: 1, cos: 0.9, sec: 2.5, brk: 16, rcd: 'rec', rt: 'A', kc: 0.7, len: 15 },
    'boiler-el': { name: 'Электрокотёл (3 фазы)', icon: 'flame', p: 9, ph: 3, cos: 1, sec: 2.5, brk: 16, rcd: 'rec', rt: 'A', ded: true, kc: 1, len: 10 },
    pump: { name: 'Насос / скважина', icon: 'pump', p: 1.1, ph: 1, cos: 0.8, sec: 2.5, brk: 16, rcd: 'must', ded: true, kc: 0.8, len: 30 },
    sauna: { name: 'Электрокаменка (3 фазы)', icon: 'flame', p: 9, ph: 3, cos: 1, sec: 2.5, brk: 16, rcd: 'rec', ded: true, kc: 1, len: 15, note: 'К каменке — термостойкий кабель (РКГМ, ПРКА и т.п.) по паспорту печи.' },
    garage: { name: 'Гараж / мастерская', icon: 'garage', p: 3.5, ph: 1, cos: 0.9, sec: 2.5, brk: 16, rcd: 'must', room: 'wet', kc: 0.4, len: 30 },
    ev: { name: 'Зарядка электромобиля', icon: 'car', p: 7.4, ph: 1, cos: 1, sec: 10, brk: 40, rcd: 'must', rt: 'A', ded: true, kc: 1, len: 20, note: 'Нужна защита от постоянного тока утечки 6 мА: УЗО тип B или тип A + встроенная защита зарядной станции (RDC-DD). Смотри паспорт станции.' },
    gate: { name: 'Ворота / автоматика', icon: 'gate', p: 0.5, ph: 1, cos: 0.85, sec: 2.5, brk: 10, rcd: 'must', room: 'out', kc: 0.3, len: 30 },
    fire: { name: 'Пожарная / охранная сигнализация', icon: 'bell', p: 0.1, ph: 1, cos: 1, sec: 1.5, brk: 6, rcd: 'forbid', kc: 1, len: 20, cable: 'ВВГнг(А)-FRLS', note: 'Без УЗО и до реле напряжения (ПУЭ 7.1.81). Кабель огнестойкий FRLS (СП 6.13130).' },
    server: { name: 'Серверная / ИБП', icon: 'server', p: 1, ph: 1, cos: 0.95, sec: 2.5, brk: 16, rcd: 'rec', rt: 'A', ded: true, kc: 1, len: 15 },
    fridge: { name: 'Холодильник', icon: 'fridge', p: 0.3, ph: 1, cos: 0.85, sec: 2.5, brk: 16, rcd: 'must', kc: 1, len: 10 },
    motor3: { name: 'Двигатель / станок (3 фазы)', icon: 'motor', p: 4, ph: 3, cos: 0.82, eff: 0.85, sec: 2.5, brk: 16, curve: 'D', rcd: 'no', noN: true, kc: 0.7, len: 20 },
    feeder1: { name: 'Питание другого щита (1ф)', icon: 'feeder', p: 7, ph: 1, cos: 0.95, sec: 6, brk: 32, rcd: 'no', kc: 0.8, len: 15 },
    feeder3: { name: 'Питание другого щита (3ф)', icon: 'feeder', p: 15, ph: 3, cos: 0.95, sec: 6, brk: 25, rcd: 'no', kc: 0.8, len: 15 },
    spare: { name: 'Резерв', icon: 'plus', p: 0, ph: 1, cos: 1, sec: 2.5, brk: 16, rcd: 'no', kc: 0, len: 0 },
    custom: { name: 'Своя линия', icon: 'dot', p: 1, ph: 1, cos: 0.95, sec: 2.5, brk: 16, rcd: 'rec', kc: 0.5, len: 15 }
  };
  const KIND_GROUPS = [
    ['Свет', ['light', 'light-out']],
    ['Розетки', ['sockets', 'sockets-kitchen', 'sockets-work', 'sockets-out', 'garage']],
    ['Кухня', ['stove1', 'stove3', 'hob', 'oven', 'dishwasher', 'fridge']],
    ['Вода, тепло, климат', ['washer', 'dryer', 'boiler', 'flow-heater', 'floor', 'ac', 'boiler-el', 'sauna', 'pump']],
    ['Прочее', ['ev', 'gate', 'fire', 'server', 'motor3', 'feeder1', 'feeder3', 'spare', 'custom']]
  ];
  const ROOMS = { dry: 'обычное помещение', kitchen: 'кухня', bath: 'ванная / душ', out: 'улица', wet: 'сырое (гараж, подвал)' };
  const OBJECTS = { flat: 'Квартира', house: 'Частный дом', dacha: 'Дача', office: 'Офис', shop: 'Магазин / кафе', garage: 'Гараж / мастерская', other: 'Другое' };
  const EARTH = {
    'TN-C-S': 'TN-C-S — N и PE приходят раздельно',
    'TN-S': 'TN-S — N и PE раздельно от подстанции',
    'TN-C>S': 'Делю PEN в этом щите (дом от ВЛ)',
    'TT': 'TT — свой заземлитель',
    'TN-C': 'TN-C — старый дом, PE нет'
  };

  /* клеммы аппаратов: верх / низ, слева направо */
  const TERMS = (d) => {
    const pp = (n) => n === 1 ? ['L'] : n === 2 ? ['L', 'N'] : n === 3 ? ['L1', 'L2', 'L3'] : ['L1', 'L2', 'L3', 'N'];
    switch (d.type) {
      case 'mcb': case 'sw': { const t = pp(d.poles); return { top: t, bot: t.map((x) => x + '>') }; }
      case 'rcd': { const t = d.poles === 4 ? ['L1', 'L2', 'L3', 'N'] : ['L', 'N']; return { top: t, bot: t.map((x) => x + '>') }; }
      case 'rcbo': { const t = d.compact ? ['N', 'L'] : ['L', 'N']; return { top: t, bot: t.map((x) => x + '>') }; }
      case 'rn': return { top: ['N', 'Lin'], bot: ['', 'Lout'] };
      case 'spd': return { top: d.poles === 1 ? ['L'] : d.poles === 2 ? ['L', 'N'] : d.poles === 3 ? ['L1', 'L2', 'L3'] : ['L1', 'L2', 'L3', 'N'], bot: ['PE'] };
      case 'meter': if (d.mount === 'panel') return { top: [], bot: d.poles === 3 ? ['1', '3', '4', '6', '7', '9', '10', '12'] : ['1', '2', '3', '4'] };
        return d.poles === 3 ? { top: ['1', '4', '7', '10'], bot: ['3', '6', '9', '12'] } : { top: ['1', '3'], bot: ['2', '4'] };
      case 'xt': return { top: d.poles === 4 ? ['L1in', 'L2in', 'L3in', 'Nin'] : ['Lin', 'Nin'], bot: d.outs || [] };
      default: return { top: [], bot: [] };
    }
  };

  /* ---------- конфигурация ---------- */
  const uid = () => Math.random().toString(36).slice(2, 8);
  const L = (kind, name, extra) => Object.assign({ id: uid(), kind, name: name || KINDS[kind].name, p: KINDS[kind].p, ph: KINDS[kind].ph, len: KINDS[kind].len, room: KINDS[kind].room || 'dry', rcd: 'auto', dev: { type: 'auto', in: 'auto', curve: 'auto', ma: 'auto', rt: 'auto' }, phase: 'auto' }, extra || {});
  const defaultCfg = () => ({
    v: 1, name: 'Двухкомнатная квартира', object: 'flat', phases: 1, kw: 10, earthing: 'TN-C-S', overhead: false,
    meter: 'none', input: { kind: 'auto', rating: 'auto' }, rn: 'auto', spd: 'auto', fire: 'auto', scheme: 'auto', compact: false, wide: false, reserve: 25, zext: 0.4,
    lines: [
      L('light', 'Свет: комнаты'), L('light', 'Свет: кухня, коридор, ванная'),
      L('sockets', 'Розетки: комната 1'), L('sockets', 'Розетки: комната 2'),
      L('sockets-kitchen', 'Розетки: кухня, стол'), L('sockets-kitchen', 'Розетки: кухня, техника'),
      L('stove1'), L('washer', 'Стиральная машина', { room: 'bath' }), L('boiler', 'Бойлер и розетка ванной', { room: 'bath' }), L('ac', 'Кондиционеры')
    ]
  });

  const nextStd = (arr, v) => arr.find((x) => x >= v - 1e-9);
  const curOf = (p, ph, cos, eff) => ph === 3 ? p * 1000 / (SQ3 * 400 * (cos || 1) * (eff || 1)) : p * 1000 / (230 * (cos || 1) * (eff || 1));
  const vdropPct = (I, len, s, ph) => ph === 3 ? SQ3 * I * RHO * len / s / 400 * 100 : 2 * I * RHO * len / s / 230 * 100;
  const leakOf = (I, len) => 0.4 * I + 0.01 * len;
  const PREFIX = { mcb: 'QF', sw: 'QS', rcd: 'QD', rcbo: 'QFD', rn: 'KV', spd: 'FV', meter: 'PI', xt: 'XT' };

  function normalize(c) {
    const d = defaultCfg();
    const cfg = Object.assign({}, d, c || {});
    cfg.input = Object.assign({}, d.input, (c && c.input) || {});
    cfg.phases = Number(cfg.phases) === 3 ? 3 : 1;
    cfg.kw = Math.max(1, Number(cfg.kw) || 10);
    cfg.reserve = S.clamp(Number(cfg.reserve) || 0, 0, 60);
    cfg.zext = Number(cfg.zext) || (cfg.overhead ? 0.8 : 0.4);
    cfg.lines = ((c && c.lines) || d.lines).map((l) => {
      const k = KINDS[l.kind] ? l.kind : 'custom';
      const out = Object.assign(L(k), l, { kind: k });
      out.dev = Object.assign({ type: 'auto', in: 'auto', curve: 'auto', ma: 'auto', rt: 'auto' }, l.dev || {});
      out.p = Math.max(0, Number(out.p) || 0);
      out.len = Math.max(0, Number(out.len) || 0);
      out.ph = Number(out.ph) === 3 ? 3 : 1;
      return out;
    });
    return cfg;
  }

  function build(cfgIn) {
    const cfg = normalize(cfgIn);
    const R = { cfg, lines: [], units: [], devices: [], buses: [], combs: [], wires: [], cables: [], steps: [], checks: [], bom: [], totals: {}, phaseLoad: { L1: 0, L2: 0, L3: 0 }, notes: [] };
    const chk = (level, text, ref) => R.checks.push({ level, text, ref: ref || '' });
    const three = cfg.phases === 3;
    const E = cfg.earthing;
    const obj = cfg.object;
    const cond = (p) => (three ? p : 'L');

    /* 1. линии */
    cfg.lines.forEach((l, idx) => {
      const k = KINDS[l.kind];
      let ph = l.ph;
      if (ph === 3 && !three) { ph = 1; chk('err', `«${l.name}»: трёхфазный потребитель, а ввод однофазный. Посчитал как однофазный — уточни подключение по паспорту.`); }
      const I = curOf(l.p, ph, k.cos, k.eff);
      const userIn = l.dev.in !== 'auto';
      let In = userIn ? Number(l.dev.in) : Math.max(k.brk, nextStd(K.mcb, Math.max(I, 1)) || 125);
      let curve = l.dev.curve !== 'auto' ? l.dev.curve : (k.curve || 'C');
      let s = l.sec && l.sec !== 'auto' ? Number(l.sec) : Math.max(k.sec, K.secFor(In) || 50);
      const notes = [];
      const lim = (l.kind === 'light' || l.kind === 'light-out') ? 3 : 4;
      let du = l.len ? vdropPct(I, l.len, s, ph) : 0;
      while (du > lim && s < 50 && l.len) { s = K.sections.find((x) => x > s); du = vdropPct(I, l.len, s, ph); notes.push('сечение увеличено из-за длины линии (потеря напряжения)'); }
      let ik = 230 / (cfg.zext + 2 * RHO * l.len / s);
      if (l.kind !== 'spare' && l.len && ik < K.kMag[curve] * In) {
        if (l.dev.curve === 'auto' && curve === 'C' && ik >= K.kMag.B * In) { curve = 'B'; notes.push('характеристика B: на длинной линии мал ток КЗ'); }
        let guard = 0;
        while (ik < K.kMag[curve] * In && s < 16 && guard++ < 6) { s = K.sections.find((x) => x > s); ik = 230 / (cfg.zext + 2 * RHO * l.len / s); notes.push('сечение увеличено: ток КЗ должен отключаться мгновенно'); }
      }
      const maxIn = K.maxFor(s) || 125;
      const room = l.room || k.room || 'dry';
      let needRcd;
      if (l.rcd === 'yes') needRcd = true;
      else if (l.rcd === 'no') needRcd = false;
      else needRcd = k.rcd === 'must' || k.rcd === 'rec' || room === 'bath' || room === 'out' || room === 'wet';
      if (k.rcd === 'forbid' && l.rcd !== 'yes') needRcd = false;
      if (E === 'TT' && k.rcd !== 'forbid' && l.kind !== 'spare') needRcd = true;
      if ((l.kind === 'spare' || l.kind === 'feeder1' || l.kind === 'feeder3') && l.rcd !== 'yes') needRcd = false;
      const ma = l.dev.ma !== 'auto' ? Number(l.dev.ma) : (room === 'bath' ? 10 : 30);
      const rt = l.dev.rt !== 'auto' ? l.dev.rt : (k.rt || 'AC');
      const line = {
        id: l.id, idx, kind: l.kind, k, name: l.name || k.name, p: l.p, ph, I, In, curve, s, len: l.len, du, ik, need: K.kMag[curve] * In,
        room, rcd: needRcd, ma, rt, notes: Array.from(new Set(notes)), userDev: l.dev, userPhase: l.phase, maxIn,
        cableMark: k.cable || 'ВВГнг(А)-LS', cores: ph === 3 ? (k.noN ? 4 : 5) : 3, noN: !!k.noN, num: idx + 1
      };
      if (In > maxIn) chk('err', `«${line.name}»: автомат ${curve}${In} больше, чем выдерживает кабель ${sec(s)} мм² (до ${maxIn} А). Сначала кабель — потом автомат.`, 'ПУЭ 3.1, табл. 1.3.4');
      if (I > In && l.kind !== 'spare') chk('warn', `«${line.name}»: расчётный ток ${fmt(I)} А больше номинала автомата ${In} А — линия будет отключаться. Раздели нагрузку или проверь мощность.`);
      if (du > lim) chk('warn', `«${line.name}»: потеря напряжения ${fmt(du)} % (норма до ${lim} %). Увеличь сечение или сократи длину.`, 'СП 256 8.23');
      if (l.len && ik < K.kMag[curve] * In && l.kind !== 'spare') chk('warn', `«${line.name}»: ток КЗ в конце линии ≈ ${fmt(ik, 0)} А, а для мгновенного отключения ${curve}${In} нужно ≥ ${fmt(K.kMag[curve] * In, 0)} А. Нужно больше сечение, характеристика B или защита УЗО.`, 'ПУЭ 1.7.79');
      if (k.rcd === 'forbid' && needRcd) chk('err', `«${line.name}»: на пожарную сигнализацию УЗО ставить нельзя.`, 'ПУЭ 7.1.81');
      if ((k.rcd === 'must' || room === 'bath' || room === 'out') && !needRcd && k.rcd !== 'forbid') chk('err', `«${line.name}»: розеточные, уличные и «мокрые» линии защищают УЗО не более 30 мА.`, 'ПУЭ 7.1.79, 7.1.82');
      if (l.kind === 'stove1' && s < 6) chk('warn', `«${line.name}»: для однофазной электроплиты по СП 256 — медь не менее 6 мм².`, 'СП 256 10.2');
      if (l.kind === 'stove1' && l.p > 7.5) chk('warn', `«${line.name}»: ${fmt(l.p)} кВт на одной фазе — ${fmt(I, 0)} А. Плиту такой мощности обычно подключают на 2–3 фазы.`);
      if (k.note) R.notes.push(`${line.name}: ${k.note}`);
      R.lines.push(line);
    });

    /* 2. ввод */
    const Iallow = three ? cfg.kw * 1000 / (SQ3 * 400) : cfg.kw * 1000 / 230;
    const inKind = cfg.input.kind === 'sw' ? 'sw' : 'mcb';
    const inRating = cfg.input.rating !== 'auto' ? Number(cfg.input.rating) : nextStd(K.mcb, Iallow * 0.97) || 125;
    const inPoles = three ? (E === 'TT' ? 4 : 3) : 2;
    const inCurve = cfg.input.curve || 'C';
    const inSec = K.secFor(inRating) || 50;
    const jSec = inSec;
    // расчётная мощность: установленная × Кс (грубая оценка по установленной мощности), не меньше самого мощного потребителя
    let Pinst = 0, Pmax = 0;
    R.lines.forEach((l) => { Pinst += l.p; Pmax = Math.max(Pmax, l.p); });
    const kcOf = (p) => p <= 5 ? 0.8 : p <= 10 ? 0.65 : p <= 15 ? 0.55 : p <= 25 ? 0.45 : p <= 40 ? 0.4 : 0.35;
    const kc = kcOf(Pinst);
    const Pcalc = Math.max(Pinst * kc, Math.min(Pinst, Pmax));
    const Icalc = three ? Pcalc * 1000 / (SQ3 * 400 * 0.95) : Pcalc * 1000 / (230 * 0.95);
    R.totals = { Pinst, Pcalc, Icalc, Iallow, inRating, kc };
    const wantRN = cfg.rn === 'yes' || (cfg.rn === 'auto' && obj !== 'office' && obj !== 'shop' && obj !== 'other');
    const wantSPD = cfg.spd === 'yes' || (cfg.spd === 'auto' && (cfg.overhead || obj === 'house' || obj === 'dacha'));
    const wantFire = cfg.fire === 'yes' || (cfg.fire === 'auto' && (obj === 'house' || obj === 'dacha' || E === 'TT'));
    const meterMode = cfg.meter || 'none';

    /* 3. как защищать линии */
    R.lines.forEach((l) => {
      if (l.k.rcd === 'forbid' && !l.rcd) { l.how = 'forbid'; return; }
      if (!l.rcd) { l.how = l.ph === 3 ? 'mcb3' : 'mcb'; return; }
      if (l.ph === 3) { l.how = 'grp4'; return; }
      if (l.userDev.type === 'rcbo') { l.how = 'rcbo'; return; }
      if (l.userDev.type === 'mcb') { l.how = 'grp'; return; }
      if (cfg.scheme === 'rcbo') l.how = 'rcbo';
      else if (cfg.scheme === 'rcd') l.how = 'grp';
      else l.how = (l.ma === 10 || l.In >= 25 || l.k.ded || l.room === 'out' || l.room === 'bath') ? 'rcbo' : 'grp';
    });

    /* 4. группы УЗО */
    const groups = [];
    const byKey = {};
    R.lines.filter((l) => l.how === 'grp').forEach((l) => {
      const key = l.ma + '|' + l.rt + '|' + (three && l.userPhase !== 'auto' ? l.userPhase : '');
      (byKey[key] = byKey[key] || []).push(l);
    });
    Object.keys(byKey).forEach((key) => {
      let cur = null;
      const nk = byKey[key].length;
      const maxPer = three ? Math.min(4, Math.max(2, Math.ceil(nk / 3))) : 4; // в 3ф — делим на группы, чтобы разнести по фазам
      byKey[key].forEach((l) => {
        const leak = leakOf(l.I * Math.max(l.k.kc, 0.3), l.len);
        if (!cur || cur.lines.length >= maxPer || cur.leak + leak > l.ma / 3) { cur = { lines: [], leak: 0, ma: l.ma, rt: l.rt, forced: key.split('|')[2] || null }; groups.push(cur); }
        cur.lines.push(l); cur.leak += leak;
      });
    });
    groups.forEach((g) => { if (g.lines.length === 1 && cfg.scheme === 'auto') { g.lines[0].how = 'rcbo'; g.dissolved = true; } });
    const rGroups = groups.filter((g) => !g.dissolved);

    /* 5. единицы и фазы */
    const units = [];
    const load = { L1: 0, L2: 0, L3: 0 };
    const addLoad = (ph, kw) => { if (ph === 'L123') PH.forEach((p) => { load[p] += kw / 3; }); else load[ph] += kw; };
    const least = () => PH.slice().sort((a, b) => load[a] - load[b])[0];
    const lkw = (l) => l.p * l.k.kc;
    R.lines.filter((l) => l.how === 'grp4').forEach((l) => { l.phase = three ? 'L123' : 'L'; units.push({ type: 'grp4', lines: [l], phases: three ? PH : ['L'] }); addLoad(three ? 'L123' : 'L1', lkw(l)); });
    const m3 = R.lines.filter((l) => l.how === 'mcb3');
    if (m3.length) { m3.forEach((l) => { l.phase = 'L123'; addLoad('L123', lkw(l)); }); units.push({ type: 'mcb3', lines: m3, phases: PH }); }
    rGroups.slice().sort((a, b) => b.lines.reduce((s, l) => s + lkw(l), 0) - a.lines.reduce((s, l) => s + lkw(l), 0)).forEach((g) => {
      const ph = three ? (g.forced || least()) : 'L1';
      g.lines.forEach((l) => { l.phase = ph; });
      units.push({ type: 'grp', g, lines: g.lines, phases: [ph] });
      addLoad(ph, g.lines.reduce((s, l) => s + lkw(l), 0));
    });
    const makeBlocks = (lines, type) => {
      if (!lines.length) return;
      if (!three) { lines.forEach((l) => { l.phase = 'L1'; }); units.push({ type, lines, phases: ['L1'] }); addLoad('L1', lines.reduce((s, l) => s + lkw(l), 0)); return; }
      const fixed = lines.filter((l) => l.userPhase !== 'auto');
      const free = lines.filter((l) => l.userPhase === 'auto').sort((a, b) => lkw(b) - lkw(a));
      fixed.forEach((l) => { l.phase = l.userPhase; addLoad(l.phase, lkw(l)); units.push({ type, lines: [l], phases: [l.phase] }); });
      if (free.length >= 3) {
        const order = PH.slice().sort((a, b) => load[a] - load[b]);
        free.forEach((l, i) => { l.phase = order[i % 3]; addLoad(l.phase, lkw(l)); });
        units.push({ type, lines: free, phases: order, cyclic: true });
      } else free.forEach((l) => { l.phase = least(); addLoad(l.phase, lkw(l)); units.push({ type, lines: [l], phases: [l.phase] }); });
    };
    makeBlocks(R.lines.filter((l) => l.how === 'rcbo'), 'rcbo');
    makeBlocks(R.lines.filter((l) => l.how === 'mcb'), 'mcb');
    const forbid = R.lines.filter((l) => l.how === 'forbid');
    forbid.forEach((l) => { l.phase = three ? 'L1' : 'L1'; addLoad('L1', lkw(l)); });
    if (!three) { load.L1 = R.lines.reduce((s, l) => s + lkw(l), 0); load.L2 = 0; load.L3 = 0; }
    R.phaseLoad = load;

    /* 6. аппараты */
    const D = [];
    const mk = (o) => { const d = Object.assign({ id: '', w: 1, rail: 0, x: 0 }, o); D.push(d); return d; };
    const wOf = (type, poles) => {
      if (type === 'mcb' || type === 'sw') return poles * (cfg.wide && poles >= 3 ? 1.5 : 1);
      if (type === 'rcd') return poles === 4 ? 4 : 2;
      if (type === 'rcbo') return cfg.compact ? 1 : 2;
      if (type === 'rn') return 2;
      if (type === 'spd') return poles;
      if (type === 'meter') return three ? 8 : 6;
      if (type === 'xt') return poles === 4 ? 6 : 4;
      return 1;
    };
    const inp = mk({ role: 'input', type: inKind, poles: inPoles, In: inRating, curve: inKind === 'sw' ? '' : inCurve, w: wOf(inKind, inPoles), label: inKind === 'sw' ? 'Выключатель нагрузки' : 'Вводной автомат' });
    const meter = meterMode !== 'none' ? mk({ role: 'meter', type: 'meter', poles: three ? 3 : 1, mount: meterMode, w: meterMode === 'din' ? wOf('meter') : 0, label: three ? 'Счётчик трёхфазный' : 'Счётчик однофазный' }) : null;
    let spd = null;
    if (wantSPD) {
      const t1 = cfg.overhead || obj === 'house' || obj === 'dacha';
      const poles = E === 'TN-C' ? (three ? 3 : 1) : (three ? 4 : 2);
      spd = mk({ role: 'spd', type: 'spd', poles, cls: t1 ? 'T1+T2' : 'T2', scheme: E === 'TN-C' ? 'L–PEN' : (three ? '3+1' : '1+1'), w: wOf('spd', poles), label: 'УЗИП' });
    }
    const fire = wantFire ? mk({ role: 'fire', type: 'rcd', poles: three ? 4 : 2, In: nextStd(K.rcd, inRating) || 100, ma: 100, rt: 'A', sel: 'S', w: wOf('rcd', three ? 4 : 2), label: 'УЗО противопожарное (S)' }) : null;
    const rns = [];
    if (wantRN) {
      const r = nextStd(K.rn, inRating);
      if (!r) chk('warn', `Ток ввода ${inRating} А больше, чем у модульных реле напряжения. Нужна схема «реле + контактор».`);
      else if (three) PH.forEach((p) => rns.push(mk({ role: 'rn', type: 'rn', poles: 1, In: r, phase: p, w: 2, label: 'Реле напряжения ' + p })));
      else rns.push(mk({ role: 'rn', type: 'rn', poles: 1, In: r, phase: 'L1', w: 2, label: 'Реле напряжения' }));
    }
    // аппараты линий
    forbid.forEach((l) => { l.dev = mk({ role: 'line', type: 'mcb', poles: 1, In: l.In, curve: l.curve, line: l, phase: l.phase }); });
    units.forEach((u) => {
      if (u.type === 'grp') {
        const sumIn = u.lines.reduce((a, l) => a + l.In, 0);
        const upIn = fire ? fire.In : inRating;
        u.rcd = mk({ role: 'rcd', type: 'rcd', poles: 2, In: nextStd(K.rcd, Math.max(25, Math.min(upIn, sumIn))) || 63, ma: u.g.ma, rt: u.g.rt, w: 2, phase: u.phases[0], unit: u });
        u.devs = [u.rcd].concat(u.lines.map((l) => (l.dev = mk({ role: 'line', type: 'mcb', poles: 1, In: l.In, curve: l.curve, line: l, phase: l.phase }))));
        if (u.rcd.In < Math.min(upIn, sumIn)) chk('warn', `УЗО ${u.rcd.In} А: аппарат выше ${upIn} А и сумма автоматов под ним ${sumIn} А — УЗО может перегрузиться.`, 'ПУЭ 7.1.76');
      } else if (u.type === 'grp4') {
        const l = u.lines[0];
        l.dev = mk({ role: 'line', type: 'mcb', poles: 3, In: l.In, curve: l.curve, line: l, phase: l.phase, w: wOf('mcb', 3) });
        u.rcd = mk({ role: 'rcd', type: 'rcd', poles: 4, In: nextStd(K.rcd, Math.max(25, l.In)) || 63, ma: l.ma, rt: l.rt, w: 4, unit: u });
        u.devs = [u.rcd, l.dev];
      } else if (u.type === 'mcb3') {
        u.devs = u.lines.map((l) => (l.dev = mk({ role: 'line', type: 'mcb', poles: 3, In: l.In, curve: l.curve, line: l, phase: 'L123', w: wOf('mcb', 3) })));
      } else if (u.type === 'rcbo') {
        u.devs = u.lines.map((l) => (l.dev = mk({ role: 'line', type: 'rcbo', poles: 1, compact: !!cfg.compact, In: l.In, curve: l.curve, ma: l.ma, rt: l.rt, line: l, phase: l.phase, w: wOf('rcbo') })));
      } else if (u.type === 'mcb') {
        u.devs = u.lines.map((l) => (l.dev = mk({ role: 'line', type: 'mcb', poles: 1, In: l.In, curve: l.curve, line: l, phase: l.phase })));
      }
    });
    R.units = units;

    /* 7. узлы и распределительные блоки */
    const nodeA = meter || inp;
    const wiresAt = {}; // планирование
    const extrasPerPhase = (p) => (spd ? 1 : 0) + (forbid.length && !spd && (three ? p === 'L1' : true) ? 1 : 0);
    const unitTouches = (u, p) => u.phases.includes(p) || (u.phases.includes('L1') && !three);
    let H, xtH = null, xtB = null;
    if (!three) {
      const series = [rns[0], fire].filter(Boolean);
      const B = series.length ? series[series.length - 1] : nodeA;
      const cap = series.length ? 2 : 2 - extrasPerPhase('L');
      if (units.length > cap) xtB = mk({ role: 'xt', type: 'xt', poles: 2, In: inRating, w: wOf('xt', 2), label: 'Распределительный блок' });
      R.plan = { nodeA, series, B };
    } else {
      H = fire || nodeA;
      const n3 = units.filter((u) => u.phases.length === 3 && !u.cyclic).length;
      const maxH = Math.max(...PH.map((p) => (H === nodeA ? extrasPerPhase(p) : 0) + (rns.length ? 1 : 0) + n3 + (rns.length ? 0 : units.filter((u) => !(u.phases.length === 3 && !u.cyclic) && u.phases.includes(p)).length)));
      if (maxH > 2) xtH = mk({ role: 'xt', type: 'xt', poles: 4, In: inRating, w: wOf('xt', 4), label: 'Распределительный блок' });
      if (rns.length) {
        const maxB = Math.max(...PH.map((p) => units.filter((u) => !(u.phases.length === 3 && !u.cyclic) && u.phases.includes(p)).length));
        if (maxB > 2) xtB = mk({ role: 'xt', type: 'xt', poles: 4, In: inRating, w: wOf('xt', 4), label: 'Распределительный блок (после РН)' });
      }
      R.plan = { nodeA, H };
    }
    void wiresAt; void unitTouches;

    /* 8. раскладка */
    const head = [inp];
    if (meter && meter.mount === 'din') head.push(meter);
    if (spd) head.push(spd);
    if (!three) { rns.forEach((r) => head.push(r)); if (fire) head.push(fire); if (xtB) head.push(xtB); }
    else { if (fire) head.push(fire); if (xtH) head.push(xtH); rns.forEach((r) => head.push(r)); if (xtB) head.push(xtB); }
    const blocks = [{ devs: head, split: true }];
    if (forbid.length) blocks.push({ devs: forbid.map((l) => l.dev) });
    units.filter((u) => u.type === 'grp4').forEach((u) => blocks.push({ devs: u.devs }));
    units.filter((u) => u.type === 'mcb3').forEach((u) => blocks.push({ devs: u.devs, split: true }));
    units.filter((u) => u.type === 'grp').forEach((u) => blocks.push({ devs: u.devs }));
    units.filter((u) => u.type === 'rcbo').forEach((u) => blocks.push({ devs: u.devs, split: true }));
    units.filter((u) => u.type === 'mcb').forEach((u) => blocks.push({ devs: u.devs, split: true }));
    const railDevs = blocks.reduce((a, b) => a.concat(b.devs), []);
    const totalW = railDevs.reduce((a, d) => a + d.w, 0);
    const pack = (Wd) => {
      let rail = 0, x = 0;
      const pos = [];
      blocks.forEach((b) => {
        const bw = b.devs.reduce((a, d) => a + d.w, 0);
        if (x > 0 && x + bw > Wd + 1e-9 && !(b.split && Wd - x >= 2)) { rail++; x = 0; }
        b.devs.forEach((d) => { if (x + d.w > Wd + 1e-9) { rail++; x = 0; } pos.push([d, rail, x]); x += d.w; });
      });
      return { rails: rail + 1, pos };
    };
    let Wsel = 12, packed = null, rails = 1;
    for (const Wd of [12, 18, 24]) {
      const p = pack(Wd);
      let r = p.rails;
      while ((r * Wd - totalW) / (r * Wd) < cfg.reserve / 100 - 1e-9) r++;
      Wsel = Wd; packed = p; rails = r;
      if (r <= 4) break;
    }
    packed.pos.forEach(([d, r, x]) => { d.rail = r; d.x = x; });
    R.layout = { W: Wsel, rails, totalW, free: rails * Wsel - totalW, meterPanel: meter && meter.mount === 'panel' ? meter : null };
    R.enclosure = { modules: rails * Wsel, name: `${rails * Wsel} мод. (${rails} × ${Wsel})` };

    /* 9. нумерация по раскладке */
    const cnt = {};
    const ordered = D.slice().sort((a, b) => (a === meter && meter.mount === 'panel') ? -1 : (b === meter && meter.mount === 'panel') ? 1 : (a.rail - b.rail) || (a.x - b.x));
    ordered.forEach((d) => { const p = PREFIX[d.type] || 'X'; cnt[p] = (cnt[p] || 0) + 1; d.id = p + cnt[p]; });
    R.devices = ordered;
    R.lines.forEach((l) => { if (l.dev) l.devId = l.dev.id; });

    /* 10. шины */
    const buses = [];
    const mkBus = (id, kind, label) => { const b = { id, kind, label, terms: [] }; buses.push(b); return b; };
    const PEb = mkBus('PE', 'PE', E === 'TN-C' ? 'PE (на будущее, к N не подключать)' : 'PE — на корпусе');
    const N0 = mkBus('N0', 'N', 'N0 — общая после ввода');
    const Nf = fire ? mkBus('N' + fire.id, 'N', 'N после ' + fire.id) : null;
    const Nv = (E === 'TN-C>S' && ((inp.poles === 2) || meter)) ? mkBus('Nв', 'N', 'N ввода (разделение PEN)') : null;
    units.forEach((u) => { if (u.rcd && !(u.type === 'grp4' && u.lines[0].noN)) u.nbus = mkBus('N' + u.rcd.id, 'N', 'N группы ' + u.rcd.id); });
    R.buses = buses;

    /* 11. провода */
    const W = [];
    let wn = 0;
    const T = (dev, term) => ({ dev: dev.id, term });
    const slot = (b) => { b.terms.push(null); return { bus: b.id, slot: b.terms.length - 1 }; };
    const EXT = (c) => ({ ext: 'input', cond: c });
    const toEnd = (e) => (e.bus ? slot(e.bus) : e.ext ? EXT(e.ext) : T(e.dev, e.term));
    const wire = (from, to, c, mm2, text, o) => {
      const w = Object.assign({ id: 'w' + (++wn), from, to, cond: c, mm2, text }, o || {});
      [from, to].forEach((e) => { if (e.bus) buses.find((b) => b.id === e.bus).terms[e.slot] = w.id; });
      W.push(w); return w;
    };
    const combs = [];
    const mkComb = (devs, conds, label) => { const c = { id: 'c' + (combs.length + 1), devs: devs.map((d) => d.id), conds, label }; combs.push(c); return c; };
    const xtOut = (xt, c) => { xt.outs = xt.outs || []; const name = c + 'out' + xt.outs.length; xt.outs.push(name); return T(xt, name); };
    const outT = (d, p) => { // нижняя клемма полюса p ('L','L1'..,'N')
      if (d.type === 'meter') return T(d, three ? { L1: '3', L2: '6', L3: '9', N: '12' }[p] : { L: '2', N: '4' }[p]);
      if (d.type === 'rn') return T(d, 'Lout');
      return T(d, p + '>');
    };
    const inT = (d, p) => {
      if (d.type === 'meter') return T(d, three ? { L1: '1', L2: '4', L3: '7', N: '10' }[p] : { L: '1', N: '3' }[p]);
      if (d.type === 'rn') return T(d, p === 'N' ? 'N' : 'Lin');
      if (d.type === 'xt') return T(d, p + 'in');
      return T(d, p);
    };
    const steps = [];
    const step = (title, text, hl, why) => steps.push({ title, text, hl: hl || {}, why: why || '' });
    const phs = three ? PH : ['L'];
    const inMark = E === 'TN-C' || E === 'TN-C>S' ? (three ? `4×${sec(Math.max(inSec, 10))}` : `2×${sec(Math.max(inSec, 10))}`) : (three ? `5×${sec(inSec)}` : `3×${sec(inSec)}`);
    R.input = { sec: inSec, jSec, mark: inMark };

    step('Корпус, рейки и шины', `Корпус на ${R.enclosure.modules} модулей. Установи DIN-рейки, шину PE — прямо на металл корпуса, шины N (${buses.filter((b) => b.kind === 'N').map((b) => b.id).join(', ')}) — на изоляторах. Дверь соедини с шиной PE гибким жёлто-зелёным проводом 6 мм².`, { buses: buses.map((b) => b.id) }, 'Металлический корпус и дверь — открытые проводящие части, их присоединяют к PE.');
    step('Аппараты на рейки', `Защёлкни аппараты по раскладке слева направо: ${R.devices.filter((d) => !(d.type === 'meter' && d.mount === 'panel')).map((d) => d.id).join(', ')}. Все рычаги — «выкл».`, { devs: R.devices.map((d) => d.id) }, 'Аппараты стоят в порядке пути тока: ввод → защита → группы. Так короче провода и понятнее щит.');

    // PE и PEN ввода
    if (E === 'TN-C>S') {
      const s = Math.max(inSec, 10);
      const w1 = wire(EXT('PEN'), slot(PEb), 'PEN', s, 'PEN ввода → шина PE');
      const tgt = Nv || N0;
      const w2 = wire(slot(PEb), slot(tgt), 'PEN', s, `Перемычка: шина PE → шина ${tgt.id}`);
      const w3 = wire({ ext: 'ground', cond: 'PE' }, slot(PEb), 'PE', 16, 'Повторное заземление (контур) → шина PE');
      step('Разделение PEN', `Жилу PEN ввода (${sec(s)} мм²) заведи на шину PE. С шины PE поставь перемычку того же сечения на шину ${tgt.id}. Провод от контура заземления (повторное заземление) — тоже на шину PE. Дальше N и PE нигде не соединяются.`, { wires: [w1.id, w2.id, w3.id], buses: ['PE', tgt.id] }, 'ПУЭ 1.7.135: в точке разделения — отдельные шины N и PE с перемычкой, PEN подключается к шине PE.');
    } else if (E === 'TN-C') {
      step('Ввод PEN (TN-C)', 'Отдельного PE в доме нет. Жилу PEN ввода подключай как ноль. Шина PE остаётся «на будущее» и с нулём не соединяется. «Зануление» в розетках запрещено.', { buses: ['PE'] }, 'Разделение PEN в квартирном щите многоэтажки опасно: переход на TN-C-S делают во ВРУ с согласия управляющей компании.');
    } else {
      const w = wire(E === 'TT' ? { ext: 'ground', cond: 'PE' } : EXT('PE'), slot(PEb), 'PE', E === 'TT' ? 10 : inSec, E === 'TT' ? 'Провод от своего заземлителя → шина PE' : 'PE ввода → шина PE');
      step('PE ввода', `${E === 'TT' ? 'Провод от своего заземлителя' : 'Жёлто-зелёную жилу вводного кабеля'} заведи на шину PE.`, { wires: [w.id], buses: ['PE'] }, 'Защитный проводник никогда не идёт через автоматы и УЗО (ПУЭ 1.7.145).');
    }

    // фазы ввода
    const wIn = phs.map((p) => wire(EXT(cond(p)), inT(inp, p), cond(p), inSec, `Ввод ${cond(p)} → ${inp.id} (верх)`));
    // путь нуля до шины N0
    let nCur = null;
    if (E === 'TN-C>S') nCur = Nv ? { bus: Nv } : null;
    else nCur = { ext: E === 'TN-C' ? 'PEN' : 'N' };
    const nC = E === 'TN-C' ? 'PEN' : 'N';
    const inHasN = inp.poles === 2 || inp.poles === 4;
    if (inHasN) { wIn.push(wire(toEnd(nCur), inT(inp, 'N'), nC, inSec, `N → ${inp.id} N (верх)`)); nCur = { dev: inp, term: 'N>' }; }
    step('Вводной кабель', `Кабель ввода ${R.input.mark}: ${three ? 'фазы L1, L2, L3 (коричневая, чёрная, серая)' : 'фазу'} — на верхние клеммы ${inp.id}${inHasN ? `, ноль — на верхнюю клемму N ${inp.id}` : ''}. Гибкие жилы — в НШВИ, однопроволочные — без.`, { wires: wIn.map((w) => w.id), devs: [inp.id] }, 'Питание подают сверху: при выключенном аппарате нижние клеммы и всё после них обесточены.');
    if (meter) {
      const ws = phs.map((p) => wire(outT(inp, p), inT(meter, cond(p) === 'L' ? 'L' : p), cond(p), jSec, `${inp.id} → ${meter.id}`));
      ws.push(wire(toEnd(nCur), inT(meter, 'N'), nC, jSec, `N → ${meter.id}`));
      nCur = { dev: meter, term: three ? '12' : '4' };
      step('Счётчик', `От нижних клемм ${inp.id} — на входы счётчика ${meter.id}: ${three ? '1 (L1), 4 (L2), 7 (L3), 10 (N)' : '1 (фаза), 3 (ноль)'}, провод ${sec(jSec)} мм². Выходы ${three ? '3, 6, 9, 12' : '2 и 4'} — дальше по схеме. Номера клемм сверь с крышкой клеммника своей модели.`, { wires: ws.map((w) => w.id), devs: [meter.id] }, 'ПУЭ 7.1.64–7.1.65: перед счётчиком — аппарат отключения всех фаз, после — аппараты защиты.');
    }
    if (nCur) {
      const w = wire(toEnd(nCur), slot(N0), nC, jSec, `N → шина N0`);
      const from = nCur.ext ? 'Нулевую жилу вводного кабеля' : nCur.bus ? `С шины ${nCur.bus.id}` : `С выходной клеммы N ${nCur.dev.id}`;
      step('Ноль на шину N0', `${from} — синим проводом ${sec(jSec)} мм² на общую шину N0.`, { wires: [w.id], buses: ['N0'] }, 'Шина N0 раздаёт ноль на реле, УЗИП, входы УЗО и линии без УЗО.');
    }

    // узел A: УЗИП и сигнализация
    const A = nodeA;
    const spdSec = spd ? Math.max(jSec, spd.cls === 'T1+T2' ? 10 : 6) : 0;
    if (spd) {
      const ws = [];
      const spdPh = spd.poles === 1 ? ['L'] : spd.poles === 2 ? ['L'] : PH;
      spdPh.forEach((p) => ws.push(wire(outT(A, p === 'L' ? 'L' : p), T(spd, p), cond(p), spdSec, `${A.id} → ${spd.id} ${p}`, { short: true })));
      if (spd.poles === 2 || spd.poles === 4) ws.push(wire(slot(N0), T(spd, 'N'), 'N', spdSec, `Шина N0 → ${spd.id} N`, { short: true }));
      ws.push(wire(T(spd, 'PE'), slot(PEb), E === 'TN-C' ? 'PEN' : 'PE', Math.max(spdSec, spd.cls === 'T1+T2' ? 16 : 6), `${spd.id} PE → шина PE`, { short: true }));
      step('УЗИП', `${spd.id} (${spd.cls}, схема ${spd.scheme}): ${three ? 'фазы' : 'фаза'} — вторым проводом с нижних клемм ${A.id} (${sec(spdSec)} мм²)${spd.poles === 2 || spd.poles === 4 ? ', N — с шины N0' : ''}, клемма PE — на шину PE. Провода как можно короче, в сумме не длиннее 0,5 м.`, { wires: ws.map((w) => w.id), devs: [spd.id] }, 'УЗИП ставят до УЗО и реле напряжения (СП 256 А.5.3). Длинные провода сводят защиту на нет.');
    }
    if (forbid.length) {
      const ws = [];
      const fd = forbid.map((l) => l.dev);
      const p = three ? 'L1' : 'L';
      const src = spd ? T(spd, spd.poles >= 3 ? 'L1' : 'L') : outT(A, p);
      ws.push(wire(src, T(fd[0], 'L'), cond(p), Math.max(2.5, ...forbid.map((l) => l.s)), `${spd ? spd.id : A.id} ${p} → ${fd[0].id} (верх)`));
      let cb = null;
      if (fd.length > 1) cb = mkComb(fd, [cond(p)], 'гребёнка 1ф');
      step('Линии без УЗО (сигнализация)', `${fd.map((d) => d.id).join(', ')} питаются до реле напряжения и УЗО: провод с ${spd ? `верхней клеммы ${spd.id} (транзитом)` : `нижней клеммы ${A.id}`} на верх ${fd[0].id}${cb ? ', дальше гребёнкой' : ''}. Ноль этих линий — с шины N0.`, { wires: ws.map((w) => w.id), devs: fd.map((d) => d.id), combs: cb ? [cb.id] : [] }, 'Пожарную сигнализацию нельзя отключать УЗО (ПУЭ 7.1.81).');
    }

    // последовательная цепочка и узлы раздачи
    let feedB; // функция (phase) → конец провода источника для единиц
    let nBus; // шина N для единиц (линии без УЗО)
    let nFeed; // функция → конец провода N для входов УЗО/АВДТ
    if (!three) {
      let cur = A;
      rns.forEach((r) => {
        const ws = [wire(outT(cur, 'L'), inT(r, 'L'), 'L', jSec, `${cur.id} L → ${r.id} «L вход»`), wire(slot(N0), inT(r, 'N'), 'N', 2.5, `Шина N0 → ${r.id} N (измерение)`)];
        step('Реле напряжения', `Фаза: нижняя клемма ${cur.id} → «L вход» ${r.id} (${sec(jSec)} мм²). Тонким проводом 2,5 мм² с шины N0 — на клемму N реле (питание и измерение). Выход «L» реле — дальше по цепи.`, { wires: ws.map((w) => w.id), devs: [r.id] }, 'Через реле идёт фаза. Ноль нагрузки берут с шины, а не с измерительной клеммы реле.');
        cur = r;
      });
      if (fire) {
        const ws = [wire(outT(cur, 'L'), inT(fire, 'L'), 'L', jSec, `${cur.id} → ${fire.id} L`), wire(slot(N0), inT(fire, 'N'), 'N', jSec, `Шина N0 → ${fire.id} N`), wire(outT(fire, 'N'), slot(Nf), 'N', jSec, `${fire.id} N (низ) → шина ${Nf.id}`)];
        step('Противопожарное УЗО', `${fire.id} ${fire.In} А / ${fire.ma} мА тип S: сверху — фаза от ${cur.id} и N с шины N0. Снизу N — на отдельную шину ${Nf.id}, фаза — дальше к группам.`, { wires: ws.map((w) => w.id), devs: [fire.id], buses: [Nf.id] }, 'Тип S с большей уставкой отключится позже УЗО 30 мА — селективно (ПУЭ 7.1.73, 7.1.84).');
        cur = fire;
      }
      nBus = fire ? Nf : N0;
      if (xtB) {
        const ws = [wire(outT(cur, 'L'), inT(xtB, 'L'), 'L', jSec, `${cur.id} L → ${xtB.id}`), wire(slot(nBus), inT(xtB, 'N'), 'N', jSec, `Шина ${nBus.id} → ${xtB.id} N`)];
        step('Распределительный блок', `Вход ${xtB.id}: фаза с нижней клеммы ${cur.id}, ноль — с шины ${nBus.id}, провод ${sec(jSec)} мм². С выходов блока питаются все группы — на клеммах аппаратов не будет больше одного-двух проводов.`, { wires: ws.map((w) => w.id), devs: [xtB.id] }, 'Кросс-модуль заменяет «шлейф» через клеммы аппаратов.');
        feedB = () => xtOut(xtB, 'L');
        nFeed = () => xtOut(xtB, 'N');
      } else {
        const src = cur;
        feedB = () => outT(src, 'L');
        nFeed = () => slot(nBus);
      }
    } else {
      let cur = A;
      if (fire) {
        const ws = PH.map((p) => wire(outT(cur, p), inT(fire, p), p, jSec, `${cur.id} ${p} → ${fire.id}`));
        ws.push(wire(slot(N0), inT(fire, 'N'), 'N', jSec, `Шина N0 → ${fire.id} N`));
        ws.push(wire(outT(fire, 'N'), slot(Nf), 'N', jSec, `${fire.id} N (низ) → шина ${Nf.id}`));
        step('Противопожарное УЗО 4P', `${fire.id} ${fire.In} А / ${fire.ma} мА тип S: сверху — три фазы с ${cur.id} и N с шины N0. Снизу N — на шину ${Nf.id}.`, { wires: ws.map((w) => w.id), devs: [fire.id], buses: [Nf.id] }, 'Через четырёхполюсное УЗО проходят все фазы и ноль.');
        cur = fire;
      }
      nBus = fire ? Nf : N0;
      let hSrc = (p) => outT(cur, p);
      if (xtH) {
        const ws = PH.map((p) => wire(outT(cur, p), inT(xtH, p), p, jSec, `${cur.id} ${p} → ${xtH.id}`));
        ws.push(wire(slot(nBus), inT(xtH, 'N'), 'N', jSec, `Шина ${nBus.id} → ${xtH.id} N`));
        step('Распределительный блок', `Вход ${xtH.id}: L1, L2, L3 с нижних клемм ${cur.id}, N с шины ${nBus.id}, провод ${sec(jSec)} мм².`, { wires: ws.map((w) => w.id), devs: [xtH.id] }, 'Кросс-модуль раздаёт три фазы и ноль без перегрузки клемм.');
        hSrc = (p) => xtOut(xtH, p);
      }
      // трёхфазные единицы — от узла H
      R._hSrc = hSrc;
      if (rns.length) {
        const ws = [];
        rns.forEach((r) => { ws.push(wire(hSrc(r.phase), inT(r, 'L'), r.phase, jSec, `${r.phase} → ${r.id} «L вход»`)); ws.push(wire(slot(N0), inT(r, 'N'), 'N', 2.5, `Шина N0 → ${r.id} N`)); });
        step('Реле напряжения по фазам', `Три однофазных реле: ${rns.map((r) => `${r.id} — ${r.phase}`).join(', ')}. На «L вход» каждого — своя фаза (${sec(jSec)} мм²), на N — провод 2,5 мм² с шины N0. Каждое реле защищает однофазные группы своей фазы.`, { wires: ws.map((w) => w.id), devs: rns.map((r) => r.id) }, 'Трёхфазные потребители подключены до реле: если одно реле отключит свою фазу, двигатель не останется «на двух фазах».');
        if (xtB) {
          const ws2 = rns.map((r) => wire(outT(r, 'L'), inT(xtB, r.phase), r.phase, jSec, `${r.id} → ${xtB.id} ${r.phase}`));
          ws2.push(wire(slot(nBus), inT(xtB, 'N'), 'N', jSec, `Шина ${nBus.id} → ${xtB.id} N`));
          step('Распределительный блок после реле', `Выходы реле ${rns.map((r) => r.id).join(', ')} — на входы L1, L2, L3 блока ${xtB.id}, N — с шины ${nBus.id}.`, { wires: ws2.map((w) => w.id), devs: [xtB.id] }, '');
          feedB = (p) => xtOut(xtB, p);
          nFeed = () => xtOut(xtB, 'N');
        } else {
          const rBy = {}; rns.forEach((r) => { rBy[r.phase] = r; });
          feedB = (p) => outT(rBy[p], 'L');
          nFeed = () => slot(nBus);
        }
      } else {
        feedB = hSrc;
        nFeed = xtH ? () => xtOut(xtH, 'N') : () => slot(nBus);
      }
    }

    // раздача питания на блок аппаратов: гребёнки по рейкам, питание первого, перемычки между рейками
    const blockFeed = (devs, feedFn, label, wsOut) => {
      const sg = [];
      devs.forEach((d) => { const s = sg[sg.length - 1]; if (s && s[0].rail === d.rail) s.push(d); else sg.push([d]); });
      const lastOf = {};
      const ids = [];
      let jumps = 0;
      sg.forEach((seg) => {
        const is3 = seg[0].poles === 3;
        const phOfSeg = is3 ? PH : Array.from(new Set(seg.map((d) => cond(d.phase || 'L1'))));
        if (seg.length > 1) {
          const conds = is3 ? PH : Array.from(new Set(seg.slice(0, 3).map((d) => cond(d.phase || 'L1'))));
          ids.push(mkComb(seg, conds, is3 ? 'гребёнка 3ф для 3P' : conds.length > 1 ? 'гребёнка 3ф' : 'гребёнка 1ф').id);
        }
        phOfSeg.forEach((p) => {
          const d0 = is3 ? seg[0] : seg.find((d) => cond(d.phase || 'L1') === p);
          const tin = is3 ? p : 'L';
          if (lastOf[p]) { jumps++; wsOut.push(wire(T(lastOf[p].dev, lastOf[p].term), T(d0, tin), p, jSec, `Перемычка ${lastOf[p].dev.id} → ${d0.id} (${p}): блок продолжается на следующей рейке`)); }
          else wsOut.push(wire(feedFn(p), T(d0, tin), p, jSec, `→ ${d0.id} ${tin} (верх)`));
        });
        phOfSeg.forEach((p) => { const dl = is3 ? seg[seg.length - 1] : seg.filter((d) => cond(d.phase || 'L1') === p).pop(); lastOf[p] = { dev: dl, term: is3 ? p : 'L' }; });
      });
      return { ids, jumps, segs: sg.length };
    };
    const jumpTxt = (fb) => fb.jumps ? ` Блок не поместился на одну рейку — на следующую рейку питание идёт перемычкой ${sec(jSec)} мм² с последнего аппарата.` : '';

    // единицы
    units.forEach((u) => {
      const ws = [];
      if (u.type === 'grp') {
        const r = u.rcd, p = u.phases[0], c = cond(p);
        ws.push(wire(feedB(p), inT(r, 'L'), c, jSec, `→ ${r.id} L (верх)`));
        ws.push(wire(nFeed(), inT(r, 'N'), 'N', jSec, `→ ${r.id} N (верх)`));
        const brks = u.devs.slice(1);
        const fb = blockFeed(brks, () => outT(r, 'L'), 'гребёнка 1ф', ws);
        ws.push(wire(outT(r, 'N'), slot(u.nbus), 'N', jSec, `${r.id} N (низ) → шина ${u.nbus.id}`));
        step(`Группа ${r.id}${three ? ' · ' + p : ''}`, `УЗО ${r.id} ${r.In} А / ${r.ma} мА тип ${r.rt}: сверху — фаза${three ? ' ' + p : ''} и ноль${xtB || xtH ? ' с распределительного блока' : ''}. ${fb.ids.length ? `Гребёнкой соедини верх ${brks.map((d) => d.id).join(', ')}; перемычкой ${sec(jSec)} мм² — нижнюю клемму L ${r.id} к первому автомату.` : `Перемычкой ${sec(jSec)} мм² — нижнюю клемму L ${r.id} на верх ${brks[0].id}.`}${jumpTxt(fb)} Нижнюю N ${r.id} — на ОТДЕЛЬНУЮ шину ${u.nbus.id}.`, { wires: ws.map((w) => w.id), devs: u.devs.map((d) => d.id), combs: fb.ids, buses: [u.nbus.id] }, 'Нули линий под этим УЗО — только с его шины, иначе УЗО будет выбивать или не защитит (ПУЭ 7.1.74).');
      } else if (u.type === 'grp4') {
        const l = u.lines[0];
        PH.forEach((p) => ws.push(wire(R._hSrc(p), inT(u.rcd, p), p, jSec, `→ ${u.rcd.id} ${p} (верх)`)));
        if (!l.noN) ws.push(wire(xtH ? xtOut(xtH, 'N') : slot(nBus), inT(u.rcd, 'N'), 'N', jSec, `→ ${u.rcd.id} N (верх)`));
        PH.forEach((p) => ws.push(wire(outT(u.rcd, p), inT(l.dev, p), p, Math.max(l.s, 2.5), `${u.rcd.id} ${p} (низ) → ${l.dev.id} ${p}`)));
        if (u.nbus) ws.push(wire(outT(u.rcd, 'N'), slot(u.nbus), 'N', Math.max(l.s, 2.5), `${u.rcd.id} N (низ) → шина ${u.nbus.id}`));
        step(`Трёхфазная линия: ${l.name}`, `УЗО ${u.rcd.id} 4P ${u.rcd.In} А / ${u.rcd.ma} мА: сверху три фазы и ноль${rns.length ? ' (до реле напряжения)' : ''}. Снизу фазы — на верх автомата ${l.dev.id} 3P ${l.curve}${l.In}${u.nbus ? `, N — на шину ${u.nbus.id}` : ''}.`, { wires: ws.map((w) => w.id), devs: u.devs.map((d) => d.id), buses: u.nbus ? [u.nbus.id] : [] }, 'Через четырёхполюсное УЗО проходят все фазы и ноль, иначе оно увидит «утечку».');
      } else if (u.type === 'mcb3') {
        const devs = u.devs;
        const fb = blockFeed(devs, R._hSrc, 'гребёнка 3ф для 3P', ws);
        const nm = devs.map((d) => d.id).join(', ');
        step(devs.length > 1 ? `Трёхполюсные автоматы ${nm}` : `Трёхфазная линия: ${devs[0].line.name}`, `${fb.ids.length ? `Трёхфазной гребёнкой соедини верх ${nm}: каждый автомат получает L1, L2, L3. Три перемычки ${sec(jSec)} мм² — в первый аппарат.` : `Три фазы (${sec(jSec)} мм²) — на верх ${nm}.`}${jumpTxt(fb)}${rns.length ? ' Эти линии питаются до реле напряжения.' : ''}`, { wires: ws.map((w) => w.id), devs: devs.map((d) => d.id), combs: fb.ids }, 'Трёхполюсный автомат отключает все фазы сразу — мотор не останется «на двух фазах».');
      } else {
        const devs = u.devs;
        const fb = blockFeed(devs, feedB, '', ws);
        if (u.type === 'rcbo') devs.forEach((d) => ws.push(wire(nFeed(), T(d, 'N'), 'N', Math.max(2.5, Math.min(jSec, d.line.s)), `→ ${d.id} N (верх)`)));
        const nm = devs.map((d) => d.id).join(', ');
        const phTxt = u.cyclic ? ` Фазы по гребёнке: ${devs.map((d) => `${d.id} — ${d.phase}`).join(', ')}.` : (three ? ` Фаза ${u.phases[0]}.` : '');
        step(u.type === 'rcbo' ? `Дифавтоматы ${nm}` : `Автоматы ${nm}`, `${fb.ids.length ? (u.cyclic ? `Трёхфазной гребёнкой соедини верхние клеммы L ${nm}; перемычки ${sec(jSec)} мм² L1, L2, L3 — в первые аппараты каждой фазы.` : `Гребёнкой соедини верхние клеммы L ${nm}; перемычка ${sec(jSec)} мм² — в первый.`) : `Перемычка ${sec(jSec)} мм² — на верхнюю клемму ${nm}.`}${jumpTxt(fb)}${phTxt}${u.type === 'rcbo' ? ` На верхние клеммы N каждого дифавтомата — синий провод с ${xtB || xtH ? 'распределительного блока' : 'шины ' + nBus.id}.` : ''}`, { wires: ws.map((w) => w.id), devs: devs.map((d) => d.id), combs: fb.ids }, u.type === 'rcbo' ? 'Ноль на вход дифавтомата — с общей шины, а ноль линии — только с его выхода.' : 'Линии без УЗО берут ноль с общей шины.');
      }
    });

    // кабели линий
    R.lines.forEach((l) => {
      if (!l.dev) return;
      const num = l.num;
      const cs = [];
      const ph3 = l.ph === 3 && three;
      if (ph3) PH.forEach((p) => cs.push(wire(T(l.dev, p + '>'), { ext: 'line', line: l.id, cond: p }, p, l.s, `${l.dev.id} ${p} (низ) → кабель гр. ${num}`, { cable: num })));
      else cs.push(wire(T(l.dev, 'L>'), { ext: 'line', line: l.id, cond: cond(l.phase === 'L123' ? 'L1' : l.phase) }, cond(l.phase === 'L123' ? 'L1' : l.phase), l.s, `${l.dev.id} (низ) → кабель гр. ${num}`, { cable: num }));
      let nTo = '';
      if (!l.noN) {
        if (l.how === 'rcbo') { cs.push(wire(T(l.dev, 'N>'), { ext: 'line', line: l.id, cond: 'N' }, 'N', l.s, `${l.dev.id} N (низ) → кабель гр. ${num}`, { cable: num })); nTo = `нижнюю клемму N ${l.dev.id}`; }
        else {
          const u = units.find((x) => x.lines.includes(l));
          const b = u && u.nbus ? u.nbus : (l.how === 'forbid' ? N0 : nBus);
          cs.push(wire(slot(b), { ext: 'line', line: l.id, cond: 'N' }, 'N', l.s, `Шина ${b.id} → кабель гр. ${num}`, { cable: num }));
          nTo = `шину ${b.id}`;
        }
      }
      if (E !== 'TN-C') cs.push(wire(slot(PEb), { ext: 'line', line: l.id, cond: 'PE' }, 'PE', l.s, `Шина PE → кабель гр. ${num}`, { cable: num }));
      R.cables.push({ line: l, wires: cs.map((w) => w.id) });
      step(`Гр. ${num}: ${l.name}`, `Кабель ${l.cableMark} ${l.cores}×${sec(l.s)}${l.len ? `, ≈ ${l.len} м` : ''}. ${ph3 ? 'Фазы L1, L2, L3' : 'Фазу'} — на нижние клеммы ${l.dev.id}${l.noN ? '' : `; ноль (синий) — на ${nTo}`}; ${E === 'TN-C' ? 'жёлто-зелёную жилу изолируй (PE в доме нет)' : 'жёлто-зелёную (PE) — на шину PE'}. Подпиши кабель «${num}».`, { wires: cs.map((w) => w.id), devs: [l.dev.id], lines: [l.id] }, l.how === 'grp' ? 'Ноль этой линии — только на шину её УЗО.' : l.how === 'rcbo' ? 'Ноль линии — только с выхода дифавтомата.' : '');
    });
    R.wires = W;
    R.combs = combs;
    step('Затяжка и оформление', 'Протяни все клеммы динамометрической отвёрткой по паспорту, подёргай каждый провод. Уложи и стяни провода, поставь лицевую панель и заглушки. Подпиши аппараты, вклей таблицу групп на дверь.', {}, 'Плохой контакт — главная причина нагрева и пожаров в щитах.');
    step('Проверка и включение', 'Без напряжения проверь изоляцию линий мегаомметром (электронику отключи) и прозвони PE. Потом: вводной → проверь напряжение → УЗО и кнопка «Тест» на каждом → группы по одной.', {}, 'Подробно — уроки «Проверки и испытания» и «Первое включение».');
    R.steps = steps;

    /* 12. проверки щита */
    if (Icalc > inRating) chk('warn', `Расчётная мощность ≈ ${fmt(Pcalc)} кВт (установленная ${fmt(Pinst)} × Кс ${fmt(kc, 2)}), ток ≈ ${fmt(Icalc)} А — больше вводного ${inRating} А. Убери одновременность (реле приоритета, ночной тариф) или увеличь мощность по ТУ.`);
    else chk('ok', `Расчётная мощность ≈ ${fmt(Pcalc)} кВт (установленная ${fmt(Pinst)} кВт × Кс ${fmt(kc, 2)}), ток ≈ ${fmt(Icalc)} А — вводной ${inRating} А справляется.`);
    if (cfg.input.rating !== 'auto' && inRating > (nextStd(K.mcb, Iallow * 0.97) || 0)) chk('warn', `Вводной ${inRating} А больше, чем соответствует ${cfg.kw} кВт. Номинал вводного — по техническим условиям.`, 'ТУ сетевой компании');
    const mustL = R.lines.filter((l) => l.k.rcd === 'must');
    if (mustL.length && mustL.every((l) => l.rcd)) chk('ok', 'Все розеточные и «мокрые» линии защищены УЗО/дифавтоматами не более 30 мА.', 'ПУЭ 7.1.79, 7.1.82');
    if (R.lines.some((l) => l.room === 'bath' && l.rcd && l.ma <= 10)) chk('ok', 'Отдельная линия ванной — с уставкой 10 мА.', 'СП 256 А.4.15');
    if (forbid.length) chk('ok', 'Пожарная/охранная сигнализация подключена без УЗО и до реле напряжения.', 'ПУЭ 7.1.81');
    if (E === 'TT') chk(fire ? 'ok' : 'err', fire ? 'Система TT: на вводе УЗО 100 мА тип S, на группах — УЗО/АВДТ. Проверь условие Ra·IΔn ≤ 50 В.' : 'Система TT: УЗО обязательно.', 'ПУЭ 1.7.59');
    if (E === 'TN-C') chk('warn', 'Система TN-C: PE нет. УЗО 30 мА повышает безопасность, но корпуса не заземлены до перехода дома на TN-C-S. «Зануление» в розетках запрещено.', 'СП 256 А.1.7');
    if (E === 'TN-C' && three && R.lines.some((l) => l.rcd && l.ph === 3)) chk('err', 'В четырёхпроводных трёхфазных цепях TN-C УЗО не применяют.', 'ПУЭ 1.7.80');
    if (E === 'TN-C>S') chk('ok', 'PEN разделяется в этом щите: PEN → шина PE → перемычка на N; повторное заземление — на шину PE.', 'ПУЭ 1.7.135, 1.7.61');
    if (cfg.overhead && !spd) chk('err', 'Ввод по воздушной линии — нужен УЗИП.', 'ПУЭ 7.1.22');
    if (spd) chk('ok', `УЗИП ${spd.cls} стоит до УЗО и реле напряжения.`, 'СП 256 А.5.3');
    if (rns.length) chk(rns[0].In >= inRating ? 'ok' : 'err', `Реле напряжения ${rns[0].In} А ${rns[0].In >= inRating ? '≥' : '<'} вводного ${inRating} А.`);
    if (fire) chk('ok', `Противопожарное УЗО ${fire.ma} мА тип S — селективно с УЗО 30 мА ниже.`, 'ПУЭ 7.1.73, 7.1.84');
    rGroups.forEach((g) => { if (g.leak > g.ma / 3) chk('warn', `На одно УЗО ${g.ma} мА приходится фоновая утечка ≈ ${fmt(g.leak)} мА (норма ≤ ${fmt(g.ma / 3)}).`, 'ПУЭ 7.1.83'); });
    if (three) {
      const vals = PH.map((p) => load[p]);
      const mx = Math.max(...vals), mn = Math.min(...vals);
      R.imbalance = mx > 0 ? (mx - mn) / mx * 100 : 0;
      chk(R.imbalance > 30 ? 'warn' : 'ok', `Нагрузка фаз: L1 ${fmt(load.L1)} · L2 ${fmt(load.L2)} · L3 ${fmt(load.L3)} кВт (разница ${fmt(R.imbalance, 0)} %).`);
    }
    const maxLine = Math.max(0, ...R.lines.map((l) => l.In));
    if (inKind === 'mcb' && maxLine >= inRating) chk('warn', `Автомат линии ${maxLine} А не меньше вводного ${inRating} А — при перегрузке может отключиться вводной (нет селективности).`);
    if (inRating > 63) chk('warn', 'Ток ввода больше 63 А: обычные гребёнки и модульные УЗО на такой ток не рассчитаны — нужны аппараты и кросс-модуль на 100–125 А.');
    const freeShare = R.layout.free / (R.layout.rails * R.layout.W);
    chk(freeShare < 0.15 ? 'warn' : 'ok', `Корпус на ${R.enclosure.modules} модулей: занято ${fmt(totalW, 1)}, свободно ${fmt(R.layout.free, 1)}${freeShare < 0.15 ? ' — маловато запаса' : ''}.`);
    if (R.lines.some((l) => l.k.ded && l.how === 'grp')) chk('warn', 'Стиралка, посудомойка, бойлер или плита на общем УЗО с другими линиями — при утечке отключатся все. Удобнее отдельный дифавтомат.');
    R.checks.sort((a, b) => ({ err: 0, warn: 1, ok: 2 }[a.level] - { err: 0, warn: 1, ok: 2 }[b.level]));

    /* 13. спецификация */
    const bm = {};
    const add = (key, name, qty, unit) => { if (!bm[key]) bm[key] = { name, qty: 0, unit: unit || 'шт' }; bm[key].qty += qty; };
    R.devices.forEach((d) => {
      if (d.type === 'mcb') add('mcb' + d.poles + d.curve + d.In, `Автоматический выключатель ${d.poles}P ${d.curve}${d.In}`, 1);
      else if (d.type === 'sw') add('sw' + d.poles + d.In, `Выключатель нагрузки ${d.poles}P ${d.In} А`, 1);
      else if (d.type === 'rcd') add('rcd' + d.poles + d.In + d.ma + d.rt + (d.sel || ''), `УЗО ${d.poles}P ${d.In} А ${d.ma} мА тип ${d.rt}${d.sel ? ' (S)' : ''}`, 1);
      else if (d.type === 'rcbo') add('rcbo' + d.curve + d.In + d.ma + d.rt, `Дифавтомат 1P+N ${d.curve}${d.In} ${d.ma} мА тип ${d.rt}${d.compact ? ', 1 модуль' : ''}`, 1);
      else if (d.type === 'rn') add('rn' + d.In, `Реле напряжения однофазное ${d.In} А`, 1);
      else if (d.type === 'spd') add('spd' + d.scheme + d.cls, `УЗИП ${d.cls}, схема ${d.scheme}`, 1);
      else if (d.type === 'meter') add('meter', `${three ? 'Счётчик трёхфазный' : 'Счётчик однофазный'} — по ТУ (${d.mount === 'din' ? 'на DIN-рейку' : 'навесной'})`, 1);
      else if (d.type === 'xt') add('xt' + d.poles, `Кросс-модуль ${d.poles === 4 ? '4P (L1, L2, L3, N)' : '2P (L, N)'} на ${d.In > 100 ? 125 : 100} А`, 1);
    });
    add('box', `Корпус щита на ${R.enclosure.modules} модулей (${R.layout.rails} × ${R.layout.W}), IP31 и выше`, 1);
    buses.forEach((b) => { const holes = Math.max(4, Math.ceil(b.terms.length * 1.3) + 1); add('bus' + b.id, `${b.kind === 'PE' ? 'Шина PE на корпус' : 'Шина N на изоляторах'} «${b.id}», отверстий ≥ ${holes}`, 1); });
    combs.forEach((c) => add('comb' + c.conds.length, `Гребёнка ${c.conds.length === 3 ? '3P' : '1P'} 63 А (отрезок на ${c.devs.length} пол.) + торцевые заглушки`, 1));
    const lens = {}, ferr = {};
    W.forEach((w) => {
      if ((w.to && w.to.ext) || (w.from && w.from.ext)) return;
      const key = w.cond + '|' + w.mm2;
      lens[key] = (lens[key] || 0) + (w.short ? 0.3 : 0.5);
      ferr[w.mm2] = (ferr[w.mm2] || 0) + 2;
    });
    const colorName = { L: 'коричневый', L1: 'коричневый', L2: 'чёрный', L3: 'серый', N: 'синий', PE: 'жёлто-зелёный', PEN: 'жёлто-зелёный (+ синие метки)' };
    Object.keys(lens).sort().forEach((k) => { const [c, m] = k.split('|'); add('w' + k, `Провод ПуГВ ${sec(m)} мм², ${colorName[c] || c}`, Math.ceil(lens[k] * 1.2 * 10) / 10, 'м'); });
    Object.keys(ferr).sort((a, b) => a - b).forEach((m) => add('f' + m, `Наконечник НШВИ ${sec(m)} мм²`, Math.ceil(ferr[m] * 1.2), 'шт'));
    add('door', 'Провод ПуГВ 6 мм² жёлто-зелёный — перемычка двери', 0.5, 'м');
    add('misc', 'Маркировка, стяжки, заглушки на пустые места, сальники/вводы', 1, 'компл.');
    R.bom = Object.values(bm);
    R.groupsTable = R.lines.map((l) => {
      const u = units.find((x) => x.lines.includes(l));
      return { num: l.num, name: l.name, dev: l.dev ? l.dev.id : '', how: l.how, prot: l.how === 'rcbo' ? `АВДТ ${l.curve}${l.In} ${l.ma} мА ${l.rt}` : `${l.ph === 3 && three ? '3P ' : ''}${l.curve}${l.In}` + (u && u.rcd ? ` + ${u.rcd.id} ${u.rcd.ma} мА` : ''), cable: `${l.cableMark} ${l.cores}×${sec(l.s)}`, len: l.len, p: l.p, I: l.I, phase: l.phase === 'L123' ? 'L1-L2-L3' : (three ? l.phase : 'L'), du: l.du, notes: l.notes };
    });
    R.three = three;
    R.TERMS = TERMS;
    return R;
  }

  S.engine = { KINDS, KIND_GROUPS, ROOMS, OBJECTS, EARTH, TERMS, build, normalize, defaultCfg, newLine: L, uid };
})();
