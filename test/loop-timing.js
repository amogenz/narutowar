/* Naruto War — loop timing regression test (Node).
 * Temuan QA: timer game berjalan LEBIH LAMBAT dari waktu nyata (efek slow-motion)
 * karena sisa akumulator dibuang saat 3 fixed step habis (if(n===3)G.acc=0).
 * Uji: drive loop() asli dengan timestamp sintetis 15fps & 30fps, pastikan
 * G.time mengejar waktu nyata (tidak tertinggal permanen).
 * Jalankan: node test/loop-timing.js   (harus exit 0) */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(name, cond, info) {
  if (cond) { pass++; }
  else { fail++; console.error(`FAIL ${name}${info ? ' — ' + info : ''}`); }
}

function nullCtx() {
  const grad = { addColorStop() {} };
  return new Proxy({}, {
    get(t, k) {
      if (typeof k !== 'string') return undefined;
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      if (k === 'measureText') return () => ({ width: 0 });
      if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return () => {};
    },
    set() { return true; },
  });
}

let rafCb = null;
const sandbox = {
  window: {},
  document: { createElement: () => ({ width: 0, height: 0, getContext: () => nullCtx() }) },
  Image: function () { this._src = ''; },
  performance: { now: () => 0 },
  requestAnimationFrame: cb => { rafCb = cb; },
  setTimeout: () => 0,
  clearTimeout: () => {},
  console,
};
Object.defineProperty(sandbox.Image.prototype, 'src', {
  set(v) { this._src = v; }, get() { return this._src; },
});
sandbox.window.devicePixelRatio = 2;
sandbox.window.innerWidth = 960;
sandbox.window.innerHeight = 540;
sandbox.window.addEventListener = () => {};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

for (const f of ['js/audio.js', 'js/data.js', 'js/sprite.js', 'js/fighter.js', 'js/game.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
}
for (const k of Object.keys(sandbox.window)) sandbox[k] = sandbox.window[k];
const { NWGame, NWChars } = sandbox.window;

/* drive loop() dengan frame time sintetis tetap */
function drive(fps, frames) {
  NWGame.init({ width: 0, height: 0, getContext: () => nullCtx() });
  NWGame.start({ mode: 'versus', arena: 'konoha', difficulty: 'normal',
    player: NWChars[0], enemy: NWChars[1] });
  const stepMs = 1000 / fps;
  let t = 0;
  for (let i = 0; i < frames; i++) {
    t += stepMs;
    const cb = rafCb; rafCb = null;
    cb(t); // loop(t) asli
  }
  const time = NWGame.getState().time;
  NWGame.stop();
  return time;
}

const near = (got, want, tol) => Math.abs(got - want) <= want * tol;

/* 15fps x 60 frame = 4.0 dtk waktu nyata — dulu hanya ~3.0 (slow-motion) */
let tm = drive(15, 60);
ok('15fps: game-time mengejar waktu nyata', near(tm, 4.0, 0.02), `G.time=${tm.toFixed(3)} (harusnya ~4.0)`);

/* 30fps x 60 frame = 2.0 dtk */
tm = drive(30, 60);
ok('30fps: game-time mengejar waktu nyata', near(tm, 2.0, 0.02), `G.time=${tm.toFixed(3)} (harusnya ~2.0)`);

/* 60fps x 120 frame = 2.0 dtk (jalur normal tak berubah) */
tm = drive(60, 120);
ok('60fps: tetap akurat', near(tm, 2.0, 0.01), `G.time=${tm.toFixed(3)} (harusnya ~2.0)`);

console.log(`\nLOOP-TIMING: ${pass} lolos, ${fail} gagal`);
process.exit(fail ? 1 : 0);
