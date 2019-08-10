"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const rufo_1 = require("./rufo");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate() {
    vscode_1.languages.registerDocumentFormattingEditProvider({ language: "ruby", scheme: "file" }, new rufo_1.RubyDocumentFormatter());
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() {
    // No-op
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map