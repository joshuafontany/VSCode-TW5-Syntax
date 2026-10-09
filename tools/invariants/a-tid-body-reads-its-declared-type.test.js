// A tiddler's `type` field decides the language of its body, and the dialect belongs in that list.
//
// `type` ALREADY SWITCHES THE BODY. The tid grammar carries a `typed-body` rule where a type line
// opens a region that never closes — the remaining header fields read inside it, and the body after
// the blank line reads as the guest language. json, javascript, css, html, xml and markdown each
// earn a reading that way. `text/memetic-wikitext+tiddlywiki` did not, so a tiddler DECLARING the
// dialect read its body as plain wikitext: every sigil in it coloured as a bare macro call, every
// carrier head as a call's name, and nothing said so.
//
// That matters more than a `.mem` file does. A real wiki holds tiddlers, not files on disk, and a
// tiddler's `type` field is the only place it can announce its dialect. `firstLine` cannot reach
// this — it reads line one, where `title:` stands — so the declaration has to be read where it
// actually sits, by the grammar, in the header.
//
// THE READINGS, both ways round: a body under the declared type carries the dialect's own scopes,
// and a body under no such type does not. The second half stops this passing on a grammar that
// colours sigils everywhere.
//
//   node --test tools/invariants/a-tid-body-reads-its-declared-type.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { snapshot } = require('../tokenizer.js');

const ROOT = path.resolve(__dirname, '..', '..');
const DIALECT = 'text/memetic-wikitext+tiddlywiki';
const live = { timeout: 300000 };

/** The scopes a snapshot carries on the line whose source text equals `text`. */
function scopesOnLine(snapFile, text) {
  const carried = new Set();
  let inLine = false;
  for (const line of fs.readFileSync(snapFile, 'utf8').split('\n')) {
    if (line.startsWith('>')) { inLine = line.slice(1).trim() === text; continue; }
    if (!inLine) continue;
    const m = /^#\s*\^+ (.*)$/.exec(line);
    if (m) for (const s of m[1].split(/\s+/)) if (s) carried.add(s);
  }
  return carried;
}

/** A `.tid` written to a scratch directory and read under the tid-file grammar. */
function readTid(body) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'tid-type-'));
  const file = path.join(scratch, 'probe.tid');
  fs.writeFileSync(file, body);
  snapshot('source.tiddlywiki5.tid-file', [file]);
  return { snap: `${file}.snap`, clean: () => fs.rmSync(scratch, { recursive: true, force: true }) };
}

const SIGIL = '<<~ stance "poet">>';

test('a tiddler declaring the dialect reads its body as the dialect', live, () => {
  const { snap, clean } = readTid([
    'title: Probe',
    `type: ${DIALECT}`,
    '',
    SIGIL,
    ''
  ].join('\n'));
  try {
    const scopes = [...scopesOnLine(snap, SIGIL)];
    assert.ok(scopes.length > 0, 'the sigil line carried no scope at all — the snapshot read nothing');
    assert.ok(scopes.some((s) => s.endsWith('.memetic-wikitext')),
      `a tiddler declaring \`${DIALECT}\` read its body with no dialect scope on the sigil. `
      + `Carried: ${scopes.join(' ')}`);
  } finally { clean(); }
});

// THE CONTROL. Without it, a grammar reading sigils under every type would pass the reading above
// while saying nothing about the declaration.
test('a tiddler declaring no type reads the same body as plain wikitext', live, () => {
  const { snap, clean } = readTid([
    'title: Probe',
    '',
    SIGIL,
    ''
  ].join('\n'));
  try {
    const scopes = [...scopesOnLine(snap, SIGIL)];
    assert.ok(scopes.length > 0, 'the sigil line carried no scope at all — the snapshot read nothing');
    assert.deepStrictEqual(scopes.filter((s) => s.endsWith('.memetic-wikitext')), [],
      'a tiddler declaring NO type read its body as the dialect — the grammar colours sigils '
      + 'everywhere and the declaration decides nothing');
  } finally { clean(); }
});

// THE HEADER STILL READS AS A HEADER. The type line opens a region that never closes, so a field
// standing AFTER it reads inside that region — and a region handing everything to the dialect would
// colour `caption:` as wikitext prose.
test('a field standing after the type line still reads as a field', live, () => {
  const { snap, clean } = readTid([
    'title: Probe',
    `type: ${DIALECT}`,
    'caption: After The Type Line',
    '',
    SIGIL,
    ''
  ].join('\n'));
  try {
    const scopes = [...scopesOnLine(snap, 'caption: After The Type Line')];
    assert.ok([...scopes].some((s) => /attribute-name\.field|field\.tiddlywiki5/.test(s)),
      `a header field after the type line stopped reading as a field. Carried: ${[...scopes].join(' ')}`);
  } finally { clean(); }
});

// AND THE DECLARATION ITSELF READS AS THE FIELD IT IS, the way every other typed body here reads
// its own type line.
test('the type line reads as a field, not as dialect content', live, () => {
  const { snap, clean } = readTid([
    'title: Probe',
    `type: ${DIALECT}`,
    '',
    SIGIL,
    ''
  ].join('\n'));
  try {
    const scopes = [...scopesOnLine(snap, `type: ${DIALECT}`)];
    assert.ok([...scopes].some((s) => /attribute-name\.field/.test(s)),
      `the type line stopped reading as a field name. Carried: ${[...scopes].join(' ')}`);
    assert.ok([...scopes].some((s) => /string\.unquoted\.field\.value/.test(s)),
      `the type's VALUE stopped reading as a field value. Carried: ${[...scopes].join(' ')}`);
  } finally { clean(); }
});

// ── A HEADER LISTS ITS FIELDS IN ANY ORDER ────────────────────────────────────────────────────
//
// TiddlyWiki fixes no field order, so `type` stands first as readily as last, and the rule that
// reads it cannot assume a position. The mechanism answers that by construction rather than by
// luck: `#typed-body` stands FIRST among the grammar's top-level patterns, so a type line matches
// wherever it sits; the header rule's own `end` releases just before such a line when one comes
// later; and the region the type line opens includes the fields grammar, so every field before and
// after it keeps reading as a field.
//
// Construction is not measurement, so each order gets read. The spacing rides along: a padded
// colon, a leading space and a trailing space each stand inside what the pattern's `[ \t]*` admits,
// and a reader writes all three.
const ORDERS = {
  'type first, title after': ['type: TYPE', 'title: Probe'],
  'type last in the header': ['title: Probe', 'caption: Cap', 'type: TYPE'],
  'type between two fields': ['title: Probe', 'type: TYPE', 'caption: Cap'],
  'a padded colon': ['title: Probe', 'type : TYPE'],
  'a leading space': ['title: Probe', ' type: TYPE'],
  'a trailing space': ['title: Probe', 'type: TYPE ']
};

test('the declaration reads wherever the header puts it', live, () => {
  for (const [shape, header] of Object.entries(ORDERS)) {
    const { snap, clean } = readTid([...header.map((l) => l.replace('TYPE', DIALECT)), '', SIGIL, ''].join('\n'));
    try {
      const scopes = [...scopesOnLine(snap, SIGIL)];
      assert.ok(scopes.some((s) => s.endsWith('.memetic-wikitext')),
        `with ${shape}, the body read with no dialect scope. Carried: ${scopes.join(' ')}`);
    } finally { clean(); }
  }
});

// AND A HEADER DECLARING ANOTHER TYPE STILL HANDS THE BODY TO THAT LANGUAGE. A pattern reaching too
// far would take a markdown tiddler's body as the dialect, in a header where `type` sits first.
test('a header declaring another type keeps that language', live, () => {
  const { snap, clean } = readTid(['type: text/markdown', 'title: Probe', '', SIGIL, ''].join('\n'));
  try {
    const scopes = [...scopesOnLine(snap, SIGIL)];
    assert.deepStrictEqual(scopes.filter((s) => s.endsWith('.memetic-wikitext')), [],
      `a tiddler declaring markdown read its body as the dialect. Carried: ${scopes.join(' ')}`);
    assert.ok(scopes.some((s) => /markdown/.test(s)),
      `a tiddler declaring markdown read its body as neither markdown nor the dialect. Carried: ${scopes.join(' ')}`);
  } finally { clean(); }
});
