#!/usr/bin/env node
// Build the dashboard's cover rows: small JPEG data URLs a phone-sized preview can show.
// The Control Room page only shows images as data URLs, so each run that makes covers
// rewrites this file instead of the page carrying stale pictures of its own.
// Usage: board-covers.mjs <slug> <cover.png> [more covers...] [--into covers.json] [--out covers.json] [--width 360]
// --into merges with an existing file: rows for <slug> are replaced, other jobs are kept.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// One cover as a JPEG data URL, scaled to `width` pixels wide.
export function coverDataUrl(file, width = 360) {
  const ff = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `scale=${width}:-2`, '-frames:v', '1', '-q:v', '5', '-f', 'mjpeg', 'pipe:1'], { maxBuffer: 16 << 20 });
  if (ff.status !== 0) throw new Error(`ffmpeg could not read ${file}: ${ff.stderr?.toString().trim()}`);
  return `data:image/jpeg;base64,${ff.stdout.toString('base64')}`;
}

export const labelOf = file => basename(file, extname(file)).replace(/^\d+[-_]/, '').replace(/[-_]+/g, ' ').trim();

// Replace one job's rows in a cover list, keeping every other job's rows.
export function mergeCovers(rows, slug, covers) {
  return [...rows.filter(r => r.slug !== slug), ...covers.map((c, i) => ({ slug, i, ...c }))];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), opt = n => { const i = args.indexOf(`--${n}`); return i > -1 ? args.splice(i, 2)[1] : null; };
  const into = opt('into'), out = opt('out') || into || 'covers.json', width = Number(opt('width') || 360);
  const [slug, ...files] = args;
  if (!slug || !files.length) { console.error('Usage: board-covers.mjs <slug> <cover.png> [...] [--into covers.json] [--out covers.json]'); process.exit(1); }
  const missing = files.filter(f => !existsSync(f));
  if (missing.length) { console.error(`Not found: ${missing.join(', ')}`); process.exit(1); }
  const rows = into && existsSync(into) ? JSON.parse(readFileSync(into, 'utf8')) : [];
  const next = mergeCovers(rows, slug, files.map(f => ({ label: labelOf(f), src: coverDataUrl(f, width) })));
  writeFileSync(out, JSON.stringify(next));
  console.log(`${resolve(out)}: ${files.length} cover(s) for ${slug}, ${next.length} row(s) in all.`);
}
