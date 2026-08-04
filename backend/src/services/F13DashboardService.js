const factBuuGuiRepo = require('../repositories/FactBuuGuiRepository');
const ruleRegistry = require('../engine/rules/RuleRegistry');
const RuleF13302 = require('../engine/rules/RuleF13302');
const { CANONICAL_BCVH_UNITS } = require('../config/canonicalBcvhUnits');
const {
    CONFIRMED_NON_POSTMAN_ROUTES,
    classifyRoute,
} = require('../config/f13RouteClassificationCatalog');
const { all, get } = require('../config/db');

const canonicalBcvhCodes = new Set(CANONICAL_BCVH_UNITS.map((unit) => unit.ma_bcvh));

function normalizeDashboardBcvhCode(ma_bcvh) {
    if (ma_bcvh === undefined || ma_bcvh === null || ma_bcvh === '') return null;
    if (ma_bcvh === 'all') return null;
    if (canonicalBcvhCodes.has(ma_bcvh)) return ma_bcvh;
    return undefined;
}

// fact_f13 event timestamps (thoi_gian_*) are stored as TEXT in 'dd/MM/yyyy HH:mm:ss',
// which `new Date(string)` cannot parse (returns Invalid Date). Parse explicitly instead.
function parseF13Timestamp(value) {
    if (typeof value !== 'string') return null;
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
    if (!match) return null;
    const [, day, month, year, hour, minute, second] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
    return Number.isNaN(date.getTime()) ? null : date;
}

class F13DashboardService {
    
    // Hàm bọc tính toán an toàn (Tránh lỗi Division by Zero)
    _calculateRate(part, total) {
        if (!total || total === 0) return 0;
        return Number(((part / total) * 100).toFixed(1));
    }

    // Dimensional classification of "Không đạt" volume into the two categories the
    // existing data can support (delayed cash handover vs. everything else). This is
    // NOT root-cause analysis — no reason/cause field exists in fact_f13.
    _resolvePrimaryViolationReason(totalFailed, delayedCashCount) {
        if (!totalFailed || totalFailed <= 0) return null;
        const otherFailed = Math.max(0, totalFailed - delayedCashCount);
        if (delayedCashCount > otherFailed) return 'Chậm nộp tiền';
        return 'Không đạt khác (chưa phân loại nguyên nhân)';
    }

    _isIsoDate(value) {
        if (typeof value !== 'string') return false;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        const date = new Date(`${value}T00:00:00Z`);
        return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }

    _normalizeDailyTrendRow(row) {
        return {
            date: row.date,
            total_volume: Number(row.total_volume || 0),
            passed: Number(row.passed || 0),
            failed: Number(row.failed || 0),
            quality_rate: row.quality_rate === null || row.quality_rate === undefined ? null : Number(row.quality_rate),
            data_available: Number(row.data_available || 0) === 1
        };
    }

    _shiftDate(dateStr, deltaDays) {
        const date = new Date(dateStr);
        date.setDate(date.getDate() + deltaDays);
        return date.toISOString().split('T')[0];
    }

    _getMonthStart(dateStr) {
        return `${dateStr.slice(0, 7)}-01`;
    }

    _getPreviousMonthComparablePeriod(dateStr) {
        const date = new Date(`${dateStr}T00:00:00.000Z`);
        const previousMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
        const previousMonthLastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 0)).getUTCDate();
        const comparableDay = Math.min(date.getUTCDate(), previousMonthLastDay);
        const start = previousMonth.toISOString().slice(0, 10);
        const end = new Date(Date.UTC(previousMonth.getUTCFullYear(), previousMonth.getUTCMonth(), comparableDay)).toISOString().slice(0, 10);
        return { start, end };
    }

    _calculateNullableRateDelta(currentPassed, currentTotal, previousPassed, previousTotal) {
        if (!currentTotal || !previousTotal) return null;
        return Number((this._calculateRate(currentPassed, currentTotal) - this._calculateRate(previousPassed, previousTotal)).toFixed(2));
    }

    _buildComparisonMetric(current, previous) {
        const currentTotal = Number(current?.total_bg || 0);
        const previousTotal = Number(previous?.total_bg || 0);
        const currentPassed = Number(current?.total_passed || 0);
        const previousPassed = Number(previous?.total_passed || 0);

        if (!currentTotal || !previousTotal) {
            return {
                available: false,
                pass_rate: null,
                total_volume: null
            };
        }

        const currentRate = this._calculateRate(currentPassed, currentTotal);
        const previousRate = this._calculateRate(previousPassed, previousTotal);

        return {
            available: true,
            pass_rate: {
                current: currentRate,
                previous: previousRate,
                delta: Number((currentRate - previousRate).toFixed(2))
            },
            total_volume: {
                current: currentTotal,
                previous: previousTotal,
                delta: currentTotal - previousTotal
            }
        };
    }

    async _getDashboardComparisons(date, normalizedBcvh) {
        const current = await factBuuGuiRepo.getKpiMetrics(date, date, { bcvhId: normalizedBcvh });
        const previousDay = this._shiftDate(date, -1);
        const previousWeek = this._shiftDate(date, -7);
        const [d1, d7] = await Promise.all([
            factBuuGuiRepo.getKpiMetrics(previousDay, previousDay, { bcvhId: normalizedBcvh }),
            factBuuGuiRepo.getKpiMetrics(previousWeek, previousWeek, { bcvhId: normalizedBcvh })
        ]);

        const d1Metric = this._buildComparisonMetric(current, d1);
        const d7Metric = this._buildComparisonMetric(current, d7);

        return {
            current_date: date,
            d1: {
                ...d1Metric,
                current_date: date,
                previous_date: previousDay
            },
            d7: {
                ...d7Metric,
                current_date: date,
                previous_date: previousWeek
            }
        };
    }

    _indexByBcvh(rows) {
        return rows.reduce((acc, row) => {
            acc[row.ma_bcvh] = row;
            return acc;
        }, {});
    }

    _buildBcvhRankMap(rows = []) {
        return [...rows]
            .sort((a, b) => {
                const rateDelta = this._calculateRate(Number(b.dat_kpi_2026 || 0), Number(b.sl_bg_ptc || 0))
                    - this._calculateRate(Number(a.dat_kpi_2026 || 0), Number(a.sl_bg_ptc || 0));
                if (rateDelta !== 0) return rateDelta;
                return Number(b.sl_bg_ptc || 0) - Number(a.sl_bg_ptc || 0);
            })
            .reduce((acc, row, index) => {
                acc[row.ma_bcvh] = index + 1;
                return acc;
            }, {});
    }

    _buildComparisonBlock(currentRow, comparisonRow, comparisonRank) {
        const currentVolume = Number(currentRow?.sl_bg_ptc || currentRow?.total_bg || 0);
        const hasComparisonRow = comparisonRow !== undefined && comparisonRow !== null;
        const comparisonVolume = hasComparisonRow ? Number(comparisonRow.sl_bg_ptc || 0) : null;
        const comparisonPassed = hasComparisonRow ? Number(comparisonRow.dat_kpi_2026 || 0) : null;

        return {
            volume: comparisonVolume,
            f1_3_rate: hasComparisonRow
                ? this._calculateRate(comparisonPassed, comparisonVolume)
                : null,
            volume_delta: hasComparisonRow ? currentVolume - comparisonVolume : null,
            comparison_rank: comparisonRank ?? null,
        };
    }

    _buildTotalComparisonBlock(currentTotals, comparisonMetrics, canonicalCount) {
        const currentVolume = Number(currentTotals?.sl_bg_ptc || 0);
        const currentPassed = Number(currentTotals?.dat_kpi_2026 || 0);
        const currentRate = currentVolume > 0 ? this._calculateRate(currentPassed, currentVolume) : null;

        const coverageRows = Array.isArray(comparisonMetrics)
            ? comparisonMetrics.filter((item) => canonicalBcvhCodes.has(String(item?.ma_bcvh || '')))
            : [];
        const coverageCount = coverageRows.length;

        if (coverageCount === 0) {
            return {
                volume: null,
                f1_3_rate: null,
                volume_delta: null,
                rate_delta: null,
                coverage: {
                    available_rows: 0,
                    canonical_total: canonicalCount,
                    is_partial: false,
                    is_complete: false,
                },
            };
        }

        const isComplete = coverageCount === canonicalCount;
        const comparisonVolume = coverageRows.reduce((sum, item) => sum + Number(item?.sl_bg_ptc || 0), 0);
        const comparisonPassed = coverageRows.reduce((sum, item) => sum + Number(item?.dat_kpi_2026 || 0), 0);
        const comparisonRate = isComplete ? this._calculateRate(comparisonPassed, comparisonVolume) : null;

        return {
            volume: isComplete ? comparisonVolume : null,
            f1_3_rate: comparisonRate,
            volume_delta: isComplete ? currentVolume - comparisonVolume : null,
            rate_delta: isComplete && currentRate !== null ? Number((currentRate - comparisonRate).toFixed(2)) : null,
            coverage: {
                available_rows: coverageCount,
                canonical_total: canonicalCount,
                is_partial: coverageCount > 0 && coverageCount < canonicalCount,
                is_complete: isComplete,
            },
        };
    }

    _buildRankMovement(currentRank, comparisonRank) {
        if (!currentRank || !comparisonRank) {
            return {
                comparison_rank: comparisonRank ?? null,
                delta: null,
                direction: 'unavailable',
            };
        }

        const delta = comparisonRank - currentRank;
        let direction = 'unchanged';
        if (currentRank < comparisonRank) direction = 'improved';
        if (currentRank > comparisonRank) direction = 'declined';

        return {
            comparison_rank: comparisonRank,
            delta,
            direction,
        };
    }

    _buildRouteDistributionMap(facts = []) {
        return facts.reduce((acc, fact) => {
            const maBcvh = fact?.ma_bcvh;
            const maTuyen = String(fact?.ma_tuyen || '').trim();
            if (!maBcvh || !maTuyen) return acc;

            const classification = classifyRoute(maTuyen);
            if (classification.route_scope !== 'hue' || !classification.is_postman_delivery_route) {
                return acc;
            }

            if (!acc[maBcvh]) acc[maBcvh] = {};
            if (!acc[maBcvh][maTuyen]) {
                acc[maBcvh][maTuyen] = {
                    total_bg: 0,
                    dat_kpi_2026: 0,
                };
            }

            acc[maBcvh][maTuyen].total_bg += 1;
            if (fact.danh_gia_2026 === 'Đạt') {
                acc[maBcvh][maTuyen].dat_kpi_2026 += 1;
            }

            return acc;
        }, {});
    }

    _buildRouteDistributionSummary(routeMap = {}) {
        return Object.entries(routeMap).reduce((acc, [maBcvh, routes]) => {
            const routeRows = Object.values(routes);
            const summary = {
                participating_postman_route_count: routeRows.length,
                green_route_count: 0,
                yellow_route_count: 0,
                red_route_count: 0,
                pink_route_count: 0,
            };

            routeRows.forEach((route) => {
                const rate = this._calculateRate(route.dat_kpi_2026, route.total_bg);
                if (rate >= 70) {
                    summary.green_route_count += 1;
                } else if (rate >= 60) {
                    summary.pink_route_count += 1;
                } else if (rate >= 50) {
                    summary.yellow_route_count += 1;
                } else {
                    summary.red_route_count += 1;
                }
            });

            acc[maBcvh] = summary;
            return acc;
        }, {});
    }

    async _getDefaultProvinceCode() {
        const row = await get("SELECT config_value FROM system_config WHERE config_key = 'default_province_code'");
        return row?.config_value || '53';
    }

    async _getNationalRankForDate(dateStr, provinceCode) {
        const rows = await all(`
            SELECT
                ma_tinh_phat,
                ten_tinh_phat,
                sl_bg_ptc,
                tl_ptc_dung_qd_ct
            FROM fact_f13_national
            WHERE ngay_do_kiem = ?
            ORDER BY tl_ptc_dung_qd_ct DESC, sl_bg_ptc DESC
        `, [dateStr]);

        if (!rows.length) return null;

        const index = rows.findIndex(row => row.ma_tinh_phat === provinceCode);
        if (index < 0) return null;

        const province = rows[index];
        return {
            available: true,
            rank: index + 1,
            total: rows.length,
            period: dateStr,
            province_code: province.ma_tinh_phat,
            province_name: province.ten_tinh_phat,
            metric: 'tl_ptc_dung_qd_ct',
            metric_label: 'Tỷ lệ PTC/nộp tiền đúng QĐ theo chỉ tiêu 2026',
            metric_value: Number(province.tl_ptc_dung_qd_ct || 0),
            volume: Number(province.sl_bg_ptc || 0),
            direction: 'desc',
            tie_behavior: 'Thứ tự theo tỷ lệ giảm dần, sau đó theo sản lượng giảm dần; không gộp đồng hạng.'
        };
    }

    async _getNationalRankForRange(startDate, endDate, provinceCode) {
        const rows = await all(`
            SELECT
                ma_tinh_phat,
                ten_tinh_phat,
                SUM(sl_bg_ptc) as sl_bg_ptc,
                SUM(sl_ptc_dung_qd_ct) as sl_ptc_dung_qd_ct
            FROM fact_f13_national
            WHERE ngay_do_kiem BETWEEN ? AND ?
            GROUP BY ma_tinh_phat, ten_tinh_phat
            HAVING SUM(sl_bg_ptc) > 0
            ORDER BY
                (SUM(sl_ptc_dung_qd_ct) * 1.0 / NULLIF(SUM(sl_bg_ptc), 0)) DESC,
                SUM(sl_bg_ptc) DESC
        `, [startDate, endDate]);

        if (!rows.length) return null;

        const index = rows.findIndex(row => row.ma_tinh_phat === provinceCode);
        if (index < 0) return null;

        const province = rows[index];
        const volume = Number(province.sl_bg_ptc || 0);
        const passed = Number(province.sl_ptc_dung_qd_ct || 0);

        return {
            available: true,
            rank: index + 1,
            total: rows.length,
            period: startDate === endDate ? endDate : `${startDate}..${endDate}`,
            period_start: startDate,
            period_end: endDate,
            period_type: startDate === endDate ? 'single_date' : 'selected_range',
            province_code: province.ma_tinh_phat,
            province_name: province.ten_tinh_phat,
            metric: 'tl_ptc_dung_qd_ct',
            metric_label: 'Tỷ lệ PTC/nộp tiền đúng QĐ theo chỉ tiêu 2026',
            metric_value: this._calculateRate(passed, volume),
            volume,
            passed,
            direction: 'desc',
            tie_behavior: 'Thứ tự theo tỷ lệ giảm dần, sau đó theo sản lượng giảm dần; không gộp đồng hạng.'
        };
    }

    _buildUnavailableNationalRank(dateStr, provinceCode, reason = 'missing_date') {
        const message = reason === 'missing_province'
            ? `Chưa có dữ liệu xếp hạng của Huế trong bảng toàn quốc ngày ${dateStr}`
            : `Chưa có dữ liệu xếp hạng toàn quốc cho ngày ${dateStr}`;

        return {
            available: false,
            message,
            province_code: provinceCode,
            period: dateStr,
            period_start: dateStr,
            period_end: dateStr,
            period_type: 'single_date'
        };
    }

    _buildUnavailableMonthlyNationalRank(period, provinceCode, reason = 'missing_month') {
        const label = period?.label || period?.month || 'tháng';
        const message = reason === 'missing_province'
            ? `Chưa có dữ liệu xếp hạng tháng của Huế trong bảng toàn quốc ${label}`
            : `Chưa có dữ liệu xếp hạng tháng ${label}`;

        return {
            available: false,
            message,
            province_code: provinceCode,
            period: period?.month || null,
            period_start: period?.startDate || null,
            period_end: period?.endDate || null,
            period_type: 'month'
        };
    }

    async getNationalRanksForDates(dates = []) {
        const uniqueDates = [...new Set((dates || []).filter((date) => this._isIsoDate(date)))].sort();
        const provinceCode = await this._getDefaultProvinceCode();

        if (!uniqueDates.length) return {};

        const placeholders = uniqueDates.map(() => '?').join(', ');
        const rows = await all(`
            SELECT
                ngay_do_kiem,
                ma_tinh_phat,
                ten_tinh_phat,
                sl_bg_ptc,
                tl_ptc_dung_qd_ct
            FROM fact_f13_national
            WHERE ngay_do_kiem IN (${placeholders})
            ORDER BY ngay_do_kiem ASC, tl_ptc_dung_qd_ct DESC, sl_bg_ptc DESC
        `, uniqueDates);

        const rowsByDate = rows.reduce((acc, row) => {
            if (!acc[row.ngay_do_kiem]) acc[row.ngay_do_kiem] = [];
            acc[row.ngay_do_kiem].push(row);
            return acc;
        }, {});

        return uniqueDates.reduce((acc, dateStr) => {
            const dateRows = rowsByDate[dateStr] || [];
            if (!dateRows.length) {
                acc[dateStr] = this._buildUnavailableNationalRank(dateStr, provinceCode, 'missing_date');
                return acc;
            }

            const index = dateRows.findIndex((row) => row.ma_tinh_phat === provinceCode);
            if (index < 0) {
                acc[dateStr] = this._buildUnavailableNationalRank(dateStr, provinceCode, 'missing_province');
                return acc;
            }

            const province = dateRows[index];
            acc[dateStr] = {
                available: true,
                rank: index + 1,
                total: dateRows.length,
                period: dateStr,
                period_start: dateStr,
                period_end: dateStr,
                period_type: 'single_date',
                province_code: province.ma_tinh_phat,
                province_name: province.ten_tinh_phat,
                metric: 'tl_ptc_dung_qd_ct',
                metric_label: 'Tỷ lệ PTC/nộp tiền đúng QĐ theo chỉ tiêu 2026',
                metric_value: Number(province.tl_ptc_dung_qd_ct || 0),
                volume: Number(province.sl_bg_ptc || 0),
                direction: 'desc',
                tie_behavior: 'Thứ tự theo tỷ lệ giảm dần, sau đó theo sản lượng giảm dần; không gộp đồng hạng.'
            };
            return acc;
        }, {});
    }

    _applyMonthlyRankMovements(normalizedPeriods = [], ranksByMonth = {}) {
        let previousRank = null;
        for (const period of normalizedPeriods) {
            const rank = ranksByMonth[period.month];
            if (!rank?.available) {
                if (rank) rank.movement = null;
                previousRank = null;
                continue;
            }

            if (previousRank?.available) {
                const delta = previousRank.rank - rank.rank;
                rank.previous_period = previousRank.period;
                rank.previous_rank = previousRank.rank;
                rank.movement = delta;
                rank.movement_label = delta > 0
                    ? `↑ ${delta} hạng`
                    : delta < 0
                        ? `↓ ${Math.abs(delta)} hạng`
                        : 'Không đổi';
            } else {
                rank.previous_period = null;
                rank.previous_rank = null;
                rank.movement = null;
                rank.movement_label = null;
            }
            previousRank = rank;
        }

        return ranksByMonth;
    }

    async getNationalRanksForPeriods(periods = []) {
        const normalizedPeriods = (periods || [])
            .filter((period) => period?.month && this._isIsoDate(period.startDate) && this._isIsoDate(period.endDate) && period.startDate <= period.endDate)
            .sort((a, b) => a.startDate.localeCompare(b.startDate));
        const provinceCode = await this._getDefaultProvinceCode();

        if (!normalizedPeriods.length) return {};

        const minStart = normalizedPeriods[0].startDate;
        const maxEnd = normalizedPeriods.reduce((result, period) => period.endDate > result ? period.endDate : result, normalizedPeriods[0].endDate);
        const rows = await all(`
            SELECT
                ngay_do_kiem,
                ma_tinh_phat,
                ten_tinh_phat,
                sl_bg_ptc,
                sl_ptc_dung_qd_ct
            FROM fact_f13_national
            WHERE ngay_do_kiem BETWEEN ? AND ?
            ORDER BY ngay_do_kiem ASC
        `, [minStart, maxEnd]);

        const ranksByMonth = normalizedPeriods.reduce((acc, period) => {
            const periodRows = rows.filter((row) => row.ngay_do_kiem >= period.startDate && row.ngay_do_kiem <= period.endDate);
            if (!periodRows.length) {
                acc[period.month] = this._buildUnavailableMonthlyNationalRank(period, provinceCode, 'missing_month');
                return acc;
            }

            const provinceTotals = periodRows.reduce((totals, row) => {
                if (!totals[row.ma_tinh_phat]) {
                    totals[row.ma_tinh_phat] = {
                        ma_tinh_phat: row.ma_tinh_phat,
                        ten_tinh_phat: row.ten_tinh_phat,
                        sl_bg_ptc: 0,
                        sl_ptc_dung_qd_ct: 0
                    };
                }
                totals[row.ma_tinh_phat].sl_bg_ptc += Number(row.sl_bg_ptc || 0);
                totals[row.ma_tinh_phat].sl_ptc_dung_qd_ct += Number(row.sl_ptc_dung_qd_ct || 0);
                return totals;
            }, {});

            const ranked = Object.values(provinceTotals)
                .filter((row) => row.sl_bg_ptc > 0)
                .sort((a, b) => {
                    const rateDelta = (b.sl_ptc_dung_qd_ct / b.sl_bg_ptc) - (a.sl_ptc_dung_qd_ct / a.sl_bg_ptc);
                    if (rateDelta !== 0) return rateDelta;
                    return b.sl_bg_ptc - a.sl_bg_ptc;
                });

            if (!ranked.length) {
                acc[period.month] = this._buildUnavailableMonthlyNationalRank(period, provinceCode, 'missing_month');
                return acc;
            }

            const index = ranked.findIndex((row) => row.ma_tinh_phat === provinceCode);
            if (index < 0) {
                acc[period.month] = this._buildUnavailableMonthlyNationalRank(period, provinceCode, 'missing_province');
                return acc;
            }

            const province = ranked[index];
            acc[period.month] = {
                available: true,
                rank: index + 1,
                total: ranked.length,
                period: period.month,
                period_start: period.startDate,
                period_end: period.endDate,
                period_type: 'month',
                province_code: province.ma_tinh_phat,
                province_name: province.ten_tinh_phat,
                metric: 'tl_ptc_dung_qd_ct',
                metric_label: 'Tỷ lệ PTC/nộp tiền đúng QĐ theo chỉ tiêu 2026',
                metric_value: this._calculateRate(province.sl_ptc_dung_qd_ct, province.sl_bg_ptc),
                volume: province.sl_bg_ptc,
                passed: province.sl_ptc_dung_qd_ct,
                direction: 'desc',
                tie_behavior: 'Thứ tự theo tỷ lệ giảm dần, sau đó theo sản lượng giảm dần; không gộp đồng hạng.'
            };
            return acc;
        }, {});

        return this._applyMonthlyRankMovements(normalizedPeriods, ranksByMonth);
    }

    async _getNationalRankSummary(startDate, endDate) {
        const provinceCode = await this._getDefaultProvinceCode();

        if (!this._isIsoDate(startDate) || !this._isIsoDate(endDate) || startDate > endDate) {
            return {
                available: false,
                message: 'Chưa có dữ liệu xếp hạng toàn quốc',
                province_code: provinceCode,
                requested_period: endDate,
                requested_period_start: startDate,
                requested_period_end: endDate
            };
        }

        const current = startDate === endDate
            ? await this._getNationalRankForDate(endDate, provinceCode)
            : await this._getNationalRankForRange(startDate, endDate, provinceCode);
        if (!current) {
            return {
                available: false,
                message: 'Chưa có dữ liệu xếp hạng toàn quốc',
                province_code: provinceCode,
                requested_period: endDate,
                requested_period_start: startDate,
                requested_period_end: endDate
            };
        }

        const previousRow = await get(`
            SELECT MAX(ngay_do_kiem) as period
            FROM fact_f13_national
            WHERE ngay_do_kiem < ?
        `, [startDate === endDate ? endDate : startDate]);
        const previous = previousRow?.period
            ? await this._getNationalRankForDate(previousRow.period, provinceCode)
            : null;

        return {
            ...current,
            requested_period: endDate,
            requested_period_start: startDate,
            requested_period_end: endDate,
            previous_period: previous?.period || null,
            previous_rank: previous?.rank || null,
            movement: previous ? previous.rank - current.rank : null
        };
    }

    _buildF13302SummaryMap(facts = [], groupKey = 'ma_bcvh') {
        if (!ruleRegistry.rules.some(rule => rule?.id === 'RULE_F13_302')) {
            ruleRegistry.register(new RuleF13302());
        }
        const delayedCashRule = ruleRegistry.rules.find((rule) => rule?.id === 'RULE_F13_302');

        const grouped = new Map();

        for (const fact of facts) {
            const key = fact?.[groupKey];
            if (!key) continue;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key).push(fact);
        }

        const rateMap = {};
        const summaryMap = {};
        for (const [key, items] of grouped.entries()) {
            const result = ruleRegistry.execute(items);
            rateMap[key] = result.f13_303_rate ?? 0;
            summaryMap[key] = {
                delayed_cash_handover_count: delayedCashRule
                    ? items.filter((fact) => delayedCashRule.evaluate(fact)).length
                    : 0,
                delayed_cash_handover_eligible_count: result.total_failed ?? 0,
                delayed_cash_handover_rate: result.f13_303_rate ?? 0,
            };
        }

        return {
            rateMap,
            summaryMap,
        };
    }

    _buildF13302AggregateSummary(facts = []) {
        if (!ruleRegistry.rules.some(rule => rule?.id === 'RULE_F13_302')) {
            ruleRegistry.register(new RuleF13302());
        }
        const delayedCashRule = ruleRegistry.rules.find((rule) => rule?.id === 'RULE_F13_302');
        const result = ruleRegistry.execute(facts);

        return {
            delayed_cash_handover_count: result.total_late_payment ?? 0,
            delayed_cash_handover_eligible_count: result.total_failed ?? 0,
            f13_303_rate: result.f13_303_rate ?? 0,
            delayed_cash_handover_rate: result.f13_303_rate ?? 0,
            has_authoritative_denominator: true,
            delayed_condition_rule_id: delayedCashRule?.id ?? null,
        };
    }

    _buildF13302RateMap(facts) {
        return this._buildF13302SummaryMap(facts).rateMap;
    }

    async getDashboardKpi(startDate, endDate, filters = {}) {
        try {
            const normalizedBcvh = normalizeDashboardBcvhCode(filters.bcvhId);
            if (normalizedBcvh === undefined) {
                const err = new Error('Mã BCVH không hợp lệ.');
                err.code = 'INVALID_BCVH';
                throw err;
            }

            const result = await factBuuGuiRepo.getKpiMetrics(startDate, endDate, {
                bcvhId: normalizedBcvh
            });
            const nationalRank = normalizedBcvh ? null : await this._getNationalRankSummary(startDate, endDate);
            const comparisons = await this._getDashboardComparisons(endDate, normalizedBcvh);

            if (!result || result.total_bg === 0) {
                return {
                    total_bg: 0,
                    total_passed: 0,
                    total_failed: 0,
                    total_unknown: 0,
                    passed_rate: 0,
                    failed_rate: 0,
                    national_rank: nationalRank,
                    comparisons
                };
            }
            
            const passed_rate = this._calculateRate(result.total_passed, result.total_bg);
            const failed_rate = this._calculateRate(result.total_failed, result.total_bg);
            const total_unknown = Math.max(
                0,
                Number(result.total_bg || 0) - Number(result.total_passed || 0) - Number(result.total_failed || 0)
            );

            return {
                total_bg: result.total_bg,
                total_passed: result.total_passed || 0,
                total_failed: result.total_failed || 0,
                total_unknown,
                passed_rate,
                failed_rate,
                national_rank: nationalRank,
                comparisons,
            };
        } catch (error) {
            if (error?.code === 'INVALID_BCVH') throw error;
            throw new Error(`Lỗi Service khi lấy Dashboard KPI: ${error.message}`);
        }
    }

    async getBcvhRanking(date, page, pageSize, sort, order) {
        try {
            const monthStart = this._getMonthStart(date);
            const currentMetrics = await factBuuGuiRepo.getBcvhOperationMetricsByDate(date);
            const selectedDateHasData = currentMetrics.length > 0;
            const monthToDateCutoff = selectedDateHasData ? date : null;
            const effectiveDate = date;
            const previousMonthPeriod = this._getPreviousMonthComparablePeriod(effectiveDate);
            const result = await factBuuGuiRepo.getBcvhRanking(effectiveDate, page, pageSize, sort, order);
            const yesterdayStr = this._shiftDate(effectiveDate, -1);
            const swcStr = this._shiftDate(effectiveDate, -7);
            const currentFacts = await factBuuGuiRepo.getFactByDate(effectiveDate);

            const [yesterdayMetrics, swcMetrics, monthToDateMetrics, previousMonthToDateMetrics] = await Promise.all([
                factBuuGuiRepo.getBcvhOperationMetricsByDate(yesterdayStr),
                factBuuGuiRepo.getBcvhOperationMetricsByDate(swcStr),
                monthToDateCutoff
                    ? factBuuGuiRepo.getBcvhOperationMetricsBetween(monthStart, monthToDateCutoff)
                    : Promise.resolve([]),
                monthToDateCutoff
                    ? factBuuGuiRepo.getBcvhOperationMetricsBetween(previousMonthPeriod.start, previousMonthPeriod.end)
                    : Promise.resolve([])
            ]);

            const currentMap = this._indexByBcvh(currentMetrics);
            const yesterdayMap = this._indexByBcvh(yesterdayMetrics);
            const swcMap = this._indexByBcvh(swcMetrics);
            const monthToDateMap = this._indexByBcvh(monthToDateMetrics);
            const previousMonthToDateMap = this._indexByBcvh(previousMonthToDateMetrics);
            const yesterdayRankMap = this._buildBcvhRankMap(yesterdayMetrics);
            const swcRankMap = this._buildBcvhRankMap(swcMetrics);
            const { rateMap: f13302RateMap, summaryMap: f13302SummaryMap } = this._buildF13302SummaryMap(currentFacts);
            const canonicalCurrentFacts = currentFacts.filter((fact) => canonicalBcvhCodes.has(String(fact?.ma_bcvh || '')));
            const f13302TotalSummary = this._buildF13302AggregateSummary(canonicalCurrentFacts);
            const routeDistributionSummaryMap = this._buildRouteDistributionSummary(
                this._buildRouteDistributionMap(currentFacts)
            );
            
            const mappedData = result.data.map(item => ({
                ...(currentMap[item.ma_bcvh] || {}),
                ma_bcvh: item.ma_bcvh,
                ten_bcvh: item.ten_bcvh,
                total_bg: item.total_bg,
                passed_rate: this._calculateRate(item.total_passed, item.total_bg),
                total_failed: item.total_failed,
                sl_bg_ptc: currentMap[item.ma_bcvh]?.sl_bg_ptc ?? item.total_bg,
                sl_ptc_nop_tien: currentMap[item.ma_bcvh]?.sl_ptc_nop_tien ?? 0,
                dat_kpi_2026: currentMap[item.ma_bcvh]?.dat_kpi_2026 ?? 0,
                khong_dat_kpi_2026: currentMap[item.ma_bcvh]?.khong_dat_kpi_2026 ?? 0,
                kpi_2026: this._calculateRate(
                    currentMap[item.ma_bcvh]?.dat_kpi_2026 ?? 0,
                    currentMap[item.ma_bcvh]?.sl_bg_ptc ?? item.total_bg
                ),
                kpi_2026_dod: this._calculateNullableRateDelta(
                    currentMap[item.ma_bcvh]?.dat_kpi_2026 ?? 0,
                    currentMap[item.ma_bcvh]?.sl_bg_ptc ?? item.total_bg,
                    yesterdayMap[item.ma_bcvh]?.dat_kpi_2026 ?? 0,
                    yesterdayMap[item.ma_bcvh]?.sl_bg_ptc ?? 0
                ),
                kpi_2026_swc: this._calculateNullableRateDelta(
                    currentMap[item.ma_bcvh]?.dat_kpi_2026 ?? 0,
                    currentMap[item.ma_bcvh]?.sl_bg_ptc ?? item.total_bg,
                    swcMap[item.ma_bcvh]?.dat_kpi_2026 ?? 0,
                    swcMap[item.ma_bcvh]?.sl_bg_ptc ?? 0
                ),
                month_to_date_sl_bg_ptc: monthToDateMap[item.ma_bcvh]?.sl_bg_ptc ?? null,
                month_to_date_dat_kpi_2026: monthToDateMap[item.ma_bcvh]?.dat_kpi_2026 ?? null,
                month_to_date_khong_dat_kpi_2026: monthToDateMap[item.ma_bcvh]?.khong_dat_kpi_2026 ?? null,
                month_to_date_kpi_2026: monthToDateMap[item.ma_bcvh]
                    ? this._calculateRate(monthToDateMap[item.ma_bcvh].dat_kpi_2026, monthToDateMap[item.ma_bcvh].sl_bg_ptc)
                    : null,
                previous_month_to_date_sl_bg_ptc: previousMonthToDateMap[item.ma_bcvh]?.sl_bg_ptc ?? null,
                previous_month_to_date_dat_kpi_2026: previousMonthToDateMap[item.ma_bcvh]?.dat_kpi_2026 ?? null,
                previous_month_to_date_kpi_2026: previousMonthToDateMap[item.ma_bcvh]
                    ? this._calculateRate(previousMonthToDateMap[item.ma_bcvh].dat_kpi_2026, previousMonthToDateMap[item.ma_bcvh].sl_bg_ptc)
                    : null,
                f13_303_rate: f13302RateMap[item.ma_bcvh] ?? 0,
                delayed_cash_handover_count: f13302SummaryMap[item.ma_bcvh]?.delayed_cash_handover_count ?? 0,
                route_distribution: {
                    participating_postman_route_count: routeDistributionSummaryMap[item.ma_bcvh]?.participating_postman_route_count ?? 0,
                    green_route_count: routeDistributionSummaryMap[item.ma_bcvh]?.green_route_count ?? 0,
                    yellow_route_count: routeDistributionSummaryMap[item.ma_bcvh]?.yellow_route_count ?? 0,
                    red_route_count: routeDistributionSummaryMap[item.ma_bcvh]?.red_route_count ?? 0,
                    pink_route_count: routeDistributionSummaryMap[item.ma_bcvh]?.pink_route_count ?? 0,
                },
                comparisons: {
                    d1: {
                        ...this._buildComparisonBlock(currentMap[item.ma_bcvh] || item, yesterdayMap[item.ma_bcvh], yesterdayRankMap[item.ma_bcvh]),
                        rank_movement: this._buildRankMovement(item.rank, yesterdayRankMap[item.ma_bcvh]),
                    },
                    d7: {
                        ...this._buildComparisonBlock(currentMap[item.ma_bcvh] || item, swcMap[item.ma_bcvh], swcRankMap[item.ma_bcvh]),
                        rank_movement: this._buildRankMovement(item.rank, swcRankMap[item.ma_bcvh]),
                    },
                },
                rank: item.rank
            }));

            const totalRow = mappedData.reduce((acc, item) => {
                acc.sl_bg_ptc += item.sl_bg_ptc || 0;
                acc.sl_ptc_nop_tien += item.sl_ptc_nop_tien || 0;
                acc.dat_kpi_2026 += item.dat_kpi_2026 || 0;
                acc.khong_dat_kpi_2026 += item.khong_dat_kpi_2026 || 0;
                acc.delayed_cash_handover_count += item.delayed_cash_handover_count || 0;
                acc.route_distribution.participating_postman_route_count += item.route_distribution?.participating_postman_route_count || 0;
                acc.route_distribution.green_route_count += item.route_distribution?.green_route_count || 0;
                acc.route_distribution.yellow_route_count += item.route_distribution?.yellow_route_count || 0;
                acc.route_distribution.red_route_count += item.route_distribution?.red_route_count || 0;
                acc.route_distribution.pink_route_count += item.route_distribution?.pink_route_count || 0;
                acc.month_to_date_sl_bg_ptc += item.month_to_date_sl_bg_ptc || 0;
                acc.month_to_date_dat_kpi_2026 += item.month_to_date_dat_kpi_2026 || 0;
                acc.month_to_date_khong_dat_kpi_2026 += item.month_to_date_khong_dat_kpi_2026 || 0;
                acc.previous_month_to_date_sl_bg_ptc += item.previous_month_to_date_sl_bg_ptc || 0;
                acc.previous_month_to_date_dat_kpi_2026 += item.previous_month_to_date_dat_kpi_2026 || 0;
                return acc;
            }, {
                ten_bcvh: 'TỔNG CỘNG',
                sl_bg_ptc: 0,
                sl_ptc_nop_tien: 0,
                dat_kpi_2026: 0,
                khong_dat_kpi_2026: 0,
                delayed_cash_handover_count: 0,
                route_distribution: {
                    participating_postman_route_count: 0,
                    green_route_count: 0,
                    yellow_route_count: 0,
                    red_route_count: 0,
                    pink_route_count: 0,
                },
                month_to_date_sl_bg_ptc: 0,
                month_to_date_dat_kpi_2026: 0,
                month_to_date_khong_dat_kpi_2026: 0,
                previous_month_to_date_sl_bg_ptc: 0,
                previous_month_to_date_dat_kpi_2026: 0
            });

            const totalMonthToDate = monthToDateMetrics.reduce((acc, item) => {
                acc.sl_bg_ptc += item.sl_bg_ptc || 0;
                acc.dat_kpi_2026 += item.dat_kpi_2026 || 0;
                acc.khong_dat_kpi_2026 += item.khong_dat_kpi_2026 || 0;
                return acc;
            }, { sl_bg_ptc: 0, dat_kpi_2026: 0, khong_dat_kpi_2026: 0 });

            const totalCurrent = currentMetrics.reduce((acc, item) => {
                acc.sl_bg_ptc += item.sl_bg_ptc || 0;
                acc.sl_ptc_nop_tien += item.sl_ptc_nop_tien || 0;
                acc.dat_kpi_2026 += item.dat_kpi_2026 || 0;
                acc.khong_dat_kpi_2026 += item.khong_dat_kpi_2026 || 0;
                return acc;
            }, { sl_bg_ptc: 0, sl_ptc_nop_tien: 0, dat_kpi_2026: 0, khong_dat_kpi_2026: 0 });

            const totalPreviousMonthToDate = previousMonthToDateMetrics.reduce((acc, item) => {
                acc.sl_bg_ptc += item.sl_bg_ptc || 0;
                acc.dat_kpi_2026 += item.dat_kpi_2026 || 0;
                return acc;
            }, { sl_bg_ptc: 0, dat_kpi_2026: 0 });

            totalRow.sl_bg_ptc = totalCurrent.sl_bg_ptc;
            totalRow.sl_ptc_nop_tien = totalCurrent.sl_ptc_nop_tien;
            totalRow.dat_kpi_2026 = totalCurrent.dat_kpi_2026;
            totalRow.khong_dat_kpi_2026 = totalCurrent.khong_dat_kpi_2026;
            totalRow.delayed_cash_handover_count = f13302TotalSummary.delayed_cash_handover_count;
            totalRow.delayed_cash_handover_eligible_count = f13302TotalSummary.delayed_cash_handover_eligible_count;
            totalRow.f13_303_rate = f13302TotalSummary.f13_303_rate;
            totalRow.kpi_2026 = this._calculateRate(totalCurrent.dat_kpi_2026, totalCurrent.sl_bg_ptc);
            totalRow.month_to_date_sl_bg_ptc = monthToDateCutoff ? totalMonthToDate.sl_bg_ptc : null;
            totalRow.month_to_date_dat_kpi_2026 = monthToDateCutoff ? totalMonthToDate.dat_kpi_2026 : null;
            totalRow.month_to_date_khong_dat_kpi_2026 = monthToDateCutoff ? totalMonthToDate.khong_dat_kpi_2026 : null;
            totalRow.month_to_date_kpi_2026 = monthToDateCutoff
                ? this._calculateRate(totalMonthToDate.dat_kpi_2026, totalMonthToDate.sl_bg_ptc)
                : null;
            totalRow.previous_month_to_date_sl_bg_ptc = monthToDateCutoff ? totalPreviousMonthToDate.sl_bg_ptc : null;
            totalRow.previous_month_to_date_dat_kpi_2026 = monthToDateCutoff ? totalPreviousMonthToDate.dat_kpi_2026 : null;
            totalRow.previous_month_to_date_kpi_2026 = monthToDateCutoff
                ? this._calculateRate(totalPreviousMonthToDate.dat_kpi_2026, totalPreviousMonthToDate.sl_bg_ptc)
                : null;

            const totalYesterday = yesterdayMetrics.reduce((acc, item) => {
                acc.sl_bg_ptc += item.sl_bg_ptc || 0;
                acc.dat_kpi_2026 += item.dat_kpi_2026 || 0;
                return acc;
            }, { sl_bg_ptc: 0, dat_kpi_2026: 0 });

            const totalSwc = swcMetrics.reduce((acc, item) => {
                acc.sl_bg_ptc += item.sl_bg_ptc || 0;
                acc.dat_kpi_2026 += item.dat_kpi_2026 || 0;
                return acc;
            }, { sl_bg_ptc: 0, dat_kpi_2026: 0 });

            const canonicalCurrentCount = currentMetrics.filter((item) => canonicalBcvhCodes.has(String(item?.ma_bcvh || ''))).length;
            totalRow.comparisons = {
                d1: this._buildTotalComparisonBlock(totalCurrent, yesterdayMetrics, canonicalCurrentCount),
                d7: this._buildTotalComparisonBlock(totalCurrent, swcMetrics, canonicalCurrentCount),
            };

            totalRow.kpi_2026_dod = this._calculateNullableRateDelta(
                totalCurrent.dat_kpi_2026,
                totalCurrent.sl_bg_ptc,
                totalYesterday.dat_kpi_2026,
                totalYesterday.sl_bg_ptc
            );
            totalRow.kpi_2026_swc = this._calculateNullableRateDelta(
                totalCurrent.dat_kpi_2026,
                totalCurrent.sl_bg_ptc,
                totalSwc.dat_kpi_2026,
                totalSwc.sl_bg_ptc
            );

            return {
                data: mappedData,
                meta: {
                    total_row: totalRow,
                    month_to_date: {
                        from_date: monthStart,
                        to_date: monthToDateCutoff,
                        requested_to_date: date,
                        current_data_date: effectiveDate,
                        used_latest_available: Boolean(monthToDateCutoff && monthToDateCutoff !== date),
                        available: Boolean(monthToDateCutoff)
                    },
                    previous_month_to_date: {
                        from_date: monthToDateCutoff ? previousMonthPeriod.start : null,
                        to_date: monthToDateCutoff ? previousMonthPeriod.end : null,
                        available: Boolean(monthToDateCutoff && previousMonthToDateMetrics.length)
                    },
                    evaluation_date: {
                        date: effectiveDate,
                        requested_to_date: date,
                        used_latest_available: Boolean(monthToDateCutoff && monthToDateCutoff !== date),
                        available: Boolean(monthToDateCutoff)
                    },
                    pagination: {
                        page,
                        page_size: pageSize,
                        total_items: result.totalItems,
                        total_pages: Math.ceil(result.totalItems / pageSize)
                    }
                }
            };
        } catch (error) {
            throw new Error(`Lỗi Service khi lấy Ranking BCVH: ${error.message}`);
        }
    }

    async getRouteRanking(date, bcvh, page, pageSize, sort, order, options = {}) {
        try {
            const routeType = options.routeType === 'all' ? 'all' : 'postman';
            const confirmedNonPostmanRouteCodes = CONFIRMED_NON_POSTMAN_ROUTES.map((route) => route.ma_tuyen);
            const result = await factBuuGuiRepo.getRouteRanking(date, bcvh, page, pageSize, sort, order, {
                routeType,
                confirmedNonPostmanRouteCodes,
            });

            const routeFacts = await factBuuGuiRepo.getRouteRankingFacts(date, bcvh, {
                routeType,
                confirmedNonPostmanRouteCodes,
            });
            // RuleF13302/RuleRegistry themselves already restrict F13_303's denominator and
            // numerator to "Không đạt" only (Đạt and Chuyển hoàn/BLACK are bypassed inside the
            // shared engine), so the full unfiltered fact set is passed through as-is — same
            // as BCVH Ranking's own call sites.
            const { summaryMap: delayedCashByRoute } = this._buildF13302SummaryMap(routeFacts, 'ma_tuyen');
            const delayedCashAggregate = this._buildF13302AggregateSummary(routeFacts);

            const mappedData = result.data.map(item => {
                const delayedCashCount = delayedCashByRoute[item.ma_tuyen]?.delayed_cash_handover_count ?? 0;
                return {
                date: date,
                ma_bcvh: bcvh,
                ten_bcvh: item.ten_bcvh,
                ma_tuyen: item.ma_tuyen,
                id: item.ma_tuyen,
                code: item.ma_tuyen,
                ten_tuyen: item.ten_tuyen,
                name: item.ten_tuyen || item.ma_tuyen,
                // No courier/postman field exists anywhere in fact_f13 (confirmed by database
                // audit, F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT MD-02/OPP-16) — reported as an
                // explicit unavailable value rather than fabricated.
                buu_ta: null,
                total_bg: item.total_bg,
                passed: item.total_passed,
                passed_rate: this._calculateRate(item.total_passed, item.total_bg),
                total_failed: item.total_failed,
                failed: item.total_failed,
                returned: item.total_returned ?? 0,
                ...classifyRoute(item.ma_tuyen),
                delayed_cash_handover_count: delayedCashCount,
                delayed_cash_handover_eligible_count: delayedCashByRoute[item.ma_tuyen]?.delayed_cash_handover_eligible_count ?? 0,
                f13_303_rate: delayedCashByRoute[item.ma_tuyen]?.delayed_cash_handover_rate ?? 0,
                // Dimensional classification only — NOT root-cause analysis (no reason/cause
                // field exists in fact_f13; F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT MD-03/OPP-17).
                // Groups "Không đạt" volume into the two categories the data can actually support.
                primary_violation_reason: this._resolvePrimaryViolationReason(item.total_failed, delayedCashCount),
                violation_breakdown: {
                    delayed_cash_handover_count: delayedCashCount,
                    other_failed_count: Math.max(0, item.total_failed - delayedCashCount),
                },
                };
            });

            return {
                data: mappedData,
                meta: {
                    delayed_cash_handover_summary: {
                        delayed_cash_handover_count: delayedCashAggregate.delayed_cash_handover_count,
                        delayed_cash_handover_eligible_count: delayedCashAggregate.delayed_cash_handover_eligible_count,
                        f13_303_rate: delayedCashAggregate.f13_303_rate,
                    },
                    route_filter: {
                        selected: routeType,
                        labels: {
                            postman: 'Tuyến bưu tá',
                            all: 'Tất cả',
                        },
                    },
                    route_scope: {
                        hue_prefix: '53',
                        excluded_non_hue: true,
                    },
                    route_classification: {
                        confirmed_non_postman_route_count: CONFIRMED_NON_POSTMAN_ROUTES.length,
                        participating_postman_route_count: routeType === 'postman'
                            ? result.totalItems
                            : mappedData.filter((item) => item.is_postman_delivery_route).length,
                        confirmed_non_postman_routes: CONFIRMED_NON_POSTMAN_ROUTES,
                    },
                    pagination: {
                        page,
                        page_size: pageSize,
                        total_items: result.totalItems,
                        total_pages: Math.ceil(result.totalItems / pageSize)
                    }
                }
            };
        } catch (error) {
            throw new Error(`Lỗi Service khi lấy Ranking Route: ${error.message}`);
        }
    }

    async getParetoAnalysis(date, bcvh) {
        try {
            const rows = await factBuuGuiRepo.getParetoData(date, bcvh);
            
            let totalFailed = 0;
            rows.forEach(r => totalFailed += r.total_failed);

            let cumulativeFailed = 0;
            const pareto_chart = [];
            const impact_table = [];

            // Duyệt Array do Repository trả về, tính toán % Tích lũy (Cumulative Pct)
            rows.forEach(r => {
                cumulativeFailed += r.total_failed;
                const cumulative_pct = this._calculateRate(cumulativeFailed, totalFailed);
                const impact_pct = this._calculateRate(r.total_failed, totalFailed);

                pareto_chart.push({
                    ten_tuyen: r.ten_tuyen || r.ma_tuyen,
                    bg_cham_nop_tien: r.total_failed, // Tại D3 tạm map tổng lỗi, sang D4 Rule Engine sẽ filter đúng chuẩn
                    cumulative_pct
                });

                impact_table.push({
                    ten_tuyen: r.ten_tuyen || r.ma_tuyen,
                    total_failed: r.total_failed,
                    bg_cham_nop_tien: r.total_failed,
                    impact_pct
                });
            });

            return { pareto_chart, impact_table };
        } catch (error) {
            throw new Error(`Lỗi Service khi phân tích Pareto: ${error.message}`);
        }
    }

    async getEvidenceList(date, bcvh, route, page, pageSize) {
        try {
            const result = await factBuuGuiRepo.getEvidenceList(date, bcvh, route, page, pageSize);
            
            const mappedData = result.data.map(item => {
                // Khối tính độ trễ này thuộc phạm vi trình bày số liệu cơ bản,
                // Rule xác định > 3h mới là nhiệm vụ của Engine.
                // A missing or unparseable timestamp must report null (unavailable),
                // never a fabricated "0 hours delay".
                let do_tre_gio = null;
                const ptc = parseF13Timestamp(item.thoi_gian_ptc);
                const nop = parseF13Timestamp(item.thoi_gian_nop_tien);
                if (ptc && nop) {
                    do_tre_gio = Number(((nop - ptc) / (1000 * 60 * 60)).toFixed(2));
                }

                return {
                    ma_bg: item.ma_bg,
                    thoi_gian_ptc: item.thoi_gian_ptc,
                    thoi_gian_nop_tien: item.thoi_gian_nop_tien,
                    danh_gia_2026: item.danh_gia_2026,
                    do_tre_gio
                };
            });

            return {
                data: mappedData,
                meta: {
                    pagination: {
                        page,
                        page_size: pageSize,
                        total_items: result.totalItems,
                        total_pages: Math.ceil(result.totalItems / pageSize)
                    }
                }
            };
        } catch (error) {
            throw new Error(`Lỗi Service khi lấy Evidence List: ${error.message}`);
        }
    }

    async getDailyTrend(fromDate, toDate, filters = {}) {
        if (!this._isIsoDate(fromDate) || !this._isIsoDate(toDate)) {
            const err = new Error('from_date and to_date must be valid ISO dates in YYYY-MM-DD format');
            err.code = 'INVALID_DATE';
            throw err;
        }

        if (fromDate > toDate) {
            const err = new Error('from_date must be less than or equal to to_date');
            err.code = 'INVALID_RANGE';
            throw err;
        }

        const latestImport = await factBuuGuiRepo.getLatestImportMeta();
        const rows = await factBuuGuiRepo.getDailyTrendData(fromDate, toDate, {
            bcvhId: filters.bcvhId || null
        });

        const normalizedBcvh = normalizeDashboardBcvhCode(filters.bcvhId);
        const suppressNationalRank = Boolean(filters.bcvhId && filters.bcvhId !== 'all');
        const items = rows.map((row) => this._normalizeDailyTrendRow(row));
        const nationalRanksByDate = suppressNationalRank ? {} : await this.getNationalRanksForDates(
            items.filter((item) => item.data_available).map((item) => item.date)
        );
        const enrichedItems = suppressNationalRank ? items : items.map((item) => ({
            ...item,
            national_rank: item.data_available ? nationalRanksByDate[item.date] || this._buildUnavailableNationalRank(item.date, null) : null
        }));

        return {
            meta: {
                from_date: fromDate,
                to_date: toDate,
                interval: 'daily',
                record_count: enrichedItems.length,
                latest_import: latestImport?.ngay_do_kiem || null,
                data_freshness: latestImport?.created_at || null,
                filters: {
                    bcvh_id: normalizedBcvh || null
                }
            },
            items: enrichedItems
        };
    }
}

module.exports = new F13DashboardService();
