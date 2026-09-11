// The grammar set, resolved once, and the two readings that must agree.
//
// Twenty-two instruments read through here, so a defect moves twenty-two gates at once and none of
// them names it. Two claims carry the weight:
//
//   THE REGISTRY REPRODUCES THE SNAPSHOTTER. Loading the grammars in this process reads the same
//   grammars under the same injections the snapshotter builds — otherwise every instrument that
//   probes real text measures a grammar nobody ships.
//   THE RESUMED READING EQUALS THE WHOLE-PREFIX ONE. A grammar reads strictly left to right, so
//   the stack a line ends on depends on the lines before it and on nothing after. A caller asking
//   one question at every cut therefore reads a text ONCE and resumes from the stack each cut ends
//   on, where re-reading the whole prefix at every cut costs the square of the file's length.
//   `still --reach` reads 4403 carriers that way, so the two readings parting silently moves the
//   number a ratchet guards.
//
//   node --test tools/tokenizer.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT, grammarArgs, tokenize, tokenizeFrom } = require('./tokenizer.js');

const WIKITEXT = 'text.html.tiddlywiki5';

// A `-g` list arriving odd, or naming a path nothing holds, hands the snapshotter a flag with no
// argument — and the run that follows reads a grammar set nobody assembled.
test('the grammar set arrives as flag-and-path pairs, each path standing', () => {
  const args = grammarArgs();
  assert.ok(args.length > 0, 'the shell resolved no grammar at all, so every reading opens bare');
  assert.strictEqual(args.length % 2, 0, 'the grammar set arrives odd, so one flag carries no path');
  for (let i = 0; i < args.length; i += 2) {
    assert.strictEqual(args[i], '-g', `the set carries ${args[i]} where a flag stands`);
    assert.ok(fs.existsSync(path.resolve(ROOT, args[i + 1])), `nothing holds ${args[i + 1]}`);
  }
});

// The resolution caches, so a tool tokenizing several times pays the shell once.
test('the grammar set resolves once and answers the same thereafter', () => {
  assert.strictEqual(grammarArgs(), grammarArgs(),
    'the set re-resolves on every call, so a sweep pays a shell and a platform scan per reading');
});

test('a reading names the scopes the grammar puts on a construct', async () => {
  const [line] = await tokenize(WIKITEXT, "''bold''");
  const scopes = line.flatMap((t) => t.scopes);
  assert.ok(scopes.includes(WIKITEXT), 'the root scope stands nowhere in the reading');
  assert.ok(scopes.some((s) => /bold/.test(s)), `nothing in the reading names bold: ${[...new Set(scopes)]}`);
  // THE CONTROL: plain prose carries the root and claims no construct beside it.
  const [plain] = await tokenize(WIKITEXT, 'plain prose');
  assert.ok(!plain.flatMap((t) => t.scopes).some((s) => /bold/.test(s)),
    'prose carrying no marker painted bold, so the reading invents rather than reports');
});

// A SCOPE NO GRAMMAR STANDS UNDER REFUSES LOUDLY. A reader answering with an empty reading instead
// hands every caller a text nothing coloured, and the gate above it reports zero findings.
//
// THE REGISTRY REFUSES FIRST, naming the scope in its own words — so the module's own guard answers
// only where a registry hands back a falsy grammar instead of throwing. A caller matching on this
// module's wording alone would let the registry's refusal pass as an unexpected fault.
test('a scope nothing resolves refuses rather than reading empty', async () => {
  await assert.rejects(() => tokenize('source.nothing.stands.here', 'text'),
    /no grammar stands under|No grammar provided for/);
});

// THE COLLAPSE, COLLIDED. The resumed reading must reproduce the whole-prefix one line for line.
test('resuming from a line\'s stack reads what re-reading the whole prefix reads', async () => {
  // A text whose later lines depend on the earlier ones: a fenced block, a table, and prose after.
  const lines = [
    '! a heading',
    '```javascript',
    'const x = 1;',
    '```',
    '|a|b|',
    '|c|d|',
    "and ''bold'' prose after"
  ];
  const whole = await tokenizeFrom(WIKITEXT, lines);

  // The same text read one line at a time, each resuming from the stack the line before ended on.
  const resumed = [];
  let stack = null;
  for (const line of lines) {
    const read = await tokenizeFrom(WIKITEXT, [line], stack);
    stack = read.stacks[0];
    resumed.push(read.tokens[0]);
  }
  assert.deepStrictEqual(resumed, whole.tokens,
    'a resumed reading parts from the whole-prefix one, so every cut-wise sweep measures a text nobody wrote');

  // THE CONTROL. A reading that opens FRESH on every line must part from it — otherwise the two
  // agree over a text whose lines carry no state, and the claim rests on nothing.
  const fresh = [];
  for (const line of lines) fresh.push((await tokenizeFrom(WIKITEXT, [line])).tokens[0]);
  assert.notDeepStrictEqual(fresh, whole.tokens,
    'opening fresh on every line read the same, so this text carries no cross-line state to collapse');
});

// A stack comes back for EVERY line, so a caller indexing cuts by line number indexes the same lines.
test('a reading hands back one stack and one token row per line', async () => {
  const lines = ['one', 'two', 'three'];
  const { tokens, stacks } = await tokenizeFrom(WIKITEXT, lines);
  assert.strictEqual(tokens.length, lines.length);
  assert.strictEqual(stacks.length, lines.length);
  // An empty text reads as no lines rather than as one.
  assert.strictEqual((await tokenizeFrom(WIKITEXT, [])).tokens.length, 0);
});

// `tokenize` splits on newlines, and must agree with `tokenizeFrom` over the same lines.
test('the two entry points read one text the same way', async () => {
  const text = "! heading\n\nsome ''bold'' prose";
  assert.deepStrictEqual(await tokenize(WIKITEXT, text),
    (await tokenizeFrom(WIKITEXT, text.split('\n'))).tokens);
});

// AN INJECTION ARRIVES WITH THE REGISTRY. A grammar registered without its injections loads, reads
// and colours — losing only the spans an injection paints, which no reading of the base reports.
test('an injected grammar paints inside the region its selector names', async () => {
  const t = await tokenize(WIKITEXT, '\\define d.subs(a)\nbefore $a$ after\n\\end\n');
  const scopes = t.flat().flatMap((x) => x.scopes);
  assert.ok(scopes.some((s) => /substitute-parameter/.test(s)),
    'the substitution injection painted nothing, so the registry carries the grammars without them');
  // THE CONTROL: the same text outside a macro body, where the selector reaches nothing.
  const outside = (await tokenize(WIKITEXT, 'before $a$ after\n')).flat().flatMap((x) => x.scopes);
  assert.ok(!outside.some((s) => /substitute-parameter/.test(s)),
    'the injection painted outside the region its selector names');
});

// A GUEST GRAMMAR ARRIVES THROUGH THE SHELL, never through the manifest. `grammars.sh` probes for
// the grammars VS Code ships on this platform and names each as a `-g` pair; a registry built
// without them reads a fenced block as prose and every embedded-language reading goes silent.
test('a fenced guest language reads under its own grammar', async () => {
  const t = await tokenize(WIKITEXT, '```css\na { color: red; }\n```\n');
  const scopes = new Set(t.flat().flatMap((x) => x.scopes));
  assert.ok(scopes.has('meta.embedded.block.css'), 'the host names no embedded region for a css fence');
  assert.ok([...scopes].some((s) => s.endsWith('.css') && s !== 'meta.embedded.block.css'),
    `nothing beyond the region reads as css, so the guest grammar stands outside the registry: ${[...scopes]}`);
  // THE CONTROL: the same text under no fence carries no guest reading.
  const plain = new Set((await tokenize(WIKITEXT, 'a { color: red; }\n')).flat().flatMap((x) => x.scopes));
  assert.ok(![...plain].some((s) => s.endsWith('.css')), 'prose outside a fence read as css');
});

// THE DIALECT LOADS TOO, under the same registry — a wrapper the registry cannot resolve would
// take every memetic gate to an empty reading.
test('the dialect resolves under the same registry as its base', async () => {
  const [line] = await tokenize('text.html.tiddlywiki5.memetic-wikitext', "''bold''");
  assert.ok(line.flatMap((t) => t.scopes).some((s) => /bold/.test(s)),
    'the dialect lost a construct its base carries, so the wrapper reads nothing the base reads');
});
