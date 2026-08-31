// Which TiddlyWiki the gates answer to, and in what order they choose it.
//
// The divergence gates take their verdicts from TiddlyWiki's own parser, so which copy of it
// resolves decides what every one of them means. Two copies can stand at once and both boot:
//
//   a CHECKOUT beside this repository — where parser work happens, and where a change lands
//     before any release carries it
//   the pinned devDependency — one released version, identical on every machine, so a
//     contributor holding only this repository still runs every gate rather than skipping them
//
// The checkout outranks the package. A released parser answering for gates aimed at unreleased
// parser work would report agreement with something nobody is editing, and both resolve, and
// both boot, so nothing would say which one answered.
//
// TW5_PATH outranks both, for a contributor whose checkout lives elsewhere.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { resolveTiddlyWiki } = require('../../tools/tw5-oracle.js');

const ROOT = path.resolve(__dirname, '..', '..');
const pkg = require(path.join(ROOT, 'package.json'));

test('TiddlyWiki stands pinned, exactly, and only for development', () => {
  const pin = (pkg.devDependencies || {}).tiddlywiki;
  assert.ok(pin, 'no tiddlywiki devDependency — a contributor without a checkout runs no gate');
  assert.match(pin, /^\d+\.\d+\.\d+$/, `the pin reads "${pin}"; a range lets the gates drift between machines`);
  assert.strictEqual((pkg.dependencies || {}).tiddlywiki, undefined, 'a parser the gates read must not ship to users');
});

test('a checkout beside this repository outranks the pinned package', () => {
  const sibling = path.resolve(ROOT, '..', 'TiddlyWiki5');
  if (!fs.existsSync(path.join(sibling, 'boot', 'boot.js'))) {
    // No checkout stands here, so the package answers and the order cannot be read.
    assert.ok(resolveTiddlyWiki(), 'neither a checkout nor the package resolved');
    return;
  }
  assert.strictEqual(
    resolveTiddlyWiki(),
    sibling,
    'the pinned package answered where a checkout stands — every gate would then read a released parser'
  );
});

test('something always resolves, so no gate skips for want of a parser', () => {
  const resolved = resolveTiddlyWiki();
  assert.ok(resolved, 'nothing resolved; the divergence gates would skip and the suite would still read green');
  assert.ok(
    fs.existsSync(path.join(resolved, 'boot', 'boot.js')),
    `resolved ${resolved}, which carries no boot/boot.js`
  );
});
