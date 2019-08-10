'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const format_1 = require("./format");
const steps_handler_1 = require("./steps.handler");
const pages_handler_1 = require("./pages.handler");
const util_1 = require("./util");
const glob = require("glob");
const fs = require("fs");
//Create connection and setup communication between the client and server
const connection = vscode_languageserver_1.createConnection(new vscode_languageserver_1.IPCMessageReader(process), new vscode_languageserver_1.IPCMessageWriter(process));
const documents = new vscode_languageserver_1.TextDocuments();
documents.listen(connection);
//Path to the root of our workspace
let workspaceRoot;
// Object, which contains current configuration
let settings;
// Elements handlers
let stepsHandler;
let pagesHandler;
connection.onInitialize((params) => {
    workspaceRoot = params.rootPath;
    return {
        capabilities: {
            // Full text sync mode
            textDocumentSync: documents.syncKind,
            //Completion will be triggered after every character pressing
            completionProvider: {
                resolveProvider: true,
            },
            definitionProvider: true,
            documentFormattingProvider: true,
            documentRangeFormattingProvider: true,
            documentOnTypeFormattingProvider: {
                firstTriggerCharacter: ' ',
                moreTriggerCharacter: ['@', '#', ':']
            }
        }
    };
});
function handleSteps() {
    const s = settings.cucumberautocomplete.steps;
    return s && s.length ? true : false;
}
function handlePages() {
    const p = settings.cucumberautocomplete.pages;
    return p && Object.keys(p).length ? true : false;
}
function pagesPosition(line, char) {
    if (handlePages() && pagesHandler && pagesHandler.getFeaturePosition(line, char)) {
        return true;
    }
    else {
        return false;
    }
}
function watchFiles(stepsPathes) {
    stepsPathes.forEach(path => {
        glob.sync(workspaceRoot + '/' + path, { ignore: '.gitignore' })
            .forEach(f => {
            fs.watchFile(f, () => {
                populateHandlers();
                documents.all().forEach((document) => {
                    const text = document.getText();
                    const diagnostics = validate(util_1.clearGherkinComments(text));
                    connection.sendDiagnostics({ uri: document.uri, diagnostics });
                });
            });
        });
    });
}
connection.onDidChangeConfiguration(change => {
    settings = change.settings;
    //We should get array from step string if provided
    settings.cucumberautocomplete.steps = Array.isArray(settings.cucumberautocomplete.steps)
        ? settings.cucumberautocomplete.steps : [settings.cucumberautocomplete.steps];
    if (handleSteps()) {
        watchFiles(settings.cucumberautocomplete.steps);
        stepsHandler = new steps_handler_1.default(workspaceRoot, settings);
        const sFile = '.vscode/settings.json';
        const diagnostics = stepsHandler.validateConfiguration(sFile, settings.cucumberautocomplete.steps, workspaceRoot);
        connection.sendDiagnostics({ uri: util_1.getOSPath(workspaceRoot + '/' + sFile), diagnostics });
    }
    if (handlePages()) {
        const { pages } = settings.cucumberautocomplete;
        watchFiles(Object.keys(pages).map((key) => pages[key]));
        pagesHandler = new pages_handler_1.default(workspaceRoot, settings);
    }
});
function populateHandlers() {
    handleSteps() && stepsHandler && stepsHandler.populate(workspaceRoot, settings.cucumberautocomplete.steps);
    handlePages() && pagesHandler && pagesHandler.populate(workspaceRoot, settings.cucumberautocomplete.pages);
}
documents.onDidOpen(() => {
    populateHandlers();
});
connection.onCompletion((position) => {
    const text = documents.get(position.textDocument.uri).getText();
    const line = text.split(/\r?\n/g)[position.position.line];
    const char = position.position.character;
    if (pagesPosition(line, char) && pagesHandler) {
        return pagesHandler.getCompletion(line, position.position);
    }
    if (handleSteps() && stepsHandler) {
        return stepsHandler.getCompletion(line, position.position.line, text);
    }
});
connection.onCompletionResolve((item) => {
    if (~item.data.indexOf('step')) {
        return stepsHandler.getCompletionResolve(item);
    }
    if (~item.data.indexOf('page')) {
        return pagesHandler.getCompletionResolve(item);
    }
    return item;
});
function validate(text) {
    return text.split(/\r?\n/g).reduce((res, line, i) => {
        let diagnostic;
        if (handleSteps() && stepsHandler && (diagnostic = stepsHandler.validate(line, i, text))) {
            res.push(diagnostic);
        }
        else if (handlePages() && pagesHandler) {
            const pagesDiagnosticArr = pagesHandler.validate(line, i);
            res = res.concat(pagesDiagnosticArr);
        }
        return res;
    }, []);
}
documents.onDidChangeContent((change) => {
    const changeText = change.document.getText();
    //Validate document
    const diagnostics = validate(util_1.clearGherkinComments(changeText));
    connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
});
connection.onDefinition((position) => {
    const text = documents.get(position.textDocument.uri).getText();
    const line = text.split(/\r?\n/g)[position.position.line];
    const char = position.position.character;
    const pos = position.position;
    const { uri } = position.textDocument;
    if (pagesPosition(line, char) && pagesHandler) {
        return pagesHandler.getDefinition(line, char);
    }
    if (handleSteps() && stepsHandler) {
        return stepsHandler.getDefinition(line, text);
    }
    return vscode_languageserver_1.Location.create(uri, vscode_languageserver_1.Range.create(pos, pos));
});
function getIndent(options) {
    const { insertSpaces, tabSize } = options;
    return insertSpaces ? ' '.repeat(tabSize) : '\t';
}
connection.onDocumentFormatting((params) => {
    const text = documents.get(params.textDocument.uri).getText();
    const textArr = text.split(/\r?\n/g);
    const indent = getIndent(params.options);
    const range = vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(0, 0), vscode_languageserver_1.Position.create(textArr.length - 1, textArr[textArr.length - 1].length));
    const formattedText = format_1.format(indent, text, settings);
    const clearedText = format_1.clearText(formattedText);
    return [vscode_languageserver_1.TextEdit.replace(range, clearedText)];
});
connection.onDocumentRangeFormatting((params) => {
    const text = documents.get(params.textDocument.uri).getText();
    const textArr = text.split(/\r?\n/g);
    const range = params.range;
    const indent = getIndent(params.options);
    const finalRange = vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(range.start.line, 0), vscode_languageserver_1.Position.create(range.end.line, textArr[range.end.line].length));
    const finalText = textArr.splice(finalRange.start.line, finalRange.end.line - finalRange.start.line + 1).join('\r\n');
    const formattedText = format_1.format(indent, finalText, settings);
    const clearedText = format_1.clearText(formattedText);
    return [vscode_languageserver_1.TextEdit.replace(finalRange, clearedText)];
});
connection.onDocumentOnTypeFormatting((params) => {
    if (settings.cucumberautocomplete.onTypeFormat === true) {
        const text = documents.get(params.textDocument.uri).getText();
        const textArr = text.split(/\r?\n/g);
        const indent = getIndent(params.options);
        const range = vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(0, 0), vscode_languageserver_1.Position.create(textArr.length - 1, textArr[textArr.length - 1].length));
        const formattedText = format_1.format(indent, text, settings);
        return [vscode_languageserver_1.TextEdit.replace(range, formattedText)];
    }
    else {
        return [];
    }
    ;
});
connection.listen();
//# sourceMappingURL=server.js.map