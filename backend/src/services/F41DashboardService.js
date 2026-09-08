'use strict';

// F41-DASHBOARD-MINIMUM-01 - Phase B1 Backend
// Thin service layer over FactF41Repository. Per locked Product Owner
// decision (F41-MODULE-PLAN, decision 2), the F4.1 KPI denominator is the
// entire row set for the period - not `sl_bg_ptc` as in F1.3 - so no
// PTC-gating logic is applied here.

const { factF41Repository } = require('../repositories/FactF41Repository');
const { buildDashboardMeta } = require('../config/canonicalBcvhUnits');

class F41DashboardService {
    constructor(repository = factF41Repository) {
        this.repository = repository;
    }

    async getDashboardKpi(fromDate, toDate, filters = {}) {
        const metrics = await this.repository.getKpiMetrics(fromDate, toDate, filters);
        const totalRows = metrics.total_rows || 0;
        const totalPassed = metrics.total_passed || 0;
        const totalFailed = metrics.total_failed || 0;
        const totalBlank = metrics.total_blank || 0;
        return {
            date_range: { from_date: fromDate, to_date: toDate },
            ma_bcvh: filters.bcvhId || null,
            total_rows: totalRows,
            total_passed: totalPassed,
            total_failed: totalFailed,
            total_blank: totalBlank,
            rate_percent: metrics.rate_percent === null || metrics.rate_percent === undefined ? null : metrics.rate_percent
        };
    }

    async getBcvhReconciliation(date) {
        const rows = await this.repository.getBcvhReconciliation(date);
        return rows.map((row) => ({
            ma_bcvh: row.ma_bc_phat,
            ten_bcvh: row.ten_bc_phat,
            total_rows: row.total_rows || 0,
            total_passed: row.total_passed || 0,
            total_failed: row.total_failed || 0,
            total_blank: row.total_blank || 0,
            rate_percent: row.rate_percent === null || row.rate_percent === undefined ? null : row.rate_percent
        }));
    }

    async getDashboardMeta() {
        const { min_date, max_date } = await this.repository.getMeta();
        return buildDashboardMeta(max_date, min_date);
    }
}

module.exports = {
    F41DashboardService,
    f41DashboardService: new F41DashboardService()
};
