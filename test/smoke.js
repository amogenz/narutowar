/* Naruto War — smoke test Node (fungsi murni).
 * Uji: sprite.js (animKey/frameAt/cellRect/fitScale) + game.js (_fitView).
 * Jalankan: node test/smoke.js   (harus exit 0) */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function loadJS(file) {
  const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const sandbox = {
    window: {},
    document: {
      createElement: () => ({
        width: 0, height: 0,
        getContext: () => null,
      }),
    },
    Image: function () {},
    performance: { now: () => 0 },
    requestAnimationFrame: () => {},
    localStorage: { getItem: () => null, setItem: () => {} },
    console,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: file });
  return sandbox.window;
}

let pass = 0, fail = 0;
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass++; }
  else { fail++; console.error(`FAIL ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); }
}
function approx(name, got, want, eps) {
  eps = eps || 1e-6;
  const ok = Math.abs(got - want) <= eps;
  if (ok) { pass++; }
  else { fail++; console.error(`FAIL ${name}: got ${got}, want ${want}`); }
}

/* ---------- sprite.js ---------- */
const W1 = loadJS('js/sprite.js');
const S = W1.NWSprite;
if (!S) { console.error('FAIL: NWSprite tidak ter-export'); process.exit(1); }

/* animKey: pose + kombo -> kunci animasi */
eq('animKey idle', S.animKey('idle', 0), 'idle');
eq('animKey run', S.animKey('run', 0), 'run');
eq('animKey attack c0', S.animKey('attack', 0), 'atk0');
eq('animKey attack c1', S.animKey('attack', 1), 'atk1');
eq('animKey attack c2', S.animKey('attack', 2), 'atk2');
eq('animKey attack c3 wrap', S.animKey('attack', 3), 'atk0');
eq('animKey cast', S.animKey('cast', 0), 'cast');
eq('animKey hit', S.animKey('hit', 0), 'hit');
eq('animKey dead', S.animKey('dead', 0), 'dead');
eq('animKey win', S.animKey('win', 0), 'win');
eq('animKey unknown -> idle', S.animKey('ngawur', 0), 'idle');

/* frameAt: sesuai kontrak sheet 6x5 row-major */
eq('idle t=0 -> idx 0', S.frameAt('idle', 0), 0);
eq('idle t=0.2 (8fps) -> idx 1', S.frameAt('idle', 0.2), 1);
eq('idle t=0.5 -> idx 0 (loop 4)', S.frameAt('idle', 0.5), 0);
eq('run t=0 -> idx 4', S.frameAt('run', 0), 4);
eq('run t=0.5 (12fps, 6 frame) -> idx 4', S.frameAt('run', 0.5), 4);
eq('run t=0.1 -> idx 5', S.frameAt('run', 0.1), 5);
eq('atk0 t=0 -> idx 10', S.frameAt('atk0', 0), 10);
eq('atk1 t=0 -> idx 13', S.frameAt('atk1', 0), 13);
eq('atk2 t=0.1 (15fps) -> idx 17', S.frameAt('atk2', 0.1), 17);
eq('cast t=0 -> idx 19', S.frameAt('cast', 0), 19);
eq('hit t=0 -> idx 22', S.frameAt('hit', 0), 22);
eq('dead t=0 -> idx 24', S.frameAt('dead', 0), 24);
eq('dead t=5 -> idx 25 (hold, tidak loop)', S.frameAt('dead', 5), 25);
eq('win t=0 -> idx 26', S.frameAt('win', 0), 26);

/* cellRect: indeks row-major -> kotak sumber */
eq('cellRect 0', S.cellRect(0), { sx: 0, sy: 0, sw: 256, sh: 256 });
eq('cellRect 5 (ujung baris 0)', S.cellRect(5), { sx: 1280, sy: 0, sw: 256, sh: 256 });
eq('cellRect 6 (awal baris 1)', S.cellRect(6), { sx: 0, sy: 256, sw: 256, sh: 256 });
eq('cellRect 29 (terakhir)', S.cellRect(29), { sx: 1280, sy: 1024, sw: 256, sh: 256 });

/* fitScale: canvas device px -> skala letterbox dunia 960x540 */
let v = S.fitScale(1920, 1080, 2); // 960x540 CSS px = pas
approx('fit 960x540 s', v.s, 1); approx('fit 960x540 ox', v.ox, 0); approx('fit 960x540 oy', v.oy, 0);
v = S.fitScale(1600, 900, 2); // 800x450 CSS
approx('fit 800x450 s', v.s, 800 / 960); approx('fit 800x450 ox', v.ox, 0); approx('fit 800x450 oy', v.oy, 0);
v = S.fitScale(2000, 800, 2); // 1000x400 CSS -> letterbox kiri-kanan
approx('fit 1000x400 s', v.s, 400 / 540);
approx('fit 1000x400 ox', v.ox, (1000 - 960 * (400 / 540)) / 2);
approx('fit 1000x400 oy', v.oy, 0);
v = S.fitScale(1280, 800, 1); // dpr 1, layar tinggi -> letterbox atas-bawah
approx('fit dpr1 s', v.s, 1280 / 960);
approx('fit dpr1 oy', v.oy, (800 - 540 * (1280 / 960)) / 2);

/* FX anim map ada & konsisten */
['rasengan', 'chidori', 'katon', 'explosion', 'heal', 'slash'].forEach(n => {
  const a = S.fxAnim(n);
  eq(`fxAnim ${n} ada`, !!a, true);
  eq(`fxAnim ${n} frames>0`, a.frames > 0, true);
});

/* ---------- game.js ---------- */
const W2 = loadJS('js/game.js');
const G = W2.NWGame;
if (!G) { console.error('FAIL: NWGame tidak ter-export'); process.exit(1); }
eq('NWGame._fitView = fungsi', typeof G._fitView, 'function');
v = G._fitView(1920, 1080, 2);
approx('game fit s', v.s, 1); approx('game fit ox', v.ox, 0); approx('game fit oy', v.oy, 0);
eq('NWGame.playerDash = fungsi', typeof G.playerDash, 'function');
eq('NWGame.setBlock dihapus', G.setBlock, undefined);

/* ---------- data.js ---------- */
const W3 = loadJS('js/data.js');
const chars = W3.NWChars;
eq('data: 8 karakter', chars.length, 8);
const byId = {}; chars.forEach(c => { byId[c.id] = c; });
['naruto', 'sasuke', 'kakashi', 'sakura', 'itachi', 'joly'].forEach(id => {
  eq(`sprite terdaftar: ${id}`, typeof byId[id].sprite === 'string' && byId[id].sprite === 'assets/sprites/' + id, true);
});
['lee', 'gaara'].forEach(id => {
  eq(`tanpa sprite (fallback prosedural): ${id}`, byId[id].sprite, undefined);
});
eq('NWFxSheet terdaftar', W3.NWFxSheet, 'assets/sprites/fx');
eq('Joly tetap dieja Joly', byId.joly.name, 'Joly');

console.log(`\nSMOKE: ${pass} lolos, ${fail} gagal`);
process.exit(fail ? 1 : 0);
