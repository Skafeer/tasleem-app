import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, SplashScreen } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nManager, Platform } from 'react-native';
import { ToastProvider } from '../src/lib/toast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../src/lib/api';

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
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const inAuth = segments[0] === 'auth';
      
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        if (inAuth) {
          router.replace('/(tabs)');
        }
      } else {
        delete api.defaults.headers.common['Authorization'];
        if (!inAuth) {
          router.replace('/auth');
        }
      }
    } catch (e) {
      console.error('Auth check error:', e);
      router.replace('/auth');
    } finally {
      setIsReady(true);
      SplashScreen.hideAsync();
    }
  };

  if (!isReady) return null;

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthGuard>
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="auth" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="cart" />
            <Stack.Screen name="products/[id]" />
          </Stack>
        </AuthGuard>
      </ToastProvider>
    </QueryClientProvider>
  );
}
