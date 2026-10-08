// The attribute guard measures a cost, and the measurement decides a ruling.
//
// html.js takes attributes in a loop and refuses the WHOLE tag at the first stretch that parses as
// no attribute. A TextMate begin pattern can express that law; whether this grammar SHOULD adopt it
// turns on a ratio, and `tests/known-gaps/an-unparseable-attribute-refuses-the-tag.tw5.test` carries
// the ruling that ratio decides.
//
// So the instrument answers to two things: the guard reads what it claims to read, and the two
// readings — whole tags, and tags cut mid-keystroke — part the way the ruling says they part. A
// guard that admitted everything would report perfect agreement and reverse the ruling silently.
//
//   node --test tools/attribute-guard.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { GUARD } = require('./attribute-guard.js');
const { runTool } = require('./run-tool.js');
const { resolveTiddlyWiki } = require('./tw5-oracle.js');

const live = { skip: resolveTiddlyWiki() ? false : 'no TiddlyWiki checkout resolved', timeout: 600000 };

test('the guard admits a well-formed tag and refuses the three shapes the parser refuses', () => {
  // The three stand recorded in the known gap, measured against html.js rather than reasoned about.
  for (const tag of ['<$link to="x">', '<$text text=<<m>>/>', '<div class="a">', '<$link ###>']) {
    assert.ok(GUARD.test(tag), `the guard refuses ${tag}, which the parser builds`);
  }
  for (const tag of ['<$link to=<<>>>', '<$link a/b="x">', '<$link to: "x">']) {
    assert.ok(!GUARD.test(tag), `the guard admits ${tag}, which the parser refuses`);
  }
});

test('a guard that admitted everything would read as perfect agreement', () => {
  // The collision, stated on the deciding half. The instrument counts a disagreement per tag; a
  // guard matching anything disagrees with the parser only where the parser refuses, and the ratio
  // the ruling turns on collapses to nothing.
  const anything = /^/;
  const refused = ['<$link to=<<>>>', '<$link a/b="x">', '<$link to: "x">'];
  assert.strictEqual(refused.filter((t) => !anything.test(t)).length, 0,
    'a guard matching anything still refused something');
  assert.strictEqual(refused.filter((t) => !GUARD.test(t)).length, 3,
    'the guard stopped refusing the shapes the ruling rests on');
});

test('the two readings part, and the cut one costs more', live, () => {
  const whole = runTool('attribute-guard.js');
  const cut = runTool('attribute-guard.js', ['--cut=1']);
  assert.strictEqual(whole.code, 0, whole.out.slice(-300));
  assert.strictEqual(cut.code, 0, cut.out.slice(-300));
  const tight = (out) => Number(/(\d+)\s+the guard refuses and the parser BUILDS/.exec(out)[1]);
  assert.match(cut.out, /\[cut\]/, 'the cut reading names itself');
  assert.ok(tight(cut.out) > tight(whole.out),
    `cut ${tight(cut.out)} against whole ${tight(whole.out)} — the cut reading must cost more, or it reads the same tags`);
});

test('the instrument refuses loudly where no TiddlyWiki stands', () => {
  const { code, out } = runTool('attribute-guard.js', [], { env: { TW5_PATH: path.join(__dirname, 'no-such-checkout') } });
  // The oracle falls back past a bad TW5_PATH, so this reads the message rather than the exit. What
  // counts: a missing host names itself instead of reporting agreement over nothing.
  assert.ok(code === 2 || /tag\(s\)/.test(out), out.slice(-200));
});
