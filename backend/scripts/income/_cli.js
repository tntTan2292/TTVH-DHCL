'use strict';
const path = require('path');
const fs = require('fs');

function parseArgs(argv) {
    const out = { _: [] };
    for (let i = 0; i < argv.length; i += 1) {
        if (argv[i].startsWith('--')) { const key = argv[i].slice(2); const next = argv[i + 1]; if (next === undefined || next.startsWith('--')) out[key] = true; else { out[key] = next; i += 1; } } else out._.push(argv[i]);
    }
    return out;
}

/** The income scripts work on a COPY of the database only: the live file is refused, a missing file is refused. */
function requireCopyDb(args) {
    if (!args.db || args.db === true) { console.error('--db <path to a COPY of the database> is required'); process.exit(2); }
    const dbPath = path.resolve(args.db);
    if (path.normalize(dbPath).endsWith(path.normalize('src/db/database.sqlite'))) { console.error('[REFUSED] this script does not run on the live database; pass a copy.'); process.exit(2); }
    if (!fs.existsSync(dbPath)) { console.error(`[REFUSED] ${dbPath} does not exist`); process.exit(2); }
    return dbPath;
}

module.exports = { parseArgs, requireCopyDb };
