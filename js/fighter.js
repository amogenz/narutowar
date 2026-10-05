/* ============================================================================
 * NARUTO WAR by Amogenz Lab — fighter.js
 * ----------------------------------------------------------------------------
 * Renderer karakter ninja 2D artikulasi untuk canvas 2D (logical 960x540).
 *
 * CARA PAKAI:
 *   <script src="js/fighter.js"></script>
 *   NWFighter.warm([{ charId:'naruto', ch:{body:'#e8722a',head:'#f2c99b',accent:'#ffdd33'} }]);
 *   // ... di game loop:
 *   NWFighter.draw(ctx, { x:100, y:400, dir:1, ch:{...}, pose:'run',
 *                         pt:0, animT:t, atkCombo:0, charId:'naruto' });
 *
 * STRATEGI PERFORMA (wajib):
 *   - Tiap frame animasi di-prerender SEKALI ke offscreen canvas (±96x112 px),
 *     lalu draw() hanya melakukan SATU drawImage. Tidak ada shadowBlur,
 *     tidak ada gradient creation di hot path — semua sudah "dibakar" di cache.
 *   - Cache key: charId + pose + frameIndex (+ atkCombo khusus pose 'attack').
 *   - Estimasi: 22 frame/karakter x 96x112x4 byte ≈ 940 KB per karakter.
 *
 * KOORDINAT FRAME: titik (CX, GROUND) = posisi kaki. draw() menaruh frame
 * sehingga GROUND tepat di e.y (kaki napak tanah).
 * ========================================================================== */
(function () {
  'use strict';

  /* ---------------- konstanta frame ---------------- */
  var FW = 96, FH = 112;      // ukuran offscreen per frame
  var CX = 48;                // pusat horizontal kaki
  var GROUND = 104;           // garis tanah di dalam frame
  var RAD = Math.PI / 180;

  /* jumlah frame per pose (total 22 frame/karakter; attack x3 varian combo) */
  var FRAMES = { idle: 2, run: 4, jump: 1, attack: 3, cast: 2,
                 hit: 1, dead: 1, win: 2 };

  /* durasi pose attack di game (detik) — sinkron dengan pd.attack di game.js */
  var ATK_DUR = 0.32;
  function clamp01(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }
  /* ease-out kubik murni: ayunan cepat ke frame tebasan, recover melambat */
  function easeOutCubic(x) { x = clamp01(x); return 1 - Math.pow(1 - x, 3); }

  var cache = {};             // "charId|pose|frame|combo" -> canvas

  /* panjang segmen tubuh (px) — proporsi ninja mungil namun proporsional */
  var THIGH = 22, SHIN = 20, UARM = 16, FARM = 14;
  var TORSO = 26, HEAD_R = 13, HIP_H = 46;

  /* ---------------- util warna ---------------- */

  /* shade(hex, amt): cerahkan (+) / gelapkan (-) warna hex. amt -100..100 */
  function shade(hex, amt) {
    var h = String(hex || '#888888').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    var t = amt < 0 ? 0 : 255, p = Math.abs(amt) / 100;
    r = Math.round((t - r) * p + r);
    g = Math.round((t - g) * p + g);
    b = Math.round((t - b) * p + b);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  /* ---------------- primitif gambar (hanya dipakai saat prerender) ---------------- */

  /* anggota badan: garis tebal ber-gradient + outline gelap (efek selongsong) */
  function limb(g, x1, y1, x2, y2, w, cA, cB) {
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(22,16,26,0.55)';
    g.lineWidth = w + 2.5;
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    var gr = g.createLinearGradient(x1, y1, x2, y2);
    gr.addColorStop(0, cA); gr.addColorStop(1, cB);
    g.strokeStyle = gr;
    g.lineWidth = w;
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  }

  function disc(g, x, y, r, cA, cB) {
    var gr = g.createLinearGradient(x - r, y - r, x + r, y + r);
    gr.addColorStop(0, cA); gr.addColorStop(1, cB);
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.lineWidth = 2; g.strokeStyle = 'rgba(22,16,26,0.6)'; g.stroke();
  }

  function rr(g, x, y, w, h, r) {   // rounded-rect path helper
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  /* ---------------- data pose ----------------
   * Sudut dalam DERAJAT dari vertikal bawah, positif = ke arah hadap (+x).
   * legA/legB: [sudutPaha, sudutBetis]  |  armA/armB: [sudutLenganAtas, sudutLenganBawah]
   * lean: kemiringan torso (+ condong ke depan) | bob: naik-turun torso (napas)
   * headT: anggukan kepala                                                  */
  var POSE_IDLE = [
    { legA: [8, 4],  legB: [-8, 2], armA: [10, 16], armB: [-6, 12], lean: 3, bob: 0,  headT: 0 },
    { legA: [9, 5],  legB: [-9, 3], armA: [12, 18], armB: [-4, 14], lean: 3, bob: -2, headT: 3 }
  ];
  var POSE_RUN = [
    { legA: [38, 10], legB: [-30, 55], armA: [-32, -18], armB: [28, 38], lean: 13, bob: 0,  headT: -4 },
    { legA: [14, 28], legB: [-6, 72],  armA: [-14, -8],  armB: [14, 26], lean: 12, bob: -3, headT: -4 },
    { legA: [-30, 55], legB: [38, 10], armA: [28, 38],   armB: [-32, -18], lean: 13, bob: 0, headT: -4 },
    { legA: [-6, 72],  legB: [14, 28], armA: [14, 26],   armB: [-14, -8],  lean: 12, bob: -3, headT: -4 }
  ];
  var POSE_JUMP =
    { legA: [48, 85], legB: [8, 75], armA: [-28, -45], armB: [22, 35], lean: 6, bob: 2, headT: -6 };
  /* attack: 3 frame x 3 varian (0=tinju, 1=tendangan, 2=tebasan kunai) */
  var POSE_ATK = [
    [ /* 0 — TINJU */
      { legA: [24, 14], legB: [-18, 12], armA: [25, 85], armB: [-12, 65], lean: 6,  bob: 0, headT: 0 },
      { legA: [30, 10], legB: [-24, 16], armA: [92, 8],  armB: [-22, 75], lean: 15, bob: 0, headT: -2 },
      { legA: [22, 12], legB: [-20, 14], armA: [70, 15], armB: [-15, 60], lean: 9,  bob: 1, headT: 0 }
    ],
    [ /* 1 — TENDANGAN */
      { legA: [24, 14], legB: [-18, 12], armA: [25, 85], armB: [-12, 65], lean: 6,  bob: 0, headT: 0 },
      { legA: [88, 6],  legB: [-4, 6],   armA: [45, 70], armB: [-35, 45], lean: -8, bob: 0, headT: -6 },
      { legA: [32, 22], legB: [-8, 10],  armA: [30, 60], armB: [-20, 50], lean: 4,  bob: 0, headT: 0 }
    ],
    [ /* 2 — TEBASAN KUNAI */
      { legA: [24, 14], legB: [-18, 12], armA: [-55, -25], armB: [15, 55], lean: 4,  bob: 0, headT: 0 },
      { legA: [28, 12], legB: [-22, 14], armA: [105, 18],  armB: [-18, 60], lean: 17, bob: 0, headT: -2 },
      { legA: [22, 12], legB: [-20, 14], armA: [62, 22],   armB: [-12, 55], lean: 9,  bob: 1, headT: 0 }
    ]
  ];
  var POSE_CAST = [
    { legA: [12, 8], legB: [-12, 8], armA: [55, 130], armB: [60, 135], lean: 4, bob: 0,  headT: 4 },
    { legA: [12, 8], legB: [-12, 8], armA: [58, 142], armB: [58, 142], lean: 4, bob: -1, headT: 4 }
  ];
  var POSE_HIT =
    { legA: [18, 12], legB: [-14, 22], armA: [-45, -70], armB: [55, 85], lean: -16, bob: 2, headT: -12 };
  var POSE_WIN = [
    { legA: [6, 2], legB: [-6, 2], armA: [150, 150], armB: [160, 160], lean: -4, bob: -2, headT: -8 },
    { legA: [6, 2], legB: [-6, 2], armA: [145, 145], armB: [165, 165], lean: -4, bob: -6, headT: -8 }
  ];

  function poseData(pose, frame, combo) {
    switch (pose) {
      case 'idle':   return POSE_IDLE[frame % 2];
      case 'run':    return POSE_RUN[frame % 4];
      case 'jump':   return POSE_JUMP;
      case 'attack': return POSE_ATK[combo % 3][Math.min(2, frame)];
      case 'cast':   return POSE_CAST[frame % 2];
      case 'hit':    return POSE_HIT;
      case 'win':    return POSE_WIN[frame % 2];
      default:       return POSE_IDLE[0];
    }
  }

  /* ---------------- skeleton: forward kinematics ---------------- */
  function buildSkeleton(pose, frame, combo) {
    if (pose === 'dead') return deadSkeleton();
    var P = poseData(pose, frame, combo);
    var hip = { x: CX, y: GROUND - HIP_H + (P.bob || 0) };
    var lr = (P.lean || 0) * RAD;
    var sh = { x: hip.x + Math.sin(lr) * TORSO, y: hip.y - Math.cos(lr) * TORSO };
    var head = { x: sh.x + Math.sin(lr) * 8 + 2, y: sh.y - 13, r: HEAD_R,
                 tilt: (P.headT || 0) * RAD };

    function leg(a) {
      var t = a[0] * RAD, s = a[1] * RAD;
      var knee = { x: hip.x + Math.sin(t) * THIGH, y: hip.y + Math.cos(t) * THIGH };
      var ank  = { x: knee.x + Math.sin(s) * SHIN, y: knee.y + Math.cos(s) * SHIN };
      return [hip, knee, ank];
    }
    function arm(a) {
      var u = a[0] * RAD, f = a[1] * RAD;
      var el = { x: sh.x + Math.sin(u) * UARM, y: sh.y + Math.cos(u) * UARM };
      var ha = { x: el.x + Math.sin(f) * FARM, y: el.y + Math.cos(f) * FARM };
      return [sh, el, ha];
    }
    return { hip: hip, sh: sh, head: head,
             legA: leg(P.legA), legB: leg(P.legB),
             armA: arm(P.armA), armB: arm(P.armB), lean: P.lean || 0 };
  }

  /* dead: terbaring horizontal, kepala ke arah hadap */
  function deadSkeleton() {
    var hip = { x: 40, y: GROUND - 10 };
    var sh  = { x: 62, y: GROUND - 13 };
    return {
      hip: hip, sh: sh,
      head: { x: 79, y: GROUND - 15, r: HEAD_R, tilt: 0.3 },
      legA: [hip, { x: 22, y: GROUND - 8 }, { x: 4,  y: GROUND - 7 }],
      legB: [hip, { x: 24, y: GROUND - 4 }, { x: 7,  y: GROUND - 3 }],
      armA: [sh,  { x: 50, y: GROUND - 6 }, { x: 38, y: GROUND - 4 }],
      armB: [sh,  { x: 66, y: GROUND - 26 }, { x: 60, y: GROUND - 34 }],
      lean: 0
    };
  }

  /* ---------------- bagian tubuh ---------------- */

  function drawLeg(g, pts, cA, cB, footC) {
    limb(g, pts[0].x, pts[0].y, pts[1].x, pts[1].y, 9, cA, cB);      // paha
    limb(g, pts[1].x, pts[1].y, pts[2].x, pts[2].y, 7.5, cA, cB);    // betis
    /* kaki: sandal ninja — persegi membulat ke arah hadap */
    var ax = pts[2].x, ay = pts[2].y;
    g.fillStyle = footC || '#2b2b33';
    rr(g, ax - 3, ay - 4, 13, 8, 3); g.fill();
    g.lineWidth = 1.5; g.strokeStyle = 'rgba(22,16,26,0.6)'; g.stroke();
  }

  function drawArm(g, pts, clothA, clothB, skin, back) {
    var wU = back ? 6.5 : 7.5, wF = back ? 5.5 : 6.5;
    limb(g, pts[0].x, pts[0].y, pts[1].x, pts[1].y, wU, clothA, clothB); // lengan atas
    limb(g, pts[1].x, pts[1].y, pts[2].x, pts[2].y, wF, clothA, clothB); // lengan bawah
    disc(g, pts[2].x, pts[2].y, 4.2, shade(skin, 15), shade(skin, -15)); // tangan
  }

  function drawTorso(g, sk, cloth, acc) {
    var hx = sk.hip.x, hy = sk.hip.y, sx = sk.sh.x, sy = sk.sh.y;
    var dx = sx - hx, dy = sy - hy, len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / len, ny = dx / len, hw = 8, sw = 11;
    g.beginPath();
    g.moveTo(hx + nx * hw, hy + ny * hw);
    g.lineTo(sx + nx * sw, sy + ny * sw);
    g.quadraticCurveTo(sx + dx / len * 4, sy + dy / len * 4, sx - nx * sw, sy - ny * sw);
    g.lineTo(hx - nx * hw, hy - ny * hw);
    g.quadraticCurveTo(hx - dx / len * 3, hy - dy / len * 3, hx + nx * hw, hy + ny * hw);
    g.closePath();
    var gr = g.createLinearGradient(sx, sy, hx, hy);
    gr.addColorStop(0, shade(cloth, 15)); gr.addColorStop(1, shade(cloth, -28));
    g.fillStyle = gr; g.fill();
    g.lineWidth = 2; g.strokeStyle = 'rgba(22,16,26,0.6)'; g.stroke();
    /* sabuk/obi aksen di pinggang */
    g.lineCap = 'round';
    g.strokeStyle = acc; g.lineWidth = 5;
    g.beginPath();
    g.moveTo(hx + nx * (hw + 1), hy + ny * (hw + 1));
    g.lineTo(hx - nx * (hw + 1), hy - ny * (hw + 1));
    g.stroke();
  }

  /* ---------------- kepala & aksesori khas tiap karakter ---------------- */

  function drawRibbon(g, x, y, frame, color) {
    /* pita ikat kepala berkibar ke belakang — fase dari nomor frame */
    g.lineCap = 'round';
    for (var i = 0; i < 2; i++) {
      var fl = Math.sin(frame * 1.6 + i * 1.7) * 3.5;
      g.strokeStyle = shade(color, -25);
      g.lineWidth = 5 - i;
      g.beginPath();
      g.moveTo(x, y + i * 3);
      g.quadraticCurveTo(x - 10, y - 2 + i * 7 + fl, x - 20 - i * 4, y + 2 + i * 8 + fl * 1.6);
      g.stroke();
    }
  }

  function drawHeadband(g, h, frame) {
    var x = h.x, y = h.y, r = h.r;
    var bandC = '#33415c';
    /* kain band melingkari dahi */
    g.fillStyle = bandC;
    rr(g, x - r - 1, y - 9, r * 2 + 2, 9, 4); g.fill();
    g.lineWidth = 1.5; g.strokeStyle = 'rgba(22,16,26,0.6)'; g.stroke();
    /* pelat logam + kilau */
    var gr = g.createLinearGradient(0, y - 9, 0, y + 2);
    gr.addColorStop(0, '#e8edf2'); gr.addColorStop(0.5, '#b9c2cc'); gr.addColorStop(1, '#8a939c');
    g.fillStyle = gr;
    rr(g, x - 6, y - 8.5, 18, 10, 3); g.fill();
    g.strokeStyle = 'rgba(22,16,26,0.65)'; g.lineWidth = 1.5; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x - 3, y - 6); g.lineTo(x + 7, y - 6); g.stroke();
    /* pita di belakang kepala */
    drawRibbon(g, x - r + 1, y - 6, frame, bandC);
  }

  function spikes(g, cx, cy, r, n, a0, a1, len, color) {
    /* segitiga rambut: n spike dari sudut a0 ke a1 (radian, 0 = +x) */
    g.fillStyle = color;
    g.strokeStyle = 'rgba(22,16,26,0.5)'; g.lineWidth = 1.5;
    for (var i = 0; i < n; i++) {
      var a = a0 + (a1 - a0) * (n === 1 ? 0.5 : i / (n - 1));
      var bx = cx + Math.cos(a) * (r - 1), by = cy + Math.sin(a) * (r - 1);
      var tx = cx + Math.cos(a) * (r + len), ty = cy + Math.sin(a) * (r + len);
      var px = -Math.sin(a), py = Math.cos(a), wdt = 5;
      g.beginPath();
      g.moveTo(bx + px * wdt, by + py * wdt);
      g.lineTo(tx, ty);
      g.lineTo(bx - px * wdt, by - py * wdt);
      g.closePath(); g.fill(); g.stroke();
    }
  }

  function drawHead(g, sk, ch, charId, frame) {
    var h = sk.head, x = h.x, y = h.y, r = h.r;
    var skin = ch.head || '#f2c99b';
    var id = charId || 'genin';

    /* --- rambut belakang / aksesori punggung kepala --- */
    if (id === 'naruto') {
      spikes(g, x, y, r, 7, -2.6, -0.5, 9, '#ffd23f');            // spike pirang
    } else if (id === 'sasuke') {
      spikes(g, x, y, r, 6, -2.8, -0.4, 7, '#33415e');            // spike gelap
    } else if (id === 'kakashi') {
      spikes(g, x, y, r, 7, -2.9, -0.3, 11, '#dfe6ee');           // spike perak tegak
    } else if (id === 'itachi') {
      g.fillStyle = '#20242e';                                    // rambut panjang
      rr(g, x - r - 2, y - r, r * 2 + 4, r * 2 + 16, 8); g.fill();
      g.lineWidth = 1.5; g.strokeStyle = 'rgba(22,16,26,0.6)'; g.stroke();
    } else if (id === 'gaara') {
      g.fillStyle = '#a4553f';                                    // rambut merah pendek
      g.beginPath(); g.arc(x, y - 2, r + 1, Math.PI, 0); g.fill();
    }

    /* --- wajah --- */
    disc(g, x, y, r, shade(skin, 22), shade(skin, -18));

    /* mata (ditutup rambut untuk sasuke/kakashi, masker untuk kakashi) */
    var eyeY = y - 1 + Math.sin(h.tilt) * 4;
    if (id === 'kakashi') {
      g.fillStyle = '#46586c';                                    // masker
      rr(g, x + 1, y + 3, r + 5, 9, 4); g.fill();
      g.lineWidth = 1.5; g.strokeStyle = 'rgba(22,16,26,0.6)'; g.stroke();
    } else if (id !== 'sasuke') {
      g.fillStyle = '#2a2230';
      g.beginPath(); g.arc(x + 5, eyeY, 1.8, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(x + 11, eyeY, 1.8, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#2a2230'; g.lineWidth = 1.5;               // mulut mungil
      g.beginPath(); g.moveTo(x + 6, y + 6); g.lineTo(x + 10, y + 6); g.stroke();
    }

    /* --- poni depan --- */
    if (id === 'sasuke') {                                        // poni menutupi mata
      g.fillStyle = '#33415e';
      for (var i = 0; i < 4; i++) {
        var fx = x - 4 + i * 6;
        g.beginPath();
        g.moveTo(fx - 4, y - r + 2); g.lineTo(fx + 4, y - r + 2);
        g.lineTo(fx, y + 3); g.closePath(); g.fill();
      }
    } else if (id === 'naruto') {
      spikes(g, x, y, r, 3, -1.9, -1.2, 6, '#ffd23f');             // poni depan
    }

    /* --- penutup kepala: peci (joly) atau ikat kepala ninja --- */
    if (ch.peci || id === 'joly') {
      g.fillStyle = '#1c1c22';                                    // peci hitam
      g.beginPath(); g.arc(x, y - 3, r + 1, Math.PI, 0); g.fill();
      g.lineWidth = 1.5; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2;
      g.beginPath(); g.arc(x - 3, y - 6, r - 4, Math.PI * 1.15, Math.PI * 1.6); g.stroke();
    } else {
      drawHeadband(g, h, frame);
    }

    /* --- syal oranye naruto --- */
    if (id === 'naruto') {
      var ny = sk.sh.y - 8;
      g.strokeStyle = '#e8722a'; g.lineCap = 'round'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(x - 8, ny); g.quadraticCurveTo(x + 4, ny + 4, x + 12, ny); g.stroke();
      drawRibbon(g, x - 10, ny + 2, frame + 2, '#e8722a');        // ekor syal berkibar
    }
    /* --- kerah tinggi itachi --- */
    if (id === 'itachi') {
      g.fillStyle = '#26262e';
      rr(g, x - 11, y + 8, 26, 12, 5); g.fill();
      g.lineWidth = 1.5; g.strokeStyle = 'rgba(22,16,26,0.6)'; g.stroke();
      g.strokeStyle = '#b03a3a'; g.lineWidth = 2;                 // lis merah akatsuki
      g.beginPath(); g.moveTo(x - 11, y + 11); g.lineTo(x + 15, y + 11); g.stroke();
    }
  }

  /* kipas pasir mini di punggung gaara — digambar sebelum torso */
  function drawBackAccessory(g, sk, ch, charId) {
    if ((charId || '') !== 'gaara') return;
    var hx = sk.hip.x, hy = sk.hip.y;
    g.fillStyle = '#c9a06a';
    rr(g, hx - 26, hy - 36, 18, 30, 8); g.fill();
    g.lineWidth = 2; g.strokeStyle = 'rgba(22,16,26,0.6)'; g.stroke();
    g.strokeStyle = '#5a4a35'; g.lineWidth = 2.5;                 // tali pengikat
    g.beginPath(); g.moveTo(hx - 26, hy - 26); g.lineTo(hx - 8, hy - 26); g.stroke();
    g.beginPath(); g.moveTo(hx - 26, hy - 16); g.lineTo(hx - 8, hy - 16); g.stroke();
  }

  /* ---------------- efek serangan & chakra (ikut di-prerender) ---------------- */

  function drawKunai(g, x, y, ang, scale) {
    /* kunai kecil di tangan: gagang + bilah segitiga */
    g.save(); g.translate(x, y); g.rotate(ang); g.scale(scale, scale);
    g.fillStyle = '#5a4a3a';
    rr(g, -8, -2, 8, 4, 2); g.fill();                             // gagang
    var gr = g.createLinearGradient(0, 0, 14, 0);
    gr.addColorStop(0, '#dfe6ee'); gr.addColorStop(1, '#8a939c');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, -3.5); g.lineTo(14, 0); g.lineTo(0, 3.5);
    g.closePath(); g.fill();
    g.lineWidth = 1; g.strokeStyle = 'rgba(22,16,26,0.6)'; g.stroke();
    g.restore();
  }

  function drawEffects(g, sk, ch, charId, pose, frame, combo) {
    var acc = ch.accent || '#ffd23f';
    if (pose === 'attack' && frame === 1) {
      if (combo === 0) {                                          // TINJU: garis kecepatan
        var ha = sk.armA[2];
        g.strokeStyle = 'rgba(255,255,255,0.65)'; g.lineWidth = 2.5; g.lineCap = 'round';
        for (var i = 0; i < 3; i++) {
          var ly = ha.y - 8 + i * 8;
          g.beginPath(); g.moveTo(ha.x + 4, ly); g.lineTo(ha.x + 22, ly); g.stroke();
        }
      } else if (combo === 1) {                                   // TENDANGAN: busur ayunan
        var hip = sk.hip;
        g.strokeStyle = acc; g.globalAlpha = 0.55; g.lineWidth = 4; g.lineCap = 'round';
        g.beginPath(); g.arc(hip.x, hip.y, 42, -0.4, 1.1); g.stroke();
        g.globalAlpha = 1;
      } else {                                                    // TEBASAN: arc + kunai
        var sh = sk.sh, ha2 = sk.armA[2];
        g.strokeStyle = acc; g.globalAlpha = 0.5; g.lineWidth = 9; g.lineCap = 'round';
        g.beginPath(); g.arc(sh.x, sh.y, 36, -0.9, 1.2); g.stroke();
        g.strokeStyle = '#ffffff'; g.globalAlpha = 0.8; g.lineWidth = 4;
        g.beginPath(); g.arc(sh.x, sh.y, 36, -0.9, 1.2); g.stroke();
        g.globalAlpha = 1;
        var el = sk.armA[1];
        var ang = Math.atan2(ha2.y - el.y, ha2.x - el.x);
        drawKunai(g, ha2.x, ha2.y, ang, 1);
      }
    }
    if (pose === 'attack' && frame === 0 && combo === 2) {
      var el0 = sk.armA[1], ha0 = sk.armA[2];                     // kunai siap di kuda-kuda
      drawKunai(g, ha0.x, ha0.y, Math.atan2(ha0.y - el0.y, ha0.x - el0.x), 1);
    }
    if (pose === 'cast' && frame === 1) {                         // CHAKRA: segel tangan
      var h1 = sk.armA[2], h2 = sk.armB[2];
      var mx = (h1.x + h2.x) / 2, my = (h1.y + h2.y) / 2;
      var cols = [[16, 10, 0.30], [24, 15, 0.18], [32, 20, 0.10]];
      for (var j = 0; j < cols.length; j++) {
        g.fillStyle = acc; g.globalAlpha = cols[j][2];
        g.beginPath(); g.ellipse(mx, my, cols[j][0], cols[j][1], 0, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 0.75; g.fillStyle = acc;
      for (var k = 0; k < 6; k++) {
        var pa = k / 6 * Math.PI * 2 + frame;
        g.beginPath(); g.arc(mx + Math.cos(pa) * 28, my + Math.sin(pa) * 18, 2, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
    }
  }

  /* ---------------- render satu frame ke offscreen ---------------- */

  function renderFrame(ch, charId, pose, frame, combo) {
    var c = document.createElement('canvas');
    c.width = FW; c.height = FH;
    var g = c.getContext('2d');
    var sk = buildSkeleton(pose, frame, combo);

    var cloth = ch.body || '#3f6fb5';
    var skin  = ch.head || '#f2c99b';
    var acc   = ch.accent || '#ffd23f';

    /* urutan: anggota belakang -> aksesori punggung -> torso -> kepala -> depan */
    drawLeg(g, sk.legB, shade(cloth, -18), shade(cloth, -42));
    drawArm(g, sk.armB, shade(cloth, -15), shade(cloth, -35), skin, true);
    drawBackAccessory(g, sk, ch, charId);
    drawTorso(g, sk, cloth, acc);
    drawHead(g, sk, ch, charId, frame);
    drawLeg(g, sk.legA, shade(cloth, 8), shade(cloth, -22));
    drawArm(g, sk.armA, shade(cloth, 8), shade(cloth, -12), skin, false);
    drawEffects(g, sk, ch, charId, pose, frame, combo);
    return c;
  }

  function cacheKey(charId, pose, frame, combo) {
    /* atkCombo hanya membedakan frame pose 'attack' */
    return charId + '|' + pose + '|' + frame + (pose === 'attack' ? '|' + combo : '');
  }

  function getFrame(e, pose, frame, combo) {
    var id = e.charId || 'genin';
    var key = cacheKey(id, pose, frame, combo);
    var c = cache[key];
    if (!c) {
      c = renderFrame(e.ch || {}, id, pose, frame, combo);
      cache[key] = c;
    }
    return c;
  }

  /* ---------------- pemilihan frame dari waktu ---------------- */

  function frameIndex(e, pose) {
    var pt = e.pt || 0;
    switch (pose) {
      case 'idle':   return Math.floor(pt * 2) % 2;          // napas 2 frame
      case 'run':    return Math.floor((e.animT || 0) * 10) % 4; // walk cycle 4 frame
      case 'jump':   return 0;
      case 'attack':
        /* easing ease-out: snap cepat ke frame tebasan, tahan di recover */
        return Math.min(2, Math.floor(easeOutCubic(pt / ATK_DUR) * 2.999));
      case 'cast':   return Math.floor(pt * 3) % 2;          // segel 2 frame
      case 'hit':    return 0;
      case 'dead':   return 0;
      case 'win':    return Math.floor(pt * 2.5) % 2;        // selebrasi 2 frame
      default:       return 0;
    }
  }

  /* ---------------- API publik ---------------- */

  /* gambar satu fighter di (e.x, e.y); e.y = titik tanah (kaki). */
  function draw(g, e) {
    var pose = e.pose || 'idle';
    if (!FRAMES[pose]) pose = 'idle';
    var fi = frameIndex(e, pose);
    var combo = ((e.atkCombo | 0) % 3 + 3) % 3;
    var c = getFrame(e, pose, fi, combo);

    g.save();
    g.translate(e.x || 0, e.y || 0);
    g.scale((e.dir || 1) >= 0 ? 1 : -1, 1);

    /* bayangan elips murah — alpha rendah, tanpa shadowBlur */
    g.fillStyle = 'rgba(0,0,0,0.26)';
    g.beginPath();
    if (pose === 'dead') g.ellipse(10, -3, 34, 6, 0, 0, Math.PI * 2);
    else g.ellipse(0, -2, 19, 5.5, 0, 0, Math.PI * 2);
    g.fill();

    /* SATU drawImage — inilah seluruh hot path */
    g.drawImage(c, -CX, -GROUND);
    g.restore();
  }

  /* bangun semua frame di muka (panggil saat loading agar tak ada hitch) */
  function warm(list) {
    (list || []).forEach(function (it) {
      var id = it.charId || 'genin';
      Object.keys(FRAMES).forEach(function (pose) {
        for (var f = 0; f < FRAMES[pose]; f++) {
          var combos = pose === 'attack' ? [0, 1, 2] : [0];
          combos.forEach(function (cb) {
            var key = cacheKey(id, pose, f, cb);
            if (!cache[key]) cache[key] = renderFrame(it.ch || {}, id, pose, f, cb);
          });
        }
      });
    });
  }

  function stats() {
    var n = Object.keys(cache).length;
    return { frames: n, approxKB: Math.round(n * FW * FH * 4 / 1024) };
  }

  window.NWFighter = {
    draw: draw,
    warm: warm,
    clear: function () { cache = {}; },
    stats: stats,
    _easeOutCubic: easeOutCubic, // helper murni (untuk uji)
    FRAME_SIZE: { w: FW, h: FH },
    FRAMES: FRAMES
  };
})();
