const crypto = require('crypto');

class ImportSessionStore {
    constructor() {
        this.store = new Map();
        // TTL mặc định: 20 phút
        this.ttl = 20 * 60 * 1000; 

        // Cleanup Job chạy định kỳ mỗi 5 phút
        setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
    }

    /**
     * Tạo session mới
     * @param {any} data Dữ liệu cần lưu
     * @returns {string} Session ID (UUID)
     */
    createSession(data) {
        const sessionId = crypto.randomUUID();
        const now = Date.now();
        
        this.store.set(sessionId, {
            data: data,
            createdAt: now,
            expiresAt: now + this.ttl
        });

        return sessionId;
    }

    /**
     * Lấy dữ liệu session
     * @param {string} sessionId 
     * @returns {any|null} Data hoặc null nếu hết hạn/không tồn tại
     */
    getSession(sessionId) {
        const session = this.store.get(sessionId);
        if (!session) return null;

        // Xóa ngay nếu phát hiện đã hết hạn khi get
        if (Date.now() > session.expiresAt) {
            this.deleteSession(sessionId);
            return null;
        }

        return session.data;
    }

    /**
     * Xóa session
     * @param {string} sessionId 
     */
    deleteSession(sessionId) {
        this.store.delete(sessionId);
    }

    /**
     * Quét và dọn rác các session hết hạn
     */
    cleanup() {
        const now = Date.now();
        for (const [sessionId, session] of this.store.entries()) {
            if (now > session.expiresAt) {
                this.store.delete(sessionId);
            }
        }
    }
}

module.exports = new ImportSessionStore();
