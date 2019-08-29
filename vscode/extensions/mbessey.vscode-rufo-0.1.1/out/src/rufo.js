"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const vscode_1 = require("vscode");
class RubyDocumentFormatter {
    provideDocumentFormattingEdits(document) {
        return runRufo(document);
    }
}
exports.RubyDocumentFormatter = RubyDocumentFormatter;
function runRufo(document) {
    return new Promise((resolve, reject) => {
        try {
            const documentText = document.getText();
            const cwd = vscode_1.workspace.rootPath;
            const options = { timeout: 3000 };
            if (cwd)
                options.cwd = cwd;
            const child = child_process_1.exec("rufo", options, (error, stdout, stderr) => {
                if (!stderr && stdout && stdout.length > 0) {
                    const lastLine = document.lineCount - 1;
                    const endOfLastLine = document.lineAt(lastLine).range.end;
                    const range = new vscode_1.Range(new vscode_1.Position(0, 0), endOfLastLine);
                    const textEdits = [new vscode_1.TextEdit(range, stdout)];
                    resolve(textEdits);
                }
                else {
                    vscode_1.window.showErrorMessage(stderr || error.message);
                    reject();
                }
            });
            child.stdin.write(documentText);
            child.stdin.end();
        }
        catch (err) {
            if (err.message.includes("command not found")) {
                vscode_1.window.showErrorMessage("rufo not available in path. Ensure rufo gem is installed");
                reject();
            }
            else {
                vscode_1.window.showErrorMessage(err.message);
                reject();
            }
        }
    });
}
//# sourceMappingURL=rufo.js.map