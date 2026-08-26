#!/bin/bash

# Check if the user has provided an argument
if [ $# -eq 0 ]; then
    echo "Usage: ./run_tests.sh <pattern>"
    exit 1
fi

# The first argument carries the pattern for test files
PATTERN=$1

NODEMODULES_ROOT="./node_modules"
TMGRAMMAR_ROOT="${NODEMODULES_ROOT}/tm-grammars/grammars"

# VS Code ships a handful of grammars this suite borrows. The install root differs
# per platform, and a remote/WSL server ships none of them, so resolve what exists
# and report what does not rather than aborting the whole run.
for candidate in \
    "${HOME}/AppData/Local/Programs/Microsoft VS Code/resources/app/extensions" \
    "/usr/share/code/resources/app/extensions" \
    "/opt/visual-studio-code/resources/app/extensions" \
    "/Applications/Visual Studio Code.app/Contents/Resources/app/extensions"
do
    if [ -d "${candidate}" ]; then VSCODE_EXTROOT="${candidate}"; break; fi
done
VSCODE_EXTROOT="${VSCODE_EXTROOT:-/nonexistent}"

# Many grammars found here: https://www.npmjs.com/package/@wooorm/starry-night?activeTab=readme#languages

GRAMMARS=(
    "syntaxes/tiddlywiki5.json"
    "tests/asm.json"
    "tests/Asciidoctor.json"
    "tests/APIBlueprint.tmLanguage"
    "tests/C++.plist"
    "tests/EEx.tmLanguage"
    "tests/Git-config.json"
    "tests/html.mustache.json"
    "tests/jQuery.tmLanguage"
    "tests/MSON.tmLanguage"
    "tests/postscript.json"
    "tests/python-console.json"
    "${VSCODE_EXTROOT}/php/syntaxes/html.tmLanguage.json"
    "${VSCODE_EXTROOT}/python/syntaxes/MagicRegExp.tmLanguage.json"
    "${VSCODE_EXTROOT}/javascript/syntaxes/Regular Expressions (JavaScript).tmLanguage"
    "${NODEMODULES_ROOT}/language-gfm/grammars/gfm.json"
    "${NODEMODULES_ROOT}/vscode-jsp/syntaxes/jsp.tmLanguage.json"
    "${TMGRAMMAR_ROOT}/asm.json"
    "${TMGRAMMAR_ROOT}/blade.json"
    "${TMGRAMMAR_ROOT}/coffee.json"
    "${TMGRAMMAR_ROOT}/c.json"
    "${TMGRAMMAR_ROOT}/clojure.json"
    "${TMGRAMMAR_ROOT}/cpp.json"
    "${TMGRAMMAR_ROOT}/cpp-macro.json"
    "${TMGRAMMAR_ROOT}/csharp.json"
    "${TMGRAMMAR_ROOT}/css.json"
    "${TMGRAMMAR_ROOT}/csv.json"
    "${TMGRAMMAR_ROOT}/docker.json"
    "${TMGRAMMAR_ROOT}/diff.json"
    "${TMGRAMMAR_ROOT}/erlang.json"
    "${TMGRAMMAR_ROOT}/elixir.json"
    "${TMGRAMMAR_ROOT}/elm.json"
    "${TMGRAMMAR_ROOT}/git-commit.json"
    "${TMGRAMMAR_ROOT}/glsl.json"
    "${TMGRAMMAR_ROOT}/go.json"
    "${TMGRAMMAR_ROOT}/graphql.json"
    "${TMGRAMMAR_ROOT}/groovy.json"
    "${TMGRAMMAR_ROOT}/haskell.json"
    "${TMGRAMMAR_ROOT}/html.json"
    "${TMGRAMMAR_ROOT}/html-derivative.json"
    "${TMGRAMMAR_ROOT}/java.json"
    "${TMGRAMMAR_ROOT}/javascript.json"
    "${TMGRAMMAR_ROOT}/json.json"
    "${TMGRAMMAR_ROOT}/jsx.json"
    "${TMGRAMMAR_ROOT}/julia.json"
    "${TMGRAMMAR_ROOT}/kotlin.json"
    "${TMGRAMMAR_ROOT}/less.json"
    "${TMGRAMMAR_ROOT}/lua.json"
    "${TMGRAMMAR_ROOT}/make.json"
    "${TMGRAMMAR_ROOT}/markdown.json"
    "${TMGRAMMAR_ROOT}/objective-c.json"
    "${TMGRAMMAR_ROOT}/objective-cpp.json"
    "${TMGRAMMAR_ROOT}/ocaml.json"
    "${TMGRAMMAR_ROOT}/perl.json"
    "${TMGRAMMAR_ROOT}/php.json"
    "${TMGRAMMAR_ROOT}/python.json"
    "${TMGRAMMAR_ROOT}/r.json"
    "${TMGRAMMAR_ROOT}/raku.json"
    "${TMGRAMMAR_ROOT}/razor.json"
    "${TMGRAMMAR_ROOT}/ruby.json"
    "${TMGRAMMAR_ROOT}/rust.json"
    "${TMGRAMMAR_ROOT}/sass.json"
    "${TMGRAMMAR_ROOT}/scss.json"
    "${TMGRAMMAR_ROOT}/scala.json"
    "${TMGRAMMAR_ROOT}/shellscript.json"
    "${TMGRAMMAR_ROOT}/shellsession.json"
    "${TMGRAMMAR_ROOT}/sql.json"
    "${TMGRAMMAR_ROOT}/swift.json"
    "${TMGRAMMAR_ROOT}/toml.json"
    "${TMGRAMMAR_ROOT}/tsx.json"
    "${TMGRAMMAR_ROOT}/typescript.json"
    "${TMGRAMMAR_ROOT}/xml.json"
    "${TMGRAMMAR_ROOT}/xsl.json"
    "${TMGRAMMAR_ROOT}/yaml.json"
    "syntaxes/memetic-wikitext.json"
)

ARGS=()
MISSING=0
for g in "${GRAMMARS[@]}"; do
    if [ -f "${g}" ]; then
        ARGS+=(-g "${g}")
    else
        echo "run_tests.sh: skipping unavailable grammar: ${g}" >&2
        MISSING=$((MISSING + 1))
    fi
done
[ "${MISSING}" -gt 0 ] && echo "run_tests.sh: ${MISSING} grammar(s) unavailable on this platform." >&2

# Run the grammar test with the provided pattern
npx vscode-tmgrammar-test "${ARGS[@]}" "${PATTERN}"
