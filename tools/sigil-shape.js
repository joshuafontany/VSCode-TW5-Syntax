#!/usr/bin/env node
// The specimens must meet the FORMS the house writes, never only the names.
//
// A NAME IS NOT A FORM. `sigil-vocabulary` asks whether every sigil the seed WRITES stands in a
// specimen, and it read green for a whole session while the bearing arrow arrived in two tokens in
// every carrier this house writes — the base grammar's unquoted-value rule taking its dash. One
// PROSE specimen reached the arrow's scope, so coverage counted the name and never the shape it
// wears. A gate that counts names cannot notice a form breaking.
//
// THE SEED NAMES THE POPULATION. The shapes derive from what the house writes, so a form it starts
// writing reaches this reading the day it appears rather than the day somebody remembers it.
//
// A shape a specimen carries and the seed never writes reads as a FINDING: a specimen may hold a
// deliberate control, or a form another carrier writes. The reading says which and passes.
//
//   node tools/sigil-shape.js [--verbose]

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolveSeed } = require('./tw5-oracle.js');
const { walkMatching } = require('./walk.js');

const ROOT = path.resolve(__dirname, '..');
const verbose = process.argv.includes('--verbose');

/**
 * The shape a sigil's body wears, read from the text after its verb.
 *
 * A BEARING ARROW OUTRANKS WHAT SURROUNDS IT, because it stands between two named ends and reads as
 * one construct however its ends spell themselves — which is the form that broke unnoticed.
 *
 * @param {string} rest  the sigil's text after its verb, closer stripped
 */
function shapeOf(rest) {
  const body = rest.trim();
  if (/(^|[\s"'>])->([\s"'<]|$)/.test(body)) return 'bearing';
  if (!body) return 'bare';
  if (body.startsWith('#')) return 'fragment';
  if (/^["']/.test(body)) return 'quoted';
  if (/^[A-Za-z][\w-]*\s*[:=]/.test(body)) return 'named';
  if (/^[A-Za-z][\w-]*/.test(body)) return 'positional';
  return `other(${body.slice(0, 6)})`;
}

/**
 * Every sigil a carrier writes, as a verb and the shape its body wears.
 *
 * A NAME FOLLOWED BY AN ELLIPSIS NAMES NOTHING — the seed explains its own grammar in its own
 * grammar, and a reader taking that literally reads the metavariable as a form the house writes.
 */
function shapes(text) {
  const out = new Map();
  // A SIGIL CLOSES ON `>>`, never on one `>`. Reading its body as `[^>]*` truncates at the first
  // angle — which stands INSIDE a bearing arrow — so the arrow's own shape never appears, and an
  // instrument built to catch that blindness carried it. The base grammar spells the same guard.
  for (const m of text.matchAll(/<<~[ \t]*(\/?[A-Za-z][\w-]*)((?:[^>\n]|>(?!>))*)/g)) {
    if (/^\s*…/.test(m[2])) continue;
    const shape = m[1].startsWith('/') ? 'closer' : shapeOf(m[2]);
    if (!out.has(shape)) out.set(shape, `<<~ ${m[1]}${m[2].slice(0, 24)}`);
  }
  return out;
}

/** Every memetic specimen this repository pins or sweeps. */
function specimens() {
  return walkMatching([path.join(ROOT, 'corpus', 'memetic'), path.join(ROOT, 'tests', 'samples')],
    (name) => name.endsWith('.mem'));
}

const seed = resolveSeed();
if (!seed) {
  console.log('sigil-shape  no boot seed stands beside this checkout, so no shape answers');
  process.exitCode = 0;
  return;
}

const written = shapes(fs.readFileSync(seed, 'utf8'));
const files = specimens();
const carried = new Map();
for (const file of files) {
  for (const [shape, example] of shapes(fs.readFileSync(file, 'utf8'))) {
    if (!carried.has(shape)) carried.set(shape, `${path.basename(file)}: ${example}`);
  }
}

const unexercised = [...written.keys()].filter((s) => !carried.has(s)).sort();
const beyond = [...carried.keys()].filter((s) => !written.has(s)).sort();

if (verbose) {
  console.log(`  seed: ${path.relative(path.resolve(ROOT, '..'), seed)}`);
  for (const [shape, example] of [...written].sort()) {
    console.log(`  ${shape.padEnd(12)} seed ${JSON.stringify(example)}`);
    console.log(`  ${''.padEnd(12)} ${carried.has(shape) ? `spec ${carried.get(shape)}` : 'NO SPECIMEN'}`);
  }
}
for (const shape of unexercised) {
  console.error(`  the seed writes the \`${shape}\` shape and no specimen carries it — e.g. ${JSON.stringify(written.get(shape))}`);
}
for (const shape of beyond) console.log(`  a specimen carries the \`${shape}\` shape, which the seed never writes — ${carried.get(shape)}`);

console.log(`sigil-shape  ${written.size} shape(s) the seed writes across ${files.length} specimen(s), `
  + `${unexercised.length} unexercised, ${beyond.length} carried beyond the seed`);
process.exitCode = unexercised.length === 0 ? 0 : 1;
return;
