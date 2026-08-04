const test = require('node:test');
const assert = require('node:assert/strict');

const ruleEngineService = require('./ruleEngineService');
const dbHelper = require('../config/db');

// P0-01: recommendations must be computed on the authoritative danh_gia_2026 field,
// not the non-authoritative ket_qua_f13 field (F13-STANDARDIZATION-001 Phase 0).
test('evaluate() computes recommendations from danh_gia_2026, not ket_qua_f13', async () => {
    const original = dbHelper.all;
    const sqlCalls = [];

    dbHelper.all = async (sql, params = []) => {
        sqlCalls.push(sql);
        if (sql.includes('system_config')) {
            return [];
        }
        if (sql.includes('GROUP BY ma_bcvh, ten_bcvh')) {
            // Today's data: BCVH A drops sharply vs its own 7-day average and vs province.
            return [
                { ma_bcvh: 'A', ten_bcvh: 'BCVH A', total_bg: 100, passed_bg: 40, failed_bg: 60, kpi_rate: 40 },
                { ma_bcvh: 'B', ten_bcvh: 'BCVH B', total_bg: 100, passed_bg: 90, failed_bg: 10, kpi_rate: 90 },
            ];
        }
        // 7-day average KPI per BCVH.
        return [
            { ma_bcvh: 'A', avg_kpi: 80 },
            { ma_bcvh: 'B', avg_kpi: 88 },
        ];
    };

    try {
        const recommendations = await ruleEngineService.evaluate('2026-08-03', '2026-08-03');

        const sqlText = sqlCalls.join('\n');
        assert.match(sqlText, /danh_gia_2026/, 'SQL must reference the authoritative danh_gia_2026 field');
        assert.doesNotMatch(sqlText, /ket_qua_f13/, 'SQL must not reference the non-authoritative ket_qua_f13 field');

        const rec = recommendations.find((r) => r.ten_bcvh === 'BCVH A');
        assert.ok(rec, 'BCVH A should trigger a recommendation given its sharp drop');
        assert.equal(rec.priority, 'P1');
    } finally {
        dbHelper.all = original;
    }
});
