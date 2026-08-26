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

Run the suite with:

```
npm install
npm test               # the TiddlyWiki5 grammar
npm run tests-memetic  # the memetic-wikitext grammar
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
never on end-of-file. When adding a pattern, add a fixture that puts an ordinary
sentence after the construct and asserts that the sentence still reads as plain
text. `tests/memetic-wikitext/gradient-floor.mem.test` stands as the worked example.
