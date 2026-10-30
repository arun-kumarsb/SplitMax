// Frontend API Client for SPLIT//MAX
// Communicates with the backend server via httpOnly cookie authentication

const API_BASE = '/api';

async function fetchJson(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Include httpOnly session cookie
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || 'API request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  async register({ username, password, display_name, emoji, color }) {
    return fetchJson('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, display_name, emoji, color }),
    });
  },

  async login({ username, password }) {
    return fetchJson('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  async logout() {
    return fetchJson('/auth/logout', { method: 'POST' });
  },

  async getMe() {
    return fetchJson('/auth/me');
  },

  // Groups
  async getGroups() {
    return fetchJson('/groups');
  },

  async getGroup(id) {
    return fetchJson(`/groups/${id}`);
  },

  async createGroup({ name, emoji, signature_color, accent_color, currency, initial_members }) {
    return fetchJson('/groups', {
      method: 'POST',
      body: JSON.stringify({
        name,
        emoji,
        signature_color,
        accent_color,
        currency,
        initial_members,
      }),
    });
  },

  async deleteGroup(id) {
    return fetchJson(`/groups/${id}`, { method: 'DELETE' });
  },

  async joinGroup(invite_code, claim_member_id = null) {
    return fetchJson('/groups/join', {
      method: 'POST',
      body: JSON.stringify({ invite_code, claim_member_id }),
    });
  },

  async addMember(groupId, { display_name, emoji, color }) {
    return fetchJson(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ display_name, emoji, color }),
    });
  },

  // Expenses
  async createExpense(groupId, expensePayload) {
    return fetchJson(`/groups/${groupId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(expensePayload),
    });
  },

  async updateExpense(groupId, expenseId, expensePayload) {
    return fetchJson(`/groups/${groupId}/expenses/${expenseId}`, {
      method: 'PUT',
      body: JSON.stringify(expensePayload),
    });
  },

  async deleteExpense(groupId, expenseId) {
    return fetchJson(`/groups/${groupId}/expenses/${expenseId}`, {
      method: 'DELETE',
    });
  },

  // Settlements
  async createSettlement(groupId, settlementPayload) {
    return fetchJson(`/groups/${groupId}/settlements`, {
      method: 'POST',
      body: JSON.stringify(settlementPayload),
    });
  },

  // Activity & Undo
  async getActivity(groupId) {
    return fetchJson(`/groups/${groupId}/activity`);
  },

  async undoAction(groupId) {
    return fetchJson(`/groups/${groupId}/undo`, { method: 'POST' });
  },

  // Import local data
  async importLocalData(groups, members) {
    return fetchJson('/import-local', {
      method: 'POST',
      body: JSON.stringify({ groups, members }),
    });
  },
};
