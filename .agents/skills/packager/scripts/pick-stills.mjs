#!/usr/bin/env node
// Extract evenly spaced candidate stills from a video for thumbnail picking.
// Usage: pick-stills.mjs <video> [--count 16] [--out <dir>]
// Writes still-01.jpg..., stills.json (index -> m:ss), and sheet.jpg (4-wide contact sheet).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname, basename, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
// Skip the first and last 3% (slates, fades, end cards) and sample the middle of each slice.
export function sampleTimes(duration, count) {
  const start = duration * 0.03, span = duration * 0.94;
  return Array.from({ length: count }, (_, i) => +(start + span * (i + 0.5) / count).toFixed(2));
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8' });
  if (r.error) throw new Error(`${cmd} is required: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${cmd} failed: ${r.stderr.split('\n').slice(-4).join('\n')}`);
  return r.stdout;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf(`--${n}`); return i > -1 ? args[i + 1] : d; };
  const video = args[0];
  if (!video || video === '--help') { console.log('Usage: pick-stills.mjs <video> [--count 16] [--out <dir>]'); process.exit(video ? 0 : 1); }
  const count = Math.max(4, Math.min(36, +opt('count', 16)));
  const out = resolve(opt('out', join(dirname(video), `${basename(video, extname(video))}-stills`)));
  mkdirSync(out, { recursive: true });
  const duration = +run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video]).trim();
  if (!(duration > 0)) throw new Error(`Could not read the duration of ${video}.`);
  const stills = sampleTimes(duration, count).map((t, i) => {
    const file = `still-${String(i + 1).padStart(2, '0')}.jpg`;
    run('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', video, '-frames:v', '1', '-vf', 'scale=1920:-2', '-q:v', '2', join(out, file)]);
    return { index: i + 1, file, seconds: t, time: mmss(t) };
  });
  const cols = 4, rows = Math.ceil(count / cols);
  run('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', join(out, 'still-%02d.jpg'), '-vf', `scale=480:-2,tile=${cols}x${rows}:padding=6:color=black`, '-frames:v', '1', join(out, 'sheet.jpg')]);
  writeFileSync(join(out, 'stills.json'), JSON.stringify({ video: resolve(video), duration, stills }, null, 2) + '\n');
  console.log(`${count} stills from ${mmss(duration)} of video in ${out} (sheet.jpg reads left to right, top to bottom).`);
}
