// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { BSProject } from './project';
import { BSSymbolsInfo } from './project';
import { getKPocketSymbols } from './project';

const DELIMITERS = [' ', '=', '/', '(', ')', '[', ']', '+', '-', '*', '&', '<', '>', '"', ',', ':'];

export var project: BSProject;

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	let crPanel: vscode.WebviewPanel | undefined = undefined;
	let kPocketPanel: vscode.WebviewPanel | undefined = undefined;
	let plc: vscode.TextDocument | undefined = undefined;
	project = {
		hasProjectFile: false,
		hasAliases: false
	};
	console.log('searching for project file');
	readProjectFile()
		.then(parseDocuments)
		.then(()=> {
			if (crPanel) {
				crPanel.webview.postMessage(getMOPs());
			}
		});
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	console.log('Congratulations, your extension "bs-plc" is now active!');

	let folders =vscode.workspace.workspaceFolders;
	if (folders) {
		// FIXME: if is there more than one folder?
		project.folder = folders[0].uri;
	}

	// The command has been defined in the package.json file
	let scrCmd = vscode.commands.registerCommand('bs-plc.showUsed', () => {
		const columnToShowIn = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn : undefined;
		if (crPanel) {
			crPanel.reveal(columnToShowIn);
		} else {
			crPanel = vscode.window.createWebviewPanel(
				'crossReference',
				'Used T, C, R Symbols',
				columnToShowIn || vscode.ViewColumn.One,
				{
					enableScripts: true,
					retainContextWhenHidden: true
				}
			);
		}
		crPanel.webview.html = getWebviewContent(crPanel.webview, context.extensionUri);

		if (project.mops) {
			crPanel.webview.postMessage(getMOPs());
		} else {
			// single file mode
			plc = vscode.window.activeTextEditor?.document;
			if (plc) {
				parseDocument(plc).then((mops) => crPanel?.webview.postMessage(mops));
			}
		}

		crPanel.onDidDispose(() => {
			crPanel = undefined;
		}, null, context.subscriptions);
	});

	// view K pocket command
	let kPocketCmd = vscode.commands.registerCommand('bs-plc.showKPocket', () => {
		const columnToShowIn = vscode.window.activeTextEditor?.viewColumn;
		if (kPocketPanel) {
			kPocketPanel.reveal(columnToShowIn);
		} else {
			kPocketPanel = vscode.window.createWebviewPanel(
				'crossReference',
				'Used symbols in K pocket',
				columnToShowIn || vscode.ViewColumn.Two,
				{
					enableScripts: true,
					retainContextWhenHidden: true
				}
			);
			kPocketPanel.webview.html = getPocketWebviewContent(kPocketPanel.webview, context.extensionUri, 'K');

			if (project.mops) {
				kPocketPanel.webview.postMessage(getKPocketSymbols());
			} else {
				// single file mode
				plc = vscode.window.activeTextEditor?.document;
				if (plc) {
					parseDocument(plc).then((mops) => kPocketPanel?.webview.postMessage(getKPocketSymbols()));
				}
			}

			kPocketPanel.onDidDispose(() => {
				kPocketPanel = undefined;
			}, null, context.subscriptions);
		}
	});

	// view K pocket command
	let nPocketCmd = vscode.commands.registerCommand('bs-plc.showNPocket', () => {

	});

	console.log("register symbol provider");
	let dsp = vscode.languages.registerDocumentSymbolProvider({ language: "bsplc" }, new BSDocumentSymbolProvider());
	
	console.log('register hover provider');
	let hp = vscode.languages.registerHoverProvider({language: 'bsplc'}, new BSHoverProvider());

	// on document save
	let ce = vscode.workspace.onDidSaveTextDocument((doc) => {
		if (project.hasProjectFile || (plc && doc.fileName === plc.fileName)) {
			let plcData = parseDocument(doc);
			plcData.then(function (result) {
				project.mops?.set(doc.uri.path, result);
				crPanel?.webview.postMessage(result);
				kPocketPanel?.webview.postMessage(getKPocketSymbols());
				return null;
			});
		} else if (project.mops) {
			parseDocuments().then(() => crPanel?.webview.postMessage(getMOPs()));
		}
	});

	context.subscriptions.push(scrCmd);
	context.subscriptions.push(kPocketCmd);
	context.subscriptions.push(nPocketCmd);
	context.subscriptions.push(dsp);
	context.subscriptions.push(ce);
	context.subscriptions.push(hp);
}

function getMOPs(): BSSymbolsInfo {
	return {
		timers: mergeTimers(),
		counters: mergeCounters(),
		pulses: mergePulses()
	};
}

function mergeTimers() {
	if (project.mops && project.mops.size > 0) {
		let t = new Array<number>();
		for (let val of project.mops.values()) {
			if (val.timers) {
				t = t.concat(val.timers);
			}
		}
		return t;
	}
	return [];
}

function mergeCounters() {
	if (project.mops && project.mops.size > 0) {
		let c = new Array<number>();
		for (let val of project.mops.values()) {
			if (val.counters) {
				c = c.concat(val.counters);
			}
		}
		return c;
	}
	return [];
}

function mergePulses() {
	if (project.mops && project.mops.size > 0) {
		let p = new Array<number>();
		for (let val of project.mops.values()) {
			if (val.pulses) {
				p = p.concat(val.pulses);
			}
		}
		return p;
	}
	return [];
}

async function readProjectFile() {
	let files = await vscode.workspace.findFiles('bsplc.json');
	if (!(files.length > 0)) {
		vscode.window.showInformationMessage('Project file now found. Single file mode');
		return;
	}
	let file = await vscode.workspace.fs.readFile(files[0]);
	const buf = Buffer.from(file);
	let prj: {files: Array<string>};
	try {
		prj = JSON.parse(buf.toString());
		if (prj.files) {
			project.files = prj.files;
			project.hasProjectFile = true;
		}
	} catch (error) {
		console.error(error);
	}
}

function parseComment(line: string) {
	let s = line.match( /^;\s*(T\d{1,3}|C\d{1,2}|P\d{1,2}|[IUW]\d{1,3}[AKNT]\d{1,2}|[!][a-zA-Z0-9@#.'?]+).*?-(.+)/ );
	if (!project.hoverMap) {project.hoverMap = new Map<string, string>();}
	if (s && !s[1].startsWith('!')) {
		// console.log(s[1], '-', s[2]);
		project.hoverMap.set(s[1], s[2]);
	} else if (s && s[1].startsWith('!') && project.hasAliases && project.aliasToSymbol) {
		let a = project.aliasToSymbol.get(s[1]);
		if (a) {
			project.hoverMap.set(a, s[2]);
		}
	}
}

function parsePocketSymbol(m:RegExpMatchArray, result: BSSymbolsInfo) {
	if (m[2] === 'K') {
		if (!result.pocketKSymbols) { result.pocketKSymbols = new Map<number,Array<number>>(); }
		try {
			let socket = Number.parseInt(m[1]);
			let signal = Number.parseInt(m[3]);
			if (result.pocketKSymbols.has(socket)) {
				result.pocketKSymbols.get(socket)?.push(signal);
			} else {
				let ar = new Array<number>();
				ar.push(signal);
				result.pocketKSymbols.set(socket, ar);
			}

		} catch (error) {
			console.error('number parse error ', error);
			return;
		}
	} else if (m[2] === 'N') {
		if (!result.pocketNSymbols) { result.pocketNSymbols = new Map<number,Array<number>>(); }
		try {
			let socket = Number.parseInt(m[1]);
			let signal = Number.parseInt(m[3]);
			if (result.pocketNSymbols.has(socket)) {
				result.pocketNSymbols.get(socket)?.push(signal);
			} else {
				let ar = new Array<number>();
				ar.push(signal);
				result.pocketNSymbols.set(socket, ar);
			}
		} catch (error) {
			console.error('number parse error ', error);
			return; 
		}
	}
}

function parsePocketWord(m: RegExpMatchArray, result: BSSymbolsInfo) {
	if (m[2] === 'K') {
		if (!result.pocketKWords) { result.pocketKWords = new Map<number, Array<number>>(); }
		try {
			let socket = Number.parseInt(m[1]);
			let group = Number.parseInt(m[3]);
			if (result.pocketKWords.has(socket)) {
				result.pocketKWords.get(socket)?.push(group);
			} else {
				let ar = new Array<number>();
				ar.push(group);
				result.pocketKWords.set(socket,ar);
			}
		} catch (error) {
			console.error('number parse error', error);
		}
	} else if (m[2] === 'N') {
		if (!result.pocketNWords) { result.pocketNWords = new Map<number, Array<number>>(); }
		try {
			let socket = Number.parseInt(m[1]);
			let group = Number.parseInt(m[3]);
			if (result.pocketNWords.has(socket)) {
				result.pocketNWords.get(socket)?.push(group);
			} else {
				let ar = new Array<number>();
				ar.push(group);
				result.pocketNWords.set(socket,ar);
			}
		} catch (error) {
			console.error('number parse error', error);
		}
	}
}

async function parseDocument(doc:vscode.TextDocument | string) {
	let lines: Array<string>;
	let reg = /\r?\n/;
	if (typeof doc === 'string') {
		lines = doc.split(reg);
	} else {
		lines = doc.getText().split(reg);
	}
	let result: BSSymbolsInfo = {};
	for (let i = 0; i < lines.length; i++){
		let line = lines[i].trim();
		
		if (line.startsWith(";")) {
			parseComment(line);
			continue;
		}
		let m: RegExpMatchArray | null;
		switch (line.charAt(0).toUpperCase()) {
			case 'C':
				// Counters
				if (!result.counters) {result.counters = [];}
				let c = 0;
				// result.counters.push();
				m = line.match(/^C(\d{1,2})I/);
				if (m) {
					c = Number.parseInt(m[1]);
					// console.log("counter ", c , m.input? m.input: "");
					result.counters.push(c);
				}
				break;
			case 'T':
				// Timers
				if (!result.timers) {result.timers = [];}
				let t = 0;
				m = line.match(/^T(\d{1,3})I/);
				if (m) {
					t = Number.parseInt(m[1]);
					// console.log("timer ", t , m.input? m.input: "");
					result.timers.push(t);
				}
				break;
			case 'U':
				// K and N pocket signals
				m = line.match(/^U(\d{1,3})([NK])(\d{1,2})/);
				let soc = 0;
				let signal = 0;
				if (m) {
					parsePocketSymbol(m, result);
				}
				break;
			case '!':
				// process aliases
				if (!project.hasAliases) { break; }
				m = line.match(/^![a-zA-Z0-9@#.'?]+/);
				if (m) {
					let sym = project.aliasToSymbol?.get(m[1]);
					if (sym?.startsWith('U')) {
						let sm = sym.match(/^U(\d{1,3})([NK])(\d{1,2})/);
						if (sm) {
							parsePocketSymbol(sm, result);
						}
					}
				}
				break;
			case 'P':
				// Pulses
				if (!result.pulses) {result.pulses = [];}
				let p =0;
				m = line.match(/^P(\d{1,2})/);
				if (m) {
					p = Number.parseInt(m[1]);
					// console.log("pulse ", p , m.input? m.input: "");
					result.pulses.push(p);
				}
				break;
			case 'W':
				m = line.match(/^W(\d{1,3})([NK])(\d{1})/);
				if (m) {
					parsePocketWord(m, result);
				}
				break;
			default:
				break;
		}
	}
	return result;
}

function parseAliases(lines: Array<string>) {
	if (!project.aliasToSymbol) { project.aliasToSymbol = new Map<string, string>(); }
	if (!project.symbolToAlias) { project.symbolToAlias = new Map<string, string>(); }
	project.aliasToSymbol.clear();
	project.symbolToAlias.clear();
	for (let line of lines) {
		if (line.startsWith('*')) {continue;}
		let l = line.trim();
		if (l.length > 0) {
			let m = l.match(/\s*([a-zA-Z0-9@#.'?]+)\s*=(.*)\s*/);
			if (m) {
				// console.log(m[1], m[2]);
				project.aliasToSymbol.set(m[1], m[2]);
				project.symbolToAlias.set(m[2], m[1]);
			}
		}
	}
}

async function parseDocuments() {
	if (project.hasProjectFile && project.files && project.folder) {
		for (let i = 0; i < project.files.length; i++) {
			let uri = vscode.Uri.joinPath(project.folder, project.files[i]);
			// check first file for aliases
			let data = await vscode.workspace.fs.readFile(uri);

			let td = new TextDecoder('cp866');
			let text = td.decode(Buffer.from(data));
			if (i === 0 && text.charAt(0) === '*') {
				console.log('aliases file found');
				project.hasAliases = true;
				parseAliases(text.split(/\r?\n/));
			} else {
				if (!project.mops) { project.mops = new Map(); }
				project.mops.set(uri.path, await parseDocument(text));
			}
		}
	} else if (vscode.window.activeTextEditor) {
		let doc = vscode.window.activeTextEditor.document;
		if (!project.mops) { project.mops = new Map(); }
		project.mops.set(doc.uri.path , await parseDocument(doc.getText()));
	}
}

class BSDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
	provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SymbolInformation[] | vscode.DocumentSymbol[]> {
		return new Promise((resolve, rejects) => {
			var symbols = new Array<vscode.SymbolInformation>();
			var cancelled = false;
			// console.log("begin parse file for symbols");
			for(let i = 0; i < document.lineCount; i++){
				if (token.isCancellationRequested) {
					console.log("file parsing cancelled");
					cancelled = true;
					break;
				}
				let line = document.lineAt(i).text.trim();
				if (line.startsWith(";*** ")) {
					symbols.push(new vscode.SymbolInformation(line.substring(4).trim(),
					vscode.SymbolKind.Package, "",
					new vscode.Location(document.uri,document.lineAt(i).range)));
				}
			}
			if (cancelled) {
				rejects("cancelled");
			} else {
				resolve(symbols);
			}
		});
	}
}

function getToken(line: string, position: number) {
	let start = position;
	let end = position;
	for (let i = position; i >= 0; i--) {
		if (DELIMITERS.includes(line.charAt(i))) {
			break;
		} else {
			start = i;
		}
	}
	for (let j = position; j < line.length; j++) {
		if (DELIMITERS.includes(line.charAt(j))) {
			break;
		} else {
			end = j + 1;
		}
	}
	let token = line.substring(start, end);
	// truncate metaoperand function suffix
	if (token.startsWith('T') || token.startsWith('C')) {
		token = token.substring(0, token.length - 1);
	}
	return token;
}

class BSHoverProvider implements vscode.HoverProvider {
	provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
		return new Promise((resolve, reject) => {
			let line = document.lineAt(position.line);
			if (line.isEmptyOrWhitespace) {
				resolve(null);
			} else if (line.text.charAt(line.firstNonWhitespaceCharacterIndex) === ';') {
				resolve(null);
			} else if (DELIMITERS.includes(line.text.charAt(position.character))) {
				resolve(null);
			} else {
				let t = getToken(line.text, position.character);
				let description = '';
				if (project.hoverMap){
					if (t.startsWith('!') && project.hasAliases && project.aliasToSymbol) {
						// aliases
						t = t.substring(1);
						let s = project.aliasToSymbol.get(t);
						if (s) {
							let d = project.hoverMap.get(s);
							description =  d ? `${s} (${t}) - ${d}` : `${s} (${t})`;
						} else {
							description = `${t}`;
						}
					} else if (project.hasAliases && project.symbolToAlias) {
						// add alias to description
						let a = project.symbolToAlias.get(t);
						let d = project.hoverMap.get(t);
						if (a) {
							description = d ? `${t} (${a}) - ${d}` : `${t} (${a})`;
						} else {
							description = d ? `${t} - ${d}` : `${t}`;
						}
					} else {
						let d = project.hoverMap.get(t);
						description = d ? `${t} - ${d}` : `${t}`;
					}
				}
				resolve(new vscode.Hover(
					new vscode.MarkdownString(description)
				));
			}
		});
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}

function getWebviewContent(webview:vscode.Webview, extensionUri:vscode.Uri): string {
	// local path to script
	const scriptPathOnDisk = vscode.Uri.joinPath(extensionUri, 'media', 'main.js');
	const scriptPath = webview.asWebviewUri(scriptPathOnDisk);
	// local path to style
	const stylePathOnDisk = vscode.Uri.joinPath(extensionUri, 'media', 'style.css');
	const stylePath = webview.asWebviewUri(stylePathOnDisk);
	return `<!DOCTYPE html>
	<html lang="en">
	
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Used T,C,P operators</title>
		<link href="${stylePath}" rel="stylesheet">
	</head>
	
	<body>
		<h1>Used T,C,P operators</h1>
		<div id="timers"></div>
		<div id="counters"></div>
		<div id="pulses"></div>
		<script src="${scriptPath}"></script>
	</body>
	
	</html>`;
}

function getPocketWebviewContent(webview:vscode.Webview, extensionUri: vscode.Uri, pocket:'K'|'N'){
		// local path to script
		const scriptPathOnDisk = vscode.Uri.joinPath(extensionUri, 'media', 'pockets.js');
		const scriptPath = webview.asWebviewUri(scriptPathOnDisk);
		// local path to style
		const stylePathOnDisk = vscode.Uri.joinPath(extensionUri, 'media', 'style.css');
		const stylePath = webview.asWebviewUri(stylePathOnDisk);
		return `<!DOCTYPE html>
		<html lang="en">
		
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Used ${pocket} pocket signals</title>
			<link href="${stylePath}" rel="stylesheet">
		</head>
		
		<body>
			<h1>Used ${pocket} pocket signals</h1>
			<div id="signals"></div>
			<script src="${scriptPath}"></script>
		</body>
		
		</html>`;
}