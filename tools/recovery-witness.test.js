// TiddlyWiki recovers out loud. This asks whether the grammar shows a reader the wound.
//
//   node --test tools/recovery-witness.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runTool, ROOT } = require('./run-tool.js');
const { runInSandbox } = require('./grammar-sandbox.js');
const { resolveTiddlyWiki, boot } = require('./tw5-oracle.js');

const live = { skip: false, timeout: 600000 };

// FEATURE-DETECTED, the same way recovery-witness.js itself decides: `WikiParser.addDiagnostic` is
// this repository's own fork's own addition, and the pinned devDependency's `parseText` carries no
// `diagnostics` array on any input. Every test below that needs an actual diagnostic to stand on
// SKIPS where this reader carries none, rather than reading the tool's own honest SKIP as a
// failure.
const supportsDiagnostics = Array.isArray(boot(resolveTiddlyWiki()).parse('x').diagnostics);
const diagnosticsLive = supportsDiagnostics
  ? live
  : { skip: 'this reader carries no parser diagnostics API', timeout: 600000 };

// TiddlyWiki's parser recovers from an unterminated construct and RECORDS the recovery — 17 wiki
// rules raise a code. The grammar carries no notion of any of them, so a reader meets an
// unterminated bold painted exactly like a bold that closed.
//
// A reader without the diagnostics API answers neither PASS nor FAIL — recovery-witness.js reports
// SKIP instead, and this is the control: the tool still exits clean, and still says why.
test('the witness reads the host diagnostics and reports what the grammar marks, or SKIPs honestly where the reader carries none', live, () => {
  const { out, code } = runTool('recovery-witness.js');
  assert.strictEqual(code, 0, out.slice(-600));
  if (supportsDiagnostics) {
    assert.match(out, /recovery-witness  \d+ diagnostic\(s\) across \d+ carrier\(s\), \d+ code\(s\)/, out.slice(-600));
  } else {
    assert.match(out, /^recovery-witness {2}SKIP —.*diagnostics API/m, out.slice(-600));
  }
});

// THE POPULATION COMES FROM THE HOST. A code this repository never met still reaches the reading
// the day somebody writes a carrier that raises it.
test('the codes derive from the host, never from a list here', diagnosticsLive, () => {
  const { out } = runTool('recovery-witness.js', ['--verbose']);
  for (const code of ['unterminated-bold', 'unterminated-quoteblock']) {
    assert.match(out, new RegExp(code), `the sweep never met \`${code}\`: ${out.slice(-400)}`);
  }
});

// The gate: a code standing silent with no ruling fails, the way an unruled swallow does.
test('a silent code with no ruling fails the gate', diagnosticsLive, () => {
  const { code, out } = runInSandbox(
    (sandbox) => {
      const ledger = path.join(sandbox, 'corpus', 'recovery-ledger.txt');
      const before = fs.readFileSync(ledger, 'utf8');
      const after = before.split('\n').filter((l) => !/^silent unterminated-bold/.test(l)).join('\n');
      assert.notStrictEqual(after, before, 'the provocation changed nothing, so it plants no fault');
      fs.writeFileSync(ledger, after);
    },
    ['tools/recovery-witness.js']);
  assert.match(out, /unterminated-bold/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'a code stood silent with no ruling and the gate held anyway');
});

// And the other direction: a ruling that explains no code outlives what it explains.
test('a ruling explaining no code fails the gate', diagnosticsLive, () => {
  const { code, out } = runInSandbox(
    (sandbox) => {
      const ledger = path.join(sandbox, 'corpus', 'recovery-ledger.txt');
      fs.appendFileSync(ledger, '\nsilent unterminated-nothing-reads-this  # a ruling naming a recovery no carrier raises\n');
    },
    ['tools/recovery-witness.js']);
  assert.match(out, /explaining nothing|no carrier raises/, out.slice(-600));
  assert.notStrictEqual(code, 0, 'a stale ruling stood and the gate held anyway');
});

// A RULING MUST NAME WHERE THE ANSWER LIVES. Every code the grammar cannot mark is a line item
// the language server must carry, and a ruling that names no ceiling hands the LSP nothing.
test('every ruling names a ceiling that stands', live, () => {
  const ceiling = fs.readFileSync(path.join(ROOT, 'tools', 'textmate-ceiling.js'), 'utf8');
  const ledger = fs.readFileSync(path.join(ROOT, 'corpus', 'recovery-ledger.txt'), 'utf8');
  for (const raw of ledger.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = /#\s*(?:.*?)\bceiling:\s*([a-z -]+)/.exec(line);
    assert.ok(m, `a ruling names no ceiling, so nothing inherits it: ${JSON.stringify(line)}`);
    assert.ok(ceiling.includes(`'${m[1].trim()}'`) || ceiling.includes(`"${m[1].trim()}"`),
      `the ruling names a ceiling that stands nowhere: ${m[1].trim()}`);
  }
});

// EVERY RECOVERY THE HOST DECLARES WANTS A CARRIER. The population above comes from what the
// corpus RAISES, which answers a narrower question than what the host can raise: a rule nobody
// wrote a specimen for stays silent in both readers and reads exactly like a rule with nothing to
// say. So the codes come from the host's own rule sources, and each one must reach a ruling.
//
// A BLOCK CONSTRUCT THAT NEVER CLOSES SWALLOWS EVERY RECOVERY AFTER IT, which is why each block
// shape takes a carrier of its own rather than a line in a shared one.
test('every unterminated recovery the host declares reaches a ruling', diagnosticsLive, () => {
  const rules = path.join(resolveTiddlyWiki(), 'core', 'modules', 'parsers', 'wikiparser', 'rules');
  assert.ok(fs.existsSync(rules), `the host's wiki rules stand nowhere at ${rules}`);
  // THE RULES NEST. Six of the sixteen live under `rules/emphasis/`, so a flat read of the
  // directory finds ten, reports a smaller population than the host declares, and goes quiet about
  // every code it never looked at.
  const declared = new Set();
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, e.name);
      if (e.isDirectory()) { walk(file); continue; }
      if (!file.endsWith('.js')) continue;
      for (const m of fs.readFileSync(file, 'utf8').matchAll(/code:\s*"(unterminated-[a-z-]+)"/g)) declared.add(m[1]);
    }
  };
  walk(rules);
  assert.ok(declared.size >= 16, `${declared.size} recovery code(s) read from the host, which reads as a reader that found little`);
  const ruled = new Set();
  for (const raw of fs.readFileSync(path.join(ROOT, 'corpus', 'recovery-ledger.txt'), 'utf8').split('\n')) {
    const m = /^silent\s+(\S+)/.exec(raw.trim());
    if (m) ruled.add(m[1]);
  }
  const unexercised = [...declared].filter((c) => !ruled.has(c)).sort();
  assert.deepStrictEqual(unexercised, [],
    `recovery code(s) the host declares that no carrier raises, so nothing measures whether the grammar marks them`);
});
