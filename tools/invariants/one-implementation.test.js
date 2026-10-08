// One computation, one implementation.
//
// Four tools read themes and each carried its own loader and matching rule; ten asked bash for the
// grammar set and each carried the same two lines; three resolved the TiddlyWiki this repo answers
// to; two parsed a `.tid`. Each set stood identical on the day somebody wrote it, and would part
// on the day one of them learned something.
//
// This holds the collapse. A tool reaching past a shared module to do the work itself fails here,
// and so does a shared module nothing reads — a collapse nobody uses costs the same as the
// duplication it replaced, without the honesty of looking duplicated.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const { walkMatching } = require('../walk.js');

const TOOLS = path.join(ROOT, 'tools');

// Every source under `tools/`, from a WALK. A listing stops at the first directory it meets, so a
// file one level down escapes every rule here and carries a second implementation unnoticed.
// The reading keys on the BARE NAME, so an allowance names a file rather than a path to it.
const all = walkMatching(TOOLS, (name) => name.endsWith('.js'))
  .map((f) => ({ name: path.basename(f), text: fs.readFileSync(f, 'utf8') }));

// The instruments alone. A test sits beside the instrument it collides, and naming the work marks how
// it collides — `theme-paint.test.js` reads a theme on purpose, to prove the tool reads it the same
// way. Holding a test to the rule would forbid the collision that proves the rule.
const sources = all.filter((s) => !s.name.endsWith('.test.js'));

// Spelled in pieces: a rule that names the thing it forbids reads as its own offender.
const ENV = `TW5_${'PATH'}`;

/** The code of a file, with its comments removed — a comment naming a thing does not do it. */
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// Each shared module, the work it holds, and the file allowed to do that work itself.
const COLLAPSED = [
  { module: 'theme-model.js', doing: /tokenColors/, what: 'reading what a theme paints' },
  { module: 'tokenizer.js', doing: /source \.\/grammars\.sh/, what: 'resolving the grammar set' },
  // A detector naming ONE implementation's fingerprint can only ever pass. This one named the
  // line-scan wiki-data does, so six tools splitting a tiddler on two newlines in a row stood clear
  // of it — and carried a reading that missed 34 of TiddlyWiki's own tiddlers. It names both
  // idioms now: the work, rather than the file that holds it.
  { module: 'wiki-data.js', doing: /indexOf\('\\n\\n'\)|lines\[i\]\.trim\(\) === ''/,
    what: 'parsing a tiddler file' },
  // Nine tools carried the same recursive listing — `for (const entry of fs.readdirSync(dir,
  // { withFileTypes: true })...) { if directory recurse, else keep it }` — darkness-witness.js's
  // and ablation-witness.js's own `carriers()` byte-for-byte identical, attribute-witness.js's and
  // filter-witness.js's own `tiddlers()` the same. The fingerprint names the WORK (the readdirSync
  // call the withFileTypes recursion shares), never walk.js's own file, per the wiki-data.js entry
  // above: a detector naming one implementation's fingerprint could only ever pass.
  // Three ledgers share one shape — `<field> ... "<quoted text>" # reason` — and
  // ablation-witness.js, darkness-witness.js and bracket-witness.js each carried the same
  // `keyOf`/`readLedger` pair over it, differing only in field count and the enum's own words.
  // The fingerprint names the shared regex tail, since that is the shape the three of them
  // duplicated — a ledger of a DIFFERENT shape (delimiter-ledger.txt's freeform prose, say)
  // never matches it, so this never fires on the ledgers that stayed their own.
  { module: 'ledger-shape.js', doing: /\\\\s\*#\\\\s\?\(\.\*\)\$/,
    what: 'parsing a `<field> ... "text" # reason` ledger line' },
  { module: 'walk.js', doing: /readdirSync\([^,]+,\s*\{\s*withFileTypes:\s*true\s*\}\)/,
    what: 'walking a directory tree',
    // A caller doing more than LISTING while it walks — copying a file, pruning a directory by
    // name, bounding depth, stopping early once it has enough — is not the work walk.js holds,
    // even though it shares the same readdirSync call to get there. Collapsing one of these into
    // a plain walk would silently drop the extra behaviour, so each stands named with the reason.
    exempt: {
      'grammar-sandbox.js': 'copies each entry into a sandbox AS it walks — the walk is incidental '
        + 'to the copy, never the same work of merely listing what walk.js holds',
      'page-palette.js': 'bounds recursion at a fixed depth and stops once it has enough matches — '
        + 'a sampling walk over a large host tree, not an exhaustive listing',
      'still.js': 'prunes node_modules/.git/.worktrees/attic BY NAME while it walks a tree that can '
        + 'reach well outside this repository — a plain walk has no way to say what to skip',
      'ledger-claims.js': 'reads corpus/ ONE LEVEL ONLY, deliberately never recursing — a ledger '
        + 'stands beside its rulings, not nested, and a recursive reading would start treating a '
        + "subdirectory's own non-ledger .txt as a ledger"
    }
  }
];

for (const { module: owner, doing, what, exempt } of COLLAPSED) {
  test(`only ${owner} does the work of ${what}`, () => {
    const others = sources
      .filter((s) => s.name !== owner)
      .filter((s) => !(exempt && exempt[s.name]))
      .filter((s) => doing.test(code(s.text)))
      .map((s) => s.name);
    assert.deepStrictEqual(others, [], `tool(s) doing their own ${what} beside ${owner}`);
  });

  if (exempt) {
    test(`${owner}'s exemptions still name a file doing the work, for a reason that still holds`, () => {
      const stale = Object.keys(exempt).filter((name) => {
        const file = sources.find((s) => s.name === name);
        return !file || !doing.test(code(file.text));
      });
      assert.deepStrictEqual(stale, [], `exemption(s) for a file that no longer does the work of ${what}`);
    });
  }

  test(`${owner} stands read`, () => {
    const readers = sources.filter((s) => s.name !== owner)
      .filter((s) => new RegExp(`require\\('\\./${owner.replace('.js', '')}`).test(s.text));
    assert.ok(readers.length > 0, `nothing reads ${owner}, so the collapse holds nothing together`);
  });
}

// Host resolution collapsed the same way, and a second resolver would answer differently the day
// either one learned something.
test('only the oracle resolves the TiddlyWiki this repo answers to', () => {
  const others = all.filter((s) => s.name !== 'tw5-oracle.js' && s.name !== 'tw5-oracle.test.js')
    .filter((s) => /candidates\.push\(path\.resolve/.test(code(s.text))
      || new RegExp(`process\\.env\\.${ENV}\\s*(\\?\\?|\\|\\|)`).test(code(s.text)))
    .map((s) => s.name);
  assert.deepStrictEqual(others, [], 'file(s) resolving a host of their own beside the oracle');
});

// Spawning a child and reading both halves of its answer — the exit code and the lines — collapsed
// the same way. Five tests carried the same seven lines to run an instrument, three more to boot the
// edition, and two inside the sandbox. A tenth written afresh reads a non-zero exit as a broken test
// rather than as the measurement it carries, and a witness whose oracle died answers every question
// with "no" and reports agreement everywhere.
//
// Spelled in pieces, so a rule that names the thing it forbids does not read as its own offender.
const SPAWN = `execFileSync('${'node'}'`;
test('only run-tool.js spawns a child and reads both halves of the answer', () => {
  const others = all.filter((s) => s.name !== 'run-tool.js')
    .filter((s) => code(s.text).includes(SPAWN))
    .map((s) => s.name);
  assert.deepStrictEqual(others, [], 'file(s) spawning a child of their own beside run-tool.js');
});

// Collecting the scopes a grammar declares collapsed last of all, and the delay cost a measurement.
// Three readers stood: the shared one, one inside the dialect's coverage test, and one inside the
// theme reader. Two of the three read the grammar's ROOT `name` as a scope — the language name, not
// a scope — putting nine words into the declared set that nothing can ever reach. The corpus
// answered to 526 declared scopes where 517 stand, and nine sat forever among the ones it reports as
// handed to another grammar.
//
// The third reader had it right, in a comment beside the check. A collapse gate that names one
// implementation's fingerprint could not see the other two, so this one names the field a collector
// reads, and carries a reason for each file that names it without collecting.
// Spelled in pieces, so a rule that names the field it watches does not read as its own offender.
const FIELD = `content${'Name'}`;
const READS_CONTENT_NAME = {
  'embedded-languages.test.js':
    `reads ${FIELD} ALONE, for the regions that hand a language to a guest grammar — a different question`,
  'grammar-selector-parity.test.js':
    'lists it among the keys TextMate defines, to catch a rule carrying a key TextMate does not',
  'terminator-closure.js':
    "reads one rule's own name while reporting on that rule, never a set over the grammar",
  'engine-witness.js':
    'names the rule a refused pattern belongs to, so a reader can find it — one label per refusal, never a set',
  'theme-parity.test.js':
    `strips one ${FIELD} from a copy of the grammar, to provoke the gate it collides`,
  'delimiter-inheritance.js':
    `reads WHERE a region's content boundary sits against its own delimiters — the field marks the `
    + `boundary rather than naming a vocabulary, and a rule's delimiters fall outside it by `
    + `construction, which is the whole question`,
  'delimiter-inheritance.test.js':
    `builds rules carrying the field, to collide the reading above against a shape it must refuse`,
  'construct-legibility.test.js':
    `REWRITES the field across a copy of the grammar, to strip a construct of every painted name and `
    + `prove a reader loses it — a provocation naming exact strings stopped provoking the day a `
    + `construct gained a name the list never held`
};
test('only grammar-scopes.js collects the scopes a grammar declares', () => {
  const others = all.filter((s) => s.name !== 'grammar-scopes.js')
    .filter((s) => code(s.text).includes(FIELD))
    .filter((s) => !READS_CONTENT_NAME[s.name])
    .map((s) => s.name);
  assert.deepStrictEqual(others, [], 'file(s) collecting scope names beside grammar-scopes.js');
});

test('every allowance for reading that field still names a file that reads it', () => {
  const stale = Object.keys(READS_CONTENT_NAME)
    .filter((name) => {
      const file = all.find((s) => s.name === name);
      return !file || !code(file.text).includes(FIELD);
    });
  assert.deepStrictEqual(stale, [], 'allowance(s) for a file that no longer reads the field');
});

// A test answers to the same rule here. Two of them read `TW5_PATH` and fell back to a sibling
// checkout by hand, which the oracle already does with three more candidates behind it — so a
// contributor whose TiddlyWiki stands somewhere the oracle finds and the hand-rolled pair does not
// saw those two skip while every other gate ran.
test('a test resolves its host through the oracle as well', () => {
  const rolled = all.filter((s) => s.name.endsWith('.test.js') && s.name !== 'tw5-oracle.test.js')
    .filter((s) => code(s.text).includes(ENV) && !/require\('\.\/tw5-oracle/.test(s.text))
    .map((s) => s.name);
  assert.deepStrictEqual(rolled, [], `test(s) reaching for ${ENV} without the oracle`);
});

// A TEST FILE REQUIRED BY ANOTHER RUNS ITS ASSERTIONS AGAIN.
//
// `node:test` registers a test when its file is REQUIRED, so a reader living inside a test file makes
// every consumer re-register that file's whole suite. Measured: one such reader left twelve
// assertions running three times each and inflated the reported pass count by twenty-four, and a
// failure there reported three times for one defect.
//
// A reader two files need is a MODULE. This gate names the inversion rather than the reader, so the
// next one caught is caught for the same reason.
test('no test file stands required by another', () => {
  const offenders = [];
  for (const s of all) {
    if (!/\.test\.js$/.test(s.name)) continue;
    for (const m of code(s.text).matchAll(/require\(\s*['"]([^'"]*\.test\.js)['"]\s*\)/g)) {
      offenders.push(`${s.name} requires ${m[1]}`);
    }
  }
  assert.deepStrictEqual(offenders, [],
    'a required test file registers its assertions again, so the suite counts them twice and a failure reports twice');
});
