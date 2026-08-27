#!/usr/bin/env node
// Composition.
//
// Every other gate here reads a file alone, and the canary asks whether a file leaks
// forward into plain text after it. Neither asks the other direction: does a file still
// read the same way with something standing in front of it?
//
// A grammar that answers yes composes. One that answers no has a construct reaching
// across a boundary it should not cross — which is the fault behind every colouring bug
// this repository has fixed, and the fault that hid in the upstream-coverage probe file
// until each case got a file of its own.
//
//   node tools/composition-check.js <scope> <glob>
//
// For each neighbouring pair of samples it tokenizes A, then B, then A followed by B, and
// asks whether either half reads differently in company than it does alone.
//
// It detects what the canary cannot. The canary appends a plain sentence and passes over
// the block families TiddlyWiki spans by design, so a sample ending inside an open style
// or quote block reads clean there and still colours whatever follows it. This has no
// allowance list: a construct reaching past its file shows up as the next file reading
// differently. Closing two samples' constructs turned two pairs green, which is the
// property working.
//
// Three pairs stand open here — tiddlywiki.styleblock, tiddlywiki5.quotes and
// tiddlywiki5.inline.links each leave something unclosed that the sentinel alone does not
// reach. That reads as fixture debt rather than grammar debt, so CI reports this rather
// than blocking on it until those samples close.

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/**
 * The scope annotations a snapshot carries, keyed by source line.
 *
 * A line appearing twice keeps its first reading; a probe never needs the second, and a
 * later occurrence would otherwise overwrite the reading under comparison.
 *
 * @param {string} text  a .snap file's contents
 * @returns {Map<string, string[]>}
 */
function readingsOf(text) {
  const readings = new Map();
  let current = null;
  let collecting = false;
  for (const line of text.split('\n')) {
    if (line.startsWith('>')) {
      current = line.slice(1);
      // A line standing a second time keeps the reading it took the first time; a later
      // occurrence would otherwise append to the reading under comparison.
      collecting = Boolean(current.trim()) && !readings.has(current);
      if (collecting) readings.set(current, []);
      continue;
    }
    if (!collecting || !line.startsWith('#')) continue;
    readings.get(current).push(line);
  }
  return readings;
}

/**
 * The lines whose reading moved between standing alone and standing in company.
 *
 * @param {Map<string, string[]>} alone
 * @param {Map<string, string[]>} together
 * @returns {string[]} source lines that read differently
 */
function movedLines(alone, together) {
  const moved = [];
  for (const [line, reading] of alone) {
    const other = together.get(line);
    if (!other) continue; // the line never reappeared; a duplicate elsewhere in the pair
    if (reading.join('\n') !== other.join('\n')) moved.push(line);
  }
  return moved;
}

module.exports = { readingsOf, movedLines };

function listFiles(pattern) {
  const clean = pattern.replace(/^['"]|['"]$/g, '');
  const dir = path.dirname(clean);
  const base = path.basename(clean);
  const suffix = base.startsWith('*') ? base.slice(1) : null;
  return fs
    .readdirSync(dir)
    .filter((f) => (suffix ? f.endsWith(suffix) : f === base))
    .sort()
    .map((f) => path.join(dir, f));
}

function main() {
  const [scope, pattern] = process.argv.slice(2);
  if (!scope || !pattern) {
    console.error('Usage: node tools/composition-check.js <scope> <glob>');
    process.exit(2);
  }
  const sources = listFiles(pattern);
  if (sources.length < 2) {
    console.error(`need at least two sources; ${sources.length} matched ${pattern}`);
    process.exit(2);
  }

  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'tw5-compose-'));
  const ext = path.extname(sources[0]);
  const files = [];
  const solo = sources.map((src, i) => {
    const f = path.join(scratch, `solo-${String(i).padStart(3, '0')}${ext}`);
    fs.writeFileSync(f, fs.readFileSync(src, 'utf8').replace(/\s*$/, '') + '\n');
    files.push(f);
    return f;
  });
  // Each sample followed by its neighbour, around the ring, so every file stands both
  // first and second in some pair.
  const pairs = sources.map((_, i) => {
    const j = (i + 1) % sources.length;
    const f = path.join(scratch, `pair-${String(i).padStart(3, '0')}${ext}`);
    const a = fs.readFileSync(solo[i], 'utf8').replace(/\s*$/, '');
    const b = fs.readFileSync(solo[j], 'utf8').replace(/\s*$/, '');
    fs.writeFileSync(f, `${a}\n\n${b}\n`);
    files.push(f);
    return { file: f, i, j };
  });

  const grammars = execFileSync('bash', ['-c', 'source ./grammars.sh >/dev/null 2>&1; printf "%s\\n" "${ARGS[@]}"'], {
    encoding: 'utf8'
  }).trim().split('\n').filter(Boolean);
  execFileSync('npx', ['vscode-tmgrammar-snap', ...grammars, '-s', scope, '-u', ...files], {
    stdio: ['ignore', 'ignore', 'inherit'],
    shell: process.platform === 'win32'
  });

  const soloReadings = solo.map((f) => readingsOf(fs.readFileSync(`${f}.snap`, 'utf8')));
  let broken = 0;
  for (const { file, i, j } of pairs) {
    const together = readingsOf(fs.readFileSync(`${file}.snap`, 'utf8'));
    const first = movedLines(soloReadings[i], together);
    const second = movedLines(soloReadings[j], together);
    if (!first.length && !second.length) continue;
    broken++;
    console.error(`\n  ${path.basename(sources[i])} followed by ${path.basename(sources[j])}:`);
    for (const l of first.slice(0, 2)) console.error(`      the first reads differently at ${JSON.stringify(l).slice(0, 70)}`);
    for (const l of second.slice(0, 2)) console.error(`      the second reads differently at ${JSON.stringify(l).slice(0, 70)}`);
  }

  fs.rmSync(scratch, { recursive: true, force: true });
  console.log(`composition-check  ${scope}  ${pairs.length} pairs, ${broken} that do not compose`);
  process.exit(broken ? 1 : 0);
}

if (require.main === module) main();
