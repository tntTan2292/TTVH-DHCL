'use strict';

/**
 * HANGTON-HANDLING-01: stores the position (chức vụ) of the accounts already in qis_user, read from the PO's user file.
 * Touches ONLY qis_user.position (no password, tier, scope or session change).
 *
 *   node scripts/backfill-user-positions.js "<path to User QIS.xlsx>"            dry run, writes nothing
 *   node scripts/backfill-user-positions.js "<path to User QIS.xlsx>" --apply    writes
 *
 * Needs the position column (added by the backend at start-up, or: node migrate_rbac_01_schema.js).
 * The Excel holds HRM codes and names: keep it out of git. Output masks the codes.
 */

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { parseRows, readExcel } = require('./seed-rbac-users');
const { isValidPositionForTier } = require('../src/services/auth/access/roles');

const mask = (username) => (username.length > 4 ? `${'*'.repeat(username.length - 4)}${username.slice(-4)}` : username);

function open(dbPath, mode) {
    return new Promise((resolve, reject) => {
        const handle = new sqlite3.Database(dbPath, mode, (error) => (error ? reject(error) : resolve(handle)));
    });
}
const all = (db, sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (e, rows) => (e ? reject(e) : resolve(rows))));
const run = (db, sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, (e) => (e ? reject(e) : resolve())));

/** Pure: what to do for each account of the file. `accounts` = rows of qis_user (username, tier, position). */
function planBackfill(users, accounts) {
    const byName = new Map(accounts.map((account) => [account.username, account]));
    return users.map((user) => {
        const account = byName.get(user.username);
        if (!account) return { username: user.username, action: 'MISSING_ACCOUNT' };
        if (!user.position) return { username: user.username, action: 'NO_POSITION_IN_FILE' };
        if (account.tier !== (user.tier)) return { username: user.username, action: 'TIER_MISMATCH', tier: account.tier, expected: user.tier };
        if (!isValidPositionForTier(account.tier, user.position)) return { username: user.username, action: 'INVALID', position: user.position };
        if (account.position === user.position) return { username: user.username, action: 'UNCHANGED', position: user.position };
        return { username: user.username, action: 'SET', position: user.position, from: account.position || null };
    });
}

async function main(argv) {
    const files = argv.filter((arg) => !arg.startsWith('--'));
    const apply = argv.includes('--apply');
    if (files.length !== 1) {
        console.error('Usage: node scripts/backfill-user-positions.js "<User QIS.xlsx>" [--apply]');
        process.exit(1);
    }
    const dbPath = path.resolve(__dirname, '../src/db/database.sqlite');
    const users = parseRows(readExcel(files[0]));
    const db = await open(dbPath, apply ? sqlite3.OPEN_READWRITE : sqlite3.OPEN_READONLY);
    try {
        const columns = await all(db, 'PRAGMA table_info(qis_user)');
        if (!columns.some((column) => column.name === 'position')) {
            console.log('The position column does not exist yet: start the backend once (it adds it) or run node migrate_rbac_01_schema.js, then repeat.');
            return;
        }
        const accounts = await all(db, 'SELECT username, tier, position FROM qis_user');
        const plan = planBackfill(users, accounts);
        for (const step of plan) {
            console.log(`${mask(step.username)}  ${step.action}${step.position ? ` -> ${step.position}` : ''}${step.from ? ` (was ${step.from})` : ''}${step.expected ? ` (account ${step.tier}, file ${step.expected})` : ''}`);
        }
        const sets = plan.filter((step) => step.action === 'SET');
        console.log(`\n${sets.length} position(s) to set, ${plan.filter((s) => s.action === 'UNCHANGED').length} unchanged, ${plan.filter((s) => !['SET', 'UNCHANGED'].includes(s.action)).length} need attention.`);
        if (!apply) {
            console.log('Dry run: nothing written. Add --apply to write.');
            return;
        }
        await run(db, 'PRAGMA busy_timeout = 30000');
        for (const step of sets) await run(db, 'UPDATE qis_user SET position = ?, updated_at = ? WHERE username = ?', [step.position, Date.now(), step.username]);
        console.log(`Applied ${sets.length} position(s).`);
    } finally {
        await new Promise((resolve) => db.close(() => resolve()));
    }
}

module.exports = { planBackfill };

if (require.main === module) {
    main(process.argv.slice(2)).catch((error) => {
        console.error('Backfill failed:', error.message);
        process.exit(1);
    });
}
