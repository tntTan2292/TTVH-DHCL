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
}

export default new NetworkMapClient();
