import httpClient from './httpClient.js';

class AdminClient {
  listUsers() {
    return httpClient.get('/admin/users');
  }

  createUser({ username, display_name, tier, bcvh = [], indicators = [] }) {
    return httpClient.post('/admin/users', {
      username,
      display_name,
      tier,
      bcvh,
      indicators,
    });
  }

  updateUser(id, payload) {
    return httpClient.put(`/admin/users/${id}`, payload);
  }

  resetPassword(id) {
    return httpClient.post(`/admin/users/${id}/reset-password`, {});
  }

  unlockUser(id) {
    return httpClient.post(`/admin/users/${id}/unlock`, {});
  }
}

export default new AdminClient();
