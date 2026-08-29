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
  for (const raw of text.split('\n')) {
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
 * The scopes on a span that CLAIM something — everything past the base scopes.
 *
 * @param {string[]} scopes
 * @returns {string[]}
 */
function claims(scopes) {
  return scopes.filter((s) => !BASE.has(s));
}

module.exports = { BASE, readSnapshot, claims };
