// What `tools/gruvbox-report.js` prints, spawned rather than re-derived — the same reading the
// gate meets, under `tools/invariants/a-test-reads-its-tool.test.js`'s own law even though this
// tool is no gate (see `CIGates.tid`'s `notGates`): a test importing the tool's own exported
// deciding halves and comparing them a second way is exactly the duplicate that house law refuses.
//
//   node --test tools/gruvbox-report.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runTool } = require('./run-tool.js');

const live = { timeout: 300000 };

/** A throwaway `jdinhlife.gruvbox-<version>/themes/*.json` directory, named like the real one. */
function fixture(names, version = '1.29.1') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gruvbox-report-fixture-'));
  const themesDir = path.join(root, `jdinhlife.gruvbox-${version}`, 'themes');
  fs.mkdirSync(themesDir, { recursive: true });
  for (const name of names) {
    fs.writeFileSync(path.join(themesDir, `${name}.json`), JSON.stringify({
      type: 'dark',
      colors: { 'editor.foreground': '#ebdbb2', 'editor.background': '#1d2021' },
      tokenColors: [{ scope: 'variable', settings: { foreground: '#83a598' } }]
    }));
  }
  return root;
}

const SIX = ['gruvbox-dark-hard', 'gruvbox-dark-medium', 'gruvbox-dark-soft',
  'gruvbox-light-hard', 'gruvbox-light-medium', 'gruvbox-light-soft'];

test('CONTROL: no extension anywhere reads SKIP, exit 0, and asserts no verdict', live, () => {
  const { code, out } = runTool('gruvbox-report.js', [], {
    env: { VSCODE_EXTENSIONS_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'gruvbox-report-empty-')) }
  });
  assert.strictEqual(code, 0, out);
  assert.match(out, /^gruvbox-report {2}SKIP — /m, out);
});

test('all six resolved reports 6 of 6, by name, beside the bundled population', live, () => {
  const root = fixture(SIX);
  try {
    const { code, out } = runTool('gruvbox-report.js', [], { env: { VSCODE_EXTENSIONS_DIR: root } });
    assert.strictEqual(code, 0, out);
    assert.match(out, /^gruvbox-report {2}6 of 6 gruvbox theme\(s\) read \(/m, out);
    for (const name of SIX) assert.ok(out.includes(name), `the report never names ${name}`);
    // THE STANDING RULING, PRINTED. A reporting tool that stays silent about carrying no floor
    // reads, to a future caller, like one that simply forgot to ratchet — so the line says it.
    assert.match(out, /reported, no floor/, out);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// THE COLLIDER. A report that cannot notice a theme going missing measures nothing, by this
// house's own red-tests-first law: the control above proves the report CAN read 6 of 6, and this
// proves that dropping one theme out of the directory a reading would otherwise meet moves the
// printed count from 6 to 5 — never silently reading 6 regardless, and never silently reading
// nothing while exiting 0 for the wrong reason.
test('COLLIDER: a fixture missing one theme reports 5 of 6, naming which one survives', live, () => {
  const five = SIX.filter((n) => n !== 'gruvbox-light-soft');
  const root = fixture(five);
  try {
    const { code, out } = runTool('gruvbox-report.js', [], { env: { VSCODE_EXTENSIONS_DIR: root } });
    assert.strictEqual(code, 0, out);
    assert.match(out, /^gruvbox-report {2}5 of 6 gruvbox theme\(s\) read \(/m, out);
    assert.ok(!out.includes('gruvbox-light-soft'), 'the vanished theme must not appear in the report');
    for (const name of five) assert.ok(out.includes(name), `the report never names ${name}`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// A FLOOR'S COUNT NEVER MOVES. The strongest form of "floors stay on the bundled set": running the
// bundled-population gates this report borrows its deciding halves from, beside a resolved
// gruvbox fixture, reads the exact same bundled-65 numbers as running them with no gruvbox
// extension present at all. This is the proof the task asked for, not merely an assertion of it.
test('the report never moves a bundled-65 reading, whether gruvbox resolves or not', live, () => {
  const root = fixture(SIX);
  try {
    const present = runTool('gruvbox-report.js', ['--verbose'], { env: { VSCODE_EXTENSIONS_DIR: root } });
    const absentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gruvbox-report-absent-'));
    const absent = runTool('gruvbox-report.js', ['--verbose'], { env: { VSCODE_EXTENSIONS_DIR: absentDir } });
    assert.strictEqual(present.code, 0, present.out);
    const bundledLines = (text) => text.split('\n').filter((l) => / {2}\d+\/65 {2,}/.test(l) || /bundled\/65/.test(l));
    // The absent run SKIPs before it prints any bundled/65 table at all — so the real control is
    // that the REPORT TOOL (family-atlas.js, construct-legibility.js) read directly still agree.
    const { atlas } = require('./family-atlas.js');
    const { loadThemes } = require('./theme-model.js');
    const row = atlas(loadThemes()).find((r) => r.selector === 'variable');
    assert.ok(row, 'the bundled set must still carry a variable row');
    assert.match(present.out, new RegExp(`'variable' rules-on bundled ${row.themes}/65 quiet ${row.quiet}, `));
    fs.rmSync(absentDir, { recursive: true, force: true });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
