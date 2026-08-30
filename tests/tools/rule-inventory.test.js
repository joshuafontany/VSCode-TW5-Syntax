// The configurable surface of TiddlyWiki's parser, derived rather than transcribed.
//
// A hand-written table of rules and their defaults would be a second claim about
// TiddlyWiki, drifting quietly the moment upstream adds a rule or flips a default. These
// tests hold the derivation to the host: the prefixes wikiparser.js actually reads, the
// absence that means "enabled", and the one rule TiddlyWiki ships switched off.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { resolveTiddlyWiki } = require('../../tools/tw5-oracle.js');
const {
  PREFIX,
  configKeysFor,
  readRuleModules,
  readShippedDefaults,
  buildInventory,
  configurationProperties
} = require('../../tools/rule-inventory.js');

// ── the pure half ────────────────────────────────────────────────────────────

test('a rule answers to one config key per type it declares', () => {
  assert.deepStrictEqual(configKeysFor('wikilink', ['inline']), ['Inline/wikilink']);
  assert.deepStrictEqual(configKeysFor('conditional', ['inline', 'block']), [
    'Inline/conditional',
    'Block/conditional'
  ]);
  assert.deepStrictEqual(configKeysFor('commentblock', ['block', 'pragma']), [
    'Block/commentblock',
    'Pragmas/commentblock'
  ]);
});

test('a type wikiparser reads no prefix for contributes no key', () => {
  assert.deepStrictEqual(configKeysFor('imaginary', ['sideways']), []);
});

// setupRules reads getTiddlerText(key,"enable"), so the ABSENCE of a tiddler is the answer
// "enabled" — and any value other than "enable" deletes the rule, "disable" holding no
// special standing.
test('an absent tiddler leaves a rule standing; any value but enable removes it', () => {
  const props = configurationProperties([
    { name: 'a', types: ['block'], keys: [{ key: 'Block/a', shipped: null, standsByDefault: true }] },
    { name: 'b', types: ['block'], keys: [{ key: 'Block/b', shipped: 'disable', standsByDefault: false }] },
    { name: 'c', types: ['block'], keys: [{ key: 'Block/c', shipped: 'no', standsByDefault: false }] }
  ]);
  assert.strictEqual(props['tw5-syntax.rules.Block.a'].default, true);
  assert.strictEqual(props['tw5-syntax.rules.Block.b'].default, false);
  assert.strictEqual(props['tw5-syntax.rules.Block.c'].default, false);
  assert.match(props['tw5-syntax.rules.Block.a'].markdownDescription, /enabled/);
});

test('the settings surface defaults each key to what TiddlyWiki ships', () => {
  const props = configurationProperties([
    { name: 'wikilink', types: ['inline'], keys: [{ key: 'Inline/wikilink', shipped: 'disable', standsByDefault: false }] },
    { name: 'heading', types: ['block'], keys: [{ key: 'Block/heading', shipped: null, standsByDefault: true }] }
  ]);
  assert.strictEqual(props['tw5-syntax.rules.Inline.wikilink'].default, false);
  assert.strictEqual(props['tw5-syntax.rules.Block.heading'].default, true);
  // `resource` scope lets a workspace folder answer differently from the user's global setting.
  assert.strictEqual(props['tw5-syntax.rules.Block.heading'].scope, 'resource');
});

// ── the live half ────────────────────────────────────────────────────────────

const TW = resolveTiddlyWiki();
const live = { skip: TW ? false : 'no TiddlyWiki checkout resolved (set TW5_PATH)' };

// The pragma prefix is PLURAL and the other two are singular. Nothing derives that, so the
// three strings are transcribed — and this test reads them back out of wikiparser.js so a
// rename upstream fails here rather than in a settings key nobody notices.
test('the three prefixes match the ones wikiparser.js reads', live, () => {
  const src = fs.readFileSync(path.join(TW, 'core/modules/parsers/wikiparser/wikiparser.js'), 'utf8');
  const found = [...src.matchAll(/\$:\/config\/WikiParserRules\/(\w+)\//g)].map((m) => m[1]).sort();
  assert.deepStrictEqual(found, [...new Set(Object.values(PREFIX))].sort());
});

test('every rule module carries a name, and the sweep finds the whole family', live, () => {
  const rules = readRuleModules(TW);
  const names = rules.map((r) => r.name);
  assert.ok(names.includes('wikilink'), 'a top-level rule');
  assert.ok(names.includes('bold'), 'a rule living in the emphasis subdirectory');
  assert.ok(rules.every((r) => r.types.length > 0), 'every rule declares at least one type');
});

// TiddlyWiki ships exactly one WikiParserRules tiddler. Every other rule stands by absence,
// so a table listing 44 defaults would be 43 restatements of one law and one fact.
test('TiddlyWiki ships exactly one rule switched off, and it is CamelCase linking', live, () => {
  const shipped = readShippedDefaults(TW);
  const off = [...shipped].filter(([, value]) => value !== 'enable');
  assert.deepStrictEqual(off, [['Inline/wikilink', 'disable']]);
});

test('the inventory marks wikilink off and its neighbours on', live, () => {
  const byName = new Map(buildInventory(TW).map((r) => [r.name, r]));
  assert.strictEqual(byName.get('wikilink').keys[0].standsByDefault, false);
  assert.strictEqual(byName.get('wikilinkprefix').keys[0].standsByDefault, true);
  assert.strictEqual(byName.get('prettylink').keys[0].standsByDefault, true);
});

test('a rule declaring two types carries two independent keys', live, () => {
  const byName = new Map(buildInventory(TW).map((r) => [r.name, r]));
  assert.deepStrictEqual(
    byName.get('conditional').keys.map((k) => k.key).sort(),
    ['Block/conditional', 'Inline/conditional']
  );
});

// The settings surface and the parser must name the same rules. A key the parser never
// reads is a switch wired to nothing, and a rule with no key is a switch nobody can reach.
test('the generated settings surface covers every key the inventory names, and no others', live, () => {
  const inventory = buildInventory(TW);
  const props = configurationProperties(inventory);
  const expected = inventory.flatMap((r) => r.keys.map((k) => `tw5-syntax.rules.${k.key.replace('/', '.')}`)).sort();
  assert.deepStrictEqual(Object.keys(props).sort(), expected);
});
