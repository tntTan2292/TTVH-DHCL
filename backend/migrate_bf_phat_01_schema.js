/**
 * BF-PHAT-IMPORT-01 -- additive table fact_bf_phat (daily delivery BatchFile, one row per delivery event).
 *
 * Own table on purpose: fact_f13 is one row per measured BG, the BatchFile is many events per BG,
 * so mixing them would change the grain of every F1.3 number. Joined to fact_f13 by LADING_CODE.
 * Nothing existing is rewritten.
 */
'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS fact_bf_phat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ngay_bf TEXT NOT NULL,
    import_log_id INTEGER,
    source_file TEXT,
    lading_code TEXT NOT NULL,
    ma_tinh TEXT,
    ma_huyen TEXT,
    ma_buu_cuc TEXT,
    postman_code TEXT,
    route_po_code TEXT,
    status_code TEXT,
    type_code_payroll TEXT,
    type_name_payroll TEXT,
    service_name_payroll TEXT,
    region_code TEXT,
    kg REAL,
    area_code TEXT,
    service_code TEXT,
    item_type_code TEXT,
    status_date TEXT,
    quantity REAL,
    service_pro TEXT,
    mabc_cn TEXT,
    mabc_phat TEXT,
    so_tien_thu_ho REAL,
    customer_code TEXT,
    lat REAL,
    lon REAL,
    status_time TEXT,
    gtgt TEXT,
    xac_nhan_den_bcp TEXT,
    ma_lo TEXT,
    FOREIGN KEY(import_log_id) REFERENCES import_log(id)
);
CREATE INDEX IF NOT EXISTS idx_bf_phat_ngay_bc ON fact_bf_phat(ngay_bf, mabc_phat);
CREATE INDEX IF NOT EXISTS idx_bf_phat_lading ON fact_bf_phat(lading_code);
CREATE INDEX IF NOT EXISTS idx_bf_phat_ma_lo ON fact_bf_phat(ma_lo) WHERE ma_lo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bf_phat_postman ON fact_bf_phat(postman_code, ngay_bf);
`;

function resolveDbPath(argv) {
    const flagIndex = argv.indexOf('--db');
    if (flagIndex !== -1 && argv[flagIndex + 1]) return path.resolve(argv[flagIndex + 1]);
    return path.resolve(__dirname, 'src/db/database.sqlite');
}

function applyBfPhat01Schema(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (openError) => {
            if (openError) return reject(openError);
            db.exec(SCHEMA_SQL, (execError) => {
                db.close((closeError) => (execError || closeError) ? reject(execError || closeError) : resolve());
            });
        });
    });
}

if (require.main === module) {
    applyBfPhat01Schema(resolveDbPath(process.argv.slice(2)))
        .then(() => console.log('[OK] BF-PHAT-IMPORT-01 schema present. No business data was changed.'))
        .catch((error) => {
            console.error('[FAIL] BF-PHAT-IMPORT-01 migration failed:', error.message);
            process.exit(1);
        });
}

module.exports = { applyBfPhat01Schema, SCHEMA_SQL };
