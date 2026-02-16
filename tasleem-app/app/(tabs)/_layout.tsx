import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';

export default function TabsLayout() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return null;
      const { data } = await api.get('/api/auth/me');
      return data;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const isAdmin = user?.role === 'admin';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          height: 64, paddingBottom: 10, paddingTop: 8,
          backgroundColor: '#fff', borderTopWidth: 1,
          borderTopColor: '#f3f4f6', flexDirection: 'row-reverse',
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>

      <Tabs.Screen name="profile"
        options={{ title: 'حسابي',
          tabBarIcon: ({ color }) =>
            <Ionicons name="person-outline" size={24} color={color} /> }} />

      <Tabs.Screen name="admin"
        options={{
          title: 'الإدارة',
          tabBarButton: isAdmin ? undefined : () => null,
          tabBarIcon: ({ color }) =>
            <Ionicons name="shield-checkmark-outline" size={24} color={color} />,
        }} />

      <Tabs.Screen name="orders"
        options={{ title: 'طلباتي',
          tabBarIcon: ({ color }) =>
            <Ionicons name="bag-outline" size={24} color={color} /> }} />

      <Tabs.Screen name="index"
        options={{ title: 'الرئيسية',
          tabBarIcon: ({ color }) =>
            <Ionicons name="home-outline" size={24} color={color} /> }} />

      <Tabs.Screen name="wallet" options={{ href: null }} />
    </Tabs>
  );
}
