import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image
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

export default function AuthScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

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
      setTimeout(() => { router.replace('/(tabs)'); }, 100);
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
      setTimeout(() => { router.replace('/(tabs)'); }, 100);
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* القسم العلوي - الشعار */}
          <LinearGradient colors={[PRIMARY, '#0a8a9f']} style={s.topSection}>
            <View style={s.logoWrap}>
              <Image source={require('../assets/logo.png')} style={s.logoImg} resizeMode="contain" />
            </View>
            <Text style={s.appName}>تسليم</Text>
            <Text style={s.appTagline}>منصة التجارة الإلكترونية</Text>
          </LinearGradient>

          {/* البطاقة السفلية */}
          <View style={s.card}>

            {/* تبويبات */}
            <View style={s.tabs}>
              <TouchableOpacity style={[s.tab, isLogin && s.tabActive]} onPress={() => setIsLogin(true)}>
                <Text style={[s.tabText, isLogin && s.tabTextActive]}>تسجيل الدخول</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.tab, !isLogin && s.tabActive]} onPress={() => setIsLogin(false)}>
                <Text style={[s.tabText, !isLogin && s.tabTextActive]}>إنشاء حساب</Text>
              </TouchableOpacity>
            </View>

            {/* الحقول */}
            <View style={s.fields}>

              {/* رقم الهاتف */}
              <View style={[s.inputRow, focusedField === 'phone' && s.inputRowFocused]}>
                <TextInput
                  style={s.input}
                  placeholder="رقم الهاتف"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  textAlign="right"
                  placeholderTextColor="#9ca3af"
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                />
                <Ionicons name="call-outline" size={20} color={focusedField === 'phone' ? PRIMARY : '#9ca3af'} />
              </View>

              {/* كلمة المرور */}
              <View style={[s.inputRow, focusedField === 'password' && s.inputRowFocused]}>
                <TextInput
                  style={s.input}
                  placeholder="كلمة المرور"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  textAlign="right"
                  placeholderTextColor="#9ca3af"
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color={focusedField === 'password' ? PRIMARY : '#9ca3af'} />
                </TouchableOpacity>
              </View>

              {!isLogin && (
                <>
                  {/* اسم المتجر */}
                  <View style={[s.inputRow, focusedField === 'storeName' && s.inputRowFocused]}>
                    <TextInput
                      style={s.input}
                      placeholder="اسم المتجر"
                      value={storeName}
                      onChangeText={setStoreName}
                      textAlign="right"
                      placeholderTextColor="#9ca3af"
                      onFocus={() => setFocusedField('storeName')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <Ionicons name="storefront-outline" size={20} color={focusedField === 'storeName' ? PRIMARY : '#9ca3af'} />
                  </View>

                  {/* العنوان */}
                  <View style={[s.inputRow, focusedField === 'address' && s.inputRowFocused]}>
                    <TextInput
                      style={s.input}
                      placeholder="العنوان"
                      value={address}
                      onChangeText={setAddress}
                      textAlign="right"
                      placeholderTextColor="#9ca3af"
                      onFocus={() => setFocusedField('address')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <Ionicons name="location-outline" size={20} color={focusedField === 'address' ? PRIMARY : '#9ca3af'} />
                  </View>
                </>
              )}
            </View>

            {/* زر الدخول */}
            <TouchableOpacity
              style={[s.btn, isPending && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={isPending}>
              <LinearGradient colors={[PRIMARY, '#0a8a9f']} style={s.btnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnText}>{isLogin ? 'دخول' : 'إنشاء حساب'}</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#f8fafc' },
  scroll:        { flexGrow: 1 },

  // القسم العلوي
  topSection:    { alignItems: 'center', paddingTop: 60, paddingBottom: 70, paddingHorizontal: 24 },
  logoWrap:      { width: 110, height: 110, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' },
  logoImg:       { width: 88, height: 88 },
  appName:       { fontSize: 30, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  appTagline:    { fontSize: 14, color: 'rgba(255,255,255,0.8)' },

  // البطاقة البيضاء
  card:          { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    marginTop: -30, flex: 1, paddingHorizontal: 24, paddingTop: 30, paddingBottom: 40,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, elevation: 8 },

  // تبويبات
  tabs:          { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 14, padding: 4, marginBottom: 26 },
  tab:           { flex: 1, paddingVertical: 12, borderRadius: 11, alignItems: 'center' },
  tabActive:     { backgroundColor: PRIMARY,
    shadowColor: PRIMARY, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 },
  tabText:       { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },

  // حقول الإدخال
  fields:        { gap: 14, marginBottom: 26 },
  inputRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc',
    borderRadius: 14, paddingHorizontal: 16, height: 56, gap: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb' },
  inputRowFocused: { borderColor: PRIMARY, backgroundColor: '#fff',
    shadowColor: PRIMARY, shadowOpacity: 0.12, shadowRadius: 6, elevation: 2 },
  input:         { flex: 1, fontSize: 15, color: '#111827', textAlign: 'right' } as any,

  // زر الإرسال
  btn:           { borderRadius: 14, overflow: 'hidden',
    shadowColor: PRIMARY, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5 },
  btnGrad:       { height: 56, justifyContent: 'center', alignItems: 'center' },
  btnText:       { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
});
