// A snippet inserts wikitext TiddlyWiki builds.
//
// 128 snippets hand a learner a construct to start from, and nothing asked whether the construct
// works. Of everything this extension ships, only a snippet WRITES into a reader's file: a grammar
// mis-colouring a construct costs a reader a colour, while a snippet inserting a broken one costs
// them a tiddler that renders wrong, with the extension's own name on it.
//
// TiddlyWiki answers directly. Its parser raises a diagnostic on a construct it cannot close —
// `unterminated-codeinline`, `unterminated-styleblock` and the rest — so a snippet body run through
// the parser reports its own faults.
//
// The tabstops decide the reading, and reading them loosely answers wrongly. Dropping `$1` for the
// empty string turns "`$1`" into two backticks, which TiddlyWiki reads as an unterminated DOUBLE
// backtick and reports — a fault in the filling, not in the snippet. So an empty tabstop fills with
// a word, the way a reader's typing does.
//
//   node --test tools/snippet-parse.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { resolveTiddlyWiki, boot } = require('./tw5-oracle.js');

const ROOT = path.resolve(__dirname, '..');
const SETS = ['snippets/snippets.json', 'snippets/tiddler-fields.json'];
const host = resolveTiddlyWiki();
const live = { skip: host ? false : 'no TiddlyWiki checkout resolved', timeout: 300000 };

/** A snippet body as a reader leaves it: every tabstop standing for something typed. */
function filled(body) {
  return (Array.isArray(body) ? body.join('\n') : body)
    .replace(/\$\{(\d+):([^{}]*)\}/g, (m, n, label) => label || 'x')
    .replace(/\$\{(\d+)\|([^|]*)\|\}/g, (m, n, alternatives) => alternatives.split(',')[0])
    .replace(/\$\{(\d+)\}/g, 'x')
    .replace(/\$0/g, '')
    .replace(/\$(\d+)/g, 'x')
    .replace(/\\\$/g, '$');
}

const sets = SETS.map((file) => ({
  file,
  snippets: JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'))
}));

test('every snippet inserts a construct TiddlyWiki closes', live, () => {
  const oracle = boot(host);
  const broken = [];
  for (const { file, snippets } of sets) {
    for (const [name, snippet] of Object.entries(snippets)) {
      const diagnostics = oracle.diagnostics(filled(snippet.body)) || [];
      if (diagnostics.length) {
        broken.push(`${file}: ${name} — ${diagnostics.map((d) => d.code || d.message).join('; ')}`);
      }
    }
  }
  assert.deepStrictEqual(broken, [], 'snippet(s) inserting a construct the parser reports');
});

test('a snippet that never closes its construct reads as broken', live, () => {
  // The collision. Without it this gate proves only that nothing happened to fail today.
  const oracle = boot(host);
  const diagnostics = oracle.diagnostics(filled(['@@color:red;', 'styled ${1:text}'])) || [];
  assert.ok(diagnostics.length > 0, 'the parser reports nothing for an unterminated style block');
  assert.match(diagnostics.map((d) => d.code).join(' '), /unterminated/,
    'the parser reports something other than an unterminated construct');
});

test('every snippet carries a prefix, and no two in a set share one', () => {
  for (const { file, snippets } of sets) {
    const taken = new Map();
    for (const [name, snippet] of Object.entries(snippets)) {
      assert.ok(snippet.prefix, `${file}: ${name} carries no prefix, so nothing types it`);
      for (const prefix of [].concat(snippet.prefix)) {
        assert.ok(!taken.has(prefix),
          `${file}: ${prefix} types both ${taken.get(prefix)} and ${name}`);
        taken.set(prefix, name);
      }
    }
  }
});
