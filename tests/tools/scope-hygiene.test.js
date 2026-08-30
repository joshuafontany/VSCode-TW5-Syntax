// Every scope this grammar emits must read as a scope.
//
// A scope name interpolating a capture — `meta.attribute.$1.html` — takes whatever the
// capture matched. Where that capture can hold a space, a bracket or a paren, the emitted
// name stops being one name: a snapshot splits scopes on whitespace, so a mangled name arrives
// as two tokens, the second usually opening with a dot.
//
// Nothing downstream complains. A theme simply never matches it, a `-` exclusion in an
// injection selector never spares it, and every gate reads green because a token stands
// there — just not the token the grammar meant to emit.
//
// The pinned snapshots carry every scope the corpus reaches, so they answer this without
// running a grammar again.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { readSnapshot } = require('../../tools/snapshot-format.js');

// A scope name: dot-separated segments, none of them empty. A segment may hold whatever an
// interpolated capture legitimately holds — VS Code's own HTML grammar emits
// `meta.attribute.$1.html`, and a TiddlyWiki widget attribute carries the name `$tiddler`, so a
// dollar inside a segment reads as the host's own practice rather than as damage.
//
// Two shapes count as damage, and both pass downstream unseen. WHITESPACE splits one name
// into two, so a theme matches neither half. An EMPTY SEGMENT marks an interpolation that
// matched nothing, and no selector reaches the result.
const WELL_FORMED = /^[^\s.]+(\.[^\s.]+)*$/;

// An interpolation that never resolved. `$1` standing in an emitted name means the pattern
// declared no such capture group, so the name says `tw-$1` for every parameter it ever marks.
const DEAD_INTERPOLATION = /\$\d/;

// Two predicates, and no third. A name whose interpolated segment held a space splits into a
// head and a tail, and the tail carries a leading dot that the first predicate already names.
// Judging the HEAD would mean deciding which suffixes a scope may end in, and the corpus
// carries scopes from every embedded grammar it fences — a list nobody can keep true.
/**
 * Why a scope reads as damaged, or null.
 *
 * @param {string} scope
 * @returns {string|null}
 */
function damage(scope) {
  if (!WELL_FORMED.test(scope)) return 'empty segment or whitespace';
  if (DEAD_INTERPOLATION.test(scope)) return 'an interpolation that never resolved';
  return null;
}

/**
 * Every scope token standing in a snapshot, with the file and line it came from.
 *
 * @param {string} dir
 * @returns {{scope:string, file:string, line:number}[]}
 */
function scopesInSnapshots(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.snap')) continue;
    const text = fs.readFileSync(path.join(dir, name), 'utf8');
    for (const { line, annotations } of readSnapshot(text)) {
      for (const ann of annotations) {
        for (const scope of ann.scopes) out.push({ scope, file: name, line: line + 1 });
      }
    }
  }
  return out;
}

test('a well-formed scope passes and a mangled one fails', () => {
  assert.ok(WELL_FORMED.test('meta.tag.structure.div.start.html.tiddlywiki5'));
  assert.ok(WELL_FORMED.test('markup.underline.link.external.https.tiddlywiki5'));
  // The host's own practice: an interpolated attribute name, dollar and all.
  assert.ok(WELL_FORMED.test('meta.attribute.unrecognized.$tiddler.html.tiddlywiki5'));
  // The two shapes that read as damage.
  assert.ok(!WELL_FORMED.test('meta.filter.operator.step.tw-a b.tiddlywiki5'), 'whitespace splits a name');
  assert.ok(!WELL_FORMED.test('.tw-suffix-map.tiddlywiki5'), 'a leading dot, left by a split');
  assert.ok(!WELL_FORMED.test('meta.attribute..html'), 'an empty segment');
  assert.strictEqual(damage('meta.variable.pragma.parameter.tw-$1.tiddlywiki5'), 'an interpolation that never resolved');
  assert.strictEqual(damage('source.css'), null, 'an embedded grammar names its own scopes');
  assert.strictEqual(damage('meta.tiddle.field.text.tiddlywiki5.multids-file'), null, 'so does a sibling grammar');
});

const SAMPLES = path.resolve(__dirname, '..', 'samples');
const snapshots = fs.existsSync(SAMPLES) ? scopesInSnapshots(SAMPLES) : [];
const live = { skip: snapshots.length > 0 ? false : 'no pinned snapshots' };

test('the pinned snapshots carry scopes to check', live, () => {
  assert.ok(snapshots.length > 1000, `${snapshots.length} scope tokens`);
});

// A FLOOR, in the shape corpus-check already uses: the count may fall and may never rise.
//
// What stands behind it: an SVG element that closes with a self-closing slash takes the `/>`
// branch of its own end pattern, where the group carrying the tag name never participates, so
// the interpolated segment arrives empty. The same name resolves correctly on every element
// that closes with a closing tag, and dropping the interpolation would cost every closing tag
// its name to spare this one shape.
//
// Lower this number when a fix lands. Never raise it.
const FLOOR = 3;

test('malformed scope names stay at or below the floor', live, () => {
  const mangled = snapshots.filter(({ scope }) => damage(scope));
  const shapes = [...new Set(mangled.map(({ scope }) => `${scope}  (${damage(scope)})`))].slice(0, 8);
  const report = shapes.map((s) => `\n  ${JSON.stringify(s)}`).join('');
  assert.ok(
    mangled.length <= FLOOR,
    `${mangled.length} malformed scope name(s), floor ${FLOOR}:${report}`
  );
  assert.ok(
    mangled.length >= FLOOR - 2,
    `${mangled.length} malformed, well under the floor of ${FLOOR} — lower FLOOR to pin the gain`
  );
});
