// The DECLARATION picks the language, not only the path.
//
// This house already holds that a carrier announces itself: the finder reads the DOCTYPE line
// rather than the directory a file sits in. The editor did not hold it. A file carrying a memetic
// carrier head under any name VS Code does not recognise opened as plain text — every scope dark,
// the dialect unread — because language selection ran on the extension alone.
//
// `firstLine` closes that. VS Code resolves a language by FILENAME, then EXTENSION, then
// `firstLine`, so a pattern here cannot take a `.tid` or a `.tw` from the language that owns the
// extension: it answers only where nothing else claims the file. The reach is purely additive, and
// what it adds is the editor agreeing with the architecture.
//
// WHAT COUNTS AS A CARRIER HEAD. The family holds the forms that DECLARE a carrier, which the
// grammar itself names: the `<<!DOCTYPE …>>` declaration, and the `<<^` frame marker the memetic
// grammar reads as `entity.name.function.carrier`. A bare `<<~ sigil>>` INVOKES and declares
// nothing, so it stays outside — a wikitext file opening on a sigil call belongs to its own
// language, and claiming it here would read an invocation as a declaration.
//
// Both halves of this derive: the pattern comes off the manifest, and the population off the
// corpus. A specimen added tomorrow reaches this reading on its own.
//
//   node --test tools/invariants/language-selection.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { walkMatching } = require('../walk.js');

const ROOT = path.resolve(__dirname, '..', '..');
const manifest = require(path.join(ROOT, 'package.json'));

/** The language contribution answering for a language id. */
const languageOf = (id) => (manifest.contributes.languages || []).find((l) => l.id === id);

/** The first line of a file, without its newline. */
const firstLineOf = (file) => fs.readFileSync(file, 'utf8').split('\n')[0];

/** Every specimen carrying one of the extensions a language claims. */
function specimensFor(extensions) {
  const dirs = [path.join(ROOT, 'corpus'), path.join(ROOT, 'tests', 'samples')];
  return walkMatching(dirs, (name) => extensions.some((e) => name.endsWith(e)));
}

const memetic = languageOf('memetic-wikitext');

/**
 * The corpus split by whether a specimen's first line DECLARES a carrier, read the way the grammar
 * names the declaring forms rather than by asking the pattern under test.
 *
 * @returns {{declaring: {file:string,line:string}[], silent: {file:string,line:string}[]}}
 */
function split() {
  const declaring = [];
  const silent = [];
  for (const file of specimensFor(memetic.extensions)) {
    const line = firstLineOf(file);
    (/^<<(!DOCTYPE|\^)/.test(line) ? declaring : silent).push({ file, line });
  }
  return { declaring, silent };
}

/** Declaring specimens a pattern fails to reach. */
const missedBy = (re, { declaring }) => declaring.filter(({ line }) => !re.test(line))
  .map(({ file }) => path.relative(ROOT, file));

/** Specimens a pattern claims although they declare nothing. */
const overreachedBy = (re, { silent }) => silent.filter(({ line }) => re.test(line))
  .map(({ file }) => path.relative(ROOT, file));

test('the memetic language carries a firstLine pattern, and it compiles', () => {
  assert.ok(memetic, 'no memetic-wikitext language contribution stands');
  assert.ok(memetic.firstLine, 'the language carries no firstLine, so a declaration selects nothing');
  assert.doesNotThrow(() => new RegExp(memetic.firstLine),
    'the firstLine pattern does not compile, so VS Code reads it as no pattern at all');
});

// THE POPULATION COMES OFF DISK. A specimen whose first line declares a carrier must reach the
// pattern; one that opens on prose or an invocation must not, because selection by declaration
// says nothing about a file that declares nothing.
test('every specimen opening on a carrier head reaches the pattern', () => {
  const re = new RegExp(memetic.firstLine);
  const corpus = split();
  assert.ok(corpus.declaring.length > 0, 'no specimen in this corpus opens on a carrier head');
  assert.deepStrictEqual(missedBy(re, corpus), [],
    'specimen(s) declaring a carrier that the firstLine pattern does not reach');
  assert.deepStrictEqual(overreachedBy(re, corpus), [],
    'specimen(s) declaring nothing that the pattern claims anyway — it reads more than a declaration');
});

// THE PATTERN TAKES NOTHING FROM ANOTHER LANGUAGE. Extension beats firstLine in VS Code's own
// resolution, so this cannot happen through a named file — but an UNTITLED buffer carries no
// extension, and a reader pasting a tiddler header into a new tab would meet the wrong grammar.
test('no specimen of another language opens on a line the pattern claims', () => {
  const re = new RegExp(memetic.firstLine);
  const others = (manifest.contributes.languages || [])
    .filter((l) => l.id !== 'memetic-wikitext' && (l.extensions || []).length);
  assert.ok(others.length > 2, `only ${others.length} other language(s) carry extensions — the reading thinned`);

  const taken = [];
  for (const language of others) {
    for (const file of specimensFor(language.extensions)) {
      if (re.test(firstLineOf(file))) taken.push(`${language.id}: ${path.relative(ROOT, file)}`);
    }
  }
  assert.deepStrictEqual(taken, [],
    'the pattern claims the opening line of a file another language owns');
});

// THE COLLISION. A pattern that matched everything would pass both readings above on a corpus
// where every `.mem` happens to declare. These lines never reach the corpus, so the pattern answers
// for them here or nowhere.
test('the pattern reads a declaration and refuses what merely resembles one', () => {
  const re = (line) => new RegExp(memetic.firstLine).test(line);

  for (const line of [
    '<<!DOCTYPE "memetic-wikitext+tiddlywiki" "lar:///ha.ka.ba/lares/api/pono/memetic-wikitext">>',
    '<<^ code="&#x0001;" namespace="ॐ ँ" from="?" -> to="lar:///ha.ka.ba/x">>',
    '<<^ code="&#x0002;">>'
  ]) assert.ok(re(line), `a carrier head read as no declaration: ${line.slice(0, 60)}`);

  for (const line of [
    '<<!DOCTYPE "html">>',                      // a doctype naming another dialect
    '<!DOCTYPE html>',                          // the HTML form the base grammar reads
    'title: Minimal',                           // a tiddler header
    '```toml meta',                             // a fence head, which markdown also opens on
    '<<~ ahu #/entry>>',                        // an INVOCATION, which declares nothing
    '<<caret>>',                                // a plain wikitext procedure call
    'A local address lar:///ha.ka.ba/x in prose.',
    ''
  ]) assert.ok(!re(line), `a line declaring no carrier read as one: ${JSON.stringify(line)}`);
});

// THE CORPUS READINGS COLLIDE IN-PROCESS. Mutating the manifest to prove them would dirty a tracked
// file every concurrent reader shares, so the pattern arrives as an argument instead: a looser one
// must overreach and a tighter one must miss, over the same corpus the readings above walk.
test('a looser pattern overreaches and a tighter one misses', () => {
  const corpus = split();

  const loose = /^<</;
  assert.ok(overreachedBy(loose, corpus).length > 0,
    'a pattern claiming every `<<` line overreached nothing — the silent half of this corpus went empty');
  assert.deepStrictEqual(missedBy(loose, corpus), [],
    'a pattern claiming every `<<` line still missed a declaration');

  // READING ONLY THE FRAME MARKER MISSES EVERY DECLARATION THIS CORPUS CARRIES. Measured: no
  // specimen here opens on a bare `<<^` — all six declaring specimens lead with the doctype — so
  // the pattern's frame-marker branch answers to the planted lines above and NOT to this corpus.
  // Named rather than hidden: a specimen opening on a bare carrier frame would earn that branch a
  // corpus reading, and nothing yet holds one.
  const tight = /^<<\^/;
  assert.ok(missedBy(tight, corpus).length > 0,
    'a pattern reading only the frame marker missed nothing — no specimen opens on a doctype');
  assert.deepStrictEqual(overreachedBy(tight, corpus), [],
    'a pattern reading only the frame marker overreached');
});
