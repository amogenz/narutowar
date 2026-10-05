# CHANGELOG — Naruto War by Amogenz Lab

Riwayat perubahan game per milestone. Format: tanggal — ringkasan.

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
