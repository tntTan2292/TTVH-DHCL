const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

class HttpClient {
    async request(endpoint, options = {}) {
        const url = `${BASE_URL}${endpoint}`;
        
        // Nếu truyền headers riêng (như khi gửi FormData), ưu tiên dùng mảng đó. Nếu không thì dùng default.
        const headers = options.headers || {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const errorPayload = {
                    status: response.status,
                    code: data?.error?.code || 'NETWORK_ERROR',
                    message: data?.error?.message || 'Có lỗi xảy ra từ máy chủ.'
                };
                throw errorPayload;
            }

            return data;
        } catch (error) {
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
        const isFormData = body instanceof FormData;
        
        const options = {
            method: 'POST',
            body: isFormData ? body : JSON.stringify(body)
        };

        if (isFormData) {
            // Khi gửi FormData, browser tự động sinh header Content-Type multipart/form-data kèm boundary
            options.headers = {
                'Accept': 'application/json'
            };
        }

        return this.request(endpoint, options);
    }
}

export default new HttpClient();
