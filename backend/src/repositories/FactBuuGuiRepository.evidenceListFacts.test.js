const test = require('node:test');
const assert = require('node:assert/strict');

const repo = require('./FactBuuGuiRepository');
const dbModule = require('../config/db');

test('getEvidenceListFacts selects the full Không đạt population for date/BCVH/route, unpaginated', async () => {
    const originalAll = dbModule.db.all;
    const observedSql = [];
    const observedParams = [];

    dbModule.db.all = (sql, params, callback) => {
        observedSql.push(sql);
        observedParams.push(params);
        callback(null, [
            { ma_bg: 'BG001', danh_gia_2026: 'Không đạt', thoi_gian_ptc: '14/06/2026 08:00:00', thoi_gian_nop_tien: null },
        ]);
    };

    try {
        const rows = await repo.getEvidenceListFacts('2026-06-14', '533140', '53001');

        assert.equal(observedSql.length, 1);
        assert.match(observedSql[0], /danh_gia_2026 = 'Không đạt'/);
        assert.doesNotMatch(observedSql[0], /LIMIT/);
        assert.deepEqual(observedParams[0], ['2026-06-14', '533140', '53001']);
        assert.equal(rows.length, 1);
        assert.equal(rows[0].ma_bg, 'BG001');
    } finally {
        dbModule.db.all = originalAll;
    }
});

test('getEvidenceListFacts decodes extended_data JSON when present', async () => {
    const originalAll = dbModule.db.all;

    dbModule.db.all = (sql, params, callback) => {
        callback(null, [
            { ma_bg: 'BG002', danh_gia_2026: 'Không đạt', extended_data: '{"note":"x"}' },
        ]);
    };

    try {
        const rows = await repo.getEvidenceListFacts('2026-06-14', '533140', '53001');
        assert.deepEqual(rows[0].extended_data, { note: 'x' });
    } finally {
        dbModule.db.all = originalAll;
    }
});
