import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
const BASE_URL = 'https://your-backend-url.com';
const api = axios.create({ baseURL: BASE_URL, timeout: 10000 });
api.interceptors.request.use(async (config) => {
  const cookie = await AsyncStorage.getItem('session_cookie');
  if (cookie) config.headers['Cookie'] = cookie;
  return config;
});
api.interceptors.response.use(async (response) => {
  const setCookie = response.headers['set-cookie'];
  if (setCookie) await AsyncStorage.setItem('session_cookie', setCookie[0]);
  return response;
});
export default api;
export { BASE_URL };
