import httpClient from './httpClient';

class F13ImportClient {
    /**
     * Gửi dữ liệu Preview lên Backend
     * API Contract: POST /import/preview
     * @param {string} fileName Tên file
     * @param {Array} parsedData Dữ liệu thô JSON từ Excel
     */
    preview(fileName, parsedData) {
        return httpClient.post('/import/preview', {
            file_name: fileName,
            data: parsedData
        });
    }

    /**
     * Xác nhận Import (Ghi đè)
     * API Contract: POST /import/confirm
     * @param {string} sessionId ID phiên Preview trả về
     * @param {boolean} forceOverwrite Cờ ghi đè
     * @param {Array} dataArray Dữ liệu cần nạp
     */
    confirm(sessionId, forceOverwrite, dataArray) {
        return httpClient.post('/import/confirm', {
            session_id: sessionId,
            force_overwrite: forceOverwrite,
            data: dataArray
        });
    }
}

export default new F13ImportClient();
