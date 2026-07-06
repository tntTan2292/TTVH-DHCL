class MessageRenderer {
    /**
     * Tầng 3: Message Renderer
     * Trách nhiệm: Nhận Insight và map vào Template để sinh đoạn text (Message) cho Điều hành/Báo cáo.
     * Khớp hoàn toàn với API Contract GET /messages.
     * @param {Array} insights
     * @returns {Object} JSON theo định dạng Message Contract
     */
    render(insights) {
        let dieu_hanh = '';
        let bao_cao = '';

        insights.forEach(insight => {
            if (insight.id === 'INSIGHT_LATE_PAYMENT') {
                dieu_hanh += `[ĐIỀU HÀNH] Yêu cầu rà soát ngay: ${insight.content}\n`;
                bao_cao += `[BÁO CÁO] Tỷ lệ vi phạm F13_303 hiện tại là ${insight.data.f13_303_rate}%.\n`;
            }
        });

        // Fallback text nếu hệ thống không có cảnh báo nào
        if (insights.length === 0) {
            dieu_hanh = 'Hệ thống vận hành ổn định, không ghi nhận bất thường.';
            bao_cao = 'Chỉ số F13_303 đạt ngưỡng an toàn tuyệt đối (0%).';
        }

        return {
            dieu_hanh: dieu_hanh.trim(),
            bao_cao: bao_cao.trim()
        };
    }
}

module.exports = new MessageRenderer();
