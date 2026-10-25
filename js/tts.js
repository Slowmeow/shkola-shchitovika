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
  const endDot = (s) => (s = clean(s)) ? (/[.!?:…]$/.test(s) ? s : s.replace(/[;,]$/, '') + '.') : '';
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
          if (lbl) push(clean(lbl.textContent).replace(/[.:]?$/, ':'));
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

  /* ---------- окно «Слушать»: плеер с перемоткой, запоминанием места и выбором голоса ---------- */
  const synth = () => (typeof window.speechSynthesis !== 'undefined' ? window.speechSynthesis : null);
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* приватный режим */ } };
  const isRu = (v) => /^ru(-|_|$)/i.test(v.lang);
  // естественнее звучат нейросетевые голоса (Natural, Neural, Enhanced) и сетевые (localService = false)
  const isNatural = (v) => /Natural|Neural|Online|Enhanced|Premium|улучш/i.test(v.name) || v.localService === false;
  const voiceRank = (v) => (/Natural|Neural/i.test(v.name) ? 0 : isNatural(v) ? 1 : /Google|Milena|Yuri|Irina|Pavel|Svetlana|Dmitry/i.test(v.name) ? 2 : 3);
  T.voices = () => {
    const sy = synth(); if (!sy) return [];
    // Edge иногда отдаёт неполные записи вида «Microsoft undefined Online (Natural)» — такие пропускаем
    return sy.getVoices().filter((v) => isRu(v) && v.name && !/undefined/.test(v.name)).sort((a, b) => voiceRank(a) - voiceRank(b) || a.name.localeCompare(b.name));
  };
  const pickVoice = () => {
    const vs = T.voices();
    const saved = lsGet('shk:ttsVoice');
    return vs.find((v) => v.voiceURI === saved) || vs[0] || null;
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
  /* место, где остановился, — своё у каждой страницы; ищем по началу фрагмента, чтобы правка урока не сбивала позицию */
  const POS = 'shk:ttsPos';
  const posAll = () => { try { return JSON.parse(lsGet(POS) || '{}') || {}; } catch (e) { return {}; } };
  const posSave = (key, parts, i) => {
    const all = posAll();
    if (i <= 0 || i >= parts.length) delete all[key];
    else all[key] = { i, s: parts[i].t.slice(0, 60), d: Date.now() };
    Object.keys(all).sort((a, b) => all[b].d - all[a].d).slice(80).forEach((k) => delete all[k]);
    lsSet(POS, JSON.stringify(all));
  };
  const posLoad = (key, parts) => {
    const p = posAll()[key];
    if (!p) return 0;
    let best = -1;
    parts.forEach((x, j) => { if (x.t.slice(0, 60) === p.s && (best < 0 || Math.abs(j - p.i) < Math.abs(best - p.i))) best = j; });
    return best >= 0 ? best : Math.min(p.i, parts.length - 1);
  };
  let state = { parts: [], i: 0, playing: false, gen: 0, key: '' };
  let onVoices = null;
  T.stop = () => { const sy = synth(); state.gen++; state.playing = false; if (sy) sy.cancel(); };
  S.cleanup = S.cleanup || [];

  const HELP = `<details class="acc" data-tts-help><summary>${S.icon('info')}Как сделать голос естественнее</summary><div class="in prose small">
<p>Своих голосов у приложения нет: оно читает тем голосом, который установлен в телефоне или в браузере. Поэтому голос улучшают в настройках устройства, а новый голос сразу появляется здесь в списке «Голос».</p>
<p><b>Android.</b></p>
<ol><li>Открой «Настройки» и найди поиском по настройкам пункт «Синтез речи» или «Преобразование текста в речь». У разных производителей он лежит в разных местах: в «Специальных возможностях» или в разделе «Язык и ввод».</li>
<li>В строке выбора системы синтеза (она называется «Предпочитаемая система» или похоже) выбери систему от Google. Если её нет в списке, найди в Google Play приложение синтеза речи от Google и установи или обнови его.</li>
<li>Нажми на шестерёнку рядом с системой Google, открой «Установка голосовых данных» и выбери «Русский». Если там предложено несколько голосов, послушай каждый и выбери тот, что звучит естественнее; голос, который ещё не загружен, скачай.</li>
<li>Вернись сюда, закрой окно «Слушать» и открой его снова: новый голос появится в списке.</li></ol>
<p><b>iPhone.</b> Открой «Настройки», затем «Универсальный доступ», «Устный контент», «Голоса» и «Русский». Выбери голос, и если для него предложена улучшенная версия, скачай её: после загрузки она обычно появляется в списке «Голос».</p>
<p><b>Компьютер.</b> В браузере Microsoft Edge есть голоса с пометкой «Online (Natural)»: они звучат естественнее всего, но работают только при подключённом интернете. В Chrome естественнее звучит сетевой голос «Google русский».</p>
<p>Голоса, которые обычно звучат естественнее, отмечены в списке звёздочкой и стоят первыми.</p></div></details>`;

  T.open = (title, paras, key) => {
    T.stop();
    const spoken = paras.map(T.speakable);
    const plain = paras.join('\n\n');
    const sy = synth();
    const parts = chunks(spoken);
    const n = parts.length;
    state = { parts, i: 0, playing: false, gen: 0, key: key || 'title:' + title };
    state.i = posLoad(state.key, parts);
    let rate = Number(lsGet('shk:ttsRate')) || 1;
    let voice = null;
    // текст по абзацам; каждый фрагмент — отдельный span, нажатие на него запускает чтение с этого места
    const textHTML = spoken.map((p, pi) => `<p>${parts.map((x, j) => (x.p === pi ? `<span data-c="${j}">${esc(x.t)}</span> ` : '')).join('')}</p>`).join('');
    const ib = (attr, icon, label) => `<button class="btn" type="button" ${attr} aria-label="${label}" title="${label}">${S.icon(icon)}</button>`;
    S.sheet(`${S.icon('volume')} Слушать: ${esc(title)}`, `<div class="stack">
      ${sy && n ? `<div class="tts-bar">${ib('data-tts-pp', 'skipb', 'На абзац назад')}${ib('data-tts-pc', 'prev', 'На фразу назад')}<button class="btn primary" type="button" data-tts-play></button>${ib('data-tts-nc', 'next', 'На фразу вперёд')}${ib('data-tts-np', 'skipf', 'На абзац вперёд')}</div>
        <div><input class="tts-seek" id="ttsPos" type="range" min="0" max="${Math.max(0, n - 1)}" step="1" value="${state.i}" aria-label="Место в тексте">
        <div class="row small muted" style="justify-content:space-between"><span data-tts-where></span><button class="btn sm" type="button" data-tts-restart>${S.icon('refresh')}С начала</button></div></div>
        <p class="small muted" data-tts-status></p>
        <div class="tts-bar"><label class="small muted" for="ttsRate">Скорость</label><input id="ttsRate" type="range" min="0.6" max="1.8" step="0.1" value="${rate}" style="flex:1;min-width:90px;accent-color:var(--accent)"><span class="mono small" data-tts-rate>${rate.toFixed(1)}×</span></div>
        <div class="tts-bar"><label class="small muted" for="ttsVoice">Голос</label><select class="inp" id="ttsVoice" style="flex:1;min-width:0;width:auto"></select><button class="btn" type="button" data-tts-try>${S.icon('volume')}Проба</button></div>
        ${HELP}
        <div class="tts-text" id="ttsView">${textHTML}</div>` : `<div class="flash warn">${sy ? 'На этой странице нет текста для чтения.' : 'В этом браузере нет встроенной озвучки. Скопируй текст и вставь в любое приложение для чтения вслух.'}</div>`}
      <textarea class="inp" id="ttsPlainView" readonly ${sy && n ? 'hidden ' : ''}style="min-height:40vh;font-size:14px;line-height:1.6">${esc(sy && n ? plain : spoken.join('\n\n'))}</textarea>
      <div class="row"><button class="btn" type="button" data-tts-copy>${S.icon('copy')}Скопировать текст</button><button class="btn" type="button" data-tts-save>${S.icon('download')}Скачать .txt</button>${sy && n ? '<label class="check small" style="align-items:center"><input type="checkbox" id="ttsPlain"><span>Сокращения как есть</span></label>' : ''}</div>
      <p class="small muted">${sy && n ? 'Нажми на любую фразу в тексте — чтение начнётся с неё. Место, где ты остановился, запоминается для каждой страницы. ' : ''}Текст подготовлен для озвучки: сокращения, единицы и формулы расписаны словами.</p></div>`, {
      mount(b) {
        const $ = (s) => b.querySelector(s);
        const plainBox = $('#ttsPlainView'), plainChk = $('#ttsPlain');
        const curText = () => (plainChk && plainChk.checked ? plain : spoken.join('\n\n'));
        $('[data-tts-copy]').addEventListener('click', () => S.copy(curText(), 'Текст скопирован — вставь в приложение озвучки'));
        $('[data-tts-save]').addEventListener('click', () => S.saveFile((title.replace(/[^\wА-Яа-яЁё -]+/g, '').trim().replace(/\s+/g, '_') || 'lekciya') + '.txt', curText(), 'text/plain;charset=utf-8'));
        if (!sy || !n) return;
        const view = $('#ttsView'), playBtn = $('[data-tts-play]'), seek = $('#ttsPos'), where = $('[data-tts-where]'), status = $('[data-tts-status]');
        const starts = parts.reduce((a, x, j) => { if (!j || x.p !== parts[j - 1].p) a.push(j); return a; }, []);
        const paraOf = (j) => { let k = 0; while (k + 1 < starts.length && starts[k + 1] <= j) k++; return k; };
        const whereText = (j) => `Абзац ${paraOf(j) + 1} из ${starts.length} · ${Math.round(j / n * 100)} %`;
        let lit = null;
        const show = (scroll) => {
          const i = Math.min(state.i, n - 1);
          seek.value = i;
          where.textContent = whereText(state.i);
          if (lit) lit.classList.remove('on');
          lit = view.querySelector(`[data-c="${i}"]`);
          if (lit) { lit.classList.add('on'); if (scroll) view.scrollTo({ top: Math.max(0, lit.offsetTop - view.clientHeight / 3), behavior: scroll === 'now' ? 'auto' : 'smooth' }); }
          playBtn.innerHTML = state.playing ? S.icon('pause') + 'Пауза' : S.icon('play') + (state.i ? 'Продолжить' : 'Слушать');
        };
        const speak = () => {
          const g = state.gen;
          if (state.i >= n) { state.playing = false; state.i = 0; posSave(state.key, parts, 0); show(true); status.textContent = 'Прочитано до конца. В следующий раз чтение начнётся сначала.'; return; }
          const u = new SpeechSynthesisUtterance(parts[state.i].t);
          u.lang = 'ru-RU'; u.rate = rate;
          voice = voice || pickVoice(); if (voice) u.voice = voice;
          u.onend = () => { if (g !== state.gen || !state.playing) return; state.i++; speak(); };
          u.onerror = () => { if (g !== state.gen) return; state.playing = false; show(); status.textContent = 'Озвучка прервалась. Нажми «Продолжить» или скопируй текст.'; };
          posSave(state.key, parts, state.i);
          show(true);
          sy.speak(u);
        };
        // запуск с текущего места; Chrome на Android иногда теряет речь, если speak() идёт сразу за cancel(), поэтому после cancel() — короткая пауза
        const run = () => {
          state.gen++;
          if (sy.speaking || sy.pending) { sy.cancel(); const g = state.gen; setTimeout(() => { if (g === state.gen && state.playing) speak(); }, 80); } else speak();
        };
        const pause = (msg) => { state.playing = false; state.gen++; sy.cancel(); show(); status.textContent = msg || ''; };
        const go = (j) => {
          state.i = Math.max(0, Math.min(n - 1, j));
          posSave(state.key, parts, state.i);
          status.textContent = '';
          if (state.playing) run(); else show(true);
        };
        playBtn.addEventListener('click', () => {
          if (state.playing) { pause('Пауза. Место запомнено.'); return; }
          status.textContent = T.voices().length ? '' : 'Русский голос не найден, поэтому будет голос по умолчанию. Как поставить русский голос — ниже, в «Как сделать голос естественнее».';
          state.playing = true; run();
        });
        $('[data-tts-pc]').addEventListener('click', () => go(state.i - 1));
        $('[data-tts-nc]').addEventListener('click', () => go(state.i + 1));
        $('[data-tts-pp]').addEventListener('click', () => { const k = paraOf(state.i); go(state.i > starts[k] ? starts[k] : starts[Math.max(0, k - 1)]); });
        $('[data-tts-np]').addEventListener('click', () => { const k = paraOf(state.i); if (k + 1 < starts.length) go(starts[k + 1]); });
        $('[data-tts-restart]').addEventListener('click', () => go(0));
        seek.addEventListener('input', () => { const j = Number(seek.value); where.textContent = whereText(j); status.textContent = '«' + parts[j].t.slice(0, 80) + '…»'; });
        seek.addEventListener('change', () => go(Number(seek.value)));
        view.addEventListener('click', (e) => {
          const c = e.target.closest('[data-c]');
          if (!c) return;
          state.i = Number(c.dataset.c);
          status.textContent = '';
          state.playing = true; run();
        });
        const rateEl = $('#ttsRate');
        rateEl.addEventListener('input', () => { rate = Number(rateEl.value); $('[data-tts-rate]').textContent = rate.toFixed(1) + '×'; lsSet('shk:ttsRate', String(rate)); });
        rateEl.addEventListener('change', () => { if (state.playing) run(); });
        const vsel = $('#ttsVoice');
        const fillVoices = () => {
          const vs = T.voices();
          voice = pickVoice();
          vsel.innerHTML = vs.length ? vs.map((v) => `<option value="${esc(v.voiceURI)}"${voice && v.voiceURI === voice.voiceURI ? ' selected' : ''}>${isNatural(v) ? '★ ' : ''}${esc(v.name)}${v.localService === false ? ' — через интернет' : ''}</option>`).join('') : '<option value="">Русского голоса нет — голос по умолчанию</option>';
          vsel.disabled = !vs.length;
          if (!vs.length && sy.getVoices().length) $('[data-tts-help]').open = true;
        };
        fillVoices();
        if (onVoices && sy.removeEventListener) sy.removeEventListener('voiceschanged', onVoices);
        onVoices = fillVoices;
        if (sy.addEventListener) sy.addEventListener('voiceschanged', onVoices); else sy.onvoiceschanged = onVoices;
        vsel.addEventListener('change', () => { voice = T.voices().find((v) => v.voiceURI === vsel.value) || null; lsSet('shk:ttsVoice', vsel.value); if (state.playing) run(); });
        $('[data-tts-try]').addEventListener('click', () => {
          if (state.playing) pause();
          const u = new SpeechSynthesisUtterance('Так звучит этот голос. Автоматический выключатель защищает кабель от перегрузки и от короткого замыкания.');
          u.lang = 'ru-RU'; u.rate = rate; if (voice) u.voice = voice;
          if (sy.speaking || sy.pending) { sy.cancel(); setTimeout(() => sy.speak(u), 80); } else sy.speak(u);
        });
        if (plainChk) plainChk.addEventListener('change', () => { view.hidden = plainChk.checked; plainBox.hidden = !plainChk.checked; });
        status.textContent = state.i ? 'Продолжу с того места, где ты остановился. Начать заново — кнопка «С начала».' : 'Нажми «Слушать». Перематывать можно ползунком, кнопками или нажатием на фразу в тексте.';
        show('now');
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
    const key = S.current.name + ':' + (S.current.arg == null ? '' : S.current.arg);
    if (data && data.paras.length) T.open(data.title, data.paras, key);
    else { const v = S.$('#view'); const h1 = v.querySelector('h1'); T.open(h1 ? clean(h1.textContent) : 'Страница', T.fromElement(v), key); }
  });
  S.bus.on('route', () => T.stop());
})();
