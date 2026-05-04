import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nManager, Platform, StatusBar } from 'react-native';
import { ToastProvider } from '../src/lib/toast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../src/lib/api';
import { useNotifications } from './hooks/useNotifications';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';

// منع إخفاء شاشة التحميل تلقائياً
SplashScreen.preventAutoHideAsync();

if (Platform.OS !== 'web') {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // تمرير حالة تسجيل الدخول للهوك كما يتطلب مشروعك
  useNotifications(isLoggedIn);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const inAuth = segments[0] === 'auth';

      if (token) {
        setIsLoggedIn(true);
        const res = await api.post('/api/auth/verify');
        if (res.status !== 200) {
          await AsyncStorage.removeItem('token');
          setIsLoggedIn(false);
          router.replace('/auth');
        } else if (inAuth) {
          router.replace('/(tabs)');
        }
      } else if (!inAuth) {
        setIsLoggedIn(false);
        router.replace('/auth');
      }
    } catch (error) {
      console.error('Auth error:', error);
      router.replace('/auth');
    }
  };

  return <>{children}</>;
}

export default function RootLayout() {
  // ✅ تحميل الأيقونات والخطوط يدوياً لضمان ظهورها في نسخة الـ Build
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // إخفاء شاشة التحميل بمجرد جاهزية الخطوط
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // إذا لم يتم تحميل الخطوط بعد، لا تعرض شيئاً (ستبقى شاشة التحميل ظاهرة)
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthGuard>
          <StatusBar barStyle="dark-content" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
          </Stack>
        </AuthGuard>
      </ToastProvider>
    </QueryClientProvider>
  );
}
