import * as vscode from 'vscode';

export type BSProject = {
    files?: Array<string>,
    hasProjectFile: boolean,
    hasAliases: boolean,
    mops?: Map<string, {
        timers?: Array<number>,
        counters?: Array<number>,
        pulses?: Array<number>,
    }>,
    aliasToSymbol?: Map<string, string>,
    symbolToAlias?: Map<string, string>,
    hoverMap?: Map<string, string>
};