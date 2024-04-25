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

export type BSSymbolsInfo = {
	counters?: Array<number>;
	timers?: Array<number>;
	pulses?: Array<number>;
	pocketKSymbols?: Map<number,Array<number>>;
	pocketKWords?: Map<number,Array<number>>;
	pocketNSymbols?: Map<number,Array<number>>;
	pocketNWords?: Map<number,Array<number>>;
};

export function getKPocketSymbols(): any {
    console.log('merge pocket symbols');
	return null;
}
