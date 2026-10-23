/* Школа щитовика — игровой слой: опыт, уровни, ранги, достижения, квесты, серия, активность, звуки */
(function () {
  'use strict';
  const S = window.SHK;
  const esc = S.esc;
  const store = S.store;
  const R = (S.rpg = {});

  /* ---------- уровни и ранги ---------- */
  const need = (L) => 50 * L * (L - 1); // всего XP, чтобы дойти до уровня L
  R.need = need;
  R.levelOf = (xp) => { let L = 1; while (need(L + 1) <= xp) L++; return L; };
  const RANKS = [[1, 'Новичок'], [2, 'Стажёр'], [4, 'Ученик электрика'], [6, 'Помощник электрика'], [8, 'Электромонтажник'], [10, 'Сборщик щитов'], [12, 'Щитовик'], [14, 'Мастер-щитовик'], [16, 'Наладчик'], [19, 'Инженер-электрик'], [22, 'Главный энергетик']];
  R.RANKS = RANKS;
  R.rankOf = (L) => RANKS.filter((r) => L >= r[0]).pop()[1];
  R.nextRank = (L) => RANKS.find((r) => r[0] > L) || null;
  R.tierColor = (L) => L >= 16 ? ['#ffd33d', '#fb8f44'] : L >= 12 ? ['#c297ff', '#8250df'] : L >= 8 ? ['#54aeff', '#0969da'] : L >= 4 ? ['#4ac26b', '#1a7f37'] : ['#afb8c1', '#6e7781'];
  R.total = () => Object.values(store.data.xp).reduce((s, v) => s + v[0], 0);
  R.info = () => {
    const xp = R.total(), L = R.levelOf(xp), a = need(L), b = need(L + 1);
    return { xp, L, cur: xp - a, span: b - a, pct: (xp - a) / (b - a), rank: R.rankOf(L), next: R.nextRank(L) };
  };
  R.nick = () => store.data.profile.nick || 'Щитовик';

  /* ---------- учёт ---------- */
  const allLessons = () => (S.course || []).reduce((a, m) => a.concat(m.lessons), []);
  const modDone = (mid) => { const m = (S.course || []).find((x) => x.id === mid); return !!m && m.lessons.length > 0 && m.lessons.every((l) => store.data.done[l.id]); };
  const activeDay = (a) => !!a && Object.keys(a).some((k) => k !== 'visit' && a[k] > 0);
  R.dayCount = (a) => a ? Object.keys(a).reduce((s, k) => s + (k === 'visit' ? 0 : a[k]), 0) : 0;
  R.streak = () => {
    const act = store.data.act;
    const t = new Date(); t.setHours(12, 0, 0, 0);
    if (!activeDay(act[S.dayKey(t)])) t.setDate(t.getDate() - 1);
    let n = 0;
    while (activeDay(act[S.dayKey(t)])) { n++; t.setDate(t.getDate() - 1); }
    return n;
  };
  R.maxStreak = () => {
    const days = Object.keys(store.data.act).filter((k) => activeDay(store.data.act[k])).sort();
    let best = 0, run = 0, prev = null;
    for (const k of days) {
      const dt = new Date(k + 'T12:00:00');
      run = prev && Math.round((dt - prev) / 864e5) === 1 ? run + 1 : 1;
      best = Math.max(best, run);
      prev = dt;
    }
    return best;
  };
  const ctx = () => {
    const d = store.data, L = allLessons(), keys = Object.keys(d.xp);
    return { d, L, doneN: L.filter((l) => d.done[l.id]).length, perfect: Object.values(d.quiz).filter((q) => q.s === q.t).length, cnt: (p) => keys.filter((k) => k.startsWith(p)).length, streakMax: R.maxStreak() };
  };

  /* ---------- достижения ---------- */
  const RXP = { c: 25, r: 50, e: 100, l: 200 };
  R.RARITY = { c: 'обычное', r: 'редкое', e: 'эпическое', l: 'легендарное' };
  const BASE = [
    ['first', 'Первая искра', 'Пройди первый урок', 'c', 'bolt', (c) => c.doneN >= 1],
    ['half', 'Половина пути', 'Пройди половину уроков курса', 'r', 'map', (c) => c.doneN >= Math.ceil(c.L.length / 2)],
    ['graduate', 'Выпускник', 'Пройди все уроки курса', 'l', 'trophy', (c) => c.L.length > 0 && c.doneN >= c.L.length],
    ['ace10', 'Отличник', 'Сдай 10 тестов уроков на 100 %', 'r', 'star', (c) => c.perfect >= 10],
    ['aceall', 'Перфекционист', 'Все тесты уроков на 100 %', 'l', 'star', (c) => c.L.length > 0 && c.perfect >= c.L.length],
    ['gamer', 'Игроман', 'Сыграй во все мини-игры', 'r', 'game', (c) => (S.gameOrder || []).every((id) => id === 'control' ? c.cnt('ctl:') > 0 : !!c.d.xp['gp:' + id])],
    ['record', 'Рекордсмен', 'Набери 100 % в любой мини-игре', 'r', 'trophy', (c) => Object.keys(c.d.games).some((k) => k !== 'exam' && c.d.games[k] >= 100)],
    ['exam', 'Экзамен сдан', 'Сдай итоговый экзамен на 80 % и выше', 'e', 'exam', (c) => c.d.games.exam >= 80],
    ['exam100', 'Безупречно', 'Итоговый экзамен на 100 %', 'l', 'exam', (c) => c.d.games.exam >= 100],
    ['build1', 'Первый щит', 'Сохрани щит в конструкторе', 'c', 'panel', (c) => c.cnt('bs:') >= 1],
    ['build5', 'Конструктор', 'Сохрани 5 разных щитов', 'r', 'layers', (c) => c.cnt('bs:') >= 5],
    ['clean', 'Чистая работа', 'Сохрани щит от 6 линий без ошибок и замечаний', 'r', 'check', (c) => c.cnt('bc:') >= 1],
    ['three', 'Трёхфазник', 'Сохрани трёхфазный щит', 'r', 'bolt', (c) => c.cnt('b3:') >= 1],
    ['steps1', 'По шагам', 'Пройди сборку любого проекта до последнего шага', 'c', 'tool', (c) => c.cnt('ps:') >= 1],
    ['projects', 'Все проекты', 'Пройди сборку всех проектов-щитов до конца', 'e', 'home', (c) => (S.projects || []).filter((p) => p.cfg).every((p) => !!c.d.xp['ps:' + p.id])],
    ['control', 'Автоматчик', 'Запусти все 4 схемы управления', 'r', 'motor', (c) => ['motor', 'reverse', 'impulse', 'avr'].every((id) => !!c.d.xp['ctl:' + id])],
    ['detective', 'Детектив', 'Изучи все метки на фото своих щитов', 'r', 'eye', (c) => (S.photos || []).length > 0 && S.photos.every((ph) => !!c.d.xp['ph:' + ph.id])],
    ['words', 'Словарный запас', 'Открой 50 терминов словаря', 'r', 'book', (c) => c.cnt('t:') >= 50],
    ['calc10', 'Калькулятор', 'Посчитай в 10 разных калькуляторах', 'c', 'calc', (c) => c.cnt('f:') >= 10],
    ['calcall', 'Ходячий справочник', 'Посчитай во всех калькуляторах', 'e', 'calc', (c) => (S.formulas || []).length > 0 && c.cnt('f:') >= S.formulas.length],
    ['ask', 'На связи', 'Отправь Claude вопрос или щит на разбор', 'c', 'send', (c) => c.cnt('cs:') >= 1],
    ['read', 'Работа над ошибками', 'Прочитай разбор от Claude', 'c', 'inbox', (c) => c.cnt('cr:') >= 1],
    ['streak3', 'Разогрев', 'Занимайся 3 дня подряд', 'c', 'flame', (c) => c.streakMax >= 3],
    ['streak7', 'Неделя в строю', 'Занимайся 7 дней подряд', 'r', 'flame', (c) => c.streakMax >= 7],
    ['streak30', 'Железная дисциплина', 'Занимайся 30 дней подряд', 'l', 'flame', (c) => c.streakMax >= 30],
    ['quests', 'Квестоман', 'Выполни 10 ежедневных квестов', 'r', 'quest', (c) => c.cnt('qd:') >= 10],
    ['backup', 'Страховка', 'Сохрани резервную копию прогресса', 'c', 'save', (c) => !!c.d.xp.bk],
    ['night', 'Ночная смена', 'Позанимайся после 23:00', 'c', 'clock', (c) => !!c.d.xp.night],
    ['early', 'Ранняя пташка', 'Позанимайся до 7 утра', 'c', 'sun', (c) => !!c.d.xp.early]
  ].map(([id, t, d, r, ic, ok]) => ({ id, t, d, r, ic, ok, xp: RXP[r] }));
  /* достижения за модули строятся по программе курса — новые модули получают свои автоматически */
  let achCache = null;
  const achAll = () => {
    if (achCache && achCache.n === (S.course || []).length) return achCache.list;
    const mods = (S.course || []).filter((m) => m.ach).map((m) => ({ id: m.id, t: m.ach, d: `Пройди модуль «${m.title}»`, r: m.r || 'r', ic: m.ic || 'trophy', ok: () => modDone(m.id), xp: RXP[m.r || 'r'] }));
    const list = BASE.slice(0, 1).concat(mods, BASE.slice(1));
    achCache = { n: (S.course || []).length, list };
    return list;
  };
  Object.defineProperty(R, 'ACH', { get: achAll });
  R.achList = () => achAll().map((a) => Object.assign({ got: store.data.xp['a:' + a.id] ? store.data.xp['a:' + a.id][1] : null }, a));

  /* ---------- ежедневные квесты ---------- */
  const QPOOL = [
    { id: 'lesson', t: 'Пройди урок', k: 'lesson', n: 1, xp: 30, ic: 'book', need: (c) => c.doneN < c.L.length },
    { id: 'lesson2', t: 'Пройди 2 урока', k: 'lesson', n: 2, xp: 50, ic: 'book', need: (c) => c.L.length - c.doneN >= 2 },
    { id: 'perfect', t: 'Сдай тест урока на 100 %', k: 'perfect', n: 1, xp: 30, ic: 'star' },
    { id: 'game', t: 'Сыграй в любую мини-игру', k: 'game', n: 1, xp: 20, ic: 'game' },
    { id: 'game70', t: 'Набери 70 % в мини-игре', k: 'game70', n: 1, xp: 35, ic: 'trophy' },
    { id: 'terms', t: 'Открой 3 термина в словаре', k: 'term', n: 3, xp: 20, ic: 'book' },
    { id: 'calc', t: 'Посчитай в 2 калькуляторах', k: 'calc', n: 2, xp: 25, ic: 'calc' },
    { id: 'build', t: 'Сохрани щит в конструкторе', k: 'build', n: 1, xp: 35, ic: 'panel' },
    { id: 'steps', t: 'Пройди сборку проекта до последнего шага', k: 'steps', n: 1, xp: 40, ic: 'tool' },
    { id: 'ctl', t: 'Запусти схему управления двигателем', k: 'ctl', n: 1, xp: 20, ic: 'motor' },
    { id: 'retry', t: 'Перепройди тест, где было меньше 100 %', k: 'retry', n: 1, xp: 30, ic: 'refresh', need: (c) => Object.values(c.d.quiz).some((q) => q.s < q.t) },
    { id: 'send', t: 'Отправь Claude вопрос или щит', k: 'send', n: 1, xp: 30, ic: 'send' }
  ];
  const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return mix(h); };
  const mix = (h) => { h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };
  R.questIds = () => {
    const day = S.today();
    try { const q = JSON.parse(localStorage.getItem('shk:q') || 'null'); if (q && q.day === day && Array.isArray(q.ids) && q.ids.length === 3) return q.ids; } catch (e) { /* ignore */ }
    const c = ctx();
    const ok = QPOOL.filter((q) => !q.need || q.need(c));
    let seed = hashStr(day + ':' + store.data.profile.seed);
    const rnd = () => { seed = mix(seed + 0x9e3779b9); return seed / 4294967296; };
    const first = ok.filter((q) => q.k === 'lesson');
    const ids = [];
    if (first.length) ids.push(first[Math.floor(rnd() * first.length)].id);
    const rest = ok.filter((q) => q.k !== 'lesson');
    while (ids.length < 3 && rest.length) ids.push(rest.splice(Math.floor(rnd() * rest.length), 1)[0].id);
    try { localStorage.setItem('shk:q', JSON.stringify({ day, ids })); } catch (e) { /* ignore */ }
    return ids;
  };
  R.quests = () => {
    const day = S.today(), a = store.data.act[day] || {};
    return R.questIds().map((id) => QPOOL.find((q) => q.id === id)).filter(Boolean).map((q) => ({ q, have: Math.min(q.n, a[q.k] || 0), done: !!store.data.xp['qd:' + day + ':' + q.id] }));
  };

  /* ---------- начисление ---------- */
  let pend = [], pendT = null, achQ = [], achShowing = false;
  R.lastLevel = null;
  const now = () => Date.now();
  /* выводит события из состояния прогресса и выдаёт недостающие награды */
  R.check = (opts) => {
    const silent = !!(opts && opts.silent);
    const d = store.data;
    const gained = [];
    const add = (id, xp, label, t) => { if (!d.xp[id]) { d.xp[id] = [xp, t || now()]; gained.push({ id, xp, label }); } };
    for (const [id, t] of Object.entries(d.done)) add('l:' + id, 40, 'Урок пройден', t);
    for (const [id, q] of Object.entries(d.quiz)) {
      if (q.s / q.t >= 0.5) add('q:' + id, 15, 'Тест сдан', q.at);
      if (q.s === q.t) add('qp:' + id, 10, 'Тест на 100 %', q.at);
    }
    for (const [id, p] of Object.entries(d.games)) {
      if (p >= 50) add('g:' + id + ':1', 15, 'Бронза в игре');
      if (p >= 80) add('g:' + id + ':2', 25, 'Серебро в игре');
      if (p >= 100) add('g:' + id + ':3', 40, 'Золото в игре');
    }
    const day = S.today();
    const qs = R.quests();
    qs.forEach(({ q, have }) => { if (have >= q.n) add('qd:' + day + ':' + q.id, q.xp, 'Квест: ' + q.t); });
    if (qs.length && qs.every(({ q }) => d.xp['qd:' + day + ':' + q.id])) add('qa:' + day, 50, 'Все квесты дня');
    for (let round = 0; round < 4; round++) {
      const c = ctx();
      const fresh = achAll().filter((a) => !d.xp['a:' + a.id] && a.ok(c));
      if (!fresh.length) break;
      fresh.forEach((a) => { add('a:' + a.id, a.xp, 'Достижение'); if (!silent) achQ.push(a); });
    }
    if (gained.length) {
      store.saveLocal();
      store.scheduleRemote();
      if (!silent) { pend = pend.concat(gained.filter((g) => g.xp > 0)); clearTimeout(pendT); pendT = setTimeout(flushPop, 220); }
    }
    const info = R.info();
    if (R.lastLevel != null && info.L > R.lastLevel && !silent) setTimeout(() => levelUp(info), achQ.length ? 900 : 650);
    R.lastLevel = info.L;
    R.hud();
    if (!silent && achQ.length && !achShowing) showAch();
    return gained;
  };
  /* разовые факты, которые не выводятся из состояния: открыл термин, посчитал, прошёл шаги */
  R.award = (id, xp, label, opts) => {
    const d = store.data;
    if (d.xp[id]) return false;
    d.xp[id] = [xp, now()];
    if (opts && opts.bump) store.bump(opts.bump);
    store.touch('award');
    if (xp > 0 && !(opts && opts.quiet)) { pend.push({ id, xp, label }); clearTimeout(pendT); pendT = setTimeout(flushPop, 220); }
    return true;
  };
  const act = (k) => { store.bump(k); store.touch('award'); };

  /* ---------- звук и вибрация ---------- */
  let ac = null, gestured = false;
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => { gestured = true; }, { capture: true, passive: true }));
  const actx = () => {
    if (!gestured) return null;
    if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; try { ac = new C(); } catch (e) { return null; } }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  };
  const tone = (f, t0, dur, type, vol) => {
    const a = actx(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.03);
  };
  R.sfx = (kind) => {
    if (!S.settings.sound) return;
    try {
      if (kind === 'ok') { tone(660, 0, 0.09, 'square', 0.035); tone(990, 0.08, 0.15, 'square', 0.035); }
      else if (kind === 'bad') { tone(196, 0, 0.16, 'sawtooth', 0.03); tone(147, 0.12, 0.22, 'sawtooth', 0.028); }
      else if (kind === 'xp') { tone(1175, 0, 0.06, 'triangle', 0.05); tone(1568, 0.05, 0.1, 'triangle', 0.05); }
      else if (kind === 'lvl') [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, i * 0.085, 0.18, 'square', 0.04));
      else if (kind === 'ach') [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.07, 0.22, 'triangle', 0.05));
      else if (kind === 'win') [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.2, 'square', 0.035));
      else if (kind === 'lose') [392, 330, 262].forEach((f, i) => tone(f, i * 0.12, 0.2, 'triangle', 0.04));
      else if (kind === 'tap') tone(880, 0, 0.04, 'square', 0.02);
    } catch (e) { /* без звука */ }
  };
  R.buzz = (p) => { if (gestured && S.settings.vibro && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* ignore */ } } };

  /* ---------- всплывашки ---------- */
  function flushPop() {
    if (!pend.length) return;
    const sum = pend.reduce((s, g) => s + g.xp, 0);
    const top = pend.slice().sort((x, y) => y.xp - x.xp)[0];
    const label = pend.length === 1 ? top.label : `${top.label} и ещё ${pend.length - 1}`;
    pend = [];
    const el = document.createElement('div');
    el.className = 'xp-pop';
    el.setAttribute('role', 'status');
    el.innerHTML = `+${sum} XP<small>${esc(label || '')}</small>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1700);
    R.sfx('xp');
  }
  function showAch() {
    const a = achQ.shift();
    if (!a) { achShowing = false; return; }
    achShowing = true;
    const el = document.createElement('div');
    el.className = 'ach-toast';
    el.style.setProperty('--rc', `var(--r-${a.r})`);
    el.setAttribute('role', 'status');
    el.innerHTML = `${R.medal(a)}<div><div class="k">ДОСТИЖЕНИЕ · ${esc(R.RARITY[a.r].toUpperCase())}</div><b>${esc(a.t)}</b><span>${esc(a.d)} · +${a.xp} XP</span></div>`;
    el.addEventListener('click', () => { el.remove(); S.go('profile.ach'); });
    document.body.appendChild(el);
    R.sfx('ach'); R.buzz([30, 40, 30]);
    setTimeout(() => { el.remove(); showAch(); }, 3700);
  }
  function levelUp(info) {
    const old = S.$('.lvlup'); if (old) old.remove();
    const el = document.createElement('div');
    el.className = 'lvlup';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Новый уровень');
    const rk = RANKS.find((r) => r[0] === info.L);
    el.innerHTML = `<div class="lu"><div class="rays" aria-hidden="true"></div><div class="k">НОВЫЙ УРОВЕНЬ!</div><div class="n">${info.L}</div><div class="rk">${rk ? 'Новый ранг: ' : ''}${esc(info.rank)}</div><p>${info.next ? `До ранга «${esc(info.next[1])}» — уровень ${info.next[0]}` : 'Ты на вершине. Уважение.'}</p><button class="btn game" type="button" data-ok>${S.icon('play')}Дальше</button></div>`;
    el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('[data-ok]')) el.remove(); });
    document.body.appendChild(el);
    R.sfx('lvl'); R.buzz([40, 60, 40, 60, 80]);
    sparks();
    const b = el.querySelector('[data-ok]'); if (b) b.focus();
  }
  function sparks() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cols = ['#ffd33d', '#fb8f44', '#a371f7', '#4ac26b', '#54aeff', '#ff80c8'];
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    for (let i = 0; i < 36; i++) {
      const s = document.createElement('i');
      s.className = 'spark';
      const ang = Math.random() * Math.PI * 2, dist = 120 + Math.random() * 220;
      s.style.left = cx + 'px'; s.style.top = cy + 'px';
      s.style.background = cols[i % cols.length];
      s.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      s.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
      s.style.animationDelay = Math.random() * 0.15 + 's';
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 1400);
    }
  }
  R.sparks = sparks;

  /* ---------- аватар-идентикон и медали ---------- */
  R.identicon = (seed) => {
    const h = hashStr(String(seed || 'x'));
    const h2 = hashStr('c' + seed);
    let bits = h & 0x7fff;
    let on = 0; for (let i = 0; i < 15; i++) on += (bits >> i) & 1;
    if (on < 5) bits |= 0x2a52;
    const hue = h2 % 360;
    const col = `hsl(${hue} 62% 50%)`;
    let r = '';
    for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) {
      if ((bits >> (y * 3 + x)) & 1) { r += `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`; if (x < 2) r += `<rect x="${4 - x}" y="${y}" width="1.02" height="1.02"/>`; }
    }
    return `<svg viewBox="-0.6 -0.6 6.2 6.2" shape-rendering="crispEdges" aria-hidden="true"><rect x="-0.6" y="-0.6" width="6.2" height="6.2" fill="#f0f0f0"/><g fill="${col}">${r}</g></svg>`;
  };
  R.avatar = (size) => `<span class="ava" style="width:${size}px;height:${size}px">${R.identicon(store.data.profile.seed)}</span>`;
  R.avatarRing = (size) => {
    const info = R.info();
    const inner = Math.round(size * 0.8), rr = size / 2 - 3, c = 2 * Math.PI * rr;
    const [c1, c2] = R.tierColor(info.L);
    const gid = 'rg' + size;
    return `<span class="ava-ring" style="width:${size}px;height:${size}px"><svg class="ring" viewBox="0 0 ${size} ${size}" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><circle cx="${size / 2}" cy="${size / 2}" r="${rr}" fill="none" stroke="var(--bg-muted)" stroke-width="4"/><circle cx="${size / 2}" cy="${size / 2}" r="${rr}" fill="none" stroke="url(#${gid})" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(c * Math.max(0.02, info.pct)).toFixed(1)} ${c.toFixed(1)}"/></svg>${R.avatar(inner)}<span class="lvtag">${info.L}</span></span>`;
  };
  const MEDAL = { c: ['#d0d7de', '#8c959f'], r: ['#80ccff', '#0969da'], e: ['#d8b9ff', '#8250df'], l: ['#ffe58a', '#bf8700'] };
  R.medal = (a, cls) => {
    const [c1, c2] = MEDAL[a.r];
    const gid = 'md-' + a.r;
    return `<svg class="medal${cls ? ' ' + cls : ''}" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><path d="M32 3 57 17.5v29L32 61 7 46.5v-29z" fill="url(#${gid})" stroke="rgba(0,0,0,.28)" stroke-width="1.5" stroke-linejoin="round"/><path d="M32 9.5 51.5 21v22L32 54.5 12.5 43V21z" fill="rgba(255,255,255,.16)"/><g transform="translate(20 20)" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 1px 0 rgba(0,0,0,.35))">${S.icons[a.ic] || S.icons.star}</g></svg>`;
  };

  /* ---------- график активности как у GitHub ---------- */
  R.heat = (weeks) => {
    const act = store.data.act;
    const today = new Date(); today.setHours(12, 0, 0, 0);
    const dow = (today.getDay() + 6) % 7; // понедельник = 0
    const start = new Date(today); start.setDate(start.getDate() - dow - (weeks - 1) * 7);
    let cells = '', total = 0, daysActive = 0;
    for (let w = 0; w < weeks; w++) for (let r = 0; r < 7; r++) {
      const dt = new Date(start); dt.setDate(start.getDate() + w * 7 + r);
      if (dt > today) { cells += '<i class="pad"></i>'; continue; }
      const k = S.dayKey(dt), n = R.dayCount(act[k]);
      total += n; if (n) daysActive++;
      const l = n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 9 ? 3 : 4;
      cells += `<i data-l="${l}"${k === S.today() ? ' class="today"' : ''} title="${dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}: ${n ? n + ' ' + S.plural(n, 'действие', 'действия', 'действий') : 'нет активности'}"></i>`;
    }
    return { html: `<div class="heat-wrap"><div class="heat" role="img" aria-label="Активность по дням">${cells}</div></div><div class="heat-leg">Меньше <i></i><i style="background:var(--h1)"></i><i style="background:var(--h2)"></i><i style="background:var(--h3)"></i><i style="background:var(--h4)"></i> Больше</div>`, total, daysActive };
  };

  /* ---------- HUD в шапке и боковой панели ---------- */
  R.hud = () => {
    const info = R.info();
    const me = S.$('#meBtn');
    if (me) { me.innerHTML = `${R.avatar(28)}<span class="lv">${info.L}</span>`; me.title = `${R.nick()} · уровень ${info.L} · ${info.rank}`; }
    const strip = S.$('#xpStrip');
    if (strip) strip.style.width = Math.max(1.5, Math.round(info.pct * 1000) / 10) + '%';
    const side = S.$('#sideMe');
    if (side) side.innerHTML = `<a class="card" href="#profile" data-go="profile" style="padding:12px"><div class="row" style="flex-wrap:nowrap">${R.avatar(32)}<div style="min-width:0;flex:1"><b style="display:block;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(R.nick())}</b><span class="small muted">LVL ${info.L} · ${esc(info.rank)}</span></div></div><div class="bar xp" style="margin-top:10px;height:8px"><i style="width:${Math.round(info.pct * 100)}%"></i></div><div class="small muted" style="margin-top:4px">${info.cur} / ${info.span} XP</div></a>`;
  };

  /* ---------- подписки на события приложения ---------- */
  S.bus.on('change', (why) => {
    if (why === 'local' || why === 'award') {
      const h = new Date().getHours();
      const d = store.data;
      if (why === 'local' && (h >= 23 || h < 4) && !d.xp.night) d.xp.night = [0, now()];
      if (why === 'local' && h >= 4 && h < 7 && !d.xp.early) d.xp.early = [0, now()];
    }
    R.check({ silent: why === 'remote' || why === 'import' });
  });
  S.bus.on('term', (id) => { if (!R.award('t:' + id, 2, 'Новый термин', { bump: 'term' })) act('term'); });
  S.bus.on('calc', (id) => { if (!R.award('f:' + id, 5, 'Калькулятор', { bump: 'calc' })) act('calc'); });
  S.bus.on('steps', (pid) => { if (!pid) return; if (!R.award('ps:' + pid, 40, 'Сборка пройдена', { bump: 'steps' })) act('steps'); });
  S.bus.on('ctl', (id) => { if (!R.award('ctl:' + id, 25, 'Схема запущена', { bump: 'ctl' })) act('ctl'); });
  S.bus.on('game', (g) => { R.award('gp:' + g.id, 5, 'Первая партия'); });
  S.bus.on('pin', (p) => {
    R.award('pn:' + p.ph + ':' + p.i, 1, 'Метка на фото', { quiet: true, bump: 'pin' });
    const ph = (S.photos || []).find((x) => x.id === p.ph);
    if (ph && ph.pins.every((_, i) => store.data.xp['pn:' + ph.id + ':' + i])) R.award('ph:' + ph.id, 15, 'Фото изучено');
  });
  S.bus.on('build', (b) => {
    if (!b || !b.id) return;
    R.award('bs:' + b.id, 15, 'Щит сохранён');
    if (b.R && b.R.three) R.award('b3:' + b.id, 20, 'Трёхфазный щит');
    if (b.R && b.R.lines.length >= 6 && !b.R.checks.some((c) => c.level === 'err' || c.level === 'warn')) R.award('bc:' + b.id, 30, 'Без замечаний');
  });
  S.bus.on('send', (id) => { if (!R.award('cs:' + id, 20, 'Отправлено Claude', { bump: 'send' })) act('send'); });
  S.bus.on('read', (id) => { R.award('cr:' + id, 15, 'Разбор прочитан', { bump: 'read' }); });
  S.bus.on('backup', () => { R.award('bk', 20, 'Резервная копия'); });

  /* звук и анимация ответа в тестах и играх */
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('.opt');
    if (!b || b.dataset.fx) return;
    if (b.classList.contains('right')) { b.dataset.fx = '1'; b.classList.add('fx-ok'); R.sfx('ok'); }
    else if (b.classList.contains('wrong')) { b.dataset.fx = '1'; b.classList.add('fx-bad'); R.sfx('bad'); R.buzz(70); }
  });

  /* ---------- запуск: заставка и ежедневный бонус ---------- */
  S.bus.on('boot', () => {
    R.check({ silent: true });
    const sp = S.$('#splash');
    const daily = () => {
      if (R.award('d:' + S.today(), 10, 'Ежедневный бонус')) { store.bump('visit'); store.saveLocal(); }
    };
    if (!sp) { setTimeout(daily, 600); return; }
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (S.settings.splash === false || reduce || S.env !== 'pages') { sp.remove(); setTimeout(daily, 600); return; }
    const info = R.info();
    const sub = S.$('#splashSub');
    let closed = false;
    const close = () => {
      if (closed) return; closed = true;
      sp.classList.add('out');
      setTimeout(() => { sp.remove(); daily(); }, 380);
    };
    setTimeout(() => { if (sub && !closed) sub.textContent = `LVL ${info.L} · ${info.rank.toUpperCase()}`; }, 520);
    sp.addEventListener('click', () => { R.sfx('start'); close(); });
    setTimeout(close, 1500);
  });
})();
