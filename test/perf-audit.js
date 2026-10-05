/* Naruto War — perf-audit headless (Node).
 * Men-stub Canvas2D context yang MEREKAM semua pemanggilan, menjalankan N frame
 * update+render dengan skenario battle dummy (war 3v3 + partikel + teks + flash),
 * lalu melaporkan: drawImage/frame, save-restore/frame, operasi termahal,
 * dan proksi alokasi (delta heap/frame).
 *
 * BATASAN (jujur): ini simulasi LOGIKA di Node, BUKAN pengukuran FPS di HP.
 * Angka ini mengukur beban kerja kanvas (jumlah draw call & state change),
 * bukan waktu render GPU/HP. Berguna untuk perbandingan SEBELUM vs SESUDAH
 * optimasi pada skenario yang sama — bukan klaim "60fps di HP".
 *
 * Jalankan: node --expose-gc test/perf-audit.js   (harus exit 0)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FRAMES = 150;

/* ---------- RNG deterministik agar sebelum/sesudah sebanding ---------- */
let _s = 987654321;
Math.random = () => { _s = (_s * 1664525 + 1013904223) >>> 0; return _s / 4294967296; };

/* ---------- recorder: hitung pemanggilan method + set properti ---------- */
function makeRecorder() {
  const counts = {};
  const bump = k => { counts[k] = (counts[k] || 0) + 1; };
  const grad = { addColorStop() { bump('addColorStop'); } };
  const h = {
    get(t, k) {
      if (k === '__counts') return counts;
      if (typeof k !== 'string') return undefined;
      if (k === 'createLinearGradient' || k === 'createRadialGradient')
        return () => { bump(k); return grad; };
      if (k === 'measureText') return () => ({ width: 0 });
      if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return (...a) => { bump(k); };
    },
    set(t, k, v) { bump('set:' + k); return true; },
  };
  return new Proxy({}, h);
}
/* ctx mati untuk offscreen (prerender tidak dihitung) */
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

const mainRec = makeRecorder();
function mainCanvas() {
  return { width: 0, height: 0, __main: true, getContext: () => mainRec };
}
function offCanvas() {
  return { width: 0, height: 0, getContext: () => nullCtx() };
}

const sandbox = {
  window: {},
  document: { createElement: () => offCanvas() },
  Image: function () { this._src = ''; },
  performance: { now: () => 0 },
  requestAnimationFrame: () => {},
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
if (!NWGame || typeof NWGame._render !== 'function') {
  console.error('FAIL: NWGame._render tidak tersedia'); process.exit(1);
}

/* ---------- skenario: war 3v3, pemanasan, lalu beban penuh ---------- */
NWGame.init(mainCanvas());
NWGame.start({ mode: 'war', arena: 'konoha', difficulty: 'normal',
  player: NWChars[0], enemy: NWChars[1] });
const S = NWGame.getState();

/* pemanasan 90 tick: wave minion, AI jalan, cache fighter terisi */
for (let i = 0; i < 90; i++) NWGame._tick(1 / 60);

/* paksa beban berat yang deterministik: partikel, teks, flash, proyektil */
for (let i = 0; i < 120; i++) {
  S.parts.push({ x: 400 + (i % 40) * 20, y: 300, vx: 1, vy: -1, life: 5, maxlife: 5,
    color: '#ff9a3e', size: 4, grav: 2.5 });
}
for (let i = 0; i < 24; i++) {
  S.texts.push({ x: 500, y: 300, str: '99', color: '#ffd23e', size: 15, life: 1 });
}
for (let i = 0; i < 6; i++) {
  S.flashes.push({ x: 500 + i * 40, y: 300, fx: 'explosion', size: 120, t: 0, dur: 5 });
}
NWGame.playerCast(0); // rasengan -> proyektil
S.player.atkCd = 0; NWGame.playerAttack();
for (let i = 0; i < 10; i++) NWGame._tick(1 / 60); // proyektil bergerak

/* nol-kan counter, GC, ukur */
for (const k of Object.keys(mainRec.__counts)) delete mainRec.__counts[k];
if (global.gc) global.gc();
const heap0 = process.memoryUsage().heapUsed;

for (let f = 0; f < FRAMES; f++) {
  NWGame._tick(1 / 60);
  NWGame._render();
  if (f % 30 === 0) { // aksi berkala agar variasi mirip gameplay nyata
    S.player.cds[1] = 0; S.player.chakra = 100; NWGame.playerCast(1);
    S.player.atkCd = 0; NWGame.playerAttack();
  }
}

if (global.gc) global.gc();
const heap1 = process.memoryUsage().heapUsed;
const counts = mainRec.__counts;

/* ---------- laporan ---------- */
const per = {};
for (const k of Object.keys(counts)) per[k] = counts[k] / FRAMES;
const top = Object.keys(per).sort((a, b) => per[b] - per[a]).slice(0, 18);

const pick = (...ks) => ks.reduce((s, k) => s + (per[k] || 0), 0);
const report = {
  frames: FRAMES,
  drawImage_per_frame: +(per.drawImage || 0).toFixed(2),
  save_per_frame: +(per.save || 0).toFixed(2),
  restore_per_frame: +(per.restore || 0).toFixed(2),
  fillRect_per_frame: +(per.fillRect || 0).toFixed(2),
  fillText_per_frame: +(per.fillText || 0).toFixed(2),
  arc_per_frame: +(per.arc || 0).toFixed(2),
  createLinearGradient_per_frame: +(per.createLinearGradient || 0).toFixed(3),
  setTransform_per_frame: +(per.setTransform || 0).toFixed(2),
  propSets_per_frame: +pick(...Object.keys(per).filter(k => k.startsWith('set:'))).toFixed(1),
  heapBytes_per_frame: +(((heap1 - heap0) / FRAMES).toFixed(1)),
  top_ops: top.map(k => k + '=' + per[k].toFixed(2)),
};
console.log(JSON.stringify(report, null, 1));

let fail = 0;
const must = (n, c) => { if (!c) { fail++; console.error('FAIL ' + n); } };
must('drawImage tercatat', report.drawImage_per_frame > 10);
must('render berjalan tiap frame', report.setTransform_per_frame >= 2);
console.log(fail ? `\nPERF-AUDIT: ${fail} GAGAL` : '\nPERF-AUDIT: OK');
process.exit(fail ? 1 : 0);
