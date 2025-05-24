// Frontend/src/utils/api.js - MODIFIED VERSION (keeps your existing structure)
import apiClient from "../api/apiClient";

// Re-export the configured API client
export default apiClient;

// Enhanced API methods with better endpoint matching
export const api = {
  // Auth methods
  auth: {
    firebaseAuth: (token) => apiClient.post('/auth/firebase-auth', { token }),
    getCurrentUser: () => apiClient.get('/auth/me'),
    updateProfile: (data) => apiClient.put('/auth/me', data),
  },
  
  // Accounts methods
  accounts: {
    getConnected: () => apiClient.get('/accounts/'),
    disconnect: (accountId) => apiClient.delete(`/accounts/${accountId}`),
  },
  
  // Campaigns methods - FIXED to match your backend endpoints
  campaigns: {
    getAll: () => apiClient.get('/campaign-schedules/get-campaigns'), // FIXED endpoint
    getById: (id) => apiClient.get(`/campaign-schedules/get-campaign/${id}`), // FIXED endpoint
    create: (data) => apiClient.post('/campaign-schedules/campaigns', data), // FIXED endpoint
    update: (id, data) => apiClient.put(`/campaign-schedules/campaigns/${id}`, data), // FIXED endpoint
    delete: (id) => apiClient.delete(`/campaign-schedules/delete-campaign/${id}`), // FIXED endpoint
    generateContent: (id) => apiClient.post(`/campaign-schedules/generate-content/${id}`), // ADDED
    
    // Legacy endpoint for campaign planner (if still needed)
    planCampaign: (data) => apiClient.post('/campaign-planner/plan-campaign/', data),
  },
  
  // Posts methods
  posts: {
    getScheduled: () => apiClient.get('/scheduled-posts'),
    getStats: () => apiClient.get('/scheduled-posts-stats/'),
    create: (data) => apiClient.post('/scheduled-posts', data),
    update: (id, data) => apiClient.put(`/scheduled-posts/${id}`, data),
    delete: (id) => apiClient.delete(`/scheduled-posts/${id}`),
    postNow: (data) => apiClient.post('/post-now/', data), // ADDED
  },
  
  // LinkedIn methods
  linkedin: {
    getAuthUrl: () => apiClient.get('/linkedin/auth-url'),
    callback: (code, state) => apiClient.post('/linkedin/callback', { code, state }),
  },
  
  // Content generation
  content: {
    generateCaption: (data) => apiClient.post('/generate-caption/', data),
    generateImage: (data) => apiClient.post('/generate-image/', data),
  },
  
  // Drafts
  drafts: {
    getAll: () => apiClient.get('/drafts/'),
    create: (data) => apiClient.post('/drafts/', data),
    update: (id, data) => apiClient.put(`/drafts/${id}`, data),
    delete: (id) => apiClient.delete(`/drafts/${id}`),
  }
};

// Helper function to handle API errors consistently
export const handleApiError = (error, defaultMessage = 'An error occurred') => {
  console.error('API Error:', error);
  
  if (error.response) {
    // Server responded with error status
    const message = error.response.data?.detail || 
                   error.response.data?.message || 
                   error.response.statusText || 
                   defaultMessage;
    return { error: true, message, status: error.response.status };
  } else if (error.request) {
    // Network error
    return { error: true, message: 'Network error. Please check your connection.', status: 0 };
  } else {
    // Other error
    return { error: true, message: error.message || defaultMessage, status: -1 };
  }
};

// Helper function for campaign-related API calls with proper error handling
export const campaignApi = {
  async getAll() {
    try {
      const response = await api.campaigns.getAll();
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error, 'Failed to fetch campaigns');
    }
  },
  
  async getById(id) {
    try {
      const response = await api.campaigns.getById(id);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error, 'Failed to fetch campaign');
    }
  },
  
  async create(data) {
    try {
      const response = await api.campaigns.create(data);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error, 'Failed to create campaign');
    }
  },
  
  async update(id, data) {
    try {
      const response = await api.campaigns.update(id, data);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error, 'Failed to update campaign');
    }
  },
  
  async delete(id) {
    try {
      const response = await api.campaigns.delete(id);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error, 'Failed to delete campaign');
    }
  },
  
  async generateContent(id) {
    try {
      const response = await api.campaigns.generateContent(id);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error, 'Failed to generate content');
    }
  }
};