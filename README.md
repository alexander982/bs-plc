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

Document outline currently show sections of document. To make such section add `;*** ` before section name and it will
appear at outline.

From opened PLC source code file it is possible to show used timers, counters and pulses operands. Open command palette
with `Ctrl+Shift+P` and search for `BS PLC: Show Used Meta Operands`. This will open webview with usage information. Currently
parsed only one active file.

## Planing features

* cross references view
  * used/unused timers, counters and other signals.
  * show where signals is used.
* hover info on symbols from specially formatted comments.
* project file and view to configure PLC environment when dealing with multiple plc program files. Automatically activate
  the extension when project file exists.
* symbol file support
  * code suggestion for replacing signal to existing symbols
  * create symbol from signal
  * renaming symbols