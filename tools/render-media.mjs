// Картинки для колоды Anki: рисунки уроков, аппараты, условные обозначения, графики и фото щитов с отметками.
// Рисует их сам браузер (Chrome без окна) в светлой теме приложения и сохраняет в anki/media/*.webp
// со списком anki/media/index.json. Запуск: node tools/render-media.mjs   (нужен Google Chrome)
// После изменения рисунков — запустить снова, затем export-cards и build_anki.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'anki', 'media');
const CHROME = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => p && fs.existsSync(p));
if (!CHROME) { console.log('Не найден Chrome (можно указать путь в переменной CHROME)'); process.exit(2); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// статический сервер на свободном порту
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/index.html`;

const port = 9300 + Math.floor(Math.random() * 600);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shk-media-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${tmp}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
let list = null;
for (let i = 0; i < 60 && !list; i++) { try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch { await sleep(200); } }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
const errors = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); if (m.error) p.rej(new Error(m.error.message)); else p.res(m.result); return; }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
});
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const run = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };

await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 900, height: 1200, deviceScaleFactor: 2, mobile: false });
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
await send('Page.navigate', { url: base });
for (let i = 0; i < 50; i++) { await sleep(200); if (await run('!!(window.SHK && SHK.ill && SHK.devCard && SHK.photos)')) break; }

// список картинок строится в странице из тех же данных, что показывает приложение
const jobs = await run(`(() => {
  const S = SHK, V = S.svg, J = [];
  document.documentElement.setAttribute('data-theme', 'light');
  Object.keys(S.ill).filter((k) => k !== 'water' && k !== 'body').forEach((k) => J.push({ name: 'shk-ill-' + k, kind: 'ill', key: k, width: 600, html: '<figure class="ill" style="margin:0">' + S.ill[k]() + '</figure>' }));
  // системы заземления без подписи с ответом — для карточек «какая это система»
  ['tnc', 'tns', 'tncs', 'tt', 'it'].forEach((k) => J.push({ name: 'shk-sys-' + k, kind: 'sys', key: k, width: 600, strip: true, html: '<figure class="ill" style="margin:0">' + S.ill[k]() + '</figure>' }));
  S.devices.filter((d) => d.face).forEach((d) => J.push({ name: 'shk-dev-' + d.id, kind: 'dev', key: d.id, width: 0, fit: 2.2, html: S.devCard(d.face) }));
  S.SYMS.forEach(([n, f], i) => J.push({ name: 'shk-sym-' + String(i + 1).padStart(2, '0'), kind: 'sym', key: n, width: 0, fit: 2.2, html: V.svg(160, 110, f(80), { width: 200, label: n }) }));
  const cap = (t) => '<p style="font:14px/1.4 system-ui,sans-serif;margin:8px 0 0;color:#59636e">' + t + '</p>';
  ['B', 'C', 'D'].forEach((k) => J.push({ name: 'shk-curve-' + k, kind: 'graph', key: 'curve-' + k, width: 560, noMark: true, html: S.graph.mcbSVG(k) + cap('Характеристика ' + k + ' по ГОСТ IEC 60898-1. Правее и выше сплошной линии автомат уже отключился; левее и ниже пунктира — ещё не отключился; между ними — разброс отдельных экземпляров.') }));
  J.push({ name: 'shk-rcd-types', kind: 'graph', key: 'rcd-types', width: 600, html: S.graph.rcdTypes() });
  S.photos.forEach((p) => p.pins.forEach((pin, i) => {
    const w = p.w > p.h ? 640 : 480, r = Math.round(Math.min(p.w, p.h) * 0.06);
    J.push({ name: 'shk-photo-' + p.id + '-' + (i + 1), kind: 'photo', key: p.id + '#' + i, width: w, html:
      '<div style="position:relative;line-height:0"><img src="' + p.src + '" style="width:100%;border-radius:6px">' +
      '<svg viewBox="0 0 ' + p.w + ' ' + p.h + '" style="position:absolute;inset:0;width:100%;height:100%">' +
      '<circle cx="' + pin.x + '" cy="' + pin.y + '" r="' + r + '" fill="none" stroke="#fff" stroke-width="' + Math.round(r * 0.42) + '"/>' +
      '<circle cx="' + pin.x + '" cy="' + pin.y + '" r="' + r + '" fill="none" stroke="#ff1f4b" stroke-width="' + Math.round(r * 0.22) + '"/></svg></div>' });
  }));
  document.body.innerHTML = '<div id="mstage" style="display:inline-block;padding:14px;background:#fff;color:#1f2328"></div>';
  document.body.style.background = '#fff';
  return J;
})()`);

fs.mkdirSync(OUT, { recursive: true });
const index = {};
for (const j of jobs) {
  const rect = await run(`(async () => {
    const st = document.getElementById('mstage');
    st.style.width = ${j.width ? `'${j.width + 28}px'` : "'auto'"};
    st.innerHTML = ${JSON.stringify(j.html)};
    await Promise.all([...st.querySelectorAll('img')].map((im) => im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; })));
    await document.fonts.ready;
    ${j.strip ? "st.querySelectorAll('text').forEach((e) => { if (/^\\s*(TN|TT|IT)\\b/.test(e.textContent)) e.remove(); });" : ''}
    ${j.noMark ?"st.querySelectorAll('[stroke=\"var(--danger)\"],[fill=\"var(--danger)\"]').forEach((e) => e.remove());" : ''}
    ${j.fit ? `const sv = st.querySelector('svg'), bb = sv.getBBox(), m = 6;
    sv.setAttribute('viewBox', (bb.x - m) + ' ' + (bb.y - m) + ' ' + (bb.width + 2 * m) + ' ' + (bb.height + 2 * m));
    sv.setAttribute('width', Math.round((bb.width + 2 * m) * ${j.fit})); sv.setAttribute('height', Math.round((bb.height + 2 * m) * ${j.fit}));
    sv.style.maxWidth = 'none';` : ''}
    const b = st.getBoundingClientRect();
    return { x: b.x, y: b.y, w: Math.ceil(b.width), h: Math.ceil(b.height) };
  })()`);
  const shot = await send('Page.captureScreenshot', { format: 'webp', quality: 88, clip: { x: rect.x, y: rect.y, width: rect.w, height: rect.h, scale: 1 }, captureBeyondViewport: true });
  fs.writeFileSync(path.join(OUT, j.name + '.webp'), Buffer.from(shot.data, 'base64'));
  index[j.name + '.webp'] = { kind: j.kind, key: j.key, w: rect.w, h: rect.h };
}
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 1));
const kb = Object.keys(index).reduce((a, f) => a + fs.statSync(path.join(OUT, f)).size, 0) / 1024;
console.log(`Картинок: ${jobs.length}, ${Math.round(kb)} КБ → anki/media/`);
if (errors.length) console.log('Ошибки страницы:\n' + errors.join('\n'));
ws.close(); proc.kill(); server.close();
setTimeout(() => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ } process.exit(0); }, 500);
