import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const apiClient = axios.create({
  baseURL: 'http://10.0.0.79:8000/api', // Palitan ng IP ng server mo
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor - mag-attach ng token sa bawat request
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
    //  console.log('Interceptor - Token found:', token ? 'Yes' : 'No'); 
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.log('Interceptor - No token found!');
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

// Response interceptor for debugging
// apiClient.interceptors.response.use(
//   (response) => {
//   //  console.log('API Success:', response.config.url, response.status); 
//     return response;
//   },
//   (error) => {
//     // console.log('API Error:', error.response?.status, error.response?.config?.url);
//     if (error.response?.status === 401) {
//       console.log('Unauthorized - clearing storage');
//       AsyncStorage.clear();
//     }
//     return Promise.reject(error);
//   }
// );

export default apiClient;