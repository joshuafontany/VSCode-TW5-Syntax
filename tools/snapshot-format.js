// The `.snap` format, read in one place.
//
// vscode-tmgrammar-snap writes a source line prefixed `>`, then zero or more annotation
// lines prefixed `#`, each carrying a caret run under the columns it names and the scopes
// those columns hold.
//
//     >! a heading
//     #^ text.html.tiddlywiki5 markup.heading.punctuation.definition.tiddlywiki5
//     # ^^^^^^^^^^ text.html.tiddlywiki5 meta.heading.heading-1.tiddlywiki5
//
// THE COLUMN CONVENTION: the `#` occupies column 0 of the annotation line, so a caret at
// annotation index N names SOURCE column N. `#^` names column 0; `# ^` names column 1.
// The assertion format used by .tw5.test files counts differently, so a column read off a
// snapshot and asserted in a test misses by one — a difference this repo has already paid
// for. Every reader goes through here so the convention stands in one place.

/**
 * Scopes every span carries whatever the grammar made of it. A span carrying nothing else
 * claims no construct, so it has nothing to answer for.
 */
const BASE = new Set([
  'text.html.tiddlywiki5',
  'text.html.tiddlywiki5.memetic-wikitext',
  'meta.paragraph.tiddlywiki5',
  'markup.other.paragraph.tiddlywiki5'
]);

/**
 * A `.snap` file, read back into its source lines and the spans annotated on each.
 *
 * Every source line comes back, annotated or not, so a caller counting lines counts the
 * file's own lines rather than the annotated ones.
 *
 * @param {string} text  a .snap file's contents
 * @returns {{line:number, source:string, annotations:{start:number, end:number, scopes:string[]}[]}[]}
 */
function readSnapshot(text) {
  const out = [];
  // A carriage return counts as a line terminator to both `.` and `$`, so the annotation regex
  // below matches NOTHING on a CRLF file — and a caller reads a snapshot full of scopes as one
  // carrying none. Every gate over the pinned snapshots then reports green having measured nothing.
  for (const raw of text.split('\n').map((line) => line.replace(/\r$/, ''))) {
    if (raw.startsWith('>')) {
      out.push({ line: out.length, source: raw.slice(1), annotations: [] });
      continue;
    }
    if (!raw.startsWith('#') || out.length === 0) continue;
    const m = /^#(\s*)(\^+)\s+(\S.*)$/.exec(raw);
    if (!m) continue;
    const start = m[1].length; // the '#' holds column 0, so the run starts here
    out[out.length - 1].annotations.push({
      start,
      end: start + m[2].length,
      scopes: m[3].split(/\s+/).filter(Boolean)
    });
  }
  return out;
}

/**
 * A verdict: a scope saying the author reached for markup and missed.
 *
 * A verdict runs OPPOSITE to a claim. A claim says a construct works, so it answers to
 * whether TiddlyWiki built one; a verdict says nothing works here, so it answers to
 * whether TiddlyWiki refused. Counting the two together reads a correct verdict as an
 * over-reach and hides an invention behind a passing total.
 *
 * @param {string} scope
 * @returns {boolean}
 */
function isVerdict(scope) {
  return scope.startsWith('invalid.');
}

/**
 * A suppression: a scope saying the author wrote a marker that STOPS a construct, and the
 * parser honoured it.
 *
 * A suppression runs the same way a verdict does. `meta.link.suppressed.wikilink` marks a
 * tilde TiddlyWiki obeyed, so it answers to whether the parser REFUSED — counting it with
 * the claims reports every honoured suppressor as an over-reach.
 *
 * @param {string} scope
 * @returns {boolean}
 */
function isSuppression(scope) {
  // The REGION only. The suppressing character itself answers to nothing: TiddlyWiki consumes
  // it and emits a node beginning AFTER it, so no node in the tree covers that column and no
  // reading of the tree can say whether the parser honoured the mark there.
  return scope.includes('.suppressed.');
}

/**
 * The scopes on a span that CLAIM a construct works — past the base scopes every span
 * carries, and past the scopes that say the reverse.
 *
 * @param {string[]} scopes
 * @returns {string[]}
 */
function claims(scopes) {
  return scopes.filter((s) => !BASE.has(s) && !isVerdict(s) && !isSuppression(s));
}

/**
 * The verdicts on a span.
 *
 * @param {string[]} scopes
 * @returns {string[]}
 */
function verdicts(scopes) {
  return scopes.filter(isVerdict);
}

/**
 * Every scope on a span asserting the parser declined — verdicts and suppressions together.
 *
 * @param {string[]} scopes
 * @returns {string[]}
 */
function declines(scopes) {
  return scopes.filter((s) => isVerdict(s) || isSuppression(s));
}

module.exports = { BASE, readSnapshot, claims, verdicts, declines, isVerdict, isSuppression };
