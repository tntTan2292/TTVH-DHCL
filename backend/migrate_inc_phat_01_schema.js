/**
 * INC-PHAT-01 - additive schema of the income module (công phát). Every table is new and prefixed inc_; no existing table is touched.
 *
 *   inc_period            one row per period (ky) with its status and where the figures come from (PMTL import or QIS calculation)
 *   inc_price_table/row   unit-price tables by document and validity (PHAT, PHAT_MA, PHBC, DHL)
 *   inc_param             parameters by validity period (the PMTL tham_so)
 *   inc_route_group       route -> price group
 *   inc_postman_hrm       postman code -> HRM code (NOT dm_buu_ta, which has no HRM and covers fewer postmen)
 *   inc_employee          code, name, unit, title, contract type, status only (no ID number, bank account, phone, birth date)
 *   inc_hscl_exempt, inc_penalty, inc_adjustment, inc_ctv, inc_postman_unit, inc_dhl_route   per-period / catalogue inputs of the calculation
 *   inc_ext_8611, inc_ext_dhl   inputs loaded later (INC-PHAT-04); created empty here
 *   inc_result, inc_result_detail, inc_warning   results (kq_phat, kq_phat_ct, canh_bao of PMTL, same columns plus the source)
 *   inc_audit_log         APPEND-ONLY (triggers refuse UPDATE and DELETE)
 *
 * A period with status KHOA is frozen: triggers refuse any insert/update/delete of its results and period-keyed inputs, and the period
 * row itself can neither be changed nor deleted. Idempotent (IF NOT EXISTS), inserts no data.
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const KY_CHECK = "CHECK (ky GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]')";

// tables keyed by ky that must not change once the period is KHOA
const LOCKED_BY_PERIOD = Object.freeze(['inc_result', 'inc_result_detail', 'inc_warning', 'inc_hscl_exempt', 'inc_penalty', 'inc_adjustment', 'inc_ext_8611', 'inc_ext_dhl']);

const INC_PHAT_01_STATEMENTS = Object.freeze([
    `CREATE TABLE IF NOT EXISTS inc_period (
        ky TEXT PRIMARY KEY ${KY_CHECK},
        trang_thai TEXT NOT NULL DEFAULT 'NHAP' CHECK (trang_thai IN ('NHAP', 'DA_TINH', 'DA_DUYET', 'KHOA')),
        nguon TEXT NOT NULL CHECK (nguon IN ('PMTL', 'QIS')),
        note TEXT,
        source_fingerprint TEXT,
        created_at TEXT NOT NULL,
        locked_at TEXT,
        locked_by TEXT
    )`,
    `CREATE TRIGGER IF NOT EXISTS trg_inc_period_locked_update BEFORE UPDATE ON inc_period
     WHEN OLD.trang_thai = 'KHOA'
     BEGIN SELECT RAISE(ABORT, 'income period is locked'); END`,
    `CREATE TRIGGER IF NOT EXISTS trg_inc_period_locked_delete BEFORE DELETE ON inc_period
     WHEN OLD.trang_thai = 'KHOA'
     BEGIN SELECT RAISE(ABORT, 'income period is locked'); END`,

    `CREATE TABLE IF NOT EXISTS inc_price_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loai TEXT NOT NULL CHECK (loai IN ('PHAT', 'PHAT_MA', 'PHBC', 'DHL')),
        van_ban TEXT,
        hieu_luc_tu TEXT NOT NULL CHECK (hieu_luc_tu GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
        mo_ta TEXT,
        UNIQUE (loai, hieu_luc_tu, van_ban)
    )`,
    `CREATE TABLE IF NOT EXISTS inc_price_row (
        price_table_id INTEGER NOT NULL REFERENCES inc_price_table(id),
        khoan TEXT NOT NULL,
        nhom INTEGER NOT NULL,
        don_gia REAL NOT NULL,
        PRIMARY KEY (price_table_id, khoan, nhom)
    )`,
    `CREATE TABLE IF NOT EXISTS inc_param (
        khoa TEXT NOT NULL,
        hieu_luc_tu TEXT NOT NULL CHECK (hieu_luc_tu GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
        gia_tri REAL NOT NULL,
        mo_ta TEXT,
        PRIMARY KEY (khoa, hieu_luc_tu)
    )`,
    `CREATE TABLE IF NOT EXISTS inc_route_group (
        ma_tuyen TEXT PRIMARY KEY,
        ten_tuyen TEXT,
        nhom INTEGER NOT NULL,
        ma_bc TEXT,
        ten_bc TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS inc_postman_hrm (
        ma_buu_ta TEXT PRIMARY KEY,
        ma_hrm TEXT,
        ho_ten TEXT,
        loai_hd TEXT,
        don_vi TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS inc_employee (
        ma_hrm TEXT PRIMARY KEY,
        ho_ten TEXT,
        don_vi TEXT,
        chuc_danh TEXT,
        loai_hd TEXT,
        trang_thai TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS inc_ctv (ma_buu_ta TEXT PRIMARY KEY, ho_ten TEXT, don_vi TEXT)`,
    `CREATE TABLE IF NOT EXISTS inc_postman_unit (ma_buu_ta TEXT PRIMARY KEY, ho_ten TEXT, don_vi TEXT)`,
    `CREATE TABLE IF NOT EXISTS inc_dhl_route (ma_buu_ta TEXT PRIMARY KEY, ma_tuyen TEXT NOT NULL, ghi_chu TEXT)`,
    `CREATE TABLE IF NOT EXISTS inc_hscl_exempt (
        ky TEXT NOT NULL ${KY_CHECK},
        ma_buu_ta TEXT NOT NULL,
        ho_ten TEXT, don_vi TEXT, tuyen TEXT, ly_do TEXT,
        PRIMARY KEY (ky, ma_buu_ta)
    )`,
    `CREATE TABLE IF NOT EXISTS inc_penalty (
        ky TEXT NOT NULL ${KY_CHECK},
        ma_buu_ta TEXT NOT NULL,
        diem REAL NOT NULL CHECK (diem >= 0),
        ghi_chu TEXT,
        PRIMARY KEY (ky, ma_buu_ta)
    )`,
    `CREATE TABLE IF NOT EXISTS inc_adjustment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ky TEXT NOT NULL ${KY_CHECK},
        ma_hrm TEXT NOT NULL,
        khoan TEXT, so_luong REAL, don_gia REAL, so_tien REAL, ly_do TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS inc_ext_8611 (
        ky TEXT NOT NULL ${KY_CHECK},
        ma_buu_ta TEXT, ma_hrm TEXT, ten_buu_ta TEXT, loai_hd TEXT, ma_tuyen TEXT, san_pham TEXT,
        ptc REAL, ph REAL, ch REAL, vtn REAL, don_vi TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS inc_ext_dhl (
        ky TEXT NOT NULL ${KY_CHECK},
        awb TEXT, ma_hrm TEXT, ten_buu_ta TEXT, kg REAL, so_kien REAL, ma_tuyen TEXT, ma_bc TEXT,
        bi_loai INTEGER NOT NULL DEFAULT 0, ghi_chu TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS inc_result (
        ky TEXT NOT NULL ${KY_CHECK},
        ma_hrm TEXT NOT NULL,
        ma_buu_ta TEXT, ho_ten TEXT, loai_hd TEXT,
        so_ptc REAL, cp_buu_gui REAL, cp_dhl REAL, cp_bpt REAL, cp_ph REAL, cp_dieu_chinh REAL,
        tong_khong_phbc REAL, cp_phbc REAL, bo_sung_ctv REAL, tong REAL, don_vi TEXT,
        hscl REAL, cp_truoc_hscl REAL, cp_sau_hscl REAL, cp_trai_giam REAL,
        nguon TEXT NOT NULL CHECK (nguon IN ('PMTL', 'QIS')),
        PRIMARY KEY (ky, ma_hrm)
    )`,
    'CREATE INDEX IF NOT EXISTS idx_inc_result_unit ON inc_result(ky, don_vi)',
    `CREATE TABLE IF NOT EXISTS inc_result_detail (
        ky TEXT NOT NULL ${KY_CHECK},
        ma_buu_ta TEXT, ma_tuyen TEXT, nhom INTEGER, khoan TEXT, so_luong REAL, thanh_tien REAL
    )`,
    'CREATE INDEX IF NOT EXISTS idx_inc_result_detail_ky ON inc_result_detail(ky, ma_buu_ta)',
    `CREATE TABLE IF NOT EXISTS inc_warning (
        ky TEXT NOT NULL ${KY_CHECK},
        loai TEXT, noi_dung TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS inc_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        at TEXT NOT NULL,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        ky TEXT,
        detail TEXT
    )`,
    `CREATE TRIGGER IF NOT EXISTS trg_inc_audit_no_update BEFORE UPDATE ON inc_audit_log
     BEGIN SELECT RAISE(ABORT, 'inc_audit_log is append-only'); END`,
    `CREATE TRIGGER IF NOT EXISTS trg_inc_audit_no_delete BEFORE DELETE ON inc_audit_log
     BEGIN SELECT RAISE(ABORT, 'inc_audit_log is append-only'); END`,
    ...LOCKED_BY_PERIOD.flatMap((table) => [
        `CREATE TRIGGER IF NOT EXISTS trg_${table}_locked_insert BEFORE INSERT ON ${table}
     WHEN EXISTS (SELECT 1 FROM inc_period WHERE ky = NEW.ky AND trang_thai = 'KHOA')
     BEGIN SELECT RAISE(ABORT, 'income period is locked'); END`,
        `CREATE TRIGGER IF NOT EXISTS trg_${table}_locked_update BEFORE UPDATE ON ${table}
     WHEN EXISTS (SELECT 1 FROM inc_period WHERE ky IN (OLD.ky, NEW.ky) AND trang_thai = 'KHOA')
     BEGIN SELECT RAISE(ABORT, 'income period is locked'); END`,
        `CREATE TRIGGER IF NOT EXISTS trg_${table}_locked_delete BEFORE DELETE ON ${table}
     WHEN EXISTS (SELECT 1 FROM inc_period WHERE ky = OLD.ky AND trang_thai = 'KHOA')
     BEGIN SELECT RAISE(ABORT, 'income period is locked'); END`,
    ]),
]);

const INC_PHAT_01_TABLE_NAMES = Object.freeze([
    'inc_adjustment', 'inc_audit_log', 'inc_ctv', 'inc_dhl_route', 'inc_employee', 'inc_ext_8611', 'inc_ext_dhl', 'inc_hscl_exempt',
    'inc_param', 'inc_penalty', 'inc_period', 'inc_postman_hrm', 'inc_postman_unit', 'inc_price_row', 'inc_price_table',
    'inc_result', 'inc_result_detail', 'inc_route_group', 'inc_warning',
]);

function resolveDbPath(argv) {
    const flagIndex = argv.indexOf('--db');
    if (flagIndex !== -1 && argv[flagIndex + 1]) return path.resolve(argv[flagIndex + 1]);
    return null;
}

function applyIncPhat01Schema(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (openErr) => {
            if (openErr) return reject(openErr);
            const fail = (error) => db.close(() => reject(error));
            const next = (index) => {
                if (index >= INC_PHAT_01_STATEMENTS.length) {
                    return db.all(`SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'inc\\_%' ESCAPE '\\' ORDER BY name`, (queryErr, rows) => {
                        db.close((closeErr) => {
                            if (queryErr) return reject(queryErr);
                            if (closeErr) return reject(closeErr);
                            return resolve(rows.map((row) => row.name));
                        });
                    });
                }
                return db.exec(INC_PHAT_01_STATEMENTS[index], (execErr) => (execErr ? fail(execErr) : next(index + 1)));
            };
            db.exec('PRAGMA busy_timeout = 30000', (pragmaErr) => (pragmaErr ? fail(pragmaErr) : next(0)));
        });
    });
}

if (require.main === module) {
    // No default path on purpose: the migration is applied to an explicit copy; applying it to the live database is a separate decision.
    const dbPath = resolveDbPath(process.argv.slice(2));
    if (!dbPath) { console.error('Usage: node migrate_inc_phat_01_schema.js --db <path to a COPY of the database>'); process.exit(2); }
    if (path.normalize(dbPath).endsWith(path.normalize('src/db/database.sqlite'))) {
        console.error('[REFUSED] INC-PHAT-01 does not apply the migration to the live database; pass a copy.'); process.exit(2);
    }
    console.log('=== INC-PHAT-01 schema migration ===');
    console.log(`DB Path: ${dbPath}`);
    applyIncPhat01Schema(dbPath)
        .then((tables) => { console.log(`[OK] Tables present: ${tables.join(', ')}`); })
        .catch((error) => { console.error('[FAIL]', error.message); process.exit(1); });
}

module.exports = { applyIncPhat01Schema, INC_PHAT_01_STATEMENTS, INC_PHAT_01_TABLE_NAMES, LOCKED_BY_PERIOD };
