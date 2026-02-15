import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nManager } from 'react-native';
import { ToastProvider } from '../src/lib/toast';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_left' }}>
          <Stack.Screen name="auth" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="cart" />
          <Stack.Screen name="products/[id]" />
          <Stack.Screen name="order-details/[id]" />
          <Stack.Screen name="withdraw-history/index" />
          <Stack.Screen name="stats/index" />
          <Stack.Screen name="profile-edit/index" />
          <Stack.Screen name="contact/index" />
          <Stack.Screen name="privacy/index" />
        </Stack>
      </ToastProvider>
    </QueryClientProvider>
  );
}
