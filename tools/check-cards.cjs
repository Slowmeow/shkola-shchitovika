// Проверка колоды Anki на повторы и на принципы хороших карточек (по anki/cards.json, который пишет export-cards.cjs).
// Запуск: node tools/export-cards.cjs && node tools/check-cards.cjs [--all]
//   ошибки (код выхода 1): одна и та же карточка по смыслу встречается дважды — одинаковый вопрос или почти одинаковые вопрос и ответ
//     (повторы между уроком и экзаменом, справочником или «Объектом» export-cards.cjs убирает сам, оставляя карточку урока);
//   предупреждения: похожие вопросы — посмотреть глазами; слишком длинный ответ; длинный список в ответе.
// Полный список — anki/check-report.md (не хранится в репозитории). --all печатает всё в консоль.
'use strict';
const fs = require('fs');
const path = require('path');
const { text, jac, same, sig } = require('./card-sim.cjs');
const ROOT = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'anki', 'cards.json'), 'utf8'));

const notes = [];
data.decks.forEach((d) => d.notes.forEach((n) => notes.push(Object.assign({ deck: d.name.split('::').slice(1).join(' → '), kind: (n.tags.find((t) => t.startsWith('тип::')) || '').slice(5), qh: n.fields.q, ah: n.fields.a }, sig(n.fields.q, n.fields.a)))));
// карточки «узнай по виду» различаются картинкой, а не текстом вопроса
const pool = notes.filter((n) => n.kind !== 'картинка');
const line = (n) => `    — ${n.deck} [${n.kind}]: ${text(n.qh).slice(0, 100)} → ${text(n.ah).slice(0, 70)}`;

const errors = [];
const warns = [];
for (let i = 0; i < pool.length; i++) {
  for (let j = i + 1; j < pool.length; j++) {
    const x = pool[i], y = pool[j];
    if (same(x, y)) { errors.push(`Повтор (вопросы ${Math.round(jac(x.q, y.q) * 100)} %, ответы ${Math.round(jac(x.a, y.a) * 100)} %):\n${line(x)}\n${line(y)}`); continue; }
    const sq = jac(x.q, y.q);
    if (sq >= 0.7 && jac(x.a, y.a) >= 0.3) warns.push({ t: 'похожие', s: sq, msg: `Похожие вопросы (${Math.round(sq * 100)} %), проверить глазами:\n${line(x)}\n${line(y)}` });
  }
}
// принципы хорошей карточки: короткий ответ без длинных списков (в задачах решение по шагам — это нормально)
notes.filter((n) => ['факт', 'термин', 'сокращение', 'маркировка', 'оборудование'].includes(n.kind)).forEach((n) => {
  const a = text(n.ah);
  const items = (String(n.ah).match(/<li>/g) || []).length || (a.match(/;/g) || []).length + 1;
  if (a.length > 220) warns.push({ t: 'длинный ответ', s: a.length / 100, msg: `Длинный ответ (${a.length} знаков): ${n.deck}: ${text(n.qh).slice(0, 90)}` });
  else if (items >= 5) warns.push({ t: 'список', s: items, msg: `Список из ${items} пунктов в ответе: ${n.deck}: ${text(n.qh).slice(0, 90)}` });
});

warns.sort((a, b) => b.s - a.s);
const cnt = warns.reduce((m, w) => { m[w.t] = (m[w.t] || 0) + 1; return m; }, {});
const report = ['# Проверка колоды Anki', '', `Карточек: ${notes.length}. Повторов: ${errors.length}. Предупреждений: ${warns.length} ${JSON.stringify(cnt)}.`, '',
  '## Повторы', '', ...errors, '', '## Предупреждения', '', ...warns.map((w) => w.msg)].join('\n');
fs.writeFileSync(path.join(ROOT, 'anki', 'check-report.md'), report);
console.log(`Карточек: ${notes.length}. Повторов: ${errors.length}. Предупреждений: ${warns.length} ${JSON.stringify(cnt)}. Отчёт: anki/check-report.md`);
(process.argv.includes('--all') ? errors.concat(warns.map((w) => w.msg)) : errors.slice(0, 40)).forEach((e) => console.log(e));
if (errors.length) process.exit(1);
