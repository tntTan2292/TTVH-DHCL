'use strict';

// F11-DASHBOARD-RANKING-01 (T1/T2): the F1.1 read stack against the PO's real 2026-10-07 Hue file
// (the baseline locked in F11-MODULE-PLAN 25.x). The file is parsed and loaded into a TEMP database;
// the operational database is never read. Skipped when the PO file is not on this machine.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const { applyF11Phase1Schema } = require('../../migrate_f11_phase1_schema');
const { applyF11Phase4Schema } = require('../../migrate_f11_phase4_schema');
const { parseF11HueExcel, F11_DB_COLUMNS } = require('./f11HueExcelParser');
const { FactF11Repository } = require('../repositories/FactF11Repository');
const { F11NationalRankService } = require('./F11NationalRankService');
const { F11RankingService } = require('./F11RankingService');

const PO_FILE = path.resolve(__dirname, '../../../Data DKCL/F1.1-2026.10.07.xlsx');

test('real 2026-10-07 Hue file: module KPI, six-unit total and pair grid reconcile', { skip: !fs.existsSync(PO_FILE) }, async () => {
    const dbPath = path.join(os.tmpdir(), `f11-real-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
    let db;
    try {
        await applyF11Phase1Schema(dbPath);
        await applyF11Phase4Schema(dbPath);
        db = await new Promise((resolve, reject) => { const d = new sqlite3.Database(dbPath, (e) => (e ? reject(e) : resolve(d))); });
        const parsed = parseF11HueExcel(fs.readFileSync(PO_FILE), 'F1.1-2026.10.07.xlsx');
        assert.equal(parsed.parsedData.length, 2621);
        const sql = `INSERT INTO fact_f11 (${F11_DB_COLUMNS.join(',')}, ngay_do_kiem) VALUES (${F11_DB_COLUMNS.map(() => '?').join(',')}, ?)`;
        await new Promise((resolve, reject) => db.serialize(() => {
            db.run('BEGIN');
            const stmt = db.prepare(sql);
            for (const row of parsed.parsedData) stmt.run([...F11_DB_COLUMNS.map((c) => (row[c] === undefined ? null : row[c])), parsed.ngayDoKiem]);
            stmt.finalize((e) => (e ? reject(e) : db.run('COMMIT', (e2) => (e2 ? reject(e2) : resolve()))));
        }));

        const service = new F11RankingService({ repository: new FactF11Repository(db), nationalRankService: new F11NationalRankService(db) });

        const summary = await service.getSummary('2026-10-07', '2026-10-07');
        assert.equal(summary.total_bg, 2621);
        assert.equal(summary.total_passed, 2348);
        assert.equal(summary.total_failed, 273); // 240 Không đạt + 33 not yet evaluated, shown as Không đạt (PD-9)
        assert.equal(summary.total_blank, 33);
        assert.equal(summary.passed_rate, 89.58);

        const ranking = await service.getBcvhRanking('2026-10-07', '2026-10-07', 1, 20);
        assert.equal(ranking.data.length, 6);
        assert.equal(ranking.meta.total_row.sl_bg_ptc + (summary.total_bg - ranking.meta.total_row.sl_bg_ptc), 2621);

        const pair = await service.getPairTable({ period: 'day', anchorDate: '2026-10-07' });
        assert.equal(pair.total_row.total.volume, 2621);
        assert.equal(pair.total_row.total.passed, 2348);
        assert.equal(pair.total_row.total.rate, 89.58);
        // every parcel sits in exactly one cell: the rows add up to the grand total
        assert.equal(pair.rows.reduce((s, r) => s + r.total.volume, 0), 2621);
        const cellVolume = pair.rows.reduce((s, r) => s + Object.values(r.cells).reduce((a, c) => a + (c ? c.volume : 0), 0), 0);
        assert.equal(cellVolume, 2621);
        // the delivering-BCVH column totals equal the ranking volumes of the same six units
        for (const unit of ranking.data) {
            assert.equal(pair.total_row.cells[unit.ma_bcvh].volume, unit.sl_bg_ptc, unit.ma_bcvh);
            assert.equal(pair.total_row.cells[unit.ma_bcvh].passed, unit.dat_kpi_2026, unit.ma_bcvh);
        }
        console.log('six-unit total rate:', ranking.meta.total_row.kpi_2026, '| offices:', pair.meta.office_count, '| Khác volume:', pair.total_row.cells.OTHER && pair.total_row.cells.OTHER.volume);
    } finally {
        await new Promise((resolve) => (db ? db.close(() => resolve()) : resolve()));
        fs.rmSync(dbPath, { force: true });
    }
});
