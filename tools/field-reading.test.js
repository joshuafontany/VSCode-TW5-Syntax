// A header value reads as wikitext unless a reader declares otherwise, and every exception carries
// a reason a gate can find.
//
// The exceptions come from two places. The reader declares three of them — boot.js registers a
// tiddlerfield module per field name, and created, modified and color parse as something other than
// text. Those the edition harvests, so a release that declares a fourth reaches this gate rather
// than the grammar's silence. The rest stand as rulings, because TiddlyWiki types them nowhere, and
// a ruling that carries no reason is a list that goes stale unwatched.
//
// The two fields the reader DOES type but the grammar leaves open — tags and list — get their own
// check. Their bracketed member marks a quoted title under parseStringArray and a title-literal run
// under the filter parser, so the mark carries the colour, and a future pass that "fixes" them by
// denying them should meet a red here first.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { readData } = require('./wiki-data.js');

const ROOT = path.resolve(__dirname, '..');
const fields = JSON.parse(fs.readFileSync(path.join(ROOT, 'syntaxes', 'tw5-fields.json'), 'utf8'));
const rules = fields.repository.field.patterns;

/** The field names one rule matches, read off its own alternation — null where it names none. */
function namesOf(rule) {
  const m = /^\^\(([^)]*)\)\(:\)/.exec(rule.match);
  if (!m || /[[\]*+?.]/.test(m[1])) return null;
  return m[1].split('|');
}

/** Every rule that gives its value a plain reading, by the names it names. */
function denied() {
  const out = new Map();
  for (const rule of rules) {
    const names = namesOf(rule);
    if (!names) continue;
    const value = rule.captures['3'].name;
    if (/wikitext/.test(value)) continue;
    for (const name of names) out.set(name, rule);
  }
  return out;
}

test('the grammar opens every field it does not name', () => {
  const open = rules[rules.length - 1];
  assert.strictEqual(namesOf(open), null, 'the last field rule names names, so some field falls through unread');
  assert.match(open.captures['3'].name, /text\.html\.tiddlywiki5/, 'the open rule hands its value to no wikitext');
  assert.deepStrictEqual(open.captures['3'].patterns, [{ include: 'text.html.tiddlywiki5' }]);
});

test('every field the reader types as a non-text scalar reads plain', () => {
  const harvested = readData('GrammarSignals.tid').data.fieldTypes;
  assert.ok(harvested, 'the harvest carries no fieldTypes, so the deny set rests on nothing');
  const deny = denied();
  const judgement = readData('FieldReading.tid').data;
  for (const [name, type] of Object.entries(harvested)) {
    const scalar = type !== 'titles' && type !== 'string';
    if (scalar) {
      assert.ok(deny.has(name), `the reader types ${name} as ${type} and the grammar reads it as wikitext`);
      assert.ok(judgement.derived.deny[name], `${name} reads plain with no reason recorded`);
    } else {
      assert.ok(!deny.has(name), `${name} names tiddlers and the grammar refuses it the reading`);
      assert.ok(judgement.derived.open[name], `${name} stays open with no reason recorded`);
    }
  }
});

test('a field the reader stops typing, or starts, reaches this gate', () => {
  const harvested = readData('GrammarSignals.tid').data.fieldTypes;
  const judgement = readData('FieldReading.tid').data;
  const recorded = [...Object.keys(judgement.derived.deny), ...Object.keys(judgement.derived.open)].sort();
  assert.deepStrictEqual(Object.keys(harvested).sort(), recorded,
    'the harvest and the judgement name different fields, so one of them went stale');
});

test('every ruled field carries its reason and its rule', () => {
  const judgement = readData('FieldReading.tid').data;
  const deny = denied();
  for (const [set, entry] of Object.entries(judgement.ruled)) {
    if (set === 'why') continue;
    assert.ok(entry.reason && entry.reason.length > 40, `the ${set} ruling carries no reason worth reading`);
    for (const name of entry.fields) {
      assert.ok(deny.has(name), `${set} rules ${name} plain and the grammar reads it as wikitext`);
    }
  }
  const ruled = new Set(Object.entries(judgement.ruled)
    .filter(([k]) => k !== 'why').flatMap(([, e]) => e.fields));
  for (const name of deny.keys()) {
    if (judgement.derived.deny[name]) continue;
    assert.ok(ruled.has(name), `the grammar reads ${name} plain and no ruling says why`);
  }
});
