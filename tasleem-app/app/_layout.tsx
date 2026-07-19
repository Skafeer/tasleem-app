// tasleem-app/app/_layout.tsx
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, SplashScreen } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nManager, Platform, StatusBar, Text, TextInput } from 'react-native';
import { ToastProvider } from '../src/lib/toast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../src/lib/api';
import { useNotifications } from './hooks/useNotifications';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
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

  // ── دالة التنقل من الإشعار ──
  const handleNotificationPress = (data: any) => {
    if (!data) return;

    const { type, id } = data;
    if (!id) {
      console.warn('الإشعار لا يحتوي على معرف (id)');
      return;
    }

    console.log(`🔔 التنقل إلى ${type} برقم ${id}`);

    // هنا يمكنك إضافة التحقق من المسار الحالي لتجنب التكرار
    // لكننا سننقل مباشرة
    switch (type) {
      case 'order':
        router.push(`/order-details/${id}`);
        break;
      case 'product':
        router.push(`/products/${id}`);
        break;
      case 'merchant':
        router.push(`/admin/merchant/${id}`);
        break;
      case 'chat':
        router.push(`/chat/${id}`);
        break;
      // أضف أي حالات أخرى حسب تطبيقك
      default:
        console.warn(`نوع الإشعار غير معروف: ${type}`);
        // يمكن توجيه المستخدم إلى الصفحة الرئيسية أو عرض تنبيه
        router.push('/(tabs)');
    }
  };

  // ── استخدام هوك الإشعارات مع تمرير دالة المعالجة ──
  useNotifications(isLoggedIn, handleNotificationPress);

  // ── التحقق من الإشعار الأولي عند فتح التطبيق (من الخلفية) ──
  useEffect(() => {
    const checkInitialNotification = async () => {
      if (!isLoggedIn) return;
      try {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response?.notification?.request?.content?.data) {
          const data = response.notification.request.content.data;
          console.log('📲 إشعار أولي عند فتح التطبيق:', data);
          // تأخير بسيط لضمان تهيئة الملاح
          setTimeout(() => {
            handleNotificationPress(data);
          }, 500);
        }
      } catch (error) {
        console.error('خطأ في جلب الإشعار الأولي:', error);
      }
    };

    if (isReady && isLoggedIn) {
      checkInitialNotification();
    }
  }, [isReady, isLoggedIn]);

  // ── التحقق من حالة المصادقة ──
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
            {/* أضف أي شاشات أخرى مثل order-details, admin/merchant, chat... */}
            <Stack.Screen name="order-details/[id]" />
            <Stack.Screen name="admin/merchant/[id]" />
            <Stack.Screen name="chat/[id]" />
          </Stack>
        </AuthGuard>
      </ToastProvider>
    </QueryClientProvider>
  );
}