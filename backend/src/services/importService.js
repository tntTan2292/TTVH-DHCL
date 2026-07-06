const importSessionRepo = require('../repositories/ImportSessionRepository');
const factBuuGuiRepo = require('../repositories/FactBuuGuiRepository');
const importSessionStore = require('./session/ImportSessionStore');

class ImportService {
    /**
     * Preview Data
     * Nhận file Raw từ Controller, tự parse và lưu vào Session Store.
     * @param {string} fileName Tên file gốc
     * @param {Buffer} fileBuffer Buffer của file Excel
     * @returns {Object} JSON Preview
     */
    async previewData(fileName, fileBuffer) {
        try {
            // Tạm thời Mock dữ liệu đã parse (Thực tế sẽ dùng xlsx parse fileBuffer ở đây)
            const parsedData = [
                { ma_bg: 'VN123', ket_qua_f13: 'Không đạt' }
            ];

            // Giao phó việc cấp phát Session ID và lưu trữ cho Session Store độc lập
            const sessionId = importSessionStore.createSession(parsedData);
            
            const ngayDoKiem = '2026-06-18'; // Mock logic lấy ngày từ file/data
            const totalRecords = parsedData.length;
            const validRecords = totalRecords; 
            const errorRecords = 0;

            const session = {
                session_id: sessionId,
                ngay_do_kiem: ngayDoKiem,
                file_name: fileName,
                status: 'PREVIEW',
                total_records: totalRecords,
                valid_records: validRecords,
                error_records: errorRecords
            };

            // Lưu metadata vào CSDL tạm
            await importSessionRepo.create(session);
            
            return {
                session_id: sessionId,
                ngay_do_kiem: session.ngay_do_kiem,
                total_records: session.total_records,
                valid_records: session.valid_records,
                error_records: session.error_records,
                is_duplicate_date: false
            };
        } catch (error) {
            throw new Error(`Lỗi hệ thống khi xử lý Preview: ${error.message}`);
        }
    }

    /**
     * Confirm Import
     * @param {string} sessionId 
     * @param {boolean} forceOverwrite 
     * @returns {Object} Kết quả nạp
     */
    async confirmImport(sessionId, forceOverwrite) {
        try {
            // Lấy lại dữ liệu từ Memory Store của Backend
            const dataArray = importSessionStore.getSession(sessionId);
            if (!dataArray) {
                throw new Error('SESSION_EXPIRED');
            }

            const session = await importSessionRepo.findById(sessionId);
            if (!session) {
                throw new Error('Không tìm thấy phiên Import (Metadata không hợp lệ)');
            }

            await factBuuGuiRepo.overwriteImport(session.ngay_do_kiem, sessionId, dataArray);
            
            await importSessionRepo.updateStatus(sessionId, 'CONFIRMED');

            // Xóa session khỏi bộ nhớ tạm ngay lập tức sau khi thành công
            importSessionStore.deleteSession(sessionId);

            return {
                inserted_records: dataArray.length,
                import_log_id: sessionId
            };
        } catch (error) {
            if (error.message === 'SESSION_EXPIRED') {
                throw new Error('SESSION_EXPIRED: Phiên thao tác đã hết hạn, vui lòng tải lên lại.');
            }
            throw new Error(`Lỗi hệ thống khi lưu trữ Confirm dữ liệu: ${error.message}`);
        }
    }
}

module.exports = new ImportService();
