// A ceiling must be knock-down-able, or it reads as an excuse.
//
// The gate names readings that stand outside any grammar of this kind. That claim costs nothing to
// make and everything to trust, so each entry gets provoked: an entry whose host stops drawing the
// distinction, and an entry whose grammar starts drawing it, must both turn the gate red. A list
// that survives every provocation names a list nobody can falsify.
//
// The prose gets checked too. An entry carrying no `why` states a limit without its evidence, and an
// entry carrying no `tried` states one without an attempt — which is the shape an excuse takes when
// it dresses as architecture.
//
//   node --test tools/textmate-ceiling.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runInSandbox } = require('./grammar-sandbox.js');
const { runTool, ROOT } = require('./run-tool.js');
const { resolveTiddlyWiki } = require('./tw5-oracle.js');

const TOOL = path.join(ROOT, 'tools', 'textmate-ceiling.js');
const live = { skip: resolveTiddlyWiki() ? false : 'no TiddlyWiki checkout resolved', timeout: 900000 };

/** Rewrite the tool inside a sandbox, so a provocation never touches the tree this suite reads. */
const provoke = (from, to) => (sandbox) => {
  const file = path.join(sandbox, 'tools', 'textmate-ceiling.js');
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(from, to);
  assert.notStrictEqual(after, before, `the provocation changed nothing, so it plants no fault: ${from}`);
  fs.writeFileSync(file, after);
};

test('every ceiling this repository names still stands', live, () => {
  const { code, out } = runTool('textmate-ceiling.js');
  assert.match(out, /\d+ ceiling\(s\) measured against TiddlyWiki, 0 that no longer stand/, out.slice(-600));
  assert.strictEqual(code, 0, out.slice(-600));
});

// THE MANDATE MUST REACH THE WIKI. A list living only in a tool reaches whoever runs the tool; a
// later effort scoping a language server or a tree-sitter grammar opens the wiki. The tiddler is a
// HARVEST — hand-editing it goes stale the moment the tree moves.
// The tiddler stands COMMITTED and this test never writes it: the suite runs in parallel and other
// tests read that directory, so a check that wrote would make its own suite race. `npm run ceiling`
// carries `--write`, and the comparison below catches a harvest left behind.
test('the wiki carries the mandate, harvested and current', live, () => {
  const tid = path.join(ROOT, 'editions', 'tw5-syntax', 'tiddlers', 'TextMateCeiling.tid');
  assert.ok(fs.existsSync(tid), 'the ceiling writes no tiddler, so the wiki carries no mandate');
  const body = JSON.parse(fs.readFileSync(tid, 'utf8').split('\n\n').slice(1).join('\n\n'));
  assert.strictEqual(body.standing, body.ceilings, `${body.ceilings - body.standing} ceiling(s) no longer stand`);
  for (const entry of body.entries) {
    assert.ok(entry.answeredBy && entry.answeredBy.length > 30, `${entry.key} reaches the wiki naming no reader that closes it`);
    assert.ok(entry.measured && entry.measured.length > 10, `${entry.key} reaches the wiki carrying no measurement`);
  }
  // The harvest names the kinds a later effort sorts on, so the wiki answers the question directly.
  const answers = body.entries.map((e) => e.answeredBy).join(' ');
  assert.match(answers, /tree-sitter/, 'the harvest names no ceiling tree-sitter closes');
  assert.match(answers, /language server/, 'the harvest names no ceiling a language server closes');

  // A HARVEST LEFT BEHIND reads as a record of a tree that moved on. The live reading names the same
  // ceilings, or somebody changed the list and never ran the gate.
  const live = runTool('textmate-ceiling.js').out;
  for (const entry of body.entries) {
    assert.ok(live.includes(entry.key), `the wiki carries ${entry.key}, which the tool no longer measures`);
  }
});

// The evidence and the mandate print WITHOUT a flag. `gate-report` keeps the summary line alone, so
// anything held back for `--verbose` never reaches the record a reader opens.
test('the reading names every ceiling and the evidence under it', live, () => {
  const { out } = runTool('textmate-ceiling.js');
  for (const key of ['whole-document lookahead', 'rule-set mutation', 'verbatim storage',
    'nested coordinate space', 'cross-tiddler resolution', 'import by filter',
    'indirect attribute value', 'entity value']) {
    assert.ok(out.includes(key), `the reading names no ${key}`);
  }
  // Each ceiling prints what it MEASURED, never only what it claims.
  assert.match(out, /host parts \([^)]+\), grammar reads alike/, 'no blind ceiling printed its two host readings');
  assert.match(out, /typedblock at \d+\.\.\d+ and quoteblock at \d+\.\.\d+/, 'the space ceiling printed no offsets');
  assert.match(out, /one source, \d+ renderings/, 'no wiki ceiling printed its renderings');
  assert.match(out, /renders "… and —"; no scope carries it/, 'the value ceiling printed no computed value');
  assert.match(out, /tree-sitter/, 'no ceiling named tree-sitter as the reader that closes it');
  assert.match(out, /language server/, 'no ceiling named a language server as the reader that closes it');
});

// A ceiling stands on a distinction the HOST draws. Hand it two inputs the host reads alike and it
// names nothing standing outside anything.
test('a blind ceiling whose host stops parting the two inputs fails the gate', live, () => {
  const { code, out } = runInSandbox(
    provoke("    b: `<<foo\\n${'x\\n'.repeat(6)}`,", "    b: `<<foo\\n${'x\\n'.repeat(6)}>>\\n`,"),
    ['tools/textmate-ceiling.js']);
  assert.match(out, /the host reads both inputs alike/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'a ceiling standing on no distinction held the gate anyway');
});

// The other direction, and the one that matters most: a ceiling somebody CLOSED must retire rather
// than sit in the list claiming a limit the grammar no longer has.
test('a blind ceiling the grammar now parts fails the gate', live, () => {
  // The probe reads line 0 of each input. Pointing the two readings at different lines stands in for
  // a grammar that tells them apart, since the gate compares exactly those two scope sets.
  const { code, out } = runInSandbox(
    provoke('      const grammarB = await painted(c.b, c.line);',
      '      const grammarB = await painted(c.b, c.line + 1);'),
    ['tools/textmate-ceiling.js']);
  assert.match(out, /the ceiling stands closed and wants retiring/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'a closed ceiling held the gate anyway');
});

// A phantom names structure the grammar paints where the host builds none. Point it at a line the
// grammar paints nothing on and it claims nothing.
test('a phantom ceiling the grammar paints nothing for fails the gate', live, () => {
  const { code, out } = runInSandbox(
    provoke("    source: '\\\\define d()\\n! A heading\\n\\\\end\\n',\n    line: 1,",
      "    source: '\\\\define d()\\n! A heading\\n\\\\end\\n',\n    line: 0,"),
    ['tools/textmate-ceiling.js']);
  assert.match(out, /the grammar paints nothing there/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'a phantom claiming no structure held the gate anyway');
});

// A limit stated without evidence reads as a limit; a limit stated without an attempt reads as an
// excuse. Both get spelled, and the lengths keep a one-word placeholder from passing for either.
test('every ceiling states its evidence and the attempts made against it', () => {
  const source = fs.readFileSync(TOOL, 'utf8');
  const entries = [...source.matchAll(/key: '([^']+)',\s*\n\s*answeredBy: '([^']*)',\s*\n\s*shape: '(\w+)',\s*\n\s*what: '([^']*)',\s*\n\s*why: '([^']*)',\s*\n\s*tried: '([^']*)'/g)];
  assert.ok(entries.length >= 5, `only ${entries.length} ceiling(s) parse as entries, so the check reads less than the list`);
  for (const [, key, answeredBy, , what, why, tried] of entries) {
    assert.ok(what.length > 20, `${key} states what it names in ${what.length} characters`);
    assert.ok(why.length > 80, `${key} carries ${why.length} characters of evidence, which reads as a claim rather than a measurement`);
    assert.ok(tried.length > 20, `${key} names no attempt against it, which reads as an excuse rather than a limit`);
    // A limit nobody can act on reads as a complaint. The field that turns this list into a mandate
    // must name a KIND OF READER, so a later effort sorts on it rather than re-deriving the answer.
    assert.ok(answeredBy.length > 30, `${key} names no reader that closes it, so the entry states a limit and no mandate`);
  }
});

// A WIKI ceiling stands on what the wiki holds AROUND the bytes. Hand it two states that render
// alike and it names nothing standing outside the file.
test('a wiki ceiling whose states render alike fails the gate', live, () => {
  const { code, out } = runInSandbox(
    provoke("      untagged: [{ title: 'CeilingImport', text: '\\\\define imported() IMPORTED', tags: 'OtherTag' }]",
      "      untagged: [{ title: 'CeilingImport', text: '\\\\define imported() IMPORTED', tags: 'CeilingTag' }]"),
    ['tools/textmate-ceiling.js']);
  assert.match(out, /every wiki state renders alike/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'a wiki ceiling standing on no distinction held the gate anyway');
});

// A VALUE ceiling stands on the host computing something the source does not say. Hand it a source
// the host renders unchanged and it names no value to stand outside of.
test('a value ceiling the host renders unchanged fails the gate', live, () => {
  const { code, out } = runInSandbox(
    provoke("    source: '&hellip; and &#x2014;',", "    source: 'plain words only',"),
    ['tools/textmate-ceiling.js']);
  assert.match(out, /renders the source unchanged/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'a value ceiling computing nothing held the gate anyway');
});
