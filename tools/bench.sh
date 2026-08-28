#!/usr/bin/env bash
# Stand a disposable editor on the grammar.  tools/bench.sh [live|packaged|down]
set -eu
HERE="$(cd "$(dirname "$0")/.." && pwd)"
BENCH="$HERE/test-bench"
MODE="${1:-live}"

case "$MODE" in
  down) docker compose -f "$BENCH/docker-compose.yml" down --remove-orphans; exit 0 ;;
esac

# Directories the server writes into. They live on the host so the image needs no write
# access of its own, and the working tree can enter read-only.
mkdir -p "$BENCH/workspace" "$BENCH/exts-live" "$BENCH/data-live" "$BENCH/exts-packaged" "$BENCH/data-packaged"
chmod 777 "$BENCH/workspace" "$BENCH/exts-live" "$BENCH/data-live" "$BENCH/exts-packaged" "$BENCH/data-packaged"
# The working tree enters the live bench as a link, so a syntax edit needs only a window reload.
ln -sfn /src "$BENCH/exts-live/tw5-syntax"

# A bench that prompts is a bench nobody reaches. Workspace trust guards against executing
# files in a folder you did not write; this folder holds the repository's own fixtures.
for d in data-live data-packaged; do
  mkdir -p "$BENCH/$d/User"
  cat > "$BENCH/$d/User/settings.json" <<'JSON'
{
  "security.workspace.trust.enabled": false,
  "security.workspace.trust.startupPrompt": "never",
  "security.workspace.trust.banner": "never",
  "security.workspace.trust.untrustedFiles": "open",
  "workbench.startupEditor": "none",
  "telemetry.telemetryLevel": "off"
}
JSON
done
# Clear the CONTENTS, never the directory: a running container binds the inode, and
# recreating the directory orphans that bind and leaves the container seeing nothing.
mkdir -p "$BENCH/workspace"
find "$BENCH/workspace" -mindepth 1 -delete
cp -r "$HERE"/corpus/. "$BENCH/workspace/" 2>/dev/null || true
mkdir -p "$BENCH/workspace/samples"
cp -f "$HERE"/tests/samples/*.tw "$HERE"/tests/samples/*.tid "$HERE"/tests/samples/*.mem \
      "$HERE"/tests/samples/*.multids "$BENCH/workspace/samples/" 2>/dev/null || true
rm -f "$BENCH"/workspace/samples/*.snap "$BENCH"/workspace/coverage-floor.txt

if [ "$MODE" = "packaged" ]; then
  mkdir -p "$BENCH/vsix"
  ( cd "$HERE" && npx --yes @vscode/vsce package --allow-missing-repository --out "$BENCH/vsix/tw5-syntax.vsix" >/dev/null )
  echo "packaged $(unzip -l "$BENCH/vsix/tw5-syntax.vsix" | tail -1 | awk '{print $2}') files"
  # Install it the way a user installs it, in its own step so a failure here reads plainly.
  rm -rf "$BENCH/exts-packaged"; mkdir -p "$BENCH/exts-packaged"; chmod 777 "$BENCH/exts-packaged"
  docker run --rm \
    -v "$BENCH/vsix:/vsix:ro" -v "$BENCH/exts-packaged:/exts" -v "$BENCH/data-packaged:/data" \
    gitpod/openvscode-server:latest \
    --extensions-dir=/exts --user-data-dir=/data --install-extension /vsix/tw5-syntax.vsix
  PORT=3001
else
  PORT=3000
fi

docker compose -f "$BENCH/docker-compose.yml" up -d "$MODE"
# VS Code Web opens an empty workbench unless the URL names the folder; the folder
# argument on the server only sets the default for a desktop client.
echo "bench ($MODE) -> http://localhost:$PORT/?folder=/workspace"
echo "  workspace: $BENCH/workspace  (seeded from corpus/, with tests/samples under samples/)"
echo "  stop with: tools/bench.sh down"
