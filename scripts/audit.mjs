#!/usr/bin/env node
// One command for the code audit the CI workflow runs: tests, kit checks, dependency
// advisories, and (when installed) Semgrep code rules and Gitleaks secret scanning.
// Usage: npm run audit            Exit code is non-zero if any check that ran failed.
import { spawnSync } from 'node:child_process';

// npm runs through node itself (no shell): `npm run audit` sets npm_execpath to npm's CLI.
const npmCli = process.env.npm_execpath;
if (!npmCli) { console.error('Run this through npm: npm run audit'); process.exit(1); }
const npm = (...a) => [process.execPath, [npmCli, ...a]];
const has = bin => !spawnSync(bin, ['--version'], { stdio: 'ignore' }).error;
const checks = [
  ['Unit tests', ...npm('test')],
  ['Kit structure', ...npm('run', 'check')],
  ['Skill trees in sync', ...npm('run', 'check:skills')],
  ['Dependency advisories (high and up)', ...npm('audit', '--audit-level=high')],
  ['Semgrep code rules', 'semgrep', ['scan', '--config', 'p/default', '--severity', 'ERROR', '--error', '--metrics=off', '--exclude', 'video-projects', '--exclude', 'examples', '.'], 'pip install semgrep'],
  ['Gitleaks secret scan', 'gitleaks', ['git', '.', '--redact', '--no-banner'], 'https://github.com/gitleaks/gitleaks#installing'],
];

const results = [];
for (const [name, bin, args, install] of checks) {
  if (install && !has(bin)) { results.push([name, 'skipped', `not installed (${install})`]); continue; }
  console.log(`\n── ${name}`);
  const r = spawnSync(bin, args, { stdio: 'inherit' });
  results.push([name, r.status === 0 ? 'pass' : 'FAIL', r.status === 0 ? '' : `exit ${r.status ?? r.error?.message}`]);
}
console.log('\nAudit summary');
for (const [name, state, note] of results) console.log(`  ${state.padEnd(7)} ${name}${note ? `  (${note})` : ''}`);
process.exitCode = results.some(r => r[1] === 'FAIL') ? 1 : 0;
