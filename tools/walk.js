#!/usr/bin/env node
// One walk over a directory tree, shared.
//
// Nine tools hand-rolled the same recursive listing — `for (const entry of
// fs.readdirSync(dir, { withFileTypes: true })...) { if directory recurse, else keep it }` —
// each carrying its own copy of the sort, the recursion and the missing-directory guard.
// darkness-witness.js and ablation-witness.js carried the exact same `carriers()` function,
// the second's own comment naming the first as its source. attribute-witness.js and
// filter-witness.js carried the exact same `tiddlers()` function, unattributed. A tree that
// grows a symlink loop or a directory one of the nine forgets to guard answers to whichever
// copy a caller happened to read.
//
// This holds the one implementation. A caller filters or transforms what it finds afterward —
// the walk itself never decides what counts, only what stands under a directory.

'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Every file under a directory, depth-first, each directory's own entries sorted by name.
 * A directory that does not exist yields no files rather than throwing — several callers
 * ask this of ground that stands only when a flag requests it (a host checkout, say).
 *
 * @param {string} dir
 * @returns {string[]} absolute file paths
 */
function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

/**
 * Every file under one or several directories whose bare name passes a predicate.
 *
 * @param {string|string[]} dirs
 * @param {(name: string) => boolean} predicate
 * @returns {string[]}
 */
function walkMatching(dirs, predicate) {
  const list = Array.isArray(dirs) ? dirs : [dirs];
  return list.flatMap((dir) => walkFiles(dir).filter((f) => predicate(path.basename(f))));
}

/** Every `.tid` a TiddlyWiki host ships, wherever it keeps them. */
function tiddlerFiles(dirs) {
  return walkMatching(dirs, (name) => name.endsWith('.tid'));
}

/** Every wikitext carrier this repository holds, derived from the directories that hold them. */
function carrierFiles(dirs) {
  return walkMatching(dirs, (name) => name.endsWith('.tw'));
}

module.exports = { walkFiles, walkMatching, tiddlerFiles, carrierFiles };
