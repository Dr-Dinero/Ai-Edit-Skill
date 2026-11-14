#!/usr/bin/env node
// Job board for the content council: one job per video, handed off role to role.
// Each job lives in <root>/<slug>/council/ beside the video project it packages.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, cpSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
const kit = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const templates = join(kit, '.claude/skills/council/templates');

// stage -> the role that holds the job while it sits there
export const HOLDER = {
  brief: 'virality-director', edit: 'editor', 'edit-qc': 'edit-qc', package: 'packager',
  'packaging-qc': 'packaging-qc', approval: 'owner', scheduled: 'packager', posted: 'analyst', reviewed: 'analyst',
};
// stage -> stages it may hand off to; QC stages may send work back to their maker
export const NEXT = {
  brief: ['edit'], edit: ['edit-qc'], 'edit-qc': ['edit', 'package'], package: ['packaging-qc'],
  'packaging-qc': ['package', 'approval'], approval: ['scheduled', 'edit', 'package'],
  scheduled: ['posted', 'package'], posted: ['reviewed'], reviewed: [],
};
const MAX_LOOPS = 3;

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (name, fallback) => { const i = args.indexOf(`--${name}`); return i > -1 ? args[i + 1] : fallback; };
const flag = name => args.includes(`--${name}`);
const jobsRoot = resolve(opt('root', process.env.COUNCIL_ROOT || join(kit, 'video-projects')));
const die = message => { console.error(message); process.exit(1); };
const now = () => new Date().toISOString();
const jobDir = slug => join(jobsRoot, slug, 'council');
const jobFile = slug => join(jobDir(slug), 'job.json');
function load(slug) {
  if (!slug) die('Name the job: <slug>.');
  if (!existsSync(jobFile(slug))) die(`No council job for ${slug} under ${jobsRoot}.`);
  return JSON.parse(readFileSync(jobFile(slug), 'utf8'));
}
const save = job => { job.updated = now(); writeFileSync(jobFile(job.slug), JSON.stringify(job, null, 2) + '\n'); };
const verdict = path => existsSync(path) ? (readFileSync(path, 'utf8').match(/^Verdict:\s*(PASS|FAIL)\b/mi)?.[1]?.toUpperCase() ?? null) : null;
const unfilled = path => !existsSync(path) || /<!--\s*fill/i.test(readFileSync(path, 'utf8'));

// What must exist before a job may leave a stage for a given target.
function gate(job, to) {
  const d = jobDir(job.slug), problems = [];
  const from = job.stage;
  if (from === 'brief' && unfilled(join(d, 'brief.md'))) problems.push('brief.md still has <!-- fill --> sections.');
  if (from === 'edit' && unfilled(join(d, 'edit/NOTES.md'))) problems.push('edit/NOTES.md must name the draft render and what changed.');
  if (from === 'edit-qc') {
    const v = verdict(join(d, 'qc/edit-qc.md'));
    if (!v) problems.push('qc/edit-qc.md needs a "Verdict: PASS" or "Verdict: FAIL" line.');
    else if (to === 'package' && v !== 'PASS') problems.push('Edit QC verdict is FAIL; send it back to edit.');
    else if (to === 'edit' && v !== 'FAIL') problems.push('Edit QC verdict is PASS; hand it to package.');
  }
  if (from === 'package' && !existsSync(join(d, 'package/package.json'))) problems.push('package/package.json is missing.');
  if (from === 'packaging-qc') {
    const v = verdict(join(d, 'qc/packaging-qc.md'));
    if (!v) problems.push('qc/packaging-qc.md needs a "Verdict: PASS" or "Verdict: FAIL" line.');
    else if (to === 'approval' && v !== 'PASS') problems.push('Packaging QC verdict is FAIL; send it back to package.');
    else if (to === 'package' && v !== 'FAIL') problems.push('Packaging QC verdict is PASS; hand it to approval.');
    if (to === 'approval') {
      const report = join(d, 'qc/check-package.json');
      if (!existsSync(report) || !JSON.parse(readFileSync(report, 'utf8')).ok) problems.push('Run check-package with --out qc/check-package.json and fix its errors.');
    }
  }
  if (from === 'approval' && to === 'scheduled' && !job.approval && !job.autopost) problems.push('Only the owner approves. Record their words with: council approve <slug> --quote "...".');
  if (from === 'scheduled' && to === 'posted' && !opt('post')) problems.push('Pass --post <url or Metricool post id>.');
  if (from === 'posted' && to === 'reviewed' && !existsSync(join(d, 'analytics/7d.json'))) problems.push('The 7-day read (analytics/7d.json) comes before the review.');
  return problems;
}

function move(job, to, by, note) {
  if (!HOLDER[to]) die(`Unknown stage ${to}. Stages: ${Object.keys(HOLDER).join(', ')}.`);
  if (!NEXT[job.stage].includes(to)) die(`${job.stage} cannot hand off to ${to}. Allowed: ${NEXT[job.stage].join(', ') || 'none'}.`);
  const loops = job.history.filter(h => h.from === job.stage && h.to === to).length + 1;
  job.history.push({ at: now(), from: job.stage, to, by, note: note || '' });
  job.stage = to; job.holder = HOLDER[to]; job.step = null;
  if (NEXT[to].includes(job.history.at(-1).from) && loops > MAX_LOOPS) job.needsOwner = `${loops} round trips between ${job.history.at(-1).from} and ${to}`;
}

function create(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || '')) die('Usage: council new <kebab-slug> [--footage <path>] [--platforms youtube,instagram] [--autopost "<owner words>"]');
  const project = join(jobsRoot, slug);
  if (!existsSync(project)) {
    if (jobsRoot === join(kit, 'video-projects')) {
      const made = spawnSync(process.execPath, [join(kit, 'scripts/new-video.mjs'), slug], { stdio: 'inherit' });
      if (made.status !== 0) die('Could not create the video project.');
    } else mkdirSync(project, { recursive: true });
  }
  if (existsSync(jobFile(slug))) die(`Council job ${slug} already exists.`);
  cpSync(templates, jobDir(slug), { recursive: true, filter: src => !src.endsWith('PLAYBOOK.md') });
  const playbook = join(jobsRoot, 'PLAYBOOK.md');
  if (!existsSync(playbook)) cpSync(join(templates, 'PLAYBOOK.md'), playbook);
  for (const sub of ['edit', 'qc', 'package', 'analytics']) mkdirSync(join(jobDir(slug), sub), { recursive: true });
  const footage = opt('footage');
  if (footage && !existsSync(footage)) die(`Footage not found: ${footage}`);
  const autopost = opt('autopost');
  const job = {
    slug, created: now(), updated: now(), stage: 'brief', holder: HOLDER.brief,
    footage: footage ? resolve(footage) : null,
    platforms: (opt('platforms', 'youtube,instagram')).split(',').map(s => s.trim()).filter(Boolean),
    autopost: autopost ? { quote: autopost, at: now() } : null,
    approval: null, posts: [], history: [{ at: now(), from: null, to: 'brief', by: 'intake', note: footage ? `footage ${footage}` : '' }],
  };
  writeFileSync(jobFile(slug), JSON.stringify(job, null, 2) + '\n');
  console.log(`Council job ${slug} is at brief, held by virality-director. Folder: ${jobDir(slug)}`);
}

// Analyst checkpoints after a post goes live, in hours.
export const READS = { '1h': 1, '24h': 24, '7d': 168 };
export function dueReads(job, at = Date.now(), dir = jobDir(job.slug)) {
  const live = job.posts?.[0]?.at;
  if (!live || !['posted', 'reviewed'].includes(job.stage)) return [];
  return Object.entries(READS)
    .filter(([name, hours]) => at >= Date.parse(live) + hours * 36e5 && !existsSync(join(dir, 'analytics', `${name}.json`)))
    .map(([name]) => name);
}

function board() {
  const rows = existsSync(jobsRoot) ? readdirSync(jobsRoot).filter(s => existsSync(jobFile(s))).map(s => JSON.parse(readFileSync(jobFile(s), 'utf8'))) : [];
  if (flag('json')) return console.log(JSON.stringify(rows, null, 2));
  if (!rows.length) return console.log('No council jobs yet. Start one with: npm run council -- new <slug> --footage <path>');
  rows.sort((a, b) => b.updated.localeCompare(a.updated));
  for (const j of rows) {
    const last = j.history.at(-1);
    console.log(`${j.slug.padEnd(28)} ${j.stage.padEnd(13)} ${j.holder.padEnd(18)} ${j.updated.slice(0, 16)}${j.needsOwner ? '  NEEDS OWNER: ' + j.needsOwner : ''}${j.step ? '  NOW: ' + j.step.text : last?.note ? '  ' + last.note : ''}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const slug = args[1];
  if (cmd === 'new') create(slug);
  else if (cmd === 'board') board();
  else if (cmd === 'status') console.log(JSON.stringify(load(slug), null, 2));
  else if (cmd === 'progress') {
    // What the holder is doing inside its stage, so the dashboard shows motion between handoffs.
    const job = load(slug), text = opt('step'), pct = opt('pct');
    if (!text) die('Usage: council progress <slug> --step "<what is happening now>" [--pct 0-100]');
    if (pct != null && !(Number(pct) >= 0 && Number(pct) <= 100)) die('--pct must be a number from 0 to 100.');
    job.step = { text, pct: pct == null ? null : Number(pct), at: now() };
    save(job);
    console.log(JSON.stringify({ slug, stage: job.stage, step: job.step }));
  }
  else if (cmd === 'due') {
    // Work waiting on a role right now: analyst reads that are due, and jobs parked at a stage.
    const jobs = existsSync(jobsRoot) ? readdirSync(jobsRoot).filter(s => existsSync(jobFile(s))).map(s => JSON.parse(readFileSync(jobFile(s), 'utf8'))) : [];
    const due = jobs.flatMap(j => {
      const reads = dueReads(j);
      if (reads.length) return [{ slug: j.slug, role: 'analyst', reads }];
      if (['posted', 'reviewed'].includes(j.stage)) return [];
      return [{ slug: j.slug, role: j.holder, stage: j.stage, needsOwner: j.needsOwner || null }];
    });
    console.log(JSON.stringify(due, null, 2));
  }
  else if (cmd === 'handoff') {
    const job = load(slug), to = opt('to'), by = opt('by');
    if (!to || !by) die('Usage: council handoff <slug> --to <stage> --by <role> [--note "..."]');
    if (by !== job.holder) die(`${job.slug} is held by ${job.holder}, not ${by}.`);
    const problems = flag('force') ? [] : gate(job, to);
    if (problems.length) die(`Cannot hand off ${slug} to ${to}:\n- ${problems.join('\n- ')}`);
    if (to === 'posted') job.posts.push({ at: now(), ref: opt('post') });
    move(job, to, by, opt('note')); save(job);
    console.log(`${slug}: ${job.history.at(-1).from} -> ${to}, now held by ${job.holder}.${job.needsOwner ? ' Needs owner: ' + job.needsOwner : ''}`);
  } else if (cmd === 'approve') {
    const job = load(slug), quote = opt('quote'), changes = opt('changes');
    if (job.stage !== 'approval') die(`${slug} is at ${job.stage}, not approval.`);
    if (!quote) die('Record the owner\'s own words with --quote "...". Never approve on an agent\'s say-so.');
    if (changes) {
      const to = opt('to', 'package');
      move(job, to, 'owner', `changes: ${changes}`); job.approval = null;
      save(job); console.log(`${slug}: owner asked for changes, back to ${to}.`);
    } else {
      job.approval = { quote, at: now() };
      move(job, 'scheduled', 'owner', `approved: "${quote}"`); save(job);
      console.log(`${slug}: approved. The packager may schedule it now.`);
    }
  } else die('Usage: council <new|board|status|progress|due|handoff|approve> ... (see .claude/skills/council/SKILL.md)');
}
