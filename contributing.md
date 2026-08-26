# Contributing

This project welcomes issues and pull requests at
https://github.com/joshuafontany/VSCode-TW5-Syntax

## Licence

This project follows TiddlyWiki5's licence, BSD 3-Clause — see `LICENSE`.

This project accepts contributions **inbound=outbound**: submitting a pull request
licenses your contribution under the same BSD 3-Clause terms that cover this
project, and asserts that you hold the right to license it that way. Nothing
further to sign.

If your contribution carries code you do not own — a grammar excerpt, a pattern
lifted from another project — say so in the pull request and name its licence, so
the attribution in `LICENSE` can carry it.

## Reporting a highlighting bug

A screenshot tells us something went wrong. A failing test tells us where.

The fastest report takes six lines of `tests/tiddlywiki5/*.tw5.test`: the construct
that misbehaves, then a `#` line with carets under the span and the scopes you
expected. Even without the expected scopes, a minimal `.tw5.test` file that
reproduces the problem carries further than a paragraph of description.

```
__localVar in ordinary prose
#<- text.html.tiddlywiki5 meta.paragraph.tiddlywiki5
```

Every pull request runs the suites, the closure check and a package build; the built
`.vsix` hangs off the run as an artifact, so a reviewer can install what a change produces.

Run the same locally with:

```
npm install
npm test               # the TiddlyWiki5 grammar
npm run tests-memetic  # the memetic-wikitext grammar
npm run lint-closure   # no region admits a nested region that eats its terminator
```

`run_tests.sh` loads a large set of grammars so that embedded-language scopes
resolve. It reports any it cannot find on your platform and runs the rest.

## Highlighting that runs to the end of the file

TextMate grammars fail in one characteristic way: a `begin` whose `end` never
matches does not error — it wins, and colours everything after it. An unclosed
child also blocks its parent's `end`, so the damage compounds outward: a run that
cannot close keeps the paragraph around it open too. This root produces most of
the highlighting bugs a grammar of this size will ever carry.

So every construct ends on its own terminator **or on a paragraph boundary** —
never on end-of-file.

Three properties of the grammar carry that rule, and each one derives from structure
rather than from a list of names to maintain.

**Terminator closure.** A region may admit a nested region only if the nested one
cannot consume the outer terminator. `npm run lint-closure` checks this by reading the
grammar alone. Only nested regions carry the risk: a `match` rule consumes a bounded
token and returns, so it never holds its parent open.

**The delimiter declares the content.** A value's delimiter already says what may live
inside it, because an author chose it for that reason. Across TiddlyWiki's own core and
documentation, 69% of `"""…"""` attribute values carry wikitext and 65% contain a quote;
of 7,840 `"…"` values, under 3% carry wikitext and 0.7% contain a quote — because they
structurally cannot. Read the delimiter, not the attribute name.

**A guest grammar governs its own region.** Filter syntax shares delimiters with markup
and means different things by them: `[[…]]` is an operand, `<<…>>` a variable, and
`__name__` a parameter — that last one appears 24 times in TiddlyWiki's own core, and
reading it as underline is what made #8. Inside a guest region, host markup rules do
not apply. When adding a pattern, add a fixture that puts an ordinary
sentence after the construct and asserts that the sentence still reads as plain
text. `tests/memetic-wikitext/gradient-floor.mem.test` stands as the worked example.
