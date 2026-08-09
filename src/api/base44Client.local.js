/**
 * Drop-in replacement for the Base44 SDK client.
 * Exposes the same API surface (entities, functions, integrations, auth)
 * but routes all calls to the local Express backend at /api.
 */

const API_BASE = '/api';
const TOKEN_KEY = 'base44_access_token';

function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY) || null;
}

function setToken(token) {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = text;
  }

  if (!response.ok) {
    const err = new Error(data?.message || `Request failed: ${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

function uploadFile(file) {
  return apiRequest('/files/upload', {
    method: 'POST',
    headers: {},
    body: (() => {
      const formData = new FormData();
      formData.append('file', file);
      return formData;
    })(),
  });
}

// We need a custom fetch wrapper for FormData uploads (no JSON content-type)
async function apiRequestFormData(path, formData) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = text; }

  if (!response.ok) {
    const err = new Error(data?.message || `Upload failed: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data;
}

// Entity factory — creates an object with list, get, create, update, delete, etc.
function createEntity(entityType) {
  // Convert entityType to the URL-friendly form (PascalCase -> lowercase)
  const typeKey = entityType;

  return {
    async list(sort = '-created_date', limit = 100) {
      return apiRequest(`/entities/${typeKey}/list`, {
        method: 'POST',
        body: JSON.stringify({ sort, limit }),
      });
    },

    async get(id) {
      return apiRequest(`/entities/${typeKey}/${id}`);
    },

    async create(data) {
      return apiRequest(`/entities/${typeKey}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(id, patch) {
      return apiRequest(`/entities/${typeKey}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
    },

    async delete(id) {
      return apiRequest(`/entities/${typeKey}/${id}`, {
        method: 'DELETE',
      });
    },

    async bulkCreate(items) {
      return apiRequest(`/entities/${typeKey}/bulk-create`, {
        method: 'POST',
        body: JSON.stringify(Array.isArray(items) ? items : { items }),
      });
    },

    async bulkUpdate(filter, set) {
      return apiRequest(`/entities/${typeKey}/bulk-update`, {
        method: 'POST',
        body: JSON.stringify({ filter, set }),
      });
    },

    async updateMany(filter, set) {
      return apiRequest(`/entities/${typeKey}/bulk-update`, {
        method: 'POST',
        body: JSON.stringify({ filter, set }),
      });
    },

    async deleteMany(filter) {
      return apiRequest(`/entities/${typeKey}/delete-many`, {
        method: 'POST',
        body: JSON.stringify({ filter }),
      });
    },

    async filter(filterObj, sort = '-created_date', limit = 100) {
      return apiRequest(`/entities/${typeKey}/filter`, {
        method: 'POST',
        body: JSON.stringify({ filter: filterObj, sort, limit }),
      });
    },

    subscribe(callback) {
      // No-op in local mode — call callback once with empty array
      // Real-time subscriptions aren't supported without Base44's WebSocket layer
      setTimeout(() => callback([]), 0);
      return { unsubscribe: () => {} };
    },
  };
}

// Entity proxy — dynamically creates entity objects for any name
const entitiesProxy = new Proxy({}, {
  get(_, entityType) {
    if (typeof entityType !== 'string') return undefined;
    return createEntity(entityType);
  },
});

// Functions
const functions = {
  async invoke(name, args) {
    return apiRequest(`/functions/invoke/${name}`, {
      method: 'POST',
      body: JSON.stringify({ args }),
    });
  },
};

// Integrations
const integrations = {
  Core: {
    async InvokeLLM({ prompt, response_json_schema, file_urls }) {
      return apiRequest('/integrations/core/invoke-llm', {
        method: 'POST',
        body: JSON.stringify({ prompt, response_json_schema, file_urls }),
      });
    },

    async UploadFile({ file }) {
      const formData = new FormData();
      formData.append('file', file);
      return apiRequestFormData('/files/upload', formData);
    },

    async ExtractDataFromUploadedFile({ file_url, extraction_prompt }) {
      return apiRequest('/integrations/core/extract-data-from-file', {
        method: 'POST',
        body: JSON.stringify({ file_url, extraction_prompt }),
      });
    },
  },
};

// Auth
const auth = {
  async me() {
    return apiRequest('/auth/me');
  },

  async isAuthenticated() {
    try {
      const token = getToken();
      if (!token) return false;
      await apiRequest('/auth/is-authenticated');
      return true;
    } catch {
      return false;
    }
  },

  async loginViaEmailPassword(email, password) {
    const result = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (result.access_token) setToken(result.access_token);
    return result;
  },

  async loginWithProvider(provider, returnUrl) {
    // Local mode doesn't support OAuth — redirect to login page
    console.warn(`[auth] OAuth provider '${provider}' not supported in local mode. Use email/password.`);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  async register({ email, password }) {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async verifyOtp({ email, otpCode }) {
    const result = await apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otpCode }),
    });
    if (result.access_token) setToken(result.access_token);
    return result;
  },

  async resendOtp(email) {
    return apiRequest('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async logout(returnUrl) {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore errors
    }
    setToken(null);
    if (returnUrl && typeof window !== 'undefined') {
      window.location.href = returnUrl;
    }
  },

  async redirectToLogin(returnUrl) {
    if (typeof window !== 'undefined') {
      const url = returnUrl ? `/login?returnTo=${encodeURIComponent(returnUrl)}` : '/login';
      window.location.href = url;
    }
  },

  setToken,

  async updateMe(patch) {
    return apiRequest('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  async resetPasswordRequest(email) {
    return apiRequest('/auth/reset-password-request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword({ email, password }) {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
};

export const base44 = {
  entities: entitiesProxy,
  functions,
  integrations,
  auth,
};

export { getToken, setToken };
