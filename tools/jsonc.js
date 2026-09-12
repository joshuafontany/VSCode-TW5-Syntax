// JSONC as VS Code reads it: comments outside strings, and trailing commas.
//
// A READER TWO FILES NEED IS A MODULE. This one lived inside a test file, and `node:test` registers a
// test when its file gets REQUIRED — so every consumer re-registered that file's whole suite.
// Measured: twelve assertions ran three times each, the reported pass count carried twenty-four
// phantoms, and one defect there would have reported three times.
//
// `package.json`, `language-configuration.json` and the dialect's own configuration all ship JSONC,
// and every gate reading one must tolerate exactly what the editor tolerates — no more, so a file the
// editor refuses cannot pass here, and no less, so a comment a contributor writes cannot fail.

'use strict';

/**
 * @param {string} text
 * @returns {unknown}
 */
function parseJsonc(text) {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inString) {
      out += c;
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; out += c; continue; }
    if (c === '/' && text[i + 1] === '/') { while (i < text.length && text[i] !== '\n') i += 1; out += '\n'; continue; }
    if (c === '/' && text[i + 1] === '*') { i = text.indexOf('*/', i + 2) + 1; continue; }
    out += c;
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'));
}

module.exports = { parseJsonc };
