// Every test file a runner reaches, and every runner a reader can name.
//
// A GLOB COUNTS AS A HAND-WRITTEN ENUMERATION WEARING A WILDCARD. It states where somebody expected
// files to stand, and a file standing anywhere else drops out of the run in silence — the suite
// reports the same green over a smaller population, and nothing anywhere carries the difference.
// This repository has already paid that: a gate list keyed on how a script's NAME began hid
// `lint-closure` and `package-contents`, two instruments CI ran, from every gate list there was.
//
// So the population derives from a WALK, and the runner answers to it:
//
//   every `*.test.js` in this tree stands inside some declared script's reach
//   every script claiming to run tests reaches at least one file
//
// A test file added under a directory the glob cannot see fails HERE, where a reader meets it,
// rather than never running and never saying so.
//
//   node --test tools/invariants/every-test-runs.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const scripts = require(path.join(ROOT, 'package.json')).scripts;

// Ground nobody authors. A walk that descends here reads other people's suites as this one's.
const OUTSIDE = new Set(['node_modules', '.git', '.worktrees', 'TiddlyWiki5', 'out', 'dist']);

/** Every `*.test.js` this repository authors, by path relative to the root. */
function authored(dir = ROOT) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (OUTSIDE.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...authored(full));
    else if (entry.name.endsWith('.test.js')) found.push(path.relative(ROOT, full).split(path.sep).join('/'));
  }
  return found;
}

/** The patterns every `node --test` script hands the runner, as the runner reads them. */
function patterns() {
  const found = [];
  for (const [name, body] of Object.entries(scripts)) {
    if (!/\bnode --test\b/.test(body)) continue;
    for (const m of body.matchAll(/["']([^"']*\*[^"']*)["']/g)) found.push({ script: name, glob: m[1] });
  }
  return found;
}

/** What one pattern actually reaches, asked of the same globber the runner uses. */
const reaches = (glob) =>
  new Set(fs.globSync(glob, { cwd: ROOT }).map((f) => f.split(path.sep).join('/').replace(/^\.\//, '')));

test('a script declares a pattern, and each one reaches something', () => {
  const found = patterns();
  assert.ok(found.length > 0, 'no script hands the runner a pattern, so nothing here can answer');
  for (const { script, glob } of found) {
    assert.ok(reaches(glob).size > 0,
      `\`${script}\` runs \`${glob}\`, which reaches no file — the script reports green over nothing`);
  }
});

// THE INVARIANT. A file no pattern reaches never runs, and never says so.
test('every test file this repository holds, a declared script reaches', () => {
  const reached = new Set();
  for (const { glob } of patterns()) for (const f of reaches(glob)) reached.add(f);
  const unrun = authored().filter((f) => !reached.has(f));
  assert.deepStrictEqual(unrun, [],
    'test file(s) no declared script runs — each one reports nothing, and reads exactly like one that holds');
});

// THE COLLISION. A pattern reaching one directory only must MISS the population, or the invariant
// above rests on a glob that happens to be wide enough today.
test('a pattern stopping at one directory misses files the walk finds', () => {
  const shallow = reaches('./tools/*.test.js');
  const all = authored().filter((f) => f.startsWith('tools/'));
  const missed = all.filter((f) => !shallow.has(f));
  assert.ok(missed.length > 0,
    'a single-directory pattern reached every test file, so the invariant above cannot tell a wide glob from a lucky one');
  // And the pattern the manifest actually runs reaches every one of them.
  const declared = reaches('./tools/**/*.test.js');
  assert.deepStrictEqual(all.filter((f) => !declared.has(f)), [],
    'the declared pattern misses a test file under tools/');
  assert.ok(declared.size > shallow.size,
    `the declared pattern reaches ${declared.size} where a shallow one reaches ${shallow.size}`);
});

// A walk finding nothing agrees with any runner at all.
test('the walk finds the population it claims to measure', () => {
  const found = authored();
  assert.ok(found.length > 50, `the walk found ${found.length} test file(s), so its agreement proves little`);
  assert.ok(found.some((f) => f.startsWith('tools/invariants/')),
    'the walk descends no further than one level, so a file below it reads as absent');
  assert.ok(found.some((f) => f.startsWith('tools/') && !f.startsWith('tools/invariants/')),
    'the walk lost the instruments beside the invariants');
});
