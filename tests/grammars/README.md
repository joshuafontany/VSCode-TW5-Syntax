# Vendored grammars

Grammars other people wrote, kept here so an embedded-language assertion resolves the scope it
names. `grammars.sh` loads each one into both runners; a grammar the file omits loads nowhere, and
every assertion against it reads as absent rather than as wrong.

VS Code ships some of what this suite borrows and npm carries more, both resolved at run time by
`grammars.sh`. The files here answer for the rest: a grammar with no package to install, or one
whose upstream moved. Each keeps the name it carries upstream, so a reader can find where it came
from.

`python-console.cson` carries the upstream source and its MIT notice; `python-console.json` holds
the same grammar in the form `vscode-tmgrammar-test` reads. The pair stands together so the licence
travels with the grammar it covers.

`tools/vendored-grammars.test.js` holds the directory to that account: a grammar here that no
runner loads fails, and so does a path `grammars.sh` names that nothing holds.
