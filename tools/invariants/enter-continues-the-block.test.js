// Enter inside a block continues THAT block, not a different one.
//
// `onEnterRules` takes a fixed `appendText` and no backreference, so nothing in the editor stops a
// rule matching a bullet list and continuing it with a heading marker. The mistake costs a reader
// a construct they did not type, inserted by the extension, in the surface they reach for with
// their hands rather than their eyes — and it reads as their own typo.
//
// So the two halves of every rule get welded: the marker its `beforeText` MATCHES and the marker
// its `appendText` WRITES must spell the same thing. Read off the rules themselves, so a rule added
// tomorrow answers here on its own.
//
// And a rule must continue a block the HOST really builds. The corpus answers a different
// question — what a reader of this repository meets — and a reader's own file holds whatever they
// typed, so for an editing affordance TiddlyWiki decides what the language has.
//
//   node --test tools/invariants/enter-continues-the-block.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { parseJsonc } = require('../jsonc.js');
const { walkMatching } = require('../walk.js');
const { resolveTiddlyWiki, boot, flatten } = require('../tw5-oracle.js');

const host = resolveTiddlyWiki();
const live = { skip: host ? false : 'no TiddlyWiki checkout resolved', timeout: 300000 };

const ROOT = path.resolve(__dirname, '..', '..');
const manifest = require(path.join(ROOT, 'package.json'));

/** Every language configuration the manifest registers, by the file that holds it. */
function configurations() {
  const files = [...new Set((manifest.contributes.languages || [])
    .map((l) => l.configuration).filter(Boolean).map((p) => p.replace(/^\.\//, '')))];
  return files.map((file) => ({
    file,
    config: parseJsonc(fs.readFileSync(path.join(ROOT, file), 'utf8'))
  }));
}

/** Every wikitext-bearing specimen this repository holds, line by line. */
function corpusLines() {
  const files = walkMatching(
    [path.join(ROOT, 'corpus'), path.join(ROOT, 'tests', 'samples')],
    (name) => /\.(tw|tw5|tiddlywiki5|mem|tid|multids)$/.test(name)
  );
  return files.flatMap((f) => fs.readFileSync(f, 'utf8').split('\n'));
}

const configs = configurations();
const LINES = corpusLines();

test('every language configuration the manifest names carries enter rules', () => {
  assert.ok(configs.length > 1, `only ${configs.length} configuration(s) reached — the derivation thinned`);
  for (const { file, config } of configs) {
    assert.ok(Array.isArray(config.onEnterRules) && config.onEnterRules.length > 0,
      `${file} carries no onEnterRules, so Enter continues nothing it reads`);
  }
});

// THE WELD. A rule's own `beforeText`, fed a line built from its own `appendText`, must match —
// which can only hold when the two name the same marker at the same depth.
test('every rule continues the marker it matched', () => {
  for (const { file, config } of configs) {
    for (const rule of config.onEnterRules) {
      const appended = (rule.action || {}).appendText;
      assert.ok(appended, `${file}: a rule appends nothing: ${rule.beforeText}`);
      const re = new RegExp(rule.beforeText);
      assert.ok(re.test(`${appended}x`),
        `${file}: a rule matching \`${rule.beforeText}\` writes \`${appended}\` — `
        + 'the marker it continues reads as a different marker from the one it matched');
    }
  }
});

// NO RULE FIRES TWICE ON ONE LINE. Without the lookaheads, `^\*` matches a `**` line too, and VS
// Code takes the FIRST rule that matches — so a second-level bullet would continue as a first.
test('a line fires exactly one rule', () => {
  for (const { file, config } of configs) {
    for (const rule of config.onEnterRules) {
      const line = `${(rule.action || {}).appendText}x`;
      const firing = config.onEnterRules.filter((r) => new RegExp(r.beforeText).test(line));
      assert.strictEqual(firing.length, 1,
        `${file}: \`${line}\` fires ${firing.length} rules — `
        + `${firing.map((r) => r.beforeText).join(' and ')}`);
    }
  }
});

// A RULE MUST CONTINUE A BLOCK THE HOST REALLY BUILDS.
//
// THE CORPUS ANSWERS THE WRONG QUESTION HERE, and asking it cost a true rule: reading "does any
// specimen carry this marker" retired `###`, because this repository happens to write `***` and
// not `###`. A reader's file holds whatever they typed, and TiddlyWiki builds a list for both. The
// corpus measures what the READER meets; the host says what the LANGUAGE has. For an editing
// affordance the host decides.
test('every rule continues a block TiddlyWiki builds', live, () => {
  const oracle = boot(host);
  for (const { file, config } of configs) {
    for (const rule of config.onEnterRules) {
      const line = `${(rule.action || {}).appendText}item`;
      const nodes = flatten(oracle.parse(line).tree);
      const rules = new Set(nodes.map((n) => n.rule).filter(Boolean));
      assert.ok(!rules.has('parseblock') || rules.size > 1,
        `${file}: \`${line}\` builds a bare paragraph — the rule continues a marker the host reads as prose`);
      assert.ok(rules.size > 0,
        `${file}: \`${line}\` fires no parser rule at all`);
    }
  }
});

// AND THE CORPUS STILL GETS READ, as a reporting line rather than a gate: a marker standing in no
// specimen continues correctly and goes unexercised by every snapshot here, which is worth knowing
// and not worth refusing.
test('the corpus exercises most of what the rules continue', () => {
  assert.ok(LINES.length > 1000, `only ${LINES.length} corpus line(s) read — the walk thinned`);
  for (const { file, config } of configs) {
    const unexercised = config.onEnterRules
      .filter((rule) => !LINES.some((line) => new RegExp(rule.beforeText).test(line)))
      .map((rule) => (rule.action || {}).appendText.trim());
    assert.ok(unexercised.length <= 2,
      `${file}: ${unexercised.length} rule(s) match no specimen — ${unexercised.join(' ')}`);
  }
});

// THE COLLISION. Both welds above would pass over an empty rule set, and the second would pass over
// a set whose rules never overlap by luck. These planted rules carry the two real mistakes.
test('a rule writing the wrong marker, and a pair that both fire, read as findings', () => {
  const crossed = { beforeText: '^\\*(?!\\*)\\s+\\S', action: { indent: 'none', appendText: '# ' } };
  assert.ok(!new RegExp(crossed.beforeText).test(`${crossed.action.appendText}x`),
    'a rule matching a bullet and writing a heading read as welded');

  // A LOOKAHEAD IS WHAT STOPS THE OVERLAP, and the first spelling of this collider proved nothing:
  // `^\\*\\s+\\S` never matches `** x` either, because the second `*` stands where the whitespace has
  // to. The overlap a lookahead really prevents comes from a QUANTIFIED marker.
  const greedy = [
    { beforeText: '^\\*+\\s+\\S', action: { appendText: '* ' } },
    { beforeText: '^\\*\\*\\s+\\S', action: { appendText: '** ' } }
  ];
  const firing = greedy.filter((r) => new RegExp(r.beforeText).test('** x'));
  assert.strictEqual(firing.length, 2,
    'a quantified marker read as firing once beside its own depth — the overlap went unmeasured');
});
