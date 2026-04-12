# Change Log

All notable changes to the "tw5-syntax" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## 2.0.6
- Allow all pragmas to have leading whitespace (allows nested and indented named pragmas of macros, procedures, and widgets).

## 2.0.5
- Cannot inject wikitext parsing into `<style>` tags. Closed as won't-fix. //Style tags do not parse wikitext #42
- Add a `constributes/languages` object for 'json', maps `".info", ".files"` extensions to Json language features as "Tiddlywiki5 Json".

## 2.0.4
- Version bump to fix publishing bug.

## 2.0.3
- Fixed parsing bug with tiddlywiki style attributes in `svg` tags.
- Fixed parsing bug with tiddlywiki style attributes in `math` tags.
- Added #inline parsing to contents of SVG and Math tags.
- Underline decoration on `~~strikethrough~~` syntax.

## 2.0.2
- Merge `snippets/snippets.json` fixes from @pmario. Mahalo/Thanks!!!!!
  - `<% if` //fix conditional if and add if elseif else if full structure #17
  - `tid` //add additional new-line before final input cursor #18
  - Pragma snippets //remove \end <name>, because it is inconvenient #19
  - `\rulesstyle` pragma //add fnprocdef to rulestyle definition snippet #20
  - `\whitespace` pragma //fix the whitespace pragma #21
  - Filtered transclusions //add 1 leading and trailling space between filter and braces for better readability #22
  - Transclusions //fix trt and tit snippet shortcuts #23
  - `|tablerc` //replace tabs with spaces in tablerc #24
  - //make sup, sub and inline code snippets more reachable with non english keyboard layouts #25
  - //call macros with named parameters for best practice #26
  - //fix the list-links macro and add list-links-draggable #27
  - //tocs use named params for best practice #28
  - //fix macrocall, set, vars and let-widget #29
  - //fix list, listv and add listz with all parameters #30
  - //adjust view- and revealwidget #31
  - //adjust scrollable, edit-text and select widget #32
  - //adjust checkbox and radio snippets #33
  - //adjust button snippets, add Button Actions procedure for best practice #34
  - //adjust action-widgets and make aciton-deletetiddler safe #35
  - //adjust substitutions #36

## 2.0.1
- fix README

## 2.0.0
- Full re-write to model tiddlywiki5 wikitext as a `text.html.derivative` style sytanx.
- Updated syntax json version to current Tiddlywiki5 v`5.3.4`.
- Updated known keywords/grammar concepts in json `repository`.
- Imported full html5 syntax from `tm-grammar`, added tiddlywiki style attributes, etc.
- New objects from `text.html.basic` renamed as `htmlwidget-*` for easy diff/updates.
- Added snippets for modern tiddlywiki5 wikitext.
- Added full set of automated tests to `./tests`. Run `npm run test` to run all tests.
- Added syntax highlihgting for tests files that marks the `# ^ test.commment.with.expected.scopes` lines appropriately.
- Added reference required syntaxes to `devDependecies` in `package.json`
- Fixed bugs with widget attribute syntax in base html tags
- Fixed syntax bugs with macros
- Fixed sytax bugs with block quotes
- Fixed syntax bugs with image links
- Fixed syntax bugs with links
- Fixed bugs with horizontal rules
- Fixed bugs with list quotes
- Fixed bugs with codeinline, codeblock, typedblock.
- Added `.tw|.tw5|.tiddlywiki|.tiddlywiki5|text/vnd.tiddlywiki` to `#typedblock`.
- Added `tw|tw5|tiddlywiki|tiddlywiki5` to `#codeblock`

## 1.1.0
- Reviewed repository with ChatGPT4
- Cleaned up redundant files
- Added Conditional If syntax

## 1.0.4
- Reverted bugs
- Fixed typos

## 1.0.3
- Added a Snippet to set the `modified` field to a current unix-style timestamp.

## 1.0.2
- Updated `tid` Snippet to offer a dropdown of `type` field options.
-- Mahalo to "_Phi / hpx1" for the contributions!

## 1.0.1

- Fixed snippets to correctly render widget syntax, `<$button> </$button>`.
- Added a very nifty "Tiddler Metadata" snippet, `tid`, which will insert a block of tiddler meta-data fields into an empty *.tid file. Just type `tid` and press tab. `created` and `modified` fields come automatically timestamped, and you can tab to move between field values.
-- Very neat, thanks a lot to "_Phi / hpx1" for this snippet!

## 1.0.0

- Release!

## 0.1.2

- Improved variable, tranclusion, link, and macro definition recognition
- Setup seperate "language names" for *.tid / *.meta ("tid"), vs  / *.multids files ("multitids") vs *.tw / *.tw5 wikitext ("tiddlywiki5"). This helps debugging and with certain grammar features (injections).
- Mapped MIME types

## 0.1.1

- Improved string and pragma recognition

## 0.1.0

- Initial release