// The probe's sentinel, and what a carrier does that keeps it from standing alone.
//
// Three witnesses cut a carrier short, append a quoteblock, and ask whether both readers open one
// there. That question holds only while the sentinel stands ALONE — and a cut leaving the carrier's
// own quoteblock open puts the sentinel inside it. The parser then holds a quote whose start is the
// CARRIER's marker, the grammar opens a nested one, and the difference names a fault in neither
// reader. Measured at `ListWidget.tid:28`, where the cut lands between a marker and its partner;
// 186 host tiddlers carry a line-start `<<<`.
//
// THE PROBE CLOSES THE QUOTE RATHER THAN DECLINING THE CUT. Declining costs real findings: every cut
// in `blocks.quotes.tw` sits under an open marker by design, and a decline dropped the one unruled
// divergence the bound-stripping collision exists to provoke.
//
// A CLOSER ANSWERS TO ITS OWN WIDTH. TiddlyWiki opens on `(<<<+)` and closes on `^\s*` plus that
// same marker, so a quote opened with four `<` outlives a closer carrying three — which then opens
// a nested quote instead, and the asymmetry wears the grammar's name.
//
// The sentinel itself stays a quoteblock. No wikitext construct opens on a marker no carrier can
// write, so moving to a rarer opener trades one collision for another.

'use strict';

/** The construct every witness appends to ask its question. */
const SENTINEL = '<<<\nQuoted\n<<<\n';

/** TiddlyWiki's own quote marker: three or more `<`, at a line start, with leading space allowed. */
const MARKER = /^[ \t]*(<<<+)(?!<)/;

/**
 * The markers a cut's head leaves open, outermost first.
 *
 * A marker matching the width of the innermost open quote CLOSES it — trailing text after it reads
 * as that quote's cite rather than as a new opener. Any other width opens.
 *
 * @param {string} head  the carrier's text up to the cut, without the sentinel
 */
function openMarkers(head) {
  const open = [];
  for (const line of head.split('\n')) {
    const m = MARKER.exec(line);
    if (!m) continue;
    if (open.length && open[open.length - 1].length === m[1].length) open.pop();
    else open.push(m[1]);
  }
  return open;
}

/** The lines that close everything a head left open, innermost first. */
function closers(head) {
  return openMarkers(head).reverse();
}

/** Whether the sentinel would land inside a quote the head left open. */
function sentinelBlocked(head) {
  return openMarkers(head).length > 0;
}

/**
 * The head a sentinel can stand behind: every open quote gets its closer, everything else passes
 * through untouched. Both readers then meet the sentinel at the same depth.
 */
function standAlone(head) {
  const shut = closers(head);
  return shut.length ? `${head}\n${shut.join('\n')}` : head;
}

module.exports = { SENTINEL, MARKER, openMarkers, closers, sentinelBlocked, standAlone };
