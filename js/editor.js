/* Школа щитовика — редактор щита: библиотека аппаратов по брендам, перетаскивание на рейки с шагом полмодуля,
   провода от клеммы к клемме с прокладкой по каналам и правкой вручную, свойства, отмена действий, сохранение,
   импорт щита из конструктора, однолинейная схема, группы, спецификация, проверки и печать на лист с рамкой. */
(function () {
  'use strict';
  const S = window.SHK;
  const esc = S.esc;
  const K = () => S.edCore;
  const LB = () => S.edLib;
  const LS = 'shk:ed:cur', LSL = 'shk:ed:list';
  const E = (S.ed = { P: null, sel: null, tool: 'select', wireStart: null, hist: [], fut: [], zoom: 0, tab: 'panel', brand: 'ekf', q: '', drag: null, ghost: null, root: null });

  /* ---------- данные ---------- */
  const clone = (x) => JSON.parse(JSON.stringify(x));
  function starter() {
    try {
      const make = S.guideCfgs && S.guideCfgs['gd-flat'];
      if (make && S.engine) { const P = K().fromBuilder(S.engine.build(make(S.engine.newLine)), 'ekf'); P.name = 'Пример: квартира с электроплитой'; return P; }
    } catch (e) { /* пустой щит ниже */ }
    return K().blank();
  }
  function load() {
    if (E.P) return;
    try { E.P = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) { E.P = null; }
    if (!E.P || !E.P.devs) E.P = starter();
  }
  function save() { try { localStorage.setItem(LS, JSON.stringify(E.P)); } catch (e) { /* память браузера заполнена */ } }
  function commit(fn, keepSel) {
    E.hist.push(JSON.stringify(E.P));
    if (E.hist.length > 80) E.hist.shift();
    E.fut = [];
    fn();
    if (!keepSel && E.sel && !findSel()) E.sel = null;
    save();
    refresh();
  }
  function undo() { if (!E.hist.length) return; E.fut.push(JSON.stringify(E.P)); E.P = JSON.parse(E.hist.pop()); if (!findSel()) E.sel = null; save(); refresh(); }
  function redo() { if (!E.fut.length) return; E.hist.push(JSON.stringify(E.P)); E.P = JSON.parse(E.fut.pop()); save(); refresh(); }
  const findSel = () => {
    const s = E.sel, P = E.P;
    if (!s) return null;
    if (s.kind === 'dev') return P.devs.find((d) => d.id === s.id);
    if (s.kind === 'wire') return P.wires.find((w) => w.id === s.id);
    if (s.kind === 'bus') return P.buses.find((b) => b.id === s.id);
    if (s.kind === 'line') return P.lines.find((l) => l.id === s.id);
    if (s.kind === 'comb') return P.combs.find((c) => c.id === s.id);
    return null;
  };
  const uid = (p) => p + Math.random().toString(36).slice(2, 7);

  /* открыть щит конструктора в редакторе */
  S.openInEditor = (cfg, brand) => {
    if (!S.engine) return;
    const P = K().fromBuilder(S.engine.build(cfg), brand || E.brand || 'ekf');
    E.P = P; E.sel = null; E.hist = []; E.fut = []; E.tab = 'panel';
    save();
    S.go('editor');
    S.toast && S.toast('Щит открыт в редакторе');
  };

  /* ---------- стили ---------- */
  const CSS = `
.ed-wrap{max-width:none;padding:12px 16px 24px}
.ed-top{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
.ed-top .inp{flex:1 1 200px;max-width:360px}
.ed-top .sep{width:1px;align-self:stretch;background:var(--border);margin:0 4px}
.ed-top .btn[aria-pressed="true"]{background:var(--accent-subtle);border-color:var(--accent);color:var(--accent)}
.ed-main{display:grid;grid-template-columns:250px minmax(0,1fr) 270px;gap:10px;min-height:calc(100vh - var(--hdr) - 120px)}
.ed-side{border:1px solid var(--border);border-radius:var(--r-lg);background:var(--bg-subtle);padding:10px;overflow:auto;max-height:calc(100vh - var(--hdr) - 110px)}
.ed-center{border:1px solid var(--border);border-radius:var(--r-lg);background:var(--bg);display:flex;flex-direction:column;min-width:0}
.ed-canvas{flex:1;overflow:auto;position:relative;background:var(--bg-subtle);border-radius:0 0 var(--r-lg) var(--r-lg);touch-action:none}
.ed-canvas svg{display:block;user-select:none;-webkit-user-select:none}
.ed-tabs{display:flex;gap:2px;padding:6px 8px 0;border-bottom:1px solid var(--border);overflow-x:auto}
.ed-tabs button{border:0;background:none;padding:7px 10px;font-size:14px;color:var(--fg-muted);border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap}
.ed-tabs button[aria-selected="true"]{color:var(--fg);border-bottom-color:var(--accent);font-weight:600}
.ed-chips{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0}
.ed-chips button{border:1px solid var(--btn-border);background:var(--bg);border-radius:2em;padding:3px 9px;font-size:13px;cursor:pointer}
.ed-chips button[aria-pressed="true"]{background:var(--accent-subtle);border-color:var(--accent);color:var(--accent)}
.ed-kind{font-size:12px;color:var(--fg-muted);margin:10px 0 4px;text-transform:none;font-weight:600}
.ed-card{border:1px solid var(--border);background:var(--bg);border-radius:var(--r);padding:6px 8px;margin-bottom:5px;cursor:grab;display:block;touch-action:none}
.ed-card:hover{border-color:var(--accent)}
.ed-card b{font-size:13px;font-weight:600;display:block}
.ed-card span{font-size:12px;color:var(--fg-muted)}
.ed-card .w{display:block;font-size:11px;color:var(--fg-subtle);margin-top:2px}
.ed-props h3{font-size:15px;margin:0 0 8px}
.ed-props label{display:block;font-size:12px;color:var(--fg-muted);margin:8px 0 3px}
.ed-props .inp,.ed-props select{width:100%}
.ed-props .row{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.ed-props .kv{font-size:13px;margin:4px 0;color:var(--fg)}
.ed-props .kv span{color:var(--fg-muted)}
.ed-msg{position:absolute;left:12px;bottom:12px;max-width:70%;background:var(--danger-subtle);color:var(--danger);border:1px solid var(--danger);border-radius:var(--r);padding:6px 10px;font-size:13px;pointer-events:none}
.ed-hint{position:absolute;left:12px;top:10px;background:var(--bg);border:1px solid var(--border);border-radius:var(--r);padding:4px 8px;font-size:12px;color:var(--fg-muted);pointer-events:none}
.ed-pane{padding:12px;overflow:auto}
.ed-ghost{position:fixed;pointer-events:none;z-index:50;background:var(--bg);border:1px solid var(--accent);border-radius:var(--r);padding:4px 8px;font-size:12px;box-shadow:var(--shadow-md)}
@media (max-width:1100px){.ed-main{grid-template-columns:210px minmax(0,1fr)}.ed-props{grid-column:1 / -1;max-height:none}}
@media (max-width:760px){.ed-main{grid-template-columns:1fr}.ed-side{max-height:260px}}
@media print{.ed-top,.ed-side,.ed-tabs{display:none}}`;
  function css() { if (document.getElementById('ed-css')) return; const s = document.createElement('style'); s.id = 'ed-css'; s.textContent = CSS; document.head.appendChild(s); }

  /* ---------- библиотека ---------- */
  function libHTML() {
    const L = LB();
    const q = E.q.trim().toLowerCase();
    const list = L.list().filter((s) => (E.brand === 'all' || s.brand === E.brand || (E.brand !== 'my' && s.brand === 'gen')) && (!q || (s.series + ' ' + (L.BRANDS[s.brand] || {}).name + ' ' + L.KIND[s.kind]).toLowerCase().includes(q)));
    const kinds = Object.keys(L.KIND).filter((k) => list.some((s) => s.kind === k));
    const brands = ['ekf', 'iek', 'abb', 'se', 'my', 'all'];
    return `<input class="inp" data-q placeholder="Поиск: АВДТ, ВА47-29, УЗО" value="${esc(E.q)}" aria-label="Поиск по библиотеке">
<div class="ed-chips">${brands.map((b) => `<button type="button" data-brand="${b}" aria-pressed="${E.brand === b}">${b === 'all' ? 'Все' : esc(L.BRANDS[b].name)}</button>`).join('')}</div>
${kinds.map((k) => `<div class="ed-kind">${esc(L.KIND[k])}</div>${list.filter((s) => s.kind === k).map((s) => {
      const ws = s.poles.map((p) => `${p}P ${String(L.widthOf(s, p)).replace('.', ',')}`).join(' · ');
      return `<div class="ed-card" data-sid="${esc(s.id)}" title="Перетащи на рейку или нажми, чтобы поставить на свободное место"><div><b>${esc(s.brand === 'gen' || s.brand === 'my' ? s.series : (L.BRANDS[s.brand].name + ' ' + s.series))}</b><span>${s.In ? `${S.fmt(s.In[0], 1)}–${s.In[s.In.length - 1]} А` : ''}${s.ma ? ` · ${s.ma.join('/')} мА` : ''}${s.curves ? ` · ${s.curves.join(', ')}` : ''}</span></div><span class="w">${ws} мод.</span></div>`;
    }).join('')}`).join('') || '<p class="small muted">Ничего не найдено.</p>'}
<div class="row" style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" type="button" data-act="mydev">${S.icon('plus')}Свой аппарат</button><button class="btn sm" type="button" data-act="mylib-export">${S.icon('download')}Мои — в файл</button><button class="btn sm" type="button" data-act="mylib-import">${S.icon('upload')}Из файла</button></div>
<p class="small muted" style="margin-top:8px">Ширина — в модулях по 17,5 мм. Габариты сверяй с паспортом аппарата перед заказом.</p>`;
  }

  /* ---------- свойства ---------- */
  const opt = (arr, cur, fmt) => arr.map((v) => `<option value="${esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${esc(fmt ? fmt(v) : v)}</option>`).join('');
  function propsHTML() {
    const P = E.P, L = LB(), C = K();
    const o = findSel();
    if (E.myForm) return myFormHTML();
    if (!o) {
      const ph = P.feed.phases;
      return `<h3>Щит</h3>
<label>Название</label><input class="inp" data-pf="name" value="${esc(P.name)}">
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px"><div><label>Рядов</label><select data-pf="rows">${opt([1, 2, 3, 4, 5, 6], P.rows)}</select></div><div><label>Модулей в ряду</label><select data-pf="mods">${opt([8, 12, 14, 16, 18, 24, 36], P.mods)}</select></div></div>
<label>Ввод</label><select data-pf="phases">${opt([1, 3], ph, (v) => (v === 1 ? 'Однофазный 230 В' : 'Трёхфазный 400 В'))}</select>
<label>Система заземления</label><select data-pf="earthing">${opt(['TN-C-S', 'TN-S', 'TN-C>S', 'TT'], P.feed.earthing, (v) => ({ 'TN-C-S': 'TN-C-S: N и PE приходят раздельно', 'TN-S': 'TN-S', 'TN-C>S': 'PEN делится в этом щите', TT: 'TT: свой заземлитель' }[v]))}</select>
<div class="row"><button class="btn sm" type="button" data-act="add-line">${S.icon('plus')}Линия</button><button class="btn sm" type="button" data-act="add-busN">${S.icon('plus')}Шина N</button><button class="btn sm" type="button" data-act="add-busPE">${S.icon('plus')}Шина PE</button></div>
<label>Для штампа: объект</label><input class="inp" data-mf="object" value="${esc(P.meta.object || '')}">
<label>Разработал</label><input class="inp" data-mf="author" value="${esc(P.meta.author || '')}">
<label>Проверил</label><input class="inp" data-mf="checker" value="${esc(P.meta.checker || '')}">
<label>Организация</label><input class="inp" data-mf="org" value="${esc(P.meta.org || '')}">
<label>Обозначение (шифр)</label><input class="inp" data-mf="code" value="${esc(P.meta.code || '')}">
<p class="small muted" style="margin-top:10px">Нажми на аппарат, провод, шину или кабель, чтобы изменить его. Провод: нажми на клемму, потом на вторую. Del — удалить, Ctrl+Z — отменить.</p>`;
    }
    if (E.sel.kind === 'dev') {
      const d = o, s = C.spec(d) || {};
      const same = L.list().filter((x) => x.kind === s.kind);
      const curves = s.curves || [];
      return `<h3>${esc(d.id)} — ${esc(L.KIND[s.kind] || d.type)}</h3>
<label>Позиционное обозначение</label><input class="inp" data-df="id" value="${esc(d.id)}">
<label>Назначение</label><input class="inp" data-df="label" value="${esc(d.label || '')}" placeholder="Розетки кухни">
<label>Серия</label><select data-df="sid">${same.map((x) => `<option value="${esc(x.id)}"${x.id === d.sid ? ' selected' : ''}>${esc((L.BRANDS[x.brand] || {}).name + ' ' + x.series)}</option>`).join('')}</select>
${s.poles && s.poles.length > 1 ? `<label>Полюсов</label><select data-df="poles">${opt(s.poles, d.poles)}</select>` : ''}
${s.In ? `<label>Номинальный ток, А</label><select data-df="In">${opt(s.In, d.In)}</select>` : ''}
${curves.length ? `<label>Характеристика</label><select data-df="curve">${opt(curves, d.curve)}</select>` : ''}
${s.ma ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px"><div><label>Утечка, мА</label><select data-df="ma">${opt(s.ma, d.ma)}</select></div><div><label>Тип</label><select data-df="rt">${opt(s.rt || ['AC'], d.rt)}</select></div></div>` : ''}
${s.wOpts ? `<label>Ширина, модулей</label><select data-df="w">${opt(s.wOpts, d.w)}</select>` : ''}
<div class="kv"><span>Ширина:</span> ${S.fmt(d.w, 1)} мод. (${S.fmt(d.w * C.G.MOD, 1)} мм) · <span>ряд</span> ${d.row + 1}</div>
${s.cable ? `<div class="kv"><span>Сечение клемм:</span> ${esc(s.cable)}</div>` : ''}${s.torque ? `<div class="kv"><span>Момент затяжки:</span> ${esc(s.torque)}</div>` : ''}${s.note ? `<div class="kv"><span>Примечание:</span> ${esc(s.note)}</div>` : ''}
<div class="row"><button class="btn sm" type="button" data-act="comb">${S.icon('cable')}Гребёнка вправо</button><button class="btn sm" type="button" data-act="dup">${S.icon('copy')}Копия</button><button class="btn sm" type="button" data-act="del">${S.icon('trash')}Удалить</button></div>`;
    }
    if (E.sel.kind === 'wire') {
      const w = o, i = P.wires.indexOf(w), pts = C.route(P, w, i);
      const nm = (e) => (e.dev ? `${e.dev} «${e.term}»` : e.bus ? `шина ${e.bus}` : e.feed ? `ввод ${e.feed}` : e.line ? `кабель линии, жила ${e.core}` : '?');
      return `<h3>Провод</h3><div class="kv">${esc(nm(w.a))} → ${esc(nm(w.b))}</div>
<label>Проводник</label><select data-wf="cond">${opt(['L', 'L1', 'L2', 'L3', 'N', 'PE', 'PEN'], w.cond, (v) => ({ L: 'L — фаза (коричневый)', L1: 'L1 (коричневый)', L2: 'L2 (чёрный)', L3: 'L3 (серый)', N: 'N — нуль (синий)', PE: 'PE (жёлто-зелёный)', PEN: 'PEN' }[v]))}</select>
<label>Сечение, мм²</label><select data-wf="mm2">${opt(C.SECTIONS, w.mm2, (v) => String(v).replace('.', ','))}</select>
<div class="kv"><span>Длина по трассе:</span> ${pts ? S.fmt(C.pathLen(pts) / 1000 + 0.1, 2) : '—'} м с запасом на разделку</div>
<div class="kv"><span>Наконечник НШВИ:</span> ${String(w.mm2).replace('.', ',')} мм², цвет по DIN 46228-4</div>
<p class="small muted">Потяни горизонтальный участок вверх-вниз или вертикальный влево-вправо, чтобы сдвинуть провод в канале.</p>
<div class="row"><button class="btn sm" type="button" data-act="reroute">${S.icon('refresh')}Сбросить трассу</button><button class="btn sm" type="button" data-act="del">${S.icon('trash')}Удалить</button></div>`;
    }
    if (E.sel.kind === 'bus') {
      const b = o;
      return `<h3>Шина ${esc(b.id)}</h3>
<label>Обозначение</label><input class="inp" data-bf="id" value="${esc(b.id)}">
<label>Назначение</label><select data-bf="kind">${opt(['N', 'PE'], b.kind, (v) => (v === 'N' ? 'N — нулевая рабочая' : 'PE — защитная'))}</select>
<label>Место</label><select data-bf="zone">${opt(['top', 'bottom'], b.zone, (v) => (v === 'top' ? 'Сверху' : 'Снизу'))}</select>
<label>Отверстий</label><select data-bf="n">${opt([4, 6, 8, 10, 12, 14, 16, 18, 20, 24], b.n)}</select>
<label>Сдвиг от левого края, мм</label><input class="inp" type="number" step="1" data-bf="x" value="${Math.round(b.x)}">
<p class="small muted">Каждому проводнику — свой зажим (ГОСТ 32395-2020, п. 6.3.6).</p>
<div class="row"><button class="btn sm" type="button" data-act="del">${S.icon('trash')}Удалить</button></div>`;
    }
    if (E.sel.kind === 'line') {
      const l = o;
      return `<h3>Линия ${esc(String(l.num))}</h3>
<label>Номер группы</label><input class="inp" type="number" data-lf="num" value="${esc(String(l.num))}">
<label>Назначение</label><input class="inp" data-lf="name" value="${esc(l.name)}">
<label>Кабель</label><input class="inp" data-lf="cable" value="${esc(l.cable || '')}" placeholder="ВВГнг(А)-LS 3×2,5">
<label>Длина, м</label><input class="inp" type="number" data-lf="len" value="${esc(String(l.len || ''))}">
<label>Жилы</label><select data-lf="cores">${opt(['L,N,PE', 'L1,L2,L3,N,PE', 'L1,L2,L3,PE'], C.lineCores(P, l).join(','))}</select>
<p class="small muted">Подключи жилы кабеля проводами: нажми на цветную точку жилы внизу, затем на клемму.</p>
<div class="row"><button class="btn sm" type="button" data-act="del">${S.icon('trash')}Удалить</button></div>`;
    }
    if (E.sel.kind === 'comb') return `<h3>Гребёнка</h3><div class="kv">${esc(o.devs.join(', '))}</div><div class="row"><button class="btn sm" type="button" data-act="del">${S.icon('trash')}Удалить</button></div>`;
    return '';
  }

  function myFormHTML() {
    const L = LB();
    return `<h3>Свой аппарат</h3>
<label>Производитель и серия</label><input class="inp" data-my="series" placeholder="Меандр УЗМ-51М">
<label>Вид</label><select data-my="kind">${opt(Object.keys(L.KIND), 'mcb', (k) => L.KIND[k])}</select>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px"><div><label>Полюсов</label><select data-my="poles">${opt([1, 2, 3, 4], 1)}</select></div><div><label>Ширина, мод.</label><select data-my="w">${opt([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9], 1)}</select></div></div>
<label>Номиналы, А (через запятую)</label><input class="inp" data-my="In" placeholder="16, 25, 32, 40, 63">
<label>Высота корпуса, мм</label><input class="inp" type="number" data-my="h" value="85">
<label>Сечение клемм, примечание</label><input class="inp" data-my="note" placeholder="до 25 мм²; по паспорту">
<div class="row"><button class="btn sm primary" type="button" data-act="mydev-save">${S.icon('save')}Сохранить в библиотеку</button><button class="btn sm" type="button" data-act="mydev-cancel">Отмена</button></div>
<p class="small muted">Аппарат появится в библиотеке во вкладке «Мои». Библиотеку можно выгрузить в файл и загрузить на другом компьютере.</p>`;
  }

  /* ---------- вкладки ---------- */
  function schemeSVG() {
    const P = E.P, C = K(), V = S.svg, gr = C.groups(P);
    if (!gr.length) return '<p class="muted">Добавь отходящие линии и подключи их — схема строится по проводам щита.</p>';
    const all = gr.map((g) => new Set(g.chain.map((d) => d.id)));
    const common = gr[0].chain.filter((d) => all.every((s) => s.has(d.id))).reverse();
    const CW = 64, X0 = 170;
    const g = [];
    let y = 40;
    const fx = X0 - 30;
    g.push(V.tx(10, 18, esc(P.name), { size: 15, wt: 700 }), V.tx(10, 34, `Ввод ${P.feed.phases === 3 ? '3ф 400 В' : '1ф 230 В'} · ${P.feed.earthing.replace('>', '→')}`, { size: 11, f: 'var(--ink-2)' }));
    g.push(V.ln(fx, y, fx, y + 10)); y += 10;
    const symOf = (d) => (d.type === 'sw' ? 'sw' : d.type === 'rcd' ? 'rcd' : d.type === 'rcbo' ? 'rcbo' : d.type === 'rn' ? 'rn' : d.type === 'meter' ? 'meter' : d.type === 'spd' ? 'spd' : 'mcb');
    common.forEach((d) => { const f = V.sym[symOf(d)] || V.sym.mcb; g.push(f(fx, y, 46)); g.push(V.tx(fx + 16, y + 20, `${d.id} ${d.poles || ''}P ${d.curve || ''}${d.In || ''}${d.ma ? ' ' + d.ma + ' мА' : ''}`, { size: 10.5, fam: V.mono, wt: 700 })); y += 46; });
    const yB = y + 8;
    g.push(V.ln(fx, y, fx, yB));
    const colX = (i) => X0 + i * CW + CW / 2;
    g.push(V.ln(fx, yB, colX(gr.length - 1), yB, { w: 2.4 }));
    const yR = yB + 12, yM = yR + 64, yT = yM + 60;
    gr.forEach((x, i) => {
      const cx = colX(i);
      const rcd = x.chain.find((d) => (d.type === 'rcd') && !common.includes(d));
      const firstOfRcd = rcd && (i === 0 || !gr[i - 1].chain.includes(rcd));
      if (rcd) {
        if (firstOfRcd) {
          const last = gr.reduce((m, z, j) => (z.chain.includes(rcd) ? j : m), i);
          g.push(V.ln(cx, yB, cx, yR), V.sym.rcd(cx, yR, 44), V.tx(cx + 14, yR + 16, rcd.id, { size: 9.5, fam: V.mono, wt: 700 }), V.tx(cx + 14, yR + 28, `${rcd.In}А ${rcd.ma}мА`, { size: 8.5, fam: V.mono, f: 'var(--ink-2)' }));
          g.push(V.ln(cx, yR + 44, cx, yR + 54), V.ln(cx, yR + 54, colX(last), yR + 54));
        }
        g.push(V.ln(cx, yR + 54, cx, yM));
      } else g.push(V.ln(cx, yB, cx, yM));
      const p = x.prot;
      g.push(p ? (p.type === 'rcbo' ? V.sym.rcbo(cx, yM, 44) : V.sym.mcb(cx, yM, 44)) : V.ln(cx, yM, cx, yM + 44, { d: '3 3' }));
      g.push(V.ln(cx, yM + 44, cx, yT));
      if (p) g.push(V.tx(cx + 12, yM + 18, p.id, { size: 9.5, fam: V.mono, wt: 700 }));
      g.push(V.ci(cx, yB, 2.2, { f: 'var(--ink)' }));
    });
    const rows = [['Группа', (x) => String(x.l.num)], ['Аппарат', (x) => (x.prot ? x.prot.id : '—')], ['Защита', (x) => (x.prot ? `${x.prot.curve || ''}${x.prot.In || ''}${x.prot.ma ? ' ' + x.prot.ma + 'мА' : ''}` : '—')], ['Кабель', (x) => (x.l.cable || '').replace(/^.*?(\d+×[\d,]+).*$/, '$1')], ['Длина, м', (x) => (x.l.len ? String(x.l.len) : '—')]];
    rows.forEach((rd, ri) => {
      const yy = yT + ri * 16;
      g.push(V.rc(10, yy, X0 - 10 + gr.length * CW, 16, { s: 'var(--line-2)', f: ri % 2 ? 'var(--surface)' : 'var(--surface-2)', w: 0.6 }), V.tx(16, yy + 11.5, rd[0], { size: 9.5, wt: 600 }));
      gr.forEach((x, i) => g.push(V.tx(colX(i), yy + 11.5, esc(rd[1](x)), { a: 'middle', size: 9, fam: V.mono })));
    });
    const yN = yT + rows.length * 16, nh = 140;
    g.push(V.rc(10, yN, X0 - 10 + gr.length * CW, nh, { s: 'var(--line-2)', f: 'var(--surface)', w: 0.6 }), V.tx(16, yN + 14, 'Назначение', { size: 9.5, wt: 600 }));
    gr.forEach((x, i) => { const cx = colX(i); g.push(V.ln(cx - CW / 2, yT, cx - CW / 2, yN + nh, { s: 'var(--line-2)', w: 0.6 }), `<text transform="translate(${cx + 3} ${yN + nh - 6}) rotate(-90)" style="font-size:9.5px;fill:var(--ink)">${esc(x.l.name.length > 26 ? x.l.name.slice(0, 25) + '…' : x.l.name)}</text>`); });
    const Wd = X0 + gr.length * CW + 20, Hd = yN + nh + 14;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Wd} ${Hd}" width="${Wd}" height="${Hd}" class="sl-svg" style="font-family:var(--font-body);fill:var(--ink)">${g.join('')}</svg>`;
  }

  function tabHTML() {
    const P = E.P, C = K();
    if (E.tab === 'scheme') return `<div class="ed-pane">${schemeSVG()}</div>`;
    if (E.tab === 'groups') {
      const gr = C.groups(P);
      return `<div class="ed-pane">${gr.length ? S.B.tbl(['№', 'Назначение', 'Защита', 'УЗО', 'Кабель', 'Длина, м'], gr.map((x) => [esc(String(x.l.num)), esc(x.l.name), x.prot ? esc(`${x.prot.id} ${x.prot.curve || ''}${x.prot.In || ''}${x.prot.ma ? ' ' + x.prot.ma + ' мА' : ''}`) : '<span style="color:var(--danger)">нет</span>', esc((x.chain.find((d) => d.type === 'rcd') || {}).id || (x.prot && x.prot.type === 'rcbo' ? 'в дифавтомате' : '—')), esc(x.l.cable || ''), esc(String(x.l.len || ''))])) : '<p class="muted">Линий пока нет.</p>'}<p class="small muted">Эту таблицу печатают и вклеивают на дверцу щитка (ГОСТ 32395-2020, п. 6.2.25).</p></div>`;
    }
    if (E.tab === 'bom') return `<div class="ed-pane">${S.B.tbl(['Наименование', 'Кол-во'], C.bom(P).map((b) => [esc(b.name), `${S.fmt(b.qty, 1)} ${esc(b.unit)}`]))}<p class="small muted">Провод — по длине трасс плюс 20 %, наконечники — по числу концов плюс 20 %.</p></div>`;
    if (E.tab === 'checks') {
      const ch = C.checks(P);
      return `<div class="ed-pane"><div class="stack-sm">${ch.map((c) => `<div class="check-row ${c.level}">${S.icon(c.level === 'ok' ? 'check' : c.level === 'warn' ? 'alert' : 'x')}<div>${esc(c.text)}${c.ref ? `<span class="ref">${esc(c.ref)}</span>` : ''}</div></div>`).join('')}</div><p class="small muted" style="margin-top:10px">Проверка не заменяет расчёт токов КЗ, селективности и проект: она ловит ошибки сборки — чужие нули, лишние провода в клемме, линии без защиты.</p></div>`;
    }
    return `<div class="ed-canvas" data-canvas><div class="ed-hint" data-hint></div></div>`;
  }

  /* ---------- рисование холста ---------- */
  function drawCanvas() {
    const root = E.root;
    if (!root) return;
    const cv = root.querySelector('[data-canvas]');
    if (!cv) return;
    const D = S.edDraw(E.P, { sel: E.sel, interactive: true, tool: E.tool, wireStart: E.wireStart, ghost: E.ghost });
    const [x, y, w, h] = D.vb;
    if (!E.zoom) E.zoom = Math.max(0.8, Math.min(4, ((cv.clientWidth || 900) - 24) / w));
    let svg = cv.querySelector('svg');
    const html = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${Math.round(w * E.zoom)}" height="${Math.round(h * E.zoom)}">${D.svg}</svg>`;
    if (svg) svg.outerHTML = html; else cv.insertAdjacentHTML('beforeend', html);
    const hint = cv.querySelector('[data-hint]');
    if (hint) hint.textContent = E.wireStart ? 'Провод: нажми на вторую клемму, шину или жилу кабеля. Esc — отмена.' : E.tool === 'wire' ? 'Режим проводов: нажми на клемму' : 'Перетаскивай аппараты из библиотеки на рейку';
  }
  function refresh(part) {
    const root = E.root;
    if (!root) return;
    if (!part || part === 'props') root.querySelector('[data-props]').innerHTML = propsHTML();
    if (!part || part === 'tab') {
      const pane = root.querySelector('[data-pane]');
      if (E.tab === 'panel' && pane.querySelector('[data-canvas]')) drawCanvas();
      else { pane.innerHTML = tabHTML(); if (E.tab === 'panel') drawCanvas(); }
    }
    if (part === 'lib') root.querySelector('[data-lib]').innerHTML = libHTML();
    const u = root.querySelector('[data-act="undo"]'), r = root.querySelector('[data-act="redo"]');
    if (u) u.style.opacity = E.hist.length ? 1 : 0.45;
    if (r) r.style.opacity = E.fut.length ? 1 : 0.45;
  }
  function flash(msg) {
    const cv = E.root && E.root.querySelector('[data-canvas]');
    if (!cv) { S.toast && S.toast(msg); return; }
    let m = cv.querySelector('.ed-msg');
    if (!m) { m = document.createElement('div'); m.className = 'ed-msg'; cv.appendChild(m); }
    m.textContent = msg;
    clearTimeout(flash.t);
    flash.t = setTimeout(() => m.remove(), 4200);
  }

  /* ---------- координаты ---------- */
  function svgPt(ev) {
    const svg = E.root.querySelector('[data-canvas] svg');
    if (!svg) return null;
    const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }
  function slotAt(p, w) {
    const C = K(), G = C.G;
    let row = -1, best = 1e9;
    for (let i = 0; i < E.P.rows; i++) { const dy = Math.abs(p.y - C.railY(i)); if (dy < best) { best = dy; row = i; } }
    if (best > G.ZONE / 2 + G.DUCT / 2) return null;
    const x = Math.round(((p.x - G.SD) / G.MOD - w / 2) * 2) / 2;
    return { row, x: Math.max(0, Math.min(E.P.mods - w, x)) };
  }

  /* ---------- действия ---------- */
  function addDevice(sid, at) {
    const P = E.P, C = K();
    const d = LB().make(sid);
    if (!d) return;
    let place = at;
    if (place && !K().placeShift(clone(P), place.row, place.x, d.w)) { flash('Здесь не помещается: на рейке не хватает места.'); return; }
    if (!place) {
      outer: for (let row = 0; row < P.rows; row++) for (let x = 0; x <= P.mods - d.w; x += 0.5) if (C.fits(P, row, x, d.w)) { place = { row, x }; break outer; }
      if (!place) { flash('Свободного места нет: добавь ряд или увеличь ширину рядов в свойствах щита.'); return; }
    }
    commit(() => {
      d.id = C.nextId(P, d.type); d.row = place.row; d.x = place.x; d.label = '';
      C.placeShift(P, d.row, d.x, d.w);
      P.devs.push(d);
      E.sel = { kind: 'dev', id: d.id };
    });
  }
  function delSel() {
    const s = E.sel;
    if (!s) return;
    commit(() => {
      const P = E.P;
      if (s.kind === 'dev') { P.devs = P.devs.filter((d) => d.id !== s.id); P.wires = P.wires.filter((w) => w.a.dev !== s.id && w.b.dev !== s.id); P.combs = P.combs.map((c) => Object.assign(c, { devs: c.devs.filter((x) => x !== s.id) })).filter((c) => c.devs.length > 1); }
      if (s.kind === 'wire') P.wires = P.wires.filter((w) => w.id !== s.id);
      if (s.kind === 'bus') { P.buses = P.buses.filter((b) => b.id !== s.id); P.wires = P.wires.filter((w) => w.a.bus !== s.id && w.b.bus !== s.id); }
      if (s.kind === 'line') { P.lines = P.lines.filter((l) => l.id !== s.id); P.wires = P.wires.filter((w) => w.a.line !== s.id && w.b.line !== s.id); }
      if (s.kind === 'comb') P.combs = P.combs.filter((c) => c.id !== s.id);
      E.sel = null;
    });
  }
  function endFromEl(el) {
    if (el.dataset.tdev) return { dev: el.dataset.tdev, term: el.dataset.term };
    if (el.dataset.tbus) {
      const b = E.P.buses.find((x) => x.id === el.dataset.tbus);
      let slot = Number(el.dataset.slot);
      const busy = (k) => E.P.wires.some((w) => (w.a.bus === b.id && w.a.slot === k) || (w.b.bus === b.id && w.b.slot === k));
      if (busy(slot)) { const free = [...Array(b.n).keys()].find((k) => !busy(k)); if (free === undefined) return { full: true }; slot = free; }
      return { bus: b.id, slot };
    }
    if (el.dataset.feed) return { feed: el.dataset.feed };
    if (el.dataset.line) return { line: el.dataset.line, core: el.dataset.core };
    return null;
  }
  function wireClick(e) {
    if (e.full) { flash('На шине нет свободных отверстий — увеличь число отверстий в её свойствах.'); return; }
    if (!E.wireStart) { E.wireStart = e; refresh('tab'); return; }
    const a = E.wireStart; E.wireStart = null;
    const P = E.P, C = K();
    const w = { id: uid('w'), a, b: e, cond: '', mm2: 2.5 };
    const err = C.canWire(P, w);
    if (err) { flash(err); refresh('tab'); return; }
    w.cond = C.guessCond(P, w) || (e.feed || a.feed) || (e.core || a.core) || '';
    const dev = [a, e].map((x) => x.dev && P.devs.find((d) => d.id === x.dev)).find(Boolean);
    w.mm2 = dev && dev.In ? (dev.In <= 10 ? 1.5 : dev.In <= 16 ? 2.5 : dev.In <= 25 ? 4 : dev.In <= 32 ? 6 : dev.In <= 50 ? 10 : 16) : 2.5;
    commit(() => { P.wires.push(w); E.sel = { kind: 'wire', id: w.id }; });
  }

  /* ---------- печать ---------- */
  function sheetSVG(kind, fmt) {
    const P = E.P, m = P.meta;
    const [SW, SH] = fmt === 'A4' ? [297, 210] : [420, 297];
    const ix = 20, iy = 5, iw = SW - 25, ih = SH - 10;
    const tbW = 185, tbH = 55, tbx = ix + iw - tbW, tby = iy + ih - tbH;
    const ln = (x1, y1, x2, y2, w) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke:#000;stroke-width:${w || 0.25}"/>`;
    const tx = (x, y, s, size, o = {}) => `<text x="${x}" y="${y}" text-anchor="${o.a || 'start'}" style="font-family:Arial,sans-serif;font-size:${size}px;fill:#000;${o.b ? 'font-weight:700;' : ''}">${esc(s)}</text>`;
    let tb = `<rect x="${tbx}" y="${tby}" width="${tbW}" height="${tbH}" style="fill:#fff;stroke:#000;stroke-width:0.6"/>`;
    const cols = [10, 10, 10, 10, 15, 10];
    let cx = tbx;
    cols.forEach((w) => { cx += w; tb += ln(cx, tby, cx, tby + tbH, cx === tbx + 65 ? 0.6 : 0.25); });
    for (let i = 1; i < 11; i++) tb += ln(tbx, tby + i * 5, tbx + 65, tby + i * 5, i === 5 || i === 6 ? 0.6 : 0.25);
    ['Изм.', 'Кол.уч', 'Лист', '№ док.', 'Подп.', 'Дата'].forEach((h, i) => { tb += tx(tbx + cols.slice(0, i).reduce((a, b) => a + b, 0) + 1, tby + 29, h, 2.4); });
    [['Разраб.', m.author], ['Пров.', m.checker], ['', ''], ['Н. контр.', ''], ['', '']].forEach(([h, v], i) => { tb += tx(tbx + 1, tby + 34 + i * 5, h, 2.4) + tx(tbx + 21, tby + 34 + i * 5, v || '', 2.4); });
    const rx = tbx + 65;
    tb += ln(rx, tby + 15, tbx + tbW, tby + 15, 0.6) + ln(rx, tby + 30, tbx + tbW, tby + 30, 0.6) + ln(rx, tby + 40, tbx + tbW, tby + 40, 0.6);
    tb += ln(rx + 70, tby + 15, rx + 70, tbH + tby, 0.6) + ln(rx + 85, tby + 15, rx + 85, tby + 30, 0.25) + ln(rx + 100, tby + 15, rx + 100, tby + 30, 0.25) + ln(rx + 70, tby + 20, tbx + tbW, tby + 20, 0.25);
    tb += tx(rx + 60, tby + 9.5, m.code || '', 5, { a: 'middle', b: true });
    tb += tx(rx + 2, tby + 21, (m.object || P.name).slice(0, 40), 3.2) + tx(rx + 2, tby + 26, '', 3);
    tb += tx(rx + 72, tby + 18.6, 'Стадия', 2.4) + tx(rx + 87, tby + 18.6, 'Лист', 2.4) + tx(rx + 102, tby + 18.6, 'Листов', 2.4);
    tb += tx(rx + 77.5, tby + 26.5, m.stage || 'Р', 3.4, { a: 'middle' }) + tx(rx + 92.5, tby + 26.5, String(m.sheet || 1), 3.4, { a: 'middle' }) + tx(rx + 110, tby + 26.5, String(m.sheets || 1), 3.4, { a: 'middle' });
    tb += tx(rx + 35, tby + 36, kind === 'panel' ? 'Щит. Общий вид с монтажом' : kind === 'scheme' ? 'Схема однолинейная принципиальная' : 'Спецификация', 2.8, { a: 'middle' });
    tb += tx(rx + 35, tby + 49, P.name.slice(0, 44), 3, { a: 'middle', b: true }) + tx(rx + 85, tby + 49, (m.org || '').slice(0, 24), 3, { a: 'middle' });
    const frame = `<rect x="0" y="0" width="${SW}" height="${SH}" style="fill:#fff;stroke:#bbb;stroke-width:0.2"/><rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" style="fill:none;stroke:#000;stroke-width:0.6"/>`;
    const area = { x: ix + 5, y: iy + 5, w: iw - 10, h: ih - tbH - 10 };
    let content = '';
    if (kind === 'panel') {
      const D = S.edDraw(P, {});
      const [vx, vy, vw, vh] = D.vb;
      const gr = K().groups(P);
      const tw = gr.length ? Math.min(150, area.w * 0.45) : 0;
      const pw = area.w - tw - (tw ? 8 : 0);
      const sc = Math.min(pw / vw, area.h / vh, 1);
      content = `<g transform="translate(${area.x + (pw - vw * sc) / 2} ${area.y}) scale(${sc}) translate(${-vx} ${-vy})">${D.svg}</g>${tx(area.x, area.y + area.h, `Масштаб 1:${Math.round(1 / sc * 10) / 10}`.replace('.', ','), 3)}`;
      if (tw) {
        const tx0 = area.x + area.w - tw, cw = [8, tw - 8 - 22 - 26 - 28, 22, 26, 28], rh = 6;
        const head = ['№', 'Назначение', 'Аппарат', 'Защита', 'Кабель'];
        const rowsT = gr.slice(0, Math.floor((area.h - 14) / rh) - 1).map((x) => [String(x.l.num), x.l.name, x.prot ? x.prot.id : '—', x.prot ? `${x.prot.curve || ''}${x.prot.In || ''}${x.prot.ma ? ' ' + x.prot.ma + 'мА' : ''}` : '—', (x.l.cable || '').replace(/^.*?(\d+×[\d,]+).*$/, '$1')]);
        content += tx(tx0, area.y + 4, 'Таблица групп', 3.6, { b: true });
        [head].concat(rowsT).forEach((row, ri) => {
          const y = area.y + 8 + ri * rh;
          content += `<rect x="${tx0}" y="${y}" width="${tw}" height="${rh}" style="fill:${ri ? '#fff' : '#eee'};stroke:#000;stroke-width:0.2"/>`;
          let cx = tx0;
          row.forEach((c, ci) => { const max = Math.floor(cw[ci] / 1.55); content += tx(cx + 1.2, y + 4.2, String(c).length > max ? String(c).slice(0, max - 1) + '…' : String(c), 2.8, { b: !ri }); cx += cw[ci]; if (ci < row.length - 1) content += ln(cx, y, cx, y + rh, 0.2); });
        });
      }
    } else if (kind === 'scheme') {
      const s = schemeSVG();
      const mm = s.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
      if (mm) { const vw = +mm[1], vh = +mm[2], sc = Math.min(area.w / vw, area.h / vh); content = `<g transform="translate(${area.x} ${area.y}) scale(${sc})">${s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g>`; }
    } else {
      const rows = K().bom(P);
      content = tx(area.x, area.y + 6, 'Спецификация оборудования, изделий и материалов', 4, { b: true });
      rows.forEach((b, i) => { const y = area.y + 14 + i * 6; content += ln(area.x, y + 1.6, area.x + area.w, y + 1.6, 0.15) + tx(area.x + 2, y, `${i + 1}. ${b.name}`, 3.2) + tx(area.x + area.w - 2, y, `${S.fmt(b.qty, 1)} ${b.unit}`, 3.2, { a: 'end' }); });
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SW} ${SH}" width="${SW}mm" height="${SH}mm" style="font-family:Arial,sans-serif;--ink:#000;--ink-2:#333;--line-2:#666;--surface:#fff;--surface-2:#f2f2f2;--accent:#0969da;--enc:#e4e8ec;--enc-line:#b5bec7;--rail:#aeb4af;--w-l1:#8A5426;--w-l2:#1D1D1D;--w-l3:#8E9497;--w-n:#2A6CD6;--w-pe:#2F9B4A;--w-pey:#E2BE14;--font-body:Arial,sans-serif;--font-mono:Consolas,monospace">${frame}${content}${tb}</svg>`;
  }
  async function printSheets(fmt, kinds) {
    const sheets = kinds.map((k, i) => { E.P.meta.sheet = i + 1; E.P.meta.sheets = kinds.length; return sheetSVG(k, fmt); });
    const [SW, SH] = fmt === 'A4' ? [297, 210] : [420, 297];
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(E.P.name)}</title><style>@page{size:${fmt} landscape;margin:0}body{margin:0}svg{display:block;width:${SW}mm;height:${SH}mm;page-break-after:always}</style></head><body>${sheets.join('')}<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.open(); w.document.write(html); w.document.close(); return; }
    await S.saveFile((E.P.name || 'shchit') + '.html', html, 'text/html;charset=utf-8');
    S.toast && S.toast('Окно печати заблокировано: лист сохранён файлом — открой его и напечатай');
  }

  E.sheetSVG = sheetSVG;
  E.schemeSVG = schemeSVG;

  /* ---------- экран ---------- */
  S.view('editor', {
    tab: 'editor', top: true,
    render() {
      load(); css();
      return `<div class="wrap ed-wrap">
<div class="ed-top">
<input class="inp" data-name value="${esc(E.P.name)}" aria-label="Название щита">
<button class="btn sm" type="button" data-act="new">${S.icon('plus')}Новый</button>
<button class="btn sm" type="button" data-act="from-builder">${S.icon('panel')}Из конструктора</button>
<button class="btn sm" type="button" data-act="open">${S.icon('doc')}Мои щиты</button>
<button class="btn sm" type="button" data-act="save-as">${S.icon('save')}Сохранить</button>
<button class="btn sm" type="button" data-act="export">${S.icon('download')}Файл</button>
<button class="btn sm" type="button" data-act="import">${S.icon('upload')}Открыть файл</button>
<span class="sep"></span>
<button class="btn sm" type="button" data-act="undo" title="Отменить (Ctrl+Z)">↶</button><button class="btn sm" type="button" data-act="redo" title="Вернуть (Ctrl+Y)">↷</button>
<button class="btn sm" type="button" data-tool="select" aria-pressed="${E.tool === 'select'}">Выбор</button><button class="btn sm" type="button" data-tool="wire" aria-pressed="${E.tool === 'wire'}">${S.icon('cable')}Провод</button>
<button class="btn sm" type="button" data-act="zoom-out" title="Мельче">−</button><button class="btn sm" type="button" data-act="zoom-fit" title="По ширине окна">⤢</button><button class="btn sm" type="button" data-act="zoom-in" title="Крупнее">+</button>
<span class="sep"></span>
<button class="btn sm" type="button" data-act="check">${S.icon('shield')}Проверить</button>
<button class="btn sm primary" type="button" data-act="print">${S.icon('doc')}Печать и PDF</button>
</div>
<div class="ed-main">
<aside class="ed-side" data-lib>${libHTML()}</aside>
<section class="ed-center"><div class="ed-tabs" role="tablist">${[['panel', 'Вид щита'], ['scheme', 'Однолинейная схема'], ['groups', 'Группы'], ['bom', 'Спецификация'], ['checks', 'Проверки']].map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${E.tab === k}">${l}</button>`).join('')}</div><div data-pane style="flex:1;display:flex;flex-direction:column;min-height:420px">${tabHTML()}</div></section>
<aside class="ed-side ed-props" data-props>${propsHTML()}</aside>
</div>
<input type="file" accept=".json,application/json" data-file hidden><input type="file" accept=".json,application/json" data-libfile hidden>
</div>`;
    },
    mount(root) {
      E.root = root;
      load();
      drawCanvas();
      refresh();
      const P = () => E.P;

      root.addEventListener('input', (e) => {
        const el = e.target;
        if (el.matches('[data-q]')) { E.q = el.value; const lib = root.querySelector('[data-lib]'); const pos = el.selectionStart; lib.innerHTML = libHTML(); const q = lib.querySelector('[data-q]'); q.focus(); q.setSelectionRange(pos, pos); }
        if (el.matches('[data-name]')) { P().name = el.value; save(); }
      });
      root.addEventListener('change', (e) => {
        const el = e.target;
        const val = el.type === 'number' ? Number(el.value) : el.value;
        const o = findSel();
        if (el.dataset.pf) commit(() => {
          const k = el.dataset.pf;
          if (k === 'name') { P().name = val; root.querySelector('[data-name]').value = val; }
          else if (k === 'rows' || k === 'mods') { P()[k] = Number(val); }
          else if (k === 'phases') P().feed.phases = Number(val);
          else P().feed[k] = val;
        }, true);
        if (el.dataset.mf) { P().meta[el.dataset.mf] = val; save(); }
        if (el.dataset.df && o) commit(() => {
          const k = el.dataset.df, d = o, C = K();
          if (k === 'id') {
            const nv = String(val).trim();
            if (!nv || P().devs.some((x) => x.id === nv && x !== d)) { flash('Такое обозначение уже есть.'); return; }
            P().wires.forEach((w) => [w.a, w.b].forEach((x) => { if (x.dev === d.id) x.dev = nv; }));
            P().combs.forEach((c) => { c.devs = c.devs.map((x) => (x === d.id ? nv : x)); });
            d.id = nv; E.sel.id = nv;
          } else if (k === 'sid') {
            const nd = LB().make(val, { poles: d.poles, In: d.In, curve: d.curve, ma: d.ma, rt: d.rt });
            const s = LB().byId(val);
            if (!s.poles.includes(d.poles)) nd.poles = s.poles[0];
            nd.w = LB().widthOf(s, nd.poles);
            if (nd.w !== d.w && !C.placeShift(P(), d.row, d.x, nd.w, d.id)) { flash('Новая серия шире и не помещается на рейке.'); return; }
            Object.assign(d, nd);
          } else if (k === 'poles') {
            const s = C.spec(d), nw = LB().widthOf(s, Number(val));
            if (!C.placeShift(P(), d.row, d.x, nw, d.id)) { flash('Не помещается: на рейке не хватает места.'); return; }
            d.poles = Number(val); d.w = nw;
            P().wires = P().wires.filter((w) => ![w.a, w.b].some((x) => x.dev === d.id && !C.termNames(d).top.concat(C.termNames(d).bot).includes(x.term)));
          } else if (k === 'w') {
            if (!C.placeShift(P(), d.row, d.x, Number(val), d.id)) { flash('Не помещается.'); return; }
            d.w = Number(val);
          } else d[k] = ['In', 'ma'].includes(k) ? Number(val) : val;
        }, true);
        if (el.dataset.wf && o) commit(() => { o[el.dataset.wf] = el.dataset.wf === 'mm2' ? Number(val) : val; }, true);
        if (el.dataset.bf && o) commit(() => {
          const k = el.dataset.bf;
          if (k === 'id') { const nv = String(val).trim(); if (!nv || P().buses.some((b) => b.id === nv && b !== o)) return; P().wires.forEach((w) => [w.a, w.b].forEach((x) => { if (x.bus === o.id) x.bus = nv; })); o.id = nv; E.sel.id = nv; }
          else o[k] = k === 'n' || k === 'x' ? Number(val) : val;
        }, true);
        if (el.dataset.lf && o) commit(() => {
          const k = el.dataset.lf;
          if (k === 'cores') { o.cores = String(val).split(','); P().wires = P().wires.filter((w) => ![w.a, w.b].some((x) => x.line === o.id && !o.cores.includes(x.core))); }
          else o[k] = k === 'num' || k === 'len' ? Number(val) : val;
        }, true);
        if (el.matches('[data-file]') && el.files[0]) {
          const f = el.files[0]; el.value = '';
          f.text().then((t) => { try { const p = JSON.parse(t); if (!p.devs || !p.rows) throw new Error('fmt'); commit(() => { E.P = p; E.sel = null; }); S.toast && S.toast('Щит загружен'); } catch (er) { flash('Это не файл щита редактора.'); } });
        }
        if (el.matches('[data-libfile]') && el.files[0]) {
          const f = el.files[0]; el.value = '';
          f.text().then((t) => { try { const arr = JSON.parse(t); if (!Array.isArray(arr)) throw new Error('fmt'); const mine = LB().loadMine(); arr.forEach((x) => { if (x.id && !mine.some((m) => m.id === x.id)) mine.push(x); }); LB().saveMine(mine); E.brand = 'my'; refresh('lib'); S.toast && S.toast('Библиотека пополнена'); } catch (er) { flash('Это не файл библиотеки аппаратов.'); } });
        }
      });

      root.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.brand) { E.brand = b.dataset.brand; refresh('lib'); return; }
        if (b.dataset.tab) { E.tab = b.dataset.tab; root.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === b))); root.querySelector('[data-pane]').innerHTML = tabHTML(); if (E.tab === 'panel') drawCanvas(); return; }
        if (b.dataset.tool) { E.tool = b.dataset.tool; E.wireStart = null; root.querySelectorAll('[data-tool]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); drawCanvas(); return; }
        const act = b.dataset.act;
        if (!act) return;
        const C = K();
        if (act === 'undo') undo();
        else if (act === 'redo') redo();
        else if (act === 'zoom-in') { E.zoom = Math.min(8, E.zoom * 1.25); drawCanvas(); }
        else if (act === 'zoom-out') { E.zoom = Math.max(0.8, E.zoom / 1.25); drawCanvas(); }
        else if (act === 'zoom-fit') { E.zoom = 0; drawCanvas(); }
        else if (act === 'del') delSel();
        else if (act === 'new') commit(() => { E.P = C.blank(); E.sel = null; });
        else if (act === 'from-builder') {
          const cfg = S.getBuilderCfg && S.getBuilderCfg();
          if (!cfg) { flash('Сначала собери щит в конструкторе.'); return; }
          commit(() => { E.P = C.fromBuilder(S.engine.build(cfg), E.brand === 'all' || E.brand === 'my' ? 'ekf' : E.brand); E.sel = null; });
          S.toast && S.toast('Щит перенесён из конструктора с проводами');
        } else if (act === 'save-as') {
          let list = []; try { list = JSON.parse(localStorage.getItem(LSL) || '[]'); } catch (er) { list = []; }
          const i = list.findIndex((x) => x.name === P().name);
          const item = { name: P().name, at: new Date().toISOString().slice(0, 16).replace('T', ' '), P: P() };
          if (i >= 0) list[i] = item; else list.unshift(item);
          try { localStorage.setItem(LSL, JSON.stringify(list.slice(0, 40))); S.toast && S.toast('Сохранено в «Мои щиты»'); } catch (er) { flash('Не хватает памяти браузера — выгрузи щит в файл.'); }
        } else if (act === 'open') {
          let list = []; try { list = JSON.parse(localStorage.getItem(LSL) || '[]'); } catch (er) { list = []; }
          E.sel = null; E.myForm = false;
          root.querySelector('[data-props]').innerHTML = `<h3>Мои щиты</h3>${list.length ? list.map((x, i) => `<div class="ed-card" style="cursor:pointer" data-openi="${i}"><div><b>${esc(x.name)}</b><span>${esc(x.at)}</span></div></div>`).join('') : '<p class="small muted">Сохранённых щитов пока нет. Нажми «Сохранить».</p>'}`;
        } else if (act === 'export') S.saveFile((P().name || 'shchit') + '.json', JSON.stringify(P(), null, 1), 'application/json');
        else if (act === 'import') root.querySelector('[data-file]').click();
        else if (act === 'add-line') commit(() => { const n = P().lines.reduce((m, l) => Math.max(m, l.num || 0), 0) + 1; const l = { id: uid('l'), num: n, name: 'Новая линия', cable: P().feed.phases === 3 ? 'ВВГнг(А)-LS 3×2,5' : 'ВВГнг(А)-LS 3×2,5', len: 15 }; P().lines.push(l); E.sel = { kind: 'line', id: l.id }; });
        else if (act === 'add-busN' || act === 'add-busPE') commit(() => { const kind = act === 'add-busN' ? 'N' : 'PE'; const zone = kind === 'N' ? 'top' : 'bottom'; const xs = P().buses.filter((x) => x.zone === zone).map((x) => x.x + 20 + (x.n - 1) * 8 + 10); let id = kind === 'N' ? 'N' : 'PE'; let k = 1; while (P().buses.some((x) => x.id === id + (k > 1 || kind === 'N' ? k : ''))) k++; id = id + (k > 1 || kind === 'N' ? k : ''); const nb = { id, kind, zone, x: xs.length ? Math.max(...xs) : 6, n: 10 }; P().buses.push(nb); E.sel = { kind: 'bus', id: nb.id }; });
        else if (act === 'reroute') { const w = findSel(); if (w) commit(() => { w.dy = 0; w.dx = 0; }, true); }
        else if (act === 'dup') { const d = findSel(); if (d) addDevice(d.sid); }
        else if (act === 'comb') {
          const d = findSel();
          if (!d) return;
          const row = P().devs.filter((x) => x.row === d.row).sort((a, c) => a.x - c.x);
          const run = []; let cur = d;
          const kindOk = (x) => (x.type === 'mcb' || x.type === 'rcbo') && x.poles === d.poles;
          while (cur && kindOk(cur)) { run.push(cur); const nx = row.find((x) => Math.abs(x.x - (cur.x + cur.w)) < 1e-6); cur = nx; }
          if (run.length < 2) { flash('Справа нет соседних автоматов того же вида — гребёнку ставить не на что.'); return; }
          if (P().combs.some((c) => c.devs.some((x) => run.some((r) => r.id === x)))) { flash('Часть этих аппаратов уже на гребёнке.'); return; }
          commit(() => { const conds = d.poles >= 3 ? ['L1', 'L2', 'L3'] : ['L']; P().combs.push({ id: uid('c'), devs: run.map((x) => x.id), conds }); });
        } else if (act === 'check') { E.tab = 'checks'; root.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.tab === 'checks'))); root.querySelector('[data-pane]').innerHTML = tabHTML(); }
        else if (act === 'print') {
          E.sel = null; E.myForm = false;
          root.querySelector('[data-props]').innerHTML = `<h3>Печать и PDF</h3><label>Формат листа</label><select data-print-fmt><option>A3</option><option>A4</option></select>
<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-pk="panel" checked> Вид щита с монтажом</label><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-pk="scheme" checked> Однолинейная схема</label><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-pk="bom" checked> Спецификация</label>
<p class="small muted">Листы с рамкой и основной надписью. Данные штампа — в свойствах щита (нажми на пустое место холста). В окне печати выбери «Сохранить как PDF».</p><div class="row"><button class="btn sm primary" type="button" data-act="print-go">${S.icon('doc')}Печатать</button><button class="btn sm" type="button" data-act="print-svg">${S.icon('download')}Вид щита в SVG</button></div>`;
        } else if (act === 'print-go') {
          const fmt = root.querySelector('[data-print-fmt]').value;
          const kinds = [...root.querySelectorAll('[data-pk]')].filter((x) => x.checked).map((x) => x.dataset.pk);
          if (!kinds.length) { flash('Выбери хотя бы один лист.'); return; }
          printSheets(fmt, kinds);
        } else if (act === 'print-svg') S.saveFile((P().name || 'shchit') + '.svg', sheetSVG('panel', root.querySelector('[data-print-fmt]').value), 'image/svg+xml');
        else if (act === 'mydev') { E.myForm = true; E.sel = null; refresh('props'); }
        else if (act === 'mydev-cancel') { E.myForm = false; refresh('props'); }
        else if (act === 'mydev-save') {
          const g = (k) => root.querySelector(`[data-my="${k}"]`).value;
          const series = g('series').trim();
          if (!series) { flash('Укажи производителя и серию.'); return; }
          const In = g('In').split(/[,; ]+/).map(Number).filter((x) => x > 0);
          const item = { id: 'my-' + Date.now().toString(36), brand: 'my', series, kind: g('kind'), poles: [Number(g('poles'))], w: Number(g('w')), h: Number(g('h')) || 85, note: g('note') };
          if (In.length) item.In = In;
          if (item.kind === 'mcb' || item.kind === 'rcbo') item.curves = ['B', 'C', 'D'];
          if (item.kind === 'rcd' || item.kind === 'rcbo') { item.ma = [10, 30, 100, 300]; item.rt = ['AC', 'A']; }
          const mine = LB().loadMine(); mine.push(item); LB().saveMine(mine);
          E.myForm = false; E.brand = 'my'; refresh('lib'); refresh('props');
          S.toast && S.toast('Аппарат добавлен в «Мои»');
        } else if (act === 'mylib-export') S.saveFile('moi-apparaty.json', JSON.stringify(LB().loadMine(), null, 1), 'application/json');
        else if (act === 'mylib-import') root.querySelector('[data-libfile]').click();
      });
      root.addEventListener('click', (e) => {
        const it = e.target.closest('[data-openi]');
        if (!it) return;
        let list = []; try { list = JSON.parse(localStorage.getItem(LSL) || '[]'); } catch (er) { list = []; }
        const x = list[Number(it.dataset.openi)];
        if (x) { commit(() => { E.P = x.P; E.sel = null; }); root.querySelector('[data-name]').value = x.P.name; }
      });

      /* перетаскивание из библиотеки, перенос аппаратов, правка проводов, клики по холсту */
      let ghostEl = null;
      const onMove = (ev) => {
        const dr = E.drag;
        if (!dr) return;
        if (Math.hypot(ev.clientX - dr.cx, ev.clientY - dr.cy) > 4) dr.moved = true;
        if (!dr.moved) return;
        const p = svgPt(ev);
        if (dr.kind === 'new' || dr.kind === 'move') {
          if (dr.kind === 'new') { if (!ghostEl) { ghostEl = document.createElement('div'); ghostEl.className = 'ed-ghost'; ghostEl.textContent = dr.title; document.body.appendChild(ghostEl); } ghostEl.style.left = ev.clientX + 12 + 'px'; ghostEl.style.top = ev.clientY + 12 + 'px'; }
          const sl = p && slotAt(p, dr.w);
          if (sl) { const tmp = clone(E.P); const ok = K().placeShift(tmp, sl.row, sl.x, dr.w, dr.id); E.ghost = { row: sl.row, x: sl.x, w: dr.w, ok }; } else E.ghost = null;
          drawCanvas();
        } else if (dr.kind === 'seg' && p) {
          const w = E.P.wires.find((x) => x.id === dr.id);
          if (!w) return;
          if (dr.seg === 'h') w.dy = Math.max(-4, Math.min(K().G.DUCT - 12, dr.v0 + (p.y - dr.p0.y)));
          else w.dx = Math.max(-2, Math.min(K().G.SD - 10, dr.v0 + (dr.left ? p.x - dr.p0.x : dr.p0.x - p.x)));
          drawCanvas();
        }
      };
      const onUp = (ev) => {
        const dr = E.drag;
        E.drag = null;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        if (ghostEl) { ghostEl.remove(); ghostEl = null; }
        const gh = E.ghost; E.ghost = null;
        if (!dr) return;
        if (dr.kind === 'new') {
          if (!dr.moved) { addDevice(dr.sid); return; }
          if (gh && gh.ok) addDevice(dr.sid, { row: gh.row, x: gh.x }); else { if (gh) flash('Здесь не помещается: на рейке не хватает места.'); drawCanvas(); }
          return;
        }
        if (dr.kind === 'move') {
          if (!dr.moved) { E.sel = { kind: 'dev', id: dr.id }; refresh(); return; }
          if (gh && gh.ok) commit(() => { const d = E.P.devs.find((x) => x.id === dr.id); K().placeShift(E.P, gh.row, gh.x, d.w, d.id); d.row = gh.row; d.x = gh.x; E.sel = { kind: 'dev', id: d.id }; });
          else { if (gh) flash('Здесь не помещается.'); drawCanvas(); }
          return;
        }
        if (dr.kind === 'seg') {
          if (!dr.moved) { E.sel = { kind: 'wire', id: dr.id }; refresh(); return; }
          const w = E.P.wires.find((x) => x.id === dr.id);
          const v = dr.seg === 'h' ? w.dy : w.dx;
          if (dr.seg === 'h') w.dy = dr.v0; else w.dx = dr.v0;
          commit(() => { if (dr.seg === 'h') w.dy = v; else w.dx = v; E.sel = { kind: 'wire', id: w.id }; }, true);
        }
        void ev;
      };
      const startDrag = (dr, ev) => { E.drag = Object.assign(dr, { cx: ev.clientX, cy: ev.clientY, moved: false }); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); };

      root.addEventListener('pointerdown', (ev) => {
        if (ev.button !== 0) return;
        const card = ev.target.closest('.ed-card[data-sid]');
        if (card) {
          const s = LB().byId(card.dataset.sid);
          if (!s) return;
          ev.preventDefault();
          startDrag({ kind: 'new', sid: s.id, w: LB().widthOf(s, s.poles[0]), title: s.series }, ev);
          return;
        }
        const cv = ev.target.closest('[data-canvas]');
        if (!cv || !ev.target.closest('svg')) return;
        const term = ev.target.closest('[data-tdev],[data-tbus],[data-feed],[data-core]');
        if (term) { ev.preventDefault(); const en = endFromEl(term); if (en) wireClick(en); return; }
        const seg = ev.target.closest('[data-seg]');
        if (seg) {
          ev.preventDefault();
          const w = E.P.wires.find((x) => x.id === seg.dataset.wire);
          const p = svgPt(ev);
          const x1 = Number(seg.getAttribute('x1'));
          startDrag({ kind: 'seg', id: w.id, seg: seg.dataset.seg, p0: p, v0: seg.dataset.seg === 'h' ? (w.dy || 0) : (w.dx || 0), left: x1 < K().W(E.P) / 2 }, ev);
          return;
        }
        const dv = ev.target.closest('[data-dev]');
        if (dv && E.tool === 'select') {
          ev.preventDefault();
          const d = E.P.devs.find((x) => x.id === dv.dataset.dev);
          startDrag({ kind: 'move', id: d.id, w: d.w }, ev);
          return;
        }
        const bs = ev.target.closest('[data-bus]');
        if (bs) { E.sel = { kind: 'bus', id: bs.dataset.bus }; E.myForm = false; refresh(); return; }
        const lg = ev.target.closest('[data-lineg]');
        if (lg) { E.sel = { kind: 'line', id: lg.dataset.lineg }; E.myForm = false; refresh(); return; }
        const cb = ev.target.closest('[data-comb]');
        if (cb) { E.sel = { kind: 'comb', id: cb.dataset.comb }; refresh(); return; }
        if (E.wireStart) { E.wireStart = null; drawCanvas(); return; }
        E.sel = null; E.myForm = false; refresh();
      });

      const onKey = (ev) => {
        if (!document.body.contains(root)) { window.removeEventListener('keydown', onKey); return; }
        if (ev.target.closest && ev.target.closest('input,select,textarea')) return;
        const mod = ev.ctrlKey || ev.metaKey;
        if (mod && (ev.key === 'z' || ev.key === 'я') && !ev.shiftKey) { ev.preventDefault(); undo(); }
        else if (mod && (ev.key === 'y' || ev.key === 'н' || ((ev.key === 'z' || ev.key === 'Z') && ev.shiftKey))) { ev.preventDefault(); redo(); }
        else if (ev.key === 'Delete' || ev.key === 'Backspace') { if (E.sel) { ev.preventDefault(); delSel(); } }
        else if (ev.key === 'Escape') { E.wireStart = null; E.tool = 'select'; root.querySelectorAll('[data-tool]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.tool === 'select'))); drawCanvas(); }
      };
      window.addEventListener('keydown', onKey);
    }
  });
})();
