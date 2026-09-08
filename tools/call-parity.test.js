// A call names no definition kind, and every surface that takes a parameter guards alike.
//
// TiddlyWiki superseded macros at 5.3.0 with procedures, functions and custom widgets, and
// `<<name …>>` calls all four through one syntax. The parser refuses to guess which: it builds a
// `transclude` node carrying `$variable`, because the definition may stand in another tiddler and
// nothing at the call site names it. The grammar reads one line and reaches less far still.
//
// So the first half reads TiddlyWiki rather than this repository's memory of it — a call builds a
// transclusion, and the three directives fnprocdef reads each keep their own name. Upstream moving
// either turns this red, which is the point.
//
// The second half sweeps the parameter surfaces. A parameter opens at a word boundary, never
// mid-token: without that guard an apostrophe inside a quoted value opens a second value and the
// region runs past the construct. That guard reached the call site first, and the sweep asks
// whether it reached `\define`, the three fnprocdef directives, and the `\parameters` pragma too.
// Two controls carry an unterminated value, where the region MUST run on — a sweep that reported
// every surface clean while measuring nothing would read identically without them.
//
//   node --test tools/call-parity.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { tokenize } = require('./tokenizer.js');
const { resolveTiddlyWiki, boot } = require('./tw5-oracle.js');
const { declaredNames } = require('./grammar-scopes.js');

const GRAMMAR = require('node:path').join(__dirname, '..', 'syntaxes', 'tiddlywiki5.json');
/** The call vocabulary, in one place, so the two structural readings cannot drift apart. */
const CALL = /(^|\.)call(\.|$)/;

const TW = resolveTiddlyWiki();
const live = { skip: TW ? false : 'no TiddlyWiki checkout resolved', timeout: 600000 };

test('a call builds a transclusion, so no call site names a definition kind', live, () => {
  const nodes = boot(TW).spans('<<my-thing param:"value">>');
  const call = nodes.find((n) => n.type === 'transclude');
  assert.ok(call, `TiddlyWiki builds no transclusion for a call; it built ${nodes.map((n) => n.type).join(', ')}`);
  assert.strictEqual(call.attributes.$variable.value, 'my-thing',
    'the callee travels as $variable, the way a transclusion names its target');
  const named = nodes.filter((n) => /macro/.test(n.type || ''));
  assert.deepStrictEqual(named, [], 'a call builds a node typed macro, which would let a call site name its definition kind');
});

test('the three directives fnprocdef reads each stand active under their own name', live, () => {
  const active = boot(TW).activeRules();
  for (const rule of ['macrodef', 'fnprocdef']) {
    assert.ok(active.pragma.includes(rule), `TiddlyWiki no longer stands the ${rule} rule this grammar answers to`);
  }
  // fnprocdef reads three directives through one rule. The grammar names each, so each must parse.
  for (const [directive, kind] of [['\\function f() [[x]]', 'function'], ['\\procedure p() x', 'procedure'], ['\\widget $w() x', 'widget']]) {
    const set = boot(TW).spans(`${directive}\n`).find((n) => n.type === 'set');
    assert.ok(set, `TiddlyWiki builds no definition for ${directive}`);
    const flag = { function: 'isFunctionDefinition', procedure: 'isProcedureDefinition', widget: 'isWidgetDefinition' }[kind];
    assert.strictEqual(set[flag], true, `${directive} no longer carries ${flag}`);
  }
});

// A specimen stands alone in a file, with a blank line and a plain word after it. Where the word
// carries a parameter or a quoted-value scope, a region opened inside the specimen reaches past it.
const SENTINEL = 'PLAINPROSE';
const LEAK = /param|string\.quoted/;

const HOLDS = {
  'a call': '<<foo bar="it\'s">>',
  'a \\define signature': '\\define foo(bar:"it\'s")\n\\end',
  'a \\procedure signature': '\\procedure foo(bar:"it\'s")\n\\end',
  'a \\function signature': '\\function foo(bar:"it\'s")\n\\end',
  'a \\widget signature': '\\widget $foo(bar:"it\'s")\n\\end',
  'a \\parameters pragma': '\\parameters(bar:"it\'s")'
};

// Controls. A value whose closing quote stands nowhere leaves the region open BY DESIGN — TiddlyWiki
// carries a quoted parameter across a blank line and refuses the call only where the quote never
// closes, so `corpus/carrier-ledger.txt` rules the runaway rather than bounding it.
const RUNS_ON = {
  'a call whose value never closes': '<<foo bar="never closed>>',
  'a \\define whose value never closes': '\\define foo(bar:"never'
};

/** The scopes standing on a plain word placed after `body` and a blank line. */
const after = async (body) => {
  const text = `${body}\n\n${SENTINEL}\n`;
  const lines = await tokenize('text.html.tiddlywiki5', text);
  const row = text.split('\n').indexOf(SENTINEL);
  return lines[row].flatMap((t) => t.scopes).join(' ');
};

test('every parameter surface holds an apostrophe inside a quoted value', async () => {
  for (const [name, body] of Object.entries(HOLDS)) {
    const scopes = await after(body);
    assert.ok(!LEAK.test(scopes), `${name} opens a value at an apostrophe and runs past the construct: ${scopes}`);
  }
});

test('the sweep reads a runaway where one stands', async () => {
  for (const [name, body] of Object.entries(RUNS_ON)) {
    const scopes = await after(body);
    assert.ok(LEAK.test(scopes), `${name} reads clean, so the sweep above measures nothing`);
  }
});

// Substitution divides a macro body from a procedure body, and the division stands semantic rather
// than historical. `$param$` substitutes inside a body `\\define` opened and stands as literal text
// inside one `\\procedure` opened — TiddlyWiki renders "A hello B" for the first and "A $x$ B" for
// the second. `syntaxes/tw5-substitution-injection.json` injects on `meta.variable.macro.body`
// alone for that reason, so widening that selector to reach a procedure body would paint text
// TiddlyWiki hands through untouched.
test('substitution paints where TiddlyWiki substitutes, and nowhere else', live, async () => {
  const $tw = boot(TW).$tw;
  const BODIES = { '\\define t': true, '\\procedure t': false, '\\widget $t': false };
  for (const [opener, substitutes] of Object.entries(BODIES)) {
    const source = `${opener}(x)\nA $x$ B\n\\end`;
    const lines = await tokenize('text.html.tiddlywiki5', `${source}\n`);
    const row = source.split('\n').findIndex((l) => l.includes('$x$'));
    const painted = lines[row].flatMap((t) => t.scopes).some((s) => /substitut/i.test(s));
    assert.strictEqual(painted, substitutes,
      `a body ${opener} opened ${painted ? 'paints' : 'leaves'} a substitution TiddlyWiki ${substitutes ? 'performs' : 'hands through'}`);

    // The widget directive takes a $-prefixed name, which no bare call reaches.
    if (opener.includes('$')) continue;
    $tw.wiki.addTiddler({ title: 'CallParityProbe', text: `${source}\n<<t hello>>` });
    const rendered = $tw.wiki.renderTiddler('text/plain', 'CallParityProbe').trim();
    assert.strictEqual(rendered, substitutes ? 'A hello B' : 'A $x$ B',
      `TiddlyWiki no longer divides the two bodies by substitution: ${opener} rendered ${JSON.stringify(rendered)}`);
  }
});

// A call site names a call, beside the name it publishes.
//
// `<<name …>>` reaches a macro, a procedure, a function or a custom widget, and nothing at the site
// says which — TiddlyWiki builds a `transclude` rather than guess. The scope names here guessed
// `macro` for years, and a scope name stands as a published surface: a reader's
// `editor.tokenColorCustomizations` spells one by hand, so dropping one takes their colour away
// silently. vscode-textmate returns every scope in a space-separated `name`, so a rule carries both
// — the call vocabulary first, the published name LAST, where `winner()` scores stack position and
// the later scope takes any tie. Colours hold; the vocabulary widens.
//
// A definition-side name stands outside this: it reads `\\define` and nothing else. So does the
// scope a `<$macrocall>` tag wears, which arises at READING time — every widget name in this grammar
// derives from its match as `meta.tag.widget.$3`, so no declared field spells it and the sweep below
// meets it nowhere. The reading asserts that separately, where the scope exists to be asserted.
test('every call-side scope carries the call vocabulary beside its published name', () => {
  // The shapes a CALL paints. A definition-side name matches none of them.
  const CALL_SIDE = /(^|\s)(meta\.variable\.macrocall|punctuation\.definition\.macrocall|variable\.name\.macro\.|meta\.variable\.macro\.parameters?\.|meta\.variable\.macro\.parameter\.|variable\.macro\.attribute\.)/;
  const missing = [];
  for (const value of declaredNames(GRAMMAR)) {
    if (!CALL_SIDE.test(value)) continue;
    if (!value.split(/\s+/).some((sc) => CALL.test(sc))) missing.push(value);
  }
  assert.deepStrictEqual([...new Set(missing)], [],
    'call site(s) naming a definition kind the site cannot read, with no call name beside it');
});

test('a published call name stands LAST, so no theme rule changes hands', () => {
  const wrong = [];
  for (const value of declaredNames(GRAMMAR)) {
    if (!value.includes(' ')) continue;
    const scopes = value.split(/\s+/);
    if (!scopes.some((sc) => CALL.test(sc))) continue;
    if (CALL.test(scopes[scopes.length - 1])) wrong.push(value);
  }
  assert.deepStrictEqual(wrong, [], 'a call name stands last, where it outranks the published name on a tie and moves a reader\'s colour');
});

// A widget TiddlyWiki ships answers to upstream's spelling, never to the call vocabulary. The tag
// `<$macrocall>` wears `meta.tag.widget.macrocall.html` at reading time, spelled by its own text
// through the `$3` a widget name derives from, and a reader of DECLARED fields meets `$3` instead —
// so a guard written against the declared form excludes nothing and reads as though it guards.
test('a widget wearing the upstream spelling reads as a tag, never as a call', live, async () => {
  const lines = await tokenize('text.html.tiddlywiki5', '<$macrocall $name="x"/>\n');
  const scopes = lines[0].flatMap((t) => t.scopes);
  assert.ok(scopes.includes('meta.tag.widget.macrocall.html.tiddlywiki5'),
    `the tag wears no widget scope spelled by its own text: ${[...new Set(scopes)].join(' ')}`);
  assert.ok(!scopes.some((sc) => CALL.test(sc)),
    'a widget TiddlyWiki ships reads as a call, so the call vocabulary reaches a name that answers to upstream');
});
