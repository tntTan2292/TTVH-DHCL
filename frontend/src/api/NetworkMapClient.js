import httpClient from './httpClient.js';

class NetworkMapClient {
    /**
     * API Contract: GET /network-map/service-points
     */
    getServicePoints() {
        return httpClient.get('/network-map/service-points');
    }

    /**
     * API Contract: GET /network-map/level2-routes
     */
    getLevel2Routes() {
        return httpClient.get('/network-map/level2-routes');
    }

    /**
     * API Contract: GET /network-map/delivery-routes/meta[?ngay=][&ma_bcvh=]
     * Cascading: no params -> {dates, bcvh}; +ngay -> bcvh scoped to that date;
     * +ngay&ma_bcvh -> +postman_codes scoped to date+BCVH.
     */
    getDeliveryRoutesMeta(ngay, maBcvh) {
        const params = {};
        if (ngay) params.ngay = ngay;
        if (ngay && maBcvh) params.ma_bcvh = maBcvh;
        return httpClient.get('/network-map/delivery-routes/meta', params);
    }

    /**
     * API Contract: GET /network-map/delivery-routes/points
     * Requires all three filters — never issues a bulk/full-month request.
     */
    getDeliveryRoutePoints(ngay, maBcvh, postmanCode, ca) {
        if (!ngay || !maBcvh || !postmanCode) {
            return Promise.reject({
                status: 400,
                code: 'MISSING_REQUIRED_FILTER',
                message: 'Phải chọn đủ Ngày, BCVH và Bưu tá trước khi truy vấn Sơ đồ tuyến phát.',
            });
        }
        const params = {
            ngay,
            ma_bcvh: maBcvh,
            postman_code: postmanCode,
        };
        if (ca) params.ca = ca;
        return httpClient.get('/network-map/delivery-routes/points', params);
    }

    // ==================== Phase 3: Import / Export / History / Rollback (admin only) ====================

    previewServicePoints(file) {
        const form = new FormData();
        form.append('file', file);
        return httpClient.post('/network-map/service-points/import/preview', form);
    }

    confirmServicePoints(sessionToken) {
        return httpClient.post('/network-map/service-points/import/confirm', { session_token: sessionToken });
    }

    exportServicePoints() {
        return httpClient.getBlob('/network-map/service-points/export');
    }

    previewLevel2Routes(file) {
        const form = new FormData();
        form.append('file', file);
        return httpClient.post('/network-map/level2-routes/import/preview', form);
    }

    confirmLevel2Routes(sessionToken, selectedRouteKeys) {
        return httpClient.post('/network-map/level2-routes/import/confirm', { session_token: sessionToken, selected_route_keys: selectedRouteKeys });
    }

    exportLevel2Routes() {
        return httpClient.getBlob('/network-map/level2-routes/export');
    }

    previewDeliveryRoutes(file) {
        const form = new FormData();
        form.append('file', file);
        return httpClient.post('/network-map/delivery-routes/import/preview', form);
    }

    confirmDeliveryRoutes(sessionToken) {
        return httpClient.post('/network-map/delivery-routes/import/confirm', { session_token: sessionToken });
    }

    exportDeliveryRoutesPreviewCount({ from, to, all } = {}) {
        const params = all ? { all: 'true' } : { from, to };
        return httpClient.get('/network-map/delivery-routes/export/preview-count', params);
    }

    exportDeliveryRoutes({ from, to, all } = {}) {
        const params = all ? { all: 'true' } : { from, to };
        return httpClient.getBlob('/network-map/delivery-routes/export', params);
    }

    importHistory(module) {
        return httpClient.get(`/network-map/import/history/${module}`);
    }

    rollbackImport(importLogId) {
        return httpClient.post(`/network-map/import/${importLogId}/rollback`, {});
    }
}

export default new NetworkMapClient();
