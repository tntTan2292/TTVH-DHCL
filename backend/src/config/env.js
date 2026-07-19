'use strict';

const fs = require('fs');
const path = require('path');

function parseEnvLine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return null;

    const separator = trimmed.indexOf('=');
    if (separator === -1) return null;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return null;
    if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        value = value.slice(1, -1);
    }

    return { key, value };
}

function loadLocalEnv(options = {}) {
    const candidates = options.files || [
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), '..', '.env')
    ];

    for (const filePath of candidates) {
        if (!fs.existsSync(filePath)) continue;

        const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
        for (const line of lines) {
            const parsed = parseEnvLine(line);
            if (parsed && process.env[parsed.key] === undefined) {
                process.env[parsed.key] = parsed.value;
            }
        }
    }
}

module.exports = { loadLocalEnv };
