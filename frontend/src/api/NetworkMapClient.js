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
     * API Contract: GET /network-map/delivery-routes/meta
     */
    getDeliveryRoutesMeta() {
        return httpClient.get('/network-map/delivery-routes/meta');
    }

    /**
     * API Contract: GET /network-map/delivery-routes/points
     * Requires all three filters — never issues a bulk/full-month request.
     */
    getDeliveryRoutePoints(ngay, maBcvh, postmanCode) {
        if (!ngay || !maBcvh || !postmanCode) {
            return Promise.reject({
                status: 400,
                code: 'MISSING_REQUIRED_FILTER',
                message: 'Phải chọn đủ Ngày, BCVH và Bưu tá trước khi truy vấn Sơ đồ tuyến phát.',
            });
        }
        return httpClient.get('/network-map/delivery-routes/points', {
            ngay,
            ma_bcvh: maBcvh,
            postman_code: postmanCode,
        });
    }
}

export default new NetworkMapClient();
