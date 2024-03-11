# Description

Visual Studio Code support for Balt System PLC language.

## Precaution

Currently files not always opened with correct encoding. Do not edit and save file until you reopen it with correct
encoding! Doing so can break you comments. Correct encoding for Balt System PLC files is `CP 866`.

## Usage

In order for files to be recognized as Balt System PLC add comment in first line 
```lisp
; bsplc
```
You can also manually switch language from status bar.

This will activate following features

* Syntax highlighting
* Document outline
* Multiple PLC program files
* Alias file
* Hover info
* Meta operands usage info

### Document outline 

Document outline currently show sections of document. To make such section add `;*** ` before section name and it will
appear at outline.

### Project file

To support multiple files, they must be listed in the project file `bsplc.json`. 
```json
{
  "files": ["file1", "file2", "file3"]
}
```

### Symbol file (alias file)

If alias file exists in PLC project it must be first in the project files list.

### Hover info

Docstring for hover info parsed from comments in PLC files. Comments must be formatted as follows:
```lisp
; <symbol or alias> - symbol comments
```
For example:
```lisp
; I0A5 - axis X hardware limit switch +
```
If project contains alias file it is enough to supply such a comment 
for either symbol or alias one time.

### Meta Operands usage info

To show metaoperands usage info open command palette
with `Ctrl+Shift+P` and search for `BS PLC: Show Used Meta Operands`. This will open webview with usage information.

## Planing features

* cross references view
  * show where signals is used.
* symbol file support
  * code suggestion for replacing signal to existing symbols
  * create symbol from signal
  * renaming symbols