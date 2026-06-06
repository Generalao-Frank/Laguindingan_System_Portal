import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const apiClient = axios.create({
  baseURL: 'http://192.168.1.64:8000/api', // Palitan ng IP ng server mo
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000,
});

// Storage keys
const STORAGE_KEYS = {
  USER_TOKEN: 'userToken',
  API_KEY: 'apiKey',
  USER_ROLE: 'userRole',
  USER_DATA: 'userData',
};

/**
 * Get or fetch API key
 * - First check AsyncStorage
 * - If not found, fetch from server
 */
const getApiKey = async (): Promise<string> => {
  try {
    // Check if API key exists in storage
    const apiKey = await AsyncStorage.getItem(STORAGE_KEYS.API_KEY);
    
    if (apiKey && apiKey !== null) {
      return apiKey;
    }
    
    // Fetch from server (public endpoint, no auth needed)
    console.log('Fetching API key from server...');
    const response = await axios.get('http://192.168.1.64:8000/api/mobile-config');
    if (response.data && response.data.api_key) {
      const newApiKey = response.data.api_key;
      await AsyncStorage.setItem(STORAGE_KEYS.API_KEY, newApiKey);
      console.log('API key fetched and stored');
      return newApiKey;
    }
    
    // Fallback - should never happen, but just in case
    return '';
  } catch (error) {
    console.log('Error getting API key:', error);
    return '';
  }
};

// Request interceptor - attach token and API key to every request
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // 1. Attach Bearer Token for authentication
      const token = await AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN);
      if (token && token !== null) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // 2. Attach API Key for mobile app identification
      const apiKey = await getApiKey();
      if (apiKey && apiKey !== '') {
        config.headers['X-API-Key'] = apiKey;
      }
      
      return config;
    } catch (error) {
      console.log('Interceptor error:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for debugging and error handling
apiClient.interceptors.response.use(
  (response) => {
    // console.log('API Success:', response.config.url, response.status);
    return response;
  },
  async (error) => {
    console.log('API Error:', error.response?.status, error.response?.config?.url);
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      console.log('Unauthorized - clearing storage');
      
      // Check if it's an API key issue vs token issue
      const errorMessage = error.response?.data?.message || '';
      
      if (errorMessage.includes('API key') || errorMessage.includes('X-API-Key')) {
        // API key is invalid - clear it and try to get new one on next request
        await AsyncStorage.removeItem(STORAGE_KEYS.API_KEY);
        console.log('API key invalid - removed from storage');
      } else {
        // Token is invalid - clear all user data
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.USER_TOKEN,
          STORAGE_KEYS.USER_ROLE,
          STORAGE_KEYS.USER_DATA,
        ]);
      }
    }
    
    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.log('Forbidden - invalid API key or insufficient permissions');
      // Optionally clear API key to force refresh
      await AsyncStorage.removeItem(STORAGE_KEYS.API_KEY);
    }
    
    return Promise.reject(error);
  }
);

// Helper function to manually refresh API key (call after admin regenerates key)
export const refreshApiKey = async (): Promise<boolean> => {
  try {
    // Clear existing API key
    await AsyncStorage.removeItem(STORAGE_KEYS.API_KEY);
    // Fetch new one
    const newApiKey = await getApiKey();
    return newApiKey !== '';
  } catch (error) {
    console.log('Error refreshing API key:', error);
    return false;
  }
};

// Helper function to get current API key (for debugging)
export const getCurrentApiKey = async (): Promise<string | null> => {
  try {
    const apiKey = await AsyncStorage.getItem(STORAGE_KEYS.API_KEY);
    return apiKey;
  } catch (error) {
    return null;
  }
};


export default apiClient;