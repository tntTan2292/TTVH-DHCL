/**
 * PROV-PKG-01 (S3b) -- additive system_config keys read by src/config/provinceConfig.js.
 *
 * INSERT OR IGNORE only: an existing value (for example one an installer wrote) is never overwritten, and
 * default_province_code / default_province_name (created by schema.sql) are not touched.
 *
 * Values: edition `full` seeds the Hue values (read from src/config/hueDefaults.js, so the Hue edition shows
 * exactly what it showed before); edition `province` seeds empty display values, province_configured = '0'
 * and unit_catalog_autofill = 'on' (the installer fills them in).
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const NEW_KEYS = Object.freeze([
    ['display_unit_name', 'Tên đơn vị hiển thị trên giao diện'],
    ['display_legal_name', 'Tên pháp lý (chân trang đổi mật khẩu)'],
    ['display_short_name', 'Tên ngắn của tỉnh/đơn vị (ví dụ trong nhãn xếp hạng)'],
    ['display_brand_short', 'Nhãn thương hiệu ngắn trên thanh trên cùng'],
    ['unit_leader_label', 'Nhãn lãnh đạo đơn vị'],
    ['province_configured', '1 = bản cài đã được cấu hình tỉnh'],
    ['unit_catalog_autofill', 'on = tự điền danh mục đơn vị từ dữ liệu F1.3'],
]);

const CREATE_SYSTEM_CONFIG_SQL = `
CREATE TABLE IF NOT EXISTS system_config (
    config_key VARCHAR(50) PRIMARY KEY,
    config_value TEXT NOT NULL,
    description TEXT
)`;

function isProvinceEdition() {
    return String(process.env.QIS_EDITION || 'full').trim().toLowerCase() === 'province';
}

function seedValues() {
    if (isProvinceEdition()) {
        return {
            display_unit_name: '',
            display_legal_name: '',
            display_short_name: '',
            display_brand_short: '',
            unit_leader_label: 'đơn vị',
            province_configured: '0',
            unit_catalog_autofill: 'on',
        };
    }
    return require('./src/config/hueDefaults');
}

function resolveDbPath(argv) {
    const flagIndex = argv.indexOf('--db');
    if (flagIndex !== -1 && argv[flagIndex + 1]) return path.resolve(argv[flagIndex + 1]);
    return path.resolve(__dirname, 'src/db/database.sqlite');
}

function openDb(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (error) => (error ? reject(error) : resolve(db)));
    });
}

function exec(db, sql) {
    return new Promise((resolve, reject) => db.exec(sql, (error) => (error ? reject(error) : resolve())));
}

function run(db, sql, params = []) {
    return new Promise((resolve, reject) => db.run(sql, params, (error) => (error ? reject(error) : resolve())));
}

function closeDb(db) {
    return new Promise((resolve, reject) => db.close((error) => (error ? reject(error) : resolve())));
}

async function applyProvPkg01SystemConfigKeysSchema(dbPath) {
    const db = await openDb(dbPath);
    try {
        await exec(db, CREATE_SYSTEM_CONFIG_SQL);
        const values = seedValues();
        for (const [key, description] of NEW_KEYS) {
            await run(
                db,
                'INSERT OR IGNORE INTO system_config (config_key, config_value, description) VALUES (?, ?, ?)',
                [key, values[key], description],
            );
        }
        return { keys: NEW_KEYS.map(([key]) => key) };
    } finally {
        await closeDb(db);
    }
}

if (require.main === module) {
    applyProvPkg01SystemConfigKeysSchema(resolveDbPath(process.argv.slice(2)))
        .then(() => console.log('[OK] PROV-PKG-01 system_config keys present.'))
        .catch((error) => {
            console.error('[FAIL] PROV-PKG-01 migration failed:', error.message);
            process.exit(1);
        });
}

module.exports = { applyProvPkg01SystemConfigKeysSchema, NEW_KEYS };
