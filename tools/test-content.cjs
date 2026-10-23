// Проверка содержимого: уроки, тесты, ссылки, термины, формулы, проекты, достижения.
// Запуск: node tools/test-content.cjs
'use strict';
// скрипты — в том же порядке, что и на странице (app.html); ai.js и app.js требуют браузера
const PAGE = [...require('fs').readFileSync(require('path').join(__dirname, '..', 'app.html'), 'utf8').matchAll(/<script src="js\/([\w-]+)\.js"><\/script>/g)].map((m) => m[1]);
const S = require('./load-app.cjs')(undefined, PAGE.filter((f) => f !== 'ai' && f !== 'app'));
let n = 0;
const bad = (m) => { n++; if (n <= 60) console.log('✗ ' + m); };
const views = new Set(['home', 'course', 'lesson', 'ref', 'formula', 'device', 'norm', 'practice', 'game', 'project', 'photos', 'builder', 'claude', 'profile', 'ai', 'field']);
const lessons = S.course.reduce((a, m) => a.concat(m.lessons.map((l) => Object.assign({ m: m.id }, l))), []);
const ids = new Set();
lessons.forEach((l) => { if (ids.has(l.id)) bad('урок с повтором id ' + l.id); ids.add(l.id); });
const mids = new Set(); S.course.forEach((m) => { if (mids.has(m.id)) bad('модуль с повтором id ' + m.id); mids.add(m.id); });
const gl = new Set(S.glossary.map((g) => g.id));
if (gl.size !== S.glossary.length) bad('повторы id в словаре');
const fm = new Set(S.formulas.map((f) => f.id));
const dv = new Set(S.devices.map((d) => d.id));
const nr = new Set(S.norms.map((x) => x.id));
const pr = new Set(S.projects.map((p) => p.id));
const route = (r, where) => {
  const i = r.indexOf('.'); const v = i < 0 ? r : r.slice(0, i); const a = i < 0 ? '' : r.slice(i + 1);
  if (!views.has(v)) return bad(`${where}: нет раздела «${r}»`);
  if (v === 'lesson' && !ids.has(a)) bad(`${where}: нет урока «${a}»`);
  if (v === 'formula' && !fm.has(a)) bad(`${where}: нет формулы «${a}»`);
  if (v === 'device' && !dv.has(a)) bad(`${where}: нет аппарата «${a}»`);
  if (v === 'norm' && !nr.has(a)) bad(`${where}: нет нормы «${a}»`);
  if (v === 'project' && !pr.has(a)) bad(`${where}: нет проекта «${a}»`);
  if (v === 'game' && !S.games[a]) bad(`${where}: нет игры «${a}»`);
  if (v === 'ref' && a && !['formulas', 'devices', 'tables', 'norms', 'symbols', 'glossary'].includes(a)) bad(`${where}: нет раздела справочника «${a}»`);
};
const scanHTML = (html, where) => {
  html = String(html || '');
  for (const m of html.matchAll(/data-go="([^"]+)"/g)) route(m[1], where);
  for (const m of html.matchAll(/data-term="([^"]+)"/g)) if (!gl.has(m[1])) bad(`${where}: нет термина «${m[1]}»`);
  for (const m of html.matchAll(/data-ill="([^"]+)"/g)) if (!S.ill[m[1]]) bad(`${where}: нет иллюстрации «${m[1]}»`);
  for (const m of html.matchAll(/data-calc="([^"]+)"/g)) if (!fm.has(m[1])) bad(`${where}: нет калькулятора «${m[1]}»`);
  if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(html)) bad(`${where}: в тексте undefined/NaN`);
  const open = (html.match(/<(div|p|ul|ol|li|section|figure|table|b|i|strong)\b/g) || []).length, close = (html.match(/<\/(div|p|ul|ol|li|section|figure|table|b|i|strong)>/g) || []).length;
  if (open !== close) bad(`${where}: несбалансированные теги (${open} открыто, ${close} закрыто)`);
};
lessons.forEach((l) => {
  const html = typeof l.html === 'function' ? l.html() : l.html;
  if (!html || html.length < 300) bad(`урок ${l.id}: слишком короткий текст`);
  scanHTML(html, 'урок ' + l.id);
  if (!(l.min > 0)) bad(`урок ${l.id}: нет времени чтения`);
  (l.quiz || []).forEach((q, i) => {
    if (!Array.isArray(q.a) || q.a.length < 2) bad(`урок ${l.id} вопрос ${i + 1}: мало вариантов`);
    if (!(q.c >= 0 && q.c < q.a.length)) bad(`урок ${l.id} вопрос ${i + 1}: верный ответ вне вариантов`);
    if (new Set(q.a).size !== q.a.length) bad(`урок ${l.id} вопрос ${i + 1}: одинаковые варианты`);
    if (!q.e) bad(`урок ${l.id} вопрос ${i + 1}: нет пояснения`);
  });
  if (!l.quiz || !l.quiz.length) bad(`урок ${l.id}: нет теста`);
  if (l.v2) {
    // новый формат: цели, физика, история, задачи по уровням, пояснения целыми предложениями, без аналогий
    ['box goal', 'box hist'].concat(l.org ? [] : ['box phys']).forEach((c) => { if (!html.includes(c)) bad(`урок ${l.id}: нет блока «${c}»`); });
    if (!html.includes('<h2>')) bad(`урок ${l.id}: нет разделов h2`);
    const P = l.problems || [];
    if (P.length < 3) bad(`урок ${l.id}: меньше 3 задач`);
    P.forEach((p, i) => {
      if (![1, 2, 3].includes(p.lvl)) bad(`урок ${l.id} задача ${i + 1}: уровень не 1–3`);
      if (!p.q || !p.sol || !p.a) bad(`урок ${l.id} задача ${i + 1}: нет условия, решения или ответа`);
      scanHTML(p.q, `урок ${l.id} задача ${i + 1}`); scanHTML(p.sol, `урок ${l.id} решение ${i + 1}`);
    });
    if (new Set(P.map((p) => p.lvl)).size < 2) bad(`урок ${l.id}: задачи только одного уровня`);
    (l.quiz || []).forEach((q, i) => { if (!/[.!?]$/.test(q.e.trim()) || q.e.split(/[.!?]\s/).length < 2) bad(`урок ${l.id} вопрос ${i + 1}: пояснение должно быть из целых предложений (не меньше двух)`); });
    const text = (html + P.map((p) => p.q + p.sol).join(' ') + (l.quiz || []).map((q) => q.e).join(' ')).toLowerCase();
    ['представь', 'словно', 'как будто', 'аналогия', 'похоже на'].forEach((w) => { if (text.includes(w)) bad(`урок ${l.id}: аналогия («${w}») — нужно физическое объяснение`); });
  }
});
S.glossary.forEach((g) => { if (g.go) route(g.go, 'термин ' + g.id); scanHTML(g.def, 'термин ' + g.id); if (!g.def) bad('термин без определения ' + g.id); });
S.formulas.forEach((f) => {
  if (f.lesson && !ids.has(f.lesson)) bad(`формула ${f.id}: нет урока ${f.lesson}`);
  try { const v = {}; f.calc.inputs.forEach((i) => { v[i.k] = i.options ? String(i.v) : Number(i.v); }); const r = f.calc.run(v); if (!Array.isArray(r) || !r.length) bad(`формула ${f.id}: калькулятор ничего не вернул`); r.forEach((x) => { if (/NaN|undefined|Infinity/.test(String(x.v))) bad(`формула ${f.id}: ${x.l} = ${x.v}`); }); } catch (e) { bad(`формула ${f.id}: калькулятор упал ${e.message}`); }
});
S.devices.forEach((d) => { if (d.lesson && !ids.has(d.lesson)) bad(`аппарат ${d.id}: нет урока ${d.lesson}`); scanHTML(d.what, 'аппарат ' + d.id); });
S.projects.forEach((p) => { scanHTML(p.intro, 'проект ' + p.id); if (p.control && !S.control.SCHEMES[p.control]) bad(`проект ${p.id}: нет схемы ${p.control}`); });
S.tables.forEach((t) => { (t.rows || []).forEach((r, i) => { if (r.length !== t.head.length) bad(`таблица ${t.id} строка ${i + 1}: ${r.length} ячеек при ${t.head.length} столбцах`); }); });
S.photos.forEach((ph) => ph.pins.forEach((p, i) => { if (!(p.x >= 0 && p.x <= ph.w && p.y >= 0 && p.y <= ph.h)) bad(`фото ${ph.id} метка ${i + 1} вне снимка`); if (!p.t || !p.d) bad(`фото ${ph.id} метка ${i + 1} без текста`); }));
// игровой слой
const ach = S.rpg.ACH; if (new Set(ach.map((a) => a.id)).size !== ach.length) bad('повтор id достижений');
ach.forEach((a) => { if (!S.icons[a.ic]) bad(`достижение ${a.id}: нет иконки ${a.ic}`); });
S.course.forEach((m) => { if (m.id !== 'm-other' && !ach.find((a) => a.id === m.id)) bad(`модуль ${m.id} без достижения`); });
if (S.course.some((m) => m.id === 'm-other')) bad('есть уроки вне программы');
// раздел «Объект»: ссылки пунктов ведут на существующие экраны, у правил есть норма и карточка
const FD = S.field || {};
(FD.stages || []).forEach((s) => s.items.forEach((x, i) => { if (x[1]) route(x[1], `этап ${s.id} пункт ${i + 1}`); if (x[2] && !x[3]) bad(`этап ${s.id} пункт ${i + 1}: вопрос без ответа`); }));
(FD.rules || []).forEach((r) => { if (!r.norm || !r.q || !r.a || !r.why) bad(`правило ${r.id}: нет нормы, причины или карточки`); });
(FD.measures || []).forEach((m) => { if (!m.q || !m.a || !m.ref) bad(`замер ${m.id}: нет карточки или основания`); });
(FD.videos || []).forEach((v) => v.claims.forEach((c) => { if (!["ok", "part", "bad", "prac"].includes(c.v) || !c.text || !c.norm) bad(`разбор ${v.id} совет ${c.n}: неполный`); }));
// карточки: ключи — существующие уроки, ответы не пустые
Object.entries(S.cardsData || {}).forEach(([lid, cs]) => { if (!ids.has(lid)) bad(`карточки для несуществующего урока ${lid}`); cs.forEach((c, i) => { if (!c[0] || !c[1]) bad(`карточка ${lid}#${i + 1} пустая`); }); });
// программа: зависимости ссылаются на темы программы
const pl = S.programLessons(); const pids = new Set(pl.map((x) => x.id)); if (pids.size !== pl.length) bad('повтор id в программе');
pl.forEach((x) => x.needs.forEach((n) => { if (!pids.has(n)) bad(`программа: ${x.id} опирается на неизвестную тему ${n}`); }));
for (let L = 1; L < 40; L++) if (S.rpg.levelOf(S.rpg.need(L)) !== L || S.rpg.levelOf(S.rpg.need(L + 1) - 1) !== L) bad('ошибка в формуле уровней на ' + L);
// разборы: стартовый файл читается
const rz = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'razbory', 'index.json'), 'utf8'));
(rz.items || []).forEach((x) => { scanHTML(S.md(x.md), 'разбор ' + x.id); (x.links || []).forEach((l) => route(l[1], 'разбор ' + x.id)); });
console.log(`Уроков ${lessons.length}, вопросов ${lessons.reduce((s, l) => s + (l.quiz || []).length, 0)}, терминов ${S.glossary.length}, формул ${S.formulas.length}, аппаратов ${S.devices.length}, таблиц ${S.tables.length}, достижений ${ach.length}.`);
console.log(n ? `Ошибок: ${n}` : 'Ошибок: 0');
process.exit(n ? 1 : 0);
