// Проверка редактора щита без браузера: сценарии сборки щита и случайные действия с проверкой целостности модели.
// Запуск: node tools/test-editor.cjs [число случайных шагов, по умолчанию 3000]
'use strict';
const path = require('path');
const load = require('./load-app.cjs');
const files = ['core', 'rpg', 'svg', 'data-glossary', 'data-formulas', 'data-devices', 'data-norms', 'data-tables', 'c14', 'c15', 'cards', 'engine', 'render-panel', 'ed-lib', 'ed-core', 'ed-draw', 'editor'];
const S = load(path.join(__dirname, '..'), files);
const K = S.edCore, L = S.edLib, E = S.ed, A = E.api;
const msgs = [], allMsgs = [];
S.toast = (m) => { msgs.push(m); allMsgs.push(m); };
const lastMsg = () => msgs[msgs.length - 1] || '';
let fails = 0, okN = 0;
const ok = (cond, name, extra) => { if (cond) okN++; else { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };
const clean = (P) => K.validate(P);
const svgOk = (P) => { const s = S.edDraw(P, { interactive: true }).svg; return !/NaN|undefined/.test(s); };
const fresh = (r, m) => { E.P = K.blank(r, m); E.hist = []; E.fut = []; E.sel = null; E.wireStart = null; msgs.length = 0; return E.P; };
const dev = (id) => E.P.devs.find((d) => d.id === id);
const errs = (P) => K.checks(P).filter((c) => c.level === 'err').map((c) => c.text);
const T0 = () => E.P.devs.map((d) => d.id + '@' + d.row + ':' + d.x).join(' ');
const wire = (a, b) => { E.wireStart = null; A.wireClick(a); A.wireClick(b); };

/* 1. добавление по клику до заполнения */
{
  const P = fresh(1, 12);
  for (let i = 0; i < 12; i++) A.addDevice('ekf-av6');
  ok(P.devs.length === 12, 'заполнение рейки 12 автоматами', P.devs.length);
  ok(!clean(P).length, 'нет наложений после заполнения', clean(P));
  A.addDevice('ekf-av6');
  ok(P.devs.length === 12 && /Свободного места нет/.test(lastMsg()), 'тринадцатый не ставится', lastMsg());
}
/* 2. вставка в середину с раздвижкой вправо и влево */
{
  const P = fresh(1, 12);
  for (let i = 0; i < 6; i++) A.addDevice('ekf-av6');
  A.addDevice('ekf-vd100n', { row: 0, x: 1 });
  const q = dev('QD1');
  ok(q && q.x === 2 && dev('QF3').x === 4 && dev('QF6').x === 7, 'УЗО вставлено между QF2 и QF3, правые сдвинуты', P.devs.map((d) => d.id + '@' + d.x));
  for (let i = 0; i < 3; i++) A.addDevice('ekf-av6');
  ok(P.devs.reduce((s, d) => s + d.w, 0) === 11, 'занято 11 модулей');
  A.addDevice('ekf-av6', { row: 0, x: 11 });
  ok(P.devs.length === 11 && !clean(P).length, 'последний модуль занят без наложений', clean(P));
  A.addDevice('ekf-av6', { row: 0, x: 3 });
  ok(P.devs.length === 11 && /не помещается/.test(lastMsg()), 'на полную рейку не вставить', lastMsg());
  A.addDevice('ekf-av6', { row: 0, x: 3 });
  ok(P.devs.length === 11, 'вставка не портит модель');
}
{
  const P = fresh(1, 12);
  A.addDevice('ekf-av6', { row: 0, x: 8 }); A.addDevice('ekf-av6', { row: 0, x: 9 }); A.addDevice('ekf-av6', { row: 0, x: 10 }); A.addDevice('ekf-av6', { row: 0, x: 11 });
  A.addDevice('ekf-vd100n', { row: 0, x: 10.5 });
  ok(P.devs.length === 5 && !clean(P).length && P.devs.every((d) => d.x + d.w <= 12), 'вставка у правого края сдвигает влево', P.devs.map((d) => d.id + '@' + d.x));
}
/* 3. прилипание: зазор полмодуля закрывается */
{
  const P = fresh(1, 12);
  A.addDevice('ekf-av6', { row: 0, x: 0 });
  const r = K.placeInsert(P, 0, 1.5, 1, null, { apply: false });
  ok(r && r.x === 1, 'прилипание к левому соседу', r);
  const r2 = K.placeInsert(P, 0, 1.5, 1, null, { apply: false, snap: false });
  ok(r2 && r2.x === 1.5, 'без прилипания остаётся на месте', r2);
}
/* 4. перемещение стрелками и между рейками */
{
  const P = fresh(2, 12);
  A.addDevice('ekf-av6'); A.addDevice('ekf-av6');
  const mv = (dir) => A.moveDev(dev('QF1'), dir);
  mv('L');
  ok(/влево некуда/.test(lastMsg()) && E.P === P, 'влево от края нельзя, модель та же', lastMsg());
  mv('D');
  ok(dev('QF1').row === 1 && dev('QF1').x === 0, 'на нижнюю рейку', dev('QF1'));
  mv('D');
  ok(dev('QF1').row === 1 && /Ниже реек нет/.test(lastMsg()), 'ниже последней нельзя');
  mv('R'); mv('R');
  ok(dev('QF1').x === 1, 'вправо на два полмодуля', dev('QF1').x);
  mv('U');
  ok(dev('QF1').row === 0 && !clean(E.P).length, 'обратно наверх с раздвижкой', E.P.devs.map((x) => x.id + '@' + x.row + ':' + x.x));
  A.undo(); A.undo();
  ok(E.P.devs.find((x) => x.id === 'QF1').row === 1, 'отмена вернула рейку');
  A.redo();
  ok(E.P.devs.find((x) => x.id === 'QF1').x === 1, 'возврат вернул сдвиг');
}
/* 4а. вставка за выделенным аппаратом и гребёнка, которая режется */
{
  const P = fresh(2, 12);
  for (let i = 0; i < 4; i++) A.addDevice('ekf-av6');
  E.sel = { kind: 'dev', id: 'QF1' };
  A.addDevice('ekf-av6');
  ok(dev('QF5').x === 1 && dev('QF2').x === 2, 'новый аппарат встаёт сразу за выделенным', T0());
  A.makeComb(dev('QF1'), ['L']);
  ok(E.P.combs.length === 1 && E.P.combs[0].devs.length === 5, 'гребёнка на пять автоматов', E.P.combs);
  A.moveDev(dev('QF5'), 'D');
  // гребёнку ставят только на аппараты вплотную: QF1 остался один слева от пустого места — тоже снят
  ok(E.P.combs.length === 1 && E.P.combs[0].devs.join() === 'QF2,QF3,QF4' && /QF1, QF5 сняты с гребёнки/.test(lastMsg()), 'QF5 ушёл на другую рейку, гребёнка осталась на соседних', [E.P.combs, lastMsg()]);
  A.addDevice('ekf-vd100n', { row: 0, x: 2 });
  ok(E.P.combs.length === 1 && E.P.combs[0].devs.join() === 'QF3,QF4' && /QF2 снят/.test(lastMsg()), 'вставка УЗО в середину гребёнки режет её', [E.P.combs, lastMsg(), T0()]);
  ok(!clean(E.P).length, 'модель цела после разрезания', clean(E.P));
}
/* 4б. группа аппаратов и обмен местами стрелками */
{
  const P = fresh(2, 12);
  for (let i = 0; i < 5; i++) A.addDevice('ekf-av6');
  A.moveDev(dev('QF2'), 'R');
  ok(dev('QF2').x === 2 && dev('QF3').x === 1, 'стрелка вправо вплотную к соседу меняет их местами', T0());
  A.setSel(['QF1', 'QF3']);
  A.moveGroup(['QF1', 'QF3'], 'D');
  ok(dev('QF1').row === 1 && dev('QF3').row === 1 && dev('QF1').x === 0 && dev('QF3').x === 1, 'группа переехала на рейку ниже вместе', T0());
  A.moveGroup(['QF1', 'QF3'], 'R'); A.moveGroup(['QF1', 'QF3'], 'R');
  ok(dev('QF1').x === 1 && dev('QF3').x === 2, 'группа сдвинута вправо', T0());
  A.commit(() => { K.placeBlock(E.P, 1, 6, ['QF1', 'QF3']); return ''; });
  A.moveGroup(['QF1', 'QF4'], 'U');
  ok(/одной рейки/.test(lastMsg()), 'группа с разных реек не двигается', lastMsg());
  A.commit(() => { dev('QF3').x = 9; return ''; });
  A.packGroup(['QF1', 'QF3']);
  ok(dev('QF1').x === 6 && dev('QF3').x === 7, 'группа собрана вплотную', T0());
  E.sel = { kind: 'devs', ids: ['QF1', 'QF3'] };
  A.delSel();
  ok(!dev('QF1') && !dev('QF3') && E.P.devs.length === 3, 'группа удалена', T0());
  ok(!clean(E.P).length, 'модель цела', clean(E.P));
}
/* 5. сборка квартирного щита вручную */
{
  const P = fresh(2, 12);
  P.name = 'Тест';
  A.addDevice('ekf-vn63n', { row: 0, x: 0 }, { poles: 2 });
  A.addDevice('ekf-vd100n', { row: 0, x: 2 });
  A.addDevice('ekf-av6', { row: 0, x: 4 }); A.addDevice('ekf-av6', { row: 0, x: 5 }); A.addDevice('ekf-av6', { row: 0, x: 6 });
  A.addDevice('ekf-av6', { row: 1, x: 0 });
  ok(P.devs.length === 6 && !clean(P).length, 'аппараты расставлены', P.devs.map((d) => d.id + '@' + d.row + ':' + d.x));
  const qs = P.devs.find((d) => d.type === 'sw'), qd = dev('QD1');
  const T = (d) => K.termNames(d);
  wire({ feed: 'L' }, { dev: qs.id, term: T(qs).top[0] });
  wire({ feed: 'N' }, { dev: qs.id, term: T(qs).top[1] });
  wire({ feed: 'PE' }, { bus: 'PE', slot: 0 });
  ok(P.wires.length === 3, 'ввод подключён', P.wires.length);
  wire({ dev: qs.id, term: T(qs).bot[0] }, { dev: 'QD1', term: T(qd).top[0] });
  wire({ dev: qs.id, term: T(qs).bot[1] }, { dev: 'QD1', term: T(qd).top[1] });
  wire({ dev: 'QD1', term: T(qd).bot[1] }, { bus: 'N1', slot: 0 });
  wire({ dev: qs.id, term: T(qs).bot[1] }, { bus: 'N1', slot: 1 });
  ok(P.wires.length === 6 && /смыка|нуль|УЗО|соедин/i.test(lastMsg() + ' ') , 'нуль до УЗО на шину УЗО — отказ', lastMsg());
  /* второй нуль ввода — на отдельную шину N2 (без УЗО) */
  E.sel = null;
  A.commit(() => { P.buses.push({ id: 'N2', kind: 'N', zone: 'top', x: 120, n: 6 }); return ''; });
  wire({ dev: qs.id, term: T(qs).bot[1] }, { bus: 'N2', slot: 0 });
  wire({ dev: 'QD1', term: T(qd).bot[0] }, { dev: 'QF1', term: 'L' });
  E.sel = { kind: 'dev', id: 'QF1' };
  // гребёнка QF1–QF3
  const before = P.combs.length;
  require('vm');
  E.P = P;
  A.makeComb(dev('QF1'), ['L']);
  ok(P.combs.length === before + 1 && P.combs[P.combs.length - 1].devs.length === 3, 'гребёнка на три автомата', P.combs);
  wire({ dev: qs.id, term: T(qs).bot[0] }, { dev: 'QF4', term: 'L' });
  ['QF1', 'QF2', 'QF3', 'QF4'].forEach((id) => { const r = K.autoLine(P, id, { name: id === 'QF4' ? 'Освещение' : 'Розетки ' + id }); ok(!r.err, 'автолиния ' + id, r.err); });
  const e = errs(P);
  ok(!e.length, 'щит без ошибок', e);
  const g = K.groups(P);
  ok(g.length === 4 && g.every((x) => x.prot), 'все группы защищены', g.map((x) => x.prot && x.prot.id));
  ok(g.filter((x) => /Розетки/.test(x.l.name)).every((x) => x.chain.some((d) => d.id === 'QD1')), 'розетки под УЗО');
  const n4 = P.wires.find((w) => w.b.line === g[3].l.id && w.b.core === 'N');
  ok(n4 && n4.a.bus === 'N2', 'нуль освещения — с шины без УЗО', n4);
  ok(svgOk(P), 'рисунок без NaN');
  const sh = E.sheetSVG('panel', 'A3') + E.sheetSVG('scheme', 'A4') + E.sheetSVG('bom', 'A3');
  ok(!/NaN|undefined/.test(sh), 'листы печати без NaN');
  /* ошибки монтажа ловятся */
  const P2 = JSON.parse(JSON.stringify(P));
  const nw = P2.wires.find((w) => w.b.line === g[0].l.id && w.b.core === 'N');
  nw.a = { bus: 'N2', slot: 3 };
  ok(errs(P2).some((t) => /мимо УЗО|через/.test(t)), 'чужой нуль найден', errs(P2));
  ok(K.canWire(P, { a: { dev: 'QF1', term: 'L>' }, b: { bus: 'PE', slot: 5 } }), 'фаза на PE — отказ');
  ok(K.canWire(P, { a: { bus: 'N2', slot: 4 }, b: { bus: 'PE', slot: 6 } }), 'N на PE в TN-C-S — отказ');
  /* перенумерация не рвёт провода */
  A.commit(() => { K.renumber(P); return ''; });
  ok(!clean(E.P).length && !errs(E.P).length, 'перенумерация сохраняет щит', clean(E.P));
  /* удаление аппарата удаляет его провода и гребёнку */
  E.sel = { kind: 'dev', id: E.P.combs[0].devs[1] };
  A.delSel();
  ok(!clean(E.P).length && E.P.combs.every((c) => c.devs.length >= 2), 'удаление аппарата из гребёнки', E.P.combs);
}
/* 5а. перенос конца провода и поиск клеммы под указателем */
{
  const P = fresh(1, 12);
  A.addDevice('ekf-av6'); A.addDevice('ekf-av6');
  const t1 = K.terms(dev('QF1')).find((x) => x.t === 'L');
  ok(JSON.stringify(A.endAt({ x: t1.x + 1, y: t1.y - 1 })) === JSON.stringify({ dev: 'QF1', term: 'L' }), 'клемма под указателем находится', A.endAt({ x: t1.x + 1, y: t1.y - 1 }));
  ok(A.endAt({ x: -100, y: -100 }) === null, 'вдали от клемм — ничего');
  wire({ feed: 'L' }, { dev: 'QF1', term: 'L' });
  const id = E.P.wires[0].id;
  A.moveWireEnd(id, 'b', { dev: 'QF2', term: 'L' });
  ok(E.P.wires[0].b.dev === 'QF2', 'конец провода перекинут на QF2', E.P.wires[0]);
  A.moveWireEnd(id, 'b', { bus: 'N1', slot: 0 });
  ok(E.P.wires[0].b.dev === 'QF2' && /замыкание/.test(lastMsg()), 'фазу на шину N не перекинуть', lastMsg());
  A.moveWireEnd(id, 'b', null);
  ok(E.P.wires[0].b.dev === 'QF2' && /Отпусти конец/.test(lastMsg()), 'мимо клеммы — провод остаётся', lastMsg());
}
/* 6. шины: прилипание, наложение, зоны */
{
  const P = fresh(2, 12);
  const b = P.buses[0];
  ok(K.busPlace(P, b, 'bottom', P.buses[1].x + 10) === null, 'шина не ложится на другую');
  const x = K.busPlace(P, b, 'bottom', P.buses[1].x + K.busW(P.buses[1]) + 7);
  ok(x === P.buses[1].x + K.busW(P.buses[1]) + 4, 'шина прилипает к соседней', x);
  A.moveBus(b, 'bottom');
  ok(b.zone === 'top' && /не помещается/.test(lastMsg()), 'вниз на занятое место нельзя');
  A.moveBus(b, '8');
  ok(b.x === 14, 'шина сдвинута вправо', b.x);
  A.moveBus(b, '-80');
  ok(b.x === 0, 'шина упёрлась в левый край', b.x);
  const r = K.resize(P, 1, 6);
  ok(r === '' && P.buses.every((z) => z.x <= K.busMaxX(P, z) + 1e-6), 'шины поджимаются при уменьшении корпуса', P.buses);
}
/* 7. размеры корпуса */
{
  const P = fresh(3, 12);
  A.addDevice('ekf-av6', { row: 2, x: 11 });
  ok(K.resize(P, 2, 12) !== '' && P.rows === 3, 'нельзя убрать рейку с аппаратами');
  ok(K.resize(P, 3, 8) !== '' && P.mods === 12, 'нельзя сузить под аппаратом');
  ok(K.resize(P, 4, 18) === '' && P.rows === 4 && P.mods === 18, 'увеличение корпуса');
  P.pitch = 175;
  ok(svgOk(P) && !clean(P).length, 'шаг реек 175 мм');
}
/* 7а. рейки по одной */
{
  const P = fresh(2, 12);
  A.addDevice('ekf-av6', { row: 0, x: 0 }); A.addDevice('ekf-av6', { row: 1, x: 0 });
  wire({ dev: 'QF1', term: 'L>' }, { dev: 'QF2', term: 'L' });
  ok(K.railOp(P, 'insert', 1) === '' && P.rows === 3 && dev('QF2').row === 2, 'пустая рейка вставлена между');
  ok(K.railOp(P, 'swap', 0) === '' && dev('QF1').row === 1, 'рейки поменялись местами');
  ok(K.railOp(P, 'remove', 1) !== '' && P.rows === 3, 'рейку с аппаратами не убрать');
  ok(K.railOp(P, 'remove', 0) === '' && P.rows === 2 && dev('QF1').row === 0 && dev('QF2').row === 1, 'пустая рейка убрана');
  ok(!clean(P).length && svgOk(P), 'модель цела после операций с рейками', clean(P));
}
/* 8. шина на DIN-рейку */
{
  const P = fresh(1, 12);
  A.addDevice('gen-dbusN', { row: 0, x: 0 }, { w: 4 });
  const d = P.devs[0];
  ok(d && d.type === 'dbus' && d.id === 'XN1' && K.termNames(d).top.length === 8, 'шина N на рейке', d);
  A.addDevice('ekf-av6', { row: 0, x: 5 });
  wire({ dev: 'XN1', term: 'N1' }, { dev: 'QF1', term: 'L' });
  ok(P.wires.length === 0 && /короткое замыкание/.test(lastMsg()), 'фаза на шину N — отказ', lastMsg());
}
/* 9. трёхфазный щит и гребёнка 3ф */
{
  const P = fresh(2, 12);
  P.feed.phases = 3;
  for (let i = 0; i < 6; i++) A.addDevice('ekf-av6');
  A.makeComb(dev('QF1'), ['L1', 'L2', 'L3']);
  wire({ feed: 'L1' }, { dev: 'QF1', term: 'L' });
  wire({ feed: 'L2' }, { dev: 'QF2', term: 'L' });
  wire({ feed: 'L3' }, { dev: 'QF3', term: 'L' });
  ok(P.wires.length === 3, 'три фазы на гребёнку', P.wires.length);
  wire({ feed: 'L1' }, { dev: 'QF5', term: 'L' });
  ok(P.wires.length === 3 && /разные фазы|межфазное/.test(lastMsg()), 'L1 на клемму фазы L2 — отказ', lastMsg());
}
/* 10. импорт всех разборов и автолиния не портят модель */
Object.keys(S.guideCfgs || {}).forEach((id) => {
  const P = K.fromBuilder(S.engine.build(S.guideCfgs[id](S.engine.newLine)), 'iek');
  ok(!clean(P).length, 'импорт ' + id, clean(P));
  ok(!errs(P).length, 'проверки ' + id, errs(P));
  ok(svgOk(P), 'рисунок ' + id);
});

/* 11. случайные действия */
const N = Number(process.argv[2]) || 3000;
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const sids = L.list().map((s) => s.id);
const guides = Object.keys(S.guideCfgs || {});
let steps = 0, firstBad = null;
for (let round = 0; round < Math.ceil(N / 150); round++) {
  if (round % 3 === 0) fresh(pick([1, 2, 3, 4]), pick([12, 18, 24]));
  else { E.P = K.fromBuilder(S.engine.build(S.guideCfgs[pick(guides)](S.engine.newLine)), pick(['ekf', 'iek', 'abb', 'se'])); E.hist = []; E.fut = []; }
  if (rnd() < 0.3) E.P.feed.phases = 3;
  E.P.pitch = pick(K.PITCHES);
  for (let s = 0; s < 150 && steps < N; s++, steps++) {
    const P = E.P;
    const op = rnd();
    try {
      if (op < 0.2) A.addDevice(pick(sids), rnd() < 0.7 ? { row: Math.floor(rnd() * P.rows), x: Math.round(rnd() * P.mods * 2) / 2 } : null);
      else if (op < 0.3 && P.devs.length) A.moveDev(pick(P.devs), pick(['L', 'R', 'U', 'D']));
      else if (op < 0.35 && P.devs.length) {
        const d0 = pick(P.devs), same = P.devs.filter((d) => d.row === d0.row);
        const ids = same.filter(() => rnd() < 0.5).map((d) => d.id).concat([d0.id]).filter((x, i, a) => a.indexOf(x) === i);
        const r = rnd();
        if (r < 0.5) A.moveGroup(ids, pick(['L', 'R', 'U', 'D']));
        else if (r < 0.7) A.packGroup(ids);
        else { const row = Math.floor(rnd() * P.rows), x = Math.round(rnd() * P.mods * 2) / 2; A.commit(() => (K.placeBlock(P, row, x, ids) ? '' : 'нет')); }
      }
      else if (op < 0.45 && P.devs.length) {
        const d = pick(P.devs), row = Math.floor(rnd() * P.rows), x = Math.round(rnd() * P.mods * 2) / 2;
        A.commit(() => { const r = K.placeInsert(P, row, x, d.w, d.id); if (!r) return 'нет'; d.row = row; d.x = r.x; return ''; });
      } else if (op < 0.6) {
        const ends = [];
        P.devs.forEach((d) => { const T = K.termNames(d); T.top.concat(T.bot).filter(Boolean).forEach((t) => ends.push({ dev: d.id, term: t })); });
        P.buses.forEach((b) => ends.push({ bus: b.id, slot: Math.floor(rnd() * b.n) }));
        K.feedCores(P).forEach((c) => ends.push({ feed: c }));
        P.lines.forEach((l) => K.lineCores(P, l).forEach((c) => ends.push({ line: l.id, core: c })));
        if (ends.length > 1) wire(pick(ends), pick(ends));
      } else if (op < 0.66 && P.devs.length) { const d = pick(P.devs); A.commit(() => { const r = K.autoLine(P, d.id); return r.err || ''; }); }
      else if (op < 0.72 && P.buses.length) A.moveBus(pick(P.buses), pick(['8', '-8', '40', '-40', 'top', 'bottom']));
      else if (op < 0.76 && P.devs.length) { const d = pick(P.devs); if (d.type === 'mcb' || d.type === 'rcbo') A.makeComb(d, d.poles >= 3 || rnd() < 0.3 ? ['L1', 'L2', 'L3'] : ['L']); }
      else if (op < 0.84) {
        const kinds = [['dev', P.devs], ['wire', P.wires], ['bus', P.buses], ['line', P.lines], ['comb', P.combs]].filter(([, a]) => a.length);
        if (kinds.length) { const [k, a] = pick(kinds); E.sel = { kind: k, id: pick(a).id }; A.delSel(); }
      } else if (op < 0.88) A.commit(() => K.resize(P, Math.max(1, P.rows + pick([-1, 0, 1])), pick([12, 18, 24])));
      else if (op < 0.92) A.undo();
      else if (op < 0.95) A.redo();
      else if (op < 0.955) A.commit(() => { K.renumber(P); return ''; });
      else if (op < 0.96) A.commit(() => K.railOp(P, pick(['insert', 'remove', 'swap']), Math.floor(rnd() * P.rows)));
      else if (op < 0.97) A.commit(() => { K.arrangeBuses(P); K.balanceBuses(P); return ''; });
      else {
        /* свойства из правой панели */
        const r = rnd();
        if (r < 0.25) { E.sel = null; const k = pick(['rows', 'mods', 'pitch', 'phases', 'earthing', 'preset']); A.setProp('pf', k, { rows: String(pick([1, 2, 3, 4, 5])), mods: String(pick([8, 12, 18, 24])), pitch: String(pick(K.PITCHES)), phases: String(pick([1, 3])), earthing: pick(['TN-C-S', 'TN-S', 'TN-C>S', 'TT']), preset: pick(K.PRESETS).join('x') }[k]); }
        else if (r < 0.55 && P.devs.length) {
          const d = pick(P.devs), s = K.spec(d) || {}; E.sel = { kind: 'dev', id: d.id };
          const k = pick(['sid', 'poles', 'In', 'w', 'id', 'curve']);
          const same = L.list().filter((x) => x.kind === s.kind);
          const v = { sid: same.length ? pick(same).id : d.sid, poles: String(pick(s.poles || [1])), In: String(pick(s.In || [16])), w: String(pick(s.wOpts || [d.w])), id: pick(['QF1', 'QF99', 'X' + steps, '']), curve: pick(s.curves || ['C']) }[k];
          A.setProp('df', k, v);
        } else if (r < 0.75 && P.buses.length) { const b = pick(P.buses); E.sel = { kind: 'bus', id: b.id }; const k = pick(['kind', 'n', 'zone', 'x', 'id']); A.setProp('bf', k, { kind: pick(['N', 'PE']), n: String(pick([4, 6, 8, 12, 20, 28])), zone: pick(['top', 'bottom']), x: Math.round(rnd() * 300), id: pick(['N1', 'PE', 'N' + steps]) }[k]); }
        else if (r < 0.88 && P.lines.length) { const l = pick(P.lines); E.sel = { kind: 'line', id: l.id }; const k = pick(['cores', 'num', 'name']); A.setProp('lf', k, { cores: pick(['L,N,PE', 'L1,L2,L3,N,PE', 'L1,L2,L3,PE']), num: Math.floor(rnd() * 20), name: 'Розетки' }[k]); }
        else if (P.wires.length) { const w = pick(P.wires); E.sel = { kind: 'wire', id: w.id }; const k = pick(['side', 'mm2', 'cond']); A.setProp('wf', k, { side: pick(['', 'L', 'R']), mm2: String(pick(K.SECTIONS)), cond: pick(['L', 'N', 'PE']) }[k]); }
      }
    } catch (er) { fails++; console.log('THROW at step', steps, er.stack.split('\n').slice(0, 3).join(' | ')); break; }
    const v = clean(E.P).concat(K.faults(E.P));
    if (v.length && !firstBad) { firstBad = { step: steps, v, op }; }
    if (E.guardHits && !firstBad) firstBad = { step: steps, guard: E.guardHits, op };
    if (steps % 50 === 0) { K.checks(E.P); K.bom(E.P); K.groups(E.P); if (!svgOk(E.P)) { fails++; console.log('NaN in svg at', steps); } }
  }
}
if (firstBad) { fails++; console.log('FAIL случайные действия: модель испорчена', JSON.stringify(firstBad)); } else okN++;
if (process.env.STATS) {
  const h = {}; allMsgs.forEach((m) => { const k = m.replace(/[A-ZА-Я]+\d+|\d+/g, '#').slice(0, 90); h[k] = (h[k] || 0) + 1; });
  Object.entries(h).sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, n]) => console.log(String(n).padStart(6), k));
  console.log('итог последнего щита: аппаратов', E.P.devs.length, 'проводов', E.P.wires.length, 'линий', E.P.lines.length, 'гребёнок', E.P.combs.length);
}
console.log(`Сценарии и ${steps} случайных шагов: пройдено ${okN}, ошибок ${fails}.`);
process.exit(fails ? 1 : 0);
