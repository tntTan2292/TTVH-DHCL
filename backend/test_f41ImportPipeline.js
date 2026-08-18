'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const xlsx = require('xlsx');

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'f41-pipeline-'));
process.env.NODE_ENV = 'test';
process.env.QIS_TEST_DB_PATH = path.join(sandbox, 'qis.sqlite');
process.env.QIS_TEST_DATA_ROOT = path.join(sandbox, 'F1.3');
process.env.QIS_TEST_DATA_ROOT_F41 = path.join(sandbox, 'F4.1');

const { db, run, get } = require('./src/config/db');
const { executeImport } = require('./src/services/importPipeline');
const { F41_HUE_COLUMN_MAPPING } = require('./src/services/f41HueExcelParser');
const { F41_TCT_DB_COLUMNS } = require('./src/services/f41TctExcelParser');
const { applyF41Phase1Schema } = require('./migrate_f41_phase1_schema');
const { applyF41Phase2Schema } = require('./migrate_f41_phase2_schema');

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function writeWorkbook(filePath, rows) {
    const ws = xlsx.utils.aoa_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Worksheet');
    xlsx.writeFile(wb, filePath);
}

function buildHueFile(filePath) {
    const headers = Object.keys(F41_HUE_COLUMN_MAPPING);
    const row = headers.map((header) => {
        if (header === 'STT') return 1;
        if (header === 'Số hiệu bưu gửi') return 'F41-HUE-001';
        if (header === 'Mã BC phát') return '533140';
        if (header === 'Đánh giá (thời gian Có TMS PTC 8 giờ)') return 'Đạt';
        return null;
    });
    writeWorkbook(filePath, [headers, row]);
}

function buildTctFile(filePath) {
    const rawCodes = [
        '01', '08', '10', '11', '12', '14', '15', '16', '18', '20',
        '22', '24', '25', '27', '29', '30', '33', '34', '36', '38',
        '39', '43', '44', '46', '48', '49', '52', '53', '55', '57',
        '60', '63', '65', '67', '70', '71', '75', '77', '81', '82',
        '84', '87', '88', '89', '90', '97',
    ];
    const header = F41_TCT_DB_COLUMNS.map((_, index) => `C${index + 1}`);
    const legend = F41_TCT_DB_COLUMNS.map((_, index) => index + 1);
    const total = [1, null, null, ...Array(35).fill(0)];
    const rows = [header, Array(38).fill(null), legend, total];
    for (let i = 0; i < rawCodes.length; i += 1) {
        rows.push([
            i + 2,
            rawCodes[i],
            `Unit ${rawCodes[i]}`,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            ...Array(28).fill(0),
        ]);
    }
    writeWorkbook(filePath, rows);
}

test('F4.1 pipeline imports HUE/TCT in isolation, deduplicates retry, and leaves fact_f13 unchanged', async () => {
    try {
        await applyF41Phase1Schema(process.env.QIS_TEST_DB_PATH);
        await applyF41Phase2Schema(process.env.QIS_TEST_DB_PATH);
        await run(`
            CREATE TABLE IF NOT EXISTS fact_f13 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ngay_do_kiem TEXT NOT NULL,
                ma_bg TEXT NOT NULL,
                danh_gia_2026 TEXT,
                UNIQUE(ngay_do_kiem, ma_bg)
            )
        `);
        await run("INSERT INTO fact_f13 (ngay_do_kiem, ma_bg, danh_gia_2026) VALUES ('2026-08-01', 'F13-SENTINEL', 'Đạt')");

        const hueIncoming = path.join(process.env.QIS_TEST_DATA_ROOT_F41, 'Incoming', 'HUE');
        const tctIncoming = path.join(process.env.QIS_TEST_DATA_ROOT_F41, 'Incoming', 'TCT');
        ensureDir(hueIncoming);
        ensureDir(tctIncoming);
        const hueFile = path.join(hueIncoming, 'F4.1-2026.08.01.xlsx');
        const tctFile = path.join(tctIncoming, 'F4.1-2026.08.01.xlsx');
        buildHueFile(hueFile);
        buildTctFile(tctFile);

        const hueResult = await executeImport({ filePath: hueFile, indicator: 'F4.1', lane: 'HUE', source: 'MANUAL' });
        const tctResult = await executeImport({ filePath: tctFile, indicator: 'F4.1', lane: 'TCT', source: 'MANUAL' });

        assert.equal(hueResult.inserted, 1);
        assert.equal(tctResult.inserted, 34);
        assert.equal((await get('SELECT COUNT(*) AS n FROM fact_f41')).n, 1);
        assert.equal((await get('SELECT COUNT(*) AS n FROM fact_f41_national')).n, 34);
        assert.equal((await get("SELECT COUNT(*) AS n FROM fact_f41_national WHERE ma_don_vi IN ('01','08','11','12','14','15','34','49','71','75','77','82')")).n, 0);
        assert.equal((await get('SELECT COUNT(*) AS n FROM fact_f13')).n, 1);

        buildHueFile(hueFile);
        const retry = await executeImport({ filePath: hueFile, indicator: 'F4.1', lane: 'HUE', source: 'MANUAL' });
        assert.equal(retry.requiresConfirmation, true);
        assert.equal(retry.ngay_do_kiem, '2026-08-01');
        assert.equal((await get('SELECT COUNT(*) AS n FROM fact_f41')).n, 1);
        assert.equal((await get('SELECT COUNT(*) AS n FROM fact_f13')).n, 1);

        const logCounts = await get(`
            SELECT
                SUM(CASE WHEN indicator = 'F4.1' AND source_lane = 'HUE' AND status = 'SUCCESS' THEN 1 ELSE 0 END) AS hue_logs,
                SUM(CASE WHEN indicator = 'F4.1' AND source_lane = 'TCT' AND status = 'SUCCESS' THEN 1 ELSE 0 END) AS tct_logs
            FROM import_log
        `);
        assert.equal(logCounts.hue_logs, 1);
        assert.equal(logCounts.tct_logs, 1);
    } finally {
        await new Promise((resolve) => db.close(() => resolve()));
        fs.rmSync(sandbox, { recursive: true, force: true });
    }
});
