const importService = require('../services/ImportService');

class ImportController {
    async preview(req, res) {
        try {
            // Tầng Controller bóc tách dữ liệu Request HTTP
            const fileName = req.body.file_name || 'unknown.xlsx';
            const parsedData = req.body.data || [];
            
            // Đẩy xuống Service xử lý
            const result = await importService.previewData(fileName, parsedData);
            
            // Đóng gói Response tuân thủ Contract
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
            const dataArray = req.body.data || [];

            if (!sessionId) {
                return res.status(400).json({
                    success: false,
                    error: { code: 'MISSING_PARAM', message: 'Yêu cầu session_id' }
                });
            }

            const result = await importService.confirmImport(sessionId, forceOverwrite, dataArray);

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
