import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://ai-prompt-genie--SAJAD66777.replit.app';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — add cookie for mobile
api.interceptors.request.use(async (config) => {
  try {
    const cookie = await AsyncStorage.getItem('session_cookie');
    if (cookie) {
      config.headers['Cookie'] = cookie;
    }
  } catch {}
  return config;
});

// Response interceptor — save cookie
api.interceptors.response.use(
  async (response) => {
    try {
      const setCookie = response.headers['set-cookie'];
      if (setCookie && setCookie.length > 0) {
        // Save full cookie string
        const cookieStr = Array.isArray(setCookie)
          ? setCookie.join('; ')
          : setCookie;
        await AsyncStorage.setItem('session_cookie', cookieStr);
      }
    } catch {}
    return response;
  },
  async (error) => {
    // If 401 — clear session and redirect
    if (error.response?.status === 401) {
      try {
        await AsyncStorage.removeItem('session_cookie');
        await AsyncStorage.removeItem('cart');
      } catch {}
    }
    return Promise.reject(error);
  }
);

export default api;
export { BASE_URL };
