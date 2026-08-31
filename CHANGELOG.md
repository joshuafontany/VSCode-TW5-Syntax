# Change Log

All notable changes to the "tw5-syntax" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## 2.3.0 — unreleased

### Fixed
- A syntax-test file colours the wikitext it tests. The test-file grammar carries its own
  injections, and the one painting parameter substitution named all four definition body scopes —
  so a `\procedure` body substituted inside a `.tw5.test` file and not inside a `.tw` file, and
  the specimens stating what the grammar does read differently from the thing they state it
  about. It names the macro body alone, as the wikitext grammar does. A pinned snapshot covers
  this grammar, which had none.
- A tag name admits what TiddlyWiki's tag name admits. `html.js` reads
  `reTagName = /([a-zA-Z0-9\-\$\.]+)/y` and then requires whitespace, a slash or a close, so a
  name the parser stops short in refuses the whole tag: `<my_tag>`, `<my:tag>` and
  `<div"unspaced">` are plain text to TiddlyWiki. VS Code's own HTML grammar excludes the colon
  the same way, and TiddlyWiki excludes the underscore as well. Namespaced markup keeps a better
  home than the wikitext grammar ever gave it: content declaring itself `image/svg+xml`, as a
  typed block or a tiddler of that type, reaches the XML grammar, which names a prefix, its
  separator and its local name separately.
- A definition name admits what TiddlyWiki admits. Both definition rules read the same name class,
  `[^(\s]+`, so a dollar stands in the name of any of the four kinds and the parser builds each
  one — `\define $foo()` defines a macro named `$foo`. Three of the four rules refused it, and a
  refused definition reads as paragraph text, which is what an author writing tiddlers on disk
  sees where a definition stands. The `\widget` pragma keeps its dollar required, earned from
  `widget.js`: a custom widget resolves by looking up `"$"` plus the element's type, so a widget
  declared without one defines a variable no element can reach.
- A `\define` parameter list ends at its first closing parenthesis, and a multi-valued-variable
  default belongs to the other three pragmas. The two definition rules declare their lists
  differently — `macrodef.js` reads `\(\s*([^)]*)\)` while `fnprocdef.js` admits `))` pairs — so
  `a:((var))` names a multi-valued variable in a `\procedure`, `\function` or `\widget` and names
  nothing in a `\define`. TiddlyWiki takes the literal string `((var` as that parameter's default
  and starts the body at `)) `, four characters before the doubled form suggests. The two rules
  keep their own parameter laws, so the grammar's body and TiddlyWiki's stored body begin at the
  same character.
- Parameter substitution belongs to the define body alone. `widget.js` gates both placeholder
  forms behind one test — `isMacroDefinition` — so `$name$` for a declared parameter and
  `$(name)$` for a variable fire in a `\define` body and in a substituted attribute value, and
  nowhere else. A `\procedure`, `\widget` or `\function` body carries its parameters as variables
  and leaves the dollars literal, and the injection that paints substitution now names only the
  macro body. One shape stands as a known gap: a filter operand is matched by a capture, and a
  TextMate injection does not reach inside a capture, so a filter operand inside a `\function`
  body still paints substitution — narrowing that road costs correct spans in `\define` bodies.
- A definition body carries the kind of definition holding it. TiddlyWiki keeps four definition
  pragmas and stamps each stored body with its kind, and the kind decides what LANGUAGE the body
  carries: a `\function` body reaches the filter engine, a `\procedure` or `\widget` body reads as
  wikitext with its parameters arriving as variables, and a `\define` body reads as wikitext after
  textual parameter substitution. The block forms named their kind; the one-line forms named every
  body a macro body, so a filter run inside a one-line `\function` read as macro text. An author
  writing tiddlers on disk and troubleshooting the wiki built from them reads the same definition
  in two places, and the two now agree.
- Every scope name the grammar emits reads as a scope. A scope name interpolates a capture only
  where every branch emitting that name fills it: an element closing with `/>` takes the
  self-closing branch of its end pattern, where the group carrying the tag name never
  participates, and the name arrives with an empty segment — `meta.tag.object.svg..end` — which no
  theme matches and no injection selector spares. Such end tags take their name plainly; the
  enclosing element scope carries the tag name beside them on every span.
- A single-line `\define` ends where its line ends, whatever its body closes with. A body ending
  in a closing parenthesis leaves the cursor after a `)` at end of line, exactly where the
  multiline form waits, and a definition that opened a block there swallowed the rest of the file
  hunting an `\end` that never came — the shape TiddlyWiki's own documentation carries in a
  regular-expression macro whose body reads as a group. The line names which form it holds before
  either branch opens, reading past a parameter list that ends at the FIRST closing parenthesis,
  balanced or not, as `macrodef.js` ends it there.
- Only tiddlers TiddlyWiki parses as wikitext answer to the grammar. A `.tid` declares its type
  in its header, and the corpus sweep stripped that header and asked about every tiddler alike —
  comparing the grammar against a parser that would never have run on a `text/plain` config file
  or on TiddlyWiki Classic markup. Twenty-nine of the forty-two unexplained divergences carried
  another language entirely.
- A tilde suppresses the link families TiddlyWiki suppresses. `wikilinkprefix` hands back plain
  text for a CamelCase word, and `extlink` and `syslink` each return the text of the link they
  declined to make; the grammar linked all three anyway. Each family now reads a suppressed
  branch under a quiet `meta.link.suppressed.*` name, and the tilde keeps its own punctuation. A
  pretty link takes no suppressor — TiddlyWiki builds the link and leaves the tilde as content —
  and reads unchanged.
- A comment's contents carry no verdict. TiddlyWiki scans from `<!--` to the next `-->` and
  builds a comment across whatever stands between; HTML's rules about what may appear inside one
  do not govern it, and three inherited verdicts condemned markup TiddlyWiki reads.
- An event-handler attribute reads as an attribute. TiddlyWiki parses `onclick=` into a node like
  any other attribute, so the span carries `meta.attribute.event-handler` rather than a verdict.
- Under an inline parser mode no block rule stands. `\parsermode inline` sets parseAsInline for
  the whole tiddler, so TiddlyWiki parses one inline run and every block marker after it yields
  plain text — and a heading marker, a list marker and the rest kept their block scopes. An
  inline mode now opens a region admitting pragmas and inline rules alone, and the body under it
  carries no paragraph node, as the parser builds none.
- A scope name says what it means. Four templates emitted names no selector could reach: a
  parameter name interpolated a capture group its own pattern never declared, so every pragma
  parameter read `tw-$1`; a text-reference index and a triple-quoted substitution each carried a
  literal double dot, leaving an empty segment; and a filter step interpolated an operator name
  and suffix that may hold a space, a comma or nothing at all, splitting one name into two that
  no theme matches. The filter step keeps its own captures, which name the operator and suffix
  already.
- A pretty link opens only where it can close on the same line. TiddlyWiki reads one with
  `/\[\[(.*?)(?:\|(.*?))?\]\]/`, whose dot crosses no newline, so halves on two lines yield
  plain text. Without that guard the double bracket opening a filter's title operand — as in
  `filter="[[$:/StoryList]contains<currentTiddler>]"` — read as a pretty link and hunted the
  rest of the file for its closing pair: the attribute string never ended, the tag never
  closed, and every construct after it read inside that tag. TiddlyWiki's own documentation
  macros carry the shape.
- HTML's deprecations carry no verdict. TiddlyWiki parses any tag name and any attribute name
  into a node, so `<center>`, `<dir>` and `align=` build and render; a verdict answers to what
  TiddlyWiki refuses, never to what a different language retired. `invalid.deprecated` and
  `invalid.illegal.no-longer-supported` removed at all fourteen sites, and the tags and
  attributes keep their ordinary `entity.name.tag` and `entity.other.attribute-name` names.
  The naming standard holds `invalid.deprecated` to "very rarely used".
- The stray-bracket verdict spares the contexts it names. Its injection selector carried
  HTML's own `meta.tag.*.*.html` wildcards, which match nothing once a scope ends
  `.html.tiddlywiki5`, so a `<` inside a tag, a widget attribute or a filter run drew a verdict
  where TiddlyWiki reads a variable reference. The selector now names this grammar's own
  scopes, and a genuinely stray `<` still carries the verdict.
- CamelCase links read quiet, matching the wiki TiddlyWiki ships. TiddlyWiki ships
  `$:/config/WikiParserRules/Inline/wikilink` as `disable`, so `HelloWorld` builds no link in a
  new wiki, and the construct now reads `meta.link.wikilink.tiddlywiki5` — a scope few themes
  paint, where the link family inherits nearly every theme's link colour. It keeps its own
  name, so a wiki that enables CamelCase colours it back with one settings rule; see
  **Colour toggles** in the README. The suppressing `~` keeps its punctuation colour, because
  `wikilinkprefix` carries its own rule, ships enabled, and consumes the character either way.
- A macro name ends where the host's own name regexp ends it. TiddlyWiki reads a name with
  `/([^\s>"'=:]+)/y`, so a colon, quote or equals sign closes the name and a call carrying no
  name at all builds nothing. `<<:>>` read as a macro call, and `<<a:b>>` carried the name
  scope across a parameter.
- A macro call stands as a `style` attribute value. Every other attribute already admitted one; the
  CSS-embedding branch excluded the angle bracket, so `<div style=<<tag-pill-style>>>` read as a
  stray bracket where TiddlyWiki parses a value of type macro.
- A slash before the closing bracket marks a tag self-closing, for any tag. Four attribute catch-alls
  swallowed it and called it a character not allowed here, so `<th/>` and `<div style="…"/>` — both
  ordinary in TiddlyWiki's own tiddlers — carried a verdict.
- A tag name admits the dollar and the dot, matching the host's own `reTagName`. A parameter
  substitution standing as a tag name (`<$type$ class="x">`) read as a stray angle bracket.
- An unrecognized tag name carries no verdict. TiddlyWiki parses any tag name into a node, and the
  grammar condemned namespaced elements inside SVG — `<dc:date>` in TiddlyWiki's own shipped
  tiddlers among them. Removed at all seven declaration sites.
- A style block's closing marker takes the rest of its line as content. TiddlyWiki builds a
  paragraph node from it and raises nothing, and the grammar called that span illegal.
- Only `=` introduces a parameter value. The value rule looked behind a colon as well, so a scheme's
  own path read as an unquoted parameter value — `ni:///sha-256;abc` and `https://example.com` both
  coloured as though a parameter had claimed them.
- The corpus and samples carry the framing form the graph now writes: a control sigil names its ends,
  `from=? -> to=lar:///…`, with the bearing arrow riding between them as an unnamed positional. The
  grammar read that form already — `key=value` alignment did the work — and this pins it so it stays read.

### Added
- Coverage counts two populations separately. A scope this grammar emits and a scope it hands to
  another grammar — `source.python`, `text.html.php`, `comment.block.js` — answered to one floor,
  and reaching the second kind wants a specimen carrying that language, which a wikitext corpus
  holds no reason to keep. The check reports each, and the count of this grammar's own unreached
  scopes carries a ceiling that may fall and never rise. Most of them want a start tag whose
  attributes span lines, which opens a continuation region a single-line tag never does.
- The corpus reads specimens, named by the extensions the manifest claims rather than by a list of
  what to skip. That list held two names and let a third control file through: the divergence
  rulings answered every corpus run as though they were wikitext.
- Every scope the memetic dialect declares stands exercised. The base grammar answers to
  twenty-seven corpus files and a coverage floor; the dialect carried a fraction of that, and six
  of its scopes had no specimen at all — a carrier naming no control code, a query separator
  inside a `lar:` URI, and two of the three quotings a parameter value takes. Two of those hid for
  one reason: they answer to the colon spelling, `key:"value"`, and every specimen wrote the
  equals spelling, which hands its value to the unquoted rule before the string rule sees it. A
  specimen carries all six and a gate holds the set.
- Every declared contribution packs. The ignore list names directories rather than contributions,
  so an edit there can drop a grammar the manifest still declares — and VS Code then loads that
  language, finds no grammar, and colours nothing without saying so. A gate takes every grammar,
  snippet file and language configuration the manifest names and asks the packager whether it
  ships. Compared file by file, what a release carries stands byte-identical to what the gates
  read, apart from the two transformations the packager performs: a licence renamed, and bare
  issue references rewritten as links.
- The gates answer to a TiddlyWiki that always resolves. They take their verdicts from
  TiddlyWiki's own parser, and without one they skipped politely while the suite still reported no
  failures — so a contributor could break every divergence gate and read green. `tiddlywiki`
  stands as an exactly pinned devDependency, and resolution puts a checkout beside this repository
  ahead of it: parser work happens in a checkout, and a released parser answering for gates aimed
  at unreleased work would report agreement with something nobody is editing. `TW5_PATH` outranks
  both. The pin ships to nobody — the package carries no runtime dependency, and nothing
  executable packs.
- The extension ships colouring and nothing that runs, by measurement. A TextMate grammar decides
  how loudly a construct reads and never which parser rules a wiki stands, so the configuration
  offered here works by scope naming and theme rules. That reading of the VS Code API answers to
  Microsoft's tree; its consequence answers to this one, and a gate holds it — no entry point, no
  activation events, only contributions VS Code reads without running anything, no runtime
  dependency, and nothing executable packed into the release.
- The four definition kinds carry ground that reports a regression. Each of them differs from the
  others in what its body means, what its parameter list admits and what its name admits, and none
  of those shapes stood in any sample or corpus file — so a fix to one could be lost silently.
  The pragma sample carries a one-line body of each kind, a doubled-paren default under both
  parameter laws, a dollar-named definition of each kind, and a body whose dollars stay literal.
  Reverting each fix in turn moves the pinned snapshot; leaving them all in place moves nothing.
  Coverage and divergence cannot stand in for this: a definition is stored rather than parsed, so
  no parse-tree check holds an opinion inside one, and a refused definition reaches the same scopes
  as the prose it reads as.
- A gap that closes reports itself. A known-gap specimen asserts what the grammar does not yet do,
  so it fails, and the gate that ran it read that failure as an absence and announced no gap
  standing. `tests/known-gaps/README.md` names the moment worth catching — the grammar grows to
  meet a gap, the specimen passes, and it wants moving to `tests/tiddlywiki5/` with its
  specification. The gate reports standing gaps and fails on a closed one.
- The corpus carries substitution where substitution holds. Its only ground for the placeholder
  scopes stood inside procedure bodies, where TiddlyWiki performs none, so narrowing the
  injection left eight scopes unexercised. A `\define` body now carries each placeholder form,
  including one inside a filtered transclusion, and a substituted attribute value carries them
  outside any definition.
- The grammar answers on cut ground as well as whole. TiddlyWiki's own tiddlers carry the
  best-formed wikitext in existence, and a learner writes from the other end of that
  distribution. `overreach-check --truncate=<seed>` cuts every specimen short at a seeded offset —
  an opener with no close, a table missing its last row, a macro body cut mid-parameter — and asks
  the same question there. Two readings of the result flatter the grammar and the check refuses
  both: a construct whose close lies past the cut refuses for that reason alone, and the whole
  tiddler settles whether the cut is the entire reason, since truncation takes a prefix and an
  offset means the same in both texts; a macro body is stored rather than parsed, so the parser
  rules on nothing inside it and the check reports those spans as unanswered rather than clear.
  Across four seeds no claim stands over text the whole tiddler also refuses.
- Every divergence on TiddlyWiki's own tiddlers, traced. Over 387 of them nothing diverges
  unexplained: 236 spans stand explained by 25 written rulings, and none by a number somebody
  wanted smaller. One ruling names a fault rather than an intention — a hardlinebreaks block
  emits no container node, so a scope over its content stands over text by construction.
- Divergences that stand by ruling, written down. Some spans stand where TiddlyWiki refuses
  deliberately — a scope the host ships disabled, a `\rules` run narrowing a rule set no
  TextMate grammar can follow, a fixture carrying deliberate faults, and the memetic dialect's own
  vocabulary. `corpus/expected-divergence.txt` names each with its reason, and a line carrying no
  reason names no ruling. Over the corpus, in both dialects, nothing now diverges unexplained.
- A second memetic sample, so the composition gate over that dialect can run. It compares
  neighbouring samples and needs two; the dialect carried one, so the check reported a missing
  source rather than a result, every time anyone asked.
- A `lar:` URI reads its own structure. The path, each `?key=value` in the query, the `&` between
  them and a `#/fragment` now carry their own scopes instead of riding in one unbroken string, so
  an address colours the way the rest of a call does.
- **Colour toggles** in the README: the two scope groups worth turning, and the
  `editor.tokenColorCustomizations` block that turns each, per workspace folder.

### Removed
- A bare `?` carries no bearing scope. An end names itself — `from=?`, `to=?` — so the glyph rides as
  an ordinary value, and standing alone it reads as content like any other character.

### Changed
- The manifest registers six grammars. The seventh declared a scope nothing referenced and no
  language claimed, so VS Code loaded it and no document ever reached it: a `.meta` sidecar
  carries fields and no body, and the `tid` language already lists `.meta` among its extensions
  and colours one correctly.

## 2.2.1

### Fixed
- A multi-line transclusion reads as a transclusion. `{{`, `{{{` and their `||Template` slots
  match across a newline in TiddlyWiki, whose title and template patterns are negated character
  classes. The grammar condemned every continuation line as
  `invalid.illegal.multiline-text-reference` or `invalid.illegal.multiline-tiddler-title`, so a
  wrapped title read as an error in all four transclusion rules. A continuation now carries the
  same scope as the line it continues.
- An unknown entity name is still an entity. `entity.js` reads `&#?[a-zA-Z0-9]{2,8};` whether or
  not the name is one HTML knows, so `&foo;` renders as an entity. It read as
  `invalid.illegal.ambiguous-ampersand`. The verdict now fires only outside that window, where
  the ampersand does stay literal text.

## 2.2.0

### Fixed
- `npm run compose` compares readings by position. It keyed them by line text, so a line
  standing in both samples of a pair compared one sample's reading against the other's, and
  three pairs read as failing while every sample composed. It blocks in CI now rather than
  reporting, and a pair whose lines do not line up says so instead of passing quietly.
- Raw markup carries no verdict. The stray-bracket rule reached inside a fence, an inline tick
  and a typed block, so a `<` in code read as an illegal character. Nothing inside raw markup
  answers to a wikitext rule, and the rule stops at that boundary.
- An `xml` fence names the XML grammar. The branch listed `atom`, `rss` and `xhtml` and not the
  name most authors reach for, so an `xml` fence fell through to the plain-text branch.
- Raw markup reads as markup. A code fence, an inline tick and a typed-block marker carry
  `keyword.control`, and a fence body carries `markup.inline.raw.block` — families a theme
  colours. They sat on scopes no theme styles, so a fence and its body rendered in the editor's
  default foreground while the code beside them coloured. A language branch ends at any fence
  line, so the region carries the body's scope and a nested sample reads as raw markup all the
  way through; an embedded grammar still wins inside its own span.
- A fenced block carries the fence rules TiddlyWiki adopted in 5.5.0. An opening fence takes
  three or more backticks and closes only on a fence at least as long, so a longer fence holds
  shorter runs and a nested sample reads as one block. The info string admits any character but
  a backtick, so ` ```C++ `, ` ```js {highlight} ` and a MIME type each name a language, and the
  language reads as the first word. Either fence may carry up to three spaces of indentation,
  and a fence indented further neither opens nor closes.
- A `.multids` line takes its first colon, as `boot.js` does. A line with an empty value defines
  a tiddler with empty text, and a line carrying no space after the colon defines one too; the
  rule demanded `": "` and matched neither. An unmatched line opened a wikitext paragraph that
  ran to the next blank line and took every field line after it, so one empty value cost the
  rest of the file. Wikitext reads inside a value and never at line level.
- A sigil binds its parameters with `=`, the memetic standard. TiddlyWiki reads `=` as the
  new-style separator, which admits a filtered, indirect or macro value where a colon admits
  neither; the colon spelling stays valid and stays read, in a sigil body and in a control
  carrier alike. A value carrying no delimiter of its own scopes, while a `lar:` URI, a bearing
  or a quoted string still claims its own.

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
- The manifest registers the language and its grammar and the package carries both, so a
  `*.mem` file opens as Memetic-Wikitext in an editor.
- `corpus/` and `npm run corpus`: broad ground gated on invariants rather than pinned tokens.
  Every scope the grammar declares should be reached by some file there — the declared set
  read from the grammar's own `name` and `contentName` fields, so no hand-kept list can drift
  — and `corpus/coverage-floor.txt` ratchets the count. The gate also appends a sentence to each file and
  requires it to carry only what the same sentence carries alone, measuring the baseline from a
  control rather than assuming it. 29 files across wikitext, `.tid` and memetic, including
  degenerate files that hold unterminated constructs on purpose.
- `test-bench/` and `npm run bench`: a disposable editor in a container, carrying the working
  tree as an unpacked extension, seeded from the corpus. `npm run bench:packaged` installs the
  built `.vsix` instead. Both run the editor server-side, where a TextMate grammar loads
  beside the files rather than in a remote UI.
- `tools/package-contents.js` and `npm run package-contents`: every path the manifest names
  must stand inside the built package. Each other check reads the source tree, where a file
  the package excludes still resolves.

## 2.1.0

### Fixed
- A widget closes itself with or without a space before its slash. `<$transclude/>` read as
  an illegal angle bracket; TiddlyWiki reads a tag name and then looks for `/>` directly, and
  TiddlyWiki's own core carries 50 of them.
- A widget that opens and closes on one line spans its own body. `<$button>{{X}}</$button>`
  read its body as a block run beneath the tag; TiddlyWiki parses a widget body with
  `parseInlineRun` unless a blank line follows the opening tag, so the body reads inline and
  the element scope reaches it.
- An unquoted filter run stops at the delimiter of whatever carries it. `{{{Bare}}}` consumed
  its own `}}}`, leaving the transclusion open and colouring every line after it to the end of
  the file; `(((filter)))` and `<%if%>` did the same.
- A substitution reference names one parameter. `$a$` alone matched nothing and `$a$ $b$`
  merged into a single span reaching across the gap, because the name needed two characters
  and admitted a `$`. TiddlyWiki substitutes one name at a time.
- A macro body reads the `${filter}$` form, which its injection never carried.
- A table cell wears its own marker. `!`, `~`, `>`, `<`, `^` and `,` scoped nothing at all, and
  a left-colspan `<` read as a stray angle bracket. The marks stood two captures deep, where a
  rule loses its own name; they stand at one depth now.
- A table cell carries inline wikitext. A link, a transclusion, a macro call, bold, an
  entity, inline code and an image all read inside a cell as they read outside one.
  TiddlyWiki parses a cell with `parseInlineRun`; the cell's alignment and span marks claim
  a whole cell and still take precedence.
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
- The readme declares each specification this repository implements — the wikitext grammar, the
  `.tid`/`.meta` and `.multids` file formats, the syntax-test format, and Memetic-Wikitext — with
  the scope each carries, and states the superset law: a stock TiddlyWiki reads a `*.mem` file as
  slightly odd wikitext, so the second reader sees more and the first never loses the file.
- `tools/nesting-coverage.js` and `npm run nesting-coverage`: which container-and-construct
  pairs TiddlyWiki's own tiddlers actually stand up, and whether the grammar reads the
  construct inside the container as it reads it in a sentence. Containers come from the rules
  TiddlyWiki declares block, constructs from those it declares inline, and the pairing from
  the corpus — so it finds pairs a hand-built matrix would not think to list.
- `tests/known-gaps/`, for a test that states what the grammar should do and does not yet. It
  stands outside `npm test`, so a known gap never reads as a regression.
- `tools/composition-check.js` and `npm run compose`: does a sample still read the same way
  with another sample in front of it? A construct reaching past its own file surfaces as the
  next file reading differently — the direction no other check looks in, and the one with no
  allowance list. Its two pure halves stand under test in `tests/tools/`.
- `tools/upstream-coverage.js` and `npm run upstream-coverage`: TiddlyWiki's own rule regexes
  taken to TiddlyWiki's own tiddlers, asking whether this grammar reads each construct they
  match. Its deciding half stands under test in `tests/tools/`, and CI runs it against a fresh
  TiddlyWiki checkout so an upstream rule this grammar does not read surfaces on its own.
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