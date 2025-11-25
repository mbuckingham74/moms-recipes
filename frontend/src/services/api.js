import axios from 'axios';

// Use environment variable for API base URL, fallback to proxy path for dev
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Handler for auth expiration - set by AuthContext
let authExpiredHandler = null;

export const setAuthExpiredHandler = (handler) => {
  authExpiredHandler = handler;
};

// CSRF token cache
let csrfToken = null;
let csrfTokenPromise = null;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies
});

// Fetch CSRF token (with deduplication to prevent multiple simultaneous requests)
const fetchCsrfToken = async () => {
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }
  csrfTokenPromise = axios.get(`${API_BASE_URL}/csrf-token`, { withCredentials: true })
    .then(response => {
      csrfToken = response.data.csrfToken;
      csrfTokenPromise = null;
      return csrfToken;
    })
    .catch(err => {
      csrfTokenPromise = null;
      throw err;
    });
  return csrfTokenPromise;
};

// Request interceptor to handle FormData and CSRF tokens
api.interceptors.request.use(
  async (config) => {
    // If the data is FormData, remove Content-Type header to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    // Add CSRF token for mutating requests (POST, PUT, DELETE, PATCH)
    const mutatingMethods = ['post', 'put', 'delete', 'patch'];
    if (mutatingMethods.includes(config.method?.toLowerCase())) {
      // Fetch CSRF token if we don't have one
      if (!csrfToken) {
        try {
          await fetchCsrfToken();
        } catch (err) {
          console.error('Failed to fetch CSRF token:', err);
        }
      }
      if (csrfToken) {
        config.headers['x-csrf-token'] = csrfToken;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Recipe endpoints
export const recipeAPI = {
  // Get all recipes with pagination
  getAll: (params = {}, config = {}) => {
    return api.get('/recipes', { params, ...config });
  },

  // Get recipe by ID
  getById: (id, config = {}) => {
    return api.get(`/recipes/${id}`, config);
  },

  // Search recipes
  search: (params, config = {}) => {
    return api.get('/recipes/search', { params, ...config });
  },

  // Create recipe
  create: (recipeData, config = {}) => {
    return api.post('/recipes', recipeData, config);
  },

  // Update recipe
  update: (id, recipeData, config = {}) => {
    return api.put(`/recipes/${id}`, recipeData, config);
  },

  // Delete recipe
  delete: (id, config = {}) => {
    return api.delete(`/recipes/${id}`, config);
  },

  // Get all tags
  getTags: (config = {}) => {
    return api.get('/tags', config);
  },

  // Estimate calories for a recipe
  estimateCalories: (id, config = {}) => {
    return api.post(`/recipes/${id}/estimate-calories`, {}, config);
  },

  // Get images for a recipe
  getImages: (id, config = {}) => {
    return api.get(`/recipes/${id}/images`, config);
  },

  // Upload images for a recipe
  uploadImages: (id, formData, config = {}) => {
    return api.post(`/recipes/${id}/images`, formData, config);
  },

  // Set hero image
  setHeroImage: (recipeId, imageId, config = {}) => {
    return api.put(`/recipes/${recipeId}/images/${imageId}/hero`, {}, config);
  },

  // Delete image
  deleteImage: (recipeId, imageId, config = {}) => {
    return api.delete(`/recipes/${recipeId}/images/${imageId}`, config);
  },

  // Reorder images
  reorderImages: (id, imageOrder, config = {}) => {
    return api.put(`/recipes/${id}/images/reorder`, { imageOrder }, config);
  },
};

// Handle errors globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 403 CSRF token invalid - refresh token and retry once
    if (error.response?.status === 403 &&
        error.response?.data?.error?.includes('CSRF') &&
        !originalRequest._csrfRetry) {
      originalRequest._csrfRetry = true;
      csrfToken = null; // Clear cached token
      try {
        await fetchCsrfToken();
        originalRequest.headers['x-csrf-token'] = csrfToken;
        return api(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    // Handle 401 Unauthorized - clear auth state globally
    if (error.response?.status === 401) {
      // Don't trigger auth expired for login attempts or auth check
      const isAuthEndpoint = error.config?.url?.includes('/auth/');
      if (!isAuthEndpoint && authExpiredHandler) {
        authExpiredHandler();
      }
    }
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
