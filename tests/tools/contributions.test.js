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

// A word pattern decides what a double-click takes, what a word-wise cursor step crosses and
// what Ctrl+D matches. VS Code's default breaks a TiddlyWiki system title at its first character
// and halves a hyphenated variable name, so the two commonest tokens an author touches select
// wrongly without one.
test('a word pattern takes a system title and a hyphenated name whole', () => {
  for (const lang of pkg.contributes.languages || []) {
    if (!lang.configuration) continue;
    const config = parseJsonc(fs.readFileSync(path.join(ROOT, lang.configuration.replace(/^\.\//, '')), 'utf8'));
    if (!config.wordPattern) continue;
    let pattern;
    assert.doesNotThrow(() => { pattern = new RegExp(config.wordPattern, 'g'); },
      `${lang.id} declares a wordPattern that does not compile`);
    const takes = (text) => { pattern.lastIndex = 0; const m = pattern.exec(text); return m && m[0]; };
    for (const token of ['tv-config-toolbar', 'MyTiddlerTitle']) {
      assert.strictEqual(takes(token), token, `${lang.id} does not take ${token} as one word`);
    }
  }
});

// The off-side rule says a blank line belongs to the indented block above it. TiddlyWiki ends a
// block AT a blank line — wikiparser.js takes /\r?\n\r?\n/ as the boundary — and of the indented
// lines in TiddlyWiki's own tiddlers three quarters carry prose, which nests nothing. Folding
// those across the blank lines that separate them offers regions the format never had.
test('no language folds on the off-side rule', () => {
  for (const lang of pkg.contributes.languages || []) {
    if (!lang.configuration) continue;
    const config = parseJsonc(fs.readFileSync(path.join(ROOT, lang.configuration.replace(/^\.\//, '')), 'utf8'));
    assert.notStrictEqual(
      (config.folding || {}).offSide,
      true,
      `${lang.id} folds on indentation across blank lines, which end a block in this format`
    );
  }
});

// Typing `[[` or `<<` closes itself, and neither stands as a matched BRACKET.
//
// Auto-closing saves a keystroke. Matching draws a line between an opener and its closer and
// paints an unmatched one as an error — and wikitext defeats both pairs. A blockquote opens `<<<`
// and closes `<<<`, so with `<<` a pair every blockquote leaves two openers and no closer. A
// filter operand closes `]]` whose two `[` never stood adjacent, so that closer stands unmatched.
// Both read to a reader as red.
const AUTO_CLOSED = [['<<', '>>'], ['[[', ']]']];
const MATCHED = [['{', '}'], ['[', ']'], ['(', ')']];
// A lone angle stands unpaired in ordinary prose — 440 of TiddlyWiki's own 14485 core lines
// carry one, and 51 of the corpus's 738. Matching them draws every one as an unclosed bracket,
// which a reader meets as red on text the parser accepts. Surrounding fights the same prose.
const NEVER_PAIRED = [['<', '>']];

test('a macro call and a bracketed title close themselves and match nothing', () => {
  for (const lang of pkg.contributes.languages || []) {
    if (!lang.configuration) continue;
    const config = parseJsonc(fs.readFileSync(path.join(ROOT, lang.configuration.replace(/^\.\//, '')), 'utf8'));
    const has = (list, [open, close]) =>
      (list || []).some((p) => (Array.isArray(p) ? p[0] === open && p[1] === close : p.open === open && p.close.trim() === close));
    for (const pair of AUTO_CLOSED) {
      assert.ok(has(config.autoClosingPairs, pair), `${lang.id} does not close ${pair[0]} for you`);
      assert.ok(!has(config.brackets, pair), `${lang.id} matches ${pair[0]}${pair[1]} as a bracket, which wikitext leaves unmatched`);
    }
    for (const pair of MATCHED) {
      assert.ok(has(config.brackets, pair), `${lang.id} brackets no ${pair[0]}${pair[1]}`);
      assert.ok(has(config.autoClosingPairs, pair), `${lang.id} does not close ${pair[0]} for you`);
    }
      for (const pair of NEVER_PAIRED) {
        assert.ok(!has(config.brackets, pair),
          `${lang.id} matches ${pair[0]}${pair[1]} as a bracket, which ordinary prose leaves unpaired`);
        assert.ok(!has(config.surroundingPairs, pair),
          `${lang.id} surrounds with ${pair[0]}${pair[1]}, which ordinary prose leaves unpaired`);
      }
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
