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
        return httpClient.get('/ranking/bcvh', { 
            date, 
            page, 
            page_size: pageSize, 
            sort, 
            order 
        });
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
