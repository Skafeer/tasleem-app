import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, SplashScreen } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nManager, Platform, StatusBar, Text, TextInput } from 'react-native';
import { ToastProvider } from '../src/lib/toast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../src/lib/api';
import { useNotifications } from './hooks/useNotifications';
import { useFonts } from 'expo-font';
import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
  Cairo_900Black,
} from '@expo-google-fonts/cairo';

SplashScreen.preventAutoHideAsync();

if (Platform.OS !== 'web') {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

// ✅ تطبيق Cairo على كل النصوص تلقائياً
const DEFAULT_FONT = 'Cairo_400Regular';
const OLD_TEXT_RENDER = (Text as any).render;
if (OLD_TEXT_RENDER) {
  const applyDefaultProps = (props: any) => ({
    ...props,
    style: [{ fontFamily: DEFAULT_FONT }, ...(Array.isArray(props.style) ? props.style : [props.style])],
  });
  // نستخدم defaultProps بدلاً من override
}
// الطريقة الأضمن في React Native:
(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.style = { fontFamily: 'Cairo_400Regular' };
(TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
(TextInput as any).defaultProps.style = { fontFamily: 'Cairo_400Regular' };

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useNotifications(isLoggedIn);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const inAuth = segments[0] === 'auth';
      
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setIsLoggedIn(true);
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
  const [fontsLoaded, fontError] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_800ExtraBold,
    Cairo_900Black,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // لا نخفي الـ splash هنا — AuthGuard يتكفل بذلك
    }
  }, [fontsLoaded, fontError]);

  // انتظر تحميل الخط قبل عرض أي شيء
  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthGuard>
          <StatusBar backgroundColor="transparent" translucent={true} barStyle="dark-content" />
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
