"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const strip = require("strip-comments");
const md5 = require("md5");
function getOSPath(path) {
    /* Add suffics for the provided path
     * 'file://' for the non-windows OS's or file:/// for Windows */
    if (/^win/.test(require('process').platform)) {
        return 'file:///' + path;
    }
    else {
        return 'file:' + path;
    }
}
exports.getOSPath = getOSPath;
function getFileContent(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    }
    catch (err) {
        return '';
    }
}
exports.getFileContent = getFileContent;
function clearComments(text) {
    return strip(text, { silent: true, preserveNewlines: true });
}
exports.clearComments = clearComments;
function clearGherkinComments(text) {
    //Clear all the multiline comments between ''' and """
    let commentsMode = false;
    text = text
        .split(/\r?\n/g)
        .map(l => {
        if (~l.search(/^\s*'''\s*/) || ~l.search(/^\s*"""\s*/)) {
            commentsMode = !commentsMode;
            return l;
        }
        else {
            return commentsMode ? '' : l;
        }
    })
        .join('\r\n');
    //Clear all the other comments
    return strip(text, { silent: true, preserveNewlines: true });
}
exports.clearGherkinComments = clearGherkinComments;
function getMD5Id(str) {
    return md5(str);
}
exports.getMD5Id = getMD5Id;
function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\$&');
}
exports.escapeRegExp = escapeRegExp;
function getTextRange(filePath, text) {
    const fileContent = this.getFileContent(filePath);
    const contentArr = fileContent.split(/\r?\n/g);
    for (let i = 0; i < contentArr.length; i++) {
        const find = contentArr[i].indexOf(text);
        if (find > -1) {
            return {
                start: { line: i, character: find },
                end: { line: i, character: find + text.length }
            };
        }
    }
}
exports.getTextRange = getTextRange;
function getSortPrefix(num, count) {
    const LETTERS_NUM = 26;
    const Z_CODE = 90;
    let res = '';
    for (let i = count - 1; i >= 0; i--) {
        const powNum = Math.pow(LETTERS_NUM, i);
        const letterCode = Math.floor(num / powNum);
        const letterNum = Z_CODE - letterCode;
        const letter = String.fromCharCode(letterNum);
        num = num - powNum * letterCode;
        res += letter;
    }
    return res;
}
exports.getSortPrefix = getSortPrefix;
//# sourceMappingURL=util.js.map