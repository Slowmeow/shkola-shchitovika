/* Школа щитовика — редактор щита: библиотека аппаратов по брендам, перетаскивание на рейки с живым предпросмотром,
   раздвижкой соседей и прилипанием, шины на корпусе и на DIN-рейке, провода от клеммы к клемме с прокладкой по каналам,
   гребёнки, автоподключение линий, свойства, клавиши, отмена, сохранение, импорт из конструктора,
   однолинейная схема, группы, спецификация, проверки и печать на лист с рамкой. */
(function () {
  'use strict';
  const S = window.SHK;
  const esc = S.esc;
  const K = () => S.edCore;
  const LB = () => S.edLib;
  const LS = 'shk:ed:cur', LSL = 'shk:ed:list';
  const E = (S.ed = { P: null, sel: null, tool: 'select', wireStart: null, hist: [], fut: [], zoom: 0, tab: 'panel', brand: 'ekf', q: '', drag: null, ghost: null, busGhost: null, view: null, root: null, myForm: false, newForm: false });

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
    norm(E.P);
  }
  /* старые щиты получают новые поля: маркировка проводов, вид, запас; провода без номера — номер по порядку */
  function norm(P) {
    P.pitch = P.pitch || 134;
    if (!P.wn) P.wn = { show: true, color: true, start: 1, auto: true };
    if (!P.view) P.view = { ferrules: true, stickers: false, dims: false };
    if (P.slack == null) P.slack = 20;
    if (!P.wireStyle) P.wireStyle = 'duct';
    K().numberWires(P, false);
    return P;
  }
  function save() { try { localStorage.setItem(LS, JSON.stringify(E.P)); } catch (e) { /* память браузера заполнена */ } }
  /* изменение с записью в историю; fn может вернуть строку — тогда изменение отменяется и показывается сообщение */
  /* страховка: действие не должно создать замыкание или испортить модель (наложения, оборванные провода) */
  function commit(fn, keepSel, noGuard) {
    const before = JSON.stringify(E.P);
    const f0 = noGuard ? null : new Set(K().faults(E.P)), v0 = noGuard ? null : new Set(K().validate(E.P));
    const res = fn();
    if (typeof res === 'string' && res) { if (JSON.stringify(E.P) !== before) E.P = JSON.parse(before); flash(res); refresh(); return false; }
    const notes = K().fixCombs(E.P);
    if (JSON.stringify(E.P) === before) { refresh(); return true; }
    if (!noGuard) {
      const nf = K().faults(E.P).filter((m) => !f0.has(m));
      const nv = K().validate(E.P).filter((m) => !v0.has(m));
      if (nf.length || nv.length) {
        E.P = JSON.parse(before);
        if (nv.length) { E.guardHits = (E.guardHits || 0) + 1; if (typeof console !== 'undefined') console.warn('editor guard', nv); }
        flash(nf.length ? nf[0] : 'Это действие испортило бы щит — оно отменено.');
        refresh();
        return false;
      }
    }
    if (notes.length) flash(notes.join('. ') + '.', 'note');
    E.hist.push(before);
    if (E.hist.length > 100) E.hist.shift();
    E.fut = [];
    if (!keepSel && E.sel && !findSel()) E.sel = null;
    save();
    refresh();
    return true;
  }
  function undo() { if (!E.hist.length) return; E.fut.push(JSON.stringify(E.P)); E.P = JSON.parse(E.hist.pop()); if (!findSel()) E.sel = null; E.wireStart = null; save(); refresh(); }
  function redo() { if (!E.fut.length) return; E.hist.push(JSON.stringify(E.P)); E.P = JSON.parse(E.fut.pop()); if (!findSel()) E.sel = null; E.wireStart = null; save(); refresh(); }
  const findSel = () => {
    const s = E.sel, P = E.P;
    if (!s) return null;
    if (s.kind === 'devs') { const ds = s.ids.map((id) => P.devs.find((d) => d.id === id)).filter(Boolean); return ds.length ? ds : null; }
    const list = { dev: P.devs, wire: P.wires, bus: P.buses, line: P.lines, comb: P.combs, note: P.notes || [] }[s.kind];
    return (list && list.find((x) => x.id === s.id)) || null;
  };
  /* выделение: один аппарат, несколько или ничего */
  const selIds = () => (!E.sel ? [] : E.sel.kind === 'dev' ? [E.sel.id] : E.sel.kind === 'devs' ? E.sel.ids.slice() : []);
  const setSel = (ids) => { E.sel = !ids.length ? null : ids.length === 1 ? { kind: 'dev', id: ids[0] } : { kind: 'devs', ids }; E.myForm = false; E.newForm = false; };
  const uid = (p) => p + Math.random().toString(36).slice(2, 7);
  const mm2Of = (In) => (!In ? 2.5 : In <= 10 ? 1.5 : In <= 16 ? 2.5 : In <= 25 ? 4 : In <= 32 ? 6 : In <= 50 ? 10 : 16);

  /* открыть щит конструктора в редакторе */
  S.openInEditor = (cfg, brand) => {
    if (!S.engine) return;
    const P = K().fromBuilder(S.engine.build(cfg), brand || (['ekf', 'iek', 'abb', 'se'].includes(E.brand) ? E.brand : 'ekf'));
    E.P = P; E.sel = null; E.hist = []; E.fut = []; E.tab = 'panel'; E.zoom = 0; E.wireStart = null;
    save();
    S.go('editor');
    S.toast && S.toast('Щит открыт в редакторе вместе с проводами');
  };

  /* ---------- стили ---------- */
  const CSS = `
.ed-wrap{max-width:none;padding:12px 16px 24px}
.ed-rib{border:1px solid var(--border);border-radius:var(--r-lg);background:var(--bg);margin-bottom:8px}
.ed-rib-tabs{display:flex;gap:2px;align-items:center;padding:4px 8px 0;border-bottom:1px solid var(--border);flex-wrap:wrap}
.ed-rib-tabs .inp{width:240px;max-width:40vw;padding:3px 8px;font-size:14px;font-weight:600;margin:0 10px 4px 0}
.ed-rib-tabs [data-rtab]{border:0;background:none;padding:6px 12px;font-size:13.5px;color:var(--fg-muted);border-bottom:2px solid transparent;cursor:pointer}
.ed-rib-tabs [data-rtab][aria-selected="true"]{color:var(--fg);border-bottom-color:var(--accent);font-weight:600}
.ed-rib-tabs .sp{flex:1}
.ed-rib-body{display:flex;align-items:stretch;padding:6px 6px 4px;overflow-x:auto;min-height:64px}
.ed-grp{display:flex;flex-direction:column;justify-content:space-between;padding:0 8px;border-right:1px solid var(--border-muted)}
.ed-grp:last-child{border-right:0}
.ed-grp .gi{display:flex;gap:2px;align-items:center}
.ed-grp .gl{font-size:11px;color:var(--fg-subtle);text-align:center;margin-top:3px;white-space:nowrap}
.ed-col{display:flex;flex-direction:column;gap:3px;margin:0 6px}
.ed-rb{display:flex;flex-direction:column;align-items:center;gap:2px;border:1px solid transparent;background:none;border-radius:6px;padding:4px 6px;font-size:12px;color:var(--fg);cursor:pointer;white-space:nowrap;min-width:50px;line-height:1.2}
.ed-rb:hover{background:var(--bg-muted);border-color:var(--border)}
.ed-rb[aria-pressed="true"]{background:var(--accent-subtle);border-color:var(--accent);color:var(--accent)}
.ed-rb .ic{width:18px;height:18px}
.ed-rb .nic{width:18px;height:18px}
.ed-rb.sm{flex-direction:row;min-width:0;padding:3px 9px;margin-bottom:4px}
.ed-rck{display:flex;gap:5px;align-items:center;font-size:12.5px;white-space:nowrap;color:var(--fg);cursor:pointer}
.ed-rib select{font-size:13px;padding:3px 6px;border:1px solid var(--btn-border);border-radius:6px;background:var(--bg);color:var(--fg)}
.ed-rib input[type="number"]{font-size:12.5px;padding:1px 4px;border:1px solid var(--btn-border);border-radius:5px;background:var(--bg);color:var(--fg)}
.ed-card{position:relative}
.ed-myb{position:absolute;top:4px;right:4px;display:flex;gap:2px}
.ed-myb button{border:1px solid var(--border);background:var(--bg);border-radius:5px;padding:2px 4px;cursor:pointer;color:var(--fg-muted);line-height:0}
.ed-myb button:hover{color:var(--danger);border-color:var(--danger)}
.ed-myb .ic{width:14px;height:14px}
body.ed-full .topbar,body.ed-full .xpstrip,body.ed-full #tabs,body.ed-full .tabs{display:none!important}
body.ed-full main{margin-left:0!important;padding:0!important}
body.ed-full .ed-wrap{padding:6px 8px;max-width:none;height:100vh;box-sizing:border-box;display:flex;flex-direction:column}
body.ed-full .ed-rib{flex:none}
body.ed-full .ed-main{flex:1;min-height:0;height:auto}
body.ed-full .ed-side{max-height:none;height:100%;box-sizing:border-box}
body.ed-full .ed-center{height:100%;min-height:0}
body.ed-full [data-pane]{min-height:0!important}
body.ed-full .ed-canvas{max-height:none;min-height:0}
@media (min-width:761px){body.ed-full .ed-main{grid-template-columns:200px minmax(0,1fr) 250px;grid-template-rows:minmax(0,1fr)}body.ed-full .ed-props{grid-column:auto}}
.ed-top{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
.ed-top .inp{flex:1 1 180px;max-width:320px}
.ed-top .sep{width:1px;align-self:stretch;background:var(--border);margin:0 4px}
.ed-top .btn[aria-pressed="true"]{background:var(--accent-subtle);border-color:var(--accent);color:var(--accent)}
.ed-main{display:grid;grid-template-columns:250px minmax(0,1fr) 280px;gap:10px;min-height:calc(100vh - var(--hdr) - 120px)}
.ed-side{border:1px solid var(--border);border-radius:var(--r-lg);background:var(--bg-subtle);padding:10px;overflow:auto;max-height:calc(100vh - var(--hdr) - 110px)}
.ed-center{border:1px solid var(--border);border-radius:var(--r-lg);background:var(--bg);display:flex;flex-direction:column;min-width:0}
.ed-canvas{flex:1;overflow:auto;position:relative;background:var(--bg-subtle);touch-action:pan-x pan-y;max-height:calc(100vh - var(--hdr) - 196px)}
.ed-canvas svg{display:block;margin:0 auto;user-select:none;-webkit-user-select:none}
.ed-canvas [data-dev],.ed-canvas [data-bus],.ed-canvas [data-tdev],.ed-canvas [data-tbus],.ed-canvas [data-seg],.ed-canvas [data-feed],.ed-canvas [data-core],.ed-canvas [data-comb]{touch-action:none}
.ed-canvas [data-tdev]:hover,.ed-canvas [data-tbus]:hover,.ed-canvas [data-feed]:hover,.ed-canvas [data-core]:hover{fill:var(--accent)!important;fill-opacity:.45!important;stroke:var(--accent)!important}
.ed-canvas [data-seg]:hover{stroke:var(--accent)!important;stroke-opacity:.35}
.ed-canvas [data-dev]:hover>rect:first-child{stroke:var(--accent)}
.ed-canvas.dragging,.ed-canvas.dragging *{cursor:grabbing!important}
.ed-canvas.moving g[data-wire],.ed-canvas.moving g[data-comb]{opacity:.25}
.ed-canvas.moving [data-tdev],.ed-canvas.moving [data-tbus]{display:none}
.ed-tabs{display:flex;gap:2px;padding:6px 8px 0;border-bottom:1px solid var(--border);overflow-x:auto}
.ed-tabs button{border:0;background:none;padding:7px 10px;font-size:14px;color:var(--fg-muted);border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap}
.ed-tabs button[aria-selected="true"]{color:var(--fg);border-bottom-color:var(--accent);font-weight:600}
.ed-chips{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0}
.ed-chips button{border:1px solid var(--btn-border);background:var(--bg);border-radius:2em;padding:3px 9px;font-size:13px;cursor:pointer}
.ed-chips button[aria-pressed="true"]{background:var(--accent-subtle);border-color:var(--accent);color:var(--accent)}
.ed-kind{font-size:12px;color:var(--fg-muted);margin:10px 0 4px;font-weight:600}
.ed-card{border:1px solid var(--border);background:var(--bg);border-radius:var(--r);padding:6px 8px;margin-bottom:5px;cursor:grab;display:block;touch-action:none;user-select:none}
.ed-card:hover{border-color:var(--accent)}
.ed-card b{font-size:13px;font-weight:600;display:block}
.ed-card span{font-size:12px;color:var(--fg-muted)}
.ed-card .w{display:block;font-size:11px;color:var(--fg-subtle);margin-top:2px}
.ed-props h3{font-size:15px;margin:0 0 8px}
.ed-props h4{font-size:13px;margin:14px 0 2px;color:var(--fg-muted)}
.ed-props label{display:block;font-size:12px;color:var(--fg-muted);margin:8px 0 3px}
.ed-props .inp,.ed-props select{width:100%}
.ed-props .row{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.ed-props .ed-kv{font-size:13px;margin:4px 0;color:var(--fg)}
.ed-props .ed-kv span{color:var(--fg-muted)}
.ed-props .g2{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.ed-rails{margin-top:8px;display:grid;gap:3px}
.ed-rail.ed-pitch span{color:var(--fg-subtle);padding-left:10px}
.ed-rail select{width:auto;font-size:12px;padding:1px 4px}
.ed-chk{display:flex!important;gap:6px;align-items:center;color:var(--fg)!important;font-size:13px!important;margin:6px 0 0!important}
.ed-ctx{position:fixed;z-index:60;background:var(--bg);border:1px solid var(--border);border-radius:var(--r);box-shadow:var(--shadow-md);padding:4px;min-width:230px}
.ed-ctx button{display:flex;width:100%;gap:8px;align-items:center;justify-content:space-between;border:0;background:none;padding:7px 10px;font-size:13.5px;text-align:left;cursor:pointer;border-radius:4px;color:var(--fg)}
.ed-ctx button:hover{background:var(--bg-muted)}
.ed-ctx button[disabled]{opacity:.45;cursor:default}
.ed-ctx .k{color:var(--fg-subtle);font-size:12px}
.ed-ctx hr{border:0;border-top:1px solid var(--border-muted);margin:4px 0}
.ed-canvas.erase,.ed-canvas.erase *{cursor:not-allowed!important}
.ed-rail{display:flex;gap:4px;align-items:center;font-size:12.5px}
.ed-rail span{flex:1;color:var(--fg-muted)}
.ed-rail button{border:1px solid var(--btn-border);background:var(--bg);border-radius:4px;padding:1px 7px;font-size:12px;cursor:pointer;color:var(--fg)}
.ed-rail button:hover{border-color:var(--accent);color:var(--accent)}
.ed-props .arrows{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:8px}
.ed-props .ok{color:var(--success)}.ed-props .no{color:var(--danger)}
.ed-status{display:flex;gap:10px;align-items:center;padding:5px 12px;border-top:1px solid var(--border);font-size:12.5px;color:var(--fg-muted);min-height:30px;border-radius:0 0 var(--r-lg) var(--r-lg)}
.ed-status.err{color:var(--danger);background:var(--danger-subtle)}
.ed-status.note{color:var(--fg);background:var(--bg-muted)}
.ed-status .z{margin-left:auto;white-space:nowrap;color:var(--fg-subtle)}
.ed-menu{position:relative}
.ed-drop{position:absolute;top:calc(100% + 4px);left:0;z-index:30;background:var(--bg);border:1px solid var(--border);border-radius:var(--r);box-shadow:var(--shadow-md);padding:4px;min-width:230px;display:none}
.ed-drop.open{display:block}
.ed-drop button{display:flex;width:100%;gap:8px;align-items:center;border:0;background:none;padding:8px 10px;font-size:14px;text-align:left;cursor:pointer;border-radius:4px;color:var(--fg)}
.ed-drop button:hover{background:var(--bg-muted)}
.ed-drop hr{border:0;border-top:1px solid var(--border-muted);margin:4px 0}
@media (min-width:1012px){body.ed-full .tabs{display:none}body.ed-full main{margin-left:0}}
.ed-pane{padding:12px;overflow:auto}
.ed-ghost{position:fixed;pointer-events:none;z-index:50;background:var(--bg);border:1px solid var(--accent);border-radius:var(--r);padding:4px 8px;font-size:12px;box-shadow:var(--shadow-md)}
.ed-keys{font-size:12px;color:var(--fg-muted);margin-top:10px;line-height:1.6}
.ed-keys .kbd{font-size:11px}
@media (max-width:1100px){.ed-main{grid-template-columns:210px minmax(0,1fr)}.ed-props{grid-column:1 / -1;max-height:none}}
@media (max-width:760px){.ed-main{grid-template-columns:1fr}.ed-side{max-height:260px}}
@media print{.ed-top,.ed-side,.ed-tabs{display:none}}`;
  function css() { if (document.getElementById('ed-css')) document.getElementById('ed-css').remove(); const s = document.createElement('style'); s.id = 'ed-css'; s.textContent = CSS; document.head.appendChild(s); }

  /* ---------- библиотека ---------- */
  function libHTML() {
    const L = LB();
    const q = E.q.trim().toLowerCase();
    const list = L.list().filter((s) => (E.brand === 'all' || s.brand === E.brand || (E.brand !== 'my' && s.brand === 'gen')) && (!q || (s.series + ' ' + (L.BRANDS[s.brand] || {}).name + ' ' + L.KIND[s.kind]).toLowerCase().includes(q)));
    const kinds = Object.keys(L.KIND).filter((k) => list.some((s) => s.kind === k));
    const brands = ['ekf', 'iek', 'abb', 'se', 'sys', 'my', 'all'];
    return `<input class="inp" data-q placeholder="Поиск: АВДТ, ВА47-29, УЗО" value="${esc(E.q)}" aria-label="Поиск по библиотеке">
<div class="ed-chips">${brands.map((b) => `<button type="button" data-brand="${b}" aria-pressed="${E.brand === b}">${b === 'all' ? 'Все' : esc(L.BRANDS[b].name)}</button>`).join('')}</div>
${kinds.map((k) => `<div class="ed-kind">${esc(L.KIND[k])}</div>${list.filter((s) => s.kind === k).map((s) => {
      const ws = s.wOpts ? `${s.wOpts.map((x) => String(x).replace('.', ',')).join(' / ')}` : s.poles.map((p) => `${p}P ${String(L.widthOf(s, p)).replace('.', ',')}`).join(' · ');
      return `<div class="ed-card" data-sid="${esc(s.id)}" title="Перетащи на рейку или нажми, чтобы поставить на свободное место"><b>${esc(s.brand === 'gen' || s.brand === 'my' ? s.series : (L.BRANDS[s.brand].name + ' ' + s.series))}</b><span>${s.In ? `${S.fmt(s.In[0], 1)}–${s.In[s.In.length - 1]} А` : ''}${s.ma ? ` · ${s.ma.join('/')} мА` : ''}${s.curves ? ` · ${s.curves.join(', ')}` : ''}</span><span class="w">${ws} мод.</span>${s.brand === 'my' ? `<span class="ed-myb"><button type="button" data-myedit="${esc(s.id)}" title="Изменить">${S.icon('edit')}</button><button type="button" data-mydel="${esc(s.id)}" title="Удалить из библиотеки">${S.icon('trash')}</button></span>` : ''}</div>`;
    }).join('')}`).join('') || '<p class="small muted">Ничего не найдено.</p>'}
<div class="row" style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" type="button" data-act="mydev">${S.icon('plus')}Свой аппарат</button><button class="btn sm" type="button" data-act="mylib-export">${S.icon('download')}Мои — в файл</button><button class="btn sm" type="button" data-act="mylib-import">${S.icon('upload')}Из файла</button></div>
<p class="small muted" style="margin-top:8px">Ширина — в модулях по 17,5 мм. Габариты сверяй с паспортом аппарата перед заказом.</p>`;
  }

  /* ---------- лента команд, как в Visio: Главная, Вставка, Провода, Вид, Отчёты ---------- */
  const RTABS = [['home', 'Главная'], ['insert', 'Вставка'], ['wires', 'Провода'], ['view', 'Вид'], ['reports', 'Отчёты']];
  const SHEETS = [['bom', 'Оборудование'], ['pe', 'Перечень элементов'], ['journal', 'Кабельный журнал'], ['groups', 'Группы'], ['scheme', 'Однолинейная схема'], ['checks', 'Проверки']];
  function ribbonHTML() {
    const C = K(), P = E.P, wn = C.WN(P), vw = C.VIEW(P), sh = vw.sheet || {};
    const rb = (attrs, icon, label, pressed, title) => `<button type="button" class="ed-rb" ${attrs}${pressed != null ? ` aria-pressed="${!!pressed}"` : ''}${title ? ` title="${esc(title)}"` : ''}>${icon ? S.icon(icon) : '<span class="nic"></span>'}<span>${label}</span></button>`;
    const grp = (label, inner) => `<div class="ed-grp"><div class="gi">${inner}</div><div class="gl">${label}</div></div>`;
    const ck = (key, on, label) => `<label class="ed-rck"><input type="checkbox" data-pf="${key}"${on ? ' checked' : ''}> ${label}</label>`;
    const tool = (t, icon, label, title) => rb(`data-tool="${t}"`, icon, label, E.tool === t, title);
    const t = E.rtab || 'home';
    const zoom = grp('Масштаб', rb('data-act="zoom-out"', 'minus', 'Мельче') + rb('data-act="zoom-fit"', 'eye', E.fit === 'all' ? 'По ширине' : 'Весь щит') + rb('data-act="zoom-in"', 'plus', 'Крупнее'));
    if (t === 'home') return grp('Щит', `<div class="ed-menu">${rb('data-act="menu" aria-haspopup="true"', 'panel', 'Щит ▾')}<div class="ed-drop" data-drop>
<button type="button" data-act="new">${S.icon('plus')}Новый щит</button>
<button type="button" data-act="from-builder">${S.icon('panel')}Взять из конструктора</button>
<button type="button" data-act="open">${S.icon('doc')}Мои щиты</button>
<hr><button type="button" data-act="export">${S.icon('download')}Скачать файл щита</button>
<button type="button" data-act="import">${S.icon('upload')}Открыть файл щита</button>
</div></div>` + rb('data-act="save-as"', 'save', 'Сохранить', null, 'Сохранить в «Мои щиты»'))
      + grp('Правка', rb('data-act="undo"', 'back', 'Отменить', null, 'Ctrl+Z') + rb('data-act="redo"', 'next', 'Вернуть', null, 'Ctrl+Y') + rb('data-act="copy"', 'copy', 'Копировать', null, 'Ctrl+C') + rb('data-act="cut"', 'minus', 'Вырезать', null, 'Ctrl+X') + rb('data-act="paste"', 'doc', 'Вставить', null, 'Ctrl+V') + rb('data-act="del"', 'trash', 'Удалить', null, 'Del'))
      + grp('Инструменты', tool('select', 'hand', 'Выбор') + tool('wire', 'cable', 'Провод', 'Нажми на клемму, затем на вторую') + tool('erase', 'x', 'Ластик', 'Нажми на то, что удалить') + tool('ruler', 'target', 'Линейка', 'Протяни — покажет расстояние в мм') + tool('note', 'edit', 'Выноска', 'Нажми на щит — появится выноска с текстом'))
      + zoom
      + grp('Готово', rb('data-act="check"', 'shield', 'Проверить') + rb('data-act="print"', 'doc', 'Печать и PDF'));
    if (t === 'insert') return grp('Добавить на щит', rb('data-act="add-line"', 'cable', 'Линия', null, 'Отходящий кабель') + rb('data-act="add-busN"', 'plus', 'Шина N') + rb('data-act="add-busPE"', 'plus', 'Шина PE') + rb('data-act="stops"', 'lock', 'Ограничители', null, 'По краям аппаратов на каждой рейке') + tool('note', 'edit', 'Выноска'))
      + grp('Рейки', rb('data-rail="insert" data-k="' + P.rows + '"', 'plus', 'Рейка снизу') + rb('data-act="arrange"', 'layers', 'Разложить шины') + rb('data-act="renumber"', 'list', 'Перенумеровать', null, 'Аппараты: QF1, QF2… слева направо, сверху вниз'))
      + grp('Свои аппараты', rb('data-act="mydev"', 'plus', 'Свой аппарат') + rb('data-act="mylib-export"', 'download', 'Мои — в файл') + rb('data-act="mylib-import"', 'upload', 'Из файла'));
    if (t === 'wires') return grp('Прокладка', `<select data-pf="wireStyle" title="Как прокладывать новые и все провода без своей настройки">${opt(['duct', 'loop', 'line'], P.wireStyle || 'duct', (v) => STYLE[v])}</select>`)
      + grp('Маркировка проводов', `<div class="ed-col">${ck('wnShow', wn.show, 'Номера на проводах')}${ck('wnColor', wn.color, 'Цветные кольца')}</div><div class="ed-col">${ck('wnAuto', wn.auto, 'Новым — номер сам')}<label class="ed-rck">с <input type="number" min="0" step="1" data-pf="wnStart" value="${wn.start}" style="width:52px"></label></div>` + rb('data-act="wn-renum"', 'refresh', 'Перенумеровать'))
      + grp('Длина и наконечники', `<div class="ed-col"><label class="ed-rck">Запас <input type="number" min="0" max="100" step="5" data-pf="slack" value="${P.slack == null ? 20 : P.slack}" style="width:52px"> %</label>${ck('ferr', vw.ferrules, 'Наконечники НШВИ')}</div>`)
      + grp('Журнал', rb('data-act="tab-journal"', 'list', 'Кабельный журнал') + rb('data-act="csv-journal"', 'download', 'В Excel'));
    if (t === 'view') return grp('Показать на щите', `<div class="ed-col">${ck('stickers', vw.stickers, 'Наклейки QF1, QD1…')}${ck('dims', vw.dims, 'Размеры')}</div>`)
      + grp('На один экран: таблицы рядом со щитом', `<div class="ed-col">${SHEETS.slice(0, 3).map(([k, l]) => ck('sheet:' + k, sh[k], l)).join('')}</div><div class="ed-col">${SHEETS.slice(3).map(([k, l]) => ck('sheet:' + k, sh[k], l)).join('')}</div>`)
      + zoom
      + grp('Экран', rb('data-act="full"', 'eye', 'Весь экран', document.body.classList.contains('ed-full'), 'Только щит, как в Visio'));
    return grp('Открыть', rb('data-act="tab-bom"', 'list', 'Спецификация') + rb('data-act="tab-pe"', 'list', 'Перечень элементов') + rb('data-act="tab-journal"', 'cable', 'Кабельный журнал') + rb('data-act="tab-groups"', 'layers', 'Группы') + rb('data-act="tab-scheme"', 'flow', 'Однолинейная схема') + rb('data-act="tab-checks"', 'shield', 'Проверки'))
      + grp('В Excel', rb('data-act="csv-bom"', 'download', 'Спецификация') + rb('data-act="csv-pe"', 'download', 'Перечень') + rb('data-act="csv-journal"', 'download', 'Журнал'))
      + grp('Печать', rb('data-act="print"', 'doc', 'Листы с рамкой') + rb('data-act="print-tags"', 'cable', 'Бирки на кабели') + rb('data-act="print-labels"', 'edit', 'Наклейки на щит', null, 'Полоски с обозначениями и назначением в масштабе 1:1'));
  }

  /* ---------- свойства ---------- */
  const opt = (arr, cur, fmt) => arr.map((v) => `<option value="${esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${esc(fmt ? fmt(v) : v)}</option>`).join('');
  const STYLE = { duct: 'по кабель-каналам', loop: 'петлёй напрямую', line: 'прямой линией' };
  const RPITCH = [125, 134, 150, 175, 200];
  /* таблица в CSV для Excel: точка с запятой и метка UTF-8, чтобы русские буквы открылись правильно */
  const csv = (head, rows) => '\ufeff' + [head].concat(rows).map((r) => r.map((c) => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const keysHelp = `<div class="ed-keys"><span class="kbd">←</span> <span class="kbd">→</span> сдвинуть на полмодуля · <span class="kbd">↑</span> <span class="kbd">↓</span> на другую рейку · <span class="kbd">Del</span> удалить · <span class="kbd">Ctrl+D</span> копия · <span class="kbd">Ctrl+Z</span> / <span class="kbd">Ctrl+Y</span> отмена и возврат · <span class="kbd">Esc</span> отменить провод или снять выделение · <span class="kbd">Shift</span>+клик и рамка — несколько аппаратов · <span class="kbd">Ctrl+A</span> все · <span class="kbd">Ctrl+C</span> <span class="kbd">Ctrl+X</span> <span class="kbd">Ctrl+V</span> копировать, вырезать, вставить · правая кнопка — меню · <span class="kbd">Ctrl</span>+колесо — масштаб</div>`;
  function propsHTML() {
    const P = E.P, L = LB(), C = K();
    if (E.myForm) return myFormHTML();
    if (E.newForm) return newFormHTML();
    const o = findSel();
    if (!o) {
      const preset = C.PRESETS.find(([r, m]) => r === P.rows && m === P.mods);
      return `<h3>Щит</h3>
<label>Название</label><input class="inp" data-pf="name" value="${esc(P.name)}">
<h4>Корпус и рейки</h4>
<label>Готовый размер</label><select data-pf="preset"><option value="">${preset ? '' : 'свой размер'}</option>${C.PRESETS.map(([r, m]) => `<option value="${r}x${m}"${preset && preset[0] === r && preset[1] === m ? ' selected' : ''}>${r} × ${m} = ${r * m} модулей</option>`).join('')}</select>
<div class="g2"><div><label>Реек</label><select data-pf="rows">${opt([1, 2, 3, 4, 5, 6, 7, 8], P.rows)}</select></div><div><label>Модулей на рейке</label><select data-pf="mods">${opt([6, 8, 12, 14, 16, 18, 24, 36], P.mods)}</select></div></div>
<div class="ed-rails">${[...Array(P.rows).keys()].map((k) => { const used = P.devs.filter((d) => d.row === k).reduce((a, d) => a + d.w, 0); return `${k ? `<div class="ed-rail ed-pitch"><span>↕ между ${k} и ${k + 1}</span><select data-pf="rp${k - 1}" title="Расстояние между осями реек, мм">${opt(RPITCH, C.pitchOf(P, k - 1), (v) => `${v} мм`)}</select></div>` : ''}<div class="ed-rail"><span>Рейка ${k + 1} · занято ${S.fmt(used, 1)} из ${P.mods}</span><button type="button" data-rail="insert" data-k="${k}" title="Вставить пустую рейку над этой">+ выше</button>${k + 1 < P.rows ? `<button type="button" data-rail="swap" data-k="${k}" title="Поменять местами с рейкой ниже">⇅</button>` : ''}${used ? '' : `<button type="button" data-rail="remove" data-k="${k}" title="Убрать пустую рейку">×</button>`}</div>`; }).join('')}</div>
<label>Шаг реек для всех (сверху и снизу — до шин)</label><select data-pf="pitch">${opt(RPITCH, P.pitch || 134, (v) => `${v} мм${v === 134 ? ' (по умолчанию)' : ''}`)}</select>
<div class="row"><button class="btn sm" type="button" data-act="stops">Ограничители по краям реек</button></div>
<p class="small muted">Провода, маркировка, вид, таблицы и отчёты — на ленте сверху: «Вставка», «Провода», «Вид», «Отчёты».</p>
<h4>Ввод</h4>
<label>Питание</label><select data-pf="phases">${opt([1, 3], P.feed.phases, (v) => (v === 1 ? 'Однофазный 230 В' : 'Трёхфазный 400 В'))}</select>
<label>Система заземления</label><select data-pf="earthing">${opt(['TN-C-S', 'TN-S', 'TN-C>S', 'TT'], P.feed.earthing, (v) => ({ 'TN-C-S': 'TN-C-S: N и PE приходят раздельно', 'TN-S': 'TN-S', 'TN-C>S': 'PEN делится в этом щите', TT: 'TT: свой заземлитель' }[v]))}</select>
<h4>Основная надпись</h4>
<label>Объект</label><input class="inp" data-mf="object" value="${esc(P.meta.object || '')}">
<div class="g2"><div><label>Разработал</label><input class="inp" data-mf="author" value="${esc(P.meta.author || '')}"></div><div><label>Проверил</label><input class="inp" data-mf="checker" value="${esc(P.meta.checker || '')}"></div></div>
<label>Организация</label><input class="inp" data-mf="org" value="${esc(P.meta.org || '')}">
<label>Обозначение (шифр)</label><input class="inp" data-mf="code" value="${esc(P.meta.code || '')}">
${keysHelp}`;
    }
    const k = E.sel.kind;
    if (k === 'devs') {
      const one = new Set(o.map((d) => d.row)).size === 1;
      return `<h3>Выбрано аппаратов: ${o.length}</h3><div class="ed-kv">${esc(o.map((d) => d.id).join(', '))}</div>
<div class="arrows"><button class="btn sm" type="button" data-gmove="L" title="Влево на полмодуля">◀</button><button class="btn sm" type="button" data-gmove="R" title="Вправо на полмодуля">▶</button><button class="btn sm" type="button" data-gmove="U" title="На рейку выше">▲</button><button class="btn sm" type="button" data-gmove="D" title="На рейку ниже">▼</button></div>
<div class="row">${one ? '<button class="btn sm" type="button" data-act="g-pack">Сдвинуть вплотную</button>' : ''}<button class="btn sm" type="button" data-act="del">${S.icon('trash')}Удалить все</button></div>
<p class="small muted">${one ? 'Перетащи любой из выделенных — переедут все вместе, промежутки между ними сохранятся.' : 'Аппараты стоят на разных рейках: вместе переносятся только аппараты одной рейки.'} Shift+клик добавляет или убирает аппарат, рамка по пустому месту выделяет несколько, Ctrl+A — все.</p>`;
    }
    if (k === 'dev') {
      const d = o, s = C.spec(d) || {};
      const same = L.list().filter((x) => x.kind === s.kind);
      const curves = s.curves || [];
      const T = C.termNames(d);
      const all = T.top.concat(T.bot).filter(Boolean);
      const keyed = new Set(); E.P.wires.forEach((w) => [w.a, w.b].forEach((e) => { if (e.dev === d.id) keyed.add(e.term); }));
      const combed = E.P.combs.some((c) => c.devs.includes(d.id));
      const canLine = ['mcb', 'rcbo', 'sw', 'km'].includes(d.type);
      const one = d.poles === 1 && (d.type === 'mcb' || d.type === 'rcbo');
      return `<h3>${esc(d.id)} — ${esc(L.KIND[s.kind] || d.type)}</h3>
<div class="g2"><div><label>Обозначение</label><input class="inp" data-df="id" value="${esc(d.id)}"></div><div><label>Рейка, место</label><div class="ed-kv">${d.row + 1}, с ${S.fmt(d.x + 1, 1)}-го мод. (${S.fmt(d.x * C.G.MOD, 1)} мм от края)</div></div></div>
<label>Назначение</label><input class="inp" data-df="label" value="${esc(d.label || '')}" placeholder="Розетки кухни">
<label>Артикул (для спецификации)</label><input class="inp" data-df="art" value="${esc(d.art || '')}" placeholder="${esc(C.artOf(Object.assign({}, d, { art: '' })) || 'с упаковки или из каталога')}">
${!d.art && C.artOf(d) ? '<p class="small muted" style="margin:2px 0 0">Подставлен по шаблону каталога производителя — сверь перед заказом.</p>' : ''}
<label>Наименование в спецификации</label><input class="inp" data-df="name" value="${esc(d.name || '')}" placeholder="${esc(C.devName(Object.assign({}, d, { name: '' })))}">
<label class="ed-chk"><input type="checkbox" data-df="noBom"${d.noBom ? ' checked' : ''}> Не включать в спецификацию и перечень (уже стоит, не покупать)</label>
<label>Серия</label><select data-df="sid">${same.map((x) => `<option value="${esc(x.id)}"${x.id === d.sid ? ' selected' : ''}>${esc(x.brand === 'gen' || x.brand === 'my' ? x.series : (L.BRANDS[x.brand] || {}).name + ' ' + x.series)}</option>`).join('')}</select>
${s.poles && s.poles.length > 1 ? `<label>Полюсов</label><select data-df="poles">${opt(s.poles, d.poles)}</select>` : ''}
${s.In ? `<label>Номинальный ток, А</label><select data-df="In">${opt(s.In, d.In)}</select>` : ''}
${curves.length ? `<label>Характеристика</label><select data-df="curve">${opt(curves, d.curve)}</select>` : ''}
${s.ma ? `<div class="g2"><div><label>Утечка, мА</label><select data-df="ma">${opt(s.ma, d.ma)}</select></div><div><label>Тип</label><select data-df="rt">${opt(s.rt || ['AC'], d.rt)}</select></div></div>` : ''}
${s.wOpts ? `<label>Ширина, модулей</label><select data-df="w">${opt(s.wOpts, d.w)}</select>` : ''}
<div class="ed-kv"><span>Ширина:</span> ${S.fmt(d.w, 1)} мод. (${S.fmt(d.w * C.G.MOD, 1)} мм) · <span>подключено клемм:</span> ${keyed.size + (combed ? 1 : 0)} из ${all.length}</div>
${s.cable ? `<div class="ed-kv"><span>Клеммы:</span> ${esc(s.cable)}</div>` : ''}${s.torque ? `<div class="ed-kv"><span>Момент затяжки:</span> ${esc(s.torque)}</div>` : ''}${s.note ? `<div class="ed-kv"><span>Примечание:</span> ${esc(s.note)}</div>` : ''}
<div class="arrows"><button class="btn sm" type="button" data-move="L" title="Влево на полмодуля">◀</button><button class="btn sm" type="button" data-move="R" title="Вправо на полмодуля">▶</button><button class="btn sm" type="button" data-move="U" title="На рейку выше">▲</button><button class="btn sm" type="button" data-move="D" title="На рейку ниже">▼</button></div>
<div class="row">${canLine ? `<button class="btn sm primary" type="button" data-act="autoline">${S.icon('cable')}Вывести линию</button>` : ''}${(d.type === 'mcb' || d.type === 'rcbo') && !combed ? `<button class="btn sm" type="button" data-act="comb1">Гребёнка вправо</button>${one && E.P.feed.phases === 3 ? '<button class="btn sm" type="button" data-act="comb3">Гребёнка 3ф вправо</button>' : ''}` : ''}<button class="btn sm" type="button" data-act="dup">${S.icon('copy')}Копия</button><button class="btn sm" type="button" data-act="del">${S.icon('trash')}Удалить</button></div>
${canLine ? '<p class="small muted">«Вывести линию» добавит кабель и сам подключит фазу к этому аппарату, нуль — к шине его УЗО (или к своему зажиму N), PE — к шине PE.</p>' : ''}`;
    }
    if (k === 'wire') {
      const w = o, i = P.wires.indexOf(w), pts = C.route(P, w, i);
      const nm = (e) => (e.dev ? `${e.dev} «${e.term}»` : e.bus ? `шина ${e.bus}, отв. ${e.slot + 1}` : e.feed ? `ввод ${e.feed}` : e.line ? `кабель линии ${(P.lines.find((l) => l.id === e.line) || {}).num || ''}, жила ${e.core}` : '?');
      return `<h3>Провод</h3><div class="ed-kv">${esc(nm(w.a))} → ${esc(nm(w.b))}</div>
<label>Проводник</label><select data-wf="cond">${opt(['L', 'L1', 'L2', 'L3', 'N', 'PE', 'PEN'], w.cond, (v) => ({ L: 'L — фаза (коричневый)', L1: 'L1 (коричневый)', L2: 'L2 (чёрный)', L3: 'L3 (серый)', N: 'N — нуль (синий)', PE: 'PE (жёлто-зелёный)', PEN: 'PEN' }[v]))}</select>
<label>Сечение, мм²</label><select data-wf="mm2">${opt(C.SECTIONS, w.mm2, (v) => String(v).replace('.', ','))}</select>
<div class="g2"><div><label>Номер провода</label><input class="inp" type="number" min="0" data-wf="num" value="${w.num == null ? '' : esc(String(w.num))}"></div><div><label>Запас, %</label><input class="inp" type="number" min="0" max="100" step="5" data-wf="slack" value="${w.slack == null ? '' : w.slack}" placeholder="${P.slack == null ? 20 : P.slack} (как в щите)"></div></div>
<label>Марка провода</label><input class="inp" data-wf="mark" value="${esc(w.mark || '')}" placeholder="${esc(C.MARK)}">
<label>Цвет изоляции</label><select data-wf="color">${opt([''].concat(Object.keys(C.WCOL)), w.color || '', (v) => (v ? C.WCOL[v][0] : 'по назначению проводника'))}</select>
<label>Прокладка</label><select data-wf="style">${opt(['', 'duct', 'loop', 'line'], w.style || '', (v) => (v ? STYLE[v] : 'как во всём щите'))}</select>
${C.styleOf(P, w) === 'duct' ? `<label>Боковой канал</label><select data-wf="side">${opt(['', 'L', 'R'], w.side || '', (v) => ({ '': 'ближний (авто)', L: 'левый', R: 'правый' }[v]))}</select>` : ''}
<div class="ed-kv"><span>Длина:</span> ${pts ? S.fmt(C.wireLen(P, w, i), 2) : '—'} м — трасса, 0,1 м на разделку и запас</div>
<div class="ed-kv"><span>Наконечник:</span> ${C.usedAt(P, C.keyOf(w.a)) === 2 || C.usedAt(P, C.keyOf(w.b)) === 2 ? 'двойной НШВИ2 там, где в клемме два провода; ' : ''}НШВИ ${String(w.mm2).replace('.', ',')} мм², цвет по DIN 46228-4</div>
<p class="small muted">${C.styleOf(P, w) === 'duct' ? 'Потяни горизонтальный участок вверх-вниз или вертикальный влево-вправо, чтобы сдвинуть провод в канале.' : C.styleOf(P, w) === 'loop' ? (pts && pts.bez ? 'Потяни петлю вверх или вниз — она станет больше или меньше.' : 'С рейки на рейку петля обходит аппараты сбоку; участки можно двигать мышью.') : 'Прямой провод рисуется кратчайшей линией.'} Кружок на конце провода тяни на другую клемму — провод перекинется. Номер провода стоит на обоих концах и в кабельном журнале.</p>
<div class="row"><button class="btn sm" type="button" data-act="reroute">${S.icon('refresh')}Сбросить трассу</button><button class="btn sm" type="button" data-act="del">${S.icon('trash')}Удалить</button></div>`;
    }
    if (k === 'bus') {
      const b = o, used = P.wires.filter((w) => w.a.bus === b.id || w.b.bus === b.id).length;
      return `<h3>Шина ${esc(b.id)}</h3>
<div class="g2"><div><label>Обозначение</label><input class="inp" data-bf="id" value="${esc(b.id)}"></div><div><label>Назначение</label><select data-bf="kind">${opt(['N', 'PE'], b.kind, (v) => (v === 'N' ? 'N — нулевая' : 'PE — защитная'))}</select></div></div>
<div class="g2"><div><label>Место</label><select data-bf="zone">${opt(['top', 'bottom'], b.zone, (v) => (v === 'top' ? 'Сверху' : 'Снизу'))}</select></div><div><label>Отверстий</label><select data-bf="n">${opt([4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 24, 28], b.n)}</select></div></div>
<label>Сдвиг от левого края, мм</label><input class="inp" type="number" step="1" data-bf="x" value="${Math.round(b.x)}">
<div class="ed-kv"><span>Занято отверстий:</span> ${used} из ${b.n}</div>
<div class="arrows"><button class="btn sm" type="button" data-bmove="-8" title="Влево">◀</button><button class="btn sm" type="button" data-bmove="8" title="Вправо">▶</button><button class="btn sm" type="button" data-bmove="top" title="Наверх">▲</button><button class="btn sm" type="button" data-bmove="bottom" title="Вниз">▼</button></div>
<p class="small muted">Шину можно перетащить мышью вдоль корпуса и между верхом и низом — она прилипает к соседним шинам. Каждому проводнику — свой зажим (ГОСТ 32395-2020, п. 6.3.6).</p>
<div class="row"><button class="btn sm" type="button" data-act="del">${S.icon('trash')}Удалить</button></div>`;
    }
    if (k === 'line') {
      const l = o, cs = C.lineCores(P, l);
      const st = cs.map((c) => { const ok = P.wires.some((w) => (w.a.line === l.id && w.a.core === c) || (w.b.line === l.id && w.b.core === c)); return `<span class="${ok ? 'ok' : 'no'}">${c} ${ok ? '✓' : '✗'}</span>`; }).join(' · ');
      return `<h3>Линия ${esc(String(l.num))}</h3>
<div class="g2"><div><label>Номер группы</label><input class="inp" type="number" data-lf="num" value="${esc(String(l.num))}"></div><div><label>Длина, м</label><input class="inp" type="number" data-lf="len" value="${esc(String(l.len || ''))}"></div></div>
<label>Назначение</label><input class="inp" data-lf="name" value="${esc(l.name)}">
<label>Кабель</label><input class="inp" data-lf="cable" value="${esc(l.cable || '')}" placeholder="ВВГнг(А)-LS 3×2,5">
<label>Жилы</label><select data-lf="cores">${opt(['L,N,PE', 'L1,L2,L3,N,PE', 'L1,L2,L3,PE'], cs.join(','))}</select>
<div class="ed-kv"><span>Подключено:</span> ${st}</div>
<p class="small muted">Жилы подключают проводами: нажми на цветную точку жилы внизу, затем на клемму. Проще — выбери автомат и нажми «Вывести линию».</p>
<div class="row"><button class="btn sm" type="button" data-act="del">${S.icon('trash')}Удалить</button></div>`;
    }
    if (k === 'note') return `<h3>Выноска</h3><label>Текст</label><textarea class="inp" data-nf="text" rows="4">${esc(o.text || '')}</textarea>
<p class="small muted">Тяни рамку выноски, чтобы переставить текст, и точку на конце — чтобы показать на нужное место. Выноски печатаются вместе со щитом.</p>
<div class="row"><button class="btn sm" type="button" data-act="del">${S.icon('trash')}Удалить</button></div>`;
    if (k === 'comb') return `<h3>Гребёнка</h3><div class="ed-kv"><span>Аппараты:</span> ${esc(o.devs.join(', '))}</div><div class="ed-kv"><span>Фазы:</span> ${esc(o.conds.join(', '))}</div>
<label>Тип шины</label><select data-cf="kind">${opt(['PIN', 'FORK'], o.kind || 'PIN', (v) => (v === 'PIN' ? 'PIN — штырь' : 'FORK — вилка'))}</select>
<div class="row"><button class="btn sm" type="button" data-act="comb-grow">Удлинить вправо</button><button class="btn sm" type="button" data-act="comb-shrink">Укоротить</button><button class="btn sm" type="button" data-act="del">${S.icon('trash')}Удалить</button></div>
<p class="small muted">Гребёнку ставят на аппараты, стоящие вплотную на одной рейке: если аппарат убрать или раздвинуть соседей, гребёнка режется. Питание подают проводом в клемму любого аппарата на ней. Если у аппарата раздельный зажим для шины и для провода (смотри паспорт), штырь гребёнки идёт в своё гнездо, а проводов в зажим — не больше двух.</p>`;
    return '';
  }

  function newFormHTML() {
    const C = K();
    return `<h3>Новый щит</h3>
<label>Размер корпуса</label><select data-new="size">${C.PRESETS.map(([r, m]) => `<option value="${r}x${m}"${r === 2 && m === 12 ? ' selected' : ''}>${r} × ${m} = ${r * m} модулей</option>`).join('')}</select>
<label>Питание</label><select data-new="phases"><option value="1">Однофазный 230 В</option><option value="3">Трёхфазный 400 В</option></select>
<label>Система заземления</label><select data-new="earthing"><option value="TN-C-S">TN-C-S: N и PE приходят раздельно</option><option value="TN-S">TN-S</option><option value="TN-C>S">PEN делится в этом щите</option><option value="TT">TT: свой заземлитель</option></select>
<div class="row"><button class="btn sm primary" type="button" data-act="new-go">${S.icon('plus')}Создать</button><button class="btn sm" type="button" data-act="new-cancel">Отмена</button></div>
<p class="small muted">Текущий щит можно сохранить кнопкой «Сохранить» — он останется в «Мои щиты». Создание нового можно отменить через Ctrl+Z.</p>`;
  }

  function myFormHTML() {
    const L = LB();
    const m = (E.myEdit && L.loadMine().find((x) => x.id === E.myEdit)) || {};
    return `<h3>${m.id ? 'Изменить аппарат' : 'Свой аппарат'}</h3>
<label>Производитель и серия</label><input class="inp" data-my="series" placeholder="Меандр УЗМ-51М" value="${esc(m.series || '')}">
<label>Вид</label><select data-my="kind">${opt(Object.keys(L.KIND).filter((k) => k !== 'dbus'), m.kind || 'mcb', (k) => L.KIND[k])}</select>
<div class="g2"><div><label>Полюсов</label><select data-my="poles">${opt([1, 2, 3, 4], (m.poles && m.poles[0]) || 1)}</select></div><div><label>Ширина, мод.</label><select data-my="w">${opt([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9], m.w || 1)}</select></div></div>
<label>Номиналы, А (через запятую)</label><input class="inp" data-my="In" placeholder="16, 25, 32, 40, 63" value="${esc((m.In || []).join(', '))}">
<label>Высота корпуса, мм</label><input class="inp" type="number" data-my="h" value="${m.h || 85}">
<label>Артикул</label><input class="inp" data-my="art" placeholder="с упаковки" value="${esc(m.art || '')}">
<label>Сечение клемм, примечание</label><input class="inp" data-my="note" placeholder="до 25 мм²; по паспорту" value="${esc(m.note || '')}">
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
    if (E.tab === 'bom') return `<div class="ed-pane"><div class="row" style="margin-bottom:8px;display:flex;gap:6px"><button class="btn sm" type="button" data-act="csv-bom">${S.icon('download')}В Excel (CSV)</button></div>${S.B.tbl(['№', 'Наименование', 'Артикул', 'Кол-во'], C.bom(P).map((b, i) => [String(i + 1), esc(b.name), esc(b.art || ''), `${S.fmt(b.qty, 1)} ${esc(b.unit)}`]))}<p class="small muted">Провод — по длине трасс с запасом из свойств щита, наконечники — по числу концов плюс 20 %; два провода одного сечения в одной клемме — один двойной наконечник. Артикулы вписывай в свойствах аппарата — с упаковки или из каталога.</p></div>`;
    if (E.tab === 'pe') {
      const R = C.elements(P);
      return `<div class="ed-pane"><div class="row" style="margin-bottom:8px;display:flex;gap:6px"><button class="btn sm" type="button" data-act="csv-pe">${S.icon('download')}В Excel (CSV)</button></div>${R.length ? S.B.tbl(['Поз. обозначение', 'Наименование', 'Кол.', 'Примечание'], R.map((r) => [esc(r.pos), esc(r.name), String(r.qty), esc(r.note)])) : '<p class="muted">Аппаратов пока нет.</p>'}<p class="small muted">Перечень элементов — таблица к схеме: позиционное обозначение, наименование и количество. Одинаковые аппараты записаны одной строкой, номера подряд — через тире (QF2–QF5). Аппараты с галочкой «не включать» сюда не попадают.</p></div>`;
    }
    if (E.tab === 'journal') {
      const J = C.journal(P);
      return `<div class="ed-pane"><div class="row" style="margin-bottom:8px;display:flex;gap:6px"><button class="btn sm" type="button" data-act="csv-journal">${S.icon('download')}В Excel (CSV)</button><button class="btn sm" type="button" data-act="wn-renum">Перенумеровать провода</button></div>${J.length ? S.B.tbl(['№', 'Откуда', 'Куда', 'Марка', 'Сечение, мм²', 'Цвет', 'Длина, м'], J.map((r) => [esc(String(r.num)), esc(r.from), esc(r.to), esc(r.mark), String(r.mm2).replace('.', ','), esc(r.color), S.fmt(r.len, 2)])) : '<p class="muted">Проводов пока нет.</p>'}<p class="small muted">Кабельный журнал — список всех проводов щита: номер на маркере провода, откуда и куда он идёт. По нему собирают щит и ищут провод при ремонте. Номер одинаковый на обоих концах провода.</p></div>`;
    }
    if (E.tab === 'checks') {
      const ch = C.checks(P);
      return `<div class="ed-pane"><div class="stack-sm">${ch.map((c) => `<div class="check-row ${c.level}">${S.icon(c.level === 'ok' ? 'check' : c.level === 'warn' ? 'alert' : 'x')}<div>${esc(c.text)}${c.ref ? `<span class="ref">${esc(c.ref)}</span>` : ''}</div></div>`).join('')}</div><p class="small muted" style="margin-top:10px">Проверка не заменяет расчёт токов КЗ, селективности и проект: она ловит ошибки сборки — чужие нули, лишние провода в клемме, линии без защиты.</p></div>`;
    }
    return `<div class="ed-canvas" data-canvas></div><div class="ed-status" data-hint></div>`;
  }


  /* ---------- рисование холста ---------- */
  /* при перетаскивании: на небольшом щите перерисовываем всё (провода идут следом),
     на большом — только сдвигаем готовые аппараты и шины, а щит целиком рисуем после отпускания */
  let raf = 0;
  const schedule = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; if (E.drag && E.drag.light) frame(); else drawCanvas(true); }); };
  function frame() {
    const svg = E.root && E.root.querySelector('[data-canvas] svg');
    if (!svg) return;
    const C = K(), dr = E.drag, V = E.view;
    svg.parentNode.classList.toggle('moving', !!(dr && dr.moved && ['new', 'move', 'group', 'bus'].includes(dr.kind)));
    const now = new Map(E.P.devs.map((d) => [d.id, d])), fut = V ? new Map(V.devs.map((d) => [d.id, d])) : null;
    svg.querySelectorAll('g[data-dev]').forEach((g) => {
      const d0 = now.get(g.dataset.dev), d1 = fut && fut.get(g.dataset.dev);
      if (d0 && d1 && (d0.x !== d1.x || d0.row !== d1.row)) { const a = C.devGeo(d0), b = C.devGeo(d1); g.setAttribute('transform', `translate(${b.x - a.x} ${b.y - a.y})`); } else g.removeAttribute('transform');
    });
    svg.querySelectorAll('g[data-bus]').forEach((g) => {
      const b0 = E.P.buses.find((b) => b.id === g.dataset.bus), b1 = V && V.buses.find((b) => b.id === g.dataset.bus);
      if (b0 && b1 && (b0.x !== b1.x || b0.zone !== b1.zone)) { const a = C.busGeo(E.P, b0), b = C.busGeo(V, b1); g.setAttribute('transform', `translate(${b.x - a.x} ${b.y - a.y})`); } else g.removeAttribute('transform');
    });
    if (dr && dr.kind === 'seg') {
      const i = E.P.wires.findIndex((w) => w.id === dr.id);
      const g = [...svg.querySelectorAll('g[data-wire]')].find((x) => x.dataset.wire === dr.id);
      if (i >= 0 && g) g.outerHTML = S.edDraw.wire(E.P, E.P.wires[i], i, { sel: E.sel });
    }
    let extra = '';
    if (V && dr && dr.kind === 'new') { const nd = V.devs.find((d) => d.id === '…'); if (nd) extra = S.edDraw.device(V, nd, {}); }
    const ov = svg.querySelector('[data-overlay]');
    if (ov) ov.innerHTML = extra + S.edDraw.overlay(E.P, { ghost: E.ghost, busGhost: E.busGhost, band: E.band, preview: E.preview, ruler: E.ruler });
    status();
  }
  /* таблицы рядом со щитом: оборудование, перечень, журнал, группы, схема, проверки — всё на одном экране, как лист Visio */
  function sheetExtras(P, x0, y0) {
    const C = K(), sh = C.VIEW(P).sheet || {};
    const ink = 'var(--fg, #2b2f2c)', line = 'var(--border, #c4cac6)';
    let y = y0, wMax = 0, out = '';
    const RH = 6.4, FS = 3.3;
    const table = (title, head, wd, rows) => {
      const W = wd.reduce((a, b) => a + b, 0);
      wMax = Math.max(wMax, W);
      out += `<text x="${x0}" y="${y + 5}" style="font-size:5px;font-weight:700;fill:${ink}">${esc(title)}</text>`;
      y += 8;
      [head].concat(rows).forEach((r, ri) => {
        out += `<rect x="${x0}" y="${y}" width="${W}" height="${RH}" style="fill:${ri ? 'var(--bg, #fff)' : 'var(--bg-muted, #eee)'};stroke:${line};stroke-width:0.3"/>`;
        let cx = x0;
        r.forEach((c, ci) => { const max = Math.floor(wd[ci] / (FS * 0.56)); const str = String(c == null ? '' : c); out += `<text x="${cx + 1.4}" y="${y + 4.5}" style="font-size:${FS}px;fill:${ink};${ri ? '' : 'font-weight:700;'}">${esc(str.length > max ? str.slice(0, max - 1) + '…' : str)}</text>`; cx += wd[ci]; });
        y += RH;
      });
      y += 10;
    };
    if (sh.bom) table('Оборудование в щите', ['№', 'Наименование', 'Артикул', 'Кол-во'], [8, 120, 40, 22], C.bom(P).map((b, i) => [i + 1, b.name, b.art || '', `${S.fmt(b.qty, 1)} ${b.unit}`]));
    if (sh.pe) table('Перечень элементов', ['Поз. обозначение', 'Наименование', 'Кол.', 'Примечание'], [34, 110, 12, 34], C.elements(P).map((r) => [r.pos, r.name, r.qty, r.note]));
    if (sh.journal) table('Кабельный журнал', ['№', 'Откуда', 'Куда', 'Марка', 'мм²', 'Цвет', 'Длина, м'], [10, 34, 34, 34, 12, 30, 18], C.journal(P).map((r) => [r.num, r.from, r.to, r.mark, String(r.mm2).replace('.', ','), r.color, S.fmt(r.len, 2)]));
    if (sh.groups) table('Группы', ['№', 'Назначение', 'Защита', 'УЗО', 'Кабель'], [10, 70, 40, 24, 46], C.groups(P).map((g) => [g.l.num, g.l.name, g.prot ? `${g.prot.id} ${g.prot.curve || ''}${g.prot.In || ''}` : 'нет', (g.chain.find((d) => d.type === 'rcd') || {}).id || (g.prot && g.prot.type === 'rcbo' ? 'дифавт.' : '—'), g.l.cable || '']));
    if (sh.checks) table('Проверки', ['', 'Что найдено'], [10, 180], C.checks(P).map((c) => [c.level === 'ok' ? '✓' : c.level === 'warn' ? '!' : '✗', c.text]));
    if (sh.scheme) {
      const sv = schemeSVG(), mm = sv.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
      if (mm) { const sc = 0.5, vw = +mm[1], vh = +mm[2]; out += `<text x="${x0}" y="${y + 5}" style="font-size:5px;font-weight:700;fill:${ink}">Однолинейная схема</text>`; y += 8; out += `<svg x="${x0}" y="${y}" width="${vw * sc}" height="${vh * sc}" viewBox="0 0 ${vw} ${vh}">${sv.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</svg>`; y += vh * sc + 10; wMax = Math.max(wMax, vw * sc); }
    }
    return wMax ? { svg: out, w: wMax, h: y - y0 } : null;
  }
  function drawCanvas(fast) {
    const root = E.root;
    if (!root) return;
    const cv = root.querySelector('[data-canvas]');
    if (!cv) return;
    const t0 = performance.now();
    const P = E.view || E.P;
    const D = S.edDraw(P, { sel: E.sel, interactive: true, fast: !!fast, tool: E.tool, wireStart: E.wireStart, ghost: E.ghost, busGhost: E.busGhost, band: E.band, preview: E.preview, ruler: E.ruler });
    let [x, y, w, h] = D.vb;
    const X = sheetExtras(P, x + w + 12, y + 4);
    if (X) { D.svg += X.svg; w += X.w + 24; h = Math.max(h, X.h + 8); }
    /* 0 — по ширине окна, -1 — весь щит целиком */
    const fitW = ((cv.clientWidth || 900) - 24) / w, fitH = ((cv.clientHeight || 600) - 24) / h;
    if (E.zoom === -1) E.zoom = Math.max(0.6, Math.min(4, fitW, fitH));
    if (!E.zoom) E.zoom = Math.max(0.8, Math.min(4, fitW));
    const html = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${Math.round(w * E.zoom)}" height="${Math.round(h * E.zoom)}">${D.svg}${E.wireStart ? '<line data-prev x1="0" y1="0" x2="0" y2="0" style="stroke:var(--accent);stroke-width:1.2;stroke-dasharray:3 2;pointer-events:none;opacity:0"/>' : ''}</svg>`;
    const svg = cv.querySelector('svg');
    if (svg) svg.outerHTML = html; else cv.insertAdjacentHTML('beforeend', html);
    status();
    cv.classList.toggle('dragging', !!(E.drag && E.drag.moved));
    cv.classList.toggle('erase', E.tool === 'erase');
    cv.classList.remove('moving');
    if (!fast) E.drawMs = performance.now() - t0;
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
    const rbn = root.querySelector('[data-ribbon]');
    if (rbn && !part && !rbn.contains(document.activeElement)) rbn.innerHTML = ribbonHTML();
    const u = root.querySelector('[data-act="undo"]'), r = root.querySelector('[data-act="redo"]');
    if (u) u.style.opacity = E.hist.length ? 1 : 0.45;
    if (r) r.style.opacity = E.fut.length ? 1 : 0.45;
    const nm = root.querySelector('[data-name]');
    if (nm && document.activeElement !== nm) nm.value = E.P.name;
  }
  /* строка состояния под холстом: подсказка к текущему действию или сообщение */
  let msg = null;
  function status() {
    const el = E.root && E.root.querySelector('[data-hint]');
    if (!el) return;
    const dr = E.drag && E.drag.moved;
    const hov = E.wireStart || (E.drag && E.drag.kind === 'wend') || (E.tool === 'ruler' && E.ruler) ? E.hover : null;
    const text = msg ? msg.text : hov || (dr ? (E.drag.kind === 'band' ? 'Отпусти — выделятся аппараты внутри рамки (с Shift — добавятся к выделенным)' : E.drag.kind === 'seg' ? 'Двигай провод в канале · отпусти, чтобы оставить' : E.ghost && !E.ghost.ok ? 'Сюда не помещается: на рейке не хватает места' : E.busGhost ? (E.busGhost.ok ? 'Отпусти, чтобы поставить шину' : 'Здесь шина наезжает на соседнюю') : E.ghost ? (E.ghost.snap ? 'Прилипнет вплотную к соседу · отпусти, чтобы поставить' : 'Отпусти, чтобы поставить · соседи раздвинутся сами') : 'Наведи на рейку') : E.wireStart ? 'Провод: нажми на вторую клемму, отверстие шины или жилу кабеля · Esc — отмена' : E.tool === 'ruler' ? 'Линейка: зажми и протяни — покажу расстояние в миллиметрах; к клеммам прилипает' : E.tool === 'note' ? 'Выноска: нажми на место щита, на которое она будет показывать' : E.tool === 'erase' ? 'Ластик: нажми на аппарат, провод, шину, гребёнку или линию — удалится. Esc — обычный режим' : E.tool === 'wire' ? 'Режим проводов: нажми на клемму, с которой начать' : 'Перетащи аппарат из библиотеки на рейку или нажми на него · нажми на клемму, чтобы вести провод · Ctrl+колесо — масштаб');
    el.className = 'ed-status' + (msg ? ' ' + msg.kind : '');
    el.innerHTML = `<span>${esc(text)}</span><span class="z">${Math.round((E.zoom || 1) / 3.78 * 100)} %</span>`;
  }
  function flash(text, kind) {
    if (!E.root || !E.root.querySelector('[data-hint]')) { S.toast && S.toast(text); return; }
    msg = { text, kind: kind || 'err' };
    status();
    clearTimeout(flash.t);
    flash.t = setTimeout(() => { msg = null; status(); }, 5000);
  }

  /* весь экран: прячем шапку и меню приложения, редактор на всё окно */
  function setFull(on) {
    document.body.classList.toggle('ed-full', !!on);
    try { localStorage.setItem('shk:ed:full', on ? '1' : ''); } catch (er) { /* без памяти */ }
    if (E.root) E.root.querySelectorAll('[data-act="full"]').forEach((x) => x.setAttribute('aria-pressed', String(!!on)));
    if (E.fit !== 'all') E.zoom = 0; else E.zoom = -1;
    requestAnimationFrame(() => drawCanvas());
  }

  /* ---------- координаты ---------- */
  function svgPt(ev) {
    const svg = E.root && E.root.querySelector('[data-canvas] svg');
    if (!svg) return null;
    const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }
  /* рейка и место под указателем; grab — где взят аппарат, в модулях от его левого края */
  function slotAt(p, w, grab) {
    const C = K(), G = C.G;
    C.sync(E.P);
    let row = -1, best = 1e9;
    for (let i = 0; i < E.P.rows; i++) { const dy = Math.abs(p.y - C.railY(i)); if (dy < best) { best = dy; row = i; } }
    if (best > G.ZONE / 2 + G.DUCT / 2 + 4) return null;
    if (p.x < -10 || p.x > C.W(E.P) + 10) return null;
    const x = Math.round(((p.x - G.SD) / G.MOD - (grab == null ? w / 2 : grab)) * 2) / 2;
    return { row, x: Math.max(0, Math.min(E.P.mods - w, x)) };
  }

  /* ---------- действия ---------- */
  function addDevice(sid, at, params) {
    const P = E.P, C = K();
    const d = LB().make(sid, params || {});
    if (!d) return;
    if (params) ['In', 'curve', 'ma', 'rt', 'w', 'cond'].forEach((k) => { if (params[k] != null) d[k] = params[k]; });
    let place = at;
    if (!place) {
      /* без места: сразу за выделенным аппаратом, иначе в конец первой рейки, где хватает места, иначе в любой промежуток */
      const s = E.sel && E.sel.kind === 'dev' && P.devs.find((x) => x.id === E.sel.id);
      if (s && C.placeInsert(P, s.row, s.x + s.w, d.w, null, { apply: false, snap: false })) place = { row: s.row, x: s.x + s.w };
      for (let row = 0; row < P.rows && !place; row++) { const end = P.devs.filter((x) => x.row === row).reduce((m, x) => Math.max(m, x.x + x.w), 0); if (end + d.w <= P.mods + 1e-6) place = { row, x: end }; }
      outer: for (let row = 0; row < P.rows && !place; row++) for (let x = 0; x <= P.mods - d.w + 1e-6; x += 0.5) if (C.fits(P, row, x, d.w)) { place = { row, x }; break outer; }
      if (!place) { flash('Свободного места нет: добавь рейку или увеличь число модулей в свойствах щита.'); return; }
    }
    commit(() => {
      const r = C.placeInsert(P, place.row, place.x, d.w, null);
      if (!r) return 'Здесь не помещается: на рейке не хватает места.';
      d.id = C.nextId(P, d.type, d.cond); d.row = place.row; d.x = r.x; d.label = d.label || '';
      P.devs.push(d);
      E.sel = { kind: 'dev', id: d.id };
      return '';
    });
  }
  function moveDev(d, dir) {
    const C = K();
    commit(() => {
      const row = dir === 'U' ? d.row - 1 : dir === 'D' ? d.row + 1 : d.row;
      if (row < 0 || row >= E.P.rows) return dir === 'U' ? 'Выше реек нет.' : 'Ниже реек нет — добавь рейку в свойствах щита.';
      const x = dir === 'L' ? d.x - 0.5 : dir === 'R' ? d.x + 0.5 : d.x;
      if (x < -1e-6) return 'Дальше влево некуда.';
      if (x + d.w > E.P.mods + 1e-6) return 'Дальше вправо некуда.';
      if (row === d.row) {
        /* вплотную к соседу — меняемся с ним местами */
        const nb = E.P.devs.find((z) => z.row === d.row && z.id !== d.id && (dir === 'L' ? Math.abs(z.x + z.w - d.x) < 1e-6 : Math.abs(d.x + d.w - z.x) < 1e-6));
        if (nb) { if (dir === 'L') { d.x = nb.x; nb.x = d.x + d.w; } else { nb.x = d.x; d.x = nb.x + nb.w; } return ''; }
      }
      const r = C.placeInsert(E.P, row, x, d.w, d.id, { snap: false });
      if (!r) return 'Не помещается: на рейке не хватает места.';
      d.row = row; d.x = r.x;
      return '';
    }, true);
  }
  /* сдвиг группы аппаратов одной рейки */
  function moveGroup(ids, dir) {
    const C = K();
    commit(() => {
      const ds = ids.map((id) => E.P.devs.find((d) => d.id === id)).filter(Boolean);
      if (new Set(ds.map((d) => d.row)).size > 1) return 'Вместе сдвигаются только аппараты одной рейки.';
      const row0 = ds[0].row, x0 = Math.min(...ds.map((d) => d.x)), span = Math.max(...ds.map((d) => d.x + d.w)) - x0;
      const row = dir === 'U' ? row0 - 1 : dir === 'D' ? row0 + 1 : row0;
      if (row < 0 || row >= E.P.rows) return dir === 'U' ? 'Выше реек нет.' : 'Ниже реек нет — добавь рейку в свойствах щита.';
      const x = dir === 'L' ? x0 - 0.5 : dir === 'R' ? x0 + 0.5 : x0;
      if (x < -1e-6 || x + span > E.P.mods + 1e-6) return dir === 'L' ? 'Дальше влево некуда.' : 'Дальше вправо некуда.';
      const r = C.placeBlock(E.P, row, x, ids, { snap: false, apply: false });
      if (!r || (row === row0 && Math.abs(r.x - x) > 1e-6)) return 'Вплотную стоит другой аппарат — сдвинь его или перетащи группу мышью.';
      C.placeBlock(E.P, row, x, ids, { snap: false });
      return '';
    }, true);
  }
  /* собрать группу вплотную, начиная с левого аппарата */
  function packGroup(ids) {
    const C = K();
    commit(() => {
      const ds = ids.map((id) => E.P.devs.find((d) => d.id === id)).filter(Boolean).sort((a, b) => a.x - b.x);
      if (new Set(ds.map((d) => d.row)).size > 1) return 'Собрать вплотную можно аппараты одной рейки.';
      const row = ds[0].row, x0 = ds[0].x, sum = ds.reduce((s, d) => s + d.w, 0);
      const r = C.placeInsert(E.P, row, x0, sum, ids, { snap: false });
      if (!r) return 'Не помещается: на рейке не хватает места.';
      let x = r.x;
      ds.forEach((d) => { d.x = x; x += d.w; });
      return '';
    }, true);
  }
  function moveBus(b, how) {
    const C = K();
    commit(() => {
      const zone = how === 'top' || how === 'bottom' ? how : b.zone;
      const x = how === 'top' || how === 'bottom' ? b.x : b.x + Number(how);
      const nx = C.busPlace(E.P, b, zone, x);
      if (nx == null) return 'Здесь шина не помещается или наезжает на соседнюю.';
      b.zone = zone; b.x = nx;
      return '';
    }, true);
  }
  function delSel() {
    const s = E.sel;
    if (!s) return;
    commit(() => {
      const P = E.P;
      if (s.kind === 'devs') { const ids = new Set(s.ids); P.devs = P.devs.filter((d) => !ids.has(d.id)); P.wires = P.wires.filter((w) => !ids.has(w.a.dev) && !ids.has(w.b.dev)); P.combs = P.combs.map((c) => Object.assign(c, { devs: c.devs.filter((x) => !ids.has(x)) })).filter((c) => c.devs.length > 1); }
      if (s.kind === 'dev') { P.devs = P.devs.filter((d) => d.id !== s.id); P.wires = P.wires.filter((w) => w.a.dev !== s.id && w.b.dev !== s.id); P.combs = P.combs.map((c) => Object.assign(c, { devs: c.devs.filter((x) => x !== s.id) })).filter((c) => c.devs.length > 1); }
      if (s.kind === 'wire') P.wires = P.wires.filter((w) => w.id !== s.id);
      if (s.kind === 'bus') { P.buses = P.buses.filter((b) => b.id !== s.id); P.wires = P.wires.filter((w) => w.a.bus !== s.id && w.b.bus !== s.id); }
      if (s.kind === 'line') { P.lines = P.lines.filter((l) => l.id !== s.id); P.wires = P.wires.filter((w) => w.a.line !== s.id && w.b.line !== s.id); }
      if (s.kind === 'comb') P.combs = P.combs.filter((c) => c.id !== s.id);
      if (s.kind === 'note') P.notes = (P.notes || []).filter((n) => n.id !== s.id);
      E.sel = null;
      return '';
    });
  }
  function endFromEl(el) {
    if (el.dataset.tdev) return { dev: el.dataset.tdev, term: el.dataset.tpin };
    if (el.dataset.tbus) {
      const b = E.P.buses.find((x) => x.id === el.dataset.tbus);
      let slot = Number(el.dataset.slot);
      const busy = (k) => E.P.wires.some((w) => (w.a.bus === b.id && w.a.slot === k) || (w.b.bus === b.id && w.b.slot === k));
      if (busy(slot)) { const free = [...Array(b.n).keys()].sort((p, q) => Math.abs(p - slot) - Math.abs(q - slot)).find((k) => !busy(k)); if (free === undefined) return { full: true }; slot = free; }
      return { bus: b.id, slot };
    }
    if (el.dataset.feed) return { feed: el.dataset.feed };
    if (el.dataset.line) return { line: el.dataset.line, core: el.dataset.core };
    return null;
  }
  /* ближайшая к точке клемма, отверстие шины, жила ввода или кабеля (в пределах 5 мм) */
  function endAt(p) {
    const C = K(), P = E.P;
    C.sync(P);
    let best = null, bd = 5;
    const consider = (x, y, e) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = e; } };
    P.devs.forEach((d) => C.terms(d).forEach((t) => consider(t.x, t.y, { dev: d.id, term: t.t })));
    P.buses.forEach((b) => { for (let k = 0; k < b.n; k++) { const q = C.busSlot(P, b, k); consider(q.x, q.y, { bus: b.id, slot: k }); } });
    C.feedCores(P).forEach((c) => { const q = C.feedPt(P, c); consider(q.x, q.y, { feed: c }); });
    P.lines.forEach((l) => C.lineCores(P, l).forEach((c) => { const q = C.linePt(P, l, c); consider(q.x, q.y, { line: l.id, core: c }); }));
    if (best && best.bus) {
      const busy = (k) => P.wires.some((w) => (w.a.bus === best.bus && w.a.slot === k) || (w.b.bus === best.bus && w.b.slot === k));
      if (busy(best.slot)) { const b = P.buses.find((x) => x.id === best.bus); const free = [...Array(b.n).keys()].sort((m, n) => Math.abs(m - best.slot) - Math.abs(n - best.slot)).find((k) => !busy(k)); best = free === undefined ? { full: true } : { bus: best.bus, slot: free }; }
    }
    return best;
  }
  /* перекинуть конец провода на другую клемму */
  function moveWireEnd(id, side, e) {
    const C = K();
    if (!e) { flash('Отпусти конец провода на клемме, отверстии шины или жиле кабеля.'); drawCanvas(); return; }
    if (e.full) { flash('На шине нет свободных отверстий — увеличь их число в свойствах шины.'); drawCanvas(); return; }
    commit(() => {
      const w = E.P.wires.find((x) => x.id === id);
      if (!w) return '';
      const nw = Object.assign(clone(w), { [side]: e });
      const T = clone(E.P);
      T.wires = T.wires.filter((x) => x.id !== id);
      const err = C.canWire(T, nw);
      if (err) return err;
      w[side] = e;
      w.cond = C.guessCond(T, nw) || w.cond;
      delete w.dx; delete w.dy;
      E.sel = { kind: 'wire', id };
      return '';
    }, true);
  }
  function wireClick(e) {
    if (e.full) { flash('На шине нет свободных отверстий — увеличь их число в свойствах шины.'); return; }
    E.hover = null; E.hoverKey = null;
    if (!E.wireStart) { E.wireStart = e; drawCanvas(); return; }
    const a = E.wireStart; E.wireStart = null;
    const P = E.P, C = K();
    if (C.keyOf(a) === C.keyOf(e)) { drawCanvas(); return; }
    const w = { id: uid('w'), a, b: e, cond: '', mm2: 2.5 };
    const err = C.canWire(P, w);
    if (err) { flash(err); drawCanvas(); return; }
    w.cond = C.guessCond(P, w) || (e.feed || a.feed) || (e.core || a.core) || '';
    const dev = [a, e].map((x) => x.dev && P.devs.find((d) => d.id === x.dev)).find((d) => d && d.In);
    w.mm2 = mm2Of(dev && dev.In);
    if (a.feed || e.feed) { const inp = [a, e].map((x) => x.dev && P.devs.find((d) => d.id === x.dev)).find(Boolean); w.mm2 = Math.max(w.mm2, mm2Of(inp && inp.In)); }
    if (C.WN(P).auto) w.num = C.nextWireNum(P);
    commit(() => { P.wires.push(w); E.sel = { kind: 'wire', id: w.id }; return ''; });
  }
  /* гребёнка от выбранного аппарата вправо по соседям того же вида */
  function makeComb(d, conds) {
    const P = E.P;
    const row = P.devs.filter((x) => x.row === d.row).sort((a, c) => a.x - c.x);
    const inComb = (x) => P.combs.some((c) => c.devs.includes(x.id));
    const ok = (x) => x && (x.type === 'mcb' || x.type === 'rcbo') && x.poles === d.poles && !inComb(x);
    const run = []; let cur = d;
    while (ok(cur)) { run.push(cur); const c0 = cur; cur = row.find((x) => Math.abs(x.x - (c0.x + c0.w)) < 1e-6); }
    if (run.length < 2) { flash('Справа вплотную нет автоматов того же вида без гребёнки — гребёнку ставить не на что.'); return; }
    commit(() => { P.combs.push({ id: uid('c'), devs: run.map((x) => x.id), conds }); E.sel = { kind: 'comb', id: P.combs[P.combs.length - 1].id }; return ''; });
  }

  /* буфер обмена */
  function copySel(cut) {
    const ids = selIds();
    if (!ids.length) { flash('Выдели аппараты — щелчком, Shift+щелчком или рамкой.'); return; }
    E.clip = K().copyDevs(E.P, ids);
    if (cut) { E.sel = ids.length === 1 ? { kind: 'dev', id: ids[0] } : { kind: 'devs', ids }; delSel(); flash(`Вырезано аппаратов: ${ids.length}. Ctrl+V — вставить.`, 'note'); }
    else flash(`Скопировано аппаратов: ${ids.length}${E.clip.wires.length ? `, проводов между ними: ${E.clip.wires.length}` : ''}. Ctrl+V — вставить.`, 'note');
  }
  function paste() {
    if (!E.clip) { flash('Буфер пуст: сначала скопируй аппараты (Ctrl+C).'); return; }
    const s0 = E.sel && E.sel.kind === 'dev' && E.P.devs.find((d) => d.id === E.sel.id);
    commit(() => { const r = K().pasteDevs(E.P, E.clip, s0 ? s0.row : null); if (r.err) return r.err; setSel(r.ids); return ''; });
  }
  /* правая кнопка мыши: меню того, что под указателем */
  function ctxHTML(kind) {
    const it = (act, label, key, dis) => `<button type="button" data-act="${act}"${dis ? ' disabled' : ''}><span>${esc(label)}</span>${key ? `<span class="k">${key}</span>` : ''}</button>`;
    const ids = selIds(), one = ids.length === 1 && E.P.devs.find((d) => d.id === ids[0]);
    if (kind === 'dev') return [it('copy', 'Копировать', 'Ctrl+C'), it('cut', 'Вырезать', 'Ctrl+X'), it('paste', 'Вставить', 'Ctrl+V', !E.clip), one ? it('dup', 'Копия рядом', 'Ctrl+D') : '', '<hr>',
      one && ['mcb', 'rcbo', 'sw', 'km'].includes(one.type) ? it('autoline', 'Вывести линию') : '', one && (one.type === 'mcb' || one.type === 'rcbo') ? it('comb1', 'Гребёнка вправо') : '', ids.length > 1 ? it('g-pack', 'Сдвинуть вплотную') : '', '<hr>', it('del', ids.length > 1 ? 'Удалить выделенные' : 'Удалить', 'Del')].join('');
    if (kind === 'wire') { const w = findSel(); const st = w ? K().styleOf(E.P, w) : ''; const m = (v) => (st === v ? '● ' : ''); return [it('style-duct', m('duct') + 'По кабель-каналам'), it('style-loop', m('loop') + 'Петлёй напрямую'), it('style-line', m('line') + 'Прямой линией'), '<hr>', it('reroute', 'Сбросить трассу'), it('del', 'Удалить провод', 'Del')].join(''); }
    if (kind === 'bus' || kind === 'line' || kind === 'comb' || kind === 'note') return it('del', 'Удалить', 'Del');
    return [it('paste', 'Вставить', 'Ctrl+V', !E.clip), '<hr>', it('stops', 'Ограничители по краям реек'), it('wn-renum', 'Перенумеровать провода'), it('tab-journal', 'Кабельный журнал'), it('tab-bom', 'Оборудование в щите'), it('check', 'Проверить щит')].join('');
  }
  const closeCtx = () => { const m = E.root && E.root.querySelector('.ed-ctx'); if (m) m.remove(); };
  function showCtx(x, y, kind) {
    closeCtx();
    const m = document.createElement('div');
    m.className = 'ed-ctx';
    m.innerHTML = ctxHTML(kind);
    E.root.appendChild(m);
    const r = m.getBoundingClientRect();
    m.style.left = Math.max(4, Math.min(x, window.innerWidth - r.width - 8)) + 'px';
    m.style.top = Math.max(4, Math.min(y, window.innerHeight - r.height - 8)) + 'px';
  }

  /* изменение свойства: g — группа полей (pf щит, mf штамп, df аппарат, wf провод, bf шина, lf линия), k — поле */
  function setProp(g, k, val) {
    const o = findSel();
    const C = K();
    if (g === 'pf') return commit(() => {
      if (k === 'name') { E.P.name = String(val); return ''; }
      if (k === 'preset') { if (!val) return ''; const [r, m] = String(val).split('x').map(Number); return C.resize(E.P, r, m); }
      if (k === 'rows') return C.resize(E.P, Number(val), E.P.mods);
      if (k === 'mods') return C.resize(E.P, E.P.rows, Number(val));
      if (k === 'pitch') { E.P.pitch = Number(val); return ''; }
      if (/^rp\d+$/.test(k)) { const j = Number(k.slice(2)); E.P.pitches = E.P.pitches || []; for (let q = 0; q < E.P.rows - 1; q++) if (!E.P.pitches[q]) E.P.pitches[q] = E.P.pitch || 134; E.P.pitches[j] = Number(val); return ''; }
      if (k === 'wireStyle') { E.P.wireStyle = val; return ''; }
      if (k === 'slack') { E.P.slack = Math.max(0, Math.min(100, Number(val) || 0)); return ''; }
      if (k === 'wnStart') { E.P.wn = Object.assign(C.WN(E.P), { start: Math.max(0, Math.round(Number(val) || 0)) }); return ''; }
      if (k === 'wnShow' || k === 'wnColor' || k === 'wnAuto') { E.P.wn = Object.assign(C.WN(E.P), { [{ wnShow: 'show', wnColor: 'color', wnAuto: 'auto' }[k]]: !!val }); return ''; }
      if (/^sheet:/.test(k)) { const v2 = C.VIEW(E.P); v2.sheet = Object.assign({}, v2.sheet || {}, { [k.slice(6)]: !!val }); E.P.view = v2; E.zoom = E.fit === 'all' ? -1 : E.zoom; return ''; }
      if (k === 'ferr' || k === 'stickers' || k === 'dims') { E.P.view = Object.assign(C.VIEW(E.P), { [k === 'ferr' ? 'ferrules' : k]: !!val }); return ''; }
      if (k === 'phases') { E.P.feed.phases = Number(val); E.P.wires = E.P.wires.filter((w) => !(w.a.feed && !C.feedCores(E.P).includes(w.a.feed)) && !(w.b.feed && !C.feedCores(E.P).includes(w.b.feed))); return ''; }
      if (k === 'earthing') { E.P.feed.earthing = val; E.P.wires = E.P.wires.filter((w) => !(w.a.feed && !C.feedCores(E.P).includes(w.a.feed)) && !(w.b.feed && !C.feedCores(E.P).includes(w.b.feed))); return ''; }
      return '';
    }, true);
    if (g === 'mf') { E.P.meta[k] = val; save(); return true; }
    if (g === 'df' && o) return commit(() => {
      const d = o;
      if (k === 'id') {
        const nv = String(val).trim();
        if (!nv) return 'Обозначение не может быть пустым.';
        if (E.P.devs.some((x) => x.id === nv && x !== d)) return `Обозначение ${nv} уже есть.`;
        C.renameDev(E.P, d.id, nv); E.sel.id = nv; return '';
      }
      if (k === 'sid') {
        const s = LB().byId(val);
        const poles = s.poles.includes(d.poles) ? d.poles : s.poles[0];
        const nd = LB().make(val, { poles, In: s.In && s.In.includes(d.In) ? d.In : undefined, curve: s.curves && s.curves.includes(d.curve) ? d.curve : undefined, ma: s.ma && s.ma.includes(d.ma) ? d.ma : undefined, rt: s.rt && s.rt.includes(d.rt) ? d.rt : undefined });
        const r = C.placeInsert(E.P, d.row, d.x, nd.w, d.id, { snap: false });
        if (!r) return 'Новая серия шире и не помещается на рейке.';
        const keep = { id: d.id, row: d.row, x: r.x, label: d.label };
        Object.keys(d).forEach((kk) => delete d[kk]);
        Object.assign(d, nd, keep);
      } else if (k === 'poles') {
        const s = C.spec(d), nw = LB().widthOf(s, Number(val));
        const r = C.placeInsert(E.P, d.row, d.x, nw, d.id, { snap: false });
        if (!r) return 'Не помещается: на рейке не хватает места.';
        d.poles = Number(val); d.w = nw; d.x = r.x;
      } else if (k === 'w') {
        const r = C.placeInsert(E.P, d.row, d.x, Number(val), d.id, { snap: false });
        if (!r) return 'Не помещается: на рейке не хватает места.';
        d.w = Number(val); d.x = r.x;
      } else d[k] = ['In', 'ma'].includes(k) ? Number(val) : val;
      const names = C.termNames(d).top.concat(C.termNames(d).bot);
      E.P.wires = E.P.wires.filter((w) => ![w.a, w.b].some((x) => x.dev === d.id && !names.includes(x.term)));
      return '';
    }, true);
    if (g === 'wf' && o) return commit(() => {
      if (k === 'side' || k === 'style' || k === 'color' || k === 'mark') { if (val !== '' && val != null) o[k] = val; else delete o[k]; if (k === 'style') { delete o.dx; delete o.dy; } return ''; }
      if (k === 'slack') { if (val === '' || val == null) delete o.slack; else o.slack = Math.max(0, Math.min(100, Number(val))); return ''; }
      if (k === 'num') { if (val === '' || val == null) { o.num = ''; return ''; } const n = Math.round(Number(val)); if (E.P.wires.some((x) => x !== o && Number(x.num) === n)) return `Номер ${n} уже есть у другого провода — у каждого провода свой номер.`; o.num = n; return ''; }
      o[k] = k === 'mm2' ? Number(val) : val;
      return '';
    }, true);
    if (g === 'cf' && o) return commit(() => { o[k] = val; return ''; }, true);
    if (g === 'nf' && o) return commit(() => { o[k] = String(val).slice(0, 400); return ''; }, true);
    if (g === 'bf' && o) return commit(() => {
      if (k === 'id') { const nv = String(val).trim(); if (!nv) return 'Обозначение не может быть пустым.'; if (E.P.buses.some((b) => b.id === nv && b !== o)) return `Шина ${nv} уже есть.`; E.P.wires.forEach((w) => [w.a, w.b].forEach((x) => { if (x.bus === o.id) x.bus = nv; })); o.id = nv; E.sel.id = nv; return ''; }
      if (k === 'kind') { o.kind = val; return ''; }
      if (k === 'n') {
        const n = Number(val);
        const usedMax = Math.max(-1, ...E.P.wires.map((w) => [w.a, w.b].filter((x) => x.bus === o.id).map((x) => x.slot)).flat());
        if (usedMax >= n) return `Занято отверстие №${usedMax + 1} — сначала освободи его или выбери не меньше ${usedMax + 1}.`;
        const old = o.n; o.n = n;
        const nx = C.busPlace(E.P, o, o.zone, o.x);
        if (nx == null) { o.n = old; return 'Длинная шина наезжает на соседнюю или не помещается в корпус.'; }
        o.x = nx; return '';
      }
      const zone = k === 'zone' ? val : o.zone, x = k === 'x' ? Number(val) : o.x;
      const nx = C.busPlace(E.P, o, zone, x);
      if (nx == null) return 'Здесь шина не помещается или наезжает на соседнюю.';
      o.zone = zone; o.x = nx; return '';
    }, true);
    if (g === 'lf' && o) return commit(() => {
      if (k === 'cores') { o.cores = String(val).split(','); E.P.wires = E.P.wires.filter((w) => ![w.a, w.b].some((x) => x.line === o.id && !o.cores.includes(x.core))); return ''; }
      o[k] = k === 'num' || k === 'len' ? Number(val) : val;
      return '';
    }, true);
    return false;
  }

  /* ---------- печать ---------- */
  /* строки таблиц для листов печати */
  function tableOf(kind) {
    const C = K(), P = E.P;
    if (kind === 'pe') return { title: 'Перечень элементов', head: ['Поз. обозначение', 'Наименование', 'Кол.', 'Примечание'], w: [0.18, 0.56, 0.07, 0.19], rows: C.elements(P).map((r) => [r.pos, r.name, String(r.qty), r.note]) };
    if (kind === 'journal') return { title: 'Кабельный журнал', head: ['№', 'Откуда', 'Куда', 'Марка', 'мм²', 'Цвет', 'Длина, м'], w: [0.06, 0.2, 0.2, 0.2, 0.07, 0.17, 0.1], rows: C.journal(P).map((r) => [String(r.num), r.from, r.to, r.mark, String(r.mm2).replace('.', ','), r.color, S.fmt(r.len, 2)]) };
    return { title: 'Спецификация оборудования, изделий и материалов', head: ['№', 'Наименование', 'Артикул', 'Кол-во'], w: [0.06, 0.62, 0.18, 0.14], rows: C.bom(P).map((b, i) => [String(i + 1), b.name, b.art || '', `${S.fmt(b.qty, 1)} ${b.unit}`]) };
  }
  const ROWH = 5.6;
  const perPage = (fmt) => Math.max(5, Math.floor(((fmt === 'A4' ? 210 : 297) - 10 - 55 - 10 - 14) / ROWH) - 1);
  function sheetSVG(kind, fmt, page) {
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
    tb += tx(rx + 35, tby + 36, ({ panel: 'Щит. Общий вид с монтажом', scheme: 'Схема однолинейная принципиальная', journal: 'Кабельный журнал', pe: 'Перечень элементов', tags: 'Бирки на кабели', labels: 'Наклейки на щит, 1:1' })[kind] || 'Спецификация', 2.8, { a: 'middle' });
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
    } else if (kind === 'tags') {
      /* бирки на отходящие кабели: группа, назначение, кабель, длина, от какого аппарата */
      const gr = K().groups(P), TW = 70, TH = 30, cols = Math.max(1, Math.floor((area.w + 4) / (TW + 4))), rowsN = Math.max(1, Math.floor((area.h - 8 + 4) / (TH + 4))), per = cols * rowsN, pg = page || 0;
      content = tx(area.x, area.y + 5, 'Бирки на кабели: вырезать и надеть на кабель у щита', 4, { b: true });
      gr.slice(pg * per, pg * per + per).forEach((g, i) => {
        const x = area.x + (i % cols) * (TW + 4), y = area.y + 9 + Math.floor(i / cols) * (TH + 4);
        content += `<rect x="${x}" y="${y}" width="${TW}" height="${TH}" rx="3" style="fill:#fff;stroke:#000;stroke-width:0.3"/><circle cx="${x + 5}" cy="${y + TH / 2}" r="1.8" style="fill:none;stroke:#000;stroke-width:0.3"/>`;
        content += tx(x + 10, y + 8, `Гр. ${g.l.num}`, 5.5, { b: true }) + tx(x + TW - 3, y + 8, g.prot ? g.prot.id : '', 4, { a: 'end', b: true });
        content += tx(x + 10, y + 14.5, String(g.l.name).slice(0, 30), 3.4) + tx(x + 10, y + 20.5, String(g.l.cable || '').slice(0, 32), 3) + tx(x + 10, y + 26, (g.l.len ? `${g.l.len} м · ` : '') + String(P.name).slice(0, 26), 2.6);
      });
    } else if (kind === 'labels') {
      /* наклейки на щит в масштабе 1:1: полоска на рейку, клетка на аппарат — обозначение и назначение */
      const M = K().G.MOD, CH = 12;
      content = tx(area.x, area.y + 5, 'Наклейки на щит в масштабе 1:1 — печатать без масштабирования, вырезать по рамке', 4, { b: true });
      let y = area.y + 10;
      for (let row = 0; row < P.rows; row++) {
        content += tx(area.x, y + 7.5, String(row + 1), 3.4, { b: true });
        let x = area.x + 6;
        P.devs.filter((d) => d.row === row && d.type !== 'stop').sort((a, b) => a.x - b.x).forEach((d) => {
          const w = d.w * M;
          if (x + w > area.x + area.w) { x = area.x + 6; y += CH + 3; }
          const n1 = Math.floor(w / 1.9), lab = String(d.label || '');
          content += `<rect x="${x}" y="${y}" width="${w}" height="${CH}" style="fill:#fff;stroke:#000;stroke-width:0.25"/>` + tx(x + w / 2, y + 4.4, d.id, 3.2, { a: 'middle', b: true }) + tx(x + w / 2, y + 8.4, lab.length > n1 ? lab.slice(0, n1 - 1) + '…' : lab, 2.6, { a: 'middle' });
          x += w;
        });
        y += CH + 6;
        if (y > area.y + area.h - CH) break;
      }
    } else {
      const T = tableOf(kind), n = perPage(fmt), pg = page || 0;
      const rows = T.rows.slice(pg * n, pg * n + n);
      const pages = Math.max(1, Math.ceil(T.rows.length / n));
      content = tx(area.x, area.y + 5, T.title + (pages > 1 ? ` (лист ${pg + 1} из ${pages})` : ''), 4, { b: true });
      const cw = T.w.map((f) => f * area.w);
      [T.head].concat(rows).forEach((row, ri) => {
        const y = area.y + 9 + ri * ROWH;
        content += `<rect x="${area.x}" y="${y}" width="${area.w}" height="${ROWH}" style="fill:${ri ? '#fff' : '#eee'};stroke:#000;stroke-width:0.2"/>`;
        let cx = area.x;
        row.forEach((c, ci) => { const max = Math.floor(cw[ci] / 1.6); const str = String(c); content += tx(cx + 1.2, y + 4, str.length > max ? str.slice(0, max - 1) + '…' : str, 2.9, { b: !ri }); cx += cw[ci]; if (ci < row.length - 1) content += ln(cx, y, cx, y + ROWH, 0.2); });
      });
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SW} ${SH}" width="${SW}mm" height="${SH}mm" style="font-family:Arial,sans-serif;--ink:#000;--ink-2:#333;--line-2:#666;--surface:#fff;--surface-2:#f2f2f2;--accent:#0969da;--enc:#e4e8ec;--enc-line:#b5bec7;--rail:#aeb4af;--w-l1:#8A5426;--w-l2:#1D1D1D;--w-l3:#8E9497;--w-n:#2A6CD6;--w-pe:#2F9B4A;--w-pey:#E2BE14;--font-body:Arial,sans-serif;--font-mono:Consolas,monospace">${frame}${content}${tb}</svg>`;
  }
  async function printSheets(fmt, kinds) {
    const list = [];
    const tagsPer = () => Math.max(1, Math.floor(((fmt === 'A4' ? 297 : 420) - 35 + 4) / 74)) * Math.max(1, Math.floor(((fmt === 'A4' ? 210 : 297) - 75 - 4) / 34));
    kinds.forEach((k) => { const n = k === 'bom' || k === 'journal' || k === 'pe' ? Math.max(1, Math.ceil(tableOf(k).rows.length / perPage(fmt))) : k === 'tags' ? Math.max(1, Math.ceil(K().groups(E.P).length / tagsPer())) : 1; for (let pg = 0; pg < n; pg++) list.push([k, pg]); });
    const sheets = list.map(([k, pg], i) => { E.P.meta.sheet = i + 1; E.P.meta.sheets = list.length; return sheetSVG(k, fmt, pg); });
    const [SW, SH] = fmt === 'A4' ? [297, 210] : [420, 297];
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(E.P.name)}</title><style>@page{size:${fmt} landscape;margin:0}body{margin:0}svg{display:block;width:${SW}mm;height:${SH}mm;page-break-after:always}</style></head><body>${sheets.join('')}<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.open(); w.document.write(html); w.document.close(); return; }
    await S.saveFile((E.P.name || 'shchit') + '.html', html, 'text/html;charset=utf-8');
    S.toast && S.toast('Окно печати заблокировано: лист сохранён файлом — открой его и напечатай');
  }


  E.sheetSVG = sheetSVG;
  E.schemeSVG = schemeSVG;
  E.api = { ribbonHTML, sheetExtras, copySel, paste, ctxHTML, endAt, moveWireEnd, setSel, moveGroup, packGroup, setProp, addDevice, moveDev, moveBus, delSel, wireClick, makeComb, commit, undo, redo };

  /* ---------- экран ---------- */
  S.view('editor', {
    tab: 'editor', top: true,
    render() {
      load(); css();
      return `<div class="wrap ed-wrap">
<div class="ed-rib">
<div class="ed-rib-tabs"><input class="inp" data-name value="${esc(E.P.name)}" aria-label="Название щита">${RTABS.map(([k, l]) => `<button type="button" data-rtab="${k}" aria-selected="${(E.rtab || 'home') === k}">${l}</button>`).join('')}<span class="sp"></span><button type="button" class="ed-rb sm" data-act="full" aria-pressed="false" title="Весь экран: только щит, как в Visio (Esc — выход)">⛶ Весь экран</button></div>
<div class="ed-rib-body" data-ribbon>${ribbonHTML()}</div>
</div>
<div class="ed-main">
<aside class="ed-side" data-lib>${libHTML()}</aside>
<section class="ed-center"><div class="ed-tabs" role="tablist">${[['panel', 'Вид щита'], ['scheme', 'Однолинейная схема'], ['groups', 'Группы'], ['bom', 'Спецификация'], ['pe', 'Перечень элементов'], ['journal', 'Кабельный журнал'], ['checks', 'Проверки']].map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${E.tab === k}">${l}</button>`).join('')}</div><div data-pane style="flex:1;display:flex;flex-direction:column;min-height:420px">${tabHTML()}</div></section>
<aside class="ed-side ed-props" data-props>${propsHTML()}</aside>
</div>
<input type="file" accept=".json,application/json" data-file hidden><input type="file" accept=".json,application/json" data-libfile hidden>
</div>`;
    },
    mount(root) {
      E.root = root;
      E.drag = null; E.view = null; E.ghost = null; E.busGhost = null;
      let full = false;
      try { full = localStorage.getItem('shk:ed:full') === '1'; } catch (er) { full = false; }
      setFull(full);
      if (!S.edHooks) {
        S.edHooks = true;
        window.addEventListener('hashchange', () => { if (!/^#editor/.test(location.hash)) document.body.classList.remove('ed-full'); });
        document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.body.classList.contains('ed-full') && E.root && document.body.contains(E.root)) setFull(false); });
        document.addEventListener('click', (e) => { const d = E.root && E.root.querySelector('[data-drop].open'); if (d && !e.target.closest('.ed-menu')) d.classList.remove('open'); });
      }
      load();
      refresh();
      const P = () => E.P;

      root.addEventListener('input', (e) => {
        const el = e.target;
        if (el.matches('[data-q]')) { E.q = el.value; const lib = root.querySelector('[data-lib]'); const pos = el.selectionStart; lib.innerHTML = libHTML(); const q = lib.querySelector('[data-q]'); q.focus(); q.setSelectionRange(pos, pos); }
        if (el.matches('[data-name]')) { P().name = el.value; save(); }
      });
      root.addEventListener('change', (e) => {
        const el = e.target;
        const val = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value;
        const g = ['pf', 'mf', 'df', 'wf', 'bf', 'lf', 'cf', 'nf'].find((x) => el.dataset[x]);
        if (g) setProp(g, el.dataset[g], val);
        if (el.matches('[data-file]') && el.files[0]) {
          const f = el.files[0]; el.value = '';
          f.text().then((t) => {
            let p = null;
            try { p = JSON.parse(t); } catch (er) { p = null; }
            if (!p || !Array.isArray(p.devs) || !p.rows || !p.mods) { flash('Это не файл щита редактора.'); return; }
            p.pitch = p.pitch || 134; p.buses = p.buses || []; p.wires = p.wires || []; p.combs = p.combs || []; p.lines = p.lines || []; p.meta = p.meta || {}; p.feed = p.feed || { phases: 1, earthing: 'TN-C-S' };
            commit(() => { E.P = norm(p); E.sel = null; E.zoom = 0; return ''; }, false, true);
            S.toast && S.toast('Щит загружен');
          });
        }
        if (el.matches('[data-libfile]') && el.files[0]) {
          const f = el.files[0]; el.value = '';
          f.text().then((t) => { try { const arr = JSON.parse(t); if (!Array.isArray(arr)) throw new Error('fmt'); const mine = LB().loadMine(); arr.forEach((x) => { if (x && x.id && x.kind && x.series && !mine.some((m) => m.id === x.id)) mine.push(x); }); LB().saveMine(mine); E.brand = 'my'; refresh('lib'); S.toast && S.toast('Библиотека пополнена'); } catch (er) { flash('Это не файл библиотеки аппаратов.'); } });
        }
      });

      root.addEventListener('click', (e) => {
        const it = e.target.closest('[data-openi]');
        if (it) {
          let list = []; try { list = JSON.parse(localStorage.getItem(LSL) || '[]'); } catch (er) { list = []; }
          const x = list[Number(it.dataset.openi)];
          if (x) commit(() => { E.P = norm(clone(x.P)); E.sel = null; E.zoom = 0; return ''; }, false, true);
          return;
        }
        const mydel = e.target.closest('[data-mydel]'), myed = e.target.closest('[data-myedit]');
        if (mydel || myed) {
          const id = (mydel || myed).dataset[mydel ? 'mydel' : 'myedit'];
          if (myed) { E.myForm = true; E.myEdit = id; E.newForm = false; E.sel = null; refresh('props'); return; }
          const mine = LB().loadMine(), item = mine.find((x) => x.id === id);
          if (!item) return;
          LB().saveMine(mine.filter((x) => x.id !== id));
          refresh('lib');
          const used = E.P.devs.filter((d) => d.sid === id).length;
          S.toast && S.toast(`«${item.series}» удалён из библиотеки${used ? `; на щите остались ${used} шт. — их можно удалить отдельно` : ''}`, { label: 'Вернуть', run: () => { const m2 = LB().loadMine(); if (!m2.some((x) => x.id === id)) { m2.push(item); LB().saveMine(m2); } refresh('lib'); } });
          return;
        }
        const b = e.target.closest('button');
        const drop = root.querySelector('[data-drop]');
        if (drop && !(b && b.dataset.act === 'menu')) drop.classList.remove('open');
        closeCtx();
        if (!b) return;
        const C = K();
        if (b.dataset.brand) { E.brand = b.dataset.brand; refresh('lib'); return; }
        if (b.dataset.rtab) { E.rtab = b.dataset.rtab; root.querySelectorAll('[data-rtab]').forEach((x) => x.setAttribute('aria-selected', String(x === b))); root.querySelector('[data-ribbon]').innerHTML = ribbonHTML(); return; }
        if (b.dataset.tab) { E.tab = b.dataset.tab; E.wireStart = null; root.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === b))); root.querySelector('[data-pane]').innerHTML = tabHTML(); if (E.tab === 'panel') drawCanvas(); return; }
        if (b.dataset.tool) { E.tool = b.dataset.tool; E.wireStart = null; if (E.tool !== 'ruler') { E.ruler = null; E.hover = null; } root.querySelectorAll('[data-tool]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); drawCanvas(); return; }
        if (b.dataset.move) { const d = findSel(); if (d) moveDev(d, b.dataset.move); return; }
        if (b.dataset.gmove) { moveGroup(selIds(), b.dataset.gmove); return; }
        if (b.dataset.rail) { const op = b.dataset.rail, k = Number(b.dataset.k); commit(() => C.railOp(P(), op, k), true); if (op !== 'swap') { E.zoom = E.fit === 'all' ? -1 : 0; drawCanvas(); } return; }
        if (b.dataset.bmove) { const bb = findSel(); if (bb) moveBus(bb, b.dataset.bmove); return; }
        const act = b.dataset.act;
        if (!act) return;
        if (act === 'menu') { drop.classList.toggle('open'); return; }
        const goTab = (t) => { E.tab = t; E.wireStart = null; root.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.tab === t))); root.querySelector('[data-pane]').innerHTML = tabHTML(); if (t === 'panel') drawCanvas(); };
        const fname = (suffix) => `${(P().name || 'shchit').replace(/[\\/:*?"<>|]+/g, ' ').trim()} — ${suffix}.csv`;
        if (act === 'copy') { copySel(false); return; }
        if (act === 'cut') { copySel(true); return; }
        if (act === 'paste') { paste(); return; }
        if (act === 'style-duct' || act === 'style-loop' || act === 'style-line') { const w = findSel(); if (w && E.sel.kind === 'wire') commit(() => { w.style = act.slice(6); delete w.dx; delete w.dy; return ''; }, true); return; }
        if (act === 'stops') {
          let res = null;
          const ok = commit(() => { res = C.autoStops(P()); if (!res.added) return res.miss ? 'Для ограничителей нет места: аппараты стоят до краёв реек.' : 'Ограничители уже стоят по краям аппаратов.'; return ''; }, true);
          if (ok && res && res.added) flash(`Поставлено ограничителей: ${res.added}.${res.miss ? ` Ещё ${res.miss} не встали: рейка заполнена до края.` : ''}`, 'note');
          return;
        }
        if (act === 'wn-renum') { commit(() => { C.numberWires(P(), true); return ''; }, true); flash(`Провода перенумерованы с ${C.WN(P()).start} сверху вниз и слева направо.`, 'note'); if (E.tab === 'journal') goTab('journal'); return; }
        if (/^tab-/.test(act)) { goTab(act.slice(4)); return; }
        if (act === 'csv-pe') { S.saveFile(fname('перечень элементов'), csv(['Поз. обозначение', 'Наименование', 'Кол.', 'Примечание'], C.elements(P()).map((r) => [r.pos, r.name, r.qty, r.note])), 'text/csv;charset=utf-8'); return; }
        if (act === 'print-tags') { if (!P().lines.length) { flash('Линий нет — бирки печатать не на что.'); return; } printSheets('A4', ['tags']); return; }
        if (act === 'print-labels') { printSheets('A3', ['labels']); return; }
        if (act === 'csv-bom') { S.saveFile(fname('спецификация'), csv(['№', 'Наименование', 'Артикул', 'Количество', 'Ед.'], C.bom(P()).map((b, i) => [i + 1, b.name, b.art || '', S.fmt(b.qty, 1), b.unit])), 'text/csv;charset=utf-8'); return; }
        if (act === 'csv-journal') { S.saveFile(fname('кабельный журнал'), csv(['№ провода', 'Откуда', 'Куда', 'Марка', 'Сечение, мм²', 'Цвет', 'Длина, м'], C.journal(P()).map((r) => [r.num, r.from, r.to, r.mark, String(r.mm2).replace('.', ','), r.color, S.fmt(r.len, 2)])), 'text/csv;charset=utf-8'); return; }
        if (act === 'full') {
          const on = !document.body.classList.contains('ed-full');
          setFull(on);
          try { if (on && document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); else if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (er) { /* окно браузера не дало */ }
          return;
        }
        if (act === 'full-old') { const on = document.body.classList.toggle('ed-full'); b.setAttribute('aria-pressed', String(on)); try { localStorage.setItem('shk:ed:full', on ? '1' : ''); } catch (er) { /* без памяти */ } if (E.fit !== 'all') E.zoom = 0; else E.zoom = -1; drawCanvas(); return; }
        if (act === 'undo') undo();
        else if (act === 'redo') redo();
        else if (act === 'zoom-in') { E.zoom = Math.min(8, (E.zoom || 1) * 1.25); drawCanvas(); }
        else if (act === 'zoom-out') { E.zoom = Math.max(0.6, (E.zoom || 1) / 1.25); drawCanvas(); }
        else if (act === 'zoom-fit') { E.zoom = E.fit === 'all' ? 0 : -1; E.fit = E.fit === 'all' ? 'width' : 'all'; drawCanvas(); }
        else if (act === 'del') delSel();
        else if (act === 'g-pack') packGroup(selIds());
        else if (act === 'new') { E.newForm = true; E.myForm = false; E.sel = null; refresh('props'); }
        else if (act === 'new-cancel') { E.newForm = false; refresh('props'); }
        else if (act === 'new-go') {
          const g = (k) => root.querySelector(`[data-new="${k}"]`).value;
          const [r, m] = g('size').split('x').map(Number);
          E.newForm = false;
          commit(() => { E.P = C.blank(r, m); E.P.feed = { phases: Number(g('phases')), earthing: g('earthing') }; E.sel = null; E.zoom = 0; return ''; }, false, true);
        } else if (act === 'from-builder') {
          const cfg = S.getBuilderCfg && S.getBuilderCfg();
          if (!cfg) { flash('Сначала собери щит в конструкторе.'); return; }
          commit(() => { E.P = C.fromBuilder(S.engine.build(cfg), ['ekf', 'iek', 'abb', 'se'].includes(E.brand) ? E.brand : 'ekf'); E.sel = null; E.zoom = 0; return ''; }, false, true);
          S.toast && S.toast('Щит перенесён из конструктора с проводами');
        } else if (act === 'save-as') {
          let list = []; try { list = JSON.parse(localStorage.getItem(LSL) || '[]'); } catch (er) { list = []; }
          const i = list.findIndex((x) => x.name === P().name);
          const item = { name: P().name, at: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16).replace('T', ' '), P: P() };
          if (i >= 0) list[i] = item; else list.unshift(item);
          try { localStorage.setItem(LSL, JSON.stringify(list.slice(0, 40))); S.toast && S.toast('Сохранено в «Мои щиты»'); } catch (er) { flash('Не хватает памяти браузера — выгрузи щит в файл.'); }
        } else if (act === 'open') {
          let list = []; try { list = JSON.parse(localStorage.getItem(LSL) || '[]'); } catch (er) { list = []; }
          E.sel = null; E.myForm = false; E.newForm = false;
          root.querySelector('[data-props]').innerHTML = `<h3>Мои щиты</h3>${list.length ? list.map((x, i) => `<div class="ed-card" style="cursor:pointer" data-openi="${i}"><b>${esc(x.name)}</b><span>${esc(x.at)}</span></div>`).join('') : '<p class="small muted">Сохранённых щитов пока нет. Нажми «Сохранить».</p>'}`;
        } else if (act === 'export') S.saveFile((P().name || 'shchit') + '.json', JSON.stringify(P(), null, 1), 'application/json');
        else if (act === 'import') root.querySelector('[data-file]').click();
        else if (act === 'add-line') commit(() => { const n = P().lines.reduce((m, l) => Math.max(m, l.num || 0), 0) + 1; const l = { id: uid('l'), num: n, name: 'Новая линия', cable: 'ВВГнг(А)-LS 3×2,5', len: 15 }; P().lines.push(l); E.sel = { kind: 'line', id: l.id }; return ''; });
        else if (act === 'add-busN' || act === 'add-busPE') commit(() => {
          const kind = act === 'add-busN' ? 'N' : 'PE';
          let k = 1; const base = kind;
          while (P().buses.some((x) => x.id === base + k) || (kind === 'PE' && k === 1 && P().buses.some((x) => x.id === 'PE'))) k++;
          const nb = { id: kind === 'PE' && !P().buses.some((x) => x.id === 'PE') ? 'PE' : base + k, kind, zone: kind === 'N' ? 'top' : 'bottom', x: 0, n: 8 };
          for (const zone of [nb.zone, nb.zone === 'top' ? 'bottom' : 'top']) {
            const others = P().buses.filter((x) => x.zone === zone);
            const x0 = others.length ? Math.max(...others.map((x) => x.x + C.busW(x) + 6)) : 4;
            nb.zone = zone;
            const nx = C.busPlace(P(), nb, zone, x0);
            if (nx != null) { nb.x = nx; P().buses.push(nb); E.sel = { kind: 'bus', id: nb.id }; return ''; }
          }
          return 'Новая шина не помещается: укороти другие шины или увеличь число модулей.';
        });
        else if (act === 'arrange') commit(() => { C.arrangeBuses(P()); C.balanceBuses(P()); return ''; }, true);
        else if (act === 'renumber') commit(() => { const id = E.sel && E.sel.kind === 'dev' ? E.sel.id : null; C.renumber(P()); if (id) E.sel = null; return ''; });
        else if (act === 'reroute') { const w = findSel(); if (w) commit(() => { delete w.dy; delete w.dx; delete w.side; return ''; }, true); }
        else if (act === 'dup') { const d = findSel(); if (d) addDevice(d.sid, { row: d.row, x: d.x + d.w }, { poles: d.poles, In: d.In, curve: d.curve, ma: d.ma, rt: d.rt, w: d.w }); }
        else if (act === 'autoline') {
          const d = findSel(); if (!d) return;
          commit(() => { const r = C.autoLine(P(), d.id); if (r.err) return r.err; E.sel = { kind: 'line', id: r.line.id }; return ''; });
        } else if (act === 'comb1' || act === 'comb3') { const d = findSel(); if (d) makeComb(d, act === 'comb3' || d.poles >= 3 ? ['L1', 'L2', 'L3'] : ['L']); }
        else if (act === 'comb-grow' || act === 'comb-shrink') {
          const c = findSel(); if (!c) return;
          commit(() => {
            if (act === 'comb-shrink') { if (c.devs.length <= 2) return 'Гребёнка короче двух аппаратов не нужна — удали её.'; c.devs.pop(); return ''; }
            const last = P().devs.find((x) => x.id === c.devs[c.devs.length - 1]);
            const first = P().devs.find((x) => x.id === c.devs[0]);
            const nx = P().devs.find((x) => x.row === last.row && Math.abs(x.x - (last.x + last.w)) < 1e-6);
            if (!nx || nx.type !== first.type || nx.poles !== first.poles || P().combs.some((z) => z.devs.includes(nx.id))) return 'Справа вплотную нет подходящего аппарата.';
            c.devs.push(nx.id); return '';
          }, true);
        } else if (act === 'check') { E.tab = 'checks'; root.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.tab === 'checks'))); root.querySelector('[data-pane]').innerHTML = tabHTML(); }
        else if (act === 'print') {
          E.sel = null; E.myForm = false; E.newForm = false;
          root.querySelector('[data-props]').innerHTML = `<h3>Печать и PDF</h3><label>Формат листа</label><select data-print-fmt><option>A3</option><option>A4</option></select>
<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-pk="panel" checked> Вид щита с монтажом</label><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-pk="scheme" checked> Однолинейная схема</label><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-pk="bom" checked> Спецификация</label><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-pk="pe"> Перечень элементов</label><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-pk="journal" checked> Кабельный журнал</label><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-pk="tags"> Бирки на кабели</label><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-pk="labels"> Наклейки на щит (1:1)</label>
<p class="small muted">Листы с рамкой и основной надписью. Данные штампа — в свойствах щита (нажми на пустое место холста). В окне печати выбери «Сохранить как PDF».</p><div class="row"><button class="btn sm primary" type="button" data-act="print-go">${S.icon('doc')}Печатать</button><button class="btn sm" type="button" data-act="print-svg">${S.icon('download')}Вид щита в SVG</button></div>`;
        } else if (act === 'print-go') {
          const fmt = root.querySelector('[data-print-fmt]').value;
          const kinds = [...root.querySelectorAll('[data-pk]')].filter((x) => x.checked).map((x) => x.dataset.pk);
          if (!kinds.length) { flash('Выбери хотя бы один лист.'); return; }
          printSheets(fmt, kinds);
        } else if (act === 'print-svg') S.saveFile((P().name || 'shchit') + '.svg', sheetSVG('panel', root.querySelector('[data-print-fmt]').value), 'image/svg+xml');
        else if (act === 'mydev') { E.myForm = true; E.myEdit = null; E.newForm = false; E.sel = null; refresh('props'); }
        else if (act === 'mydev-cancel') { E.myForm = false; E.myEdit = null; refresh('props'); }
        else if (act === 'mydev-save') {
          const g = (k) => root.querySelector(`[data-my="${k}"]`).value;
          const series = g('series').trim();
          if (!series) { flash('Укажи производителя и серию.'); return; }
          const In = g('In').split(/[,; ]+/).map(Number).filter((x) => x > 0).sort((a, c) => a - c);
          const item = { id: E.myEdit || 'my-' + Date.now().toString(36), brand: 'my', series, kind: g('kind'), poles: [Number(g('poles'))], w: Number(g('w')), h: Math.max(40, Math.min(150, Number(g('h')) || 85)), note: g('note') };
          if (g('art').trim()) item.art = g('art').trim();
          if (In.length) item.In = In;
          if (item.kind === 'mcb' || item.kind === 'rcbo') item.curves = ['B', 'C', 'D'];
          if (item.kind === 'rcd' || item.kind === 'rcbo') { item.ma = [10, 30, 100, 300]; item.rt = ['AC', 'A']; }
          const mine = LB().loadMine(); const at = mine.findIndex((x) => x.id === item.id); if (at >= 0) mine[at] = item; else mine.push(item); LB().saveMine(mine);
          const was = E.myEdit; E.myForm = false; E.myEdit = null; E.brand = 'my'; refresh('lib'); refresh('props'); drawCanvas();
          S.toast && S.toast(was ? 'Аппарат изменён' : 'Аппарат добавлен в «Мои»');
        } else if (act === 'mylib-export') S.saveFile('moi-apparaty.json', JSON.stringify(LB().loadMine(), null, 1), 'application/json');
        else if (act === 'mylib-import') root.querySelector('[data-libfile]').click();
      });

      /* перетаскивание: из библиотеки, аппаратов, шин, участков проводов */
      let ghostEl = null, asTimer = 0, lastEv = null;
      /* у края холста он сам прокручивается, чтобы дотянуть аппарат до дальней рейки */
      const autoScroll = (ev) => {
        const cv = root.querySelector('[data-canvas]');
        if (!cv) return;
        const r = cv.getBoundingClientRect();
        const inside = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top - 20 && ev.clientY <= r.bottom + 20;
        const edge = (v, a, b) => (v < a + 36 ? -Math.ceil((a + 36 - v) / 3) : v > b - 36 ? Math.ceil((v - b + 36) / 3) : 0);
        E.as = inside ? { dx: edge(ev.clientX, r.left, r.right), dy: edge(ev.clientY, r.top, r.bottom) } : null;
        if (E.as && (E.as.dx || E.as.dy) && !asTimer) asTimer = setInterval(() => {
          if (!E.drag || !E.as || (!E.as.dx && !E.as.dy)) { clearInterval(asTimer); asTimer = 0; return; }
          const c2 = root.querySelector('[data-canvas]');
          if (!c2) return;
          const t = c2.scrollTop, l = c2.scrollLeft;
          c2.scrollTop += Math.max(-24, Math.min(24, E.as.dy)); c2.scrollLeft += Math.max(-24, Math.min(24, E.as.dx));
          if (c2.scrollTop !== t || c2.scrollLeft !== l) onMove(lastEv, true);
        }, 30);
      };
      const onMove = (ev, fromTimer) => {
        const dr = E.drag;
        if (!dr || !ev) return;
        lastEv = ev;
        if (!dr.moved && Math.hypot(ev.clientX - dr.cx, ev.clientY - dr.cy) > 4) dr.moved = true;
        if (!dr.moved) return;
        if (!fromTimer) autoScroll(ev);
        const p = svgPt(ev);
        const C = K();
        if (dr.kind === 'band' && p) {
          E.band = { x: Math.min(p.x, dr.p0.x), y: Math.min(p.y, dr.p0.y), w: Math.abs(p.x - dr.p0.x), h: Math.abs(p.y - dr.p0.y) };
          schedule();
          return;
        }
        if (dr.kind === 'ruler' && p) {
          const e1 = endAt(p), q1 = e1 && !e1.full ? C.endInfo(E.P, e1) : null, b = q1 ? { x: q1.x, y: q1.y } : p;
          E.ruler = { x1: dr.p0.x, y1: dr.p0.y, x2: b.x, y2: b.y };
          const L = Math.hypot(b.x - dr.p0.x, b.y - dr.p0.y);
          E.hover = `Расстояние ${S.fmt(L, 1)} мм (по горизонтали ${S.fmt(Math.abs(b.x - dr.p0.x), 1)}, по вертикали ${S.fmt(Math.abs(b.y - dr.p0.y), 1)})${q1 ? ' · до клеммы' : ''}`;
          schedule();
          return;
        }
        if (dr.kind === 'note' && p) {
          const n = (E.P.notes || []).find((x) => x.id === dr.id);
          if (!n) return;
          const dx = p.x - dr.p0.x, dy = p.y - dr.p0.y;
          if (dr.mode === 'box') { n.x = dr.v0.x + dx; n.y = dr.v0.y + dy; } else { n.ax = dr.v0.ax + dx; n.ay = dr.v0.ay + dy; }
          schedule();
          return;
        }
        if (dr.kind === 'wend' && p) {
          const w = E.P.wires.find((x) => x.id === dr.id);
          const other = w && C.endInfo(E.P, dr.side === 'a' ? w.b : w.a);
          if (!other) return;
          const e = endAt(p);
          const T = clone(E.P);
          T.wires = T.wires.filter((x) => x.id !== dr.id);
          const err = e && !e.full ? C.canWire(T, Object.assign(clone(w), { [dr.side]: e })) : 'Отпусти конец на клемме, отверстии шины или жиле кабеля';
          E.preview = { x1: other.x, y1: other.y, x2: p.x, y2: p.y, ok: !err };
          E.hover = err || 'Можно подключить сюда — отпусти';
          schedule();
          return;
        }
        if (dr.kind === 'group') {
          const sl = p && slotAt(p, dr.w, dr.grab);
          if (sl) {
            const tmp = clone(E.P);
            const r = C.placeBlock(tmp, sl.row, sl.x, dr.ids);
            if (r) { C.fixCombs(tmp); E.view = tmp; E.ghost = { row: sl.row, x: r.x, raw: sl.x, w: dr.w, ok: true, snap: Math.abs(r.x - sl.x) > 1e-6 }; } else { E.view = null; E.ghost = { row: sl.row, x: sl.x, w: dr.w, ok: false }; }
          } else { E.view = null; E.ghost = null; }
          schedule();
          return;
        }
        if (dr.kind === 'new' || dr.kind === 'move') {
          if (dr.kind === 'new') { if (!ghostEl) { ghostEl = document.createElement('div'); ghostEl.className = 'ed-ghost'; ghostEl.textContent = dr.title; document.body.appendChild(ghostEl); } ghostEl.style.left = ev.clientX + 14 + 'px'; ghostEl.style.top = ev.clientY + 14 + 'px'; }
          const sl = p && E.tab === 'panel' && slotAt(p, dr.w, dr.grab);
          if (sl) {
            const tmp = clone(E.P);
            const r = C.placeInsert(tmp, sl.row, sl.x, dr.w, dr.kind === 'move' ? dr.id : null);
            if (r) {
              if (dr.kind === 'move') { const t = tmp.devs.find((x) => x.id === dr.id); t.row = sl.row; t.x = r.x; }
              else tmp.devs.push(Object.assign(clone(dr.dev), { id: '…', row: sl.row, x: r.x }));
              C.fixCombs(tmp);
              E.view = tmp; E.ghost = { row: sl.row, x: r.x, raw: sl.x, w: dr.w, ok: true, snap: Math.abs(r.x - sl.x) > 1e-6 };
            } else { E.view = null; E.ghost = { row: sl.row, x: sl.x, w: dr.w, ok: false }; }
          } else { E.view = null; E.ghost = null; }
          schedule();
        } else if (dr.kind === 'bus' && p) {
          const b = E.P.buses.find((x) => x.id === dr.id);
          const zone = p.y < C.H(E.P) / 2 ? 'top' : 'bottom';
          const x = p.x - C.G.SD - dr.grab;
          const tmp = clone(E.P), tb = tmp.buses.find((x2) => x2.id === dr.id);
          const nx = C.busPlace(tmp, tb, zone, x);
          if (nx != null) { tb.zone = zone; tb.x = nx; E.view = tmp; } else E.view = null;
          E.busGhost = { zone, x: nx != null ? nx : Math.max(0, x), w: C.busW(b), ok: nx != null };
          schedule();
        } else if (dr.kind === 'seg' && p) {
          const w = E.P.wires.find((x) => x.id === dr.id);
          if (!w) return;
          if (dr.seg === 'c') { if (C.styleOf(E.P, w) === 'loop') w.dy = Math.max(-10, Math.min(80, dr.v0 + (p.y - dr.p0.y) * dr.sgn)); }
          else if (dr.seg === 'h') w.dy = Math.max(-(C.G.DUCT / 2), Math.min(C.G.DUCT / 2, dr.v0 + (p.y - dr.p0.y)));
          else w.dx = Math.max(-12, Math.min(C.G.SD, dr.v0 + (dr.left ? p.x - dr.p0.x : dr.p0.x - p.x)));
          schedule();
        }
      };
      const endDrag = () => {
        if (asTimer) { clearInterval(asTimer); asTimer = 0; }
        E.as = null;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        if (ghostEl) { ghostEl.remove(); ghostEl = null; }
      };
      const onCancel = () => { const dr = E.drag; E.drag = null; endDrag(); if (dr && dr.kind === 'seg') { const w = E.P.wires.find((x) => x.id === dr.id); if (w) { if (dr.seg !== 'v') w.dy = dr.v0; else w.dx = dr.v0; } } E.view = null; E.ghost = null; E.busGhost = null; E.band = null; E.preview = null; E.hover = null; drawCanvas(); };
      const onUp = () => {
        const dr = E.drag;
        E.drag = null;
        endDrag();
        const gh = E.ghost, bg = E.busGhost, band = E.band;
        E.view = null; E.ghost = null; E.busGhost = null; E.band = null;
        if (!dr) return;
        const C = K();
        if (dr.kind === 'ruler') { if (!dr.moved) { E.ruler = null; E.hover = null; } drawCanvas(); return; }
        if (dr.kind === 'note') {
          const n = (E.P.notes || []).find((x) => x.id === dr.id);
          if (!n) return;
          if (!dr.moved) { E.sel = { kind: 'note', id: n.id }; E.myForm = false; E.newForm = false; refresh(); return; }
          const v = { x: n.x, y: n.y, ax: n.ax, ay: n.ay };
          Object.assign(n, dr.v0);
          commit(() => { Object.assign(n, { x: Math.round(v.x * 10) / 10, y: Math.round(v.y * 10) / 10, ax: Math.round(v.ax * 10) / 10, ay: Math.round(v.ay * 10) / 10 }); E.sel = { kind: 'note', id: n.id }; return ''; }, true);
          return;
        }
        if (dr.kind === 'wend') {
          E.preview = null; E.hover = null;
          if (!dr.moved) { E.sel = { kind: 'wire', id: dr.id }; refresh(); return; }
          const p = lastEv && svgPt(lastEv);
          moveWireEnd(dr.id, dr.side, p && endAt(p));
          return;
        }
        if (dr.kind === 'band') {
          if (!dr.moved || !band) { if (E.sel || E.myForm || E.newForm) { setSel([]); refresh(); } else drawCanvas(); return; }
          const hit = E.P.devs.filter((d) => { const g = C.devGeo(d); return g.x < band.x + band.w && band.x < g.x + g.w && g.y < band.y + band.h && band.y < g.y + g.h; }).map((d) => d.id);
          const ids = dr.shift ? [...new Set(selIds().concat(hit))] : hit;
          setSel(ids);
          refresh();
          return;
        }
        if (dr.kind === 'group') {
          if (!dr.moved) { setSel([dr.id]); refresh(); return; }
          if (gh && gh.ok) commit(() => { const r = C.placeBlock(E.P, gh.row, gh.raw, dr.ids); if (!r) return 'Здесь не помещается.'; E.sel = { kind: 'devs', ids: dr.ids.slice() }; return ''; });
          else { if (gh) flash('Здесь не помещается: на рейке не хватает места.'); drawCanvas(); }
          return;
        }
        if (dr.kind === 'new') {
          if (!dr.moved) { addDevice(dr.sid); return; }
          if (gh && gh.ok) addDevice(dr.sid, { row: gh.row, x: gh.raw }); else { if (gh) flash('Здесь не помещается: на рейке не хватает места.'); drawCanvas(); }
          return;
        }
        if (dr.kind === 'move') {
          if (!dr.moved) { E.sel = { kind: 'dev', id: dr.id }; E.myForm = false; E.newForm = false; refresh(); return; }
          if (gh && gh.ok) commit(() => { const d = E.P.devs.find((x) => x.id === dr.id); const r = C.placeInsert(E.P, gh.row, gh.raw, d.w, d.id); if (!r) return 'Здесь не помещается.'; d.row = gh.row; d.x = r.x; E.sel = { kind: 'dev', id: d.id }; return ''; });
          else { if (gh) flash('Здесь не помещается: на рейке не хватает места.'); drawCanvas(); }
          return;
        }
        if (dr.kind === 'bus') {
          if (!dr.moved) { E.sel = { kind: 'bus', id: dr.id }; E.myForm = false; E.newForm = false; refresh(); return; }
          if (bg && bg.ok) commit(() => { const b = E.P.buses.find((x) => x.id === dr.id); b.zone = bg.zone; b.x = bg.x; E.sel = { kind: 'bus', id: b.id }; return ''; });
          else { flash('Здесь шина не помещается или наезжает на соседнюю.'); drawCanvas(); }
          return;
        }
        if (dr.kind === 'seg') {
          const w = E.P.wires.find((x) => x.id === dr.id);
          if (!w) return;
          if (!dr.moved) { E.sel = { kind: 'wire', id: dr.id }; E.myForm = false; E.newForm = false; refresh(); return; }
          const v = dr.seg !== 'v' ? w.dy : w.dx;
          if (dr.seg !== 'v') w.dy = dr.v0; else w.dx = dr.v0;
          commit(() => { if (dr.seg !== 'v') w.dy = Math.round((v || 0) * 10) / 10; else w.dx = Math.round(v * 10) / 10; E.sel = { kind: 'wire', id: w.id }; return ''; }, true);
        }
      };
      const startDrag = (dr, ev) => { E.drag = Object.assign(dr, { cx: ev.clientX, cy: ev.clientY, moved: false, light: (E.drawMs || 0) > 9 }); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onCancel); };

      root.addEventListener('pointerdown', (ev) => {
        if (ev.button !== 0 || E.drag) return;
        const card = ev.target.closest('.ed-card[data-sid]');
        if (card && ev.target.closest('.ed-myb')) return;
        if (card) {
          const s = LB().byId(card.dataset.sid);
          if (!s) return;
          ev.preventDefault();
          const dev = LB().make(s.id);
          startDrag({ kind: 'new', sid: s.id, dev, w: dev.w, grab: dev.w / 2, title: s.series }, ev);
          return;
        }
        if (!ev.target.closest('.ed-ctx')) closeCtx();
        const cv = ev.target.closest('[data-canvas]');
        if (!cv || !ev.target.closest('svg')) return;
        if (E.tool === 'ruler') { ev.preventDefault(); const p0 = svgPt(ev), e0 = p0 && endAt(p0), q0 = e0 && !e0.full ? K().endInfo(E.P, e0) : null; startDrag({ kind: 'ruler', p0: q0 ? { x: q0.x, y: q0.y } : p0, light: true }, ev); return; }
        const nt = ev.target.closest('[data-note],[data-nanchor]');
        if (nt) { ev.preventDefault(); const id = nt.dataset.note || nt.dataset.nanchor; const n = (E.P.notes || []).find((x) => x.id === id); if (!n) return; startDrag({ kind: 'note', id, mode: nt.dataset.note ? 'box' : 'anchor', p0: svgPt(ev), v0: { x: n.x, y: n.y, ax: n.ax, ay: n.ay } }, ev); E.drag.light = false; return; }
        if (E.tool === 'note') {
          ev.preventDefault();
          const p0 = svgPt(ev);
          if (!p0) return;
          commit(() => { E.P.notes = E.P.notes || []; const n = { id: uid('n'), ax: Math.round(p0.x * 10) / 10, ay: Math.round(p0.y * 10) / 10, x: Math.round(p0.x + 16), y: Math.round(p0.y - 30), text: 'Выноска: напиши текст справа' }; E.P.notes.push(n); E.sel = { kind: 'note', id: n.id }; return ''; });
          E.tool = 'select'; root.querySelectorAll('[data-tool]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.tool === 'select')));
          const ta = root.querySelector('[data-nf="text"]'); if (ta) { ta.focus(); ta.select(); }
          return;
        }
        if (E.tool === 'erase') {
          ev.preventDefault();
          const hit = hitAt(ev.target);
          if (hit && hit.kind !== 'empty') { E.sel = hit; delSel(); }
          return;
        }
        const term = ev.target.closest('[data-tdev],[data-tbus],[data-feed],[data-core]');
        if (term) { ev.preventDefault(); const en = endFromEl(term); if (en) wireClick(en); return; }
        if (E.wireStart) { E.wireStart = null; drawCanvas(); return; }
        const we = ev.target.closest('[data-wend]');
        if (we) {
          ev.preventDefault();
          const w = E.P.wires.find((x) => x.id === we.dataset.wire);
          if (!w) return;
          startDrag({ kind: 'wend', id: w.id, side: we.dataset.wend }, ev);
          return;
        }
        const seg = ev.target.closest('[data-seg]');
        if (seg) {
          ev.preventDefault();
          const w = E.P.wires.find((x) => x.id === seg.dataset.wire);
          if (!w) return;
          const p = svgPt(ev);
          const x1 = Number(seg.getAttribute('x1'));
          startDrag({ kind: 'seg', id: w.id, seg: seg.dataset.seg, p0: p, v0: seg.dataset.seg !== 'v' ? (w.dy || 0) : (w.dx || 0), left: x1 < K().W(E.P) / 2, sgn: K().exitDir(E.P, w.a) }, ev);
          return;
        }
        const dv = ev.target.closest('[data-dev]');
        if (dv) {
          ev.preventDefault();
          const d = E.P.devs.find((x) => x.id === dv.dataset.dev);
          if (!d) return;
          const p = svgPt(ev);
          const ids = selIds();
          if (ev.shiftKey) { setSel(ids.includes(d.id) ? ids.filter((x) => x !== d.id) : ids.concat([d.id])); refresh(); return; }
          if (ids.length > 1 && ids.includes(d.id)) {
            const ds = ids.map((id) => E.P.devs.find((x) => x.id === id)).filter(Boolean);
            if (new Set(ds.map((x) => x.row)).size === 1) {
              const x0 = Math.min(...ds.map((x) => x.x)), span = Math.max(...ds.map((x) => x.x + x.w)) - x0;
              startDrag({ kind: 'group', id: d.id, ids: ds.map((x) => x.id), w: span, grab: p ? Math.max(0, Math.min(span, (p.x - K().G.SD) / K().G.MOD - x0)) : span / 2 }, ev);
              return;
            }
            flash('Вместе переносятся только аппараты одной рейки — переношу один.', 'note');
          }
          const g = K().devGeo(d);
          startDrag({ kind: 'move', id: d.id, w: d.w, grab: p ? Math.max(0, Math.min(d.w, (p.x - g.x) / K().G.MOD)) : d.w / 2 }, ev);
          return;
        }
        const bs = ev.target.closest('[data-bus]');
        if (bs) {
          ev.preventDefault();
          const b = E.P.buses.find((x) => x.id === bs.dataset.bus);
          if (!b) return;
          const p = svgPt(ev);
          startDrag({ kind: 'bus', id: b.id, grab: p ? p.x - K().G.SD - b.x : 0 }, ev);
          return;
        }
        const lg = ev.target.closest('[data-lineg]');
        if (lg) { E.sel = { kind: 'line', id: lg.dataset.lineg }; E.myForm = false; E.newForm = false; refresh(); return; }
        const cb = ev.target.closest('[data-comb]');
        if (cb) { E.sel = { kind: 'comb', id: cb.dataset.comb }; E.myForm = false; E.newForm = false; refresh(); return; }
        /* пустое место: рамка выделения; щелчок без движения снимает выделение */
        ev.preventDefault();
        startDrag({ kind: 'band', p0: svgPt(ev), shift: ev.shiftKey }, ev);
      });

      /* что под указателем: аппарат (и по его клемме), провод, шина, гребёнка, линия или пустое место */
      const hitAt = (t) => {
        const q = (sel) => t.closest(sel);
        if (q('[data-dev]')) return { kind: 'dev', id: q('[data-dev]').dataset.dev };
        if (q('[data-tdev]')) return { kind: 'dev', id: q('[data-tdev]').dataset.tdev };
        if (q('[data-wire]')) return { kind: 'wire', id: q('[data-wire]').dataset.wire };
        if (q('[data-bus]')) return { kind: 'bus', id: q('[data-bus]').dataset.bus };
        if (q('[data-tbus]')) return { kind: 'bus', id: q('[data-tbus]').dataset.tbus };
        if (q('[data-comb]')) return { kind: 'comb', id: q('[data-comb]').dataset.comb };
        if (q('[data-lineg]')) return { kind: 'line', id: q('[data-lineg]').dataset.lineg };
        if (q('[data-note]')) return { kind: 'note', id: q('[data-note]').dataset.note };
        if (q('[data-nanchor]')) return { kind: 'note', id: q('[data-nanchor]').dataset.nanchor };
        if (q('[data-line]')) return { kind: 'line', id: q('[data-line]').dataset.line };
        return { kind: 'empty' };
      };
      root.addEventListener('contextmenu', (ev) => {
        const cv = ev.target.closest && ev.target.closest('[data-canvas]');
        if (!cv || !ev.target.closest('svg') || E.drag) return;
        ev.preventDefault();
        E.wireStart = null;
        const h = hitAt(ev.target);
        if (h.kind === 'dev') { if (!selIds().includes(h.id)) setSel([h.id]); }
        else if (h.kind !== 'empty') { E.sel = { kind: h.kind, id: h.id }; E.myForm = false; E.newForm = false; }
        refresh();
        showCtx(ev.clientX, ev.clientY, h.kind);
      });
      root.addEventListener('scroll', closeCtx, true);

      /* провод тянется за указателем */
      root.addEventListener('pointermove', (ev) => {
        if (!E.wireStart || E.drag) return;
        const ln = root.querySelector('[data-canvas] svg [data-prev]');
        const p = svgPt(ev);
        if (!ln || !p) return;
        const a = K().endInfo(E.P, E.wireStart);
        if (!a) return;
        ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y); ln.setAttribute('x2', p.x); ln.setAttribute('y2', p.y); ln.style.opacity = 1;
        /* под указателем клемма — сразу видно, можно ли соединить */
        const e = endAt(p), key = e && !e.full ? K().keyOf(e) + (e.slot != null ? ':' + e.slot : '') : '';
        if (key === E.hoverKey) return;
        E.hoverKey = key;
        let err = '';
        if (e && e.full) err = 'На шине нет свободных отверстий';
        else if (e && K().keyOf(e) !== K().keyOf(E.wireStart)) err = K().canWire(E.P, { a: E.wireStart, b: e });
        ln.style.stroke = !e || (!err && K().keyOf(e) === K().keyOf(E.wireStart)) ? 'var(--accent)' : err ? 'var(--danger)' : 'var(--success)';
        E.hover = e && K().keyOf(e) !== K().keyOf(E.wireStart) ? (err || 'Можно соединить — нажми') : null;
        status();
      });
      /* масштаб: Ctrl + колесо вокруг указателя */
      root.addEventListener('wheel', (ev) => {
        const cv = ev.target.closest && ev.target.closest('[data-canvas]');
        if (!cv || !(ev.ctrlKey || ev.metaKey)) return;
        ev.preventDefault();
        const rect = cv.getBoundingClientRect();
        const ox = ev.clientX - rect.left, oy = ev.clientY - rect.top;
        const px = ox + cv.scrollLeft, py = oy + cv.scrollTop;
        const z0 = E.zoom || 1;
        const z1 = Math.max(0.6, Math.min(8, z0 * (ev.deltaY < 0 ? 1.15 : 1 / 1.15)));
        E.zoom = z1;
        drawCanvas();
        cv.scrollLeft = px * z1 / z0 - ox; cv.scrollTop = py * z1 / z0 - oy;
      }, { passive: false });

      const onKey = (ev) => {
        if (!document.body.contains(root)) { window.removeEventListener('keydown', onKey); return; }
        if (ev.target.closest && ev.target.closest('input,select,textarea')) return;
        if (E.tab !== 'panel') return;
        const mod = ev.ctrlKey || ev.metaKey;
        const k = ev.key;
        const o = findSel();
        if (mod && (k === 'z' || k === 'я' || k === 'Z' || k === 'Я') && !ev.shiftKey) { ev.preventDefault(); undo(); }
        else if (mod && (k === 'y' || k === 'н' || ((k === 'z' || k === 'Z' || k === 'я' || k === 'Я') && ev.shiftKey))) { ev.preventDefault(); redo(); }
        else if (mod && (k === 'd' || k === 'в') && o && E.sel.kind === 'dev') { ev.preventDefault(); addDevice(o.sid, { row: o.row, x: o.x + o.w }, { poles: o.poles, In: o.In, curve: o.curve, ma: o.ma, rt: o.rt, w: o.w }); }
        else if ((k === 'Delete' || k === 'Backspace') && o) { ev.preventDefault(); delSel(); }
        else if (k === 'Escape') { closeCtx(); if (E.tool === 'erase') { E.tool = 'select'; root.querySelectorAll('[data-tool]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.tool === 'select'))); drawCanvas(); return; } if (!E.wireStart && !E.drag && E.sel) { setSel([]); refresh(); return; } E.wireStart = null; E.tool = 'select'; root.querySelectorAll('[data-tool]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.tool === 'select'))); if (E.drag) onCancel(); drawCanvas(); }
        else if (mod && ['c', 'C', 'с', 'С'].includes(k)) { ev.preventDefault(); copySel(false); }
        else if (mod && ['x', 'X', 'ч', 'Ч'].includes(k)) { ev.preventDefault(); copySel(true); }
        else if (mod && ['v', 'V', 'м', 'М'].includes(k)) { ev.preventDefault(); paste(); }
        else if (mod && (k === 'a' || k === 'ф' || k === 'A' || k === 'Ф')) { ev.preventDefault(); setSel(E.P.devs.map((d) => d.id)); refresh(); }
        else if (o && E.sel.kind === 'devs' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k)) { ev.preventDefault(); moveGroup(selIds(), { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D' }[k]); }
        else if (o && E.sel.kind === 'dev' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k)) { ev.preventDefault(); moveDev(o, { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D' }[k]); }
        else if (o && E.sel.kind === 'bus' && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k)) { ev.preventDefault(); moveBus(o, { ArrowLeft: '-8', ArrowRight: '8', ArrowUp: 'top', ArrowDown: 'bottom' }[k]); }
      };
      window.addEventListener('keydown', onKey);
    }
  });
})();
