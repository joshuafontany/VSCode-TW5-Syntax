// Every ledger an instrument reads, and every ledger an instrument names.
//
// Thirteen ledger and ceiling files stand under `corpus/`, and each earned its seat by a
// measurement. Nothing held the two sides together:
//
//   a ledger OUTLIVING its instrument keeps a number nobody consults, and reads exactly like one
//   guarding something — this house has already watched a ceiling re-seat four times in one
//   session before anyone asked what still read it;
//   an instrument naming a ledger NOTHING HOLDS reads an absent file as an empty ruling, so every
//   finding falls outside every key and the gate reports whatever an empty ledger makes it report.
//
// BOTH SIDES DERIVE. The disk says which ledgers stand; the instruments say which ones get opened,
// read out of their CODE — a name standing only in a comment opens nothing, and a reading that
// counts it calls a dead ledger live.
//
// A test names no ledger here. A test may read one to plant a fault, which says nothing about
// whether any instrument still consults it.
//
//   node --test tools/invariants/corpus-ledgers.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

/** Every file under a directory, walked. */
function walk(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walk(full));
    else found.push(full);
  }
  return found;
}

/** A file's code, with its comments removed — a comment naming a ledger opens nothing. */
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** The ledgers standing under a corpus directory. */
const standing = (dir) => fs.readdirSync(dir).filter((f) => f.endsWith('.txt')).sort();

/** The ledgers a set of readers names in code, mapped to the readers naming each. */
function named(files) {
  const found = new Map();
  for (const file of files) {
    for (const m of code(fs.readFileSync(file, 'utf8')).matchAll(/([a-z0-9-]+\.txt)/g)) {
      if (!found.has(m[1])) found.set(m[1], []);
      found.get(m[1]).push(path.basename(file));
    }
  }
  return found;
}

/** The instruments: every source under `tools/` that is not a test, plus the manifest that runs them. */
const instruments = () => [
  ...walk(path.join(ROOT, 'tools')).filter((f) => f.endsWith('.js') && !f.endsWith('.test.js')),
  path.join(ROOT, 'package.json')
];

test('every ledger standing on disk, some instrument opens', () => {
  const reads = named(instruments());
  const orphans = standing(path.join(ROOT, 'corpus')).filter((f) => !reads.has(f));
  assert.deepStrictEqual(orphans, [],
    'ledger(s) no instrument reads — each one guards nothing while reading exactly like a guard');
});

test('every ledger an instrument names, the corpus holds', () => {
  const stand = new Set(standing(path.join(ROOT, 'corpus')));
  const reads = named(instruments());
  const phantom = [...reads].filter(([f]) => !stand.has(f))
    .map(([f, by]) => `${f} <- ${[...new Set(by)].join(', ')}`);
  assert.deepStrictEqual(phantom, [],
    'instrument(s) naming a ledger nothing holds — an absent file reads as an empty ruling, so every finding falls outside every key');
});

// THE READING MUST SEE WHAT IT CLAIMS TO SEE. A derivation finding nothing over an empty population
// agrees with any tree at all.
test('the derivation reaches the ledgers it claims to hold together', () => {
  const stand = standing(path.join(ROOT, 'corpus'));
  const reads = named(instruments());
  assert.ok(stand.length >= 10, `${stand.length} ledger(s) stand, so this agreement proves little`);
  for (const ledger of stand) {
    assert.ok((reads.get(ledger) || []).length > 0, `${ledger} maps to no reader`);
  }
});

// THE COLLISION, over a scratch pair — `corpus/` carries numbers two other gates read, and a fault
// planted there stands for whatever another reader meets in the meantime.
test('an orphan ledger and a phantom reader both read as findings', () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'ledgers-'));
  try {
    const corpus = path.join(scratch, 'corpus');
    fs.mkdirSync(corpus);
    fs.writeFileSync(path.join(corpus, 'held-ledger.txt'), 'a ruling\n');
    fs.writeFileSync(path.join(corpus, 'orphan-ledger.txt'), 'a ruling nobody reads\n');
    const reader = path.join(scratch, 'reader.js');
    fs.writeFileSync(reader, [
      "read('held-ledger.txt');",
      "read('absent-ledger.txt');",
      "// a comment naming quiet-ledger.txt opens nothing"
    ].join('\n'));

    const reads = named([reader]);
    const stand = new Set(standing(corpus));

    assert.deepStrictEqual(standing(corpus).filter((f) => !reads.has(f)), ['orphan-ledger.txt'],
      'a ledger no reader names passed as read');
    assert.deepStrictEqual([...reads.keys()].filter((f) => !stand.has(f)), ['absent-ledger.txt'],
      'a reader naming a ledger nothing holds passed as reading one');
    assert.ok(!reads.has('quiet-ledger.txt'),
      'a ledger named only in a comment counted as read, so a dead ledger reads live');
    // THE CONTROL: the ledger both sides agree on lands in neither finding.
    assert.ok(stand.has('held-ledger.txt') && reads.has('held-ledger.txt'));
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});
