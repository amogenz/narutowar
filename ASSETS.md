# ASSETS — Naruto War by Amogenz Lab

Daftar semua aset game: dari mana asalnya dan lisensinya.
Prinsip: **tidak memakai karya orang lain tanpa izin** — semua aset
utama dibuat sendiri khusus untuk game ini.

## 🖼️ Gambar buatan sendiri (original, bebas dipakai untuk proyek ini)

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

## 🏢 Aset milik AMOGENZ (proyek sendiri, bebas dipakai)

| Aset | File | Sumber |
|---|---|---|
| Logo AMOGENZ LAB (badge produser) | `assets/icon-lab-v2.jpg` | Proyek AMOGENZ LAB (dibuat 2026-10-05) |
| Foto Joly berpeci (referensi maskot) | `assets/foto-peci.webp` | Proyek AMOGENZ 3D |
| Logo komunitas (dekorasi arena) | `assets/logos/*.webp` | Proyek AMOGENZ |
| Poster Pain & Zetsu (dekorasi arena Akatsuki) | `assets/poster-pain.webp`, `assets/poster-zetsu.webp` | Dibuat untuk AMOGENZ, 2026-10-04 |

## 🔊 Suara

Tidak ada file audio — semua suara (klik tombol, pukulan, ledakan,
musik latar sederhana) dibuat **langsung via WebAudio** di `js/audio.js`
(sintesis kode, tanpa sampel dari luar). Bebas lisensi.

## 🌐 Aset internet / pihak ketiga

**Tidak ada.** Semua gambar & suara di game ini dibuat khusus untuk
Naruto War. Referensi gaya visual: game fan-made *Naruto Senki*
(ZAKUME) — hanya sebagai inspirasi gaya, bukan mengambil file-nya.

> Bila suatu hari memakai aset luar (mis. SFX CC0 dari OpenGameArt),
> catat di sini: nama aset, URL sumber, dan lisensinya
> (mis. CC0 / CC-BY + nama pembuat).
