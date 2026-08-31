#!/usr/bin/env bash
# The known-gaps gate, which reads a FAILING specimen as the expected state.
#
# A gap test asserts what the grammar does not yet do, so it fails, and run_tests.sh exits
# non-zero when it does. A gate that treats that exit as an error reports every standing gap as a
# broken run; a gate that swallows it reports a standing gap as no gap at all.
#
# Both readings hide the one event worth catching. tests/known-gaps/README.md names two ways a gap
# leaves the directory, and the first is that the grammar grows to meet it — at which point the
# specimen PASSES and wants moving to tests/tiddlywiki5/. That moment reports here.
set -uo pipefail
cd "$(dirname "$0")/.."

shopt -s nullglob
gaps=(./tests/known-gaps/*.tw5.test)
if [ ${#gaps[@]} -eq 0 ]; then
  echo "known-gaps  no gap stands"
  exit 0
fi

standing=0
closed=()
for gap in "${gaps[@]}"; do
  if bash ./run_tests.sh "$gap" >/dev/null 2>&1; then
    closed+=("$gap")
  else
    standing=$((standing + 1))
  fi
done

echo "known-gaps  ${#gaps[@]} specimen(s), $standing still standing"
if [ ${#closed[@]} -gt 0 ]; then
  echo "  ${#closed[@]} gap(s) the grammar now MEETS — move each to tests/tiddlywiki5/ with its specification:"
  printf '    %s\n' "${closed[@]}"
  exit 1
fi
