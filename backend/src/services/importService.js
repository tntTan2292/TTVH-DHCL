const importSessionRepo = require('../repositories/ImportSessionRepository');
const factBuuGuiRepo = require('../repositories/FactBuuGuiRepository');

// Store tạm thời trong Memory (Chỉ dùng cho minh họa kiến trúc. Thực tế có thể dùng Redis)
const globalSessionStore = new Map();

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
            const sessionId = `SESSION-${Date.now()}`;
            
            // TODO: Sử dụng thư viện Excel (như xlsx) để đọc fileBuffer thành parsedData
            // const workbook = xlsx.read(fileBuffer); ...
            // const parsedData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            
            // Tạm thời Mock dữ liệu đã parse
            const parsedData = [
                { ma_bg: 'VN123', ket_qua_f13: 'Không đạt' }
            ];

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
            
            // Lưu data thật vào Memory Store để Confirm lấy ra
            globalSessionStore.set(sessionId, parsedData);

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
            const session = await importSessionRepo.findById(sessionId);
            if (!session) {
                throw new Error('Không tìm thấy phiên Import (Session ID không hợp lệ)');
            }

            // Lấy lại dữ liệu từ Memory Store của Backend
            const dataArray = globalSessionStore.get(sessionId);
            if (!dataArray) {
                throw new Error('Dữ liệu phiên đã hết hạn hoặc không tồn tại. Vui lòng Upload lại file.');
            }

            await factBuuGuiRepo.overwriteImport(session.ngay_do_kiem, sessionId, dataArray);
            
            await importSessionRepo.updateStatus(sessionId, 'CONFIRMED');

            // Xóa session khỏi bộ nhớ tạm
            globalSessionStore.delete(sessionId);

            return {
                inserted_records: dataArray.length,
                import_log_id: sessionId
            };
        } catch (error) {
            throw new Error(`Lỗi hệ thống khi lưu trữ Confirm dữ liệu: ${error.message}`);
        }
    }
}

module.exports = new ImportService();
