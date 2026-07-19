// tasleem-app/app/hooks/useNotifications.ts
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from '../../src/lib/api';

// تعيين معالج الإشعارات
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// تعريف نوع دالة الاستجابة عند الضغط على الإشعار
type OnNotificationPress = (data: any) => void;

export function useNotifications(
  isLoggedIn: boolean,
  onNotificationPress?: OnNotificationPress // دالة اختيارية
) {
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      // إذا لم يكن المستخدم مسجلاً، لا نسجل للإشعارات
      return;
    }

    // تسجيل الجهاز للحصول على التوكن
    registerForPushNotifications();

    // مستمع الإشعارات أثناء التطبيق (عندما يكون مفتوحاً)
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('📩 إشعار وارد أثناء التشغيل:', notification);
      // يمكن هنا تحديث واجهة المستخدم أو عرض إشعار داخلي
      // لكننا لا نقوم بالتنقل تلقائياً عند الاستلام (ننتظر الضغط)
    });

    // مستمع عند الضغط على الإشعار (سواء التطبيق في الخلفية أو الأمامية)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log('👆 تم الضغط على الإشعار:', data);

      // إذا كانت هناك دالة ممررة، نستدعيها مع البيانات
      if (onNotificationPress) {
        onNotificationPress(data);
      } else {
        console.warn('لا توجد دالة لمعالجة الضغط على الإشعار');
      }
    });

    // تنظيف المستمعين عند فك التثبيت
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [isLoggedIn, onNotificationPress]); // إضافة onNotificationPress كاعتماد
}

// دالة تسجيل الجهاز للحصول على توكن الدفع
async function registerForPushNotifications() {
  try {
    console.log('🔔 جاري تسجيل الإشعارات...');
    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    console.log('🔑 حالة الصلاحية:', final);
    if (final !== 'granted') {
      console.log('❌ لم يتم منح الصلاحية');
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
    console.log('خطأ في الإشعارات:', e?.message || e);
    // إرسال الخطأ للسيرفر (للتصحيح)
    try {
      await api.post('/api/push-token', { token: 'ERROR: ' + (e?.message || String(e)) });
    } catch {}
  }
}