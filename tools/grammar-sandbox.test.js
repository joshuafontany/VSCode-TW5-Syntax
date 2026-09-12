// A sandbox must meet the same host the tree meets.
//
// `resolveTiddlyWiki` prefers a checkout standing beside this repository and falls back to the
// pinned devDependency. A sandbox stands in the system temp directory, where no checkout stands
// beside it, so every collision run there resolved the PACKAGE instead — measured, 5.4.1 against the
// checkout's 5.5.0-prerelease. A collision proving a gate catches a fault then proves it against a
// parser the gate never runs on, and the two agree until the day they do not.
//
// `TW5_PATH` outranks every candidate, and nothing was passing it.
//
//   node --test tools/grammar-sandbox.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { runInSandbox } = require('./grammar-sandbox.js');
const { resolveTiddlyWiki } = require('./tw5-oracle.js');

const live = { skip: resolveTiddlyWiki() ? false : 'no TiddlyWiki checkout resolved', timeout: 600000 };

test('a sandbox resolves the same TiddlyWiki the tree resolves', live, () => {
  // `tw5-oracle-path.js` carries no test file of its own BY DESIGN: it prints one path and nothing
  // else, and which host a run resolved only differs INSIDE a sandbox, where no checkout stands
  // beside it. This reading is the only place the answer can vary.
  const { out } = runInSandbox.unprovoked(['tools/tw5-oracle-path.js']);
  const printed = out.trim().split('\n').filter((l) => l.trim()).pop();
  assert.ok(printed, `the probe printed nothing at all: ${out.slice(-300)}`);
  assert.strictEqual(printed, resolveTiddlyWiki(),
    'a sandbox meets a different TiddlyWiki than this tree does, so every collision run there proves its gate against another parser');
});

// The probe must actually answer, or the check above passes on a tree that resolves nothing either.
test('the tree resolves a TiddlyWiki to compare against', () => {
  assert.ok(resolveTiddlyWiki(), 'no checkout resolves here, so the comparison has nothing to hold');
});

// A PROVOCATION THAT CHANGES NOTHING PROVES NOTHING, AND READS EXACTLY LIKE ONE THAT WORKS.
//
// Fifty call sites here plant a fault in a sandbox; fourteen asserted their own mutation landed. The
// other thirty-six could stop provoking the day the thing they strike moves — measured four times in
// one session: a strike naming one corpus file, a strike naming an exact source line, a strike
// truncating at the angle inside an arrow, and an anchored replace striking once per anchor.
//
// So the HARNESS proves it rather than each caller: fourteen hand-written guards collapse into one
// that nobody can forget. A caller provoking nothing on purpose says so out loud.
test('a provocation that alters nothing gets refused', () => {
  assert.throws(
    () => runInSandbox(() => {}, ['tools/tw5-oracle-path.js']),
    /provocation altered nothing/,
    'a no-op provocation ran and the harness said nothing');
});

test('a provocation naming itself a no-op stands allowed', () => {
  const { out } = runInSandbox.unprovoked(['tools/tw5-oracle-path.js']);
  assert.match(out, /\S/, 'the unprovoked door ran nothing');
});
