const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = RAW_API_URL.endsWith('/api') ? RAW_API_URL : `${RAW_API_URL}/api`;

async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers = {
    ...(options.headers || {}),
  };

  // Only add Content-Type: application/json if body is not FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Attach token if present in localStorage
  const token = localStorage.getItem('nexus_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    const contentType = response.headers.get('content-type');
    let data = null;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMessage = (data && (data.message || data.error)) || response.statusText || 'API Request Failed';
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.warn(`[API] Error on ${config.method || 'GET'} ${url}:`, error.message);
    throw error;
  }
}

export const api = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => {
    const isFormData = body instanceof FormData;
    return request(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
    });
  },
  put: (endpoint, body, options = {}) => {
    const isFormData = body instanceof FormData;
    return request(endpoint, {
      ...options,
      method: 'PUT',
      body: isFormData ? body : JSON.stringify(body),
    });
  },
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
};

export default api;
