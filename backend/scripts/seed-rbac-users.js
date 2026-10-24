'use strict';

/**
 * RBAC-01 seed: loads the people of "User QIS.xlsx" into qis_user (+ ADMIN from QIS_ADMIN_USERNAME).
 *
 *   node scripts/seed-rbac-users.js "<path to User QIS.xlsx>"            dry run, writes nothing
 *   node scripts/seed-rbac-users.js "<path to User QIS.xlsx>" --apply    writes
 *
 * Initial password comes from env QIS_INITIAL_PASSWORD (required with --apply, never printed).
 * Idempotent: an existing username only has its name, tier and scopes updated; its password and
 * must_change_password flag are left alone. The Excel holds HRM codes and names: keep it out of git.
 */

const path = require('path');
const XLSX = require('xlsx');
const { bcvhCodeFromName } = require('../src/services/auth/access/officeMap');

const LEADER_TITLES = ['lãnh đạo bđtp', 'lãnh đạo ttvh', 'it bđtp'];
const INDICATOR_PATTERN = /^F\d\.\d$/i;

const cell = (value) => String(value ?? '').trim();

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
                if (!INDICATOR_PATTERN.test(part)) throw new Error(`Dòng ${line} (${username}): chỉ tiêu "${part}" không hợp lệ`);
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

async function main(argv) {
    const filePath = argv.find((arg) => !arg.startsWith('--'));
    const apply = argv.includes('--apply');
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
