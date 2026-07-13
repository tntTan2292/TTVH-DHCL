import httpClient from './httpClient';

class F13DashboardClient {
    /**
     * API Contract: GET /dashboard/kpi
     */
    getKpi(startDate, endDate) {
        return httpClient.get('/dashboard/kpi', { startDate, endDate });
    }

    /**
     * API Contract: GET /ranking/bcvh
     */
    getBcvhRanking(date, page, pageSize, sort, order) {
        return httpClient.get('/f13/ranking/bcvh', { 
            date, 
            page, 
            page_size: pageSize, 
            sort, 
            order 
        });
    }

    async getBcvhRankingForUi(fromDate, toDate, pageSize = 1000, sort = 'rank', order = 'asc') {
        const response = await httpClient.get('/f13/ranking/bcvh', {
            from_date: fromDate,
            to_date: toDate,
            page: 1,
            page_size: pageSize,
            sort,
            order
        });

        const rows = Array.isArray(response?.data) ? response.data : [];
        const mapped = rows.map((item) => ({
            id: item.ma_bcvh,
            ma_bcvh: item.ma_bcvh,
            ten_bcvh: item.ten_bcvh,
            name: item.ten_bcvh,
            total_bg: item.total_bg ?? 0,
            passed: item.passed_bg ?? 0,
            failed: item.failed_bg ?? item.total_failed ?? 0,
            passed_rate: item.kpi_2026 ?? item.kpi_rate ?? item.passed_rate ?? 0,
            f13_303_rate: item.f13_303_rate ?? 0,
            rank: item.rank ?? 0,
        }));

        return {
            data: mapped,
            meta: response?.meta || {},
        };
    }

    /**
     * API Contract: GET /ranking/route
     */
    getRouteRanking(date, bcvh, page, pageSize, sort, order) {
        return httpClient.get('/ranking/route', { 
            date, 
            bcvh, 
            page, 
            page_size: pageSize, 
            sort, 
            order 
        });
    }

    /**
     * API Contract: GET /rca/pareto
     */
    getPareto(date, bcvh) {
        return httpClient.get('/rca/pareto', { date, bcvh });
    }

    /**
     * API Contract: GET /evidence-list
     */
    getEvidenceList(date, bcvh, route, page, pageSize) {
        return httpClient.get('/evidence-list', { 
            date, 
            bcvh, 
            route, 
            page, 
            page_size: pageSize 
        });
    }
}

export default new F13DashboardClient();
