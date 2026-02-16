import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://ai-prompt-genie--SAJAD66777.replit.app';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Request — أضف connect.sid
api.interceptors.request.use(async (config) => {
  try {
    const sid = await AsyncStorage.getItem('connect.sid');
    if (sid) {
      config.headers['Cookie'] = `connect.sid=${sid}`;
    }
  } catch {}
  return config;
});

// Response — احفظ connect.sid فقط
api.interceptors.response.use(
  async (response) => {
    try {
      const setCookies = response.headers['set-cookie'];
      if (setCookies) {
        const cookies = Array.isArray(setCookies) ? setCookies : [setCookies];
        for (const cookie of cookies) {
          const match = cookie.match(/connect\.sid=([^;]+)/);
          if (match) {
            await AsyncStorage.setItem('connect.sid', match[1]);
          }
        }
      }
    } catch {}
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await AsyncStorage.removeItem('connect.sid');
        await AsyncStorage.removeItem('cart');
      } catch {}
    }
    return Promise.reject(error);
  }
);

export default api;
export { BASE_URL };
