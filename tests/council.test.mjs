import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { checkPackage } from '../.agents/skills/packager/scripts/check-package.mjs';
const root = resolve(import.meta.dirname, '..');
const example = () => JSON.parse(readFileSync(join(root, 'examples/council/package.example.json')));
const transcript = 'We we build a small garden. Plants need light.';
function council(dir, ...args) { return spawnSync(process.execPath, [join(root, 'scripts/council.mjs'), ...args, '--root', dir], { encoding: 'utf8', cwd: root }); }
const fill = (path, text) => writeFileSync(path, text);

test('example package passes the packaging checks against its transcript', () => {
  const report = checkPackage(example(), { transcript, faith: true });
  assert.deepEqual(report.errors, []);
  assert.equal(report.ok, true);
});

test('packaging checks catch invented quotes, weak truth, long tags, and repeated thumbnail text', () => {
  const pkg = example();
  pkg.story.hook_moments.push({ time: '0:07', quote: 'This changed my life forever', why: 'made up' });
  pkg.titles[1].truth = 3;
  pkg.titles[2].title = 'You Won\'t Believe My Garden';
  pkg.tags = Array.from({ length: 40 }, (_, i) => `garden tag number ${i}`);
  pkg.thumbnails[0].text = 'It Wasn\'t the Soil';
  pkg.thumbnails[0].pairs_with = pkg.titles[0].title;
  const { ok, errors } = checkPackage(pkg, { transcript });
  assert.equal(ok, false);
  for (const needle of ['not in the transcript', 'truth 3', 'banned lazy pattern', 'under 500', 'repeats words']) {
    assert.ok(errors.some(e => e.includes(needle)), `expected an error about ${needle}: ${errors.join(' | ')}`);
  }
});

test('ministry rules reject generic miracle leads', () => {
  const pkg = example();
  pkg.titles[0].title = 'Healed After One Prayer';
  assert.ok(checkPackage(pkg, { faith: true }).errors.some(e => e.includes('miracle/healing')));
  assert.equal(checkPackage(pkg).errors.some(e => e.includes('miracle/healing')), false);
});

test('a job moves through the council and only the owner approves it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'council-test-'));
  assert.equal(council(dir, 'new', 'garden').status, 0);
  const job = join(dir, 'garden/council');
  assert.ok(existsSync(join(dir, 'PLAYBOOK.md')));
  assert.equal(existsSync(join(job, 'PLAYBOOK.md')), false);

  let r = council(dir, 'handoff', 'garden', '--to', 'edit', '--by', 'virality-director');
  assert.notEqual(r.status, 0); assert.match(r.stderr, /brief\.md/);
  fill(join(job, 'brief.md'), '# Creative brief\nAngle: light, not soil.\n');
  assert.equal(council(dir, 'handoff', 'garden', '--to', 'edit', '--by', 'editor').status, 1, 'wrong role');
  assert.equal(council(dir, 'handoff', 'garden', '--to', 'edit', '--by', 'virality-director').status, 0);

  fill(join(job, 'edit/NOTES.md'), 'Draft: renders/garden-v1.mp4\n');
  assert.equal(council(dir, 'handoff', 'garden', '--to', 'edit-qc', '--by', 'editor').status, 0);
  fill(join(job, 'qc/edit-qc.md'), 'Verdict: FAIL\n1. 0:02 pop\n');
  assert.notEqual(council(dir, 'handoff', 'garden', '--to', 'package', '--by', 'edit-qc').status, 0);
  assert.equal(council(dir, 'handoff', 'garden', '--to', 'edit', '--by', 'edit-qc').status, 0);
  assert.equal(council(dir, 'handoff', 'garden', '--to', 'edit-qc', '--by', 'editor').status, 0);
  fill(join(job, 'qc/edit-qc.md'), 'Verdict: PASS\n');
  assert.equal(council(dir, 'handoff', 'garden', '--to', 'package', '--by', 'edit-qc').status, 0);

  fill(join(job, 'package/package.json'), JSON.stringify(example()));
  assert.equal(council(dir, 'handoff', 'garden', '--to', 'packaging-qc', '--by', 'packager').status, 0);
  fill(join(job, 'qc/packaging-qc.md'), 'Verdict: PASS\n');
  r = council(dir, 'handoff', 'garden', '--to', 'approval', '--by', 'packaging-qc');
  assert.notEqual(r.status, 0); assert.match(r.stderr, /check-package/);
  fill(join(job, 'qc/check-package.json'), JSON.stringify(checkPackage(example(), { transcript })));
  assert.equal(council(dir, 'handoff', 'garden', '--to', 'approval', '--by', 'packaging-qc').status, 0);

  assert.notEqual(council(dir, 'handoff', 'garden', '--to', 'scheduled', '--by', 'owner').status, 0);
  assert.notEqual(council(dir, 'approve', 'garden').status, 0);
  assert.equal(council(dir, 'approve', 'garden', '--quote', 'looks fire, post it').status, 0);
  assert.notEqual(council(dir, 'handoff', 'garden', '--to', 'posted', '--by', 'packager').status, 0);
  assert.equal(council(dir, 'handoff', 'garden', '--to', 'posted', '--by', 'packager', '--post', 'https://example.com/p/1').status, 0);

  const state = JSON.parse(readFileSync(join(job, 'job.json')));
  assert.equal(state.stage, 'posted');
  assert.equal(state.holder, 'analyst');
  assert.equal(state.approval.quote, 'looks fire, post it');
  assert.equal(state.posts[0].ref, 'https://example.com/p/1');
  assert.match(council(dir, 'board').stdout, /garden\s+posted/);
});

test('thumbnail plans keep text away from the face and the duration badge', async () => {
  const { plan, buildHtml, overlapsBadge, FORMATS } = await import('../.agents/skills/packager/scripts/render-thumbnails.mjs');
  const { sampleTimes, mmss } = await import('../.agents/skills/packager/scripts/pick-stills.mjs');
  const left = plan({ text: 'IS THAT GOD?', style: 'big_claim', design: { focus: [0.3, 0.3] } });
  assert.equal(left.side, 'right');
  assert.equal(left.key, 'GOD?');
  assert.equal(plan({ text: 'WHO TOLD YOU', style: 'podcast', still2: {} }).side, 'bottom');
  assert.equal(plan({ text: 'NOT THE SOIL' }, 'vertical').float > 0, true);
  for (const side of ['left', 'right', 'bottom', 'top']) {
    const { box } = plan({ text: 'A B', design: { text_side: side } }), f = FORMATS.wide;
    assert.equal(overlapsBadge({ x: box.x * f.w, y: box.y * f.h, w: box.w * f.w, h: box.h * f.h }, f), false, side);
  }
  const html = buildHtml({ text: 'Not the <soil>', style: 'big_claim', design: { key_word: 'soil' } }, { still: join(root, 'x.jpg') });
  assert.match(html, /Not the <span class="key">&lt;soil&gt;<\/span>/);
  assert.doesNotMatch(html, /<soil>/);
  const times = sampleTimes(100, 4);
  assert.deepEqual(times, [14.75, 38.25, 61.75, 85.25]);
  assert.equal(mmss(85.25), '1:25');
});

test('packaging checks fail renders whose text does not fit', () => {
  const pkg = example();
  pkg.thumbnails[0].layout = { wide: { fits: false, overlapsBadge: true } };
  const { errors } = checkPackage(pkg);
  assert.ok(errors.some(e => e.includes('does not fit')));
  assert.ok(errors.some(e => e.includes('duration badge')));
});

test('analyst reads come due at 1 hour, 24 hours, and 7 days after posting', async () => {
  const { dueReads } = await import('../scripts/council.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'council-due-'));
  mkdirSync(join(dir, 'analytics'));
  const live = Date.parse('2026-10-01T12:00:00Z');
  const job = { slug: 'x', stage: 'posted', posts: [{ at: new Date(live).toISOString() }] };
  assert.deepEqual(dueReads(job, live + 30 * 60e3, dir), []);
  assert.deepEqual(dueReads(job, live + 2 * 36e5, dir), ['1h']);
  writeFileSync(join(dir, 'analytics/1h.json'), '{}');
  assert.deepEqual(dueReads(job, live + 8 * 864e5, dir), ['24h', '7d']);
  assert.deepEqual(dueReads({ ...job, stage: 'scheduled' }, live + 8 * 864e5, dir), []);
});

test('media uploads are signed exactly as AWS documents and keyed per job', async () => {
  const { signRequest, mediaKey, config } = await import('../scripts/publish-media.mjs');
  // AWS SigV4 S3 GET example (docs: "Signature Calculations for the Authorization Header").
  const h = signRequest({ method: 'GET', url: 'https://examplebucket.s3.amazonaws.com/test.txt', headers: { range: 'bytes=0-9' },
    payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', region: 'us-east-1', date: new Date('2013-05-24T00:00:00Z') });
  assert.match(h.authorization, /Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41$/);
  assert.equal(mediaKey('renders/Final Cut.MP4', { job: 'garden', date: new Date('2026-10-27T10:00:00Z') }), 'garden/2026-10-27-final-cut.mp4');
  assert.deepEqual(config({}).missing.length, 5);
  assert.equal(config({ R2_ACCOUNT_ID: 'abc', MEDIA_BUCKET: 'b', MEDIA_ACCESS_KEY_ID: 'k', MEDIA_SECRET_ACCESS_KEY: 's', MEDIA_PUBLIC_BASE_URL: 'https://m.example.com/' }).cfg.endpoint, 'https://abc.r2.cloudflarestorage.com');
});
