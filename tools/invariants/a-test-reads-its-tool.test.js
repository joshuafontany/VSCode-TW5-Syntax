// Every gate's test reads the gate's OWN answer, never a second copy of its reading.
//
// A test importing a tool's deciding halves and comparing them itself holds two implementations of
// one reading, and the two drift apart in silence. Measured: the colour witness resolved its
// relations over the scope STACK a reader meets while its test resolved the same relations over bare
// scope names — so a dialect relation read green in the test file and refused in the tool, and the
// test knew nothing of which grammar a specimen opens under. The duplicate passed for as long as it
// disagreed.
//
// Importing a tool's exports stays right and useful: a unit reading pins the deciding half where a
// whole run cannot reach it. What must also stand is ONE reading of the tool's own verdict, so the
// test and the tool cannot report different things about the same corpus.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { gateNames } = require('../gate-report.js');

const ROOT = path.resolve(__dirname, '..', '..');
const scripts = require(path.join(ROOT, 'package.json')).scripts;

/** The tool each gate runs, and the test file that answers for it. */
function gateTools() {
  const out = new Map();
  for (const gate of gateNames()) {
    const m = /tools\/([A-Za-z0-9.\-_]+\.js)/.exec(scripts[gate] || '');
    if (m) out.set(m[1], gate);
  }
  return out;
}

/**
 * Whether a test file spawns the named tool and so reads the tool's own report.
 *
 * A TOOL NAME REACHES THE RUNNER THROUGH A CONSTANT AS OFTEN AS THROUGH A LITERAL. Two test files
 * hold `const WITNESS = path.join(ROOT, 'tools', '<tool>.js')` and call `runTool(WITNESS, …)`, and a
 * detector matching only an inline literal named both as blind to their own tool — a reading this
 * gate exists to refuse, made by this gate. So the two halves answer separately: the file NAMES the
 * tool somewhere, and the file SPAWNS something.
 */
function runsTool(source, tool) {
  const quoted = tool.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const names = new RegExp(`['"\`]${quoted}['"\`]`).test(source);
  const spawns = /run(?:Tool|Node|InSandbox|Provoked)\s*\(/.test(source);
  return names && spawns;
}

test('every gate has a test file that answers for it', () => {
  const orphaned = [...gateTools()]
    .filter(([tool]) => !fs.existsSync(path.join(ROOT, 'tools', tool.replace(/\.js$/, '.test.js'))))
    .map(([tool, gate]) => `${gate} (${tool})`);
  assert.deepStrictEqual(orphaned, [], `gate(s) with no test file: ${orphaned.join(', ')}`);
});

test('every gate test reads the gate\'s own verdict', () => {
  const blind = [];
  for (const [tool, gate] of gateTools()) {
    const testFile = path.join(ROOT, 'tools', tool.replace(/\.js$/, '.test.js'));
    if (!fs.existsSync(testFile)) continue;
    const source = fs.readFileSync(testFile, 'utf8');
    if (runsTool(source, tool)) continue;
    const derives = new RegExp(`require\\('\\./${tool.replace(/\./g, '\\.')}'\\)`).test(source);
    blind.push(`${gate} (${tool}) — ${derives ? 'imports its exports and re-derives the reading' : 'never runs it'}`);
  }
  assert.deepStrictEqual(blind, [],
    `${blind.length} gate test(s) never read the tool's own answer:\n  ${blind.join('\n  ')}`);
});

// THE CONTROL ON THE DETECTOR. A gate whose test plainly spawns it must read as reading it, or the
// check above passes by matching nothing at all.
test('the detector finds a test that does run its tool', () => {
  const source = fs.readFileSync(path.join(ROOT, 'tools', 'contrast-witness.test.js'), 'utf8');
  assert.ok(runsTool(source, 'contrast-witness.js'),
    'the detector missed a test that spawns its tool on four separate lines, so it can find nothing');
  // And it must NOT claim a test reads a tool it merely mentions in prose.
  assert.ok(!runsTool('// this test talks about dark-construct.js and never runs it\n', 'dark-construct.js'),
    'the detector counted a mention in a comment as a run');
  // AND THE ARM THAT CAUGHT THIS DETECTOR LYING: a name held in a constant reaches the runner too.
  const viaConstant = "const W = path.join(ROOT, 'tools', 'theme-parity.js');\nconst run = () => runTool(W, ['--verbose']);";
  assert.ok(runsTool(viaConstant, 'theme-parity.js'),
    'the detector reads a tool name only when it sits inline at the call, and named two files blind that spawn their own tool');
});
