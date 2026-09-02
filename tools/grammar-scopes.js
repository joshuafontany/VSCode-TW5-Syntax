// Every scope name a grammar declares.
//
// A `name` or `contentName` may carry SEVERAL scopes separated by whitespace — the way a region
// says it belongs to two families at once, so a theme reaching either one paints it. A collector
// reading the field as one scope finds none of them, and a gate built on it goes quiet about
// everything that field names.
//
// The grammar's OWN `name` sits beside `scopeName` and names the language rather than a scope.
// Reading it as one puts nine words into the declared set across these eight grammars —
// "TiddlyWiki5", "fields", "substituted", "test" — each unreachable by construction, each inflating
// the denominator a corpus answers to and standing forever among the scopes handed to another
// grammar.
//
// One collector, so a reader added later cannot drift from the one beside it.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * The scopes one grammar file declares.
 *
 * @param {string} file  path to a .json grammar
 * @returns {Set<string>}
 */
function declaredScopes(file) {
  const grammar = JSON.parse(fs.readFileSync(file, 'utf8'));
  const out = new Set();
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    // The root's `name` names the language; every other one names a scope.
    if (node !== grammar) {
      for (const key of ['name', 'contentName']) {
        const value = node[key];
        if (typeof value !== 'string') continue;
        // A $1 resolves per match, so that scope's declared form never appears verbatim.
        for (const scope of value.split(/\s+/)) if (scope && !scope.includes('$')) out.add(scope);
      }
    }
    for (const value of Object.values(node)) walk(value);
  };
  walk(grammar);
  return out;
}

/**
 * The scopes every grammar in a directory declares.
 *
 * @param {string} dir
 * @returns {Set<string>}
 */
function declaredScopesIn(dir) {
  const out = new Set();
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    for (const scope of declaredScopes(path.join(dir, file))) out.add(scope);
  }
  return out;
}

module.exports = { declaredScopes, declaredScopesIn };
