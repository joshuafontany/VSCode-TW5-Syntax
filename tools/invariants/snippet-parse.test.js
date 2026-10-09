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
//   node --test tools/invariants/snippet-parse.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { resolveTiddlyWiki, boot } = require('../tw5-oracle.js');
const { snapshot } = require('../tokenizer.js');

const ROOT = path.resolve(__dirname, '..', '..');
const manifest = require(path.join(ROOT, 'package.json'));

// THE SETS DERIVE FROM THE MANIFEST. A list here named two files, and a third registered beside
// them would have joined the extension unmeasured — every reading below reporting the same green
// over a smaller population, with nothing carrying the difference. The manifest already says which
// files ship as snippets; this reads that.
const SETS = [...new Set((manifest.contributes.snippets || []).map((s) => s.path.replace(/^\.\//, '')))];

/** The languages a snippet set serves, as the manifest registers them. */
const languagesOf = (file) => (manifest.contributes.snippets || [])
  .filter((s) => s.path.replace(/^\.\//, '') === file).map((s) => s.language);

/** The grammar scope and a file extension for a language, both off the manifest. */
function readingFor(language) {
  const grammar = (manifest.contributes.grammars || []).find((g) => g.language === language);
  const entry = (manifest.contributes.languages || []).find((l) => l.id === language);
  return { scope: grammar && grammar.scopeName, extension: entry && (entry.extensions || [])[0] };
}

// WHICH GRAMMAR ANSWERS FOR A SET, and for one set, why none does.
//
// A set serving a single language derives its reading. A set serving several cannot: the same
// snippet body colours differently under `source.tiddlywiki5.tid-file` and
// `text.html.tiddlywiki5`, so one of them has to be named. And a set whose bodies only colour
// INSIDE a surrounding construct cannot stand alone at all — reading it would report prose for a
// construct that works, which is the fault this gate exists to catch, made by this gate.
const COLOUR_READ = {
  'snippets/snippets.json': {
    language: 'tiddlywiki5',
    why: 'the base wikitext vocabulary, which every other language here extends — a body that '
      + 'colours under the base colours under the dialects that nest it'
  },
  'snippets/memetic.json': {
    language: 'memetic-wikitext',
    why: 'the dialect its bodies are written in: a sigil reads as a call under the base grammar '
      + 'and as a sigil only under this one'
  },
  'snippets/tiddler-fields.json': {
    language: null,
    why: 'a field line colours inside a tiddler HEADER and nowhere else, and a snippet body stands '
      + 'alone — so a colour reading of this set would report prose for every entry in it, which is '
      + 'the exact misreading this gate refuses elsewhere. The parse, description and prefix '
      + 'readings below still carry it'
  }
};
const host = resolveTiddlyWiki();
const live = { skip: host ? false : 'no TiddlyWiki checkout resolved', timeout: 300000 };

// FEATURE-DETECTED, the way recovery-witness.js and tools/reader-scope.js's other callers already
// decide: `WikiParser.addDiagnostic` is this repository's own fork's own addition, and the pinned
// devDependency's `diagnostics()` always answers `[]`, on any input — a reader without the API
// answers neither of the two questions below.
const supportsDiagnostics = host ? Array.isArray(boot(host).parse('x').diagnostics) : false;
const diagnosticsLive = {
  skip: !host ? 'no TiddlyWiki checkout resolved' : !supportsDiagnostics ? 'this reader carries no parser diagnostics API' : false,
  timeout: 300000
};

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

// A SNIPPET THE PARSER REPORTS, WHERE THE REPORT ANSWERS TO THE DIALECT AND NOT TO THE SNIPPET.
//
// Measured against this repository's fork: a single `lar:///` URI standing in prose reports
// `unterminated-italic`, and TWO of them report nothing — the `//` inside one address opens
// TiddlyWiki's italic span and the `//` inside the next one closes it. The real boot seed reports
// the same thing twice, among seven diagnostics, and it stands as the canonical carrier this house
// writes. So a carrier frame carrying an ODD number of addresses outside its fences reports this,
// and no spelling of the snippet avoids it while still inserting a carrier.
//
// The ruling names the exact codes. A snippet reporting anything else, or reporting nothing at all,
// fails below — so this cannot widen into permission, and it retires itself the day the parser
// stops saying it. The finding itself stands owed upstream.
const REPORTED_BY_DESIGN = {
  'Memetic Carrier Frame': {
    codes: ['unterminated-italic'],
    why: 'the frame inserts three addresses outside its meta fence — the doctype\'s, the carrier '
      + 'head\'s and the content hash\'s — and an odd count leaves one `//` open. A `lar:` address '
      + 'and TiddlyWiki\'s italic marker spell the same two characters'
  }
};

test('every snippet inserts a construct TiddlyWiki closes', diagnosticsLive, () => {
  const oracle = boot(host);
  const broken = [];
  for (const { file, snippets } of sets) {
    for (const [name, snippet] of Object.entries(snippets)) {
      const codes = (oracle.diagnostics(filled(snippet.body)) || []).map((d) => d.code || d.message);
      const ruled = REPORTED_BY_DESIGN[name];
      if (ruled) {
        const unruled = [...new Set(codes)].filter((c) => !ruled.codes.includes(c));
        if (unruled.length) broken.push(`${file}: ${name} — ${unruled.join('; ')} (beyond its ruling)`);
        continue;
      }
      if (codes.length) broken.push(`${file}: ${name} — ${codes.join('; ')}`);
    }
  }
  assert.deepStrictEqual(broken, [], 'snippet(s) inserting a construct the parser reports');
});

// A RULING OUTLIVING ITS CAUSE READS AS PERMISSION NOBODY EARNED. Each one must still name a
// standing snippet, and that snippet must still report every code the ruling claims for it.
test('every ruling for a reported construct still answers to the parser', diagnosticsLive, () => {
  const oracle = boot(host);
  const held = new Map(sets.flatMap(({ snippets }) => Object.entries(snippets)));
  const stale = [];
  for (const [name, ruling] of Object.entries(REPORTED_BY_DESIGN)) {
    const snippet = held.get(name);
    if (!snippet) {
      stale.push(`${name} — no set holds this snippet any more`);
      continue;
    }
    const codes = new Set((oracle.diagnostics(filled(snippet.body)) || []).map((d) => d.code || d.message));
    const quiet = ruling.codes.filter((c) => !codes.has(c));
    if (quiet.length) stale.push(`${name} — the parser no longer reports ${quiet.join('; ')}`);
    assert.ok(ruling.why && ruling.why.length > 40, `${name} carries a ruling with no reason in it`);
  }
  assert.deepStrictEqual(stale, [], 'ruling(s) standing over a construct the parser reads cleanly now');
});

test('a snippet that never closes its construct reads as broken', diagnosticsLive, () => {
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

// EVERY SET THE MANIFEST SHIPS CARRIES A RULING ABOUT ITS COLOUR READING, so a set added beside
// these cannot slip past the reading below by standing in no map.
test('every snippet set says which grammar colour-reads it, or why none does', () => {
  const unruled = SETS.filter((file) => !COLOUR_READ[file]);
  assert.deepStrictEqual(unruled, [],
    'snippet set(s) the manifest ships that no ruling names — add one to COLOUR_READ with its reason');
  const gone = Object.keys(COLOUR_READ).filter((file) => !SETS.includes(file));
  assert.deepStrictEqual(gone, [],
    'ruling(s) naming a snippet set the manifest no longer ships');
  for (const [file, ruling] of Object.entries(COLOUR_READ)) {
    assert.ok(ruling.why && ruling.why.length > 40, `${file} carries a ruling with no reason in it`);
    if (ruling.language) {
      assert.ok(languagesOf(file).includes(ruling.language),
        `${file} reads under ${ruling.language}, which the manifest never registers it for`);
      const { scope, extension } = readingFor(ruling.language);
      assert.ok(scope && extension, `${ruling.language} carries no grammar scope or no extension`);
    }
  }
});

test('every snippet inserts a construct this grammar colours', live, () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'snippet-colour-'));
  try {
    const prose = [];
    let read = 0;
    for (const file of SETS) {
      const ruling = COLOUR_READ[file];
      if (!ruling.language) continue;
      const { scope, extension } = readingFor(ruling.language);
      const snippets = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
      const named = new Map();
      let i = 0;
      for (const [name, snippet] of Object.entries(snippets)) {
        const probe = path.join(scratch, `${ruling.language}-${String(i++).padStart(3, '0')}${extension}`);
        fs.writeFileSync(probe, `${filled(snippet.body)}\n`);
        named.set(probe, name);
      }
      if (!named.size) continue;
      snapshot(scope, [...named.keys()]);
      read += named.size;

      for (const [probe, name] of named) {
        const snap = fs.readFileSync(`${probe}.snap`, 'utf8');
        const scopes = new Set();
        for (const line of snap.split('\n')) {
          const carried = /^#\s*\^+ (.*)$/.exec(line);
          if (carried) for (const s of carried[1].split(/\s+/)) if (s) scopes.add(s);
        }
        // A dialect's base scope reads as plainly as the host's does.
        const plain = [...scopes].every((s) => PLAIN.has(s) || s === scope);
        if (plain && !PROSE_BY_DESIGN[name]) prose.push(`${file}: ${name}`);
      }
    }
    assert.ok(read > 100, `only ${read} snippet(s) reached a colour reading — the derivation thinned`);
    assert.deepStrictEqual(prose, [],
      'snippet(s) inserting a construct this grammar reads as prose — it works and looks broken');
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});

test('every ruling for a prose reading still names a snippet', () => {
  const held = new Set(sets.flatMap(({ snippets }) => Object.keys(snippets)));
  const gone = Object.keys(PROSE_BY_DESIGN).filter((name) => !held.has(name));
  assert.deepStrictEqual(gone, [], 'ruling(s) naming a snippet no set holds any more');
});
