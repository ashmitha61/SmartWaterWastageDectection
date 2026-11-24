import axios from 'axios';

// API Base URL (Express Backend)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Response interceptor for consistent error extraction
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const customError = {
      message: error.response?.data?.message || error.message || 'Network request failed. Is the backend server running?',
      code: error.response?.data?.code || error.code,
      status: error.response?.status || 500,
      details: error.response?.data
    };
    return Promise.reject(customError);
  }
);

// Module API Services
export const api = {
  // Health
  checkHealth: () => apiClient.get('/health'),

  // Auth
  auth: {
    login: (credentials) => apiClient.post('/auth/login', credentials),
    register: (userData) => apiClient.post('/auth/register', userData),
    getDemoUsers: () => apiClient.get('/auth/demo-users'),
  },

  // Dashboard
  dashboard: {
    getStats: () => apiClient.get('/dashboard/stats'),
  },

  // Bins Management
  bins: {
    getAll: (params) => apiClient.get('/bins', { params }),
    getById: (id) => apiClient.get(`/bins/${id}`),
    create: (data) => apiClient.post('/bins', data),
    update: (id, data) => apiClient.put(`/bins/${id}`, data),
    delete: (id) => apiClient.delete(`/bins/${id}`),
  },

  // Locations Management
  locations: {
    getAll: (params) => apiClient.get('/locations', { params }),
    getById: (id) => apiClient.get(`/locations/${id}`),
    create: (data) => apiClient.post('/locations', data),
    update: (id, data) => apiClient.put(`/locations/${id}`, data),
    delete: (id) => apiClient.delete(`/locations/${id}`),
  },

  // Waste Categories
  categories: {
    getAll: (params) => apiClient.get('/categories', { params }),
    getById: (id) => apiClient.get(`/categories/${id}`),
    create: (data) => apiClient.post('/categories', data),
    update: (id, data) => apiClient.put(`/categories/${id}`, data),
    delete: (id) => apiClient.delete(`/categories/${id}`),
  },

  // Teams & Team Members
  teams: {
    getAll: (params) => apiClient.get('/teams', { params }),
    getById: (id) => apiClient.get(`/teams/${id}`),
    create: (data) => apiClient.post('/teams', data),
    update: (id, data) => apiClient.put(`/teams/${id}`, data),
    delete: (id) => apiClient.delete(`/teams/${id}`),
    getMembers: (teamId) => apiClient.get(`/teams/${teamId}/members`),
    addMember: (teamId, data) => apiClient.post(`/teams/${teamId}/members`, data),
    deleteMember: (memberId) => apiClient.delete(`/teams/members/${memberId}`),
  },

  // Collection Schedules
  schedules: {
    getAll: (params) => apiClient.get('/schedules', { params }),
    getById: (id) => apiClient.get(`/schedules/${id}`),
    create: (data) => apiClient.post('/schedules', data),
    update: (id, data) => apiClient.put(`/schedules/${id}`, data),
    delete: (id) => apiClient.delete(`/schedules/${id}`),
    getAvailableBins: (locationId) => apiClient.get(`/schedules/available-bins/${locationId}`),
  },

  // Collection Records
  records: {
    getAll: (params) => apiClient.get('/records', { params }),
    getById: (id) => apiClient.get(`/records/${id}`),
    create: (data) => apiClient.post('/records', data),
    delete: (id) => apiClient.delete(`/records/${id}`),
    getByBin: (binId) => apiClient.get(`/records/bin/${binId}`),
  },

  // Reports
  reports: {
    getAnalytics: () => apiClient.get('/reports/analytics'),
  },
};

export default api;
