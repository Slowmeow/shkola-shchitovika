// Выгружает все карточки курса в anki/cards.json — по колодам «модуль::урок» в порядке программы.
// Запуск: node tools/export-cards.cjs   (затем python tools/build_anki.py собирает .apkg)
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const PAGE = [...fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8').matchAll(/<script src="js\/([\w-]+)\.js"><\/script>/g)].map((m) => m[1]);
const S = require('./load-app.cjs')(undefined, PAGE.filter((f) => f !== 'ai' && f !== 'app'));

const SITE = 'https://slowmeow.github.io/shkola-shchitovika/';
const esc = S.esc;
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

// картинки из anki/media (рисует tools/render-media.mjs); в колоду их кладёт build_anki.py по ссылкам <img src>
const MEDIA_IDX = path.join(ROOT, 'anki', 'media', 'index.json');
const media = fs.existsSync(MEDIA_IDX) ? JSON.parse(fs.readFileSync(MEDIA_IDX, 'utf8')) : {};
// настоящие фото из Wikimedia Commons (tools/fetch_photos.py): автор и лицензия — в поле «Источник»
const REAL_IDX = path.join(ROOT, 'anki', 'media', 'real.json');
const real = fs.existsSync(REAL_IDX) ? JSON.parse(fs.readFileSync(REAL_IDX, 'utf8')) : {};
Object.values(real).forEach((x) => { media[x.file] = { kind: 'real', w: x.w, h: x.h }; });
const img = (name, max) => (media[name] ? `<div style="margin:10px 0"><img src="${name}" width="${Math.min(media[name].w, max || 560)}" style="max-width:100%;height:auto"></div>` : '');
const stems = (s) => new Set((String(s).toLowerCase().match(/[а-яё]{5,}/g) || []).map((w) => w.slice(0, 5)));
const figLog = [];
// рисунок урока → карточка, проверено вручную (по вопросу; '' — рисунок ни к одной карточке не подходит)
const PIC_FIX = {
  'resistivity|vdrop': 'Падение напряжения в однофазной линии', 'series-parallel|switch1': '', 'three-troubles|kz': 'Что защищает от короткого замыкания?',
  'cables|colors': '', 'din|panelfront': '', 'mcb-curves|curves': 'При каком токе автомат C16 отключит мгновенно', 'busbars|comb': '',
  'spd|spd': 'Где ставят УЗИП относительно УЗО?', 'rn|rn': 'Как выбрать номинал реле напряжения?', 'rn|zerobreak': 'Что происходит при обрыве нуля',
  'schemes|ladder': '', 'switches|switch1': '', 'switches|passthrough': 'Сколько жил между двумя проходными', 'layout|panelfront': 'Как размещать УЗО и его автоматы?',
  'three-panel|comb': 'Как распределять однофазные группы?', 'vdrop|vdrop': 'Почему в формуле множитель 2?', 'meter|meter1': 'Однофазный счётчик', 'meter|meter3': '',
  'sockets|socketwiring': '', 'rcd|nmix': '',
  'cables|cablemark': 'Что значит буква «А»', 'din|din': 'Сколько модулей занимает', 'loop|loop': 'Ток КЗ в конце линии 120 А', 'selectivity|selectivity': 'Какая пара хорошая для селективности', 'leak|leak': 'Почему УЗО может выбивать'
};

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
      // рисунки урока — в ответ той карточки, с которой у рисунка (подписи и текста рядом) больше всего общих слов
      [...l.html.matchAll(/data-ill="(\w+)"/g)].map((m) => m[1]).filter((k, i, a) => a.indexOf(k) === i && media[`shk-ill-${k}.webp`]).forEach((k) => {
        const at = l.html.indexOf(`data-ill="${k}"`);
        const ctx = stems(text(S.ill[k]()) + ' ' + text(l.html.slice(at, at + 900)));
        let best = null, score = 0;
        const fix = PIC_FIX[`${l.id}|${k}`];
        if (fix != null) { best = fix && notes.find((n) => text(n.fields.q).includes(fix)); score = best ? 99 : 0; }
        else notes.forEach((n) => {
          if (n.pic) return;
          let c = 0;
          stems(text(n.fields.q + ' ' + (n.fields.a || ''))).forEach((w) => { if (ctx.has(w)) c++; });
          if (c > score) { score = c; best = n; }
        });
        if (best && score >= 3) {
          best.pic = k;
          if (best.model === 'cloze') best.fields.why = img(`shk-ill-${k}.webp`) + best.fields.why; else best.fields.a += img(`shk-ill-${k}.webp`);
          figLog.push(`${l.id} · ${k} (${score}) → ${text(best.fields.q).slice(0, 90)}`);
        } else figLog.push(`${l.id} · ${k} — нет подходящей карточки`);
      });
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

// «Узнай по виду»: аппарат по рисунку, обозначения на схемах, твои щиты на фото, графики характеристик
if (Object.keys(media).length) {
  const see = (sub, desc, list) => { if (list.length) decks.push({ name: `${ROOT_DECK}::84 Узнай по виду::${sub}`, desc, notes: list }); };
  const mk = (key, topic, link, q, a, why, src) => { count('картинка'); return note(`see|${key}`, 'see', { topic: 'Узнай по виду → ' + topic, link, q, a, why: why || '', src: src || '' }, ['колода::see', 'тип::картинка']); };
  see('01 Аппараты по виду', 'Аппарат на рисунке — назови его и скажи, зачем он в щите.', S.devices.filter((d) => media[`shk-dev-${d.id}.webp`]).map((d) =>
    mk(`dev|${d.id}`, 'Аппараты', `${SITE}#device.${d.id}`, img(`shk-dev-${d.id}.webp`, 260) + 'Что это за аппарат и зачем он в щите?', `<b>${clean(d.name)}</b>${d.code && d.code !== '—' ? `, на схеме — ${clean(d.code)}` : ''}`, clean(d.short))));
  const syms = (S.SYMS || []).map(([n], i) => [n, `shk-sym-${pad(i + 1)}.webp`]).filter(([, f]) => media[f]);
  const SYMSRC = 'ГОСТ 2.755-87 (коммутационные устройства), ГОСТ 2.721-74 (общего применения), ГОСТ 2.710-81 (буквенные коды)';
  see('02 Обозначения на схемах', 'Условные графические обозначения: узнать символ и нарисовать его по названию.', syms.flatMap(([n, f]) => [
    mk(`sym|${n}`, 'Обозначения', `${SITE}#ref.symbols`, img(f, 200) + 'Что обозначает этот символ на схеме?', `<b>${clean(n)}</b>`, '', SYMSRC),
    mk(`sym-r|${n}`, 'Обозначения', `${SITE}#ref.symbols`, `Как обозначают на схеме: <b>${clean(n)}</b>? Нарисуй на бумаге, потом сверь.`, img(f, 200), '', SYMSRC)
  ]));
  const SKIP = /Свободн|Пустое|Коробка|Пометки|Ключ|поверх/;
  see('03 Твои щиты на фото', 'Фото щитов с твоего объекта: что отмечено красным кругом.', S.photos.flatMap((p) => p.pins.map((pin, i) => [p, pin, `shk-photo-${p.id}-${i + 1}.webp`]))
    .filter(([, pin, f]) => media[f] && !SKIP.test(pin.t))
    .map(([p, pin, f]) => mk(`photo|${p.id}|${pin.t}`, 'Твой объект', `${SITE}#photos`, img(f, 440) + `Фото «${clean(p.title)}». Что отмечено красным кругом?`, `<b>${clean(pin.t)}</b>`, clean(pin.d))));
  const SYS = [
    ['tnc', 'TN-C', 'Нейтраль источника глухо заземлена, а нулевой рабочий и нулевой защитный проводники совмещены в одном проводнике PEN на всём протяжении: корпус присоединён к PEN, отдельного PE нет.'],
    ['tns', 'TN-S', 'Нейтраль источника глухо заземлена, N и PE разделены на всём протяжении — от самого источника идут два отдельных проводника.'],
    ['tncs', 'TN-C-S', 'От источника идёт совмещённый PEN, в точке разделения (обычно на вводе здания) он делится на N и PE; дальше — раздельно.'],
    ['tt', 'TT', 'Нейтраль источника глухо заземлена, а корпуса присоединены к своему заземлителю потребителя, электрически независимому от заземлителя нейтрали; PE от источника нет.'],
    ['it', 'IT', 'Нейтраль источника изолирована от земли (или заземлена через большое сопротивление), корпуса присоединены к заземлителю.']
  ];
  const INST = { B: '3–5·In', C: '5–10·In', D: '10–20·In' };
  const CSRC = 'ГОСТ IEC 60898-1';
  see('04 Графики', 'Время-токовые характеристики автоматов и типы УЗО по форме тока утечки.', ['B', 'C', 'D'].filter((k) => media[`shk-curve-${k}.webp`]).map((k) =>
    mk(`curve|${k}`, 'Графики', `${SITE}#gear.curves`, img(`shk-curve-${k}.webp`) + `Характеристика ${k}. В каком диапазоне кратности тока автомат отключается мгновенно, за доли секунды?`, `${INST[k]}`, `Ниже ${INST[k].split('–')[0]} мгновенный расцепитель не сработает — отключит только тепловой, с задержкой; от ${INST[k].split('–')[1]} — сработает обязательно. Между ними — разброс отдельных экземпляров.`, CSRC))
    .concat(media['shk-curve-C.webp'] ? [
      mk('curve|1.13-1.45', 'Графики', `${SITE}#gear.curves`, img('shk-curve-C.webp') + 'Что гарантирует стандарт при токе 1,13·In и при 1,45·In?', '1,13·In — не отключится в течение 1 ч; 1,45·In — отключится меньше чем за 1 ч.', 'Отсюда правило выбора: кабель защищён от перегрузки, если I₂ ≤ 1,45·I_z (МЭК 60364-4-43). У модульного автомата I₂ = 1,45·In, поэтому достаточно In ≤ I_z — номинал автомата не больше допустимого тока кабеля.', CSRC),
      mk('curve|2.55', 'Графики', `${SITE}#gear.curves`, img('shk-curve-B.webp') + 'За какое время автомат на ток до 32 А обязан отключить ток 2,55·In?', 'От 1 до 60 с.', 'Для автоматов больше 32 А — от 1 до 120 с.', CSRC)] : [])
    .concat(SYS.filter(([k]) => media[`shk-sys-${k}.webp`]).map(([k, name, why]) => mk(`sys|${k}`, 'Графики', `${SITE}#lesson.earth`, img(`shk-sys-${k}.webp`) + 'Какая система заземления на схеме? По какому признаку это видно?', `<b>${name}</b>`, why, 'ПУЭ п. 1.7.3')))
    .concat(media['shk-rcd-types.webp'] ? [mk('rcd-types', 'Графики', `${SITE}#gear.rcd-types`, 'Какую форму тока утечки обнаруживают УЗО типов AC, A, F и B?', 'AC — синусоидальный переменный; A — ещё и пульсирующий постоянный; F — ещё и смешанной частоты; B — ещё и гладкий постоянный.' + img('shk-rcd-types.webp'), 'Каждый следующий тип обнаруживает всё, что предыдущий. Для техники с электроникой нужен как минимум тип A.', 'ГОСТ IEC 61008-1; МЭК 62423')] : []));
  const RP =JSON.parse(fs.readFileSync(path.join(__dirname, 'real-photos.json'), 'utf8')).photos;
  see('05 Настоящие фото', 'Фотографии настоящих аппаратов и материалов (Wikimedia Commons, свободные лицензии; автор указан на каждой карточке).', RP.filter((x) => real[x.id]).map((x) => { const m = real[x.id];
    return mk(`real|${x.id}`, 'Настоящие фото', `${SITE}#gear`, img(m.file, 420) + clean(x.q), clean(x.a), clean(x.why), `Фото: ${esc(m.author)}, ${esc(m.license)}, Wikimedia Commons — <a href="${m.page}">${esc(m.title.replace(/^File:/, ''))}</a>`); }));
}

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
  if (!text(n.fields.q) || (!text(n.fields.a) && !/<img/.test(n.fields.a))) { console.log('пустое поле:', d.name, n.guidKey.slice(0, 90)); bad++; }
}));

const out = { generated: new Date().toISOString(), root: ROOT_DECK, site: SITE, decks };
fs.mkdirSync(path.join(ROOT, 'anki'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'anki', 'cards.json'), JSON.stringify(out, null, 1));
if (process.argv.includes('--pics')) console.log(figLog.join('\n')); // куда попали рисунки уроков
const total = decks.reduce((a, d) => a + d.notes.length, 0);
console.log(`Колод: ${decks.length}, карточек: ${total} (вопрос-ответ ${stats.qa}, пропуски ${stats.cloze}); по типам: ${JSON.stringify(stats.byType)}`);
if (bad) { console.log('Ошибок: ' + bad); process.exit(1); }
