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

const OWED = /^OWED\b/;

/**
 * Whether a reason, with any `READER <version>` tag peeled off, opens `OWED` — the one test six
 * sites asked independently, three stripping the tag first and three testing the untouched text,
 * so a row that reads OWED to one reader could read RULED to another over the identical text. A
 * `READER <v> OWED` row in a ledger a non-stripping site reads goes silent there: the row still
 * answers `OWED` to anyone who strips, but the site testing raw text sees `READER` first and
 * `/^OWED\b/` never matches, so the row reads as ruled rather than owed. Sharing `readerOf`'s own
 * prefix handling here closes that gap — a tag changes WHICH reader a reason explains, never
 * whether the gate it owes.
 *
 * @param {string|null|undefined} reason
 * @returns {boolean}
 */
function owedOf(reason) {
  return OWED.test(readerOf(String(reason || '').replace(/^\s+/, '')).rest);
}

// ── where a peer reader's harvest lands ─────────────────────────────────────────────────────────
//
// THE CORPUS HOLDS WHAT A HAND AUTHORED; A HARVEST IS DERIVED; THEY DO NOT SHARE A DIRECTORY.
//
// A harvest keyed on a reader needs somewhere to stand. `GateReport.tid` and `GrammarSignals.tid`
// answer for the PRIMARY reader and already stand among the edition's derived tiddlers; a peer
// reader's snapshot answers the same question about a reader the edition does not ship, so it
// stands beside the corpus rather than inside it.
//
// MEASURED, which is why this name exists rather than a path in each writer. These snapshots lived
// under `corpus/reader-signals/`, and `still.js`'s token walk counts every file under `corpus/`
// that does not end `.txt` or `.md` — so a `.json` snapshot landed in the ground the share is
// measured over. On one tree, nothing else changed: 50.2% of corpus tokens ruled with the
// snapshots present, 53.2% with them removed. The harvest moved the measurement, and the
// measurement rode in the next harvest's own summary line. One earlier reader read that as the line
// "wobbling" between runs and went looking in the walk order.
//
// ONE NAME, so a second writer cannot spell the home a second way and a guard can read the same
// name both writers write to.
const path = require('node:path');
const PEER_DIR = path.resolve(__dirname, '..', 'reader-signals');

/** A version token, flattened to something a file name can carry. */
const sanitizeVersion = (v) => v.replace(/[^A-Za-z0-9.+-]/g, '_');

module.exports = { readerOf, appliesToReader, owedOf, PEER_DIR, sanitizeVersion };
