// Проверка расчётов: находит во всех текстах приложения записи вида «230 / 11 001 000 ≈ 21» или «√3 · 400 · 16 = 11 085»,
// пересчитывает левую часть и сравнивает с записанным результатом.
// Запуск: node tools/check-math.cjs [--all]
//   ОШИБКА — результат расходится с расчётом больше, чем допускает округление (для «≈» — больше 3 %);
//   отчёт — anki/math-report.md (не хранится в репозитории); --all печатает и совпавшие записи.
// Слева выражение должно стоять вплотную перед «=» или «≈», справа — сразу после. Пары, где с обеих сторон просто числа
// («0,00023 А = 0,23 мА»), не сравниваются; приставку единицы справа («≈ 23 мкА») и проценты проверка учитывает.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const PAGE = [...fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8').matchAll(/<script src="js\/([\w-]+)\.js"><\/script>/g)].map((m) => m[1]);
const S = require('./load-app.cjs')(undefined, PAGE.filter((f) => f !== 'ai' && f !== 'app'));

// нижние индексы (R<sub>рез</sub>, I<sub>N</sub>) убираем целиком, чтобы их цифры не попадали в числа; степень — в «^»
const strip = (h) => String(h == null ? '' : h).replace(/<sub>[\s\S]*?<\/sub>/g, '').replace(/<sup>([−-]?\d+)<\/sup>/g, '^$1')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

const blocks = [];
const add = (where, h) => { const t = strip(h); if (t) blocks.push([where, t]); };
const html = (l) => (typeof l.html === 'function' ? l.html() : l.html);
S.course.forEach((m) => m.lessons.forEach((l) => {
  add(`урок ${l.id}`, html(l));
  (l.problems || []).forEach((p, i) => add(`урок ${l.id} · задача ${i + 1}`, p.q + ' ' + p.sol + ' ' + p.a));
  (l.quiz || []).forEach((q, i) => add(`урок ${l.id} · тест ${i + 1}`, q.q + ' ' + q.a.join(' / ') + ' ' + q.e));
}));
Object.entries(S.cardsData || {}).forEach(([k, cs]) => cs.forEach((c, i) => add(`карточки ${k} #${i + 1}`, c.join(' — '))));
const F = S.field || {};
(F.rules || []).forEach((r) => add(`объект · правило ${r.id}`, `${r.t}. ${r.why} ${r.a}`));
(F.measures || []).forEach((m) => add(`объект · замер ${m.id}`, `${m.how} ${m.norm} ${m.why}`));
(S.gear || []).forEach((g) => add(`оборудование · ${g.id}`, [g.what, (g.params || []).flat().join(' '), (g.choose || []).join(' '), (g.mistakes || []).join(' '), (g.cards || []).flat().join(' ')].join(' ')));
(S.devices || []).forEach((d) => add(`аппарат · ${d.id}`, [d.what, (d.connect || []).join(' '), (d.choose || []).join(' '), (d.mistakes || []).join(' ')].join(' ')));
(S.glossary || []).forEach((g) => add(`словарь · ${g.id}`, `${g.term}: ${g.def}`));
(S.formulas || []).forEach((f) => add(`формула · ${f.id}`, `${f.about || ''} ${f.ex || ''}`));
(S.exams || []).forEach((x) => x.pool.forEach((q, i) => add(`экзамен ${x.id} #${i + 1}`, `${q.q} ${q.a[q.c]}. ${q.e}`)));
(S.extraDecks || []).forEach((x) => x.cards.forEach((c, i) => add(`колода ${x.key} #${i + 1}`, c.join(' — '))));

// надстрочные цифры (10⁻⁶, 230²) — в «^», подстрочные (I₁) убираем
const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
const sup = (t) => t.replace(/⁻?[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => '^' + [...m].map((c) => SUP[c]).join('')).replace(/[₀-₉]/g, '');
// числовое выражение: числа (с пробелами-разделителями тысяч и десятичной запятой), π, корень, степень, скобки, действия
const NUM = String.raw`(?:\d{1,3}(?: \d{3})+(?:,\d+)?|\d+(?:,\d+)?)π?|π`;
const POW = String.raw`(?:\s*\^\s*-?\d+)?`;
const ATOM = String.raw`(?:√\s*)?(?:${NUM})${POW}`;
const OPEN = String.raw`(?:√\s*\(|\(|[−-](?=\s*[\d(√π]))*`;
const TERM = String.raw`${OPEN}\s*${ATOM}\s*(?:\)${POW}\s*)*`;
const OP = String.raw`(?:[+·×*/−]|-(?=\s*[\d(√π]))`;
const EXPR = String.raw`${TERM}(?:\s*${OP}\s*${TERM})*`;
const LEFT = new RegExp(String.raw`(${EXPR})\s*$`);
const RIGHT = new RegExp(String.raw`^\s*(${EXPR})\s*(%|[А-Яа-яA-Za-zΩµ·]+)?`);

const toJs = (e) => {
  let s = e.replace(/(\d) (?=\d{3}(?!\d))/g, '$1').replace(/,/g, '.').replace(/[·×]/g, '*').replace(/−/g, '-').trim();
  // научная запись «2,9 · 10⁻⁴» — одно число, а не два действия
  s = s.replace(/(\d+(?:\.\d+)?)\s*\*\s*10\s*\^\s*(-?\d+)/g, '($1e$2)');
  s = s.replace(/(\d)π/g, '$1*π').replace(/π/g, 'Math.PI');
  s = s.replace(/√\s*\(/g, 'Math.sqrt(').replace(/√\s*(\d+(?:\.\d+)?)/g, 'Math.sqrt($1)').replace(/\s*\^\s*(-?\d+)/g, '**($1)');
  const open = (s.match(/\(/g) || []).length - (s.match(/\)/g) || []).length;
  if (open !== 0) return null; // скобка не замкнута внутри выражения — значит, выражение выхвачено из середины
  return s;
};
const ev = (e) => { const js = toJs(e); if (!js) return null; try { const v = Function(`"use strict";return (${js});`)(); return Number.isFinite(v) ? v : null; } catch (x) { return null; } };
const hasOp = (e) => /[+·×*/−√^π]|\d\s*-\s*[\d(]/.test(e.replace(/^\s*[−-]/, ''));
const decimals = (e) => { const m = e.replace(/\s/g, '').match(/,(\d+)$/); return m ? m[1].length : 0; };
// приставка единицы справа: «≈ 23 мкА», когда расчёт сделан в амперах
const PREF = { 'мк': 1e-6, 'м': 1e-3, 'к': 1e3, 'М': 1e6 };
const scaleOf = (unit) => { const m = (unit || '').match(/^(мк|м|к|М)(А|В|Вт|Ом|с|Гц|Кл|Ф|Гн)/); return m ? PREF[m[1]] : 1; };

const errs = [];
const oks = [];
// --text "…" — проверить одну строку (для отладки самой проверки)
const ti = process.argv.indexOf('--text');
if (ti > 0) blocks.splice(0, blocks.length, ['строка', strip(process.argv[ti + 1])]);
blocks.forEach(([where, t0]) => {
  const t = sup(t0);
  const parts = t.split(/(=|≈)/);
  for (let i = 0; i + 2 < parts.length; i += 2) {
    const left = parts[i], sign = parts[i + 1], right = parts[i + 2];
    const lm = left.match(LEFT), rm = right.match(RIGHT);
    if (!lm || !rm) continue;
    const L = lm[1].trim(), R = rm[1].trim(), unit = rm[2] || '';
    const before = left.slice(0, left.length - lm[0].length);
    // буква или «^» вплотную перед выражением: φ(2), U2 — обозначение, а не число; «мм^2», «d^2» — степень. Слово через пробел не мешает
    if (!/^\s/.test(lm[0]) && /[A-Za-zА-Яа-яΩφ^]$/.test(before)) continue;
    if (/(?:ln|lg|log|sin|cos|tg|tan|exp)\s*\(?\s*$/.test(before)) continue; // «ln 750» — значение функции, а не число 750
    if (!/\d/.test(L) || !/\d/.test(R)) continue;
    if (!hasOp(L) && !hasOp(R)) continue;
    const a = ev(L), b = ev(R);
    if (a == null || b == null) continue;
    const round = 0.5 * Math.pow(10, -decimals(R)) * 1.02 + 1e-12;
    const fits = (x) => { const diff = Math.abs(x - b), rel = diff / Math.max(Math.abs(x), Math.abs(b), 1e-15); return diff <= round || rel <= (sign === '≈' ? 0.03 : 0.005); };
    const k = scaleOf(unit);
    const ok = fits(a) || (k !== 1 && fits(a / k)) || (unit === '%' && fits(a * 100));
    const at = Math.max(0, t.indexOf(L));
    const ctx = t.slice(Math.max(0, at - 70), at + L.length + R.length + 40);
    (ok ? oks : errs).push(`${where}: ${L} ${sign} ${R} ${unit}  (расчёт: ${+a.toPrecision(5)})${ok ? '' : `\n    «…${ctx}…»`}`);
  }
});
const report = ['# Проверка расчётов', '', `Проверено записей: ${errs.length + oks.length}. Ошибок: ${errs.length}.`, '', '## Ошибки', '', ...errs, '', '## Совпадают', '', ...oks].join('\n');
fs.writeFileSync(path.join(ROOT, 'anki', 'math-report.md'), report);
console.log(`Проверено записей: ${errs.length + oks.length}. Ошибок: ${errs.length}. Отчёт: anki/math-report.md`);
(process.argv.includes('--all') ? errs.concat(oks) : errs).forEach((e) => console.log(e));
if (errs.length) process.exit(1);
