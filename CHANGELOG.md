# CHANGELOG — Naruto War by Amogenz Lab

Riwayat perubahan game per milestone. Format: tanggal — ringkasan.

## 2026-10-06 — v16: STAGE SELECT + MUSIK ORIGINAL

**STAGE SELECT ala referensi (index.html, css/style.css v17, js/ui.js v18):**
1. Layar pilih arena dirombak: grid thumbnail 4 kolom + panel preview besar kanan (gambar + nama + deskripsi), thumbnail terpilih border merah.
2. 3 arena playable (Konoha, Lembah Akhir, Malam Akatsuki) + 5 slot "SEGERA HADIR" (gembok SVG).
3. Thumbnail komposit asli dari art arena (sky+mid+ground, 16:9) — `assets/stages/*.jpg` + `*_thumb.jpg`, semua <55KB.
4. Rapi portrait (preview atas, grid bawah) & landscape.

**MUSIK (js/audio.js v4, ditulis ulang — 100% synth original, bukan OST):**
1. 3 track komposisi sendiri gaya epik-ninja (acuan gaya: cover OST Naruto Shippuden Crystilo & Vasaria Project — hanya rasanya, bukan melodinya): MENU (60 BPM, seruling+string+choir+taiko lembut, loop), BATTLE (132 BPM, taiko drive+riff string+brass, loop), VICTORY (jingle heroik one-shot).
2. SFX synth: pukulan, jutsu, ledakan, klik/hover UI, fanfare menang, sting kalah.
3. Toggle NYATA: MUSIK on/off (BGM), SUARA on/off (SFX), persist localStorage. Musik berhenti saat pause, lanjut saat resume. Inisialisasi audio pada interaksi pertama (autoplay policy).
4. Override: `assets/music/{menu,battle,victory}.mp3` — bila Bos menaruh file legal, dipakai; bila tidak, synth. Panduan di ASSETS.md, CARA-BERMAIN.md, assets/music/README.md (+ catatan hak cipta).

## 2026-10-06 — v15c: FIX QA (NPC, label, letterbox desktop)

**Temuan QA & perbaikan (js/game.js v14, assets/world/npc/npc_villager.png):**
1. Sprite NPC perempuan terpotong di tepi atas: strip fallback dibangun ulang (192x208) — baris perempuan digeser dengan headroom 8px di atas kepala; kode gambar disesuaikan (sel 64x104, kaki tetap di y=180).
2. Label "BASE" bertumpuk sprite NPC: blok status struktur (ikon+bar+label) digeser ke y=160, di bawah zona animasi NPC (kaki di y=180) — berlaku simetris kiri & kanan.
3. Desktop lebar: gambar dunia kini di-clip ke area pandang 960x540 (strip hijau di bilah letterbox hilang); pengisi letterbox diganti gradien gelap rapi (#101725→#030405, di-cache) bukan hitam pekat.

## 2026-10-06 — v15: MENU + HUD ALA NARUTO SENKI (referensi Bos)

**Latar:** 8 screenshot referensi Naruto Senki asli v1.2Beta dari Bos — ditiru komponennya.

**MENU (index.html, css/style.css v16, js/ui.js v17):**
1. Judul full-art (`assets/title-bg.jpg`) + tombol orientasi sejak layar judul.
2. Mode select: kartu besar ber-art background per mode (bukan kartu polos).
3. Character select ala referensi: grid portrait kiri + splash art besar kanan + nama besar + panah kiri/kanan.
4. Pause menu restyle: panel gelap, "Kembali Bertarung / Mulai Ulang / Kembali ke Menu / MUSIK:ON|OFF / SUARA:ON|OFF / Layar Penuh".
5. Quit dialog: "Keluar dan kembali ke menu utama? YA/TIDAK" + scoreboard live (portrait + kill/tumbang + timer + koin).
6. End screen: scoreboard rapi (tim KITA/MUSUH, penanda KAMU, kolom KILL & TUMBANG).
7. HUD ala screenshot referensi: kiri atas portrait+angka HP+energy+dot jutsu+koin; tengah atas portrait tim+skor kill; kanan atas ikon tower SVG+kill+tumbang+timer; joystick kiri bawah; kanan bawah 4 tombol jutsu lingkaran + tombol ATTACK besar berikon tinju SVG. Semua ikon SVG satu gaya, anti-emoji.
8. Rapi portrait 360px & landscape.

**GAMEPLAY (js/game.js v13):**
1. Tower & base = MONUMEN BATU + semak ala referensi (`monument.png`/`monument_broken.png`, fallback prosedural prerender).
2. Minion = prajurit berbaris (`soldier_ally/foe.png`, fallback strip lama) — frame adaptif, HP bar di atas.
3. Ground = tekstur JPG baru tileable (prioritas) dengan fallback PNG lama.
4. NPC strip baru anime 4-frame idle (prioritas) dengan fallback lama.
5. Pause: game-time berhenti total. Scoreboard: kill & tumbang per petarung (`NWGame.scoreboard()`).
6. Balance: match war 3v3 ~4m15s (tower/base lebih kuat, armor struktur 0.3x).
7. Performa: nol alokasi hot loop, prerender offscreen, pooling partikel — test hijau.

**ASET BARU (18 file, semua <55KB):** splash 6 karakter, mode latihan/versus, title-bg, ground 3 arena (JPG), monumen utuh/hancur, prajurit 2 tim, NPC warga/penjaga.
**GAP:** modes/war.jpg & modes/survival.jpg ditolak generator gambar (kebijakan konten) — kartu mode pakai fallback gradient sampai ada konsep alternatif.

## 2026-10-06 — v15b: WORLD ART + NPC (integrasi koordinator)

**Latar:** Kritik Bos "peta cuma warna bukan gambar" + NPC placeholder.

**Yang berubah (js/game.js, css/style.css, index.html, deploy.py):**
1. **Lantai arena gambar beneran**: `konoha_ground.png` (jalan tanah desa +
   rumput + kerikil + kelopak sakura), `lembah_ground.png` (tanah senja +
   batu sungai), `akatsuki_ground.png` (tanah malam + retakan merah) —
   tileable horizontal, di-prerender ke offscreen sekali (tetap 60fps).
2. **6 dekorasi baru per arena**: gerbang torii + semak sakura (Konoha),
   batu sungai + ilalang (Lembah), stalagmit + tumpukan batu (Akatsuki) —
   diposisikan di atas lane, luar area aksi.
3. **NPC anime beranimasi** di tepi base: warga desa pria/wanita (idle napas),
   ninja penjaga (idle + melambai + hormat), anak kecil (lompat gembira) —
   digambar per frame, tanpa alokasi.
4. **Fix bug**: path `title-art.jpg` di CSS (`assets/...` → `../assets/...`)
   — background art layar judul kini tampil.

## 2026-10-06 — v15: MENU PAUSE + AUDIT IKON + SUDUT LAYAR KONSISTEN

**Latar:** Upgrade menu & HUD: pause dalam game, tombol orientasi sejak awal
di semua layar menu, audit ikon seragam, layar full-viewport.

**Yang berubah (index.html, css/style.css, js/game.js, js/ui.js, js/audio.js,
test/integration.js, test/loop-timing.js):**

1. **Menu pause dalam game**: tombol pause (ikon SVG) di HUD kanan atas +
   keyboard Esc/P. Overlay gelap + blur, panel fade/scale mulus berisi:
   LANJUTKAN, MULAI ULANG (restart match, pip ronde sesi tetap), KE MENU
   UTAMA, toggle SUARA, toggle FULLSCREEN.
2. **Game-time benar-benar berhenti saat pause**: `loop()` melewati
   `update()`/`render()`/`tickHUD()` total — timer tak maju, musuh tak
   bergerak, cooldown diam; `G.last` disegarkan tiap frame agar resume tanpa
   lompatan dt. SFX game di-mute via `NWAudio._paused` (klik UI tetap bunyi
   via `uiClick`). Input tempur keyboard/sentuh mati saat pause (overlay
   menutup seluruh layar).
3. **Sudut layar konsisten (.corners)**: kiri-atas = kembali/brand,
   kanan-atas = suara + orientasi — di SEMUA layar menu (judul, mode,
   karakter, lawan, arena, akhir). Touch target seragam 48px, ikon satu set
   SVG, absolute terhadap `.screen` (tak ikut scroll, tak menutupi konten).
   Class lama `.backbtn`/`.corner`/`.corner-l` dihapus.
4. **Suara/orientasi/fullscreen class-based**: `[data-sound]`,
   `[data-orient]`, `[data-fs]` dicat & di-bind sekaligus — satu toggle
   memperbarui semua tombol di semua layar.
5. **Test**: `integration.js` + `loop-timing.js` di-extend — pause via
   `_tick()` dan via `loop()` asli: game-time, posisi, cooldown diam total
   saat pause; jalan lagi tanpa lompatan setelah resume.

**Catatan:** tidak deploy (urusan koordinator); `?v=` & `version.json`
tidak disentuh.


## 2026-10-05 — v14: FIX LAYOUT PORTRAIT + TOMBOL ORIENTASI + OPTIMASI SMOOTH

**Latar:** Screenshot HP Bos (layar PILIH MODE portrait) menunjukkan tombol
KEMBALI jadi panel raksasa, kartu bertumpuk, tombol HARD overlap. Bos juga
minta tombol orientasi kembali (opsi) dan game "full smooth".

**Yang berubah (index.html, css/style.css v13→v14, js/game.js v10→v11,
js/ui.js v14→v15, version.json v13→v14):**

1. **Root cause layout diperbaiki**: class CSS `.ghost` dipakai dua arti
   (tombol abu-abu DAN bar HP) sehingga semua tombol `btn ghost` kena
   `position:absolute` nyasar. Class bar HP di-rename jadi `.barghost`;
   tombol KEMBALI/NORMAL/HARD/MENU UTAMA kembali normal.
2. **Tombol KEMBALI baru**: 4 tombol kembali jadi tombol panah SVG kecil
   konsisten di pojok kiri atas tiap panel (ID dipertahankan).
3. **Portrait 360px dirapikan**: mode-grid 2 kolom kompak, char-grid &
   arena-grid 2 kolom, diff-row wrap anti-overflow, judul tidak kepotong.
4. **Tombol orientasi (opsi, bukan paksaan)**: ikon SVG di HUD + layar
   judul; toggle lock landscape on/off, tersimpan di localStorage, tanpa
   auto-lock dan tanpa overlay paksa.
5. **Optimasi performa**: game loop fixed-step 1/60 — sisa waktu tidak
   lagi dibuang (timer tidak slow-motion); vignette gradient di-cache
   (1.000 → 0,007 gradient/frame); alokasi hot-path -18%; degradasi
   adaptif bila frame-time tinggi; cache elemen HUD (nol query DOM/frame).
6. **Dekorasi arena dirapikan**: spanduk & baliho dipindah ke atas lane /
   tepi base (keluar area aksi), dikecilkan, bingkai kayu menyatu arena
   (border hijau mentah dihapus), tiang di tengah lane dihilangkan.


## 2026-10-05 — v13: NO-FORCED-LANDSCAPE + nyaman portrait & landscape

**Latar:** Arahan Bos — "Jangan paksa landscape. Buat nyaman user."
Pemaksaan orientasi dihapus total; game menyesuaikan orientasi yang dipegang.

**Yang berubah (index.html, css/style.css v12→v13, js/game.js v9→v10,
js/ui.js v12→v13, version.json v12→v13):**

1. **Hapus paksa landscape**: `screen.orientation.lock`, overlay "PUTAR HP
   KAMU" (+ tombol PAKSA LANDSCAPE), putar-CSS `.forcerotate`, dan tombol
   kunci-orientasi (`btn-orient`) DIHAPUS total. Fullscreen tetap sebagai opsi.
2. **Portrait nyaman**: kamera 620px mengikuti pemain (aksi tetap terbaca),
   canvas scale-to-fit, pita gradien langit/tanah per arena mengisi sisa
   vertikal; minimap/viewport/banner/vignette/struct-bar mengikuti lebar view.
   Kontrol sentuh dikompres di portrait (joystick + tombol jutsu lebih kecil).
3. **Bug QA diperbaiki**: banner FIGHT! via wall-clock (selalu muncul walau
   FPS rendah); baliho Pain/Zetsu pindah ke dekat base (tak menutupi
   boneka/arena tengah); minimap dipoles (bingkai emas, sudut membulat);
   HP bar hero naik 20px (tak menutupi wajah); kartu lawan misterius 1 ketuk
   = ungkap + pilih; tombol MULAI BERTARUNG aktif langsung (arena default
   konoha); canvas dibersihkan saat keluar ke menu (tak ada battlefield lama
   di belakang judul); balance diperlambat (tower 170→260, base 320→480,
   minion atk 5→4 / 10→8); tombol difficulty di-hardening (z-index di atas
   overlay).
4. **Catatan**: watermark "POWERED BY KURUMI" TIDAK DITEMUKAN di seluruh
   codebase & aset (grep nol, inspeksi visual ~20 gambar bersih) — tidak ada
   yang dihapus karena memang tidak ada.
5. **Verifikasi**: `node --check` OK; smoke 69/69; integration 28/28;
   cek portrait headless 12/12 (kamera 620px, clamp, band, balance).

## 2026-10-05 — v10: ANTI EMOJI total (aturan keras Bos, permanen)

**Latar:** Bos menetapkan aturan permanen — tidak boleh ada emoji di mana pun
di game; seluruh ikon wajib SVG/gambar ikon.

**Yang berubah (index.html, css/style.css v11→v12, js/ui.js v11→v12,
version.json v9→v10):**

1. **Set ikon SVG inline** (`ICON` di js/ui.js + inline di index.html),
   satu gaya konsisten: `viewBox` 24, `fill="none"`,
   `stroke="currentColor"` 2.4, round caps/joins — mengikuti design system.
   Ikon: volume-on, volume-off/mute, tutup (X), putar/orientasi, gembok,
   ceklis, koin, kembali, (fullscreen sudah SVG sebelumnya).
2. **Tombol HUD & judul**: 🔊/🔇 → SVG volume (toggle via `innerHTML`);
   ⟳ → SVG putar; ✕ → SVG X. Ukuran seragam 24px via `.iconbtn svg`.
3. **Gembok karakter**: 🔒 di kartu & toast → SVG gembok (+ CSS
   `.lockicon svg`, `.locktag svg` agar alignment rapi di semua ukuran).
4. **Ceklis difficulty**: `content:' ✓'` di CSS → ceklis SVG sebagai
   `background` data-URI (emas, sejajar teks).
5. **Koin**: teks "KOIN: N" kini diawali ikon koin SVG (menu, HUD, coinbar).
6. **Dokumen** (CARA-BERMAIN, README, ASSETS): emoji dihapus/diganti kata.
7. **Verifikasi**: grep emoji di file UI = nol; `node --check` OK;
   `test/smoke.js` 69/69; `test/integration.js` 28/28.

## 2026-10-05 — v9: integrasi art dunia + renderer parallax prerender

**Latar:** tim art menyelesaikan 34 file `assets/world/` (3 arena × 5 lapis,
dekorasi, strip ambient, tower/base/dummy/minion). Tugas fase ini:
integrasikan semuanya ke renderer, optimasi 60fps, deploy.

**Yang berubah (js/game.js v8→v9, index.html, version.json v8→v9):**

1. **Parallax prerender** (`buildLayers`): tiap arena kini memuat
   `sky.jpg` + `far_a`/`far_b` + `mid_a`/`mid_b` via `Image()`, digabung
   berdampingan dan digambar ke offscreen canvas SEKALI saat arena dimuat.
   Per frame hanya `drawImage` dengan offset parallax (sky 0x, far 0.25x,
   mid 0.55x, ground 1x) — tak ada lagi gambar vektor tiap frame.
   `far`/`mid` digambar lebih lebar dari dunia (masing-masing +360/+792px)
   agar geser parallax tak pernah menyisakan celah.
2. **Fallback prosedural**: bila ada gambar gagal dimuat (onerror/timeout 7
   dtk), renderer lama dipakai otomatis — game tidak rusak. Bila art tiba
   di tengah battle, lapis arena dibangun ulang dengan art.
3. **Tower & base baru**: sprite `tower_ally/foe` + `base_ally/foe`
   menggantikan kotak biru polos; versi `_broken` tetap digambar sebagai
   reruntuhan setelah hancur (2 state utuh/rusak).
4. **Minion baru**: strip 4-frame chibi genin (`minion_ally/foe.png`)
   menggantikan stickman, animasi 8fps.
5. **Dummy latihan**: pakai `dummy.png` (+ `dummy_hit.png` 0,28 dtk usai
   dipukul). PERBAIKAN BUG: spawn dipindah dari `x=WORLD_W/2+260` (di luar
   viewport awal — "tidak muncul") ke dekat spawn pemain agar langsung
   terlihat di arena training.
6. **Dekorasi LAB baru** di ground (poster pain/zetsu & spanduk lama tetap
   ada): `banner_lab`, lampion gantung di tiang kayu, pohon sakura
   (kecuali arena Akatsuki). Bonus: bug lama diperbaiki — dekorasi tak lagi
   hilang saat ganti arena (`_drawn` kini di-reset tiap `buildLayers`).
7. **Ambient 60fps**: partikel kelopak/kunang/kilau (`petal`/`firefly`/
   `sparkle.png`, strip 4 frame) pakai pool tetap 40 slot — tanpa alokasi
   objek di loop, tanpa `shadowBlur`; plus 3 awan bergerak (`cloud.png`)
   melayang di langit. Zona chakra tengah & genta perang tetap ada.
8. **Verifikasi**: `node --check` 7 file OK; `test/smoke.js` 69/69;
   `test/integration.js` 28/28 (termasuk asersi baru: dummy terlihat di
   viewport awal); harness art dunia 22/22 (preload, chroma-key `#FF00FF`,
   prerender lapis, pool ambient, fallback prosedural).
9. **Deploy**: 34 file world ditambahkan ke `deploy.py`; live di
   https://naruto.amogenz.xyz/ (version.json v9).

**Belum terverifikasi visual** (tanpa live browser): tampilan tiap arena,
tower/base/dummy/minion baru, banner FIGHT!, layar KALAH — wajib
screenshot manual di HP Bos sebelum dinyatakan SELESAI.

## 2026-10-05 — v11: perbaikan 8 temuan QA produksi (kode)

**Latar:** QA visual produksi menemukan 8 masalah kode (2 ditangani tim art:
tower kotak biru & dummy/minion — tidak disentuh di sini). Semua item di bawah
diverifikasi via penalaran kode + harness jsdom + eksekusi game sungguhan
dengan mock canvas 2D (tanpa live browser).

**Yang diperbaiki (css/style.css v10→v11, js/ui.js v10→v11, js/game.js v7→v8):**

1. **Bar HP/chakra tak lagi menutupi wajah** (game.js `afterSpriteBars`,
   `drawDummy`, `drawCombo`): sprite hero NWSprite tingginya 120px
   (puncak `y-120`, wajah ±`y-95`) tapi bar digambar di `y-92`/`y-80` —
   tepat di wajah. Kini: bar HP hero di `y-152..y-142` (22px di atas puncak),
   chakra di `y-140..y-135`; bar minion di `y-124..y-114` (16px di atas
   kepala NWFighter `y-98`); boneka latihan disusun ulang seluruhnya di atas
   kepala (`y-114`): label `y-160`, HP `y-152..y-142`, guard `y-140..y-132`,
   teks GUARD `y-124`; penghitung kombo dipindah ke `y-172` (di atas bar).

2. **Banner FIGHT!/K.O!/GUARD BREAK! tegas** (game.js): akar masalah —
   `bannerT` dikuras per fixed-step sehingga di HP lag (catch-up 3 step/frame)
   durasi menyusut hingga 1/3 dan FIGHT! cepat pudar. Kini timing WALL-CLOCK
   (`performance.now`): opacity PENUH dijamin 1,5 dtk + fade 1,1 dtk
   (total 2,6 dtk) berapa pun frame rate-nya; font 72px Bungee dengan
   `strokeText` outline hitam tebal (13px) agar terbaca di arena ramai;
   `GUARD BREAK!` kini juga banner besar (`big=true`), K.O.! sudah besar.
   Terverifikasi: 84 sampel alpha=1,00 selama fase penuh, fade mulus
   1,67s=0,85 → 2,34s=0,24.

3. **HUD struktur jadi ikon visual** (game.js `structBars`): teks mentah
   "T/T/B" diganti ikon yang digambar via path canvas — menara kecil &
   kristal base — warna = warna tim bila utuh, abu-abu + silang merah bila
   hancur, plus bar HP tipis & label kecil ("TOWER"/"BASE") di bawah tiap
   ikon. Berlaku untuk kedua tim (kiri = pemain, kanan = musuh).

4. **Tombol difficulty jelas & berfungsi** (ui.js, style.css, index.html):
   logika pilih-simpan sudah benar (terverifikasi jsdom: klik HARD →
   `.sel` pindah & `difficulty:'hard'` diteruskan ke `NWGame.start` →
   HP musuh ×1,2 di game). Diperkuat: `NWAudio.init()` sebelum bunyi klik
   (feedback audio langsung), `aria-pressed`, tanda ceklis pada tombol aktif (kini SVG, v10)
   via CSS, dan toast "Kesulitan: HARD" sebagai konfirmasi visual tiap tap.

5. **Layar akhir anti-tertutup overlay** (ui.js, style.css): akar masalah —
   `#rotate-overlay` (z-index 50) bisa menutupi `#screen-end` (z-index 20)
   sehingga tombol MENU UTAMA tak bisa diklik. Kini: `onEnd` langsung
   menyembunyikan rotate-overlay, dan `checkOrientation` tidak akan
   menampilkannya selama screen-end aktif. Kartu akhir juga dibatasi
   `max-height` + scroll internal di semua viewport (termasuk aturan
   `100vw` khusus mode paksa-landscape) agar tak lolos viewport.
   Terverifikasi jsdom: 5/5 skenario overlay lolos.

6. **Kartu RAHASIA Joly anti-spoiler** (ui.js `charCard`, style.css):
   BUG NYATA terkonfirmasi — kartu Joly yang masih terkunci menampilkan
   nama, jurus, dan portrait asli. Kini: nama → "???", title → "Karakter
   rahasia", jurus → "??? • ??? • ???", ULT → "ULT: ???", portrait jadi
   siluet hitam (class `.sil` kini umum, tak hanya untuk mode misteri).
   Tag RAHASIA + gembok + harga tetap tampil sebagai teaser.

7. **Gembok anti-nyasar di Naruto** (ui.js `store.isOpen`): kode render
   kartu sudah benar (gembok hanya untuk yang terkunci — terverifikasi
   jsdom), ditambah hardening: `id==='naruto'` selalu dianggap terbuka
   agar save `localStorage` versi lama yang tak memuat 'naruto' tidak
   memunculkan gembok di karakter awal.

8. **Deskripsi mode akurat** (index.html): VERSUS 1v1 "Duel + wave minion /
   Hancurkan base musuh" → "1v1 + wave minion / Hancurkan tower & base
   musuh"; WAR 3v3 "Perang tim 3 lawan 3 / dengan 2 kawan AI" → "3v3 +
   wave minion / Hancurkan tower & base musuh" (mode ini memang punya
   minion, tower, dan base). LATIHAN & SURVIVAL sudah akurat.
   Tagline "terinspirasi Naruto Senki" di layar judul TIDAK diubah
   (disengaja atas arahan Bos).

**Verifikasi:** `node test/smoke.js` 69/69 hijau; `node --check` 7 file JS OK;
kurung CSS seimbang (238/238); harness jsdom 15/15 (difficulty, kartu Joly,
gembok Naruto, alur end screen); eksekusi game sungguhan 9/9 (200 frame
tanpa throw, banner, structBars, difficulty hard); skenario overlay 5/5.

**Sisa risiko (perlu screenshot live oleh parent):** posisi bar HP vs wajah
pada sprite sheet asli per karakter (angka dihitung dari CHAR_H=120 &
skeleton NWFighter — variasi pose attack/cast bisa sedikit berbeda);
keterbacaan banner FIGHT! 72px di layar HP kecil yang ramai partikel;
tampilan ikon tower/kristal di HUD kecil; rasa "klik" tombol difficulty
di HP fisik (getar/suara); dan tampilan kartu Joly "???" yang sudah
disamarkan — semuanya butuh konfirmasi visual di HP Bos.

## 2026-10-05 — v10: perbaikan menu bertumpuk di HP (belum deploy)

**Latar:** Bos melaporkan menu (splash → sebelum main) masih bertumpuk/nabrak
di layar HP. Karakter tidak disentuh sama sekali — fokus 100% layout menu.

**Hasil audit (sebelum diperbaiki):**
- Layar judul: logo 400px × 267px + subtitle + tombol + hint = ±443px,
  melebihi ruang 344px di 740×360 → konten meluber & badge "AMOGENZ LAB"
  (kiri atas) serta footer (bawah) menabrak isi yang di tengah.
- `.screen` memakai `align-items:center; justify-content:center` +
  `overflow-y:auto` → saat konten lebih tinggi dari layar, bagian ATAS
  terpotong dan tak bisa di-scroll (bug flexbox klasik).
- `body{touch-action:none}` menular ke panel menu → panel yang meluber
  TIDAK BISA di-scroll pakai sentuhan.
- Kartu karakter: `<p>` berisi judul + daftar skill + ULT + tag harga
  sekaligus → kartu tinggi & tidak rata; `lockveil` (lingkaran gembok
  absolut) menabrak nama di kartu kecil.
- Mode paksa-landscape: viewport CSS tetap 360×740 (portrait), jadi
  `@media (max-height:430px)` TIDAK PERNAH aktif; yang aktif justru
  `@media (max-width:420px)` → char-grid 2 kolom raksasa (±357px/kartu)
  di boks 740×360 yang di-rotate → tumpuk parah + arah scroll membingungkan.
- Font banyak yang px-tetap (tidak mengecil di layar kecil); `.btn.sm`
  tingginya ±36px (< 44px); `.panel` tanpa max-height; padding tanpa
  safe-area-inset.

**Yang diperbaiki (css/style.css v9→v10, js/ui.js v9→v10, index.html):**
- Mode kompak baru `body.compactland` (diatur JS di `checkOrientation`:
  aktif bila tinggi ≤470px ATAU paksa-rotasi) — tidak bergantung media
  query, jadi berlaku identik di 740×360 maupun 360×740 paksa-landscape.
- Char/enemy-grid: 3 kolom, kartu kompak (portrait 38px + nama + harga;
  detail skill disembunyikan), lockveil diperkecil (30px).
- Mode-grid: 4 kolom × 1 baris kompak. Arena-grid: 3 kolom, preview 52px.
- Layar judul: logo dibatasi `min(300px, 44vh)` (±158×105px di 360px)
  agar tak menabrak badge/mute/footer; loading & splash dipadatkan.
- `.panel`: `max-height: calc(100dvh - safe-area - 24px)` +
  `overflow-y:auto` halus (`-webkit-overflow-scrolling:touch`,
  `overscroll-behavior:contain`); saat paksa-rotasi memakai `100vw`
  (karena 100dvh = 740 = viewport portrait, bukan tinggi boks rotasi).
- `.screen > *{margin-top:auto;margin-bottom:auto}` → tetap di tengah saat
  muat, bisa di-scroll penuh saat meluber (atas tak lagi terpotong).
- `touch-action:pan-y` di `.screen`/`.panel` → scroll sentuh berfungsi
  walau `body{touch-action:none}` (kontrol game tak terpengaruh).
- Font memakai `clamp()` di tombol, kartu, judul, badge, hint, dsb.
- Semua `.btn` min-height 44px (termasuk `.btn.sm`); padding
  `.screen` memakai `env(safe-area-inset-*)`; hierarki primer vs ghost
  dipertahankan.
- Struktur kartu di `ui.js`: `<p class="card-detail">` (bisa
  disembunyikan) + `.locktag` harga dipindah ke luar `<p>`.
- Versi cache-bust naik: `css/style.css?v=10`, `js/ui.js?v=10`
  (tidak pakai ulang v9).

**Verifikasi (tanpa live browser):** simulasi aritmetika layout
30/30 lolos untuk kedua viewport (mode & arena muat tanpa scroll;
select/enemy 8 kartu → 3 baris → scroll halus internal, tanpa overlap);
`node test/smoke.js` 69/69 hijau; sintaks `ui.js` OK; kurung kurawal
CSS seimbang (234/234).

**Sisa risiko (perlu screenshot live oleh parent):** render font Bungee
asli (lebar aktual bisa beda dari estimasi), teks stepnum layar lawan
yang panjang ("2/3 • LAWAN MISTERIUS — KETUK UNTUK MENGUNGKAP") bila
wrap 2 baris, dan perilaku scroll sentuh sungguhan di HP Bos —
khususnya layar PILIH NINJA & PILIH LAWAN di 740×360 dan 360×740
paksa-landscape.

## 2026-10-05 — Rework besar v8 (belum deploy)

**Atas evaluasi Bos: kualitas di atas kecepatan.** Target = clone Naruto
Senki versi web.

- **Sprite frame-by-frame baru**: 6 karakter digambar ulang sebagai sprite
  sheet anime gaya Naruto Senki (30 frame/karakter: idle, lari, kombo
  3 hit, cast jutsu, kena-hit, kalah, menang) + 34 frame efek jutsu
  (rasengan, chidori, katon, ledakan, heal, slash). Itachi menyusul
  setelah 3x generate gagal (masalah teknis, bukan kualitas).
- **Kontrol ala Naruto Senki**: 1 joystick + tombol ATTACK besar +
  3 jutsu + 1 ultimate. Tombol dash/block dihapus; dash via ketuk 2× arah.
  Attack 100% manual, tanpa auto-attack.
- **Scaling landscape pas HP**: canvas DPR-aware, scale-to-fit + letterbox,
  HUD & tombol anchor relatif (bukan pixel tetap), aman dari notch
  (safe-area-inset), target sentuh min 48px.
- **HUD premium**: portrait + nama + julukan, HP dua lapis, pip ronde,
  timer tengah, penghitung kombo, damage number.
- **Juice**: hit-spark, banner FIGHT!/K.O!/GUARD BREAK!, screen-shake
  ultimate, bayangan lembut, hitstop 70ms, easing serangan.
- **Alur setup 3 langkah**: Player → Lawan (siluet ???) → Arena.
- **Training**: dummy + guard meter.
- **Tombol fullscreen** di HUD (pola AMOGENZ LAB) + tombol toggle orientasi.
- **Favicon**: shuriken kuning (32px & 180px); logo NARUTO WAR tetap
  untuk branding besar; logo AMOGENZ LAB sebagai badge produser.
- **Perbaikan bug QA**: tombol MULAI BERTARUNG kini responsif 1 klik;
  karakter terkunci ada ikon gembok + "butuh X koin"; logo 木 tidak
  lagi menutupi karakter; kartu Joly memakai portrait yang benar.
- **GitHub**: kode di-push ke https://github.com/amogenz/narutowar
- **Dokumentasi**: README, CARA-BERMAIN, ASSETS, CHANGELOG (file ini).

## 2026-10-05 — v7: deploy perdana

- Game 2D canvas ala Naruto Senki live di https://naruto.amogenz.xyz/
- 8 karakter (renderer vektor prosedural), 4 mode (training/versus/war/survival),
  3 arena parallax, AI lawan & kawan, progresi koin (localStorage).
- Logo utama NARUTO WAR + splash "A PRODUCTION BY AMOGENZ LAB".
- PROJECT GUARD terdaftar (`naruto-war`): HTML no-cache, aset `?v=`,
  `version.json` tiap deploy.

## Rencana berikutnya

- Sprite Itachi final + verifikasi visual semua karakter di HP.
- Screenshot verifikasi tiap layar di produksi (layar kecil & besar).
- Konfirmasi Bos di HP fisik = definisi SELESAI.
