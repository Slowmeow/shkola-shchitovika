/* Школа щитовика — мини-игры и тренажёры */
(function () {
  'use strict';
  const S = window.SHK;
  const V = S.svg;
  const M = V.mono;
  const esc = S.esc;
  const G = (S.games = {});
  const best = (id) => S.store.data.games[id] || 0;
  const finish = (el, id, score, max, msg) => {
    const pct = Math.round(score / max * 100);
    const prev = best(id);
    const rec = S.store.setGame(id, pct);
    const stars = pct >= 100 ? 3 : pct >= 80 ? 2 : pct >= 50 ? 1 : 0;
    const medal = ['', 'бронза', 'серебро', 'золото'][stars];
    el.insertAdjacentHTML('beforeend', `<div class="result" style="margin-top:12px"><div class="stars" aria-label="${stars} из 3 звёзд">${[0, 1, 2].map((k) => `<span class="${k < stars ? 'on' : ''}">★</span>`).join('')}</div><div class="big">${pct}%</div><p class="muted">${max === 100 ? '' : `${score} из ${max} · `}${esc(msg || (pct >= 80 ? 'Отлично!' : pct >= 50 ? 'Неплохо, ещё раунд?' : 'Перечитай уроки и попробуй снова.'))}</p>${medal ? `<span class="badge done">${medal}</span>` : ''}${rec && prev ? '<span class="badge xp">НОВЫЙ РЕКОРД!</span>' : ''}<div class="row" style="justify-content:center"><button class="btn game" type="button" data-again>${S.icon('refresh')}Ещё раз</button><a class="btn" href="#practice" data-go="practice">${S.icon('game')}Все игры</a></div></div>`);
    if (S.rpg) S.rpg.sfx(pct >= 50 ? 'win' : 'lose');
    const r = el.querySelector('.result'); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  /* ---------- 1. Подключи провода ---------- */
  const WIRE_LEVELS = [
    {
      title: 'Розетка с заземлением', terms: [{ id: 't1', x: 120, y: 110, l: 'контакт 1' }, { id: 't2', x: 240, y: 110, l: 'контакт 2' }, { id: 'pe', x: 180, y: 50, l: 'заземляющие «усы»' }],
      wires: [{ id: 'L', c: 'L', n: 'Фаза (коричневый)', ok: ['t1', 't2'] }, { id: 'N', c: 'N', n: 'Ноль (синий)', ok: ['t1', 't2'] }, { id: 'PE', c: 'PE', n: 'Земля (жёлто-зелёный)', ok: ['pe'] }],
      draw: () => V.rc(80, 30, 200, 130, { s: 'var(--ink)', f: 'var(--surface)', rx: 22, w: 2 }) + V.ci(150, 110, 9, { f: 'var(--ink)' }) + V.ci(210, 110, 9, { f: 'var(--ink)' }) + V.rc(160, 40, 40, 10, { s: null, f: '#b8b8b0', rx: 3 }) + V.rc(160, 160, 40, 10, { s: null, f: '#b8b8b0', rx: 3 }),
      why: 'L и N — на рабочие контакты (порядок не важен), PE — только на заземляющий контакт.'
    },
    {
      title: 'Дифавтомат: что куда', terms: [{ id: 'tl', x: 130, y: 40, l: 'верх L' }, { id: 'tn', x: 230, y: 40, l: 'верх N' }, { id: 'bl', x: 130, y: 200, l: 'низ L' }, { id: 'bn', x: 230, y: 200, l: 'низ N' }, { id: 'pe', x: 330, y: 220, l: 'шина PE' }, { id: 'n0', x: 330, y: 40, l: 'шина N0' }],
      wires: [{ id: 'a', c: 'L', n: 'Фаза от гребёнки', ok: ['tl'] }, { id: 'b', c: 'N', n: 'Ноль на вход (с шины N0)', ok: ['tn'] }, { id: 'c', c: 'L', n: 'Фаза кабеля линии', ok: ['bl'] }, { id: 'd', c: 'N', n: 'Ноль кабеля линии', ok: ['bn'] }, { id: 'e', c: 'PE', n: 'PE кабеля линии', ok: ['pe'] }],
      draw: () => V.rc(100, 50, 160, 140, { s: 'var(--dev-line)', f: 'var(--dev)', rx: 6, w: 1.5 }) + V.tx(180, 110, 'АВДТ', { a: 'middle', size: 16, wt: 700, fam: M, f: '#222' }) + V.tx(180, 132, 'C16 30 мА', { a: 'middle', size: 11, fam: M, f: '#444' }) + V.rc(300, 210, 80, 12, { s: '#555', f: 'var(--w-pe)', rx: 3 }) + V.rc(300, 30, 80, 12, { s: '#555', f: '#c9b46a', rx: 3 }),
      why: 'Вход дифавтомата — сверху (L с гребёнки, N с общей шины), линия — снизу (и фаза, и ноль). PE линии мимо аппарата — на шину PE.'
    },
    {
      title: 'УЗО группы', terms: [{ id: 'tl', x: 130, y: 40, l: 'верх L' }, { id: 'tn', x: 230, y: 40, l: 'верх N' }, { id: 'bl', x: 130, y: 200, l: 'низ L' }, { id: 'bn', x: 230, y: 200, l: 'низ N' }, { id: 'n0', x: 340, y: 40, l: 'шина N0 (общая)' }, { id: 'n1', x: 340, y: 210, l: 'шина N1 (этого УЗО)' }],
      wires: [{ id: 'a', c: 'L', n: 'Фаза после реле напряжения', ok: ['tl'] }, { id: 'b', c: 'N', n: 'Ноль: общая шина → вход УЗО', ok: ['tn'] }, { id: 'c', c: 'L', n: 'Фаза на гребёнку автоматов группы', ok: ['bl'] }, { id: 'd', c: 'N', n: 'Ноль: выход УЗО → шина группы', ok: ['bn'] }, { id: 'e', c: 'N', n: 'Ноль кабеля «розетки кухни» (под этим УЗО)', ok: ['n1'] }],
      draw: () => V.rc(100, 50, 160, 140, { s: 'var(--dev-line)', f: 'var(--dev)', rx: 6, w: 1.5 }) + V.tx(180, 110, 'УЗО', { a: 'middle', size: 16, wt: 700, fam: M, f: '#222' }) + V.tx(180, 132, '40 А 30 мА', { a: 'middle', size: 11, fam: M, f: '#444' }) + V.rc(300, 30, 90, 12, { s: '#555', f: '#c9b46a', rx: 3 }) + V.rc(300, 200, 90, 12, { s: '#555', f: '#c9b46a', rx: 3 }),
      why: 'Ноль линии под УЗО берётся только с шины этого УЗО. Если посадить его на общую N0 — УЗО будет выбивать.'
    },
    {
      title: 'Однофазный счётчик', terms: ['1', '2', '3', '4'].map((t, i) => ({ id: 'k' + t, x: 100 + i * 60, y: 150, l: 'клемма ' + t })),
      wires: [{ id: 'a', c: 'L', n: 'Фаза из сети', ok: ['k1'] }, { id: 'b', c: 'L', n: 'Фаза в квартиру', ok: ['k2'] }, { id: 'c', c: 'N', n: 'Ноль из сети', ok: ['k3'] }, { id: 'd', c: 'N', n: 'Ноль в квартиру', ok: ['k4'] }],
      draw: () => V.rc(70, 30, 240, 140, { s: 'var(--ink-2)', f: 'var(--surface)', rx: 8 }) + V.rc(100, 45, 120, 30, { s: '#333', f: '#cfe3c9', rx: 3 }) + V.tx(160, 66, '012345,6', { a: 'middle', size: 14, fam: M, f: '#1d2a1d' }) + ['1', '2', '3', '4'].map((t, i) => V.rc(86 + i * 60, 136, 28, 26, { s: '#555', f: '#e9e9e2', rx: 3 }) + V.tx(100 + i * 60, 127, t, { a: 'middle', size: 12, fam: M, wt: 700 })).join(''),
      why: 'Самая частая схема: 1 — фаза вход, 2 — фаза выход, 3 — ноль вход, 4 — ноль выход. Но всегда сверяй со схемой на крышке своего счётчика.'
    },
    {
      title: 'Реле напряжения', terms: [{ id: 'n', x: 140, y: 40, l: 'N' }, { id: 'lin', x: 220, y: 40, l: 'L вход' }, { id: 'lout', x: 220, y: 200, l: 'L выход' }, { id: 'nb', x: 330, y: 200, l: 'шина N' }],
      wires: [{ id: 'a', c: 'L', n: 'Фаза с вводного автомата', ok: ['lin'] }, { id: 'b', c: 'N', n: 'Ноль для питания реле (тонкий)', ok: ['n'] }, { id: 'c', c: 'L', n: 'Фаза к УЗО и автоматам', ok: ['lout'] }, { id: 'd', c: 'N', n: 'Нули линий без УЗО', ok: ['nb'] }],
      draw: () => V.rc(110, 50, 140, 140, { s: 'var(--dev-line)', f: 'var(--dev)', rx: 6, w: 1.5 }) + V.rc(130, 80, 100, 30, { s: '#333', f: '#1f2a24', rx: 3 }) + V.tx(180, 101, '230', { a: 'middle', size: 16, fam: M, f: '#7fe39d' }) + V.tx(180, 150, 'РН', { a: 'middle', size: 14, wt: 700, fam: M, f: '#222' }) + V.rc(300, 210, 70, 12, { s: '#555', f: '#c9b46a', rx: 3 }),
      why: 'Через реле проходит фаза. Ноль ему нужен только для питания и измерения; нули нагрузки — с шины.'
    },
    {
      title: 'УЗИП «1+1»', terms: [{ id: 'l', x: 140, y: 40, l: 'L' }, { id: 'n', x: 220, y: 40, l: 'N' }, { id: 'pe', x: 180, y: 200, l: 'PE' }],
      wires: [{ id: 'a', c: 'L', n: 'Фаза после вводного (коротко!)', ok: ['l'] }, { id: 'b', c: 'N', n: 'Ноль с шины N0', ok: ['n'] }, { id: 'c', c: 'PE', n: 'На шину PE', ok: ['pe'] }],
      draw: () => V.rc(110, 50, 140, 140, { s: 'var(--dev-line)', f: 'var(--dev)', rx: 6, w: 1.5 }) + V.tx(180, 110, 'УЗИП', { a: 'middle', size: 15, wt: 700, fam: M, f: '#222' }) + V.rc(140, 130, 20, 12, { s: '#444', f: '#3cbf60', rx: 2 }) + V.rc(200, 130, 20, 12, { s: '#444', f: '#3cbf60', rx: 2 }),
      why: 'Схема «1+1»: варистор L–N и разрядник N–PE. Провода короткие, ставится до УЗО.'
    },
    {
      title: 'Контактор бойлера на ночном тарифе', terms: [{ id: 'a1', x: 110, y: 40, l: 'A1' }, { id: 'p1', x: 200, y: 40, l: '1 (силовой вход)' }, { id: 'a2', x: 110, y: 200, l: 'A2' }, { id: 'p2', x: 200, y: 200, l: '2 (силовой выход)' }],
      wires: [{ id: 'a', c: 'L', n: 'Фаза с контакта таймера', ok: ['a1'] }, { id: 'b', c: 'N', n: 'Ноль для катушки', ok: ['a2'] }, { id: 'c', c: 'L', n: 'Фаза с автомата бойлера', ok: ['p1'] }, { id: 'd', c: 'L', n: 'Фаза к бойлеру', ok: ['p2'] }],
      draw: () => V.rc(80, 50, 160, 140, { s: 'var(--dev-line)', f: 'var(--dev)', rx: 6, w: 1.5 }) + V.tx(160, 110, 'KM', { a: 'middle', size: 18, wt: 700, fam: M, f: '#222' }) + V.tx(160, 132, 'контактор', { a: 'middle', size: 11, f: '#444' }),
      why: 'A1–A2 — катушка: управляющая фаза через таймер на A1, ноль на A2. Силовые контакты: сверху — от автомата, снизу — к нагрузке.'
    }
  ];
  G.wire = {
    title: 'Подключи провода', sub: 'Выбери провод и нажми на клемму', icon: 'cable',
    mount(el) {
      let li = 0, total = 0, right = 0;
      const level = () => {
        const L = WIRE_LEVELS[li];
        let pick = null;
        const asg = {};
        const render = (checked) => {
          const svg = V.svg(400, 240, L.draw() + L.terms.map((t) => {
            const wid = Object.keys(asg).find((w) => asg[w] === t.id);
            const w = wid && L.wires.find((x) => x.id === wid);
            const ok = checked && w ? w.ok.includes(t.id) : null;
            return `<g class="hot" data-t="${t.id}" role="button" tabindex="0" aria-label="${esc(t.l)}">${V.ci(t.x, t.y, 13, { s: ok === null ? 'var(--ink)' : ok ? 'var(--ok)' : 'var(--bad)', f: w ? (w.c === 'PE' ? 'var(--w-pe)' : V.wc[w.c]) : 'var(--signal-soft)', w: 2.4 })}${V.tx(t.x, t.y + 27, esc(t.l), { a: 'middle', size: 10, wt: 600 })}</g>`;
          }).join(''), { width: '100%', noH: true, label: L.title });
          el.innerHTML = `<div class="stack"><div class="game-top"><b>${li + 1}/${WIRE_LEVELS.length}. ${esc(L.title)}</b><span class="spacer"></span><span class="pill-big">${right}/${total}</span></div>
          <div class="wire-pick">${L.wires.map((w) => `<button type="button" data-w="${w.id}" aria-pressed="${pick === w.id}"><span class="wire-sw" style="${V.swatch(w.c)}"></span>${esc(w.n)}${asg[w.id] ? ' ✓' : ''}</button>`).join('')}</div>
          <div class="svgbox" style="max-height:none">${svg}</div>
          ${checked ? `<div class="box ${checked.all ? 'tip' : 'bad'}"><div class="lbl">${S.icon(checked.all ? 'check' : 'x')}${checked.all ? 'Верно' : 'Есть ошибки'}</div><p>${esc(L.why)}</p></div><button class="btn primary" type="button" data-next>${li < WIRE_LEVELS.length - 1 ? 'Дальше' : 'Итог'}</button>` : `<button class="btn primary" type="button" data-check ${Object.keys(asg).length < L.wires.length ? 'disabled' : ''}>Проверить</button>`}</div>`;
        };
        render(null);
        el.onclick = (e) => {
          const wb = e.target.closest('[data-w]');
          if (wb) { pick = wb.dataset.w; render(null); return; }
          const tb = e.target.closest('[data-t]');
          if (tb && pick) { Object.keys(asg).forEach((k) => { if (asg[k] === tb.dataset.t) delete asg[k]; }); asg[pick] = tb.dataset.t; const nxt = L.wires.find((w) => !asg[w.id]); pick = nxt ? nxt.id : null; render(null); return; }
          if (e.target.closest('[data-check]')) {
            const all = L.wires.every((w) => w.ok.includes(asg[w.id]));
            total++; if (all) right++;
            render({ all });
            return;
          }
          if (e.target.closest('[data-next]')) {
            if (li < WIRE_LEVELS.length - 1) { li++; level(); } else { el.onclick = (ev) => { if (ev.target.closest('[data-again]')) { li = 0; total = 0; right = 0; level(); } }; el.innerHTML = ''; finish(el, 'wire', right, total); }
          }
        };
        if (!pick) pick = L.wires[0].id; render(null);
      };
      level();
    }
  };

  /* ---------- 2. Найди ошибку ---------- */
  const ERRORS = [
    { s: 'Квартирный щит. Что здесь неправильно?', a: ['Вводной — 2P C40', 'УЗО 40 А 30 мА на 3 розеточные линии', 'Ноль розеточной линии под УЗО посажен на общую шину N0', 'PE всех линий — на шину PE'], c: 2, e: 'Ноль линии под УЗО — только с шины этого УЗО. На общей шине ток нуля пойдёт мимо УЗО, и оно будет выбивать.', ill: 'nmix' },
    { s: 'Линия розеток кухни.', a: ['Кабель ВВГнг(А)-LS 3×2,5', 'Автомат C25', 'УЗО 30 мА', 'Длина 12 м'], c: 1, e: 'На 2,5 мм² ставят 16 А. C25 не защитит кабель от перегрева.' },
    { s: 'Щит частного дома с разделением PEN.', a: ['PEN ввода — на шину PE', 'Перемычка с шины PE на шину N', 'Контур заземления — на шину PE', 'В розетке гостиной N и PE соединены перемычкой «для надёжности»'], c: 3, e: 'После точки разделения N и PE нигде не соединяют (ПУЭ 1.7.135). «Зануление» в розетке — запрещено.' },
    { s: 'Офисный щит с пожарной сигнализацией.', a: ['Сигнализация на автомате C6', 'Сигнализация подключена после УЗО 30 мА вместе с розетками', 'Кабель сигнализации FRLS', 'Розетки офиса — дифавтоматы 30 мА'], c: 1, e: 'На пожарную сигнализацию УЗО ставить нельзя (ПУЭ 7.1.81): подключают до УЗО отдельным автоматом.' },
    { s: 'Ввод частного дома от воздушной линии.', a: ['Вводной 3P C25', 'УЗИП установлен после УЗО 30 мА', 'Реле напряжения на каждую фазу', 'Контур заземления 3 электрода'], c: 1, e: 'УЗИП ставят до УЗО и реле напряжения (СП 256 А.5.3).' },
    { s: 'Перемычки в щите с вводным C40.', a: ['Ввод → РН: ПуГВ 10 мм²', 'РН → УЗО: ПуГВ 2,5 мм²', 'Концы в НШВИ', 'Ноль — синим проводом'], c: 1, e: 'Перемычку защищает вводной C40, поэтому сечение — по нему: 10 мм².' },
    { s: 'Однофазный щит.', a: ['Вводной 2P', 'Однополюсный автомат стоит в разрыв нуля линии', 'Группы освещения C10', 'Стиралка на дифавтомате тип A'], c: 1, e: 'Однополюсный автомат — только в фазу. В нуле при отключении линия останется под фазой.' },
    { s: 'Подключение проводов к автомату.', a: ['Однопроволочная жила 2,5 мм² без гильзы', 'Гибкий провод в НШВИ', 'Два гибких провода 2,5 и 1,5 мм² под один винт', 'Затяжка динамометрической отвёрткой'], c: 2, e: 'Под один винт — только одинаковые провода (лучше двойной гильзой). Тонкий будет зажат плохо.' },
    { s: 'Щит в квартире: место установки.', a: ['В прихожей, IP31', 'В 40 см от газового счётчика', 'Верх щита на высоте 1,7 м', 'Дверь закрывается'], c: 1, e: 'От газопровода и газового счётчика до щита — не меньше 1 м (ПУЭ 7.1.28).' },
    { s: 'Металлический щит.', a: ['Шина PE на корпусе', 'Шины N на изоляторах', 'Дверь щита не соединена с PE', 'Пустые места закрыты заглушками'], c: 2, e: 'Дверь — открытая проводящая часть, её соединяют с PE гибкой перемычкой.' },
    { s: 'Трёхфазный щит дома.', a: ['Однофазные линии разнесены по фазам', 'Все розеточные линии кухни и комнат на L1, на L2 и L3 только свет', 'Котёл на 3P автомате', 'Индикаторы фаз на вводе'], c: 1, e: 'Сильный перекос фаз: L1 перегружена. Распредели линии равномерно.' },
    { s: 'Подключение в ванной.', a: ['Розетка в зоне 3 через УЗО 10 мА', 'Распаечная коробка над ванной', 'ДСУП: ванна и трубы на КУП', 'Выключатель снаружи ванной'], c: 1, e: 'В зонах 0–2 (над ванной) коробки и распредустройства запрещены (ПУЭ 7.1.47).' },
    { s: 'Подключение генератора к дому.', a: ['Через переключатель 1-0-2 4P', 'Через АВР с блокировкой', 'Вилкой в розетку («вилка-вилка»)', 'Резервированы котёл, насос и холодильник'], c: 2, e: 'Генератор в розетку отправит напряжение в сеть посёлка — смертельно для электриков на линии.' },
    { s: 'Щит освещения 3ф с 6 автоматами C10.', a: ['Трёхфазная гребёнка, фазы по очереди', 'Вводной 3P C25', 'Нули всех линий на шину N', 'Вводной 3P C10'], c: 3, e: 'Вводной C10 при группах C10 — нет селективности и он не потянет шесть линий. Вводной больше групповых.' }
  ];
  G.errors = {
    title: 'Найди ошибку', sub: 'Что в щите сделано неправильно?', icon: 'eye',
    mount(el) {
      const qs = S.shuffle(ERRORS).slice(0, 10);
      let i = 0, score = 0;
      const show = () => {
        const q = qs[i];
        el.innerHTML = `<div class="stack"><div class="game-top"><b>Вопрос ${i + 1} из ${qs.length}</b><span class="spacer"></span><span class="pill-big">${score}</span></div><div class="q"><div class="qt">${esc(q.s)}</div>${q.ill ? `<figure class="ill" data-ill="${q.ill}" style="margin-bottom:10px"></figure>` : ''}<div class="opts">${q.a.map((a, j) => `<button class="opt" type="button" data-j="${j}"><span class="mk">${'АБВГ'[j]}</span><span>${esc(a)}</span></button>`).join('')}</div><div class="expl" hidden></div></div><button class="btn primary" type="button" data-next hidden>${i < qs.length - 1 ? 'Дальше' : 'Итог'}</button></div>`;
        S.enhance(el);
      };
      el.onclick = (e) => {
        const b = e.target.closest('.opt');
        if (b && !b.disabled) {
          const q = qs[i], j = Number(b.dataset.j);
          S.$$('.opt', el).forEach((o) => { o.disabled = true; });
          b.classList.add(j === q.c ? 'right' : 'wrong');
          el.querySelector(`.opt[data-j="${q.c}"]`).classList.add('right');
          if (j === q.c) score++;
          const ex = el.querySelector('.expl'); ex.textContent = q.e; ex.hidden = false;
          el.querySelector('[data-next]').hidden = false;
          return;
        }
        if (e.target.closest('[data-next]')) { i++; if (i < qs.length) show(); else { el.innerHTML = ''; finish(el, 'errors', score, qs.length); } return; }
        if (e.target.closest('[data-again]')) G.errors.mount(el);
      };
      show();
    }
  };

  /* ---------- 3. Что сработает? ---------- */
  const TRIPS = [
    { s: 'Человек в ванной коснулся пробитого корпуса бойлера и пола. Утечка 40 мА.', a: ['Автомат линии', 'Дифавтомат/УЗО линии', 'Реле напряжения', 'Ничего'], c: 1, e: 'Утечка больше уставки 30 мА — отключит УЗО (дифавтомат). Автомат 40 мА «не видит».' },
    { s: 'В розетке кухни короткое замыкание, ток 600 А.', a: ['Электромагнитный расцепитель автомата линии', 'Тепловой расцепитель через час', 'УЗО', 'Вводной автомат и всё сразу'], c: 0, e: 'Ток КЗ в десятки раз больше номинала — мгновенно сработает катушка автомата линии.' },
    { s: 'На линию C16 включили чайник 2 кВт и духовку 3,5 кВт (≈ 24 А).', a: ['Мгновенно автомат', 'Автомат через несколько минут (тепловой)', 'УЗО', 'Ничего, это нормально'], c: 1, e: '1,5 Iн — перегрузка. Биметалл нагреется и отключит через минуты.' },
    { s: 'В подъезде отгорел ноль на стояке. В квартире 310 В.', a: ['Автомат', 'УЗО', 'Реле напряжения', 'УЗИП'], c: 2, e: 'Реле напряжения увидит превышение верхнего порога и отключит квартиру.' },
    { s: 'Молния ударила в линию недалеко от дома.', a: ['УЗИП сольёт импульс в землю', 'Автомат', 'УЗО', 'Реле напряжения успеет'], c: 0, e: 'Импульс длится микросекунды — успевает только УЗИП.' },
    { s: 'Сырость в распаечной коробке: ток утечки 150 мА, в доме противопожарное УЗО 100 мА S и УЗО 30 мА на группе.', a: ['Только УЗО 30 мА группы', 'Только противопожарное', 'Оба одновременно', 'Ничего'], c: 0, e: 'Ниже стоящее УЗО 30 мА быстрее (без выдержки) — оно отключит свою группу. Селективность.' },
    { s: 'Обрыв фазы L2 в трёхфазном вводе. Насос (3ф) без реле контроля фаз.', a: ['Насос остановится сам и будет цел', 'Насос будет гудеть «на двух фазах» и может сгореть', 'Сработает УЗО', 'Сработает УЗИП'], c: 1, e: 'Без одной фазы двигатель перегревается. Нужна защита от обрыва фазы.' },
    { s: 'Утечка 20 мА на линии с УЗО 30 мА.', a: ['Отключит гарантированно', 'Может отключить, а может нет', 'Никогда не отключит'], c: 1, e: 'По стандарту УЗО срабатывает в диапазоне 0,5–1,0 уставки: 15–30 мА. 20 мА — «серая зона».' },
    { s: 'В квартире с TN-C (без PE) пробило корпус стиральной машины, никто не касается. УЗО 30 мА.', a: ['УЗО отключит сразу', 'Ничего: тока утечки нет, пока никто не коснулся', 'Автомат'], c: 1, e: 'Без PE току некуда утекать. Отключение случится, только когда ток пойдёт через человека.' },
    { s: 'Длинная линия освещения, ток КЗ в конце 70 А, автомат C10.', a: ['Отключит мгновенно', 'Отключит тепловой через секунды — долго', 'Отключит УЗО'], c: 1, e: 'Для мгновенного отключения C10 нужно ≥ 100 А. При 70 А сработает тепловой расцепитель, но медленно. Нужен B10 или больше сечение.' },
    { s: 'В трёхфазном щите отключилось реле напряжения фазы L1.', a: ['Обесточен весь дом', 'Обесточены однофазные группы на L1', 'Котёл (3ф) остановится'], c: 1, e: 'При реле на каждую фазу отключаются только группы этой фазы; трёхфазные потребители подключены до реле.' },
    { s: 'Нажали кнопку «Тест» на УЗО, оно не отключилось.', a: ['Всё нормально', 'УЗО неисправно или не подано питание/N — менять или проверять', 'Надо нажать сильнее'], c: 1, e: 'Тест создаёт искусственную утечку. Не отключилось — защита не работает.' }
  ];
  G.trip = {
    title: 'Что сработает?', sub: 'Авария — какой аппарат отключит', icon: 'bolt',
    mount(el) { quizGame(el, 'trip', S.shuffle(TRIPS).slice(0, 10)); }
  };
  function quizGame(el, id, qs) {
    let i = 0, score = 0;
    const show = () => {
      const q = qs[i];
      el.innerHTML = `<div class="stack"><div class="game-top"><b>${i + 1} из ${qs.length}</b><span class="spacer"></span><span class="pill-big">${score}</span></div><div class="q"><div class="qt">${q.s}</div>${q.svg ? `<div style="margin:6px 0 12px">${q.svg}</div>` : ''}<div class="opts">${q.a.map((a, j) => `<button class="opt" type="button" data-j="${j}"><span class="mk">${'АБВГД'[j]}</span><span>${a}</span></button>`).join('')}</div><div class="expl" hidden></div></div><button class="btn primary" type="button" data-next hidden>${i < qs.length - 1 ? 'Дальше' : 'Итог'}</button></div>`;
    };
    el.onclick = (e) => {
      const b = e.target.closest('.opt');
      if (b && !b.disabled) {
        const q = qs[i], j = Number(b.dataset.j);
        S.$$('.opt', el).forEach((o) => { o.disabled = true; });
        b.classList.add(j === q.c ? 'right' : 'wrong');
        el.querySelector(`.opt[data-j="${q.c}"]`).classList.add('right');
        if (j === q.c) score++;
        const ex = el.querySelector('.expl'); ex.innerHTML = q.e || ''; ex.hidden = !q.e;
        el.querySelector('[data-next]').hidden = false;
        return;
      }
      if (e.target.closest('[data-next]')) { i++; if (i < qs.length) show(); else { el.innerHTML = ''; finish(el, id, score, qs.length); } return; }
      if (e.target.closest('[data-again]')) G[id].mount(el);
    };
    show();
  }
  S.quizGame = quizGame;

  /* ---------- 4. Подбери защиту ---------- */
  G.pick = {
    title: 'Подбери защиту', sub: 'Кабель и автомат под нагрузку', icon: 'shield',
    mount(el) {
      const K = S.K;
      const tasks = [];
      const pool = [['Чайник и тостер на кухне', 3.2, 1], ['Бойлер', 2, 1], ['Освещение двух комнат', 0.6, 1], ['Электроплита', 7, 1], ['Варочная панель', 5.5, 1], ['Тёплый пол', 1.2, 1], ['Электрокотёл', 9, 3], ['Трёхфазная плита', 10.5, 3], ['Сауна', 12, 3], ['Проточный нагреватель', 7.5, 1], ['Стиральная машина', 2.2, 1], ['Мастерская: станок', 5.5, 3]];
      S.shuffle(pool).slice(0, 8).forEach(([n, p, ph]) => {
        const I = ph === 3 ? p * 1000 / (Math.sqrt(3) * 400) : p * 1000 / 230;
        const minB = n.startsWith('Освещение') ? 10 : 16;
        const inom = Math.max(minB, K.nextMcb(I));
        const sec = K.secFor(inom);
        tasks.push({ n, p, ph, I, inom, sec });
      });
      let i = 0, score = 0;
      const show = () => {
        const t = tasks[i];
        const brkOpts = S.shuffle(Array.from(new Set([t.inom, K.mcb[Math.max(0, K.mcb.indexOf(t.inom) - 1)], K.mcb[Math.min(K.mcb.length - 1, K.mcb.indexOf(t.inom) + 1)], K.mcb[Math.min(K.mcb.length - 1, K.mcb.indexOf(t.inom) + 2)]])));
        const secOpts = S.shuffle(Array.from(new Set([t.sec, K.sections[Math.max(0, K.sections.indexOf(t.sec) - 1)], K.sections[Math.min(K.sections.length - 1, K.sections.indexOf(t.sec) + 1)]])));
        el.innerHTML = `<div class="stack"><div class="game-top"><b>${i + 1} из ${tasks.length}</b><span class="spacer"></span><span class="pill-big">${score}</span></div>
        <div class="card stack-sm"><div class="h3">${esc(t.n)}</div><div class="muted">${S.fmt(t.p)} кВт · ${t.ph === 3 ? '3 фазы, 400 В' : '1 фаза, 230 В'} · медь, в штробе</div></div>
        <div class="field"><span class="lab">Автомат</span><div class="chips" data-g="b">${brkOpts.map((b) => `<button class="chip" type="button" data-v="${b}" aria-pressed="false">${t.ph === 3 ? '3P ' : ''}C${b}</button>`).join('')}</div></div>
        <div class="field"><span class="lab">Сечение медного кабеля</span><div class="chips" data-g="s">${secOpts.map((s) => `<button class="chip" type="button" data-v="${s}" aria-pressed="false">${String(s).replace('.', ',')} мм²</button>`).join('')}</div></div>
        <div data-res></div><button class="btn primary" type="button" data-check>Проверить</button></div>`;
      };
      const sel = {};
      el.onclick = (e) => {
        const c = e.target.closest('.chip[data-v]');
        if (c) { const grp = c.parentElement.dataset.g; sel[grp] = Number(c.dataset.v); S.$$('.chip', c.parentElement).forEach((x) => x.setAttribute('aria-pressed', String(x === c))); return; }
        if (e.target.closest('[data-check]')) {
          const t = tasks[i];
          if (!sel.b || !sel.s) { S.toast('Выбери автомат и сечение'); return; }
          const okB = sel.b === t.inom, okS = sel.s === t.sec || (sel.s > t.sec && S.K.maxFor(sel.s) >= sel.b);
          if (okB && okS) score++;
          el.querySelector('[data-res]').innerHTML = `<div class="box ${okB && okS ? 'tip' : 'bad'}"><div class="lbl">${S.icon(okB && okS ? 'check' : 'x')}${okB && okS ? 'Верно' : 'Не совсем'}</div><p>Ток ≈ ${S.fmt(t.I, 1)} А → автомат ${t.ph === 3 ? '3P ' : ''}C${t.inom} → кабель ${String(t.sec).replace('.', ',')} мм² (медь). Автомат не меньше тока нагрузки и не больше, чем держит кабель.</p></div>`;
          const b = e.target.closest('[data-check]'); b.textContent = i < tasks.length - 1 ? 'Дальше' : 'Итог'; b.removeAttribute('data-check'); b.setAttribute('data-next', '');
          return;
        }
        if (e.target.closest('[data-next]')) { i++; delete sel.b; delete sel.s; if (i < tasks.length) show(); else { el.innerHTML = ''; finish(el, 'pick', score, tasks.length); } return; }
        if (e.target.closest('[data-again]')) G.pick.mount(el);
      };
      show();
    }
  };

  /* ---------- 5. Распредели фазы ---------- */
  G.phases = {
    title: 'Распредели фазы', sub: 'Разложи линии по L1, L2, L3 ровно', icon: 'layers',
    mount(el) {
      const names = ['Розетки гостиной', 'Розетки спальни', 'Кухня: стол', 'Кухня: техника', 'Духовка', 'Посудомойка', 'Стиралка', 'Бойлер', 'Тёплый пол', 'Кондиционер', 'Свет 1 этаж', 'Свет 2 этаж', 'Насос', 'Гараж'];
      const pw = [1.2, 0.9, 1.5, 1.8, 2.1, 1.5, 1.4, 1.6, 1.1, 1.0, 0.4, 0.4, 0.9, 1.3];
      const items = S.shuffle(names.map((n, i) => ({ n, p: pw[i], ph: null }))).slice(0, 10);
      let pick = null;
      const sum = (p) => items.filter((x) => x.ph === p).reduce((a, x) => a + x.p, 0);
      const render = (done) => {
        const s = ['L1', 'L2', 'L3'].map(sum);
        const mx = Math.max(...s), mn = Math.min(...s);
        const imb = mx ? (mx - mn) / mx * 100 : 0;
        el.innerHTML = `<div class="stack"><p class="muted">Нажми на линию, затем на фазу. Цель — чтобы нагрузка фаз была почти одинаковой.</p>
        <div class="chips">${items.filter((x) => !x.ph).map((x) => `<button class="tok" type="button" data-i="${items.indexOf(x)}" aria-pressed="${pick === items.indexOf(x)}">${esc(x.n)} · <b class="num">${S.fmt(x.p)}</b> кВт</button>`).join('') || '<span class="muted small">Все линии разложены.</span>'}</div>
        <div class="binrow">${['L1', 'L2', 'L3'].map((p, k) => `<div class="bin" data-ph="${p}" role="button" tabindex="0"><h4><span style="color:${V.wc[p] === 'var(--w-l2)' ? 'var(--ink)' : V.wc[p]}">${p}</span><span class="num">${S.fmt(s[k])} кВт</span></h4>${items.filter((x) => x.ph === p).map((x) => `<button class="tok" type="button" data-i="${items.indexOf(x)}">${esc(x.n)}</button>`).join('')}</div>`).join('')}</div>
        <div class="row"><span class="pill-big">разница ${S.fmt(imb, 0)} %</span><span class="spacer"></span>${items.every((x) => x.ph) && !done ? '<button class="btn primary" type="button" data-done>Готово</button>' : ''}</div></div>`;
        if (done) { const score = Math.max(0, Math.round(100 - imb * 2)); el.insertAdjacentHTML('beforeend', `<div class="box ${imb <= 15 ? 'tip' : 'warn'}"><div class="lbl">${S.icon('info')}Результат</div><p>Разница между самой загруженной и самой лёгкой фазой — ${S.fmt(imb, 0)} %. ${imb <= 10 ? 'Отличная балансировка.' : imb <= 20 ? 'Хорошо.' : 'Можно ровнее: начинай с самых мощных линий и клади каждую на самую лёгкую фазу.'}</p></div>`); finish(el, 'phases', score, 100, 'Очки: чем ровнее фазы, тем больше.'); }
      };
      el.onclick = (e) => {
        const t = e.target.closest('.tok');
        if (t) { const it = items[Number(t.dataset.i)]; if (it.ph) { it.ph = null; pick = null; } else pick = Number(t.dataset.i); render(); return; }
        const b = e.target.closest('.bin');
        if (b && pick != null) { items[pick].ph = b.dataset.ph; const nx = items.find((x) => !x.ph); pick = nx ? items.indexOf(nx) : null; render(); return; }
        if (e.target.closest('[data-done]')) { render(true); return; }
        if (e.target.closest('[data-again]')) G.phases.mount(el);
      };
      render();
    }
  };

  /* ---------- 6. Собери цепочку ---------- */
  const CHAINS = [
    { t: 'Квартира', items: ['Вводной кабель', 'Вводной автомат 2P', 'Реле напряжения', 'УЗО 30 мА группы', 'Автоматы групп', 'Розетки'] },
    { t: 'Частный дом от ВЛ', items: ['Ввод от опоры (PEN)', 'Вводной автомат', 'Счётчик', 'УЗИП', 'Реле напряжения', 'УЗО противопожарное (S)', 'УЗО 30 мА / дифавтоматы', 'Линии'] },
    { t: 'Офис', items: ['ВРУ здания', 'Щит учёта: вводной до счётчика', 'Счётчик', 'Отходящий автомат на ЩР', 'Вводной ЩР', 'Дифавтоматы групп', 'Розетки рабочих мест'] }
  ];
  G.order = {
    title: 'Собери цепочку', sub: 'Расставь аппараты по пути тока', icon: 'list',
    mount(el) {
      let ci = 0, total = 0, right = 0;
      const level = () => {
        const C = CHAINS[ci];
        const shuffled = S.shuffle(C.items);
        const chosen = [];
        const render = (res) => {
          el.innerHTML = `<div class="stack"><div class="game-top"><b>${esc(C.t)}</b><span class="spacer"></span><span class="pill-big">${right}/${total}</span></div><p class="muted">Нажимай по порядку: от ввода к потребителю.</p>
          <div class="list">${chosen.map((x, k) => `<div class="li"><span class="badge ${res ? (C.items[k] === x ? 'ok' : 'bad') : ''}">${k + 1}</span><span class="t"><b>${esc(x)}</b></span></div>`).join('') || '<div class="li"><span class="muted">пока пусто</span></div>'}</div>
          <div class="chips">${shuffled.filter((x) => !chosen.includes(x)).map((x) => `<button class="chip" type="button" data-x="${esc(x)}">${esc(x)}</button>`).join('')}</div>
          ${res ? `<div class="box ${res.ok ? 'tip' : 'bad'}"><div class="lbl">${S.icon(res.ok ? 'check' : 'x')}${res.ok ? 'Верно' : 'Правильный порядок'}</div><p>${C.items.map(esc).join(' → ')}</p></div><button class="btn primary" type="button" data-next>${ci < CHAINS.length - 1 ? 'Дальше' : 'Итог'}</button>` : `<div class="row"><button class="btn" type="button" data-undo ${chosen.length ? '' : 'disabled'}>Отменить</button>${chosen.length === C.items.length ? '<button class="btn primary" type="button" data-check>Проверить</button>' : ''}</div>`}</div>`;
        };
        el.onclick = (e) => {
          const c = e.target.closest('[data-x]');
          if (c) { chosen.push(c.dataset.x); render(); return; }
          if (e.target.closest('[data-undo]')) { chosen.pop(); render(); return; }
          if (e.target.closest('[data-check]')) { const ok = chosen.every((x, k) => x === C.items[k]); total++; if (ok) right++; render({ ok }); return; }
          if (e.target.closest('[data-next]')) { ci++; if (ci < CHAINS.length) level(); else { el.innerHTML = ''; finish(el, 'order', right, total); } return; }
          if (e.target.closest('[data-again]')) G.order.mount(el);
        };
        render();
      };
      level();
    }
  };

  /* ---------- 7. Угадай обозначение ---------- */
  const SYMS = [
    ['Автоматический выключатель (QF)', (x) => V.sym.mcb(x, 10, 70)],
    ['УЗО (QD)', (x) => V.sym.rcd(x, 10, 70)],
    ['Дифавтомат (QFD)', (x) => V.sym.rcbo(x, 10, 70)],
    ['Разъединитель (QS)', (x) => V.sym.sw(x, 10, 70)],
    ['Предохранитель (FU)', (x) => V.sym.fuse(x, 10, 70)],
    ['УЗИП (FV)', (x) => V.sym.spd(x, 6, 80)],
    ['Счётчик (PI)', (x) => V.sym.meter(x, 10, 70)],
    ['Заземление', (x) => V.sym.ground(x, 30)],
    ['Лампа (EL)', (x) => V.sym.lamp(x, 45, 16)],
    ['Розетка (XS)', (x) => V.sym.socket(x, 52)],
    ['Двигатель (M)', (x) => V.sym.motor(x, 45, 20)],
    ['Катушка реле/контактора (K)', (x) => V.sym.coil(x, 45, 50, 22, 'K')],
    ['Нормально открытый контакт / кнопка', (x) => V.sym.noH(x - 30, 52, 60)],
    ['Нормально закрытый контакт', (x) => V.sym.ncH(x - 30, 52, 60)],
    ['Нагревательный элемент (EK)', (x) => V.sym.heater(x, 45, 50, 18)],
    ['Выключатель-разъединитель (QS)', (x) => V.sym.swd(x, 10, 70)],
    ['Автоматический выключатель, полный значок по ГОСТ 2.755 (QF)', (x) => V.sym.mcbFull(x, 10, 70)],
    ['Контакт контактора (KM)', (x) => V.sym.km(x, 10, 70)],
    ['Защитное заземление', (x) => V.sym.pe(x, 50)]
  ];
  S.SYMS = SYMS;
  G.symbols = {
    title: 'Угадай обозначение', sub: 'УГО и буквенные коды на схемах', icon: 'target',
    mount(el) {
      const qs = S.shuffle(SYMS).slice(0, 10).map(([name, f]) => {
        const wrong = S.shuffle(SYMS.filter((s) => s[0] !== name)).slice(0, 3).map((s) => s[0]);
        const a = S.shuffle([name].concat(wrong));
        return { s: 'Что это за обозначение?', svg: V.svg(120, 100, f(60), { width: 150, label: 'Условное обозначение' }), a: a.map(esc), c: a.indexOf(name), e: '' };
      });
      quizGame(el, 'symbols', qs);
    }
  };

  /* ---------- 8. Цвета жил ---------- */
  G.colors = {
    title: 'Цвета жил', sub: 'Быстрый тест по цветам', icon: 'cable',
    mount(el) {
      const base = [['PE', 'Защитный проводник PE'], ['N', 'Нулевой рабочий N'], ['L1', 'Фаза (L1)'], ['L2', 'Фаза (L2)'], ['L3', 'Фаза (L3)'], ['PEN', 'Совмещённый PEN']];
      const names = base.map((b) => b[1]);
      const qs = S.shuffle(base.concat(base)).slice(0, 10).map(([c, n]) => {
        const a = S.shuffle([n].concat(S.shuffle(names.filter((x) => x !== n)).slice(0, 3)));
        return { s: 'Какой это проводник?', svg: V.svg(220, 40, V.wire([[10, 20], [210, 20]], c, { w: 12 }), { width: 220, label: 'Цвет провода' }), a, c: a.indexOf(n), e: c === 'PEN' ? 'PEN: голубой по всей длине с жёлто-зелёными метками на концах (или наоборот).' : '' };
      });
      quizGame(el, 'colors', qs);
    }
  };

  /* ---------- 9. Тренажёр расчётов ---------- */
  G.calc = {
    title: 'Тренажёр расчётов', sub: 'Ток, мощность, сопротивление в уме', icon: 'calc',
    mount(el) {
      const r = (a, b, st) => Math.round((a + Math.random() * (b - a)) / st) * st;
      const gens = [
        () => { const p = r(0.5, 4, 0.1); return { q: `Прибор ${S.fmt(p)} кВт в сети 230 В. Ток, А?`, ans: p * 1000 / 230 }; },
        () => { const i = r(2, 30, 1); return { q: `Ток ${i} А при 230 В. Мощность, кВт?`, ans: 230 * i / 1000 }; },
        () => { const R = r(10, 120, 1); return { q: `Сопротивление ${R} Ом в сети 230 В. Ток, А?`, ans: 230 / R }; },
        () => { const p = r(3, 15, 0.5); return { q: `Трёхфазный котёл ${S.fmt(p)} кВт (400 В). Ток в фазе, А?`, ans: p * 1000 / (1.732 * 400) }; },
        () => { const i = r(6, 20, 1), l = r(10, 60, 5), s = [1.5, 2.5, 4][Math.floor(Math.random() * 3)]; return { q: `Потеря напряжения: ${i} А, ${l} м, медь ${String(s).replace('.', ',')} мм² (ρ = 0,0225). ΔU, В?`, ans: 2 * i * 0.0225 * l / s }; },
        () => { const p = r(500, 3000, 100); return { q: `Сопротивление ТЭНа ${p} Вт на 230 В, Ом?`, ans: 230 * 230 / p }; }
      ];
      const qs = Array.from({ length: 8 }, () => S.pick(gens)());
      let i = 0, score = 0;
      const show = (res) => {
        const q = qs[i];
        el.innerHTML = `<div class="stack"><div class="game-top"><b>${i + 1} из ${qs.length}</b><span class="spacer"></span><span class="pill-big">${score}</span></div><div class="card stack"><div class="h3">${esc(q.q)}</div><div class="row"><input class="inp num" id="calcAns" type="number" inputmode="decimal" step="any" style="max-width:180px" ${res ? 'disabled' : ''}><button class="btn primary" type="button" data-${res ? 'next' : 'check'}>${res ? (i < qs.length - 1 ? 'Дальше' : 'Итог') : 'Ответить'}</button></div>${res ? `<div class="box ${res.ok ? 'tip' : 'bad'}"><div class="lbl">${S.icon(res.ok ? 'check' : 'x')}${res.ok ? 'Верно' : 'Ответ'}</div><p>≈ ${S.fmt(q.ans, 2)}. ${res.ok ? '' : 'Погрешность до 5 % засчитывается.'}</p></div>` : '<p class="small muted">Можно с калькулятором. Засчитывается ответ с точностью ±5 %.</p>'}</div></div>`;
        const inp = el.querySelector('#calcAns'); if (inp && !res) inp.focus();
      };
      el.onclick = (e) => {
        if (e.target.closest('[data-check]')) {
          const v = parseFloat(String(el.querySelector('#calcAns').value).replace(',', '.'));
          const q = qs[i];
          const ok = isFinite(v) && Math.abs(v - q.ans) <= Math.abs(q.ans) * 0.05 + 0.01;
          if (ok) score++;
          show({ ok });
          return;
        }
        if (e.target.closest('[data-next]')) { i++; if (i < qs.length) show(); else { el.innerHTML = ''; finish(el, 'calc', score, qs.length); } return; }
        if (e.target.closest('[data-again]')) G.calc.mount(el);
      };
      el.onkeydown = (e) => { if (e.key === 'Enter' && e.target.id === 'calcAns') { const b = el.querySelector('[data-check]'); if (b) b.click(); } };
      show();
    }
  };

  /* ---------- 10. Схемы управления ---------- */
  G.control = {
    title: 'Тренажёр схем управления', sub: 'Пуск, реверс, импульсное реле, АВР', icon: 'motor',
    mount(el) {
      const ids = Object.keys(S.control.SCHEMES);
      el.innerHTML = `<div class="stack"><div class="tabs-in" role="tablist">${ids.map((k, i) => `<button type="button" role="tab" data-sc="${k}" aria-selected="${i === 0}">${esc(S.control.SCHEMES[k].title)}</button>`).join('')}</div><div data-ctlbox></div></div>`;
      const box = el.querySelector('[data-ctlbox]');
      const open = (k) => { S.$$('[data-sc]', el).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.sc === k))); box.innerHTML = '<div></div>'; S.mountControl(box.firstChild, k); };
      el.addEventListener('click', (e) => { const b = e.target.closest('[data-sc]'); if (b) open(b.dataset.sc); });
      open(ids[0]);
    }
  };

  /* ---------- 11. Экзамен ---------- */
  G.exam = {
    title: 'Итоговый экзамен', sub: '30 вопросов из всех тем, сдать — 80 %', icon: 'exam',
    mount(el) {
      const pool = [];
      (S.course || []).forEach((m) => m.lessons.forEach((l) => (l.quiz || []).forEach((q) => pool.push({ s: q.q, a: q.a, c: q.c, e: q.e }))));
      ERRORS.forEach((q) => pool.push({ s: 'Найди ошибку. ' + q.s, a: q.a, c: q.c, e: q.e }));
      TRIPS.forEach((q) => pool.push(q));
      const qs = S.shuffle(pool).slice(0, 30).map((q) => {
        const order = S.shuffle(q.a.map((x, i) => i));
        return { s: q.s, a: order.map((i) => q.a[i]), c: order.indexOf(q.c), e: q.e };
      });
      quizGame(el, 'exam', qs);
    }
  };
  S.gameOrder = ['wire', 'errors', 'trip', 'pick', 'phases', 'order', 'symbols', 'colors', 'calc', 'control', 'exam'];
})();
