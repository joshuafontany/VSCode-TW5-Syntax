// Everything the extension contributes besides colouring.
//
// The grammars answer to a dozen gates. The rest of the manifest answered to none: five language
// configurations governing bracket matching, auto-closing pairs and folding; 125 snippets that
// hand a learner wikitext to start from; and the file associations deciding which grammar a file
// even reaches. A broken entry among these fails quietly — VS Code drops what it cannot read and
// says nothing, so bracket matching simply stops and a snippet simply inserts the wrong thing.
//
// A language configuration ships as JSONC: VS Code reads comments and trailing commas there, so
// strict JSON.parse rejects a file VS Code accepts, and a reader must tolerate what the consumer
// tolerates rather than what a parser prefers.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const pkg = require(path.join(ROOT, 'package.json'));

/**
 * JSONC as VS Code reads it: comments outside strings, and trailing commas.
 *
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

exports.parseJsonc = parseJsonc;

test('the JSONC reader tolerates what VS Code tolerates', () => {
  assert.deepStrictEqual(parseJsonc('{ "a": 1, /* b */ "c": [2,], // d\n }'), { a: 1, c: [2] });
  // A comment marker inside a string stays inside the string.
  assert.deepStrictEqual(parseJsonc('{ "u": "http://x/y" }'), { u: 'http://x/y' });
});

test('every declared language configuration reads', () => {
  const languages = pkg.contributes.languages || [];
  assert.ok(languages.length > 0, 'the manifest declares no language');
  for (const lang of languages) {
    if (!lang.configuration) continue;
    const file = path.join(ROOT, lang.configuration.replace(/^\.\//, ''));
    assert.ok(fs.existsSync(file), `${lang.id} names a configuration that does not stand: ${lang.configuration}`);
    let config;
    assert.doesNotThrow(() => { config = parseJsonc(fs.readFileSync(file, 'utf8')); },
      `${lang.id}'s configuration does not read; VS Code would drop it silently`);
    assert.ok(Array.isArray(config.brackets) && config.brackets.length > 0,
      `${lang.id} declares no brackets, so bracket matching does nothing`);
  }
});

test('every declared grammar and snippet file stands and reads', () => {
  for (const g of pkg.contributes.grammars || []) {
    const file = path.join(ROOT, g.path.replace(/^\.\//, ''));
    assert.ok(fs.existsSync(file), `grammar missing: ${g.path}`);
    assert.doesNotThrow(() => JSON.parse(fs.readFileSync(file, 'utf8')), `grammar does not read: ${g.path}`);
  }
  for (const s of pkg.contributes.snippets || []) {
    const file = path.join(ROOT, s.path.replace(/^\.\//, ''));
    assert.ok(fs.existsSync(file), `snippets missing: ${s.path}`);
    const set = parseJsonc(fs.readFileSync(file, 'utf8'));
    for (const [name, snip] of Object.entries(set)) {
      assert.ok(snip.prefix, `${name} in ${s.path} offers no prefix, so nothing summons it`);
      assert.ok(snip.body !== undefined && String(snip.body).length > 0, `${name} in ${s.path} carries no body`);
    }
  }
});

// A snippet or grammar names a language the manifest declares, or the contribution attaches to
// nothing at all.
test('snippets and grammars name languages the manifest declares', () => {
  const declared = new Set((pkg.contributes.languages || []).map((l) => l.id));
  for (const s of pkg.contributes.snippets || []) {
    assert.ok(declared.has(s.language), `snippets attach to an undeclared language: ${s.language}`);
  }
  for (const g of pkg.contributes.grammars || []) {
    if (g.language) assert.ok(declared.has(g.language), `a grammar attaches to an undeclared language: ${g.language}`);
  }
});

// A file association pointing at a language nothing declares sends a file to no grammar at all.
test('every file association names a declared language', () => {
  const declared = new Set((pkg.contributes.languages || []).map((l) => l.id));
  const associations = (pkg.contributes.configurationDefaults || {})['files.associations'] || {};
  assert.ok(Object.keys(associations).length > 0, 'no file associations, so no file reaches a grammar by default');
  for (const [glob, language] of Object.entries(associations)) {
    assert.ok(declared.has(language), `${glob} points at an undeclared language: ${language}`);
  }
});
