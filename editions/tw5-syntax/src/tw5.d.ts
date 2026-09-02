// What a TiddlyWiki module tiddler meets at run time.
//
// A module here compiles to CommonJS and TiddlyWiki hands it `exports` and `require` itself, so
// nothing imports them. Declaring them per source made two files fight over one scope — these
// sources carry no import or export of their own, so TypeScript reads them as one script rather
// than as modules. They stand declared once here instead.

declare const exports: Record<string, unknown>;
declare const require: (id: string) => any;
declare const module: { exports: unknown };
declare const process: { cwd: () => string; env: Record<string, string | undefined> };

declare const $tw: {
  version: string;
  boot?: { wikiPath?: string };
  modules: { types: Record<string, Record<string, unknown>> };
  wiki: { addTiddler: (fields: Record<string, string>) => void };
  utils: { each: (o: unknown, f: (v: unknown, k: string) => void) => void };
};
