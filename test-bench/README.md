# Bench

A disposable editor for looking at the grammar with human eyes, so nothing needs reloading
in the editor you work in.

```sh
npm run bench            # http://localhost:3000  — the working tree, live
npm run bench:packaged   # http://localhost:3001  — the built .vsix, installed
npm run bench:down
```

`workspace/` is seeded from `tests/samples` on every start and is safe to type in; nothing
there touches a fixture. The working tree enters the live bench read-only, so a syntax edit
needs only a window reload (`Ctrl+R` in the browser tab).

Two modes answer two questions. **live** asks what the grammar does. **packaged** asks what
ships — the source tree resolves a file the package excludes, and only an installed `.vsix`
tells you otherwise. `npm run package-contents` gates that answer in CI.

Both run the editor server-side, so the grammar loads where the files live. A TextMate
grammar is UI-side in a remote window, which is how a local change can appear not to work.
