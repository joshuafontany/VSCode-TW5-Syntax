#!/usr/bin/env node
// Composition.
//
// Every other gate here reads a file alone, and the canary asks whether a file leaks
// forward into plain text after it. Neither asks the other direction: does a file still
// read the same way with something standing in front of it?
//
// A grammar that answers yes composes. One that answers no has a construct reaching
// across a boundary it should not cross — the fault behind every colouring bug
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
// differently. Closing two samples' constructs turned two pairs green, naming the
// property working.
//
// Readings compare by position rather than by line text. The same line stands in more than
// one sample, and keying by text compares one sample's reading against another's, which read
// as three failing pairs while every sample composed.

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { grammarArgs } = require('./tokenizer.js');

/**
 * The scope annotations a snapshot carries, in source order.
 *
 * Readings sit in a list rather than a map keyed by line text: the same text stands in more
 * than one sample, and keying by it compares one file's reading against another's.
 *
 * @param {string} text  a .snap file's contents
 * @returns {Array<{line: string, reading: string[]}>}
 */
function readingsOf(text) {
  const readings = [];
  let current = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('>')) {
      current = { line: line.slice(1), reading: [] };
      readings.push(current);
      continue;
    }
    if (current && line.startsWith('#')) current.reading.push(line);
  }
  return readings;
}

/**
 * The lines whose reading moved between standing alone and standing in company.
 *
 * Compares index by index. The caller passes the slice of the pair the sample occupies, so
 * nothing here computes an offset from line counts.
 *
 * @param {Array<{line: string, reading: string[]}>} alone
 * @param {Array<{line: string, reading: string[]}>} slice  the same span, read in company
 * @returns {string[]} source lines that read differently
 */
function movedLines(alone, slice) {
  const moved = [];
  for (let i = 0; i < alone.length && i < slice.length; i += 1) {
    const here = alone[i];
    const there = slice[i];
    if (!here.line.trim()) continue;
    if (here.line !== there.line) return [`ALIGNMENT LOST at ${JSON.stringify(here.line.slice(0, 40))}`];
    if (here.reading.join('\n') !== there.reading.join('\n')) moved.push(here.line);
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

  const grammars = grammarArgs();
  execFileSync('npx', ['vscode-tmgrammar-snap', ...grammars, '-s', scope, '-u', ...files], {
    stdio: ['ignore', 'ignore', 'inherit'],
    shell: process.platform === 'win32'
  });

  const soloReadings = solo.map((f) => readingsOf(fs.readFileSync(`${f}.snap`, 'utf8')));
  let broken = 0;
  for (const { file, i, j } of pairs) {
    const together = readingsOf(fs.readFileSync(`${file}.snap`, 'utf8'));
    // The pair holds the first sample, then the second; each occupies one end of it.
    const first = movedLines(soloReadings[i], together.slice(0, soloReadings[i].length));
    const second = movedLines(soloReadings[j], together.slice(together.length - soloReadings[j].length));
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
