/*\
title: $:/tw5-syntax/modules/grammar-commands
type: application/javascript
module-type: command
\*/
/**
 * grammar-commands — run the repository's own gates from inside the wiki that shows their rulings.
 *
 * The gates live in `tools/` and answer to node. The wiki holds what they judge by and reports what
 * they said, and until now the two met only through a shell: a reader opened the wiki to see the
 * rulings and left it to run anything.
 *
 * This registers `--gate` as a TiddlyWiki command, so the edition that shows a ruling also runs the
 * instrument that enforces it:
 *
 *     tiddlywiki editions/tw5-syntax --gate            every gate the manifest names
 *     tiddlywiki editions/tw5-syntax --gate colour-witness dark-construct
 *     tiddlywiki editions/tw5-syntax --gate list       the names, without running any
 *
 * The source stands in the wiki too, under its own title, so a reader who wants to know what the
 * command does opens it rather than a file beside the wiki.
 *
 * WHY A COMMAND AND NOT A STARTUP. A startup runs on every boot, including the boot a render wants;
 * a gate takes minutes and a render wants none of them. A command runs when a caller names it.
 */

exports.info = {
  name: "gate",
  synchronous: true
};

/**
 * The repository this edition sits inside.
 *
 * A module tiddler meets no `__dirname` — TiddlyWiki evaluates it with `exports`, `require` and
 * `$tw`, and nothing else. The boot knows where it opened the wiki, which stands two levels under
 * the repository; a caller running from elsewhere falls back to where they ran.
 */
function repositoryRoot(nodePath: any): string {
  const wiki = ($tw as any).boot && ($tw as any).boot.wikiPath;
  return wiki ? nodePath.resolve(wiki, "..", "..") : process.cwd();
}

const Command = function (this: any, params: string[], commander: any, callback: unknown) {
  this.params = params;
  this.commander = commander;
  this.callback = callback;
} as unknown as { new (params: string[], commander: any, callback: unknown): any };

(Command as any).prototype.execute = function (): string | null {
  const child = require("child_process");
  const nodePath = require("path");
  const root = repositoryRoot(nodePath);
  const report = require(nodePath.join(root, "tools", "gate-report.js"));
  const names: string[] = report.gateNames();
  const out = this.commander.streams.output;

  // A parameter opening on `--` never reaches here: TiddlyWiki reads one as the next command.
  if (this.params.indexOf("list") >= 0) {
    out.write(`${names.length} gate(s): ${names.join(" ")}\n`);
    return null;
  }

  const wanted = this.params.filter((p: string) => p.indexOf("--") !== 0 && p !== "list");
  const unknown = wanted.filter((w: string) => names.indexOf(w) < 0);
  if (unknown.length) {
    return `no gate named ${unknown.join(", ")} — run --gate --list for the names`;
  }

  const running = wanted.length ? wanted : names;
  let held = 0;
  for (const gate of running) {
    let code = 0;
    let said = "";
    try {
      said = child.execFileSync("npm", ["run", gate, "--silent"],
        { encoding: "utf8", cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    } catch (e: any) {
      code = e.status || 1;
      said = `${e.stdout || ""}${e.stderr || ""}`;
    }
    const lines = said.trim().split("\n").filter((l: string) => l.trim());
    const summary = lines.slice().reverse().filter((l: string) => /^\S+ {2,}\S/.test(l.trim()))[0];
    out.write(`${code === 0 ? "hold" : "RED "}  ${gate}  ${(summary || lines[lines.length - 1] || "").trim()}\n`);
    if (code === 0) held += 1;
  }
  out.write(`${held} of ${running.length} gate(s) hold\n`);
  return held === running.length ? null : `${running.length - held} gate(s) do not hold`;
};

exports.Command = Command;
