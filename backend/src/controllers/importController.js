const importService = require('../services/ImportService');

class ImportController {
    async preview(req, res) {
        try {
            // Frontend truyền lên multipart/form-data, Multer (hoặc Middleware) đã parse ra req.file
            const file = req.file;
            
            if (!file) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'MISSING_FILE', message: 'Không tìm thấy file tải lên.' }
                });
            }

            // Đẩy xuống Service xử lý: tự đọc Buffer và phân tích Excel
            const result = await importService.previewData(file.originalname, file.buffer);
            
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'PREVIEW_ERROR',
                    message: error.message
                }
            });
        }
    }

    async confirm(req, res) {
        try {
            const sessionId = req.body.session_id;
            const forceOverwrite = req.body.force_overwrite === true;

            if (!sessionId) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'MISSING_PARAM', message: 'Yêu cầu session_id' }
                });
            }

            // Dữ liệu sẽ lấy lại từ Session ở Backend, không nhận data từ Frontend
            const result = await importService.confirmImport(sessionId, forceOverwrite);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: { code: 'CONFIRM_ERROR', message: error.message }
            });
        }
    }
}

module.exports = new ImportController();
