// Every file under a directory, and nothing a caller's own predicate excludes.
//
//   node --test tools/walk.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { walkFiles, walkMatching, tiddlerFiles, carrierFiles } = require('./walk.js');

/** A throwaway tree, torn down after the test that built it. */
function tempTree(layout) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'walk-test-'));
  for (const [rel, content] of Object.entries(layout)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return root;
}

test('walkFiles descends into every directory, sorted at each level', () => {
  const root = tempTree({
    'b.txt': '1',
    'a.txt': '1',
    'sub/z.txt': '1',
    'sub/y.txt': '1',
    'sub/deeper/one.txt': '1'
  });
  const found = walkFiles(root).map((f) => path.relative(root, f));
  assert.deepStrictEqual(found, ['a.txt', 'b.txt', path.join('sub', 'deeper', 'one.txt'),
    path.join('sub', 'y.txt'), path.join('sub', 'z.txt')]);
  fs.rmSync(root, { recursive: true, force: true });
});

// THE COLLIDER. A directory that does not exist stands for a host checkout nobody has, or a
// corpus directory a fresh clone has not populated yet — several callers (recovery-witness's
// host sample, darkness-witness's and ablation-witness's carrier ground) ask this of ground
// that is absent on purpose. A walker that throws there fails every caller that asks it of
// optional ground; this plants exactly that fault and watches it NOT throw.
test('a missing directory yields no files rather than throwing', () => {
  assert.doesNotThrow(() => walkFiles('/no/such/directory/anywhere'));
  assert.deepStrictEqual(walkFiles('/no/such/directory/anywhere'), []);
});

test('walkMatching filters by bare name across several directories', () => {
  const rootA = tempTree({ 'keep.tw': '1', 'skip.mem': '1' });
  const rootB = tempTree({ 'nested/keep2.tw': '1' });
  const found = walkMatching([rootA, rootB], (name) => name.endsWith('.tw'))
    .map((f) => path.basename(f));
  assert.deepStrictEqual(found.sort(), ['keep.tw', 'keep2.tw']);
  fs.rmSync(rootA, { recursive: true, force: true });
  fs.rmSync(rootB, { recursive: true, force: true });
});

test('tiddlerFiles and carrierFiles read the extension they name, nothing else', () => {
  const root = tempTree({ 'a.tid': '1', 'a.tw': '1', 'a.mem': '1', 'deep/b.tid': '1', 'deep/b.tw': '1' });
  assert.deepStrictEqual(tiddlerFiles(root).map((f) => path.basename(f)).sort(), ['a.tid', 'b.tid']);
  assert.deepStrictEqual(carrierFiles(root).map((f) => path.basename(f)).sort(), ['a.tw', 'b.tw']);
  fs.rmSync(root, { recursive: true, force: true });
});
