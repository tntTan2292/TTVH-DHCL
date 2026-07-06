class RuleRegistry {
    constructor() {
        this.rules = [];
    }

    /**
     * Khai báo Rule vào Engine
     * @param {BaseRule} rule 
     */
    register(rule) {
        this.rules.push(rule);
        // Sắp xếp Pipeline thực thi theo Priority giảm dần
        this.rules.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Thực thi toàn bộ pipeline luật trên mảng dữ liệu.
     * Engine hoàn toàn Stateless, không lưu Database.
     * @param {Array} facts Danh sách bưu gửi
     * @returns {Object} Rule Result (gồm danh sách vi phạm và KPI F13_303)
     */
    execute(facts) {
        let totalKhongDat = 0;
        let totalViPham = 0;
        const violations = [];

        facts.forEach(fact => {
            // Đếm tập mẫu "Không Đạt" để phục vụ tính F13_303 theo SSOT
            if (fact.ket_qua_f13 !== 'Đạt') {
                totalKhongDat++;
            }

            let isViolated = false;
            
            // Evaluator Loop
            for (const rule of this.rules) {
                if (rule.evaluate(fact)) {
                    isViolated = true;
                    if (rule.id === 'RULE_F13_302') {
                        violations.push(fact);
                        totalViPham++;
                    }
                }
            }
            // Gắn nhãn trực tiếp trên object (trả về Service thao tác)
            fact.is_late_payment = isViolated;
        });

        // RULE_F13_303: Tỷ lệ chậm nộp tiền
        // Tránh lỗi chia cho không
        const f13_303_rate = totalKhongDat === 0 ? 0 : Number(((totalViPham / totalKhongDat) * 100).toFixed(1));

        return {
            total_failed: totalKhongDat,
            total_late_payment: totalViPham,
            f13_303_rate,
            violations
        };
    }
}

// Singleton Pattern export cho Registry
module.exports = new RuleRegistry();
