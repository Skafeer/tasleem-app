import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../lib/api';
import { User } from '../types';
export function useUser() {
  return useQuery<User>({
    queryKey: ['user'],
    queryFn: async () => {
      const { data } = await api.get('/api/auth/me');
      return data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (creds: { phone: string; password: string }) => {
      const { data } = await api.post('/api/auth/login', creds);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user'], data);
    },
  });
}
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post('/api/auth/logout');
      await AsyncStorage.removeItem('session_cookie');
    },
    onSuccess: () => {
      queryClient.setQueryData(['user'], null);
      queryClient.clear();
    },
  });
}
