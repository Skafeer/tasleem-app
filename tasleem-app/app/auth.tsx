import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../src/lib/api';
import { toast } from '../src/lib/toast';

const PRIMARY = '#0c6679';
const SECONDARY = '#f5a006';

export default function AuthScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/api/auth/login', data);
      return res.data;
    },
    onSuccess: async (data) => {
      await AsyncStorage.setItem('token', data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      queryClient.clear();
      toast.success('مرحباً بك! 👋');
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'خطأ في تسجيل الدخول');
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/api/auth/register', data);
      return res.data;
    },
    onSuccess: async (data) => {
      await AsyncStorage.setItem('token', data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      queryClient.clear();
      toast.success('تم إنشاء الحساب بنجاح! 🎉');
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'خطأ في التسجيل');
    },
  });

  const handleSubmit = () => {
    if (!phone.trim() || !password.trim()) {
      toast.warning('يرجى ملء جميع الحقول'); return;
    }
    if (isLogin) {
      loginMutation.mutate({ phone, password });
    } else {
      if (!storeName.trim() || !address.trim()) {
        toast.warning('يرجى ملء جميع الحقول'); return;
      }
      registerMutation.mutate({ phone, password, storeName, address });
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <SafeAreaView style={s.container}>
      <LinearGradient colors={[PRIMARY, '#0a5566']} style={s.header}>
        <View style={s.logo}>
          <Text style={s.logoText}>ت</Text>
        </View>
        <Text style={s.title}>تسليم</Text>
        <Text style={s.subtitle}>منصة التجارة الإلكترونية</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
          <View style={s.tabs}>
            <TouchableOpacity
              style={[s.tab, isLogin && s.tabActive]}
              onPress={() => setIsLogin(true)}>
              <Text style={[s.tabText, isLogin && s.tabTextActive]}>تسجيل الدخول</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tab, !isLogin && s.tabActive]}
              onPress={() => setIsLogin(false)}>
              <Text style={[s.tabText, !isLogin && s.tabTextActive]}>إنشاء حساب</Text>
            </TouchableOpacity>
          </View>

          <View style={s.inputBox}>
            <Ionicons name="call-outline" size={20} color="#6b7280" />
            <TextInput
              style={s.input}
              placeholder="رقم الهاتف"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              textAlign="right"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={s.inputBox}>
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#6b7280" />
            </TouchableOpacity>
            <TextInput
              style={s.input}
              placeholder="كلمة المرور"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              textAlign="right"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {!isLogin && (
            <>
              <View style={s.inputBox}>
                <Ionicons name="storefront-outline" size={20} color="#6b7280" />
                <TextInput
                  style={s.input}
                  placeholder="اسم المتجر"
                  value={storeName}
                  onChangeText={setStoreName}
                  textAlign="right"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View style={s.inputBox}>
                <Ionicons name="location-outline" size={20} color="#6b7280" />
                <TextInput
                  style={s.input}
                  placeholder="العنوان"
                  value={address}
                  onChangeText={setAddress}
                  textAlign="right"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </>
          )}

          <TouchableOpacity
            style={[s.btn, isPending && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={isPending}>
            <LinearGradient colors={[PRIMARY, '#0a8a9f']} style={s.btnGrad}>
              {isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.btnText}>{isLogin ? 'دخول' : 'إنشاء حساب'}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  logo: { width: 80, height: 80, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  logoText: { fontSize: 40, fontWeight: 'bold', color: '#fff' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  form: { padding: 24, gap: 16 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 4, gap: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  tabActive: { backgroundColor: PRIMARY },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, paddingHorizontal: 16, height: 54, gap: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  input: { flex: 1, fontSize: 15, color: '#111827' },
  btn: { borderRadius: 16, overflow: 'hidden', marginTop: 8,
    shadowColor: PRIMARY, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  btnGrad: { height: 54, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
