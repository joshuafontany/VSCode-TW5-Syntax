# Change Log

All notable changes to the "tw5-syntax" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## Unreleased

Held for 2.2.0, once the tree-sitter grammar aligns with these scopes.

### Added
- A `memetic-wikitext` language for `*.mem` files (`text/memetic-wikitext+tiddlywiki`), scope
  `text.html.tiddlywiki5.memetic-wikitext`, extending the base scope by name and falling through
  to the TiddlyWiki5 grammar. It loads for `*.mem` only; editing `*.tid` or `*.tw5` carries on
  unchanged. `lar:` URIs read as addresses in prose rather than opening an italic run.
- A language configuration of its own: `<<` and `>>` bracket and auto-close as a pair, `[[…]]`
  with them, and a sigil name, a `#fragment` or a whole `lar:` URI each select as one word.
- The sharktooth namespace claims both spacings, and the tooth stands at one dispatch position
  so a close mirrors its open: `<<~name …>>` beside `<<~ name …>>`, `<<~ /ahu >>` beside
  `<<~/ahu >>`, matching the plain register's `<<fragment …>>` / `<</fragment>>`.

The grammar, its configuration and its tests ride in the repository and run in CI; this release
does not register them, so no language reaches an editor from them.

## 2.1.0

### Fixed
- A `\parameters` pragma closes on its own parenthesis. An unquoted default value admitted
  a `)`, so `\parameters (a:1)` consumed the closer and every line after it — a pragma, a
  paragraph, the whole document. TiddlyWiki reads the parameter list as `[^)]*`, and so does
  this now.
- A rule line reaches the end of its line. `---` and longer stand as a rule; `--- trailing
  text` reads as a dash followed by text, which is what TiddlyWiki's `-{3,}\r?(?:\n|$)` does.
  The count ceiling of six and the invented `expected-newline-after-hr` error are gone.
- A fenced block closes on its fence. Inside a `.tid` file, a fence whose language is
  wikitext — ` ```text/vnd.tiddlywiki `, ` ```tw5 ` — swallowed the rest of the file: the
  branch re-enters this grammar, and the nested codeblock rule opened on the closing fence
  and consumed it. Each language branch now runs on a `while` clause, tested per line before
  any child pattern, so no embedded grammar can eat the closer. A `js` fence and a bare fence
  were never affected, and a `.tw` file was never affected.
- Highlighting stays on the line it starts on. An inline run — `''bold''`, `//italic//`,
  `__underline__`, `^^sup^^`, `,,sub,,`, `~~strike~~` and inline code — now opens only where
  its closing mark stands on the same line, and ends there. A half-typed mark colours nothing,
  so the editor stops flickering while a pair is being written. Closes #8 (`__localVar` in
  prose underlined everything after it), #47 (a doubled apostrophe inside a `"""…"""` widget
  attribute bolded everything after it) and #14 (the same defect, with the closing `"""` read
  as a hardlinebreak opener).
  - **Behaviour change:** an emphasis pair that closes on a later line no longer colours.
    Across TiddlyWiki's own core and documentation — 2,654 tiddlers — 2,347 emphasis pairs
    close on the line they open and 10 do not.
- Unquoted attribute values keep single parentheses again; only `((` opens an MVV reference.

### Added
- Tests derived from TiddlyWiki's own rule modules. Every wikitext rule declares the regex it
  matches on; `tiddlywiki5.inline-rules`, `tiddlywiki5.block-rules`, `tiddlywiki5.horizrule`
  and `tiddlywiki5.pragmas` assert positives and negatives read from those regexes rather than
  from anyone's reading of the format — entity lengths, dash counts, heading depth to six,
  every list marker, unknown URL schemes, and all ten pragmas including the sequences
  `parsePragmas` admits.
- Snapshot coverage over every sample. `npm run snap` pins each file's whole tokenization
  beside it, so a sample covers every construct it contains and any change surfaces as a
  diff naming the file, the line and both readings. 22 samples pinned; `npm run snap-update`
  re-pins them in the same commit that moves them.
- A bleed canary. `npm run canary` appends an ordinary sentence to a copy of every sample and
  asserts the sentence carries nothing but its base scopes — one assertion per sample, written
  by nobody, catching the whole family of runs that open and never close.
  `tests/samples/canary-control.tw` stands as its positive control: with the same-line guard
  it reports nothing, and without it the control fires.
- Continuous integration across Linux, macOS and Windows, on Node 20 and 22. Every push and
  every pull request installs from the lockfile, runs both assertion suites, compares every
  snapshot, runs the bleed canary, holds the terminator-closure ratchet at zero, and builds
  the `.vsix` a user would install, keeping it as an artifact. A pull request that changes a
  grammar, a snippet, the manifest or a language configuration without moving `CHANGELOG.md`
  fails. Dependabot answers weekly for the harness and monthly for the actions.
- `tools/terminator-closure.js` and `npm run lint-closure`: a check that a region never
  admits a nested region able to consume its own terminator, and that a child which
  closes on that terminator hands it back rather than eating it — the property behind the
  end-of-file colouring bugs. It reads the grammar alone, with no corpus and no name list.
- `LICENSE` (BSD 3-Clause, following TiddlyWiki5's own) and `contributing.md`.

### Changed
- Snippets reach the languages they serve. The three tiddler-metadata snippets move to
  `snippets/tiddler-fields.json`, registered for `tid` and `multids`, where a field header
  exists to write into; the remaining 125 stay registered for every language this extension
  serves. The file's group keys read as scope selectors and carried no scope — VS Code discards
  them — so they give way to a flat map that claims only what it delivers.
- `.vscodeignore` keeps `tools/` out of the published package; `.gitignore` keeps the built
  `*.vsix` out of the repository.
- TiddlyWiki5 v5.4.0 grammar and snippet update, by @pmario (#49): `\parsermode`, MVV inline
  display `((var))` / `(((filter)))`, `((var))` and `[[bracket]]` as attribute values, dynamic
  macro parameters with `=`, MVV defaults in pragma parameters, and `text/vnd.tiddlywiki` as a
  codeblock language. `.tid` field-name validation matches TW5 v5.2.x, field headers recognise `#`
  comment lines, and field-header scopes use standard TextMate names.
  - **Behaviour change:** field values in a `.tid` header no longer parse as wikitext. Fields
    TiddlyWiki renders as wikitext — `caption`, `subtitle` — show as plain strings in the editor.
- `run_tests.sh` resolves the VS Code grammar root per platform and loads the grammars that exist,
  reporting the rest, so the suite runs on Linux, WSL and macOS instead of aborting.
- `brace-expansion` to 1.1.18 (#51) and `minimatch` to 3.1.5 (#48). Both take effect for the first
  time here: `node_modules` rode in git tracking, so the lockfile governed nothing.
- `node_modules` leaves git tracking.
- `.vscodeignore` keeps the published extension to the grammars, snippets, language configuration
  and documentation, leaving the test harness behind.

## 2.0.6
- Allow all pragmas to have leading whitespace (allows nested and indented named pragmas of macros, procedures, and widgets).

## 2.0.5
- Cannot inject wikitext parsing into `<style>` tags. Closed as won't-fix. //Style tags do not parse wikitext #42
- Add a `constributes/languages` object for 'json', maps `".info", ".files"` extensions to Json language features as "Tiddlywiki5 Json".

## 2.0.4
- Version bump to fix publishing bug.

## 2.0.3
- Fixed parsing bug with tiddlywiki style attributes in `svg` tags.
- Fixed parsing bug with tiddlywiki style attributes in `math` tags.
- Added #inline parsing to contents of SVG and Math tags.
- Underline decoration on `~~strikethrough~~` syntax.

## 2.0.2
- Merge `snippets/snippets.json` fixes from @pmario. Mahalo/Thanks!!!!!
  - `<% if` //fix conditional if and add if elseif else if full structure #17
  - `tid` //add additional new-line before final input cursor #18
  - Pragma snippets //remove \end <name>, because it is inconvenient #19
  - `\rulesstyle` pragma //add fnprocdef to rulestyle definition snippet #20
  - `\whitespace` pragma //fix the whitespace pragma #21
  - Filtered transclusions //add 1 leading and trailling space between filter and braces for better readability #22
  - Transclusions //fix trt and tit snippet shortcuts #23
  - `|tablerc` //replace tabs with spaces in tablerc #24
  - //make sup, sub and inline code snippets more reachable with non english keyboard layouts #25
  - //call macros with named parameters for best practice #26
  - //fix the list-links macro and add list-links-draggable #27
  - //tocs use named params for best practice #28
  - //fix macrocall, set, vars and let-widget #29
  - //fix list, listv and add listz with all parameters #30
  - //adjust view- and revealwidget #31
  - //adjust scrollable, edit-text and select widget #32
  - //adjust checkbox and radio snippets #33
  - //adjust button snippets, add Button Actions procedure for best practice #34
  - //adjust action-widgets and make aciton-deletetiddler safe #35
  - //adjust substitutions #36

## 2.0.1
- fix README

## 2.0.0
- Full re-write to model tiddlywiki5 wikitext as a `text.html.derivative` style sytanx.
- Updated syntax json version to current Tiddlywiki5 v`5.3.4`.
- Updated known keywords/grammar concepts in json `repository`.
- Imported full html5 syntax from `tm-grammar`, added tiddlywiki style attributes, etc.
- New objects from `text.html.basic` renamed as `htmlwidget-*` for easy diff/updates.
- Added snippets for modern tiddlywiki5 wikitext.
- Added full set of automated tests to `./tests`. Run `npm run test` to run all tests.
- Added syntax highlihgting for tests files that marks the `# ^ test.commment.with.expected.scopes` lines appropriately.
- Added reference required syntaxes to `devDependecies` in `package.json`
- Fixed bugs with widget attribute syntax in base html tags
- Fixed syntax bugs with macros
- Fixed sytax bugs with block quotes
- Fixed syntax bugs with image links
- Fixed syntax bugs with links
- Fixed bugs with horizontal rules
- Fixed bugs with list quotes
- Fixed bugs with codeinline, codeblock, typedblock.
- Added `.tw|.tw5|.tiddlywiki|.tiddlywiki5|text/vnd.tiddlywiki` to `#typedblock`.
- Added `tw|tw5|tiddlywiki|tiddlywiki5` to `#codeblock`

## 1.1.0
- Reviewed repository with ChatGPT4
- Cleaned up redundant files
- Added Conditional If syntax

## 1.0.4
- Reverted bugs
- Fixed typos

## 1.0.3
- Added a Snippet to set the `modified` field to a current unix-style timestamp.

## 1.0.2
- Updated `tid` Snippet to offer a dropdown of `type` field options.
-- Mahalo to "_Phi / hpx1" for the contributions!

## 1.0.1

- Fixed snippets to correctly render widget syntax, `<$button> </$button>`.
- Added a very nifty "Tiddler Metadata" snippet, `tid`, which will insert a block of tiddler meta-data fields into an empty *.tid file. Just type `tid` and press tab. `created` and `modified` fields come automatically timestamped, and you can tab to move between field values.
-- Very neat, thanks a lot to "_Phi / hpx1" for this snippet!

## 1.0.0

- Release!

## 0.1.2

- Improved variable, tranclusion, link, and macro definition recognition
- Setup seperate "language names" for *.tid / *.meta ("tid"), vs  / *.multids files ("multitids") vs *.tw / *.tw5 wikitext ("tiddlywiki5"). This helps debugging and with certain grammar features (injections).
- Mapped MIME types

## 0.1.1

- Improved string and pragma recognition

## 0.1.0

- Initial release