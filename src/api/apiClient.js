// Frontend/src/api/apiClient.js - ENHANCED VERSION
import axios from "axios";
import { auth } from "../firebase/config";

const apiClient = axios.create({
  baseURL: "http://localhost:8000/api", // Changed from 127.0.0.1 to localhost
  timeout: 120000, // Increased timeout to 2 minutes for AI-powered operations
  headers: {
    'Content-Type': 'application/json',
  }
});

// Track if we're currently refreshing the token to prevent multiple refreshes
let isRefreshingToken = false;
// Store pending requests that are waiting for token refresh
let pendingRequests = [];

// Helper function to resolve pending requests
const resolvePendingRequests = (token) => {
  pendingRequests.forEach(request => {
    request.config.headers.Authorization = `Bearer ${token}`;
    request.resolver(apiClient(request.config));
  });
  pendingRequests = [];
};

// Request interceptor to add authentication token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Get current user from Firebase
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        // Only force refresh if it's been more than 10 minutes since last refresh
        // This reduces unnecessary token refreshes
        const forceRefresh = !currentUser.metadata || 
          (Date.now() - (currentUser.metadata.lastTokenRefresh || 0) > 10 * 60 * 1000);
        
        // Get token (force refresh only when needed)
        const token = await currentUser.getIdToken(forceRefresh);
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log("🔑 Added auth token to request:", config.url);
          
          // Store last refresh time for optimization
          if (forceRefresh && currentUser.metadata) {
            currentUser.metadata.lastTokenRefresh = Date.now();
          }
        }
      } else {
        console.log("⚠️ No authenticated user for request:", config.url);
        
        // Only redirect to login if we're not already on the auth page and not a public endpoint
        if (!config.url.includes('/auth') && !window.location.pathname.includes('/auth')) {
          // Check if this is a public endpoint that doesn't need authentication
          const publicEndpoints = [
            '/linkedin/auth-url', 
            '/auth/firebase-auth',
            '/linkedin/callback'
          ];
          const isPublicEndpoint = publicEndpoints.some(endpoint => config.url.includes(endpoint));
          
          if (!isPublicEndpoint) {
            console.log("Storing current path for redirect after login");
            sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
          }
        }
      }
    } catch (error) {
      console.error("❌ Error getting auth token:", error);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // If we get a 401 and haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Check if this is a public endpoint that doesn't need authentication
      const publicEndpoints = ['/linkedin/auth-url', '/auth/firebase-auth'];
      const isPublicEndpoint = publicEndpoints.some(endpoint => originalRequest.url.includes(endpoint));
      
      if (isPublicEndpoint) {
        // Don't try to refresh token for public endpoints
        return Promise.reject(error);
      }
      
      // If we're already refreshing a token, queue this request
      if (isRefreshingToken) {
        console.log(`Request to ${originalRequest.url} is waiting for token refresh`);
        return new Promise((resolve, reject) => {
          pendingRequests.push({
            config: originalRequest,
            resolver: resolve,
            rejecter: reject
          });
        });
      }
      
      isRefreshingToken = true;
      
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          console.log("Attempting to refresh token and retry request...");
          // Force refresh the token
          const newToken = await currentUser.getIdToken(true);
          
          // Update current request
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          
          // Update any pending requests
          if (pendingRequests.length > 0) {
            console.log(`Resolving ${pendingRequests.length} pending requests with new token`);
            resolvePendingRequests(newToken);
          }
          
          // Store last refresh time for optimization
          if (currentUser.metadata) {
            currentUser.metadata.lastTokenRefresh = Date.now();
          }
          
          // Retry the original request
          return apiClient(originalRequest);
        } else {
          console.log("No current user found when trying to refresh token");
          // Only redirect to login if we're not already on the auth page
          if (!window.location.pathname.includes('/auth')) {
            console.log("Redirecting to auth page due to 401 with no current user");
            // Store the current URL to redirect back after login
            sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
            // Check if we're in the middle of a LinkedIn flow
            const isLinkedInFlow = window.location.pathname.includes('/social-dashboard') && 
                                 (window.location.search.includes('linkedin_connected') || 
                                  window.location.search.includes('code='));
            
            if (isLinkedInFlow) {
              console.log("LinkedIn flow detected, saving additional state");
              // Save any LinkedIn state or code in the URL
              const urlParams = new URLSearchParams(window.location.search);
              const state = urlParams.get('state');
              const code = urlParams.get('code');
              
              if (state) sessionStorage.setItem('pendingLinkedInState', state);
              if (code) sessionStorage.setItem('pendingLinkedInCode', code);
            }
            
            window.location.href = '/auth';
          }
        }
      } catch (refreshError) {
        console.error("❌ Token refresh failed:", refreshError);
        // Only redirect to login if we're not already on the auth page
        if (!window.location.pathname.includes('/auth')) {
          console.log("Redirecting to auth page due to token refresh failure");
          // Store the current URL to redirect back after login
          sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
          
          // Check if we're in the middle of a LinkedIn flow
          const isLinkedInFlow = window.location.pathname.includes('/social-dashboard') && 
                               (window.location.search.includes('linkedin_connected') || 
                                window.location.search.includes('code='));
          
          if (isLinkedInFlow) {
            console.log("LinkedIn flow detected during token refresh failure, saving additional state");
            // Save any LinkedIn state or code in the URL
            const urlParams = new URLSearchParams(window.location.search);
            const state = urlParams.get('state');
            const code = urlParams.get('code');
            
            if (state) sessionStorage.setItem('pendingLinkedInState', state);
            if (code) sessionStorage.setItem('pendingLinkedInCode', code);
          }
          
          window.location.href = '/auth';
        }
      } finally {
        isRefreshingToken = false;
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;