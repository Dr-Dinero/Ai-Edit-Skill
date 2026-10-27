#!/usr/bin/env node
// Upload a finished render or thumbnail to S3-compatible storage (Cloudflare R2 by default)
// and print the public URL that Metricool needs. No SDK: requests are signed with AWS SigV4.
// Usage: publish-media.mjs <file> [--key <path/in/bucket>] [--job <slug>] [--dry-run]
// Env: MEDIA_BUCKET, MEDIA_ACCESS_KEY_ID, MEDIA_SECRET_ACCESS_KEY, MEDIA_PUBLIC_BASE_URL,
//      and MEDIA_ENDPOINT or R2_ACCOUNT_ID (endpoint https://<account>.r2.cloudflarestorage.com).
import { createHash, createHmac } from 'node:crypto';
import { readFileSync, statSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { basename, extname, join, resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const TYPES = { '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.m4v': 'video/mp4', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
const sha256 = data => createHash('sha256').update(data).digest('hex');
const hmac = (key, data) => createHmac('sha256', key).update(data).digest();
const encodeKey = key => key.split('/').map(encodeURIComponent).join('/');

export function mediaKey(file, { job, date = new Date() } = {}) {
  const day = date.toISOString().slice(0, 10);
  const name = basename(file).toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  return [job || 'misc', `${day}-${name}`].join('/');
}

// SigV4 for a single S3 request; returns the headers to send.
export function signRequest({ method, url, headers = {}, payloadHash, accessKeyId, secretAccessKey, region = 'auto', date = new Date() }) {
  const u = new URL(url);
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, ''), day = amzDate.slice(0, 8);
  const all = { ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v).trim()])), host: u.host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
  const names = Object.keys(all).sort();
  const canonical = [method, u.pathname, u.searchParams.toString(), names.map(n => `${n}:${all[n]}\n`).join(''), names.join(';'), payloadHash].join('\n');
  const scope = `${day}/${region}/s3/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
  const key = ['s3', 'aws4_request'].reduce((k, part) => hmac(k, part), hmac(hmac(`AWS4${secretAccessKey}`, day), region));
  const signature = createHmac('sha256', key).update(toSign).digest('hex');
  delete all.host;
  return { ...all, authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}` };
}

export function config(env = process.env) {
  const endpoint = env.MEDIA_ENDPOINT || (env.R2_ACCOUNT_ID ? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '');
  const cfg = { endpoint, bucket: env.MEDIA_BUCKET, accessKeyId: env.MEDIA_ACCESS_KEY_ID, secretAccessKey: env.MEDIA_SECRET_ACCESS_KEY, publicBase: (env.MEDIA_PUBLIC_BASE_URL || '').replace(/\/$/, ''), region: env.MEDIA_REGION || 'auto' };
  const missing = Object.entries({ 'MEDIA_ENDPOINT or R2_ACCOUNT_ID': cfg.endpoint, MEDIA_BUCKET: cfg.bucket, MEDIA_ACCESS_KEY_ID: cfg.accessKeyId, MEDIA_SECRET_ACCESS_KEY: cfg.secretAccessKey, MEDIA_PUBLIC_BASE_URL: cfg.publicBase }).filter(([, v]) => !v).map(([k]) => k);
  return { cfg, missing };
}

function loadDotEnv() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), path = join(root, '.env');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

async function main() {
  const args = process.argv.slice(2), opt = n => { const i = args.indexOf(`--${n}`); return i > -1 ? args[i + 1] : null; };
  const file = args[0];
  if (!file || file === '--help') { console.log('Usage: publish-media.mjs <file> [--key <path>] [--job <slug>] [--dry-run]'); process.exit(file ? 0 : 1); }
  if (!existsSync(file)) throw new Error(`File not found: ${file}`);
  loadDotEnv();
  const { cfg, missing } = config();
  const key = opt('key') || mediaKey(file, { job: opt('job') });
  const publicUrl = `${cfg.publicBase || '<MEDIA_PUBLIC_BASE_URL>'}/${encodeKey(key)}`;
  if (args.includes('--dry-run')) return console.log(JSON.stringify({ file, key, publicUrl, missing }, null, 2));
  if (missing.length) throw new Error(`Media hosting is not configured. Set ${missing.join(', ')} (see docs/TOOLS-AND-API-KEYS.md).`);
  const body = readFileSync(file), type = TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
  const url = `${cfg.endpoint.replace(/\/$/, '')}/${cfg.bucket}/${encodeKey(key)}`;
  const headers = signRequest({ method: 'PUT', url, headers: { 'content-type': type, 'content-length': body.length }, payloadHash: sha256(body), ...cfg });
  const put = await fetch(url, { method: 'PUT', headers, body });
  if (!put.ok) throw new Error(`Upload failed: ${put.status} ${(await put.text()).slice(0, 300)}`);
  // Metricool fetches the media itself, so prove the public URL serves the same bytes.
  // A sandbox may block the public host even when the bucket is fine; report that as unchecked.
  const head = await fetch(publicUrl, { method: 'HEAD' }).catch(e => ({ unreachable: e.cause?.message || e.message }));
  const size = +head.headers?.get('content-length');
  const ok = head.unreachable ? null : head.ok && size === statSync(file).size;
  const record = { file: resolve(file), key, publicUrl, bytes: body.length, contentType: type, uploadedAt: new Date().toISOString(), verified: ok, acceptRanges: head.headers?.get('accept-ranges') ?? null };
  if (opt('job')) {
    const log = resolve(opt('root') || process.env.COUNCIL_ROOT || join(dirname(fileURLToPath(import.meta.url)), '../video-projects'), opt('job'), 'council/package/media.json');
    mkdirSync(dirname(log), { recursive: true });
    const list = existsSync(log) ? JSON.parse(readFileSync(log, 'utf8')) : [];
    writeFileSync(log, JSON.stringify([...list.filter(m => m.key !== key), record], null, 2) + '\n');
  }
  console.log(JSON.stringify(record, null, 2));
  if (ok === null) console.error(`Uploaded, but this machine could not reach the public URL (${head.unreachable}). Open it in a browser before scheduling.`);
  else if (!ok) { console.error(`The public URL did not serve the file (HTTP ${head.status}, ${size} bytes). Check the bucket's public access.`); process.exitCode = 1; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e.message); process.exit(1); });
