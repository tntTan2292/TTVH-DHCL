const factBuuGuiRepo = require('../repositories/FactBuuGuiRepository');
const ruleRegistry = require('../engine/rules/RuleRegistry');
const RuleF13302 = require('../engine/rules/RuleF13302');

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

    _indexByBcvh(rows) {
        return rows.reduce((acc, row) => {
            acc[row.ma_bcvh] = row;
            return acc;
        }, {});
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
            const result = await factBuuGuiRepo.getKpiMetrics(startDate, endDate, {
                bcvhId: filters.bcvhId || null
            });
            if (!result || result.total_bg === 0) {
                return { total_bg: 0, passed_rate: 0, failed_rate: 0 };
            }
            
            const passed_rate = this._calculateRate(result.total_passed, result.total_bg);
            const failed_rate = this._calculateRate(result.total_failed, result.total_bg);

            return {
                total_bg: result.total_bg,
                passed_rate,
                failed_rate,
            };
        } catch (error) {
            throw new Error(`Lỗi Service khi lấy Dashboard KPI: ${error.message}`);
        }
    }

    async getBcvhRanking(date, page, pageSize, sort, order) {
        try {
            const result = await factBuuGuiRepo.getBcvhRanking(date, page, pageSize, sort, order);
            const yesterdayStr = this._shiftDate(date, -1);
            const swcStr = this._shiftDate(date, -7);
            const currentFacts = await factBuuGuiRepo.getFactByDate(date);

            const [currentMetrics, yesterdayMetrics, swcMetrics] = await Promise.all([
                factBuuGuiRepo.getBcvhOperationMetricsByDate(date),
                factBuuGuiRepo.getBcvhOperationMetricsByDate(yesterdayStr),
                factBuuGuiRepo.getBcvhOperationMetricsByDate(swcStr)
            ]);

            const currentMap = this._indexByBcvh(currentMetrics);
            const yesterdayMap = this._indexByBcvh(yesterdayMetrics);
            const swcMap = this._indexByBcvh(swcMetrics);
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
                f13_303_rate: f13302RateMap[item.ma_bcvh] ?? 0,
                rank: item.rank
            }));

            const totalRow = mappedData.reduce((acc, item) => {
                acc.sl_bg_ptc += item.sl_bg_ptc || 0;
                acc.sl_ptc_nop_tien += item.sl_ptc_nop_tien || 0;
                acc.dat_kpi_2026 += item.dat_kpi_2026 || 0;
                acc.khong_dat_kpi_2026 += item.khong_dat_kpi_2026 || 0;
                return acc;
            }, {
                ten_bcvh: 'TỔNG CỘNG',
                sl_bg_ptc: 0,
                sl_ptc_nop_tien: 0,
                dat_kpi_2026: 0,
                khong_dat_kpi_2026: 0
            });

            totalRow.kpi_2026 = this._calculateRate(totalRow.dat_kpi_2026, totalRow.sl_bg_ptc);

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
