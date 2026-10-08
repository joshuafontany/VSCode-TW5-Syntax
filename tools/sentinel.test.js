// A SENTINEL MUST STAND ALONE.
//
// Three witnesses cut a carrier short, append a quoteblock, and ask whether both readers open one
// there. That question holds only while the sentinel stands alone — and a cut leaving the carrier's
// own quote open puts the sentinel inside it. The parser then holds a quote whose start is the
// CARRIER's marker, the grammar opens a nested one, and the difference names a fault in neither
// reader. Measured at `ListWidget.tid:28`, where the cut lands between a marker and its partner;
// 186 host tiddlers carry a line-start `<<<`.
//
// The probe CLOSES what the head left open rather than declining the cut. Declining costs real
// findings — every cut in `blocks.quotes.tw` sits under an open marker by design, and a decline
// dropped the one unruled divergence the bound-stripping collision exists to provoke.
//
// A CLOSER ANSWERS TO ITS OWN WIDTH. TiddlyWiki opens on `(<<<+)` and closes on `^\s*` plus that
// same marker, so a quote opened with four `<` outlives a closer carrying three — which then opens
// a nested quote instead, and the asymmetry wears the grammar's name.
//
//   node --test tools/sentinel.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { SENTINEL, MARKER, openMarkers, closers, sentinelBlocked, standAlone } = require('./sentinel.js');

test('a cut leaving a quote open gets it closed, so the sentinel still answers', () => {
  // The shape `ListWidget.tid` carries: a marker the cut never closes.
  assert.strictEqual(sentinelBlocked('a paragraph\n\n<<<\nquoted and never closed\n'), true,
    'a head leaving a quote open reads as standing alone, so the sentinel answers inside it');
  assert.deepStrictEqual(closers('a paragraph\n\n<<<\nquoted and never closed\n'), ['<<<']);

  // A CLOSER ANSWERS TO ITS OWN WIDTH. TiddlyWiki closes on the marker it opened with, so a quote
  // opened with four `<` outlives a closer carrying three — which opens a nested quote instead.
  assert.deepStrictEqual(closers('<<<<\nouter\n<<<\ninner'), ['<<<', '<<<<'],
    'a nested quote closes by width, innermost first');
  // Same width closes even carrying a cite: the trailing text reads as the quote's cite.
  assert.deepStrictEqual(closers('<<<\nquoted\n<<< Somebody'), []);

  // The controls: a head closing what it opens, and one that opens nothing.
  assert.strictEqual(sentinelBlocked('a paragraph\n\n<<<\nquoted\n<<<\n'), false,
    'a head closing its own quote reads as blocked, so the probe closes where nothing stands open');
  assert.strictEqual(sentinelBlocked('just prose here\n'), false, 'plain prose reads as blocked');
});

// THE READING RUNS OUTERMOST-FIRST, and a caller closing in that order writes the wrong lines.
test('open markers come back outermost first, and closers reverse them', () => {
  assert.deepStrictEqual(openMarkers('<<<<\nouter\n<<<\ninner'), ['<<<<', '<<<'],
    'a reading that hands the innermost marker first closes the outer quote with the inner width');
  assert.deepStrictEqual(closers('<<<<\nouter\n<<<\ninner'),
    openMarkers('<<<<\nouter\n<<<\ninner').slice().reverse());
});

// WIDTH DECIDES, never sequence. A marker of a width no open quote carries opens rather than closes,
// so a head alternating widths accumulates depth where a width-blind reading would drain it.
test('a marker closes only the width it matches', () => {
  assert.deepStrictEqual(openMarkers('<<<\na\n<<<<\nb'), ['<<<', '<<<<'],
    'a wider marker closed a narrower quote');
  assert.deepStrictEqual(openMarkers('<<<\na\n<<<\nb\n<<<\nc'), ['<<<'],
    'three markers of one width leave one quote open');
  // THE CONTROL: the same three markers under a width that never repeats leave all three open.
  assert.deepStrictEqual(openMarkers('<<<\na\n<<<<\nb\n<<<<<\nc'), ['<<<', '<<<<', '<<<<<']);
});

// The marker answers to a LINE START with leading space allowed, and to nothing mid-line.
test('the marker reads a line-start run of three or more, and leading space passes', () => {
  assert.deepStrictEqual(openMarkers('  \t<<<\nindented'), ['<<<'],
    'an indented marker reads as prose, so a cut under it loses its closer');
  assert.deepStrictEqual(openMarkers('prose carrying <<< mid-line\n'), [],
    'a marker inside a line opened a quote nobody wrote');
  assert.deepStrictEqual(openMarkers('<<\ntoo narrow\n'), [],
    'two angle brackets opened a quote TiddlyWiki does not open');
  assert.ok(MARKER.exec('<<<')); // the regex itself, so a caller reading it directly agrees
});

// The whole point: a head handed through `standAlone` leaves nothing open.
test('a head passed through stands alone, and a clean head passes untouched', () => {
  const open = 'a paragraph\n\n<<<\nquoted and never closed\n';
  assert.strictEqual(sentinelBlocked(standAlone(open)), false,
    'a head the probe repaired still swallows the sentinel');
  const clean = 'just prose here\n';
  assert.strictEqual(standAlone(clean), clean, 'a head opening nothing came back rewritten');
});

// The sentinel itself stays a quoteblock, and the probe's own text must not open one it fails to
// close — a sentinel that leaves a quote open blocks the NEXT reading rather than its own.
test('the sentinel closes what it opens', () => {
  assert.strictEqual(sentinelBlocked(SENTINEL), false, 'the probe leaves its own quote open');
  assert.match(SENTINEL, MARKER, 'the sentinel opens on something other than a quote marker');
});
