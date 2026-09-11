// Terminator closure, collided.
//
// A region admits a nested region only where the nested one cannot consume the outer terminator. A
// child that eats the terminator leaves the parent open, and an unclosed child blocks its parent's
// end outright — so the colouring runs to end of file and the grammar reports nothing anywhere.
//
// The gate runs the grammar alone: no corpus, no names. It stands as a RATCHET on a grammar at
// zero, so the reading that matters runs the other way — it must find a region a hand can plant.
// A ratchet nobody can trip guards nothing, and this instrument reaches its verdict through the
// same green run either way.
//
//   node --test tools/terminator-closure.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runTool } = require('./run-tool.js');

/** A grammar written to a scratch file, so nothing plants a fault in the shared tree. */
function onGrammar(grammar) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'closure-'));
  const file = path.join(dir, 'probe.json');
  try {
    fs.writeFileSync(file, JSON.stringify(grammar));
    return runTool('terminator-closure.js', [file]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// THE FAULT, PLANTED. A child opening on the very literal its parent closes on eats the terminator.
test('a child consuming its parent\'s terminator reads as a finding', () => {
  const { code, out } = onGrammar({
    scopeName: 'source.probe',
    repository: {
      region: {
        begin: '<%', end: '%>', name: 'meta.region.probe',
        patterns: [{ begin: '%>', end: '<%', name: 'meta.child.probe' }]
      }
    },
    patterns: [{ include: '#region' }]
  });
  assert.notStrictEqual(code, 0, 'a child eating its parent\'s terminator passed, so the ratchet stands at a wall');
  assert.match(out, /regions breaking closure: [1-9]/, out.slice(0, 400));
  assert.match(out, /meta\.region\.probe/, 'the finding names no region, so a reader cannot act on it');
});

// THE CONTROL. The same shape with a child that cannot reach the terminator holds.
test('a child that cannot reach the terminator holds', () => {
  const { code, out } = onGrammar({
    scopeName: 'source.probe',
    repository: {
      region: {
        begin: '<%', end: '%>', name: 'meta.region.probe',
        patterns: [{ begin: '\\[\\[', end: '\\]\\]', name: 'meta.child.probe' }]
      }
    },
    patterns: [{ include: '#region' }]
  });
  assert.strictEqual(code, 0, out.slice(0, 600));
  assert.match(out, /regions breaking closure: 0/, out.slice(0, 400));
});

// A CHILD CLOSING ON THE OUTER TERMINATOR HANDS IT BACK, so it consumes nothing the parent needs.
test('a child closing on the same terminator hands it back', () => {
  const { code } = onGrammar({
    scopeName: 'source.probe',
    repository: {
      region: {
        begin: '<%', end: '%>', name: 'meta.region.probe',
        patterns: [{ begin: '%>', end: '%>', name: 'meta.child.probe' }]
      }
    },
    patterns: [{ include: '#region' }]
  });
  assert.strictEqual(code, 0, 'a child handing the terminator back read as consuming it');
});

// A WIDE ALTERNATION GUARANTEES NO SINGLE BRANCH, so the extractor declines to name one — otherwise
// a grammar dense in single-character punctuation reports every region it holds.
test('a wide alternation names no guaranteed literal', () => {
  const { code } = onGrammar({
    scopeName: 'source.probe',
    repository: {
      region: {
        begin: '<%', end: '%>', name: 'meta.region.probe',
        patterns: [{ begin: '(a|b|c|d|e|f|%>)', end: 'zzz', name: 'meta.child.probe' }]
      }
    },
    patterns: [{ include: '#region' }]
  });
  assert.strictEqual(code, 0, 'a branch inside a wide alternation read as a guaranteed opener');
});

// THE SHIPPED GRAMMAR STANDS AT ZERO — the ratchet's own seat, and the thing `lint-closure` asserts.
test('the dialect this repository ships breaks no closure', () => {
  const { code, out } = runTool('terminator-closure.js', ['syntaxes/memetic-wikitext.json']);
  assert.match(out, /regions breaking closure: 0/, out.slice(0, 800));
  assert.strictEqual(code, 0, out.slice(0, 800));
});
