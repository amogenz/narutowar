# CARA BERMAIN — Naruto War by Amogenz Lab

## Tujuan permainan

Kalahkan tim lawan dengan cara menghancurkan **2 tower** lalu **base utama**
mereka. Tim yang base-nya hancur duluan = kalah. Sambil itu, jaga base-mu
sendiri!

Setiap beberapa detik, **minion** (ninja kecil) keluar dari base tiap tim
dan berjalan menyerang ke arah lawan. Manfaatkan mereka untuk mendorong
bersama!

## Kontrol di HP (layar sentuh)

| Kontrol | Cara pakai |
|---|---|
| **Joystick** (kiri bawah) | Geser untuk gerak. **Ketuk 2× cepat ke satu arah** = dash (ngelesat + kebal sesaat) |
| **ATTACK** (kanan bawah, tombol besar) | Serang. Tekan 3× berurutan = kombo 3 hit (pukulan → tendangan → tebasan kunai) |
| **J1 / J2 / J3** | 3 jutsu karakter (butuh chakra, ada cooldown) |
| **ULT** | Ultimate — jurus pamungkas, cooldown lama, layar ikut bergetar! |
| ikon putar (HUD atas) | Kunci / lepas orientasi landscape |
| ikon layar penuh (HUD atas) | Masuk / keluar layar penuh |
| ikon suara / ikon tutup (X) | Suara / keluar ke menu |

> Semua serangan **manual** — tidak ada auto-attack. Kamu yang menekan,
> kamu yang menang!

## Kontrol di keyboard (komputer)

| Tombol | Fungsi |
|---|---|
| WASD / Panah | Gerak |
| Spasi | Attack (3× = kombo) |
| Z / X / C | Jutsu 1 / 2 / 3 |
| U | Ultimate |
| Shift / ketuk 2× arah | Dash |

## Mode permainan

1. **Training** — latihan bebas lawan boneka kayu. Boneka punya
 **guard meter** (biru): pukul terus sampai habis → **GUARD BREAK!**
 (damage +50% selama 2 detik). Cocok untuk menghafal kombo.
2. **Versus 1v1** — duel lawan CPU. Pilih tingkat kesulitan Normal/Hard.
3. **War 3v3** — perang tim! Kamu + 2 ninja AI melawan 3 ninja AI.
 Fokus: dorong lane bareng minion, hancurkan tower berurutan.
4. **Survival** — bertahan dari 8 gelombang musuh yang makin kuat.
 Kalah = game over, skor = gelombang tertinggi.

## Karakter & jurus

| Karakter | Buka | 3 Jutsu | Ultimate |
|---|---|---|---|
| Naruto Uzumaki | Gratis | Rasengan, Kage Bunshin, Fuuton: Renkudan | Bijuudama |
| Sakura Haruno | 50 koin | Pukulan Sakura, Shousen Jutsu, Gelombang Kejut | Byakugou |
| Rock Lee | 100 koin | Konoha Senpuu, Gerbang 1, Omote Renge | Asa Kujaku |
| Kakashi Hatake | 150 koin | Raikiri, Suiton: Suijinheki, Doton: Dinding Tanah | Kamui |
| Sasuke Uchiha | 200 koin | Chidori, Katon: Goukakyuu, Amaterasu | Susanoo Slash |
| Gaara | 250 koin | Sabaku Kyuu, Perisai Pasir, Sabaku Taisou | Sabaku Saitaisou |
| Itachi Uchiha | 300 koin | Tsukuyomi, Amaterasu, Katon: Goukakyuu | Susanoo |
| **Joly** (rahasia!) | 400 koin | Peci Spin, Gelombang Telepati, Langkah Joly | Amogenz Barrage |

Koin didapat tiap menang match. Karakter terkunci ditandai gembok —
ketuk kartunya untuk lihat butuh berapa koin.

## Tips menang

1. **Jangan serang tower sendirian** — tunggu minion-mu memancing
 tembakan tower, baru maju. Tower sakit!
2. **Hemat chakra** — jutsu kuat tapi cooldown lama. Pakai attack biasa
 untuk cicil, jutsu untuk finishing.
3. **Dash itu nyawa** — dash memberi jeda kebal sesaat. Pakai untuk
 kabur saat HP sekarat atau menghindari ultimate lawan.
4. **Ultimate di momen pas** — tunggu lawan bergerombol (atau tower
 + minion sejajar), baru keluarkan. Efeknya area!
5. **Di mode War, jangan maju sendirian** — ikuti minion & kawan AI,
 fokus satu lane sampai tower pecah.
6. **Perhatikan guard break di training** — biasakan menghafal urutan
 kombo + jutsu sebelum masuk Versus.

## Musik & suara

- **MUSIK** — musik latar: tenang-heroik di menu, tempo cepat saat
  bertarung, jingle heroik saat menang. Semua komposisi **original**
  (bukan OST Naruto) — dibuat langsung di HP/browser via WebAudio.
- **SUARA** — efek: pukulan, jutsu, ledakan, klik tombol.
- Atur di layar **judul** (tombol **PENGATURAN**) atau **menu JEDA**
  (tombol pause saat bertarung): `MUSIK: ON/OFF` dan `SUARA: ON/OFF`.
  Pilihan tersimpan otomatis di HP/browser.
- Musik berhenti saat game di-pause, lanjut lagi saat resume.
- Musik menu mulai diputar setelah ketukan pertama (ketuk layar splash)
  — aturan autoplay browser.

### Musik file sendiri (opsional, untuk yang punya file legal)

Taruh `menu.mp3` / `battle.mp3` / `victory.mp3` di `assets/music/` —
game otomatis memakai file itu; bila tidak ada, synth bawaan yang
dipakai. Cara kerjanya: setiap jenis musik dicek dulu lewat permintaan
`HEAD` ke `assets/music/<jenis>.mp3`; kalau server menjawab **200**
(file ada) → file MP3 diputar looping; kalau **404** (tak ada) →
komposisi synth bawaan yang dipakai. Hasil cek disimpan selama sesi
berjalan.

**Jangan pakai OST berhak cipta, dan jangan ambil audio dari Instagram**
— hanya pakai file yang kamu punya haknya (buatan sendiri / bebas
lisensi).

## Stage

Pilih arena di layar **PILIH ARENA**: ketuk thumbnail untuk melihat
preview besar + deskripsi, lalu tekan **MULAI BERTARUNG**. Stage yang
masih digembok bertuliskan **SEGERA HADIR**.

Selamat bertarung, ninja! 
