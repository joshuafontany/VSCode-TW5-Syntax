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

// The gate finds a construct inside a container by composing the two and asking what colours. A
// composer that dropped the construct would compose a container carrying nothing, and every pair
// would read as covered with nothing nested inside it at all — so the composer gets asked for the
// shape of every container it names, and each answer counted.
test('every container the gate names carries the construct into itself', () => {
  const CONTAINERS = ['inline', 'heading', 'list', 'table', 'widget'];
  const carried = CONTAINERS.filter((container) => compose(container, 'HIT').includes('HIT'));
  assert.strictEqual(carried.length, 5,
    `${CONTAINERS.length - carried.length} of 5 container(s) composed without the construct`);
  // And each one differs from the bare construct, or the pair proves nothing about nesting.
  const nested = CONTAINERS.filter((container) => compose(container, 'HIT') !== 'HIT');
  assert.strictEqual(nested.length, 5,
    'a container composed to the bare construct, so the pair reads nothing about nesting');
});

// A container this gate cannot name hands the construct back bare, which reads as a pair covered
// while no container stood around it.
test('a container the composer does not know reads as no container at all', () => {
  assert.strictEqual(compose('no-such-container', 'HIT'), 'HIT');
});
