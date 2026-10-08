// A gate sets its verdict; it never calls `process.exit`.
//
// `process.exit` abandons whatever stdout has not drained. Measured on the legibility witness, which
// prints 820 lines: six runs under CPU contention returned 171, 742 and 820 pairs with an exit status
// of 0 every single time, so nothing in the answer told a short reading from a complete one — and the
// test reading it blamed the grammar for pairs a dead write had eaten. The same six runs under the
// same load, with the verdict SET instead of called, returned 820 pairs every time.
//
// So no gate calls it. `process.exitCode` leaves the loop free to drain and the process leaves on its
// own, which costs a gate nothing: none of them has work to abandon by the time it reports.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { gateNames } = require('../gate-report.js');

const ROOT = path.resolve(__dirname, '..', '..');
const scripts = require(path.join(ROOT, 'package.json')).scripts;

/** The tool file each gate the manifest names actually runs. */
function gateFiles() {
  const out = [];
  for (const gate of gateNames()) {
    const m = /tools\/([A-Za-z0-9.\-_]+\.js)/.exec(scripts[gate] || '');
    if (m) out.push({ gate, file: path.join('tools', m[1]) });
  }
  return out;
}

test('no gate abandons its own reading by calling process.exit', () => {
  const calling = gateFiles()
    .filter(({ file }) => /process\.exit\s*\(/.test(fs.readFileSync(path.join(ROOT, file), 'utf8')))
    .map(({ gate, file }) => `${gate} (${file})`);
  assert.deepStrictEqual(calling, [],
    `${calling.length} gate(s) call process.exit, which drops undrained stdout:\n  ${calling.join('\n  ')}`);
});

// THE CONTROL ON THE CURE: a migration that simply deleted the call would leave every gate reporting
// success whatever it measured. Each one must still carry a verdict.
test('every gate still carries a verdict to report', () => {
  const silent = gateFiles()
    .filter(({ file }) => !/process\.exitCode/.test(fs.readFileSync(path.join(ROOT, file), 'utf8')))
    .map(({ gate }) => gate);
  assert.deepStrictEqual(silent, [],
    `${silent.length} gate(s) set no exit code at all, so a refusal reads as agreement: ${silent.join(', ')}`);
});
