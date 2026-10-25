// Сравнение карточек Anki по смыслу: общий модуль для export-cards.cjs (убирает повторы) и check-cards.cjs (отчёт).
'use strict';
const text = (h) => String(h || '').replace(/<img[^>]*>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&amp;|&lt;|&gt;/g, ' ').replace(/\s+/g, ' ').trim();
// вопрос без служебной части («Задача · уровень 2») и без лишних знаков; + = : оставляем — они различают вопросы об обозначениях
const norm = (s) => text(s).replace(/^Задача · уровень \d\s*/, '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9+=:,]+/g, ' ').replace(/(\D),|,(\D)/g, '$1 $2').trim();
// слова, которые не меняют смысла вопроса: «что такое QF» и «расшифруй QF» — один вопрос
const STOP = new Set(['котор', 'долже', 'можно', 'нужно', 'такое', 'этого', 'какой', 'какая', 'какие', 'каком', 'почем', 'чтобы', 'когда', 'сколь', 'через', 'между', 'после', 'перед', 'что', 'как', 'для', 'при', 'расши', 'означ', 'обозн', 'назов']);
const ROMAN = new Set(['i', 'ii', 'iii', 'iv', 'v']);
// русские слова — по первым 5 буквам; латинские коды (QF, PE), числа и римские цифры — целиком
const tokens = (s) => new Set((norm(s).match(/[a-zа-я]+|\d+(?:,\d+)?|[+=]/g) || [])
  .filter((w) => /\d|[+=]/.test(w) || ROMAN.has(w) || /^[a-z]{2,}$/.test(w) || w.length >= 3)
  .map((w) => (/^[а-я]+$/.test(w) ? w.slice(0, 5) : w))
  .filter((w) => !STOP.has(w)));
const jac = (a, b) => { if (!a.size || !b.size) return 0; let c = 0; a.forEach((w) => { if (b.has(w)) c++; }); return c / (a.size + b.size - c); };
// суть короткого вопроса: весь текст без служебных слов, с одиночными буквами — «TN-C» и «TN-S» различаются
const core = (s) => norm(s).replace(/:/g, ' ').split(' ').filter((w) => w && !STOP.has(/^[а-я]+$/.test(w) ? w.slice(0, 5) : w)).join(' ');
// одна и та же карточка по смыслу: одинаковый вопрос, одинаковый короткий вопрос («QF» и «Расшифруй: QF»)
// или почти одинаковые вопрос и ответ
const same = (x, y) => (x.nq && x.nq === y.nq) || (x.core && x.core.length <= 24 && x.core === y.core)
  || (x.q.size >= 3 && y.q.size >= 3 && ((jac(x.q, y.q) >= 0.8 && jac(x.a, y.a) >= 0.5) || (jac(x.q, y.q) >= 0.7 && jac(x.a, y.a) >= 0.8)));
// мягче: так сравнивают копию в экзамене или справочнике с карточкой урока — повтор того же факта другими словами
const close = (x, y) => same(x, y) || (x.q.size >= 3 && y.q.size >= 3 && ((jac(x.q, y.q) >= 0.7 && jac(x.a, y.a) >= 0.3) || (jac(x.q, y.q) >= 0.6 && jac(x.a, y.a) >= 0.6)));
const sig = (q, a) => ({ nq: norm(q), core: core(q), q: tokens(q), a: tokens(a) });
module.exports = { text, norm, tokens, jac, same, close, sig };
