// A control that stopped controlling reports nothing, and reports it in green — the same hazard
// `must-fail.test.js` collides for the TextMate grammar, asked here of `lares meme check` instead.
//
// A specimen written to be torn stands exempt from every gate that measures well-formed carriers —
// it carries the fault on purpose, so a corpus-wide sweep would refuse it forever. The exemption
// costs nothing while the specimen still trips its fault. The day the carrier checker or the
// frame grammar reads past it clean, the specimen reports CANONICAL, keeps its exemption, and
// every other gate agrees that nothing is wrong.
//
// So a must-flag specimen declares the fault it asserts, and the declaration gets measured, both
// ways: a fault nobody can find any more, and a fault tripped that nobody declared.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { runInSandbox } = require('./grammar-sandbox.js');
const { runTool } = require('./run-tool.js');

const ROOT = path.resolve(__dirname, '..');
const live = { timeout: 600000 };

function laresOnPath() {
  try {
    execFileSync('lares', ['--version'], { stdio: 'ignore' });
    return true;
  } catch (e) {
    return e.code !== 'ENOENT';
  }
}
const HAVE_LARES = laresOnPath();
const skip = HAVE_LARES ? {} : { skip: 'no `lares` CLI stands on PATH for this collision' };

test('every must-flag specimen still trips the fault it declares', live, () => {
  const { code, out } = runTool('must-flag.js');
  assert.match(out, /must-flag  \d+ declaration\(s\)/, out.slice(-600));
  assert.strictEqual(code, 0, out.slice(-600));
});

// A specimen that goes CANONICAL under the checker: tame the declared fault in a sandbox copy —
// drop the bare-ETB carrier AND the demonstration content standing after it, the way a grammar
// reading the whole structure cleanly would leave the file (both must go: the trailing demo reads
// as content after the real close once the bare-ETB carrier stops absorbing it) — and watch the
// gate refuse.
test('a must-flag specimen that stops tripping its fault fails the gate', { ...live, ...skip }, () => {
  const heal = (sandbox) => {
    const file = path.join(sandbox, 'corpus', 'memetic', 'carriers.blockcheck.mem');
    const text = fs.readFileSync(file, 'utf8');
    const hashLine = 'ni:///sha-256;j1yWiREtBrtyp0nn-14FCoVTGPrIYWoom0NGp-WrjOE';
    const afterHash = text.indexOf(hashLine);
    const close = text.indexOf('<<^ code="&#x0004;" -> to="?">>');
    assert.ok(afterHash > 0 && close > afterHash, 'fixture shape moved; the heal needs both anchors');
    fs.writeFileSync(file, `${text.slice(0, afterHash + hashLine.length)}\n\n<<^ code="&#x0004;" -> to="?">>\n`);
  };
  const { code, out } = runInSandbox(heal, ['tools/must-flag.js']);
  assert.match(out, /etb-bare/, out.slice(-700));
  assert.notStrictEqual(code, 0, 'a specimen stopped tripping its declared fault and the gate held anyway');
});

// A fault tripped that nobody declared: strip control-set.mem's entry down to one fault while the
// file still trips two, so the checker finds a fault this ledger no longer names.
test('a specimen tripping an undeclared fault fails the gate', { ...live, ...skip }, () => {
  const narrow = (sandbox) => {
    const file = path.join(sandbox, 'corpus', 'must-flag.txt');
    const text = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, text.replace(
      'control-set.mem          frame-grammar,etb-bare',
      'control-set.mem          frame-grammar'
    ));
  };
  const { code, out } = runInSandbox(narrow, ['tools/must-flag.js']);
  assert.match(out, /etb-bare/, out.slice(-700));
  assert.notStrictEqual(code, 0, 'a specimen tripped an undeclared fault and the gate held anyway');
});
