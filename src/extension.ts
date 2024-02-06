// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	let crPanel: vscode.WebviewPanel | undefined = undefined;
	let plc: vscode.TextDocument | undefined = undefined;
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	console.log('Congratulations, your extension "bs-plc" is now active!');

	// The command has been defined in the package.json file
	let scrCmd = vscode.commands.registerCommand('bs-plc.showUsed', () => {
		const columnToShowIn = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn : undefined;
		if (crPanel) {
			crPanel.reveal(columnToShowIn);
		} else {
			crPanel = vscode.window.createWebviewPanel(
				'crossReference',
				'Used Symbols',
				columnToShowIn || vscode.ViewColumn.One,
				{
					enableScripts: true,
					retainContextWhenHidden: true
				}
			);
		}
		crPanel.webview.html = getWebviewContent();
		plc = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document : undefined;
		let plcData = parseDocument(plc);
		plcData.then(function(result){
			console.log("result ", result);
			if (crPanel) {
				console.log('post message');
				crPanel.webview.postMessage(result);
			}
			return null;
		});
		// crPanel.webview.postMessage({});

		vscode.window.showInformationMessage('There is no cross reference yet');

		crPanel.onDidDispose(() => {
			crPanel = undefined;
		}, null, context.subscriptions);
	});
	console.log("register symbol provider");
	let dsp = vscode.languages.registerDocumentSymbolProvider({ language: "bsplc" }, new BSDocumentSymbolProvider());

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
}

type BSSymbolsInfo = {
	counters?: Array<number>,
	timers?:Array<number>,
	pulses?:Array<number>,
	signals?:Array<string>
};

async function parseDocument(doc:vscode.TextDocument | undefined) {
	if (!doc) {return undefined;}
	let result: BSSymbolsInfo = {};
	for (let i = 0; i < doc.lineCount; i++){
		let line = doc.lineAt(i);
		//skip comments
		if (line.text.trim().startsWith(";")) {continue;}
		let m: RegExpMatchArray | null;
		switch (line.text.charAt(0).toUpperCase()) {
			case 'C':
				// Counters
				if (!result.counters) {result.counters = [];}
				let c = 0;
				// result.counters.push();
				m = line.text.trim().match(/^C(\d{1,2})I/);
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
				m = line.text.trim().match(/^T(\d{1,2})I/);
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
				m = line.text.trim().match(/^P(\d{1,2})/);
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

// This method is called when your extension is deactivated
export function deactivate() {}

function getWebviewContent(): string {
	return `<!DOCTYPE html>
	<html lang="en">
	
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Used Symbols</title>
		<style>
			table {
				table-layout: fixed;
			}
	
			table,
			th {
				border: 1px solid gray;
				border-collapse: collapse;
			}
	
			th {
				padding: 8px;
			}
	
			tr:nth-child(1) th {
				border: 2px solid white;
			}
	
			th:nth-child(1) {
				border: 2px solid white;
			}
		</style>
	</head>
	
	<body>
		<h1>Cross Reference</h1>
		<div id="timers"></div>
		<div id="counters"></div>
		<div id="pulses"></div>
		<script>
			console.log("webview script loaded");
	
			function renderTable(data){
				console.log('render table', data);
				let table = '<table>';
				// header
				table += '<tr><th>N</th><th>0</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th></tr>'
				for (let r = 0; r < 10; r++) {
					//rows
					table += '<tr><th>' + r + '</th>';
					for (let c = 0; c < 10; c++) {
						// columns
						if (data.includes((r * 10 + c))) {
							table += '<th>X</th>';
						} else {
							table += '<th></th>';
						}
					}
					table += '</tr>';
				}
				table += '</table>';
				return table;
			}
	
			function renderData(e) {
				const data = e.data;
				console.log("data received ", data);
				const timer = document.getElementById("timers");
				let tableStr = '<h2>Timers</h2>';
				if (data.timers) {tableStr += renderTable(data.timers);}
				timer.innerHTML = tableStr;
				const counter = document.getElementById("counters");
				tableStr = '<h2>Counters</h2>';
				if (data.counters) {tableStr += renderTable(data.counters);}
				counter.innerHTML = tableStr;
				const pulses = document.getElementById("pulses");
				tableStr = '<h2>Pulses</h2>';
				if (data.pulses) {tableStr += renderTable(data.pulses);}
				pulses.innerHTML = tableStr;
			}
	
			window.addEventListener('message', renderData);
		</script>
	</body>
	
	</html>`;
}

