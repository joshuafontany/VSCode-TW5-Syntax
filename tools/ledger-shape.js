#!/usr/bin/env node
// One codec for a ledger of the shape `<field> <field> ... "<quoted text>" # reason`.
//
// ablation-witness.js, darkness-witness.js and bracket-witness.js each carried the same
// `keyOf`/`readLedger` pair: a regex built from `\S+`/`\d+`/an enum of verdict words, a trailing
// `"(?:[^"\\]|\\.)*"` quoting the line text, then `#` and a reason — differing only in how many
// fields come before the quote and what the enum's own words are. Each parsed with the same
// `JSON.parse`/`JSON.stringify` round trip on the quoted field.
//
// NOT EVERY LEDGER SHARES THIS SHAPE. delimiter-ledger.txt, swallow-ledger.txt,
// recovery-ledger.txt and engine-ledger.txt are freeform prose with a trailing `# reason` and
// nothing else fixed — forcing this codec onto them would either drop what they carry or start
// silently refusing lines nobody wrote wrong. This holds only the shape these three share.
//
//   const { defineLedger } = require('./ledger-shape.js');
//   const { keyOf, readLedger } = defineLedger([
//     { name: 'file' },
//     { name: 'char' },
//     { name: 'verdict', enum: ['OVERREACH', 'MISS'] }
//   ]);
//   keyOf('a.tw', '-', 'MISS', 'some line')
//   readLedger('/path/to/ledger.txt')  // Map<key, reason>, plus `unreadable: <line>` -> null

'use strict';

const fs = require('node:fs');

/**
 * @param {{name: string, kind?: 'number', enum?: string[]}[]} fields  every field BEFORE the
 *   quoted text, in order. `kind: 'number'` reads `\d+` and returns a Number; `enum` reads the
 *   listed words alternated; anything else reads `\S+` as a bare string.
 * @returns {{keyOf: (...args: (string|number)[]) => string, readLedger: (path: string) => Map<string, string|null>}}
 */
function defineLedger(fields) {
  const parts = fields.map((f) => (f.kind === 'number' ? '(\\d+)' : f.enum ? `(${f.enum.join('|')})` : '(\\S+)'));
  const shape = new RegExp(`^${parts.join('\\s+')}\\s+("(?:[^"\\\\]|\\\\.)*")\\s*#\\s?(.*)$`);

  /** The key a ledger line and a finding share: every plain field, then the quoted text last. */
  function keyOf(...args) {
    return args.map((v, i) => (i === args.length - 1 ? JSON.stringify(v) : v)).join('  ');
  }

  /** Declarations, keyed as `keyOf` keys findings, each carrying its reason. */
  function readLedger(ledgerPath) {
    const declared = new Map();
    if (!fs.existsSync(ledgerPath)) return declared;
    for (const raw of fs.readFileSync(ledgerPath, 'utf8').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const m = shape.exec(line);
      if (!m) { declared.set(`unreadable: ${line}`, null); continue; }
      const plain = fields.map((f, i) => (f.kind === 'number' ? Number(m[i + 1]) : m[i + 1]));
      const quoted = JSON.parse(m[fields.length + 1]);
      const reason = m[fields.length + 2];
      declared.set(keyOf(...plain, quoted), reason);
    }
    return declared;
  }

  return { keyOf, readLedger };
}

module.exports = { defineLedger };
