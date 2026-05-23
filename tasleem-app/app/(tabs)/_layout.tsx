import React, { useEffect, useRef } from 'react';
import { I18nManager, Animated, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import api from '../../src/lib/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const PRIMARY = '#0c6679';

const AnimatedIcon = ({ name, color, focused }: { name: any, color: string, focused: boolean }) => {
  const scale = useRef(new Animated.Value(focused ? 1.2 : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.2 : 1,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name={name} size={24} color={color} />
    </Animated.View>
  );
};

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
    <View style={{ flex: 1, backgroundColor: '#f2f6f9' }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: PRIMARY,
          tabBarInactiveTintColor: '#9ca3af',
          tabBarStyle: {
            position: 'absolute',
            bottom: insets.bottom + 10,
            left: 20,
            right: 20,
            backgroundColor: '#ffffff',
            borderRadius: 30,
            height: 64,
            paddingBottom: 8,
            paddingTop: 8,
            borderTopWidth: 0,
            shadowColor: PRIMARY,
            shadowOpacity: 0.1,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 10 },
            elevation: 10,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 4 },
          tabBarBackground: () => (
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 30 }} />
          ),
        }}>
        {/* الترتيب الجديد: من اليمين إلى اليسار */}
        
        {/* 1. الرئيسية */}
        <Tabs.Screen name="index" options={{
          title: 'الرئيسية',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedIcon name={focused ? 'home' : 'home-outline'} color={color} focused={focused} />
          ),
        }} />
        
        {/* 2. طلباتي */}
        <Tabs.Screen name="orders" options={{
          title: 'طلباتي',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedIcon name={focused ? 'bag' : 'bag-outline'} color={color} focused={focused} />
          ),
        }} />
        
        {/* 3. الإدارة */}
        <Tabs.Screen name="admin" options={{
          title: 'الإدارة',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedIcon name={focused ? 'settings' : 'settings-outline'} color={color} focused={focused} />
          ),
          href: isAdmin ? '/(tabs)/admin' : null,
        }} />
        
        {/* 4. المحفظة */}
        <Tabs.Screen name="wallet" options={{
          title: 'المحفظة',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedIcon name={focused ? 'card' : 'card-outline'} color={color} focused={focused} />
          ),
        }} />
        
        {/* 5. حسابي */}
        <Tabs.Screen name="profile" options={{
          title: 'حسابي',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedIcon name={focused ? 'person-circle' : 'person-circle-outline'} color={color} focused={focused} />
          ),
        }} />
      </Tabs>
    </View>
  );
}