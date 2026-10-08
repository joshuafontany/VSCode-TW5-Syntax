// What a theme paints, held to the engine that paints it.
//
// Four gates read colour through this module, so a defect here moves all four at once and none of
// them names it. `tools/theme-collision.js` settles the whole model against `vscode-textmate` over
// the corpus; this holds the LAW in pieces, each against an input built to break it rather than
// against whatever the bundled themes happen to carry.
//
//   a selector reaches a scope when it EQUALS it or names a dot-bounded prefix of it;
//   a selector may carry a descendant path, and only its LAST element decides what it reaches —
//   the elements before it must stand somewhere EARLIER in the stack;
//   POSITION OUTRANKS DEPTH: the innermost scope any rule reaches decides the colour outright, and
//   a selector's depth breaks a tie only among rules reaching the SAME scope, later winning;
//   each property resolves on its own, over the EDITOR's default rather than a scopeless rule.
//
//   node --test tools/theme-model.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { covers, normalise, flatten, rulesOf, styleOf, reaches, paints, colourOf, engineTheme } =
  require('./theme-model.js');

/** A theme built from selector/colour pairs, in the order VS Code would read them. */
const theme = (...pairs) => ({
  type: 'dark',
  colors: { 'editor.foreground': '#010203', 'editor.background': '#000000' },
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

// A THEME WRITES `#D50` WHERE THE ENGINE HOLDS `#DD5500`. A comparison on the raw strings reports a
// divergence that stands nowhere on screen — measured, fourteen of them across two themes.
test('a colour reads the one way the engine holds it', () => {
  assert.strictEqual(normalise('#d50'), '#DD5500');
  assert.strictEqual(normalise('#24292eff'), '#24292E', 'an opaque alpha survived into the comparison');
  assert.strictEqual(normalise('#24292e80'), '#24292E80', 'a real alpha got dropped with the opaque ones');
  // THE CONTROL: what spells no colour spells nothing, rather than itself.
  assert.strictEqual(normalise('red'), undefined);
  assert.strictEqual(normalise('#12345'), undefined);
  assert.strictEqual(normalise(undefined), undefined);
});

// A THEME HANDED BACK WHAT IT ALREADY FLATTENED READS AS A THEME WITH NO RULES. A gate over
// sixty-five themes then measures sixty-five themes' worth of nothing and reports green, so the
// shape answers before the reading does.
test('flatten refuses a model, and rulesOf takes either', () => {
  const t = theme(['markup.bold', '#FFFFFF']);
  const model = flatten(t);
  // VS Code appends its own four `token.*` rules to a theme naming no `token.info-token`, so every
  // model here carries them. No grammar scope begins `token.`, so they paint nothing and stand only
  // to keep the rule list the engine's rather than nearly it.
  assert.strictEqual(model.rules.length, 1 + 4);
  assert.deepStrictEqual(model.rules.filter((r) => r.parts[0].startsWith('token.')).length, 4);
  assert.throws(() => flatten(model.rules), TypeError,
    'flatten took its own rules, so a caller measures no rules while reading green');
  assert.throws(() => flatten(null), TypeError);
  assert.throws(() => flatten([]), TypeError);
  assert.deepStrictEqual(rulesOf(model), model.rules);
  assert.deepStrictEqual(rulesOf(t), model.rules);
});

// One rule, several selectors: a list, a comma-joined string, and a descendant path.
test('a rule carrying several selectors flattens to one entry each', () => {
  // Four appended `token.*` rules stand beside each count; the test above names why.
  assert.strictEqual(flatten(theme([['a', 'b'], '#FFFFFF'])).rules.length, 2 + 4, 'a list of selectors read as one');
  assert.strictEqual(flatten(theme(['a, b ,c', '#FFFFFF'])).rules.length, 3 + 4, 'a comma-joined selector read as one');
  const [descendant] = flatten(theme(['text.html meta.embedded', '#FFFFFF'])).rules;
  assert.deepStrictEqual(descendant.parts, ['text.html', 'meta.embedded'],
    'a descendant path collapsed to one element, so its ancestor stopped answering');
  // THE CONTROL: a rule naming no scope contributes nothing rather than an empty entry.
  assert.strictEqual(flatten({ type: 'dark', tokenColors: [{ settings: { foreground: '#FFFFFF' } }] }).rules.length, 4,
    'a scopeless rule reached the rules, where VS Code ignores every one of them');
});

// POSITION OUTRANKS DEPTH — the whole defect this module carried. The engine pushes a token's scopes
// outermost first and lets each match OVERWRITE what stands, so the innermost scope any rule reaches
// decides the colour however shallow the selector. Ranking depth first hands
// `markup.underline.link` on a link's container where the engine hands `string` on the caption.
test('the innermost scope any rule reaches decides the colour', () => {
  const stack = ['text.html.tiddlywiki5', 'markup.underline.link.tiddlywiki5', 'string.other.link.title.tiddlywiki5'];
  assert.strictEqual(styleOf(stack, theme(['markup.underline.link', '#00FFEE'], ['string', '#111FEE'])).foreground,
    '#111FEE', 'a deep selector on an OUTER scope outpainted a shallow one on the innermost');
  // At the SAME scope, depth ranks first.
  assert.strictEqual(styleOf(stack, theme(['string', '#5A110B'], ['string.other.link', '#00DEEB'])).foreground,
    '#00DEEB', 'a shallower selector outpainted a deeper one on the same scope');
  // And a remaining tie breaks LATER-WINS, the way VS Code resolves one.
  assert.strictEqual(styleOf(stack, theme(['string', '#F1F5F7'], ['string', '#1A5700'])).foreground,
    '#1A5700', 'an earlier rule survived a later one naming the same selector');
});

// A DESCENDANT PATH ANSWERS TO THE WHOLE STACK. Its last element decides what it reaches, and every
// element before it must stand EARLIER — a path whose ancestor stands nowhere reaches nothing, and a
// reading that ignores the ancestor paints every embedded region in every grammar.
test('a descendant selector needs its ancestor standing earlier in the stack', () => {
  const t = theme(['text.html meta.embedded', '#60E570']);
  assert.ok(reaches(['text.html.tiddlywiki5', 'meta.embedded.block.css'], t),
    'a path whose ancestor stands earlier reached nothing');
  // THE CONTROL: the same last element, with the ancestor absent.
  assert.strictEqual(reaches(['source.python', 'meta.embedded.block.css'], t), null,
    'a descendant selector painted a stack its ancestor never stands in');
  // And the ancestor must stand EARLIER, never after.
  assert.strictEqual(reaches(['meta.embedded.block.css', 'text.html.tiddlywiki5'], t), null,
    'a descendant selector read its ancestor from the wrong side of the stack');
});

// THE DEFAULT IS THE EDITOR'S. A token no rule reaches takes `editor.foreground`, which is what the
// engine falls through to — comparing a model's fall-through against a DIFFERENT default reads as
// divergence belonging to the harness rather than to the grammar.
test('a stack no rule reaches takes the editor foreground, and says it reached nothing', () => {
  const t = theme(['markup.bold', '#FFFFFF']);
  assert.strictEqual(styleOf(['source.nothing'], t).foreground, '#010203');
  assert.strictEqual(reaches(['source.nothing'], t), null,
    'a stack falling through to the default read as a theme rule reaching it');
  assert.strictEqual(paints(['markup.italic.tiddlywiki5'], t), false);
  assert.strictEqual(paints(['markup.bold.tiddlywiki5'], t), true);
  // A theme naming no editor foreground takes what VS Code registers for its base.
  assert.strictEqual(styleOf(['x'], { type: 'light', tokenColors: [] }).foreground, '#333333');
  assert.strictEqual(styleOf(['x'], { type: 'dark', tokenColors: [] }).foreground, '#BBBBBB');
});

// A SCOPELESS RULE NAMES THE EDITOR'S DEFAULT, AND VS CODE IGNORES EVERY ONE — "the default rule
// (scope empty) is always the first rule. Ignore all other default rules." Twenty-five bundled
// themes carry one, and eight of those spell it differently from `editor.foreground`.
test('a scopeless rule never becomes the default', () => {
  const t = { type: 'dark', colors: { 'editor.foreground': '#010203' },
    tokenColors: [{ settings: { foreground: '#FFFFFF' } }] };
  assert.strictEqual(styleOf(['source.nothing'], t).foreground, '#010203',
    'a scopeless rule overrode the editor foreground, where VS Code drops it');
});

// EACH PROPERTY RESOLVES ON ITS OWN. A rule setting only a fontStyle leaves the foreground standing,
// so a bold-only rule bolds a span another rule coloured.
test('each style property takes its own innermost rule', () => {
  const stack = ['markup.bold.tiddlywiki5'];
  const t = theme(['markup', '#5A110B', { fontStyle: 'italic' }], ['markup.bold', '#00DEEB']);
  assert.strictEqual(styleOf(stack, t).foreground, '#00DEEB');
  assert.strictEqual(styleOf(stack, t).fontStyle, 'italic',
    'a rule winning the foreground swallowed a property it never set');
  assert.strictEqual(styleOf(stack, t).background, '#000000');
  // A fontStyle reads as a SET, so the two spellings of one look answer alike.
  assert.strictEqual(styleOf(stack, theme(['markup.bold', '#f', { fontStyle: 'bold italic' }])).fontStyle,
    styleOf(stack, theme(['markup.bold', '#f', { fontStyle: 'italic bold' }])).fontStyle);
  // THE CONTROL: a theme writes `""` to CLEAR a style, which reads as no style on screen.
  assert.strictEqual(styleOf(stack, theme(['markup.bold', '#f', { fontStyle: '' }])).fontStyle, null);
});

// A SCOPE ASKED ALONE ANSWERS DIFFERENTLY FROM THE SAME SCOPE IN A STACK — an ancestor cannot paint
// what a caller never handed over, so a descendant selector reaches nothing at all.
test('colourOf reads one scope as a stack of one', () => {
  const t = theme(['markup', '#5A110B'], ['markup.bold', '#00DEEB']);
  assert.strictEqual(colourOf('markup.bold.tiddlywiki5', t), '#00DEEB');
  assert.strictEqual(colourOf('markup.italic.tiddlywiki5', t), '#5A110B');
  assert.strictEqual(colourOf('source.python', t), null, 'a scope no rule reaches came back painted');
  assert.strictEqual(colourOf('meta.embedded.block.css', theme(['text.html meta.embedded', '#60E570'])), null,
    'a descendant selector reached a lone scope that carries no ancestor to match');
  // A rule reaching the scope while setting no foreground paints nothing rather than the next
  // rule's colour: each property takes its own most specific rule.
  assert.strictEqual(colourOf('markup.bold.x', theme(['markup.bold', undefined])), null);
});

// THE RULE LIST THE ENGINE GETS. A rule naming three selectors stands as ONE entry in a theme and as
// three in the model, and rebuilding the engine's list from the model drops the selectors past the
// first — measured, that alone moved 20% of the readings in the collision.
test('the engine list keeps a rule whole, over the editor default', () => {
  const { settings } = engineTheme(theme([['markup.bold', 'markup.italic'], '#FFFFFF']));
  assert.deepStrictEqual(settings[0], { settings: { foreground: '#010203', background: '#000000' } },
    'the engine list opened on something other than the editor default');
  assert.deepStrictEqual(settings[1].scope, ['markup.bold', 'markup.italic'],
    'a rule naming two selectors reached the engine carrying one');
});
