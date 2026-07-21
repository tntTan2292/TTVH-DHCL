const factBuuGuiRepo = require('../repositories/FactBuuGuiRepository');
const ruleRegistry = require('../engine/rules/RuleRegistry');
const RuleF13302 = require('../engine/rules/RuleF13302');
const { CANONICAL_BCVH_UNITS } = require('../config/canonicalBcvhUnits');
const { all, get } = require('../config/db');

const canonicalBcvhCodes = new Set(CANONICAL_BCVH_UNITS.map((unit) => unit.ma_bcvh));

function normalizeDashboardBcvhCode(ma_bcvh) {
    if (ma_bcvh === undefined || ma_bcvh === null || ma_bcvh === '') return null;
    if (ma_bcvh === 'all') return null;
    if (canonicalBcvhCodes.has(ma_bcvh)) return ma_bcvh;
    return undefined;
}

class F13DashboardService {
    
    // Hàm bọc tính toán an toàn (Tránh lỗi Division by Zero)
    _calculateRate(part, total) {
        if (!total || total === 0) return 0;
        return Number(((part / total) * 100).toFixed(1));
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

    _indexByBcvh(rows) {
        return rows.reduce((acc, row) => {
            acc[row.ma_bcvh] = row;
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

    async _getNationalRankSummary(endDate) {
        const provinceCode = await this._getDefaultProvinceCode();
        const latestRow = await get(`
            SELECT MAX(ngay_do_kiem) as period
            FROM fact_f13_national
            WHERE ngay_do_kiem <= ?
        `, [endDate]);

        if (!latestRow?.period) {
            return {
                available: false,
                message: 'Chưa có dữ liệu xếp hạng toàn quốc',
                province_code: provinceCode,
                requested_period: endDate
            };
        }

        const current = await this._getNationalRankForDate(latestRow.period, provinceCode);
        if (!current) {
            return {
                available: false,
                message: 'Chưa có dữ liệu xếp hạng toàn quốc',
                province_code: provinceCode,
                period: latestRow.period,
                requested_period: endDate
            };
        }

        const previousRow = await get(`
            SELECT MAX(ngay_do_kiem) as period
            FROM fact_f13_national
            WHERE ngay_do_kiem < ?
        `, [latestRow.period]);
        const previous = previousRow?.period
            ? await this._getNationalRankForDate(previousRow.period, provinceCode)
            : null;

        return {
            ...current,
            requested_period: endDate,
            previous_period: previous?.period || null,
            previous_rank: previous?.rank || null,
            movement: previous ? previous.rank - current.rank : null
        };
    }

    _buildF13302RateMap(facts) {
        if (!ruleRegistry.rules.some(rule => rule?.id === 'RULE_F13_302')) {
            ruleRegistry.register(new RuleF13302());
        }

        const byBcvh = new Map();

        for (const fact of facts || []) {
            if (!fact?.ma_bcvh) continue;
            if (!byBcvh.has(fact.ma_bcvh)) byBcvh.set(fact.ma_bcvh, []);
            byBcvh.get(fact.ma_bcvh).push(fact);
        }

        const rateMap = {};
        for (const [maBcvh, items] of byBcvh.entries()) {
            const result = ruleRegistry.execute(items);
            rateMap[maBcvh] = result.f13_303_rate ?? 0;
        }

        return rateMap;
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
            const nationalRank = normalizedBcvh ? null : await this._getNationalRankSummary(endDate);

            if (!result || result.total_bg === 0) {
                return {
                    total_bg: 0,
                    total_passed: 0,
                    total_failed: 0,
                    total_unknown: 0,
                    passed_rate: 0,
                    failed_rate: 0,
                    national_rank: nationalRank
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
            };
        } catch (error) {
            if (error?.code === 'INVALID_BCVH') throw error;
            throw new Error(`Lỗi Service khi lấy Dashboard KPI: ${error.message}`);
        }
    }

    async getBcvhRanking(date, page, pageSize, sort, order) {
        try {
            const monthStart = this._getMonthStart(date);
            const monthToDateCutoff = await factBuuGuiRepo.getLatestBcvhDataDateInRange(monthStart, date);
            const effectiveDate = monthToDateCutoff || date;
            const previousMonthPeriod = this._getPreviousMonthComparablePeriod(effectiveDate);
            const result = await factBuuGuiRepo.getBcvhRanking(effectiveDate, page, pageSize, sort, order);
            const yesterdayStr = this._shiftDate(effectiveDate, -1);
            const swcStr = this._shiftDate(effectiveDate, -7);
            const currentFacts = await factBuuGuiRepo.getFactByDate(effectiveDate);

            const [currentMetrics, yesterdayMetrics, swcMetrics, monthToDateMetrics, previousMonthToDateMetrics] = await Promise.all([
                factBuuGuiRepo.getBcvhOperationMetricsByDate(effectiveDate),
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
            const f13302RateMap = this._buildF13302RateMap(currentFacts);
            
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
                kpi_2026_dod: Number((
                    this._calculateRate(
                        currentMap[item.ma_bcvh]?.dat_kpi_2026 ?? 0,
                        currentMap[item.ma_bcvh]?.sl_bg_ptc ?? item.total_bg
                    ) -
                    this._calculateRate(
                        yesterdayMap[item.ma_bcvh]?.dat_kpi_2026 ?? 0,
                        yesterdayMap[item.ma_bcvh]?.sl_bg_ptc ?? 0
                    )
                ).toFixed(2)),
                kpi_2026_swc: Number((
                    this._calculateRate(
                        currentMap[item.ma_bcvh]?.dat_kpi_2026 ?? 0,
                        currentMap[item.ma_bcvh]?.sl_bg_ptc ?? item.total_bg
                    ) -
                    this._calculateRate(
                        swcMap[item.ma_bcvh]?.dat_kpi_2026 ?? 0,
                        swcMap[item.ma_bcvh]?.sl_bg_ptc ?? 0
                    )
                ).toFixed(2)),
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
                rank: item.rank
            }));

            const totalRow = mappedData.reduce((acc, item) => {
                acc.sl_bg_ptc += item.sl_bg_ptc || 0;
                acc.sl_ptc_nop_tien += item.sl_ptc_nop_tien || 0;
                acc.dat_kpi_2026 += item.dat_kpi_2026 || 0;
                acc.khong_dat_kpi_2026 += item.khong_dat_kpi_2026 || 0;
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

            totalRow.kpi_2026_dod = Number((
                totalRow.kpi_2026 - this._calculateRate(totalYesterday.dat_kpi_2026, totalYesterday.sl_bg_ptc)
            ).toFixed(2));
            totalRow.kpi_2026_swc = Number((
                totalRow.kpi_2026 - this._calculateRate(totalSwc.dat_kpi_2026, totalSwc.sl_bg_ptc)
            ).toFixed(2));

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

    async getRouteRanking(date, bcvh, page, pageSize, sort, order) {
        try {
            const result = await factBuuGuiRepo.getRouteRanking(date, bcvh, page, pageSize, sort, order);
            
            const mappedData = result.data.map(item => ({
                ma_tuyen: item.ma_tuyen,
                ten_tuyen: item.ten_tuyen,
                total_bg: item.total_bg,
                passed_rate: this._calculateRate(item.total_passed, item.total_bg),
                total_failed: item.total_failed,
                f13_303_rate: 0 // Delegate to D4
            }));

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
                let do_tre_gio = 0;
                // Khối tính độ trễ này thuộc phạm vi trình bày số liệu cơ bản,
                // Rule xác định > 3h mới là nhiệm vụ của Engine.
                if (item.thoi_gian_ptc && item.thoi_gian_nop_tien) {
                    const ptc = new Date(item.thoi_gian_ptc);
                    const nop = new Date(item.thoi_gian_nop_tien);
                    do_tre_gio = (nop - ptc) / (1000 * 60 * 60);
                }

                return {
                    ma_bg: item.ma_bg,
                    thoi_gian_ptc: item.thoi_gian_ptc,
                    thoi_gian_nop_tien: item.thoi_gian_nop_tien,
                    do_tre_gio: Number(do_tre_gio.toFixed(2))
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

        const items = rows.map((row) => this._normalizeDailyTrendRow(row));

        return {
            meta: {
                from_date: fromDate,
                to_date: toDate,
                interval: 'daily',
                record_count: items.length,
                latest_import: latestImport?.ngay_do_kiem || null,
                data_freshness: latestImport?.created_at || null,
                filters: {
                    bcvh_id: filters.bcvhId || null
                }
            },
            items
        };
    }
}

module.exports = new F13DashboardService();
