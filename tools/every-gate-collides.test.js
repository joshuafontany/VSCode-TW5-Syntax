// PATTERN INTEGRITY: every claim stands collided.
//
// A gate that cannot fail proves nothing, and reads exactly like one that holds. Two stood measured
// here: the collapse gate whose detector named one implementation's own fingerprint, so no second
// implementation could ever trip it; and the bleed canary's exemption, a scope-prefix list that
// excused a whole family the day one arrived under a name it did not cover.
//
// Neither showed as a failure. Both showed as a green run.
//
// So this asks of every gate the manifest names: does something in this repository PLANT the fault
// it stands for and watch it fail? A test that only runs the tool and reads its summary answers
// whether the tree happens to stand clean today.
//
//   node --test tools/every-gate-collides.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const { gateNames } = require('./gate-report.js');
const scripts = require(path.join(ROOT, 'package.json')).scripts;

/** The instrument a gate runs, by file name. */
function toolOf(gate) {
  const m = /tools\/([\w.-]+\.(?:js|sh))/.exec(scripts[gate] || '');
  return m ? m[1] : null;
}

/**
 * Whether a test file plants a fault and watches the instrument find it.
 *
 * Four shapes count, and the fourth matters as much as the first. A gate whose deciding half stands
 * under unit test collides FASTER than one provoked through a sandbox: the test constructs the
 * faulty input directly and asserts a finding comes back. A test that only runs the tool over the
 * working tree and reads its summary counts for nothing here: it answers whether the tree happens
 * to stand clean today.
 */
function collides(text) {
  const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  return /runProvoked|runInSandbox/.test(code)                       // a fault written into a copy of the tree
    || /notStrictEqual\(\s*code\s*,\s*0/.test(code)                 // the tool refusing, on purpose
    || /assert\.throws/.test(code)                                    // a reader refusing, on purpose
    || /\.length,\s*[1-9]/.test(code)                                 // a finding counted, from constructed input
    || /assert\.ok\([\w.]+\.length\s*[>)]/.test(code);
}

const gates = gateNames();

test('every gate names an instrument this repository holds', () => {
  const missing = gates.filter((g) => {
    const tool = toolOf(g);
    return !tool || !fs.existsSync(path.join(ROOT, 'tools', tool));
  });
  assert.deepStrictEqual(missing, [], 'gate(s) whose instrument nothing holds');
});

// Every test file, read once.
const suites = fs.readdirSync(path.join(ROOT, 'tools')).filter((f) => f.endsWith('.test.js'))
  .map((f) => ({ file: f, text: fs.readFileSync(path.join(ROOT, 'tools', f), 'utf8') }));

/**
 * Every test file that collides one instrument.
 *
 * A gate stands collided from wherever the provocation lives, not only from the file beside it —
 * the harvest's own test provokes the rule-coverage gate, and reading only `rule-coverage.test.js`
 * calls that gate uncollided while a test plants its fault every run.
 */
function collidersOf(tool) {
  const named = new RegExp(`\\b${tool.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  return suites.filter((s) => named.test(s.text) && collides(s.text)).map((s) => s.file);
}

test('every gate carries a test somewhere', () => {
  const bare = [];
  for (const gate of gates) {
    const tool = toolOf(gate);
    if (!tool) continue;
    const named = new RegExp(`\\b${tool.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    if (!suites.some((s) => named.test(s.text))) bare.push(`${gate} -> ${tool}`);
  }
  assert.deepStrictEqual([...new Set(bare)], [], 'gate(s) no test names at all');
});

test('every gate stands collided against the fault it names', () => {
  const uncollided = [];
  for (const gate of gates) {
    const tool = toolOf(gate);
    if (!tool) continue;
    if (collidersOf(tool).length === 0) uncollided.push(`${gate} -> ${tool}`);
  }
  assert.deepStrictEqual([...new Set(uncollided)], [],
    'gate(s) whose fault nothing plants — a green run there names a clean tree, not a working gate');
});
