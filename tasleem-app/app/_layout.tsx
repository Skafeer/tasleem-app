import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { I18nManager, Platform } from 'react-native';
import { ToastProvider } from '../src/lib/toast';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Force RTL
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

  const { data: token, isLoading } = useQuery({
    queryKey: ['auth-token'],
    queryFn: async () => {
      const t = await AsyncStorage.getItem('token');
      return t;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (isLoading) return;
    
    const inAuth = segments[0] === 'auth';
    
    // إذا ما في توكن ومو في صفحة اللوجن → روح للوجن
    if (!token && !inAuth) {
      router.replace('/auth');
    }
    // إذا في توكن وفي صفحة اللوجن → روح للرئيسية
    else if (token && inAuth) {
      router.replace('/(tabs)');
    }
  }, [token, isLoading, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthGuard>
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_left' }}>
            <Stack.Screen name="auth" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="cart" />
            <Stack.Screen name="products/[id]" />
            <Stack.Screen name="order-details/[id]" />
            <Stack.Screen name="withdraw-history/index" />
            <Stack.Screen name="stats/index" />
            <Stack.Screen name="profile-edit/index" />
            <Stack.Screen name="contact/index" />
            <Stack.Screen name="privacy/index" />
          </Stack>
        </AuthGuard>
      </ToastProvider>
    </QueryClientProvider>
  );
}
