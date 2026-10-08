// How a carrier gets read, held in one place.
//
// A TIDDLER'S OWN TYPE PICKS ITS PARSER. `$:/palettes/Nord` declares
// `application/x-tiddler-dictionary`, and the host parses that body into ONE `genesis` node; the
// same bytes forced through wikitext build `parseblock, macrocallinline, macrocallinline,
// quoteblock, parseblock`. A sweep comparing a forced wikitext reading against this grammar
// reported 252 cuts of divergence on one file and named a fault in neither reader. Twenty
// dictionaries stand in TiddlyWiki's `core/` alone.
//
// A SIDECAR'S `type:` NAMES THE FILE BESIDE IT, never its own text — `sidecar.meta` declares
// `image/png` and holds no body at all. Handing a sidecar's own text to the image parser took
// light-cone from 35 divergences to 134 and its backward arm from 8 moves to 97.
//
// Three witnesses read this map, so a drift here parts three sweeps at once.
//
//   node --test tools/carrier-reading.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { READINGS, DEFAULT_TYPE, readingFor, typeOf } = require('./carrier-reading.js');

const tid = (fields, body) =>
  `${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${body}`;

test('every carrier this repository reads names a scope', () => {
  for (const [ext, reading] of Object.entries(READINGS)) {
    assert.ok(ext.startsWith('.'), `a reading keyed ${ext}, which no extension matches`);
    assert.match(reading.scope, /^(text|source)\./, `${ext} opens under ${reading.scope}`);
  }
  // A carrier this repository does not read answers with nothing, rather than with a default
  // reading that opens arbitrary bytes under the wikitext grammar.
  assert.strictEqual(readingFor('photo.png'), undefined);
  assert.strictEqual(readingFor('no-extension'), undefined);
});

// A WHOLE-FILE CARRIER DECLARES NEITHER. `.tw` and `.mem` hold body and nothing else, so lifting a
// body out of one would cut its first paragraph off as a header.
test('a carrier whose whole file is its body lifts nothing out', () => {
  for (const ext of ['.tw', '.mem']) {
    assert.strictEqual(READINGS[ext].body, undefined, `${ext} lifts a body out of a file that is one`);
    assert.strictEqual(READINGS[ext].type, undefined, `${ext} reads a type out of a file carrying no header`);
  }
  assert.strictEqual(typeOf('a.tw', 'title: not a header\n\nbody'), DEFAULT_TYPE,
    'a whole-file carrier read a type out of its own first line');
});

// THE DECLARATION PICKS THE PARSER. A `.tid` whose header names a type answers with that type, and
// one naming none answers with what TiddlyWiki reads there.
test('a tiddler declaring a type answers with it, and one declaring none reads as wikitext', () => {
  const dictionary = tid({ title: 'Nord', type: 'application/x-tiddler-dictionary' }, 'a: 1\nb: 2');
  assert.strictEqual(typeOf('Nord.tid', dictionary), 'application/x-tiddler-dictionary',
    'a declared type dropped, so the body reaches the wikitext parser instead');
  // THE CONTROL: the same shape carrying no declaration.
  assert.strictEqual(typeOf('plain.tid', tid({ title: 'Plain' }, 'some plain text')), DEFAULT_TYPE);
  assert.strictEqual(READINGS['.tid'].body(dictionary), 'a: 1\nb: 2',
    'the body lift carried the header with it');
});

// A SIDECAR DECLARES A TYPE FOR THE FILE BESIDE IT. Reading it as the sidecar's own hands a PNG
// parser a text file nobody wrote.
test('a sidecar lifts a body and declares no type of its own', () => {
  const meta = tid({ title: 'Motovun Jack', type: 'image/jpeg' }, '');
  assert.strictEqual(READINGS['.meta'].type, undefined,
    'a sidecar answers with the type of the binary beside it, so its own text reaches an image parser');
  assert.strictEqual(typeOf('jack.jpg.meta', meta), DEFAULT_TYPE);
  // The lift still works — a sidecar carrying a body hands it over.
  assert.strictEqual(READINGS['.meta'].body(meta), '');
});

// A sidecar and a tiddler open under the SAME grammar: both carry a `.tid` header.
test('a sidecar opens under the tiddler grammar', () => {
  assert.strictEqual(READINGS['.meta'].scope, READINGS['.tid'].scope,
    'a sidecar opens under a grammar that reads no header, so its fields paint as prose');
});
