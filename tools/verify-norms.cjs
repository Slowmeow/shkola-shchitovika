// Быстрая проверка достоверности: находит в приложении все ссылки на пункты норм и сверяет их с текстами.
// Запуск:   node tools/verify-norms.cjs              — сводка в консоли, полный отчёт в norms/report.md
//           node tools/verify-norms.cjs --doc ПУЭ     — только ссылки на один документ
//           node tools/verify-norms.cjs --grep "PEN"  — только места, где встречается слово
// Перед первым запуском: python norms/norm.py fetch (скачивает тексты и строит norms/index.json).
//
// Для каждой ссылки «ПУЭ п. 2.1.56», «СП 256 п. 15.25», «ПОТЭЭ п. 19.5», «табл. 1.7.1»:
//   НЕТ ПУНКТА — такого номера в документе нет (ошибка в ссылке);
//   СМЫСЛ?     — пункт есть, но в нём почти нет слов из нашего утверждения (возможно, ссылка не на тот пункт);
//   ОК         — пункт найден и по словам совпадает с утверждением.
// Отчёт показывает рядом наш текст и текст пункта — так любое утверждение проверяется глазами за секунды.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };

const idxFile = path.join(ROOT, 'norms', 'index.json');
if (!fs.existsSync(idxFile)) { // индекс строится из norms/text/*.txt за пару секунд
  try { require('child_process').execSync('python norms/norm.py index', { cwd: ROOT, stdio: 'inherit' }); } catch (e) { console.log('Нет norms/index.json — выполни: python norms/norm.py index (или fetch, если нет norms/text)'); process.exit(2); }
}
const IDX = JSON.parse(fs.readFileSync(idxFile, 'utf8'));

const PAGE = [...fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8').matchAll(/<script src="js\/([\w-]+)\.js"><\/script>/g)].map((m) => m[1]);
const S = require('./load-app.cjs')(undefined, PAGE.filter((f) => f !== 'ai' && f !== 'app'));

const strip = (h) => String(h == null ? '' : h).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();

// 1. все тексты приложения с указанием места
const blocks = [];
const add = (where, h, def) => { const t = strip(h); if (t) blocks.push([where, t, def || null]); };
const mainDoc = (t) => { const n = { ПОТЭЭ: (t.match(/ПОТЭЭ/g) || []).length, СП256: (t.match(/СП\s*256/g) || []).length }; return n.ПОТЭЭ || n.СП256 ? (n.ПОТЭЭ >= n.СП256 ? 'ПОТЭЭ' : 'СП256') : null; };
S.course.forEach((m) => m.lessons.forEach((l) => {
  const def = mainDoc(strip(l.html)); // в задачах и тестах урока «п. 7.10» обычно относится к основному документу урока
  add(`урок ${l.id}`, l.html, def);
  (l.problems || []).forEach((p, i) => add(`урок ${l.id} · задача ${i + 1}`, p.q + ' ' + p.sol + ' ' + p.a, def));
  (l.quiz || []).forEach((q, i) => add(`урок ${l.id} · тест ${i + 1}`, q.q + ' ' + q.a.join(' / ') + ' ' + q.e, def));
}));
Object.entries(S.cardsData || {}).forEach(([k, cs]) => { const l = S.lessonIndex && S.lessonIndex[k]; const def = l ? mainDoc(strip(l.html)) : null; cs.forEach((c, i) => add(`карточки ${k} #${i + 1}`, c.join(' — '), def)); });
const F = S.field || {};
(F.rules || []).forEach((r) => add(`объект · правило ${r.id}`, `${r.t}. ${r.why} (${r.norm}) ${r.a}`));
(F.videos || []).forEach((v) => v.claims.forEach((c) => add(`объект · разбор ${v.id} #${c.n}`, `${c.text} (${c.norm})`)));
(F.stages || []).forEach((s) => s.items.forEach((x, i) => add(`объект · этап ${s.id} #${i + 1}`, x.filter(Boolean).join(' '))));
(F.measures || []).forEach((m) => add(`объект · замер ${m.id}`, `${m.how} ${m.norm} (${m.ref}) ${m.why}`));
(F.abbr || []).forEach((a) => add(`сокращения · ${a[0]}`, a.slice(0, 3).join(' ')));
(S.gear || []).forEach((g) => add(`оборудование · ${g.id}`, [g.what, (g.params || []).flat().join(' '), (g.choose || []).join(' '), (g.mistakes || []).join(' '), `(${g.norm})`, (g.cards || []).flat().join(' ')].join(' ')));
(S.devices || []).forEach((d) => add(`аппарат · ${d.id}`, [d.what, (d.connect || []).join(' '), (d.choose || []).join(' '), (d.mistakes || []).join(' '), (d.marks || []).flat().join(' ')].join(' ')));
(S.norms || []).forEach((n, i) => add(`нормы · ${i + 1}`, Array.isArray(n) ? n.join(' (') + ')' : JSON.stringify(n)));
(S.glossary || []).forEach((g) => add(`словарь · ${g.id}`, `${g.term}: ${g.def}`));
(S.formulas || []).forEach((f) => add(`формула · ${f.id}`, `${f.about || ''} ${f.ex || ''}`));
(S.tables || []).forEach((t) => add(`таблица · ${t.id}`, `${t.title} ${t.about || ''} ${t.cap || ''}`));
JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'real-photos.json'), 'utf8')).photos.forEach((x) => add(`фото ${x.id}`, `${x.q} ${x.a} ${x.why}`));
(S.exams || []).forEach((x) => x.pool.forEach((q, i) => add(`экзамен ${x.id} #${i + 1}`, `${q.q} ${q.a[q.c]}. ${q.e} (${q.r})`)));

// 2. поиск ссылок
const DOCRX = /(ПУЭ|ПОТЭЭ|СП\s*256(?:\.1325800(?:\.2016)?)?|ГОСТ\s*12\.1\.038(?:-82)?)|(МЭК|IEC|ГОСТ\s*Р?|ТР\s*ТС|СП\s*\d{1,3}(?:\.\d+)*|ПТЭЭП|Федеральн|приказ)/g;
const docKey = (s) => (/ПУЭ/.test(s) ? 'ПУЭ' : /ПОТЭЭ/.test(s) ? 'ПОТЭЭ' : /СП\s*256/.test(s) ? 'СП256' : /12\.1\.038/.test(s) ? 'ГОСТ12.1.038' : /21\.613/.test(s) ? 'ГОСТ21.613' : /21\.101/.test(s) ? 'ГОСТР21.101' : /31996/.test(s) ? 'ГОСТ31996' : /31565/.test(s) ? 'ГОСТ31565' : /61008/.test(s) ? 'ГОСТ61008' : /60269/.test(s) ? 'ГОСТ60269' : /60898/.test(s) ? 'ГОСТ60898' : /50571\.16/.test(s) ? 'ГОСТР50571.16' : /2\.702/.test(s) ? 'ГОСТ2.702' : /32395/.test(s) ? 'ГОСТ32395' : /32397/.test(s) ? 'ГОСТ32397' : /32144/.test(s) ? 'ГОСТ32144' : null);
const cites = [];
blocks.forEach(([where, text, def]) => {
  // предложения: точка + пробел + заглавная буква (кроме сокращений «табл. Г.1», «п. А.3», «рис. Б.2»)
  const sents = text.split(/(?<=[.!?»)])(?<!(?:^|[\s(])(?:табл|пп?|рис|прил|см)\.)\s+(?=[А-ЯA-Z«(])/);
  let last = null, lastAge = 99; // документ из предыдущих предложений того же текста
  sents.forEach((sent) => {
    let cur = lastAge <= 6 ? last : def; // документ, к которому относятся номера пунктов
    let explicit = false;
    let tables = false; // «из таблиц ПУЭ 1.3.4–1.3.7» — дальше номера таблиц
    const group = [];
    const tok = /(таблиц[а-яё]*\s+)?(ПУЭ|ПОТЭЭ|СП\s*256(?:\.1325800(?:\.2016)?)?|ГОСТ\s*12\.1\.038(?:-82)?|ГОСТ\s*21\.613(?:-2014)?|ГОСТ\s*Р\s*21\.101(?:-2020)?|ГОСТ\s*31996(?:-2012)?|ГОСТ\s*31565(?:-2012)?|ГОСТ\s*IEC\s*61008-1(?:-2020)?|ГОСТ\s*IEC\s*60269-1(?:-2016)?|ГОСТ\s*IEC\s*60898-1(?:-2020)?|ГОСТ\s*Р\s*50571\.16(?:-2019)?|ГОСТ\s*2\.702(?:-2011)?|ГОСТ\s*32395(?:-2020)?|ГОСТ\s*32397(?:-2020)?|ГОСТ\s*32144(?:-2013)?)|(МЭК|IEC|ГОСТ\s*(?:Р\s*)?(?:IEC\s*)?[\d.]+|ТР\s*ТС|СП\s*(?!256)\d{1,3}(?:\.\d+)+|ПТЭЭП|BS\s*\d+)|(табл[а-яё]*\.?\s*)(\d+(?:\.\d+)+)|(пп?\.\s*)((?:[А-Я]?\.?\d+(?:\.\d+)+(?:\s*[–-]\s*\d+(?:\.\d+)+)?(?:\s*(?:,|и)\s*(?=\d|[А-Я]\.\d))?)+)|(?<![\d.])(\d\.\d{1,2}\.\d{1,3})(?:\s*[–-]\s*(\d\.\d{1,2}\.\d{1,3}))?(?![\d.]?\d)/g;
    let m;
    while ((m = tok.exec(sent))) {
      if (m[2]) { cur = docKey(m[2]); tables = !!m[1]; last = cur; lastAge = 0; explicit = true; continue; }
      if (m[3]) { cur = 'other'; explicit = true; continue; }
      const push = (id, kind) => {
        const three = /^[1-7]\.\d{1,2}\.\d{1,3}$/.test(id.replace(/^табл\. /, ''));
        // трёхуровневый номер без явного документа рядом — пункт ПУЭ; но если текст выше говорит о ГОСТе СПДС с таким пунктом — пункт этого ГОСТа
        const gostCtx = ['ГОСТ21.613', 'ГОСТР21.101', 'ГОСТ31996', 'ГОСТ31565', 'ГОСТ61008', 'ГОСТ60269', 'ГОСТ32144', 'ГОСТ60898', 'ГОСТР50571.16', 'ГОСТ2.702', 'ГОСТ32395', 'ГОСТ32397'].includes(cur) && IDX[cur] && IDX[cur][id];
        const doc = explicit && cur && cur !== 'other' ? cur : (three && cur !== 'other' && !explicit && !gostCtx ? 'ПУЭ' : (cur === 'other' ? 'other' : cur));
        // короткая ссылка вида «(ПУЭ, п. 2.1.58)» — сравниваем с текстом всего блока
        const c = { where, sent, ctx: sent.replace(/[^а-яё]/gi, '').length < 60 ? text.slice(0, 700) : sent, doc, id: tables && !/^табл/.test(id) ? 'табл. ' + id : id, kind, group, explicit };
        group.push(c); cites.push(c);
      };
      if (m[5]) { push('табл. ' + m[5], 'table'); continue; }
      if (m[7]) {
        m[7].split(/\s*(?:,|и)\s*/).filter(Boolean).forEach((part) => part.split(/\s*[–-]\s*/).forEach((x) => push(x.trim(), 'clause')));
        continue;
      }
      if (m[8]) { if (cur === 'other' || /адрес/i.test(sent)) continue; /* «адрес 1.2.15» — адрес KNX, не пункт */ push(m[8], 'bare'); if (m[9]) push(m[9], 'bare'); }
    }
    lastAge++;
  });
});

// 3. проверка
const words = (s) => (s.toLowerCase().match(/[а-яё]{5,}/g) || []).map((w) => w.slice(0, 5));
const STOP = new Set(['котор', 'долже', 'други', 'также', 'можно', 'тольк', 'более', 'менее', 'случа', 'этого', 'через', 'когда', 'потом', 'поэто', 'нужно', 'всего', 'кажды', 'устан', 'приме', 'выпол', 'элект', 'соотв', 'указа', 'требо']);
const res = cites.filter((c) => c.doc && c.doc !== 'other').map((c) => {
  const t = (IDX[c.doc] || {})[c.id];
  if (!t) return Object.assign(c, { st: 'НЕТ ПУНКТА' });
  const a = new Set(words(c.ctx).filter((w) => !STOP.has(w)));
  const b = new Set(words(t));
  const common = [...a].filter((w) => b.has(w));
  const score = a.size ? common.length / a.size : 0;
  // перечень из трёх и более пунктов в блоке «Норматив» — краткое описание на все сразу, по словам не сверяется
  const list = c.group.length >= 3;
  return Object.assign(c, { st: !list && score < 0.12 && common.length < 3 ? 'СМЫСЛ?' : 'ОК', score, text: t, list });
}).filter((c) => (!opt('--doc') || c.doc === opt('--doc')) && (!opt('--grep') || new RegExp(opt('--grep'), 'i').test(c.sent)));

// реестр проверенного вручную: место, номер и хэш нашего текста. Если текст изменится — пометка снимается сама.
const crypto = require('crypto');
const VF = path.join(ROOT, 'norms', 'verified.json');
const verified = fs.existsSync(VF) ? JSON.parse(fs.readFileSync(VF, 'utf8')) : {};
const vkey = (c) => `${c.doc} ${c.id} | ${c.where} | ${crypto.createHash('sha1').update(c.ctx || c.sent).digest('hex').slice(0, 10)}`;
res.forEach((c) => { if (c.st === 'СМЫСЛ?' && verified[vkey(c)]) { c.st = 'ОК'; c.manual = verified[vkey(c)]; } });
if (args.includes('--accept')) { // только после того, как каждое место прочитано и сверено с текстом пункта
  const note = opt('--accept') && !opt('--accept').startsWith('--') ? opt('--accept') : 'сверено вручную';
  res.filter((c) => c.st === 'СМЫСЛ?').forEach((c) => { verified[vkey(c)] = `${note}, ${new Date().toISOString().slice(0, 10)}`; c.st = 'ОК'; });
  fs.writeFileSync(VF, JSON.stringify(verified, null, 1));
  console.log('Записано в norms/verified.json');
}

const unknown = cites.filter((c) => !c.doc);
const by = (st) => res.filter((c) => c.st === st);
const lines = ['# Отчёт о проверке ссылок на нормы', '', `Создан: ${new Date().toISOString()}`, '',
  `Всего ссылок: ${res.length}. ОК: ${by('ОК').length}. Проверить смысл: ${by('СМЫСЛ?').length}. Нет такого пункта: ${by('НЕТ ПУНКТА').length}. Номер без документа: ${unknown.length}.`, ''];
const show = (title, arr, withText) => {
  if (!arr.length) return;
  lines.push(`## ${title} (${arr.length})`, '');
  arr.forEach((c) => {
    lines.push(`- **${c.doc} ${c.id}** — ${c.where}`, `  - Наш текст: ${(c.ctx || c.sent).slice(0, 400)}`);
    if (withText) lines.push(`  - Текст пункта: ${String(c.text || '').slice(0, 500)}`);
  });
  lines.push('');
};
show('Нет такого пункта', by('НЕТ ПУНКТА'), false);
show('Пункт есть, но слова почти не совпадают — проверить смысл', by('СМЫСЛ?'), true);
show('Номер пункта без указания документа', unknown, false);
show('Совпадают', by('ОК'), true);
fs.writeFileSync(path.join(ROOT, 'norms', 'report.md'), lines.join('\n'));

const docs = {};
res.forEach((c) => { docs[c.doc] = (docs[c.doc] || 0) + 1; });
console.log(`Ссылок на нормы: ${res.length} (${Object.entries(docs).map(([k, v]) => `${k} ${v}`).join(', ')})`);
console.log(`ОК: ${by('ОК').length} · проверить смысл: ${by('СМЫСЛ?').length} · нет пункта: ${by('НЕТ ПУНКТА').length} · без документа: ${unknown.length}`);
by('НЕТ ПУНКТА').slice(0, 40).forEach((c) => console.log(`✗ ${c.doc} ${c.id} — ${c.where}: ${c.sent.slice(0, 120)}`));
console.log('Полный отчёт: norms/report.md');
if (by('НЕТ ПУНКТА').length) process.exitCode = 1;
