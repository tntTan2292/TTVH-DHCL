const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

class HttpClient {
    /**
     * Global HTTP Request Wrapper
     * Đảm bảo tính Stateless, quản lý Error chung, không dính líu UI.
     */
    async request(endpoint, options = {}) {
        const url = `${BASE_URL}${endpoint}`;
        
        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                // Đóng gói lỗi từ chuẩn API Contract (D5)
                const errorPayload = {
                    status: response.status,
                    code: data?.error?.code || 'NETWORK_ERROR',
                    message: data?.error?.message || 'Có lỗi xảy ra từ máy chủ.'
                };
                throw errorPayload;
            }

            // Trả về JSON bọc chuẩn: { success: true, data: {...}, meta: {...} }
            return data;
        } catch (error) {
            // Lỗi kết nối mạng (Network Unreachable) hoặc lỗi bọc từ khối !response.ok
            if (!error.status) {
                throw {
                    status: 0,
                    code: 'NETWORK_UNREACHABLE',
                    message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.'
                };
            }
            throw error;
        }
    }

    get(endpoint, params = {}) {
        const queryParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                queryParams.append(key, value);
            }
        });

        const queryString = queryParams.toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;

        return this.request(url, { method: 'GET' });
    }

    post(endpoint, body = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }
}

export default new HttpClient();
