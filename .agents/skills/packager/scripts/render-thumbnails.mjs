#!/usr/bin/env node
// Render real-frame thumbnails from package.json concepts: the still stays untouched apart
// from crop, grade, and a side darken; the headline is live text in the bundled Anton font.
// Usage: render-thumbnails.mjs <package.json> [--only 1,3] [--out <dir>] [--no-vertical]
// Writes <n>-<angle>.png (1280x720), <n>-<angle>-vertical.png (1080x1920), phone-preview.png,
// and records file, cover, and layout checks on each concept in package.json.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const FONT = join(here, '../fonts/Anton-Regular.ttf');
const KEY_COLOR = '#FFD54A';
const SPLIT = new Set(['podcast', 'versus', 'before_after']);
export const FORMATS = {
  wide: { w: 1280, h: 720, maxFont: 190, minFont: 84 },
  vertical: { w: 1080, h: 1920, maxFont: 230, minFont: 110 },
};
// YouTube draws the duration over the bottom-right corner of every thumbnail.
export const BADGE = { x: 0.78, y: 0.8 };

// Resolve a concept's design into concrete frame geometry. Fractions are of the frame.
export function plan(concept, format = 'wide') {
  const d = concept.design || {}, style = concept.style || 'big_claim';
  const focus = Array.isArray(d.focus) ? d.focus : [0.5, 0.4];
  const split = SPLIT.has(style) && !!concept.still2;
  const zoom = d.zoom ?? ({ clean: 1, reaction: 1.35, big_claim: 1.25, mystery: 1.15 }[style] ?? 1.15);
  const words = String(concept.text || '').trim().split(/\s+/).filter(Boolean);
  const key = String(d.key_word || words.at(-1) || '').toUpperCase();
  if (format === 'vertical') {
    // A 16:9 still cannot fill 9:16 without cropping the face huge, so with a headline the frame
    // sits low over a blurred copy of itself, leaving a clean band on top for the text. The band
    // starts below the Reels header and inside the 3:4 profile-grid crop (y 240-1680), and the
    // face is placed under it so the headline never sits on the hair (cover_qc checks all three).
    return { style, split: false, zoom: 1, focus, target: [0.5, 0.56], side: 'top', box: { x: 0.07, y: 0.145, w: 0.86, h: 0.2 }, key, words, float: words.length ? 0.78 : 0 };
  }
  let side = d.text_side || (split ? 'bottom' : focus[0] < 0.5 ? 'right' : 'left');
  if (style === 'clean' && !d.text_side) side = 'top';
  const boxes = {
    right: { x: 0.52, y: 0.1, w: 0.43, h: 0.62 },
    left: { x: 0.05, y: 0.1, w: 0.43, h: 0.66 },
    bottom: { x: 0.05, y: 0.6, w: 0.7, h: 0.32 },
    top: { x: 0.06, y: 0.06, w: 0.7, h: 0.3 },
  };
  const target = side === 'right' ? [0.28, 0.42] : side === 'left' ? [0.72, 0.42] : side === 'top' ? [0.5, 0.6] : [0.5, 0.4];
  return { style, split, zoom, focus, target, side, box: boxes[side] || boxes.right, key, words };
}

export const overlapsBadge = (r, f) => r.x + r.w > BADGE.x * f.w && r.y + r.h > BADGE.y * f.h;

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function buildHtml(concept, { format = 'wide', still, still2, font = FONT } = {}) {
  const f = FORMATS[format], p = plan(concept, format);
  const lift = concept.design?.brightness ? ` brightness(${+concept.design.brightness})` : '';
  const grade = { warm: 'contrast(1.2) saturate(1.22) brightness(1.04) sepia(0.07)', cool: 'contrast(1.2) saturate(1.12) brightness(1.03) hue-rotate(-6deg)', neutral: 'contrast(1.17) saturate(1.16)' }[concept.design?.grade || 'warm'] + lift;
  const dir = { right: 'to left', left: 'to right', bottom: 'to top', top: 'to bottom' }[p.side];
  const darken = concept.design?.darken ?? (p.style === 'clean' ? 0.5 : 0.88);
  const headline = p.words.map(w => w.toUpperCase() === p.key || w.toUpperCase().replace(/[^A-Z0-9$%]/g, '') === p.key.replace(/[^A-Z0-9$%]/g, '') ? `<span class="key">${esc(w)}</span>` : esc(w)).join(' ');
  const shots = p.split
    ? [{ src: still, focus: p.focus, half: 0 }, { src: still2, focus: concept.design?.focus2 || [0.5, 0.4], half: 1 }]
    : [{ src: still, focus: p.focus, half: null }];
  const align = p.side === 'right' ? 'right' : p.side === 'left' ? 'left' : 'center';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Anton; src: url("${pathToFileURL(font).href}"); }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${f.w}px; height: ${f.h}px; overflow: hidden; background: #111; }
.shot { position: absolute; top: 0; height: 100%; overflow: hidden; }
.shot img { position: absolute; transform-origin: 0 0; filter: ${grade}; }
.bg { position: absolute; inset: -40px; width: calc(100% + 80px); height: calc(100% + 80px); object-fit: cover; filter: blur(36px) brightness(0.45) saturate(1.1); }
.float img { -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 14%); mask-image: linear-gradient(to bottom, transparent 0, #000 14%); }
.muted img { filter: grayscale(0.6) brightness(0.78) contrast(1.05); }
.shade { position: absolute; inset: 0; background: linear-gradient(${dir}, rgba(0,0,0,${darken}) 0%, rgba(0,0,0,${darken * 0.55}) 35%, rgba(0,0,0,0) 62%); }
.vignette { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 100%); }
#text { position: absolute; left: ${p.box.x * f.w}px; top: ${p.box.y * f.h}px; width: ${p.box.w * f.w}px; height: ${p.box.h * f.h}px;
  display: flex; align-items: ${p.side === 'bottom' ? 'flex-end' : p.side === 'top' ? 'flex-start' : 'center'}; justify-content: ${align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start'}; }
#text h1 { font-family: Anton, Impact, sans-serif; font-weight: 400; color: #fff; text-transform: uppercase; line-height: 0.98; letter-spacing: 0.5px;
  text-align: ${align}; overflow-wrap: normal; -webkit-text-stroke: 6px #000; paint-order: stroke fill; text-shadow: 0 6px 22px rgba(0,0,0,0.7), 0 3px 0 rgba(0,0,0,0.9); }
.key { color: ${KEY_COLOR}; }
</style></head><body>
${p.float ? `<img class="bg" src="${pathToFileURL(still).href}">` : ''}
${shots.map((s, i) => `<div class="shot${p.float ? ' float' : ''}${p.style === 'before_after' && i === 0 ? ' muted' : ''}" data-fx="${s.focus[0]}" data-fy="${s.focus[1]}" style="left:${s.half === null ? 0 : s.half * 50}%;width:${s.half === null ? 100 : 50}%"><img src="${pathToFileURL(s.src).href}"></div>`).join('\n')}
<div class="vignette"></div><div class="shade"></div>
<div id="text">${p.words.length ? `<h1>${headline}</h1>` : ''}</div>
<script>
window.__layout = async () => {
  await document.fonts.ready;
  const W = ${f.w}, H = ${f.h}, zoom = ${p.zoom}, target = ${JSON.stringify(p.target)}, float = ${p.float || 0};
  for (const shot of document.querySelectorAll('.shot')) {
    const img = shot.querySelector('img'); await img.decode();
    const sw = shot.clientWidth, iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = Math.max(sw / iw, (float || 1) * H / ih) * zoom, fx = +shot.dataset.fx * iw * scale, fy = +shot.dataset.fy * ih * scale;
    const tx = document.querySelectorAll('.shot').length > 1 ? sw / 2 : target[0] * W;
    const left = Math.min(0, Math.max(sw - iw * scale, tx - fx)), top = float ? Math.min(0.4 * H, Math.max(H - ih * scale, target[1] * H - fy)) : Math.min(0, Math.max(H - ih * scale, target[1] * H - fy));
    img.style.width = iw * scale + 'px'; img.style.height = ih * scale + 'px'; img.style.left = left + 'px'; img.style.top = top + 'px';
  }
  const box = document.getElementById('text'), h1 = box.querySelector('h1');
  if (!h1) return { fontSize: 0, lines: 0, rect: null, fits: true };
  let size = ${f.maxFont};
  const fits = () => h1.scrollWidth <= box.clientWidth + 1 && h1.offsetHeight <= box.clientHeight + 1 && Math.round(h1.offsetHeight / (size * 0.98)) <= 2
    && [...h1.querySelectorAll('*'), h1].every(el => el.scrollWidth <= box.clientWidth + 1);
  for (; size >= ${f.minFont}; size -= 2) { h1.style.fontSize = size + 'px'; if (fits()) break; }
  const r = h1.getBoundingClientRect();
  return { fontSize: size, lines: Math.round(r.height / (size * 0.98)), rect: { x: r.x, y: r.y, w: r.width, h: r.height }, fits: size >= ${f.minFont} && fits() };
};
</script></body></html>`;
}

export function slugAngle(c, i) { return `${i + 1}-${String(c.angle || c.style || 'concept').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`; }

async function main() {
  const args = process.argv.slice(2), opt = n => { const i = args.indexOf(`--${n}`); return i > -1 ? args[i + 1] : null; };
  const pkgPath = args[0];
  if (!pkgPath || pkgPath === '--help') { console.log('Usage: render-thumbnails.mjs <package.json> [--only 1,3] [--out <dir>] [--no-vertical]'); process.exit(pkgPath ? 0 : 1); }
  const base = dirname(resolve(pkgPath)), pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const out = resolve(opt('out') || join(base, 'thumbs')); mkdirSync(out, { recursive: true });
  const only = opt('only') ? new Set(opt('only').split(',').map(Number)) : null;
  const { chromium } = createRequire(import.meta.url)('playwright');
  const browser = await chromium.launch();
  const problems = [], rendered = [];
  try {
    for (const [i, c] of (pkg.thumbnails || []).entries()) {
      if (only && !only.has(i + 1)) continue;
      const still = c.still?.file && resolve(base, c.still.file), still2 = c.still2?.file && resolve(base, c.still2.file);
      if (!still || !existsSync(still)) { problems.push(`Thumbnail ${i + 1}: still.file is missing or not found; run pick-stills first.`); continue; }
      if (SPLIT.has(c.style) && still2 && !existsSync(still2)) { problems.push(`Thumbnail ${i + 1}: still2.file not found.`); continue; }
      const formats = args.includes('--no-vertical') ? ['wide'] : ['wide', 'vertical'];
      c.layout = {};
      for (const format of formats) {
        const f = FORMATS[format], name = `${slugAngle(c, i)}${format === 'vertical' ? '-vertical' : ''}`;
        const htmlPath = join(out, `.${name}.html`);
        writeFileSync(htmlPath, buildHtml(c, { format, still, still2 }));
        const page = await browser.newPage({ viewport: { width: f.w, height: f.h } });
        await page.goto(pathToFileURL(htmlPath).href);
        const lay = await page.evaluate(() => window.__layout());
        await page.screenshot({ path: join(out, `${name}.png`) });
        await page.close();
        const badge = format === 'wide' && lay.rect ? overlapsBadge(lay.rect, f) : false;
        c.layout[format] = { fontSize: lay.fontSize, lines: lay.lines, fits: lay.fits, overlapsBadge: badge };
        if (!lay.fits) problems.push(`Thumbnail ${i + 1} (${format}): "${c.text}" does not fit in 2 lines at a readable size; cut words.`);
        if (badge) problems.push(`Thumbnail ${i + 1}: text reaches the bottom-right duration badge.`);
        const rel = `${out.startsWith(base) ? out.slice(base.length + 1).replaceAll('\\', '/') : out}/${name}.png`;
        if (format === 'wide') c.file = rel; else c.cover = rel;
      }
      rendered.push({ i, c });
    }
    if (rendered.length) {
      const cards = rendered.map(({ i, c }) => `<figure><img src="${pathToFileURL(join(out, `${slugAngle(c, i)}.png`)).href}"><figcaption>${i + 1}. ${esc(c.angle || '')}: ${esc(c.pairs_with || '')}</figcaption></figure>`).join('');
      const sheet = join(out, '.phone-preview.html');
      writeFileSync(sheet, `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:16px;background:#0f0f0f;font:13px/1.3 Inter,Arial,sans-serif;color:#f1f1f1;display:flex;flex-wrap:wrap;gap:16px;width:${2 * 320 + 48}px}figure{width:320px;margin:0}img{width:320px;height:180px;border-radius:8px;display:block}figcaption{margin-top:6px;color:#aaa}</style>${cards}`);
      const page = await browser.newPage({ viewport: { width: 2 * 320 + 48, height: 200 } });
      await page.goto(pathToFileURL(sheet).href);
      await page.waitForLoadState('load');
      await page.screenshot({ path: join(out, 'phone-preview.png'), fullPage: true });
      await page.close();
    }
  } finally { await browser.close(); }
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  for (const p of problems) console.log(`ERROR  ${p}`);
  console.log(`Rendered ${rendered.length} concept(s) into ${out}; phone-preview.png shows them at phone size.`);
  process.exitCode = problems.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e.message); process.exit(1); });
