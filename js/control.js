/* Школа щитовика — тренажёр схем управления: нажимай кнопки, смотри, где течёт ток */
(function () {
  'use strict';
  const S = window.SHK;
  const V = S.svg;
  const M = V.mono;
  const LIVE = 'var(--bad)', DEAD = 'var(--ink-3)';

  /* ---------- модель цепи «лестницей»: ступень = последовательность элементов от L к N ---------- */
  const conducts = (el, st) => {
    switch (el.t) {
      case 'no': return el.btn ? !!st.btn[el.v] : !!st.coil[el.v];
      case 'nc': return el.btn ? !st.btn[el.v] : el.v === 'kk' ? !st.kk : !st.coil[el.v];
      case 'par': return el.br.some((b) => b.every((e) => conducts(e, st)));
      case 'tm': return !!st.timer[el.v];
      default: return true;
    }
  };
  const settle = (sc, st) => {
    for (let i = 0; i < 8; i++) {
      let changed = false;
      sc.rungs.forEach((r) => {
        const coil = r.els[r.els.length - 1];
        const on = !!st.power && r.els.slice(0, -1).every((e) => conducts(e, st)) && (r.need ? r.need(st) : true);
        if (coil.t === 'coil' && !!st.coil[coil.v] !== on) { st.coil[coil.v] = on; changed = true; }
        if (coil.t === 'imp') {
          if (on && !st.edge[coil.v]) { st.latch[coil.v] = !st.latch[coil.v]; changed = true; }
          st.edge[coil.v] = on;
          st.coil[coil.v] = !!st.latch[coil.v];
        }
        if (coil.t === 'lamp') st.lamp[coil.v] = on;
      });
      if (!changed) break;
    }
  };
  /* ---------- рисование ступени ---------- */
  const EW = { no: 54, nc: 54, coil: 56, imp: 56, lamp: 44, tm: 54 };
  const widthOf = (els) => els.reduce((a, e) => a + (e.t === 'par' ? Math.max(...e.br.map(widthOf)) : EW[e.t] || 50), 0);
  function drawSeries(els, x, y, live, st, g, hot) {
    els.forEach((e) => {
      if (e.t === 'par') {
        const w = Math.max(...e.br.map(widthOf));
        let anyOut = false;
        e.br.forEach((b, k) => {
          const yy = y + k * 54;
          if (k > 0) { g.push(V.ln(x, y, x, yy, { s: live ? LIVE : DEAD, w: 2 })); }
          const out = drawSeries(b, x, yy, live, st, g, hot);
          const bw = widthOf(b);
          if (bw < w) g.push(V.ln(x + bw, yy, x + w, yy, { s: out ? LIVE : DEAD, w: 2 }));
          if (k > 0) g.push(V.ln(x + w, yy, x + w, y, { s: out ? LIVE : DEAD, w: 2 }));
          anyOut = anyOut || out;
        });
        x += w;
        live = live && anyOut;
        return;
      }
      const w = EW[e.t] || 50;
      const c = conducts(e, st);
      const col = live ? LIVE : DEAD;
      const out = live && c;
      if (e.t === 'no' || e.t === 'nc' || e.t === 'tm') {
        const a = x + 14, b = x + w - 14;
        g.push(V.ln(x, y, a, y, { s: col, w: 2 }));
        g.push(V.ln(b, y, x + w, y, { s: out ? LIVE : DEAD, w: 2 }));
        if (c) g.push(V.ln(a, y, b, y - 2, { s: out ? LIVE : 'var(--ink)', w: 2.4 }));
        else g.push(V.ln(a, y, b - 2, y - 12, { s: 'var(--ink)', w: 2.4 }));
        if (e.t === 'nc') g.push(V.ln(b, y, b, y - 11, { s: 'var(--ink)', w: 1.6 }));
        if (e.btn) {
          g.push(`<g class="hot" data-btn="${e.v}" role="button" tabindex="0" aria-label="${S.esc(e.name)}">` + V.rc(x + 4, y - 30, w - 8, 20, { s: 'var(--ink)', f: st.btn[e.v] ? 'var(--signal)' : 'var(--surface)', rx: 5, w: 1.4 }) + V.tx(x + w / 2, y - 16, S.esc(e.name), { a: 'middle', size: 9.5, wt: 700 }) + '</g>');
          g.push(V.ln(x + w / 2, y - 10, x + w / 2, y - 6, { s: 'var(--ink-3)', w: 1, d: '2 2' }));
        }
        g.push(V.tx(x + w / 2, y + 16, S.esc(e.label), { a: 'middle', size: 9, fam: M, f: 'var(--ink-2)' }));
      } else if (e.t === 'coil' || e.t === 'imp') {
        const on = !!st.coil[e.v];
        g.push(V.ln(x, y, x + 8, y, { s: col, w: 2 }));
        g.push(V.rc(x + 8, y - 11, w - 16, 22, { s: 'var(--ink)', f: on ? 'var(--signal)' : 'var(--surface)', rx: 3, w: 1.6 }));
        g.push(V.tx(x + w / 2, y + 4, S.esc(e.label), { a: 'middle', size: 9.5, fam: M, wt: 700 }));
        g.push(V.ln(x + w - 8, y, x + w, y, { s: out ? LIVE : DEAD, w: 2 }));
        g.push(V.tx(x + w / 2, y + 24, e.t === 'imp' ? 'имп. реле' : 'катушка', { a: 'middle', size: 8, f: 'var(--ink-3)' }));
      } else if (e.t === 'lamp') {
        const on = !!st.lamp[e.v];
        g.push(V.ln(x, y, x + 10, y, { s: col, w: 2 }));
        g.push(V.ci(x + w / 2, y, 11, { s: 'var(--ink)', f: on ? 'var(--signal)' : 'var(--surface)', w: 1.6 }));
        g.push(V.ln(x + w / 2 - 7, y - 7, x + w / 2 + 7, y + 7, { s: 'var(--ink)', w: 1.2 }));
        g.push(V.ln(x + w / 2 - 7, y + 7, x + w / 2 + 7, y - 7, { s: 'var(--ink)', w: 1.2 }));
        g.push(V.ln(x + w - 10, y, x + w, y, { s: out ? LIVE : DEAD, w: 2 }));
        g.push(V.tx(x + w / 2, y + 24, S.esc(e.label), { a: 'middle', size: 9, fam: M, f: 'var(--ink-2)' }));
      }
      x += w;
      live = out;
    });
    g.__x = x;
    return live;
  }
  function drawLadder(sc, st, x0, y0) {
    const g = [];
    const xL = x0, xN = x0 + 360;
    let y = y0;
    const H = sc.rungs.map((r) => 50 + r.els.reduce((a, e) => Math.max(a, e.t === 'par' ? (e.br.length - 1) * 54 : 0), 0));
    const total = H.reduce((a, b) => a + b, 0) + 10;
    g.push(V.ln(xL, y0 - 30, xL, y0 + total, { s: st.power ? LIVE : DEAD, w: 3 }));
    g.push(V.ln(xN, y0 - 30, xN, y0 + total, { s: 'var(--w-n)', w: 3 }));
    g.push(V.tx(xL, y0 - 36, sc.ctrlL || 'L', { a: 'middle', size: 11, fam: M, wt: 700 }));
    g.push(V.tx(xN, y0 - 36, 'N', { a: 'middle', size: 11, fam: M, wt: 700, f: 'var(--w-n)' }));
    sc.rungs.forEach((r, i) => {
      const yy = y + 30;
      const live = drawSeries(r.els, xL, yy, !!st.power && (r.need ? r.need(st) : true), st, g);
      const xe = xL + widthOf(r.els);
      g.push(V.ln(xe, yy, xN, yy, { s: live ? LIVE : DEAD, w: 2 }));
      if (r.note) g.push(V.tx(xN - 4, yy - 8, S.esc(r.note), { a: 'end', size: 8.5, f: 'var(--ink-3)' }));
      y += H[i];
    });
    return { svg: g.join(''), h: total };
  }

  /* ---------- силовые картинки ---------- */
  const motorPic = (x, y, on, dir) => {
    let s = V.ci(x, y, 26, { s: 'var(--ink)', f: on ? 'var(--signal-soft)' : 'var(--surface)', w: 2 }) + V.tx(x, y + 6, 'M', { a: 'middle', size: 18, wt: 700 }) + V.tx(x, y + 44, '3~', { a: 'middle', size: 10, fam: M });
    if (on) s += `<g><path d="M${x - 18} ${y - 30} A22 22 0 0 1 ${x + 18} ${y - 30}" style="fill:none;stroke:var(--ok);stroke-width:2.5"/><polygon points="${dir < 0 ? `${x - 18},${y - 30} ${x - 10},${y - 34} ${x - 13},${y - 25}` : `${x + 18},${y - 30} ${x + 10},${y - 34} ${x + 13},${y - 25}`}" style="fill:var(--ok)"/></g>` + V.tx(x, y - 40, dir < 0 ? 'назад' : 'вперёд', { a: 'middle', size: 10, f: 'var(--ok)', wt: 700 });
    return s;
  };
  const contactRow = (x, y, closed, label) => {
    let s = '';
    [0, 1, 2].forEach((k) => { const xx = x + k * 22; s += V.ln(xx, y, xx, y + 10, { w: 1.6 }) + (closed ? V.ln(xx, y + 10, xx, y + 26, { w: 2.2 }) : V.ln(xx, y + 10, xx - 8, y + 24, { w: 2.2 })) + V.ln(xx, y + 26, xx, y + 36, { w: 1.6 }); });
    return s + V.ln(x - 10, y + 18, x + 54, y + 18, { s: 'var(--ink-3)', w: 1, d: '3 3' }) + V.tx(x + 62, y + 22, label, { size: 10, fam: M, wt: 700 });
  };

  /* ---------- схемы ---------- */
  const SCHEMES = {
    motor: {
      title: 'Пуск двигателя с самоподхватом',
      buttons: [['start', 'ПУСК (держи)', 'momentary'], ['stop', 'СТОП (держи)', 'momentary'], ['kk', 'Перегрузка (тепловое реле)', 'toggle'], ['power', 'Питание цепи управления', 'toggle']],
      init: () => ({ power: true, btn: {}, coil: {}, lamp: {}, latch: {}, edge: {}, timer: {}, kk: false }),
      rungs: [
        { els: [{ t: 'nc', v: 'stop', btn: true, name: 'СТОП', label: 'SB1' }, { t: 'par', br: [[{ t: 'no', v: 'start', btn: true, name: 'ПУСК', label: 'SB2' }], [{ t: 'no', v: 'KM1', label: 'KM1 13-14' }]] }, { t: 'nc', v: 'kk', label: 'KK 95-96' }, { t: 'coil', v: 'KM1', label: 'KM1' }] },
        { els: [{ t: 'no', v: 'KM1', label: 'KM1 23-24' }, { t: 'lamp', v: 'HL1', label: 'HL1 «Работа»' }], note: '' }
      ],
      power: (st) => motorPic(90, 150, !!st.coil.KM1 && !st.kk, 1) + contactRow(68, 40, !!st.coil.KM1, 'KM1') + V.tx(60, 22, 'L1 L2 L3', { size: 10, fam: M }),
      explain: (st) => st.kk ? 'Тепловое реле сработало: его контакт 95–96 разомкнул цепь катушки, двигатель остановился. Сними «перегрузку», чтобы снова запустить.' : st.coil.KM1 ? 'Катушка KM1 под напряжением. Её контакт 13–14 замкнут и шунтирует кнопку ПУСК — это самоподхват. Отпусти ПУСК — двигатель продолжит работать.' : 'Двигатель стоит. Нажми и удерживай ПУСК: ток пройдёт через СТОП → ПУСК → тепловое реле → катушку KM1.'
    },
    reverse: {
      title: 'Реверс с электрической блокировкой',
      buttons: [['fwd', 'ВПЕРЁД (держи)', 'momentary'], ['rev', 'НАЗАД (держи)', 'momentary'], ['stop', 'СТОП (держи)', 'momentary'], ['kk', 'Перегрузка', 'toggle']],
      init: () => ({ power: true, btn: {}, coil: {}, lamp: {}, latch: {}, edge: {}, timer: {}, kk: false }),
      rungs: [
        { els: [{ t: 'nc', v: 'stop', btn: true, name: 'СТОП', label: 'SB1' }, { t: 'nc', v: 'kk', label: 'KK' }, { t: 'par', br: [[{ t: 'no', v: 'fwd', btn: true, name: 'ВПЕРЁД', label: 'SB2' }], [{ t: 'no', v: 'KM1', label: 'KM1' }]] }, { t: 'nc', v: 'KM2', label: 'KM2 НЗ' }, { t: 'coil', v: 'KM1', label: 'KM1' }] },
        { els: [{ t: 'nc', v: 'stop', btn: true, name: 'СТОП', label: 'SB1' }, { t: 'nc', v: 'kk', label: 'KK' }, { t: 'par', br: [[{ t: 'no', v: 'rev', btn: true, name: 'НАЗАД', label: 'SB3' }], [{ t: 'no', v: 'KM2', label: 'KM2' }]] }, { t: 'nc', v: 'KM1', label: 'KM1 НЗ' }, { t: 'coil', v: 'KM2', label: 'KM2' }] }
      ],
      power: (st) => { const on1 = !!st.coil.KM1 && !st.kk, on2 = !!st.coil.KM2 && !st.kk; return motorPic(90, 170, on1 || on2, on2 ? -1 : 1) + contactRow(20, 40, !!st.coil.KM1, 'KM1') + contactRow(20, 92, !!st.coil.KM2, 'KM2 (L1↔L3)') + V.tx(20, 22, 'L1 L2 L3', { size: 10, fam: M }); },
      explain: (st) => st.coil.KM1 ? 'Включён KM1 («вперёд»). Его НЗ-контакт в цепи KM2 разомкнут: кнопка НАЗАД сейчас ничего не сделает — это блокировка от межфазного КЗ.' : st.coil.KM2 ? 'Включён KM2 («назад»): фазы L1 и L3 поменялись местами, двигатель крутится в другую сторону. KM1 заблокирован.' : 'Оба контактора выключены. Нажми ВПЕРЁД или НАЗАД. Сменить направление можно только через СТОП.'
    },
    impulse: {
      title: 'Импульсное реле: свет из трёх мест',
      buttons: [['b1', 'Кнопка у входа', 'momentary'], ['b2', 'Кнопка в середине', 'momentary'], ['b3', 'Кнопка в конце', 'momentary']],
      init: () => ({ power: true, btn: {}, coil: {}, lamp: {}, latch: {}, edge: {}, timer: {} }),
      rungs: [
        { els: [{ t: 'par', br: [[{ t: 'no', v: 'b1', btn: true, name: 'SB1', label: 'у входа' }], [{ t: 'no', v: 'b2', btn: true, name: 'SB2', label: 'середина' }], [{ t: 'no', v: 'b3', btn: true, name: 'SB3', label: 'конец' }]] }, { t: 'imp', v: 'KL1', label: 'KL1' }] },
        { els: [{ t: 'no', v: 'KL1', label: 'KL1 11-14' }, { t: 'lamp', v: 'EL', label: 'EL1…EL6' }] }
      ],
      power: (st) => [0, 1, 2, 3, 4].map((i) => V.ci(40 + i * 34, 110, 12, { s: 'var(--ink)', f: st.coil.KL1 ? 'var(--signal)' : 'var(--surface-2)', w: 1.4 })).join('') + V.tx(110, 150, st.coil.KL1 ? 'коридор освещён' : 'темно', { a: 'middle', size: 11, wt: 700 }),
      explain: (st) => `Каждое нажатие любой кнопки даёт короткий импульс на катушку KL1, и реле меняет состояние: ${st.coil.KL1 ? 'сейчас контакт 11–14 замкнут — свет горит' : 'сейчас контакт разомкнут — свет не горит'}. Кнопок можно поставить сколько угодно — все параллельно.`
    },
    avr: {
      title: 'АВР: сеть и генератор',
      buttons: [['net', 'Сеть есть', 'toggle'], ['gen', 'Генератор работает', 'toggle']],
      init: () => ({ power: true, btn: { net: true, gen: false }, coil: {}, lamp: {}, latch: {}, edge: {}, timer: {} }),
      ctrlL: 'L',
      rungs: [
        { els: [{ t: 'no', v: 'net', btn: true, name: 'контроль сети', label: 'KV1' }, { t: 'nc', v: 'KM2', label: 'KM2 НЗ' }, { t: 'coil', v: 'KM1', label: 'KM1' }], note: 'ввод «Сеть»' },
        { els: [{ t: 'nc', v: 'net', btn: true, name: 'нет сети', label: 'KV1 НЗ' }, { t: 'no', v: 'gen', btn: true, name: 'генер.', label: 'KV2' }, { t: 'nc', v: 'KM1', label: 'KM1 НЗ' }, { t: 'coil', v: 'KM2', label: 'KM2' }], note: 'ввод «Генератор»' }
      ],
      power: (st) => {
        const net = !!st.btn.net, gen = !!st.btn.gen;
        const load = (st.coil.KM1 && net) || (st.coil.KM2 && gen);
        return V.rc(10, 30, 70, 30, { s: 'var(--ink)', f: net ? 'var(--ok-soft)' : 'var(--bad-soft)', rx: 5 }) + V.tx(45, 50, 'Сеть', { a: 'middle', size: 11, wt: 700 }) +
          V.rc(110, 30, 90, 30, { s: 'var(--ink)', f: gen ? 'var(--ok-soft)' : 'var(--surface-2)', rx: 5 }) + V.tx(155, 50, 'Генератор', { a: 'middle', size: 11, wt: 700 }) +
          contactRow(22, 70, !!st.coil.KM1, 'KM1').replace(/<text[^>]*>KM1<\/text>/, '') + V.tx(30, 122, 'KM1', { size: 10, fam: M, wt: 700 }) +
          contactRow(122, 70, !!st.coil.KM2, 'KM2').replace(/<text[^>]*>KM2<\/text>/, '') + V.tx(130, 122, 'KM2', { size: 10, fam: M, wt: 700 }) +
          V.rc(60, 150, 90, 34, { s: 'var(--ink)', f: load ? 'var(--signal)' : 'var(--surface-2)', rx: 6 }) + V.tx(105, 172, load ? 'дом запитан' : 'нет питания', { a: 'middle', size: 11, wt: 700 }) +
          (!net && !gen ? V.tx(105, 205, '→ сигнал «пуск генератора»', { a: 'middle', size: 10, f: 'var(--bad)', wt: 700 }) : '');
      },
      explain: (st) => st.btn.net ? 'Сеть в норме: реле контроля KV1 держит KM1 включённым, дом питается от сети. KM2 заблокирован НЗ-контактом KM1.' : st.btn.gen ? 'Сети нет, генератор вышел на режим: KM1 отключился, его НЗ-контакт разрешил включить KM2 — дом питается от генератора.' : 'Сети нет: KM1 отключился. АВР подаёт сигнал на запуск генератора. Включи «Генератор работает».'
    }
  };
  S.control = { SCHEMES };

  S.mountControl = function (el, id) {
    const sc = SCHEMES[id];
    if (!sc) return;
    let st = sc.init();
    const GOAL = { motor: ['KM1'], reverse: ['KM1', 'KM2'], impulse: ['KL1'], avr: ['KM2'] }[id] || [];
    const seenC = {};
    let touched = false, fired = false;
    const draw = () => {
      settle(sc, st);
      if (touched) Object.keys(st.coil).forEach((k) => { if (st.coil[k]) seenC[k] = true; });
      if (touched && !fired && GOAL.length && GOAL.every((k) => seenC[k])) { fired = true; S.bus.emit('ctl', id); }
      const lad = drawLadder(sc, st, 30, 290);
      const H = 290 + lad.h + 16;
      el.querySelector('.ctl-svg').innerHTML = V.svg(430, H, `<g transform="translate(110 6)">${sc.power(st)}</g>${V.tx(10, 16, 'Силовая часть', { size: 11, wt: 700, f: 'var(--ink-2)' })}${V.ln(10, 236, 420, 236, { s: 'var(--line)', w: 1 })}${V.tx(10, 254, 'Цепь управления', { size: 11, wt: 700, f: 'var(--ink-2)' })}${lad.svg}`, { label: sc.title, width: '100%', noH: true, style: 'min-width:400px' });
      el.querySelector('.ctl-exp').textContent = sc.explain(st);
      S.$$('[data-ctl]', el).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ctl === 'kk' ? !!st.kk : b.dataset.ctl === 'power' ? !!st.power : !!st.btn[b.dataset.ctl])));
    };
    el.innerHTML = `<div class="stack"><div class="svgbox" style="max-height:none"><div class="ctl-svg"></div></div><div class="chips">${sc.buttons.map(([k, label, mode]) => `<button type="button" class="chip" data-ctl="${k}" data-mode="${mode}" aria-pressed="false">${label}</button>`).join('')}<button type="button" class="chip" data-reset>Сброс</button></div><div class="box ex"><div class="lbl">${S.icon('info')}Что происходит</div><p class="ctl-exp"></p></div></div>`;
    const press = (k, down) => {
      touched = true;
      if (k === 'kk') { if (down) st.kk = !st.kk; }
      else if (k === 'power') { if (down) st.power = !st.power; }
      else st.btn[k] = down;
      draw();
    };
    el.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('[data-ctl]') || e.target.closest('[data-btn]');
      if (!b) return;
      const k = b.dataset.ctl || b.dataset.btn;
      const mode = b.dataset.mode || (sc.buttons.find((x) => x[0] === k) || [])[2] || 'momentary';
      if (mode === 'toggle') { if (k === 'kk' || k === 'power') press(k, true); else { touched = true; st.btn[k] = !st.btn[k]; draw(); } return; }
      e.preventDefault();
      press(k, true);
      const up = () => { press(k, false); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const b = e.target.closest('[data-btn]');
      if (!b) return;
      e.preventDefault();
      press(b.dataset.btn, true); setTimeout(() => press(b.dataset.btn, false), 250);
    });
    el.addEventListener('click', (e) => { if (e.target.closest('[data-reset]')) { st = sc.init(); draw(); } });
    draw();
  };
})();
