import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#1E3A6E',
      tabBarInactiveTintColor: '#999',
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopColor: '#eee',
        height: 60,
        paddingBottom: 8,
      },
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600',
      },
    }}>
      <Tabs.Screen name="index" options={{
        title: 'الرئيسية',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="home-outline" size={size} color={color} />
        ),
      }} />
      <Tabs.Screen name="orders" options={{
        title: 'طلباتي',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="bag-outline" size={size} color={color} />
        ),
      }} />
      <Tabs.Screen name="wallet" options={{
        title: 'المحفظة',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="wallet-outline" size={size} color={color} />
        ),
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'حسابي',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="person-outline" size={size} color={color} />
        ),
      }} />
    </Tabs>
  );
}
