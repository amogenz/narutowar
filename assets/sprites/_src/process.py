#!/usr/bin/env python3
"""Post-process sprite sheets: remove grid lines, normalize bg to pure #FF00FF,
resize to contract size. See STYLE_GUIDE.md / CONTRACT.md."""
import numpy as np
from PIL import Image
import os, sys

MAG = np.array([1.0, 0.0, 1.0], dtype=np.float32)

def rgb_to_hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(axis=-1); mn = a.min(axis=-1)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    i = m & (mx == r); h[i] = ((g[i] - b[i]) / d[i]) % 6
    i = m & (mx == g); h[i] = (b[i] - r[i]) / d[i] + 2
    i = m & (mx == b); h[i] = (r[i] - g[i]) / d[i] + 4
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0.0)
    return (h / 6 % 1.0) * 360.0, s, mx

def remove_grid_lines(a, cols, rows, min_run_frac=0.4):
    """Replace long dark runs exactly at cell boundaries with magenta."""
    H, W, _ = a.shape
    dark = (a[..., 0] < 0.35) & (a[..., 1] < 0.35) & (a[..., 2] < 0.35)
    out = a.copy()
    n = 0
    # vertical boundaries (wide strips: generator grid lines drift ±6px)
    for c in range(1, cols):
        bx = c * W / cols
        for xx in range(int(bx) - 8, int(bx) + 9):
            if not (0 <= xx < W): continue
            col = dark[:, xx]
            d = np.diff(np.concatenate([[False], col, [False]]).astype(np.int8))
            starts = np.where(d == 1)[0]; ends = np.where(d == -1)[0]
            for s, e in zip(starts, ends):
                if e - s >= min_run_frac * H:
                    out[s:e, xx] = MAG; n += (e - s)
    # horizontal boundaries (wide strips: generator grid lines drift ±6px)
    for r in range(1, rows):
        by = r * H / rows
        for yy in range(int(by) - 8, int(by) + 9):
            if not (0 <= yy < H): continue
            row = dark[yy, :]
            d = np.diff(np.concatenate([[False], row, [False]]).astype(np.int8))
            starts = np.where(d == 1)[0]; ends = np.where(d == -1)[0]
            for s, e in zip(starts, ends):
                if e - s >= min_run_frac * W:
                    out[yy, s:e] = MAG; n += (e - s)
    return out, n

def normalize_bg(a, cols, rows, hue_lo=285, hue_hi=315, sat_min=0.12):
    """Flood-fill magenta-family pixels connected to cell borders -> pure #FF00FF."""
    H, W, _ = a.shape
    hue, sat, _ = rgb_to_hsv(a)
    if hue_hi > 360:
        cand = ((hue >= hue_lo) | (hue <= hue_hi - 360)) & (sat > sat_min)
    else:
        cand = (hue >= hue_lo) & (hue <= hue_hi) & (sat > sat_min)
    seeds = np.zeros((H, W), dtype=bool)
    for r in range(rows):
        y0, y1 = r * H / rows, (r + 1) * H / rows
        for c in range(cols):
            x0, x1 = c * W / cols, (c + 1) * W / cols
            pts = [(x0+4, y0+4), (x1-5, y0+4), (x0+4, y1-5), (x1-5, y1-5),
                   ((x0+x1)/2, y0+3), ((x0+x1)/2, y1-4),
                   (x0+3, (y0+y1)/2), (x1-4, (y0+y1)/2)]
            for x, y in pts:
                xi, yi = int(x), int(y)
                if 0 <= xi < W and 0 <= yi < H and cand[yi, xi]:
                    seeds[yi, xi] = True
    filled = seeds & cand
    prev = -1
    it = 0
    while filled.sum() != prev and it < 2000:
        prev = filled.sum(); it += 1
        up = np.roll(filled, 1, axis=0); dn = np.roll(filled, -1, axis=0)
        lf = np.roll(filled, 1, axis=1); rt = np.roll(filled, -1, axis=1)
        filled = filled | ((up | dn | lf | rt) & cand)
    a = a.copy(); a[filled] = MAG
    leftover = int((cand & ~filled).sum())
    return a, int(filled.sum()), leftover, it

def char_height_stats(a, cols, rows):
    """Approx character height (non-magenta bbox) per cell, in px at current res."""
    H, W, _ = a.shape
    pure = (a[..., 0] > 0.99) & (a[..., 1] < 0.01) & (a[..., 2] > 0.99)
    hs = []
    for r in range(rows):
        for c in range(cols):
            x0, x1 = int(c*W/cols), int((c+1)*W/cols)
            y0, y1 = int(r*H/rows), int((r+1)*H/rows)
            cell = ~pure[y0:y1, x0:x1]
            ys = np.where(cell.any(axis=1))[0]
            if len(ys): hs.append(int(ys.max() - ys.min()))
    return (min(hs), sum(hs)/len(hs), max(hs)) if hs else (0, 0, 0)

def strip_cleanup(a, cols, rows, px=4, thresh=235):
    """Near-white pixels within `px` of cell boundaries -> magenta.
    Kills anti-aliased band remnants the hue flood-fill misses."""
    H, W, _ = a.shape
    a = a.copy()
    near_white = a.min(axis=-1) > thresh / 255.0
    n = 0
    xs = set(); ys = set()
    for c in range(1, cols):
        bx = c * W / cols
        xs.update(range(int(bx) - px, int(bx) + px + 1))
    for r in range(1, rows):
        by = r * H / rows
        ys.update(range(int(by) - px, int(by) + px + 1))
    for x in xs:
        if 0 <= x < W:
            m = near_white[:, x]; a[m, x] = MAG; n += int(m.sum())
    for y in ys:
        if 0 <= y < H:
            m = near_white[y, :]; a[y, m] = MAG; n += int(m.sum())
    return a, n

def process(src, cols, rows, out_size, dst, hue_lo=285, hue_hi=315, sat_min=0.12):
    im = Image.open(src).convert('RGB')
    a = np.asarray(im).astype(np.float32) / 255.0
    a, nlines = remove_grid_lines(a, cols, rows)
    a, nfill, leftover, iters = normalize_bg(a, cols, rows, hue_lo, hue_hi, sat_min)
    im2 = Image.fromarray((a * 255).astype(np.uint8)).resize(out_size, Image.LANCZOS)
    # quantize WITHOUT dithering (flat cel art -> small files)
    imq = im2.quantize(colors=256, method=Image.MEDIANCUT, dither=Image.NONE)
    b = np.asarray(imq.convert('RGB')).astype(np.float32) / 255.0
    b, nfill2, leftover2, iters2 = normalize_bg(b, cols, rows, hue_lo, hue_hi, sat_min)
    b, nstrip = strip_cleanup(b, cols, rows)
    hstat = char_height_stats(b, cols, rows)
    # final: palette PNG (small) with guaranteed exact-magenta entry
    im_rgb = Image.fromarray((b * 255).astype(np.uint8))
    im_p = im_rgb.quantize(colors=256, method=Image.MEDIANCUT, dither=Image.NONE)
    pal = im_p.getpalette()  # 768 values
    idx = np.arange(256)
    pr = np.array(pal[0::3]); pg = np.array(pal[1::3]); pb = np.array(pal[2::3])
    dist = (pr - 255) ** 2 + pg ** 2 + (pb - 255) ** 2
    mi = int(dist.argmin())
    pal[mi*3:mi*3+3] = [255, 0, 255]
    im_p.putpalette(pal)
    # remap every chroma-keyable pixel to the exact magenta index
    lab = np.asarray(im_p).copy()
    keyable = (pr[lab] >= 200) & (pb[lab] >= 200) & (pg[lab] <= 110)
    lab[keyable] = mi
    im_p = Image.fromarray(lab, mode='P')
    im_p.putpalette(pal)
    im_p.save(dst, optimize=True)
    kb = os.path.getsize(dst) / 1024
    # verify: pure-magenta fraction + chroma-key conformance
    bb = np.asarray(im_p.convert('RGB')).astype(int)
    R, G, B = bb[..., 0], bb[..., 1], bb[..., 2]
    pure = ((R == 255) & (G == 0) & (B == 255)).mean()
    keyed = ((R >= 200) & (B >= 200) & (G <= 110)).mean()
    print(f"{os.path.basename(dst)}: {out_size[0]}x{out_size[1]} {kb:.0f}KB | "
          f"gridline_px={nlines} fill1={nfill} left1={leftover} fill2={nfill2} left2={leftover2} strip={nstrip} | "
          f"pure_mag={pure:.1%} keyed_total={keyed:.1%} | char_h(min/avg/max)={hstat}")
    return kb

if __name__ == '__main__':
    base = os.path.dirname(os.path.abspath(__file__))
    SPR = os.path.join(base, '..')
    jobs = [
        ('media-generation-naruto-0-eb08347a-3734-48ac-beaa-2b15ae09532c.png', 6, 5, (1536, 1280), 'naruto.png', {}),
        ('media-generation-sasuke-0-bf59b4ef-44c2-46a9-861f-072ef9881bb0.png', 6, 5, (1536, 1280), 'sasuke.png', {}),
        ('media-generation-kakashi-0-b32c2107-ee35-447a-8b12-0088ae76db3b.png', 6, 5, (1536, 1280), 'kakashi.png', {}),
        # sakura: bg has pink (hue~355) + pale lavender (sat~4%) variants
        ('media-generation-sakura-0-10b8eed0-b0c9-461f-86fe-7f0a61a927bd.png', 6, 5, (1536, 1280), 'sakura.png',
         {'hue_lo': 280, 'hue_hi': 360, 'sat_min': 0.03}),
        ('media-generation-joly-0-74d21382-66d1-455c-b7eb-8c5f29113a87.png', 6, 5, (1536, 1280), 'joly.png', {}),
        ('media-generation-fx-new-0-15301d35-e602-4088-913b-b74f705c47b7.png', 6, 6, (768, 768), 'fx.png', {}),
    ]
    for src, c, r, sz, dst, kw in jobs:
        process(os.path.join(SPR, src), c, r, sz, os.path.join(SPR, dst), **kw)
