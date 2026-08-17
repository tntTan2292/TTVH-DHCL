const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const { applyF41Phase1Schema } = require('../../migrate_f41_phase1_schema');
const { FactF41Repository } = require('./FactF41Repository');

function createTempDbPath() {
    return path.join(os.tmpdir(), `fact-f41-repository-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
}

test('repository computes F4.1 KPI using all rows as denominator', async () => {
    const dbPath = createTempDbPath();
    let db;
    try {
        await applyF41Phase1Schema(dbPath);
        db = new sqlite3.Database(dbPath);
        const repository = new FactF41Repository(db);
        await repository.overwriteImport('2026-08-01', [
            { ma_bg: 'BG001', ma_bc_phat: '533140', ten_bc_phat: 'BCVH Thuận Hóa', danh_gia_co_tms_ptc_8h: 'Đạt' },
            { ma_bg: 'BG002', ma_bc_phat: '533140', ten_bc_phat: 'BCVH Thuận Hóa', danh_gia_co_tms_ptc_8h: 'Không đạt' },
            { ma_bg: 'BG003', ma_bc_phat: '533140', ten_bc_phat: 'BCVH Thuận Hóa', danh_gia_co_tms_ptc_8h: null },
        ]);

        const metrics = await repository.getKpiMetrics('2026-08-01', '2026-08-01');
        assert.equal(metrics.total_rows, 3);
        assert.equal(metrics.total_passed, 1);
        assert.equal(metrics.total_failed, 1);
        assert.equal(metrics.total_blank, 1);
        assert.equal(metrics.rate_percent, 33.33);
    } finally {
        if (db) db.close();
        fs.rmSync(dbPath, { force: true });
    }
});

test('repository overwrites only the requested F4.1 date', async () => {
    const dbPath = createTempDbPath();
    let db;
    try {
        await applyF41Phase1Schema(dbPath);
        db = new sqlite3.Database(dbPath);
        const repository = new FactF41Repository(db);
        await repository.overwriteImport('2026-08-01', [{ ma_bg: 'BG001', danh_gia_co_tms_ptc_8h: 'Đạt' }]);
        await repository.overwriteImport('2026-08-02', [{ ma_bg: 'BG002', danh_gia_co_tms_ptc_8h: 'Không đạt' }]);
        await repository.overwriteImport('2026-08-01', [{ ma_bg: 'BG003', danh_gia_co_tms_ptc_8h: null }]);

        const day1 = await repository.getKpiMetrics('2026-08-01', '2026-08-01');
        const day2 = await repository.getKpiMetrics('2026-08-02', '2026-08-02');
        assert.equal(day1.total_rows, 1);
        assert.equal(day1.total_blank, 1);
        assert.equal(day2.total_rows, 1);
        assert.equal(day2.total_failed, 1);
    } finally {
        if (db) db.close();
        fs.rmSync(dbPath, { force: true });
    }
});
