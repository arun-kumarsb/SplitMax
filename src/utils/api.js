// Frontend API Client for SPLIT//MAX
// Communicates with the backend server via httpOnly cookie + Bearer token authentication

// Backend EC2 IP & Port Configuration
export const BACKEND_IP = '3.106.141.172';
export const BACKEND_PORT = '3001';
export const BACKEND_DOMAIN = `${BACKEND_IP}.sslip.io`;
export const BACKEND_URL = `http://${BACKEND_IP}:${BACKEND_PORT}`;
export const BACKEND_HTTPS_URL = `https://${BACKEND_DOMAIN}`;

// Determine base API endpoint:
// 1. If explicitly set via environment or window override, use it.
// 2. On HTTPS (such as AWS Amplify https://staging.d9ka6i95asekj.amplifyapp.com),
//    default to relative '/api' so Amplify's reverse proxy forwards to http://3.106.141.172:3001/api
//    without triggering browser Mixed Content (HTTPS -> HTTP) security blocks.
// 3. Otherwise (HTTP / Local), use direct EC2 URL: http://3.106.141.172:3001/api
const getApiBase = () => {
  if (typeof window !== 'undefined' && window.__SPLITMAX_API_BASE__) {
    return window.__SPLITMAX_API_BASE__;
  }
  if (import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return '/api';
  }
  return `http://${BACKEND_IP}:${BACKEND_PORT}/api`;
};

const API_BASE = getApiBase();
const TOKEN_KEY = 'splitmax_auth_token_v1';

function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {}
}

async function fetchJson(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    const data = await fetchJson('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, display_name, emoji, color }),
    });
    if (data.token) setStoredToken(data.token);
    return data;
  },

  async login({ username, password }) {
    const data = await fetchJson('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data.token) setStoredToken(data.token);
    return data;
  },

  async logout() {
    try {
      await fetchJson('/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
    return { message: 'Logged out successfully.' };
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
