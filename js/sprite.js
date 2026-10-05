/* ============================================================================
 * NARUTO WAR by Amogenz Lab — sprite.js
 * ----------------------------------------------------------------------------
 * Loader sprite sheet karakter & FX jutsu.
 *
 * KONTRAK SHEET KARAKTER — STRIP (batas upload Vercel ±96KB/file):
 *   assets/sprites/<id>_r0.png ... <id>_r9.png  (10 strip, tiap 768x256)
 *   tiap strip = 3 frame berurutan (row-major global), sel 256x256 px,
 *   background MAGENTA #FF00FF. Strip b -> frame global [b*3 .. b*3+2].
 *   Urutan frame global (indeks 0..29):
 *       idle0-3  (idx 0-3)    run0-5   (idx 4-9)
 *       atk1     (idx 10-12)   atk2     (idx 13-15)   atk3 (idx 16-18)
 *       cast    (idx 19-21)    hit      (idx 22-23)
 *       dead    (idx 24-25)    win      (idx 26-27)    spare (idx 28-29)
 *   - karakter menghadap KANAN, kaki di bagian BAWAH sel.
 *   - lihat assets/sprites/CONTRACT.md untuk detail tim ART.
 *
 * KONTRAK FX — STRIP: assets/sprites/fx_r0.png ... fx_r5.png
 *   (6 strip, tiap 768x128) tiap strip = 6 frame berurutan, sel 128x128 px,
 *   background MAGENTA #FF00FF. Strip b -> frame global [b*6 .. b*6+5].
 *   Tiap efek = deretan sel berurutan, lihat FX_ANIMS di bawah.
 *
 * FALLBACK: bila sheet gagal dimuat (belum dibuat tim ART), has() = false
 * dan game otomatis memakai renderer prosedural lama (js/fighter.js).
 * Animasi frame-index & logika scaling ditulis sebagai fungsi MURNI
 * (animKey/frameAt/cellRect/fitScale) agar bisa diuji via Node.
 * ========================================================================== */
(function () {
  'use strict';

  /* ---------------- kontrak strip ---------------- */
  var SHEET = { cols: 6, rows: 5, cell: 256 };
  var FX_CELL = 128, FX_COLS = 6;
  /* strip karakter: 10 file, tiap 3 frame (768x256); strip fx: 6 file, tiap 6 frame (768x128) */
  var CHAR_STRIPS = 10, CHAR_PER_STRIP = 3, FX_STRIPS = 6, FX_PER_STRIP = 6;
  var STRIP_V = 1; // ?v= strip (naikkan bila isi strip berubah)

  /* pose game -> animasi sheet (start = indeks row-major, fps wajar) */
  var ANIMS = {
    idle: { start: 0,  count: 4, fps: 8  },
    run:  { start: 4,  count: 6, fps: 12 },
    atk0: { start: 10, count: 3, fps: 15 },
    atk1: { start: 13, count: 3, fps: 15 },
    atk2: { start: 16, count: 3, fps: 15 },
    cast: { start: 19, count: 3, fps: 8  },
    hit:  { start: 22, count: 2, fps: 10 },
    dead: { start: 24, count: 2, fps: 4, hold: true },
    win:  { start: 26, count: 2, fps: 6  }
  };

  /* efek jutsu -> {start, frames, fps} di fx.png (sel 128px, 6 kolom) */
  var FX_ANIMS = {
    rasengan:  { start: 0,  frames: 6, fps: 14 },
    chidori:   { start: 6,  frames: 6, fps: 14 },
    katon:     { start: 12, frames: 6, fps: 12 },
    explosion: { start: 18, frames: 8, fps: 14 },
    heal:      { start: 26, frames: 4, fps: 10 },
    slash:     { start: 30, frames: 4, fps: 16 }
  };

  /* ---------------- fungsi murni (testable) ---------------- */

  /* pose + kombo -> kunci animasi */
  function animKey(pose, combo) {
    if (pose === 'attack') {
      var c = ((combo | 0) % 3 + 3) % 3;
      return 'atk' + c;
    }
    return ANIMS[pose] ? pose : 'idle';
  }

  /* kunci animasi + waktu detik -> indeks frame row-major */
  function frameAt(key, t) {
    var a = ANIMS[key] || ANIMS.idle;
    var i = Math.floor((t || 0) * a.fps);
    if (a.hold) return a.start + Math.min(a.count - 1, Math.max(0, i));
    return a.start + (((i % a.count) + a.count) % a.count);
  }

  /* indeks row-major -> kotak sumber di sheet (px) */
  function cellRect(idx, cell, cols) {
    cell = cell || SHEET.cell; cols = cols || SHEET.cols;
    var x = (idx % cols) * cell, y = Math.floor(idx / cols) * cell;
    return { sx: x, sy: y, sw: cell, sh: cell };
  }

  /* skala letterbox: dunia logis 960x540 ke canvas device px.
   * cw,ch = ukuran canvas (device px), dpr = devicePixelRatio.
   * return {s, ox, oy} dalam CSS px: gambar logis diskala s, offset (ox,oy). */
  function fitScale(cw, ch, dpr) {
    var lw = cw / dpr, lh = ch / dpr;
    var s = Math.min(lw / 960, lh / 540);
    return { s: s, ox: (lw - 960 * s) / 2, oy: (lh - 540 * s) / 2 };
  }

  /* ---------------- cache sheet ---------------- */
  var frames = {};   // charId -> [canvas frame 0..29]
  var fxFrames = null; // [canvas] atau null bila gagal
  var pending = {};  // charId -> promise (hindari load ganda)

  function hasDoc() { return typeof document !== 'undefined'; }

  /* chroma-key: magenta #FF00FF -> transparan (toleransi kecil) */
  function chromaKey(img, cell) {
    var c = document.createElement('canvas');
    c.width = img.naturalWidth || img.width;
    c.height = img.naturalHeight || img.height;
    var g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    var id = g.getImageData(0, 0, c.width, c.height);
    var d = id.data;
    for (var i = 0; i < d.length; i += 4) {
      var r = d[i], gg = d[i + 1], b = d[i + 2];
      /* magenta murni + toleransi: merah & biru tinggi, hijau rendah */
      if (r >= 200 && b >= 200 && gg <= 110) d[i + 3] = 0;
    }
    g.putImageData(id, 0, 0);
    return c;
  }

  function sliceSheet(keyed, cell, cols, rows) {
    var out = [];
    for (var i = 0; i < cols * rows; i++) {
      var r = cellRect(i, cell, cols);
      var c = document.createElement('canvas');
      c.width = cell; c.height = cell;
      c.getContext('2d').drawImage(keyed, r.sx, r.sy, r.sw, r.sh, 0, 0, cell, cell);
      out.push(c);
    }
    return out;
  }

  function loadImage(url) {
    return new Promise(function (res, rej) {
      var im = new Image();
      im.onload = function () { res(im); };
      im.onerror = function () { rej(new Error('gagal: ' + url)); };
      im.src = url;
    });
  }

  /* muat strip karakter <prefix>_r0.._r9; resolve true bila OK, false bila gagal (fallback).
   * prefix contoh: 'assets/sprites/naruto' (tanpa _rN.png & tanpa ?v=) */
  function load(charId, prefix) {
    if (frames[charId]) return Promise.resolve(true);
    if (pending[charId]) return pending[charId];
    if (!hasDoc()) return Promise.resolve(false);
    var urls = [];
    for (var s = 0; s < CHAR_STRIPS; s++) urls.push(prefix + '_r' + s + '.png?v=' + STRIP_V);
    var p = Promise.all(urls.map(loadImage)).then(function (ims) {
      var all = [];
      for (var s = 0; s < ims.length; s++) {
        var keyed = chromaKey(ims[s], SHEET.cell);
        var cut = sliceSheet(keyed, SHEET.cell, CHAR_PER_STRIP, 1);
        for (var k = 0; k < cut.length; k++) all.push(cut[k]);
      }
      if (all.length !== CHAR_STRIPS * CHAR_PER_STRIP) throw new Error('strip kurang');
      frames[charId] = all;
      return true;
    }).catch(function () {
      return false; // strip belum ada / rusak -> renderer prosedural
    });
    pending[charId] = p;
    return p;
  }

  /* muat strip fx <prefix>_r0.._r5 */
  function loadFx(prefix) {
    if (fxFrames) return Promise.resolve(true);
    if (!hasDoc()) return Promise.resolve(false);
    var urls = [];
    for (var s = 0; s < FX_STRIPS; s++) urls.push(prefix + '_r' + s + '.png?v=' + STRIP_V);
    return Promise.all(urls.map(loadImage)).then(function (ims) {
      var all = [];
      for (var s = 0; s < ims.length; s++) {
        var keyed = chromaKey(ims[s], FX_CELL);
        var cut = sliceSheet(keyed, FX_CELL, FX_PER_STRIP, 1);
        for (var k = 0; k < cut.length; k++) all.push(cut[k]);
      }
      fxFrames = all;
      return true;
    }).catch(function () {
      fxFrames = null;
      return false;
    });
  }

  function has(charId) { return !!(frames[charId] && frames[charId].length); }
  function fxReady(name) { return !!(fxFrames && FX_ANIMS[name]); }
  function fxAnim(name) { return FX_ANIMS[name] || null; }

  /* tinggi logis karakter di dunia (px) — kaki tepat di e.y */
  var CHAR_H = 120;

  /* gambar fighter: e = {x, y(tanah), dir, pose, pt, animT, atkCombo, charId} */
  function draw(g, e) {
    var set = frames[e.charId];
    if (!set) return false;
    var pose = e.pose || 'idle';
    var key = animKey(pose, e.atkCombo);
    var t = (pose === 'run') ? (e.animT || 0) : (e.pt || 0);
    var fr = set[frameAt(key, t)];
    if (!fr) return false;
    var s = CHAR_H / SHEET.cell;
    var w = SHEET.cell * s, h = SHEET.cell * s;
    g.save();
    g.translate(e.x || 0, e.y || 0);
    /* bayangan elips murah */
    g.fillStyle = 'rgba(0,0,0,0.26)';
    g.beginPath();
    g.ellipse(0, -2, 20, 6, 0, 0, Math.PI * 2);
    g.fill();
    g.scale((e.dir || 1) >= 0 ? 1 : -1, 1);
    /* sel 256px -> kaki di bawah sel menempel e.y */
    g.drawImage(fr, -SHEET.cell * s / 2, -SHEET.cell * s, w, h);
    g.restore();
    return true;
  }

  /* gambar efek jutsu di (x,y), size = diameter logis px, t = detik.
   * Bila sheet/fx tak tersedia -> fallback prosedural (lingkaran). */
  function drawFx(g, name, x, y, size, t, color) {
    var a = FX_ANIMS[name];
    if (a && fxFrames) {
      var i = Math.floor((t || 0) * a.fps) % a.frames;
      var fr = fxFrames[a.start + i];
      if (fr) {
        var h2 = size || 64;
        g.save();
        g.translate(x, y);
        g.drawImage(fr, -h2 / 2, -h2 / 2, h2, h2);
        g.restore();
        return;
      }
    }
    /* ---- fallback prosedural: bola energi berdenyut ---- */
    var r = (size || 64) / 2;
    var pulse = 1 + 0.12 * Math.sin((t || 0) * 14);
    var c = color || '#ffd23e';
    g.save();
    g.translate(x, y);
    g.globalAlpha = 0.35;
    g.fillStyle = c;
    g.beginPath(); g.arc(0, 0, r * pulse * 1.35, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 0.85;
    g.beginPath(); g.arc(0, 0, r * pulse, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.beginPath(); g.arc(0, 0, r * pulse * 0.45, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  function stats() {
    var n = 0;
    for (var k in frames) n += frames[k].length;
    return { chars: Object.keys(frames).length, frames: n, fx: !!fxFrames };
  }

  var api = {
    SHEET: SHEET, ANIMS: ANIMS, FX_ANIMS: FX_ANIMS,
    animKey: animKey, frameAt: frameAt, cellRect: cellRect, fitScale: fitScale,
    load: load, loadFx: loadFx, has: has, fxReady: fxReady, fxAnim: fxAnim,
    draw: draw, drawFx: drawFx, stats: stats,
    clear: function () { frames = {}; fxFrames = null; pending = {}; }
  };
  if (typeof window !== 'undefined') window.NWSprite = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
