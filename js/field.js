/* Школа щитовика — раздел «Объект»: экраны. Данные — в js/field-*.js (S.field). */
(function () {
  'use strict';
  const S = window.SHK;
  const F = (S.field = S.field || {});
  const esc = S.esc;
  const V = { ok: ['ok', 'Верно'], part: ['warn', 'Частично'], bad: ['bad', 'Неверно'], prac: ['info', 'Практика'] };

  const crumbs = (items) => `<nav class="crumbs" aria-label="Путь">${items.map(([t, r], i) => (r ? `<a href="#${r}" data-go="${r}">${esc(t)}</a>` : `<span>${esc(t)}</span>`) + (i < items.length - 1 ? '<span>/</span>' : '')).join('')}</nav>`;
  const sections = () => [
    ['stages', 'Этапы работ и чек-листы', 'list', 'Что делать по шагам на объекте: подготовка, монтаж, сборка щита, проверка, сдача.', (F.stages || []).length],
    ['measure', 'Замеры', 'target', 'Что измерить, каким прибором и какой результат считается нормой.', (F.measures || []).length],
    ['rules', 'Правила монтажа', 'tool', 'Трассы, соединения, розетки, ванная, стройка — с пунктами норм.', F.rules.length],
    ['video', 'Разборы советов из видео', 'eye', 'Каждый совет сверен с ПУЭ, СП и ГОСТ: что верно, что нет и почему.', F.videos.length],
    ['abbr', 'Сокращения', 'doc', 'ПУЭ, ВРУ, ВВГнг(А)-LS, QF, IP44 — расшифровка и смысл.', (F.abbr || []).length]
  ];

  const ruleCard = (r) => `<details class="acc rule" data-cat="${r.cat}" data-kind="${r.kind}" data-text="${esc((r.t + ' ' + r.why + ' ' + r.norm).toLowerCase())}"><summary><span class="badge ${r.kind === 'norm' ? 'done' : 'info'}">${r.kind === 'norm' ? 'норма' : 'практика'}</span><span style="flex:1">${esc(r.t)}</span></summary><div class="in prose small-prose"><p>${esc(r.why)}</p><p class="small muted">${S.icon('doc')} ${esc(r.norm)}</p></div></details>`;

  const pageOverview = () => `<div class="wrap">
    <div class="page-head"><div class="eyebrow">Объект</div><h1 class="h1">Объект</h1><p class="muted">Короткие подсказки для работы руками: что делать по шагам, что замерить, какие правила монтажа и откуда они взялись. Подробности — по ссылкам на уроки.</p></div>
    <div class="grid">${sections().map(([id, t, ic, d, n]) => `<a class="card repo" href="#field.${id}" data-go="field.${id}"><div class="rt">${S.icon(ic)}${esc(t)}</div><p>${esc(d)}</p><div class="rf">${n ? `<span>${n} ${id === 'video' ? 'разбор' : 'пунктов'}</span>` : '<span>скоро</span>'}</div></a>`).join('')}</div>
    ${S.anki ? S.anki.box(null, ', подколода «80 Объект» — правила монтажа и разборы') : ''}
  </div>`;

  const pageRules = () => `<div class="wrap">${crumbs([['Объект', 'field'], ['Правила монтажа', null]])}
    <div class="page-head" style="margin-top:8px"><h1 class="h1">Правила монтажа</h1><p class="muted">Каждое правило — с причиной и пунктом документа. «Норма» — требование ПУЭ, СП или ГОСТ; «практика» — проверенный приём, который нормы прямо не требуют.</p><div class="row" style="margin-top:8px">${S.tts.btn('Слушать правила')}</div></div>
    <div class="stack-sm" style="margin-bottom:14px"><input class="inp" type="search" placeholder="Поиск: труба, ванная, PE, 0,5 м…" data-rq aria-label="Поиск по правилам">
      <div class="chips" data-rcat><button class="chip" type="button" data-c="" aria-pressed="true">Все</button>${F.ruleCats.map(([id, t]) => `<button class="chip" type="button" data-c="${id}" aria-pressed="false">${esc(t)}</button>`).join('')}</div></div>
    ${F.ruleCats.map(([id, t]) => `<section class="stack-sm rcat" data-sec="${id}" style="margin-top:18px"><h2 class="h3">${esc(t)}</h2>${F.rules.filter((r) => r.cat === id).map(ruleCard).join('')}</section>`).join('')}
    <p class="empty" data-rnone hidden>Ничего не найдено.</p>
  </div>`;

  const pageVideos = () => `<div class="wrap">${crumbs([['Объект', 'field'], ['Разборы советов', null]])}
    <div class="page-head" style="margin-top:8px"><h1 class="h1">Разборы советов из видео</h1><p class="muted">Чужой совет может быть верным, верным наполовину или ошибочным. Здесь каждое утверждение сверено с текстом норм. Пришли расшифровку или ссылку на новое видео — разберу так же.</p></div>
    <div class="list">${F.videos.map((v) => `<a class="li" href="#field.video.${v.id}" data-go="field.video.${v.id}">${S.icon('eye')}<span class="t"><b>${esc(v.title)}</b><span>${v.claims.length} утверждений · ${['ok', 'part', 'bad', 'prac'].map((k) => `${V[k][1].toLowerCase()} ${v.claims.filter((c) => c.v === k).length}`).join(' · ')}</span></span>${S.icon('next')}</a>`).join('')}</div>
  </div>`;

  const pageVideo = (id) => {
    const v = F.videos.find((x) => x.id === id);
    if (!v) return `<div class="wrap"><div class="empty">Разбор не найден.</div></div>`;
    return `<div class="wrap">${crumbs([['Объект', 'field'], ['Разборы', 'field.video'], [v.short, null]])}
      <div class="page-head" style="margin-top:8px"><h1 class="h1">${esc(v.title)}</h1><p class="muted">${esc(v.about)}</p><div class="row" style="margin-top:8px">${S.tts.btn('Слушать разбор')}</div></div>
      <div class="box tip"><div class="lbl">${S.icon('check')}Главное</div><ul>${v.takeaways.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>
      <div class="row small" style="margin:14px 0">${Object.values(V).map(([c, t]) => `<span class="badge ${c}">${t}</span>`).join('')}</div>
      <div class="stack-sm">${v.claims.map((c) => `<div class="card"><div class="row"><span class="badge ${V[c.v][0]}">${V[c.v][1]}</span><b class="small muted">Совет ${c.n}</b></div><p style="margin-top:8px"><b>«${esc(c.claim)}»</b></p><p style="margin-top:8px">${esc(c.text)}</p><p class="small muted" style="margin-top:6px">${S.icon('doc')} ${esc(c.norm)}</p></div>`).join('')}</div>
      ${S.anki ? S.anki.box(null, `, подколода «80 Объект → 02 Разбор: ${esc(v.short)}»`) : ''}
    </div>`;
  };

  const soon = (t) => `<div class="wrap">${crumbs([['Объект', 'field'], [t, null]])}<div class="empty" style="margin-top:16px">${S.icon('clock')}Раздел «${esc(t)}» наполняется.</div></div>`;

  S.view('field', {
    tab: 'field', top: (arg) => !arg, parent: 'field',
    render(arg) {
      const [sec, sub] = String(arg || '').split(/\.(.+)/);
      if (!sec) return pageOverview();
      if (sec === 'rules') return pageRules();
      if (sec === 'video') return sub ? pageVideo(sub) : pageVideos();
      if (F.render && F.render[sec]) return F.render[sec](sub);
      const s = sections().find((x) => x[0] === sec);
      return soon(s ? s[1] : 'Раздел');
    },
    mount(root, arg) {
      if (arg === 'rules') {
        const q = root.querySelector('[data-rq]');
        let cur = '';
        const apply = () => {
          const t = q.value.trim().toLowerCase();
          let any = 0;
          root.querySelectorAll('.rcat').forEach((sec) => {
            let n = 0;
            sec.querySelectorAll('.rule').forEach((d) => { const ok = (!cur || d.dataset.cat === cur) && (!t || d.dataset.text.includes(t)); d.hidden = !ok; if (ok) n++; });
            sec.hidden = !n; any += n;
          });
          root.querySelector('[data-rnone]').hidden = !!any;
        };
        q.addEventListener('input', apply);
        root.querySelector('[data-rcat]').addEventListener('click', (e) => {
          const b = e.target.closest('[data-c]');
          if (!b) return;
          cur = b.dataset.c;
          root.querySelectorAll('[data-rcat] [data-c]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          apply();
        });
      }
      if (F.mount) Object.values(F.mount).forEach((fn) => fn(root, arg));
    }
  });

  S.tts.handlers.field = (arg) => {
    const [sec, sub] = String(arg || '').split(/\.(.+)/);
    if (sec === 'rules') return { title: 'Правила монтажа', paras: ['Правила монтажа.'].concat(F.rules.reduce((a, r) => a.concat([`${r.t}.`, r.why, `Основание: ${r.norm}.`]), [])) };
    if (sec === 'video' && sub) {
      const v = F.videos.find((x) => x.id === sub);
      if (v) return { title: v.title, paras: [v.title + '.', v.about].concat(v.takeaways, v.claims.reduce((a, c) => a.concat([`Совет ${c.n}: ${c.claim}`, `Оценка: ${V[c.v][1]}.`, c.text, `Основание: ${c.norm}.`]), [])) };
    }
    if (F.tts && F.tts[sec]) return F.tts[sec](sub);
    return null;
  };
})();
