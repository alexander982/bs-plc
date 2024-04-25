import * as vscode from 'vscode';

export type BSProject = {
    folder?: vscode.Uri
    files?: Array<string>,
    hasProjectFile: boolean,
    hasAliases: boolean,
    mops?: Map<string, BSSymbolsInfo>,
    aliasToSymbol?: Map<string, string>,
    symbolToAlias?: Map<string, string>,
    hoverMap?: Map<string, string>
};

export type BSSignal = {
    socket: number,
    signal: number,
};

export type BSWord = {
    socket: number,
    group: number,
};

export type BSSymbolsInfo = {
	counters?: Array<number>;
	timers?: Array<number>;
	pulses?: Array<number>;
	pocketKSymbols?: Array<BSSignal>;
	pocketKWords?: Array<BSWord>;
	pocketNSymbols?: Array<BSSignal>;
	pocketNWords?: Array<BSWord>;
};
