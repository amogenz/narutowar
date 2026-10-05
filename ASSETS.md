# ASSETS — Naruto War by Amogenz Lab

Daftar semua aset game: dari mana asalnya dan lisensinya.
Prinsip: **tidak memakai karya orang lain tanpa izin** — semua aset
utama dibuat sendiri khusus untuk game ini.

## Gambar buatan sendiri (original, bebas dipakai untuk proyek ini)

| Aset | File | Dibuat dengan |
|---|---|---|
| Logo utama NARUTO WAR | `assets/logo-naruto-war-web.jpg` (+ master `logo-naruto-war.png`) | AI image generator, 2026-10-05 |
| Favicon shuriken kuning | `assets/icon-32.png`, `assets/icon-180.png` (dari `icon.svg`) | Digambar manual via kode (PIL), 2026-10-05 |
| Key art layar judul | `assets/title-art.jpg` | AI image generator, 2026-10-05 |
| Portrait 8 karakter | `assets/portraits/*.png` | AI image generator, 2026-10-05 |
| **Sprite sheet 6 karakter** (30 frame/karakter: idle, lari, kombo 3 hit, cast, kena-hit, kalah, menang) | `assets/sprites/naruto.png`, `sasuke.png`, `kakashi.png`, `sakura.png`, `itachi.png`, `joly.png` (+ strip deploy `*_r0.._r9.png`) | AI image generator + post-processing manual (skrip `assets/sprites/_src/process.py`), 2026-10-05 |
| Efek jutsu (rasengan, chidori, katon, ledakan, heal, slash — 34 frame) | `assets/sprites/fx.png` (+ strip `fx_r0.._r5.png`) | AI image generator + post-processing, 2026-10-05 |

Detail gaya & palet: `assets/sprites/STYLE_GUIDE.md`.
Detail teknis: `assets/sprites/CONTRACT.md`.

## Aset milik AMOGENZ (proyek sendiri, bebas dipakai)

| Aset | File | Sumber |
|---|---|---|
| Logo AMOGENZ LAB (badge produser) | `assets/icon-lab-v2.jpg` | Proyek AMOGENZ LAB (dibuat 2026-10-05) |
| Foto Joly berpeci (referensi maskot) | `assets/foto-peci.webp` | Proyek AMOGENZ 3D |
| Logo komunitas (dekorasi arena) | `assets/logos/*.webp` | Proyek AMOGENZ |
| Poster Pain & Zetsu (dekorasi arena Akatsuki) | `assets/poster-pain.webp`, `assets/poster-zetsu.webp` | Dibuat untuk AMOGENZ, 2026-10-04 |

## Referensi Dunia (riset gaya & komposisi, 2026-10-05)

Ringkasan teknik dari pencarian referensi (inspirasi komposisi saja —
**tidak mengambil file** dari sumber mana pun):

1. **Valley of the End** — komposisi ikonik: dua patung raksasa (Hashirama vs
 Madara, pose "Seal of Confrontation") mengapit air terjun di tengah lembah
 curam. Diterapkan di `lembah_far_*.jpg` (patung) + `lembah_mid_*.jpg`
 (air terjun & sungai).
 Sumber fakta: https://naruto.fandom.com/wiki/Valley_of_the_End
2. **Parallax 3 lapis** — teknik standar game 2D: `sky` (paling jauh, gerak
 paling lambat/statis), `far` (siluet gunung/tebing), `mid` (elemen dekat:
 gerbang, pohon, air terjun) — tiap lapis digerakkan dengan kecepatan
 berbeda mengikuti kamera.
 Sumber teknik: https://github.com/pixelnest/pixelnest.github.io/blob/master/tutorials/2d-game-unity/parallax-scrolling/index.md
3. **Chroma-key magenta** — semua sprite & dekorasi memakai background
 `#FF00FF` murni mengikuti konvensi `js/sprite.js` game ini.

## Art dunia (original, dibuat khusus untuk game ini, 2026-10-05)

Dibuat via AI image generator (media pipeline) + post-processing manual
(crop, kompresi JPG/PNG, normalisasi background ke `#FF00FF` murni).
Gaya: cel-shading anime, outline hitam tegas, warna flat saturated —
kohesif dengan `assets/sprites/STYLE_GUIDE.md`. **Tidak ada** yang diambil
dari internet. File mentah generator: `assets/world/_gen/`.

Batas keras: tiap file < 55 KB (limit upload Vercel). Lapis `far`/`mid`
yang tidak muat 1920×540 dalam kualitas layak **dipecah jadi 2 file**
kiri (`_a`) + kanan (`_b`) — game menggambar keduanya berdampingan.

| Arena | Lapis | File | Dimensi | Ukuran |
|---|---|---|---|---|
| Konoha | sky | `assets/world/konoha_sky.jpg` | 896×504 | 53,4 KB |
| Konoha | far | `assets/world/konoha_far_a.jpg`, `konoha_far_b.jpg` | 2× 854×480 | 53,2 / 52,3 KB |
| Konoha | mid | `assets/world/konoha_mid_a.jpg`, `konoha_mid_b.jpg` | 2× 960×540 | 53,7 / 52,5 KB |
| Lembah Akhir | sky | `assets/world/lembah_sky.jpg` | 864×486 | 51,8 KB |
| Lembah Akhir | far | `assets/world/lembah_far_a.jpg`, `lembah_far_b.jpg` | 2× 768×432 | 51,3 / 51,8 KB |
| Lembah Akhir | mid | `assets/world/lembah_mid_a.jpg`, `lembah_mid_b.jpg` | 2× 854×480 | 53,3 / 52,3 KB |
| Akatsuki | sky | `assets/world/akatsuki_sky.jpg` | 960×540 | 40,1 KB |
| Akatsuki | far | `assets/world/akatsuki_far_a.jpg`, `akatsuki_far_b.jpg` | 2× 960×540 | 40,5 / 40,8 KB |
| Akatsuki | mid | `assets/world/akatsuki_mid_a.jpg`, `akatsuki_mid_b.jpg` | 2× 960×540 | 38,4 / 35,6 KB |

Isi tiap arena: Konoha = langit siang + tebing patung Hokage + gerbang kayu
& sakura; Lembah Akhir = langit senja + dua patung raksasa berhadapan +
air terjun & sungai; Akatsuki = langit malam + bulan merah besar + tebing
gelap + pohon mati.

## Lantai arena v15 (2026-10-06) — menggantikan flat color

Dibuat via AI image generator (media pipeline) + post-processing
(`assets/world/_process_v15.py`: crop 960×150 + **tileable horizontal**
via crossfade ke salinan bergeser setengah lebar, kuantisasi palet
dither=NONE). Gaya: cel-shading anime, outline hitam tegas, warna flat
saturated — kohesif dengan `assets/sprites/STYLE_GUIDE.md`. Tidak ada yang
diambil dari internet. File mentah: `assets/world/_gen3/`. Dirender engine
di parallax 1x (lapisan paling depan, di bawah mid).

| Arena | File | Dimensi | Ukuran | Isi |
|---|---|---|---|---|
| Konoha | `assets/world/konoha_ground.png` | 960×150 | 37,6 KB | jalan tanah terang + rumput tepi hijau + kerikil + kelopak sakura |
| Lembah Akhir | `assets/world/lembah_ground.png` | 960×150 | 51,3 KB | tanah oranye senja + batu sungai abu + rumput liar |
| Akatsuki | `assets/world/akatsuki_ground.png` | 960×150 | 44,7 KB | tanah malam biru-ungu + batu gelap + retakan merah menyala |

## Dekorasi arena v15 (2026-10-06)

Post-processing: `assets/world/_process_v15b.py` — normalisasi bg ke
`#FF00FF` murni (flood hue 285–315) + trim + resize + kuantisasi dengan
satu entri palet dipaksa `#FF00FF` persis. File mentah: `_gen3/`.

| Dekorasi | File | Dimensi | Ukuran | Catatan |
|---|---|---|---|---|
| Gerbang torii kecil (Konoha) | `assets/world/konoha_torii.png` | 340×300 | 17,3 KB | bg `#FF00FF`, kayu merah-cokelat + tali shimenawa |
| Semak sakura (Konoha) | `assets/world/konoha_sakura_bush.png` | 340×284 | 40,8 KB | bg `#FF00FF`, rumpun bunga sakura pink |
| Batu sungai besar (Lembah) | `assets/world/lembah_boulder.png` | 340×255 | 21,0 KB | bg `#FF00FF`, batu oranye-abu + rumput di kaki |
| Rumpun rumput liar (Lembah) | `assets/world/lembah_grass.png` | 300×299 | 27,3 KB | bg `#FF00FF`, ilalang + bunga kuning kecil |
| Stalagmit gelap (Akatsuki) | `assets/world/akatsuki_stalagmite.png` | 300×383 | 26,1 KB | bg `#FF00FF`, 4 menara batu biru-ungu + retakan merah |
| Tumpukan batu tajam (Akatsuki) | `assets/world/akatsuki_rockpile.png` | 320×286 | 21,5 KB | bg `#FF00FF`, batu angular + 1 retakan merah |

## Dekorasi lama (v14)

| Dekorasi | File | Dimensi | Ukuran | Catatan |
|---|---|---|---|---|
| Lampion merah | `assets/world/lantern.png` | 231×384 | 22,0 KB | bg `#FF00FF` |
| Spanduk LAB (monogram A hijau neon) | `assets/world/banner_lab.png` | 416×280 | 23,6 KB | bg `#FF00FF` |
| Pohon sakura | `assets/world/sakura_tree.png` | 224×220 | 28,1 KB | bg `#FF00FF` |

| Ambient (strip 4 frame) | File | Dimensi | Ukuran | Catatan |
|---|---|---|---|---|
| Kelopak sakura jatuh | `assets/world/petal.png` | 512×128 (4×128px) | 24,4 KB | bg `#FF00FF` |
| Kunang-kunang | `assets/world/firefly.png` | 512×128 (4×128px) | 25,2 KB | bg `#FF00FF` |
| Kilau air | `assets/world/sparkle.png` | 512×128 (4×128px) | 25,0 KB | bg `#FF00FF` |
| Awan bergerak | `assets/world/cloud.png` | 640×160 (4×160px) | 24,3 KB | bg `#FF00FF` |

## Tower, Base, Dummy & Minion (original, 2026-10-05)

Menggantikan placeholder produksi (kotak biru polos / stickman). File mentah:
`assets/world/_gen2/`. Semua PNG bg `#FF00FF` (chroma-key, konsisten dengan
sprite karakter).

| Aset | File | Dimensi | Ukuran | Catatan |
|---|---|---|---|---|
| Menara tim pemain (utuh) | `assets/world/tower_ally.png` | 92×220 | 14,0 KB | menara kayu, atap hijau, spanduk biru |
| Menara tim pemain (rusak) | `assets/world/tower_ally_broken.png` | 219×150 | 31,2 KB | reruntuhan |
| Menara tim musuh (utuh) | `assets/world/tower_foe.png` | 111×220 | 13,8 KB | menara kayu, atap & bendera merah |
| Menara tim musuh (rusak) | `assets/world/tower_foe_broken.png` | 430×150 | 49,9 KB | reruntuhan |
| Base kristal pemain (utuh) | `assets/world/base_ally.png` | 114×160 | 12,6 KB | kristal biru di pedestal batu |
| Base kristal pemain (rusak) | `assets/world/base_ally_broken.png` | 160×149 | 18,3 KB | pecahan kristal |
| Base kristal musuh (utuh) | `assets/world/base_foe.png` | 105×160 | 13,2 KB | kristal merah di pedestal batu |
| Base kristal musuh (rusak) | `assets/world/base_foe_broken.png` | 160×130 | 18,6 KB | pecahan kristal |
| Boneka kayu latihan | `assets/world/dummy.png` | 102×200 | 14,5 KB | target lingkaran merah di dada |
| Boneka kayu (terpukul) | `assets/world/dummy_hit.png` | 182×200 | 30,2 KB | miring + efek impact |
| Minion genin tim biru | `assets/world/minion_ally.png` | 512×128 (4×128px) | 32,9 KB | chibi, ikat kepala biru, kunai |
| Minion genin tim merah | `assets/world/minion_foe.png` | 512×128 (4×128px) | 35,2 KB | chibi, ikat kepala merah, kunai |

## NPC dekorasi Konoha (original, 2026-10-06)

Menggantikan placeholder stickman di area tepi/base. Hanya dekorasi —
tidak mengganggu gameplay. Sheet horizontal, ukuran frame 64×96 px,
kaki menapak di tepi bawah sel, background `#FF00FF` murni (chroma-key
otomatis oleh `js/sprite.js`), tanpa teks & tanpa watermark. File mentah
generator disimpan sementara di `/tmp/npc_gen/` (bukan repo);
skrip post-processing: `/tmp/npc_build.py`.

Metode: generate 1 gambar strip per aset via media pipeline
(`media.generate_image`: prompt "sprite sheet ... cel-shading ... bold
outline ... solid pure magenta #FF00FF background ... no text, no watermark"),
lalu potong otomatis jadi sel 64×96 dengan PIL (deteksi kolom murni magenta,
crop ketat karakter, paste kaki di bawah sel), normalisasi bg ke
`#FF00FF` murni (aturan hue 285–315 seperti STYLE_GUIDE §5),
simpan PNG palet `dither=NONE`.

| NPC | File | Dimensi / frame | Ukuran | Frame & animasi |
|---|---|---|---|---|
| Warga desa (pria & wanita) | `assets/world/npc/npc_villager.png` | 192×192 (2 baris × 3 × 64×96) | 14,5 KB | Baris 0 = pria (jaket cokelat): idle napas 3 frame; baris 1 = wanita (dress hijau): idle napas 3 frame |
| Ninja penjaga | `assets/world/npc/npc_guard.png` | 256×96 (4 × 64×96) | 11,4 KB | frame 0–1 idle napas (ikat kepala logam Konoha, rompi chunin hijau), 2 melambai, 3 hormat |
| Anak kecil | `assets/world/npc/npc_kid.png` | 192×96 (3 × 64×96) | 8,2 KB | jongkok → lompat tertinggi → mendarat, loop; kaos oranye, celana biru |

## Suara

Tidak ada file audio — semua suara (klik tombol, pukulan, ledakan,
musik latar sederhana) dibuat **langsung via WebAudio** di `js/audio.js`
(sintesis kode, tanpa sampel dari luar). Bebas lisensi.

## Aset internet / pihak ketiga

**Tidak ada.** Semua gambar & suara di game ini dibuat khusus untuk
Naruto War. Referensi gaya visual: game fan-made *Naruto Senki*
(ZAKUME) — hanya sebagai inspirasi gaya, bukan mengambil file-nya.

> Bila suatu hari memakai aset luar (mis. SFX CC0 dari OpenGameArt),
> catat di sini: nama aset, URL sumber, dan lisensinya
> (mis. CC0 / CC-BY + nama pembuat).
