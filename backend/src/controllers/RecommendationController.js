const recommendationService = require('../services/RecommendationService');

class RecommendationController {
    /**
     * Không import trực tiếp Engine. Chỉ gọi Service.
     */
    async getRecs(req, res) {
        try {
            const { date } = req.query;
            if (!date) return res.status(400).json({ success: false, error: { code: 'MISSING_PARAM', message: 'Yêu cầu date' }});

            const result = await recommendationService.getRecommendations(date);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message }});
        }
    }

    async getMsgs(req, res) {
        try {
            const { date } = req.query;
            if (!date) return res.status(400).json({ success: false, error: { code: 'MISSING_PARAM', message: 'Yêu cầu date' }});

            const result = await recommendationService.getMessages(date);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message }});
        }
    }
}

module.exports = new RecommendationController();
