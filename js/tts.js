/* Школа щитовика — «Слушать»: страница превращается в чистый текст для озвучки и читается голосом */
(function () {
  'use strict';
  const S = window.SHK;
  const esc = S.esc;
  const T = (S.tts = {});

  /* ---------- как читать сокращения, единицы и знаки ---------- */
  /* \b в JavaScript не видит русские буквы, поэтому границы слов задаём сами (без lookbehind — для старых iPhone) */
  const WL = 'A-Za-zА-Яа-яЁё0-9';
  const NB = '(?![' + WL + '])';
  const W = (src, to) => [new RegExp('(^|[^' + WL + '])(?:' + src + ')' + NB, 'g'), (m, pre, ...g) => pre + (typeof to === 'function' ? to(...g) : to)];
  const U = (src, to, tail) => [new RegExp('(\\d)\\s?(?:' + src + ')' + (tail || NB), 'g'), '$1 ' + to];
  const PUNCT = '(?=[.,;:!?)]|\\s*$)';
  const WORDS = [
    // составные единицы — раньше простых
    [/кВт\s?·\s?ч/g, 'киловатт-час'], [/кВ·А|кВА/g, 'киловольт-ампер'], [/квар/g, 'киловар'],
    [/мм²|мм2(?![0-9])/g, 'квадратных миллиметров'], [/м²/g, 'квадратных метров'], [/м³/g, 'кубических метров'],
    U('кВт', 'киловатт'), U('МВт', 'мегаватт'), U('Вт', 'ватт'), U('кВ', 'киловольт'), U('В', 'вольт'),
    U('мА', 'миллиампер'), U('кА', 'килоампер'), U('А', 'ампер'), U('МОм', 'мегаом'), U('мОм', 'миллиом'), U('Ом', 'ом'), U('Гц', 'герц'),
    U('мс', 'миллисекунд'), U('мм', 'миллиметров'), U('см', 'сантиметров'), U('км', 'километров'), U('м', 'метров'),
    [/(\d)\s?°C/g, '$1 градусов Цельсия'], [/(\d)\s?°/g, '$1 градусов'], [/(\d)\s?%/g, '$1 процентов'],
    U('мес\\.?', 'месяцев', ''), U('мин', 'минут'), U('ч', 'часов', PUNCT), U('с', 'секунд', PUNCT),
    // обозначения
    W('TN-C-S', 'тэ-эн-цэ-эс'), W('TN-C>S', 'тэ-эн-цэ с разделением на тэ-эн-цэ-эс'), W('TN-C', 'тэ-эн-цэ'), W('TN-S', 'тэ-эн-эс'), W('TT', 'тэ-тэ'), W('IT', 'ай-ти'),
    W('PEN', 'пэ-е-эн'), W('PE', 'пэ-е'), W('L([123])', (n) => 'эль ' + ['', 'один', 'два', 'три'][n]), W('L', 'эль'), W('N', 'эн'),
    W('IP\\s?(\\d+)', (n) => 'ай-пи ' + n), W('AC', 'эй-си'), W('DC', 'ди-си'), W('CAT', 'кат'), W('LED', 'светодиодные'), W('IΔn', 'и дельта эн'),
    W('([BCD])(\\d{1,3})', (c, n) => ({ B: 'бэ', C: 'цэ', D: 'дэ' }[c] + ' ' + n)),
    W('([1-4])P', (n) => ({ 1: 'однополюсный', 2: 'двухполюсный', 3: 'трёхполюсный', 4: 'четырёхполюсный' }[n])),
    W('QFD(\\d*)', (n) => 'ку-эф-дэ ' + n), W('QF(\\d*)', (n) => 'ку-эф ' + n), W('QD(\\d*)', (n) => 'ку-дэ ' + n), W('QS(\\d*)', (n) => 'ку-эс ' + n),
    W('KM(\\d*)', (n) => 'ка-эм ' + n), W('KV(\\d*)', (n) => 'ка-вэ ' + n), W('KL(\\d*)', (n) => 'ка-эль ' + n), W('KK', 'ка-ка'), W('FV(\\d*)', (n) => 'эф-вэ ' + n),
    W('SB(\\d*)', (n) => 'эс-бэ ' + n), W('HL(\\d*)', (n) => 'аш-эль ' + n), W('XT(\\d*)', (n) => 'икс-тэ ' + n), W('PI(\\d*)', (n) => 'пэ-и ' + n),
    W('ПУЭ', 'пэ-у-э'), W('СП\\s?(\\d+)', (n) => 'свод правил ' + n), W('ПОТЭЭ', 'пэ-о-тэ-э-э'), W('ВРУ', 'вэ-эр-у'), W('ЩУ', 'щэ-у'), W('ЩР', 'щэ-эр'), W('ЩО', 'щэ-о'),
    W('ТП', 'тэ-пэ'), W('ТУ', 'тэ-у'), W('ВЛ', 'вэ-эль'), W('КЗ', 'короткое замыкание'), W('РН', 'реле напряжения'), W('АВР', 'а-вэ-эр'), W('ГЗШ', 'гэ-зэ-ша'),
    W('ДСУП', 'дэ-эс-у-пэ'), W('ОСУП', 'о-эс-у-пэ'), W('КУП', 'ка-у-пэ'), W('ШДУП', 'ша-дэ-у-пэ'), W('СИП', 'сип'), W('АВДТ', 'а-вэ-дэ-тэ'), W('ВА\\s?(\\d)', (n) => 'вэ-а ' + n),
    W('ИБП', 'и-бэ-пэ'), W('НШВИ', 'эн-ша-вэ-и'), W('ПуГВ', 'пэ-у-гэ-вэ'), W('ВВГнг\\(А\\)-LS', 'вэ-вэ-гэ-эн-гэ а-эл-эс'), W('ВВГнг', 'вэ-вэ-гэ-эн-гэ'), W('ВВГ', 'вэ-вэ-гэ'),
    W('FRLS', 'эф-эр-эл-эс'), W('NYM', 'эн-вай-эм'), W('Iн', 'и номинальное'), W('Iк', 'ток короткого замыкания'), W('cos', 'косинус'),
    W('ГОСТ Р', 'гост эр'), W('ГОСТ IEC', 'гост и-е-це'), W('IEC', 'и-е-це'), W('EN', 'е-эн'), W('DIN', 'дин'), W('УГО', 'у-гэ-о'), W('ЕСКД', 'е-эс-ка-дэ'),
    // знаки
    [/≈/g, ' примерно '], [/≤/g, ' не больше '], [/≥/g, ' не меньше '], [/≠/g, ' не равно '], [/±/g, ' плюс-минус '], [/\s=\s/g, ' равно '],
    [/→/g, ', дальше '], [/←/g, ', назад '], [/↔/g, ' и '], [/√\s?3/g, 'корень из трёх'], [/√/g, 'корень из '], [/π/g, 'пи'],
    [/φ/g, 'фи'], [/ρ/g, 'ро'], [/Δ/g, 'дельта '], [/Σ/g, 'сумма '], [/η/g, 'эта'], [/Ø\s?/g, 'диаметр '], [/№\s?/g, 'номер '],
    [/(\d)\s?×\s?(\d)/g, '$1 на $2'], [/×/g, ' умножить на '], [/·/g, ' умножить на '],
    [/(\d+(?:,\d+)?)\s?[–—]\s?(\d)/g, 'от $1 до $2'], [/«|»|"|“|”/g, ''], [/—|–/g, ', '], [/…/g, '...'], [/\s\/\s/g, ' делить на '],
    [/\s{2,}/g, ' ']
  ];
  T.speakable = (s) => {
    let t = String(s || '');
    for (const [re, to] of WORDS) t = t.replace(re, to);
    return t.replace(/\s+([,.;:!?])/g, '$1').replace(/,\s*,/g, ',').trim();
  };
  /* формула словами: «I = U / R» → «И равно У делить на Эр» */
  const LETTERS = { I: 'И', U: 'У', R: 'Эр', P: 'Пэ', Q: 'Ку', S: 'Эс', W: 'Вэ', t: 'тэ', L: 'Эль', Z: 'Зэт', k: 'ка', n: 'эн', s: 'эс', l: 'эль', K: 'Ка', C: 'Цэ', X: 'Икс', f: 'эф', E: 'Е' };
  T.formula = (s) => {
    let t = String(s || '').replace(/\s+/g, ' ');
    t = t.replace(/=/g, ' равно ').replace(/\//g, ' делить на ').replace(/·|×|\*/g, ' умножить на ').replace(/\+/g, ' плюс ').replace(/−|-(?=\s)/g, ' минус ').replace(/²/g, ' в квадрате').replace(/³/g, ' в кубе');
    t = t.replace(/\(/g, ', скобка, ').replace(/\)/g, ', закрыть скобку,');
    t = t.replace(/\b([A-Za-z])(?=[\s,\u2080-\u2089\d]|$)/g, (m, c) => LETTERS[c] || c);
    return T.speakable(t).replace(/,\s*,/g, ',').replace(/\s{2,}/g, ' ');
  };

  /* ---------- текст из разметки ---------- */
  const SKIP = 'button,.btn,nav,.crumbs,.tabs-in,input,select,textarea,script,style,.zoombar,.svgbox,.calc-out,[data-calc],.legend,.lesson-nav,[data-notts],[data-qres],.expl,.opts,svg,.badge.xp,.stars';
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const endDot = (s) => (s = clean(s)) ? (/[.!?:…]$/.test(s) ? s : s + '.') : '';
  T.fromElement = (root) => {
    const out = [];
    let buf = '';
    const flush = () => { const t = clean(buf); if (t) out.push(endDot(t)); buf = ''; };
    const push = (t) => { t = clean(t); if (t) out.push(endDot(t)); };
    const inline = (el) => {
      let t = '';
      el.childNodes.forEach((n) => {
        if (n.nodeType === 3) t += n.textContent;
        else if (n.nodeType === 1 && !n.matches(SKIP)) t += n.tagName === 'BR' ? '. ' : n.tagName === 'SUB' ? ' ' + n.textContent : inline(n);
      });
      return t;
    };
    const table = (tb) => {
      const head = Array.from(tb.querySelectorAll('thead th')).map((th) => clean(th.textContent));
      Array.from(tb.querySelectorAll('tbody tr')).forEach((tr) => {
        const cells = Array.from(tr.children).map((td) => clean(inline(td)));
        push(cells.map((c, i) => (head[i] && i > 0 ? head[i] + ': ' : '') + c).join('; '));
      });
      const cap = tb.querySelector('caption'); if (cap) push(cap.textContent);
    };
    const walk = (node) => {
      node.childNodes.forEach((el) => {
        if (el.nodeType === 3) { buf += el.textContent; return; }
        if (el.nodeType !== 1 || el.matches(SKIP)) return;
        const tag = el.tagName;
        if (/^H[1-6]$/.test(tag)) { flush(); push(inline(el)); return; }
        if (tag === 'FIGURE') { flush(); const cap = el.querySelector('figcaption'); if (cap) push('На рисунке: ' + cap.textContent); return; }
        if (tag === 'TABLE') { flush(); table(el); return; }
        if (tag === 'LI') { flush(); push(inline(el)); return; }
        if (tag === 'DT') { flush(); buf = inline(el) + ' — '; return; }
        if (tag === 'DD') { buf += inline(el); flush(); return; }
        if (el.classList.contains('fx')) { flush(); push('Формула: ' + T.formula(el.textContent)); return; }
        if (el.classList.contains('box')) {
          flush();
          const lbl = el.querySelector(':scope > .lbl');
          if (lbl) push(lbl.textContent);
          Array.from(el.children).forEach((c) => { if (c !== lbl) { if (c.matches('ul,ol')) walk(c); else push(inline(c)); } });
          return;
        }
        if (/^(P|DIV|SECTION|ARTICLE|UL|OL|BLOCKQUOTE|DL|DETAILS|SUMMARY|MAIN|HEADER|FIGCAPTION)$/.test(tag)) { flush(); walk(el); flush(); return; }
        buf += inline(el);
      });
    };
    walk(root);
    flush();
    return out;
  };
  T.fromHTML = (html) => { const d = document.createElement('div'); d.innerHTML = html; return T.fromElement(d); };
  T.quizText = (qs) => {
    const out = ['Проверь себя. Сначала вопросы, ответы — после паузы.'];
    qs.forEach((q, i) => {
      out.push(endDot(`Вопрос ${i + 1}: ${S.strip(q.q)}`));
      out.push(endDot('Варианты: ' + q.a.map((a, j) => `${'абвгде'[j]}) ${S.strip(a)}`).join('; ')));
    });
    out.push('Ответы.');
    qs.forEach((q, i) => out.push(endDot(`Вопрос ${i + 1}: правильный ответ — ${S.strip(q.a[q.c])}. ${S.strip(q.e || '')}`)));
    return out;
  };

  /* ---------- окно «Слушать» ---------- */
  const synth = () => (typeof window.speechSynthesis !== 'undefined' ? window.speechSynthesis : null);
  let state = { parts: [], i: 0, playing: false, rate: 1, voice: null, gen: 0 };
  const ruVoice = () => {
    const sy = synth(); if (!sy) return null;
    const vs = sy.getVoices().filter((v) => /^ru(-|_|$)/i.test(v.lang));
    return vs.find((v) => /Google|Milena|Yuri|Irina|Pavel|Svetlana|Dmitry/i.test(v.name)) || vs[0] || null;
  };
  const chunks = (paras) => {
    const out = [];
    paras.forEach((p, pi) => {
      const sents = p.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || [p];
      let cur = '';
      sents.forEach((s) => { if ((cur + s).length > 220 && cur) { out.push({ t: cur.trim(), p: pi }); cur = ''; } cur += s; });
      if (cur.trim()) out.push({ t: cur.trim(), p: pi });
    });
    return out;
  };
  T.stop = () => { const sy = synth(); state.gen++; state.playing = false; if (sy) sy.cancel(); };
  S.cleanup = S.cleanup || [];
  T.open = (title, paras) => {
    T.stop();
    const spoken = paras.map(T.speakable);
    const plain = paras.join('\n\n');
    const sy = synth();
    state = { parts: chunks(spoken), i: 0, playing: false, rate: Number(localStorage.getItem('shk:ttsRate')) || 1, voice: null, gen: 0 };
    const body = S.sheet(`${S.icon('volume')} Слушать: ${esc(title)}`, `<div class="stack">
      ${sy ? `<div class="tts-bar"><button class="btn primary" type="button" data-tts-play>${S.icon('play')}Слушать</button><button class="btn" type="button" data-tts-stop>${S.icon('stop')}Стоп</button>
        <label class="small muted" for="ttsRate">Скорость</label><input id="ttsRate" type="range" min="0.6" max="1.8" step="0.1" value="${state.rate}" style="flex:1;min-width:90px;accent-color:var(--accent)"><span class="mono small" data-tts-rate>${state.rate.toFixed(1)}×</span></div>
        <div class="bar" aria-hidden="true"><i data-tts-prog style="width:0%"></i></div>
        <p class="small muted" data-tts-status>Нажми «Слушать». Голос берётся из настроек телефона.</p>` : '<div class="flash warn">В этом браузере нет встроенной озвучки. Скопируй текст и вставь в любое приложение для чтения вслух.</div>'}
      <div class="row"><button class="btn" type="button" data-tts-copy>${S.icon('copy')}Скопировать текст</button><button class="btn" type="button" data-tts-save>${S.icon('download')}Скачать .txt</button><label class="check small" style="align-items:center"><input type="checkbox" id="ttsPlain"><span>Сокращения как есть</span></label></div>
      <textarea class="inp" id="ttsText" readonly style="min-height:40vh;font-size:14px;line-height:1.6">${esc(spoken.join('\n\n'))}</textarea>
      <p class="small muted">Текст уже подготовлен для озвучки: сокращения, единицы и формулы расписаны словами. Галочка «Сокращения как есть» вернёт обычный вид.</p></div>`, {
      mount(b) {
        const ta = b.querySelector('#ttsText');
        const status = b.querySelector('[data-tts-status]'), prog = b.querySelector('[data-tts-prog]');
        const playBtn = b.querySelector('[data-tts-play]');
        const setBtn = () => { if (playBtn) playBtn.innerHTML = state.playing ? S.icon('stop') + 'Пауза' : S.icon('play') + (state.i ? 'Дальше' : 'Слушать'); };
        const speak = () => {
          const g = state.gen;
          if (state.i >= state.parts.length) { state.playing = false; state.i = 0; setBtn(); if (status) status.textContent = 'Прочитано до конца.'; if (prog) prog.style.width = '100%'; return; }
          const part = state.parts[state.i];
          const u = new SpeechSynthesisUtterance(part.t);
          u.lang = 'ru-RU'; u.rate = state.rate;
          state.voice = state.voice || ruVoice(); if (state.voice) u.voice = state.voice;
          u.onend = () => { if (g !== state.gen || !state.playing) return; state.i++; speak(); };
          u.onerror = () => { if (g !== state.gen) return; state.playing = false; setBtn(); if (status) status.textContent = 'Озвучка прервалась. Нажми «Дальше» или скопируй текст.'; };
          if (status) status.textContent = `Фрагмент ${state.i + 1} из ${state.parts.length}`;
          if (prog) prog.style.width = Math.round(state.i / state.parts.length * 100) + '%';
          sy.speak(u);
        };
        if (playBtn) playBtn.addEventListener('click', () => {
          if (state.playing) { state.gen++; state.playing = false; sy.cancel(); setBtn(); return; }
          if (!ruVoice() && status) status.textContent = 'Русский голос не найден — будет голос по умолчанию. Можно скопировать текст в приложение озвучки.';
          state.playing = true; state.gen++; sy.cancel(); setBtn(); speak();
        });
        const stopBtn = b.querySelector('[data-tts-stop]');
        if (stopBtn) stopBtn.addEventListener('click', () => { T.stop(); state.i = 0; setBtn(); if (prog) prog.style.width = '0%'; if (status) status.textContent = 'Остановлено.'; });
        const rate = b.querySelector('#ttsRate');
        if (rate) rate.addEventListener('input', () => { state.rate = Number(rate.value); b.querySelector('[data-tts-rate]').textContent = state.rate.toFixed(1) + '×'; try { localStorage.setItem('shk:ttsRate', String(state.rate)); } catch (e) { /* ignore */ } });
        b.querySelector('#ttsPlain').addEventListener('change', (e) => { ta.value = e.target.checked ? plain : spoken.join('\n\n'); });
        b.querySelector('[data-tts-copy]').addEventListener('click', () => S.copy(ta.value, 'Текст скопирован — вставь в приложение озвучки'));
        b.querySelector('[data-tts-save]').addEventListener('click', () => S.saveFile((title.replace(/[^\wА-Яа-яЁё -]+/g, '').trim().replace(/\s+/g, '_') || 'lekciya') + '.txt', ta.value, 'text/plain;charset=utf-8'));
        if (sy && sy.getVoices().length === 0 && 'onvoiceschanged' in sy) sy.onvoiceschanged = () => { state.voice = ruVoice(); };
      }
    });
    const bg = S.$('#sheetBg');
    if (bg) bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-close]')) T.stop(); });
  };
  /* кнопка в шапке страницы */
  T.btn = (label) => `<button class="btn sm" type="button" data-tts>${S.icon('volume')}${label || 'Слушать'}</button>`;
  T.handlers = {}; // имя экрана → функция (arg) => { title, paras }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tts]');
    if (!b) return;
    const h = T.handlers[S.current.name];
    const data = h ? h(S.current.arg) : null;
    if (data && data.paras.length) T.open(data.title, data.paras);
    else { const v = S.$('#view'); const h1 = v.querySelector('h1'); T.open(h1 ? clean(h1.textContent) : 'Страница', T.fromElement(v)); }
  });
  S.bus.on('route', () => T.stop());
})();
