// The vocabulary a runaway files under.
//
// A ledger key names a CAUSE. Read a stack by POSITION and one cause files two ways — the same call
// keys under `meta.variable.call.block` where it opens a block and under `meta.paragraph` where it
// opens inside prose, and the second stands on 18% of the corpus while naming a fault that reaches
// one construct. Two witnesses read this vocabulary, and the breadth ceiling counts its keys, so a
// change here moves a ratchet that guards against generous ruling.
//
// Three rules hold it:
//
//   INNERMOST FIRST. The enclosing region decides nothing; the region the cut left open does.
//   `markup.*` NAMES NO KIND. It stands on 38% of corpus tokens, so a runaway filed under it
//   absorbs any finding — the exact shape the ceiling exists to refuse.
//   AN UNCLAIMED STACK SAYS SO. A default drawn from position reads like a classification and puts
//   a ruling about a container into the ledger.
//
//   node --test tools/region-kind.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { KINDS, kindOf } = require('./region-kind.js');

test('one cause keys the same however it stands enclosed', () => {
  const inProse = ['text.html.tiddlywiki5', 'meta.paragraph.tiddlywiki5',
    'meta.variable.call.inline.tiddlywiki5', 'meta.variable.macrocallinline.tiddlywiki5',
    'meta.variable.call.parameter.tw-.tiddlywiki5', 'string.unquoted.html.tiddlywiki5'];
  const atBlock = ['text.html.tiddlywiki5', 'meta.variable.call.block.tiddlywiki5',
    'meta.variable.macrocallblock.tiddlywiki5', 'meta.variable.call.parameters.tiddlywiki5'];
  assert.strictEqual(kindOf(inProse), kindOf(atBlock),
    'the same open region keys two ways depending on what encloses it');
  assert.strictEqual(kindOf(inProse), 'meta.variable.call.*');
});

// INNERMOST FIRST, and the reading must show it on a stack where the two answers differ.
test('the innermost claimed region names the kind, never the outermost', () => {
  const stack = ['text.html.tiddlywiki5', 'meta.table.tiddlywiki5', 'meta.codeblock.tiddlywiki5'];
  assert.strictEqual(kindOf(stack), 'meta.codeblock.*',
    'an outer region named the kind, so a fault inside it files under its container');
  // THE CONTROL: the same two regions, the other way round.
  assert.strictEqual(kindOf(['text.html.tiddlywiki5', 'meta.codeblock.tiddlywiki5', 'meta.table.tiddlywiki5']),
    'meta.table.*');
});

// A stack no kind claims must SAY SO. Falling back to whatever scope sits first hands back a key
// reading like a classification, and the ledger then holds a ruling about a container.
test('a stack no kind claims reads as unclassified, naming what stood there', () => {
  const key = kindOf(['text.html.tiddlywiki5', 'meta.nothing.here.tiddlywiki5']);
  assert.match(key, /unclassified/, `an unclaimed stack keyed as ${key}`);
  assert.match(key, /meta\.nothing\.here\.tiddlywiki5/,
    'the unclassified reading names nothing, so a reader cannot see what it declined');
  // A stack carrying only the base scopes names bare text rather than an empty reading.
  assert.strictEqual(kindOf(['text.html.tiddlywiki5']), '(unclassified: bare text)');
});

// `markup.*` NAMES NO KIND, deliberately. It stands on 38% of corpus tokens, so a runaway filed
// under it absorbs any finding — and the ledger then reads settled while nothing settled.
test('markup claims no kind, so a runaway under it gets examined', () => {
  assert.match(kindOf(['text.html.tiddlywiki5', 'markup.bold.tiddlywiki5']), /unclassified/,
    'markup claimed a kind, so any finding files under a key covering a third of the corpus');
  assert.deepStrictEqual(KINDS.filter(([key]) => key.startsWith('markup')), [],
    'the vocabulary grew a markup kind, which absorbs any finding put beside it');
});

// A GUEST GRAMMAR'S OWN ROOT reads as embedded ground, and this grammar's own roots must not.
test('a guest source root reads as embedded, and this grammar\'s roots do not', () => {
  assert.strictEqual(kindOf(['text.html.tiddlywiki5', 'source.css']), 'meta.embedded.*');
  assert.strictEqual(kindOf(['text.html.tiddlywiki5', 'meta.embedded.block.python']), 'meta.embedded.*');
  // THE CONTROL: the host's own source root names no guest.
  assert.match(kindOf(['source.tiddlywiki5.tid-file', 'meta.nothing.tiddlywiki5']), /unclassified/,
    'this grammar\'s own root read as a guest language');
});

// EVERY KIND MUST BE REACHABLE. A pattern no stack can fire adds a key to the vocabulary that the
// breadth ceiling counts and nothing can ever produce.
test('every kind in the vocabulary answers to some stack', () => {
  const unreached = KINDS.filter(([key, re]) => !re.test(key.replace(/\*$/, 'probe')));
  assert.deepStrictEqual(unreached.map(([k]) => k), [],
    'kind(s) whose own canonical key their pattern refuses — the key names ground the pattern cannot reach');
});
