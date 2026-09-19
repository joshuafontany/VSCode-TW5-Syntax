// The vocabulary a grammar may choose from, measured rather than recalled.
//
// Every fork in this grammar's naming so far came from a hand-listed candidate set — four or five
// families somebody thought of, measured, and the loudest kept. A hand-written list cannot notice the
// family it missed, and the families that matter are not a matter of opinion: they are the selectors
// the bundled themes actually rule on, and how often each one leaves the colour exactly where the
// editor had it.
//
// So the atlas derives from the 65 theme files. It answers two questions per selector — how many
// themes rule on it, and how many of those buy the construct nothing — which together name the
// families worth reaching for and the families that read as prose whatever a grammar hopes.
//
// A DESIGN-TIME READING, shipping nothing. The package declares no runtime and this adds none;
// `tools/invariants/ships-no-runtime.test.js` holds that, and this tool lives where the gates live.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runTool } = require('./run-tool.js');
const { runInSandbox } = require('./grammar-sandbox.js');
const { atlas, leaveAlone } = require('./family-atlas.js');
const { probeTheme, loadThemes } = require('./theme-model.js');

const ROOT = path.resolve(__dirname, '..');
const live = { timeout: 900000 };

test('the atlas reports the families the bundled themes rule on', live, () => {
  const { code, out } = runTool('family-atlas.js');
  assert.match(out, /family-atlas\s+\d+ selector\(s\) across \d+ theme\(s\)/, out.slice(-600));
  assert.strictEqual(code, 0, out.slice(-600));
});

// A WELD TO A NUMBER ANOTHER INSTRUMENT MEASURED. The contrast reading found `variable` the single
// most-shipped leave-it-alone selector: 54 themes rule on it and 18 of those set the colour the editor
// already had. The atlas derives that from the theme files by a different path, so agreement across the
// two readings holds, and disagreement names one of them wrong.
test('the atlas agrees with the contrast reading about the variable family', live, () => {
  const rows = atlas();
  const variable = rows.find((r) => r.selector === 'variable');
  assert.ok(variable, 'the atlas found no `variable` selector, which 54 bundled themes rule on');
  assert.ok(variable.themes >= 50,
    `the atlas reads ${variable.themes} theme(s) ruling on \`variable\`, where the contrast reading measured 54`);
  assert.ok(variable.quiet >= 15,
    `the atlas reads ${variable.quiet} theme(s) leaving \`variable\` at the editor's own foreground, where the contrast reading measured 18`);
});

// THE CONTROL ON THE DERIVATION: a theme carrying exactly one rule must contribute exactly that
// selector, and a selector nothing rules on must not appear at all.
test('the atlas counts a theme it is handed and invents nothing', () => {
  const one = probeTheme('keyword.probe', { foreground: '#ff0000' }, { foreground: '#c0c0c0', background: '#101010' });
  const rows = atlas([one]);
  // A PROBE THEME CARRIES THE BASE RULES IT INHERITS BESIDE THE ONE IT DECLARES, so the arm reads
  // INVENTION rather than an exact set: every selector the atlas names must stand in the theme's own
  // rules, and the declared one must be there with its reach and its quiet count.
  const declared = new Set(one.rules.flatMap((r) => r.parts || []));
  const invented = rows.map((r) => r.selector).filter((sel) => !declared.has(sel));
  assert.deepStrictEqual(invented, [], `the atlas named selector(s) the theme never rules on: ${invented.join(', ')}`);
  const probe = rows.find((r) => r.selector === 'keyword.probe');
  assert.ok(probe, 'the atlas lost the one selector the probe theme declares');
  assert.strictEqual(probe.themes, 1);
  assert.strictEqual(probe.quiet, 0, 'a rule painting red against grey read as leaving the colour alone');
});

// AND THE ARM THAT PARTS THE TWO COUNTS: a rule painting EXACTLY the editor's foreground must read
// quiet, where the red rule above reads loud. A reading that fuses them cannot name a family worth
// reaching for.
test('a rule painting the default reads quiet', () => {
  const editor = { foreground: '#c0c0c0', background: '#101010' };
  const same = probeTheme('keyword.probe', { foreground: editor.foreground }, editor);
  const row = atlas([same]).find((r) => r.selector === 'keyword.probe');
  assert.ok(row, 'the atlas lost the probe selector');
  assert.strictEqual(row.quiet, 1, 'a rule setting the editor foreground read as buying something');
  assert.strictEqual(leaveAlone(row), 1, 'the quiet count and its accessor disagree');
});

// A SELECTOR NO THEME RULES ON HAS NO ROW. The atlas answers what themes DO, never what a grammar
// hopes they do.
test('the atlas holds no row for a family nothing rules on', live, () => {
  const rows = atlas();
  const invented = rows.find((r) => /tiddlywiki5$/.test(r.selector));
  assert.strictEqual(invented, undefined,
    `the atlas listed ${invented?.selector} — a grammar's own scope, which no theme author rules on`);
  assert.ok(loadThemes().length > 50, 'the bundled theme set went missing');
});

// THE PRICE OF A NAME, ASKED BEFORE ANYBODY MOVES IT. The atlas names loud, truthful families; what a
// candidate COSTS lives in the declared distinctions it would collapse, and reading that cost by
// applying the fork and running the gate means every candidate costs a grammar edit and an 820-pair
// sweep. Measured the slow way: one fork halved a construct's prose readings and dropped four
// distinctions below their floors, and the cost only showed once the grammar carried it.
//
// So the cost arm prices a candidate against the SAME reading the legibility gate holds — one
// implementation, two callers — with the grammar untouched.
test('the cost arm prices a candidate without moving the grammar', live, () => {
  const before = fs.readFileSync(path.join(ROOT, 'syntaxes', 'tiddlywiki5.json'), 'utf8');
  const { code, out } = runTool('family-atlas.js',
    ['--for', 'variable.name.mvv-display', '--candidates', 'entity.name.variable.mvv']);
  assert.strictEqual(code, 0, out.slice(-900));
  // It reports what the candidate buys and what it costs, per candidate.
  assert.match(out, /entity\.name\.variable\.mvv/, out.slice(-900));
  assert.match(out, /invisible/, out.slice(-900));
  assert.match(out, /fall(?:s|en)?|cost/, out.slice(-900));
  assert.strictEqual(fs.readFileSync(path.join(ROOT, 'syntaxes', 'tiddlywiki5.json'), 'utf8'), before,
    'the cost arm edited the grammar to answer');
});

// THE WELD THAT MAKES THE PRICE TRUSTWORTHY: the arm must reproduce the SLOW READING.
//
// The arm prices a candidate by substituting inside its own reading, with the grammar untouched. The
// slow reading writes the candidate INTO a grammar on disk and runs the legibility gate over it. Those
// two paths share no arithmetic, so agreement holds the arm and disagreement names it wrong — which is
// the only thing that makes a price worth consulting.
//
// DERIVED, NEVER LISTED. A weld naming the pairs by hand pins the readings of the day it was written:
// every such name goes stale the moment any unrelated scope moves, and a reader then meets a red test
// that measures the calendar rather than the instrument. The pairs come from the slow reading itself,
// so this holds whatever the grammar currently says.
//
// THE DIRECTION THAT MATTERS: every pair the gate reports FALLEN, the arm must name. The arm also
// reports drops that stay above their floor, which the gate does not print, so the arm's set stands as
// a superset by construction and an equality would fail on that difference rather than on a fault.
// A CANDIDATE STACKS AT THE END. `price()` appends a candidate to `entry.stack`, and the published
// display run's own name now already carries `entity.name.function.mvv.tiddlywiki5` last — the
// 2026-09-18 opener-namespace ruling gave it that name so `((x))` reads as `<<x>>` does. The slow
// reading below writes its own candidate into the grammar TEXT, so it must land in that same last
// place — after the FULL published name, not merely after `variable.name.mvv-display` — or the
// insertion buries itself mid-stack where nothing reads it as innermost, and prices nothing.
const PRICED = 'variable.name.mvv-display.tiddlywiki5 entity.name.function.mvv.tiddlywiki5';
const CANDIDATE = 'entity.name.variable.mvv.tiddlywiki5';

/** The pair names a legibility reading reports as fallen below their floor. */
const fallenPairs = (out) => out.split('\n')
  .map((l) => /^\s{2}(.+?)\s+—\s+\d+\/\d+ tell them apart, below the floor of \d+$/.exec(l.trimEnd()))
  .filter(Boolean).map((m) => m[1].trim());

test('the cost arm names the falls the slow reading measures', live, () => {
  // The slow reading: the candidate stacked beside the published scope in a grammar on disk.
  const grammar = fs.readFileSync(path.join(ROOT, 'syntaxes', 'tiddlywiki5.json'), 'utf8');
  const provoked = grammar.split(PRICED).join(`${PRICED} ${CANDIDATE}`);
  assert.notStrictEqual(provoked, grammar,
    `no rule names ${PRICED}, so the slow reading carries the candidate nowhere`);

  // BOTH ARMS RUN THROUGH THE SAME DOOR. A gate prints every pair standing below its floor, not the
  // pairs the candidate MOVED, so the candidate's price is a DIFFERENCE and a difference wants one
  // base. Read against a baseline taken any other way — the working tree, a previous run — the
  // subtraction picks up whatever else parts the two bases and calls it the candidate's doing.
  //
  // The unprovoked door carries the baseline: writing the grammar back UNCHANGED is refused, and
  // rightly — a sandbox that let a collision plant nothing would let a gate read green over an
  // unaltered tree and call that a measurement.
  const before = fallenPairs(runInSandbox.unprovoked(['tools/construct-legibility.js']).out);
  const slow = runInSandbox(
    (sandbox) => fs.writeFileSync(path.join(sandbox, 'syntaxes', 'tiddlywiki5.json'), provoked),
    ['tools/construct-legibility.js']);
  const measured = fallenPairs(slow.out).filter((pair) => !before.includes(pair));
  // A CONTROL ON THE PROVOCATION. A candidate that costs nothing prices nothing, and a weld built on
  // an empty set holds over any arm at all — including one that prints no falls whatsoever.
  assert.ok(measured.length > 0,
    `the slow reading moves no pair below its floor for ${CANDIDATE}, so this weld compares two empty sets: ${slow.out.slice(-600)}`);

  const { out } = runTool('family-atlas.js',
    ['--for', 'variable.name.mvv-display', '--candidates', 'entity.name.variable.mvv']);
  const missed = measured.filter((pair) => !out.includes(pair));
  assert.deepStrictEqual(missed, [],
    `the slow reading drops ${measured.length} pair(s) below their floor and the arm misses ${missed.length}: ${out.slice(-900)}`);
});
