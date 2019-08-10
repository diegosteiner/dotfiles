"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const vscode_languageserver_1 = require("vscode-languageserver");
const glob = require("glob");
class PagesHandler {
    constructor(root, settings) {
        this.populate(root, settings.cucumberautocomplete.pages);
    }
    getElements(page, pageObject) {
        if (page !== undefined) {
            const pageElement = this.elements.find(e => e.text === page);
            if (!pageElement) {
                return null;
            }
            if (pageObject !== undefined) {
                const pageObjectElement = pageElement.objects.find(e => e.text === pageObject);
                return pageObjectElement || null;
            }
            else {
                return pageElement;
            }
        }
        else {
            return this.elements;
        }
    }
    getPoMatch(line) {
        return line.match(/^(?:(?:.*?[\s\.])|.{0})([a-zA-z][^\s\.]*)\s*[:=\(]/);
    }
    getPageObjects(text, path) {
        const textArr = text.split(/\r?\n/g);
        return textArr.reduce((res, line, i) => {
            const poMatch = this.getPoMatch(line);
            if (poMatch) {
                const pos = vscode_languageserver_1.Position.create(i, 0);
                const text = poMatch[1];
                if (!res.find(v => v.text === text)) {
                    res.push({
                        id: 'pageObject' + util_1.getMD5Id(text),
                        text: text,
                        desc: line,
                        def: vscode_languageserver_1.Location.create(util_1.getOSPath(path), vscode_languageserver_1.Range.create(pos, pos))
                    });
                }
            }
            return res;
        }, []);
    }
    getPage(name, path) {
        const files = glob.sync(path);
        if (files.length) {
            const file = files[0];
            const text = util_1.clearComments(util_1.getFileContent(files[0]));
            const zeroPos = vscode_languageserver_1.Position.create(0, 0);
            return {
                id: 'page' + util_1.getMD5Id(name),
                text: name,
                desc: text.split(/\r?\n/g).slice(0, 10).join('\r\n'),
                def: vscode_languageserver_1.Location.create(util_1.getOSPath(file), vscode_languageserver_1.Range.create(zeroPos, zeroPos)),
                objects: this.getPageObjects(text, file)
            };
        }
        return null;
    }
    populate(root, settings) {
        this.elements = Object.keys(settings)
            .reduce((res, p) => {
            const page = this.getPage(p, root + '/' + settings[p]);
            page && res.push(page);
            return res;
        }, []);
    }
    validate(line, lineNum) {
        if (~line.search(/"[^"]*"."[^"]*"/)) {
            return line.split('"').reduce((res, l, i, lineArr) => {
                if (l === '.') {
                    const curr = lineArr.slice(0, i).reduce((a, b, j) => a + b.length + 1, 0);
                    const page = lineArr[i - 1];
                    const pageObject = lineArr[i + 1];
                    if (!this.getElements(page)) {
                        res.push({
                            severity: vscode_languageserver_1.DiagnosticSeverity.Warning,
                            range: {
                                start: { line: lineNum, character: curr - page.length - 1 },
                                end: { line: lineNum, character: curr - 1 }
                            },
                            message: `Was unable to find page "${page}"`,
                            source: 'cucumberautocomplete'
                        });
                    }
                    else if (!this.getElements(page, pageObject)) {
                        res.push({
                            severity: vscode_languageserver_1.DiagnosticSeverity.Warning,
                            range: {
                                start: { line: lineNum, character: curr + 2 },
                                end: { line: lineNum, character: curr + 3 + pageObject.length - 1 }
                            },
                            message: `Was unable to find page object "${pageObject}" for page "${page}"`,
                            source: 'cucumberautocomplete'
                        });
                    }
                }
                return res;
            }, []);
        }
        else {
            return [];
        }
    }
    getFeaturePosition(line, char) {
        const startLine = line.slice(0, char);
        const endLine = line.slice(char).replace(/".*/, '');
        const match = startLine.match(/"/g);
        if (match && match.length % 2) {
            const [, page, object] = startLine.match(/"(?:([^"]*)"\.")?([^"]*)$/);
            if (page) {
                return {
                    page: page,
                    object: object + endLine
                };
            }
            else {
                return {
                    page: object + endLine
                };
            }
        }
        else {
            return null;
        }
    }
    getDefinition(line, char) {
        const position = this.getFeaturePosition(line, char);
        if (position) {
            if (position['object']) {
                const el = this.getElements(position['page'], position['object']);
                return el ? el['def'] : null;
            }
            else {
                const el = this.getElements(position['page']);
                return el ? el['def'] : null;
            }
        }
        else {
            return null;
        }
    }
    getPageCompletion(line, position, page) {
        const search = line.search(/"([^"]*)"$/);
        if (search > 0 && position.character === (line.length - 1)) {
            const start = vscode_languageserver_1.Position.create(position.line, search);
            const end = vscode_languageserver_1.Position.create(position.line, line.length);
            const range = vscode_languageserver_1.Range.create(start, end);
            return {
                label: page.text,
                kind: vscode_languageserver_1.CompletionItemKind.Function,
                data: page.id,
                command: { title: 'cursorMove', command: 'cursorMove', arguments: [{ to: 'right', by: 'wrappedLine', select: false, value: 1 }] },
                insertText: page.text + '".'
            };
        }
        else {
            return {
                label: page.text,
                kind: vscode_languageserver_1.CompletionItemKind.Function,
                data: page.id
            };
        }
    }
    getPageObjectCompletion(line, position, pageObject) {
        const insertText = line.length === position.character ? '" ' : '';
        return {
            label: pageObject.text,
            kind: vscode_languageserver_1.CompletionItemKind.Function,
            data: pageObject.id,
            insertText: pageObject.text + insertText,
            documentation: pageObject.desc,
            detail: pageObject.desc
        };
    }
    getCompletion(line, position) {
        const fPosition = this.getFeaturePosition(line, position.character);
        const page = fPosition['page'];
        const object = fPosition['object'];
        if (object !== undefined && page !== undefined) {
            const pageElement = this.getElements(page);
            if (pageElement) {
                return pageElement['objects'].map(this.getPageObjectCompletion.bind(null, line, position));
            }
            else {
                return null;
            }
        }
        else if (page !== undefined) {
            return this.getElements()['map'](this.getPageCompletion.bind(null, line, position));
        }
        else {
            return null;
        }
    }
    getCompletionResolve(item) {
        return item;
    }
}
exports.default = PagesHandler;
//# sourceMappingURL=pages.handler.js.map