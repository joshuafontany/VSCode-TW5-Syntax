// Every scope the memetic grammar declares, reached by a pinned specimen.
//
// The base grammar answers to a corpus of twenty-seven files and a coverage floor. The dialect
// carried a fraction of that ground, and six of its scopes stood unexercised — a carrier naming
// no control code, a query separator inside a lar URI, and two of the three quotings a parameter
// value takes. A scope no specimen reaches reports nothing when it breaks, and a rule that never
// fires reads exactly like one that fires correctly.
//
// The two that hid longest hid for the same reason: they answer to the COLON spelling of a
// parameter, `key:"value"`, and every specimen wrote the equals spelling. `=` hands its value to
// the unquoted rule before the string rule sees it, so a bracketed value only ever reads as a
// string after a colon.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const SAMPLES = path.join(ROOT, 'tests', 'samples');

/** Every scope name a grammar declares, interpolating names excepted. */
function declaredScopes(file) {
  const grammar = JSON.parse(fs.readFileSync(file, 'utf8'));
  const out = new Set();
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    for (const key of ['name', 'contentName']) {
      const value = node[key];
      // A grammar's own `name` sits beside scopeName and names the language, never a scope.
      if (typeof value === 'string' && node !== grammar) for (const s of value.split(/\s+/)) if (!/\$\d/.test(s)) out.add(s);
    }
    for (const key of Object.keys(node)) walk(node[key]);
  };
  walk(grammar);
  return out;
}

/** Every scope the pinned snapshots of a given suffix reach. */
function reachedScopes(suffix) {
  const out = new Set();
  for (const name of fs.readdirSync(SAMPLES)) {
    if (!name.endsWith(`${suffix}.snap`)) continue;
    for (const line of fs.readFileSync(path.join(SAMPLES, name), 'utf8').split('\n')) {
      const m = line.match(/^#\s*\^+ (.*)/);
      if (m) for (const s of m[1].split(/\s+/)) out.add(s);
    }
  }
  return out;
}

const declared = declaredScopes(path.join(ROOT, 'syntaxes', 'memetic-wikitext.json'));
const reached = reachedScopes('.mem');

test('the dialect declares scopes and specimens reach them', () => {
  assert.ok(declared.size > 20, `the dialect declares ${declared.size} scope(s) — the reader stopped matching`);
  assert.ok(reached.size > 20, `the pinned specimens reach ${reached.size} scope(s) — the snapshots went missing`);
});

test('every scope the dialect declares stands exercised', () => {
  const unreached = [...declared].filter((s) => !reached.has(s)).sort();
  assert.deepStrictEqual(
    unreached,
    [],
    `scope(s) no pinned specimen reaches, so nothing reports when they break:\n  ${unreached.join('\n  ')}`
  );
});
