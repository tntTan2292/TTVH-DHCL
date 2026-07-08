const factBuuGuiRepo = require('../repositories/FactBuuGuiRepository');

class F13DashboardService {
    
    // Hàm bọc tính toán an toàn (Tránh lỗi Division by Zero)
    _calculateRate(part, total) {
        if (!total || total === 0) return 0;
        return Number(((part / total) * 100).toFixed(1));
    }

    async getDashboardKpi(startDate, endDate) {
        try {
            const result = await factBuuGuiRepo.getKpiMetrics(startDate, endDate);
            if (!result || result.total_bg === 0) {
                return { total_bg: 0, passed_rate: 0, failed_rate: 0, f13_303_rate: 0 };
            }
            
            const passed_rate = this._calculateRate(result.total_passed, result.total_bg);
            const failed_rate = this._calculateRate(result.total_failed, result.total_bg);
            
            // Tỷ lệ F13_303 (Chậm > 3h) thuộc quyền quyết định của Rule Engine (D4).
            // Ở D3, Service Layer chỉ đóng gói cấu trúc khớp với API Contract, trả về 0 tạm thời.
            const f13_303_rate = 0; 

            return {
                total_bg: result.total_bg,
                passed_rate,
                failed_rate,
                f13_303_rate
            };
        } catch (error) {
            throw new Error(`Lỗi Service khi lấy Dashboard KPI: ${error.message}`);
        }
    }

    async getBcvhRanking(date, page, pageSize, sort, order) {
        try {
            const result = await factBuuGuiRepo.getBcvhRanking(date, page, pageSize, sort, order);
            
            const mappedData = result.data.map(item => ({
                ma_bcvh: item.ma_bcvh,
                ten_bcvh: item.ten_bcvh,
                total_bg: item.total_bg,
                passed_rate: this._calculateRate(item.total_passed, item.total_bg),
                total_failed: item.total_failed,
                f13_303_rate: 0, // Delegate to D4 Rule Engine
                rank: item.rank
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
}

module.exports = new F13DashboardService();
