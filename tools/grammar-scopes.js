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

/**
 * Can this end pattern match at the end of a line?
 *
 * The dollar has to stand as an ANCHOR, so the reader walks the pattern rather than matching it.
 * A grammar spells the bound five ways — `$`, `(?=$)`, `^$`, `|$`, `(?=$|…)` — and a reader
 * naming any one of them by shape misses the other four; the count then reports safe regions as
 * debt, which is how six inline emphasis rules whose begin refuses to open without a closer on
 * the same line came to sit among the runaways.
 *
 * A dollar the pattern means LITERALLY names no bound: TiddlyWiki's widget rules carry `\$` for
 * the tag prefix and the typed block spells `\$\$\$`, so a reader matching any dollar at all
 * would call the whole grammar bounded — green, and blind.
 *
 * @param {string} end  a TextMate end pattern
 * @returns {boolean}
 */
function breaksOnALine(end) {
  let inClass = false;
  for (let i = 0; i < end.length; i += 1) {
    const c = end[i];
    if (c === '\\') { i += 1; continue; }
    if (inClass) { if (c === ']') inClass = false; continue; }
    if (c === '[') { inClass = true; continue; }
    if (c === '$') return true;
  }
  return false;
}

/**
 * The regions whose end can never break on a line, by the scope each one names.
 *
 * A region ending on `$` or on a blank line cannot outlive its line; every other one runs to the
 * end of the document where its closer never arrives. The count alarms and means little alone —
 * many stand open across a blank line and AGREE with the parser, because TiddlyWiki carries those
 * constructs too. What it answers is coverage: a region no specimen ever opens has not been found
 * sound, only left unasked.
 *
 * The name carries `$1`-style back-references, which TextMate fills from the begin match, so the
 * matcher admits any one segment there.
 *
 * @param {string} file  path to a .json grammar
 * @returns {Array<{name: string, re: RegExp}>}
 */
function unboundedRegions(file) {
  const grammar = JSON.parse(fs.readFileSync(file, 'utf8'));
  const out = [];
  const walk = (node) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node || typeof node !== 'object') return;
    if (node.begin !== undefined && node.end !== undefined) {
      const name = node.name || node.contentName;
      if (name && !breaksOnALine(node.end)) {
        const literal = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\$\d/g, '[^.]+');
        out.push({ name, re: new RegExp(`^${literal}$`) });
      }
    }
    for (const value of Object.values(node)) walk(value);
  };
  walk(grammar);
  return out;
}

module.exports = { declaredScopes, declaredScopesIn, unboundedRegions };
