/* Школа щитовика — экзамены: выбор, режим экзамена (таймер, без подсказок, разбор в конце) и тренировка с пояснениями.
   Вопросы — js/exams-data.js (S.exams). Результат экзамена хранится как тест: store.data.quiz['exam-<id>']. */
(function () {
  'use strict';
  const S = window.SHK;
  const esc = S.esc;
  const store = S.store;
  const pct = (x) => Math.round(x * 100);
  const crumbs = (items) => `<nav class="crumbs" aria-label="Путь">${items.map(([t, r], i) => (r ? `<a href="#${r}" data-go="${r}">${esc(t)}</a>` : `<span>${esc(t)}</span>`) + (i < items.length - 1 ? '<span>/</span>' : '')).join('')}</nav>`;

  // как устроены настоящие проверки — с чем сравнивать наши экзамены
  const REAL = [
    ['Россия: группа по электробезопасности', 'Проверку знаний проводит комиссия организации или Ростехнадзора: устно по билетам или тестом на компьютере. Темы — ПОТЭЭ, ПТЭЭП, ПУЭ, средства защиты и первая помощь. Повторяют ежегодно или раз в 3 года — зависит от должности. Число вопросов и порог в открытых документах Ростехнадзора не опубликованы, поэтому их здесь нет.'],
    ['Россия: квалификация электромонтажника', 'Трудовые функции описаны в профстандартах «Электромонтажник» и «Электромонтажник домовых электрических систем и оборудования». Независимую оценку квалификации проводят центры оценки: теоретический тест и практическое задание. Уровень (3, 4, 5) зависит от сложности работ и самостоятельности.'],
    ['Великобритания: City & Guilds 2382 (BS 7671)', '60 вопросов с выбором ответа за 2 часа, можно пользоваться книгой BS 7671. Проверяется умение быстро найти нужное требование, а не знать его наизусть.'],
    ['Германия: выпускной экзамен Elektroniker/-in', 'Две части. Практика — заказ клиента (Kundenauftrag): спланировать, смонтировать, проверить, сдать. Письменно — Systementwurf (проект системы), Funktions- und Systemanalyse (как работает и почему не работает), экономика и право (WiSo).']
  ];

  const best = (id) => store.data.quiz['exam-' + id];
  const card = (x) => {
    const b = best(x.id);
    return `<a class="card repo" href="#exam.${x.id}" data-go="exam.${x.id}"><span class="rt">${S.icon('exam')}${esc(x.title)}</span><p>${esc(x.about)}</p><span class="rf"><span class="badge">${esc(x.level)}</span><span>${x.n} вопр. · ${x.min} мин · порог ${pct(x.pass)} %</span><span style="margin-left:auto">${b ? `<span class="badge ${b.s / b.t >= x.pass ? 'ok' : 'warn'}">лучший ${b.s}/${b.t}</span>` : `<span class="badge info">в базе ${x.pool.length}</span>`}</span></span></a>`;
  };

  const pageAll = () => `<div class="wrap wide">
    <div class="page-head"><div class="eyebrow">Практика</div><h1 class="h1">Экзамены</h1><p class="muted">Аналоги настоящих проверок: группы по электробезопасности, уровни квалификации электромонтажника, европейские требования и задачи на поиск неисправностей. Вопросы написаны заново (официальные банки закрыты) и сделаны строже: порог 85–90 %, таймер, подсказок до конца нет. Каждый ответ сверен с текстом нормы.</p><div class="row" style="margin-top:8px">${S.tts.btn('Слушать')}</div></div>
    <div class="grid">${S.exams.map(card).join('')}</div>
    <section class="stack-sm" style="margin-top:28px"><h2 class="h2">Как устроены настоящие экзамены</h2>${REAL.map(([t, d]) => `<details class="acc"><summary>${esc(t)}</summary><div class="in prose small-prose"><p>${esc(d)}</p></div></details>`).join('')}</section>
    ${S.anki ? S.anki.box(null, ', подколода «83 Экзамены» — все вопросы с пояснениями') : ''}
  </div>`;

  const pageOne = (x) => {
    const b = best(x.id);
    return `<div class="wrap">${crumbs([['Практика', 'practice'], ['Экзамены', 'exam'], [x.title, null]])}
      <div class="page-head" style="margin-top:8px"><div class="row"><span class="badge">${esc(x.level)}</span><span class="badge">${S.icon('clock')}${x.min} мин</span>${b ? `<span class="badge ${b.s / b.t >= x.pass ? 'ok' : 'warn'}">лучший ${b.s}/${b.t}</span>` : ''}</div><h1 class="h1" style="margin-top:6px">${esc(x.title)}</h1><p class="muted">${esc(x.about)}</p></div>
      <div data-box>
        <div class="card stack-sm"><b>Экзамен</b><p class="small">${x.n} случайных вопросов из ${x.pool.length}, порядок ответов перемешан. ${x.min} минут. Сдано — от ${pct(x.pass)} % верных. Правильные ответы и пояснения — только после завершения, как на настоящей проверке.</p><div class="row"><button class="btn game" type="button" data-start>${S.icon('exam')}Начать экзамен</button></div></div>
        <div class="card stack-sm" style="margin-top:12px"><b>Тренировка</b><p class="small">Все ${x.pool.length} вопросов подряд, пояснение и основание — сразу после ответа. Без таймера.</p><div class="row"><button class="btn" type="button" data-train>${S.icon('book')}Тренироваться</button></div></div>
      </div>
      ${S.anki ? S.anki.box(null, `, подколода «83 Экзамены → ${esc(x.title)}»`) : ''}
    </div>`;
  };

  const mix = (q) => { const o = S.shuffle(q.a.map((_, i) => i)); return { q: q.q, a: o.map((i) => q.a[i]), c: o.indexOf(q.c), e: q.e, r: q.r }; };
  // прокрутить к началу блока с учётом закреплённой шапки
  const toTop = (el) => window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 72) });
  const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function runExam(box, x, set) {
    const qs = (set || S.shuffle(x.pool).slice(0, x.n)).map(mix);
    const ans = qs.map(() => -1);
    let cur = 0, left = x.min * 60, over = false;
    const timer = setInterval(() => {
      if (!box.isConnected) { clearInterval(timer); return; }
      left--;
      const t = box.querySelector('[data-left]');
      if (t) { t.textContent = clock(Math.max(0, left)); t.classList.toggle('low', left <= 60); }
      if (left <= 0) finish(true);
    }, 1000);
    S.cleanup.push(() => clearInterval(timer));

    const draw = () => {
      const q = qs[cur];
      box.innerHTML = `<div class="exam-run">
        <div class="exam-bar"><b>Вопрос ${cur + 1} из ${qs.length}</b><span class="timer" data-left aria-label="Осталось времени">${clock(left)}</span></div>
        <div class="qmap" role="list" aria-label="Вопросы">${qs.map((_, i) => `<button type="button" role="listitem" data-to="${i}" class="${i === cur ? 'cur' : ''} ${ans[i] >= 0 ? 'done' : ''}" aria-label="Вопрос ${i + 1}${ans[i] >= 0 ? ', отвечен' : ''}">${i + 1}</button>`).join('')}</div>
        <div class="q"><div class="qt">${esc(q.q)}</div><div class="opts">${q.a.map((a, j) => `<button type="button" class="opt ${ans[cur] === j ? 'sel' : ''}" data-j="${j}" aria-pressed="${ans[cur] === j}"><span class="mk">${'АБВГДЕ'[j]}</span><span>${esc(a)}</span></button>`).join('')}</div></div>
        <div class="row" style="margin-top:12px"><button class="btn" type="button" data-prev ${cur === 0 ? 'disabled' : ''}>${S.icon('prev')}Назад</button>${cur < qs.length - 1 ? `<button class="btn" type="button" data-next>Дальше${S.icon('next')}</button>` : ''}<span style="flex:1"></span><button class="btn game" type="button" data-finish>${S.icon('check')}Завершить</button></div>
        <p class="small muted" style="margin-top:8px">Отвечено ${ans.filter((a) => a >= 0).length} из ${qs.length}. Ответ можно изменить до завершения.</p>
      </div>`;
    };

    function finish(timeout) {
      if (over) return;
      over = true;
      clearInterval(timer);
      const right = qs.filter((q, i) => ans[i] === q.c).length;
      const ok = right / qs.length >= x.pass;
      if (!set) store.setQuiz('exam-' + x.id, right, qs.length);
      S.bus.emit('quizdone', { id: 'exam-' + x.id, right, total: qs.length });
      const wrong = qs.map((q, i) => i).filter((i) => ans[i] !== qs[i].c);
      box.innerHTML = `<div class="result"><div class="big">${right}/${qs.length}</div><b class="${ok ? 'ok-t' : 'bad-t'}">${ok ? 'Сдано' : 'Не сдано'} — ${pct(right / qs.length)} % при пороге ${pct(x.pass)} %</b><p class="muted">${timeout ? 'Время вышло. ' : ''}${ok ? 'Повтори вопросы с ошибками ниже — на настоящей проверке их зададут иначе.' : 'Разбери каждую ошибку ниже, пройди тренировку и попробуй снова.'}</p>
        <div class="row" style="justify-content:center"><button class="btn game" type="button" data-again>${S.icon('refresh')}Новый экзамен</button>${wrong.length ? `<button class="btn" type="button" data-wrong>Только ошибки (${wrong.length})</button>` : ''}</div></div>
        <h2 class="h2" style="margin-top:24px">Разбор</h2>
        <div class="stack-sm">${qs.map((q, i) => { const good = ans[i] === q.c; return `<div class="q ${good ? '' : 'miss'}"><div class="qt">${i + 1}. ${esc(q.q)}</div>
          ${good ? `<p class="small"><span class="badge ok">верно</span> ${esc(q.a[q.c])}</p>` : `<p class="small"><span class="badge bad">${ans[i] < 0 ? 'нет ответа' : 'твой ответ'}</span> ${ans[i] < 0 ? '' : esc(q.a[ans[i]])}</p><p class="small"><span class="badge ok">верно</span> ${esc(q.a[q.c])}</p>`}
          <div class="expl">${esc(q.e)}<br><span class="muted">${S.icon('doc')} ${esc(q.r)}</span></div></div>`; }).join('')}</div>`;
      box.querySelector('[data-again]').addEventListener('click', () => runExam(box, x));
      const w = box.querySelector('[data-wrong]');
      if (w) w.addEventListener('click', () => train(box, x, wrong.map((i) => x.pool.find((p) => p.q === qs[i].q))));
      toTop(box);
    }

    box.onclick = (e) => {
      if (over) return;
      const o = e.target.closest('.opt');
      if (o) { ans[cur] = Number(o.dataset.j); draw(); return; }
      const to = e.target.closest('[data-to]');
      if (to) { cur = Number(to.dataset.to); draw(); return; }
      if (e.target.closest('[data-prev]') && cur > 0) { cur--; draw(); return; }
      if (e.target.closest('[data-next]') && cur < qs.length - 1) { cur++; draw(); return; }
      const f = e.target.closest('[data-finish]');
      if (f) {
        // окна confirm() в версии внутри Claude заблокированы — переспрашиваем второй кнопкой
        const rest = ans.filter((a) => a < 0).length;
        if (!rest || f.dataset.sure) finish(false);
        else { f.dataset.sure = '1'; f.innerHTML = `${S.icon('check')}Без ответа ${rest} — всё равно завершить`; }
      }
    };
    draw();
    toTop(box);
  }

  function train(box, x, list) {
    box.onclick = null;
    const qs = S.shuffle(list || x.pool).map(mix).map((q) => ({ q: esc(q.q), a: q.a.map(esc), c: q.c, e: `${esc(q.e)}<br><span class="muted">${S.icon('doc')} ${esc(q.r)}</span>` }));
    const id = 'extr-' + x.id;
    box.innerHTML = `<div class="row" style="margin-bottom:12px"><b style="flex:1">Тренировка: ${qs.length} вопр.</b><button class="btn sm" type="button" data-back>${S.icon('prev')}К экзамену</button></div>${S.quizHTML(qs, id)}`;
    S.mountQuiz(box, qs, id);
    box.querySelector('[data-back]').addEventListener('click', () => S.render());
    toTop(box);
  }

  S.view('exam', {
    tab: 'practice', parent: (arg) => (arg ? 'exam' : 'practice'),
    render(id) {
      if (!id) return pageAll();
      const x = S.exams.find((e) => e.id === id);
      return x ? pageOne(x) : `<div class="wrap"><div class="empty">Экзамен не найден. <a href="#exam" data-go="exam">Все экзамены</a></div></div>`;
    },
    mount(root, id) {
      const x = S.exams.find((e) => e.id === id);
      if (!x) return;
      const box = root.querySelector('[data-box]');
      root.querySelector('[data-start]').addEventListener('click', () => runExam(box, x));
      root.querySelector('[data-train]').addEventListener('click', () => train(box, x));
    }
  });

  S.tts.handlers.exam = (id) => {
    const x = id && S.exams.find((e) => e.id === id);
    if (x) return { title: x.title, paras: [x.title + '.', x.about] };
    return { title: 'Экзамены', paras: ['Экзамены.'].concat(S.exams.map((e) => `${e.title}: ${e.n} вопросов, ${e.min} минут, порог ${pct(e.pass)} процентов.`), REAL.reduce((a, [t, d]) => a.concat([t + '.', d]), [])) };
  };
})();
