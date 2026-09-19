#!/usr/bin/env node
// A reason-prefix flag, generalized off the shape swallow-witness.js already carries.
//
// swallow-witness.js reads a reason opening `HOST` as answering a DIFFERENT SWEEP than the one
// currently reading it — so that ruling stays out of the corpus sweep's staleness count rather than
// reading as a promise the corpus can never keep. Two readers ask the same question of `tools/`:
// this repository's own fork (TW5_PATH) and the pinned `tiddlywiki` devDependency, and a handful of
// rulings answer for ONE of them alone — an unterminated inline run recovers by scanning to a
// different point in each. A ruling naming no reader answers to whichever one reads it, the way a
// ruling naming no HOST already does.
//
// `READER <version>` names the ONE reader a ruling explains, taking the token straight off
// `tw5-oracle.js`'s own `boot(...).$tw.version` — the same version `resolveTiddlyWiki` would boot
// against had a caller asked — so no second name for a reader exists to fall out of step with the
// first. A ruling carrying no `READER` tag applies everywhere, exactly as a ruling carrying no HOST
// tag already does.
//
//   READER 5.4.1 — <reason>
//   READER 5.5.0-prerelease OWED — <reason>

'use strict';

const READER = /^READER\s+(\S+)\s*[-—]?\s*/;

/**
 * The reader a reason names, and the reason with that tag peeled off.
 *
 * @param {string|null|undefined} reason
 * @returns {{version: string|null, rest: string}}
 */
function readerOf(reason) {
  const text = reason || '';
  const m = READER.exec(text);
  return m ? { version: m[1], rest: text.slice(m[0].length) } : { version: null, rest: text };
}

/**
 * Whether a ruling scoped to `entryVersion` (or scoped to none) answers for `current`.
 *
 * A ruling naming no reader answers for every reader, the way an unscoped HOST ruling in
 * swallow-witness.js already does. One naming a reader answers ONLY for that one — an entry that
 * holds under one reader neither fails nor reads stale under the other, and a ruling explaining a
 * divergence that stopped reproducing under ITS OWN reader still fails there.
 *
 * @param {string|null} entryVersion
 * @param {string} current
 * @returns {boolean}
 */
function appliesToReader(entryVersion, current) {
  return !entryVersion || entryVersion === current;
}

module.exports = { readerOf, appliesToReader };
