#!/usr/bin/env node
// Deterministic packaging checks, ported from Stillshot's cleanSEO and Brand Brain rules.
// Usage: node check-package.mjs <package.json> [--transcript <words.json>] [--faith] [--out <report.json>]
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BANNED_TITLE = [/this changed everything/i, /changes everything/i, /^shocking\b/i, /you won'?t believe/i, /\bgoes? viral\b/i];
const BANNED_THUMB = [/^be yourself$/i, /^my journey$/i, /^success story$/i, /^watch this!?$/i];
const FAITH_LEAD = /^(miracle|healing|healed|powerful healing|shocking deliverance)\b/i;
const words = s => String(s || '').trim().split(/\s+/).filter(Boolean);
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

export function checkPackage(pkg, { transcript = null, faith = false } = {}) {
  const errors = [], warnings = [];
  const titles = Array.isArray(pkg.titles) ? pkg.titles : [];
  if (titles.length < 3) errors.push(`Need at least 3 ranked titles, found ${titles.length}.`);
  if (titles.length > 10) warnings.push(`${titles.length} titles; the brief asks for up to 10.`);
  const seen = new Set();
  titles.forEach((t, i) => {
    const title = String(t?.title || '').trim(), tag = `Title ${i + 1} "${title}"`;
    if (!title) return errors.push(`Title ${i + 1} is empty.`);
    if (seen.has(norm(title))) errors.push(`${tag} is a duplicate.`); seen.add(norm(title));
    if (title.length > 100) errors.push(`${tag} is over YouTube's 100-character limit.`);
    else if (title.length > 70) warnings.push(`${tag} is over 70 characters and will truncate on phones.`);
    if (!(+t.truth >= 4)) errors.push(`${tag} has truth ${t.truth ?? 'missing'}; titles under 4 must be rewritten or dropped.`);
    for (const re of BANNED_TITLE) if (re.test(title)) errors.push(`${tag} uses a banned lazy pattern.`);
    if (words(title).filter(w => w.length > 1 && /^[A-Z'!?.]+$/.test(w) && /[A-Z]{2}/.test(w)).length > 1) warnings.push(`${tag} has more than one ALL-CAPS word.`);
    if (faith && i < 3 && FAITH_LEAD.test(title)) errors.push(`${tag} leads with a generic miracle/healing word; name the specific situation.`);
  });
  const angles = new Set(titles.map(t => norm(t?.angle)).filter(Boolean));
  if (titles.length >= 3 && angles.size < 3) warnings.push(`Only ${angles.size} distinct title angles; vary the curiosity mechanism, not synonyms.`);

  const tags = Array.isArray(pkg.tags) ? pkg.tags.map(t => String(t).trim()) : [];
  const tagLen = tags.join(', ').length;
  if (pkg.platforms?.includes?.('youtube') !== false && !tags.length) warnings.push('No YouTube tags.');
  if (tagLen >= 500) errors.push(`Tags total ${tagLen} characters joined with ", "; YouTube needs under 500.`);
  const lowerTags = tags.map(t => t.toLowerCase());
  if (new Set(lowerTags).size !== lowerTags.length) errors.push('Tags contain duplicates.');
  if (tags.some(t => /[#,]/.test(t))) errors.push('Tags must not contain # or commas.');
  if (faith && lowerTags.slice(0, 3).some(t => FAITH_LEAD.test(t))) errors.push('A top-3 tag leads with miracle/healing; lead with the specific topic.');

  const hashtags = Array.isArray(pkg.hashtags) ? pkg.hashtags : [];
  if (hashtags.length > 15) errors.push(`${hashtags.length} hashtags; YouTube ignores them all past 15.`);
  else if (hashtags.length > 10) warnings.push(`${hashtags.length} hashtags; keep 6 to 10.`);
  if (hashtags.some(h => !/^#[^\s#]+$/.test(h))) errors.push('Each hashtag must be one word starting with #.');

  const desc = String(pkg.description || '');
  if (!desc.trim()) warnings.push('No description.');
  if (/https?:\/\/|\[link\]|<link>|\{link\}/i.test(desc)) errors.push('Description has a URL or link placeholder; links are added by the owner.');
  if (desc.length > 5000) errors.push('Description is over YouTube\'s 5000-character limit.');
  if (faith && FAITH_LEAD.test(desc.trim())) errors.push('Description opens with a generic miracle/healing word.');
  const caption = String(pkg.ig_caption || '');
  if (caption.length > 2200) errors.push('Instagram caption is over 2200 characters.');
  if ((caption.match(/#[^\s#]+/g) || []).length > 30) errors.push('Instagram caption has more than 30 hashtags.');

  const thumbs = Array.isArray(pkg.thumbnails) ? pkg.thumbnails : [];
  if (!thumbs.length) errors.push('No thumbnail concepts.');
  thumbs.forEach((th, i) => {
    const text = String(th?.text || '').trim(), n = words(text).length, tag = `Thumbnail ${i + 1}`;
    if (th?.style === 'clean' ? n > 3 : n < 2 || n > 5) errors.push(`${tag} text "${text}" has ${n} words; use 2-5 (clean stills: 0-3).`);
    for (const re of BANNED_THUMB) if (re.test(text)) errors.push(`${tag} text "${text}" is banned generic copy.`);
    const pair = titles.find(t => norm(t?.title) === norm(th?.pairs_with));
    if (th?.pairs_with && !pair) warnings.push(`${tag} pairs with a title that is not in the list.`);
    if (pair && text && norm(pair.title).includes(norm(text))) errors.push(`${tag} repeats words from its title; the thumbnail should ask the question the title deepens.`);
    if (!th?.still?.time && !th?.still?.file) warnings.push(`${tag} names no real still (time or file) from the footage.`);
  });

  const story = pkg.story || {};
  const hooks = Array.isArray(story.hook_moments) ? story.hook_moments : [];
  if (!story.strongest_angle) warnings.push('story.strongest_angle is missing.');
  hooks.forEach((h, i) => {
    if (h?.time && !/^\d+:\d{2}$/.test(h.time)) errors.push(`Hook ${i + 1} time "${h.time}" must be m:ss copied from the transcript.`);
    if (transcript && h?.quote && !norm(transcript).includes(norm(h.quote))) errors.push(`Hook ${i + 1} quote is not in the transcript: "${h.quote}".`);
  });
  return { ok: errors.length === 0, errors, warnings, stats: { titles: titles.length, tagChars: tagLen, thumbnails: thumbs.length, hooks: hooks.length } };
}

function transcriptText(path) {
  const doc = JSON.parse(readFileSync(path, 'utf8'));
  if (typeof doc.text === 'string' && !Array.isArray(doc.words)) return doc.text;
  return (doc.words || []).filter(w => w.type !== 'spacing' && w.type !== 'audio_event').map(w => w.text).join(' ');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), opt = n => { const i = args.indexOf(`--${n}`); return i > -1 ? args[i + 1] : null; };
  if (!args[0] || args[0] === '--help') { console.log('Usage: check-package.mjs <package.json> [--transcript <words.json>] [--faith] [--out <report.json>]'); process.exit(args[0] ? 0 : 1); }
  const report = checkPackage(JSON.parse(readFileSync(args[0], 'utf8')), {
    transcript: opt('transcript') ? transcriptText(opt('transcript')) : null, faith: args.includes('--faith'),
  });
  if (opt('out')) writeFileSync(opt('out'), JSON.stringify(report, null, 2) + '\n');
  for (const e of report.errors) console.log(`ERROR  ${e}`);
  for (const w of report.warnings) console.log(`WARN   ${w}`);
  console.log(report.ok ? `OK: ${report.stats.titles} titles, ${report.stats.tagChars} tag chars, ${report.stats.thumbnails} thumbnails.` : `${report.errors.length} error(s).`);
  process.exitCode = report.ok ? 0 : 1;
}
