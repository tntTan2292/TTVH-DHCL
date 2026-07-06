import httpClient from './httpClient';

class F13ImportClient {
    /**
     * Gửi file thô qua dạng multipart/form-data
     * API Contract: POST /import/preview
     * @param {File} file Đối tượng File lấy từ thẻ <input type="file">
     */
    preview(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        return httpClient.post('/import/preview', formData);
    }

    /**
     * Xác nhận Import (Ghi đè)
     * API Contract: POST /import/confirm
     * Không còn truyền data mảng (dataArray) từ Frontend
     * @param {string} sessionId ID phiên Preview trả về
     * @param {boolean} forceOverwrite Cờ ghi đè
     */
    confirm(sessionId, forceOverwrite) {
        return httpClient.post('/import/confirm', {
            session_id: sessionId,
            force_overwrite: forceOverwrite
        });
    }
}

export default new F13ImportClient();
