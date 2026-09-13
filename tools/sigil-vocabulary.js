#!/usr/bin/env node
// The dialect's specimens exercise the vocabulary the house actually writes.
//
// `memetic-coverage` asks whether every scope the dialect DECLARES gets reached. This asks the
// question from the other side: whether every sigil the boot seed WRITES stands in a specimen at
// all. A grammar can declare a rich vocabulary, reach every scope it declares, and never once meet
// the form a carrier in the wild carries.
//
// THE SEED NAMES THE POPULATION, never a list here. Measured before this stood: the specimens
// carried `<<~ hud Focus(10) Feedback(3)>>`, `<<~ syad 🏛️>>` and `<<~ moves a -> b>>` — three forms
// the seed had already retired — while writing none of `set`, `oracle`, `stance`, `carry`, `focus`,
// `drift-ward`, `frame` or `loops`, which it writes constantly. A hand-written specimen list cannot
// notice a vocabulary moving underneath it.
//
// THE SEED STANDS OUTSIDE THIS REPOSITORY, in the operator's own carriers. A contributor holding
// only this checkout meets no seed, and the reading says so and passes rather than failing for a
// file that was never theirs to hold — the same shape `resolveTiddlyWiki` takes.
//
//   node tools/sigil-vocabulary.js [--verbose]

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ONE RESOLVER. The house keeps them beside the oracle: a tool growing a second walks its own
// candidate list, and the two answer differently the day a path moves.
const { resolveSeed } = require('./tw5-oracle.js');

const ROOT = path.resolve(__dirname, '..');
const verbose = process.argv.includes('--verbose');

/**
 * Every sigil name a carrier writes, closers folded onto the name they close.
 *
 * A NAME FOLLOWED BY AN ELLIPSIS NAMES NOTHING. The seed explains its own grammar in its own
 * grammar — `<<~ name …>>` invokes `<<~name …>>` — and a reader taking that literally reads the
 * metavariable `name` as a sigil the house writes, then teaches a specimen to invent one.
 */
function sigilNames(text) {
  const names = new Set();
  for (const m of text.matchAll(/<<~[ \t]*\/?([a-zA-Z][\w-]*)([^>\n]{0,4})/g)) {
    if (/^\s*\u2026/.test(m[2])) continue;
    names.add(m[1]);
  }
  return names;
}

/** Every memetic specimen this repository sweeps or pins. */
function specimens() {
  const out = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, e.name);
      if (e.isDirectory()) { walk(file); continue; }
      if (file.endsWith('.mem')) out.push(file);
    }
  };
  walk(path.join(ROOT, 'corpus', 'memetic'));
  walk(path.join(ROOT, 'tests', 'samples'));
  return out;
}

const seed = resolveSeed();
if (!seed) {
  console.log('sigil-vocabulary  no boot seed stands beside this checkout, so no vocabulary answers');
  process.exitCode = 0;
  return;
}

const written = sigilNames(fs.readFileSync(seed, 'utf8'));
const files = specimens();
const carried = new Set();
for (const file of files) for (const n of sigilNames(fs.readFileSync(file, 'utf8'))) carried.add(n);

const unexercised = [...written].filter((n) => !carried.has(n)).sort();
// A specimen naming a sigil the seed never writes shows a reader a form the house retired. It reads
// as a finding rather than a fault: another carrier may write it, and the reading says which.
const unknown = [...carried].filter((n) => !written.has(n)).sort();

if (verbose) {
  console.log(`  seed: ${path.relative(path.resolve(ROOT, '..'), seed)}`);
  console.log(`  written by the seed : ${[...written].sort().join(' ')}`);
  console.log(`  carried by specimens: ${[...carried].sort().join(' ')}`);
}
for (const n of unexercised) console.error(`  the seed writes \`<<~ ${n}\` and no specimen carries it`);
for (const n of unknown) console.log(`  a specimen carries \`<<~ ${n}\`, which the seed never writes`);

console.log(`sigil-vocabulary  ${written.size} sigil(s) the seed writes across ${files.length} specimen(s), `
  + `${unexercised.length} unexercised, ${unknown.length} carried beyond the seed`);
process.exitCode = unexercised.length === 0 ? 0 : 1;
return;
