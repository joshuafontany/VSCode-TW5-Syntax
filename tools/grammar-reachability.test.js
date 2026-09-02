// Every rule a grammar carries, some root reaches.
//
// A repository rule stands reachable or it stands nowhere. TextMate never reports the difference:
// an orphan loads, validates, and colours nothing, and the reader who wrote it sees the construct
// go plain with no error anywhere.
//
// It also costs a measurement. `corpus-check` counts the scopes the grammars DECLARE and asks the
// corpus to reach them, so scopes inside an orphan inflate the denominator and stand forever in the
// unreached ceiling — a gap that reads as corpus work owed where the fault sits in the grammar.
//
// Two TextMate rules decide the walk, and reading either loosely answers wrongly:
//
//   an include resolves against the NEAREST enclosing repository. This grammar carries two nested
//   ones — `htmlwidget-math` and `htmlwidget-svg` each hold a `tags` and an `htmlwidget-attribute`
//   of their own — so twelve `#tags` includes name a rule no top-level repository holds, and a
//   walker reading only the top level calls all twelve broken.
//
//   a rule's own repository stands in scope INSIDE it and nowhere else, so where an include sits
//   decides what it means. Collecting a subtree's includes and resolving them all against one stack
//   mixes the levels and answers for none of them.
//
// So the walk carries a stack, and every include remembers the stack it stood in.
//
//   node --test tools/grammar-reachability.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SYNTAXES = path.join(ROOT, 'syntaxes');

const grammars = fs.readdirSync(SYNTAXES).filter((f) => f.endsWith('.json'))
  .map((f) => ({ file: f, grammar: JSON.parse(fs.readFileSync(path.join(SYNTAXES, f), 'utf8')) }));
const byScope = Object.fromEntries(grammars.map(({ grammar }) => [grammar.scopeName, grammar]));

/**
 * One grammar, read as rules and includes.
 *
 * `rules` maps a path to the repositories in scope inside it. `includes` lists every include with
 * the rule that owns it — `''` for one standing at the grammar's own top level — and the stack it
 * resolves against.
 */
function index(grammar) {
  const rules = new Map();
  const includes = [];

  const visit = (node, at, owner, stack) => {
    if (Array.isArray(node)) {
      node.forEach((n, i) => visit(n, `${at}/${i}`, owner, stack));
      return;
    }
    if (!node || typeof node !== 'object') return;
    let here = stack;
    if (node.repository) {
      here = [node.repository, ...stack];
      for (const [name, rule] of Object.entries(node.repository)) {
        const rulePath = `${at}/repository/${name}`;
        rules.set(rulePath, { name, node: rule, stack: here });
        visit(rule, rulePath, rulePath, here);
      }
    }
    if (typeof node.include === 'string') includes.push({ owner, include: node.include, stack: here });
    for (const [key, value] of Object.entries(node)) {
      if (key === 'repository' || key === 'include') continue;
      visit(value, `${at}/${key}`, owner, here);
    }
  };

  visit(grammar, '', '', []);
  return { rules, includes };
}

const indexed = Object.fromEntries(grammars.map(({ grammar }) => [grammar.scopeName, index(grammar)]));

/** The rule path a `#name` resolves to, given the repositories in scope. */
function resolve(scope, stack, name) {
  for (const repo of stack) {
    if (!Object.prototype.hasOwnProperty.call(repo, name)) continue;
    for (const [rulePath, entry] of indexed[scope].rules) if (entry.node === repo[name]) return rulePath;
  }
  return null;
}

/** Every rule the engine can arrive at, from every root, as `scopeName + path`. */
function reachable() {
  const reached = new Set();
  const seeded = new Set();

  const follow = (scope, stack, include) => {
    if (include === '$self' || include === '$base') return seed(scope);
    const [named, rule] = include.split('#');
    if (!rule) return undefined;
    if (named && named !== scope) {
      const other = byScope[named];
      if (!other) return undefined;                    // a grammar this repository does not ship
      return walk(named, resolve(named, [other.repository || {}], rule));
    }
    return walk(scope, resolve(scope, stack, rule));
  };

  const walk = (scope, at) => {
    if (!at) return;
    const key = `${scope}${at}`;
    if (reached.has(key)) return;
    reached.add(key);
    for (const site of indexed[scope].includes) {
      if (site.owner === at) follow(scope, site.stack, site.include);
    }
  };

  const seed = (scope) => {
    if (seeded.has(scope)) return;
    seeded.add(scope);
    if (!byScope[scope]) return;
    for (const site of indexed[scope].includes) {
      if (site.owner === '') follow(scope, site.stack, site.include);
    }
  };

  for (const { grammar } of grammars) seed(grammar.scopeName);
  return reached;
}

test('every repository rule stands reachable from some root', () => {
  const reached = reachable();
  const orphans = [];
  for (const { file, grammar } of grammars) {
    for (const at of indexed[grammar.scopeName].rules.keys()) {
      if (!reached.has(`${grammar.scopeName}${at}`)) orphans.push(`${file}${at}`);
    }
  }
  assert.deepStrictEqual(orphans, [],
    'rule(s) no root reaches — each colours nothing, and its scopes still count as declared');
});

test('every include names a rule that stands', () => {
  const missing = [];
  for (const { file, grammar } of grammars) {
    for (const site of indexed[grammar.scopeName].includes) {
      if (site.include === '$self' || site.include === '$base') continue;
      const [scope, rule] = site.include.split('#');
      if (!rule) continue;
      if (scope && scope !== grammar.scopeName) {
        const other = byScope[scope];
        if (other && !(other.repository || {})[rule]) missing.push(`${file} -> ${site.include}`);
        continue;
      }
      if (!resolve(grammar.scopeName, site.stack, rule)) missing.push(`${file} -> ${site.include}`);
    }
  }
  assert.deepStrictEqual([...new Set(missing)], [], 'include(s) naming a rule no grammar holds');
});

test('a nested repository answers its own name first', () => {
  // The reading that decides the walk, stated as a measurement rather than as a claim.
  const nested = [...indexed['text.html.tiddlywiki5'].rules.entries()]
    .filter(([at]) => at.split('/repository/').length > 2)
    .map(([at]) => at);
  assert.ok(nested.length > 0, 'no nested repository stands, so the reading above answers nothing');
  for (const at of nested) {
    const name = at.slice(at.lastIndexOf('/') + 1);
    const own = indexed['text.html.tiddlywiki5'].rules.get(at);
    assert.strictEqual(resolve('text.html.tiddlywiki5', own.stack, name), at,
      `${name} resolves past its own repository, so the nearest one loses`);
  }
});
