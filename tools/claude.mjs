#!/usr/bin/env node
// Инструменты Claude для разборов: читать заявки из приложения и сохранять ответы.
//
//   node tools/claude.mjs inbox                 — открытые заявки (issues с меткой razbor от владельца)
//   node tools/claude.mjs show <номер>          — заявка целиком; для щита — расчёт конструктора
//   node tools/claude.mjs decode <код|файл>      — расшифровать код SHK1… из чата
//   node tools/claude.mjs add  --title "…" --md файл.md [--type panel|question|progress|photo|bug|task]
//                              [--issue N] [--req rID] [--cfg щит.json] [--cfgname "…"] [--links '[["Урок","lesson.rcd"]]']
//                                                — добавить разбор в razbory/index.json
//   node tools/claude.mjs reply <номер> --md файл.md [--cfg …] [--cfgname …] [--links …]
//                                                — add + commit + push + ответ в issue + закрыть issue
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'Slowmeow/shkola-shchitovika';
const OWNER = 'Slowmeow';
const SITE = 'https://slowmeow.github.io/shkola-shchitovika/';
const INDEX = path.join(ROOT, 'razbory', 'index.json');
const require = createRequire(import.meta.url);

const sh = (cmd, args, opts) => execFileSync(cmd, args, Object.assign({ cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }, opts || {}));
const gh = (args) => sh('gh', args);
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : undefined; };

export function decode(text) {
  const m = String(text || '').replace(/\s+/g, '').match(/SHK1([zj])\.([A-Za-z0-9_-]+)/);
  if (!m) return null;
  let buf = Buffer.from(m[2], 'base64url');
  if (m[1] === 'z') buf = zlib.inflateRawSync(buf);
  return JSON.parse(buf.toString('utf8'));
}

function loadIndex() {
  try { return JSON.parse(fs.readFileSync(INDEX, 'utf8')); } catch { return { v: 1, updated: null, issues: {}, items: [] }; }
}
function saveIndex(ix) {
  ix.updated = new Date().toISOString();
  fs.mkdirSync(path.dirname(INDEX), { recursive: true });
  fs.writeFileSync(INDEX, JSON.stringify(ix, null, 1) + '\n');
}

function panelReport(cfg) {
  const S = require('./load-app.cjs')();
  const R = S.engine.build(cfg);
  return S.exportText(R);
}

function describe(p) {
  const out = [];
  out.push(`Тип: ${p.type} · «${p.title}» · ${p.at} · заявка ${p.id}`);
  if (p.who) out.push(`Ученик: ${p.who.nick}, уровень ${p.who.lvl} (${p.who.rank}), ${p.who.xp} XP`);
  if (p.text) out.push('Текст:\n' + p.text);
  const d = p.data || {};
  if (p.type === 'panel' && d.cfg) {
    out.push('Щит (сжатая конфигурация):\n' + JSON.stringify(d.cfg));
    try { out.push('\n--- Расчёт конструктора ---\n' + panelReport(d.cfg)); } catch (e) { out.push('Расчёт упал: ' + e.message); }
  } else if (Object.keys(d).length) out.push('Данные:\n' + JSON.stringify(d, null, 1));
  return out.join('\n');
}

async function main() {
  const cmd = argv[0];
  if (cmd === 'inbox') {
    const list = JSON.parse(gh(['issue', 'list', '--repo', REPO, '--state', 'open', '--limit', '50', '--json', 'number,title,author,createdAt,labels,body']));
    const mine = list.filter((i) => i.author && i.author.login === OWNER);
    const other = list.length - mine.length;
    if (!mine.length) console.log('Открытых заявок от ' + OWNER + ' нет.');
    for (const i of mine) {
      const p = decode(i.body);
      const imgs = (i.body.match(/https:\/\/[^\s)"']+\.(?:png|jpe?g|webp|gif)|https:\/\/github\.com\/user-attachments\/assets\/[\w-]+/gi) || []);
      console.log(`#${i.number} · ${i.createdAt} · ${i.title}${p ? ` · ${p.type} · ${p.id}` : ' · (без кода — читай текст)'}${imgs.length ? ` · фото: ${imgs.length}` : ''}`);
    }
    if (other) console.log(`\n(${other} заявок от других людей — их не разбираем)`);
    return;
  }
  if (cmd === 'show') {
    const n = argv[1];
    const i = JSON.parse(gh(['issue', 'view', n, '--repo', REPO, '--json', 'number,title,author,body,createdAt,comments,state']));
    if (!i.author || i.author.login !== OWNER) { console.log(`#${n} создал не ${OWNER} — не разбираем.`); return; }
    console.log(`#${i.number} ${i.title} [${i.state}]\n`);
    const p = decode(i.body);
    console.log(p ? describe(p) : i.body);
    const imgs = (i.body.match(/https:\/\/[^\s)"']+\.(?:png|jpe?g|webp|gif)|https:\/\/github\.com\/user-attachments\/assets\/[\w-]+/gi) || []);
    if (imgs.length) console.log('\nФото в заявке:\n' + imgs.join('\n'));
    const own = (i.comments || []).filter((c) => c.author && c.author.login === OWNER);
    if (own.length) console.log('\nКомментарии владельца:\n' + own.map((c) => '— ' + c.body).join('\n'));
    if (p) fs.writeFileSync(path.join(ROOT, '.claude-inbox-' + n + '.json'), JSON.stringify(p, null, 1));
    return;
  }
  if (cmd === 'decode') {
    const src = argv[1] && fs.existsSync(argv[1]) ? fs.readFileSync(argv[1], 'utf8') : argv.slice(1).join(' ');
    const p = decode(src);
    if (!p) { console.log('Код SHK1… не найден.'); process.exitCode = 1; return; }
    console.log(p.kind === 'progress' ? JSON.stringify(p, null, 1).slice(0, 4000) : describe(p));
    return;
  }
  if (cmd === 'add' || cmd === 'reply') {
    const issue = cmd === 'reply' ? Number(argv[1]) : (flag('issue') ? Number(flag('issue')) : null);
    const mdFile = flag('md');
    if (!mdFile || !fs.existsSync(mdFile)) throw new Error('Нужен --md файл с текстом разбора');
    const md = fs.readFileSync(mdFile, 'utf8').trim();
    let req = flag('req') || null, type = flag('type') || null, title = flag('title') || null;
    if (issue) {
      const i = JSON.parse(gh(['issue', 'view', String(issue), '--repo', REPO, '--json', 'title,body,author']));
      if (!i.author || i.author.login !== OWNER) throw new Error(`#${issue} создал не ${OWNER}`);
      const p = decode(i.body);
      if (p) { req = req || p.id; type = type || p.type; title = title || p.title; }
      title = title || i.title.replace(/^Разбор:\s*/, '');
    }
    const ix = loadIndex();
    const id = 'z' + Date.now().toString(36);
    const item = { id, req, issue, type: type || 'question', title: title || 'Разбор', at: new Date().toISOString(), md };
    const cfgFile = flag('cfg');
    if (cfgFile) { item.cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8')); item.cfgName = flag('cfgname') || 'Щит от Claude'; }
    if (flag('links')) item.links = JSON.parse(flag('links'));
    ix.items = [item].concat(ix.items || []);
    ix.issues = ix.issues || {};
    if (req && issue) ix.issues[req] = issue;
    saveIndex(ix);
    console.log(`Разбор ${id} добавлен в razbory/index.json`);
    if (cmd === 'reply') {
      sh('git', ['add', 'razbory/index.json']);
      sh('git', ['commit', '-m', `Разбор #${issue}: ${item.title}\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`]);
      sh('git', ['push']);
      const body = `### 🤖 Разбор от Claude\n\n${md}\n\n---\nРазбор сохранён в приложении: [Разборы → «${item.title}»](${SITE}#claude.${id}) — появится через 1–3 минуты.`;
      const tmp = path.join(ROOT, '.claude-reply.md');
      fs.writeFileSync(tmp, body);
      gh(['issue', 'comment', String(issue), '--repo', REPO, '--body-file', tmp]);
      gh(['issue', 'close', String(issue), '--repo', REPO, '--reason', 'completed']);
      fs.unlinkSync(tmp);
      console.log(`Ответ в #${issue} отправлен, issue закрыт. Сайт обновится через 1–3 минуты.`);
    } else console.log('Не забудь: git add razbory/index.json && git commit && git push');
    return;
  }
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 12).join('\n'));
}

main().catch((e) => { console.error('Ошибка: ' + e.message); process.exitCode = 1; });
