// The pragma zone reads what TiddlyWiki reads there, and stops where TiddlyWiki stops.
//
// The zone's rules match UNANCHORED upstream — `/\\parsermode[^\S\n]/mg` and its three siblings —
// so a pragma standing after a comment on the same line reads as a pragma. Measured against the
// host: `<!-- a -->\parsermode block` builds `void/commentblock, void/parsermode`, and two comments
// ahead of it read the same way. This grammar anchored all four to `^` and painted nothing there.
//
// THE ZONE BOUNDS THE REACH, never the anchor. TiddlyWiki refuses a SECOND pragma on one line —
// with a comment between it and the first or without — because the first rule moved the parser past
// the rest of the line. Each pattern here consumes to end of line, which reproduces that; the
// assertions below hold both halves, since a relaxation that gained the first reading and lost the
// second would read as an improvement.
//
// A FIXTURE CANNOT CARRY THIS SHAPE. A `.tw5.test` file opens with its own `# SYNTAX TEST` header,
// which stands as line one and matches none of the zone's opening shapes, so the zone never opens
// and every line inside reads as a paragraph. The reading happens here, against the tokenizer.
//
//   node --test tools/pragma-zone.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { tokenize } = require('./tokenizer.js');
const { resolveTiddlyWiki, boot, flatten } = require('./tw5-oracle.js');

const TW = resolveTiddlyWiki();
const live = { skip: TW ? false : 'no TiddlyWiki checkout resolved', timeout: 600000 };

/** The scopes this grammar puts on `part` inside `source`. */
const scopesOn = async (source, part) => {
  const at = source.indexOf(part);
  assert.notStrictEqual(at, -1, `the probe carries no ${JSON.stringify(part)}`);
  const lines = await tokenize('text.html.tiddlywiki5', source);
  const row = source.slice(0, at).split('\n').length - 1;
  const column = at - (source.lastIndexOf('\n', at - 1) + 1);
  const token = (lines[row] || []).find((t) => t.startIndex <= column && t.endIndex > column);
  return token ? token.scopes : [];
};

/** The rules TiddlyWiki builds from a source, in one coordinate space. */
const built = (source) => flatten(boot(TW).parse(source).tree, { sameSpace: true })
  .map((node) => node.rule).filter(Boolean);

const READS = {
  'after one comment': '<!-- a -->\\parsermode block\n\nA paragraph.\n',
  'after two comments': '<!-- a --><!-- b -->\\parsermode block\n\nA paragraph.\n',
  'after a comment, whitespace': '<!-- a -->\\whitespace trim\n\nA paragraph.\n'
};

// TiddlyWiki stands as the touchstone: the grammar answers to what the host BUILDS, never to what
// an anchor made convenient.
test('TiddlyWiki reads a zone pragma standing after a comment', live, () => {
  for (const [name, source] of Object.entries(READS)) {
    const rules = built(source);
    assert.ok(rules.includes('commentblock'), `${name}: the host builds no comment`);
    // `whitespace` sets the parser's own handling and builds NO node, so its reading answers
    // through the rule set rather than through the tree.
    if (source.includes('parsermode')) {
      assert.ok(rules.includes('parsermode'), `${name}: the host builds ${rules.join(', ') || 'nothing'}`);
    }
  }
});

test('a zone pragma standing after a comment paints as a directive', live, async () => {
  for (const [name, source] of Object.entries(READS)) {
    const pragma = source.includes('parsermode') ? '\\parsermode' : '\\whitespace';
    const scopes = await scopesOn(source, pragma);
    assert.ok(scopes.some((sc) => /^meta\.directive\./.test(sc)),
      `${name}: ${pragma} reads as ${scopes.join(' ') || 'nothing at all'}`);
  }
});

// The control, and it decides as much as the reading above. A relaxation reaching past the comment
// would gain the first reading and lose this one, and a run that only asserted the gain would call
// that an improvement.
test('a second pragma on one line reads as the first one tail, the way the host reads it', live, async () => {
  for (const source of ['\\rules except html \\parsermode block\n\nA paragraph.\n',
    '\\rules except html<!-- x -->\\parsermode block\n\nA paragraph.\n']) {
    assert.ok(!built(source).includes('parsermode'),
      `the host builds a second pragma here: ${built(source).join(', ')}`);
    const scopes = await scopesOn(source, '\\parsermode');
    assert.ok(!scopes.some((sc) => /^meta\.directive\.parsermode\./.test(sc)),
      `the grammar opens a second directive where the host reads the first one tail: ${scopes.join(' ')}`);
  }
});

// Outside the zone a pragma names nothing, and the zone closes on the first line carrying neither a
// pragma, a comment, nor blank. A relaxed anchor that reached prose would paint a directive there.
test('a pragma standing in prose paints no directive', live, async () => {
  const source = 'A paragraph.\n\nprose \\whitespace trim\n';
  assert.ok(!built(source).includes('whitespace'), 'the host reads a pragma inside prose');
  const scopes = await scopesOn(source, '\\whitespace');
  assert.ok(!scopes.some((sc) => /^meta\.directive\./.test(sc)),
    `the grammar paints a directive inside prose: ${scopes.join(' ')}`);
});
