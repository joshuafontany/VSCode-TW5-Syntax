# Corpus

Broad ground, gated on invariants. `tests/samples` holds frozen specimens whose every token
is pinned; a snapshot there moves only in a commit that moves the sample. These files answer
a different question, and answer it about far more constructs than a pinned suite can carry.

```sh
npm run corpus           # the gate
npm run corpus-verbose   # and every scope nothing reaches
```

**Coverage.** Every scope the grammar declares should be reached by some file here. The
declared set is read from the grammar's own `name` and `contentName` fields, so no
hand-kept list can drift from it. `coverage-floor.txt` ratchets the count: a rule the
corpus used to exercise cannot quietly stop being exercised.

**Containment.** Each file is snapshotted with a sentence appended, and that sentence must
carry only what the same sentence carries alone — measured from a control file, never
assumed. The `degenerate.*` files hold unterminated constructs on purpose and are exempt.

The bench seeds its workspace from here, so the same files that gate the grammar are the
files you look at with your own eyes.

| directory | ground |
|---|---|
| `wikitext/` | blocks, inline runs, html, pragmas, and two degenerate files |
| `tid/` | `.tid`, `.meta` and `.multids` files |
| `memetic/` | sigils, `lar:` URIs, the control set, fences, and a degenerate file |
