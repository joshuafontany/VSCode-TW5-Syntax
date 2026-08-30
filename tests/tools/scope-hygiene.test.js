// Every scope this grammar emits must read as a scope.
//
// A scope name interpolating a capture — `meta.attribute.$1.html` — takes whatever the
// capture matched. Where that capture can hold a space, a bracket or a paren, the emitted
// name stops being one name: a snapshot splits scopes on whitespace, so a mangled name
// arrives as two tokens, and the second one usually starts with a dot.
//
// Nothing downstream complains. A theme simply never matches it, a `-` exclusion in an
// injection selector never spares it, and every gate reads green because the token is
// present — just not the token the grammar meant to emit.
//
// The pinned snapshots carry every scope the corpus reaches, so they answer this without
// any grammar being run again.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { readSnapshot } = require('../../tools/snapshot-format.js');

// A scope name: dot-separated segments of word characters, dashes and plus signs. The
// TextMate convention allows nothing else, and every well-formed scope in this repo's
// snapshots satisfies it.
const WELL_FORMED = /^[A-Za-z0-9][A-Za-z0-9+_-]*(\.[A-Za-z0-9+_-]+)*$/;

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
  assert.ok(WELL_FORMED.test('meta.variable.macro.parameter.tw-$1.tiddlywiki5'.replace('$1', 'name')));
  // The shapes an interpolated capture produces when it swallows more than a name.
  assert.ok(!WELL_FORMED.test('meta.filter.operator.step.tw-(importTitles)]'), 'brackets and parens');
  assert.ok(!WELL_FORMED.test('.tw-suffix-map.tiddlywiki5'), 'a leading dot, left by a split');
  assert.ok(!WELL_FORMED.test('meta.attribute..html'), 'an empty segment');
});

const SAMPLES = path.resolve(__dirname, '..', 'samples');
const snapshots = fs.existsSync(SAMPLES) ? scopesInSnapshots(SAMPLES) : [];
const live = { skip: snapshots.length > 0 ? false : 'no pinned snapshots' };

test('the pinned snapshots carry scopes to check', live, () => {
  assert.ok(snapshots.length > 1000, `${snapshots.length} scope tokens`);
});

// A FLOOR, in the shape corpus-check already uses: the count may fall and may never rise.
// Three shapes stand behind it, each an interpolation that took more or less than a name:
//
//   meta.filter.operator.step.tw-,.tw-suffix-.tiddlywiki5   a capture holding punctuation
//   punctuation.definition.substituted.triple..attribute…   a capture matching nothing
//   meta.variable.pragma.parameter.tw-$1.tiddlywiki5        a capture group that never existed
//
// Lower this number when a fix lands. Never raise it.
const FLOOR = 214;

test('malformed scope names stay at or below the floor', live, () => {
  const mangled = snapshots.filter(({ scope }) => !WELL_FORMED.test(scope));
  const shapes = [...new Set(mangled.map(({ scope }) => scope))].slice(0, 6);
  const report = shapes.map((s) => `\n  ${JSON.stringify(s)}`).join('');
  assert.ok(
    mangled.length <= FLOOR,
    `${mangled.length} malformed scope name(s), floor ${FLOOR}:${report}`
  );
  assert.ok(
    mangled.length >= FLOOR - 40,
    `${mangled.length} malformed, well under the floor of ${FLOOR} — lower FLOOR to pin the gain`
  );
});
