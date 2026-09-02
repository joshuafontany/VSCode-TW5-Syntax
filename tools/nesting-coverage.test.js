// The pure halves of tools/nesting-coverage.js: what container a line opens, what
// constructs stand in a stretch of text, and how a construct goes back inside.

const test = require('node:test');
const assert = require('node:assert');
const { containerOf, constructsIn, compose } = require('./nesting-coverage.js');

test('a heading line names its container and hands back its content', () => {
  assert.deepStrictEqual(containerOf('!! a heading here'), { name: 'heading', content: 'a heading here' });
});

test('every list marker opens a list', () => {
  for (const mark of ['*', '#', ';', ':', '>', '**', '##']) {
    assert.strictEqual(containerOf(`${mark} an item`)?.name, 'list', `marker ${mark}`);
  }
});

test('a table row hands back its cells without the outer pipes', () => {
  assert.deepStrictEqual(containerOf('|a |b |'), { name: 'table', content: 'a |b ' });
  assert.strictEqual(containerOf('|caption |c')?.name, 'table');
});

test('a widget with content on one line opens a widget body', () => {
  assert.deepStrictEqual(containerOf('<$button class=x>press</$button>'), { name: 'widget', content: 'press' });
});

test('plain prose opens no container', () => {
  assert.strictEqual(containerOf('just a sentence.'), null);
  assert.strictEqual(containerOf(''), null);
});

test('a construct is found by its own regex, one witness per rule', () => {
  const rules = [{ name: 'prettylink', re: /\[\[(.*?)(?:\|(.*?))?\]\]/mg }];
  const found = constructsIn('see [[One]] and [[Two]] here', rules);
  assert.deepStrictEqual(found, [{ rule: 'prettylink', hit: '[[One]]' }]);
});

test('a match carrying no alphanumeric is passed over', () => {
  const rules = [{ name: 'bold', re: /''/mg }];
  assert.deepStrictEqual(constructsIn("a '' b", rules), []);
});

test('a construct goes back inside its container in that container shape', () => {
  assert.strictEqual(compose('heading', '[[X]]'), '! [[X]]');
  assert.strictEqual(compose('list', '[[X]]'), '* [[X]]');
  assert.strictEqual(compose('table', '[[X]]'), '|a |[[X]] |');
  assert.strictEqual(compose('widget', '[[X]]'), '<$button>[[X]]</$button>');
});

test('the baseline puts a construct in a plain sentence, not alone on a line', () => {
  // Alone on a line, a construct reads as its block form where one exists. A sentence stands
  // the fair comparison for what a container should preserve.
  assert.strictEqual(compose('inline', '{{X}}'), 'a {{X}} b');
});
