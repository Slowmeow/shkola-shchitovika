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
/* 9а. маркировка проводов, петли, кабельный журнал, спецификация */
{
  const P = fresh(2, 12);
  A.addDevice('ekf-av6'); A.addDevice('ekf-av6'); A.addDevice('ekf-av6');
  wire({ feed: 'L' }, { dev: 'QF1', term: 'L' });
  wire({ dev: 'QF1', term: 'L' }, { dev: 'QF2', term: 'L' });
  ok(E.P.wires.map((w) => w.num).join() === '1,2', 'новые провода получают номера 1, 2', E.P.wires.map((w) => w.num));
  const r = K.autoLine(E.P, 'QF2'); A.commit(() => '', true);
  ok(!r.err && E.P.wires.slice(-3).map((w) => w.num).join() === '3,4,5', 'автолиния нумерует свои провода', E.P.wires.map((w) => w.num));
  E.sel = { kind: 'wire', id: E.P.wires[1].id };
  A.setProp('wf', 'num', 1);
  ok(E.P.wires[1].num === 2 && /уже есть/.test(lastMsg()), 'два провода с одним номером не бывает', lastMsg());
  A.setProp('pf', 'wnStart', 7); A.commit(() => { K.numberWires(E.P, true); return ''; });
  ok(Math.min(...E.P.wires.map((w) => w.num)) === 7 && new Set(E.P.wires.map((w) => w.num)).size === E.P.wires.length, 'перенумерация с 7, номера разные', E.P.wires.map((w) => w.num));
  A.setProp('pf', 'wireStyle', 'loop');
  const pts = K.route(E.P, E.P.wires[0], 0);
  ok(pts && pts.bez && pts.length === 25 && K.wireLen(E.P, E.P.wires[0], 0) > 0, 'провод петлёй: кривая и длина', pts && pts.length);
  ok(!clean(E.P).length && svgOk(E.P), 'щит с петлями рисуется', clean(E.P));
  const svg = S.edDraw(E.P, { interactive: true }).svg;
  ok(/>7<\/text>/.test(svg) && /#8a4fc4/.test(svg), 'на проводе кольцо с цифрой 7 фиолетового цвета');
  A.setProp('pf', 'wireStyle', 'line');
  ok(K.route(E.P, E.P.wires[0], 0).length === 2, 'прямой провод — две точки');
  const J = K.journal(E.P);
  ok(J.length === E.P.wires.length && J[0].num === 7 && /Ввод/.test(J.map((x) => x.from + x.to).join()), 'кабельный журнал: все провода по номерам', J.slice(0, 2));
  const B = K.bom(E.P);
  ok(B.some((b) => /НШВИ2/.test(b.name)) && B.some((b) => /Маркер провода/.test(b.name)), 'двойной наконечник и маркеры в спецификации', B.map((b) => b.name));
  E.sel = { kind: 'dev', id: 'QF3' }; A.setProp('df', 'art', 'TEST-123');
  ok(K.bom(E.P).some((b) => b.art === 'TEST-123'), 'артикул аппарата попадает в спецификацию');
  ok(!/NaN|undefined/.test(E.sheetSVG('journal', 'A3', 0) + E.sheetSVG('bom', 'A4', 0)), 'листы журнала и спецификации без NaN');
}
/* 9б. свой шаг для каждой рейки, ограничители, копирование */
{
  const P = fresh(3, 12);
  A.addDevice('ekf-av6', { row: 0, x: 2 }); A.addDevice('ekf-av6', { row: 0, x: 3 }); A.addDevice('ekf-av6', { row: 1, x: 0 });
  wire({ dev: 'QF1', term: 'L>' }, { dev: 'QF2', term: 'L' });
  const h0 = K.H(E.P);
  E.sel = null; A.setProp('pf', 'rp0', '175');
  K.sync(E.P);
  ok(Math.round(K.railY(1) - K.railY(0)) === 175 && Math.round(K.railY(2) - K.railY(1)) === 134 && Math.round(K.H(E.P) - h0) === 41, 'шаг между 1 и 2 рейкой 175 мм, остальные 134', [K.railY(0), K.railY(1), K.railY(2)]);
  A.commit(() => K.railOp(E.P, 'insert', 1));
  ok(E.P.rows === 4 && E.P.pitches.length === 3 && !clean(E.P).length, 'вставка рейки сохраняет шаги', E.P.pitches);
  A.commit(() => { const r = K.autoStops(E.P); return r.added === 4 ? '' : 'stops ' + JSON.stringify(r); });
  ok(E.P.devs.filter((d) => d.type === 'stop').length === 4 && !clean(E.P).length, 'по два ограничителя на рейку с аппаратами', T0());
  const again = K.autoStops(JSON.parse(JSON.stringify(E.P)));
  ok(again.added === 0, 'второй раз ограничители не дублируются', again);
  ok(K.bom(E.P).some((b) => /Ограничитель/.test(b.name) && b.qty === 4), 'ограничители в спецификации');
  A.setSel(['QF1', 'QF2']); A.copySel(false);
  const n0 = E.P.devs.length, w0 = E.P.wires.length;
  A.paste();
  ok(E.P.devs.length === n0 + 2 && E.P.wires.length === w0 + 1 && !clean(E.P).length && !K.faults(E.P).length, 'вставка двух автоматов с проводом между ними', T0());
  const nw = E.P.wires[E.P.wires.length - 1];
  ok(nw.a.dev !== 'QF1' && nw.b.dev !== 'QF2' && E.P.devs.some((d) => d.id === nw.a.dev), 'провод вставлен между новыми аппаратами', nw);
  ok(new Set(E.P.wires.map((w) => w.num)).size === E.P.wires.length, 'у вставленного провода свой номер');
  E.sel = { kind: 'wire', id: E.P.wires[0].id };
  ok(/Вставить/.test(A.ctxHTML('empty')) && /Петлёй/.test(A.ctxHTML('wire')) && /Вывести линию/.test((A.setSel(['QF1']), A.ctxHTML('dev'))), 'контекстное меню собирается');
}
/* 9в. маркировка аппаратов, артикулы, перечень элементов, выноски, листы, лента */
{
  const art = (sid, o) => K.artOf(L.make(sid, o));
  ok(art('iek-va4729', { In: 16 }) === 'MVA20-1-016-C', 'артикул IEK ВА47-29', art('iek-va4729', { In: 16 }));
  ok(art('ekf-av6', { poles: 2, In: 16, curve: 'B' }) === 'mcb6-2-16B-av', 'артикул EKF AV-6');
  ok(art('ekf-va4763', { In: 16 }) === 'mcb4763-1-16C-pro', 'артикул EKF ВА 47-63');
  ok(art('abb-s200', { In: 16 }) === '2CDS251001R0164' && art('abb-s200', { In: 16, curve: 'B' }) === '', 'артикул ABB S201 C16, для B — пусто');
  ok(art('se-ez9f', { In: 16 }) === 'EZ9F34116' && art('sys-c9f', { In: 16, curve: 'B' }) === 'C9F14116' && art('sys-c9f', { poles: 2, In: 63 }) === 'C9F34263', 'артикулы Easy9 и City9');
  ok(art('ekf-av6', { In: 6 }) === '', 'для номиналов меньше 10 А артикул не выдумывается');
  ok(L.byId('ekf-va4763').icu === 4.5, 'ВА 47-63 PROxima — 4,5 кА по каталогу EKF');
  const P = fresh(2, 12);
  for (let i = 0; i < 5; i++) A.addDevice('sys-c9f');
  A.addDevice('ekf-vd100n');
  const R = K.elements(E.P);
  ok(R.some((r) => r.pos === 'QF1–QF5' && r.qty === 5 && r.note === 'C9F34116'), 'перечень: QF1–QF5 одной строкой с артикулом', R);
  E.sel = { kind: 'dev', id: 'QF3' }; A.setProp('df', 'noBom', true);
  ok(K.elements(E.P).some((r) => r.pos === 'QF1, QF2, QF4, QF5' && r.qty === 4) && K.bom(E.P).find((b) => /City9/.test(b.name)).qty === 4, 'аппарат «не включать» выпадает из перечня и спецификации', K.elements(E.P));
  E.sel = { kind: 'dev', id: 'QF1' }; A.setProp('df', 'name', 'Автомат вводной особый');
  ok(K.bom(E.P).some((b) => b.name === 'Автомат вводной особый'), 'своё наименование в спецификации');
  wire({ feed: 'L' }, { dev: 'QF1', term: 'L' });
  A.setProp('pf', 'wnStart', 11); A.commit(() => { K.numberWires(E.P, true); return ''; });
  ok(K.bom(E.P).some((b) => b.name === 'Маркер провода «1»' && b.qty === 4), 'маркеры по цифрам: номер 11 — четыре «1»', K.bom(E.P).filter((b) => /Маркер/.test(b.name)));
  A.commit(() => { E.P.notes = [{ id: 'n1', ax: 60, ay: 120, x: 80, y: 90, text: 'Затянуть 2 Н·м' }]; return ''; });
  const svg = S.edDraw(E.P, { interactive: true }).svg;
  ok(/data-note="n1"/.test(svg) && /Затянуть/.test(svg) && !/NaN/.test(svg), 'выноска рисуется');
  E.sel = { kind: 'note', id: 'n1' }; A.delSel();
  ok(!E.P.notes.length, 'выноска удаляется');
  ['pe', 'tags', 'labels', 'bom', 'journal'].forEach((k) => ok(!/NaN|undefined/.test(E.sheetSVG(k, 'A3', 0)), 'лист печати ' + k));
  ['home', 'insert', 'wires', 'view', 'reports'].forEach((t) => { E.rtab = t; ok(A.ribbonHTML().length > 300, 'лента: вкладка ' + t); });
  E.rtab = 'home';
  E.P.view.sheet = { bom: true, pe: true, journal: true, groups: true, checks: true };
  const X = A.sheetExtras(E.P, 300, 0);
  ok(X && X.w > 100 && X.h > 50 && !/NaN|undefined/.test(X.svg), 'таблицы рядом со щитом', X && [X.w, X.h]);
  ok(!clean(E.P).length, 'модель цела', clean(E.P));
}
/* 9г. любой щит: короткие рейки, монтажная панель, боковые шины, клеммы, шаблоны */
{
  const P = fresh(3, 18);
  A.addDevice('ekf-av6', { row: 1, x: 10 });
  ok(K.setRail(E.P, 1, { mods: 8 }) !== '', 'рейку не укоротить, если аппарат дальше её конца');
  ok(K.setRail(E.P, 2, { mods: 8, off: 5, label: 'Слаботочка' }) === '' && K.cap(E.P, 2) === 8 && K.rail(E.P, 2).off === 5, 'короткая рейка с отступом');
  K.sync(E.P);
  A.addDevice('ekf-av6', { row: 2, x: 7.5 });
  const d2 = E.P.devs.find((d) => d.row === 2);
  ok(d2 && d2.x + d2.w <= 8 && K.devGeo(d2).x > K.G.SD + 5 * K.G.MOD - 1, 'аппарат встаёт на короткую рейку с её отступом', d2);
  A.moveDev(d2, 'R'); A.moveDev(d2, 'R');
  ok(E.P.devs.find((d) => d.id === d2.id).x + d2.w <= 8, 'за конец короткой рейки не уехать');
  ok(K.setRail(E.P, 0, { kind: 'plate', h: 210, label: 'Учёт' }) === '' && (K.sync(E.P), Math.round(K.zoneH(0)) === 210), 'монтажная панель высотой 210 мм');
  A.addDevice('gen-meterpl1', { row: 0, x: 2 });
  ok(E.P.devs.some((d) => d.sid === 'gen-meterpl1') && !clean(E.P).length && svgOk(E.P), 'счётчик на панели', clean(E.P));
  /* шины на боковых стенках */
  const b = E.P.buses.find((x) => x.kind === 'PE');
  const y0 = K.busPlace(E.P, b, 'right', 40);
  A.commit(() => { b.zone = 'right'; b.x = y0; return ''; });
  ok(K.busGeo(E.P, b).vertical && K.busSlot(E.P, b, 1).y > K.busSlot(E.P, b, 0).y, 'шина PE справа, вертикально');
  wire({ dev: d2.id, term: 'L>' }, { bus: 'N1', slot: 9 });
  A.autoLine && null;
  const r = K.autoLine(E.P, d2.id); A.commit(() => '', true);
  ok(!r.err && E.P.wires.some((w) => w.a.bus === 'PE' || w.b.bus === 'PE'), 'линия берёт PE с боковой шины', r.err);
  A.setProp('pf', 'wireStyle', 'loop');
  ok(!clean(E.P).length && svgOk(E.P), 'петли от боковой шины рисуются', clean(E.P));
  ok(K.busPlace(E.P, E.P.buses.find((x) => x.kind === 'N'), 'right', y0) === null, 'на занятое место у стенки шина не встаёт');
  /* клеммы на DIN-рейку */
  A.addDevice('gen-tbn', { row: 1, x: 0 }); A.addDevice('gen-tb', { row: 1, x: 0.5 });
  const tn = E.P.devs.find((d) => d.sid === 'gen-tbn'), tl = E.P.devs.find((d) => d.sid === 'gen-tb');
  wire({ bus: 'N1', slot: 6 }, { dev: tn.id, term: '1' });
  ok(E.P.wires.some((w) => w.b.dev === tn.id), 'нуль на синюю клемму');
  wire({ dev: tn.id, term: '2' }, { dev: d2.id, term: 'L' });
  ok(/короткое замыкание/.test(lastMsg()), 'с синей клеммы N на фазу автомата — отказ', lastMsg());
  ok(K.termNames(tl).top[0] === '1' && K.termNames(tl).bot[0] === '2', 'у клеммы вход 1 и выход 2');
  /* шаблоны */
  K.TEMPLATES.forEach((t) => { const T = K.template(t.id); ok(!K.validate(T).length && !/NaN|undefined/.test(S.edDraw(T, { interactive: true }).svg), 'шаблон ' + t.id, K.validate(T)); });
  const H3 = K.template('house3');
  ok(H3.buses.every((x) => K.vert(x.zone)) && H3.feed.phases === 3, 'дом: шины на боковых стенках, три фазы');
  const FL = K.template('floor');
  ok(K.rail(FL, 0).kind === 'plate' && K.cap(FL, 2) === 12 && FL.devs.filter((d) => d.type === 'meter').length === 3, 'этажный щит: панель учёта, три счётчика, короткая рейка');
  /* корпус уже: короткие рейки поджимаются */
  const P4 = K.template('auto');
  ok(K.resize(P4, 3, 18) === '' && K.cap(P4, 2) <= 18 && !K.validate(P4).length, 'корпус уже — рейки поджаты', K.validate(P4));
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
      else if (op < 0.72 && P.buses.length) A.moveBus(pick(P.buses), pick(['8', '-8', '40', '-40', 'top', 'bottom', 'left', 'right']));
      else if (op < 0.76 && P.devs.length) { const d = pick(P.devs); if (d.type === 'mcb' || d.type === 'rcbo') A.makeComb(d, d.poles >= 3 || rnd() < 0.3 ? ['L1', 'L2', 'L3'] : ['L']); }
      else if (op < 0.84) {
        const kinds = [['dev', P.devs], ['wire', P.wires], ['bus', P.buses], ['line', P.lines], ['comb', P.combs]].filter(([, a]) => a.length);
        if (kinds.length) { const [k, a] = pick(kinds); E.sel = { kind: k, id: pick(a).id }; A.delSel(); }
      } else if (op < 0.88) A.commit(() => K.resize(P, Math.max(1, P.rows + pick([-1, 0, 1])), pick([12, 18, 24])));
      else if (op < 0.92) A.undo();
      else if (op < 0.95) A.redo();
      else if (op < 0.955) A.commit(() => { K.renumber(P); return ''; });
      else if (op < 0.96) A.commit(() => K.railOp(P, pick(['insert', 'remove', 'swap']), Math.floor(rnd() * P.rows)));
      else if (op < 0.965) A.commit(() => { K.arrangeBuses(P); K.balanceBuses(P); return ''; });
      else if (op < 0.97) {
        const r2 = rnd();
        if (r2 < 0.3 && P.devs.length) { A.setSel(P.devs.filter(() => rnd() < 0.3).map((d) => d.id).slice(0, 4)); if (E.sel) { A.copySel(rnd() < 0.3); A.paste(); } }
        else if (r2 < 0.5) A.commit(() => { K.autoStops(P); return ''; });
        else if (r2 < 0.7) { E.sel = null; A.setProp('pf', 'rp' + Math.floor(rnd() * Math.max(1, P.rows - 1)), String(pick([125, 134, 150, 175, 200]))); }
        else if (r2 < 0.78) { E.sel = null; A.setProp('pf', 'wireStyle', pick(['duct', 'loop', 'line'])); }
        else if (r2 < 0.85) { const k = Math.floor(rnd() * P.rows); A.commit(() => K.setRail(P, k, pick([{ mods: Math.max(2, Math.floor(rnd() * P.mods) + 1), off: Math.floor(rnd() * 4) }, { kind: pick(['din', 'plate']) }, { h: pick([92, 120, 210]) }, { label: 'Отсек' }]))); }
        else if (P.wires.length) { const w = pick(P.wires); E.sel = { kind: 'wire', id: w.id }; const k = pick(['style', 'num', 'color', 'slack']); A.setProp('wf', k, { style: pick(['', 'duct', 'loop', 'line']), num: Math.floor(rnd() * 30), color: pick(['', 'black', 'blue', 'yg']), slack: pick(['', 0, 10, 30]) }[k]); }
      }
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
