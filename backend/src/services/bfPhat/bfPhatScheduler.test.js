'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const { BfPhatScheduler, windowFor, parseStart } = require('./bfPhatScheduler');
const { applyBfPhat01Schema } = require('../../../migrate_bf_phat_01_schema');

test('window is D-1 plus two refresh days; start time parsing falls back to 05:00', () => {
    assert.deepEqual(windowFor('2026-10-26'), { newDay: '2026-10-25', refreshDays: ['2026-10-24', '2026-10-23'] });
    assert.deepEqual(windowFor('2026-03-01'), { newDay: '2026-02-28', refreshDays: ['2026-02-27', '2026-02-26'] });
    assert.equal(parseStart('07:30'), 450);
    assert.equal(parseStart('bad'), 300);
});

async function makeDb(dir) {
    const dbPath = path.join(dir, 't.sqlite');
    await new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, () => db.exec(`CREATE TABLE import_log (id INTEGER PRIMARY KEY AUTOINCREMENT, file_name TEXT NOT NULL,
            ngay_do_kiem TEXT NOT NULL, indicator TEXT DEFAULT 'F1.3', source_lane TEXT, trigger_source TEXT DEFAULT 'AUTO', created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT NOT NULL, total_records INTEGER DEFAULT 0, error_records INTEGER DEFAULT 0, skipped_records INTEGER DEFAULT 0)`, (e) => db.close(() => (e ? reject(e) : resolve()))));
    });
    await applyBfPhat01Schema(dbPath);
    return dbPath;
}

const count = (dbPath, sql) => new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, () => db.get(sql, (e, row) => db.close(() => (e ? reject(e) : resolve(row.n)))));
});

test('before the start time nothing runs; with no file a FAILED log is written and retries wait', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bfsched-'));
    try {
        const dbPath = await makeDb(dir);
        let downloads = 0;
        const make = (iso) => new BfPhatScheduler({
            dbPath, logger: {}, env: { BF_PHAT_LOCAL_ROOT: dir }, clock: () => new Date(iso),
            download: async () => { downloads += 1; return { code: 0, log: '' }; },
            importer: { importFile: async () => ({ status: 'SUCCESS' }) },
        });
        process.env.BF_PHAT_LOCAL_ROOT = dir;

        assert.equal(await make('2026-10-25T20:00:00Z').tick(), null); // 03:00 Vietnam, before 05:00
        assert.equal(downloads, 0);

        const scheduler = make('2026-10-25T23:30:00Z'); // 06:30 Vietnam on 2026-10-26
        const summary = await scheduler.tick();
        assert.deepEqual(summary, ['2026-10-25=NO_FILE']);
        assert.equal(downloads, 1);
        assert.equal(await count(dbPath, "SELECT COUNT(*) AS n FROM import_log WHERE indicator = 'BF-PHAT' AND status = 'FAILED'"), 1);

        assert.equal(await scheduler.tick(), null); // within the retry gap
        assert.equal(downloads, 1);
    } finally {
        delete process.env.BF_PHAT_LOCAL_ROOT;
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
