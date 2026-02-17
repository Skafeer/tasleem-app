import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
      queryClient.clear();
      toast.success('أهلاً بك! 👋');
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'فشل تسجيل الدخول');
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/api/auth/register', data);
      return res.data;
    },
    onSuccess: async (data) => {
      await AsyncStorage.setItem('token', data.token);
      queryClient.clear();
      toast.success('تم إنشاء الحساب بنجاح! 🎉');
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'فشل إنشاء الحساب');
    },
  });

  const handleSubmit = () => {
    if (!phone || !password) {
      toast.warning('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    if (isLogin) {
      loginMutation.mutate({ phone, password });
    } else {
      if (!storeName || !address) {
        toast.warning('يرجى ملء جميع الحقول المطلوبة');
        return;
      }
      registerMutation.mutate({ phone, password, storeName, address });
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <SafeAreaView style={s.container}>
      <LinearGradient colors={[PRIMARY, '#0a5566']} style={s.header}>
        <Text style={s.logo}>تسليم</Text>
        <Text style={s.tagline}>منصة التجارة الإلكترونية</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.formContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={s.card}>
            <View style={s.tabs}>
              <TouchableOpacity
                style={[s.tab, isLogin && s.tabActive]}
                onPress={() => setIsLogin(true)}>
                <Text style={[s.tabText, isLogin && s.tabTextActive]}>تسجيل الدخول</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tab, !isLogin && s.tabActive]}
                onPress={() => setIsLogin(false)}>
                <Text style={[s.tabText, !isLogin && s.tabTextActive]}>حساب جديد</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.label}>رقم الهاتف</Text>
            <View style={s.inputBox}>
              <Ionicons name="call-outline" size={20} color="#9ca3af" />
              <TextInput
                style={s.input}
                placeholder="07xxxxxxxxx"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                textAlign="right"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {!isLogin && (
              <>
                <Text style={s.label}>اسم المتجر</Text>
                <View style={s.inputBox}>
                  <Ionicons name="storefront-outline" size={20} color="#9ca3af" />
                  <TextInput
                    style={s.input}
                    placeholder="اسم متجرك"
                    value={storeName}
                    onChangeText={setStoreName}
                    textAlign="right"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <Text style={s.label}>العنوان</Text>
                <View style={s.inputBox}>
                  <Ionicons name="location-outline" size={20} color="#9ca3af" />
                  <TextInput
                    style={s.input}
                    placeholder="المحافظة، المدينة..."
                    value={address}
                    onChangeText={setAddress}
                    textAlign="right"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </>
            )}

            <Text style={s.label}>كلمة المرور</Text>
            <View style={s.inputBox}>
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
              <TextInput
                style={s.input}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textAlign="right"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <TouchableOpacity
              style={[s.btn, isPending && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={isPending}>
              <LinearGradient
                colors={[PRIMARY, '#0a8a9f']}
                style={s.btnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}>
                {isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name={isLogin ? 'log-in-outline' : 'person-add-outline'}
                      size={20}
                      color="#fff"
                    />
                    <Text style={s.btnText}>
                      {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingVertical: 40, alignItems: 'center' },
  logo: { fontSize: 48, fontWeight: 'bold', color: '#fff' },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
  formContainer: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  tabs: { flexDirection: 'row', backgroundColor: '#f3f4f6',
    borderRadius: 16, padding: 4, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, color: '#9ca3af', fontWeight: '600' },
  tabTextActive: { color: PRIMARY, fontWeight: 'bold' },
  label: { fontSize: 13, color: '#374151', marginBottom: 8,
    marginTop: 16, fontWeight: '600', textAlign: 'right' },
  inputBox: { flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 14,
    paddingHorizontal: 14, backgroundColor: '#f9fafb' },
  input: { flex: 1, fontSize: 15, color: '#111827', paddingVertical: 14 },
  btn: { borderRadius: 16, overflow: 'hidden', marginTop: 24,
    shadowColor: PRIMARY, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5 },
  btnGradient: { flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 8, paddingVertical: 16 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
