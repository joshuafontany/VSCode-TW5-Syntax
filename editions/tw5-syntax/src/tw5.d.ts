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
  modules: {
    types: Record<string, Record<string, unknown>>;
    /** Every module of one type, with its exports — how a rule declares the modes it reads in. */
    forEachModuleOfType(type: string, callback: (title: string, exports: any) => void): void;
  };
  wiki: { addTiddler: (fields: Record<string, string>) => void };
  utils: {
    each: (o: unknown, f: (v: unknown, k: string) => void) => void;
    /** A title list: "One [[Two Words]] Three". The reader that declares tags and list. */
    parseStringArray: (value: string, allowDuplicate?: boolean) => string[] | null;
    parseDate: (value: unknown) => Date | null;
  };
  Tiddler: {
    /** What each field name declares about the value it holds, keyed by field name. */
    fieldModules: Record<string, { parse?: unknown; stringify?: unknown; editType?: string }>;
  };
};
