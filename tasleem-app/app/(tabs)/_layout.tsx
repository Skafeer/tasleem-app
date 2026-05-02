import { I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import api from '../../src/lib/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const PRIMARY = '#0c6679';

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
          <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={24} color={color} />
        ),
      }} />
    </Tabs>
  );
}