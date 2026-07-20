import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../src/lib/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

export function useNotifications(isLoggedIn: boolean) {
  const router               = useRouter();
  const notificationListener = useRef<any>(null);
  const responseListener     = useRef<any>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    registerForPushNotifications();

    notificationListener.current = Notifications.addNotificationReceivedListener(n => {
      console.log('📩 إشعار:', n);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(r => {
      const data = r.notification.request.content.data as any;
      console.log('👆 ضغط:', data);

      // ── Deep Linking ──────────────────────────────────────────
      if (!data?.type) return;

      switch (data.type) {

        // طلب جديد أو تحديث حالة طلب → صفحة الطلبات
        case 'new_order':
        case 'order_status':
          if (data.orderId) {
            router.push(`/(tabs)/orders?orderId=${data.orderId}`);
          } else {
            router.push('/(tabs)/orders');
          }
          break;

        // تحديث حالة سحب → صفحة المحفظة
        case 'withdrawal_status':
          router.push('/(tabs)/wallet');
          break;

        // رسالة من الدعم → صفحة الدعم الفني
        case 'support_message':
          router.push('/(tabs)/support');
          break;

        // نفاد المخزون → صفحة المخزون (للأدمن)
        case 'stock_out':
          router.push('/(tabs)/admin?tab=inventory');
          break;

        // إشعار عام → صفحة الإشعارات
        case 'broadcast':
        default:
          router.push('/notification');
          break;
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isLoggedIn]);
}

async function registerForPushNotifications() {
  try {
    console.log('🔔 Starting push registration...');
    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    console.log('🔑 Permission status:', final);
    if (final !== 'granted') {
      console.log('❌ Permission not granted');
      return;
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0c6679',
      });
    }
    const fcmToken = await Notifications.getDevicePushTokenAsync();
    await api.post('/api/push-token', { token: fcmToken.data });
    console.log('✅ FCM Token:', fcmToken.data);
  } catch (e: any) {
    console.log('Push error:', e?.message || e);
    try { await api.post('/api/push-token', { token: 'ERROR: ' + (e?.message || String(e)) }); } catch {}
  }
}
