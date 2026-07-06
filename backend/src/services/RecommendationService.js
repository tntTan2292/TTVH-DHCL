const factBuuGuiRepo = require('../repositories/FactBuuGuiRepository');
const ruleRegistry = require('../engine/rules/RuleRegistry');
const insightGenerator = require('../engine/recommendations/InsightGenerator');
const messageRenderer = require('../engine/messages/MessageRenderer');

class RecommendationService {
    /**
     * API Orchestration Service
     * TUYỆT ĐỐI KHÔNG chứa Business Rule. Chỉ đóng vai trò điều phối luồng chảy dữ liệu.
     * @param {string} date Ngày cần phân tích (YYYY-MM-DD)
     * @returns {Array} Insights
     */
    async getRecommendations(date) {
        try {
            // 1. Lấy Fact thô từ DB
            const facts = await factBuuGuiRepo.getFactByDate(date);
            
            // 2. Chạy Rule Engine (Evaluation)
            const ruleResult = ruleRegistry.execute(facts);
            
            // 3. Sinh Insight
            const insights = insightGenerator.generate(ruleResult);
            
            return insights;
        } catch (error) {
            throw new Error(`Orchestration Error (Recommendations): ${error.message}`);
        }
    }

    /**
     * Chạy luồng pipeline để sinh Message
     */
    async getMessages(date) {
        try {
            // 1. Lấy Fact
            const facts = await factBuuGuiRepo.getFactByDate(date);
            
            // 2. Chạy Rule Engine
            const ruleResult = ruleRegistry.execute(facts);
            
            // 3. Sinh Insight
            const insights = insightGenerator.generate(ruleResult);
            
            // 4. Render Message
            const messages = messageRenderer.render(insights);
            
            return messages;
        } catch (error) {
            throw new Error(`Orchestration Error (Messages): ${error.message}`);
        }
    }
}

module.exports = new RecommendationService();
