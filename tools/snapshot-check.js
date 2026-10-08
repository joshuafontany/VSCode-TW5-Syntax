#!/usr/bin/env node
// Snapshot check.
//
// A sample's whole tokenization pins beside it, so a sample covers every construct it
// happens to contain and any change to any of them surfaces as a diff. Nobody writes an
// assertion here, and none goes stale.
//
// The check regenerates each snapshot into a scratch directory and compares bytes.
// vscode-tmgrammar-snap writes deterministically — two runs produce identical files —
// while its own compare path disagrees with its writer on some inputs, so this uses the
// writer alone and does the comparing here.
//
//   node tools/snapshot-check.js <scope> <glob> [<glob> ...]            compare, exit non-zero on drift
//   node tools/snapshot-check.js <scope> <glob> [<glob> ...] --update   rewrite the pinned snapshots

const { snapRun } = require('./snap-run.js');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { grammarArgs } = require('./tokenizer.js');

// Node 22 added fs.globSync and Windows disagrees with a forward-slash glob, so the
// listing happens here: every pattern this repository uses reads `dir/*.ext`.
function listFiles(pattern) {
  // cmd.exe hands a single-quoted argument through with its quotes attached.
  pattern = pattern.replace(/^['"]|['"]$/g, '');
  const dir = path.dirname(pattern);
  const base = path.basename(pattern);
  const suffix = base.startsWith('*') ? base.slice(1) : null;
  return fs
    .readdirSync(dir)
    .filter((f) => (suffix ? f.endsWith(suffix) : f === base))
    .sort()
    .map((f) => path.join(dir, f));
}

const [scope, ...rest] = process.argv.slice(2);
const update = rest.includes('--update');
const patterns = rest.filter((a) => a !== '--update');
if (!scope || patterns.length === 0) {
  console.error('Usage: node tools/snapshot-check.js <scope> <glob> [<glob> ...] [--update]');
  process.exitCode = 2;
  return;
}

const sources = patterns.flatMap(listFiles);
if (sources.length === 0) {
  console.error(`no sources matched ${patterns.join(' ')}`);
  process.exitCode = 2;
  return;
}

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'tw5-snap-'));
for (const src of sources) fs.copyFileSync(src, path.join(scratch, path.basename(src)));

const grammars = grammarArgs();

const staged = sources.map((src) => path.join(scratch, path.basename(src)));
snapRun([...grammars, '-s', scope, '-u'], staged);

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
process.exitCode = drift ? 1 : 0;
return;
