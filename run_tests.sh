#!/bin/bash
# Assertion tests: each .tw5.test carries its source and the scopes it expects.
set -euo pipefail
if [ $# -eq 0 ]; then
    echo "Usage: ./run_tests.sh <pattern>"
    exit 1
fi
# shellcheck source=grammars.sh
source "$(dirname "$0")/grammars.sh"
npx vscode-tmgrammar-test "${ARGS[@]}" "$1"
