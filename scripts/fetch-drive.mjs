#!/usr/bin/env node
// Download a Google Drive file shared as "anyone with the link" without an SDK or sign-in.
// The Drive connector only returns small files inline, so council runs fetch footage with this.
// Usage: fetch-drive.mjs <file-id> <out-path> [--bytes <expected size>]
// Behind a proxy, run with NODE_USE_ENV_PROXY=1. Needs drive.usercontent.google.com reachable.
import { createWriteStream, mkdirSync, statSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';

export const downloadUrl = id => `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`;

async function main() {
  const args = process.argv.slice(2), opt = n => { const i = args.indexOf(`--${n}`); return i > -1 ? args[i + 1] : null; };
  const [id, out] = args;
  if (!id || !out || id === '--help') { console.log('Usage: fetch-drive.mjs <file-id> <out-path> [--bytes <size>]'); process.exit(id === '--help' ? 0 : 1); }
  const res = await fetch(downloadUrl(id), { redirect: 'follow' });
  const type = res.headers.get('content-type') || '';
  // A private file or a blocked link comes back as an HTML sign-in or warning page, not the bytes.
  if (!res.ok || type.startsWith('text/html')) throw new Error(`Drive did not send the file (HTTP ${res.status}, ${type || 'no type'}). Set the file or its folder to "Anyone with the link: Viewer".`);
  const path = resolve(out), part = `${path}.part`;
  mkdirSync(dirname(path), { recursive: true });
  await pipeline(Readable.fromWeb(res.body), createWriteStream(part));
  const size = statSync(part).size, want = opt('bytes') && Number(opt('bytes'));
  if (want && size !== want) throw new Error(`Downloaded ${size} bytes but Drive lists ${want}; left the partial file at ${part}.`);
  renameSync(part, path);
  console.log(JSON.stringify({ id, path, bytes: size }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e.message); process.exit(1); });
