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

const live = { skip: false, timeout: 600000 };

// TiddlyWiki's parser recovers from an unterminated construct and RECORDS the recovery — 17 wiki
// rules raise a code. The grammar carries no notion of any of them, so a reader meets an
// unterminated bold painted exactly like a bold that closed.
test('the witness reads the host diagnostics and reports what the grammar marks', live, () => {
  const { out } = runTool('recovery-witness.js');
  assert.match(out, /recovery-witness  \d+ diagnostic\(s\) across \d+ carrier\(s\), \d+ code\(s\)/, out.slice(-600));
});

// THE POPULATION COMES FROM THE HOST. A code this repository never met still reaches the reading
// the day somebody writes a carrier that raises it.
test('the codes derive from the host, never from a list here', live, () => {
  const { out } = runTool('recovery-witness.js', ['--verbose']);
  for (const code of ['unterminated-bold', 'unterminated-quoteblock']) {
    assert.match(out, new RegExp(code), `the sweep never met \`${code}\`: ${out.slice(-400)}`);
  }
});

// The gate: a code standing silent with no ruling fails, the way an unruled swallow does.
test('a silent code with no ruling fails the gate', live, () => {
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
test('a ruling explaining no code fails the gate', live, () => {
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
