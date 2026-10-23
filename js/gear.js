/* Школа щитовика — каталог оборудования: умная графика, мои паспорта, экраны.
   Время-токовые характеристики — опорные точки ГОСТ IEC 60898-1 (табл. 7); типы УЗО — ГОСТ IEC 61008-1, МЭК 62423;
   IP — ГОСТ 14254-2015 (МЭК 60529); маркировка кабелей — ГОСТ 31996-2012, ГОСТ 31565-2012. */
(function () {
  'use strict';
  const S = window.SHK;
  const esc = S.esc;
  const G = (S.graph = S.graph || {});
  const fmt = (v) => (v >= 100 ? Math.round(v) : v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v >= 0.1 ? v.toFixed(2) : v.toFixed(3)).replace('.', ',');
  const ftime = (t) => (t >= 3600 ? 'больше часа' : t >= 120 ? `${Math.round(t / 60)} мин` : `${fmt(t)} с`);

  /* ---------- время-токовая характеристика автомата ---------- */
  const MAG = { B: [3, 5], C: [5, 10], D: [10, 20] };
  const W = 360, H = 270, L0 = 46, R0 = 10, T0 = 12, B0 = 40;
  const X = (x) => L0 + (Math.log10(x) / 2) * (W - L0 - R0); // 1…100
  const Y = (t) => T0 + ((Math.log10(10000) - Math.log10(t)) / (Math.log10(10000) - Math.log10(0.005))) * (H - T0 - B0);
  const upper = (k) => { const [, m2] = MAG[k]; return [[1.45, 10000], [1.45, 3600], [2.55, 60], [m2, 60 * Math.pow(2.55 / m2, 2)], [m2, 0.1], [100, 0.1]]; };
  const lower = (k) => { const [m1] = MAG[k]; return [[1.13, 10000], [1.13, 3600], [2.55, 1], [m1, 0.1], [m1, 0.005]]; };
  const interp = (pts, x) => { // время на ломаной в логарифмических координатах
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, t1] = pts[i], [x2, t2] = pts[i + 1];
      if (x1 === x2) continue;
      if (x >= x1 && x <= x2) { const f = (Math.log10(x) - Math.log10(x1)) / (Math.log10(x2) - Math.log10(x1)); return Math.pow(10, Math.log10(t1) + f * (Math.log10(t2) - Math.log10(t1))); }
    }
    return null;
  };
  G.mcbVerdict = (k, x) => {
    const [m1, m2] = MAG[k];
    if (x < 1.13) return ['ok', 'Не отключит: ток не больше условного тока нерасцепления 1,13·In.'];
    if (x < 1.45) return ['warn', 'Может не отключить больше часа: зона между 1,13·In и 1,45·In стандартом не гарантирована. Кабель должен выдерживать такой ток.'];
    if (x < 2.55) return ['warn', 'Отключит тепловой расцепитель: при 1,45·In стандарт гарантирует отключение меньше чем за час, при большем токе — быстрее. Точное время — по кривой изготовителя.'];
    if (x < m1) return ['warn', 'Отключит тепловой расцепитель: при 2,55·In — за 1–60 с (для In до 32 А), при большем токе — быстрее. Мгновенного срабатывания при таком токе ещё нет.'];
    if (x < m2) return ['bad', `Мгновенное отключение не гарантировано: при ${fmt(m1)}–${fmt(m2)}·In автомат ${k} может отключить и мгновенно, и тепловым расцепителем за секунды.`];
    return ['ok', 'Отключит мгновенно электромагнитный расцепитель: меньше 0,1 с (обычно около 10 мс).'];
  };
  G.mcbSVG = (k, x) => {
    const up = upper(k), lo = lower(k);
    const poly = up.concat([[100, 0.005]], lo.slice().reverse()).map(([a, b]) => `${X(a).toFixed(1)},${Y(b).toFixed(1)}`).join(' ');
    const line = (pts) => pts.map(([a, b], i) => `${i ? 'L' : 'M'}${X(a).toFixed(1)} ${Y(b).toFixed(1)}`).join(' ');
    const xt = [1, 2, 3, 5, 10, 20, 50, 100], yt = [[0.01, '0,01 с'], [0.1, '0,1 с'], [1, '1 с'], [10, '10 с'], [60, '1 мин'], [3600, '1 ч']];
    const sp = [[1.13, '1,13'], [1.45, '1,45'], [2.55, '2,55']];
    const grid = xt.map((v) => `<line x1="${X(v)}" y1="${T0}" x2="${X(v)}" y2="${H - B0}" stroke="var(--border-muted)"/><text x="${X(v)}" y="${H - B0 + 14}" font-size="10" text-anchor="middle" fill="var(--fg-muted)">${v}</text>`).join('')
      + yt.map(([v, t]) => `<line x1="${L0}" y1="${Y(v)}" x2="${W - R0}" y2="${Y(v)}" stroke="var(--border-muted)"/><text x="${L0 - 4}" y="${Y(v) + 3}" font-size="9.5" text-anchor="end" fill="var(--fg-muted)">${t}</text>`).join('')
      + sp.map(([v, t]) => `<line x1="${X(v)}" y1="${H - B0}" x2="${X(v)}" y2="${H - B0 + 4}" stroke="var(--fg-muted)"/><text x="${X(v)}" y="${H - B0 + 26}" font-size="8.5" text-anchor="middle" fill="var(--accent)">${t}</text>`).join('');
    const xm = Math.max(1, Math.min(100, x || 1));
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:520px;display:block;margin:0 auto" role="img" aria-label="Время-токовая характеристика ${k}">
      ${grid}
      <polygon points="${poly}" fill="color-mix(in srgb,var(--accent) 22%,transparent)" stroke="none"/>
      <path d="${line(up)}" fill="none" stroke="var(--accent)" stroke-width="2"/>
      <path d="${line(lo)}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="5 3"/>
      <line x1="${X(xm)}" y1="${T0}" x2="${X(xm)}" y2="${H - B0}" stroke="var(--danger)" stroke-width="2"/>
      <text x="${Math.min(X(xm) + 4, W - 60)}" y="${T0 + 12}" font-size="11" font-weight="700" fill="var(--danger)">${fmt(xm)}·In</text>
      <text x="${(L0 + W - R0) / 2}" y="${H - 2}" font-size="10" text-anchor="middle" fill="var(--fg-muted)">ток, кратность к номинальному I/In</text>
      <text x="${W - R0 - 4}" y="${Y(1500)}" font-size="11" font-weight="700" text-anchor="end" fill="var(--accent)">${k}</text>
    </svg>`;
  };
  G.mcbWidget = (k0) => `<section class="card stack-sm gw" data-mcbw style="margin-top:16px">
    <div class="row"><b style="flex:1">Время-токовая характеристика</b><div class="seg" data-k>${['B', 'C', 'D'].map((k) => `<button type="button" data-kk="${k}" aria-pressed="${k === (k0 || 'C')}">${k}</button>`).join('')}</div></div>
    <div data-svg>${G.mcbSVG(k0 || 'C', 7)}</div>
    <label class="small" for="mcbx">Ток в линии: <b data-xv>7</b> × In</label><input id="mcbx" type="range" min="0" max="1.7" step="0.01" value="${Math.log10(7)}" data-x style="width:100%">
    <div class="flash" data-verdict></div>
    <p class="small muted">Сплошная линия — наибольшее время отключения, пунктир — наименьшее; закрашена зона, где автомат обязан сработать по опорным точкам ГОСТ IEC 60898-1: 1,13·In — не отключается час, 1,45·In — отключается меньше чем за час, 2,55·In — за 1–60 с (до 32 А), ${'B: 3–5·In, C: 5–10·In, D: 10–20·In'} — мгновенное срабатывание. Кривая конкретного автомата лежит внутри зоны; точную даёт каталог изготовителя.</p>
  </section>`;
  G.mountMcb = (root) => {
    const w = root.querySelector('[data-mcbw]');
    if (!w) return;
    let k = w.querySelector('[aria-pressed="true"]').dataset.kk;
    const x = w.querySelector('[data-x]');
    const upd = () => {
      const v = Math.pow(10, Number(x.value));
      w.querySelector('[data-xv]').textContent = fmt(v);
      w.querySelector('[data-svg]').innerHTML = G.mcbSVG(k, v);
      const [c, t] = G.mcbVerdict(k, v);
      const f = w.querySelector('[data-verdict]');
      f.className = 'flash ' + c; f.textContent = `Автомат ${k}: ${t}`;
    };
    w.querySelector('[data-k]').addEventListener('click', (e) => { const b = e.target.closest('[data-kk]'); if (!b) return; k = b.dataset.kk; w.querySelectorAll('[data-kk]').forEach((y) => y.setAttribute('aria-pressed', String(y === b))); upd(); });
    x.addEventListener('input', upd);
    upd();
  };

  /* ---------- типы УЗО: формы тока утечки ---------- */
  const wave = (fn, w = 150, h = 54) => { const pts = []; for (let i = 0; i <= 120; i++) { const t = i / 120; pts.push(`${(t * w).toFixed(1)},${(h / 2 - fn(t) * (h / 2 - 4)).toFixed(1)}`); } return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:220px"><line x1="0" y1="${h / 2}" x2="${w}" y2="${h / 2}" stroke="var(--border)"/><polyline points="${pts.join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2"/></svg>`; };
  G.rcdTypes = () => {
    const P = Math.PI * 2 * 2; // два периода на рисунке
    const rows = [
      ['AC', 'синусоидальный переменный ток утечки', (t) => Math.sin(P * t), 'нагреватели, лампы накаливания, двигатели без электроники'],
      ['A', 'плюс пульсирующий постоянный (однополупериодный)', (t) => Math.max(0, Math.sin(P * t)), 'приборы с выпрямителем: стиральные и посудомоечные машины, компьютеры, светодиодные драйверы'],
      ['F', 'плюс ток смешанной частоты', (t) => 0.7 * Math.sin(P * t) + 0.28 * Math.sin(P * 9 * t), 'однофазные частотные преобразователи: инверторные кондиционеры, стиральные машины с инверторным двигателем, насосы'],
      ['B', 'плюс гладкий постоянный ток', (t) => 0.62 + 0.06 * Math.sin(P * 6 * t), 'трёхфазные частотные преобразователи, зарядные станции электромобилей, солнечные инверторы']
    ];
    return `<section class="stack-sm" style="margin-top:16px"><h2 class="h3">Какую форму тока утечки «видит» УЗО</h2>
      <div class="grid-2">${rows.map(([k, d, fn, ex]) => `<div class="card stack-sm"><div class="row"><span class="badge info" style="font-size:13px">Тип ${k}</span></div>${wave(fn)}<p class="small"><b>${esc(d)}</b></p><p class="small muted">Где нужен: ${esc(ex)}.</p></div>`).join('')}</div>
      <p class="small muted">Каждый следующий тип обнаруживает всё, что предыдущий, плюс свою форму тока. Постоянная составляющая тока утечки намагничивает сердечник УЗО типа AC, и оно может не сработать даже на синусоидальную утечку — поэтому для электроники нужен как минимум тип A (ГОСТ IEC 61008-1; типы F и B — МЭК 62423).</p></section>`;
  };

  /* ---------- расшифровщик IP ---------- */
  const IP1 = ['нет защиты', 'от предметов больше 50 мм (тыльная сторона руки)', 'от предметов больше 12,5 мм (палец)', 'от предметов больше 2,5 мм (инструмент)', 'от предметов больше 1 мм (проволока)', 'пылезащищённое: пыль не мешает работе', 'пыленепроницаемое'];
  const IP2 = ['нет защиты', 'от вертикально падающих капель', 'от капель при наклоне оболочки до 15°', 'от дождя (брызги под углом до 60° от вертикали)', 'от брызг с любого направления', 'от струй воды', 'от сильных струй воды', 'при кратковременном погружении (до 1 м)', 'при длительном погружении (условия — по изготовителю)', 'от струй высокого давления и температуры'];
  G.ipWidget = () => `<section class="card stack-sm" data-ipw><b>Расшифровать степень защиты IP</b>
    <div class="row"><label class="small">IP <select class="inp" data-i1 style="width:auto;display:inline-block">${IP1.map((_, i) => `<option${i === 4 ? ' selected' : ''}>${i}</option>`).join('')}</select></label><select class="inp" data-i2 style="width:auto">${IP2.map((_, i) => `<option${i === 4 ? ' selected' : ''}>${i}</option>`).join('')}</select></div>
    <div class="flash" data-ipo></div><p class="small muted">ГОСТ 14254-2015 (МЭК 60529). Ванная по ПУЭ 7.1.47: зона 0 — IPX7, зона 1 — IPX5, зона 2 — IPX4, зона 3 — IPX1.</p></section>`;
  G.mountIp = (root) => { const w = root.querySelector('[data-ipw]'); if (!w) return; const a = w.querySelector('[data-i1]'), b = w.querySelector('[data-i2]'); const u = () => { w.querySelector('[data-ipo]').innerHTML = `<b>IP${a.value}${b.value}</b>: первая цифра — ${esc(IP1[a.value])}; вторая — ${esc(IP2[b.value])}.`; }; a.addEventListener('change', u); b.addEventListener('change', u); u(); };

  /* ---------- расшифровщик маркировки кабеля ---------- */
  const TOK = [
    [/^А(?=[ВПК])/, 'А', 'алюминиевые жилы (без буквы — медные)'],
    [/^Пв/, 'Пв', 'сшитый полиэтилен'],
    [/^В/, 'В', 'ПВХ (поливинилхлорид)'],
    [/^П/, 'П', 'полиэтилен'],
    [/^Бб/, 'Бб', 'броня из профилированной стальной ленты'],
    [/^Б/, 'Б', 'броня из стальных лент'],
    [/^Шв/, 'Шв', 'защитный шланг из ПВХ'],
    [/^Г/, 'Г', '«голый» — без брони и защитного покрова'],
    [/^нг\(А\)/, 'нг(А)', 'не распространяет горение при групповой прокладке, категория А'],
    [/^нг\(В\)/, 'нг(В)', 'не распространяет горение при групповой прокладке, категория B'],
    [/^нг/, 'нг', 'не распространяет горение'],
    [/^-?FRLS/, 'FRLS', 'огнестойкий (FR) с пониженным дымо- и газовыделением (LS)'],
    [/^-?LSLTx/, 'LSLTx', 'пониженное дымовыделение и низкая токсичность продуктов горения'],
    [/^-?HFLTx/, 'HFLTx', 'без галогенов и с низкой токсичностью'],
    [/^-?FR/, 'FR', 'огнестойкий: работает в огне заданное время'],
    [/^-?LS/, 'LS', 'пониженное дымо- и газовыделение'],
    [/^-?HF/, 'HF', 'без галогенов'],
    [/^\s*(\d+)\s*[хx×]\s*(\d+(?:[.,]\d+)?)/, null, null],
    [/^\s*\((N|PE|N,\s*PE)\)/, null, 'маркировка нулевой или защитной жилы в составе кабеля'],
    [/^\s*ок/, 'ок', 'однопроволочная круглая жила'],
    [/^\s*мк/, 'мк', 'многопроволочная круглая жила'],
    [/^\s*ос/, 'ос', 'однопроволочная секторная жила'],
    [/^\s*мс/, 'мс', 'многопроволочная секторная жила'],
    [/^\s*-?\s*(0,66|0\.66|1)\b/, null, null]
  ];
  G.decodeCable = (s0) => {
    let s = String(s0 || '').trim();
    const out = [];
    const named = [[/^NYM/i, 'NYM', 'немецкое обозначение: N — по нормам VDE, Y — ПВХ-изоляция, M — провод в оболочке (Mantelleitung)'], [/^ПВС/, 'ПВС', 'провод с ПВХ-изоляцией, соединительный (гибкий)'], [/^ШВВП/, 'ШВВП', 'шнур с ПВХ-изоляцией и оболочкой, плоский'], [/^ПуГВ/, 'ПуГВ', 'провод установочный гибкий с ПВХ-изоляцией'], [/^ПуВ/, 'ПуВ', 'провод установочный с ПВХ-изоляцией, однопроволочная жила'], [/^КГ/, 'КГ', 'кабель гибкий с резиновой изоляцией'], [/^СИП-?(\d)?/, 'СИП', 'самонесущий изолированный провод для воздушных линий']];
    for (const [re, k, d] of named) { const m = s.match(re); if (m) { out.push([m[0], d]); s = s.slice(m[0].length); break; } }
    let guard = 0, mats = 0;
    while (s.length && guard++ < 40) {
      s = s.replace(/^[\s\-–]+/, '');
      if (!s) break;
      let hit = false;
      if (out.length && out[out.length - 1][0] === 'Г' && /^П(?!в)/.test(s)) { out.push(['П', 'плоский кабель (жилы в один ряд)']); s = s.slice(1); continue; }
      for (const [re, k, d] of TOK) {
        const m = s.match(re);
        if (!m) continue;
        if (m[1] && m[2]) out.push([m[0].trim(), `${m[1]} ${S.plural ? S.plural(+m[1], 'жила', 'жилы', 'жил') : 'жил'} сечением ${m[2]} мм² каждая`]);
        else if (!k && !d) out.push([m[0].trim(), `номинальное напряжение ${m[1]} кВ`]);
        else if (k === 'В' || k === 'П' || k === 'Пв') { mats++; out.push([k, (mats === 1 ? 'изоляция: ' : 'оболочка: ') + d]); }
        else out.push([k || m[0].trim(), d]);
        s = s.slice(m[0].length);
        hit = true; break;
      }
      if (!hit) s = s.slice(1);
    }
    return out;
  };
  G.cableWidget = () => `<section class="card stack-sm" data-cabw><b>Расшифровать маркировку кабеля</b>
    <input class="inp" data-cab value="ВВГнг(А)-LS 3х2,5" aria-label="Маркировка кабеля"><div data-cabo></div>
    <p class="small muted">Попробуй: АВВГ 4х16, ВВГнг(А)-FRLS 5х4, ВБбШв 3х6, ПвВГ, NYM 3х1,5, ПуГВ 1х6. Буквы — по ГОСТ 31996-2012, индексы пожарной безопасности — по ГОСТ 31565-2012.</p></section>`;
  G.mountCable = (root) => { const w = root.querySelector('[data-cabw]'); if (!w) return; const i = w.querySelector('[data-cab]'); const u = () => { const r = G.decodeCable(i.value); w.querySelector('[data-cabo]').innerHTML = r.length ? `<dl class="kv">${r.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl>` : '<p class="small muted">Не распознано.</p>'; }; i.addEventListener('input', u); u(); };

  /* хуки для страниц аппаратов справочника */
  S.devExtra = S.devExtra || {};
  S.devMount = S.devMount || {};
  S.devExtra.mcb = () => G.mcbWidget('C');
  S.devMount.mcb = G.mountMcb;
  S.devExtra.rcd = () => G.rcdTypes();
  S.devExtra.rcbo = () => G.mcbWidget('C') + G.rcdTypes();
  S.devMount.rcbo = G.mountMcb;

  /* ---------- мои паспорта: хранятся только на этом устройстве (IndexedDB) ---------- */
  const DB = {
    open() { return new Promise((ok, no) => { try { const r = indexedDB.open('shk-gear', 1); r.onupgradeneeded = () => r.result.createObjectStore('items', { keyPath: 'id' }); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); } catch (e) { no(e); } }); },
    async all() { const db = await DB.open(); return new Promise((ok, no) => { const q = db.transaction('items').objectStore('items').getAll(); q.onsuccess = () => ok(q.result.sort((a, b) => b.t - a.t)); q.onerror = () => no(q.error); }); },
    async put(x) { const db = await DB.open(); return new Promise((ok, no) => { const t = db.transaction('items', 'readwrite'); t.objectStore('items').put(x); t.oncomplete = () => ok(); t.onerror = () => no(t.error); }); },
    async del(id) { const db = await DB.open(); return new Promise((ok, no) => { const t = db.transaction('items', 'readwrite'); t.objectStore('items').delete(id); t.oncomplete = () => ok(); t.onerror = () => no(t.error); }); }
  };
  S.gearDB = DB;
  const urls = [];
  const freeUrls = () => { while (urls.length) URL.revokeObjectURL(urls.pop()); };
  S.bus.on && S.bus.on('route', freeUrls);

  G.myGearHTML = () => `<section class="stack-sm" data-my>
    <div class="card stack-sm"><b>Добавить паспорт или шильдик</b>
      <div class="form-grid"><div class="field"><label for="mgN">Что это</label><input class="inp" id="mgN" maxlength="80" placeholder="Например: УЗО IEK ВД1-63 2P 40 А 30 мА"></div>
      <div class="field"><label for="mgC">Раздел</label><select class="inp" id="mgC">${(S.gearCats || []).map(([id, t]) => `<option value="${id}">${esc(t)}</option>`).join('')}<option value="other">Другое</option></select></div></div>
      <div class="field"><label for="mgT">Заметки</label><textarea class="inp" id="mgT" maxlength="2000" placeholder="Где стоял, что с ним делал, что непонятно"></textarea></div>
      <div class="field"><label for="mgF">Фото или PDF паспорта</label><input class="inp" id="mgF" type="file" accept="image/*,application/pdf" multiple></div>
      <div class="row"><button class="btn primary" type="button" data-mgadd>${S.icon('save')}Сохранить</button><span class="small muted">Файлы хранятся только на этом устройстве.</span></div></div>
    <div data-mglist class="stack-sm"><p class="small muted">Загрузка…</p></div></section>`;
  G.mountMyGear = (root) => {
    const box = root.querySelector('[data-my]');
    if (!box) return;
    const list = box.querySelector('[data-mglist]');
    const draw = async () => {
      let items = [];
      try { items = await DB.all(); } catch (e) { list.innerHTML = '<div class="flash warn">Хранилище браузера недоступно (приватный режим или запрет сайта). Паспорта можно отправить на разбор сразу через «Разборы».</div>'; return; }
      freeUrls();
      list.innerHTML = items.length ? items.map((x) => `<div class="card stack-sm"><div class="row"><b style="flex:1">${esc(x.name)}</b><span class="badge">${esc(((S.gearCats || []).find((c) => c[0] === x.cat) || [0, 'Другое'])[1])}</span></div>${x.note ? `<p class="small">${esc(x.note)}</p>` : ''}
        <div class="row">${(x.files || []).map((f, i) => { const u = URL.createObjectURL(f.blob); urls.push(u); return /^image\//.test(f.type) ? `<a href="${u}" target="_blank" rel="noopener"><img src="${u}" alt="${esc(f.name)}" style="width:84px;height:84px;object-fit:cover;border-radius:6px;border:1px solid var(--border)"></a>` : `<a class="btn sm" href="${u}" target="_blank" rel="noopener">${S.icon('doc')}${esc(f.name)}</a>`; }).join('')}</div>
        <div class="row"><button class="btn sm" type="button" data-mgsend="${x.id}">${S.icon('send')}Отправить Claude на разбор</button><button class="btn sm danger" type="button" data-mgdel="${x.id}">${S.icon('trash')}Удалить</button><span class="small muted">${new Date(x.t).toLocaleDateString('ru-RU')}</span></div></div>`).join('') : '<div class="empty">Пока пусто. Сфотографируй паспорт или шильдик аппарата, с которым работал, — получится твоя история оборудования.</div>';
    };
    box.addEventListener('click', async (e) => {
      if (e.target.closest('[data-mgadd]')) {
        const name = box.querySelector('#mgN').value.trim();
        if (!name) { S.toast('Напиши, что это за оборудование'); return; }
        const fl = [...box.querySelector('#mgF').files].slice(0, 8).filter((f) => f.size <= 25 * 1024 * 1024);
        const x = { id: 'g' + Date.now().toString(36), name, cat: box.querySelector('#mgC').value, note: box.querySelector('#mgT').value.trim(), t: Date.now(), files: fl.map((f) => ({ name: f.name, type: f.type, blob: f })) };
        try { await DB.put(x); S.toast('Сохранено'); box.querySelector('#mgN').value = ''; box.querySelector('#mgT').value = ''; box.querySelector('#mgF').value = ''; draw(); } catch (err) { S.toast('Не удалось сохранить: хранилище браузера недоступно'); }
        return;
      }
      const sd = e.target.closest('[data-mgsend]');
      if (sd) { const items = await DB.all().catch(() => []); const x = items.find((i) => i.id === sd.dataset.mgsend); if (x && S.sync && S.sync.compose) S.sync.compose({ type: 'gear', title: 'Паспорт: ' + x.name, text: `${x.name}${x.note ? '\n\n' + x.note : ''}\n\nСделай разбор: что это, главные параметры из паспорта, как выбрать и подключить, типичные ошибки, карточки Anki.` }); return; }
      const dl = e.target.closest('[data-mgdel]');
      if (dl && window.confirm('Удалить запись и файлы с этого устройства?')) { await DB.del(dl.dataset.mgdel).catch(() => {}); draw(); }
    });
    draw();
  };
})();
