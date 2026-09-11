// What a theme paints, held to one matching rule.
//
// Four gates read colour through this module, so a defect here moves all four at once and none of
// them names it. The rule it holds:
//
//   a selector reaches a scope when it EQUALS it or names a dot-bounded prefix of it, so
//   `markup.heading` reaches `markup.heading.1.tiddlywiki5` and `markup.head` reaches nothing;
//   a selector may carry a descendant path, and only its LAST element decides what it reaches —
//   the elements before it must stand somewhere EARLIER in the stack;
//   depth outranks position, position outranks nothing, and a theme's own ordering breaks a tie
//   with the later rule winning, the way VS Code resolves one.
//
// Each of those answers a question a caller asks, so each stands collided here against an input
// constructed to break it rather than against whatever the bundled themes happen to hold.
//
//   node --test tools/theme-model.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { covers, flatten, rulesOf, winner, paints, colourOf, propertyOf } = require('./theme-model.js');

/** A theme built from selector/colour pairs, in the order VS Code would read them. */
const theme = (...pairs) => ({
  tokenColors: pairs.map(([scope, foreground, extra]) => ({ scope, settings: { foreground, ...extra } }))
});

// A SEGMENT BOUNDARY, never a character one. A prefix match on characters reaches every scope that
// merely starts with the same letters, which paints a family nobody selected.
test('a selector reaches whole segments and stops at a partial one', () => {
  assert.strictEqual(covers('markup.heading', 'markup.heading.1.tiddlywiki5'), true);
  assert.strictEqual(covers('markup.heading', 'markup.heading'), true, 'a selector fails to reach itself');
  // THE CONTROL: the same letters, cut inside a segment.
  assert.strictEqual(covers('markup.head', 'markup.heading.1.tiddlywiki5'), false,
    'a selector reached a scope through a partial segment, so one name paints a family beside it');
  assert.strictEqual(covers('markup.heading.1', 'markup.heading'), false,
    'a selector deeper than the scope reached it anyway');
});

// A THEME HANDED BACK WHAT IT ALREADY FLATTENED READS AS A THEME WITH NO RULES. A gate over
// sixty-five themes then measures sixty-five themes' worth of nothing and reports green, so the
// shape answers before the reading does.
test('flatten refuses rules, and rulesOf takes either', () => {
  const t = theme(['markup.bold', '#fff']);
  const rules = flatten(t);
  assert.strictEqual(rules.length, 1);
  assert.throws(() => flatten(rules), TypeError,
    'flatten took its own output, so a caller measures no rules while reading green');
  assert.throws(() => flatten(null), TypeError);
  assert.throws(() => flatten([]), TypeError);
  // rulesOf takes both, and hands the flattened form through untouched.
  assert.deepStrictEqual(rulesOf(rules), rules);
  assert.deepStrictEqual(rulesOf(t), rules);
});

// One rule, several selectors: a list, a comma-joined string, and a descendant path.
test('a rule carrying several selectors flattens to one entry each', () => {
  assert.strictEqual(flatten(theme([['a', 'b'], '#fff'])).length, 2, 'a list of selectors read as one');
  assert.strictEqual(flatten(theme(['a, b ,c', '#fff'])).length, 3, 'a comma-joined selector read as one');
  const [path] = flatten(theme(['text.html meta.embedded', '#fff']));
  assert.deepStrictEqual(path.parts, ['text.html', 'meta.embedded'],
    'a descendant path collapsed to one element, so its ancestor stopped answering');
  // THE CONTROL: a rule naming no scope contributes nothing rather than an empty entry.
  assert.strictEqual(flatten({ tokenColors: [{ settings: { foreground: '#fff' } }] }).length, 0);
});

// DEPTH FIRST, then position. A base scope carrying a deep selector outranks an inner scope
// carrying a shallow one, because the deeper selector names more of what stands there.
test('the winner takes depth first and position second', () => {
  const stack = ['text.html.tiddlywiki5', 'meta.paragraph.tiddlywiki5', 'markup.bold.tiddlywiki5'];
  assert.strictEqual(winner(stack, theme(['markup', '#shallow'], ['markup.bold', '#deep'])).settings.foreground,
    '#deep', 'a shallower selector outpainted a deeper one');
  // Equal depth: the innermost scope in the stack wins.
  assert.strictEqual(winner(stack, theme(['text.html', '#outer'], ['markup.bold', '#inner'])).settings.foreground,
    '#inner', 'an outer scope outpainted an inner one at equal depth');
  // A tie at the same depth and the same position breaks LATER-WINS, the way VS Code resolves one.
  assert.strictEqual(winner(stack, theme(['markup.bold', '#first'], ['markup.bold', '#last'])).settings.foreground,
    '#last', 'an earlier rule survived a later one naming the same selector');
  // THE CONTROL: a stack no rule reaches paints nothing rather than the nearest thing.
  assert.strictEqual(winner(['source.nothing'], theme(['markup.bold', '#fff'])), null);
});

// A DESCENDANT PATH ANSWERS TO THE WHOLE STACK. Its last element decides what it reaches, and every
// element before it must stand EARLIER — a path whose ancestor stands nowhere reaches nothing, and a
// reading that ignores the ancestor paints every embedded region in every grammar.
test('a descendant selector needs its ancestor standing earlier in the stack', () => {
  const t = theme(['text.html meta.embedded', '#guest']);
  assert.ok(winner(['text.html.tiddlywiki5', 'meta.embedded.block.css'], t),
    'a path whose ancestor stands earlier reached nothing');
  // THE CONTROL: the same last element, with the ancestor absent.
  assert.strictEqual(winner(['source.python', 'meta.embedded.block.css'], t), null,
    'a descendant selector painted a stack its ancestor never stands in');
  // And the ancestor must stand EARLIER, never after.
  assert.strictEqual(winner(['meta.embedded.block.css', 'text.html.tiddlywiki5'], t), null,
    'a descendant selector read its ancestor from the wrong side of the stack');
});

// `paints` asks a weaker question than `winner` — whether anything reaches at all.
test('paints answers reach alone, where the winner answers which rule', () => {
  const t = theme(['markup.bold', '#fff']);
  assert.strictEqual(paints(['markup.bold.tiddlywiki5'], t), true);
  assert.strictEqual(paints(['markup.italic.tiddlywiki5'], t), false,
    'a theme reaching nothing in the stack read as painting it');
});

// A SCOPE ASKED ALONE ANSWERS DIFFERENTLY FROM THE SAME SCOPE IN A STACK — an ancestor cannot paint
// what a caller never handed over — and `colourOf` picks its rule by the LONGEST reaching selector.
test('colourOf takes the longest reaching selector, and nothing where none reaches', () => {
  const t = theme(['markup', '#shallow'], ['markup.bold', '#deep']);
  assert.strictEqual(colourOf('markup.bold.tiddlywiki5', t), '#deep');
  assert.strictEqual(colourOf('markup.italic.tiddlywiki5', t), '#shallow');
  assert.strictEqual(colourOf('source.python', t), null, 'a scope no rule reaches came back painted');
  // A rule reaching the scope while setting no foreground paints nothing rather than the next rule's
  // colour: VS Code takes each property from its own most specific rule.
  assert.strictEqual(colourOf('markup.bold.x', theme(['markup.bold', undefined])), null);
});

// EACH PROPERTY RESOLVES ON ITS OWN. A rule winning the foreground does not carry the others with
// it, so a bold-only rule still bolds a span another rule colours.
test('each style property takes its own most specific rule', () => {
  const t = theme(['markup', '#shallow', { fontStyle: 'italic' }], ['markup.bold', '#deep']);
  const stack = ['markup.bold.tiddlywiki5'];
  assert.strictEqual(propertyOf(stack, t, 'foreground'), '#deep');
  assert.strictEqual(propertyOf(stack, t, 'fontStyle'), 'italic',
    'a rule winning the foreground swallowed a property it never set');
  assert.strictEqual(propertyOf(stack, t, 'background'), null,
    'a property no rule sets came back with a value — absence spells null here, the way colourOf spells it');
});
