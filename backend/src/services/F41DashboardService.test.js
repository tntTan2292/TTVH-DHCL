'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { F41DashboardService } = require('./F41DashboardService');

function makeFakeRepository({ kpiMetrics, reconciliation, meta } = {}) {
    return {
        calls: [],
        async getKpiMetrics(fromDate, toDate, filters) {
            this.calls.push({ method: 'getKpiMetrics', fromDate, toDate, filters });
            return kpiMetrics;
        },
        async getBcvhReconciliation(date) {
            this.calls.push({ method: 'getBcvhReconciliation', date });
            return reconciliation;
        },
        async getMeta() {
            this.calls.push({ method: 'getMeta' });
            return meta;
        }
    };
}

test('getDashboardKpi uses total_rows as the denominator (no PTC gating) and forwards the date range/BCVH filter unchanged', async () => {
    const repository = makeFakeRepository({
        kpiMetrics: { total_rows: 4695, total_passed: 2863, total_failed: 1581, total_blank: 251, rate_percent: 60.98 }
    });
    const service = new F41DashboardService(repository);

    const result = await service.getDashboardKpi('2026-08-01', '2026-08-01', { bcvhId: null });

    assert.equal(repository.calls[0].fromDate, '2026-08-01');
    assert.equal(repository.calls[0].toDate, '2026-08-01');
    assert.deepEqual(repository.calls[0].filters, { bcvhId: null });
    assert.equal(result.total_rows, 4695);
    assert.equal(result.total_passed, 2863);
    assert.equal(result.total_failed, 1581);
    assert.equal(result.total_blank, 251);
    assert.equal(result.rate_percent, 60.98);
    assert.deepEqual(result.date_range, { from_date: '2026-08-01', to_date: '2026-08-01' });
});

test('getDashboardKpi supports a multi-day range by forwarding distinct from/to dates', async () => {
    const repository = makeFakeRepository({
        kpiMetrics: { total_rows: 9000, total_passed: 5500, total_failed: 3000, total_blank: 500, rate_percent: 61.11 }
    });
    const service = new F41DashboardService(repository);

    const result = await service.getDashboardKpi('2026-08-01', '2026-08-05', {});

    assert.equal(repository.calls[0].fromDate, '2026-08-01');
    assert.equal(repository.calls[0].toDate, '2026-08-05');
    assert.equal(result.total_rows, 9000);
});

test('getDashboardKpi returns a null rate when there are zero rows, instead of dividing by zero', async () => {
    const repository = makeFakeRepository({
        kpiMetrics: { total_rows: 0, total_passed: 0, total_failed: 0, total_blank: 0, rate_percent: null }
    });
    const service = new F41DashboardService(repository);

    const result = await service.getDashboardKpi('2099-01-01', '2099-01-01', {});

    assert.equal(result.total_rows, 0);
    assert.equal(result.rate_percent, null);
});

test('getBcvhReconciliation maps repository rows to the ma_bcvh/ten_bcvh response shape', async () => {
    const repository = makeFakeRepository({
        reconciliation: [
            { ma_bc_phat: '533140', ten_bc_phat: 'BCVH Thuận Hóa', total_rows: 10, total_passed: 6, total_failed: 3, total_blank: 1, rate_percent: 60 }
        ]
    });
    const service = new F41DashboardService(repository);

    const result = await service.getBcvhReconciliation('2026-08-01');

    assert.equal(repository.calls[0].date, '2026-08-01');
    assert.deepEqual(result, [
        { ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa', total_rows: 10, total_passed: 6, total_failed: 3, total_blank: 1, rate_percent: 60 }
    ]);
});

test('getDashboardMeta reads min/max ngay_do_kiem from the repository and returns the canonical BCVH unit list', async () => {
    const repository = makeFakeRepository({ meta: { min_date: '2026-08-01', max_date: '2026-08-03' } });
    const service = new F41DashboardService(repository);

    const result = await service.getDashboardMeta();

    assert.equal(result.min_date, '2026-08-01');
    assert.equal(result.max_date, '2026-08-03');
    assert.ok(Array.isArray(result.bcvh_units));
    assert.ok(result.bcvh_units.length > 0);
});
