# 3.0.0 — the ledger

Every construct, ruling and measurement behind the 3.0.0 release, sorted under the four headings a
reader looks for. [`CHANGELOG.md`](CHANGELOG.md) tells what the release grants; this file holds the
record underneath it. `MIGRATION.md` names every retired scope with what it stands as now, and the
ledgers under `corpus/` hold the rulings each entry points at.

## 3.0.0 — unreleased

A MAJOR BUMP, because a scope name is what a theme rules on. This release retires 136 of the 460
names `v2.2.1` published and adds 269 — and a reader's `editor.tokenColorCustomizations` entry
naming any retired one stops matching SILENTLY, with VS Code reporting nothing. `MIGRATION.md`
names every one. The reading changed beside the vocabulary: a transclusion reads as ONE object in
38 themes where it read so in none, an image's `[img[` arrives as one marker, and every quoted
attribute value's quote characters changed family. A reader who liked 2.2.1's look does not get it
back by upgrading, which is the definition this number answers to.

### Breaking
- `MIGRATION.md` names every scope a reader's theme rule lost. A theme rule and an
  `editor.tokenColorCustomizations` entry both name a scope, and when one moves VS Code reports
  nothing — the rule stops matching and the construct goes the colour of prose. The current headline
  count, and the shared shape behind 39 of the gone names (a qualifier standing in front of the
  family root, where a dot-bounded selector never reached them), stand in `MIGRATION.md` itself
  rather than restated here — `tools/invariants/scope-migration.test.js` derives and gate-checks
  both from the two grammars, so this paragraph cannot drift from them the way an earlier draft did.
- AN EDITOR REPAINTED A MARKER THE GRAMMAR PAINTED. VS Code colours a bracket by its NESTING DEPTH
  out of `editorBracketHighlight.foreground1..6`, and it takes the pairs to colour from a language
  configuration's `brackets` whenever `colorizedBracketPairs` stands absent. Wikitext spells `{{`,
  `{{{`, `[[` and `((` as ONE marker each, which the editor reads as two or three nested pairs:
  measured in Gruvbox Dark and Monokai, `{{MyTiddler}}` painted its outer brace depth-1 and its
  inner brace depth-2 while every scope on both braces stood correct and identical — so no theme
  toggle moved it, and the grammar wore the fault. Both configurations now colour no pair, and
  `brackets` goes on serving matching, the jump commands and the indent rules.
- A macro call and a bracketed title close themselves and match nothing. Auto-closing saves a
  keystroke; matching draws a line between an opener and a closer and paints an unmatched one as
  an error — and wikitext defeats both pairs. A blockquote opens `<<<` and closes `<<<`, so with
  `<<` matched every blockquote leaves two openers and no closer. A filter operand closes `]]`
  whose two `[` never stood adjacent, so that closer stands unmatched. Both read to a reader as
  red, and the corpus carries eleven of the first and twenty-seven of the second.

### Reads more like TiddlyWiki
- TWO ADJACENT CODE RUNS PAIR AS THE HOST PAIRS THEM. `codeinline.js` opens on `(``?)` and closes
  by re-running that SAME literal against the whole source — it does not care whether the
  character right before its own opener already belonged to a run somebody else closed. The
  grammar's `(?<!`)`/`(?!`)` lookaround assumed the opposite: that a backtick immediately beside
  another backtick always marks the SAME delimiter, so ``* `raw``raw`not raw`` (two runs standing
  side by side) opened one code span and then refused to open the second, reading the rest of the
  line as plain text. Dropping the lookaround pairs the two runs the way the host does; measured
  against `corpus/attribute-kind-ceiling.txt`, dropping only the single-backtick rule's lookbehind
  regresses that ceiling 52 to 54 (a spurious re-open cascades roughly 130 characters through a
  real tiddler carrying a nested triple-backtick fence), so both rules' lookaround came out
  together rather than one at a time — measured clean at 52 across both readers. Two darkness
  entries and two ablation entries retire.
- A LIST ITEM REOPENS AFTER A LINE THAT ONLY CLOSES AN HTML ELEMENT. `list.js` re-tries its own
  marker regex after every item's body, however that body was built — including a body that
  entered block mode for an unclosed element (`<div>` followed by a blank line) and only finishes
  on a later line ending `</div> run`. This grammar has no equivalent memory: once that body falls
  through to the ordinary paragraph fallback, the paragraph's own end bound (a blank line, `<<<` or
  `\end`) has no reason to fire on the very next `* …` line, so the marker reads as prose inside an
  open-ended paragraph — and does so with the WHOLE list standing alone, per
  `tools/darkness-witness.js`. A physical line beginning with a closing html tag now bounds itself
  to that one line (`#block`'s new first pattern, `(?=</)` … `$`) instead of handing its trailing
  text to the paragraph fallback, so `#block` gets a fresh, un-swallowed try at the next line — and
  a plain "prose line, then a `* item` line" (which TiddlyWiki keeps as ONE paragraph, the marker
  reading as literal text) is untouched, since that pair never reaches this new rule at all: the
  paragraph there opens on the PROSE line, not on a closing tag. Six darkness entries retire.
- AN MVV NAME NEVER CARRIES WHITESPACE. `parseutils.js#parseMVVReferenceAsTransclusion` reads `((`,
  a name matching `[^\s>"'=:)]+` with no leading whitespace admitted, then `skipWhiteSpace` (newlines
  included) up to `))` — so `((a b))` and `(( x))` never build an MVV, only trailing whitespace up to
  the close does. The grammar's attribute-value and macro-dynamic-parameter MVV regions admitted a
  space anywhere inside the parens; both now match the host's name exactly, a trailing whitespace run
  carried across a line included.
- A VERDICT STANDS ONLY WHERE TIDDLYWIKI REFUSES OUT LOUD. An ampersand outside `entity.js`'s
  `&#?[a-zA-Z0-9]{2,8};` window stays text, and a tag whose attribute list `html.js` cannot read —
  `<div ="x">`, `<div style==>` — stays text too, and in both the parser raises no diagnostic. The
  grammar painted `invalid.illegal.ambiguous-ampersand`, `…character-not-allowed-here` and
  `…unexpected-equals-sign` there, a refusal the host never makes. The seven rules emitting them came
  out, `MIGRATION.md` records the three names retired, and three expected-divergence rulings retire
  with them. The two malformed tags still paint their brackets, which stays owed: a tag's opener
  cannot see whether an attribute list it has not read yet will parse.
- A SIGIL'S VERB READS ONLY INSIDE A CALL. The verb rule rode the dialect's root injection, so text
  shaped like `<<~ set …>>` painted `set` as a keyword inside an HTML comment, a raw fence and a `$$$`
  typed block, none of which builds a call. It rides its own injection now, keyed on the base's call
  scope: it reads wherever TiddlyWiki builds the sigil and nowhere it does not, and the comment and the
  raw text keep their own reading.
- A RUN OF FOUR DASHES ENDS IN AN EM DASH. TiddlyWiki's dash rule, `-{2,3}(?!-)`, matches the LAST
  three marks of a longer run, so `----` in prose renders a hyphen and an em dash and `-----` two
  hyphens and one. The grammar refused an em dash with a dash before it and read the whole run as text.
  The last three marks read as the em dash they render; a run alone on its own line stays a horizontal
  rule, and eight darkness entries retire.
- AN IMAGE NEEDS A SOURCE THAT HOLDS SOMETHING. `image.js` skips whitespace after the inner `[` and
  then needs at least one character before `]]`, so `[img[ ]]`, `[img [ ]]` and `[img[]]` build no
  image and TiddlyWiki keeps the brackets as text. The grammar painted all four brackets and the
  keyword. The opener now refuses a source it can see holds nothing on its own line; a source carrying
  a title builds as before, whitespace around it and all. One expected-divergence ruling retires.
- A FILTER VARIABLE READS A NAME, THEN PARAMETERS. `parseFilterVariable` splits a `<…>` or `(…)`
  operand at its first whitespace — a name, then the rest read as a call's parameters — so
  `<now [UTC]YYYY0MM0DD>` calls `now` with a date format. The grammar painted the whole text as ONE
  variable name, which read the format in the name's colour and left its literal `]` inside a token
  the editor matches brackets in, where it stole the filter run's own `[` and painted the run's closer
  red. The name reads as a name and the rest as a call's parameters, a string like any other; a
  variable holding no whitespace stays one name. One owed bracket-ledger entry retires.
- A STYLE BLOCK CLOSES ONLY ON A CLOSER AT THE FIRST COLUMN. `styleblock.js` ends its body on
  `^@@`, and `parseBlocksTerminated` skips indentation before it asks — so an indented `@@` closes
  nothing: at a block's head it opens a nested, empty block, and inside a paragraph it stays text. The
  grammar closed on `^\s*@@`, and from the first indented closer in `tiddlywiki5.tw` every `@@` below
  flipped parity, reading openers as closers and a style as prose. A closer carrying text after its
  marks also hands that text to a paragraph that runs to the next blank line, where the grammar opened
  a fresh block on the line below. Traced block by block against the host, every style block in both
  pinned samples now opens and closes where TiddlyWiki's does; four sample rulings that explained the
  flipped parity retire idle, and the two left restate the one divergence they still carry.
- A TABLE CELL'S MARKS READ IN THE HOST'S ORDER. `table.js` reads a vertical-alignment mark, then
  spaces, then the heading bang, and the grammar diverged in five places: a `<` opening a row painted a
  colspan where the host keeps the text (the span needs a cell before it); a tab before `!` painted a
  heading where the host skips spaces alone; `|^ !x|` left the bang bare where the host builds a `th`;
  `^^^` and `,,,` painted nothing where the host hands the first mark back to alignment; and a class
  row opened after indentation where every row opens at the first column. Five pattern swaps, no name
  moved, and one expected-divergence ruling retires with the specimen that now carries a real span.
- A FILTERED TRANSCLUSION CLOSES WHERE TIDDLYWIKI CLOSES IT. The host ends `{{{ … }}suffix}` on `}}`,
  an optional style, then `}` (`filteredtranscludeinline.js`, and the block rule alike), so `}}}` is
  only the closer carrying an empty style. The grammar spelled the literal `}}}` alone, never closed on
  a style, and carried the transclusion across the blank line below — painting 85 spans of prose as
  filter text. Both forms close on the styled suffix now, the inner bounds stop at `}}`, and so does a
  bare-title run, which otherwise ate the closer itself. The attribute form keeps its literal `}}}`,
  because `parseutils.js` reads a filtered value only there. Two expected-divergence rulings and one
  darkness entry retire with it.
- A PRAGMA THE GRAMMAR REFUSES SHUTS THE ZONE FOR EVERY PRAGMA BELOW IT. The `\widget` rule demanded
  a dollar that `fnprocdef.js` never asks for — `[^(\s]+` names all three kinds — so a widget named
  without one opened no region, its body line met the zone's own close, and the zone, which opens only
  at the start of the source, stayed shut: a `\function` and two `\parameters` below it read as prose
  while TiddlyWiki built every one. A one-way latch wears a swallow's face. The widget name now reads
  with or without its dollar, `$:/` still excluded, and eight darkness entries retire with it.
- RED MEANS KEYWORD-NESS, and three readings that all looked like "too much red" answer differently.
  A conditional's `if`, `else` and `endif` read red CORRECTLY — measured, JavaScript's own `if` reads the
  same hex through the same selector in that theme. A sigil's verb now reads red too, because the word
  after `<<~` names an act the dialect stands on. And a marker wearing a keyword name reads red WRONGLY:
  `[img[`, `[ext[`, a `$…$` substitution's marks and a `lar:`/`ni:` scheme all fell through to the bare
  `keyword` selector, which 55 of 65 themes paint as a keyword. The marks take punctuation; the scheme
  takes `support.type`, which reads as a keyword in 4 of 65 and stays visible in 62.
- A LINE COMMENT AND AN ITALIC RUN CARRIED BYTE-IDENTICAL BEGINS FOR OPPOSITE REASONS. Both read
  `//(?=[^\n]*//)`: the italic bound REFUSES to open without its closer ahead on the line, and the
  JavaScript comment DEMANDED a second `//` it never needs — so `var x = 1; // note` painted `note` as a
  variable, three sites deep in the embedded grammar. Repairing the comment by that shared text took the
  italic bound with it, and an unclosed `//` then opened a region TiddlyWiki refuses. The canary named it
  in two spans. The comment sites read `//` and the italic site keeps its lookahead.
- AN ATTRIBUTE VALUE SPANNING LINES NEEDS A REGION, NOT A MATCH. A filtered attribute carried across a
  break painted nothing inside itself, its region naming itself while the interior fell to the editor's
  own foreground. The same repair applied to the indirect and multi-valued forms BROKE them — their
  interiors answer to a rule whose match runs to the end of the line, so an unbounded region let it
  swallow the closer — and those two stand restored, with the reading they owe recorded rather than
  half-built.
- A CLOSING SIGIL'S MARK READ AS A STRAY SLASH. TiddlyWiki takes the whole run after `<<` as ONE
  variable name, so `/ahu` names one closing sigil and a reader meets one object — and ALL 65 bundled
  themes painted the mark apart from its verb, the mark itself reading as ordinary prose in 36 of them.
  The mark now carries the sigil name beside its published punctuation name.
- A BARE FILTER RUN IN PROSE IS PROSE. `[tag[Done]sort[title]]` standing in a sentence tokenizes to
  ONE token carrying `meta.paragraph`, and TiddlyWiki's own parser agrees: one `text` node, no rule
  fired. Inside `{{{ }}}` the filter grammar opens in full. Painting the bare run would invent a
  reading the host does not have.
- A CONSTRUCT SPANNING LINES DECLARED ITS INNER READING ONCE. A grammar reads one line at a time, so
  a transclusion whose opener and closer sit on different lines needs the reference's reading declared
  twice — once where the opener matched, once in the pattern carrying every line after it. The second
  declaration stood missing, and the gap wore a shape no gate looks for: the region name held, the
  containment held, the scope appeared in the snapshot from the first line — and a theme, which rules
  on the innermost scope, painted a title in 40 of 65 themes on the first line and in NONE on the
  second. One object, two colours, and no theme toggle moved it. Both transclusion forms now hand
  every line one reading out of one rule, and `tools/invariants/wrap-parity.test.js` sets the bar from
  the construct's own first line rather than from a number.
- A `toml` FENCE READS FULL TOML 1.1, PRIVATELY. VS Code ships no TOML grammar, so a `toml` fence
  coloured only for a reader who happened to install one. `syntaxes/toml.tw5-syntax.json` hand
  ports sublimehq/Packages `TOML/TOML.sublime-syntax` @ `2697dd8` (the only grammar, Sublime or
  TextMate, with full TOML 1.1 coverage at the time of the port; same permissive licence as
  TextMate's own bundles — see `ThirdPartyNotices.txt`), rewriting its `set`/`push`/`pop`
  contexts as TextMate begin/end regions: the `\e` and `\xHH` escapes, optional seconds in times
  and datetimes, and a quoted, dotted table-header key (`[fruit."var.ies"]` keeps `"var.ies"` as
  one segment) all read correctly, checked token-for-token against the 49-line TOML 1.0+1.1
  fixture that shaped the port. Its `scopeName` is the private `source.toml.tw5-syntax`, and the
  manifest registers it with no `language` field and no file-extension claim, so it can never
  take over a reader's own `.toml` files or `source.toml` theme rules. The `(ini|toml)` fence arm
  splits: `toml` includes this grammar, `ini` includes VS Code's own `source.ini` — before the
  split, an `ini` fence
  painted an INI comment as `invalid.illegal.not-allowed-here.toml`. Both arms keep the house
  `while` guard every embedded fence in this grammar already uses, checked once per line ahead of
  the embedded scan, so a `"""`, `[` or `{` an embedded grammar leaves open never swallows the
  fence's own closer.
- `\end` CARRYING A NAME THAT FAILS TO MATCH CLOSES NOTHING. The host takes the definition's own name
  after `\end` or none at all, and anything else leaves the definition open to the end of the source
  with a BLANK body and an `unterminated-definition` diagnostic. The grammar closes on the closer it
  can see, and the divergence stands ruled OWED rather than structural: the deciding evidence sits on
  that very line, and matching it needs a backreference to a name an end pattern can only take from
  its OWN begin, where the name stands captured one rule out.
- A BEARING ARROW SURVIVES INSIDE A SIGIL. An R-priority injection looks after the base's
  unquoted-value rule has already taken the dash, so `->` arrived as two tokens — `-` under
  `string.unquoted` and `>` in the parameters region — and neither carried the arrow's name. Every
  aim and yield line this house writes carries that form, and the only pinned specimen wrote the
  PROSE one, so `memetic-coverage` read green over it. An L-priority injection looks first and keeps
  the arrow whole. It reaches only where this dialect stands, because a grammar's injections ride
  with the grammar.
- A conditional wraps BLOCKS, so TiddlyWiki carries it across a blank line the way it carries a quote
  block — `conditional.js` parses its body with `parseBlocks` and closes only on `<%endif%>`. The
  grammar bounds the region at a blank line, cutting a conditional that holds more than one
  paragraph. Ruled in `swallow-ledger.txt` rather than cured: the last bound removed without a
  collision cut 116 real multi-line calls, and this one wants the same collision first.
 A COLLISION'S PROVOCATION MUST REACH EVERY SPECIMEN. `sigil-vocabulary`'s red struck `<<~ oracle`
  from one named corpus file, so the moment a second carrier wrote that sigil the provocation planted
  no fault and the gate read green while losing the power to fail. It happened on the commit that
  added `reading.in-prose.mem`. The strike now walks `corpus/memetic` and `tests/samples` and derives
  its population from the tree, the way the instrument it collides already does.
- A TRIPLE-QUOTED VALUE CARRIES THE QUOTE IT TOUCHES. TiddlyWiki spells all three of its string sites
  `"""([\s\S]*?)"""` — lazy, and carrying no lookaround — so a value opens on the FIRST triple and
  closes on the NEXT one, and its content may begin or end with a quote. The lookarounds on `#string`
  refused every such reading: against `""""value"""` no offset matched, the string region never
  opened, its call never closed, and the rest of the tiddler read as one unquoted parameter. That
  swallow hid by construction — it paints everything `string.unquoted`, which the attribute
  vocabulary ACCEPTS for the 88% of attributes typed `string`, so a tiddler-wide runaway surfaced as
  one disagreement. Counted as carriers instead: three host carriers moved, two of them swallowed end
  to end, and host divergences fall 11964 to 11953. The guard protected a real case and keeps a
  narrower form — a run of four quotes with no closing triple, where the host reads two empty
  double-quoted strings, declines through a second begin alternative demanding a closer on the line,
  since opening a triple at that offset swallows the tiddler. Two sites stand unhealed, a
  quote-adjacent triple whose closer sits four lines down; a line-local reader cannot see that closer
  and the whole-document lookahead ceiling names the reader that can. Invention checked by reading all
  546 host carriers holding a triple quote under both grammars, token for token: exactly the three
  intended moved, 543 byte-identical.
- A NAME FOLLOWED BY AN ELLIPSIS NAMES NOTHING. The seed explains its own grammar in its own grammar
  — `<<~ name …>>` invokes `<<~name …>>` — and the first derivation read that metavariable as a
  sigil, then demanded a specimen invent one.
- Typing `[[` or `<<` now auto-closes, inserting the matching close. Wikitext writes a bracketed
  title and a macro call far more often than it writes a bare angle bracket, and the base
  configuration named neither as an auto-closing pair — while the memetic dialect that wraps it
  named both. A bare `<` still opens an HTML tag and closes nothing. The dialect gains `<%` `%>`
  in return, which belongs to the wikitext it wraps. (Auto-close only: these pairs do not
  bracket-*match* — see "A macro call and a bracketed title close themselves and match nothing"
  above, which states where this settled and supersedes any matching claimed here.)
- A double-click takes a TiddlyWiki word. VS Code's default word pattern breaks a system title at
  its first character — `$:/core/ui/ViewTemplate` selects as `$` — and halves a hyphenated
  variable name, so `tv-config-toolbar` selects as `tv`. Both stand among the commonest tokens an
  author touches, and the same pattern decides word-wise cursor movement and what Ctrl+D matches.
  A system title travels whole with its slashes, a pragma with its backslash, a hyphenated name
  entire, and each stops at the delimiter around it: `<<myMacro>>` gives `myMacro`, `{{$:/foo}}`
  gives `$:/foo`. The memetic dialect already carried one; wikitext, `.tid` and `.multids` did not.
- A `lar:` URI reads its own structure. The path, each `?key=value` in the query, the `&` between
  them and a `#/fragment` now carry their own scopes instead of riding in one unbroken string, so
  an address colours the way the rest of a call does.
- A dictionary entry reads its value as wikitext, whatever the key. A tiddler dictionary holds keys
  and values, and a key names no tiddler field — a dictionary carrying an entry called `caption`
  carries a key of that name and not a caption — so the field allow-list reads nothing there. The
  ground supports the reading: of 2863 entries across TiddlyWiki's own 28 dictionaries, 958 carry a
  wikitext construct, most of them a `<<colour …>>` call in a palette. A `.multids` file already read
  every value that way, one line per tiddler; the two formats now agree.
- A TIDDLER'S TYPE DECIDES WHAT LANGUAGE ITS BODY CARRIES. TiddlyWiki reads a body through the
  parser its `type` field names, and this grammar read every `.tid` body as wikitext whatever the
  field said — a JSON tiddler's braces coloured as prose, a plain-text tiddler's `!!` as a heading,
  a CSS tiddler's selectors as nothing at all. Twelve content types now steer the body: JSON,
  JavaScript, CSS, HTML, XML and SVG, Markdown, a tiddler dictionary, and plain text, which carries
  no wikitext at all. A type this grammar does not name keeps reading as wikitext, which is what
  TiddlyWiki does with a type it cannot parse.
  Measured against TiddlyWiki's own tree: 115 of 5756 `.tid` files declare a type that is not
  wikitext. The type line opens a region that never closes — the remaining header fields read inside
  it, and the body after the blank line reads as the guest language — which is the shape the inline
  parser mode and the pragma zone already carry.
- The structural pattern carries the colour. A shortcut reads `<% keyword … %>`, and a wiki or a
  plugin may register one this TiddlyWiki never shipped — so the grammar colours the shape and names
  an unrecognised keyword as unrecognised, rather than refusing what this parser happens not to read
  today. `meta.link.wikilink` already stood on that reading for a rule TiddlyWiki ships and disables;
  this names the other direction. 21 spans stand ruled, and the cost stands accepted: prose that
  NAMES the syntax colours as the syntax.
- The mark carries the colour, whatever the parser makes of it. Three style openers in a row read as
  three here and as an empty block plus an inline run there — TiddlyWiki's block-or-inline choice
  turns on what follows the mark. An image with a blank source carries every mark an image carries.
  Both stand ruled to ONE fixture each, so the shape still reports anywhere else: planted in a
  fixture no ruling names, the same image reports six spans and fails the gate.
- A STATE TOGGLE NEVER TAKES A COLOUR AWAY. TiddlyWiki carries pragmas that change what its parser
  reads — `\rules except rules` turns the rules pragma off, `\parsermode inline` reads the rest of
  the tiddler as one inline run — and after such a line the parser refuses constructs it would
  otherwise build. This grammar colours them anyway, by ruling: at design time a reader wants to see
  the base language, and the operator holds the tiller for render time, having written the toggle
  themselves. A grammar that greyed out everything below a `\rules except` line would hide the
  language from the person editing it, to describe a state they authored. 26 spans stand ruled.
- `\whitespace` and `\parsermode` open on the separator, the way TiddlyWiki opens them. Demanding a
  recognised value — `trim`, `notrim`, `block`, `inline` — refused the construct where the parser
  builds it, so a line carrying an unknown value read as prose here and as a directive there. The
  keyword still names itself; the rest rides as the value.
- A directive wants a space where TiddlyWiki wants one. vscode-textmate hands the scanner a line
  WITH its newline, so `\s+` after a keyword matched the line ending — and a bare `\rules`,
  `\import`, `\whitespace` or `\parsermode` coloured as a working directive where TiddlyWiki reads
  prose. Its own rule modules spell the separator `[^\S\n]`, and these four now say the same. The
  divergence gate falls from 153 spans to 77.
- A pragma reads as a pragma only where TiddlyWiki reads one. Its parser runs `parsePragmas()` once,
  before `parseBlocks()`, and never returns to it, so a backslash directive standing after any block
  content renders as prose — and the grammar coloured one as a working directive anywhere in a file.
  A `#pragma-zone` region now opens at the start of the source and closes at the first line opening
  no pragma-mode rule, with the pragma rules living inside it and nowhere else. The divergence gate
  falls from 161 spans to 153.
- Eight rules hold that zone open, not the backslash family alone. TiddlyWiki declares the mode on
  each rule module and names `commentblock` among them, so an HTML comment keeps reading pragmas
  exactly as a directive does. Reading the backslash keywords alone closed the zone on the first
  `<!-- -->` line of a sample and took fifty-four pragmas with it, while the parser built every one.
  `npm run signals` harvests the set from the host and a gate holds the zone's own account to it.
- The dialect's sigils read everywhere the base grammar reads. Its injection named three block
  contexts by hand, and a sigil inside an unordered list read as an ordinary macro call for it — the
  selector reached the three somebody listed. One selector on the base's root scope reaches the whole
  file, and the base's root stands on the stack wherever it reads.
- The closing semicolon of a numeric or hexadecimal entity carries its punctuation scope. Both rules
  named capture 3 where two groups stand — copied from the named-entity rule above them, which has
  three — so `&#39;` and `&#x27;` coloured their `&` and left their `;` bare while `&amp;` coloured
  both. A gate reads every capture in every grammar against the groups its regex opens.
- A pragma standing after block content reads as prose, the way TiddlyWiki reads one.
  `tests/tiddlywiki5/tiddlywiki5.pragma-zone.tw5.test` carries the specification and the
  measurement; the entry above records how the zone came to stand.
- STRUCK TEXT NAMES ITSELF, AND BORROWS AN ASIDE'S INK RATHER THAN AN UNDERLINE'S. `~~struck~~`
  declares `comment.strikethrough.tiddlywiki5 markup.strikethrough.tiddlywiki5`. A grammar pushes a
  token's names outermost first and the last one decides each property, so the honest name keeps the
  font style in all 17 bundled themes that rule on `markup.strikethrough`, and the `comment` family
  ahead of it reaches every theme that rules on neither that name nor `markup.underline`. Measured
  over the 65 bundled themes: a cue on the struck WORDS stands in 65 of them, where the underline
  spelling reached 44 and the honest name alone reached 17. The honest name alone also drops twelve
  pairs below their floors; this spelling spends ONE — `a comment vs strikethrough`, 65 -> 64,
  re-seated in `corpus/legibility-floor.txt` with the ruling that spent it — because struck prose
  now reads in a comment's ink. Every other name the 65 themes paint broadly enough to reach them
  (`markup.deleted`, `markup.changed`, `markup.quote`, `markup.raw`, `meta.diff.header`) names a
  diff line, a blockquote or verbatim code, and each would misdescribe the construct the way
  `markup.underline` did. VS Code's own Markdown grammar names struck content
  `markup.strikethrough.markdown`; the TextMate convention names only bold, italic and underline,
  and `vscode-textmate` gained a strikethrough font style in 2022 for Markdown's sake.
- A zone pragma reads after a comment on its own line. TiddlyWiki's four zone rules match
  UNANCHORED — `/\\parsermode[^\\S\\n]/mg` and its siblings — and measured against the host,
  `<!-- a -->\\parsermode block` builds `void/commentblock, void/parsermode`, two comments ahead of
  it reading the same way. This grammar anchored all four to `^` and painted nothing there. THE ZONE
  BOUNDS THE REACH, never the anchor: each pattern consumes to end of line, so a SECOND pragma on one
  line reads as the first one's tail — with a comment between or without — which is what TiddlyWiki
  reads there too, because the first rule moved the parser past the rest. Both halves stand asserted,
  since a relaxation that gained the first reading and lost the second would read as an improvement.
- The pragma zone closes MID-LINE, where a comment it holds ends mid-line. TiddlyWiki reads
  `commentblock` in pragma mode, so a comment opening a tiddler stands inside the zone;
  parsePragmas() consumes it, looks again from wherever it ended, finds no pragma, and hands the
  rest to parseBlocks(). A zone that could only close at a line START kept eight of TiddlyWiki's own
  core templates, each of which writes `--><$view field="text" .../>` on one line, and every
  attribute after the `-->` went unpainted while the parser placed all of them. 22 attributes came
  back and the ceiling fell from 74 to 52. Controls: a pragma standing after the same `-->` keeps
  the zone, and so does a second comment.
- A cut inside a conditional body whose opener carries text on the next line. TiddlyWiki reads ONE
  bit off the source directly after `%>` — a double linebreak standing there — and that bit fixes the
  parsing mode for the WHOLE remaining body: block mode builds the constructs that follow, inline
  mode runs a flat text run to the end of the source and carries blank lines and `<<<` alike inside
  it. Measured at `Conditional.tid`, cut 7 ends on the opener and the parser builds a quoteblock,
  cut 8 hands it one line of body and the parser builds one text node covering the sentinel. Neither
  light-cone arm moves it; inserting a blank line directly after the opener moves it on all four
  cuts, with trailing nonsense as the control. Five constructions collided and every one paints in
  inline mode — an `end` consuming the newline, an `end` on a blank-line lookahead, a `while` on a
  non-blank line, that `while` holding a never-ending child, and `end` `^` under
  `applyEndPatternLast`. A stack carries regions, never the line count that tells the blank line
  closing a block-mode body apart from a blank line inside an inline run. Ruled on carrier ground.
- A call's end no longer takes a blank-line bound. TiddlyWiki builds a call wherever `>>` stands
  ahead anywhere in the source — one blank line or many — so the bound cut a construct the host
  carries, and the closer then read as whatever its line looked like standing alone: a blockquote.
  Measured over 700 carriers and 16087 openers, 116 close on a LATER line, and none lack a closer
  entirely, which is the only case the bound would have helped. Eight pinned readings had said so
  since the bound landed.
- An apostrophe inside a macro argument opens no parameter. A macro parameter carries an OPTIONAL
  name, so its rule fired wherever a quote stood — including mid-word, where a quote starts no
  parameter at all and the region then waits for a closer prose never supplies. `<<myMacro you'd
  index>>` ran past the blank line and coloured every construct after it as that macro's arguments.
  TiddlyWiki refuses the whole macro call there, so the reading carried an invention and a swallow
  from one cause. A parameter now opens only where no word character precedes it — never at the
  line's start alone, since a pragma signature separates its parameters with commas.
- A macro call left unclosed no longer swallows the sentence after it. TiddlyWiki carries a call
  across lines wherever its closer stands later and refuses it outright at a blank line, so the
  region takes the blank-line bound the rest of the grammar already carries. The fixture that
  caught it holds the gradient floor — a malformed sigil surfaces as itself and never swallows what
  follows — and that floor stands independent of any vocabulary.
- A self-closing `<svg …/>` closes its element. Twelve element families stand here and ten admit a
  self-close in their end pattern; the two that did not name `<svg>` and `<math>`, the roots. A
  sibling survives the gap because its end also breaks on the parent's closing tag, and a root has
  no parent — so `$:/core/images/blank`, a one-line self-closing icon shipped in every wiki, held
  its region to the end of the file. The fix takes three parts, and each one alone leaves it open:
  the root's end admits `(/>)`, its start tag stops BEFORE the mark instead of eating it, and the
  root's begin declines a self-closing `>` so the mark survives to reach either.
- An unterminated start tag no longer takes the rest of the file. A tag region whose end names
  only `>` runs to the end of the document where no `>` follows, and every construct after an
  unclosed `<div` then colours as an attribute name. The grammar already held the bound for widget
  tags and had never carried it to the other nine families; 43 tag regions and 7 attribute regions
  now end at a blank line, chosen by what their end pattern awaits rather than by tag name. The
  attribute regions matter as much as the tags: a child region on the stack keeps its parent's end
  from ever being tested.
- A code region reads literally, and a label types it. TiddlyWiki hands a tick span and a code
  block to no parser, and every shipped grammar reached for agrees: VS Code's markdown, wooorm's
  markdown-tm-language, Pygments, nvim-treesitter, Helix and tree-sitter-markdown all decline to
  read inside an inline span, and none defaults an unlabelled fence to the host tongue. Neither
  reads as wikitext here. A label still colours — and TiddlyWiki's own explicit typing, the `$$$`
  block, dispatches a real parser on its type and always did.
- A tick span matches on one line rather than opening a region. Where no end pattern matches,
  TextMate runs to the end of the document — the manual says so plainly — so a begin/end pair
  carries no bound at all. The parser says what a bounded match says: `codeinline.js` finds no
  closing delimiter, records `unterminated-codeinline` and renders the delimiter as literal text,
  and its end regex, built from the opening delimiter alone, carries no lookahead either. Three
  grammars converged on this idiom independently, and one carries a source comment rejecting
  begin/end for exactly this reason.
- Every header field takes the wikitext reading unless a reader declares otherwise. Three names
  carried it before — `text`, `caption`, `description` — and that judgement missed eleven of every
  twelve marks in TiddlyWiki's own tree: 962 lines read rightly, 1945 stood unread. The brackets in
  `tags` and `list` were the largest missed class, and they are not a link pretending to be a title.
  `boot.js` parses a title list with `parseStringArray`, whose bracketed member survives the round
  trip through `stringifyList`, and `filters.js` reads those same brackets as a run whose empty
  operator defaults to `title`; the `enlist` operator takes a string-array operand inside a filter
  outright. One notation, two readers, so the mark carries the colour — `tags` paints 15317 spans
  across the corpus and not one falls outside the tiddler-name family, and of 3122 bracketed
  members none carries a pipe, so the shape that would part a quoted title from a pretty link
  stands empty. Reading every field but the named exceptions: 11453 lines right, 19 wrong.
- A dictionary entry stands clear of the field rules on its own ground. A dictionary key names no
  tiddler field, so an entry called `color` carries a key of that name and not the color field —
  and a palette is exactly where such an entry holds a `<<colour ...>>` call worth reading. Every
  dictionary value keeps the wikitext reading whatever its key spells.
- A `lar:` root's three terms read as one address. Heading, angle of approach and carried dynamic
  came from three scope families and painted as three unrelated things — all three shared a colour
  in 1 of 65 themes, and Gruvbox Dark Medium gave the heading aqua against yellow for the other
  two. Under one family they read alike in all 65, and each keeps a distinct tail so a rule written
  against one term still reaches it alone.
- A filter reads every operand delimiter TiddlyWiki reads. filters.js switches on five after an
  operator name — `[`, `<`, `{`, `(` and `/` — and the grammar read three. A regular-expression
  operand and a multi-valued variable operand fell into the operator name, so `[prefix/Some/]`
  read as one operator called `prefix/Some/`. Both parse now, with the regexp body taking the
  family every highlighter surveyed keeps for one, and its flags their own: measured over 65
  themes, the body and flags colour in all of them and the multi-valued operand in 89%, where the
  swallowed span reached 31%.
- A lone angle bracket no longer reads as an unclosed pair. Wikitext leaves `<` and `>` unpaired
  in ordinary prose — 440 of TiddlyWiki's own 14485 core lines carry one — and matching them drew
  every one as an unmatched bracket. Neither language brackets the pair now, nor surrounds with it.
- A `.mem` file takes a system title as one word. Its word pattern took `lar:` addresses and
  `#anchors` whole and left `$:/core/Something` broken into pieces, though a memetic file holds
  wikitext throughout.
- A fenced block hands its guest language to the editor, not only to the colourer. Twenty-one
  guests embed here — JavaScript, CSS, JSON, Python, Ruby, SQL and the rest — and each region now
  names its language with `meta.embedded.block.<lang>` beside the guest scope, wired through the
  manifest's `embeddedLanguages` map. Comment-toggling, snippets and bracket-matching follow the
  language across the fence: `//` inside a JavaScript block rather than the host's own mark. The
  colour never depended on either declaration, which is why nothing reported their absence.
- A filtered transclusion and a transclusion carry across a blank line, the way TiddlyWiki carries
  them. Their regexps take newlines, so a terminated block spans blank lines and the parser keeps
  one node; a bound written to contain a runaway ended them at the first blank line instead, and
  1004 spans across four specimens lost their filter colouring while 89 filter operands read as
  links. Both now end at the next line that OPENS a block, which contains a runaway without
  cutting a body short.
- A code span's backtick paints with the code it wraps. It carried `keyword.control` beside the
  run rather than nesting inside it, so it matched its own code in none of the 65 themes; nesting
  it, the way markdown, asciidoc and mdx all write it, agrees in 66%. A fenced block keeps a
  delimiter scope of its own, since 38 of 65 themes leave one nesting there uncoloured.
- An angle bracket carries no verdict. TiddlyWiki builds a node for every one — measured against
  twenty-four shapes and across five grounds, it refuses at none — so `<< not a sigil>>`, a `<`
  in prose, and a macro call the parser declines all read as the text they render. The verdict
  had marked one hundred and forty-four spans, seventy-four of them in TiddlyWiki's own
  documentation.
- A construct left unterminated stops at the blank line that ends its block, the way TiddlyWiki
  stops it. Eight rules named only their closing delimiter, so one unclosed opener took the rest
  of the file: every construct after it coloured as that rule's interior and the stray-bracket
  verdict fired on markup standing in plain sight. A single unclosed `@@` cost sixty-two
  quoteblock spans their colouring and manufactured twenty-eight verdicts in one file. Hard line
  breaks still run to the end of the source, which is where TiddlyWiki runs them.
- A `.tid`, `.multids` or field value colours a stray angle bracket the way a `.tw` file does. An
  injection written inside a grammar fires only where that grammar stands at the top, so a body
  another grammar wraps took no verdict at all. The verdict stands in one grammar registered to
  every scope, and each region handing text to the wikitext grammar now says so in its own scope
  name, which is what lets one selector reach all of them.
- A backtick-quoted attribute value colours the substitutions TiddlyWiki expands in it. The
  rules name the quoting width in the middle of the emitted scope — `single` for one backtick,
  `triple` for three — and the injection selected a name carrying no width, which matches at dot
  boundaries and so reached neither. A `$(name)$` or `${ filter }$` inside such a value stood as
  flat text in every file type. It carries the two forms `getSubstitutedText` expands and leaves
  `$name$` literal, which is what a widget attribute renders.
- A `.tid` file paints a definition body the way a `.tw` file does. Four grammars wrap the
  wikitext grammar and each keys its injections on its own scope, so the wrapped grammar's never
  fire. The `.tid` grammar carried a hand-written pattern in place of the shared rules, naming a
  scope no other grammar emits: inside a `.tid` define body `$name$` and `${ filter }$` coloured
  nothing at all, and `$(name)$` coloured under a name no theme reaches from the wikitext side.
  The `.multids` grammar omitted one rule of three. Every wrapper carries the same three, and the
  gate finds wrappers by what they reference rather than by a list, since a list named two while
  two more carried defects.
- Every grammar wrapping the wikitext grammar paints a definition body the same way. A wrapper
  keys its injections on its own scope name, so the wrapped grammar's never fire, and each wrapper
  writes the selector and the rules beneath it again. Both wrappers omitted one rule of three: a
  `${ filter }$` placeholder inside a `\define` body coloured ten spans in a `.tw` file and none
  in a `.mem` or `.tw5.test` file. The gate compares the rules a wrapper injects, not only the
  selector it injects them on, since a wrapper spells a rule by the grammar holding it.
- The memetic dialect colours a definition body and a stray angle bracket the way wikitext does. A
  grammar wrapping another keys its injections on its own scope name, so the wrapped grammar's
  never fire — and this one carried none of them. Inside a `.mem` file a `\define` body left its
  `$name$` uncoloured, and a stray `<` took no verdict, both of which a `.tw` file gets right. The
  dialect carries the two injections its wrapper needs, and a gate holds every wrapper's selectors
  equal to the wikitext grammar's, since a copy cannot derive from its original at load time.
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
- Every named parameter carrying a `lar:` URI or a `?` takes quotes. `param=value` reads as TW5 call
  syntax and a URI scheme spells with the characters a parameter name admits, so a bare
  `to=lar:///x` risks binding a phantom parameter while the slot receives nothing — silently, with
  no error a reader would notice. 47 values across 18 carriers: 44 through the house's own
  parser-classified `quote-named-params`, which refuses any value whose TYPE would change and
  re-parses every file before writing it, and 3 in retired fixtures the parent's tool cannot reach —
  it lists carriers through `git ls-files` at the parent root, where this submodule stands as one
  gitlink entry.
- The reading carries `fontStyle` beside foreground. A reader tells bold from italic without reading
  a word and most themes carry that in fontStyle alone: measured on foreground by itself, bold
  parted from italic in 23 of 65 and the gate would have called a healthy grammar broken one family
  further along. Two pairs seated under the older reading ROSE — a wikilink against prose from 61 to
  65, a code span against a wikilink from 59 to 65 — because a wikilink's underline never showed in
  a foreground. Nothing fell.
- Folding stops treating a blank line as part of the block above it. The off-side rule says an
  indented block continues across blank lines, and TiddlyWiki ends a block AT one —
  `wikiparser.js` takes `/\r?\n\r?\n/` as the boundary. Of the indented lines in TiddlyWiki's own
  tiddlers three quarters carry prose, which nests nothing, so the rule offered regions the format
  never had. Region markers keep folding what an author marked.
- An indented widget tag alone on a line lost to the paragraph fallback, because the fallback's
  zero-width `begin` matched the line's own start while the tag's own opener could only match
  where the tag itself began — a race the leading whitespace let the fallback win. The tag rules
  now admit the same leading `[ \t]*` a list or heading marker already does, so the tie the block
  dispatch already resolves in the tag's favour applies here too. Traced against the oracle:
  `<$link to="x"/>` alone on an unindented line already stood outside any paragraph; indented, it
  now does too.
- The paragraph fallback's own end, `^$`, never closed on a whitespace-only line. TiddlyWiki reads
  a line of only spaces or tabs as a blank line — `wikiparser.js` splits blocks on
  `/\r?\n\r?\n/`, which a whitespace-only line satisfies — so the fallback now ends on
  `^(?=\s*$)`, a zero-width match that closes the region without folding the whitespace line's own
  characters into it.
- `<![CDATA[` named no element TiddlyWiki's `html.js` rule reads — its tag name admits
  `[a-zA-Z0-9\-\$\.]`, and `!` stands outside it — so the host keeps the whole construct, angles
  and all, as plain text even inside an `<svg>` or `<math>` element, and the rule that painted it
  as a tag retired. `meta.tag.metadata.cdata.html.tiddlywiki5` and
  `string.other.inline-data.html.tiddlywiki5` retire with it; `MIGRATION.md` records both.
- A URL'S SCHEME PAINTS AS ONE UNIT, RULED 2026-09-18 (`lar:///url-scheme.paints.free`). Collided
  `docs/prior-art/synthesis.mem` §D's golden principles — TextMate's own test, "would I want these
  two elements styled differently?", and the asciidoctor-vscode double-scope rule at
  `docs/scope-naming-prior-art.mem:469` — against the field: VS Code's own Markdown grammar paints
  a whole autolink as `markup.underline.link.markdown` with no scheme scoped apart from it, and VS
  Code's HTML grammar treats an `href` attribute's scheme identically to the rest of the string —
  no surveyed grammar answers "yes" to TextMate's question for a scheme against its own URL. RFC
  3986 still draws a real boundary (scheme ends at the first `:`; `//` opens the authority only
  where a scheme carries one), so painting `scheme:` or `scheme://` as one unit costs nothing new
  where a name already exists to widen. Measured: free on the bare autolink under its own
  per-scheme name (`markup.underline.link.external.$1.tiddlywiki5`, widened to cover the
  delimiter, `$1` now the whole unit and `$2` the bare scheme word) — `extlink`'s match in
  `syntaxes/tiddlywiki5.json` widened accordingly, alternation reordered `https` before `http`
  (the 9-scheme list stays extlink.js's own, never `obsidian`). Inside a `[[go|https://…]]` or
  `[ext[https://…]]` target the same spelling costs 2 floors, so those targets reach for the
  field's OTHER free option instead: `entity.name.scheme.$1.tiddlywiki5
  support.type.scheme.$1.tiddlywiki5`, a genuinely different pairing that keeps the per-scheme
  language suffix every scope here carries, so a user can target this grammar's scheme precisely,
  over the 10-scheme list `utils.js#isLinkExternal` names (`obsidian` included).
  `tests/tiddlywiki5/tiddlywiki5.url-scheme-colour.tw5.test` red-firsts all four spellings. The
  widened autolink span also reaches inside HTML attribute values and `.tid`/`.mem` embeddings
  wherever `extlink` already matched. Both new names interpolate the scheme, as the autolink's
  own name does, so `MIGRATION.md`'s headline counts neither and nothing already published goes
  gone; nine pinned snapshots regenerate to the wider, correctly-split reading with no other drift.
- A FILTER RUN READS AS ITS PARTS — ITS BOUNDS DROP THE OPERATOR FAMILY, RULED 2026-09-18, OVERRIDING THE PRIOR
  ONE-COLOUR RULING at `corpus/delimiter-ledger.txt`'s `parts entity.filter` row: FILTERS NOW READ
  AS PARTS. A run bracket (`[`/`]`, `"`/`"`, `'`/`'`) drops the appended
  `keyword.operator.filter.tiddlywiki5` and stands as `punctuation.definition.filter.run.begin/
  end.tiddlywiki5` alone. A run prefix (`+ - ~ = :name`) moves from `keyword.operator.prefix.*` to
  `storage.modifier.prefix.*.tiddlywiki5` — a modifier ON the run, not the run's own operator (see
  `MIGRATION.md`; `storage` joins the family-root allow-list `tools/invariants/scope-migration.
  test.js` enforces). The filter-step operator name's two spellings —
  `keyword.operator.filter.tiddlywiki5` on a string/indirect step and
  `keyword.operator.operator.filter.tiddlywiki5` on a variable/regexp/multi-valued step — unify on
  the second, the one three of the five step kinds already carried and the one
  `tests/tiddlywiki5/tiddlywiki5.filter-operand-kinds.tw5.test` already asserted; the first
  spelling remains in use, unrelated, on the `{{{ }}}` filtered-transclusion delimiter. A
  variable (`<`/`>`) or indirect (`{`/`}`) operand bracket drops its trailing content family and
  stands punctuation-only, `punctuation.definition.operand.<kind>.begin/end.tiddlywiki5`; a
  multi-valued (`(`/`)`) operand bracket, which carried the exact same scopes as a variable
  bracket, gets its own `punctuation.definition.operand.mvv.begin/end.tiddlywiki5` name in the
  house `mvv` pattern (`tools/invariants/scope-suffix.test.js`'s language-suffix rule holds for
  all of the above). Measured on this tree (per-scope colour price against the 65 bundled
  themes): prefix vs bracket 0→65, prefix vs operator 0→41, bracket vs operator 0→58, variable
  bracket vs value 20→48, indirect bracket vs value 10→45; `construct-legibility` reads 0 fallen.
  The operand-kind brackets collapse to one punctuation colour under this ruling (the glyph still
  differs) — the operator accepted that trade for the parts above. REPORTED, not tuned: the
  `{{{ }}}` filtered-transclusion container bracket against a plain run bracket, unaffected by
  this move on either side, moved from 34/65 to 48/65 apart under the same reading, purely because
  the plain bracket it is compared against lost `keyword.operator.filter`.
  `tests/tiddlywiki5/tiddlywiki5.filter-parts-as-operator.tw5.test` red-firsts every new scope.
- `.multids` ROUTES EVERY TIDDLER'S TEXT THROUGH THE HEADER'S OWN `type`, MIRRORING
  `tw5-tid-file.json:166-186`. `boot.js`'s `application/x-tiddlers` deserializer (~1706-1728) parses
  the header once and extends the same fields — `type` included — onto every `title: text` line
  after the blank line, so one declared type governs the whole file, the way `tw5-tid-file.json`
  already routes a `.tid` body. `tw5-multids-file.json` gained `#typed-body`: a `type:` line for
  `application/json`, `application/javascript`/`text/javascript`, `text/css`, `text/html`,
  `image/svg+xml`/`text/xml`/`application/xml`, `text/x-markdown`/`text/markdown`, and `text/plain`
  opens a region that never closes, inside which each `title: text` line's text embeds the named
  guest grammar (`source.json`, `source.js`, `source.css`, `text.html.basic`, `text.xml`,
  `text.html.markdown`) under `meta.embedded.line.<lang>`, or stays deliberately unhighlighted for
  `text/plain`, matching TiddlyWiki's own treatment. A header naming no type, or a type nothing
  here names, still reads every line as wikitext — the control this ruling never touches.
  MEASURED AND CORRECTED IN THE BUILDING: a `match` rule's captured group cannot carry a reliable
  cross-grammar `include` on this engine — proven against `tw5-fields.json`'s own working
  wikitext-in-a-value embed, which resolves only under its own file's literal scope name and fails
  identically when the same repository content is copied under a different one — so every routed
  type embeds through a `begin`/`end` block with `contentName`, the same shape
  `tw5-tid-file.json` already carries, rather than a captured `patterns` array. Nine sample
  fixtures under `tests/samples/multids-*.multids` pin one routed type each plus the no-type
  control; `tests/tiddlywiki5/multids.lines.tw5.test` (pre-existing, control-only) still holds
  unchanged.
- THE MANIFEST GAINS AN `embeddedLanguages` MAP, NAMED AND COUNTED. Both wikitext grammar
  contributions (`text.html.tiddlywiki5` and `text.html.tiddlywiki5.test`) declare one, keying each
  `meta.embedded.block.<lang>` region this grammar emits to the VS Code language id that owns it —
  24 entries per contribution: c, coffeescript, cpp, csharp, css, html, ini, java, javascript, json,
  makefile, markdown, memetic-wikitext, objective-c, objective-cpp, perl, python, ruby, shellscript,
  sql, toml, xml and xsl. This is the manifest mechanism behind "A fenced block hands its guest
  language to the editor, not only to the colourer" above: folding, comment-toggling and bracket
  rules follow the guest language across a fence because this map tells VS Code which editor
  behaviour to switch to there, not because of anything the grammar colours.
- RULED 2026-09-21: A NAMED FILTER RUN PREFIX'S OWN OPERATOR READ UNCOLOURED. `:sort[title]` — the
  shape an author reaches for after `:sort`, `:filter`, `:map`, `:reduce` and the rest of the
  named run prefixes when they forget the operand bracket TiddlyWiki actually demands (they mean
  `:sort[title[]]`) — painted `title` with only the run's own `entity.filter.operator.title`
  contentName, none of the five operator-step patterns firing because every one of them mandates a
  trailing `[`/`{`/`<`/`(`/`/` bracket after the operator name. `[sort[title]]`'s `sort` (a
  genuine operator WITH an operand) reads `keyword.operator.operator.filter.tiddlywiki5` beside
  that same contentName; `:sort[title]`'s `title` did not. Traced against `filters.js`:
  `:sort[title]` actually THROWS `Missing [ in filter expression` at runtime — the operand bracket
  is never optional — so this is graceful parsing rather than a semantic claim: a sixth
  operator-step pattern paints a bare word standing immediately before the run's own closing `]`
  the same operator colour, so the author's typo still shows where they meant an operator name
  rather than reading as inert content. The pattern excludes quotes and whitespace from what it
  captures, so it can never mistake a bare QUOTED operand for the empty/default operator —
  `["Not Legal"]`, equally malformed on its own terms but a STRING, never a name — nor trailing
  space ahead of a multi-line operand's own closing `]`; both were measured regressions during
  development (`corpus/samples/test.tw`'s `:test["Not Legal"]` and a multi-line indirect operand
  in `tiddlywiki5.tw`/`tiddlywiki5.basic.tw`) and both snapshot clean again with the exclusion.
  `npm run colour-witness` and both overreach-check sweeps (`tests/samples/*.tw` and the 389-file
  host corpus) read unchanged; `tests/tiddlywiki5/tiddlywiki5.filter-run-prefix-operator.tw5.test`
  is the red-first control, its red state independently reproduced by tokenizing the pre-ruling
  grammar directly through `vscode-textmate`.

### Naming
- A STYLED SUFFIX'S TEXT IS A VALUE, NOT A MARK. `filteredtranscludeinline.js` closes on `}}`, an
  optional style, then `}`, and the grammar named the whole `}}style}` run one delimiter — so the
  style text between the braces wore the closer's own punctuation, and ablating one of its letters
  changed nothing in the tree. The closer now names `}}` and the final `}` punctuation and gives the
  style text a value scope of its own, reading it the way an inline `@@…` style's declarations do.
  Two ablation-ledger entries retire; an empty `{{{}}}`'s own pre-existing quirks — its filter group
  needs at least one character, so the filtered rule never matches it at all: the host's plain
  transclude rule reads one brace narrower on each side instead, and a NEIGHBOURING empty filter
  makes the host's regex scan on and swallow every opener after it by one pair — now surface as two
  expected-divergence rulings instead of hiding inside the wider mark.
- A GLYPH READS AS PUNCTUATION AND THE WORD READS AS ITS FAMILY. Stacking a construct's content family
  onto its own marker made the two read as ONE colour: measured in the bundled set, a call's angles parted
  from its name in 0 of 65 themes and a transclusion's braces in 7. Sixteen marker sites drop the stacked
  family — `<<`/`>>`, `{{`/`}}`, `[img[`, `[ext[` and a closing sigil's `/` — and each reads as the
  structure it is, beside a word carrying the family it names. The `[[`/`]]` link, which never carried the
  stack, is what the rest now match.
- THE STACK REPAIR LANDED ON TWO FAMILIES OF THREE. The declared distinctions and unities read the
  stack a reader meets; the opener/closer pairs and the things-met-as-one went on asking each scope
  alone, and a half-migrated instrument reads exactly as green as an unmigrated one. All four families
  resolve stacks now — the 52 pairs harvest theirs FROM THE CORPUS, so no pair needs a specimen written
  by hand and a pair no carrier exercises reports itself instead of passing quietly. The first harvest
  keyed by innermost scope alone and called 23 of 52 pairs unexercised, `{{` among them, because a
  delimiter that publishes one name and stacks a second ends its stack on the second; the index reads
  every scope a stack carries.
- TWO PAIRS PART, AND THE CONTROL SETTLES WHOSE READING IT IS. `</style>` and `</script>` carry
  `source.css-ignored-vscode` on their `<` — VS Code's own marker for ending embedded-language
  detection — so the closer's stack ends on a `source` scope and the four Catppuccin themes rule on
  `source` above `punctuation.definition.tag`. The real `html` grammar builds the identical stack and
  parts its own pair in the same four themes. `corpus/colour-pair-ledger.txt` rules both, and a ruling
  whose pair stops parting retires with it.
- A BLOCK CHECK WORE NO FAMILY ITS MARKS COULD INHERIT. A `lar:` address carries an enclosing
  `markup.underline.link.lar`, and every separator inside it inherits a themed ancestor; `ni:///sha-256;…`
  carried none, so its `:`, its three `/` and its `;` fell to prose in 35 of 65 themes — in a stamp the
  house writes on every carrier. It takes `markup.underline.link.ni` now, and its digest's prose reading
  halves. `tools/invariants/a-uri-wears-its-family.test.js` derives the schemes from the grammar's own
  scheme names, so one added tomorrow answers the same day. What remains sits in the flagship's band:
  markdown's own autolink punctuation reads as prose in 32 of 65 and its body in 25, where this
  grammar's external link reads 0.
- A CALL'S NAME AND ITS ANGLES TAKE `support.function.macro` beside the published `variable.name.macro`,
  because a macro IS a function the wiki provides. Measured: 58 of 65 themes reached the published name
  and 22 of those left the colour exactly where the editor had it, so `<<greeting>>` read as body text
  to a third of readers while every coverage gauge held green. With the name added, 64 reach and ONE
  leaves it. Added, never swapped — nothing retires, no reader's `editor.tokenColorCustomizations` entry
  stops matching, and the swap's measured cost (a call's name against a widget's, 61 themes to 33)
  never arrives.
- THE FAMILY CEILING, NAMED AND RULED. Every `variable.*` spelling resolves through `variable` in the
  themes that rule on the root, so all six of this grammar's variable-family names read identically:
  58 of 65 reach, 22 of those buy nothing. `variable` is the single most-shipped leave-it-alone
  selector in the bundled set. No truthful rename escapes it — every `support.other.*` spelling
  measures 20 of 65 invisible, and the three loud alternatives buy their colour by naming a filter
  operand or a multi-valued variable something it is not. `corpus/prose-reading-ledger.txt` rules the
  five that remain, held apart from `PlainConstructs` because that list rules the OTHER fault — a
  construct no rule reaches — and the two cures differ.
- A WIKILINK'S TARGET NAMES A REFERENCE THE HOST DEREFERENCES, and `variable.other.reference` writes
  that shape — the same name a transclusion's text reference already carries, for the same reason.
  Standing last so a theme ruling on it decides, it parts the target from the caption in 57 of 65
  themes where the published name alone parted them in 16, against a floor of 40, and the target reads
  as prose in none of them either way. This answers the red the gate's own repair surfaced.
- THE `((mvv))` NAME NOW CARRIES A SEARCH, NOT AN ATTEMPT, AND KEEPS ITS PUBLISHED NAME. `family-atlas
  --for <scope> --candidates a,b` reports what a candidate buys over the corpus and what it costs in
  the declared distinctions the legibility gate holds — through THAT GATE'S OWN reading, with the
  grammar untouched; the deciding half of `construct-legibility` stands exported and
  substitution-aware, so one implementation answers both callers. Priced over eight candidates drawn
  from the atlas for the `((mvv))` display run: two cut the prose readings in half and drop four
  floors, one reaches zero invisible and drops eight, and the rest drop seven to nine — not one
  leaves the floors standing. The name stays: it drops four declared distinctions below their ratchet
  floors (a dash 59 of 65 against a floor of 60, a heading 51 against 56, a parsermode directive and a
  whitespace directive 64 each against 65) where the four other names in the same family move with
  nothing falling, so the cost belongs to this construct's colour neighbourhood rather than to the
  family, and a floor ratchets up rather than admitting the fork.
- A CARRIER NAMES ITSELF. The frame marker `^` opens a block-check carrier rather than a sigil call,
  and TiddlyWiki reads it as the variable a call names, so the base offered a reader nothing to tell
  a carrier from any other call. The house writes 89 of them. The base CAPTURES that marker, so an
  R-priority injection reaches it nowhere — it rides at L priority beside the arrow and the digest.
 `tools/sigil-shape.js` counts the FORMS the house writes, where `sigil-vocabulary` counts the names.
  A name is not a form: coverage read green for a whole session while the bearing arrow arrived in
  two tokens in every carrier this house writes, because one PROSE specimen reached the arrow's scope
  and the in-sigil form reached nothing. Seven shapes derive from the boot seed — bare, closer,
  fragment, named, positional, quoted and bearing — and a shape the seed writes with no specimen
  behind it fails the gate.
- Two retired names return, ON THE RULE'S OWN CRITERION. `MIGRATION.md` records the dialect keeping
  names only for what wikitext has no construct for, and retiring the rest because a dialect-only
  name painted `.mem` files alone. A sigil's VERB is what wikitext has no construct for; and
  measured, `entity.name.function.sigil` paints in 65 of 65 themes through `entity.name.function`,
  where the retired `meta.sigil.*` family painted in none. A name reaching a conventional root
  reaches every theme; a name inventing a family reaches only the files that carry it.
 FOUR RECOVERY CODES THE HOST DECLARES GAIN A CARRIER APIECE. `unterminated-typedblock`,
  `unterminated-styleblock`, `unterminated-hardlinebreaks` and `unterminated-definition` stood
  unexercised, and a rule nobody wrote a specimen for reads exactly like a rule with nothing to say.
  A block construct that never closes swallows every recovery after it, so each takes a carrier of
  its own. `recovery-witness` moves from 26 diagnostics over 47 carriers and 12 codes to 30 over 51
  and 16, all sixteen standing silent under the whole-document-lookahead ceiling. The code
  population now derives from the HOST's own wiki-rule sources rather than from what the corpus
  happens to raise. Each carrier declares its degradation in `corpus/must-fail.txt` and MEASURES it:
  the typed block bleeds `meta.typedblock` past the file, the style block
  `markup.other.style.styleblock`, the hard-linebreak run
  `markup.other.preformatted.hardlinebreaks`, the definition `meta.directive.variable.macro`. The
  definition parts the two readers on more than a mark — the host reads its body as BLANK while the
  grammar reads it as a body.
- The canon reads the paint. A council measured how this grammar paints its bracketed constructs and
  ruled the reading noisy; collided against both naming references, twenty fetched and tokenized
  grammars, and a re-derivation over the 65 bundled themes, four of the six findings OVERTURN.
  `punctuation.*` names do not buy one binary — 142 of the 145 this grammar emits get reached by a
  selector deeper than the bare root in at least one bundled theme, 121 at `punctuation.definition`,
  and `punctuation.definition.tag.begin.html.tiddlywiki5` reaches 44 themes that way against 8
  through the root. A 44.1% punctuation token share over `corpus/wikitext`, read on the criterion the
  outside measurement uses, sits BELOW html's 45.4% and link-dense markdown's 49.7%. `meta.*` painting
  0/65 reads as the contract holding, quoted from both references, and VS Code's own html grammar
  interpolates a capture into a scope name 79 times, 52 of them under `meta.`. And no grammar in the
  measured population — VS Code's bundles, Vue, AsciiDoc, MediaWiki, Org, DokuWiki, Creole,
  reStructuredText among them — splits a multi-character delimiter into two named tokens; `</` stands
  as ONE token in html, and this grammar's own call already fuses `<<` while carrying a paired name
  on it.
- The delimiter that reads with its content wants the device already shipped here, not a compound
  root. `string.punctuation.definition.operand.*` and its five siblings across `variable.` and
  `entity.name.` put an invented segment above the tail, so they degrade to `entity.name` and never to
  `punctuation.definition` — the house's own law names that as severing a chain, a literal search for
  `string.punctuation` across thirteen flagship grammars returns zero, and the two grammars that come
  close each carry an accompanying defect. The heading already writes the canonical spelling,
  `punctuation.definition.heading.tiddlywiki5 markup.heading.punctuation.definition.tiddlywiki5`, an
  intact chain first and the painting family last — the exact order VS Code's own Python grammar uses
  twelve times. Measured: the conversion costs the delimiter-reads-with-content relation in one to
  four themes per operand kind, so it stands recorded rather than shipped.
- A container names what every glyph inside it falls back to, and two of them name almost nothing.
  `markup.link.tiddlywiki5` paints 8 of 65 and `markup.other.image.tiddlywiki5` paints 2; under
  `markup.underline.link` and `markup.underline.link.image` both paint 48, and a pretty link's
  brackets read its caption's colour in 29 themes rather than 5 — the whole fold effect, with no
  punctuation name touched and nothing invented. AsciiDoc reaches it the same way, by declining to
  capture its macro brackets at all.
- TiddlyWiki parts a call's named parameter from a widget attribute, measured against the checkout
  rather than read off the source. A call's parameter carries `assignmentOperator` in the tree and may
  spell `:` or `=`; a widget attribute carries no such field and admits only `=`; a call admits a
  positional parameter and a widget does not; and the two name regexps differ over the colon. So the
  `=` families stand correctly apart. The argument NAME does not: it reads one colour in 6 of 65
  themes across the two constructs, and the closest analogue anywhere — MediaWiki's
  `{{Template|name=value}}` — seats a named argument on a markup surface at
  `entity.other.attribute-name`.
- `npm run delimiters` reads what a delimiter INHERITS from the content it bounds. `contentName`
  names a region's interior alone, so the marks that open and close it fall outside the content
  family by construction and nothing downstream notices. Derived over `syntaxes/`: 107 contentName
  rules across 8 grammars, 39 shapes, each ruled in `corpus/delimiter-ledger.txt` as a parting that
  serves a reader or costs one. One declaration sits on a `match` rule where vscode-textmate reads
  the field nowhere — measured on every run, with and without it, against a control on a begin/end
  rule where the field DOES move the reading. Twenty-six cover their own marks, sixty-eight part, and
  NOT ONE stacks its content family onto its delimiters. Most partings serve: a fence a reader must
  see, or a `meta.*` content no theme paints. Seven cost one — the emphasis family, whose marks
  belong to their run and stand outside its weight — and an eighth already carries the additive
  device spelled the wrong way round. Every remedy stands OWED; `syntaxes/**` untouched.
- `SCOPE-NAMES.md` states the rule this repository names its scopes by, which three precedents
  already decided and no page recorded: a scope name reads as A PROMISE ABOUT MEANING, so it says
  what a span IS and never what colour the name would inherit. `keyword.control.list` reaches 100% of
  themes and calls a bullet a keyword — declined. Borrowing markdown's list-marker name measured +19
  points — declined. The count of names this policy moved stands in `MIGRATION.md`, not here.
  `tools/invariants/scope-name-policy.test.js` holds the three parts a machine can check
  and, run at a floor of zero, found EIGHT standing violations nothing had reported: seven names
  nesting `punctuation` under a content root — a shape returning zero across thirteen flagship
  grammars, which Sublime's own guidance rules against — and one where a dropped dot fused `html`
  onto `tiddlywiki5` and left a name no selector reaches from either side. Both stand pinned at their
  floor rather than cured. The fourth rule stays prose, because the only name a mechanical check
  flags names an XML processing instruction, where `xml` says what the span holds.
- PUNCTUATION STACKS, NEVER NESTS, AND SEVEN NAMES DID THE OPPOSITE. A filter operand's brackets
  spelled themselves `string.`, `variable.` and `entity.name.punctuation.definition.operand.*`, and
  a heading's `!` mark carried `markup.heading.punctuation.definition` beside its own name. No span
  is a kind of string-punctuation; measured across thirteen flagship grammars that literal shape
  returns zero, and Sublime's own guidance rules against it. Each stands as two scopes on one span,
  the punctuation name first and the content family LAST. Measured: a theme reached the operand
  brackets through the content root alone — `string` in 62 of 65 bundled themes, `variable` in 58,
  `entity` in 40 — and through `punctuation` in NONE, because the name buried it where no
  dot-bounded prefix reaches. The content scope stands innermost, so the marks paint the colour they
  painted before and 40 themes' punctuation rules now reach them. 820 legibility pairs and 424
  colour-witness scopes moved by zero.
- THREE EMPHASIS MARKS WEAR THEIR RUN, AND FOUR DECLINE. `contentName` covers a region's interior,
  so an emphasis run's marks stand outside the family their run carries and a theme's weight stops
  at the text. Measured one family at a time against a control arm stacking nothing: a subscript's
  marks, a superscript's marks and a hard-linebreak run's fences take `markup.subscript`,
  `markup.superscript` and `markup.other.preformatted.hardlinebreaks` at a cost of ZERO across all
  820 pairs. Bold costs three pairs, italic three, and the underline and strikethrough families four
  between them — worst a fall from 46 themes to 28 on a system link against an underline run.
  `corpus/legibility-floor.txt` rules that a count may rise and may never fall, so those four stand
  DECLINED with the numbers that declined them. The two deepest falls share a cause standing outside
  these rules: this grammar names a link `markup.underline.link.*`, so widening the underline family
  over a whole run collides with it head-on.
- A RULING NAMES A CONSTRUCT BY ANY OF ITS CO-DECLARED NAMES. The grammar stacks several names in
  one rule's `"name"` — `support.function.macro … entity.name.function.macro` — and a finding
  reports ONE of them, so a ruling written against a sibling matched nothing and read as explaining
  nothing. `matchingRulings` reads the reported name and every name co-declared beside it, derived
  from `declaredNames` over every grammar the manifest registers; a container comes from a separate
  rule and never joins the group, so the widening excuses no span a ruling never named. Seven
  rulings duplicating a sibling stand retired, and so do the rulings whose divergence closed —
  where the host and the grammar now agree, read from the host's own tree at the exact offset.
- A grammar's own `name` stopped counting as a scope. It sits beside `scopeName` and names the
  language, and three collectors read it as a scope — nine words across eight grammars, none of them
  reachable by anything, each inflating the count the corpus answers to and standing forever among
  the scopes reported as handed to another grammar. 526 declared reads 515. The collectors collapsed
  onto the one that already had it right, in a comment beside the check.
- A HEADING'S TEXT READS AS MARKUP, NOT AS A DECLARED NAME. It wore `entity.name.section` alone, the
  shape markdown publishes, and themes rule on the `entity.name` root a transclusion's title and a
  call's name share, so heading text read as one colour with a transclusion in 33 of 65 themes and
  with a call's name in 18. It keeps the published name and carries `markup.heading.section` last:
  measured, 17 and 9. Two legibility floors re-seat on the ruling, recorded beside it in
  `corpus/legibility-floor.txt` — an entity against a heading 59 to 57, a bare external link against a
  heading 65 to 64 — and no other pair moves down.
- A SIGIL'S `~` READS AS THE DIALECT'S KEYWORD. TiddlyWiki reads `<<~ set …>>` as a call on a
  variable spelled `~`, and the base names it the called name, which read in the verb's colour in no
  bundled theme. The dialect names it beside that reading as the sigil's MARKER —
  `punctuation.definition.sigil.marker` then `keyword.control.sigil.marker`, so the keyword decides
  the colour — and it is a marker rather than an opener because closers carry it too (`<<~/ahu>>`).
  It rides only an injection keyed on the base's call-name scope, so a `~` in prose, in a comment, in
  a raw fence or in a typed block keeps its own reading, and the word "macro" in a sentence stays
  prose. The sigil relation's reason restates that each glyph reads as what it does: the marker as the
  dialect's keyword, the `/` close mark as quiet punctuation.
- A CALL'S ARGUMENT KEY PARTS FROM THE NAME IT IS PASSED TO. The key carries
  `support.type.property-name.argument` appended after `entity.other.attribute-name.argument`, which
  stays first for every theme ruling on it. A theme painting `entity.name.function` and
  `entity.other.attribute-name` alike — gruvbox paints both #fabd2f, and 20 of 65 themes read name and
  key as one colour — now rules on the property-name family apart: the call-against-argument relation
  measures 63 of 65 where it measured 45, and re-seats there. A widget's attribute keeps its own
  family alone, because extending the name to it drops the re-seated `a widget vs a call` floor. No
  legibility floor falls, and colour-witness flattens nothing.
- EVERY OPENER SEATS IN ONE NAMESPACE, and a called thing reads as a widget does. A reader meets
  `{{`, `<<`, `((`, `<`, `<$` and `<%` as one gesture — something opens here — so each carries a
  `punctuation.definition.tag.*` name beside its own. A macro's name carries
  `entity.name.function.macro` and a widget's `entity.name.function.widget`; themes rule on the
  `entity.name.function` root the two share, so a call and a widget read as one kind of thing. A
  link's `[[` keeps its own punctuation name rather than the shared one: of four arrangements priced
  against all 820 legibility pairs with the grammar untouched, that one alone improves on changing
  nothing, at 7 pairs fallen and 0 newly broken. Those seven re-seat with the ruling recorded beside them in
  `corpus/legibility-floor.txt`, and the call-against-argument relation re-seats 50 to 45 in
  `$:/tw5-syntax/ReaderRelations` with the control that settles whose loss it reads as. A mark-level
  split handing `a widget vs a call` its 55 back reaches NOTHING — both names resolve to one scope a
  theme rules on — so the fork stays shut by measurement rather than by preference.
- A CALL'S MARKER NAMES THE CALL, never the bare word. `punctuation.definition.tag.macrocall.*`
  carries it, so the invariant reading a published name's last dot-segment finds a call's NAME where
  it looks for one and a delimiter nowhere in that answer.
- A pretty link's `[[` and `]]` each arrive as ONE token. No grammar among twenty splits a
  multi-character delimiter into two separately named sequential tokens — VS Code html emits `</`
  as one token, Liquid's `{%-` as one token of three characters, Handlebars' `{{~{>` as one of
  arbitrary length, and the TextMate 1.x manual's own `captures` example fuses `@selector(`.
  Measured across the 65 bundled themes, the two halves painted identically in every one, so the
  split reached machines and no reader. The outer and inner names stand where the brackets enclose
  different things — `[img[` opens an attribute list and then a source, `[ext[` a caption and then
  an address — and both keep them. Three names retire into
  `punctuation.definition.link.begin`/`.end`, each with a `MIGRATION.md` row;
  `punctuation.definition.link.outer.begin` still stands, on `[ext[`.
- A call's argument name answers to its SURFACE. A call writes a named argument on a template
  surface, the way html, Vue, JSX, Liquid, Handlebars and MediaWiki's own `{{T|name=v}}` do, so the
  twelve sites in `macro-parameters` carry `entity.other.attribute-name.argument` beside the
  `variable.parameter` they publish, the new name standing LAST where a reader sees it. A
  DECLARATION keeps `variable.parameter` alone — TextMate 1.x seats that name "when the variable is
  declared as the parameter" — and the pragma rules stand untouched. Measured over 65 themes: a
  call's name told apart from its own argument in 25, and in 57 under the surface's family; a
  call's argument and a widget's attribute now read as one colour in 59. Two APART relations stand
  seated in `ReaderRelations` and `colour-witness` holds them, the widget pair at 47 as the control.
  Five legibility floors fell once and stand re-seated with the trade recorded beside them — a call
  reads more like a widget, a typed block and an import directive — thirty-two themes gained against
  thirteen lost.
- The `=` families stand APART, and the host says why. `parseutils.js#parseMacroParameterAsAttribute`
  records which of `=` and `:` an author wrote in `node.assignmentOperator`, then opens the filtered,
  indirect, macro, MVV and substituted value grammars ONLY when it reads `=`; `parseAttribute` offers
  a widget every value form either way. So a call's `=` keeps `keyword.operator.assignment` and a
  widget's keeps `punctuation.separator.key-value`, and the two answer different questions rather
  than spelling one thing twice.
- THE WEAK CONTAINERS STAND, MEASURED AND DECLINED. `markup.other.image` paints 2 of 65 themes and
  `markup.link` 8, and renaming them to `markup.underline.link.*` neither lifted the pair it was
  meant to lift — an image against a parsermode directive held at 55 of 65 — nor came free: seven
  seated pairs FELL, an image against a system link from 65 to 30, an image against a wikilink from
  62 to 40, a wikilink against a system link from 61 to 36. A container paints only what its own
  interior scopes fail to reach, and it hands every token inside its `fontStyle`, so
  `markup.underline` underlines a link's brackets, its separator AND the title behind it: measured
  through vscode-textmate itself, a link's visible text parted from the title it reaches in 40 of 65
  themes and in 15 after the rename. `colour-witness` read green through all of it, because APART
  weighs two scope NAMES and no stack carries them.
- A SIDECAR'S `type:` names the file BESIDE it. `sidecar.meta` declares `image/png` and holds no body
  of its own, so a reader handing the sidecar's own text to the image parser reads a tiddler nobody
  wrote — measured, that took light-cone from 35 divergences to 134.
- The fence labels follow the shape the ecosystem keeps. Measured across the 242 grammars this
  repository loads: 164 carry no alias at all, the mean is 0.43, the most any one carries is five,
  and no alias anywhere holds a slash or a dot. Wikitext answers to `tiddlywiki` with `tw`, `tw5`,
  `tiddlywiki5` and now `tid` beside it — an extension among the aliases, the way `js` carries
  `cjs` and `yaml` carries `yml` — and the dialect answers to `mem`, `memetic` and
  `memetic-wikitext`. Each keeps its MIME type too, against that shape, because a MIME type is
  TiddlyWiki's own vocabulary: a `type` field spells one and a `$$$` block dispatches on one.
  Neither claims `wikitext` or `wiki`; the ecosystem owns both, and they mean MediaWiki.
- A variable TiddlyWiki's core defines reads as the language's own rather than as an author's.
  `<<currentTiddler>>` and the `tv-` family carry the family a theme keeps for a reserved name —
  measured, they read apart from an author's macro in 41 of 65 themes — while a name that merely
  opens with a core name stays the author's. The names live in a wiki edition beside the grammar,
  where an operator weighs an addition against what the core documents; the grammar carries what
  the wiki says, and a gate holds the two together.
- A widget reads apart from an HTML element, and a system title from one an author wrote. Both
  pairs open the same way and mean nothing alike, and both read identically in every bundled theme
  until now: a `<$list>` coloured as a `<div>`, and `$:/core/Something` as any other title. Each
  carries a second name so a theme can tell them apart — measured across 65 themes, a widget now
  reads apart in 57 of them and a system title in all 65. In the memetic dialect the carrier's own
  control mark reads apart from a sigil's sharktooth in 56, where before it read apart in none.
- Strikethrough, table cells and list markers reach more themes. A struck run carried only the
  underline family, a table cell carried `markup.other`, which Sublime's reference sanctions and
  no theme reaches, and a list marker named itself alone. Measured over 65 themes: a struck run
  63% to 69%, a table cell 14% to 23%, and a list marker onto the name every markup grammar
  writes for one. The marker holds at 72%: the themes it still misses rule on markdown's own
  marker scope by name, and this grammar names no language but its own.
- Headings, links, code spans and list markers carry the scope names themes already colour. A
  theme writes its rules against the vocabulary markup grammars share, and six of the seven
  bundled ones name a heading `markup.heading` while this grammar named it `meta.heading` — which
  9 of 65 themes colour, against 65 of 65 for the same heading in markdown. Measured across those
  themes: heading text 14% to 94%, its marker 91% to 97%, a link's caption 72% to 100%, a code
  span 60% to 71%, a list marker 65% to 72%.
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
- A scope name says what it means. Four templates emitted names no selector could reach: a
  parameter name interpolated a capture group its own pattern never declared, so every pragma
  parameter read `tw-$1`; a text-reference index and a triple-quoted substitution each carried a
  literal double dot, leaving an empty segment; and a filter step interpolated an operator name
  and suffix that may hold a space, a comma or nothing at all, splitting one name into two that
  no theme matches. The filter step keeps its own captures, which name the operator and suffix
  already.
- POSITIONAL values stay as they stand, deliberately. The boot seed's own
  `<<!DOCTYPE … lar:///…>>` reads bare, and the house holds a separate tool for the positional
  hazard with a declared exemption for the carrier whose lesson IS the broken form. Quoting them
  here would diverge from canon.
- A text reference carries `variable.other.reference.tiddlywiki5` beside the name it publishes. The
  `string.` family carried five of six constructs against 62 of 65 themes, and the weakest pair in
  the table sat squarely in it: a transclusion wears `string.text-reference`, a wikilink wears
  `string.other.link.title`, and a theme ruling on the one-segment root painted both bodies one
  colour while both punctuations fell to the default. Traced on `andromeeda` before the aggregate
  was believed. TiddlyWiki's parser assigns a text reference the INDIRECT kind — a name it
  dereferences against the store, never string content — so the family shape stands FIRST and
  `string.text-reference` stands LAST and keeps any tie. Measured: a transclusion parts from a
  wikilink in 58 of 65 rather than 54, and no other pair of the seven specimens moves.
- A raw span carries `markup.inline.raw.string.tiddlywiki5` — the family shape markdown, asciidoc
  and mediawiki all write, under this grammar's own suffix, standing FIRST so a theme naming this
  grammar's own scopes keeps any tie. Measured over 65 bundled themes, a code span parted from prose
  in 53 and parts in 56; no other pair of constructs reads closer, and the weakest pair anywhere
  moves from 53 to 54.
- The `string.` family stands taken, which the attempt surfaced. A wikilink wears
  `string.other.link.title` and a transclusion wears `string.text-reference`, so a third construct
  named into that family reads as those two wherever a theme rules on the family root: giving the
  span `string.other` gained 4 themes against prose and cost 8 against a transclusion and 2 against
  a wikilink. The per-pair floor caught the trade the run it landed. `string.quoted.other` reaches
  58 and calls a raw run a quoted one; `support.type.raw` reaches 58 and calls it a type the
  framework provides — both declined, the ruling `keyword.control.list` already drew at 100%.
- A runaway names its region by KIND, innermost-first, in one vocabulary two witnesses read
  (`tools/region-kind.js`). `still` and `swallow-witness` both keyed on the first
  meta./source./string. scope in the stack, which stands OUTERMOST, so one cause filed under
  whichever region enclosed it — a call opening a block keyed as a call, the same call opening
  inside prose keyed as a paragraph. `markup.*` names no kind deliberately: it stands on 38% of
  corpus tokens and would absorb any finding. A stack no kind claims reads UNCLASSIFIED and gets
  examined rather than filed under its container.
- Every call site names a call beside the name it publishes. `<<name …>>` reaches a macro, a
  procedure, a function or a custom widget, and nothing at the site says which — TiddlyWiki refuses
  to guess and builds a `transclude` carrying `$variable`. Twenty-five sites gained
  `meta.variable.call.*`, `punctuation.definition.call.*`, `variable.name.call` and
  `variable.call.attribute.html`, each standing BEFORE the published name, which keeps the tie in
  `winner()` and leaves a reader's `editor.tokenColorCustomizations` reaching what it always
  reached. Measured across 3336 corpus tokens and 65 themes: no colour moves.
- A shared injection stands in one grammar and reaches every scope. A TextMate injection keys on a
  scope name, and a grammar wrapping another carries a different one — so an injection written
  inside the wikitext grammar fires only there, and each of the four wrappers had to copy it.
  Every copy that drifted or went missing cost a dialect its colouring silently: a `.tid` body its
  parameter placeholders, a `.mem` body all three, a `.tw5.test` body one of them. The substitution
  injection ships as its own grammar, registered to inject into every scope the manifest declares.
  Adding a scope means adding it to one list; forgetting one leaves the injection reaching nobody,
  which a gate reads at once. Colouring stands identical across all four dialects, with no snapshot
  moved.
- `((` AND `))` LEAVE THE OPENER FAMILY THE 2026-09-17 RULING SEATED THEM IN. `((x))` DISPLAYS a
  variable's held values, the way `<<x>>` displays a macro's or transclusion's result — the two are
  the same gesture, read and write, over what a name already holds. `{{x}}` instead INSERTS a
  tiddler's content, an unrelated gesture, so pairing `((`/`))` with `{{`/`}}` under one shared
  `punctuation.definition.tag.*` root bought the seven-pair opener-family reading at the cost of the
  distinction that actually matters here: which gesture a reader is looking at. `((`/`))` drop
  `punctuation.definition.tag.mvv.tiddlywiki5` and the display run's name takes
  `entity.name.function.mvv.tiddlywiki5`, appended after the published `variable.name.mvv-display`
  name exactly as a macro call's name carries `entity.name.function.macro` beside its own —
  `((x))` now reads as `<<x>>` does, apart from `{{x}}`. Measured: 0 pairs of 820 fall, 25 rise (a
  dash, a heading, prose, a code span, a list item and twenty others that a bare `(` and `)` used
  to leave reading as one ink alongside `{`, `<` and `<%`); `colour-witness` and the opener/closer
  floor hold unmoved, and no pair drops below its seated floor, so `corpus/legibility-floor.txt`
  needs no re-seating — only a fall would ask for one.
- A WIDGET'S ATTRIBUTES CARRY A NEUTRAL NAME, PARTED FROM AN HTML ELEMENT'S. A widget attribute
  fell into the HTML catch-all `meta.attribute.unrecognized.$1.html.tiddlywiki5` alongside a
  genuinely unrecognized HTML attribute, even though TiddlyWiki never fails to read a widget
  attribute — a widget reads whatever it is handed. `#htmlwidget-attribute` split into
  `#htmlwidget-attribute-known` (the shared, recognized-name patterns) plus two thin catch-alls
  that both include it: `#htmlwidget-attribute` keeps `meta.attribute.unrecognized.$1.html.
  tiddlywiki5` for an HTML element, and the new `#htmlwidget-attribute-widget` names its own
  catch-all `meta.attribute.widget.$1.html.tiddlywiki5`. Only the two `meta.tag.widget.*` include
  sites (the single-line widget-tag branch and the general widget-tag branch) repoint to the new
  rule; every other `#htmlwidget-attribute` include, on an HTML element, keeps `unrecognized`. A
  first attempt cloned the whole rule verbatim, which doubled two embedded, already-uncovered
  `comment.line.double-slash.js` nodes (an inline event-handler's JS payload) and pushed
  `corpus/unasked-regions-ceiling.txt`'s count from 20 to 22, over its 21 ceiling that may fall and
  never rise — the split above shares those nodes by `include` instead of by copy, and the count
  reads 20 again. `$1` interpolates the attribute name, so `MIGRATION.md`'s headline counts
  neither this scope's birth nor its `unrecognized` sibling gone. No theme paints a bare `meta.*`
  rule, so this costs no colour: `tests/tiddlywiki5/tiddlywiki5.widget-attribute-name.tw5.test`
  red-firsts `<$link to="x"/>`'s `to` reading `meta.attribute.widget.to.html.tiddlywiki5`, against
  a control asserting `<div foo="x">`'s `foo` still reads `meta.attribute.unrecognized.foo…`.
- EVERY NAME A GRAMMAR DECLARES NOW CLOSES ON THAT GRAMMAR'S OWN SUFFIX, OR AN ALLOWANCE NAMES WHY
  NOT. A merge shipped `entity.name.scheme support.type.scheme` with no language suffix at all
  (cured separately above, `lar:///the-scheme.keeps.its-suffix`) and no gate noticed, because
  nothing checked the closing half of a name against the grammar that declared it — the precise
  half of `docs/scope-naming-prior-art.mem:469`'s golden principle. `tools/invariants/scope-suffix.test.js`
  reads each grammar's own suffix from its own `scopeName` (`tools/grammar-scopes.js`'s
  `declaredScopes`, the one collector `one-implementation.test.js` already holds every reader to)
  and fails on any declared name that closes on neither that suffix nor an allowed one — RED-FIRST
  against `f1d733b^`'s own unsuffixed pair, and against a planted regression run through
  `grammar-sandbox.js`. Allowed: VS Code's own `meta.embedded.*` wrapper; a guest grammar's raw
  vocabulary handed a region (`source.css`, `text.html.basic`, TextMate's own CSS/JS property and
  comment names reused for a fenced case this grammar detects itself, and this repository's own
  sibling grammars — `text.html.tiddlywiki5`, `source.toml.tw5-syntax` — embedded the identical
  way); and the TOML hand-port's own private `.toml` convention entire. Sweeping every grammar in
  `syntaxes/` against its own suffix found ELEVEN real misses, all in the field-bearing container
  grammars: `tw5-fields.json` (suffix `.fields`), `tw5-multids-file.json` (`.multids-file`) and
  `tw5-tid-file.json` (`.tid-file`) each declared their own field-key, field-value and field-region
  scopes closing on the HOST grammar's `.tiddlywiki5` instead of their own, and
  `tw5-test-file.json`'s comment rule did the same. Fixed by APPENDING each grammar's own suffix —
  themes match by dot-bounded prefix, so a name that only grew longer keeps matching every existing
  rule; nothing painted moves. `MIGRATION.md` gains the eleven gone names and their replacements
  (**585** names now, **122** gone, **247** new, up from 579/111/230), six pinned snapshots and
  seven `.tw5.test` fixtures regenerate to the lengthened names with no other drift.
- RULED 2026-09-21: A `<<x …>>` INVOCATION IS NO LONGER A MACRO CALL. Since TiddlyWiki 5.3,
  `<<x>>` transcludes a variable — the same mechanism a `\procedure` or `\function` binds — and the
  procedure ontology owns the CALL side of that vocabulary now. Every call-side scope renamed:
  `entity.name.function.macro` → `entity.name.function.procedure`, `support.function.macro` →
  `support.function.procedure`, `variable.name.macro` → `variable.name.procedure`,
  `meta.variable.macro.parameters` → `meta.variable.procedure.parameters`,
  `meta.variable.macro.parameter.tw-$1` → `meta.variable.procedure.parameter.tw-$1` (never declared
  literally — a `$1` capture excludes it from the declared set, so it carries no `MIGRATION.md` row),
  `variable.macro.attribute.html` → `variable.procedure.attribute.html` (an `attr=<<x>>` value), and
  the shared block/inline call machinery: `macrocallblock` → `procedurecallblock`,
  `macrocallinline` → `procedurecallinline`, `tag.macrocall` → `tag.procedurecall`. The DEFINITION
  side keeps its name: `meta.directive.variable.macro`, `entity.name.variable.macro` and
  `meta.variable.macro.body` still name a `\define` region, because macrodef.js still builds a
  MACRO there — with `$param$` substitution a `\procedure` lacks — and a reader acts on that
  distinction. `MIGRATION.md` gains twelve gone names and their replacements (**589** names now,
  **136** gone, **265** new, up from 589/127/256 — the rename is one-for-one, so the standing
  count holds); seventeen `.tw5.test` fixtures and twenty-one pinned snapshots regenerate to the
  renamed call-side scopes with no other drift; the colour witness reads unchanged (0 findings)
  since the rename moved no theme-reachable prefix.
- RULED 2026-09-21: THREE RULES MINTED A SCOPE SEGMENT FROM AUTHOR TEXT, and none of the three
  names a selector could ever target singly, because no bundled theme paints `meta.*` at all
  (measured: colour-witness reads the same 0 findings before and after this ruling, over the
  bundled 65). `meta.attribute.widget.$1.html.tiddlywiki5` and
  `meta.attribute.unrecognized.$1.html.tiddlywiki5` minted a segment from WHATEVER TEXT the
  parser accepted as an attribute name — punctuation admitted (`(a`, `$x`, `a.b`), which no
  TextMate selector can target regardless. Both retire the interpolation and stand FIXED:
  `meta.attribute.widget.html.tiddlywiki5`, `meta.attribute.unrecognized.html.tiddlywiki5`. The
  call parameter's `meta.variable.procedure.parameter.tw-$1.tiddlywiki5` carries a different
  fault: its capture is always a clean `[\w\-]+` word when it fires, but a POSITIONAL argument —
  one with no `name:` or `name=` ahead of it, as in `<<a=b>>`'s trailing `=b` — leaves the group
  unmatched, and TextMate interpolates that as EMPTY, minting a dangling `tw-.tiddlywiki5` no
  reader ever typed. The four "Dynamic param" rules that require a name (`name={{{filter}}}`,
  `name={{indirect}}`, `name=((mvv))`, `name=<<call>>`, `` name=`substituted` ``,
  ``` name=```substituted``` ```, `name=[[bracket]]`) never carried this fault — their name group
  is mandatory, never optional — so only the five rules with an OPTIONAL name (the four bare
  string forms and the final catch-all) split in two: a named variant, ordered first, requiring
  `[\w\-]+\s*[:=]` ahead of the value and keeping `tw-$1`; a positional variant, ordered second,
  matching the bare value alone under a FIXED fallback, `tw-positional`. `<<myMacro you'd index a
  relation>>` and `<<myMacro 'a quoted argument'>>` are the red-first control:
  `tiddlywiki5.macro-argument-apostrophe.tw5.test` asserted the dangling
  `meta.variable.procedure.parameter.tw-.tiddlywiki5` before this ruling and asserts
  `tw-positional` after. Since none of these four names — two fixed, one still-interpolated for a
  clean capture, one fixed fallback — were ever counted in `declaredScopesIn` while they carried
  a literal `$1` (the reader that backs `MIGRATION.md`'s headline excludes any name containing
  `$`), the FIXED replacements are pure additions with no "gone" counterpart: `MIGRATION.md`'s
  headline states **593** names now and **269** new, up from 589/265, gone holds at 136. Six
  `.tw5.test` fixtures and twenty pinned snapshots regenerate; `npm run colour-witness` reads 0
  findings throughout.

### Tooling and process
- TWO READERS, NAMED AND KEYED, THE THIRD ONE REMOVED. See `tools/reader-scope.js`.
- THE ORACLE'S WALK KEEPS WHAT A PRAGMA NESTS. `flatten(tree, {sameSpace: true})` read a child starting past its parent's END as a restarted coordinate space, and `parsePragmas` nests the whole document after a definition beneath it — so every construct after a leading pragma vanished from six instruments.
- A MARK CLAIMED OVER KEPT TEXT OVER-REACHES, WHATEVER CONTAINS IT. overreach-check judged every claim by the widest cover, so a colspan mark painted over a table cell's own text read as agreement — every character in a table lies under the table. A claim naming one of this grammar's delimiters now answers to the tightest cover, and `verdictAt` splits a tie by whether the outer node carries a rule: a construct built from exactly its text answers for it, an element built around content yields to the content.
- THE CORPUS JOINED THE GATES. gate-report skipped `overreach-corpus-files`, the one overreach run over corpus/, and it stood at 152 claims and 5 condemns, exit 1, beneath a green report. It runs as a gate and in CI, every span traced — 85 of them one filtered transclusion the grammar never closes on a styled suffix.
- A NUMBER FOR A MACHINE GOES OUT AS TEXT. The breadth probe printed its one number through `console.log`, which hands a number to `util.inspect` and colours it wherever colour stands forced — `FORCE_COLOR` in an environment is enough — so the caller asking whether a ruling's breadth had moved read `NaN` against 1 and named the corpus, where the fault sat in the shell.
- A PRAGMA ANSWERS ONLY ABOVE PROSE. A carrier opened with two lines of explanation and every signature below it read as body text — the host builds ZERO definitions there, so the grammar's blank reading stood correct and the specimen taught otherwise.
- A LEDGER SERVES TWO SWEEPS. The widget-tag ruling reads idle over the 45-file corpus and explains 110 of the host's own carriers; retiring it on the narrower reading dropped the reach pass from 99.5% to 97.1%.
- A TEST THAT RE-DERIVES ITS TOOL'S READING HOLDS A SECOND IMPLEMENTATION, and the two drift apart in silence — a class this release found three times. See `tools/invariants/a-test-reads-its-tool.test.js`.
- A GATE ABANDONED ITS OWN READING ON THE WAY OUT. `process.exit` drops whatever stdout has not
  drained, and a gate printing a long listing then calling it loses the tail — silently, with a status
  of 0. Measured on the legibility witness, which prints 820 lines: six runs under CPU contention came
  back with 171, 742 and 820 pairs and an exit status of 0 every time, so nothing in the answer told a
  short reading from a complete one, and the test reading it blamed the grammar for pairs a dead write
  had eaten. This is the flake that read as a grammar defect three times. The same six runs under
  heavier load, with the verdict SET rather than called, returned 820 pairs every time; three full
  `test-tools` sweeps ran clean after the migration. Every one of the 42 gates the manifest names sets
  `process.exitCode` now — 87 call sites — and `tools/invariants/a-verdict-flushes.test.js` refuses a
  gate that calls the other thing, with a companion arm refusing a gate that reports no verdict at all,
  so the cure cannot become a deletion. Welded behaviourally rather than by reading: all 42 verdicts
  stand byte-identical across the change.
- A GATE FOR THE FAULT NO OTHER GATE CAN SEE. `tools/contrast-witness.js` measures CIE76 ΔE between
  the foreground a token resolves to and the theme's own default, so a rule that wins and leaves the
  colour where ordinary prose has it reads as the fault it is. It derives from every token the corpus
  builds — keyed by the STACK a reader meets, reported by the innermost SCOPE a fork would change,
  because a ledger at stack grain ran to 733 entries differing by nothing anyone could act on. Four
  control arms stand between it and the four colour lies this house has already measured: a
  background-only rule must leave the distance at zero, a foreground-only rule must move it past the
  just-noticeable difference, and a rule painting EXACTLY the default must read reached-and-invisible
  where an unreached scope reads prose-without-reaching — the two faults part, because fusing them
  names the wrong cure. A mispaired arm answers each theme against the NEXT theme's default and the
  count collapses from 1,462 readings to 36. The bar sits at a quarter of the bundled set, where a
  reading stops being a habit every grammar shares: our widget's `<` reads as prose in 18 of 65 themes
  and the real `html` grammar's own `<` reads as prose in exactly 18 too.
- A PROBE READ A FIELD THE LOADER DOES NOT CARRY, and reported a fork as costless. See `entity.name.tiddler.field.title`.
- The legibility test's completeness check answered to a number typed into it. A floor of 500 passed a run that came back 403 pairs short and would have failed the day the corpus grew a construct; it answers to the witness's own claimed count now, and a truncated reading names itself.
- A SHIPPED GATE ASKED ITS QUESTION OF A SCOPE STANDING ALONE. See `theme-model.js`.
- `theme-paint`'S PAINT RATE MEASURES REACH, NEVER LEGIBILITY. Of 11,756 foreground rules across 65 bundled themes, 1,191 — one in ten — paint the editor's own foreground, and `variable` is the single most-shipped such selector: 20 of the 59 themes ruling on it leave the colour exactly where the editor had it.
- The changelog weld read a hardcoded version number, so bumping the version broke the one gate standing guard over the bump. It derives the version from the manifest.
- The typo arm's determinism test accused the arm whenever the corpus moved between its two runs — three lines landing mid-corpus read exactly like a wandering perturbation. The corpus reports its own digest around the pair, so an edit names itself.
- THE CARRIER TRUTH PASS. See `table.js`.
- A GATE READS THE RED NO THEME DECIDES. VS Code paints a bracket its own matcher reads as unmatched
  in the theme's unexpected-bracket colour, over whatever a scope earns, and the token inspector shows
  the scope's colour and "No theme selector" beside it. `tools/bracket-witness.js` runs the editor's
  rule over every carrier: the pairs each language configuration names in `brackets`, matched inside
  tokens vscode-textmate types Other — a string, comment or regex token takes its brackets out, and
  that family stands as the one lever a grammar holds over the red. 24 reds over 93 carriers, each
  declared in `corpus/bracket-ledger.txt`: most tell the truth about a bracket TiddlyWiki too reads as
  unmatched, and three stand owed. `colorizedBracketPairs: []` hands back depth colour only, and both
  language configurations now say so.
- swallow-witness NAMES THE REGIONS ITS PROBE CANNOT ASK. Seventeen regions end on a lookahead for every line-start block marker, the quote marker among them, so the sentinel reads each stopping at the probe whatever it swallowed first.
- A GATE ASKS WHAT A READER'S EYE ASKS: where TiddlyWiki builds a construct, does the grammar answer with anything of its own? `tools/darkness-witness.js` takes its population from the host — every node carrying a rule TiddlyWiki stands — and judges each LINE of each construct, because one lit row carried a whole table under a per-construct verdict.
- THE LAST UNARMED CITATION CARRIES A CHECK. A ruling settles whose reading a divergence belongs to by tokenizing a specimen under ANOTHER grammar and comparing two of its own stacks — `</style>` parting from `<style>` in the four Catppuccin themes under the real `html` grammar, exactly as it parts here, which is why the difference belongs to VS Code's own embedded-language terminator rather than to anything written in this repository.
- A COMPILE IS NOT AN AGREEMENT, and the engine gate had kept half its own promise. It asked whether the
  second engine can TRANSLATE each pattern; two engines can each accept a pattern and still find different
  matches in it, and a reader on a documentation site then meets one construct coloured two ways — the
  reader this gate exists to speak for. The behavioural arm reads all 754 patterns against the 840 distinct
  lines the corpus carries, from each line's start, and finds ZERO differences. The zero carries a control,
  because a zero that cannot move measures nothing: thirteen candidates drawn from the known differences
  between Oniguruma and JavaScript — `\h`, POSIX brackets, possessive quantifiers, inline flags, `\X`,
  `\G`, character-class intersection — all read alike, the translation being faithful, so no genuine
  divergence stands to prove the comparator sees one. It mispairs instead, reading each pattern's
  translation against the NEXT pattern's Oniguruma answer, and the count moves from 0 to 699 of 754.
- THE CLAIM CHECKER READS A FLAGSHIP'S OWN NAME NOW. The strongest rulings here cite another grammar — that markdown's `markup.superscript` measures the paint rate ours does, so the silence belongs to the vocabulary rather than to this grammar — and the checker could read none of them.
- `\end` CARRYING A NAME THAT FAILS TO MATCH: MEASURED, BUILT, AND DECLINED ON WHAT THE BUILD COST. See `definitions.closer-name.tw`.
- THE EXAMPLE SET REACHES EVERY FORM THE HOST ADMITS, and what remains thin stands SINGLE-FORM rather than unexercised. A filtered transclusion carries five optional parts and the corpus held two of them; it holds all five now, including the two the host binds under names no reader would guess — the run after the closing braces becomes `style`, the dotted run after that becomes `itemClass` — and the reading where a PIPE INSIDE THE FILTER ends the filter, binding `[tag[a` as the filter and `b]] ` as a tooltip.
- A RULING'S NUMBERS NOW ANSWER TO THE MEASUREMENT THEY CAME FROM. See `tools/ledger-claims.js`.
- `\rules` NARROWS THE PARSER'S OWN RULE TABLE, AND THREE CARRIERS HOLD WHAT THAT COSTS A READER.
  `\rules only <names>` keeps the rules named, `\rules except <names>` drops them, and any other action
  changes nothing — all verified against `amendRules` itself. A rule stack carries REGIONS, never a rule
  table, so every construct below a narrowing keeps the colour its markup earns while the host reads flat
  text: measured, 93 spans across the three carriers, each one now ruled in the divergence file with the
  narrowing that retired it. The widest reading is `\rules only` with no names at all, where the host
  keeps NO rule and the whole carrier holds one paragraph.
- A CLAIM THIS RECORD MADE ABSOLUTE STANDS TESTED, AND HELD. A transclusion's marker reads as one object with its interior only by joining the string family — and the space of moves closes by derivation rather than by taste: to paint alike, the marker must match the rule its interior's stack wins on, so the interior's own five unshared scopes are every move available.
- THE READER GETS THE SWITCH THIS GRAMMAR CANNOT REACH. See `tools/reading-recipe.js`.
- A CANDIDATE SET WRITTEN BY HAND CANNOT NOTICE THE FAMILY IT MISSED. Four rounds of naming forks each
  arrived as four or five families somebody thought of, measured, the loudest kept — and the families
  that matter rest on no opinion: they are the selectors the bundled themes rule on, with the share of
  that reach which sets the colour the editor already had. `tools/family-atlas.js` derives all 2,520 of
  them from the 65 theme files. It reads `variable` at 59 themes with 20 leaving the colour alone, and
  `entity.name` at 37 with NONE — so a name the wiki resolves BY NAME reads honestly under
  `entity.name.variable` and loses half its prose readings by moving there. Four rounds of hand-listed
  candidates had offered only `support.class` and `support.type`, which buy their colour by naming a
  filter's variable operand or a multi-valued reference something it is not. A filter's variable
  operand, a multi-valued reference and a `$(name)$` substitution took the move: prose readings fall
  from 22 of 65 themes to 10, and the readings above the ledger's bar fall from seven to two. The
  published `variable.*` name stands first in every case; nothing retires. A weld holds the derivation
  to the contrast reading, which measured `variable`'s ratio by a different path.
- THE EXAMPLE SET ANSWERS TO THE HOST'S OWN REGEXPS, not to a list of constructs anybody recalled.
  Ranking every parser rule by how many nodes the corpus makes it build named the thin end outright —
  and the ranking's first draft LIED, pruning a walk to one coordinate space and so reading
  `definitions.forms.tw` as 1 node where it carries 46, with its 24 `fnprocdef` nodes reported as
  none. A definition body, a typed block and a filtered transclusion each parse in a RESTARTED space.
  Corrected, the corpus grew from 630 host nodes to 721 across the thin rules: the link family
  (`extlink` 2 to 12 — every scheme the host autolinks and two a URL-ending character truncates;
  `image` 4 to 11 — attributes bind with `=`, a `:` drops the whole image to prose), the emphasis
  family nested every-marker-deep and opened mid-word, the conditional's padded and `elseif` chains,
  a style run's multi-declaration list, and the reading that four hyphens build a DASH rather than a
  rule. Each form stands verified against the parser before it reached a file.
- EVERY MACRO-CALL FORM THE HOST ACCEPTS, in `corpus/wikitext/inline.macros.tw`, each verified against TiddlyWiki's own parser rather than against a list somebody typed: the two separators, the five value families `=` admits and `:` refuses, a name that stops at its first `:` or `=`, and the three shapes the host builds nothing from — padding after `<<`, a nameless call, and an opener with no closer ahead.
- `rule-coverage` answers to the wiki THIS HOUSE BOOTS, not only to a stock TiddlyWiki. Its population came from `$tw.modules.types.wikirule` on the vendored host and read **0 unaccounted** — while the house's own plugin registers three rules that boot never sees.
- THE INSTRUMENT CARRIED THE DEFECT IT WAS BUILT TO FIND. Reading a sigil's body as `[^>]*` truncates at the first angle, which stands INSIDE a bearing arrow, so `bearing` never appeared as a shape at all.
- `corpus/delimiter-ledger.txt` carries a FLOOR on the debt it records.
- `light-cone` gains a THIRD ARM: a reader's own typing. The forward arm hands back removed text and the backward arm strikes pragma lines — both alter something nobody types.
- THE TYPO ARM DIAGNOSES AND NEVER PROVES, and a gate holds it to that. See `tools/recovery-witness.js`.
- A BLOCK CONSTRUCT THAT NEVER CLOSES SWALLOWS EVERY RECOVERY AFTER IT, so one carrier measures the first unterminated block shape it holds and hides the rest. See `degenerate.unterminated.tw`.
- Eight shared modules under `tools/` carry tests of their own, ordered by a require graph rather than by a reading of names: `run-tool` backs 26 files, `tokenizer` 22, `snapshot-format` 9, `theme-model` 8.
- Both sides of the corpus ledger derive. See `corpus/`.
- `contributes.configurationDefaults` carrying `editor.tokenColorCustomizations` stands legal, traced through VS Code's own validation: the setting registers at WINDOW scope, which its extension point's allow-list admits, and 450 shipped manifests do it. See `docs/prior-art/paint-and-delimiters.mem`.
- A known gap records what a `<style>` element owes. TiddlyWiki carries NO notion of a scoped stylesheet — `scoped` names an ordinary attribute and the word stands nowhere in its source — so a `<style>` takes the html rule like any other and its children parse as wikitext.
- The whole-document lookahead ceiling gains a third construct (`codeinline.js`'s own whole-source scan) and a ninth ceiling joins the record — a construct opened inside a quoted attribute value wears that value's `string.*` for as long as the region stands, which no TextMate rule can strip back off.
- `tools/theme-collision.js` collides the colour model against the engine that paints. Every colour
  number this repository carries rests on `theme-model.js`, and nothing had ever asked
  `vscode-textmate` whether it says the same. The engine answers through `tokenizeLine2` metadata and
  `getColorMap`, and where the two part the model stands wrong. Both offsets stand SETTLED rather than
  assumed, by a one-rule theme whose target index lands at offset 15 and at no other — two earlier
  readings of that field named the BACKGROUND and an offset that looked right on one specimen. The
  gate carries `--must-fail`, which paints theme N while answering for theme N+1 and reads 89.4%
  divergence, so a comparison of one reading against itself cannot pass here.
- `tools/page-palette.js` takes the reading nobody had taken. Ware's six-to-twelve limit acts per
  SCREEN, through contrast effects and colour-category confusion, and every measurement here read one
  construct at a time. Measured over whole pages across 65 themes: the corpus spends a median of 5
  colours a page and the host's own tiddlers 6, crossing 12 in 1 of 2340 and 6 of 2600 readings. A
  page of wikitext sits at the LOW end of Ware's band and essentially never crosses it. It REPORTS and
  never ratchets — a colour count belongs to the theme at least as much as to the grammar, and this
  house declines gauges that re-seat on every honest change.
- A TEST FILE REQUIRED BY ANOTHER RUNS ITS ASSERTIONS AGAIN. `node:test` registers a test when its
  file gets REQUIRED, and a JSONC reader lived inside one — so two consumers re-registered that
  file's whole suite. Measured: twelve assertions ran THREE times each and the reported pass count
  carried **twenty-four phantoms**, while one defect there would have reported three times. The
  reader stands as `tools/jsonc.js` with its own test and a control proving it still refuses what no
  editor accepts; a gate names the inversion rather than the reader, so the next one caught is caught
  for the same reason. The suite reads 479 where it read 501.
- A PROVOCATION MUTATING A TRACKED FILE MAKES EVERY CONCURRENT READER FLAKY. `grammar-signals` wrote
  the harvest in place and restored it in a `finally`, leaving a window the whole suite ran inside —
  measured, a gate reading `rule-coverage` at the wrong moment saw a planted `quantumfold` rule and
  failed for a fault nobody had. The provocation runs in a sandbox now, and two consecutive sweeps
  read 479 of 479.
- AN ISOLATION HARNESS READ ONE CHANNEL AND CALLED EVERY ARM CLEAN. Reading only stdout, it reported 0 fallen pairs for each of the seven cures while the same seven measured 10 through a shell — `construct-legibility` prints its findings to stderr.
- A FLAT READ OF THE HOST'S WIKI RULES FOUND TEN RECOVERY CODES WHERE SIXTEEN STAND. Six of them live under `rules/emphasis/`, and a `readdirSync` that never descends goes green while looking at none of them.
- THE RULER WAS WRONG, AND FOUR GATES REPEATED IT IN ONE VOICE. See `theme-model.js`.
- A HARNESS COMPARING TWO DEFAULTS REPORTS THE GAP BETWEEN THEM AS A GRAMMAR FINDING. Three earlier readings of this divergence — 64.5%, 42.7%, 27.0% — each fell to the next, and the residue of the last concentrated in `meta.paragraph` because the engine fell through to a scopeless rule while the comparison preferred `colors['editor.foreground']`.
- 150 `construct-legibility` floors fell, 82 rose and 588 stood under the settled ruler, for a net of -270 theme-readings, and one `ReaderRelations` floor re-seats from 47 to 45. Both files say so in those terms: a floor re-seated because the RULER got more truthful, never because one loosened, with the before and after beside it.
- A SENTINEL MUST STAND ALONE. See `tools/sentinel.js`.
- Both readers meet the same lines. `still` resumes the grammar side from the head's own stack rather than re-reading the head, so a closer added for the parser alone read as 177 host runaways — the closer's own asymmetry wearing the grammar's name.
- The swallow collision strips a bound this witness can SEE. The paragraph's blank-line bound, taken out in one spelling and in all five, moves the reading not at all, and neither does taking the line anchor off every block opener; the gate had decayed to resting on a single artifact cut.
- THE README'S HAND-WRITTEN SCOPE LIST HAD ALREADY GONE STALE. See `invalid.illegal.html.tiddlywiki5`.
- The README pointed at `tools/ships-no-runtime.test.js` for the claim that this extension ships nothing executable.
- The README said which scope to name and never why this extension names none itself. It now says: a contributed `editor.tokenColorCustomizations` registers and takes effect — some 450 published manifests do it — and carries three costs.
- `sigil-vocabulary` reads whether the specimens exercise the vocabulary the HOUSE writes, deriving the population from the boot seed rather than from a list here. See `corpus/memetic/sigils.mem`.
- A sigil the seed never writes reads as a FINDING, never a fault — `hoike` and `kue` come from the talk-story carrier, `loulou` names a wikilink, and `unknown-sigil` stands as a deliberate control.
- A sandbox meets EVERY ground a gate reads, not only the host. It stands in the system temp directory where nothing sits beside it, so the boot seed resolved nowhere there and a collision proved its gate against a vocabulary that never answered — the same shape as the TiddlyWiki checkout resolving 5.4.1 against 5.5.0-prerelease.
- One resolver, and the house's own gate caught the second. `resolveSeed` stands beside `resolveTiddlyWiki` in the oracle rather than in the tool that wanted it.
- `ceiling` names what a TextMate grammar CANNOT reach about TiddlyWiki, measured rather than asserted, so a later reader — a language server, a tree-sitter grammar, a parser wired to the wiki — inherits a mandate rather than a hunch. See `editions/tw5-syntax/tiddlers/TextMateCeiling.tid`.
- Specimens for 23 regions no cut in this corpus ever opened, and the unasked ceiling falls from 44 to 21. See `pragmas.signatures.tw`.
- `still --reach` crosses EVERY carrier and ratchets the share it finds fully named, seated in `corpus/carrier-reach-floor.txt` at 4342 of 4365.
- `legibility` reads what a READER sees. See `corpus/legibility-floor.txt`.
- The reading paints WHOLE constructs, and the gate asserts that it does. Measured on container scopes alone, a call, a filter run, a transclusion and prose each resolve to one colour and 44 of 65 themes paint them identically — a gate built that way would rule a healthy grammar broken.
- A floor PER PAIR, because one floor on the weakest pair reads green through a loss anywhere else: stripping a call of every name a theme rules on left the weakest pair exactly where it stood. The collision found that the day the gate stood up.
- A witness for what a reader sees. Every other gate reads scope names, and a name comes apart from a colour in both directions: two names paint alike when no theme rule reaches past their shared family, and one construct paints two ways when its parts sit in different families.
- A witness for what a half-typed construct costs. A grammar meets unfinished input on every keystroke, and a pattern reading cheaply on a finished construct can read expensively on an unfinished one.
- A memetic construct leaves the paragraph after it alone. The bleed canary appends a sentence to the END of a sample, so it catches a construct swallowing to the end of a file and misses one that corrupts the next paragraph and recovers — and the dialect adds eleven opening constructs the wikitext grammar has no rule for.
- The memetic dialect holds wikitext entire, by measurement. It includes the wikitext grammar rather than reimplementing it, which makes the superset claim look structural — and a TextMate injection keys on a scope name, so a wrapper fires none of the wrapped grammar's.
- Twelve scopes the corpus never reached now stand exercised. Each element family names its own continuation region — the one a start tag opens when its attributes span lines, and a single-line tag never opens — so reaching them wanted one element per family, and the families run narrow: the math object family holds `mglyph` and nothing else.
- Coverage counts two populations separately. See `comment.block.js`.
- The corpus reads specimens, named by the extensions the manifest claims rather than by a list of what to skip. That list held two names and let a third control file through: the divergence rulings answered every corpus run as though they were wikitext.
- Every scope the memetic dialect declares stands exercised. The base grammar answers to twenty-seven corpus files and a coverage floor; the dialect carried a fraction of that, and six of its scopes had no specimen at all — a carrier naming no control code, a query separator inside a `lar:` URI, and two of the three quotings a parameter value takes.
- Every declared contribution packs. The ignore list names directories rather than contributions, so an edit there can drop a grammar the manifest still declares — and VS Code then loads that language, finds no grammar, and colours nothing without saying so.
- The gates answer to a TiddlyWiki that always resolves. They take their verdicts from TiddlyWiki's own parser, and without one they skipped politely while the suite still reported no failures — so a contributor could break every divergence gate and read green.
- The extension ships colouring and nothing that runs, by measurement. A TextMate grammar decides how loudly a construct reads and never which parser rules a wiki stands, so the configuration offered here works by scope naming and theme rules.
- The four definition kinds carry ground that reports a regression. Each of them differs from the others in what its body means, what its parameter list admits and what its name admits, and none of those shapes stood in any sample or corpus file — so a fix to one could be lost silently.
- A gap that closes reports itself. See `tests/known-gaps/README.md`.
- The corpus carries substitution where substitution holds. Its only ground for the placeholder scopes stood inside procedure bodies, where TiddlyWiki performs none, so narrowing the injection left eight scopes unexercised.
- The grammar answers on cut ground as well as whole. TiddlyWiki's own tiddlers carry the best-formed wikitext in existence, and a learner writes from the other end of that distribution.
- Every divergence on TiddlyWiki's own tiddlers, traced. Over 387 of them nothing diverges unexplained: every span stands explained by 111 written rulings, and none by a number somebody wanted smaller.
- A RULING STANDS STALE ONLY WHERE EVERY RUN EXPLAINS NOTHING WITH IT. See `corpus/expected-divergence.txt`.
- AN ABLATION WITNESS ASKS WHETHER A MARK CARRIES STRUCTURE. Every other instrument compares which
  characters the grammar colours against which spans TiddlyWiki builds; none asked whether a mark
  changes the host's tree SHAPE at all. `tools/ablation-witness.js` replaces each claimed delimiter
  and each unclaimed non-word character with a neutral letter, re-parses in-process and compares
  node types, tags and attribute names at the tightest structural node the offset falls inside — an
  OVERREACH where a claimed mark's removal changes nothing, a MISS where an unclaimed character's
  removal does. `corpus/ablation-ledger.txt` keeps its 361 findings, keyed by line text, in
  `darkness-ledger.txt`'s own shape — table valign and colspan-left mismatches (D1, D3, D4 of a
  spirit's tables research) traced and OWED to the same table.js lines the research cites, and every
  other class hand-traced before it joined the ledger.
  It runs as a gate and in CI. THE NEUTRAL LETTER CAN BUILD MARKUP: `[img[ ]]` ablated to `[imgx ]]`
  opens an image whose attribute list reads into the next line, so a MISS stood traced before it
  counted, and the witness owed a test that discounts structure its own replacement creates.
  No replacement character is universally inert — `>`, `=` and `"` each open, close or continue
  some token elsewhere in this grammar (a macro CALL's own unquoted parameter value admits a lone
  `>`, which let it stand in for the real name-terminating `=` of `<<a=b>>` and read as no change
  at all), so multiplying replacements and requiring agreement across them only relocates the
  artifact. THE INVARIANT THAT HOLDS: a MISS reports the ORIGINAL character's own structure going
  missing, never the REPLACEMENT's own structure appearing. `isCreationArtifact` reads the
  ancestor chain at the offset, before ablation and after, outermost first — a node BEFORE held
  with no counterpart AFTER at the same rank is real loss or alteration; a node persisting at the
  same rank that grew PAST its own parent's original end has annexed a neighbour's territory,
  which a finding must report; and once the chains run out of common rank, a node AFTER holds that
  BEFORE never had counts as the replacement's own creation only when THAT node's span reaches
  past the original covering node's end — the replacement's lookahead spilling into content the
  ablated character's own construct never engaged. The four `[img[ ]]`/`[img [ ]]` MISSes this
  artifact owed are retired; every other finding, including the D3/D4 table-valign controls and
  `<<a=b>>`'s own name-stop, survives unmoved — `corpus/ablation-ledger.txt` now keeps 335.
- Divergences that stand by ruling, written down. See `corpus/expected-divergence.txt`.
- A second memetic sample, so the composition gate over that dialect can run. It compares neighbouring samples and needs two; the dialect carried one, so the check reported a missing source rather than a result, every time anyone asked.
- **Colour toggles** in the README: the two scope groups worth turning, and the `editor.tokenColorCustomizations` block that turns each, per workspace folder.
- The repository reads from inside the wiki. See `tools/`.
- THE DIVERGENCE GATE HOLDS. Nothing the grammar claims stands unexplained: 0 spans where it claims a construct TiddlyWiki refuses, 0 where it condemns one TiddlyWiki builds.
- The two fixtures holding a whole HTML document carry the ruling their DOCTYPE already carried. See `.tw`.
- The upstream-coverage gate stopped asking this grammar to scope constructs TiddlyWiki refuses. It harvests a case from the host's own tiddlers and stripped its trailing whitespace — but a rule ending in `[^\S\n]` REQUIRES that whitespace, so `\rules ` became `\rules` and opened nothing.
- A comment naming a rule no longer counts as reading it. The coverage gate searched the whole grammar including its prose, and two rules — `macrodef` and `fnprocdef` — read as covered because a comment mentioned them.
- The composition gate reads a prologue as position-dependent by construction. A file whose first construct is a pragma cannot survive being preceded — that IS the construct, and markdown's front matter carries the same property — so such a file answers for standing FIRST, and the parser decides how far its prologue reaches rather than a walk over its lines.
- A syntax-test fixture asserting pragma colouring declares the wrapper scope. See `text.html.tiddlywiki5`.
- Every snippet says what it inserts. 73 of the 125 carried no description, so a learner reaching for `\rules` met a name and a body and nothing saying what the construct does.
- A TypeScript compiler stands in this repository's own dependencies, pinned to the version whose bytes the committed modules carry. Continuous integration rebuilds the edition and asks whether the tree holds what the build writes — `npm run edition:check` — so a source edited without a rebuild fails a merge rather than shipping.
- The backtrack witness answers to a control rather than to the machine. Its budget stands in wall time, so run beside a dozen other gates the whole set slowed together and the slowest pattern crossed eight milliseconds having done nothing different — 1.4ms alone, past 8 under the suite, on the same bytes.
- The edition's compiled modules answer to the TypeScript standing beside them. TypeScript sits in no dependency of this repository — the build finds a compiler in a parent checkout — so nothing in continuous integration could rebuild and compare, and the compiled modules ARE the shipped artifact.
- The build verifies every module it compiles. It named one by hand and checked that one; a second arrived, compiled, and stood unverified beside it.
- The theme-parity panel says what each comparator carried. The bar this gate holds the grammar to comes from a median over six grammars, and one of them carries two constructs of seven — rst names a heading on the underline rather than on the text, and splits its emphasis runs where the construct's own words do not stand alone.
- A carriage return stops the snapshot reader dead, and says nothing. A regex ending on `$` matches nothing on a CRLF line, so the reader answered a file full of annotations as one carrying none — every gate over the pinned snapshots would have reported green having measured nothing.
- A theme reader that could not read a theme dropped it silently, and a caller handing back what the loader already flattened read as a theme with no rules. Sixty-five themes' worth of measurement could have run over nothing and reported green.
- The dialect's own snippets, the file associations and the language configurations answer to one reading: every language this extension defines carries a grammar, a configuration, an association and its family's snippets, or a ruling names what stands in the way.
- Nothing this grammar emits stands unreached. The corpus reached 466 of the scopes it declares and three stood outside, and the three left by three different roads.
- Every snippet inserts a construct this grammar colours, not only one TiddlyWiki parses. One reads as prose by ruling: a substitution colours inside a macro definition body and nowhere else, so it reads as text standing alone, exactly as TiddlyWiki reads it there.
- The snippet reader honours VS Code's escapes. A body spells a pragma `\\define` and INSERTS `\define`, so reading it verbatim handed the parser two backslashes — every pragma snippet then read clean for the wrong reason, and read as prose against the grammar for the same one.
- The dialect carries the wikitext snippets. See `.mem`.
- `.mem` and `.tiddlywiki5.test` assert their own file associations, the way every other extension this repository defines already did.
- Every snippet inserts a construct TiddlyWiki closes. Nothing asked before, and a snippet is the
  one surface here that writes into a reader's file: a mis-coloured construct costs a colour, an
  inserted broken one costs a tiddler that renders wrong. All 128 pass; the parser's own
  `unterminated-*` diagnostics answer the question.
- Every repository rule in every grammar stands reachable from some root. An orphaned rule loads, validates and colours nothing, and its scopes still count among the declared ones the corpus must reach — so it reads as corpus work owed where the fault sits in the grammar.
- Continuous integration runs every witness the repository stands. It reached six of twenty-two, and sixteen stood green in a developer's terminal and nowhere else — seven of them with nothing in CI exercising their verdict at all.
- The bleed canary reads inheritance from the parser rather than from a list. It passed over a sample ending inside a block construct by matching scope-name prefixes, and `meta.styleblock` arrived under a name no prefix covered — so two samples reported as bleeding while TiddlyWiki carried the same text into the same construct and raised `unterminated-styleblock` saying so.
- Two samples ended with a stray `@@`, which opens a style block with no style and closes nothing. It cost the canary and the composition gate a red each, and both stand green with it gone.
- `npm run overreach` reads `corpus/expected-divergence.txt`, like every other overreach run.
- `overreach-corpus` named the same run as `overreach-host` without its rulings or its excludes, so it could only ever fail. `overreach-host` stands.
- A gate reads a `.tid` the same on either line ending. Six tools split a tiddler by scanning for
  two newlines in a row, and that reading answers wrongly three ways: a file opening with a blank
  line hands back a fragment of its body, a CRLF file matches nothing and reads as bodiless, and a
  blank line carrying a space reads on into the first paragraph break. 34 of TiddlyWiki's own
  tiddlers answer differently under the two readings — one of them with 1373 characters a gate read
  as none. All six now read line-wise, and the attribute guard sees 23,682 tags where it saw
  23,627, at the same 99.95% agreement.
- Spawning a child and reading both halves of the answer stands in one place. Ten sites carried the same seven lines — five running an instrument, three booting the edition, two inside the sandbox — and each one that let the throw escape read a failing gate as a broken test.
- The two sandbox runners share one body. They differed in which directories the sandbox takes from the working tree, which is now the argument rather than a second copy of everything else.
- The vendored grammars stand in `tests/grammars/` with an account of where they came from, and a gate holds the directory to it: a grammar here that no runner loads fails, and so does a path `grammars.sh` names that nothing holds.
- An instrument and the test that collides it stand in one directory. See `tools/`.
- Two tests resolved the TiddlyWiki this repo answers to by hand, reading the environment and falling back to a sibling checkout, where the oracle already tries three more candidates behind that. A contributor whose checkout stood somewhere only the oracle finds saw those two skip while every other gate ran.
- A gate holds that claim. It boots the edition, compares every arriving tiddler against the bytes on disk, and derives its expectation from the specs rather than listing the directories again — so a sixth directory gets checked without anybody editing the gate.
- `attribute-witness` keys every disagreement to the structure that produced it and fails on one that keys to nothing. A residue counted but unpartitioned reads like a measurement and carries none: a class that grows hides behind a class that shrinks while the total holds.
- THE HARNESS PROVES A PROVOCATION LANDED, so fourteen hand-written guards collapse into one nobody can forget. Fifty call sites plant a fault in a sandbox and fourteen asserted their own mutation altered something — the other thirty-six could stop provoking the day the thing they strike moves, measured FOUR times in one session: a strike naming one corpus file while a second carried the same form, a strike naming an exact source line somebody rewrote, a strike truncating at the angle INSIDE the arrow it meant to remove, and an anchored global replace striking once per anchor rather than once per occurrence.
- CI asserts the suite leaves the working tree as it found it. A test writing outside a sandbox makes every concurrent reader flaky, and a heuristic over source cannot prove absence where running the suite can.
- `tools/` holds its instruments and its invariants apart.
- The test population derives from a walk. A glob states where somebody expected files to stand, and a file standing anywhere else drops out of the run in silence — the same shape that hid `lint-closure` and `package-contents` from every gate list.
- `test-tools` caps the runner at four files in parallel. On twelve cores Node ran eleven test files
  at once, each spawning children that boot TiddlyWiki and read 65 themes; measured, that pressure
  killed `construct-legibility` mid-run and reported a pair as missing that stands at 65/65. Four in
  parallel reads 394 pass, 0 fail, and costs 34 seconds.
- The backtrack witness reads its verdict off the three runs the headroom check already pays for. A fourth and fifth run bought stability alone: every run sweeps each pattern over 170 unfinished specimens, spending the machine and reading nothing about the grammar.
- The `\parameters` divergence lands as evidence under `whole-document lookahead` rather than as a ceiling of its own. `\parameters\s*\(([^)]*)\)` carries a signature across blank lines to a closing paren ANYWHERE ahead and builds nothing where none stands — measured, a signature closing on a later line or across a blank line agrees with the grammar exactly, and the two part only where no `)` stands in the file at all.
- The six `<<<<` attributes sit BEHIND that ceiling, and the reason now says so with the attempt. TiddlyWiki builds a transclude whose `$variable` reads literally `<<.from-version` — its name regex permits `<`, so the first `<<` opens the call and the next two join the name.
- Both OWED entries resolve, and neither records a debt. `overbound codeblock`'s reason stood STALE: an unterminated fence already agrees — host and grammar both carry to the end of the source — and a fence closing across a blank line agrees too.
- Writing is a FLAG, never a side effect of reading. The ceiling wrote its tiddler on every run while the suite invoked it in parallel and other tests read that directory — a gate turning its own suite into shared mutable state, which read as a legibility test losing a line it had every other run.
- The headroom check reads the least of several RUNS, for the reason the witness itself takes the least of several rounds: contention only ever adds time. It read 1.4ms alone and crossed 4 beside 386 tests, where every round of one run met the same contention — so the statistic wants applying one level up, or the check measures the machine exactly as the reading it guards once did.
- Every ceiling names the KIND OF READER that closes it, which turns a list of limits into a mandate a later effort can sort on: a parser holding the whole document, a reader carrying parser state, a reader carrying a span together with its space, a symbol table over the wiki, a filter engine wired to a live wiki, a resolver reading tiddler fields. Three of the eight answer to tree-sitter; four want a language server; one wants the render layer.
- The evidence and the mandate print WITHOUT a flag. `gate-report` keeps a tool's summary line alone, so anything held for `--verbose` never reaches the record a reader opens — and a mandate nobody reads guides nobody.
- A clean wiki per state. Every wiki-shaped ceiling wrote into one wiki, so a state left standing decided the entry after it — an order the list never declared.
- A PAIR AT 0 NAMES A THEME-SIDE FACT, never a grammar defect, and the legibility floor says so now. Measured on all six that stand at 0: this grammar names each of them DISTINCTLY — `markup.subscript` against `markup.superscript`, `meta.directive.variable.macro` against `.procedure`, `markup.other.style.styleblock` against `markup.other.style`.
- The README names `legibility` and `ceiling`, which it had not.
- A tiddler's OWN type picks its parser. Three witnesses parsed a `.tid` body as wikitext while
  discarding the `type:` field they had just read out of its header — and this grammar honours that
  field, so the two answered different questions. Measured over TiddlyWiki's `core/`:
  `$:/palettes/Nord` declares `application/x-tiddler-dictionary` and the host builds ONE `genesis`
  node, where the same bytes forced through wikitext build `parseblock, macrocallinline,
  macrocallinline, quoteblock, parseblock`. A sweep of 60 core carriers read 1027 divergences across
  7 classes with one unnamed; honouring the declaration reads 773 across 6, none unnamed. Twenty
  dictionaries stand in `core/` alone, and the corpus holds none, so nothing here had ever shown it.
- A sandbox meets the host the tree meets. `resolveTiddlyWiki` prefers a checkout beside this repository and falls back to the pinned package; a sandbox stands in the system temp directory where no checkout stands beside it, so EVERY collision run there resolved 5.4.1 against the checkout's 5.5.0-prerelease.
- One reading map, shared. Three witnesses each carried their own copy; they had drifted — one swept no `.meta` sidecar at all — and the same type defect sat in all three because the map sat in three places.
- A `.tw5.test` fixture cannot carry a pragma-zone shape at all.
- A ledger collision plants its fault in a SANDBOX. Writing the ledger in place and restoring it in `finally` leaves the shared tree wrong for as long as the tool runs, and a second reader — another gate, another hand working the same tree — meets the planted fault as though it stood.
- The release record reads as one record. Ten heading blocks stood under `## 2.3.0 — unreleased` where the house writes Fixed, Added, Changed once each; regrouped, 213 bullets in and 213 out, none altered.
- Every offset reading stays in ONE coordinate space. A nested parse restarts offsets at zero — measured, `$$$text/vnd.tiddlywiki` holding a quoteblock reports the typed block at 23..42 and the quoteblock inside it at 0..14 — so a witness asking which rule covers an absolute offset read an inner node as standing at the top of the document.
- A pragma signature left open, ruled on corpus ground rather than carrier ground. See `pragmas.signatures.tw`.
- The bogus matches had MASKED a real class. With the readings honest, a cut inside a `\define` body reports what stands there: one `set/macrodef` node and nothing inside it, because TiddlyWiki stores a macro body verbatim and never parses it, while the grammar paints wikitext in there on purpose.
- A skip carries a ruling, never a sentence. See `CIGates.tid`.
- A ruling's breadth answers to the GROUND it stands on. The guard scored a key's shape — wildcards
  and literal segments — and ranked ground backwards: `meta.codeblock.*` carries a wildcard and
  stands on 3.5% of corpus tokens, `meta.paragraph.tiddlywiki5` carries none and stood on 18%. Worse,
  it examined only a key that VANISHED, so an ADDITION passed unweighed however much ground it
  claimed — and an addition is the shape a generous ruling takes. `corpus/ruled-ground-ceiling.txt`
  ratchets what every ruling claims between them: 55.8%, down from 79.4% under container keys.
- The ground reading counts TOKENS, never scopes. A token wears several scopes at once and the first union summed per scope, reading 100.9% of a corpus — the only reason the fault surfaced rather than settling in as a number nobody questioned.
- `still.js` runs its sweep only as a command.
- `call-parity` asserts the `<$macrocall>` widget where that scope exists. The guard read declared fields for `meta.tag.widget.macrocall`, which no grammar spells — every widget name derives from its match as `meta.tag.widget.$3` — so a careful comment sat over a branch that excluded nothing.
- `snap` runs among the gates. The gate list derives from the manifest by the shape of a script's body, `snap` gathers its per-scope siblings instead, and the skip pattern passed those over on the strength of a comment saying `snap` carried them whole.
- `unboundedRegions` reads a name carrying several scopes. It built one matcher from the whole field, which matches no token, so six regions read as regions no cut ever opens — a coverage ratchet reporting the reader's blindness as a loss of ground.
- The corpus floor's collision derives its raise from what the corpus reaches. A fixed step of five stopped provoking once the vocabulary widened past it, and the collision then passed while planting no fault.
- `backtrack-witness` times a pattern by the LEAST of several rounds. Contention only ever adds
  time — a scheduler taking the core away lengthens a reading and nothing shortens one — so one
  round's average estimates what the machine was doing rather than what the pattern costs. The same
  pattern over the same bytes read 1.7ms alone and 9.3ms beside a dozen gates, crossing an 8ms
  budget having done nothing different, and two runs at rest disagreed 0 stalls against 6. The
  budget names an absolute cost on purpose: the slowest pattern this grammar holds runs 874 times a
  trivial control on adversarial input and costs under two milliseconds, so no ratio separates it
  from a stall. Two gates stand beside it now — the worst reading keeps headroom against the budget,
  and two runs read one verdict.
- Two carrier classes stand ruled from a wider pass. See `sdm/procedures/tag-pill-styles.tid`.
- Four dialect scopes stood unexercised: they paint a lar URI's query string, which no sample carried. The specimen carries one, and a bearing arrow standing in prose.
- `call-parity` holds the word `macro` in its three senses, which TiddlyWiki's own move to procedures, functions and custom widgets at 5.3.0 split apart. See `tw5-substitution-injection.json`.
- The parameter-boundary guard reaches every surface that takes one, measured rather than assumed: a call, a `\define` signature, the three signatures fnprocdef reads, and the `\parameters` pragma all hold an apostrophe inside a quoted value. Two controls carrying an unterminated value run on, so a sweep reporting six clean surfaces reports a measurement.
- `engine-witness` reads every shipped pattern under a second regex engine. vscode-textmate raises nothing when Oniguruma declines a pattern — the rule simply never matches, the corpus reaches fewer scopes, the snapshots record the reduced reading as correct, and every gate passes. Probed directly, the WASM engine takes `(?<unclosed`, `(`, `*bad` and `[z-a]` without a word, so the swallow sits below the API and no reading of that engine can find a dead pattern.
- It answers a second question the first cannot reach. This grammar runs wherever a reader meets
  it, and a documentation site rendering through Shiki translates every pattern to JavaScript
  first; a construct one engine implements and the other emulates differently colours differently
  there, silently, for a reader who runs no gate and files no issue. Measured: 777 patterns across
  8 grammars, and every one crosses. `corpus/engine-ledger.txt` stands empty and says so, because
  neither engine holds authority and the gate records a difference rather than a fault.
- `must-fail` measures the degradation each malformed specimen still produces. A specimen written to fail stands exempt from the gates that read well-formed text, and that exemption costs nothing while the specimen degrades — the day the grammar improves past it, the specimen reads clean, keeps the exemption, and every gate agrees that nothing stands wrong.
- Two files carrying the malformed name asserted nothing measurable and rejoin the swept corpus. One held well-formed nesting throughout and had been exempt from every gate on the strength of its filename, so its scopes never counted and its constructs never got cut.
- The corpus that found it: 677 memetic carriers in the parent tree, read under the base grammar. 19172 spans stood inside a runaway macro call there, and this repository's own wikitext corpus could never surface it — a macro call in a test fixture carries no prose, and a carrier is prose inside sigils almost entirely.
- `attribute-witness` reads the value's whole span rather than one position inside it. A kind
  region need not cover every character — a filtered value carries operators and operands under
  scopes of their own — so a probe landing on one point reported whatever kind stood there. The
  ceiling falls from 227 to 74; the point reading held 156 of them.
- The pass samples SHUFFLED, deterministically. Taking every Nth carrier walks directory order, which groups them by bag and by whoever wrote them, so a class living in one author's habits sits outside the sample and reads as absence.
- That class stands ruled by the probe. A quoted parameter value left open runs on, and the obvious bound is forbidden: TiddlyWiki carries a quoted parameter across a BLANK line and builds the call, refusing only where the closing quote stands nowhere in the source.
- The fence class the first pass surfaced stands RULED rather than owed, decided by the probe instead of by a reading. A fence continuing a paragraph opens nothing in either reader — they agree there, and a fixture pins it — but from that point the two pair the remaining backtick runs differently, so a later fence at a block start opens for one and not the other.
- `still` answers whether the base holds still. A pass over ground this corpus does not hold surfaces divergences, and the answer turns on KIND rather than count: an instance of a class the ledgers name says the base held and the ground merely widened, while a class named nowhere says the base still moves.
- The condition guards itself against being met by ruling generously. Widen a ledger key far enough and every finding falls inside it, which reads from outside exactly like a base that settled — so a key's REACH gets gated beside its entries, against what the last commit held, since breadth names a change rather than a state.
- On its first pass over carrier ground it found one class nobody had named: a fence CONTINUING A PARAGRAPH parts the two readers, because `codeblock` reads as a block rule and never fires there, so the parser ends the paragraph at the blank line while the grammar's fence region reads on. See `corpus/carrier-ledger.txt`.
- Two guards state their purpose where they carried a number. A threshold set to the vocabulary of the day fails a grammar that grew smaller deliberately and reports the reader broken when the grammar changed — one sat three scopes from doing exactly that, and another answered for how many themes an external package ships.
- The dialect seed carries the query-parameter rule its lar URI reaches for. A named parameter inside a URI's query string names ground wikitext has no rule for, where the same rule inside a sigil would replace the base reading; one rule wore both jobs, and only the URI half survives.
- The corpus floor re-seats after a grammar leaves. A floor counts what the corpus reaches across the scopes a grammar DECLARES, so moving a grammar aside moves the denominator and the count falls while nothing reads worse.
- Three gates carried an assumption the seed broke, and each one now states its purpose rather than a number: a parity check compared a wrapper's selector against a source selector that does not exist; a key check read a directory as a grammar; and a containment guard demanded more than five constructs, failing a grammar that grew smaller on purpose.
- `light-cone` classifies a divergence by REACH rather than by a reason somebody wrote down. Two readers stand over one text and neither holds a global now: the parser walks a document, a grammar reads a line and whatever its stack carried in.
- The probe carries two arms, and both alterations derive. The forward arm hands back the text a cut removed — the file's own remainder — so the sentinel keeps its offset while the lookahead changes.
- A still arm proves nothing, and the gate says so. An alteration carries a closer only where the file happened to hold one, so the reading runs one-sided: nothing filed as owed may reach out, and a ruling standing over a class no arm moved reports as judgement rather than as proof.
- `attribute-witness` compares the kind TiddlyWiki assigned a value against the kind this grammar names for the same span, ruled in `corpus/attribute-kind-ceiling.txt`: parseutils.js declares five kinds and the grammar spells all five again in its own patterns, and every other gate here passes on a disagreement between them.
- The kind wears a word, never a position — `corpus/attribute-kind-ceiling.txt` measures the correction: reading the outermost region of a filtered value answers `meta.attribute.class` for every value, where reading the innermost answers with the operator inside its first run.
- Three populations TiddlyWiki registers now gate something. The signals harvest gains the token each pragma rule opens on — `\define`, `\parameters`, `\function|procedure|widget`, `<!--` — read off each rule module's own matchRegExp, and the run prefixes registered under `filterrunprefix`.
- The pragma zone answers to that harvest. A grammar guards the zone with a keyword list, and no structural reading replaces it: the zone has to tell a directive line from prose, which turns on the keyword.
- Every pragma the host stands must reach the harvest carrying a token. A rule whose token never arrives leaves the zone guard checked against a shorter list than TiddlyWiki registers, and the run then reads green on the strength of what nobody harvested.
- `filter-witness` reads what TiddlyWiki writes. A filter run colours structurally, so `:cascade` and `:nosuchprefix` read alike and a name the pattern cannot match simply reads as something else with nothing counting it.
- A corpus specimen now carries every construct that spans a line break, closed. See `corpus/unasked-regions-ceiling.txt`.
- The count of unbounded regions needed colliding before it meant anything: a grammar spells the line bound five ways and a reader naming it by shape miscounts, which `corpus/unasked-regions- ceiling.txt` works through in full, including the control in `tools/grammar-scopes.test.js` that provokes a literal `\$` — carried by every widget rule and the typed block's `\$\$\$` — directly, to keep it naming no bound.
- The cut sweep reads every corpus type the wikitext parser can answer for, not only `.tw`: 757 cuts across 35 files where 627 across 26 stood.
- That start-tag bound was ruled unfixable an hour before it landed, and measurement upheld both halves of the ruling: `corpus/swallow-ledger.txt`'s preamble carries the count (2583 files, six blank-line-carrying start tags, all widget, all bounded already) and the reason the proposed remedy cannot be written at all.
- The corpus gate answers to the host as well as to itself. Its three readings all measure what this repository wrote — scopes declared, scopes reached, constructs contained — so a rule the grammar never learned reaches no scope, goes unmissed, and coverage reads full.
- The swallow witness now draws its battery from real corpus text instead of a table of twenty-five hand-written openers, cutting every corpus file at every line and asking both readers about the same offset. See `corpus/swallow-ledger.txt`.
- The exceptions come from the reader rather than from a list. `$tw.Tiddler.fieldModules` types five field names, and the edition harvests it beside the pragma rules: `created` and `modified` parse as dates, `color` carries `editType: "color"`, and those three keep a plain reading — `color` alone painted 486 spans across 162 lines, every one of them a `#` read as a numbered list item.
- Two exception sets stand as rulings, because TiddlyWiki types them nowhere. A filter-valued field spells `<count>` and `<targetTiddler>`, which the wikitext reader takes for an HTML tag — `condition` alone painted 429 such spans — and a field carrying base-64 bytes paints 1622 wikilinks and 429 italics out of an alphabet that holds `[[` and `//` by accident.
- The rulings a reader depends on stand where an operator can weigh them. Which distinctions a reader needs, which constructs read as prose, and which names TiddlyWiki's core owns — none of the three has a registry to answer it, and all three governed a gate from inside a tool where nobody argued over them.
- A TiddlyWiki release reaches this grammar as a failing check rather than as a construct that quietly reads as prose. Booting the edition against a TiddlyWiki harvests every filter operator, widget and wikitext rule it registers — 84, 69 and 44 at 5.5.0-prerelease — and a gate holds the grammar to that list: every rule the host stands, the grammar reads under its own name or under one a line declares.
- The gate that measures verdicts against the parser reads the whole answer. It counted a verdict as wrong only where the parser built a construct, and TiddlyWiki declines a construct by keeping the characters as text — so the commonest shape of all, a bracket in prose, sat outside every measurement while the gate reported agreement everywhere.
- Coverage counts every grammar the extension registers, and each file type opens under the grammar the manifest gives it. See `.tw5.test`.
- Every file type the extension colours loads every grammar it registers. The runners took our grammars from a list kept beside the manifest rather than from the manifest, so a grammar registered and not listed painted in the editor and nowhere else: it read as absent to every gate, which reported green over whatever it carried.
- A syntax-test file colours the wikitext it tests. See `.tw5.test`.
- The corpus and samples carry the framing form the graph now writes: a control sigil names its ends, `from=? -> to=lar:///…`, with the bearing arrow riding between them as an unnamed positional. The grammar read that form already — `key=value` alignment did the work — and this pins it so it stays read.
- A RULING'S BREADTH ANSWERS TO HOW MANY CAUSES IT CAN ABSORB, never to how much ground it covers. See `ruled-ground-ceiling.txt`.
- AUTHORING MOVES THE NEW READING BY NOTHING, and a sandbox proves it rather than the prose claiming it: forty more calls appended to a corpus file leave every key spanning the kinds it spanned before. The token share still READS beside the verdict, because a reader wants to know how much ground stands ruled, and it ratchets nothing.
- Five retired sigil forms leave the specimens, each measured to reach 0 scopes no current form reaches: `<<~ hud Focus(10) Feedback(3)>>`, the two parenthesised `kahea` calls, `<<~ syad>>` and `<<~ moves>>`. See `meta.variable.call.parameter.tw-https`.
- Eleven block checks restamped through `bccOf`, never by hand. Ten verify `ok`; the specimen that carries a deliberately fake check beside a real one reads `unchecked` exactly as it did before.
- `ruled-ground-ceiling` re-seated to 57.2% from 56.6%, and the cause reads as composition rather than generosity: quoting adds a `string.quoted` token INSIDE each call region, and those tokens wear `meta.variable.call.*`, so that key rose 12.2% to 13.3% while no ruling changed its mind and none broadened.
- The ruled-ground ceiling re-seats at 56.6%, with no ruling broadened — the same run reports zero. The share reads the CORPUS'S composition, and the corpus grew to lower the unasked ceiling; every construct that lowers it wears a scope a ruling already names, necessarily, because a construct that can run away is exactly what a runaway ruling covers.
- One grammar reading per carrier, resumed at each cut from the stack that cut's head ends on.
  A grammar reads strictly left to right, so the stack after a line answers to nothing following it;
  re-reading each head in full cost the SQUARE of a file's length and measured at 90% of a sampled
  run's time, which put the whole ground out of a gate's reach. The full pass now crosses 4403
  carriers in 31 seconds. `tokenizeFrom` holds the reading, so `tokenize` and the resumed walk stay
  one implementation, and `still.test.js` collides the two readings cut for cut with a control
  against a draw that diverges nowhere.
- `legibility` takes its POPULATION from the host. Seven specimens stood in the tool by hand and the standing lesson answered: a hand-written enumeration cannot notice what it missed.
- A specimen carries no trailing newline, and a specimen that fires no rule fails. An empty last line takes a token of width 1 from vscode-textmate for the newline it stands before — base scope, no character painted — and flattened into the reading it hands every specimen the default colour: on `snazzy-light` that gave a transclusion a look the filter run's unpainted space had held alone, and the pair read 62 where it stands at 63.
- `still` and `swallow-witness` measure different ground, not the same one twice — `still` pointed at `./corpus` by mistake and only reported what `swallow-witness` already had; pointed at `--host` instead it crosses 4403 carriers outside this corpus and found an unnamed class on its first run. See `corpus/swallow-ledger.txt`.
- A definition-block ruling moved from the corpus ledger to the carrier ledger. No corpus cut reads that way once every offset reading stays in one space, and a ruling with no specimen fails the corpus gate by design; TiddlyWiki's own tiddlers carry it.
- `legibility --verbose` reports FAMILY PRESSURE, and ratchets nothing. A theme rule naming a one-segment root reaches every scope beginning there, so constructs sharing such a root get pulled toward one colour and a deeper rule must pull them back.
- Ledger keys speak that vocabulary. `comment.block.html.*` and `meta.embedded.block.html.*` move to `comment.*` and `meta.embedded.*`; the carrier ledger's call and CSS rulings fold into `meta.variable.call.*` and `meta.embedded.*`; and the paragraph ruling DISSOLVES — the kind vocabulary absorbs the cause it named.
- No pattern carries a key TextMate never reads. One container declared `start` where TextMate reads `begin`, so it named nothing, its `contentName` never applied, and the pattern worked only by falling through to what it included.
- The manifest registers six grammars. The seventh declared a scope nothing referenced and no language claimed, so VS Code loaded it and no document ever reached it: a `.meta` sidecar carries fields and no body, and the `tid` language already lists `.meta` among its extensions and colours one correctly.
- `isExpected` reads the same co-declared siblings `matchingRulings` already does, taking the same `siblingsOf` a caller already builds from `siblingsFrom` rather than repeating the match rule a second time under a different name.
- `tools/still.js#carriers` WALKED `fs.readdirSync` IN WHATEVER ORDER THE FILESYSTEM HANDED BACK, so `still --host --sample N` and `still.test.js`'s seeded shuffle over it drew a different 40 carriers run to run — a real source of gate-report drift never traced to its cause.
- A LEGIBILITY FLOOR RE-SEATS, TRACED TO THE COMMIT THAT RAISED IT. See `corpus/legibility-floor.txt`.
- `editions/tw5-syntax/` SHIPS AS A NEW SUB-PACKAGE: A TIDDLYWIKI-EDITION BUILD OF THE GRAMMAR DATA.
- `ThirdPartyNotices.txt` SHIPS, REQUIRED BY THE TOML GRAMMAR'S PORT.
- A RESEARCH SHELF JOINS `docs/`, RECORDING THE EVIDENCE BEHIND THIS RELEASE'S NAMING AND PAINT
  RULINGS RATHER THAN ASSERTING THEM. `docs/scope-naming-prior-art.mem` and seven files under
  `docs/prior-art/` (`coordinator-direct`, `fixed-vocabularies`, `library-highlighters`,
  `paint-and-delimiters`, `sublime-vs-textmate`, `synthesis`, `treesitter-and-semantic-tokens`) —
  roughly 3,600 lines — collide this grammar's naming and bracket-painting decisions against
  TextMate/Sublime convention, thirteen-plus flagship grammars, and tree-sitter/semantic-token
  practice; `docs/differential-test-design.mem` records the reasoning behind the corpus/host
  comparison method the gates run on. `SCOPE-NAMES.md`'s naming policy and the bracket/paint rulings
  elsewhere in this section cite these as their evidentiary basis rather than asserting taste.
- RULED 2026-09-21: `(` AND `)` RETIRE FROM `brackets` IN BOTH LANGUAGE CONFIGURATIONS. Wikitext
  prose carries unpaired parentheses constantly — "1)", "(see above" — and VS Code's own matcher
  paints every one it cannot pair the theme's unexpected-bracket red, over any colour a scope
  earns, regardless of theme. The `(` AUTO-CLOSING pair stands unchanged in both files (typing `(`
  still inserts `)`); only the colourizer's matching list moves. `corpus/bracket-ledger.txt` loses
  its 17 now-stale `(`/`)` declarations (5 remain, all `]`/`[`), verified by `npm run brackets`
  reading 0 stale and 0 undeclared under both readers. `tools/grammar-sandbox.js` gained a real
  gap this surfaced: its sandbox overlaid `tools/`, `syntaxes/`, `editions/`, `corpus/` and
  `tests/samples/` from the working tree over a HEAD checkout, but never the root language
  configuration files a gate like `bracket-witness` reads by `package.json` manifest path — a
  sandboxed run collided the WORKING-TREE ledger against the COMMITTED (still-paren-carrying)
  config and read fifteen phantom "undeclared" reds. `ROOT_FILES`, derived from
  `contributes.languages[].configuration` rather than named by hand, now travels with every
  sandbox. `tools/bracket-witness.test.js` gains two controls — a language configuration
  positively check no longer declaring `( )`, and prose parentheses reading no red under the real
  pairs — plus the two existing sandboxed provocations, one of which had to move off `)` itself
  (no longer trackable) onto `]`.
- RULED 2026-09-21: TWO NEW CARRIERS, `corpus/wikitext/procedures.calls.tw` and
  `corpus/wikitext/procedures.definitions.tw`, exercise the call/definition split the whole rename
  answers to, side by side rather than scattered. `procedures.calls.tw` collides every CALL form
  against the host: inline and block `<<x>>`, positional and named parameters in every value form
  (unquoted, double/single/triple-quoted, bracketed), a widget attribute's value carrying a call
  (`tooltip=<<greeting>>`), a call nested inside a NAMED parameter's value
  (`<<outer inner=<<greeting>>>>` — the host parses this; the bare-positional form
  `<<outer <<greeting>>>>` does NOT, tested and dropped rather than asserted false), and the
  `$variable`-prefixed `<$transclude>` widget form that calls the same name a `<<x>>` invocation
  does. `procedures.definitions.tw` stands every DEFINITION form beside its call, restructured
  around a real constraint the file itself surfaced: pragma mode opens only at the START of a
  tiddler and closes at the first non-pragma-legal line, so every `\define`/`\procedure`/
  `\function`/`\widget` block had to stand dense at the top with only blank lines between —
  discovered by rendering the carrier and finding later blocks read as literal paragraph text
  rather than pragmas, the same trap `tiddlywiki5.call-is-procedure-not-macro.tw5.test` (this
  release's item-1 control) hit first. Rendered, `<<greeting-proc>>` proves `$who$` stays literal
  in a `\procedure` body where `<<greeting>>` substitutes it in a `\define` body — the DEFINITION
  side's own distinction, confirmed by execution rather than by reading the grammar's rules back.
  Both carriers read 0 grammar/parser disagreement under `overreach-check` (single-file, the
  `corpus/wikitext/*.tw` sweep at 53 files, and the 389-file host-corpus sweep), 0 undeclared
  findings under `corpus-check` and `swallow-witness`, and 0 findings under `colour-witness` and
  `construct-legibility`. `ablation-witness` surfaced two real, pre-existing grammar gaps these
  carriers are the first to exercise — a call's `=` before a nested value (already OWED for
  `inline.macros.tw`'s `<<a=b>>`, same reasoning) and a widget tag name's `.` (already OWED for
  `html.widgets.tw`'s `<$my.widget/>`, same reasoning) — both recorded in
  `corpus/ablation-ledger.txt` rather than fixed, since neither is this ruling's to close.

- THE ORACLE MEMOIZES A PARSE, IN-PROCESS ONLY. `tw5-oracle.js`'s `parse`/`parseAs` now cache
  every tree they build for the life of the process, keyed on everything that could change what
  TiddlyWiki reads back (reader path, `$tw.version`, a hash of the oracle's own code, the rule
  set, the parse mode/options, and a sha256 of the source). A prior spike (Story 0/0.5 of the
  parse-cache epic) measured 84–85% of a full `gate-report --check` run's parse TIME repeated
  WITHIN one gate's own process — divergence-staleness alone re-runs overreach-check across ~6
  rule-set variants against the same files — and that a disk cache across gates would add only
  0.4–0.5 points beyond an in-process memo alone, so only the memo shipped. Measured: a full
  `gate-report --check` drops from a 351.6s/374.6s median (memo off, pinned/fork reader, 3
  interleaved runs each) to 260.2s/275.0s (memo on) — roughly a quarter faster — and the
  heaviest single gate, `divergence-staleness`, from 67.2s to 28.5s (58% faster) at a peak RSS
  cost of +1.9MB (282.4MB vs 280.5MB), bounded by an 8,000-entry LRU (`ORACLE_MEMO_MAX`) so a
  future gate touching a much larger population cannot grow it unbounded. Every memoized tree is
  deep-frozen before it is handed back — but ONLY the tree and diagnostics, never the whole
  `parseText` result: that result IS TiddlyWiki's live Parser instance, carrying
  `this.wiki = options.wiki`, the actual running `$tw.wiki` — freezing the whole object froze the
  wiki out from under itself, and the very next parse threw inside `$:/core/modules/wiki.js`
  resetting `changedTiddlers`. No consumer in this repository mutates a returned tree (checked by
  hand across every caller); the freeze makes that fact an invariant rather than an accident.
  `ORACLE_MEMO=off` bypasses it entirely for debugging. See `tools/tw5-oracle.js`,
  `tools/tw5-oracle.test.js`.
- THE `--in-process` SPIKE RETIRED. It shared two gates' TiddlyWiki boot (14% of one measured
  run) at the cost of a shared process — `TW5_PATH`, `process.exitCode`, module caches, lost
  crash isolation. The parse memo above delivers roughly double that win across every
  oracle-touching gate, not just two, without sharing a process, so `--in-process`,
  `IN_PROCESS_GATES` and `runInProcess` are gone from `gate-report.js`. `ORACLE_TRACE` (off by
  default) stays — it is what proved the memo's effect, and the only instrument that can prove
  it again.

### Removed
- `grammars_archive/`. Seven reference grammars sat there, shipped to nobody — `.vscodeignore`
  excluded the directory, and no tool, test or doc read from it. Git holds them.
- A bare `?` carries no bearing scope. An end names itself — `from=?`, `to=?` — so the glyph rides as
  an ordinary value, and standing alone it reads as content like any other character.
