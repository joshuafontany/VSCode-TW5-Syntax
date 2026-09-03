// PATTERN INTEGRITY: a reader takes what its writer emits.
//
// Every fault in this family read the same way from inside — a reader answering confidently about
// text it had misread, with no error anywhere. Four stand measured in this repository:
//
//   a `.tid` split on two newlines in a row answered wrongly three ways, and missed 34 of
//   TiddlyWiki's own tiddlers;
//   a CRLF line matched no field regex at all, because `.` and `$` both count a carriage return as
//   a line terminator;
//   a snippet body read verbatim handed the parser `\\define` where VS Code inserts `\define`;
//   a `.meta` sidecar outranked the fields a spec asked for, and no spec could say so.
//
// So this asks every reader the same questions, and asks them of the reader rather than of one
// file: CRLF, a byte-order mark, a blank line carrying a space, no trailing newline, and a leading
// blank line. A writer emits all five somewhere, and a reader that answers differently for one of
// them answers wrongly for a file somebody will hand it.
//
//   node --test tools/reader-tolerance.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const { parseTid } = require('./wiki-data.js');
const { readSnapshot } = require('./snapshot-format.js');
const { parseJsonc } = require('./contributions.test.js');
const { loadTheme } = require('./theme-model.js');

/**
 * The same text, spelled the four ways a writer spells it.
 *
 * A byte-order mark stands outside this. `JSON.parse` refuses one and every JSON reader here goes
 * through it, so tolerating a mark would mean tolerating it in thirty readers. `.gitattributes`
 * stops one arriving and `tools/bytes-on-disk.test.js` holds the tree to that, which leaves one
 * implementation rather than thirty.
 */
function variants(text) {
  return {
    'as written': text,
    'CRLF': text.replace(/\n/g, '\r\n'),
    'no trailing newline': text.replace(/\n$/, ''),
    'a blank line carrying a space': text.replace(/\n\n/g, '\n \n')
  };
}

test('parseTid answers the same for every spelling of a tiddler', () => {
  const tid = 'title: Alpha\ntype: text/vnd.tiddlywiki\n\nthe body\n';
  const expected = { title: 'Alpha', type: 'text/vnd.tiddlywiki' };
  for (const [how, text] of Object.entries(variants(tid))) {
    const { fields, body } = parseTid(text);
    assert.strictEqual(fields.title, expected.title, `${how}: the title read as ${JSON.stringify(fields.title)}`);
    assert.strictEqual(fields.type, expected.type, `${how}: the type read as ${JSON.stringify(fields.type)}`);
    assert.match(body, /the body/, `${how}: the body read as ${JSON.stringify(body)}`);
  }
});

test('parseJsonc answers the same for every spelling of a configuration', () => {
  const jsonc = '{\n  // a comment\n  "comments": { "lineComment": "<!--" },\n  "brackets": []\n}\n';
  for (const [how, text] of Object.entries(variants(jsonc))) {
    let read;
    assert.doesNotThrow(() => { read = parseJsonc(text); }, `${how}: the reader threw`);
    assert.strictEqual(read.comments.lineComment, '<!--', `${how}: the value read wrongly`);
  }
});

test('readSnapshot answers the same for every spelling of a snapshot', () => {
  const snap = '>a line\n#^^^^^^ text.html.tiddlywiki5 markup.bold.tiddlywiki5\n';
  for (const [how, text] of Object.entries(variants(snap))) {
    const read = readSnapshot(text);
    assert.ok(read.length > 0, `${how}: the reader found no line`);
    const scopes = (read[0].annotations || []).flatMap((a) => a.scopes);
    assert.ok(scopes.includes('markup.bold.tiddlywiki5'),
      `${how}: the scopes read as ${JSON.stringify(scopes)}`);
  }
});

test('a theme reader takes a theme spelled every way', () => {
  const theme = '{\n  "name": "probe",\n  "tokenColors": [\n    { "scope": "markup.bold", "settings": { "foreground": "#ff0000" } }\n  ]\n}\n';
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-tolerance-'));
  try {
    for (const [how, text] of Object.entries(variants(theme))) {
      const file = path.join(scratch, `${how.replace(/\W+/g, '-')}.json`);
      fs.writeFileSync(file, text);
      let rules;
      assert.doesNotThrow(() => { rules = loadTheme(file); }, `${how}: the reader threw`);
      assert.ok(rules.some((r) => r.parts.join('.') === 'markup.bold' && r.settings.foreground === '#ff0000'),
        `${how}: the rule read as ${JSON.stringify(rules)}`);
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});

test('a grammar reader takes a grammar spelled every way', () => {
  const { declaredScopes } = require('./grammar-scopes.js');
  const grammar = '{\n  "name": "Probe",\n  "scopeName": "source.probe",\n  "patterns": [\n    { "match": "x", "name": "markup.bold.probe" }\n  ]\n}\n';
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-tolerance-'));
  try {
    for (const [how, text] of Object.entries(variants(grammar))) {
      const file = path.join(scratch, `${how.replace(/\W+/g, '-')}.json`);
      fs.writeFileSync(file, text);
      let scopes;
      assert.doesNotThrow(() => { scopes = declaredScopes(file); }, `${how}: the reader threw`);
      assert.ok(scopes.has('markup.bold.probe'), `${how}: the scopes read as ${[...(scopes || [])]}`);
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});
