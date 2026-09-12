// Running an instrument and reading what it said.
//
// A gate answers in two parts: an exit code, and the lines it printed. A test that reads only the
// code learns nothing about WHY, and one that lets the throw escape reads a failing gate as a
// broken test. Twenty-six files here spawn through this module, so a refusal it swallows or a
// stream it drops moves twenty-six readings at once and none of them names it.
//
// THREE THINGS MUST HOLD:
//
//   A NON-ZERO EXIT READS AS A RESULT. A gate that refuses IS the measurement; a throw escaping
//   here reads a working gate as a broken test.
//   BOTH STREAMS ARRIVE. A tool names its finding on stderr and its summary on stdout, so a reader
//   taking one of the two reads half a verdict.
//   THE REPOSITORY ROOT DECIDES. Every instrument resolves the corpus, the grammars and the
//   manifest from there, so a run inheriting a caller's directory measures somewhere else.
//
//   node --test tools/run-tool.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runNode, runTool, ROOT } = require('./run-tool.js');

test('a tool that holds hands back its lines and a zero', () => {
  const { code, out } = runNode(['-e', 'console.log("held")']);
  assert.strictEqual(code, 0);
  assert.match(out, /held/);
});

// A GATE THAT REFUSES IS THE MEASUREMENT. The throw stays inside.
test('a tool that refuses reads as a result rather than as a fault', () => {
  const { code, out } = runNode(['-e', 'console.log("said"); process.exit(3)']);
  assert.strictEqual(code, 3, 'a refusal came back as something other than its own exit code');
  assert.match(out, /said/, 'a refusing tool lost the lines it printed');
});

// BOTH STREAMS, the way a reader sees them. A tool names its finding on stderr.
test('what a tool printed arrives whole, both streams together', () => {
  const { out } = runNode(['-e', 'console.log("summary"); console.error("MISSING one thing"); process.exit(1)']);
  assert.match(out, /summary/, 'stdout dropped out of a refusing tool\'s reading');
  assert.match(out, /MISSING one thing/, 'stderr dropped, so a reader takes a verdict with no reason');
});

// A tool that dies before printing anything still answers, rather than throwing past its caller.
test('a tool that throws answers with a code and its trace', () => {
  const { code, out } = runNode(['-e', 'throw new Error("bare refusal")']);
  assert.notStrictEqual(code, 0);
  assert.match(out, /bare refusal/, 'a throwing tool came back carrying nothing a reader can act on');
});

// THE REPOSITORY ROOT DECIDES, so an instrument resolves the corpus from where the corpus stands.
test('a tool runs at the repository root unless a caller names somewhere else', () => {
  assert.strictEqual(runNode(['-e', 'process.stdout.write(process.cwd())']).out, ROOT,
    'an instrument ran where its caller stood, so every relative path it opens moved');
  const elsewhere = fs.realpathSync(os.tmpdir());
  assert.strictEqual(runNode(['-e', 'process.stdout.write(process.cwd())'], { cwd: elsewhere }).out, elsewhere);
  assert.ok(fs.existsSync(path.join(ROOT, 'package.json')), 'the root names no repository');
});

// AN ENVIRONMENT ADDS TO THIS PROCESS'S OWN. Replacing it strips PATH, and a tool that spawns
// `npx` or `bash` then fails for a reason nothing in the reading names.
test('a named environment adds to this process\'s own rather than replacing it', () => {
  const { out } = runNode(['-e', 'process.stdout.write(`${process.env.PROBE}|${Boolean(process.env.PATH)}`)'],
    { env: { PROBE: 'set' } });
  assert.strictEqual(out, 'set|true', 'a named environment replaced the inherited one, so PATH went missing');
});

// `runTool` names a file under `tools/`, and takes an absolute path as it stands.
test('a tool resolves by name under tools, and an absolute path passes through', () => {
  // A bare name resolves under `tools/`, wherever the caller stands.
  assert.strictEqual(runTool('region-kind.js', [], { cwd: os.tmpdir() }).code, 0,
    'a bare tool name resolved against the caller\'s directory rather than against tools/');
  const probe = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'run-tool-')), 'probe.js');
  try {
    fs.writeFileSync(probe, 'process.stdout.write("absolute")');
    assert.strictEqual(runTool(probe).out, 'absolute',
      'an absolute path got joined under tools/, so a caller outside the tree cannot name its own probe');
  } finally {
    fs.rmSync(path.dirname(probe), { recursive: true, force: true });
  }
});

test('arguments reach the tool in the order a caller names them', () => {
  const probe = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'run-tool-')), 'probe.js');
  try {
    fs.writeFileSync(probe, 'process.stdout.write(process.argv.slice(2).join(","))');
    assert.strictEqual(runTool(probe, ['--first', 'second']).out, '--first,second');
    // THE CONTROL: no arguments hands the tool none, rather than an empty string it reads as one.
    assert.strictEqual(runTool(probe).out, '');
  } finally {
    fs.rmSync(path.dirname(probe), { recursive: true, force: true });
  }
});

// A KILLED CHILD IS NOT A MEASUREMENT.
//
// `execFileSync` reports a signal death as `status: null` with whatever the child had already written,
// and returning `{code: 1, out: partial}` hands that back as though the tool had RUN and REFUSED.
// Measured under a full parallel sweep: a reading crossed the 1 MB `maxBuffer` default, Node killed
// its writer with SIGTERM at 1 070 461 bytes, and the death read as a legibility gate reporting a pair
// standing at 65 of 65 as missing — so a reader chased a grammar defect that was a dead process.
test('a tool killed by a signal refuses to read as a refusal', () => {
  assert.throws(
    () => runNode(['-e', 'process.kill(process.pid, "SIGKILL")']),
    /died by SIGKILL/,
    'a signal death came back as a reading');
});

// A READING LONGER THAN THE BUFFER GETS ITS WRITER KILLED, so a gate's own verbose output must fit.
test('a reading far past the old default arrives whole', () => {
  const { code, out } = runNode(['-e', 'process.stdout.write("x".repeat(3 * 1024 * 1024))']);
  assert.strictEqual(code, 0);
  assert.strictEqual(out.length, 3 * 1024 * 1024, 'the reading came back short, so a buffer clipped it');
});
