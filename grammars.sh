#!/bin/bash
# The grammar set both runners load. Sourced, never executed — it reads no arguments
# and defines ARGS, the -g pairs that resolve on this platform.

NODEMODULES_ROOT="./node_modules"
TMGRAMMAR_ROOT="${NODEMODULES_ROOT}/tm-grammars/grammars"

# This suite borrows grammars VS Code ships. The install root differs per platform and a
# remote server carries none of them, so every grammar below loads if it resolves and
# reports itself if it does not.
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

# Our own grammars come from the manifest, never from a list kept beside it. A grammar the
# manifest registers and this file omits loads in VS Code and nowhere else: every runner reads
# it as absent, so an injection it carries paints nothing and every gate reports green.
OWN_GRAMMARS=()
while IFS= read -r _path; do
    OWN_GRAMMARS+=("${_path}")
done < <(node -e 'for (const g of require("./package.json").contributes.grammars) console.log(g.path);')

GRAMMARS=(
    "${OWN_GRAMMARS[@]}"
    "tests/grammars/asm.json"
    "tests/grammars/Asciidoctor.json"
    "tests/grammars/APIBlueprint.tmLanguage"
    "tests/grammars/C++.plist"
    "tests/grammars/EEx.tmLanguage"
    "tests/grammars/Git-config.json"
    "tests/grammars/html.mustache.json"
    "tests/grammars/jQuery.tmLanguage"
    "tests/grammars/MSON.tmLanguage"
    "tests/grammars/postscript.json"
    "tests/grammars/python-console.json"
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
)
ARGS=()
GRAMMARS_MISSING=0
for _g in "${GRAMMARS[@]}"; do
    if [ -f "${_g}" ]; then
        ARGS+=(-g "${_g}")
    else
        echo "grammars.sh: skipping unavailable grammar: ${_g}" >&2
        GRAMMARS_MISSING=$((GRAMMARS_MISSING + 1))
    fi
done
if [ "${GRAMMARS_MISSING}" -gt 0 ]; then
    echo "grammars.sh: ${GRAMMARS_MISSING} grammar(s) unavailable on this platform." >&2
fi
unset _g
