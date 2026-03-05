import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
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
    if (!Device.isDevice) return;
    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    if (final !== 'granted') return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0c6679',
      });
    }
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '46e2ebf7-2473-485d-8334-4ce2a12e4e53',
    });
    await api.post('/api/push-token', { token: token.data });
    console.log('✅ Token:', token.data);
  } catch (e) {
    console.log('Push error:', e);
  }
}
