# KONTRAK SPRITE SHEET — Naruto War by Amogenz Lab

Dokumen ini dibaca tim ART (pembuat gambar) dan tim CODE (loader: `js/sprite.js`).
Background WAJIB magenta murni **#FF00FF** — loader mengubahnya jadi transparan
otomatis (chroma-key, toleransi kecil: R≥200, B≥200, G≤110).

> **PENTING — FORMAT DEPLOY (batas upload Vercel ±96KB/file):**
> Sheet UTUH (1536×1280, ±415KB) TIDAK bisa di-upload langsung.
> Yang di-deploy adalah **STRIP**: tiap sheet utuh dipotong menjadi
> strip-strip kecil (< 60KB), loader (`js/sprite.js`) memuat & merangkainya
> kembali menjadi 30 frame. File sheet utuh tetap disimpan di repo sebagai
> master, tapi TIDAK ikut deploy.

## 1. Sheet karakter — master `assets/sprites/<id>.png`, deploy strip `<id>_r0.._r9.png`

Contoh master: `naruto.png`; contoh strip deploy: `naruto_r0.png` … `naruto_r9.png`

| Aturan | Nilai |
|---|---|
| Ukuran file | 1536 × 1280 px (6 kolom × 5 baris) |
| Ukuran sel | **256 × 256 px** |
| Arah hadap | **ke KANAN** (game membalik otomatis bila ke kiri) |
| Posisi kaki | **di tepi BAWAH sel** (game menempelkan bawah sel ke tanah) |
| Ukuran karakter | isi ~70–80% tinggi sel (±180–205 px), kaki napak bawah |
| Urutan frame | **row-major**: baris 0 = idx 0–5, baris 1 = idx 6–11, dst. |

### Format strip untuk deploy

Tiap sheet utuh dipotong menjadi **10 strip**: `<id>_r<b>.png`
(b = 0..9), tiap strip 768×256 px berisi **3 frame berurutan**
(row-major global): strip b → frame global `[b*3 .. b*3+2]`.
Contoh: `naruto_r0.png` = frame 0,1,2 (idle0–2);
`naruto_r9.png` = frame 27,28,29 (win1, spare, spare).
Ukuran tiap strip ±35–55 KB (aman di bawah batas upload).
Loader memuat 10 strip via `Promise.all` lalu merangkai jadi 30 frame;
bila SATU strip saja gagal → karakter fallback ke renderer prosedural.

### Peta frame (indeks row-major)

```
idx  0  1  2  3  4  5   <- baris 0
idx  6  7  8  9 10 11   <- baris 1
idx 12 13 14 15 16 17   <- baris 2
idx 18 19 20 21 22 23   <- baris 3
idx 24 25 26 27 28 29   <- baris 4
```

| Animasi | Indeks | Jumlah | Kecepatan di game |
|---|---|---|---|
| idle (diam/napas) | 0–3 | 4 | 8 fps, loop |
| run (lari) | 4–9 | 6 | 12 fps, loop |
| atk1 (pukulan kombo-1) | 10–12 | 3 | 15 fps |
| atk2 (tendangan kombo-2) | 13–15 | 3 | 15 fps |
| atk3 (tebasan kunai kombo-3) | 16–18 | 3 | 15 fps |
| cast (segel tangan jutsu) | 19–21 | 3 | 8 fps |
| hit (terpukul) | 22–23 | 2 | 10 fps |
| dead (kalah) | 24–25 | 2 | 4 fps, **berhenti di frame terakhir** |
| win (menang) | 26–27 | 2 | 6 fps, loop |
| spare (cadangan) | 28–29 | 2 | tidak dipakai |

Catatan:
- Serangan kombo game = 3 hit berurutan (atk1 → atk2 → atk3).
- Pose `dead` tidak loop: frame 25 ditahan sampai respawn.

## 2. Sheet FX jutsu — master `assets/sprites/fx.png`, deploy strip `fx_r0.._r5.png`

| Aturan | Nilai |
|---|---|
| Ukuran sel | **128 × 128 px** |
| Kolom | **6 kolom** (baris bebas, minimal 6 baris untuk peta di bawah) |
| Background | magenta #FF00FF |
| Urutan | row-major per efek (sel berurutan) |

### Format strip FX untuk deploy

`fx.png` (768×768) dipotong menjadi **6 strip**: `fx_r<b>.png`
(b = 0..5), tiap strip 768×128 px berisi **6 frame berurutan**:
strip b → frame global `[b*6 .. b*6+5]`. Ukuran tiap strip ±7–34 KB.

### Peta efek (indeks row-major)

| Nama efek | Indeks | Frame | Dipakai untuk |
|---|---|---|---|
| `rasengan` | 0–5 | 6 | Rasengan Naruto (proyektil) |
| `chidori` | 6–11 | 6 | Chidori/Raikiri (cadangan) |
| `katon` | 12–17 | 6 | Katon Goukakyuu (proyektil api) |
| `explosion` | 18–25 | 8 | Ledakan ultimate / nova |
| `heal` | 26–29 | 4 | Efek penyembuhan Sakura |
| `slash` | 30–33 | 4 | Tebasan Lee / Joly (cadangan) |

Efek digambar **terpusat** (tengah sel = tengah ledakan), ukuran diskala
oleh game sesuai radius skill.

## 3. Fallback

Bila file belum ada / gagal dimuat, game otomatis memakai renderer
prosedural lama (`js/fighter.js`) dan lingkaran energi untuk FX —
game TIDAK rusak. Daftarkan karakter yang sudah punya sheet di `js/data.js`
(field `sprite`), dan nama FX tiap skill (field `fx`).
