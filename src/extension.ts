import * as vscode from 'vscode';
import * as ps from 'ps-node';

const PROXY_PORT_0 = 'proxy --port=0';
const kubectlPIDs: any = {};
let timeout = 5000; // Initial delay

let extensionOutputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
	extensionOutputChannel = vscode.window.createOutputChannel('kubectl-reaper', 'log');
	setTimeout(scanForKubectlProxyPort0, timeout);
}

function scanForKubectlProxyPort0() {
	ps.lookup({
		command: 'kubectl'
	}, function(err, resultList ) {
		if (err) {
			extensionOutputChannel.appendLine('' + err);
		}
		let kubectlProxyPort0Seen = false;
		resultList.forEach(function (p) {
			const kubectlArgs = p.arguments.join(' ');
			if (p && PROXY_PORT_0 === kubectlArgs) {
				kubectlProxyPort0Seen = true;
				const key = '' + p.pid;
				if (kubectlPIDs[key]) {
					// Seeing it second time, kill it
					extensionOutputChannel.appendLine(
						`${logDateTimeFormat(new Date())} [kubectl-reaper] [warning] Killing: kubectl ${PROXY_PORT_0} PID: ${(''+key).padStart(6, ' ')}`);
					delete kubectlPIDs[key];
					try {
						process.kill(p.pid);
					} catch (e) {
					}
				} else {
					extensionOutputChannel.appendLine(
						`${logDateTimeFormat(new Date())} [kubectl-reaper] [info   ]    Seen: kubectl ${PROXY_PORT_0} PID: ${(''+key).padStart(6, ' ')}`);
					kubectlPIDs[key] = true;
				}
			}
		});
		if (!kubectlProxyPort0Seen) {
			extensionOutputChannel.appendLine(
				`${logDateTimeFormat(new Date())} [kubectl-reaper] [info   ]    Zero: kubectl ${PROXY_PORT_0} Next check after 2 minutes`);
		}
		// if kubectls are not found in this cycle, change timeout to 120 seconds
		timeout = (kubectlProxyPort0Seen ? 5000 : 120000);
		setTimeout(scanForKubectlProxyPort0, timeout);
	});
}

function logDateTimeFormat(date: Date): string {
	if (date) {
		const year = date.getFullYear();
		const month = date.getMonth()+1;
		const day = date.getDate();
		const hours = date.getHours();
		const minutes = date.getMinutes();
		const seconds = date.getSeconds();
		const milliseconds = date.getMilliseconds();

		return `[${year}-${(''+month).padStart(2, '0')}-${(''+day).padStart(2, '0')} ${(''+hours).padStart(2, '0')}:${(''+minutes).padStart(2, '0')}:${(''+seconds).padStart(2, '0')}.${(''+milliseconds).padStart(3, '0')}]`;
	}
	return '';
}

export function deactivate() {}
