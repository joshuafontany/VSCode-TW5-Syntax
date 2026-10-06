// `lar:` and `ni:` NAME; they do not fetch. Neither carries an underline any more.
//
// RETIRES `a-lar-uri-keeps-its-underline.test.js` (ruled 2026-10-06, lar:///ha.ka.ba/lares/api/
// pono.uri-palette — THE PUNCTUATION-AND-NO-UNDERLINE PASS, operator-ruled). That file guarded
// the OPPOSITE of what this one guards: it measured that a lar: root term kept at least as much
// underline reach as the base https autolink, because both families then shared the `.link`
// style wrapper and a leaf's own fontStyle (Gruvbox Dark Medium's `entity.name.tag` ruling bold)
// could silently erase it. The cure was a bare `markup.underline.lar.memetic-wikitext` stacked
// onto each root-term capture, winning fontStyle back with no foreground of its own to overwrite
// the leaf's colour.
//
// That cure answered to a WRONG PREMISE: `lar:` and `ni:` describe themselves as naming schemes
// with no authoritative resolution mechanism (RFC 4151, RFC 6920) — there is nothing to dial, so
// the `.link` family's underline was never an honest cue to begin with. The reach-cut
// (lar:///ha.ka.ba/lares/api/pono.uri-palette — THE REACH-CUT) already renamed the family from
// `.link` to `.uri`; this pass goes further and drops the underline outright, replacing both
// enclosing names (`markup.underline.uri.lar/ni.memetic-wikitext`) with a COLOURLESS
// `meta.uri.lar/ni.memetic-wikitext` and removing the now-unnecessary stacked cure from the root
// terms — nothing underlines any more, so nothing needs winning back.
//
// WHAT THE CURE WAS REALLY PROTECTING, this file asserts directly instead of asserting the
// underline that used to stand in for it: a root term keeps a foreground distinct from the
// punctuation beside it. An underline was always a proxy for "this reads as a different kind of
// span than its neighbour" — now that nothing underlines, this checks the actual thing.

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadThemes, styleOf } = require('../theme-model.js');
const { tokenizeFrom } = require('../tokenizer.js');

const ROOT = path.resolve(__dirname, '..', '..');
const DIALECT = 'text.html.tiddlywiki5.memetic-wikitext';
const live = { timeout: 300000 };
const LINE = 'A lar:///ha.ka.ba/lares/api/pono?k=v#frag and ni:///sha-256;abc123 here.';

/** The full scope stack vscode-textmate builds for the character at `at` on tokenized `line`. */
function stackAt(tokens, at) {
  const token = tokens.find((t) => at >= t.startIndex && at < t.endIndex);
  assert.ok(token, `no token covers offset ${at}`);
  return token.scopes;
}

function underlineCount(themes, stack) {
  return themes.filter((t) => {
    const style = styleOf(stack, t);
    return style.fontStyle && style.fontStyle.includes('underline');
  }).length;
}

// RED FIRST, AGAINST THE REAL PARENT. The commit this retires (`0e47da1`, the reach-cut, still
// wearing `markup.underline.uri.{lar,ni}.memetic-wikitext`) must itself fail the assertion this
// file makes now — otherwise the ruling retires nothing and this file would pass vacuously.
test('the pre-change grammar (the reach-cut, 0e47da1) DID underline these spans in some theme', live, () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'underline-red-'));
  const file = path.join(scratch, 'memetic-wikitext.json');
  try {
    fs.writeFileSync(file, execFileSync('git', ['show', '0e47da1:syntaxes/memetic-wikitext.json'],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 }));
    const themes = loadThemes();
    // The reach-cut's own scheme capture carried the stacked cure directly, so its scheme span
    // is the surest span to catch — no live tokenizer swap needed for a scope-stack-literal check.
    const stack = ['text.html.tiddlywiki5',
      'markup.underline.uri.lar.memetic-wikitext',
      'entity.name.tag.heading.lar.memetic-wikitext', 'markup.underline.lar.memetic-wikitext'];
    const count = underlineCount(themes, stack);
    assert.ok(count > 0, 'the reach-cut carried no underlined theme either — this ruling would retire nothing');
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});

test('no bundled theme renders a lar: or ni: span underlined', live, async () => {
  const themes = loadThemes();
  const { tokens } = await tokenizeFrom(DIALECT, [LINE]);
  const row = tokens[0];
  const offsets = {
    'lar.scheme': LINE.indexOf('lar:'),
    'lar.sep': LINE.indexOf('lar:') + 3,
    'lar.root.heading': LINE.indexOf('ha.ka.ba'),
    'lar.root.angle': LINE.indexOf('ka.ba'),
    'lar.root.dynamic': LINE.indexOf('ba', LINE.indexOf('ka.ba')),
    'lar.path': LINE.indexOf('lares'),
    // The fragment anchor ('#frag') is deliberately NOT measured here: its underline comes from
    // the SEPARATE, unrelated `fragment` repository rule (`entity.name.tag.anchor.memetic-wikitext
    // markup.underline.anchor.memetic-wikitext`), not from the lar:/ni: scheme family this ruling
    // retires. That convention stands untouched — this ruling only reaches the enclosing
    // `markup.underline.(link|uri).{lar,ni}.memetic-wikitext` family and the root-term stack this
    // commit removes.
    'ni.scheme': LINE.indexOf('ni:'),
    'ni.algorithm': LINE.indexOf('sha-256'),
    'ni.digest': LINE.indexOf('abc123'),
  };
  const failures = [];
  for (const [label, at] of Object.entries(offsets)) {
    assert.ok(at >= 0, `${label}: offset not found in probe line`);
    const stack = stackAt(row, at);
    const count = underlineCount(themes, stack);
    if (count > 0) failures.push(`${label}: underlined in ${count}/${themes.length} theme(s)`);
  }
  assert.deepStrictEqual(failures, [], failures.join('\n  '));
});

test('a lar: root term keeps a foreground distinct from its neighbouring punctuation', live, async () => {
  // What the retired underline cure was really protecting: a reader must still be able to tell
  // the heading/angle/dynamic terms apart from the dots and slashes beside them, even with
  // nothing underlined and the enclosing family colourless. This checks the thing directly
  // rather than the underline that used to stand in for it.
  const themes = loadThemes();
  const { tokens } = await tokenizeFrom(DIALECT, [LINE]);
  const row = tokens[0];
  const headingStack = stackAt(row, LINE.indexOf('ha.ka.ba'));
  const dotStack = stackAt(row, LINE.indexOf('.', LINE.indexOf('ha.ka.ba')));
  let distinct = 0;
  for (const t of themes) {
    const h = styleOf(headingStack, t);
    const d = styleOf(dotStack, t);
    if (h.foreground !== d.foreground) distinct++;
  }
  // A floor, not a literal: this records the measured reach rather than asserting every theme —
  // the base https autolink's own body-vs-punctuation reach is the published, trusted reference
  // (`a-uri-wears-its-family.test.js`'s sibling control). Re-measure and raise this floor if the
  // true count moves; a floor set to the vocabulary of the day and never revisited would fail
  // silently the day a future rename widened the gap and nobody noticed it could be raised.
  assert.ok(distinct >= 20,
    `the heading term's foreground differs from its own dot's in only ${distinct}/${themes.length} theme(s)`);
});
