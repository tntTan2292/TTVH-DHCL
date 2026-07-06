class InsightGenerator {
    /**
     * Tầng 2: Insight Generator
     * Trách nhiệm: Nhận Rule Result và tổng hợp thành các Insight (Nhận định)
     * Không render text thô, chỉ phân loại mức độ và nội dung nguyên thủy.
     * @param {Object} ruleResult Kết quả trả về từ RuleRegistry
     * @returns {Array} Danh sách Insight Object
     */
    generate(ruleResult) {
        const insights = [];

        if (ruleResult.total_late_payment > 0) {
            insights.push({
                id: 'INSIGHT_LATE_PAYMENT',
                // Phân cấp mức độ ảnh hưởng (Tạm đặt logic thô tại đây, chưa có SSOT cụ thể cho màu sắc báo cáo)
                priority: ruleResult.f13_303_rate >= 10 ? 'HIGH' : 'MEDIUM',
                category: 'Cảnh báo chậm nộp',
                content: `Có ${ruleResult.total_late_payment} bưu gửi vi phạm chậm nộp tiền trên tổng ${ruleResult.total_failed} bưu gửi không đạt.`,
                data: ruleResult
            });
        }

        return insights;
    }
}

module.exports = new InsightGenerator();
