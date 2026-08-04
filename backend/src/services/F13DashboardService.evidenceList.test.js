const test = require('node:test');
const assert = require('node:assert/strict');

const service = require('./F13DashboardService');
const repo = require('../repositories/FactBuuGuiRepository');

// P0-02: getEvidenceList must pass through the authoritative danh_gia_2026 field.
// P0-05: fact_f13 timestamps are 'dd/MM/yyyy HH:mm:ss' TEXT, which `new Date(string)`
// cannot parse — do_tre_gio must be computed via an explicit dd/MM/yyyy parser.
test('getEvidenceList passes through danh_gia_2026 and computes do_tre_gio from dd/MM/yyyy timestamps', async () => {
    const original = repo.getEvidenceList;

    repo.getEvidenceList = async () => ({
        totalItems: 1,
        data: [
            {
                ma_bg: 'BG001',
                thoi_gian_ptc: '14/06/2026 09:00:00',
                thoi_gian_nop_tien: '14/06/2026 12:30:00',
                danh_gia_2026: 'Không đạt',
            },
        ],
    });

    try {
        const result = await service.getEvidenceList('2026-06-14', '533140', '53001', 1, 20);
        const [row] = result.data;

        assert.equal(row.danh_gia_2026, 'Không đạt');
        assert.equal(row.do_tre_gio, 3.5);
    } finally {
        repo.getEvidenceList = original;
    }
});

test('getEvidenceList degrades to zero delay instead of NaN when a timestamp is unparseable', async () => {
    const original = repo.getEvidenceList;

    repo.getEvidenceList = async () => ({
        totalItems: 1,
        data: [
            {
                ma_bg: 'BG002',
                thoi_gian_ptc: 'not-a-date',
                thoi_gian_nop_tien: '14/06/2026 12:30:00',
                danh_gia_2026: 'Đạt',
            },
        ],
    });

    try {
        const result = await service.getEvidenceList('2026-06-14', '533140', '53001', 1, 20);
        const [row] = result.data;

        assert.equal(Number.isNaN(row.do_tre_gio), false);
        assert.equal(row.do_tre_gio, 0);
    } finally {
        repo.getEvidenceList = original;
    }
});
