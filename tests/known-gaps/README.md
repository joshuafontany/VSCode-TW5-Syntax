# Known gaps

A test in here states what the grammar *should* do and does not yet. It stands written so
the specification survives its author's attention, and it stands outside `npm test` so a
known gap never reads as a regression.

```sh
npm run tests-known-gaps
```

A gap leaves this directory in one of two ways: the grammar grows to meet it and the test
moves to `tests/tiddlywiki5/`, or upstream moves and the gap turns out to face the other
way. Either way the specification travels with it.

**No gap stands open.**
