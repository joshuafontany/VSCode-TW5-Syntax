# Known gaps

A test in here states what the grammar *should* do and does not yet. It stands written so
the specification survives its author's attention, and it stands outside `npm test` so a
known gap never reads as a regression.

```sh
npm run tests-known-gaps
```

A gap specimen fails, so the gate reads that failure as the expected state and reports how many
stand. It fails on the opposite event — a specimen that PASSES, meaning the grammar grew to meet
it — and names the file to move.

A gap leaves this directory in one of two ways: the grammar grows to meet it and the test moves
to `tests/tiddlywiki5/`, or upstream moves and the gap turns out to face the other way. Either
way the specification travels with it.

The count below answers to the directory, and the gate fails when the two disagree.

**2 gaps stand.**

## What stands

| specimen | what the grammar owes |
|---|---|
| `an-unparseable-attribute-refuses-the-tag.tw5.test` | a stretch that parses as no attribute refuses the whole tag, and TiddlyWiki yields plain text for all of it |
| `a-pragma-after-a-block-reads-as-text.tw5.test` | TiddlyWiki leaves pragma mode at the first block and never returns, so a backslash directive standing after block content parses as prose |
