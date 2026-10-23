// Выгружает все карточки курса в anki/cards.json — по колодам «модуль::урок» в порядке программы.
// Запуск: node tools/export-cards.cjs   (затем python tools/build_anki.py собирает .apkg)
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const PAGE = [...fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8').matchAll(/<script src="js\/([\w-]+)\.js"><\/script>/g)].map((m) => m[1]);
const S = require('./load-app.cjs')(undefined, PAGE.filter((f) => f !== 'ai' && f !== 'app'));

const SITE = 'https://slowmeow.github.io/shkola-shchitovika/';
const ROOT_DECK = 'Школа щитовика';
const pad = (n) => String(n).padStart(2, '0');

// HTML урока → HTML для Anki: без ссылок приложения и служебных атрибутов
const clean = (h) => String(h == null ? '' : h)
  .replace(/<dfn[^>]*>([\s\S]*?)<\/dfn>/g, '$1')
  .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/g, '$1')
  .replace(/<(\w+)\s+(?:data-[\w-]+="[^"]*"\s*)+>/g, '<$1>')
  .replace(/&nbsp;/g, ' ')
  .replace(/<(?![a-zA-Z/!])/g, '&lt;')
  .replace(/\s+/g, ' ')
  .trim();
const text = (h) => clean(h).replace(/<[^>]+>/g, '').trim();

const lessons = S.lessonIndex;
const used = new Set();
const decks = [];
const stats = { qa: 0, cloze: 0, byType: {} };
const count = (t) => { stats.byType[t] = (stats.byType[t] || 0) + 1; };

const note = (key, kind, f, tags) => {
  if (/\{\{c\d+::/.test(f.q)) { stats.cloze++; return { guidKey: key, model: 'cloze', fields: f, tags }; }
  stats.qa++;
  return { guidKey: key, model: 'qa', fields: f, tags };
};

S.program.forEach((track) => {
  track.modules.forEach((m) => {
    m.lessons.forEach((pl) => {
      const l = lessons[pl.id];
      if (!l) return; // тема ещё в плане
      used.add(l.id);
      const deck = S.anki.deckOf(l.id); // то же имя, что показывает урок на сайте
      const link = `${SITE}#lesson.${l.id}`;
      const base = { topic: `${m.title} → ${pl.title}`, link };
      const tags = [`модуль::${m.id}`, `урок::${l.id}`];
      const notes = [];
      const cards = (S.cardsData || {})[l.id] || [];
      cards.forEach(([q, a, why, src]) => {
        notes.push(note(`${l.id}|card|${text(q)}`, 'fact', { ...base, q: clean(q), a: clean(a), why: clean(why), src: clean(src) }, tags.concat('тип::факт')));
        count('факт');
      });
      (l.problems || []).forEach((p, i) => {
        notes.push(note(`${l.id}|problem|${i}|${text(p.q).slice(0, 80)}`, 'task', { ...base, q: `<div class="kind">Задача · уровень ${p.lvl}</div>${clean(p.q)}`, a: clean(p.a), why: clean(p.sol), src: '' }, tags.concat('тип::задача', `уровень::${p.lvl}`)));
        count('задача');
      });
      if (!cards.length) {
        // урок ещё не переработан: карточки из теста (вопрос → верный ответ и пояснение)
        (l.quiz || []).forEach((q) => {
          notes.push(note(`${l.id}|quiz|${text(q.q)}`, 'quiz', { ...base, q: clean(q.q), a: clean(q.a[q.c]), why: clean(q.e), src: '' }, tags.concat('тип::тест')));
          count('тест');
        });
      }
      S.glossary.filter((g) => g.go === 'lesson.' + l.id).forEach((g) => {
        notes.push(note(`term|${g.id}`, 'term', { ...base, q: `Что такое <b>${clean(g.term)}</b>?`, a: clean(g.def), why: g.alt ? `Другое название или обозначение: ${clean(g.alt)}.` : '', src: '' }, tags.concat('тип::термин')));
        g._used = true; count('термин');
      });
      S.formulas.filter((f) => f.lesson === l.id).forEach((f) => {
        const vars = (f.vars || []).map((v) => `<li><b>${clean(v[0])}</b> — ${clean(v[1])}${v[2] ? `, ${clean(v[2])}` : ''}</li>`).join('');
        notes.push(note(`formula|${f.id}`, 'formula', { ...base, q: `Формула: ${clean(f.name)}`, a: `<div class="fx">${clean(f.f)}</div>`, why: (vars ? `<ul>${vars}</ul>` : '') + clean(f.about), src: '' }, tags.concat('тип::формула')));
        f._used = true; count('формула');
      });
      if (notes.length) decks.push({ name: deck, desc: `Урок «${pl.title}». Открыть в приложении: ${link}`, notes });
    });
  });
});

// отдельные колоды: разборы видео, сокращения, аппаратура (S.extraDecks = [{ name, desc, link, topic, cards: [[q, a, why, src]] }])
(S.extraDecks || []).forEach((x) => {
  const notes = x.cards.map(([q, a, why, src]) => { count(x.type || 'факт'); return note(`${x.key}|${text(q)}`, 'fact', { topic: x.topic, link: x.link, q: clean(q), a: clean(a), why: clean(why), src: clean(src) }, [`колода::${x.key}`, `тип::${x.type || 'факт'}`]); });
  if (notes.length) decks.push({ name: `${ROOT_DECK}::${x.name}`, desc: x.desc, notes });
});

// термины и формулы без урока — в отдельные колоды
const restTerms = S.glossary.filter((g) => !g._used);
if (restTerms.length) decks.push({ name: `${ROOT_DECK}::90 Словарь (без урока)`, desc: 'Термины, которые не относятся к одному уроку.', notes: restTerms.map((g) => { count('термин'); return note(`term|${g.id}`, 'term', { topic: 'Словарь', link: SITE + '#ref.glossary', q: `Что такое <b>${clean(g.term)}</b>?`, a: clean(g.def), why: g.alt ? `Другое название или обозначение: ${clean(g.alt)}.` : '', src: '' }, ['тип::термин']); }) });
const restF = S.formulas.filter((f) => !f._used);
if (restF.length) decks.push({ name: `${ROOT_DECK}::91 Формулы (без урока)`, desc: 'Формулы справочника.', notes: restF.map((f) => { count('формула'); return note(`formula|${f.id}`, 'formula', { topic: 'Формулы', link: SITE + '#formula.' + f.id, q: `Формула: ${clean(f.name)}`, a: `<div class="fx">${clean(f.f)}</div>`, why: clean(f.about), src: '' }, ['тип::формула']); }) });

// проверка: уникальность ключей, пустые поля
const keys = new Set();
let bad = 0;
decks.forEach((d) => d.notes.forEach((n) => {
  if (keys.has(n.guidKey)) { console.log('повтор ключа:', d.name, n.guidKey.slice(0, 90)); bad++; }
  keys.add(n.guidKey);
  if (!text(n.fields.q) || !text(n.fields.a)) { console.log('пустое поле:', d.name, n.guidKey.slice(0, 90)); bad++; }
}));

const out = { generated: new Date().toISOString(), root: ROOT_DECK, site: SITE, decks };
fs.mkdirSync(path.join(ROOT, 'anki'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'anki', 'cards.json'), JSON.stringify(out, null, 1));
const total = decks.reduce((a, d) => a + d.notes.length, 0);
console.log(`Колод: ${decks.length}, карточек: ${total} (вопрос-ответ ${stats.qa}, пропуски ${stats.cloze}); по типам: ${JSON.stringify(stats.byType)}`);
if (bad) { console.log('Ошибок: ' + bad); process.exit(1); }
