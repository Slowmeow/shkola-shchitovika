/* Школа щитовика — библиотека аппаратов для редактора щита.
   Ширина серий в модулях (17,5 мм по DIN 43880) — по каталогам производителей; сверена с каталогом panel-workshop.ru/catalog
   (EKF, IEK, ABB) и документацией Schneider Electric Easy9 (EZ9R 2P — 36 мм, 4P — 72 мм; EZ9S 2P — 36 мм).
   Высота корпуса — 85 мм, у модульных контакторов — 90 мм. Перед заказом сверяй габариты с паспортом изготовителя.
   Свои аппараты пользователя хранятся в localStorage («shk:edlib»). */
(function () {
  'use strict';
  const S = window.SHK;

  const STD_IN = [0.5, 1, 2, 3, 4, 5, 6, 8, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125];
  const range = (a, b) => STD_IN.filter((x) => x >= a && x <= b);

  const BRANDS = {
    ekf: { name: 'EKF', note: 'на объекте пользователя' },
    iek: { name: 'IEK' },
    abb: { name: 'ABB' },
    se: { name: 'Schneider Electric' },
    sys: { name: 'Systeme Electric' },
    gen: { name: 'Общие' },
    my: { name: 'Мои' }
  };

  const KIND = {
    mcb: 'Автоматы', rcbo: 'Дифавтоматы', rcd: 'УЗО', sw: 'Выключатели нагрузки', spd: 'УЗИП', rn: 'Реле напряжения',
    km: 'Контакторы', meter: 'Счётчики', dbus: 'Шины N и PE на DIN-рейку', xt: 'Кросс-модули', blank: 'Заглушки', stop: 'Ограничители на DIN-рейку'
  };

  /* артикулы по шаблонам каталогов производителей (проверены на примерах: MVA20-1-016-C, mcb6-2-16B-av, mcb4763-1-16C-pro,
     2CDS251001R0164, EZ9F34116, C9F34116 и C9F14116); только целые номиналы от 10 А (у IEK — от 1 А), сверять перед заказом */
  const pad = (n, k) => String(n).padStart(k, '0');
  const okIn = (d, min) => Number.isInteger(d.In) && d.In >= (min || 10) && d.In <= 63;
  const ART = {
    'ekf-av6': (d) => (okIn(d) && d.curve ? `mcb6-${d.poles}-${d.In}${d.curve}-av` : ''),
    'ekf-va4763': (d) => (okIn(d) && d.curve ? `mcb4763-${d.poles}-${d.In}${d.curve}-pro` : ''),
    'iek-va4729': (d) => (okIn(d, 1) && d.curve ? `MVA20-${d.poles}-${pad(d.In, 3)}-${d.curve}` : ''),
    'abb-s200': (d) => (okIn(d) && d.curve === 'C' ? `2CDS25${d.poles}001R${pad(d.In, 3)}4` : ''),
    'se-ez9f': (d) => (okIn(d) && (d.curve === 'B' || d.curve === 'C') ? `EZ9F${d.curve === 'B' ? 1 : 3}4${d.poles}${pad(d.In, 2)}` : ''),
    'sys-c9f': (d) => (okIn(d) && (d.curve === 'B' || d.curve === 'C') ? `C9F${d.curve === 'B' ? 1 : 3}4${d.poles}${pad(d.In, 2)}` : '')
  };
  /* надпись серии на лицевой панели */
  const FACE = {
    'ekf-av6': 'AV-6', 'ekf-av10': 'AV-10', 'ekf-va4763': 'ВА 47-63', 'ekf-avdt63n': 'АВДТ-63N', 'ekf-dva6': 'DVA-6', 'ekf-vd100n': 'ВД-100N', 'ekf-vn63n': 'ВН-63N', 'ekf-opvc': 'ОПВ-C', 'ekf-rvb': 'RVb', 'ekf-km': 'КМ',
    'iek-va4729': 'ВА47-29', 'iek-m06n': 'M06N', 'iek-avdt32': 'АВДТ32', 'iek-avdt34': 'АВДТ34', 'iek-vd163': 'ВД1-63', 'iek-vn32': 'ВН-32', 'iek-ops1': 'ОПС1', 'iek-rnd': 'РН-Д', 'iek-km': 'КМ',
    'abb-s200': (d) => 'S20' + d.poles, 'abb-sh200': (d) => 'SH20' + d.poles, 'abb-basicm': 'Basic M', 'abb-ds200': 'DS200', 'abb-f200': (d) => 'F20' + d.poles, 'abb-sd200': (d) => 'SD20' + d.poles, 'abb-ovr': 'OVR',
    'se-ez9f': 'Easy9', 'se-ez9r': 'Easy9', 'se-ez9s': 'Easy9', 'sys-c9f': 'City9 Set'
  };

  /* w — ширина в модулях: число (на весь аппарат) или функция от числа полюсов */
  const perPole = (p) => p;
  const L = [
    // EKF
    { id: 'ekf-av6', brand: 'ekf', series: 'AV-6 AVERES', kind: 'mcb', poles: [1, 2, 3, 4], w: perPole, In: range(1, 63), curves: ['B', 'C', 'D'], icu: 6, cable: '1–25 мм² (жёсткий), 1–16 мм² (гибкий)' },
    { id: 'ekf-av10', brand: 'ekf', series: 'AV-10 AVERES', kind: 'mcb', poles: [1, 2, 3, 4], w: perPole, In: range(1, 63), curves: ['B', 'C', 'D'], icu: 10 },
    { id: 'ekf-va4763', brand: 'ekf', series: 'ВА 47-63 PROxima', kind: 'mcb', poles: [1, 2, 3, 4], w: perPole, In: range(0.5, 63), curves: ['B', 'C', 'D'], icu: 4.5, torque: 'не более 2,5 Н·м' },
    { id: 'ekf-avdt63n', brand: 'ekf', series: 'АВДТ-63N', kind: 'rcbo', poles: [2, 4], w: perPole, In: range(6, 63), curves: ['B', 'C'], ma: [10, 30, 100, 300], rt: ['AC', 'A'] },
    { id: 'ekf-dva6', brand: 'ekf', series: 'DVA-6 AVERES', kind: 'rcbo', poles: [2], w: 2, In: range(6, 40), curves: ['B', 'C', 'D'], ma: [10, 30, 100, 300], rt: ['AC', 'A'], icu: 6 },
    { id: 'ekf-vd100n', brand: 'ekf', series: 'ВД-100N', kind: 'rcd', poles: [2, 4], w: perPole, In: range(16, 100), ma: [10, 30, 100, 300], rt: ['AC', 'A'] },
    { id: 'ekf-vn63n', brand: 'ekf', series: 'ВН-63N', kind: 'sw', poles: [1, 2, 3, 4], w: perPole, In: range(16, 63) },
    { id: 'ekf-opvc', brand: 'ekf', series: 'ОПВ-C', kind: 'spd', poles: [1, 2, 3, 4], w: perPole, cls: 'T2' },
    { id: 'ekf-rvb', brand: 'ekf', series: 'RVb', kind: 'rn', poles: [1], w: 2, In: [40, 50, 63] },
    { id: 'ekf-km', brand: 'ekf', series: 'КМ AVERES', kind: 'km', poles: [2, 4], w: (p) => (p > 2 ? 2 : 1), In: [20, 25, 40, 63], h: 90 },
    { id: 'ekf-cm', brand: 'ekf', series: 'Кросс-модуль', kind: 'xt', poles: [2, 4], w: (p) => (p > 2 ? 8 : 4.5), In: [100, 125] },
    // IEK
    { id: 'iek-va4729', brand: 'iek', series: 'ВА47-29 KARAT', kind: 'mcb', poles: [1, 2, 3, 4], w: perPole, In: range(1, 63), curves: ['B', 'C', 'D'], icu: 4.5, cable: 'до 25 мм²' },
    { id: 'iek-m06n', brand: 'iek', series: 'ARMAT M06N', kind: 'mcb', poles: [1, 2, 3, 4], w: perPole, In: range(0.5, 63), curves: ['B', 'C', 'D'], icu: 6 },
    { id: 'iek-avdt32', brand: 'iek', series: 'АВДТ32', kind: 'rcbo', poles: [2], w: 2, In: range(6, 63), curves: ['B', 'C'], ma: [10, 30, 100, 300], rt: ['AC', 'A'], cable: 'до 25 мм²' },
    { id: 'iek-avdt34', brand: 'iek', series: 'АВДТ34', kind: 'rcbo', poles: [4], w: 4, In: range(6, 63), curves: ['C'], ma: [10, 30, 100, 300], rt: ['AC', 'A'] },
    { id: 'iek-vd163', brand: 'iek', series: 'ВД1-63', kind: 'rcd', poles: [2, 4], w: perPole, In: range(16, 100), ma: [10, 30, 100, 300], rt: ['AC', 'A'] },
    { id: 'iek-vn32', brand: 'iek', series: 'ВН-32', kind: 'sw', poles: [1, 2, 3, 4], w: perPole, In: range(20, 125) },
    { id: 'iek-ops1', brand: 'iek', series: 'ОПС1', kind: 'spd', poles: [1, 2, 3, 4], w: perPole, cls: 'T2' },
    { id: 'iek-rnd', brand: 'iek', series: 'РН-Д', kind: 'rn', poles: [1], w: 2, In: [25, 32, 40, 50, 63] },
    { id: 'iek-km', brand: 'iek', series: 'КМ', kind: 'km', poles: [2, 4], w: (p) => (p > 2 ? 2 : 1), In: [20, 25, 40, 63], h: 90 },
    // ABB
    { id: 'abb-s200', brand: 'abb', series: 'S200', kind: 'mcb', poles: [1, 2, 3, 4], w: perPole, In: range(0.5, 63), curves: ['B', 'C', 'D'], icu: 6, note: 'клемма с двумя окнами: провод и гребёнка' },
    { id: 'abb-sh200', brand: 'abb', series: 'SH200', kind: 'mcb', poles: [1, 2, 3, 4], w: perPole, In: range(6, 63), curves: ['B', 'C'] },
    { id: 'abb-basicm', brand: 'abb', series: 'Basic M', kind: 'mcb', poles: [1, 2, 3, 4], w: perPole, In: range(6, 63), curves: ['C'], icu: 4.5 },
    { id: 'abb-ds200', brand: 'abb', series: 'DS200', kind: 'rcbo', poles: [2], w: 2, In: range(6, 40), curves: ['C'], ma: [30], rt: ['AC', 'A'] },
    { id: 'abb-f200', brand: 'abb', series: 'F200', kind: 'rcd', poles: [2, 4], w: perPole, In: range(25, 63), ma: [30, 100, 300], rt: ['AC', 'A'] },
    { id: 'abb-sd200', brand: 'abb', series: 'SD200', kind: 'sw', poles: [1, 2, 3, 4], w: perPole, In: range(32, 63) },
    { id: 'abb-ovr', brand: 'abb', series: 'OVR', kind: 'spd', poles: [2, 4], w: perPole, cls: 'T2' },
    // Schneider Electric
    { id: 'se-ez9f', brand: 'se', series: 'Easy9 EZ9F', kind: 'mcb', poles: [1, 2, 3, 4], w: perPole, In: range(6, 63), curves: ['B', 'C'], icu: 4.5 },
    { id: 'se-ez9r', brand: 'se', series: 'Easy9 EZ9R', kind: 'rcd', poles: [2, 4], w: perPole, In: range(25, 63), ma: [30, 100, 300], rt: ['AC', 'A'], cable: '1–25 мм² (гибкий), 1–35 мм² (жёсткий)' },
    { id: 'se-ez9s', brand: 'se', series: 'Easy9 EZ9S', kind: 'sw', poles: [1, 2, 3, 4], w: perPole, In: range(40, 100) },
    // Systeme Electric (бывший Schneider Electric в России)
    { id: 'sys-c9f', brand: 'sys', series: 'City9 Set', kind: 'mcb', poles: [1, 2, 3, 4], w: perPole, In: [6, 10, 16, 20, 25, 32, 40, 50, 63], curves: ['B', 'C'], icu: 4.5, elc: 3 },
    // общие
    { id: 'gen-meter1', brand: 'gen', series: 'Счётчик 1ф на DIN', kind: 'meter', poles: [1], w: 4, wOpts: [4, 5, 6, 7], note: 'ширину и клеммы — по паспорту счётчика' },
    { id: 'gen-meter3', brand: 'gen', series: 'Счётчик 3ф на DIN', kind: 'meter', poles: [3], w: 7, wOpts: [6, 7, 8, 9] },
    { id: 'gen-dbusN', brand: 'gen', series: 'Шина N на DIN-рейку', kind: 'dbus', cond: 'N', poles: [1], w: 4, wOpts: [2, 3, 4, 5, 6, 8], note: 'изолированная шина в корпусе; число зажимов — по паспорту' },
    { id: 'gen-dbusPE', brand: 'gen', series: 'Шина PE на DIN-рейку', kind: 'dbus', cond: 'PE', poles: [1], w: 4, wOpts: [2, 3, 4, 5, 6, 8], note: 'число зажимов — по паспорту' },
    { id: 'gen-blank', brand: 'gen', series: 'Заглушка', kind: 'blank', poles: [1], w: 1, wOpts: [0.5, 1, 2, 3, 4] },
    { id: 'gen-stop', brand: 'gen', series: 'Ограничитель на DIN-рейку', kind: 'stop', poles: [1], w: 0.5, wOpts: [0.5, 1], note: 'стопор: держит аппараты, чтобы не сползали по рейке; ширину сверь с паспортом' }
  ];

  const lsKey = 'shk:edlib';
  const loadMine = () => { try { return JSON.parse(localStorage.getItem(lsKey) || '[]'); } catch (e) { return []; } };
  const saveMine = (arr) => { try { localStorage.setItem(lsKey, JSON.stringify(arr)); } catch (e) { S.toast && S.toast('Не удалось сохранить: память браузера заполнена'); } };

  L.forEach((s) => { if (ART[s.id]) s.art = ART[s.id]; if (FACE[s.id]) s.face = FACE[s.id]; });
  const all = () => L.concat(loadMine().map((m) => Object.assign({ brand: 'my', poles: [m.poles || 1] }, m)));
  const byId = (id) => all().find((s) => s.id === id);
  const widthOf = (s, poles) => (typeof s.w === 'function' ? s.w(poles) : s.w);

  /* Аппарат редактора из серии: тип и клеммы совместимы с движком конструктора (S.engine.TERMS). */
  const make = (sid, opt = {}) => {
    const s = byId(sid);
    if (!s) return null;
    const poles = opt.poles || s.poles[0];
    const d = { sid, type: s.kind === 'km' ? 'km' : s.kind, poles, w: opt.w || widthOf(s, poles), brand: s.brand };
    if (s.In) d.In = opt.In || (s.In.includes(16) ? 16 : s.In.includes(40) ? 40 : s.In[0]);
    if (s.curves) d.curve = opt.curve || (s.curves.includes('C') ? 'C' : s.curves[0]);
    if (s.ma) { d.ma = opt.ma || (s.ma.includes(30) ? 30 : s.ma[0]); d.rt = opt.rt || (s.rt ? s.rt[0] : 'AC'); }
    if (s.cls) { d.cls = s.cls; d.scheme = poles === 4 ? '3+1' : poles === 2 ? '1+1' : String(poles); }
    if (s.kind === 'meter') d.mount = 'din';
    if (s.kind === 'dbus') d.cond = s.cond || 'N';
    if (s.kind === 'xt') d.outs = (poles === 4 ? ['L1', 'L2', 'L3', 'N', 'L1', 'L2', 'L3', 'N'] : ['L', 'N', 'L', 'N', 'L', 'N', 'L', 'N']).map((c, i) => c + 'out' + i);
    return d;
  };

  S.edLib = { BRANDS, KIND, STD_IN, list: all, byId, widthOf, make, loadMine, saveMine };
})();
