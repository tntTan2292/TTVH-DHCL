'use strict';

// AUTO-IMPORT-016 P0: the backend log had no time on most lines, so a failure could not be placed against the
// queue jobs, the keep-alive or the cleanup that ran beside it. install() puts an ISO UTC time in front of every
// console line (server.js calls it first). Idempotent; a non-string first argument is left alone and gets the
// time as its own leading argument so objects still print as objects.

const METHODS = ['log', 'info', 'warn', 'error', 'debug'];
const MARK = Symbol.for('qis.logTimestamp.installed');

function stamp(now = () => new Date()) {
    return `[${now().toISOString()}]`;
}

function install({ target = console, now = () => new Date() } = {}) {
    if (target[MARK]) return false;
    for (const method of METHODS) {
        const original = target[method];
        if (typeof original !== 'function') continue;
        target[method] = function timestamped(...args) {
            if (typeof args[0] === 'string') {
                args[0] = `${stamp(now)} ${args[0]}`;
            } else {
                args.unshift(stamp(now));
            }
            return original.apply(target, args);
        };
    }
    Object.defineProperty(target, MARK, { value: true, enumerable: false });
    return true;
}

module.exports = { install, stamp };
