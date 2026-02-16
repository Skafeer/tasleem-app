import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://tasleem-api-production.up.railway.app';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  try {
    const sid = await AsyncStorage.getItem('sessionId');
    if (sid) {
      config.headers['Cookie'] = `connect.sid=${sid}`;
      config.headers['x-session-id'] = sid;
    }
  } catch {}
  return config;
});

api.interceptors.response.use(
  async (response) => {
    try {
      // Save sessionId from response body
      if (response.data?.sessionId) {
        await AsyncStorage.setItem('sessionId', response.data.sessionId);
      }
      // Also try from cookies
      const setCookies = response.headers['set-cookie'];
      if (setCookies) {
        const cookies = Array.isArray(setCookies) ? setCookies : [setCookies];
        for (const cookie of cookies) {
          const match = cookie.match(/connect\.sid=([^;]+)/);
          if (match) await AsyncStorage.setItem('sessionId', match[1]);
        }
      }
    } catch {}
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['sessionId', 'cart']);
    }
    return Promise.reject(error);
  }
);

export default api;
export { BASE_URL };
