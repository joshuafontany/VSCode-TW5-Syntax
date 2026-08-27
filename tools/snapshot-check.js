#!/usr/bin/env node
// Snapshot check.
//
// A sample's whole tokenization is pinned beside it, so a sample covers every construct
// it happens to contain and any change to any of them surfaces as a diff. No assertion
// is written by hand, and none goes stale.
//
// The check regenerates each snapshot into a scratch directory and compares bytes.
// vscode-tmgrammar-snap writes deterministically — two runs produce identical files —
// while its own compare path disagrees with its writer on some inputs, so this uses the
// writer alone and does the comparing here.
//
//   node tools/snapshot-check.js <scope> <glob>            compare, exit non-zero on drift
//   node tools/snapshot-check.js <scope> <glob> --update   rewrite the pinned snapshots

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const [scope, pattern, ...rest] = process.argv.slice(2);
if (!scope || !pattern) {
  console.error('Usage: node tools/snapshot-check.js <scope> <glob> [--update]');
  process.exit(2);
}
const update = rest.includes('--update');

const sources = fs.globSync
  ? fs.globSync(pattern)
  : require('node:child_process')
      .execSync(`ls ${pattern}`, { encoding: 'utf8' })
      .trim()
      .split('\n');
if (sources.length === 0) {
  console.error(`no sources matched ${pattern}`);
  process.exit(2);
}

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'tw5-snap-'));
for (const src of sources) fs.copyFileSync(src, path.join(scratch, path.basename(src)));

const grammars = execFileSync('bash', ['-c', 'source ./grammars.sh >/dev/null 2>&1; printf "%s\\n" "${ARGS[@]}"'], {
  encoding: 'utf8'
}).trim().split('\n').filter(Boolean);

execFileSync(
  'npx',
  ['vscode-tmgrammar-snap', ...grammars, '-s', scope, '-u', path.join(scratch, path.basename(pattern))],
  { stdio: ['ignore', 'ignore', 'inherit'] }
);

let drift = 0;
let checked = 0;
for (const src of sources) {
  const pinned = `${src}.snap`;
  const fresh = path.join(scratch, `${path.basename(src)}.snap`);
  if (!fs.existsSync(fresh)) {
    console.error(`  no snapshot produced for ${src}`);
    drift++;
    continue;
  }
  if (update) {
    fs.copyFileSync(fresh, pinned);
    checked++;
    continue;
  }
  if (!fs.existsSync(pinned)) {
    console.error(`  ${src} carries no pinned snapshot. Run with --update in the same commit.`);
    drift++;
    continue;
  }
  const a = fs.readFileSync(pinned);
  const b = fs.readFileSync(fresh);
  checked++;
  if (a.equals(b)) continue;
  drift++;
  const al = a.toString('utf8').split('\n');
  const bl = b.toString('utf8').split('\n');
  console.error(`\n  ${src} tokenizes differently than pinned:`);
  let shown = 0;
  for (let i = 0; i < Math.max(al.length, bl.length) && shown < 6; i++) {
    if (al[i] === bl[i]) continue;
    console.error(`    ${String(i + 1).padStart(5)}  pinned  ${(al[i] ?? '(absent)').slice(0, 120)}`);
    console.error(`           now     ${(bl[i] ?? '(absent)').slice(0, 120)}`);
    shown++;
  }
}

fs.rmSync(scratch, { recursive: true, force: true });
console.log(`snapshot-check  ${scope}  ${checked} pinned, ${drift} drifted`);
process.exit(drift ? 1 : 0);
