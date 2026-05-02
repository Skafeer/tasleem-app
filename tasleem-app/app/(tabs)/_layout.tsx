import { I18nManager, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import api from '../../src/lib/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const PRIMARY = '#0c6679';

// ✅ Badge الإشعارات
function NotifBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View style={{
      position: 'absolute', top: -4, right: -8,
      backgroundColor: '#ef4444', borderRadius: 10,
      minWidth: 18, height: 18, paddingHorizontal: 4,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1.5, borderColor: '#fff', zIndex: 10,
    }}>
      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data } = await api.get('/api/auth/me');
      return data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // ✅ عدد الإشعارات غير المقروءة
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-notifications'],
    refetchInterval: 15000,
    queryFn: async () => {
      try {
        const { data } = await api.get('/api/notifications');
        const all = Array.isArray(data) ? data : [];
        return all.filter((n: any) => !n.isRead).length;
      } catch { return 0; }
    },
  });

  const isAdmin = user?.role === 'admin';
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          height: 64 + insets.bottom,
          paddingBottom: 10 + insets.bottom,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOpacity: 0,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -3 },
          elevation: 0,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      {/* الترتيب الجديد: من اليمين إلى اليسار */}
      
      {/* 1. الرئيسية (كانت آخر واحدة) */}
      <Tabs.Screen name="index" options={{
        title: 'الرئيسية',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
        ),
      }} />
      
      {/* 2. طلباتي (كانت الرابعة) */}
      <Tabs.Screen name="orders" options={{
        title: 'طلباتي',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'bag' : 'bag-outline'} size={24} color={color} />
        ),
      }} />
      
      {/* 3. الإدارة (كانت الثالثة) */}
      <Tabs.Screen name="admin" options={{
        title: 'الإدارة',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />
        ),
        href: isAdmin ? '/(tabs)/admin' : null,
      }} />
      
      {/* 4. المحفظة (كانت الثانية) */}
      <Tabs.Screen name="wallet" options={{
        title: 'المحفظة',
        tabBarIcon: ({ color, focused }) => (
          <Ionicons name={focused ? 'card' : 'card-outline'} size={24} color={color} />
        ),
      }} />
      
      {/* 5. حسابي (كان الأول) */}
      <Tabs.Screen name="profile" options={{
        title: 'حسابي',
        tabBarIcon: ({ color, focused }) => (
          <View style={{ position: 'relative' }}>
            <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={24} color={color} />
            <NotifBadge count={unreadCount as number} />
          </View>
        ),
      }} />
    </Tabs>
  );
}