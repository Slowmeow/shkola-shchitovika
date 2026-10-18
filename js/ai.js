/* Школа щитовика — ИИ-помощник: чат, разбор фото щита, проверка проекта */
(function () {
  'use strict';
  const S = window.SHK;
  const esc = S.esc;
  const A = (S.ai = { sample: null, limits: null, state: 'loading', turns: [], busy: false, ctl: null });

  A.RULES = [
    'Ты — опытный российский электрик-наставник и сборщик электрощитов.',
    'Ученик — помощник электрика с двухлетним опытом: умеет зачищать и обжимать провода, ставить розетки и выключатели, прокладывать кабель. Сейчас учится собирать щиты от простых до сложных.',
    'Отвечай по-русски, на «ты», простыми словами, коротко и по делу. Если нужен расчёт — покажи формулу и подставь цифры.',
    'Опирайся на ПУЭ (действующие главы 6-го и 7-го изданий), СП 256.1325800.2016, ГОСТ Р 50571, ГОСТ IEC 60898-1, 61008-1, 61009-1, ПОТЭЭ (приказ Минтруда № 903н). Номер пункта называй, только если уверен; если не уверен — скажи об этом.',
    'Если речь о работе на действующем оборудовании — напомни: отключить, исключить включение, проверить отсутствие напряжения указателем.',
    'Не выдумывай характеристики конкретных моделей — советуй сверить с паспортом и маркировкой на корпусе.',
    'Формат: короткие абзацы и списки. Заголовки — строкой с жирным текстом. Без таблиц.'
  ].join('\n');

  A.init = async () => {
    if (!window.claude || typeof window.claude.use !== 'function') { A.state = 'absent'; return; }
    try {
      const s = await window.claude.use('sample');
      if (!s) { A.state = 'absent'; return; }
      A.sample = s;
      try { A.limits = await s.limits(); } catch (e) { A.limits = null; }
      A.state = 'ready';
    } catch (e) { A.state = 'absent'; }
    try { const saved = JSON.parse(localStorage.getItem('shk:chat') || '[]'); if (Array.isArray(saved)) A.turns = saved.slice(-20); } catch (e) { /* ignore */ }
    if (S.current && S.current.name === 'ai') S.softRender();
  };
  const saveTurns = () => { try { localStorage.setItem('shk:chat', JSON.stringify(A.turns.slice(-20))); } catch (e) { /* ignore */ } };

  const ERR = {
    not_granted: 'Помощнику не разрешено обращаться к Claude. Разреши доступ в окне запроса или в меню разрешений артефакта.',
    sampling_disabled: 'Claude недоступен для этого аккаунта.',
    rate_limited: 'Слишком много запросов или закончился лимит. Попробуй чуть позже.',
    session_expired: 'Нужно заново войти в Claude.',
    image_rejected: 'Это фото не подошло: попробуй другой файл (JPG, PNG или WebP поменьше).',
    images_unavailable: 'Отправка фото здесь недоступна.',
    refused: 'Claude не стал отвечать на этот запрос. Переформулируй вопрос.',
    prompt_too_large: 'Слишком длинный запрос. Сократи текст.',
    empty_completion: 'Пустой ответ. Попробуй спросить по-другому.',
    upstream_error: 'Сбой связи. Попробуй ещё раз.'
  };
  A.errText = (e) => ERR[e && e.code] || 'Что-то пошло не так. Попробуй ещё раз.';

  /* рендер ответов — общий безопасный markdown */
  A.md = (src) => S.md(src);

  /* общий вызов с потоковым выводом */
  A.ask = async (input, opts, bubble) => {
    if (!A.sample) throw { code: 'not_granted' };
    A.ctl = new AbortController();
    A.busy = true;
    bubble.innerHTML = '<span class="thinking" aria-label="Думаю"><i></i><i></i><i></i></span>';
    try {
      const res = await A.sample(input, Object.assign({ signal: A.ctl.signal, cache: false, onText: ({ text }) => { bubble.innerHTML = A.md(text); } }, opts || {}));
      bubble.innerHTML = A.md(res.text) + (res.truncated ? '<p class="small muted">Ответ обрезан — спроси уже, по частям.</p>' : '');
      return res.text;
    } finally { A.busy = false; A.ctl = null; }
  };

  S.view('ai', {
    tab: 'claude', top: true,
    render() {
      const avail = A.state;
      const chips = ['Чем УЗО отличается от дифавтомата?', 'Почему нельзя объединять нули разных УЗО?', 'Какой автомат и кабель на бойлер 2 кВт в 15 м?', 'Как подключить трёхфазный счётчик?', 'Что делать, если УЗО выбивает без причины?', 'Объясни селективность простыми словами', 'Какие документы нужны после сборки щита?'];
      return `<div class="wrap"><div class="page-head"><h1 class="h1">Чат с Claude</h1><p class="muted">Быстрые ответы с опорой на ПУЭ и СП 256. Можно прислать фото щита — разберёт, что за аппараты и как их подключить. Ответы чата не сохраняются в «Разборах» — для разбора с сохранением нажми «Отправить на разбор».</p></div>${S.sync ? S.sync.navHTML('ai') : ''}
      ${avail === 'absent' ? `<div class="box warn"><div class="lbl">${S.icon('info')}Помощник недоступен</div><p>Помощник работает, когда приложение открыто внутри Claude — в приложении Claude на телефоне или на claude.ai. Всё остальное (курс, справочник, конструктор, игры) работает и так.</p></div>` : ''}
      ${avail === 'loading' ? '<div class="empty">Подключаю помощника…</div>' : ''}
      <div class="stack" ${avail === 'ready' ? '' : 'hidden'}>
        <div class="tabs-in" role="tablist"><button type="button" role="tab" aria-selected="true" data-mode="chat">${'Чат'}</button><button type="button" role="tab" aria-selected="false" data-mode="photo">Разбор фото щита</button></div>
        <div data-pane="chat" class="stack">
          <div class="chips">${chips.map((c) => `<button type="button" class="chip" data-q="${esc(c)}">${esc(c)}</button>`).join('')}</div>
          <div class="chat" id="chatLog">${A.turns.length ? A.turns.map((t) => t.role === 'user' ? `<div class="msg me">${esc(t.content)}</div>` : `<div class="msg ai">${A.md(t.content)}</div>`).join('') : '<div class="muted small">Задай вопрос — про щиты, нормы, расчёты или конкретную ситуацию на объекте.</div>'}</div>
          <div class="row"><span class="small muted">Каждый вопрос тратит лимиты твоего аккаунта Claude.</span><span class="spacer"></span>${A.turns.length ? '<button type="button" class="btn sm ghost" data-clear>Очистить чат</button>' : ''}</div>
          <form class="composer" id="chatForm"><label for="chatIn" class="small" style="position:absolute;left:-9999px">Вопрос</label><textarea id="chatIn" rows="1" placeholder="Например: какой вводной на 15 кВт три фазы?"></textarea><button class="btn primary" type="submit" id="chatSend" aria-label="Отправить">${S.icon('send')}</button><button class="btn" type="button" id="chatStop" hidden aria-label="Остановить">${S.icon('stop')}</button></form>
        </div>
        <div data-pane="photo" class="stack" hidden>
          <div class="card stack">
            <p>Сфотографируй щит так, чтобы были читаемы надписи на аппаратах (можно 2–4 фото: общий вид и крупно). Помощник опишет аппараты, назначение щита и как всё подключить.</p>
            <div class="field"><label for="phIn">Фото щита</label><input class="inp" id="phIn" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple></div>
            <div class="field"><label for="phNote">Что известно (необязательно)</label><input class="inp" id="phNote" type="text" placeholder="Например: офис, 3 фазы, ввод 5×10"></div>
            <div class="row"><button class="btn primary" type="button" id="phGo">${S.icon('camera')}Разобрать фото</button><button class="btn" type="button" id="phStop" hidden>${S.icon('stop')}Стоп</button></div>
            <p class="small muted" id="phHint"></p>
          </div>
          <div class="msg ai" id="phOut" hidden style="max-width:100%"></div>
        </div>
      </div></div>`;
    },
    mount(root) {
      if (A.state !== 'ready') return;
      const log = root.querySelector('#chatLog');
      const inp = root.querySelector('#chatIn');
      const send = root.querySelector('#chatSend');
      const stop = root.querySelector('#chatStop');
      const autosize = () => { inp.style.height = 'auto'; inp.style.height = Math.min(180, inp.scrollHeight) + 'px'; };
      inp.addEventListener('input', autosize);
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); root.querySelector('#chatForm').requestSubmit(); } });
      const go = async (text) => {
        text = (text || '').trim();
        if (!text || A.busy) return;
        if (!A.turns.length) log.innerHTML = '';
        A.turns.push({ role: 'user', content: text });
        log.insertAdjacentHTML('beforeend', `<div class="msg me">${esc(text)}</div><div class="msg ai"></div>`);
        const bubble = log.lastElementChild;
        inp.value = ''; autosize();
        send.hidden = true; stop.hidden = false;
        bubble.scrollIntoView({ block: 'nearest' });
        try {
          const ctx = A.turns.slice(-10);
          const out = await A.ask([{ role: 'user', content: A.RULES }].concat(ctx), {}, bubble);
          A.turns.push({ role: 'assistant', content: out });
          saveTurns();
        } catch (e) {
          if (e && e.code === 'cancelled') { bubble.innerHTML = A.md(e.text || '') + '<p class="small muted">Остановлено.</p>'; if (e.text) A.turns.push({ role: 'assistant', content: e.text }); }
          else { bubble.innerHTML = (e && e.text ? A.md(e.text) : '') + `<p class="small" style="color:var(--bad)">${esc(A.errText(e))}</p>`; A.turns.pop(); }
        }
        send.hidden = false; stop.hidden = true;
      };
      root.querySelector('#chatForm').addEventListener('submit', (e) => { e.preventDefault(); go(inp.value); });
      stop.addEventListener('click', () => { if (A.ctl) A.ctl.abort(); });
      root.addEventListener('click', (e) => {
        const q = e.target.closest('[data-q]');
        if (q) { go(q.dataset.q); return; }
        if (e.target.closest('[data-clear]')) { A.turns = []; saveTurns(); S.render(); return; }
        const m = e.target.closest('[data-mode]');
        if (m) {
          S.$$('[data-mode]', root).forEach((b) => b.setAttribute('aria-selected', String(b === m)));
          S.$$('[data-pane]', root).forEach((p) => { p.hidden = p.dataset.pane !== m.dataset.mode; });
        }
      });
      // разбор фото
      const ph = root.querySelector('#phIn'), out = root.querySelector('#phOut'), goBtn = root.querySelector('#phGo'), stBtn = root.querySelector('#phStop'), hint = root.querySelector('#phHint');
      const lim = A.limits && A.limits.images;
      if (!lim) { goBtn.disabled = true; ph.disabled = true; hint.textContent = 'Отправка фото в этом окне недоступна. Задай вопрос текстом в чате.'; }
      else hint.textContent = `До ${lim.maxCount} фото за раз. Фото уменьшатся автоматически.`;
      goBtn.addEventListener('click', async () => {
        const files = Array.from(ph.files || []).slice(0, lim ? lim.maxCount : 1);
        if (!files.length) { S.toast('Выбери хотя бы одно фото'); return; }
        const note = root.querySelector('#phNote').value.trim();
        const prompt = `${A.RULES}\n\nНа фото — электрический щит (Россия). Сделай разбор для ученика-щитовика.\n1. Какие аппараты видны: тип, серия/производитель (если читается), полюсность, характеристика и номинал, ток утечки. По порядку: сверху вниз, слева направо.\n2. Что это за щит и что он, скорее всего, питает.\n3. Как это правильно подключить: откуда питание, куда фаза, ноль и земля для каждого типа аппарата, где нужны гребёнки и шины N/PE (отдельная N-шина для каждого УЗО).\n4. Что выглядит неправильно или рискованно и что проверить на месте.\nЕсли надпись не читается — так и скажи, не придумывай.${note ? '\n\nЧто известно от ученика: ' + note : ''}`;
        out.hidden = false;
        goBtn.disabled = true; stBtn.hidden = false;
        try { await A.ask(prompt, { images: files, modelTier: 'default' }, out); }
        catch (e) { out.innerHTML = (e && e.text ? A.md(e.text) : '') + `<p style="color:var(--bad)">${esc(A.errText(e))}</p>`; }
        goBtn.disabled = false; stBtn.hidden = true;
      });
      stBtn.addEventListener('click', () => { if (A.ctl) A.ctl.abort(); });
    }
  });

  /* проверка проекта из конструктора */
  A.review = async (R, box) => {
    if (A.state !== 'ready') { box.innerHTML = '<div class="box warn"><div class="lbl">Недоступно</div><p>Проверка работает, когда приложение открыто внутри Claude.</p></div>'; return; }
    box.innerHTML = '<div class="msg ai" style="max-width:100%"></div>';
    const bubble = box.firstChild;
    const txt = S.exportText(R).slice(0, 14000);
    try {
      await A.ask(`${A.RULES}\n\nПроверь проект электрощита, который собрал конструктор в приложении. Найди ошибки и спорные места по ПУЭ и СП 256, предложи улучшения. Отдельно отметь, всё ли верно с нулями под УЗО, сечениями и селективностью. Ответ — коротко, списком.\n\n${txt}`, { modelTier: 'default' }, bubble);
    } catch (e) { bubble.innerHTML = (e && e.text ? A.md(e.text) : '') + `<p style="color:var(--bad)">${esc(A.errText(e))}</p>`; }
  };
})();
