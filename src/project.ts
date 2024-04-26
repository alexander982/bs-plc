import * as vscode from 'vscode';
import { project } from './extension';

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

export type BSPocket = {
    pocket: 'K' | 'N';
    signals: {[key: number]: Array<number>};
    words: {[key: number]: Array<number>};
};

export function getKPocketSymbols(): BSPocket {
    console.log('merge pocket symbols');
    let signals = new Map<number, Array<number>>();
    let words = new Map<number, Array<number>>();
    if (project.mops && project.mops.size > 0) {
        for (let s of project.mops.values()) {
            if (s.pocketKSymbols) {
                for (let kv of s.pocketKSymbols.entries()) {
                    let old = signals.get(kv[0]);
                    if (old) {
                        signals.set(kv[0], old.concat(kv[1]));
                    } else {
                        signals.set(kv[0], kv[1]);
                    }
                }
            }
            if (s.pocketKWords) {
                for (let kv of s.pocketKWords.entries()) {
                    let old = words.get(kv[0]);
                    if (old) {
                        words.set(kv[0], old.concat(kv[1]));
                    } else {
                        words.set(kv[0], kv[1]);
                    }
                }
            }
        }

    }
	return {
        pocket: 'K',
        signals: mapToObject(signals),
        words: mapToObject(words)
    };
}

// TODO: DRY
export function getNPocketSymbols(): BSPocket {
    console.log('merge pocket symbols');
    let signals = new Map<number, Array<number>>();
    let words = new Map<number, Array<number>>();
    if (project.mops && project.mops.size > 0) {
        for (let s of project.mops.values()) {
            if (s.pocketNSymbols) {
                for (let kv of s.pocketNSymbols.entries()) {
                    let old = signals.get(kv[0]);
                    if (old) {
                        signals.set(kv[0], old.concat(kv[1]));
                    } else {
                        signals.set(kv[0], kv[1]);
                    }
                }
            }
            if (s.pocketNWords) {
                for (let kv of s.pocketNWords.entries()) {
                    let old = words.get(kv[0]);
                    if (old) {
                        words.set(kv[0], old.concat(kv[1]));
                    } else {
                        words.set(kv[0], kv[1]);
                    }
                }
            }
        }

    }
	return {
        pocket: 'N',
        signals: mapToObject(signals),
        words: mapToObject(words)
    };
}

function mapToObject(m: Map<number, Array<number>>) {
    let obj:{[key: number]: Array<number>} = {};
    for (let [k,v] of m) {
        obj[k] = v;
    }
    return obj;
}
