'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { planChanges, parseRemoteListing } = require('./bfPhatWinscpService');
const { syncChangedDays } = require('./bfPhatSync');
const { pickDailyFiles, pruneSupersededFiles } = require('./bfPhatImportService');

const put = (dir, name, size) => fs.writeFileSync(path.join(dir, name), Buffer.alloc(size, 1));

test('parses the server listing and keeps only daily file names', () => {
    const text = [
        '-rw-r--r--   1 998      999         924536 Oct 23  4:26:53 2026 SanLuongChiTiet_22102026.xlsx',
        '-rw-r--r--   1 998      999            3208 Feb  2  3:30:13 2026 SanLuongChiTiet_01022026.xlsx\r',
        'drwxr-xr-x   2 998      999           4096 Oct 26  3:41:58 2026 SLP',
        '-rw-r--r--   1 998      999              10 Oct 26  3:41:58 2026 notes.txt',
    ].join('\n');
    assert.deepEqual(parseRemoteListing(text), [
        { name: 'SanLuongChiTiet_22102026.xlsx', size: 924536 },
        { name: 'SanLuongChiTiet_01022026.xlsx', size: 3208 },
    ]);
});

test('the bigger file of a day wins, an unchanged day is not planned', () => {
    const remote = [
        { name: 'SanLuongChiTiet_01012026.xlsx', size: 3208 },
        { name: 'SanLuongChiTiet_01012026_001.xlsx', size: 495086 },
        { name: 'SanLuongChiTiet_02012026.xlsx', size: 700000 },
        { name: 'SanLuongChiTiet_03012026.xlsx', size: 800000 },
    ];
    const localByDate = new Map([
        ['2026-01-01', { name: 'SanLuongChiTiet_01012026_001.xlsx', size: 495086 }],
        ['2026-01-02', { name: 'SanLuongChiTiet_02012026.xlsx', size: 650000 }], // corrected on the server: size changed
    ]);
    const plan = planChanges({ remote, localByDate, fromDate: '2026-01-01', toDate: '2026-01-03' });
    assert.deepEqual(plan.map((p) => [p.date, p.reason]), [['2026-01-02', 'CHANGED'], ['2026-01-03', 'NEW']]);
    assert.deepEqual(planChanges({ remote, localByDate, fromDate: '2026-01-01', toDate: '2026-01-01' }), []);
});

test('sync downloads a bigger re-export, deletes the old file, imports it once, and a second pass does nothing', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bfsync-'));
    try {
        const dir = path.join(root, '2026');
        fs.mkdirSync(dir);
        put(dir, 'SanLuongChiTiet_20102026.xlsx', 1000);
        const remote = [
            { name: 'SanLuongChiTiet_20102026.xlsx', size: 1000 },
            { name: 'SanLuongChiTiet_20102026_001.xlsx', size: 5000 },
            { name: 'SanLuongChiTiet_25102026.xlsx', size: 4000 },
        ];
        const imported = [];
        const importer = { importFile: async (file) => { imported.push(path.basename(file)); return { date: 'x', status: 'SUCCESS', rows: 1 }; } };
        const download = async (names, localDir) => { for (const name of names) put(localDir, name, remote.find((f) => f.name === name).size); return { code: 0 }; };
        const options = { toDate: '2026-10-25', localRoot: root, importer, list: async () => ({ code: 0, files: remote }), download };

        const first = await syncChangedDays(options);
        assert.deepEqual(first.plan.map((p) => [p.name, p.reason]), [['SanLuongChiTiet_20102026_001.xlsx', 'CHANGED'], ['SanLuongChiTiet_25102026.xlsx', 'NEW']]);
        assert.deepEqual(fs.readdirSync(dir).sort(), ['SanLuongChiTiet_20102026_001.xlsx', 'SanLuongChiTiet_25102026.xlsx']);
        assert.deepEqual(imported, ['SanLuongChiTiet_20102026_001.xlsx', 'SanLuongChiTiet_25102026.xlsx']);
        assert.equal(first.newDayOnServer, true);

        const second = await syncChangedDays(options);
        assert.equal(second.plan.length, 0);
        assert.equal(imported.length, 2);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('a listing failure or a file that did not arrive is reported, nothing is deleted', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bfsync-'));
    try {
        const dir = path.join(root, '2026');
        fs.mkdirSync(dir);
        put(dir, 'SanLuongChiTiet_20102026.xlsx', 1000);
        const importer = { importFile: async () => { throw new Error('must not import'); } };
        const failed = await syncChangedDays({ toDate: '2026-10-25', localRoot: root, importer, list: async () => ({ code: 1, files: [] }) });
        assert.equal(failed.errors.length, 1);

        const remote = [{ name: 'SanLuongChiTiet_20102026_001.xlsx', size: 5000 }];
        const lost = await syncChangedDays({ toDate: '2026-10-25', localRoot: root, importer, list: async () => ({ code: 0, files: remote }), download: async () => ({ code: 1 }) });
        assert.equal(lost.errors.length, 1);
        assert.deepEqual(fs.readdirSync(dir), ['SanLuongChiTiet_20102026.xlsx']);
        assert.equal(pickDailyFiles(dir).length, 1);
        assert.deepEqual(pruneSupersededFiles(dir), []);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
