# Bench

A disposable editor for looking at the grammar with human eyes, so nothing needs reloading
in the editor you work in.

```sh
npm run bench            # http://localhost:3000/?folder=/workspace  — the working tree, live
npm run bench:packaged   # http://localhost:3001/?folder=/workspace  — the built .vsix, installed
npm run bench:down
```

The URL must carry `?folder=/workspace`: VS Code Web opens an empty workbench without it, and
the folder argument on the server sets a default only for a desktop client. The same directory
also binds under the editor's home at `/home/workspace/bench`, so a bare URL can reach it too.

On first open the editor asks whether you trust the authors of the folder. Answer once and the
decision persists in `data-live/`; the web build asks regardless of `security.workspace.trust`
settings.

`workspace/` reseeds from `corpus/` on every start, with `tests/samples` beside it under
`samples/`, and takes your typing safely — nothing there touches a fixture. The working tree enters the live bench read-only, so a syntax edit
needs only a window reload (`Ctrl+R` in the browser tab).

Two modes answer two questions. **live** asks what the grammar does. **packaged** asks what
ships — the source tree resolves a file the package excludes, and only an installed `.vsix`
tells you otherwise. `npm run package-contents` gates that answer in CI.

Both run the editor server-side, so the grammar loads where the files live. A TextMate
grammar loads UI-side in a remote window, which lets a local change appear not to work.
