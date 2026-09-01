// Every scope name a grammar declares.
//
// A `name` or `contentName` may carry SEVERAL scopes separated by whitespace — the way a region
// says it belongs to two families at once, so a theme reaching either one paints it. A collector
// reading the field as one scope finds none of them, and a gate built on it goes quiet about
// everything that field names.
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
  const out = new Set();
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    for (const key of ['name', 'contentName']) {
      const value = node[key];
      // A $1 in a scope name resolves per match, so the declared form never appears verbatim.
      if (typeof value === 'string' && !value.includes('$')) {
        for (const scope of value.split(/\s+/)) if (scope) out.add(scope);
      }
    }
    for (const value of Object.values(node)) walk(value);
  };
  walk(JSON.parse(fs.readFileSync(file, 'utf8')));
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
