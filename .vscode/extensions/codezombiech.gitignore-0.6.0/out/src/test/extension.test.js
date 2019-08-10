"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const gitignoreExtension = require("../extension");
suite('GitignoreRepository', () => {
    test('is getting all .gitignore files', () => {
        const GitHubApi = require('github');
        // Create a Github API client
        let client = new GitHubApi({
            version: '3.0.0',
            protocol: 'https',
            host: 'api.github.com',
            //debug: true,
            pathPrefix: '',
            timeout: 5000,
            headers: {
                'user-agent': 'vscode-gitignore-extension'
            }
        });
        // Create gitignore repository
        let gitignoreRepository = new gitignoreExtension.GitignoreRepository(client);
        return Promise.all([
            gitignoreRepository.getFiles(),
            gitignoreRepository.getFiles('Global')
        ])
            .then((result) => {
            let files = Array.prototype.concat.apply([], result);
            // From .
            let rootItem = files.find(f => f.label === 'VisualStudio');
            assert.deepEqual(rootItem, {
                description: 'VisualStudio.gitignore',
                label: 'VisualStudio',
                url: 'https://raw.githubusercontent.com/github/gitignore/master/VisualStudio.gitignore',
            });
            // From ./Global
            let globalItem = files.find(f => f.label === 'VisualStudioCode');
            assert.deepEqual(globalItem, {
                label: 'VisualStudioCode',
                description: 'Global/VisualStudioCode.gitignore',
                url: 'https://raw.githubusercontent.com/github/gitignore/master/Global/VisualStudioCode.gitignore'
            });
        });
    });
});
//# sourceMappingURL=extension.test.js.map