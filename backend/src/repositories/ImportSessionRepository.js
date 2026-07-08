const db = require('../config/db').db;

class ImportSessionRepository {
    /**
     * Tạo mới 1 phiên import
     * @param {Object} session
     * @returns {Promise<number>} lastID
     */
    create(session) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO f13_import_sessions 
                (session_id, ngay_do_kiem, file_name, status, total_records, valid_records, error_records) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            const params = [
                session.session_id,
                session.ngay_do_kiem,
                session.file_name,
                session.status,
                session.total_records || 0,
                session.valid_records || 0,
                session.error_records || 0
            ];
            db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    /**
     * Cập nhật trạng thái phiên
     * @param {string} sessionId
     * @param {string} status 
     */
    updateStatus(sessionId, status) {
        return new Promise((resolve, reject) => {
            const sql = `UPDATE f13_import_sessions SET status = ? WHERE session_id = ?`;
            db.run(sql, [status, sessionId], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }

    /**
     * Tìm session theo id
     * @param {string} sessionId 
     */
    findById(sessionId) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM f13_import_sessions WHERE session_id = ?`;
            db.get(sql, [sessionId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }
}

module.exports = new ImportSessionRepository();
