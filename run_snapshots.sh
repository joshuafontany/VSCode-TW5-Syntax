#!/bin/bash
# Snapshot tests: a whole file's tokenization, pinned beside it. No assertion is written
# by hand, so a sample covers every construct it happens to contain — and any change to
# any of them surfaces as a diff.
#
#   ./run_snapshots.sh <scope> <pattern> [-u]
#
# -u rewrites the .snap files; without it the run compares and fails on drift.
set -euo pipefail
if [ $# -lt 2 ]; then
    echo "Usage: ./run_snapshots.sh <scope> <pattern> [-u]"
    exit 1
fi
SCOPE=$1
PATTERN=$2
shift 2
# shellcheck source=grammars.sh
source "$(dirname "$0")/grammars.sh"
npx vscode-tmgrammar-snap "${ARGS[@]}" -s "${SCOPE}" "$@" "${PATTERN}"
