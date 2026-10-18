// Загружает скрипты приложения в Node без браузера — для тестов и для разборов Claude.
// Использование: const SHK = require('./load-app.cjs')(); SHK.engine.build(cfg)
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DEFAULT = ['core', 'rpg', 'svg', 'data-glossary', 'data-formulas', 'data-devices', 'data-norms', 'data-tables',
  'course-1', 'course-2', 'course-3', 'course-4', 'engine', 'render-panel', 'projects', 'control', 'games', 'photos'];

module.exports = function load(root, files) {
  root = root || path.join(__dirname, '..');
  const noop = () => {};
  const el = () => ({ addEventListener: noop, removeEventListener: noop, setAttribute: noop, getAttribute: () => null, classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, style: { setProperty: noop }, dataset: {}, appendChild: noop, remove: noop, querySelector: () => null, querySelectorAll: () => [], innerHTML: '' });
  const store = {};
  const ctx = {
    console, setTimeout, clearTimeout, setInterval, clearInterval, TextEncoder, TextDecoder, URL,
    document: { addEventListener: noop, querySelector: () => null, querySelectorAll: () => [], createElement: el, body: el(), documentElement: el(), visibilityState: 'visible' },
    location: { hash: '', protocol: 'https:', reload: noop },
    history: { back: noop },
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
    navigator: { userAgent: 'node', onLine: true },
    matchMedia: () => ({ matches: false, addEventListener: noop }),
    requestAnimationFrame: noop,
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    addEventListener: noop, removeEventListener: noop, scrollTo: noop,
    innerWidth: 400, innerHeight: 800, isSecureContext: false
  };
  ctx.window = ctx;
  ctx.self = ctx;
  vm.createContext(ctx);
  for (const f of files || DEFAULT) vm.runInContext(fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
  return ctx.SHK;
};
