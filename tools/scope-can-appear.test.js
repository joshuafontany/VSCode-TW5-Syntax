// PATTERN INTEGRITY: every declaration finds an input that fires it.
//
// A scope name that no input can produce colours nothing, and TextMate reports none of it. Worse,
// it still counts among the names a grammar DECLARES, so the corpus reports it as ground owed and a
// reader goes looking for a specimen that cannot exist.
//
// Two shapes stood measured here, and neither shows as an error anywhere:
//
//   a name on an EMPTY capture group. Three table rules name their markup family on the `c`, `h` or
//   `f` that ends the line; the body row ends on nothing and carried the sibling's shape with `()`
//   in the marker's place. A zero-width capture produces no token, so that name could never appear.
//
//   a pattern SUBSUMED by an earlier sibling. A macro-parameter separator sat last in a list whose
//   previous pattern takes any run of non-space, non-quote, non-angle characters, so every
//   character it accepted, that one claimed first — twenty-nine tried, and it fired for none.
//
// The first reads structurally, and this holds it. The second reads only by measurement, and the
// corpus ceiling holds that: nothing this grammar emits stands unreached.
//
//   node --test tools/scope-can-appear.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SYNTAXES = path.join(ROOT, 'syntaxes');

/**
 * The source of each capturing group in a regex, by its one-based number.
 *
 * Oniguruma numbers a group by the order its `(` opens, counting only capturing ones — so `(?:`,
 * `(?=`, `(?!` and `(?<=` open nothing a capture can name.
 */
function groupSources(pattern) {
  const sources = new Map();
  const open = [];
  let n = 0;
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '\\') { i++; continue; }
    if (c === '[') {                                   // a character class swallows its own parens
      i++;
      while (i < pattern.length && pattern[i] !== ']') { if (pattern[i] === '\\') i++; i++; }
      continue;
    }
    if (c === '(') {
      const capturing = pattern[i + 1] !== '?' || /^\(\?<[^=!]/.test(pattern.slice(i));
      open.push(capturing ? { number: ++n, at: i } : null);
      continue;
    }
    if (c === ')') {
      const group = open.pop();
      if (group) sources.set(group.number, pattern.slice(group.at + 1, i));
    }
  }
  return sources;
}

/** Every rule in a grammar, with the regexes and captures it carries. */
function rules(node, at = '', out = []) {
  if (Array.isArray(node)) { node.forEach((n, i) => rules(n, `${at}/${i}`, out)); return out; }
  if (!node || typeof node !== 'object') return out;
  if (typeof node.match === 'string' || typeof node.begin === 'string') out.push({ at, rule: node });
  for (const [key, value] of Object.entries(node)) rules(value, `${at}/${key}`, out);
  return out;
}

const grammars = fs.readdirSync(SYNTAXES).filter((f) => f.endsWith('.json'))
  .map((f) => ({ file: f, grammar: JSON.parse(fs.readFileSync(path.join(SYNTAXES, f), 'utf8')) }));

test('the group reader numbers what Oniguruma numbers', () => {
  // Collided first, because every reading below stands on it.
  const sources = groupSources('^(\\|)(.*)(?:x)(\\|)()$');
  assert.strictEqual(sources.get(1), '\\|');
  assert.strictEqual(sources.get(2), '.*');
  assert.strictEqual(sources.get(3), '\\|', 'a non-capturing group took a number');
  assert.strictEqual(sources.get(4), '', 'the empty group read as something');
  assert.strictEqual(groupSources('[(](a)').get(1), 'a', 'a paren inside a character class opened a group');
});

test('no scope name rides a capture group that can only match empty', () => {
  const dead = [];
  for (const { file, grammar } of grammars) {
    for (const { at, rule } of rules(grammar)) {
      for (const [key, pattern] of [['captures', rule.match ?? rule.begin],
        ['beginCaptures', rule.begin], ['endCaptures', rule.end]]) {
        const captures = rule[key];
        if (!captures || typeof pattern !== 'string') continue;
        const sources = groupSources(pattern);
        for (const [number, entry] of Object.entries(captures)) {
          if (number === '0' || !entry || !entry.name) continue;
          const source = sources.get(Number(number));
          if (source === '') dead.push(`${file}${at} ${key}[${number}] = ${entry.name}`);
        }
      }
    }
  }
  assert.deepStrictEqual(dead, [],
    'scope name(s) on a zero-width capture — no token carries them, and the corpus reports them as ground owed');
});

test('no capture names a group the regex never opens', () => {
  const missing = [];
  for (const { file, grammar } of grammars) {
    for (const { at, rule } of rules(grammar)) {
      // `captures` on a begin/end rule applies to BOTH halves, so a number either half opens stands
      // named. Reading it against the begin alone calls a rule naming the end's group broken.
      const numbered = (patterns) => {
        const all = new Set();
        for (const pattern of patterns) {
          if (typeof pattern !== 'string') continue;
          for (const number of groupSources(pattern).keys()) all.add(number);
        }
        return all;
      };
      for (const [key, patterns] of [['captures', [rule.match, rule.begin, rule.end]],
        ['beginCaptures', [rule.begin]], ['endCaptures', [rule.end]]]) {
        const captures = rule[key];
        if (!captures) continue;
        const opened = numbered(patterns);
        for (const number of Object.keys(captures)) {
          if (number === '0') continue;
          if (!opened.has(Number(number))) missing.push(`${file}${at} ${key}[${number}]`);
        }
      }
    }
  }
  assert.deepStrictEqual(missing, [], 'capture(s) naming a group the regex never opens');
});
