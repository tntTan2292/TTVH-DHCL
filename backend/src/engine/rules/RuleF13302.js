const BaseRule = require('./BaseRule');

class RuleF13302 extends BaseRule {
    constructor() {
        // SSOT Traceability: RESEARCH_BASELINE_v1.0.md - Section 3
        super(
            'RULE_F13_302', 
            'Chậm nộp tiền > 3h', 
            'Bưu gửi Không đạt có thời gian nộp tiền - thời gian PTC > 3 giờ', 
            100 // High priority
        );
    }

    /**
     * Đánh giá bưu gửi xem có vi phạm chậm nộp tiền không.
     * Tầng Service đảm bảo truyền vào định dạng ISO/UTC chuẩn hóa, Engine không quan tâm Timezone.
     * @param {Object} fact Dữ liệu bưu gửi
     * @returns {boolean} True nếu vi phạm chậm nộp
     */
    evaluate(fact) {
        // Nguyên tắc Bypass: Bưu gửi Đạt tự động bỏ qua
        if (fact.ket_qua_f13 === 'Đạt') {
            return false;
        }
        
        // Không có dữ liệu thời gian => Không đủ cơ sở tính trễ
        if (!fact.thoi_gian_ptc || !fact.thoi_gian_nop_tien) {
            return false;
        }

        const ptcMs = new Date(fact.thoi_gian_ptc).getTime();
        const nopMs = new Date(fact.thoi_gian_nop_tien).getTime();
        
        const diffMs = nopMs - ptcMs;
        const diffHours = diffMs / (1000 * 60 * 60);

        // SSOT Threshold > 3 giờ
        return diffHours > 3;
    }
}

module.exports = RuleF13302;
