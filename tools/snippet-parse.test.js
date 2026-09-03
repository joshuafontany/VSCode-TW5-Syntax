// A snippet inserts wikitext TiddlyWiki builds, and this grammar colours.
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
// The second question follows from the first. A construct the parser builds and the grammar reads
// as prose hands a learner a snippet that works and looks broken — the same fault as a rule that
// never fired, arriving through the one surface that writes into a reader's file.
//
//   node --test tools/snippet-parse.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { resolveTiddlyWiki, boot } = require('./tw5-oracle.js');
const { snapshot } = require('./tokenizer.js');

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
    // VS Code takes `\\$`, `\\}` and `\\\\` as escapes inside a body, so a snippet writing a
    // TiddlyWiki pragma spells it `\\\\define` and INSERTS `\\define`. Reading the body verbatim hands
    // the parser two backslashes, which it takes as prose — every pragma snippet then reads clean
    // for the wrong reason.
    .replace(/\\([$}\\])/g, '$1');
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

// A snippet's name reaches the picker and its description reaches the detail pane beside it. 73 of
// the 125 carried none, so a learner reaching for `\\rules` met a name and a body and nothing saying
// what the construct does.
test('every snippet says what it inserts', () => {
  const bare = [];
  for (const { file, snippets } of sets) {
    for (const [name, snippet] of Object.entries(snippets)) {
      if (!snippet.description || snippet.description.length < 12) bare.push(`${file}: ${name}`);
    }
  }
  assert.deepStrictEqual(bare, [], 'snippet(s) carrying no description — the picker shows a name alone');
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

// The base scopes a line carries when nothing else claims it.
const PLAIN = new Set([
  'text.html.tiddlywiki5',
  'meta.paragraph.tiddlywiki5',
  'markup.other.paragraph.tiddlywiki5'
]);

// A snippet whose insertion reads as prose ON PURPOSE, and the reason.
const PROSE_BY_DESIGN = {
  'Substitute Variable':
    'a substitution colours inside a macro definition body and nowhere else — an injection keyed on '
    + 'meta.variable.macro.body.tiddlywiki5 — so this construct standing alone in a file reads as '
    + 'text, exactly as TiddlyWiki reads it there'
};

test('every snippet inserts a construct this grammar colours', live, () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'snippet-colour-'));
  const named = new Map();
  try {
    const snippets = JSON.parse(fs.readFileSync(path.join(ROOT, 'snippets/snippets.json'), 'utf8'));
    let i = 0;
    for (const [name, snippet] of Object.entries(snippets)) {
      const file = path.join(scratch, `s${String(i++).padStart(3, '0')}.tw`);
      fs.writeFileSync(file, `${filled(snippet.body)}\n`);
      named.set(file, name);
    }
    snapshot('text.html.tiddlywiki5', [...named.keys()]);

    const prose = [];
    for (const [file, name] of named) {
      const snap = fs.readFileSync(`${file}.snap`, 'utf8');
      const scopes = new Set();
      for (const line of snap.split('\n')) {
        const carried = /^#\s*\^+ (.*)$/.exec(line);
        if (carried) for (const scope of carried[1].split(/\s+/)) if (scope) scopes.add(scope);
      }
      if ([...scopes].every((scope) => PLAIN.has(scope)) && !PROSE_BY_DESIGN[name]) prose.push(name);
    }
    assert.deepStrictEqual(prose, [],
      'snippet(s) inserting a construct this grammar reads as prose — it works and looks broken');
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});

test('every ruling for a prose reading still names a snippet', () => {
  const snippets = JSON.parse(fs.readFileSync(path.join(ROOT, 'snippets/snippets.json'), 'utf8'));
  const gone = Object.keys(PROSE_BY_DESIGN).filter((name) => !snippets[name]);
  assert.deepStrictEqual(gone, [], 'ruling(s) naming a snippet the set no longer holds');
});
