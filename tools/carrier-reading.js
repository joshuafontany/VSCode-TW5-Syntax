// How a carrier gets read — its scope, its body, and the type that picks its parser.
//
// Three witnesses swept carriers and each carried its own copy of this map. They drifted: one swept
// no `.meta` sidecar at all, and ALL THREE handed a `.tid` body to the wikitext parser while
// discarding the `type:` field they had just parsed out of its own header.
//
// A TIDDLER'S OWN TYPE PICKS ITS PARSER. Measured over TiddlyWiki's `core/`: `$:/palettes/Nord`
// declares `application/x-tiddler-dictionary`, and the host parses that body into ONE `genesis`
// node. The same bytes forced through wikitext build `parseblock, macrocallinline, macrocallinline,
// quoteblock, parseblock`. This grammar honours the declaration — a dictionary body paints as
// `key: value` fields — so a sweep comparing a forced wikitext reading against it reported 252 cuts
// of divergence on one file and named a fault in neither reader. Twenty dictionaries stand in
// `core/` alone.
//
// One map, so a witness added later cannot drift from the ones beside it.

'use strict';

const path = require('node:path');
const { parseTid } = require('./wiki-data.js');

/** The type TiddlyWiki reads where a tiddler declares none. */
const DEFAULT_TYPE = 'text/vnd.tiddlywiki';

/**
 * How each carrier extension gets read.
 *
 * `body` lifts the text a parser sees out of the file; `type` names the parser that sees it. A
 * carrier whose whole file IS the body declares neither, and reads as wikitext.
 */
const READINGS = {
  '.tw': { scope: 'text.html.tiddlywiki5' },
  '.mem': { scope: 'text.html.tiddlywiki5.memetic-wikitext' },
  '.tid': {
    scope: 'source.tiddlywiki5.tid-file',
    body: (text) => parseTid(text).body,
    type: (text) => parseTid(text).fields.type || DEFAULT_TYPE
  },
  // A SIDECAR'S `type:` NAMES THE FILE BESIDE IT, never its own text. `sidecar.meta` declares
  // `image/png` and holds no body at all — the bytes live in the image next to it — so a reader
  // handing a sidecar's own text to the image parser reads a tiddler nobody wrote. Measured: doing
  // that took light-cone from 35 divergences to 134 and its backward arm from 8 moves to 97.
  '.meta': {
    scope: 'source.tiddlywiki5.tid-file',
    body: (text) => parseTid(text).body
  }
};

/** The reading a file answers to, or nothing where this repository reads no such carrier. */
const readingFor = (file) => READINGS[path.extname(file)];

/**
 * The type a carrier's body gets parsed as.
 *
 * @param {string} file  the carrier's path, which names its reading
 * @param {string} text  the carrier's WHOLE text, header and all — the type lives in the header
 */
const typeOf = (file, text) => {
  const reading = readingFor(file);
  return reading && reading.type ? reading.type(text) : DEFAULT_TYPE;
};

module.exports = { READINGS, DEFAULT_TYPE, readingFor, typeOf };
