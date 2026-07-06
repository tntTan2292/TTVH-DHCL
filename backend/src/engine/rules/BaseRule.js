class BaseRule {
    /**
     * Lớp cơ sở cho toàn bộ Rule Engine
     * @param {string} id Mã định danh Rule (VD: RULE_F13_302)
     * @param {string} name Tên Rule
     * @param {string} description Mô tả Rule (Truy vết SSOT)
     * @param {number} priority Độ ưu tiên thực thi
     */
    constructor(id, name, description, priority) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.priority = priority;
    }
    
    /**
     * Hàm đánh giá (Pure Function). Phải được Override ở lớp con.
     * @param {Object} fact Dữ liệu truyền vào từ Service
     * @returns {boolean} True nếu vi phạm
     */
    evaluate(fact) {
        throw new Error("Method 'evaluate' must be implemented.");
    }
}

module.exports = BaseRule;
