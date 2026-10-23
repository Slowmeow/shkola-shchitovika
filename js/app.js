/* Школа щитовика — экраны приложения и запуск */
(function () {
  'use strict';
  const S = window.SHK;
  const V = S.svg;
  const B = S.B;
  const esc = S.esc;
  const E = S.engine;
  const store = S.store;
  const R = S.rpg;

  const allLessons = () => S.course.reduce((a, m) => a.concat(m.lessons.map((l) => Object.assign({ module: m }, l))), []);
  const lessonById = (id) => allLessons().find((l) => l.id === id);
  const isDone = (id) => !!store.data.done[id];
  const isKnown = (l) => l.known && S.profile.known.includes(l.known);
  const crumbs = (items) => `<nav class="crumbs" aria-label="Навигация">${items.map(([t, r], i) => r ? `<a href="#${r}" data-go="${r}">${esc(t)}</a>${i < items.length - 1 ? '<span>/</span>' : ''}` : `<span>${esc(t)}</span>`).join('')}</nav>`;
  const head = (eyebrow, title, sub, cr) => `<div class="page-head">${cr || ''}${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<h1 class="h1">${title}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div>`;
  const ttsRow = (label) => `<div class="row" style="margin:-6px 0 16px">${S.tts.btn(label)}</div>`;
  const levelDots = (n) => `<span class="badge" title="Сложность ${n} из 5">${'●'.repeat(n)}${'○'.repeat(5 - n)}</span>`;
  const LVLC = ['', '#2da44e', '#0969da', '#8250df', '#fb8500', '#cf222e'];
  const xpBadge = (got, n) => got ? `<span class="badge xp got">✓ ${n} XP</span>` : `<span class="badge xp">+${n} XP</span>`;
  const nextLesson = () => {
    const L = allLessons();
    const next = L.find((l) => !isDone(l.id) && !isKnown(l)) || L.find((l) => !isDone(l.id));
    const last = store.data.last && store.data.last.startsWith('lesson.') ? lessonById(store.data.last.slice(7)) : null;
    return last && !isDone(last.id) ? last : next || null;
  };
  const modStars = (m) => {
    const ls = m.lessons;
    if (!ls.every((l) => isDone(l.id))) return 0;
    const qs = ls.map((l) => store.data.quiz[l.id]).filter(Boolean);
    const avg = qs.length ? qs.reduce((s, q) => s + q.s / q.t, 0) / ls.length : 0;
    return ls.every((l) => store.data.quiz[l.id] && store.data.quiz[l.id].s === store.data.quiz[l.id].t) ? 3 : avg >= 0.8 ? 2 : 1;
  };
  const starsHTML = (n, lbl) => `<span class="stars" aria-label="${lbl || n + ' из 3 звёзд'}">${[0, 1, 2].map((k) => `<span class="${k < n ? 'on' : ''}">★</span>`).join('')}</span>`;
  const ringNode = (pct, label, full) => { const r = 23, c = 2 * Math.PI * r; return `<span class="node${full ? ' full' : ''}"><svg viewBox="0 0 52 52" width="52" height="52" aria-hidden="true"><circle cx="26" cy="26" r="${r}" fill="none" stroke="var(--bg-muted)" stroke-width="4"/><circle cx="26" cy="26" r="${r}" fill="none" stroke="${full ? 'var(--success-em)' : 'var(--accent)'}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(c * pct).toFixed(1)} ${c.toFixed(1)}"/></svg><b>${label}</b></span>`; };
  const continueCTA = () => {
    const l = nextLesson();
    if (!l) return `<a class="cta" href="#game.exam" data-go="game.exam"><span class="t"><b>Курс пройден! Время босса</b><span>Итоговый экзамен: 30 вопросов из всех тем</span></span><span class="btn game">${S.icon('play')}Экзамен</span></a>`;
    const started = Object.keys(store.data.done).length > 0;
    return `<a class="cta" href="#lesson.${l.id}" data-go="lesson.${l.id}"><span class="t"><span>${started ? 'Продолжить' : 'Начать обучение'} · ${esc(modLabel(l.module))}</span><b>${esc(l.title)}</b><span>${l.min} мин · ${esc(l.module.title)}</span></span><span class="btn game" aria-hidden="true">${S.icon('play')}${started ? 'Дальше' : 'Старт'}</span></a>`;
  };

  /* ================= ГЛАВНАЯ — ЛОББИ ================= */
  S.view('home', {
    tab: 'home', top: true, live: true,
    render() {
      const info = R.info();
      const L = allLessons();
      const done = L.filter((l) => isDone(l.id)).length;
      const achs = R.achList();
      const got = achs.filter((a) => a.got).sort((a, b) => b.got - a.got);
      const streak = R.streak();
      const qs = R.quests();
      const heat = R.heat(20);
      const unread = S.sync.unread();
      const firstDay = S.dayKey(store.data.profile.since) === S.today() && done === 0;
      const showMedals = got.slice(0, 7).concat(achs.filter((a) => !a.got).slice(0, Math.max(0, 9 - Math.min(7, got.length))));
      return `<div class="wrap">
        <section class="card" aria-label="Твой персонаж">
          <div class="lobby">${R.avatarRing(84)}<div style="min-width:0"><div class="small muted">${firstDay ? 'Добро пожаловать,' : 'С возвращением,'}</div><div class="nm">${esc(R.nick())}</div><div class="rk"><span class="rank">${S.icon('trophy')}${esc(info.rank)}</span><span class="badge xp">LVL ${info.L}</span></div></div></div>
          <div class="bar xp" style="margin-top:14px" role="progressbar" aria-valuemin="0" aria-valuemax="${info.span}" aria-valuenow="${info.cur}" aria-label="Опыт до следующего уровня"><i style="width:${Math.round(info.pct * 100)}%"></i></div>
          <div class="xpline"><span>До уровня ${info.L + 1}: ${info.span - info.cur} XP</span><b>${info.cur}/${info.span} XP</b></div>
        </section>
        <div class="stats4" style="margin-top:12px">
          <a class="st fl" href="#profile" data-go="profile"><b>${streak}</b><span>${S.plural(streak, 'день', 'дня', 'дней')} подряд</span></a>
          <a class="st xp" href="#profile" data-go="profile"><b>${info.xp}</b><span>опыта</span></a>
          <a class="st ac" href="#profile.ach" data-go="profile.ach"><b>${got.length}</b><span>наград из ${achs.length}</span></a>
          <a class="st ls" href="#course" data-go="course"><b>${done}</b><span>уроков из ${L.length}</span></a>
        </div>
        <div style="margin-top:12px">${continueCTA()}</div>
        <section style="margin-top:24px" aria-labelledby="qh"><div class="sec-title" id="qh">${S.icon('quest')}Квесты дня<span class="small muted" style="font-weight:400;margin-left:auto">обновятся в полночь</span></div>
          <div class="list">${qs.map(({ q, have, done: ok }) => `<div class="quest${ok ? ' ok' : ''}"><span class="qi">${S.icon(ok ? 'check' : q.ic)}</span><div style="min-width:0"><div class="qt2">${esc(q.t)}</div><div class="bar"><i style="width:${Math.round(have / q.n * 100)}%"></i></div></div><span class="badge xp${ok ? ' got' : ''}">${ok ? '✓' : '+' + q.xp} XP</span></div>`).join('')}</div>
          ${qs.length && qs.every((x) => x.done) ? '<p class="small" style="margin-top:8px;color:var(--success)">Все квесты выполнены — бонус +50 XP получен. Так держать!</p>' : '<p class="small muted" style="margin-top:8px">Выполни все три — получишь ещё +50 XP.</p>'}
        </section>
        <section style="margin-top:24px"><div class="sec-title">${S.icon('inbox')}Разборы от Claude<a href="#claude" data-go="claude">Все</a></div>
          ${unread.length ? `<div class="list">${unread.slice(0, 3).map((x) => `<a class="issue" href="#claude.${x.id}" data-go="claude.${x.id}">${S.icon('issue', 'new')}<span style="min-width:0"><b>${esc(x.title)}</b><span>новый разбор · ${esc(S.ago(x.at))}</span></span><span class="badge info">новый</span></a>`).join('')}</div>` : `<div class="card row" style="gap:12px;flex-wrap:nowrap"><span class="cmt"><span class="who cl">${S.icon('sparkle')}</span></span><div style="flex:1;min-width:0"><b style="display:block">Спроси Claude</b><span class="small muted">Отправь щит, вопрос или фото — разбор сохранится здесь.</span></div><button class="btn sm primary" type="button" data-compose>${S.icon('send')}Отправить</button></div>`}
        </section>
        <section style="margin-top:24px"><div class="sec-title">${S.icon('flame')}Активность<span class="small muted" style="font-weight:400;margin-left:auto">${heat.total} ${S.plural(heat.total, 'действие', 'действия', 'действий')} за 20 недель</span></div><div class="card">${heat.html}</div></section>
        <section style="margin-top:24px"><div class="sec-title">${S.icon('trophy')}Достижения<a href="#profile.ach" data-go="profile.ach">Все ${achs.length}</a></div>
          <div class="card"><div class="ach-row">${showMedals.map((a) => `<span title="${esc(a.t + ' — ' + a.d)}">${R.medal(a, a.got ? '' : 'locked')}</span>`).join('')}</div>${got.length ? `<p class="small muted" style="margin-top:8px">Последнее: <b style="color:var(--fg)">${esc(got[0].t)}</b> — ${esc(got[0].d)}</p>` : '<p class="small muted" style="margin-top:8px">Первое достижение — за первый пройденный урок.</p>'}</div></section>
        <section style="margin-top:24px"><div class="sec-title">${S.icon('bolt')}Быстрый доступ</div><div class="grid">
          <a class="card" href="#photos" data-go="photos"><div class="row"><span class="ttl">${S.icon('photo')} Твои щиты</span></div><p class="small muted" style="margin-top:6px">Разбор фото с объекта: что за аппараты и как их подключить.</p></a>
          <a class="card" href="#builder" data-go="builder"><div class="row"><span class="ttl">${S.icon('panel')} Конструктор щита</span></div><p class="small muted" style="margin-top:6px">Задай потребителей — получи аппараты, раскладку и сборку по шагам.</p></a>
          <a class="card" href="#ref.formulas" data-go="ref.formulas"><div class="row"><span class="ttl">${S.icon('calc')} Формулы</span></div><p class="small muted" style="margin-top:6px">${S.formulas.length} формул с калькуляторами: ток, сечение, потери, КЗ.</p></a>
          <a class="card" href="#practice" data-go="practice"><div class="row"><span class="ttl">${S.icon('game')} Игры и проекты</span></div><p class="small muted" style="margin-top:6px">${S.projects.filter((p) => !p.photos).length} проектов и ${S.gameOrder.length} тренажёров, включая итоговый экзамен.</p></a>
        </div></section>
        ${S.installEvt && !S.isStandalone() ? `<div class="flash" style="margin-top:20px;display:flex;gap:12px;align-items:center"><span style="flex:1">Установи приложение на телефон — откроется как игра, работает без интернета.</span><button class="btn sm primary" type="button" data-install>${S.icon('install')}Установить</button></div>` : ''}
        <p class="small muted" style="margin-top:24px">Нормы в курсе — по ПУЭ (действующие главы 6-го и 7-го изданий), СП 256.1325800.2016 с изменениями, ГОСТ и ПОТЭЭ. Перед работой на объекте сверяйся с проектом и паспортами аппаратов.</p>
      </div>`;
    },
    mount(root) {
      root.addEventListener('click', (e) => {
        if (e.target.closest('[data-compose]')) S.sync.compose();
        if (e.target.closest('[data-install]')) S.install();
      });
      const rz = () => { if (S.current.name === 'home') S.softRender(); };
      const t = setTimeout(() => S.bus.on('rz', rz), 50);
      S.cleanup.push(() => { clearTimeout(t); S.bus.off('rz', rz); });
    }
  });
  S.install = async () => {
    if (S.installEvt) {
      const ev = S.installEvt;
      S.installEvt = null;
      try { ev.prompt(); await ev.userChoice; } catch (e) { /* ignore */ }
      S.render();
      return;
    }
    if (S.isIOS()) S.sheet('Установка на iPhone', `<ol class="prose" style="padding-left:20px"><li>Открой сайт в Safari.</li><li>Нажми кнопку «Поделиться» (квадрат со стрелкой).</li><li>Выбери «На экран „Домой“» и нажми «Добавить».</li></ol>`);
    else S.sheet('Установка', `<div class="prose"><p>В Chrome на Android: меню «⋮» → «Установить приложение» (или «Добавить на главный экран»).</p><p>На компьютере: значок установки в адресной строке Chrome или Edge.</p></div>`);
  };

  /* ================= КУРС — КАРТА УРОВНЕЙ ПО НАПРАВЛЕНИЯМ ================= */
  const modLabel = (m) => m.track === 'shchit' ? `Модуль ${m.n}` : m.trackTitle;
  S.view('course', {
    tab: 'course', top: (arg) => !arg, live: true, parent: 'course',
    render(arg) {
      const track = S.program.find((t) => t.id === arg) || S.program[0];
      const L = allLessons();
      const done = L.filter((l) => isDone(l.id)).length;
      const pct = L.length ? Math.round(done / L.length * 100) : 0;
      const cont = nextLesson();
      const mods = S.course.filter((m) => m.track === track.id);
      const tl = mods.reduce((a, m) => a.concat(m.lessons), []);
      return `<div class="wrap">
        <div class="page-head"><h1 class="h1">Курс</h1><p class="muted">${S.program.length} направлений: щиты от физики до сложных схем, обозначения, ГОСТы, кондиционеры и гайды. Уроков сейчас: ${L.length}, курс пополняется по программе.</p>
          <div class="bar" style="margin-top:10px"><i style="width:${pct}%"></i></div><div class="row small muted" style="justify-content:space-between"><span>${done} из ${L.length} уроков</span><span class="mono">${pct}%</span></div>
          <div class="row" style="margin-top:8px"><a class="btn sm" href="#program" data-go="program">${S.icon('map')}Программа обучения и как учиться</a><a class="btn sm" href="${S.anki.url}" download target="_blank" rel="noopener">${S.icon('download')}Колода Anki</a></div></div>
        ${continueCTA()}
        <nav class="tabs-in" aria-label="Направления" style="margin-top:18px">${S.program.map((t) => { const n = S.course.filter((m) => m.track === t.id).reduce((x, m) => x + m.lessons.length, 0); return `<a href="#course.${t.id}" data-go="course.${t.id}" aria-selected="${t.id === track.id}">${esc(t.title.split(':')[0])} <span class="counter">${n}</span></a>`; }).join('')}</nav>
        <p class="small muted" style="margin:12px 0">${esc(track.about)}${tl.length ? '' : ' Уроки этого направления сейчас пишутся.'}</p>
        <div>${mods.map((m) => {
          const md = m.lessons.filter((l) => isDone(l.id)).length;
          const open = (cont && cont.module && cont.module.id === m.id) || (!m.lessons.length && mods.length === 1);
          const st = m.lessons.length ? modStars(m) : 0;
          const planned = m.plan.filter((p) => !m.lessons.some((l) => l.id === p.id));
          return `<details class="mod"${open ? ' open' : ''}><summary>${ringNode(m.lessons.length ? md / m.lessons.length : 0, m.n, m.lessons.length > 0 && md === m.lessons.length)}<span class="mt"><b>${esc(m.title)}</b><span>${esc(m.sub)}</span></span><span class="side">${starsHTML(st)}<span>${md}/${m.lessons.length}${planned.length ? ` · +${planned.length} скоро` : ''}</span></span></summary>
            ${m.lessons.map((l) => { const q = store.data.quiz[l.id]; const now = cont && cont.id === l.id; return `<a class="lrow" href="#lesson.${l.id}" data-go="lesson.${l.id}"><span class="dot ${isDone(l.id) ? 'done' : isKnown(l) ? 'known' : now ? 'now' : ''}">${isDone(l.id) ? S.icon('check') : ''}</span><span class="t"><b>${esc(l.title)}</b><span>${l.min} мин${q ? ` · тест ${q.s}/${q.t}` : ''}${isKnown(l) && !isDone(l.id) ? ' · ты это делал' : ''}${now ? ' · следующий' : ''}${S.reworked[l.id] ? ' · новая версия' : ''}</span></span>${xpBadge(isDone(l.id), 40)}</a>`; }).join('')}
            ${planned.map((p) => `<div class="lrow" style="opacity:.55"><span class="dot"></span><span class="t"><b>${esc(p.title)}</b><span>скоро</span></span>${S.icon('lock')}</div>`).join('')}</details>`;
        }).join('')}</div>
        <p class="small muted" style="margin-top:22px">★ — модуль пройден, ★★ — тесты в среднем от 80 %, ★★★ — все тесты на 100 %.</p>
      </div>`;
    }
  });

  S.view('lesson', {
    tab: 'course', parent: 'course',
    render(id) {
      const L = allLessons();
      const i = L.findIndex((l) => l.id === id);
      if (i < 0) return `<div class="wrap"><div class="empty">Урок не найден. ${B.go('course', 'К списку уроков')}</div></div>`;
      const l = L[i];
      const prev = L[i - 1], next = L[i + 1];
      const q = store.data.quiz[l.id];
      const plan = S.programLessons().find((x) => x.id === l.id);
      const needs = plan ? plan.needs.map((nid) => S.lessonIndex[nid]).filter((x) => x && !isDone(x.id)) : [];
      return `<div class="wrap">${crumbs([['Курс', l.module.track === 'shchit' ? 'course' : 'course.' + l.module.track], [modLabel(l.module), null]])}
        <div class="page-head" style="margin-top:8px"><div class="row"><span class="badge">${S.icon('book')}Урок ${l.module.lessons.indexOf(l.module.lessons.find((x) => x.id === l.id)) + 1} из ${l.module.lessons.length}</span><span class="badge">${S.icon('clock')}${l.min} мин</span>${xpBadge(isDone(l.id), 40)}${isKnown(l) ? '<span class="badge info">ты это делал</span>' : ''}</div><h1 class="h1" style="margin-top:6px">${esc(l.title)}</h1><p class="small muted">${esc(l.module.title)}</p><div class="row" style="margin-top:8px">${S.tts.btn('Слушать урок')}</div></div>
        ${needs.length ? `<div class="flash warn" style="margin-bottom:16px"><b>Сначала пройди:</b> ${needs.map((x) => `<a href="#lesson.${x.id}" data-go="lesson.${x.id}">${esc(x.title)}</a>`).join(', ')}. Этот урок опирается на них.</div>` : ''}
        <article class="prose">${l.html}</article>
        ${l.problems && l.problems.length ? `<section class="stack" style="margin-top:32px"><h2 class="h2">Задачи</h2><p class="small muted" style="margin-top:-8px">Сначала реши сам на бумаге, потом открой решение. ★ — разминка, ★★ — как на объекте, ★★★ — с подвохом.</p>${l.problems.map((p, i) => `<div class="card prob"><div class="row"><span class="badge warn">${'★'.repeat(p.lvl)}</span><b>Задача ${i + 1}</b></div><div class="pq">${p.q}</div><details><summary>Показать решение</summary><div class="sol">${p.sol}<p><b>Ответ:</b> ${p.a}</p></div></details></div>`).join('')}</section>` : ''}
        ${l.quiz && l.quiz.length ? `<section class="stack" style="margin-top:32px"><div class="row"><h2 class="h2" style="flex:1">Проверь себя</h2>${q ? `<span class="badge ${q.s === q.t ? 'ok' : 'warn'}">лучший: ${q.s}/${q.t}</span>` : '<span class="badge xp">до +25 XP</span>'}</div><p class="small muted" style="margin-top:-8px">Зачёт — от половины верных ответов (урок засчитается сам). Все верные — бонус.</p>${S.quizHTML(l.quiz, l.id)}</section>` : ''}
        ${S.anki && S.anki.deckOf(l.id) ? S.anki.box(l.id) : ''}
        <div class="row" style="margin-top:20px"><button class="btn ${isDone(l.id) ? '' : 'game'}" type="button" data-done>${S.icon('check')}${isDone(l.id) ? 'Пройден' : 'Отметить пройденным'}</button><button class="btn" type="button" data-ask>${S.icon('chat')}Спросить Claude</button></div>
        <nav class="row lesson-nav" style="margin-top:18px" aria-label="Соседние уроки">${prev ? `<a class="btn wrap" href="#lesson.${prev.id}" data-go="lesson.${prev.id}">${S.icon('prev')}${esc(prev.title)}</a>` : '<span></span>'}${next ? `<a class="btn wrap nx" href="#lesson.${next.id}" data-go="lesson.${next.id}">${esc(next.title)}${S.icon('next')}</a>` : ''}</nav>
      </div>`;
    },
    mount(root, id) {
      const l = lessonById(id);
      if (!l) return;
      const btn = root.querySelector('[data-done]');
      const setBtn = () => { const d = isDone(l.id); btn.classList.toggle('game', !d); btn.innerHTML = S.icon('check') + (d ? 'Пройден' : 'Отметить пройденным'); };
      if (l.quiz) S.mountQuiz(root, l.quiz, l.id, (s, t) => { if (s / t >= 0.5) { store.markDone(l.id); setBtn(); } });
      btn.addEventListener('click', () => {
        if (isDone(l.id)) { store.unmarkDone(l.id); setBtn(); }
        else { store.markDone(l.id); setBtn(); }
      });
      root.querySelector('[data-ask]').addEventListener('click', () => S.sync.compose({ type: 'question', title: 'Вопрос по уроку: ' + l.title, lesson: l.id }));
    }
  });

  /* ================= СПРАВОЧНИК ================= */
  const REF = [
    ['formulas', 'Формулы', 'calc', () => S.formulas.length, 'Ток, мощность, сечение, потери, КЗ, утечки — с калькуляторами'],
    ['devices', 'Аппараты', 'panel', () => S.devices.length, 'Что это, как выбрать и подключить'],
    ['tables', 'Таблицы', 'list', () => S.tables.length, 'ПУЭ 1.3, номиналы, IP, цвета, высоты, нормы испытаний'],
    ['norms', 'Нормы', 'doc', () => S.norms.length, 'ПУЭ, СП 256, ГОСТ, ПОТЭЭ и главные правила'],
    ['symbols', 'Обозначения', 'target', () => S.SYMS.length, 'УГО и буквенные коды на схемах'],
    ['glossary', 'Словарь', 'book', () => S.glossary.length, 'Все термины простыми словами']
  ];
  const refNav = (cur) => `<nav class="tabs-in" aria-label="Разделы справочника" style="margin-bottom:18px"><a href="#ref" data-go="ref" aria-selected="${!cur}">${S.icon('ref')}Обзор</a>${REF.map(([id, t, ic, n]) => `<a href="#ref.${id}" data-go="ref.${id}" aria-selected="${cur === id}">${S.icon(ic)}${t} <span class="counter">${n()}</span></a>`).join('')}</nav>`;
  S.view('ref', {
    tab: 'ref', top: (arg) => !arg,
    render(arg) {
      if (arg === 'formulas') return refFormulas();
      if (arg === 'devices') return refDevices();
      if (arg === 'tables') return refTables();
      if (arg === 'norms') return refNorms();
      if (arg === 'symbols') return refSymbols();
      if (arg === 'glossary') return refGlossary();
      return `<div class="wrap">${head('', 'Справочник', 'Альманах щитовика: формулы с калькуляторами, аппараты, таблицы ПУЭ, нормы, обозначения и словарь.')}${refNav('')}
        <a class="cta" href="#gear" data-go="gear" style="margin-bottom:14px">${S.icon('layers')}<span class="t"><b>Оборудование: всё по электрике</b><span>Кабели, рейки, клеммы, реле, приборы, инструмент; характеристики B/C/D, типы УЗО, IP, маркировка кабеля; мои паспорта</span></span>${S.icon('next')}</a>
        <div class="grid">${REF.map(([id, t, ic, n, s]) => `<a class="card repo" href="#ref.${id}" data-go="ref.${id}" style="min-height:0"><span class="rt">${S.icon(ic)}${t}<span class="counter" style="margin-left:auto">${n()}</span></span><p>${s}</p></a>`).join('')}</div>
        <section class="stack" style="margin-top:24px"><h2 class="h2">Главные цифры щитовика</h2>${B.tbl(['Что', 'Значение'], [['1 кВт в однофазной сети', '≈ 4,5 А'], ['1 кВт трёхфазной нагрузки', '≈ 1,5 А на фазу'], ['Медь 1,5 / 2,5 / 4 / 6 мм²', 'автомат до 10 / 16 / 25 / 32 А'], ['УЗО для людей / ванная / пожар', '30 / 10 / 100–300 мА'], ['Фоновая утечка на УЗО', '≤ 1/3 уставки'], ['Отключение КЗ в TN 230 В', '≤ 0,4 с'], ['Потери напряжения от ВРУ', 'свет ≤ 3 %, прочее ≤ 4 %'], ['Изоляция проводки', '≥ 0,5 МОм'], ['Щит от газа и труб', '≥ 1 м, IP31+']])}</section>
      </div>`;
    },
    mount(root, arg) {
      if (arg === 'glossary') mountGlossary(root);
      if (arg === 'tables') root.addEventListener('click', (e) => { const b = e.target.closest('[data-tt]'); if (b) { const t = root.querySelector('#t-' + b.dataset.tt); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
    },
    parent: (arg) => arg ? 'ref' : 'home'
  });
  function refFormulas() {
    return `<div class="wrap">${head('', 'Формулы и калькуляторы', 'Каждую формулу можно сразу посчитать. Первый расчёт в каждом калькуляторе — +5 XP.')}${refNav('formulas')}
      <div class="stack-lg">${S.formulaCats.map((c) => { const fs = S.formulas.filter((f) => f.cat === c); return fs.length ? `<section class="stack-sm"><h2 class="h3">${c}</h2><div class="list">${fs.map((f) => `<a class="li" href="#formula.${f.id}" data-go="formula.${f.id}"><span class="t"><b>${esc(f.name)}</b><span class="mono">${S.strip(f.f)}</span></span>${store.data.xp['f:' + f.id] ? `<span class="badge ok">${S.icon('check')}считал</span>` : ''}${S.icon('next')}</a>`).join('')}</div></section>` : ''; }).join('')}</div></div>`;
  }
  S.view('formula', {
    tab: 'ref', parent: 'ref.formulas',
    render(id) {
      const f = S.formulaById[id];
      if (!f) return '<div class="wrap"><div class="empty">Формула не найдена.</div></div>';
      return `<div class="wrap">${head(esc(f.cat), esc(f.name), '', crumbs([['Справочник', 'ref'], ['Формулы', 'ref.formulas']]))}${ttsRow()}
        <div class="stack">${B.fx(f.f)}<dl class="kv">${f.vars.map((v) => `<dt>${v[0]}</dt><dd>${esc(v[1])}${v[2] ? `, <span class="mono">${v[2]}</span>` : ''}</dd>`).join('')}</dl>
        <p class="prose">${f.about}</p>${B.ex(`<p>${f.ex}</p>`)}<div data-calc="${f.id}"></div>
        ${f.lesson ? `<p>${B.go('lesson.' + f.lesson, 'Подробнее в уроке')}</p>` : ''}</div></div>`;
    }
  });
  function refDevices() {
    return `<div class="wrap">${head('', 'Аппараты', 'Что ставят в щит: назначение, маркировка, выбор и подключение.')}${refNav('devices')}
      <div class="stack-lg">${S.deviceCats.map((c) => { const ds = S.devices.filter((d) => d.cat === c); return ds.length ? `<section class="stack-sm"><h2 class="h3">${c}</h2><div class="list">${ds.map((d) => `<a class="li" href="#device.${d.id}" data-go="device.${d.id}"><span class="badge">${esc(d.code)}</span><span class="t"><b>${esc(d.name)}</b><span>${esc(d.short)}</span></span>${S.icon('next')}</a>`).join('')}</div></section>` : ''; }).join('')}</div></div>`;
  }
  const symFor = (name) => {
    const f = { mcb: (x) => V.sym.mcb(x, 8, 64), rcd: (x) => V.sym.rcd(x, 8, 64), rcbo: (x) => V.sym.rcbo(x, 8, 64), sw: (x) => V.sym.sw(x, 8, 64), spd: (x) => V.sym.spd(x, 4, 72), rn: (x) => V.sym.rn(x, 8, 64), meter: (x) => V.sym.meter(x, 8, 64), km: (x) => V.sym.contact(x, 8, 64, 'km'), fuse: (x) => V.sym.fuse(x, 8, 64), ct: (x) => V.ln(x, 8, x, 72) + V.sym.ct(x, 40) }[name];
    return f ? V.svg(80, 90, f(40), { width: 80, label: 'Условное обозначение' }) : '';
  };
  S.view('device', {
    tab: 'ref', parent: 'ref.devices',
    render(id) {
      const d = S.devices.find((x) => x.id === id);
      if (!d) return '<div class="wrap"><div class="empty">Аппарат не найден.</div></div>';
      const list = (arr) => arr && arr.length ? `<ul>${arr.map((x) => `<li>${x}</li>`).join('')}</ul>` : '';
      return `<div class="wrap">${head(`${esc(d.cat)} · код ${esc(d.code)}`, esc(d.name), esc(d.alt), crumbs([['Справочник', 'ref'], ['Аппараты', 'ref.devices']]))}${ttsRow()}
        <div class="row" style="align-items:flex-end;gap:18px">${d.face ? `<figure class="ill" style="padding:6px">${S.devCard(d.face)}<figcaption>так выглядит</figcaption></figure>` : ''}${d.sym ? `<figure class="ill" style="padding:6px">${symFor(d.sym)}<figcaption>на схеме</figcaption></figure>` : ''}</div>
        <div class="prose" style="margin-top:16px"><p>${d.what}</p>${S.devExtra && S.devExtra[d.id] ? `</div>${S.devExtra[d.id]()}<div class="prose" style="margin-top:16px">` : ""}
        ${d.marks && d.marks.length ? `<h2>Что написано на корпусе</h2>${B.tbl(['Надпись', 'Значит'], d.marks.map((m) => [`<span class="mono">${esc(m[0])}</span>`, esc(m[1])]))}` : ''}
        <h2>Как подключить</h2>${list(d.connect)}
        ${d.choose && d.choose.length ? `<h2>Как выбрать</h2>${list(d.choose)}` : ''}
        ${d.mistakes && d.mistakes.length ? B.bad(list(d.mistakes)) : ''}
        ${d.lesson ? `<p>${B.go('lesson.' + d.lesson, 'Урок по теме')}</p>` : ''}</div></div>`;
    },
    mount(root, id) { if (S.devMount && S.devMount[id]) S.devMount[id](root); }
  });
  function refTables() {
    return `<div class="wrap">${head('', 'Таблицы', 'Нажми на название, чтобы перейти к таблице.')}${refNav('tables')}${ttsRow('Слушать таблицы')}
      <div class="chips" style="margin-bottom:16px">${S.tables.map((t) => `<button type="button" class="chip" data-tt="${t.id}">${esc(t.title.split(' — ')[0].split(' (')[0])}</button>`).join('')}</div>
      <div class="stack-lg">${S.tables.map((t) => `<section class="stack-sm" id="t-${t.id}" style="scroll-margin-top:76px"><h2 class="h3">${esc(t.title)}</h2>${t.about ? `<p class="small muted">${esc(t.about)}</p>` : ''}${B.tbl(t.head, t.rows, t.cap)}</section>`).join('')}</div></div>`;
  }
  function refNorms() {
    return `<div class="wrap">${head('', 'Нормы и правила', 'Документы, на которые опирается электрик, и короткий список главных правил с номерами пунктов.')}${refNav('norms')}${ttsRow('Слушать нормы и правила')}
      <section class="stack-sm"><h2 class="h3">Главные правила щитовика</h2><div class="list">${S.rules.map((r, i) => `<div class="li" style="cursor:default"><span class="mono small" style="color:var(--fg-muted);width:22px">${i + 1}</span><span class="t"><b style="font-weight:500">${esc(r[0])}</b><span class="mono">${esc(r[1])}</span></span></div>`).join('')}</div></section>
      <section class="stack-sm" style="margin-top:26px"><h2 class="h3">Документы</h2><div class="list">${S.norms.map((n) => `<a class="li" href="#norm.${n.id}" data-go="norm.${n.id}"><span class="badge">${esc(n.kind)}</span><span class="t"><b>${esc(n.code)}</b><span>${esc(n.title)}</span></span>${S.icon('next')}</a>`).join('')}</div></section></div>`;
  }
  S.view('norm', {
    tab: 'ref', parent: 'ref.norms',
    render(id) {
      const n = S.norms.find((x) => x.id === id);
      if (!n) return '<div class="wrap"><div class="empty">Документ не найден.</div></div>';
      return `<div class="wrap">${head(esc(n.kind), esc(n.code), esc(n.title), crumbs([['Справочник', 'ref'], ['Нормы', 'ref.norms']]))}${ttsRow()}<div class="prose"><p>${esc(n.about)}</p><h2>Что важно щитовику</h2><ul>${n.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div></div>`;
    }
  });
  function refSymbols() {
    const codes = S.tables.find((t) => t.id === 'letters');
    return `<div class="wrap">${head('', 'Обозначения на схемах', 'Условные графические обозначения (УГО) по ГОСТ 2.755, 2.721, 21.614 и буквенные коды по ГОСТ 2.710.')}${refNav('symbols')}
      <div class="grid-2">${S.SYMS.map(([n, f]) => `<div class="card" style="text-align:center">${V.svg(120, 100, f(60), { width: 120, label: n })}<div class="small" style="margin-top:4px">${esc(n)}</div></div>`).join('')}</div>
      <section class="stack-sm" style="margin-top:22px"><h2 class="h3">Буквенные коды</h2>${B.tbl(codes.head, codes.rows, codes.cap)}</section>
      <p style="margin-top:14px">${B.go('game.symbols', 'Потренироваться: «Угадай обозначение»')}</p></div>`;
  }
  function refGlossary() {
    const seen = Object.keys(store.data.xp).filter((k) => k.startsWith('t:')).length;
    return `<div class="wrap">${head('', 'Словарь', `Все непонятные слова простыми словами. Термины в уроках подчёркнуты пунктиром — нажми, чтобы открыть. Изучено: ${seen} из ${S.glossary.length}.`)}${refNav('glossary')}${ttsRow('Слушать словарь')}
      <input class="inp" id="gq" type="search" placeholder="Найти термин: PEN, УЗО, ПуГВ…" autocomplete="off" style="margin-bottom:14px">
      <div class="list" id="glist">${S.glossary.map((g) => `<details class="acc" style="border:0;border-radius:0;border-top:1px solid var(--border-muted)" data-s="${esc((g.term + ' ' + (g.alt || '') + ' ' + S.strip(g.def)).toLowerCase())}" data-gid="${esc(g.id)}"><summary>${esc(g.term)}${g.alt ? `<span class="small muted" style="font-weight:400">${esc(g.alt)}</span>` : ''}</summary><div class="in"><p>${g.def}</p>${g.go ? `<p style="margin-top:8px">${B.go(g.go, 'Подробнее')}</p>` : ''}</div></details>`).join('')}</div></div>`;
  }
  function mountGlossary(root) {
    const q = root.querySelector('#gq');
    q.addEventListener('input', () => { const v = q.value.trim().toLowerCase(); S.$$('#glist > details', root).forEach((d) => { d.hidden = v.length > 1 && !d.dataset.s.includes(v); }); });
    S.$$('#glist > details', root).forEach((d) => d.addEventListener('toggle', () => { if (d.open) S.bus.emit('term', d.dataset.gid); }));
  }

  /* ================= ПРАКТИКА ================= */
  const GAMEC = { wire: ['#1f6feb', '#54aeff'], errors: ['#cf222e', '#ff8182'], trip: ['#bf8700', '#f2cc60'], pick: ['#1a7f37', '#4ac26b'], phases: ['#8250df', '#c297ff'], order: ['#bc4c00', '#fb8f44'], symbols: ['#0550ae', '#218bff'], colors: ['#bf3989', '#ff80c8'], calc: ['#116329', '#2da44e'], control: ['#6639ba', '#a475f9'], exam: ['#24292f', '#cf222e'] };
  const medal = (p) => p >= 100 ? '<span class="medal-s b3" title="Золото: 100 %">★</span>' : p >= 80 ? '<span class="medal-s b2" title="Серебро: от 80 %">★</span>' : p >= 50 ? '<span class="medal-s b1" title="Бронза: от 50 %">★</span>' : '';
  S.view('practice', {
    tab: 'practice', top: true, live: true,
    render() {
      const projs = S.projects.filter((p) => !p.photos).sort((a, b) => a.level - b.level);
      const g = S.games;
      const pdone = projs.filter((p) => store.data.xp['ps:' + p.id] || store.data.xp['ctl:' + p.control]).length;
      return `<div class="wrap wide">${head('', 'Практика', 'Реальные щиты от гаража до кафе, схемы управления и мини-игры. За сборку проекта до последнего шага — +40 XP, за медали в играх — до +80 XP.')}
        <a class="card" href="#photos" data-go="photos" style="border-color:color-mix(in srgb,var(--attention-em) 55%,var(--border));background:linear-gradient(135deg,var(--attention-subtle),var(--bg) 70%)"><div class="row" style="flex-wrap:nowrap">${S.icon('photo')}<b style="flex:1">Твой объект: щиты с фото</b><span class="badge warn">босс-уровень</span>${S.icon('next')}</div><p class="small muted" style="margin-top:6px">ЩУ со счётчиком СКАТ 315, ЩР-1, ЩР-2 и ЩО — что за аппараты и как подключить каждый провод.</p></a>
        <section style="margin-top:24px"><div class="sec-title">${S.icon('home')}Проекты <span class="counter">${projs.length}</span><span class="small muted" style="font-weight:400;margin-left:auto">пройдено ${pdone}</span></div>
          <div class="grid">${projs.map((p) => { const ok = p.control ? store.data.xp['ctl:' + p.control] : store.data.xp['ps:' + p.id]; return `<a class="card repo" href="#project.${p.id}" data-go="project.${p.id}"><span class="rt">${S.icon(p.icon)}${esc(p.title)}</span><p>${esc(p.sub)}</p><span class="rf"><span class="lang"><i style="background:${LVLC[p.level]}"></i>${p.control ? 'Автоматика' : 'Щит'}</span><span title="Сложность ${p.level} из 5">${'●'.repeat(p.level)}${'○'.repeat(5 - p.level)}</span><span style="margin-left:auto">${ok ? `<span class="badge ok">${S.icon('check')}пройден</span>` : `<span class="badge xp">+${p.control ? 25 : 40} XP</span>`}</span></span></a>`; }).join('')}</div></section>
        <section style="margin-top:28px"><div class="sec-title">${S.icon('game')}Мини-игры <span class="counter">${S.gameOrder.length}</span></div>
          <div class="grid games">${S.gameOrder.map((id) => { const c = GAMEC[id] || ['#1f6feb', '#54aeff']; const best = store.data.games[id] || 0; return `<a class="arcade" href="#game.${id}" data-go="game.${id}">${id === 'exam' ? '<span class="boss">БОСС</span>' : ''}<span class="art" style="--g1:${c[0]};--g2:${c[1]}">${S.icon(g[id].icon)}${best ? `<span class="lvlb">${best}%</span>` : ''}</span><span class="bd"><b>${esc(g[id].title)}</b><p>${esc(g[id].sub)}</p><span class="ft">${best ? `${medal(best)}<span>${best}%</span>` : '<span class="badge info">новая</span>'}<span class="play">ИГРАТЬ ▶</span></span></span></a>`; }).join('')}</div></section>
      </div>`;
    }
  });
  S.view('game', {
    tab: 'practice', parent: 'practice',
    render(id) {
      const g = S.games[id];
      if (!g) return '<div class="wrap"><div class="empty">Игра не найдена.</div></div>';
      const best = store.data.games[id] || 0;
      return `<div class="wrap">${crumbs([['Практика', 'practice'], [g.title, null]])}<div class="page-head" style="margin-top:8px"><div class="row" style="flex-wrap:nowrap;gap:12px"><span class="type-card"><span class="ti" style="width:44px;height:44px;background:linear-gradient(135deg,${(GAMEC[id] || [])[0]},${(GAMEC[id] || [])[1]})">${S.icon(g.icon)}</span></span><div style="flex:1;min-width:0"><h1 class="h1">${esc(g.title)}</h1><p class="muted">${esc(g.sub)}</p></div></div><div class="row small muted">${best ? `${medal(best)} Рекорд: ${best}%` : 'Медали: бронза от 50 %, серебро от 80 %, золото — 100 %'}</div></div><div id="gameBox"></div></div>`;
    },
    mount(root, id) { const g = S.games[id]; if (g) g.mount(root.querySelector('#gameBox')); }
  });

  /* ---------- общий блок результата щита ---------- */
  const RT = [['steps', 'Сборка по шагам'], ['panel', 'Щит'], ['scheme', 'Схема'], ['groups', 'Группы'], ['bom', 'Материалы'], ['checks', 'Проверки']];
  S.resultsUI = function (el, R0, opts) {
    opts = opts || {};
    const R1 = R0;
    const nErr = R1.checks.filter((c) => c.level === 'err').length, nWarn = R1.checks.filter((c) => c.level === 'warn').length;
    let tab = opts.tab || 'steps';
    let si = 0;
    const panelSVG = S.renderPanel(R1);
    const vbW = Number((panelSVG.match(/viewBox="[^"]*?\s([\d.]+)\s[\d.]+"/) || [])[1]) || 400;
    const stepsDone = () => opts.pid && store.data.xp['ps:' + opts.pid];
    const summary = `<div class="row" style="gap:6px"><span class="badge">${R1.three ? '3 фазы' : '1 фаза'} · ${S.fmt(R1.cfg.kw)} кВт</span><span class="badge">вводной ${R1.devices.find((d) => d.role === 'input').curve || ''}${R1.totals.inRating}</span><span class="badge">${R1.devices.length} аппаратов</span><span class="badge">${R1.enclosure.modules} мод.</span>${nErr ? `<span class="badge bad">${nErr} ошиб.</span>` : ''}${nWarn ? `<span class="badge warn">${nWarn} замеч.</span>` : ''}${!nErr && !nWarn ? '<span class="badge ok">замечаний нет</span>' : ''}${opts.pid ? (stepsDone() ? '<span class="badge xp got">✓ 40 XP</span>' : '<span class="badge xp">+40 XP за сборку</span>') : ''}</div>`;
    el.innerHTML = `<div class="stack">${summary}<div class="tabs-in" role="tablist">${RT.map(([k, t]) => `<button type="button" role="tab" data-rt="${k}" aria-selected="${k === tab}">${t}${k === 'checks' && (nErr || nWarn) ? ` <span class="counter">${nErr + nWarn}</span>` : ''}</button>`).join('')}</div><div data-rbody></div></div>`;
    const body = el.querySelector('[data-rbody]');
    const legend = `<div class="legend">${['L1', 'L2', 'L3', 'N', 'PE'].map((c) => `<span><i class="wire-sw" style="${V.swatch(c)}"></i>${c === 'L1' ? (R1.three ? 'L1' : 'L — фаза') : c}</span>`).join('')}</div>`;
    const draw = () => {
      if (tab === 'steps') {
        const s = R1.steps[si];
        const last = si === R1.steps.length - 1;
        body.innerHTML = `<div class="stack">${S.zoomBox(panelSVG, { min: Math.round(vbW * 1.7), h: '52vh' })}
          <div class="steps-nav"><button class="btn sm" type="button" data-sp ${si === 0 ? 'disabled' : ''} aria-label="Предыдущий шаг">${S.icon('prev')}</button><input type="range" min="0" max="${R1.steps.length - 1}" value="${si}" data-sr aria-label="Шаг сборки" style="flex:1;accent-color:var(--accent)"><span class="mono small" style="min-width:52px;text-align:center">${si + 1}/${R1.steps.length}</span><button class="btn sm primary" type="button" data-sn ${last ? 'disabled' : ''} aria-label="Следующий шаг">${S.icon('next')}</button></div>
          <div class="step-card stack-sm"><div class="n">Шаг ${si + 1} из ${R1.steps.length}</div><div class="h3">${esc(s.title)}</div><p>${esc(s.text)}</p>${s.why ? `<p class="small muted">${S.icon('info')} ${esc(s.why)}</p>` : ''}${last ? `<div class="flash ok">${S.icon('check')} Сборка пройдена до конца.${opts.pid ? ' Награда за проект начислена.' : ''}</div>` : ''}</div>${legend}</div>`;
        S.enhance(body);
        S.panelHighlight(body, s.hl && Object.keys(s.hl).length ? s.hl : null);
        if (last && opts.pid) S.bus.emit('steps', opts.pid);
        else if (last) { store.bump('steps'); store.touch('award'); }
        requestAnimationFrame(() => { const box = body.querySelector('.svgbox'); const g = body.querySelector('.panel-svg .glow'); if (box && g) { const br = box.getBoundingClientRect(), gr = g.getBoundingClientRect(); box.scrollTo({ left: Math.max(0, box.scrollLeft + gr.left - br.left - box.clientWidth / 2 + Math.min(gr.width, box.clientWidth) / 2), top: Math.max(0, box.scrollTop + gr.top - br.top - box.clientHeight / 2 + Math.min(gr.height, box.clientHeight) / 2), behavior: 'smooth' }); } });
      } else if (tab === 'panel') {
        body.innerHTML = `<div class="stack">${S.zoomBox(panelSVG, { min: Math.round(vbW * 1.7), h: '70vh' })}${legend}<p class="small muted">Цифры у хвостов снизу — номера групп (кабелей). Аппараты пронумерованы как на схеме. Раскладка и провода — рекомендация: сверяй клеммы с паспортами своих аппаратов.</p></div>`;
        S.enhance(body);
      } else if (tab === 'scheme') {
        const sl = S.renderSingleLine(R1);
        const w = Number((sl.match(/width="([\d.]+)"/) || [])[1]) || 800;
        body.innerHTML = `${S.zoomBox(sl, { min: w, h: '75vh' })}<p class="small muted" style="margin-top:8px">Однолинейная схема: сверху ввод, ниже группы с таблицей. Так рисуют схему на дверцу щита.</p>`;
        S.enhance(body);
      } else if (tab === 'groups') {
        body.innerHTML = `<div class="stack">${S.renderPhaseBars(R1)}${S.renderGroupsTable(R1)}</div>`;
      } else if (tab === 'bom') {
        body.innerHTML = `<div class="stack">${S.renderBOM(R1)}<div class="row"><button class="btn sm" type="button" data-exp="txt">${S.icon('download')}Скачать всё текстом</button><button class="btn sm" type="button" data-exp="svg">${S.icon('download')}Скачать схему щита (SVG)</button><button class="btn sm" type="button" data-exp="copy">${S.icon('copy')}Скопировать</button></div></div>`;
      } else if (tab === 'checks') {
        body.innerHTML = `<div class="stack">${S.renderChecks(R1)}<div class="card stack-sm"><b>Второе мнение</b><p class="small muted">Отправь щит Claude: он проверит проект целиком, найдёт спорные места, а разбор сохранится в разделе «Разборы».</p><div class="row"><button class="btn sm primary" type="button" data-sendpanel>${S.icon('send')}Отправить Claude на разбор</button>${S.ai && S.ai.state === 'ready' ? `<button class="btn sm" type="button" data-review>${S.icon('sparkle')}Быстрая проверка ИИ</button>` : ''}</div><div data-revout></div></div></div>`;
      }
    };
    el.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-rt]');
      if (t) { tab = t.dataset.rt; S.$$('[data-rt]', el).forEach((b) => b.setAttribute('aria-selected', String(b === t))); draw(); return; }
      if (e.target.closest('[data-sp]')) { si = Math.max(0, si - 1); draw(); return; }
      if (e.target.closest('[data-sn]')) { si = Math.min(R1.steps.length - 1, si + 1); draw(); return; }
      const ex = e.target.closest('[data-exp]');
      if (ex) { exportR(R1, ex.dataset.exp, panelSVG); return; }
      if (e.target.closest('[data-sendpanel]')) { S.sync.compose({ type: 'panel', cfg: R1.cfg, title: 'Проверь щит: ' + (R1.cfg.name || 'щит') }); return; }
      if (e.target.closest('[data-review]')) { S.ai.review(R1, el.querySelector('[data-revout]')); }
    });
    el.addEventListener('input', (e) => { if (e.target.matches('[data-sr]')) { si = Number(e.target.value); draw(); } });
    draw();
  };
  const cssResolve = (svg) => {
    const cs = getComputedStyle(document.documentElement);
    let out = svg;
    for (let k = 0; k < 3 && /var\(--/.test(out); k++) out = out.replace(/var\((--[a-z0-9-]+)\)/gi, (m, v) => (cs.getPropertyValue(v) || '#000').trim() || '#000');
    return out;
  };
  async function exportR(R1, kind, panelSVG) {
    const name = (R1.cfg.name || 'shchit').replace(/[^\wА-Яа-яЁё -]+/g, '').trim().replace(/\s+/g, '_') || 'shchit';
    if (kind === 'copy') { S.copy(S.exportText(R1)); return; }
    if (kind === 'svg') { await S.saveFile(name + '_shchit.svg', cssResolve(panelSVG).replace('<svg ', '<svg style="background:#fff" '), 'image/svg+xml'); return; }
    await S.saveFile(name + '.txt', S.exportText(R1), 'text/plain;charset=utf-8');
  }

  /* ================= ПРОЕКТ ================= */
  S.view('project', {
    tab: 'practice', parent: 'practice',
    render(id) {
      const p = S.projects.find((x) => x.id === id);
      if (!p) return '<div class="wrap"><div class="empty">Проект не найден.</div></div>';
      if (p.photos) { setTimeout(() => S.go('photos', { replace: true }), 0); return '<div class="wrap"></div>'; }
      return `<div class="wrap wide">${crumbs([['Практика', 'practice'], [p.title, null]])}<div class="page-head" style="margin-top:8px"><div class="row"><span class="badge"><span class="lang"><i style="background:${LVLC[p.level]}"></i></span>${p.control ? 'Автоматика' : 'Щит'}</span>${levelDots(p.level)}</div><h1 class="h1" style="margin-top:6px">${esc(p.title)}</h1><p class="muted">${esc(p.sub)}</p><div class="row" style="margin-top:8px">${S.tts.btn('Слушать проект')}</div></div>
        <div class="prose" style="margin-bottom:16px">${p.intro}</div>
        ${p.cfg ? `<div class="row" style="margin-bottom:12px"><button class="btn primary" type="button" data-open>${S.icon('panel')}Открыть в конструкторе</button><span class="small muted">там можно менять потребителей и аппараты</span></div><div id="projRes"></div>` : ''}
        ${p.control ? `<div id="ctlBox"></div>` : ''}
        ${p.tips ? `<div class="box tip" style="margin-top:16px"><div class="lbl">${S.icon('check')}Советы</div><ul>${p.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}</div>`;
    },
    mount(root, id) {
      const p = S.projects.find((x) => x.id === id);
      if (!p) return;
      if (p.cfg) {
        const R1 = E.build(p.cfg);
        S.resultsUI(root.querySelector('#projRes'), R1, { pid: p.id });
        root.querySelector('[data-open]').addEventListener('click', () => { loadIntoBuilder(p.cfg); });
      }
      if (p.control) S.mountControl(root.querySelector('#ctlBox'), p.control);
    }
  });

  /* ================= ТВОИ ЩИТЫ ================= */
  S.view('photos', {
    tab: 'practice', parent: 'practice',
    render() {
      const pinSeen = (ph, i) => !!store.data.xp['pn:' + ph + ':' + i];
      return `<div class="wrap wide">${crumbs([['Практика', 'practice'], ['Твои щиты', null]])}<div class="page-head" style="margin-top:8px"><h1 class="h1">Твои щиты: офис</h1><p class="muted">Разбор фото, которые ты прислал. Нажимай на жёлтые метки — появится объяснение. Изучи все метки фото — +15 XP.</p><div class="row" style="margin-top:8px">${S.tts.btn('Слушать разбор фото')}</div></div>
        <section class="stack"><h2 class="h2">Как связаны щиты</h2><div class="row" style="align-items:flex-start;gap:18px"><figure class="ill" style="flex:1 1 320px;max-width:460px">${S.photoSystemSVG()}</figure><div class="prose" style="flex:1 1 300px">
          <p>На стене четыре щита. Высокий справа — <b>ЩУ, щит учёта</b>: сюда приходит питание от ВРУ здания, оно проходит через вводной автомат, счётчик и раздаётся отходящими автоматами на остальные щиты.</p>
          <p><b>ЩР-1</b> и <b>ЩР-2</b> — распределительные: розетки рабочих мест на дифавтоматах, немного освещения и линии без УЗО. <b>ЩО</b> — освещение: шесть групп C10.</p>
          ${B.warn('<p>Связи между щитами на фото не видны — это наиболее вероятная схема. Проверь: на кабелях есть бирки, а сечение подскажет автомат (для C32 — 5×6 мм², для C25 — 5×4 мм²). Перед работой — отключение в ВРУ и проверка отсутствия напряжения.</p>')}
          <p>Почти всё внутри — EKF: автоматы ВА 47-63 и ВА 47-100, дифавтоматы АВДТ-63М, счётчик СКАТ 315, автоматы AVERES (бренд EKF).</p></div></div></section>
        <div class="stack-lg" style="margin-top:28px">${S.photos.map((ph, pi) => { const all = ph.pins.every((_, i) => pinSeen(ph.id, i)); return `<section class="stack" aria-labelledby="ph-${ph.id}"><div class="row"><h2 class="h2" id="ph-${ph.id}" style="flex:1">Фото ${pi + 1}. ${esc(ph.title)}</h2>${all ? `<span class="badge ok">${S.icon('check')}изучено</span>` : `<span class="badge xp">+15 XP</span>`}</div>
          <div class="row" style="align-items:flex-start;gap:16px"><div class="photo-wrap" style="flex:1 1 300px;max-width:${ph.w > ph.h ? 760 : 480}px"><img src="${ph.src}" alt="${esc(ph.title)}" width="${ph.w}" height="${ph.h}" decoding="async"><svg viewBox="0 0 ${ph.w} ${ph.h}" aria-hidden="false">${ph.pins.map((p, i) => `<g class="pin${pinSeen(ph.id, i) ? ' seen' : ''}" data-ph="${ph.id}" data-pi="${i}" role="button" tabindex="0" aria-label="${esc(p.t)}"><circle cx="${p.x}" cy="${p.y}" r="${ph.w > 1000 ? 30 : 34}"/><text x="${p.x}" y="${p.y + 1}">${i + 1}</text></g>`).join('')}</svg></div>
          <div style="flex:1 1 280px;min-width:0" class="stack-sm"><div class="box ex" data-pinbox="${ph.id}"><div class="lbl">${S.icon('info')}Нажми на метку</div><p>На фото ${ph.pins.length} меток.</p></div>
          <ol class="small" style="padding-left:20px;margin:0">${ph.pins.map((p, i) => `<li><button type="button" class="lnk" data-ph="${ph.id}" data-pi="${i}">${esc(p.t)}</button></li>`).join('')}</ol>
          ${(() => { const pp = S.photoPanels.find((x) => x.photo === ph.id); return pp ? `<div class="row"><button class="btn primary sm" type="button" data-wire="${pp.id}">${S.icon('cable')}Как подключить этот щит</button><button class="btn sm" type="button" data-openb="${pp.id}">${S.icon('panel')}В конструктор</button></div>` : ''; })()}</div></div>
          <div data-wirebox="${(S.photoPanels.find((x) => x.photo === ph.id) || {}).id || ''}"></div></section>`; }).join('')}</div>
        <div class="box tip" style="margin-top:24px"><div class="lbl">${S.icon('camera')}Есть ещё фото?</div><p>Отправь их Claude на разбор — он разберёт любой щит так же, а разбор сохранится в разделе «Разборы».</p><p><button class="btn sm primary" type="button" data-sendphoto>${S.icon('camera')}Отправить фото щита</button></p></div>
      </div>`;
    },
    mount(root) {
      const showPin = (phId, i) => {
        const ph = S.photos.find((x) => x.id === phId);
        const p = ph.pins[i];
        const box = root.querySelector(`[data-pinbox="${phId}"]`);
        box.innerHTML = `<div class="lbl">${S.icon('info')}Метка ${i + 1}</div><b>${esc(p.t)}</b><p>${esc(p.d)}</p>`;
        S.$$(`.pin[data-ph="${phId}"]`, root).forEach((g) => { g.classList.toggle('on', Number(g.dataset.pi) === i); });
        const g = root.querySelector(`.pin[data-ph="${phId}"][data-pi="${i}"]`); if (g) g.classList.add('seen');
        S.bus.emit('pin', { ph: phId, i });
      };
      root.addEventListener('click', (e) => {
        const pin = e.target.closest('[data-pi]');
        if (pin) { showPin(pin.dataset.ph, Number(pin.dataset.pi)); return; }
        const w = e.target.closest('[data-wire]');
        if (w) {
          const pp = S.photoPanels.find((x) => x.id === w.dataset.wire);
          const box = root.querySelector(`[data-wirebox="${pp.id}"]`);
          if (box.dataset.open) { box.innerHTML = ''; delete box.dataset.open; return; }
          box.dataset.open = '1';
          box.innerHTML = `<div class="card"><div class="h3" style="margin-bottom:10px">${esc(pp.title)}: как подключить</div><div data-res></div></div>`;
          S.resultsUI(box.querySelector('[data-res]'), E.build(pp.cfg), { pid: 'f-' + pp.id });
          box.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
        const ob = e.target.closest('[data-openb]');
        if (ob) { loadIntoBuilder(S.photoPanels.find((x) => x.id === ob.dataset.openb).cfg); return; }
        if (e.target.closest('[data-sendphoto]')) S.sync.compose({ type: 'photo' });
      });
      root.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.pin')) { e.preventDefault(); const p = e.target.closest('.pin'); showPin(p.dataset.ph, Number(p.dataset.pi)); } });
    }
  });

  /* ================= КОНСТРУКТОР ================= */
  const cloneCfg = (c) => { const x = JSON.parse(JSON.stringify(c)); x.lines = (x.lines || []).map((l) => Object.assign(l, { id: E.uid() })); return x; };
  let B_ = null; // состояние конструктора
  const bInit = () => {
    if (B_) return;
    const d = store.data.draft && store.data.draft.cfg ? store.data.draft.cfg : E.defaultCfg();
    B_ = { cfg: cloneCfg(d), pane: 'result', id: (store.data.draft && store.data.draft.id) || null };
  };
  let draftT = null;
  const saveDraft = () => { clearTimeout(draftT); draftT = setTimeout(() => { store.data.draft = { cfg: B_.cfg, id: B_.id, updated: Date.now() }; store.saveLocal(); store.scheduleRemote(); }, 800); };
  function loadIntoBuilder(cfg) { bInit(); B_.cfg = cloneCfg(cfg); B_.id = null; B_.pane = 'result'; saveDraft(); S.go('builder'); S.toast('Загружено в конструктор'); }
  S.loadIntoBuilder = loadIntoBuilder;
  const sel = (id, opts, val) => `<select class="inp" id="${id}">${opts.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(val) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  const seg = (name, opts, val) => `<div class="seg" role="group" data-seg="${name}">${opts.map(([v, t]) => `<button type="button" data-v="${esc(v)}" aria-pressed="${String(v) === String(val)}">${esc(t)}</button>`).join('')}</div>`;
  const lineSummary = (l, R1) => {
    const r = R1 && R1.lines.find((x) => x.id === l.id);
    const k = E.KINDS[l.kind];
    const parts = [`${S.fmt(l.p, 2)} кВт`, l.len ? `${l.len} м` : '', l.room && l.room !== 'dry' ? E.ROOMS[l.room] : ''].filter(Boolean);
    const prot = r ? (r.how === 'rcbo' ? `АВДТ ${r.curve}${r.In} ${r.ma}мА` : `${r.ph === 3 && R1.three ? '3P ' : ''}${r.curve}${r.In}${r.how === 'grp' || r.how === 'grp4' ? ' +УЗО' : ''}`) + ` · ${r.cores}×${String(r.s).replace('.', ',')}` + (r.phase && R1.three ? ` · ${r.phase === 'L123' ? 'L1-3' : r.phase}` : '') : '';
    return `<div class="line-item" data-line="${l.id}"><span class="lic">${S.icon(k.icon)}</span><span class="t"><b>${esc(l.name)}</b><span>${esc(parts.join(' · '))}</span>${prot ? `<span class="mono" style="display:block;color:var(--fg-muted)">${esc(prot)}</span>` : ''}</span><span class="row" style="gap:2px;flex-wrap:nowrap"><button class="icon-btn" type="button" data-edit="${l.id}" aria-label="Изменить">${S.icon('edit')}</button><button class="icon-btn" type="button" data-dup="${l.id}" aria-label="Копировать">${S.icon('copy')}</button><button class="icon-btn" type="button" data-del="${l.id}" aria-label="Удалить">${S.icon('trash')}</button></span></div>`;
  };
  S.view('builder', {
    tab: 'builder', top: true,
    render() {
      bInit();
      const c = B_.cfg;
      return `<div class="wrap wide">${head('', 'Конструктор щита', 'Задай ввод и потребителей — получишь аппараты, раскладку по рейкам, однолинейную схему, материалы и пошаговую сборку с подсветкой каждого провода.')}
        <div class="row" style="margin-bottom:12px"><input class="inp" id="bName" value="${esc(c.name || '')}" aria-label="Название щита" style="flex:1 1 220px;max-width:420px"><button class="btn sm" type="button" data-tpl>${S.icon('layers')}Шаблоны</button><button class="btn sm" type="button" data-my>${S.icon('list')}Мои щиты</button><button class="btn sm primary" type="button" data-save>${S.icon('save')}Сохранить</button><button class="btn sm" type="button" data-send>${S.icon('send')}На разбор</button><button class="btn sm ghost" type="button" data-new>${S.icon('plus')}Новый</button></div>
        <div class="tabs-in" role="tablist" style="margin-bottom:14px"><button type="button" role="tab" data-pane="input" aria-selected="${B_.pane === 'input'}">1. Ввод и защита</button><button type="button" role="tab" data-pane="lines" aria-selected="${B_.pane === 'lines'}">2. Линии <span class="counter" data-lcount>${c.lines.length}</span></button><button type="button" role="tab" data-pane="result" aria-selected="${B_.pane === 'result'}">3. Результат</button></div>
        <div id="bPane"></div></div>`;
    },
    mount(root) {
      const pane = root.querySelector('#bPane');
      let R1 = null;
      const rebuild = () => { try { R1 = E.build(B_.cfg); } catch (e) { console.error(e); R1 = null; } };
      const drawPane = () => {
        rebuild();
        const c = B_.cfg;
        S.$$('[data-pane]', root).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.pane === B_.pane)));
        const lc = root.querySelector('[data-lcount]'); if (lc) lc.textContent = c.lines.length;
        if (B_.pane === 'input') {
          pane.innerHTML = `<div class="stack">
            <div class="form-grid">
              <div class="field"><label for="bObj">Объект</label>${sel('bObj', Object.entries(E.OBJECTS), c.object)}</div>
              <div class="field"><span class="lab">Ввод</span>${seg('phases', [[1, '1 фаза 230 В'], [3, '3 фазы 400 В']], c.phases)}</div>
              <div class="field"><label for="bKw">Мощность по ТУ, кВт</label><input class="inp num" id="bKw" type="number" inputmode="decimal" min="1" step="0.5" value="${c.kw}"></div>
              <div class="field"><label for="bEarth">Система заземления</label>${sel('bEarth', Object.entries(E.EARTH), c.earthing)}</div>
              <div class="field"><label for="bMeter">Счётчик в этом щите</label>${sel('bMeter', [['none', 'Нет (стоит в другом месте)'], ['din', 'Да, на DIN-рейку'], ['panel', 'Да, навесной (как СКАТ 315)']], c.meter)}</div>
              <div class="field"><label for="bInK">Вводной аппарат</label>${sel('bInK', [['auto', 'Автомат (авто)'], ['mcb', 'Автомат'], ['sw', 'Выключатель нагрузки']], c.input.kind)}</div>
              <div class="field"><label for="bInR">Номинал вводного</label>${sel('bInR', [['auto', 'По мощности (авто)']].concat(S.K.mcb.map((x) => [x, x + ' А'])), c.input.rating)}</div>
              <div class="field"><label for="bRes">Запас мест, %</label><input class="inp num" id="bRes" type="number" min="0" max="60" step="5" value="${c.reserve}"></div>
            </div>
            <label class="check"><input type="checkbox" id="bOver" ${c.overhead ? 'checked' : ''}><span>Ввод по воздушной линии (от опоры) — нужен УЗИП</span></label>
            <div class="form-grid">
              <div class="field"><span class="lab">Реле напряжения</span>${seg('rn', [['auto', 'Авто'], ['yes', 'Да'], ['no', 'Нет']], c.rn)}</div>
              <div class="field"><span class="lab">УЗИП</span>${seg('spd', [['auto', 'Авто'], ['yes', 'Да'], ['no', 'Нет']], c.spd)}</div>
              <div class="field"><span class="lab">УЗО противопожарное</span>${seg('fire', [['auto', 'Авто'], ['yes', 'Да'], ['no', 'Нет']], c.fire)}</div>
              <div class="field"><span class="lab">Защита от утечки</span>${seg('scheme', [['auto', 'Авто'], ['rcd', 'УЗО на группы'], ['rcbo', 'Дифавтомат на линию']], c.scheme)}</div>
            </div>
            <label class="check"><input type="checkbox" id="bCompact" ${c.compact ? 'checked' : ''}><span>Компактные дифавтоматы 1 модуль (как АВДТ-63М)</span></label>
            <label class="check"><input type="checkbox" id="bWide" ${c.wide ? 'checked' : ''}><span>Трёхполюсные автоматы с широким полюсом (как ВА 47-100)</span></label>
            <div class="row"><button class="btn primary" type="button" data-goto="lines">Дальше: линии ${S.icon('next')}</button></div></div>`;
        } else if (B_.pane === 'lines') {
          pane.innerHTML = `<div class="stack"><div class="row"><button class="btn primary" type="button" data-add>${S.icon('plus')}Добавить линию</button><span class="small muted">${c.lines.length} ${S.plural(c.lines.length, 'линия', 'линии', 'линий')}</span></div>
            <div class="stack-sm">${c.lines.map((l) => lineSummary(l, R1)).join('') || `<div class="empty">${S.icon('plus')}Добавь первую линию: свет, розетки, плиту…</div>`}</div>
            <div class="row"><button class="btn primary" type="button" data-goto="result">Готово: результат ${S.icon('next')}</button></div></div>`;
        } else {
          if (!R1) { pane.innerHTML = '<div class="empty">Не получилось посчитать щит. Проверь линии.</div>'; return; }
          if (!c.lines.length) { pane.innerHTML = '<div class="empty">Пока нет ни одной линии. Добавь потребителей во вкладке «Линии».</div>'; return; }
          pane.innerHTML = '<div id="bRes"></div>';
          S.resultsUI(pane.querySelector('#bRes'), R1);
        }
      };
      const changed = () => { saveDraft(); };
      root.addEventListener('click', (e) => {
        const p = e.target.closest('[data-pane]');
        if (p) { B_.pane = p.dataset.pane; drawPane(); window.scrollTo(0, root.querySelector('.tabs-in').offsetTop - 70); return; }
        const gt = e.target.closest('[data-goto]');
        if (gt) { B_.pane = gt.dataset.goto; drawPane(); window.scrollTo(0, 0); return; }
        const sg = e.target.closest('[data-seg] button');
        if (sg) {
          const k = sg.parentElement.dataset.seg;
          let v = sg.dataset.v;
          if (k === 'phases') v = Number(v);
          B_.cfg[k] = v;
          S.$$('button', sg.parentElement).forEach((b) => b.setAttribute('aria-pressed', String(b === sg)));
          if (k === 'phases' && v === 1) B_.cfg.lines.forEach((l) => { if (l.ph === 3) l.ph = 1; l.phase = 'auto'; });
          changed(); return;
        }
        if (e.target.closest('[data-add]')) { openKinds(); return; }
        const ed = e.target.closest('[data-edit]');
        if (ed) { openLine(ed.dataset.edit); return; }
        const du = e.target.closest('[data-dup]');
        if (du) { const l = B_.cfg.lines.find((x) => x.id === du.dataset.dup); const n = JSON.parse(JSON.stringify(l)); n.id = E.uid(); n.name = l.name + ' (копия)'; B_.cfg.lines.splice(B_.cfg.lines.indexOf(l) + 1, 0, n); changed(); drawPane(); return; }
        const de = e.target.closest('[data-del]');
        if (de) { B_.cfg.lines = B_.cfg.lines.filter((x) => x.id !== de.dataset.del); changed(); drawPane(); S.toast('Линия удалена'); return; }
        if (e.target.closest('[data-tpl]')) { openTemplates(); return; }
        if (e.target.closest('[data-my]')) { openMine(); return; }
        if (e.target.closest('[data-save]')) {
          if (!B_.cfg.lines.length) { S.toast('Добавь хотя бы одну линию'); return; }
          if (!B_.id) B_.id = 'p' + E.uid();
          store.saveProject({ id: B_.id, name: B_.cfg.name || 'Щит', cfg: JSON.parse(JSON.stringify(B_.cfg)) });
          saveDraft();
          rebuild();
          S.bus.emit('build', { id: B_.id, R: R1 });
          S.toast('Сохранено в «Мои щиты»');
          return;
        }
        if (e.target.closest('[data-send]')) { S.sync.compose({ type: 'panel', cfg: B_.cfg, title: 'Проверь щит: ' + (B_.cfg.name || 'щит') }); return; }
        if (e.target.closest('[data-new]')) { B_.cfg = { v: 1, name: 'Новый щит', object: 'flat', phases: 1, kw: 7, earthing: 'TN-C-S', overhead: false, meter: 'none', input: { kind: 'auto', rating: 'auto' }, rn: 'auto', spd: 'auto', fire: 'auto', scheme: 'auto', compact: false, wide: false, reserve: 25, lines: [] }; B_.id = null; B_.pane = 'input'; changed(); S.render(); return; }
      });
      root.addEventListener('change', (e) => {
        const t = e.target, c = B_.cfg;
        if (t.id === 'bName') c.name = t.value;
        else if (t.id === 'bObj') c.object = t.value;
        else if (t.id === 'bKw') c.kw = Math.max(1, parseFloat(String(t.value).replace(',', '.')) || c.kw);
        else if (t.id === 'bEarth') c.earthing = t.value;
        else if (t.id === 'bMeter') c.meter = t.value;
        else if (t.id === 'bInK') c.input.kind = t.value;
        else if (t.id === 'bInR') c.input.rating = t.value === 'auto' ? 'auto' : Number(t.value);
        else if (t.id === 'bRes') c.reserve = Number(t.value) || 0;
        else if (t.id === 'bOver') c.overhead = t.checked;
        else if (t.id === 'bCompact') c.compact = t.checked;
        else if (t.id === 'bWide') c.wide = t.checked;
        else return;
        changed();
      });
      const openKinds = () => {
        const body = S.sheet('Добавить линию', `<div class="stack">${E.KIND_GROUPS.map(([g, ks]) => `<section class="stack-sm"><div class="eyebrow">${g}</div><div class="kind-grid">${ks.map((k) => `<button type="button" class="kind" data-k="${k}">${S.icon(E.KINDS[k].icon)}<span>${esc(E.KINDS[k].name)}</span></button>`).join('')}</div></section>`).join('')}</div>`);
        body.addEventListener('click', (e) => {
          const k = e.target.closest('[data-k]');
          if (!k) return;
          const kind = k.dataset.k;
          const l = E.newLine(kind);
          if (E.KINDS[kind].ph === 3 && B_.cfg.phases !== 3) { l.ph = 1; }
          B_.cfg.lines.push(l);
          S.closeSheet(); changed(); drawPane(); openLine(l.id);
        });
      };
      const openLine = (id) => {
        const l = B_.cfg.lines.find((x) => x.id === id);
        if (!l) return;
        const three = B_.cfg.phases === 3;
        const d = l.dev;
        const body = S.sheet('Линия', `<div class="stack">
          <div class="field"><label for="lName">Название</label><input class="inp" id="lName" value="${esc(l.name)}"></div>
          <div class="form-grid">
            <div class="field"><label for="lKind">Тип потребителя</label>${sel('lKind', Object.keys(E.KINDS).map((k) => [k, E.KINDS[k].name]), l.kind)}</div>
            <div class="field"><label for="lP">Мощность, кВт</label><input class="inp num" id="lP" type="number" inputmode="decimal" min="0" step="0.1" value="${l.p}"></div>
            <div class="field"><label for="lLen">Длина кабеля, м</label><input class="inp num" id="lLen" type="number" inputmode="decimal" min="0" step="1" value="${l.len}"></div>
            <div class="field"><label for="lRoom">Где</label>${sel('lRoom', Object.entries(E.ROOMS), l.room)}</div>
            ${three ? `<div class="field"><label for="lPh">Фазность</label>${sel('lPh', [[1, '1 фаза'], [3, '3 фазы']], l.ph)}</div><div class="field"><label for="lPhase">Фаза</label>${sel('lPhase', [['auto', 'Авто'], ['L1', 'L1'], ['L2', 'L2'], ['L3', 'L3']], l.phase)}</div>` : ''}
          </div>
          <details class="acc"><summary>Аппарат вручную (если уже есть свои)</summary><div class="in form-grid">
            <div class="field"><label for="lRcd">УЗО</label>${sel('lRcd', [['auto', 'Авто по нормам'], ['yes', 'Да'], ['no', 'Нет']], l.rcd)}</div>
            <div class="field"><label for="lType">Аппарат</label>${sel('lType', [['auto', 'Авто'], ['mcb', 'Автомат (+УЗО группы)'], ['rcbo', 'Дифавтомат']], d.type)}</div>
            <div class="field"><label for="lIn">Номинал</label>${sel('lIn', [['auto', 'Авто']].concat(S.K.mcb.map((x) => [x, x + ' А'])), d.in)}</div>
            <div class="field"><label for="lCurve">Характеристика</label>${sel('lCurve', [['auto', 'Авто'], ['B', 'B'], ['C', 'C'], ['D', 'D']], d.curve)}</div>
            <div class="field"><label for="lMa">Уставка утечки</label>${sel('lMa', [['auto', 'Авто'], [10, '10 мА'], [30, '30 мА'], [100, '100 мА']], d.ma)}</div>
            <div class="field"><label for="lRt">Тип УЗО</label>${sel('lRt', [['auto', 'Авто'], ['AC', 'AC'], ['A', 'A']], d.rt)}</div>
          </div></details>
          ${E.KINDS[l.kind].note ? `<p class="small muted">${esc(E.KINDS[l.kind].note)}</p>` : ''}
          <div class="row"><button class="btn primary" type="button" data-close>Готово</button></div></div>`);
        body.addEventListener('change', (e) => {
          const t = e.target;
          if (t.id === 'lName') l.name = t.value;
          else if (t.id === 'lKind') { const k = E.KINDS[t.value]; l.kind = t.value; l.p = k.p; l.len = k.len; l.room = k.room || l.room; if (k.ph === 3 && three) l.ph = 3; else if (k.ph === 1) l.ph = 1; if (l.name === '' || Object.values(E.KINDS).some((x) => x.name === l.name)) l.name = k.name; }
          else if (t.id === 'lP') l.p = Math.max(0, parseFloat(String(t.value).replace(',', '.')) || 0);
          else if (t.id === 'lLen') l.len = Math.max(0, parseFloat(String(t.value).replace(',', '.')) || 0);
          else if (t.id === 'lRoom') l.room = t.value;
          else if (t.id === 'lPh') l.ph = Number(t.value);
          else if (t.id === 'lPhase') l.phase = t.value;
          else if (t.id === 'lRcd') l.rcd = t.value;
          else if (t.id === 'lType') d.type = t.value;
          else if (t.id === 'lIn') d.in = t.value === 'auto' ? 'auto' : Number(t.value);
          else if (t.id === 'lCurve') d.curve = t.value;
          else if (t.id === 'lMa') d.ma = t.value === 'auto' ? 'auto' : Number(t.value);
          else if (t.id === 'lRt') d.rt = t.value;
          changed(); drawPane();
        });
        body.addEventListener('input', (e) => { if (e.target.id === 'lName') { l.name = e.target.value; changed(); } });
      };
      const openTemplates = () => {
        const items = S.projects.filter((p) => p.cfg).map((p) => ['p:' + p.id, p.title, p.sub]).concat(S.photoPanels.map((p) => ['f:' + p.id, p.title, 'с твоих фото']));
        const body = S.sheet('Шаблоны', `<div class="list">${items.map(([k, t, s]) => `<button type="button" class="li" data-t="${k}"><span class="t"><b>${esc(t)}</b><span>${esc(s)}</span></span>${S.icon('next')}</button>`).join('')}</div>`);
        body.addEventListener('click', (e) => {
          const b = e.target.closest('[data-t]');
          if (!b) return;
          const [kind, id] = b.dataset.t.split(':');
          const cfg = kind === 'p' ? S.projects.find((p) => p.id === id).cfg : S.photoPanels.find((p) => p.id === id).cfg;
          B_.cfg = cloneCfg(cfg); B_.id = null; B_.pane = 'result';
          S.closeSheet(); changed(); S.render();
        });
      };
      const openMine = () => {
        const ps = Object.values(store.data.projects).sort((a, b) => b.updated - a.updated);
        const body = S.sheet('Мои щиты', ps.length ? `<div class="list">${ps.map((p) => `<div class="li"><span class="t"><b>${esc(p.name)}</b><span>${new Date(p.updated).toLocaleDateString('ru-RU')} · ${p.cfg.lines.length} линий</span></span><button class="btn sm" type="button" data-o="${esc(p.id)}">Открыть</button><button class="icon-btn" type="button" data-x="${esc(p.id)}" aria-label="Удалить">${S.icon('trash')}</button></div>`).join('')}</div><p class="small muted" style="margin-top:10px">${S.synced ? 'Сохраняется в твоём аккаунте Claude — видно и на телефоне, и на компьютере.' : 'Сохраняется в этом браузере. Резервная копия — в профиле.'}</p>` : '<div class="empty">Пока пусто. Нажми «Сохранить» в конструкторе.</div>');
        body.addEventListener('click', (e) => {
          const o = e.target.closest('[data-o]');
          if (o) { const p = store.data.projects[o.dataset.o]; if (!p) return; B_.cfg = cloneCfg(p.cfg); B_.id = p.id; B_.pane = 'result'; S.closeSheet(); changed(); S.render(); return; }
          const x = e.target.closest('[data-x]');
          if (x) { store.deleteProject(x.dataset.x); S.closeSheet(); openMine(); }
        });
      };
      root.addEventListener('change', () => { if (B_.pane === 'lines') drawPane(); });
      drawPane();
    }
  });

  /* ================= ПРОФИЛЬ ================= */
  const profNav = (cur) => `<nav class="tabs-in" aria-label="Профиль" style="margin-bottom:18px">${[['', 'Обзор', 'user'], ['ach', 'Достижения', 'trophy'], ['data', 'Прогресс и копия', 'shield'], ['set', 'Настройки', 'gear']].map(([k, t, ic]) => `<a href="#profile${k ? '.' + k : ''}" data-go="profile${k ? '.' + k : ''}" aria-selected="${cur === k}">${S.icon(ic)}${t}${k === 'ach' ? ` <span class="counter">${R.achList().filter((a) => a.got).length}/${R.ACH.length}</span>` : ''}</a>`).join('')}</nav>`;
  S.view('profile', {
    tab: 'profile', top: (arg) => !arg, live: true, parent: 'profile',
    render(arg) {
      const info = R.info();
      const top = `<div class="lobby" style="margin-bottom:18px">${R.avatarRing(96)}<div style="min-width:0"><div class="nm">${esc(R.nick())}</div><div class="rk"><span class="rank">${S.icon('trophy')}${esc(info.rank)}</span><span class="badge xp">LVL ${info.L}</span></div><div class="small muted" style="margin-top:6px">${info.xp} XP · с нами с ${new Date(store.data.profile.since).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</div></div></div>`;
      if (arg === 'ach') return `<div class="wrap">${top}${profNav('ach')}${achHTML()}</div>`;
      if (arg === 'data') return `<div class="wrap">${top}${profNav('data')}${dataHTML()}</div>`;
      if (arg === 'set') return `<div class="wrap">${top}${profNav('set')}${setHTML()}</div>`;
      const heat = R.heat(53);
      const L = allLessons(), done = L.filter((l) => isDone(l.id)).length;
      const games = Object.keys(store.data.games).length;
      return `<div class="wrap">${top}${profNav('')}
        <div class="bar xp"><i style="width:${Math.round(info.pct * 100)}%"></i></div><div class="xpline"><span>До уровня ${info.L + 1}: ${info.span - info.cur} XP</span><b>${info.cur}/${info.span} XP</b></div>
        <div class="stats4" style="margin-top:14px"><div class="st fl"><b>${R.streak()}</b><span>серия, дней</span></div><div class="st fl"><b>${R.maxStreak()}</b><span>лучшая серия</span></div><div class="st ls"><b>${done}</b><span>уроков</span></div><div class="st xp"><b>${games}</b><span>игр с рекордом</span></div></div>
        <section style="margin-top:22px"><div class="sec-title">${S.icon('flame')}Активность за год<span class="small muted" style="font-weight:400;margin-left:auto">${heat.daysActive} ${S.plural(heat.daysActive, 'день', 'дня', 'дней')} с занятиями</span></div><div class="card">${heat.html}</div></section>
        <section style="margin-top:22px"><div class="sec-title">${S.icon('trophy')}Ранги</div><div class="list">${R.RANKS.map(([lv, name], i) => { const nextLv = (R.RANKS[i + 1] || [99])[0]; const cur = info.L >= lv && info.L < nextLv; const got = info.L >= lv; return `<div class="setting"${cur ? ' style="background:var(--done-subtle)"' : ''}><span class="badge ${got ? 'fill-done' : ''}" style="min-width:58px;justify-content:center">LVL ${lv}</span><span class="t"><b${got ? '' : ' style="color:var(--fg-muted)"'}>${esc(name)}</b><span>${cur ? 'твой ранг сейчас' : got ? 'пройден' : `нужно ${R.need(lv)} XP`}</span></span>${got ? S.icon('check') : S.icon('lock')}</div>`; }).join('')}</div></section>
      </div>`;
    },
    mount(root, arg) {
      if (arg === 'data') mountData(root);
      if (arg === 'set') mountSet(root);
    }
  });
  function achHTML() {
    const list = R.achList();
    const order = { l: 0, e: 1, r: 2, c: 3 };
    const sorted = list.slice().sort((a, b) => (!!b.got - !!a.got) || (b.got || 0) - (a.got || 0) || order[a.r] - order[b.r]);
    return `<p class="small muted" style="margin-bottom:12px">Открыто ${list.filter((a) => a.got).length} из ${list.length}. Обычные — +25 XP, редкие — +50, эпические — +100, легендарные — +200.</p><div class="ach-grid">${sorted.map((a) => `<div class="ach${a.got ? '' : ' locked'}" data-r="${a.r}">${R.medal(a)}<span class="rar">${R.RARITY[a.r]}</span><b>${esc(a.t)}</b><span>${esc(a.d)}</span><span>${a.got ? 'получено ' + new Date(a.got).toLocaleDateString('ru-RU') : `+${a.xp} XP`}</span></div>`).join('')}</div>`;
  }
  function dataHTML() {
    const d = store.data;
    const where = S.env === 'artifact'
      ? 'Прогресс хранится в твоём аккаунте Claude и в этом браузере. Другие люди его не видят и изменить не могут.'
      : 'Прогресс хранится только в этом браузере на этом устройстве. У сайта нет сервера и аккаунтов, поэтому никто — ни другие посетители, ни сам сайт — не может увидеть или изменить твой прогресс. Обновления сайта его не стирают.';
    const size = (() => { try { const kb = new Blob([JSON.stringify(d)]).size / 1024; return kb < 1 ? 'меньше 1 КБ' : Math.round(kb) + ' КБ'; } catch (e) { return '—'; } })();
    return `<div class="stack">
      <div class="box tip"><div class="lbl">${S.icon('shield')}Твой прогресс защищён</div><p>${where}</p><p class="small">Хранилище: ${S.persist.granted ? '<b>закреплено</b> — браузер не очистит его сам' : S.persist.asked ? 'обычное — браузер может очистить его при нехватке места. Установи приложение на главный экран или регулярно сохраняй копию' : 'проверяю…'} · объём ${size}.</p></div>
      <section class="list"><div class="list-head">${S.icon('save')}<b>Резервная копия</b></div>
        <div class="setting"><span class="t"><b>Скачать файл копии</b><span>Файл .json со всем прогрессом. Храни его в облаке или отправь себе.</span></span><button class="btn sm primary" type="button" data-exp>${S.icon('download')}Скачать</button></div>
        <div class="setting"><span class="t"><b>Код для переноса</b><span>Короткий текст: вставь его на другом телефоне или компьютере.</span></span><button class="btn sm" type="button" data-code>${S.icon('copy')}Показать код</button></div>
      </section>
      <section class="list"><div class="list-head">${S.icon('upload')}<b>Восстановить</b></div>
        <div class="setting"><span class="t"><b>Из файла копии</b><span>Только добавляет: пройденное не исчезнет, рекорды не уменьшатся.</span></span><label class="btn sm" style="cursor:pointer">${S.icon('upload')}Выбрать файл<input type="file" accept=".json,.txt,application/json,text/plain" data-imp hidden></label></div>
        <div class="setting"><span class="t"><b>Из кода</b><span>Вставь код копии с другого устройства.</span></span><button class="btn sm" type="button" data-impcode>${S.icon('edit')}Вставить код</button></div>
      </section>
      <section class="list"><div class="list-head">${S.icon('send')}<b>Показать прогресс Claude</b></div>
        <div class="setting"><span class="t"><b>Отправить на разбор</b><span>Claude посмотрит, что получается хуже, и даст план повторения.</span></span><button class="btn sm" type="button" data-sendprog>${S.icon('send')}Отправить</button></div>
      </section>
      <section class="list" style="border-color:color-mix(in srgb,var(--danger) 50%,var(--border))"><div class="list-head" style="color:var(--danger)">${S.icon('alert')}<b>Опасная зона</b></div>
        <div class="setting"><span class="t"><b>Сбросить весь прогресс</b><span>Удалит уроки, тесты, рекорды, XP и щиты на этом устройстве. Сначала скачай копию.</span></span><button class="btn sm danger" type="button" data-reset>${S.icon('trash')}Сбросить</button></div>
      </section>
    </div>`;
  }
  const importData = async (raw) => {
    let obj = null;
    const txt = String(raw || '').trim();
    try {
      if (/SHK1[zj]\./.test(txt)) obj = await S.codec.decode(txt);
      else obj = JSON.parse(txt);
    } catch (e) { S.toast('Не получилось прочитать копию: ' + (e.message || 'ошибка')); return; }
    const data = obj && obj.kind === 'progress' && obj.data ? obj.data : obj;
    if (!data || typeof data !== 'object' || !(data.done || data.xp || data.quiz)) { S.toast('Это не копия прогресса «Школы щитовика»'); return; }
    const before = R.total();
    const lessonsBefore = Object.keys(store.data.done).length;
    const n = store.merge(data);
    store.touch('import');
    const lessonsAfter = Object.keys(store.data.done).length;
    S.closeSheet();
    S.toast(n ? `Готово: +${lessonsAfter - lessonsBefore} уроков, +${R.total() - before} XP` : 'Всё из копии уже есть — ничего не изменилось');
    S.render();
  };
  function mountData(root) {
    root.addEventListener('click', async (e) => {
      if (e.target.closest('[data-exp]')) {
        const r = await S.saveFile(`shkola-progress-${S.today()}.json`, JSON.stringify(store.exportObj(), null, 1), 'application/json');
        if (r === 'saved' || r === 'shown') S.bus.emit('backup');
        return;
      }
      if (e.target.closest('[data-code]')) {
        let code = '';
        try { code = await S.codec.encode(store.exportObj()); } catch (er) { S.toast('Не получилось сделать код'); return; }
        S.sheet('Код для переноса', `<div class="stack-sm"><p class="small muted">Скопируй код и вставь его на другом устройстве: Профиль → Прогресс и копия → «Вставить код». ${code.length > 4000 ? 'Код длинный — проще перенести файлом.' : ''}</p><div class="codebox" data-cb>${esc(code)}</div><button class="btn primary" type="button" data-cp>${S.icon('copy')}Скопировать код</button></div>`, {
          mount(b) { b.querySelector('[data-cp]').addEventListener('click', async () => { if (await S.copy(code, 'Код скопирован')) S.bus.emit('backup'); }); }
        });
        return;
      }
      if (e.target.closest('[data-impcode]')) {
        S.sheet('Вставить код копии', `<div class="stack-sm"><textarea class="inp" id="impTxt" placeholder="SHK1z.…" style="min-height:140px;font-family:var(--font-mono);font-size:12px"></textarea><button class="btn primary" type="button" data-go-imp>${S.icon('upload')}Восстановить</button><p class="small muted">Восстановление только добавляет — твой текущий прогресс не пропадёт.</p></div>`, {
          focus: true,
          mount(b) { b.querySelector('[data-go-imp]').addEventListener('click', () => importData(b.querySelector('#impTxt').value)); }
        });
        return;
      }
      if (e.target.closest('[data-sendprog]')) { S.sync.compose({ type: 'progress' }); return; }
      if (e.target.closest('[data-reset]')) {
        S.sheet('Сбросить прогресс?', `<div class="stack-sm"><div class="flash bad">Это удалит весь прогресс на этом устройстве: уроки, тесты, рекорды, XP, достижения и сохранённые щиты. Отменить нельзя.</div><label class="small" for="rsTxt">Чтобы подтвердить, напиши <b>СБРОС</b>:</label><input class="inp" id="rsTxt" autocomplete="off"><button class="btn danger" type="button" data-rs disabled>${S.icon('trash')}Сбросить навсегда</button></div>`, {
          focus: true,
          mount(b) {
            const inp = b.querySelector('#rsTxt'), btn = b.querySelector('[data-rs]');
            inp.addEventListener('input', () => { btn.disabled = inp.value.trim().toUpperCase() !== 'СБРОС'; });
            btn.addEventListener('click', () => { if (inp.value.trim().toUpperCase() !== 'СБРОС') return; store.resetAll(); B_ = null; S.closeSheet(); S.toast('Прогресс сброшен'); S.go('home'); });
          }
        });
      }
    });
    const f = root.querySelector('[data-imp]');
    if (f) f.addEventListener('change', () => {
      const file = f.files && f.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { S.toast('Файл слишком большой для копии'); return; }
      const rd = new FileReader();
      rd.onload = () => importData(rd.result);
      rd.onerror = () => S.toast('Не получилось прочитать файл');
      rd.readAsText(file);
      f.value = '';
    });
    if (!S.persist.asked) S.askPersist().then(() => { if (S.current.name === 'profile' && S.current.arg === 'data') S.softRender(); });
  }
  const sw = (k, on, label, sub) => `<div class="setting"><span class="t"><b>${label}</b><span>${sub}</span></span><button class="switch" type="button" role="switch" aria-checked="${!!on}" aria-label="${esc(label)}" data-sw="${k}"></button></div>`;
  function setHTML() {
    const t = S.themeMode();
    const inst = S.isStandalone() ? '<span class="badge ok">установлено</span>' : `<button class="btn sm primary" type="button" data-install>${S.icon('install')}Установить</button>`;
    return `<div class="stack">
      <section class="list"><div class="list-head">${S.icon('user')}<b>Персонаж</b></div>
        <div class="setting"><span class="t"><b>Имя</b><span>Как к тебе обращаться в приложении</span></span><input class="inp" id="nick" maxlength="24" value="${esc(store.data.profile.nick)}" placeholder="Щитовик" style="max-width:180px"></div>
        <div class="setting">${R.avatar(40)}<span class="t"><b>Аватар</b><span>Узор рисуется из случайного кода, как на GitHub</span></span><button class="btn sm" type="button" data-ava>${S.icon('refresh')}Другой</button></div>
      </section>
      <section class="list"><div class="list-head">${S.icon('theme')}<b>Вид и звук</b></div>
        <div class="setting"><span class="t"><b>Тема</b><span>Светлая, тёмная или как в системе</span></span><div class="seg" role="group" data-theme-seg>${[['auto', 'Авто'], ['light', 'Светлая'], ['dark', 'Тёмная']].map(([k, n]) => `<button type="button" data-v="${k}" aria-pressed="${t === k}">${n}</button>`).join('')}</div></div>
        ${sw('sound', S.settings.sound, 'Звуки', 'Сигналы за ответы, опыт и новые уровни')}
        ${sw('vibro', S.settings.vibro, 'Вибрация', 'Короткий отклик на телефоне')}
        ${sw('splash', S.settings.splash, 'Заставка при запуске', 'Экран загрузки как в игре')}
      </section>
      <section class="list"><div class="list-head">${S.icon('install')}<b>Приложение</b></div>
        <div class="setting"><span class="t"><b>Установить на телефон</b><span>Иконка на главном экране, запуск без браузера, работает без интернета</span></span>${S.env === 'pages' ? inst : '<span class="small muted">на сайте</span>'}</div>
        <div class="setting"><span class="t"><b>Сайт</b><span><a href="${S.SITE}" target="_blank" rel="noopener">${S.SITE.replace('https://', '')}</a></span></span></div>
        <div class="setting"><span class="t"><b>Исходный код</b><span><a href="https://github.com/${S.REPO}" target="_blank" rel="noopener">github.com/${S.REPO}</a></span></span></div>
        <div class="setting"><span class="t"><b>Версия внутри Claude</b><span>С живым чатом и разбором фото: <a href="${S.ARTIFACT}" target="_blank" rel="noopener">открыть в Claude</a></span></span></div>
        <div class="setting"><span class="t"><b>Нашёл ошибку?</b><span>Отправь Claude — исправит</span></span><button class="btn sm" type="button" data-bug>${S.icon('alert')}Сообщить</button></div>
        <div class="setting"><span class="t"><b>Версия</b><span>Школа щитовика ${S.VERSION}</span></span></div>
      </section>
    </div>`;
  }
  function mountSet(root) {
    root.addEventListener('click', (e) => {
      const s = e.target.closest('[data-sw]');
      if (s) { const k = s.dataset.sw; S.setSetting(k, !S.settings[k]); s.setAttribute('aria-checked', String(!!S.settings[k])); if (k === 'sound' && S.settings.sound) R.sfx('ok'); if (k === 'vibro' && S.settings.vibro) R.buzz(40); return; }
      const th = e.target.closest('[data-theme-seg] button');
      if (th) { S.setTheme(th.dataset.v); S.$$('[data-theme-seg] button', root).forEach((b) => b.setAttribute('aria-pressed', String(b === th))); return; }
      if (e.target.closest('[data-ava]')) { store.data.profile.seed = Math.random().toString(36).slice(2, 12); store.touch(); S.render(); return; }
      if (e.target.closest('[data-install]')) { S.install(); return; }
      if (e.target.closest('[data-bug]')) S.sync.compose({ type: 'bug' });
    });
    const nick = root.querySelector('#nick');
    nick.addEventListener('change', () => { store.data.profile.nick = nick.value.trim().slice(0, 24); store.touch(); R.hud(); S.toast('Имя сохранено'); });
  }
  S.bus.on('install', () => { if (S.current.name === 'home' || (S.current.name === 'profile' && S.current.arg === 'set')) S.softRender(); });

  /* что читать кнопкой «Слушать» */
  S.tts.handlers.lesson = (id) => {
    const l = lessonById(id);
    if (!l) return null;
    return { title: l.title, paras: [`${modLabel(l.module)}: ${l.module.title}.`, `Урок: ${l.title}.`].concat(S.tts.fromHTML(l.html), (l.problems || []).reduce((a, p, i) => a.concat([`Задача ${i + 1}.`], S.tts.fromHTML(p.q), ['Решение.'], S.tts.fromHTML(p.sol), [`Ответ: ${S.strip(p.a)}.`]), []), l.quiz && l.quiz.length ? S.tts.quizText(l.quiz) : []) };
  };
  S.tts.handlers.project = (id) => {
    const p = S.projects.find((x) => x.id === id);
    if (!p) return null;
    const paras = [`Проект: ${p.title}.`, `${p.sub}.`].concat(S.tts.fromHTML(p.intro || ''));
    if (p.cfg) {
      try {
        const R1 = E.build(p.cfg);
        paras.push(`Сборка по шагам. Всего шагов: ${R1.steps.length}.`);
        R1.steps.forEach((s, i) => paras.push(`Шаг ${i + 1}: ${s.title}. ${s.text}${s.why ? ' Почему так: ' + s.why : ''}`));
      } catch (e) { /* без шагов */ }
    }
    if (p.control) { const v = S.$('#view .ctl-exp'); if (v) paras.push('Схема управления. ' + v.textContent); }
    if (p.tips) { paras.push('Советы.'); p.tips.forEach((t) => paras.push(t)); }
    return { title: p.title, paras };
  };
  S.tts.handlers.photos = () => {
    const first = S.$('#view section');
    const paras = ['Твои щиты: офис.'].concat(first ? S.tts.fromElement(first) : []);
    S.photos.forEach((ph, i) => {
      paras.push(`Фото ${i + 1}: ${ph.title}.`);
      ph.pins.forEach((p, k) => paras.push(`Метка ${k + 1}: ${p.t}. ${p.d}`));
    });
    return { title: 'Твои щиты', paras };
  };

  /* старые адреса */
  S.aliases = { ai: (arg) => (S.env === 'artifact' ? { name: 'ai', arg } : { name: 'claude', arg: 'how' }) };

  /* ================= ЗАПУСК ================= */
  S.buildCourse();
  S.boot();
  if (S.ai && S.ai.init) S.ai.init();
})();
