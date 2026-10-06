#!/usr/bin/env node
// Scout instrument (throwaway): diffs two uri-span-measure.js JSON dumps, span by span, theme by
// theme, and prints change counts plus a target-shape / indistinguishable-neighbor accounting.
//
//   node tools/uri-span-compare.js /tmp/before.json /tmp/after.json

'use strict';

const fs = require('node:fs');

const [beforeFile, afterFile] = process.argv.slice(2);
const before = JSON.parse(fs.readFileSync(beforeFile, 'utf8'));
const after = JSON.parse(fs.readFileSync(afterFile, 'utf8'));
const N = before.themeCount;

function changedCount(name) {
  const b = before.spans[name].perTheme;
  const a = after.spans[name].perTheme;
  let n = 0;
  for (const t of Object.keys(b)) {
    if (b[t].fg !== a[t].fg || b[t].fs !== a[t].fs) n++;
  }
  return n;
}

console.log(`themes=${N}`);
console.log('span                 | changed | before(fg/fs sample)      | after(fg/fs sample)');
for (const name of Object.keys(before.spans)) {
  const c = changedCount(name);
  const bt = Object.values(before.spans[name].perTheme)[0];
  const at = Object.values(after.spans[name].perTheme)[0];
  console.log(`${name.padEnd(20)} | ${String(c).padStart(7)} | ${String(bt.fg)}/${bt.fs}`.padEnd(70) + ` | ${String(at.fg)}/${at.fs}`);
}

// Target shape: scheme loud (non-default fg), separator quiet (default fg), body loud (non-default fg).
function targetShapeCount(scheme, sepSpan, bodySpan, label) {
  for (const [tag, dump] of [['before', before], ['after', after]]) {
    let n = 0;
    const themeNames = Object.keys(dump.spans[sepSpan].perTheme);
    for (const t of themeNames) {
      const sep = dump.spans[sepSpan].perTheme[t];
      const body = dump.spans[bodySpan].perTheme[t];
      const sch = dump.spans[scheme].perTheme[t];
      if (!sch.isDefault && sep.isDefault && !body.isDefault) n++;
    }
    console.log(`${label} target-shape (${tag}): ${n}/${themeNames.length}`);
  }
}

console.log('---');
targetShapeCount('lar.scheme', 'lar.sep.pre-root', 'lar.root.heading', 'lar pre-root');
targetShapeCount('lar.scheme', 'lar.sep.post-root', 'lar.path.lares', 'lar post-root');
targetShapeCount('ni.scheme', 'ni.slash1', 'ni.algorithm', 'ni scheme/slash/algo');
targetShapeCount('ni.scheme', 'ni.checksum.sep', 'ni.checksum.digest', 'ni checksum');

// Indistinguishable-from-neighbor: adjacent spans whose fg becomes equal after, where it differed before.
function neighborCollisions(spanA, spanB, label) {
  const themeNames = Object.keys(before.spans[spanA].perTheme);
  let becameSame = 0, wasSameStaysSame = 0, plainAfter = 0;
  for (const t of themeNames) {
    const ba = before.spans[spanA].perTheme[t], bb = before.spans[spanB].perTheme[t];
    const aa = after.spans[spanA].perTheme[t], ab = after.spans[spanB].perTheme[t];
    if (ba.fg !== bb.fg && aa.fg === ab.fg) becameSame++;
    if (ba.fg === bb.fg && aa.fg === ab.fg) wasSameStaysSame++;
    if (!aa.isDefault === false) { /* no-op placeholder */ }
    if (aa.isDefault) plainAfter++;
  }
  console.log(`${label}: became-indistinguishable=${becameSame}/${themeNames.length}, plain-after(${spanA})=${plainAfter}/${themeNames.length}`);
}
