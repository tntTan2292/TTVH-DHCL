import httpClient from './httpClient';

class F13RecommendationClient {
    /**
     * API Contract: GET /recommendations
     */
    getRecommendations(date) {
        return httpClient.get('/recommendations', { date });
    }

    /**
     * API Contract: GET /messages
     */
    getMessages(date) {
        return httpClient.get('/messages', { date });
    }
}

export default new F13RecommendationClient();
