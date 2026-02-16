import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://tasleem-api-production.up.railway.app';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
  } catch {}
  return config;
});

api.interceptors.response.use(
  async (response) => {
    try {
      if (response.data?.token) {
        await AsyncStorage.setItem('token', response.data.token);
      }
    } catch {}
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['token', 'cart']);
    }
    return Promise.reject(error);
  }
);

export default api;
export { BASE_URL };
