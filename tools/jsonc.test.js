// The reader must tolerate exactly what the editor tolerates.
//
// No more, so a file VS Code refuses cannot pass a gate here; no less, so a comment a contributor
// writes cannot fail one. Three gates read a JSONC file through this — the manifest, a language
// configuration, and the dialect's own — and each of them trusts this reading over its own.
//
//   node --test tools/jsonc.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { parseJsonc } = require('./jsonc.js');

test('the JSONC reader tolerates what VS Code tolerates', () => {
  assert.deepStrictEqual(parseJsonc('{ "a": 1, /* b */ "c": [2,], // d\n }'), { a: 1, c: [2] });
  // A comment marker inside a string stays inside the string.
  assert.deepStrictEqual(parseJsonc('{ "u": "http://x/y" }'), { u: 'http://x/y' });
});

// THE CONTROL: a reader tolerating everything tolerates a broken file too, so the refusal wants
// proving beside the tolerance.
test('the reader still refuses what no editor accepts', () => {
  assert.throws(() => parseJsonc('{ "a": }'), 'a value-less key parsed as something');
  assert.throws(() => parseJsonc('{ "a" 1 }'), 'a missing colon parsed as something');
});
