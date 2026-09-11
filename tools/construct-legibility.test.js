// The legibility witness must read what a READER sees, and must fall when a construct loses it.
//
// Scopes can move, stay pinned, stay faithful to the parser, and still cost a reader the difference
// between two constructs — no snapshot catches that, because a snapshot pins names and a reader
// meets colours. So the collision takes a construct's distinguishing scopes away and watches the
// witness report the loss.
//
// The reading itself gets checked too, because the obvious way to build this reads CONTAINERS and
// answers backwards: measured that way a call, a filter run, a transclusion and prose resolve to one
// colour in all 65 themes, and 44 of 65 paint the containers identically. Whole constructs part from
// prose in all 65. A witness that quietly read containers would rule a healthy grammar broken, and
// nothing but this assertion tells the two readings apart.
//
//   node --test tools/construct-legibility.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runProvoked, runInSandbox } = require('./grammar-sandbox.js');
const { runTool, ROOT } = require('./run-tool.js');
const { THEMES } = require('./theme-model.js');

const GRAMMAR = path.join(ROOT, 'syntaxes', 'tiddlywiki5.json');
const live = { skip: fs.existsSync(THEMES) ? false : 'no bundled themes', timeout: 900000 };

const fallen = (out) => Number(/(\d+) fallen/.exec(out)[1]);

test('every construct a reader meets stands apart from the rest', live, () => {
  const { code, out } = runTool('construct-legibility.js');
  assert.match(out, /\d+ pair\(s\) over \d+ theme\(s\)/, out.slice(-400));
  assert.strictEqual(code, 0, out.slice(-600));
});

// A construct parts from prose through the scopes INSIDE it, so the witness must paint the whole
// specimen. A reading of the outermost scope alone reports every construct alike.
test('the reading paints whole constructs, never their containers alone', live, () => {
  const { out } = runTool('construct-legibility.js', ['--verbose']);
  const prose = out.split('\n').filter((l) => /vs\s+prose/.test(l));
  assert.ok(prose.length >= 4, `the witness compared ${prose.length} construct(s) against prose`);
  // A container reading puts call, filter run and transclusion at one colour with prose. Each of
  // those parts from it in every theme when the whole construct gets painted.
  // A CONTAINER READING PUTS THESE AT PROSE'S OWN COLOUR — near zero, never near the top. So the
  // guard reads as a floor rather than as perfection: demanding every theme encoded a ruler that
  // over-reported reach, and the settled one reads a call 65, a transclusion 65, a filter run 63.
  // A regression to container-only painting lands far below this; a truer ruler moves it by two.
  const FLOOR = 55;
  for (const name of ['a call', 'a filter run', 'a transclusion']) {
    const line = prose.find((l) => l.includes(`${name}  vs  prose`));
    assert.ok(line, `no reading for ${name} against prose`);
    const [, apart, total] = /(\d+)\/(\d+)/.exec(line);
    assert.ok(Number(apart) >= FLOOR,
      `${name} parts from prose in ${apart} of ${total} themes, below ${FLOOR}, which reads as a container`);
  }
});

// The fault: a construct keeps its structure and loses the names a theme rules on. The parser reads
// it identically, every snapshot updates cleanly, and a reader stops seeing it.
test('a construct stripped of the names themes rule on reads as a loss', live, () => {
  const provoked = fs.readFileSync(GRAMMAR, 'utf8')
    .replaceAll('punctuation.definition.call.inline.begin.tiddlywiki5 punctuation.definition.macrocallinline.begin.tiddlywiki5', 'meta.variable.call.inline.tiddlywiki5')
    .replaceAll('punctuation.definition.call.inline.end.tiddlywiki5 punctuation.definition.macrocallinline.end.tiddlywiki5', 'meta.variable.call.inline.tiddlywiki5')
    .replaceAll('punctuation.definition.call.block.begin.tiddlywiki5 punctuation.definition.macrocallblock.begin.tiddlywiki5', 'meta.variable.call.block.tiddlywiki5')
    .replaceAll('punctuation.definition.call.block.end.tiddlywiki5 punctuation.definition.macrocallblock.end.tiddlywiki5', 'meta.variable.call.block.tiddlywiki5')
    .replaceAll('variable.name.call.tiddlywiki5 variable.name.macro.tiddlywiki5', 'meta.variable.call.block.tiddlywiki5');
  assert.notStrictEqual(provoked, fs.readFileSync(GRAMMAR, 'utf8'), 'the provocation changed nothing, so it plants no fault');
  assert.strictEqual(fallen(runTool('construct-legibility.js').out), 0, 'the tree already reports a fallen pair, so the collision proves nothing');
  const { code, out } = runProvoked(provoked, ['tools/construct-legibility.js']);
  assert.ok(fallen(out) > 0,
    `a call stripped of every name a theme rules on read as legible as before: ${out.split('\n').filter((l) => /vs/.test(l)).slice(-3).join(' | ')}`);
  assert.notStrictEqual(code, 0, 'a pair fell below its floor and the gate held anyway');
});

// THE POPULATION MUST COME FROM THE HOST. Seven specimens stood here by hand and carried no
// emphasis at all, while emphasis holds the weakest readings in the table. A hand-written list
// cannot notice what it missed, so the harvest names the members and the gate answers to it.
test('a rule TiddlyWiki stands and no specimen measures reads as unmeasured', live, () => {
  const { code, out } = runInSandbox(
    (sandbox) => {
      const file = path.join(sandbox, 'editions', 'tw5-syntax', 'tiddlers', 'GrammarSignals.tid');
      const before = fs.readFileSync(file, 'utf8');
      const after = before.replace('"wikiRules": [', '"wikiRules": [\n        "invented",');
      assert.notStrictEqual(after, before, 'the provocation changed nothing, so it plants no fault');
      fs.writeFileSync(file, after);
    },
    ['tools/construct-legibility.js']);
  assert.match(out, /invented — TiddlyWiki stands this rule and no specimen measures it/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'a host rule went unmeasured and the gate held anyway');
});

// The same list read the other way. A specimen naming a rule the host dropped explains nothing, and
// a table that keeps it reports coverage it no longer has.
test('a specimen naming a rule the host dropped reads as orphaned', live, () => {
  const { code, out } = runInSandbox(
    (sandbox) => {
      const file = path.join(sandbox, 'editions', 'tw5-syntax', 'tiddlers', 'GrammarSignals.tid');
      const before = fs.readFileSync(file, 'utf8');
      const after = before.replace('        "subscript",\n', '');
      assert.notStrictEqual(after, before, 'the provocation changed nothing, so it plants no fault');
      fs.writeFileSync(file, after);
    },
    ['tools/construct-legibility.js']);
  assert.match(out, /subscript — no rule of this name stands in the harvest/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'a specimen outlived the rule it explains and the gate held anyway');
});

// A specimen that fails to fire its rule measures PROSE under a construct's name, and every pair it
// stands in reads as healthy as prose does. Nothing but this check tells the two apart.
test('a specimen that fires no rule reads as measuring prose', live, () => {
  const { code, out } = runInSandbox(
    (sandbox) => {
      const file = path.join(sandbox, 'tools', 'construct-legibility.js');
      const before = fs.readFileSync(file, 'utf8');
      const after = before.replace("bold: ['bold', \"''bold text''\"]", "bold: ['bold', 'bold text']");
      assert.notStrictEqual(after, before, 'the provocation changed nothing, so it plants no fault');
      fs.writeFileSync(file, after);
    },
    ['tools/construct-legibility.js']);
  assert.match(out, /bold — the specimen .* paints no scope beyond the base, so it measures prose/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'a specimen measured prose under a construct name and the gate held anyway');
});

// THE READING CARRIES fontStyle, and load-bearing. Most themes part bold from italic in fontStyle
// alone, so a foreground-only reading calls a grammar every reader parses instantly illegible.
test('a reading that drops fontStyle loses the emphasis constructs', live, () => {
  const { code, out } = runInSandbox(
    (sandbox) => {
      const file = path.join(sandbox, 'tools', 'construct-legibility.js');
      const before = fs.readFileSync(file, 'utf8');
      // STRIKE THE CONCEPT, NEVER A LINE. A provocation naming an exact source line stops
      // provoking the moment somebody rewrites that line, and reads green while planting no fault —
      // measured here the day the reading moved. Every mention of the property outside a comment
      // goes, so the reading falls back to foreground however it happens to compose them.
      const after = before.split('\n')
        .map((l) => (/^\s*(\/\/|\*)/.test(l) ? l : l.replace(/\$\{style\.fontStyle \|\| '-'\}|style\.fontStyle/g, "''")))
        .join('\n');
      assert.notStrictEqual(after, before, 'the provocation changed nothing, so it plants no fault');
      fs.writeFileSync(file, after);
    },
    ['tools/construct-legibility.js']);
  assert.ok(fallen(out) > 0, `a foreground-only reading reported every pair as legible as before: ${out.slice(-400)}`);
  assert.notStrictEqual(code, 0, 'pairs fell below their floors and the gate held anyway');
});
