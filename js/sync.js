/* Школа щитовика — связь с Claude: заявки на разбор и сохранённые разборы */
(function () {
  'use strict';
  const S = window.SHK;
  const esc = S.esc;
  const store = S.store;
  const E = S.engine;
  const Y = (S.sync = { file: [], db: [], last: 0, busy: false, err: null });

  /* ---------- типы заявок ---------- */
  const TYPES = {
    question: { t: 'Вопрос', ic: 'chat', c1: '#0969da', c2: '#54aeff', ph: 'Что хочешь узнать? Например: почему нули разных УЗО нельзя объединять?', def: 'Вопрос' },
    panel: { t: 'Мой щит', ic: 'panel', c1: '#1a7f37', c2: '#4ac26b', ph: 'Что проверить? Например: правильно ли выбраны автоматы и сечения, можно ли дешевле.', def: 'Проверь мой щит' },
    progress: { t: 'Мой прогресс', ic: 'trophy', c1: '#8250df', c2: '#c297ff', ph: 'Например: что повторить перед экзаменом? Дай задание на неделю.', def: 'Что мне подтянуть?' },
    photo: { t: 'Фото щита', ic: 'camera', c1: '#bc4c00', c2: '#fb8f44', ph: 'Что за щит и что непонятно? Фото прикрепишь на GitHub следующим шагом.', def: 'Разбери фото щита' },
    bug: { t: 'Ошибка в приложении', ic: 'alert', c1: '#cf222e', c2: '#ff8182', ph: 'Где и что пошло не так? Например: в уроке «УЗО» картинка не помещается на экран.', def: 'Ошибка в приложении' }
  };
  Y.TYPES = TYPES;

  /* ---------- данные заявки ---------- */
  Y.minCfg = (cfg) => {
    const c = JSON.parse(JSON.stringify(cfg || {}));
    const d = E.defaultCfg();
    ['object', 'phases', 'kw', 'earthing', 'overhead', 'meter', 'rn', 'spd', 'fire', 'scheme', 'compact', 'wide', 'reserve', 'zext'].forEach((k) => { if (k in c && JSON.stringify(c[k]) === JSON.stringify(d[k])) delete c[k]; });
    if (c.input && JSON.stringify(c.input) === JSON.stringify(d.input)) delete c.input;
    delete c.v;
    c.lines = (c.lines || []).map((l) => {
      const base = E.newLine(E.KINDS[l.kind] ? l.kind : 'custom');
      const o = { kind: l.kind };
      ['name', 'p', 'ph', 'len', 'room', 'rcd', 'phase'].forEach((k) => { if (l[k] !== undefined && l[k] !== base[k]) o[k] = l[k]; });
      const dv = {};
      ['type', 'in', 'curve', 'ma', 'rt'].forEach((k) => { if (l.dev && l.dev[k] !== undefined && l.dev[k] !== 'auto') dv[k] = l.dev[k]; });
      if (Object.keys(dv).length) o.dev = dv;
      return o;
    });
    return c;
  };
  const panelSum = (cfg) => {
    try {
      const R = E.build(cfg);
      return { lines: R.lines.length, devices: R.devices.length, modules: R.enclosure.modules, errs: R.checks.filter((c) => c.level === 'err').length, warns: R.checks.filter((c) => c.level === 'warn').length, three: !!R.three, kw: R.cfg.kw, input: R.totals.inRating };
    } catch (e) { return null; }
  };
  const progressData = () => {
    const d = store.data, L = (S.course || []).reduce((a, m) => a.concat(m.lessons.map((l) => ({ id: l.id, m: m.id }))), []);
    const weak = L.filter((l) => d.done[l.id] && (!d.quiz[l.id] || d.quiz[l.id].s / d.quiz[l.id].t < 0.7)).map((l) => l.id);
    const quiz = {}; Object.entries(d.quiz).forEach(([k, q]) => { quiz[k] = [q.s, q.t]; });
    return { done: L.filter((l) => d.done[l.id]).map((l) => l.id), total: L.length, quiz, games: d.games, weak, streak: S.rpg.streak(), ach: S.rpg.achList().filter((a) => a.got).map((a) => a.id), next: (L.find((l) => !d.done[l.id]) || {}).id || null };
  };
  const summaryText = (type, data) => {
    if (type === 'panel' && data.sum) { const s = data.sum; return `Щит «${data.name}» — ${s.lines} ${S.plural(s.lines, 'линия', 'линии', 'линий')}, ${s.three ? '3 фазы' : '1 фаза'} ${S.fmt(s.kw)} кВт, вводной ${s.input} А, ошибок: ${s.errs}, замечаний: ${s.warns}`; }
    if (type === 'panel') return `Щит «${data.name}»`;
    if (type === 'progress') return `Прогресс: ${data.done.length} из ${data.total} уроков, серия ${data.streak} дн., слабые темы: ${data.weak.length}`;
    if (type === 'photo') return 'Фото щита — прикреплены ниже';
    if (type === 'bug') return `Раздел: ${data.route || '—'}`;
    if (data.lesson) { const l = (S.course || []).reduce((a, m) => a.concat(m.lessons), []).find((x) => x.id === data.lesson); return `Урок: ${l ? l.title : data.lesson}`; }
    return '';
  };

  /* ---------- окно отправки ---------- */
  Y.compose = (opts) => {
    opts = opts || {};
    let type = opts.type || 'question';
    const projects = Object.values(store.data.projects).sort((a, b) => b.updated - a.updated);
    const draft = store.data.draft && store.data.draft.cfg;
    const panelOpts = [];
    if (opts.cfg) panelOpts.push(['cur', `Текущий: ${opts.cfg.name || 'щит'}`, opts.cfg]);
    else if (draft) panelOpts.push(['draft', `Из конструктора: ${draft.name || 'щит'}`, draft]);
    projects.forEach((p) => panelOpts.push(['p:' + p.id, `Мой щит: ${p.name}`, p.cfg]));
    const body = S.sheet(`${S.icon('send')} Отправить Claude на разбор`, `<div class="stack">
      <div class="seg" role="group" data-ty>${Object.entries(TYPES).map(([k, v]) => `<button type="button" data-v="${k}" aria-pressed="${k === type}">${v.t}</button>`).join('')}</div>
      <div class="field"><label for="rqTitle">Заголовок</label><input class="inp" id="rqTitle" maxlength="120" value="${esc(opts.title || TYPES[type].def)}"></div>
      <div class="field" data-panelsel ${type === 'panel' ? '' : 'hidden'}><label for="rqPanel">Какой щит</label>${panelOpts.length ? `<select class="inp" id="rqPanel">${panelOpts.map(([k, t]) => `<option value="${esc(k)}">${esc(t)}</option>`).join('')}</select>` : '<div class="flash warn">Пока нет ни одного щита. Собери его в конструкторе — и возвращайся.</div>'}</div>
      <div class="field"><label for="rqText">Комментарий</label><textarea class="inp" id="rqText" maxlength="3000" placeholder="${esc(TYPES[type].ph)}">${esc(opts.text || '')}</textarea></div>
      <div class="flash small" data-sum></div>
      <div class="stack-sm">
        ${S.env === 'artifact' ? `<button class="btn primary block" type="button" data-send="db">${S.icon('send')}Отправить Claude</button>` : `<button class="btn primary block" type="button" data-send="github">${S.icon('github')}Открыть GitHub и отправить</button>`}
        <button class="btn block" type="button" data-send="copy">${S.icon('copy')}Скопировать для чата с Claude</button>
        ${S.env === 'artifact' ? `<button class="btn ghost block" type="button" data-send="github">${S.icon('github')}Отправить через GitHub</button>` : ''}
      </div>
      <p class="small muted" data-hint></p>
    </div>`);
    const $ = (s) => body.querySelector(s);
    const cfgOf = () => { const sel = $('#rqPanel'); const o = sel ? panelOpts.find((p) => p[0] === sel.value) : panelOpts[0]; return o ? o[2] : null; };
    const dataOf = () => {
      if (type === 'panel') { const cfg = cfgOf(); return cfg ? { name: cfg.name || 'Щит', cfg: Y.minCfg(cfg), sum: panelSum(cfg) } : null; }
      if (type === 'progress') return progressData();
      if (type === 'bug') return { route: location.hash.slice(1) || 'home', screen: `${window.innerWidth}×${window.innerHeight}`, ua: navigator.userAgent.slice(0, 160), ver: S.VERSION };
      return opts.lesson ? { lesson: opts.lesson } : (opts.ref ? { ref: opts.ref } : {});
    };
    const hint = () => {
      const h = $('[data-hint]');
      if (S.env === 'artifact') h.innerHTML = 'Заявка сохранится в этом приложении. Потом напиши Claude в чате: «Проверь разборы» — ответ появится в разделе «Разборы».';
      else h.innerHTML = `Откроется GitHub с готовой заявкой — нажми зелёную кнопку <b>Create</b> (нужен вход в GitHub). Потом напиши Claude в чате: «Проверь разборы». ${type === 'photo' ? '<b>Фото прикрепи на GitHub</b> — кнопкой со скрепкой под текстом. ' : ''}Заявки видны всем в репозитории — не пиши личные данные.`;
    };
    const refresh = () => {
      $('[data-panelsel]').hidden = type !== 'panel';
      $('#rqText').placeholder = TYPES[type].ph;
      const d = dataOf();
      $('[data-sum]').innerHTML = `<b>Что прикрепится:</b> ${esc(d ? summaryText(type, d) || 'только текст' : 'нечего прикрепить')}`;
      hint();
    };
    body.addEventListener('click', async (e) => {
      const tb = e.target.closest('[data-ty] button');
      if (tb) {
        const t = $('#rqTitle');
        if (!t.value.trim() || Object.values(TYPES).some((v) => v.def === t.value)) t.value = TYPES[tb.dataset.v].def;
        type = tb.dataset.v;
        S.$$('[data-ty] button', body).forEach((b) => b.setAttribute('aria-pressed', String(b === tb)));
        refresh();
        return;
      }
      const sb = e.target.closest('[data-send]');
      if (!sb || sb.disabled) return;
      const d = dataOf();
      if (type === 'panel' && !d) { S.toast('Сначала собери щит в конструкторе'); return; }
      const title = ($('#rqTitle').value || TYPES[type].def).trim().slice(0, 120);
      const text = $('#rqText').value.trim().slice(0, 3000);
      if (type === 'question' && !text) { S.toast('Напиши вопрос'); $('#rqText').focus(); return; }
      sb.disabled = true;
      try { await Y.send(sb.dataset.send, { type, title, text, data: d }); }
      finally { sb.disabled = false; }
    });
    body.addEventListener('change', (e) => { if (e.target.id === 'rqPanel') refresh(); });
    refresh();
  };

  /* ---------- отправка ---------- */
  Y.send = async (via, req) => {
    const info = S.rpg.info();
    const id = 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const payload = { v: 1, id, type: req.type, title: req.title, text: req.text, at: new Date().toISOString(), app: { ver: S.VERSION, env: S.env }, who: { nick: S.rpg.nick(), lvl: info.L, xp: info.xp, rank: info.rank }, data: req.data || {} };
    let code;
    try { code = await S.codec.encode(payload); } catch (e) { S.toast('Не получилось упаковать заявку'); return false; }
    const sum = summaryText(req.type, payload.data);
    if (via === 'copy') {
      const txt = `Claude, разбери, пожалуйста.\n${TYPES[req.type].t}: ${req.title}\n${req.text ? req.text + '\n' : ''}${sum ? sum + '\n' : ''}Код заявки: ${code}`;
      const ok = await S.copy(txt, 'Скопировано — вставь в чат с Claude');
      if (ok) { S.closeSheet(); remember(id, req, 'copy'); }
      return ok;
    }
    if (via === 'db') {
      try {
        if (!S.db) throw new Error('nodb');
        await S.db.collection('inbox').doc(id).set({ id, type: req.type, title: req.title, text: req.text, at: payload.at, sum, code });
        S.closeSheet(); remember(id, req, 'db');
        S.toast('Отправлено. Напиши Claude в чате: «Проверь разборы»');
        return true;
      } catch (e) { S.toast('Не получилось сохранить. Скопируй заявку для чата.'); return false; }
    }
    /* GitHub: заявка = issue в репозитории приложения */
    const bodyText = [
      req.text || '_(без комментария)_',
      '',
      req.type === 'photo' ? '📷 **Прикрепи фото щита ниже** (кнопка со скрепкой или перетащи файлы сюда).\n' : '',
      '---',
      `**${TYPES[req.type].t}**${sum ? ': ' + sum : ''}`,
      `**Ученик:** ${S.rpg.nick()} · уровень ${info.L} · ${info.rank}`,
      `<sub>Отправлено из приложения «Школа щитовика» ${S.VERSION} · заявка ${id}</sub>`,
      '',
      `<!-- ${code} -->`
    ].join('\n');
    const base = `https://github.com/${S.REPO}/issues/new?labels=razbor&title=${encodeURIComponent('Разбор: ' + req.title)}`;
    let url = base + '&body=' + encodeURIComponent(bodyText);
    if (url.length > 7800) {
      const ok = await S.copy(bodyText, 'Текст заявки скопирован');
      if (!ok) return false;
      url = base + '&body=' + encodeURIComponent('Вставь сюда скопированный текст заявки (долгое нажатие → «Вставить»).\n\n');
      S.toast('Заявка длинная: текст в буфере — вставь его на GitHub');
    }
    S.openExternal(url);
    S.closeSheet();
    remember(id, req, 'github');
    return true;
  };
  function remember(id, req, via) {
    store.data.sent[id] = { id, type: req.type, title: req.title, text: req.text || '', at: Date.now(), via, issue: null };
    store.touch();
    S.bus.emit('send', id);
    S.bus.emit('rz');
  }

  /* ---------- разборы: файл в репозитории + база внутри Claude ---------- */
  const okItem = (x) => x && typeof x === 'object' && typeof x.id === 'string' && /^[\w-]{1,48}$/.test(x.id) && typeof x.md === 'string' && x.md.length < 200000;
  const normItem = (x) => ({
    id: x.id,
    req: typeof x.req === 'string' ? x.req.slice(0, 48) : null,
    issue: typeof x.issue === 'number' && isFinite(x.issue) ? x.issue : null,
    type: TYPES[x.type] ? x.type : (x.type === 'task' ? 'task' : 'question'),
    title: String(x.title || 'Разбор').slice(0, 160),
    at: Date.parse(x.at) || 0,
    md: x.md,
    cfg: x.cfg && typeof x.cfg === 'object' && Array.isArray(x.cfg.lines) ? x.cfg : null,
    cfgName: typeof x.cfgName === 'string' ? x.cfgName.slice(0, 80) : null,
    links: Array.isArray(x.links) ? x.links.filter((l) => Array.isArray(l) && typeof l[0] === 'string' && typeof l[1] === 'string' && /^[\w.\-]+$/.test(l[1])).slice(0, 8) : []
  });
  try { const c = JSON.parse(localStorage.getItem('shk:rz') || 'null'); if (c && Array.isArray(c.items)) { Y.file = c.items.filter(okItem).map(normItem); Y.last = c.at || 0; } } catch (e) { /* ignore */ }
  Y.items = () => {
    const m = new Map();
    Y.file.concat(Y.db).forEach((x) => { if (!m.has(x.id) || m.get(x.id).at < x.at) m.set(x.id, x); });
    return Array.from(m.values()).sort((a, b) => b.at - a.at);
  };
  Y.unread = () => Y.items().filter((x) => !store.data.seen[x.id]);
  Y.byReq = (rid) => Y.items().find((x) => x.req === rid);
  const announce = (before) => {
    const fresh = Y.items().filter((x) => !before.has(x.id) && !store.data.seen[x.id]);
    if (fresh.length && Y.announced) {
      S.toast(fresh.length === 1 ? 'Новый разбор от Claude!' : `Новых разборов: ${fresh.length}`, { label: 'Открыть', run: () => S.go(fresh.length === 1 ? 'claude.' + fresh[0].id : 'claude') });
      if (S.rpg) S.rpg.sfx('ach');
    }
    Y.announced = true;
    S.bus.emit('rz');
  };
  Y.refresh = async (force) => {
    if (Y.busy) return;
    if (!force && Date.now() - Y.last < 60000 && Y.file.length) return;
    if (location.protocol === 'file:') { if (Y.err !== 'file') { Y.err = 'file'; S.bus.emit('rz'); } return; }
    Y.busy = true; S.bus.emit('rz');
    const before = new Set(Y.items().map((x) => x.id));
    try {
      const r = await fetch('razbory/index.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('http ' + r.status);
      const j = await r.json();
      Y.file = (Array.isArray(j.items) ? j.items : []).filter(okItem).map(normItem);
      Y.last = Date.now(); Y.err = null;
      try { localStorage.setItem('shk:rz', JSON.stringify({ at: Y.last, items: j.items })); } catch (e) { /* ignore */ }
      Y.matchIssues(j.issues);
    } catch (e) { Y.err = navigator.onLine === false ? 'offline' : 'fail'; }
    Y.busy = false;
    announce(before);
  };
  /* номера issue, которые Claude связал с заявками */
  Y.matchIssues = (map) => {
    if (!map || typeof map !== 'object') return;
    let n = 0;
    Object.entries(map).forEach(([rid, num]) => { const s = store.data.sent[rid]; if (s && !s.issue && typeof num === 'number') { s.issue = num; n++; } });
    if (n) store.touch();
  };
  S.bus.on('db', (db) => {
    try {
      db.collection('razbory').onSnapshot((snap) => {
        const before = new Set(Y.items().map((x) => x.id));
        Y.db = snap.docs.map((d) => Object.assign({ id: d.id }, d.data())).filter(okItem).map(normItem);
        announce(before);
      }, () => { /* без живых разборов */ });
    } catch (e) { /* ignore */ }
  });
  S.bus.on('rz', () => {
    const n = Y.unread().length;
    const pip = S.$('[data-rzpip]'); if (pip) pip.hidden = !n;
    S.$$('[data-rzcnt]').forEach((c) => { c.hidden = !n; c.textContent = n; });
    const ib = S.$('#inboxBtn'); if (ib) ib.setAttribute('aria-label', n ? `Разборы от Claude: новых ${n}` : 'Разборы от Claude');
  });
  S.bus.on('boot', () => {
    S.bus.emit('rz');
    setTimeout(() => Y.refresh(true), 1800);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') Y.refresh(false); });
  });

  /* ---------- экран «Разборы» ---------- */
  const typeIcon = (t) => { const v = TYPES[t] || { ic: 'sparkle', c1: '#bf3989', c2: '#ff80c8' }; return `<span class="ti" style="background:linear-gradient(135deg,${v.c1},${v.c2})">${S.icon(v.ic)}</span>`; };
  const typeName = (t) => t === 'task' ? 'Задание' : (TYPES[t] ? TYPES[t].t : 'Разбор');
  const navHTML = (cur) => {
    const n = Y.items().length, mine = Object.keys(store.data.sent).length;
    const tabs = [['claude', 'Разборы', 'inbox', n], ['claude.sent', 'Мои заявки', 'send', mine], ['claude.how', 'Как это работает', 'info', null]];
    if (S.env === 'artifact') tabs.push(['ai', 'Чат', 'chat', null]);
    return `<nav class="tabs-in" aria-label="Разборы" style="margin-bottom:16px">${tabs.map(([r, t, ic, c]) => `<a href="#${r}" data-go="${r}" aria-selected="${r === cur}">${S.icon(ic)}${t}${c != null ? ` <span class="counter">${c}</span>` : ''}</a>`).join('')}</nav>`;
  };
  Y.navHTML = navHTML;
  const headHTML = () => `<div class="page-head"><div class="row" style="align-items:flex-start;gap:14px;flex-wrap:nowrap"><span class="cmt"><span class="who cl" style="width:48px;height:48px">${S.icon('sparkle')}</span></span><div style="min-width:0;flex:1"><h1 class="h1">Разборы от Claude</h1><p class="muted" style="margin-top:4px">Отправь щит, вопрос, фото или прогресс — Claude разберёт в чате, а ответ сохранится здесь навсегда.</p></div></div><div class="row" style="margin-top:12px"><button class="btn game" type="button" data-compose>${S.icon('send')}Отправить на разбор</button><button class="btn" type="button" data-refresh>${S.icon('refresh')}${Y.busy ? 'Проверяю…' : 'Проверить новые'}</button></div></div>`;
  const statusLine = () => {
    if (Y.err === 'file') return '<p class="small muted">Открыто файлом: разборы видны на сайте или внутри Claude.</p>';
    if (Y.err === 'offline') return '<p class="small muted">Нет интернета — показаны сохранённые разборы.</p>';
    if (Y.err === 'fail') return '<p class="small muted">Не удалось проверить новые разборы. Показаны сохранённые.</p>';
    return Y.last ? `<p class="small muted">Проверено ${esc(S.ago(Y.last))}.</p>` : '';
  };
  const rowHTML = (x) => {
    const unread = !store.data.seen[x.id];
    return `<a class="issue" href="#claude.${x.id}" data-go="claude.${x.id}">${S.icon(unread ? 'issue' : 'done2', unread ? 'new' : 'closed')}<span style="min-width:0"><b>${esc(x.title)}</b><span>${esc(typeName(x.type))} · Claude · ${x.at ? esc(S.ago(x.at)) : ''}${x.issue ? ` · #${x.issue}` : ''}</span></span>${unread ? '<span class="badge info">новый</span>' : ''}</a>`;
  };
  const sentRow = (s) => {
    const z = Y.byReq(s.id);
    const via = s.via === 'github' ? 'через GitHub' : s.via === 'db' ? 'в приложении' : 'кодом в чат';
    return `<${z ? `a href="#claude.${z.id}" data-go="claude.${z.id}"` : 'div'} class="issue">${S.icon(z ? 'done2' : 'issue', z ? 'closed' : 'open')}<span style="min-width:0"><b>${esc(s.title)}</b><span>${esc(typeName(s.type))} · ${esc(S.ago(s.at))} · ${via}${s.issue ? ` · #${s.issue}` : ''}</span></span>${z ? '<span class="badge done">разобрано</span>' : '<span class="badge ok">ждёт</span>'}</${z ? 'a' : 'div'}>`;
  };
  S.view('claude', {
    tab: 'claude', top: (arg) => !arg || arg === 'sent' || arg === 'how',
    parent: 'claude',
    render(arg) {
      if (arg && arg !== 'sent' && arg !== 'how') return detail(arg);
      const items = Y.items();
      if (arg === 'sent') {
        const sent = Object.values(store.data.sent).sort((a, b) => b.at - a.at);
        return `<div class="wrap">${headHTML()}${navHTML('claude.sent')}${sent.length ? `<div class="list">${sent.map(sentRow).join('')}</div>` : `<div class="empty">${S.icon('send')}Ты ещё ничего не отправлял. Нажми «Отправить на разбор».</div>`}<div style="margin-top:10px">${statusLine()}</div></div>`;
      }
      if (arg === 'how') return `<div class="wrap">${headHTML()}${navHTML('claude.how')}${howHTML()}</div>`;
      const unread = items.filter((x) => !store.data.seen[x.id]).length;
      return `<div class="wrap">${headHTML()}${navHTML('claude')}
        ${items.length ? `<div class="list"><div class="list-head">${S.icon('inbox')}<b>${unread ? `${unread} ${S.plural(unread, 'новый', 'новых', 'новых')}` : 'Все прочитаны'}</b><span class="muted">· всего ${items.length}</span></div>${items.map(rowHTML).join('')}</div>` : `<div class="empty">${S.icon('inbox')}Пока разборов нет. Отправь первый — щит из конструктора, вопрос или фото щита.<div style="margin-top:12px"><button class="btn primary" type="button" data-compose>${S.icon('send')}Отправить на разбор</button></div></div>`}
        <div style="margin-top:10px">${statusLine()}</div></div>`;
    },
    mount(root) {
      root.addEventListener('click', (e) => {
        if (e.target.closest('[data-compose]')) { Y.compose(); return; }
        if (e.target.closest('[data-refresh]')) { Y.refresh(true); return; }
        const op = e.target.closest('[data-opencfg]');
        if (op) { const x = Y.items().find((i) => i.id === op.dataset.opencfg); if (x && x.cfg) S.loadIntoBuilder(Object.assign({ name: x.cfgName || 'Щит от Claude' }, x.cfg)); return; }
        const re = e.target.closest('[data-reply]');
        if (re) { const x = Y.items().find((i) => i.id === re.dataset.reply); Y.compose({ type: 'question', title: 'Уточнение: ' + (x ? x.title : ''), ref: re.dataset.reply }); }
      });
      const sig = () => [Y.items().map((x) => x.id + (store.data.seen[x.id] ? '+' : '-')).join(','), Object.keys(store.data.sent).length, Y.busy, Y.err, Math.floor(Y.last / 60000)].join('|');
      const shown = sig();
      const onRz = () => { if (S.current.name === 'claude' && sig() !== shown) S.softRender(); };
      S.bus.on('rz', onRz);
      S.cleanup.push(() => S.bus.off('rz', onRz));
      if (!S.current.arg) Y.refresh(false);
      const z = Y.items().find((x) => x.id === S.current.arg);
      if (z && !store.data.seen[z.id]) { store.data.seen[z.id] = Date.now(); store.touch(); S.bus.emit('read', z.id); S.bus.emit('rz'); }
    }
  });
  function howHTML() {
    const steps = S.env === 'artifact'
      ? [['send', 'Нажми «Отправить на разбор»', 'Выбери, что отправить: вопрос, щит из конструктора, фото или свой прогресс. Заявка сохранится в приложении.'], ['chat', 'Напиши Claude в чате', 'Например: «Проверь разборы». Claude прочитает заявку и разберёт её.'], ['inbox', 'Ответ появится здесь', 'Разбор сохраняется в разделе «Разборы» навсегда. За прочтение — XP.']]
      : [['send', 'Нажми «Отправить на разбор»', 'Выбери, что отправить: вопрос, щит из конструктора, фото или свой прогресс.'], ['github', 'Подтверди на GitHub', 'Откроется страница новой заявки с готовым текстом. Нажми зелёную кнопку Create. Нужен вход в аккаунт GitHub (тот же, где лежит сайт).'], ['chat', 'Напиши Claude в чате', 'Например: «Проверь разборы». Claude прочитает заявку, разберёт и сохранит ответ в репозиторий сайта.'], ['inbox', 'Ответ появится здесь', 'Через 1–3 минуты после ответа разбор появится в этом разделе (кнопка «Проверить новые»). Если Claude исправил щит — откроешь его в конструкторе.']];
    return `<div class="stack"><ol class="list" style="padding:0;margin:0;list-style:none">${steps.map(([ic, t, d], i) => `<li class="setting"><span class="type-card"><span class="ti" style="background:linear-gradient(135deg,var(--lvl-a),var(--lvl-b))">${S.icon(ic)}</span></span><span class="t"><b>${i + 1}. ${t}</b><span>${d}</span></span></li>`).join('')}</ol>
      <div class="box skill"><div class="lbl">${S.icon('copy')}Без GitHub</div><p>Нажми «Скопировать для чата с Claude» и вставь текст в сообщение — в нём есть код заявки, Claude его прочитает.</p></div>
      ${S.env !== 'artifact' ? `<div class="box warn"><div class="lbl">${S.icon('lock')}Что видно другим</div><p>Заявки и разборы лежат в открытом репозитории <a href="https://github.com/${S.REPO}" target="_blank" rel="noopener">${S.REPO}</a> — их может прочитать любой. Не пиши адреса, телефоны и другие личные данные. Твой прогресс туда не попадает, пока ты сам его не отправишь.</p></div>` : ''}
      <div class="box tip"><div class="lbl">${S.icon('shield')}Чужие не помешают</div><p>Приложение показывает только разборы из файла в репозитории, а менять его можешь только ты (и Claude по твоей просьбе). Заявки от посторонних Claude не разбирает.</p></div></div>`;
  }
  function detail(id) {
    const x = Y.items().find((i) => i.id === id);
    if (!x) {
      const s = store.data.sent[id];
      if (s) return `<div class="wrap">${navHTML('claude.sent')}<div class="page-head"><h1 class="h1">${esc(s.title)}</h1><div class="row"><span class="badge ok">${S.icon('issue')}ждёт разбора</span><span class="small muted">${esc(typeName(s.type))} · ${esc(S.ago(s.at))}</span></div></div>${s.text ? `<div class="card md">${S.md(s.text)}</div>` : ''}<p class="small muted" style="margin-top:12px">Напиши Claude в чате: «Проверь разборы». Ответ появится здесь.</p></div>`;
      return `<div class="wrap"><div class="empty">${S.icon('inbox')}Разбор не найден. Возможно, он ещё не загрузился. <a href="#claude" data-go="claude">Все разборы</a></div></div>`;
    }
    const s = x.req ? store.data.sent[x.req] : null;
    const me = s ? `<div class="cmt"><span class="who">${S.rpg.avatar(40)}</span><div class="body"><div class="ch"><b>${esc(S.rpg.nick())}</b> отправил ${esc(S.ago(s.at))}</div><div class="cb md"><p><b>${esc(s.title)}</b></p>${s.text ? S.md(s.text) : ''}</div></div></div>` : '';
    return `<div class="wrap">
      <nav class="crumbs" aria-label="Навигация"><a href="#claude" data-go="claude">Разборы</a><span>/</span><span>${esc(typeName(x.type))}</span></nav>
      <div class="page-head" style="margin-top:8px"><h1 class="h1">${esc(x.title)}${x.issue ? ` <span class="muted" style="font-weight:400">#${x.issue}</span>` : ''}</h1><div class="row"><span class="badge fill-done">${S.icon('done2')}разобрано</span><span class="small muted">Claude · ${x.at ? esc(new Date(x.at).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })) : ''}</span></div></div>
      <div class="tl">${me}<div class="cmt"><span class="who cl">${S.icon('sparkle')}</span><div class="body cl"><div class="ch"><b>Claude</b> ответил${x.at ? ' ' + esc(S.ago(x.at)) : ''}<span class="spacer"></span><span class="badge">${esc(typeName(x.type))}</span></div><div class="cb md">${S.md(x.md)}</div></div></div></div>
      <div class="row" style="margin-top:16px">${x.cfg ? `<button class="btn primary" type="button" data-opencfg="${esc(x.id)}">${S.icon('panel')}Открыть щит в конструкторе</button>` : ''}${x.links.map(([t, r]) => `<a class="btn" href="#${r}" data-go="${r}">${S.icon('next')}${esc(t)}</a>`).join('')}<button class="btn" type="button" data-reply="${esc(x.id)}">${S.icon('chat')}Задать уточнение</button>${x.issue ? `<a class="btn ghost" href="https://github.com/${S.REPO}/issues/${x.issue}" target="_blank" rel="noopener">${S.icon('github')}На GitHub</a>` : ''}</div>
    </div>`;
  }
})();
