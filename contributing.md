# Contributing

Issues and pull requests are welcome at
https://github.com/joshuafontany/VSCode-TW5-Syntax

## Licence

This project follows TiddlyWiki5's licence, BSD 3-Clause — see `LICENSE`.

Contributions are accepted **inbound=outbound**: by submitting a pull request you
agree that your contribution is licensed under the same BSD 3-Clause terms that
cover this project, and you assert that you have the right to license it that way.
No separate agreement is required.

If your contribution carries code you do not own — a grammar excerpt, a pattern
lifted from another project — say so in the pull request and name its licence, so
the attribution in `LICENSE` can carry it.

## Reporting a highlighting bug

A screenshot tells us something went wrong. A failing test tells us where.

The fastest report is six lines of `tests/tiddlywiki5/*.tw5.test`: the construct
that misbehaves, then a `#` line with carets under the span and the scopes you
expected. Even without the expected scopes, a minimal `.tw5.test` file that
reproduces the problem is worth more than a paragraph of description.

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
matches does not error — it wins, and colours everything after it. Several
long-standing issues here share that root.

So every construct must end on its own terminator **or on end-of-line** — never
on end-of-file. When adding a pattern, add a fixture that puts an ordinary
sentence after the construct and asserts that the sentence still reads as plain
text. `tests/memetic-wikitext/gradient-floor.mem.test` is the worked example.
