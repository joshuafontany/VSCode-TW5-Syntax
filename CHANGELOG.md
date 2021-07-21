# Change Log

All notable changes to the "tw5-syntax" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

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