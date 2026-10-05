/* Naruto War — integration test headless (Node).
 * Menjalankan battle simulasi tanpa browser: stub canvas 2D (Proxy no-op),
 * lalu start versus + tick 600 frame, cast jutsu, attack, dash.
 * Jalankan: node test/integration.js   (harus exit 0) */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL ' + name); }
}

/* stub context 2D: semua method no-op */
function ctxStub() {
  return new Proxy({}, {
    get(t, k) {
      if (k === 'createLinearGradient' || k === 'createRadialGradient')
        return () => ({ addColorStop() {} });
      if (k === 'getImageData')
        return () => ({ data: new Uint8ClampedArray(4) });
      if (k === 'measureText') return () => ({ width: 0 });
      return () => {};
    },
    set() { return true; },
  });
}
function canvasStub() {
  return { width: 0, height: 0, getContext: () => ctxStub() };
}

const sandbox = {
  window: {},
  document: { createElement: () => canvasStub() },
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
/* di browser, properti window jadi global; di vm harus di-copy manual */
for (const k of Object.keys(sandbox.window)) sandbox[k] = sandbox.window[k];
const { NWGame, NWChars, NWSprite } = sandbox.window;
ok('NWGame ada', !!NWGame);
ok('8 karakter', NWChars.length === 8);

/* sprite belum ada -> fallback prosedural */
ok('sprite naruto belum dimuat', NWSprite.has('naruto') === false);

NWGame.init(canvasStub());

/* --- versus naruto vs sasuke --- */
NWGame.start({ mode: 'versus', arena: 'konoha', difficulty: 'normal',
  player: NWChars[0], enemy: NWChars[1] });
let S = NWGame.getState();
ok('2 fighter', S.fighters.length === 2);
ok('4 tower', S.towers.length === 4);
ok('2 base', S.bases.length === 2);
ok('player = naruto', S.player.ch.id === 'naruto');

/* tick 150 frame: wave minion muncul, kamera jalan */
for (let i = 0; i < 150; i++) NWGame._tick(1 / 60);
S = NWGame.getState();
ok('minion wave muncul', S.minions.length >= 4);
ok('kamera mengikuti pemain', S.cam >= 0);

/* jutsu: rasengan -> proyektil + chakra berkurang */
const ch0 = S.player.chakra;
ok('cast rasengan', NWGame.playerCast(0) === true);
S = NWGame.getState();
ok('proyektil ada', S.projs.length > 0);
ok('proyektil bawa fx rasengan', S.projs[0].fx === 'rasengan');
ok('chakra berkurang', S.player.chakra < ch0);
ok('cooldown jalan', S.player.cds[0] > 0);

/* attack manual 3x -> kombo berputar */
const p = S.player;
p.atkCd = 0; NWGame.playerAttack(); const c1 = p.atkCombo;
p.atkCd = 0; NWGame.playerAttack(); const c2 = p.atkCombo;
p.atkCd = 0; NWGame.playerAttack(); const c3 = p.atkCombo;
ok('kombo 0->1->2->0', c1 === 1 && c2 === 2 && c3 === 0);

/* dash berarah */
ok('dash kanan', NWGame.playerDash(1, 0) === true);
ok('dashT aktif', NWGame.getState().player.dashT > 0);

/* tick lagi: proyektil bergerak & bisa kena */
for (let i = 0; i < 240; i++) NWGame._tick(1 / 60);
ok('simulasi 360 frame tanpa crash', true);

/* --- sakura: nova -> flash FX --- */
NWGame.start({ mode: 'versus', arena: 'lembah', difficulty: 'normal',
  player: NWChars[3], enemy: NWChars[0] });
ok('cast nova sakura', NWGame.playerCast(0) === true);
ok('flash FX tercatat', NWGame.getState().flashes.length > 0);
for (let i = 0; i < 60; i++) NWGame._tick(1 / 60);
ok('flash kedaluwarsa', NWGame.getState().flashes.length === 0);

/* --- war 3v3 --- */
NWGame.start({ mode: 'war', arena: 'akatsuki', difficulty: 'hard',
  player: NWChars[0], enemy: NWChars[1] });
S = NWGame.getState();
ok('war: 6 fighter', S.fighters.length === 6);
for (let i = 0; i < 300; i++) NWGame._tick(1 / 60);
ok('war 300 frame tanpa crash', true);

/* --- training: dummy --- */
NWGame.start({ mode: 'training', arena: 'konoha', difficulty: 'normal',
  player: NWChars[0], enemy: NWChars[0] });
S = NWGame.getState();
ok('training: dummy ada', !!S.dummy);
ok('training: dummy langsung terlihat di viewport awal', S.dummy.x < 960);
ok('training: tanpa tower', S.towers.length === 0);

/* --- survival --- */
NWGame.start({ mode: 'survival', arena: 'konoha', difficulty: 'normal',
  player: NWChars[0], enemy: NWChars[0] });
for (let i = 0; i < 300; i++) NWGame._tick(1 / 60);
S = NWGame.getState();
ok('survival: gelombang jalan', S.survWave >= 1);
ok('survival: musuh spawn', S.fighters.length >= 2);

/* --- scoreboard (F): kill & death tercatat per petarung per match --- */
NWGame.start({ mode: 'versus', arena: 'konoha', difficulty: 'normal',
  player: NWChars[0], enemy: NWChars[1] });
S = NWGame.getState();
const foeSb = S.fighters[1];
foeSb.hp = 1; foeSb.x = S.player.x + 60; foeSb.y = S.player.y; S.player.dir = 1;
S.player.atkCd = 0;
ok('attack membunuh musuh', NWGame.playerAttack() === true);
S = NWGame.getState();
ok('musuh mati', S.fighters[1].alive === false);
ok('death tercatat di korban', S.fighters[1].deaths === 1);
ok('kill tercatat di penyerang', S.player.kills === 1);
const sb = NWGame.scoreboard();
ok('scoreboard: 2 entri versus', sb.length === 2);
const me = sb.find(e => e.isPlayer), en = sb.find(e => !e.isPlayer);
ok('scoreboard: kill pemain', me.kills === 1 && me.deaths === 0);
ok('scoreboard: death musuh', en.kills === 0 && en.deaths === 1);
ok('scoreboard: charId & nama', me.charId === 'naruto' && en.name === 'Sasuke Uchiha');
ok('scoreboard: tim benar', me.team === 0 && en.team === 1);

/* --- pause (v15): game-time BENAR-BENAR berhenti --- */
NWGame.start({ mode: 'versus', arena: 'konoha', difficulty: 'normal',
  player: NWChars[0], enemy: NWChars[1] });
for (let i = 0; i < 60; i++) NWGame._tick(1 / 60);
NWGame.playerCast(0); // rasengan -> cooldown > 0
const px0 = NWGame.getState().player.x;
const tPause0 = NWGame.getState().time;
const cdPause0 = NWGame.getState().player.cds[0];
ok('pra-pause: cooldown aktif', cdPause0 > 0);
NWGame.setPaused(true);
ok('isPaused() true', NWGame.isPaused() === true);
for (let i = 0; i < 120; i++) NWGame._tick(1 / 60); // 2 detik "game" saat pause
ok('pause: game-time diam total', NWGame.getState().time === tPause0);
ok('pause: posisi pemain diam', NWGame.getState().player.x === px0);
ok('pause: cooldown diam', NWGame.getState().player.cds[0] === cdPause0);
NWGame.setPaused(false);
ok('isPaused() false', NWGame.isPaused() === false);
for (let i = 0; i < 60; i++) NWGame._tick(1 / 60);
ok('resume: game-time jalan lagi', NWGame.getState().time > tPause0);
ok('resume: cooldown jalan lagi', NWGame.getState().player.cds[0] < cdPause0);
NWGame.stop();

console.log(`\nINTEGRATION: ${pass} lolos, ${fail} gagal`);
process.exit(fail ? 1 : 0);
