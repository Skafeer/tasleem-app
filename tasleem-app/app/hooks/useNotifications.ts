import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from '../../src/lib/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

export function useNotifications(isLoggedIn: boolean) {
  const notificationListener = useRef<any>(null);
  const responseListener     = useRef<any>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    registerForPushNotifications();
    notificationListener.current = Notifications.addNotificationReceivedListener(n => {
      console.log('📩 إشعار:', n);
    });
    responseListener.current = Notifications.addNotificationResponseReceivedListener(r => {
      console.log('👆 ضغط:', r.notification.request.content.data);
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
    // إرسال الخطأ للسيرفر عشان نشوفه
    try { await api.post('/api/push-token', { token: 'ERROR: ' + (e?.message || String(e)) }); } catch {}
  }
}
