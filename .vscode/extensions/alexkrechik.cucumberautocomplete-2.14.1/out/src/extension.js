'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode_1 = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
function activate(context) {
    // Node server module
    let serverModule = context.asAbsolutePath(path.join('server', 'server.js'));
    //Use debug options for the debug mode
    let debugOptions = { execArgv: ["--nolazy", "--inspect=9229"] };
    let serverOptions = {
        run: { module: serverModule, transport: vscode_languageclient_1.TransportKind.ipc },
        debug: { module: serverModule, transport: vscode_languageclient_1.TransportKind.ipc, options: debugOptions }
    };
    let clientOptions = {
        // Register the server for Cucumber feature files
        documentSelector: ['feature'],
        synchronize: {
            configurationSection: 'cucumberautocomplete',
            // Notify the server about file changes to '.clientrc files contain in the workspace
            fileEvents: vscode_1.workspace.createFileSystemWatcher('**/.clientrc')
        }
    };
    // Create the language client and start the client.
    let disposable = new vscode_languageclient_1.LanguageClient('cucumberautocomplete-client', 'Cucumber auto complete plugin', serverOptions, clientOptions).start();
    //Client will be deactivate on extension deactivation
    context.subscriptions.push(disposable);
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map