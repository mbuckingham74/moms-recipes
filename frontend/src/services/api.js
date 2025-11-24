import axios from 'axios';

// Use environment variable for API base URL, fallback to proxy path for dev
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies
});

// Request interceptor to handle FormData properly
api.interceptors.request.use(
  (config) => {
    // If the data is FormData, remove Content-Type header to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
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
};

// Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
