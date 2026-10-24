'use strict';

/**
 * RBAC-01 seed: loads the people of "User QIS.xlsx" into qis_user (+ ADMIN from QIS_ADMIN_USERNAME).
 *
 *   node scripts/seed-rbac-users.js "<path to User QIS.xlsx>"            dry run, writes nothing
 *   node scripts/seed-rbac-users.js "<path to User QIS.xlsx>" --apply    writes
 *
 *   node scripts/seed-rbac-users.js --admin-only --apply                 recovery: only the ADMIN account
 *
 * Initial password comes from env QIS_INITIAL_PASSWORD (required with --apply, never printed).
 * --admin-only needs no Excel: it creates or resets the ADMIN account (username QIS_ADMIN_USERNAME, default
 * "admin") with the password in env QIS_ADMIN_PASSWORD chosen by the operator, which must meet the password
 * policy; no forced change is set because no default password is involved.
 * Idempotent: an existing username only has its name, tier and scopes updated; its password and
 * must_change_password flag are left alone. The Excel holds HRM codes and names: keep it out of git.
 */

const path = require('path');
const XLSX = require('xlsx');
const { bcvhCodeFromName } = require('../src/services/auth/access/officeMap');
const { validateNewPassword } = require('../src/services/auth/passwordPolicy');

const LEADER_TITLES = ['lãnh đạo bđtp', 'lãnh đạo ttvh', 'it bđtp'];
// Same list as the database CHECK constraint and the admin API: a value outside it must stop the run BEFORE any write.
const ALLOWED_INDICATORS = new Set(['F1.1', 'F1.2', 'F1.3', 'F4.1', 'HANGTON']);

// NFC so that titles and unit names typed with decomposed diacritics still match.
const cell = (value) => String(value ?? '').normalize('NFC').trim();

/** Pure: turns sheet rows (objects keyed by the Excel headers) into user definitions. Throws on an unknown unit. */
function parseRows(rows) {
    const users = [];
    rows.forEach((row, index) => {
        const line = index + 2;
        const username = cell(row['Mã HRM']);
        if (!username) return;
        const title = cell(row['Chức vụ']).toLowerCase();
        const tier = LEADER_TITLES.includes(title) ? 'LEADER' : 'STAFF';

        const unitText = cell(row['Đơn vị quản lý']);
        const bcvh = [];
        if (tier === 'STAFF' && unitText && unitText.toLowerCase() !== 'không') {
            for (const part of unitText.split(',').map((item) => item.trim()).filter(Boolean)) {
                const code = bcvhCodeFromName(part);
                if (!code) throw new Error(`Dòng ${line} (${username}): không nhận ra đơn vị "${part}"`);
                bcvh.push(code);
            }
        }

        const indicators = [];
        const indicatorText = cell(row['Chỉ tiêu quản lý']);
        if (tier === 'STAFF' && indicatorText) {
            for (const part of indicatorText.split(',').map((item) => item.trim()).filter(Boolean)) {
                if (!ALLOWED_INDICATORS.has(part.toUpperCase())) throw new Error(`Dòng ${line} (${username}): chỉ tiêu "${part}" không hợp lệ`);
                indicators.push(part.toUpperCase());
            }
        }

        if (tier === 'STAFF' && bcvh.length === 0 && indicators.length === 0) {
            throw new Error(`Dòng ${line} (${username}): chuyên viên không có đơn vị hoặc chỉ tiêu nào`);
        }
        users.push({ username, displayName: cell(row['Họ và tên']), tier, bcvh, indicators });
    });

    const seen = new Set();
    for (const user of users) {
        if (seen.has(user.username)) throw new Error(`Mã HRM trùng: ${user.username}`);
        seen.add(user.username);
    }
    return users;
}

function readExcel(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

const mask = (username) => (username.length > 4 ? `${'*'.repeat(username.length - 4)}${username.slice(-4)}` : username);

async function seedAdminOnly(apply) {
    const username = cell(process.env.QIS_ADMIN_USERNAME) || 'admin';
    const password = process.env.QIS_ADMIN_PASSWORD;
    console.log(`${apply ? 'APPLY' : 'DRY RUN'}: ADMIN account "${username}" only`);
    if (!apply) return 0;
    const problems = validateNewPassword(password, { username });
    if (problems.length > 0) {
        console.error(`QIS_ADMIN_PASSWORD is not acceptable: ${problems.join('; ')}`);
        return 1;
    }
    const { applyRbac01Schema } = require('../migrate_rbac_01_schema');
    const { dbPath, db } = require('../src/config/db');
    await applyRbac01Schema(dbPath);
    const userStore = require('../src/services/auth/userStore');
    const result = await userStore.upsertUser({
        username, displayName: 'Quản trị viên', tier: 'ADMIN', bcvh: [], indicators: [], initialPassword: password, mustChange: false,
    });
    if (!result.created) {
        // The account already exists: upsert keeps its password, so set the new one explicitly.
        await userStore.setPassword(result.id, password, { mustChange: false, actor: 'seed --admin-only' });
        await userStore.unlock(result.id, 'seed --admin-only');
    }
    console.log(`Done: ADMIN "${username}" ${result.created ? 'created' : 'password reset'}. The password was not printed.`);
    await new Promise((resolve) => db.close(resolve));
    return 0;
}

async function main(argv) {
    const filePath = argv.find((arg) => !arg.startsWith('--'));
    const apply = argv.includes('--apply');
    if (argv.includes('--admin-only')) return seedAdminOnly(apply);
    if (!filePath) {
        console.error('Usage: node scripts/seed-rbac-users.js "<User QIS.xlsx>" [--apply]');
        return 1;
    }

    const users = parseRows(readExcel(path.resolve(filePath)));
    const adminUsername = cell(process.env.QIS_ADMIN_USERNAME);
    const plan = [...users];
    if (adminUsername) plan.push({ username: adminUsername, displayName: 'Quản trị viên', tier: 'ADMIN', bcvh: [], indicators: [] });

    console.log(`${apply ? 'APPLY' : 'DRY RUN'}: ${plan.length} user(s) (${plan.filter((u) => u.tier === 'ADMIN').length} ADMIN, ${plan.filter((u) => u.tier === 'LEADER').length} LEADER, ${plan.filter((u) => u.tier === 'STAFF').length} STAFF)`);
    if (!adminUsername) console.log('Note: QIS_ADMIN_USERNAME is not set, no ADMIN account will be created.');
    for (const user of plan) {
        console.log(`  ${mask(user.username).padEnd(10)} ${user.tier.padEnd(6)} bcvh=[${user.bcvh.join(',')}] indicators=[${user.indicators.join(',')}]`);
    }
    if (!apply) return 0;

    const initialPassword = process.env.QIS_INITIAL_PASSWORD;
    if (!initialPassword) {
        console.error('QIS_INITIAL_PASSWORD is required with --apply.');
        return 1;
    }

    const { applyRbac01Schema } = require('../migrate_rbac_01_schema');
    const { dbPath, db } = require('../src/config/db');
    await applyRbac01Schema(dbPath);
    const userStore = require('../src/services/auth/userStore');

    let created = 0;
    let updated = 0;
    for (const user of plan) {
        const result = await userStore.upsertUser({ ...user, initialPassword, mustChange: true });
        if (result.created) created += 1; else updated += 1;
    }
    console.log(`Done: ${created} created, ${updated} updated. Passwords were not printed.`);
    if (updated > 0) console.log('Note: scope or tier changes of existing users reach people who are already logged in only after they log in again or the backend restarts.');
    await new Promise((resolve) => db.close(resolve));
    return 0;
}

module.exports = { parseRows };

if (require.main === module) {
    main(process.argv.slice(2))
        .then((code) => process.exit(code))
        .catch((error) => {
            console.error(error.message);
            process.exit(1);
        });
}
