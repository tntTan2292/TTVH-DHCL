'use strict';

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const src = path.resolve(__dirname, '..', 'src', 'db', 'database.sqlite');
const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 13);
const dest = path.resolve(__dirname, '..', 'src', 'db', 'backups', `database.pre-f13-route-postman-identity-01-phase1-migration.${ts}.sqlite`);

console.log('Source:', src);
console.log('Dest:  ', dest);

if (fs.existsSync(dest)) fs.unlinkSync(dest);

// VACUUM INTO produces a fully consistent, defragmented snapshot of the live
// database via SQLite's own read-transaction snapshot — safe to run against
// an operational DB with another process (the backend server) connected and
// writing, unlike a raw file copy.
const db = new sqlite3.Database(src, sqlite3.OPEN_READONLY, (openErr) => {
    if (openErr) {
        console.error('OPEN FAILED', openErr);
        process.exit(1);
    }
    db.run(`VACUUM INTO '${dest.replace(/'/g, "''")}'`, (err) => {
        if (err) {
            console.error('VACUUM INTO FAILED', err);
            process.exit(1);
        }
        console.log('VACUUM INTO complete.');
        db.close(() => process.exit(0));
    });
});
