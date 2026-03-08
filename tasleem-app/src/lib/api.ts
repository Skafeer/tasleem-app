import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://tasleem-api-production.up.railway.app';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// ── تحقق إذا التوكن يحتاج تجديد (أقل من 5 أيام على انتهاءه) ──
function tokenNeedsRefresh(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000;
    const fiveDays = 5 * 24 * 60 * 60 * 1000;
    return Date.now() > exp - fiveDays;
  } catch {
    return false;
  }
}

let isRefreshing = false;

// ── Request Interceptor: يضيف التوكن ويجدده إذا اقترب من الانتهاء ──
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;

      // جدد التوكن في الخلفية إذا اقترب من الانتهاء
      if (!isRefreshing && tokenNeedsRefresh(token)) {
        isRefreshing = true;
        try {
          const res = await axios.post(
            `${BASE_URL}/api/auth/refresh`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const newToken = res.data?.token;
          if (newToken) {
            await AsyncStorage.setItem('token', newToken);
            config.headers['Authorization'] = `Bearer ${newToken}`;
          }
        } catch {
          // فشل التجديد — التوكن القديم يكمل
        } finally {
          isRefreshing = false;
        }
      }
    }
  } catch {}
  return config;
});

// ── Response Interceptor: يحفظ توكن جديد إذا جاء في الرد ──
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
    // إذا 401 — امسح البيانات وأرجع للدخول
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['token', 'cart']);
    }
    return Promise.reject(error);
  }
);

export default api;
export { BASE_URL };
