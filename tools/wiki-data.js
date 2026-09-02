// A data tiddler the edition holds, read from disk.
//
// The wiki carries what no registry answers — which names the core owns, which distinctions a
// reader needs, why a construct reads plain. Each of those governs a gate, so each gate opens the
// same file, and a second reader of one file drifts from the first the day either one changes.
//
// One reader. It returns the tiddler's fields and its parsed body, and it refuses rather than
// guesses: a tiddler whose type says one thing and whose body says another stops the caller,
// because a gate that silently reads an empty list reports agreement with nothing.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const TIDDLERS = path.join(ROOT, 'editions', 'tw5-syntax', 'tiddlers');

/**
 * A .tid file's fields and body. The header runs to the first blank line.
 *
 * @param {string} text
 * @returns {{fields: Record<string,string>, body: string}}
 */
function parseTid(text) {
  const lines = text.split('\n');
  const fields = {};
  let i = 0;
  for (; i < lines.length; i++) {
    if (lines[i].trim() === '') { i += 1; break; }
    const match = /^([^:]+):\s?(.*)$/.exec(lines[i]);
    if (match) fields[match[1].trim()] = match[2];
  }
  return { fields, body: lines.slice(i).join('\n') };
}

/**
 * One JSON data tiddler from the edition, by its file name.
 *
 * @param {string} name  the file, with or without .tid
 * @returns {{fields: Record<string,string>, data: unknown}}
 */
function readData(name) {
  const file = path.join(TIDDLERS, name.endsWith('.tid') ? name : `${name}.tid`);
  if (!fs.existsSync(file)) {
    throw new Error(`no tiddler stands at ${path.relative(ROOT, file)} — the gate that opens it would measure nothing`);
  }
  const { fields, body } = parseTid(fs.readFileSync(file, 'utf8'));
  if (fields.type !== 'application/json') {
    throw new Error(`${name} declares type ${fields.type}, and this reads JSON`);
  }
  let data;
  try {
    data = JSON.parse(body);
  } catch (e) {
    throw new Error(`${name} carries a body no JSON reader takes: ${e.message}`);
  }
  return { fields, data };
}

module.exports = { readData, parseTid, TIDDLERS };
