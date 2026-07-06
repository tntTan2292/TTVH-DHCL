const importSessionRepo = require('../repositories/ImportSessionRepository');
const factBuuGuiRepo = require('../repositories/FactBuuGuiRepository');

class ImportService {
    /**
     * Preview Data
     * Điều phối luồng xử lý Preview (Đọc file, bóc tách cấu trúc).
     * @param {string} fileName Tên file gốc
     * @param {Array} parsedData Dữ liệu đã được parse từ Excel (được pass từ Controller/Parser)
     * @returns {Object} JSON Preview
     */
    async previewData(fileName, parsedData) {
        try {
            // Khởi tạo một phiên (Session) với trạng thái PREVIEW
            const sessionId = `SESSION-${Date.now()}`;
            // Theo nghiệp vụ F1.3, ngày đo kiểm lấy từ filename (Giả lập logic extract tạm ở đây)
            const ngayDoKiem = '2026-06-18'; 
            
            const totalRecords = parsedData ? parsedData.length : 0;
            // Ở D3, ta không code Logic Validate. Giả sử 100% valid.
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

            await importSessionRepo.create(session);

            return {
                session_id: sessionId,
                ngay_do_kiem: session.ngay_do_kiem,
                total_records: session.total_records,
                valid_records: session.valid_records,
                error_records: session.error_records,
                is_duplicate_date: false // Mock cho API Contract, thực tế Repo sẽ query xem ngày này đã tồn tại chưa
            };
        } catch (error) {
            throw new Error(`Lỗi hệ thống khi xử lý Preview: ${error.message}`);
        }
    }

    /**
     * Confirm Import
     * Khớp với chuẩn API Contract `/import/confirm`
     * @param {string} sessionId 
     * @param {boolean} forceOverwrite 
     * @param {Array} dataArray Dữ liệu cần chèn (bản thực tế sẽ lưu tạm ở Redis/Memory giữa 2 bước)
     * @returns {Object} Kết quả nạp
     */
    async confirmImport(sessionId, forceOverwrite, dataArray) {
        try {
            const session = await importSessionRepo.findById(sessionId);
            if (!session) {
                throw new Error('Không tìm thấy phiên Import (Session ID không hợp lệ)');
            }

            // Giao phó toàn bộ Transaction phức tạp cho Repository (overwriteImport)
            // Repository sẽ lo việc Delete dữ liệu cũ theo ngày (nếu forceOverwrite) và Bulk Insert
            await factBuuGuiRepo.overwriteImport(session.ngay_do_kiem, sessionId, dataArray);
            
            // Thành công -> Đổi Status log
            await importSessionRepo.updateStatus(sessionId, 'CONFIRMED');

            return {
                inserted_records: dataArray.length,
                import_log_id: sessionId
            };
        } catch (error) {
            // Chặn bắt Exception từ Repository (vd: SQLITE_CONSTRAINT) và bọc lại
            throw new Error(`Lỗi hệ thống khi lưu trữ Confirm dữ liệu: ${error.message}`);
        }
    }
}

module.exports = new ImportService();
