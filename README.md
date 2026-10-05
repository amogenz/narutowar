# NARUTO WAR by Amogenz Lab

Game pertarungan ninja 2D ala **Naruto Senki** yang bisa dimainkan langsung
dari browser HP — tanpa install APK. Pilih ninjamu, keluarkan jutsu, dan
hancurkan tower serta base lawan!

🌐 **Mainkan:** https://naruto.amogenz.xyz/
💻 **Kode sumber:** https://github.com/amogenz/narutowar

## Fitur

- **8 karakter ninja** — Naruto, Sasuke, Kakashi, Sakura, Rock Lee, Gaara,
  Itachi, plus karakter rahasia **Joly** (maskot AMOGENZ LAB berpeci).
  Tiap karakter punya 3 jutsu + 1 ultimate dengan animasi frame-by-frame.
- **4 mode permainan** — Training (latihan lawan boneka kayu), Versus 1v1,
  War 3v3 (bareng 2 ninja AI), Survival (bertahan dari 8 gelombang).
- **Gameplay ala Naruto Senki** — arena lane 2D, minion (genin kecil) muncul
  bergelombang dari tiap base, 2 tower + 1 base per sisi yang hancur
  berurutan, sistem chakra & cooldown jutsu, AI lawan & kawan.
- **Kontrol manual penuh** — tanpa auto-attack. Joystick virtual + tombol
  ATTACK besar + 3 tombol jutsu + 1 tombol ultimate. Dash dengan ketuk
  2× arah pada joystick.
- **Dipaksa landscape otomatis** — game selalu pas di layar HP miring,
  lengkap dengan tombol toggle orientasi & fullscreen di HUD.
- **Juice premium** — hit-spark tiap pukulan kena, angka damage melayang,
  penghitung kombo, banner FIGHT! / K.O. / GUARD BREAK!, screen-shake saat
  ultimate, bayangan lembut di bawah karakter.
- **Progresi** — menangkan match untuk dapat koin, buka karakter terkunci
  (tersimpan di HP, tidak hilang walau browser ditutup).
- **Ringan & cepat** — tanpa library berat, sprite di-cache, target 60fps
  di HP kelas menengah.

## Cara menjalankan di komputer sendiri

Butuh: Python 3 (atau server file statis apa saja).

```bash
cd naruto-war
python3 -m http.server 8901
```

Lalu buka di browser: **http://localhost:8901**
(atau dari HP satu WiFi: `http://<ip-komputer>:8901`)

Tidak perlu install apa-apa — game 100% file statis (HTML + CSS + JS + gambar).

## Cara deploy ke Vercel

Deploy memakai skrip khusus (bukan git push), karena file di-upload
satu per satu ke API Vercel:

```bash
python3 ~/workspace/naruto-war-deploy/deploy.py
```

Syarat sebelum deploy (aturan PROJECT GUARD):
1. `python3 ~/workspace/tools/project_guard.py --check naruto-war`
2. Setiap file yang isinya berubah → naikkan nomor `?v=` di `index.html`
3. Setelah deploy → update `version.json` (timestamp build baru)

> **Batas penting:** tiap file yang di-upload wajib **< ±96KB**
> (keterbatasan API). Sprite sheet karakter yang besar (±415KB) dipecah
> menjadi strip-strip kecil (`naruto_r0.png` … `naruto_r9.png`, ±40KB)
> yang dirangkai kembali oleh `js/sprite.js` saat game dimuat.

## Struktur folder

```
naruto-war/
├── index.html            # Satu-satunya halaman: semua layar game
│                         # (loading, judul, pilih mode/karakter/lawan/arena,
│                         #  HUD, hasil). HTML selalu no-cache.
├── vercel.json           # Aturan Vercel: HTML no-cache, aset boleh di-cache
├── version.json          # Nomor build — memicu banner "pembaruan tersedia"
├── README.md             # File ini
├── CARA-BERMAIN.md       # Panduan main untuk pemain
├── ASSETS.md             # Daftar aset + sumber & lisensi
├── CHANGELOG.md          # Riwayat perubahan per milestone
├── css/
│   └── style.css         # Semua tampilan (pakai ?v= tiap berubah)
├── js/
│   ├── data.js           # Data karakter, jurus, arena, harga koin
│   ├── sprite.js         # Pemuat sprite strip + animasi frame-by-frame
│   ├── fighter.js        # Gambar ninja cadangan (bila sprite gagal dimuat)
│   ├── game.js           # Mesin game: arena, tower, minion, AI, fisika
│   ├── ui.js             # Layar menu, HUD, tombol sentuh, joystick
│   ├── audio.js          # Suara via WebAudio (tanpa file audio)
│   └── main.js           # Titik masuk: resize canvas & mulai game
├── test/
│   ├── smoke.js          # 69 tes fungsi inti (jalan via node)
│   └── integration.js    # 27 tes simulasi battle headless
└── assets/
    ├── logo-naruto-war-web.jpg  # Logo utama (layar judul)
    ├── icon-32.png / icon-180.png # Favicon shuriken kuning
    ├── icon-lab-v2.jpg   # Logo AMOGENZ LAB (badge produser)
    ├── title-art.jpg     # Gambar latar menu
    ├── portraits/        # Foto tiap karakter (layar pilih)
    ├── logos/            # Logo komunitas (dekorasi arena)
    ├── poster-pain.webp / poster-zetsu.webp  # Dekorasi arena Akatsuki
    └── sprites/          # Sprite sheet frame-by-frame (lihat CONTRACT.md)
        ├── naruto.png, sasuke.png, …  # Master utuh (arsip, tidak di-deploy)
        ├── *_r0.png … *_r9.png        # Strip deploy (< 60KB per file)
        ├── fx_r0.png … fx_r5.png      # Strip efek jutsu
        ├── CONTRACT.md   # Aturan teknis sprite (untuk programmer & artis)
        └── STYLE_GUIDE.md# Aturan gaya gambar agar seragam
```

## Menjalankan tes

```bash
node --check js/*.js        # cek sintaks semua file JS
node test/smoke.js          # 69 tes inti
node test/integration.js    # 27 tes simulasi battle
```

## Catatan

Game fan-made untuk komunitas — bukan produk resmi Naruto.
"A PRODUCTION BY AMOGENZ LAB".
