// Строгая проверка конструктора: все проекты, щиты с фото и сотни случайных щитов.
// Запуск: node tools/test-engine.cjs [число_случайных=400]
'use strict';
const S = require('./load-app.cjs')();
const E = S.engine;
const K = S.K;
const N = Number(process.argv[2]) || 400;

let fails = 0, built = 0;
const fail = (name, msg) => { fails++; if (fails <= 40) console.log(`✗ ${name}: ${msg}`); };

function check(name, cfg) {
  let R;
  try { R = E.build(cfg); } catch (e) { fail(name, 'build упал: ' + e.stack.split('\n').slice(0, 3).join(' | ')); return; }
  built++;
  const devById = new Map(R.devices.map((d) => [d.id, d]));
  const busById = new Map(R.buses.map((b) => [b.id, b]));
  const wireIds = new Set(R.wires.map((w) => w.id));
  // 1. концы проводов существуют, клеммы есть у аппарата
  const perTerm = {};
  R.wires.forEach((w) => [w.from, w.to].forEach((e) => {
    if (!e) { fail(name, `${w.id}: пустой конец`); return; }
    if (e.dev) {
      const d = devById.get(e.dev);
      if (!d) { fail(name, `${w.id}: нет аппарата ${e.dev}`); return; }
      const t = E.TERMS(d);
      if (!t.top.includes(e.term) && !t.bot.includes(e.term)) fail(name, `${w.id}: у ${e.dev} нет клеммы «${e.term}»`);
      const k = e.dev + ':' + e.term; perTerm[k] = (perTerm[k] || 0) + 1;
    } else if (e.bus) {
      const b = busById.get(e.bus);
      if (!b) fail(name, `${w.id}: нет шины ${e.bus}`);
      else if (b.terms[e.slot] !== w.id) fail(name, `${w.id}: слот ${e.bus}#${e.slot} занят другим проводом`);
    } else if (!e.ext) fail(name, `${w.id}: непонятный конец ${JSON.stringify(e)}`);
  }));
  // 2. под одну клемму не больше двух проводов
  Object.entries(perTerm).forEach(([k, v]) => { if (v > 2) fail(name, `клемма ${k}: ${v} провода`); });
  // 3. гребёнки: аппараты существуют и стоят на одной рейке
  R.combs.forEach((c) => {
    const ds = c.devs.map((id) => devById.get(id));
    if (ds.some((d) => !d)) fail(name, `гребёнка ${c.id}: нет аппарата`);
    else if (new Set(ds.map((d) => d.rail)).size > 1) fail(name, `гребёнка ${c.id} на разных рейках`);
  });
  // 4. каждая линия защищена: номинал не больше допустимого для кабеля (если это не ошибка, о которой сказано)
  R.lines.forEach((l) => {
    if (!(l.In > 0)) fail(name, `линия ${l.name}: нет номинала`);
    if (!K.sections.includes(l.s)) fail(name, `линия ${l.name}: нестандартное сечение ${l.s}`);
    if (l.In > (K.maxFor(l.s) || 125) && !R.checks.some((c) => c.level === 'err' && c.text.includes(l.name))) fail(name, `линия ${l.name}: ${l.In} А на ${l.s} мм² без ошибки в проверках`);
    if (!isFinite(l.I) || !isFinite(l.du)) fail(name, `линия ${l.name}: ток или потеря не число`);
  });
  // 5. каждая линия получила аппарат и кабель
  R.lines.forEach((l) => { if (!R.cables.some((c) => c.line.id === l.id)) fail(name, `линия ${l.name}: нет кабеля в щите`); });
  // 6. шаги: подсветка ссылается на существующее
  R.steps.forEach((s, i) => {
    const hl = s.hl || {};
    (hl.devs || []).forEach((id) => { if (!devById.has(id)) fail(name, `шаг ${i + 1}: нет аппарата ${id}`); });
    (hl.buses || []).forEach((id) => { if (!busById.has(id)) fail(name, `шаг ${i + 1}: нет шины ${id}`); });
    (hl.wires || []).forEach((id) => { if (!wireIds.has(id)) fail(name, `шаг ${i + 1}: нет провода ${id}`); });
    if (!s.title || !s.text) fail(name, `шаг ${i + 1}: пустой текст`);
  });
  // 7. картинки и тексты строятся без NaN/undefined
  let out = '';
  try { out = S.renderPanel(R) + S.renderSingleLine(R) + S.renderGroupsTable(R) + S.renderBOM(R) + S.renderChecks(R) + S.renderPhaseBars(R) + S.exportText(R); } catch (e) { fail(name, 'отрисовка упала: ' + e.message); }
  const bad = out.match(/NaN|undefined|Infinity|\[object Object\]/);
  if (bad) fail(name, `в выводе «${bad[0]}»: …${out.slice(Math.max(0, bad.index - 80), bad.index + 20)}…`);
  // 8. фазы: в трёхфазном щите нагрузка разложена
  if (R.three && R.lines.length >= 3) {
    const pl = R.phaseLoad; const vals = [pl.L1, pl.L2, pl.L3];
    if (vals.some((v) => !isFinite(v))) fail(name, 'нагрузка фаз не число');
  }
  return R;
}

// встроенные проекты и щиты с фото
S.projects.filter((p) => p.cfg).forEach((p) => check('проект ' + p.id, p.cfg));
S.photoPanels.forEach((p) => check('фото ' + p.id, p.cfg));
check('по умолчанию', E.defaultCfg());

// случайные щиты
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const kinds = Object.keys(E.KINDS);
for (let n = 0; n < N; n++) {
  const phases = rnd() < 0.5 ? 1 : 3;
  const lines = [];
  const cnt = 1 + Math.floor(rnd() * 22);
  for (let i = 0; i < cnt; i++) {
    const k = pick(kinds);
    const l = E.newLine(k);
    if (rnd() < 0.5) l.p = Math.round(rnd() * 12 * 10) / 10;
    if (rnd() < 0.5) l.len = Math.round(rnd() * 120);
    if (rnd() < 0.2) l.room = pick(Object.keys(E.ROOMS));
    if (rnd() < 0.15) l.rcd = pick(['yes', 'no', 'auto']);
    if (rnd() < 0.15) l.dev.type = pick(['mcb', 'rcbo', 'auto']);
    if (rnd() < 0.15) l.dev.in = pick(K.mcb);
    if (rnd() < 0.1) l.dev.curve = pick(['B', 'C', 'D']);
    if (rnd() < 0.1) l.dev.ma = pick([10, 30, 100]);
    if (phases === 3 && rnd() < 0.25) l.phase = pick(['L1', 'L2', 'L3']);
    if (phases === 1) l.ph = 1;
    lines.push(l);
  }
  const cfg = {
    name: 'Случайный ' + n, object: pick(Object.keys(E.OBJECTS)), phases, kw: Math.round(3 + rnd() * 40), earthing: pick(Object.keys(E.EARTH)),
    overhead: rnd() < 0.3, meter: pick(['none', 'din', 'panel']), input: { kind: pick(['auto', 'mcb', 'sw']), rating: rnd() < 0.7 ? 'auto' : pick(K.mcb) },
    rn: pick(['auto', 'yes', 'no']), spd: pick(['auto', 'yes', 'no']), fire: pick(['auto', 'yes', 'no']), scheme: pick(['auto', 'rcd', 'rcbo']),
    compact: rnd() < 0.3, wide: rnd() < 0.3, reserve: pick([0, 10, 25, 40]), lines
  };
  check('случайный ' + n, cfg);
}

// упаковка заявки: minCfg → normalize даёт тот же результат
try {
  const S2 = require('./load-app.cjs')(undefined, ['core', 'rpg', 'svg', 'data-formulas', 'engine', 'render-panel', 'projects', 'photos', 'sync']);
  const E2 = S2.engine;
  S2.projects.filter((p) => p.cfg).concat(S2.photoPanels).forEach((p) => {
    const full = E2.build(p.cfg), mini = E2.build(S2.sync.minCfg(p.cfg));
    const sig = (R) => R.devices.map((d) => `${d.id}${d.curve || ''}${d.In || ''}${d.ma || ''}`).join(' ') + '|' + R.lines.map((l) => `${l.In}${l.curve}${l.s}`).join(' ');
    if (sig(full) !== sig(mini)) fail('сжатие ' + (p.id || p.title), 'minCfg меняет результат');
  });
} catch (e) { fail('сжатие', e.message); }

console.log(`\nПостроено щитов: ${built}. Ошибок: ${fails}.`);
process.exit(fails ? 1 : 0);
