// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { BSProject } from './project';

const DELIMITERS = [' ', '=', '/', '(', ')', '[', ']', '+', '-', '*', '&', '<', '>', '"', ',', ':'];

var project: BSProject;

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	let crPanel: vscode.WebviewPanel | undefined = undefined;
	let plc: vscode.TextDocument | undefined = undefined;
	project = {
		hasProjectFile: false,
		hasAliases: false
	};
	console.log('searching for project file');
	readProjectFile().then(() => console.log(`check global var prjFiles: ${project.files}`));
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
		plc = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document : undefined;
		if (plc) {
			let plcData = parseDocument(plc);
			plcData.then(function(result){
				console.log("result ", result);
				if (crPanel) {
					console.log('post message');
					crPanel.webview.postMessage(result);
				}
				return null;
			});
		}
		// crPanel.webview.postMessage({});

		vscode.window.showInformationMessage('There is no cross reference yet');

		crPanel.onDidDispose(() => {
			crPanel = undefined;
		}, null, context.subscriptions);
	});
	console.log("register symbol provider");
	let dsp = vscode.languages.registerDocumentSymbolProvider({ language: "bsplc" }, new BSDocumentSymbolProvider());
	
	console.log('register hover provider');
	let hp = vscode.languages.registerHoverProvider({language: 'bsplc'}, new BSHoverProvider());

	// on document save
	let ce = vscode.workspace.onDidSaveTextDocument((doc) => {
		if (doc && plc && doc.fileName === plc.fileName) {
			let plcData = parseDocument(doc);
			plcData.then(function (result) {
				if (crPanel) {
					crPanel.webview.postMessage(result);
				}
				return null;
			});
		}
	});

	context.subscriptions.push(scrCmd);
	context.subscriptions.push(dsp);
	context.subscriptions.push(ce);
	context.subscriptions.push(hp);
}

type BSSymbolsInfo = {
	counters?: Array<number>,
	timers?:Array<number>,
	pulses?:Array<number>,
	signals?:Array<string>
};

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
		}
	} catch (error) {
		console.error(error);
	}
}

function parseComment(line: string) {
	let s = line.match( /^;\s*(T\d{1,3}I?|C\d{1,2}I?|P\d{1,2}|[IUW]\d{1,3}[AKNT]\d{1,2}|[!][a-zA-Z0-9@#.'?]+)\s*-(.+)/ );
	if (s && !s[1].startsWith('!')) {
		console.log(s[1], '-', s[2]);
		if (!project.hoverMap) {project.hoverMap = new Map<string, string>();}
		project.hoverMap.set(s[1], s[2]);
	};
}

async function parseDocument(doc:vscode.TextDocument | string) {
	let lines: Array<string>;
	if (typeof doc === 'string') {
		lines = doc.split('\n');
	} else {
		lines = doc.getText().split('\n');
	}
	let result: BSSymbolsInfo = {};
	for (let i = 0; i < lines.length; i++){
		let line = lines[i].trim();
		
		if (line.startsWith(";")) {parseComment(line);}
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
			default:
				break;
		}
	}
	return result;
}

async function parseDocuments() {
	if (project.hasProjectFile) {
		// TODO: parse documents
	} else if (vscode.window.activeTextEditor) {
		let doc = vscode.window.activeTextEditor.document;
		await parseDocument(doc);
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
	return line.substring(start, end);
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
					let d = project.hoverMap.get(t);
					if (d) { description = ` - ${d}`;}
				}
				resolve(new vscode.Hover(
					new vscode.MarkdownString(`${t}${description}`)
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

