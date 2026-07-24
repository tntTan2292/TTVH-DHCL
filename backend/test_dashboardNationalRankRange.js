'use strict';

const assert = require('assert');
const dashboardService = require('./src/services/F13DashboardService');
const factRepo = require('./src/repositories/FactBuuGuiRepository');
const { NATIONAL_RANKED_PROVINCE_CODES } = require('./src/services/nationalExcelParser');

const HUE_CODE = '53';

function buildDailyRows(date, hueRank) {
    let nonHueRank = 0;
    return NATIONAL_RANKED_PROVINCE_CODES.map((code) => {
        const isHue = code === HUE_CODE;
        if (!isHue) nonHueRank += 1;
        const effectiveRank = isHue
            ? hueRank
            : (nonHueRank < hueRank ? nonHueRank : nonHueRank + 1);
        const rate = (100 - effectiveRank) / 100;
        return {
            ngay_do_kiem: date,
            ma_tinh_phat: code,
            ten_tinh_phat: isHue ? 'Hue' : `Province ${code}`,
            sl_bg_ptc: 1000,
            sl_ptc_dung_qd_ct: Math.round(rate * 1000)
        };
    }).sort((a, b) => {
        const rateA = a.sl_bg_ptc ? a.sl_ptc_dung_qd_ct / a.sl_bg_ptc : 0;
        const rateB = b.sl_bg_ptc ? b.sl_ptc_dung_qd_ct / b.sl_bg_ptc : 0;
        if (rateB !== rateA) return rateB - rateA;
        return b.sl_bg_ptc - a.sl_bg_ptc;
    });
}

function buildFixture() {
    const rows = [
        ...buildDailyRows('2026-07-18', 19),
        ...buildDailyRows('2026-07-19', 24)
    ];
    return rows;
}

function aggregateRows(rows, startDate, endDate) {
    const byProvince = new Map();
    for (const row of rows.filter((item) => item.ngay_do_kiem >= startDate && item.ngay_do_kiem <= endDate)) {
        if (!byProvince.has(row.ma_tinh_phat)) {
            byProvince.set(row.ma_tinh_phat, {
                ma_tinh_phat: row.ma_tinh_phat,
                ten_tinh_phat: row.ten_tinh_phat,
                cumulative_volume: 0,
                cumulative_pass: 0
            });
        }
        const target = byProvince.get(row.ma_tinh_phat);
        target.cumulative_volume += row.sl_bg_ptc;
        target.cumulative_pass += row.sl_ptc_dung_qd_ct;
    }
    return Array.from(byProvince.values()).sort((a, b) => {
        const rateA = a.cumulative_volume ? a.cumulative_pass / a.cumulative_volume : 0;
        const rateB = b.cumulative_volume ? b.cumulative_pass / b.cumulative_volume : 0;
        if (rateB !== rateA) return rateB - rateA;
        return b.cumulative_volume - a.cumulative_volume;
    });
}

async function withMockedDashboardData(testBody) {
    const originalRepo = factRepo.getKpiMetrics;
    const originalDbAll = dashboardService.dbAll;
    const originalDbGet = dashboardService.dbGet;
    const fixture = buildFixture();

    factRepo.getKpiMetrics = async (startDate, endDate, filters = {}) => {
        assert.equal(filters.bcvhId, null, 'dashboard all-Hue operational KPI must not be replaced by TCT province metrics');
        return {
            total_bg: startDate === endDate ? 100 : 200,
            total_passed: startDate === endDate ? 60 : 120,
            total_failed: startDate === endDate ? 30 : 60
        };
    };
    dashboardService.dbGet = async () => ({ config_value: HUE_CODE });
    dashboardService.dbAll = async (sql, params = []) => {
        if (/COUNT\(\*\) AS row_count/.test(sql)) {
            const [startDate, endDate] = params;
            const dates = Array.from(new Set(fixture
                .filter((row) => row.ngay_do_kiem >= startDate && row.ngay_do_kiem <= endDate)
                .map((row) => row.ngay_do_kiem)));
            return dates.map((date) => ({
                ngay_do_kiem: date,
                row_count: fixture.filter((row) => row.ngay_do_kiem === date).length,
                distinct_count: new Set(fixture.filter((row) => row.ngay_do_kiem === date).map((row) => row.ma_tinh_phat)).size
            }));
        }
        if (/SUM\(COALESCE\(sl_bg_ptc/.test(sql)) {
            return aggregateRows(fixture, params[0], params[1]);
        }
        throw new Error(`Unexpected SQL in mock: ${sql}`);
    };

    try {
        await testBody({ fixture });
    } finally {
        factRepo.getKpiMetrics = originalRepo;
        dashboardService.dbAll = originalDbAll;
        dashboardService.dbGet = originalDbGet;
    }
}

(async () => {
    console.log('\nTEST 1: single-date national ranks remain source-grounded');
    await withMockedDashboardData(async () => {
        const july18 = await dashboardService.getDashboardKpi('2026-07-18', '2026-07-18', {});
        const july19 = await dashboardService.getDashboardKpi('2026-07-19', '2026-07-19', {});
        assert.equal(july18.national_rank.rank, 19, '2026-07-18 remains 19/34');
        assert.equal(july18.national_rank.total, 34, '2026-07-18 ranked population is 34');
        assert.equal(july19.national_rank.rank, 24, '2026-07-19 remains 24/34');
        assert.equal(july19.national_rank.total, 34, '2026-07-19 ranked population is 34');
        assert.equal(july18.total_bg, 100, 'Hue operational volume comes from Hue source');
        assert.equal(july18.total_passed, 60, 'Hue operational pass comes from Hue source');
        assert.equal(july18.passed_rate, 60, 'Hue operational KPI is not overwritten by TCT KPI');
        assert.equal(july18.source_metadata.operational.source, 'HUE_F13');
        assert.equal(july18.source_metadata.national_rank.source, 'TCT_NATIONAL');
    });

    console.log('\nTEST 2: selected range recalculates cumulative national rank');
    await withMockedDashboardData(async ({ fixture }) => {
        const result = await dashboardService.getDashboardKpi('2026-07-18', '2026-07-19', {});
        const aggregate = aggregateRows(fixture, '2026-07-18', '2026-07-19');
        const expectedRank = aggregate.findIndex((row) => row.ma_tinh_phat === HUE_CODE) + 1;
        const hueAggregate = aggregate.find((row) => row.ma_tinh_phat === HUE_CODE);
        assert.equal(result.national_rank.rank, expectedRank, 'range rank is recalculated from cumulative national data');
        assert.notEqual(result.national_rank.rank, 24, 'range rank must not reuse the latest day rank');
        assert.equal(result.national_rank.cumulative_volume, hueAggregate.cumulative_volume, 'range volume is cumulative national volume');
        assert.equal(result.national_rank.cumulative_pass, hueAggregate.cumulative_pass, 'range pass is cumulative national pass');
        assert.equal(result.total_bg, 200, 'range Hue operational volume still comes from Hue data');
        assert.equal(result.passed_rate, 60, 'range Hue KPI remains Hue-source KPI');
        assert.equal(result.national_rank.source_role, 'NATIONWIDE_RANK_ONLY');
    });

    console.log('\nTEST 3: missing national dates make rank unavailable');
    await withMockedDashboardData(async () => {
        const result = await dashboardService.getDashboardKpi('2026-07-17', '2026-07-19', {});
        assert.equal(result.national_rank.available, false, 'partial national range does not return a misleading rank');
        assert.equal(result.national_rank.status, 'PARTIAL_NATIONAL_DATA');
        assert.deepEqual(result.national_rank.missing_dates, ['2026-07-17']);
        assert.equal(result.source_metadata.national_rank.status, 'PARTIAL_NATIONAL_DATA');
    });

    console.log('\nRESULT: dashboard national ranking range checks passed');
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
