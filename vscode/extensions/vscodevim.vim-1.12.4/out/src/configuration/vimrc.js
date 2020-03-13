"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const vimrcKeyRemappingBuilder_1 = require("./vimrcKeyRemappingBuilder");
const vscode_1 = require("vscode");
const configuration_1 = require("./configuration");
class VimrcImpl {
    /**
     * Fully resolved path to the user's .vimrc
     */
    get vimrcPath() {
        return this._vimrcPath;
    }
    load(config) {
        return __awaiter(this, void 0, void 0, function* () {
            const _path = config.vimrc.path
                ? VimrcImpl.expandHome(config.vimrc.path)
                : VimrcImpl.findDefaultVimrc();
            if (!_path) {
                yield vscode_1.window.showWarningMessage('No .vimrc found. Please set `vim.vimrc.path.`');
                return;
            }
            if (!fs.existsSync(_path)) {
                vscode_1.window
                    .showWarningMessage(`No .vimrc found at ${_path}.`, 'Create it')
                    .then((choice) => __awaiter(this, void 0, void 0, function* () {
                    if (choice === 'Create it') {
                        const newVimrc = yield vscode.window.showSaveDialog({
                            defaultUri: vscode.Uri.file(_path),
                        });
                        if (newVimrc) {
                            fs.writeFileSync(newVimrc.fsPath, '');
                            configuration_1.configuration.getConfiguration('vim').update('vimrc.path', newVimrc.fsPath, true);
                            yield vscode.workspace.openTextDocument(newVimrc);
                            // TODO: add some sample remaps/settings in here?
                            yield vscode.window.showTextDocument(newVimrc);
                        }
                    }
                }));
            }
            else {
                this._vimrcPath = _path;
                // Remove all the old remappings from the .vimrc file
                VimrcImpl.removeAllRemapsFromConfig(config);
                // Add the new remappings
                const lines = fs.readFileSync(this.vimrcPath, { encoding: 'utf8' }).split(/\r?\n/);
                for (const line of lines) {
                    const remap = yield vimrcKeyRemappingBuilder_1.vimrcKeyRemappingBuilder.build(line);
                    if (remap) {
                        VimrcImpl.addRemapToConfig(config, remap);
                    }
                }
            }
        });
    }
    /**
     * Adds a remapping from .vimrc to the given configuration
     */
    static addRemapToConfig(config, remap) {
        var _a;
        const mappings = (() => {
            switch (remap.keyRemappingType) {
                case 'map':
                    return [config.normalModeKeyBindings, config.visualModeKeyBindings];
                case 'nmap':
                    return [config.normalModeKeyBindings];
                case 'vmap':
                    return [config.visualModeKeyBindings];
                case 'imap':
                    return [config.insertModeKeyBindings];
                case 'cmap':
                    return [config.commandLineModeKeyBindings];
                case 'noremap':
                    return [
                        config.normalModeKeyBindingsNonRecursive,
                        config.visualModeKeyBindingsNonRecursive,
                    ];
                case 'nnoremap':
                    return [config.normalModeKeyBindingsNonRecursive];
                case 'vnoremap':
                    return [config.visualModeKeyBindingsNonRecursive];
                case 'inoremap':
                    return [config.insertModeKeyBindingsNonRecursive];
                case 'cnoremap':
                    return [config.commandLineModeKeyBindingsNonRecursive];
                default:
                    console.warn(`Encountered an unrecognized mapping type: '${remap.keyRemappingType}'`);
                    return undefined;
            }
        })();
        (_a = mappings) === null || _a === void 0 ? void 0 : _a.forEach(remaps => {
            // Don't override a mapping present in settings.json; those are more specific to VSCodeVim.
            if (!remaps.some(r => _.isEqual(r.before, remap.keyRemapping.before))) {
                remaps.push(remap.keyRemapping);
            }
        });
    }
    static removeAllRemapsFromConfig(config) {
        const remapCollections = [
            config.normalModeKeyBindings,
            config.visualModeKeyBindings,
            config.insertModeKeyBindings,
            config.commandLineModeKeyBindings,
            config.normalModeKeyBindingsNonRecursive,
            config.visualModeKeyBindingsNonRecursive,
            config.insertModeKeyBindingsNonRecursive,
            config.commandLineModeKeyBindingsNonRecursive,
        ];
        for (const remaps of remapCollections) {
            _.remove(remaps, remap => remap.source === 'vimrc');
        }
    }
    static findDefaultVimrc() {
        if (process.env.HOME) {
            let vimrcPath = path.join(process.env.HOME, '.vimrc');
            if (fs.existsSync(vimrcPath)) {
                return vimrcPath;
            }
            vimrcPath = path.join(process.env.HOME, '_vimrc');
            if (fs.existsSync(vimrcPath)) {
                return vimrcPath;
            }
        }
        return undefined;
    }
    static expandHome(filePath) {
        if (!process.env.HOME) {
            return filePath;
        }
        if (!filePath.startsWith('~')) {
            return filePath;
        }
        return path.join(process.env.HOME, filePath.slice(1));
    }
}
exports.vimrc = new VimrcImpl();

//# sourceMappingURL=vimrc.js.map
