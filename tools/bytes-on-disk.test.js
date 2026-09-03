// PATTERN INTEGRITY: a reader takes what its writer emits — so nothing here emits a surprise.
//
// Two byte-level spellings pass every review and stop a reader dead:
//
//   a CARRIAGE RETURN. `.` and `$` both count one as a line terminator, so a regex ending on `$`
//   matches nothing on a CRLF line. The snapshot reader answered a file full of annotations as one
//   carrying none, and every gate over the pinned snapshots would have reported green having
//   measured nothing. This repository runs its matrix on windows-latest.
//
//   a BYTE-ORDER MARK. `JSON.parse` rejects one outright, so a grammar, a theme or a language
//   configuration saved by an editor that writes one stops every gate that opens it — with a
//   message about position 0 rather than about the mark.
//
// Tolerating either in thirty readers would mean thirty implementations. `.gitattributes` already
// keeps a carriage return out of a checkout, and this holds the tree to that line rather than
// trusting it — a line somebody edits is a line somebody can drop.
//
//   node --test tools/bytes-on-disk.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { runNode } = require('./run-tool.js');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');

/** Every file git tracks, with the eol attributes git resolved for it. */
function tracked() {
  const out = execFileSync('git', ['ls-files', '--eol'], { cwd: ROOT, encoding: 'utf8' });
  return out.split('\n').filter(Boolean).map((line) => {
    const m = /^(\S+)\s+(\S+)\s+(.*?)\s*\t(.*)$/.exec(line);
    return m ? { index: m[1], work: m[2], attrs: m[3], file: m[4] } : null;
  }).filter(Boolean);
}

test('the repository still declares its line endings', () => {
  const file = path.join(ROOT, '.gitattributes');
  assert.ok(fs.existsSync(file), 'nothing declares line endings, so a Windows checkout decides them');
  assert.match(fs.readFileSync(file, 'utf8'), /eol=lf/,
    'the declaration names no end-of-line, so a checkout still decides');
});

test('no text file this repository tracks carries a carriage return', () => {
  const crlf = tracked().filter((f) => f.index.includes('crlf') || f.work.includes('crlf'))
    .map((f) => f.file);
  assert.deepStrictEqual(crlf, [],
    'file(s) carrying CRLF — a snapshot spelled that way reads as carrying no annotations at all');
});

test('no file this repository tracks opens with a byte-order mark', () => {
  const marked = [];
  for (const { file, index } of tracked()) {
    if (index === 'i/-text') continue;                    // git reads it as binary, and so does everyone
    const head = fs.readFileSync(path.join(ROOT, file)).subarray(0, 3);
    if (head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf) marked.push(file);
  }
  assert.deepStrictEqual(marked, [],
    'file(s) opening with a byte-order mark — JSON.parse refuses one, naming position 0 rather than the mark');
});

test('the snapshot reader answers the same either way', () => {
  // The tolerance stands here too, because a reader handed a hand-written file meets what it meets.
  const { readSnapshot } = require('./snapshot-format.js');
  const snap = fs.readFileSync(path.join(ROOT, 'tests', 'samples', 'canary-control.tw.snap'), 'utf8');
  const count = (text) => readSnapshot(text).reduce((n, line) => n + line.annotations.length, 0);
  const lf = count(snap);
  assert.ok(lf > 0, 'the snapshot carries no annotations, so this reading proves nothing');
  assert.strictEqual(count(snap.replace(/\n/g, '\r\n')), lf, 'a CRLF snapshot read as something else');
});

test('a tool refuses a grammar carrying a byte-order mark, loudly', () => {
  // Prevention answers first, and a message answers second. A reader meeting one should name it.
  const scratch = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'bom-'));
  try {
    const file = path.join(scratch, 'probe.json');
    fs.writeFileSync(file, `﻿{"scopeName":"source.probe","patterns":[]}`);
    const { code, out } = runNode(['-e',
      `require(${JSON.stringify(path.join(ROOT, 'tools', 'grammar-scopes.js'))}).declaredScopes(${JSON.stringify(file)})`]);
    assert.notStrictEqual(code, 0, 'a byte-order mark passed unnoticed');
    assert.match(out, /JSON|position 0|Unexpected/, out.slice(-200));
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});
