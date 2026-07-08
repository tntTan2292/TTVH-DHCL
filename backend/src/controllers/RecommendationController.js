const recommendationService = require('../services/RecommendationService');

class RecommendationController {
    /**
     * Không import trực tiếp Engine. Chỉ gọi Service.
     */
    async getRecs(req, res) {
        try {
            const from_date = req.query.from_date || req.query.fromDate;
            const to_date = req.query.to_date || req.query.toDate;
            
            if (!from_date || !to_date) return res.status(400).json({ success: false, error: { code: 'MISSING_PARAM', message: 'Yêu cầu from_date và to_date' }});

            const result = await recommendationService.getRecommendations(to_date);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message }});
        }
    }

    async getMsgs(req, res) {
        try {
            const from_date = req.query.from_date || req.query.fromDate;
            const to_date = req.query.to_date || req.query.toDate;

            if (!from_date || !to_date) return res.status(400).json({ success: false, error: { code: 'MISSING_PARAM', message: 'Yêu cầu from_date và to_date' }});

            const result = await recommendationService.getMessages(to_date);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message }});
        }
    }
}

module.exports = new RecommendationController();
