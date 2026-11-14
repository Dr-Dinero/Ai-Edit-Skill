#!/usr/bin/env python3
"""Cover QC: check every vertical Reel/Short cover the way a viewer meets it.

Usage: cover_qc.py <package.json> [--covers <dir>] [--out <qc dir>]

For each thumbnail concept with a vertical cover it checks:
  size        1080x1920
  grid        headline and face inside the 3:4 profile-grid crop (y 240-1680)
  reels_ui    headline clear of the Reels header, the right action rail and the caption area
  head        headline does not sit on the face or the hair above it
  face        one face found, fully in frame, lit well enough to read an expression
  contrast    headline against its surroundings (WCAG ratio) and letter size on a grid tile
  captions    no burned-in subtitle text below the headline (frames pulled from a captioned render)
  sharp       the face is in focus after scaling
  words       2-5 words that do not repeat the paired title
Concepts with "style": "symbol" (painted scene, no face) skip the head, face and sharp checks.
Writes <out>/cover-qc.json, cover-qc.md and cover-qc-sheet.jpg (each cover with its boxes and
the grid crop drawn). Exits 1 when any cover fails.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

W, H = 1080, 1920
GRID = (240, 1680)                 # Instagram profile grid shows the centre 3:4 of a 9:16 reel
HEADER = 200                       # Reels title bar and camera icon
RAIL = (930, 1000, 1700)           # like/comment/share rail: x from 930, y 1000-1700
CAPTION_TOP = 1500                 # username, caption and audio line
STOP = set('a an the and or but of to in on at for with is are was be it its this that your you my i we they he she his her our'.split())


def text_mask(img):
    """White, key-yellow or key-red headline pixels that sit next to the black stroke."""
    b, g, r = [img[:, :, i].astype(int) for i in range(3)]
    white = (np.minimum(np.minimum(r, g), b) > 232)
    yellow = (r > 225) & (g > 180) & (b < 140)
    red = (r > 225) & (g < 90) & (b < 90)              # red key word on painted symbol covers
    dark = (np.maximum(np.maximum(r, g), b) < 40).astype(np.uint8)
    near_dark = cv2.dilate(dark, np.ones((13, 13), np.uint8)) > 0
    m = ((white | yellow | red) & near_dark).astype(np.uint8)
    return cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))


def text_blocks(mask):
    """Rows of glyphs grouped into lines, each line as [x0, y0, x1, y1]."""
    rows = mask.sum(1)
    on = rows > 25
    lines, y = [], 0
    while y < len(on):
        if on[y]:
            y0 = y
            while y < len(on) and on[y]:
                y += 1
            if y - y0 >= 30:
                cols = np.where(mask[y0:y].sum(0) > 2)[0]
                lines.append([int(cols.min()), y0, int(cols.max()), y])
        y += 1
    # merge lines separated by a small gap (descenders, key-word colour change)
    merged = []
    for ln in lines:
        if merged and ln[1] - merged[-1][3] < 18:
            m = merged[-1]
            merged[-1] = [min(m[0], ln[0]), m[1], max(m[2], ln[2]), ln[3]]
        else:
            merged.append(ln)
    return merged


YUNET_URL = 'https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx'
YUNET = Path.home() / '.cache' / 'herk-edit-kit' / 'face_detection_yunet_2023mar.onnx'


def yunet():
    """OpenCV's YuNet face model (MIT), fetched once into the user cache; None when offline."""
    if not YUNET.exists():
        YUNET.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(['curl', '-sSLf', '-o', str(YUNET), YUNET_URL], capture_output=True)
    if YUNET.exists() and YUNET.stat().st_size > 100_000:
        return str(YUNET)
    YUNET.unlink(missing_ok=True)
    return None


def find_face(img, gray):
    """Largest face as [x0, y0, x1, y1] and how much hair sits above the box (fraction of its height).
    YuNet finds bearded, side-lit and half-turned faces that the Haar cascade misses."""
    model = yunet()
    if model:
        det = cv2.FaceDetectorYN.create(model, '', (img.shape[1], img.shape[0]), 0.7)
        _, faces = det.detect(img)
        if faces is not None and len(faces):
            x, y, w, h = [int(v) for v in max(faces, key=lambda f: f[2] * f[3])[:4]]
            return [x, y, x + w, y + h], 0.3
        return None, 0
    casc = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    eq = cv2.equalizeHist(gray)
    faces = casc.detectMultiScale(eq, 1.1, 6, minSize=(140, 140))
    if len(faces) == 0:
        return None, 0
    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
    return [int(x), int(y), int(x + w), int(y + h)], 0.45


def lum(rgb):
    c = np.asarray(rgb, float) / 255
    c = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * c[..., 0] + 0.7152 * c[..., 1] + 0.0722 * c[..., 2]


def overlap(a, b):
    return max(0, min(a[2], b[2]) - max(a[0], b[0])) * max(0, min(a[3], b[3]) - max(a[1], b[1]))


def words(s):
    return [w for w in re.findall(r"[a-z0-9']+", s.lower()) if w not in STOP]


def check(path, concept):
    img = cv2.imread(str(path))
    res = {'cover': str(path), 'text': concept.get('text', ''), 'checks': {}, 'boxes': {}}
    ck = res['checks']
    if img is None:
        ck['size'] = [False, 'cannot read the file']
        return res, None
    h, w = img.shape[:2]
    ck['size'] = [(w, h) == (W, H), f'{w}x{h}']
    if (w, h) != (W, H):
        img = cv2.resize(img, (W, H))
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mask = text_mask(img)
    lines = text_blocks(mask)
    head_lines = [ln for ln in lines if ln[1] < H * 0.45]
    lower = [ln for ln in lines if ln[1] >= H * 0.45 and (ln[2] - ln[0]) > 120]
    head = None
    if head_lines:
        head = [min(l[0] for l in head_lines), min(l[1] for l in head_lines), max(l[2] for l in head_lines), max(l[3] for l in head_lines)]
    symbol = concept.get('style') == 'symbol'        # painted scene with no face from the video
    face, hair_k = (None, 0) if symbol else find_face(img, gray)
    res['boxes'] = {'headline': head, 'face': face, 'hair': hair_k, 'captions': lower}

    if head is None:
        ck['grid'] = ck['reels_ui'] = ck['head'] = ck['contrast'] = [False, 'no headline found']
    else:
        ck['grid'] = [head[1] >= GRID[0] + 10 and head[3] <= GRID[1] - 10,
                      f'headline y {head[1]}-{head[3]}; the profile grid shows y {GRID[0]}-{GRID[1]}']
        bad = []
        if head[1] < HEADER: bad.append('under the Reels header')
        if head[3] > CAPTION_TOP: bad.append('in the caption area')
        if head[2] > RAIL[0] and head[3] > RAIL[1] and head[1] < RAIL[2]: bad.append('under the action rail')
        ck['reels_ui'] = [not bad, ', '.join(bad) or 'clear of the Reels UI']
        if face:
            fh = face[3] - face[1]
            hair = [face[0] - int(0.1 * fh), face[1] - int(hair_k * fh), face[2] + int(0.1 * fh), face[3]]
            gap = hair[1] - head[3]
            ck['head'] = [overlap(head, hair) == 0, f'{gap}px between the headline and the top of the hair' if gap >= 0 else f'headline covers {-gap}px of the head']
        elif symbol:
            ck['head'] = [True, 'symbol cover: no face to keep clear']
        else:
            ck['head'] = [False, 'no face to measure against']
        # contrast: glyph colour against the surroundings outside the stroke
        x0, y0, x1, y1 = head
        pad = 40
        ring = np.zeros(mask.shape, np.uint8)
        ring[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad] = 1
        stroke = cv2.dilate(mask, np.ones((31, 31), np.uint8))
        bg = img[(ring > 0) & (stroke == 0)][:, ::-1]
        fg = img[mask > 0][:, ::-1]
        if len(bg) and len(fg):
            lf, lb = float(np.median(lum(fg))), float(np.median(lum(bg)))
            ratio = (max(lf, lb) + 0.05) / (min(lf, lb) + 0.05)
            line_h = min(l[3] - l[1] for l in head_lines)
            tile = line_h * 130 / W        # a profile-grid tile is about 130 px wide on a phone
            ck['contrast'] = [ratio >= 4.5 and tile >= 12, f'contrast {ratio:.1f}:1, letters {tile:.0f}px tall on a grid tile']
        else:
            ck['contrast'] = [False, 'could not separate the headline from the background']

    if face:
        fx0, fy0, fx1, fy1 = face
        fh = fy1 - fy0
        inside = fx0 > 0 and fx1 < W and fy0 - hair_k * fh > 0
        luma = float(gray[fy0:fy1, fx0:fx1].mean())
        cx, cy = (fx0 + fx1) / 2, (fy0 + fy1) / 2
        ok = inside and luma >= 70 and GRID[0] <= fy0 - hair_k * fh and fy1 <= GRID[1] and cy < CAPTION_TOP
        ck['face'] = [ok, f'face {fx1 - fx0}px wide, brightness {luma:.0f}/255 (need 70), centre y {cy:.0f}']
        small = cv2.resize(gray[fy0:fy1, fx0:fx1], (200, 200))
        sharp = float(cv2.Laplacian(small, cv2.CV_64F).var())
        ck['sharp'] = [sharp >= 60, f'face detail {sharp:.0f} (need 60)']
    elif symbol:
        ck['face'] = ck['sharp'] = [True, 'symbol cover: no face, face checks skipped']
    else:
        ck['face'] = [False, 'no face found']
        ck['sharp'] = [False, 'no face to measure']

    ck['captions'] = [not lower, f'{len(lower)} subtitle-like text line(s) below the headline' if lower else 'no burned-in captions']

    tw = words(concept.get('text', ''))
    n = len(re.findall(r"\S+", concept.get('text', '')))
    pair = concept.get('pairs_with') or ''
    rep = sorted(set(tw) & set(words(pair)))
    ck['words'] = [2 <= n <= 5 and not rep, f'{n} words' + (f'; repeats "{", ".join(rep)}" from its title' if rep else f'; title "{pair}" adds to it')]
    res['pass'] = all(v[0] for v in ck.values())
    return res, img


def draw(img, res):
    v = img.copy()
    cv2.rectangle(v, (0, GRID[0]), (W - 1, GRID[1]), (255, 200, 0), 4)
    cv2.rectangle(v, (RAIL[0], RAIL[1]), (W - 1, RAIL[2]), (120, 120, 120), 3)
    cv2.line(v, (0, CAPTION_TOP), (W, CAPTION_TOP), (120, 120, 120), 3)
    b = res['boxes']
    if b.get('headline'): cv2.rectangle(v, tuple(b['headline'][:2]), tuple(b['headline'][2:]), (0, 255, 0), 5)
    if b.get('face'):
        f = b['face']; fh = f[3] - f[1]
        cv2.rectangle(v, (f[0], f[1] - int(b['hair'] * fh)), (f[2], f[3]), (0, 0, 255), 5)
    for c in b.get('captions') or []:
        cv2.rectangle(v, tuple(c[:2]), tuple(c[2:]), (255, 0, 255), 5)
    col = (0, 200, 0) if res['pass'] else (0, 0, 255)
    cv2.putText(v, 'PASS' if res['pass'] else 'FAIL', (30, 1880), cv2.FONT_HERSHEY_SIMPLEX, 3, col, 8)
    return cv2.resize(v, (360, 640))


def main():
    a = sys.argv[1:]
    if not a or a[0] in ('-h', '--help'):
        print(__doc__); sys.exit(0 if a else 1)
    pkg_path = Path(a[0])
    opt = lambda n: a[a.index(n) + 1] if n in a else None
    pkg = json.loads(pkg_path.read_text())
    cover_dir = Path(opt('--covers')) if opt('--covers') else None
    out = Path(opt('--out') or pkg_path.parent.parent / 'qc')
    out.mkdir(parents=True, exist_ok=True)
    results, tiles = [], []
    for i, c in enumerate(pkg.get('thumbnails') or []):
        rel = c.get('cover')
        if not rel:
            continue
        p = (cover_dir / Path(rel).name) if cover_dir else (pkg_path.parent / rel)
        r, img = check(p, c)
        results.append(r)
        if img is not None:
            tiles.append(draw(img, r))
    if not results:
        print('No vertical covers listed in package.json'); sys.exit(1)
    if tiles:
        cv2.imwrite(str(out / 'cover-qc-sheet.jpg'), np.hstack(tiles))
    ok = all(r['pass'] for r in results)
    (out / 'cover-qc.json').write_text(json.dumps({'pass': ok, 'covers': results}, indent=2))
    md = [f'# Cover QC: {"PASS" if ok else "FAIL"}', '']
    for i, r in enumerate(results, 1):
        md.append(f'## Cover {i}: {r["text"]} ({"PASS" if r["pass"] else "FAIL"})')
        md += [f'- {"ok  " if v[0] else "FAIL"} {k}: {v[1]}' for k, v in r['checks'].items()]
        md.append('')
    md.append('Sheet: cover-qc-sheet.jpg (blue = profile-grid crop, grey = Reels rail and caption line, green = headline, red = face and hair, magenta = burned-in captions).')
    (out / 'cover-qc.md').write_text('\n'.join(md) + '\n')
    print('\n'.join(md))
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
