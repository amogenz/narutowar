# STYLE GUIDE — Naruto War by Amogenz Lab (ART LEAD, ditetapkan 2026-10-05)

Acuan kohesivitas SEMUA sprite. Bila sebuah sheet melanggar guide ini
(gaya beda / palet beda / proporsi beda) → REGENERATE. Kualitas & kohesi
di atas kecepatan. Layout grid mengikuti `CONTRACT.md` (tim CODE).

## 1. Gaya visual (Naruto Senki)

- Outline HITAM TEGAS, ketebalan konsisten (~3–4 px pada sel 256 px),
  mengelilingi seluruh siluet karakter & tiap elemen kostum.
- Cel-shading 2 TONE: warna dasar flat + 1 tone bayangan sederhana di
  sisi berlawanan cahaya. Tanpa gradasi halus, tanpa lukisan painterly.
- Warna CERAH & saturated (kartun anime), bukan pastel pudar.
- Proporsi CHIBI-TEGAS: kepala besar (~1/3 tinggi badan), badan kompak
  heroik. BUKAN vektor kotak, BUKAN pixel art.
- Side-view MENGHADAP KANAN di semua frame. Karakter terpusat horizontal
  di tiap sel, seluruh badan terlihat (kepala–kaki).
- Background TIAP SEL: magenta murni solid `#FF00FF` — tanpa bayangan di
  bawah kaki, tanpa gradasi/vignette, tanpa garis pemisah sel.

## 2. Palet terkunci (hex)

### 2a. Bersama (dipakai SEMUA karakter & FX)

| Elemen | Hex | Catatan |
|---|---|---|
| Outline | `#1A1A1A` | hitam tegas, semua siluet |
| Kulit dasar | `#FFD9B3` | anime skin tone |
| Kulit bayangan | `#F0B080` | tone-2 cel shading kulit |
| Putih mata / putih kemeja | `#F5F5F5` | |
| Hitam pekat (rambut/peci) | `#14141A` | |

### 2b. Per karakter

**Naruto** — rambut `#FFDD33`, jaket oranye `#FF7B1C`, jaket hitam `#2B2B3A`,
ikat kepala biru `#2B5FC7`, pelat logam `#C9CCD6`, sandal `#2B5FC7`.

**Sasuke** — rambut `#23232E`, baju navy `#2E3A5C`, tali pinggang putih
`#F2F2F2`, mata Sharingan merah `#C02727`.

**Kakashi** — rambut silver `#D8DBE2`, masker `#23232E`, rompi jonin hijau
`#5F7F4E`, ikat kepala biru `#2B5FC7`, baju dalam hitam `#23232E`.

**Sakura** — rambut pink `#FFB3C8`, atasan merah `#D62828`, celana/protektor
hitam `#23232E`, mata hijau `#2E9E5B`, ikat kepala biru `#2B5FC7`.

**Itachi** — rambut `#14141A`, jubah Akatsuki hitam `#23232E`, awan merah
`#D62828`, mata Sharingan `#C02727`, pelat ikat kepala `#C9CCD6`.

**Joly** (maskot) — peci hitam `#14141A` (wajib dikenali tiap frame), jas
`#23232E`, kemeja putih `#F5F5F5`, dasi navy `#2E3448`.

### 2c. FX jutsu

| Efek | Hex inti → luar |
|---|---|
| Rasengan | `#BFE9FF` → `#3FA9F5` → outline `#1A6FBF` |
| Chidori | putih `#FFFFFF` → `#7FD4FF` |
| Katon | `#FFD23F` → `#FF7B1C` → `#D62828` |
| Explosion | `#FFFFFF` → `#FFD23F` → `#FF7B1C` |
| Heal | `#D8FFD8` → `#7DDF8A` |
| Slash | `#FFFFFF` → `#BFE9FF`, outline `#1A1A1A` |

## 3. Aturan konsistensi antar sheet

1. Kaki MENAPAK satu garis bawah yang SAMA di semua frame & semua karakter
   (game menempelkan bawah sel ke tanah — lihat CONTRACT.md).
2. Ukuran karakter relatif KONSISTEN: isi ~70–80% tinggi sel (±180–205 px
   pada sel 256 px). Naruto & Sasuke setara; Joly sedikit lebih kecil
   (~65–70%).
3. Ketebalan outline & gaya shading SAMA di semua sheet — tidak campur
   gaya (tidak ada yang painterly/lembut sendirian).
4. Urutan frame row-major PERSIS seperti CONTRACT.md §1 (idle 0–3, run 4–9,
   atk1 10–12, atk2 13–15, atk3 16–18, cast 19–21, hit 22–23, dead 24–25,
   win 26–27, spare 28–29).
5. FX terpusat di tiap sel; bentuk BOLD & terbaca pada sel kecil 128 px.

## 4. Status sheet (2026-10-05, final)

- naruto.png / sasuke.png / kakashi.png / sakura.png / joly.png: LOLOS —
  1536×1280 (6×5 sel 256 px), bg dinormalisasi ke #FF00FF murni
  (flood-fill hue 285–315 + strip cleanup, diverifikasi: 100% piksel yang
  masuk toleransi chroma-key CONTRACT.md adalah magenta murni),
  ukuran 404–428 KB (< 500 KB), gaya & palet kohesif, diverifikasi visual
  per sheet.
- fx.png: LOLOS — diregenerate sesuai CONTRACT.md §2: 768×768
  (6 kolom × 6 baris, sel 128 px), 34 frame
  (rasengan 0–5, chidori 6–11, katon 12–17, explosion 18–25, heal 26–29,
  slash 30–33, 2 sel spare), 136 KB, garis grid hitam dihapus.
- itachi.png: LOLOS — dibuat ulang 2026-10-05 (generate ke-4 berhasil),
  1536×1280 (6×5 sel 256 px), bg dinormalisasi via _src/process.py,
  471 KB (< 500 KB), gaya & palet kohesif, diverifikasi visual.
- File mentah generator tersimpan di `_src/raw/`; skrip post-processing di
  `_src/process.py` (dapat dijalankan ulang bila perlu).

## 5. Pelajaran post-processing (jangan diulang)

- Generator TIDAK menghasilkan 1536×1280 persis (keluar 1728×1440) dan bg
  tidak murni #FF00FF (ada pita gradasi antar sel + bayangan lembut).
  Wajib dinormalisasi via skrip, bukan manual.
- Garis grid hitam generator bisa MELESET ±6 px dari posisi grid ideal —
  deteksi strip harus lebar (±8 px), bukan ±3 px.
- JANGAN pakai hue-range lebar (mis. 280–360) untuk flood fill bila ada
  karakter berunsur pink: rambut Sakura (hue ~353–359) IDENTIK dengan
  varian pink bg — sekali bocor lewat anti-aliasing outline, rambut ikut
  jadi magenta (kejadian 2026-10-05, diperbaiki via narrow rule 285–315).
- Kuantisasi PNG wajib `dither=NONE` + simpan sebagai mode palet (P),
  dan paksa satu entri palet menjadi #FF00FF persis — kalau simpan RGB,
  ukuran tetap >900 KB.
