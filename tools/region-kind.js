// What a cut left OPEN, named by kind rather than by position.
//
// A runaway names the region a cut left open, and a scope stack carries several. A reader taking a
// POSITION picks whichever region encloses the rest: the same call files under
// `meta.variable.call.block` where it opens a block and under `meta.paragraph` where it opens inside
// prose — one cause, two keys, and the second stands on 18% of the corpus while naming a fault that
// reaches one construct. Two witnesses read this the same way, so the vocabulary stands in one place.
//
// `attribute-witness` met innermost-versus-outermost three times and the house ruled it: read a KIND
// vocabulary, never a position.

'use strict';

// A stack no kind claims says UNCLASSIFIED rather than handing back its container: a default drawn
// from position reads like a classification and puts a ruling about a container into the ledger.
const KINDS = [
  ['meta.variable.call.*', /^meta\.variable\.(call|macrocall)/],
  ['meta.directive.variable.*', /^meta\.(directive\.variable|variable\.(macro|procedure|function|widget|pragma))\./],
  ['meta.directive.parameters.*', /^meta\.directive\.parameters\./],
  ['meta.codeblock.*', /^meta\.codeblock\./],
  ['meta.embedded.*', /^(meta\.embedded\.|source\.(?!tiddlywiki5))/],
  ['comment.*', /^comment\./],
  ['meta.transclusion.*', /^meta\.(transclusion|filteredtransclusion)\./],
  ['meta.tag.widget.*', /^meta\.tag\.widget\./],
  ['meta.element.*', /^meta\.(element|tag)\./],
  ['meta.table.*', /^meta\.table\./]
];

// `markup.*` names no kind here, deliberately. It stands on 38% of corpus tokens — bold, headings,
// lists and links between them — so a runaway filed under it absorbs any finding, which is the
// shape the warning at the head of `still.js` names. A stack whose innermost claimed region is
// markup reads UNCLASSIFIED and gets examined.

/**
 * The kind of region a scope stack leaves open, read INNERMOST-FIRST.
 *
 * @param {string[]} stack
 * @returns {string} the kind's canonical key, or an unclassified reading naming what stood there
 */
function kindOf(stack) {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    for (const [key, re] of KINDS) if (re.test(stack[i])) return key;
  }
  const named = stack.filter((sc) => !/^(text\.html\.tiddlywiki5|source\.tiddlywiki5)[a-z.-]*$/.test(sc));
  return `(unclassified: ${named.join(' ') || 'bare text'})`;
}

module.exports = { KINDS, kindOf };
