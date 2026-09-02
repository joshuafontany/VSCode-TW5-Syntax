// A .tid reads the same on either line ending, and from either end of the header.
//
// Six tools split a tiddler file by scanning for two newlines in a row, and that reading answers
// differently three ways — measured against TiddlyWiki's own tiddlers, 34 of them. A file opening
// with a blank line hands back a fragment of its body. A CRLF file never matches and reads as
// bodiless: one of TiddlyWiki's own carries 1373 characters that a gate read as none. A header
// whose blank line carries a space reads on into the first paragraph break.
//
// The line-wise reading answers all three, and this holds it there.
//
//   node --test tools/wiki-data.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { parseTid } = require('./wiki-data.js');

test('the header ends at the first line carrying nothing', () => {
  const { fields, body } = parseTid('title: Alpha\ntype: text/vnd.tiddlywiki\n\nthe body\n\nand more\n');
  assert.strictEqual(fields.title, 'Alpha');
  assert.strictEqual(fields.type, 'text/vnd.tiddlywiki');
  assert.strictEqual(body, 'the body\n\nand more\n');
});

test('a CRLF file reads its fields and its body', () => {
  const { fields, body } = parseTid('title: Beta\r\ntype: text/vnd.tiddlywiki\r\n\r\nthe body\r\n');
  assert.strictEqual(fields.title, 'Beta', 'a carriage return rode into the value');
  assert.strictEqual(fields.type, 'text/vnd.tiddlywiki',
    'a type comparison against a bare name fails when the value keeps its carriage return');
  assert.strictEqual(body, 'the body\r\n', 'the body keeps its own bytes');
});

test('a file opening with a blank line still hands back its whole body', () => {
  const { fields, body } = parseTid('\ntitle: Gamma\n\nthe body\n');
  assert.strictEqual(fields.title, undefined, 'the header ended before it began');
  assert.strictEqual(body, 'title: Gamma\n\nthe body\n');
});

test('a header with no blank line after it carries no body', () => {
  const { fields, body } = parseTid('title: Delta\ntext: 0\n');
  assert.strictEqual(fields.text, '0');
  assert.strictEqual(body, '');
});

test('a blank line carrying a space still ends the header', () => {
  const { fields, body } = parseTid('title: Epsilon\n \nthe body\n');
  assert.strictEqual(fields.title, 'Epsilon');
  assert.strictEqual(body, 'the body\n');
});
