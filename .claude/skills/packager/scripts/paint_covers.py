#!/usr/bin/env python3
"""Paint symbolic Reel/Short covers: an image model paints the scene, the headline is set locally.

Usage: paint_covers.py <package.json> [--only 1,3] [--out <dir>] [--repaint]

For each thumbnail concept with "style": "symbol" and a "paint" block:
  1. Paint <n>-<angle>-painting.png (1024x1536) with the OpenAI image API from paint.scene plus
     the house finish (dark oil painting, chiaroscuro, one light source, empty upper third, no
     text). An existing painting is reused unless --repaint. The model never paints text or a
     real person's face from the video.
  2. Fit it to 1080x1920 (scale to full height, crop the sides at paint.shift, push the scene
     down by paint.dy pixels when the focal object reaches the headline band).
  3. Set the headline in Anton caps: white with the key word (design.key_word, default the
     last word; several words allowed) in the accent colour, black stroke, inside the profile-grid band.
Writes <n>-<angle>-vertical.png and records cover, painting, and layout on the concept.

Without OPENAI_API_KEY it writes the full prompt into paint.full_prompt and prints it, so a
person can paste it into a free image app and save the result at the painting path; run
again to set the headline. Env: OPENAI_IMAGE_MODEL (default gpt-image-2),
OPENAI_IMAGE_QUALITY (default high). Each painting is one paid image call.
"""
import base64
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920
FONT = Path(__file__).resolve().parent.parent / 'fonts' / 'Anton-Regular.ttf'
FINISH = ('Dark classical oil painting on canvas, chiaroscuro in the manner of Fuseli and Rembrandt, '
          'visible thick brushwork and canvas texture, deep near-black shadows, a single {light} light source, '
          'muted palette with {light} as the only accent. Vertical 2:3 composition, main subject centered '
          'horizontally, upper third of the canvas left as dark empty negative space for a headline. '
          'Absolutely no text, no letters, no numbers, no digits, no signature, no watermark.')
MAX_FONT, MIN_FONT, SIDE = 200, 120, 80


def slug(c, i):
    return f"{i + 1}-" + re.sub(r'[^a-z0-9]+', '-', str(c.get('angle') or 'symbol').lower()).strip('-')


def hex_rgb(s):
    s = s.lstrip('#')
    return tuple(int(s[k:k + 2], 16) for k in (0, 2, 4))


def paint(prompt, dest):
    body = json.dumps({'model': os.environ.get('OPENAI_IMAGE_MODEL', 'gpt-image-2'), 'prompt': prompt,
                       'size': '1024x1536', 'quality': os.environ.get('OPENAI_IMAGE_QUALITY', 'high'), 'n': 1}).encode()
    req = urllib.request.Request('https://api.openai.com/v1/images/generations', body, {
        'Authorization': 'Bearer ' + os.environ['OPENAI_API_KEY'], 'Content-Type': 'application/json'})
    try:
        res = json.load(urllib.request.urlopen(req, timeout=300))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f'OpenAI image API {e.code}: {e.read().decode()[:300]}')
    dest.write_bytes(base64.b64decode(res['data'][0]['b64_json']))


def fit(src, shift, dy):
    im = Image.open(src).convert('RGB')
    im = im.resize((round(im.width * H / im.height), H), Image.LANCZOS)
    x = round((im.width - W) * min(max(shift, 0), 1))
    im = im.crop((x, 0, x + W, H))
    if dy > 0:
        # Push the scene down and refill the dark top with a softened mirror of its first rows.
        out = Image.new('RGB', (W, H))
        out.paste(im.crop((0, 0, W, dy)).transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(6)), (0, 0))
        out.paste(im.crop((0, 0, W, H - dy)), (0, dy))
        im = out
    return im.filter(ImageFilter.UnsharpMask(radius=2, percent=40, threshold=2))


def layout(words):
    """One line if it fits at 170px or more, else the two-line split that allows the largest size, then the most even."""
    def biggest(lines):
        size = MAX_FONT
        while size > MIN_FONT and max(ImageFont.truetype(str(FONT), size).getlength(' '.join(l)) for l in lines) > W - 2 * SIDE:
            size -= 4
        return size, max(ImageFont.truetype(str(FONT), size).getlength(' '.join(l)) for l in lines) <= W - 2 * SIDE
    size, fits = biggest([words])
    if (size >= 170 and fits) or len(words) == 1:
        return [words], size, fits
    f = ImageFont.truetype(str(FONT), 100)
    balance = lambda ls: -abs(f.getlength(' '.join(ls[0])) - f.getlength(' '.join(ls[1])))
    lines = max(([words[:k], words[k:]] for k in range(1, len(words))), key=lambda ls: (biggest(ls)[0], balance(ls)))
    return (lines, *biggest(lines))


def headline(im, text, key, accent, top):
    words = text.upper().split()
    keys = {w.strip('.,!?') for w in (key or words[-1]).upper().split()}
    lines, size, fits = layout(words)
    f = ImageFont.truetype(str(FONT), size)
    d = ImageDraw.Draw(im)
    gap, y = f.getlength(' '), top
    for line in lines:
        x = (W - f.getlength(' '.join(line))) / 2
        for w in line:
            d.text((x, y), w, font=f, fill=accent if w.strip('.,!?') in keys else (255, 255, 255),
                   stroke_width=max(5, size // 26), stroke_fill=(0, 0, 0))
            x += f.getlength(w) + gap
        y += round(size * 1.12)
    return {'fontSize': size, 'lines': [' '.join(l) for l in lines], 'fits': fits, 'top': top, 'bottom': y}


def main():
    a = sys.argv[1:]
    if not a or a[0] in ('-h', '--help'):
        print(__doc__); sys.exit(0 if a else 1)
    pkg_path = Path(a[0])
    opt = lambda n: a[a.index(n) + 1] if n in a else None
    base, pkg = pkg_path.parent, json.loads(pkg_path.read_text())
    out = Path(opt('--out')) if opt('--out') else base / 'thumbs'
    out.mkdir(parents=True, exist_ok=True)
    only = {int(n) for n in opt('--only').split(',')} if opt('--only') else None
    key_set = bool(os.environ.get('OPENAI_API_KEY'))
    problems, done = [], 0
    for i, c in enumerate(pkg.get('thumbnails') or []):
        if c.get('style') != 'symbol' or (only and i + 1 not in only):
            continue
        p = c.get('paint') or {}
        if not p.get('scene'):
            problems.append(f'Cover {i + 1}: style "symbol" needs paint.scene.'); continue
        accent = p.get('accent', '#FF2E24')
        prompt = p['scene'].rstrip() + ' ' + FINISH.format(light=p.get('light', 'deep red'))
        p['full_prompt'] = prompt
        painting = out / f'{slug(c, i)}-painting.png'
        rel = lambda f: os.path.relpath(f, base).replace('\\', '/')
        if '--repaint' in a or not painting.exists():
            if not key_set:
                problems.append(f'Cover {i + 1}: no OPENAI_API_KEY. Paste this prompt into an image app (portrait 2:3) '
                                f'and save the result as {painting}:\n  {prompt}')
                continue
            print(f'Painting cover {i + 1} ...', flush=True)
            paint(prompt, painting)
        im = fit(painting, float(p.get('shift', 0.5)), int(p.get('dy', 0)))
        lay = headline(im, c.get('text', ''), (c.get('design') or {}).get('key_word'), hex_rgb(accent), int(p.get('top', 270)))
        cover = out / f'{slug(c, i)}-vertical.png'
        im.save(cover)
        c['painting'], c['cover'] = rel(painting), rel(cover)
        c['layout'] = {'vertical': lay}
        if not lay['fits']:
            problems.append(f'Cover {i + 1}: "{c.get("text")}" does not fit in 2 lines at a readable size; cut words.')
        done += 1
        print(f'Cover {i + 1}: {c["cover"]} ({lay["fontSize"]}px, {len(lay["lines"])} line(s))')
    pkg_path.write_text(json.dumps(pkg, indent=2) + '\n')
    for m in problems:
        print('ERROR ', m)
    if not done and not problems:
        print('No "symbol" concepts in package.json')
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
