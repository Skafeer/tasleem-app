import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../src/lib/api';

const PRIMARY = '#0c6679';
const SECONDARY = '#f5a006';

export default function AuthScreen() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regStoreName, setRegStoreName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [loginError, setLoginError] = useState('');
  const [regError, setRegError] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showRegPass, setShowRegPass] = useState(false);

  const router = useRouter();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async (body: any) => {
      const { data } = await api.post('/api/auth/login', body);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user'], data);
      router.replace('/(tabs)');
    },
    onError: (e: any) =>
      setLoginError(e?.response?.data?.message || 'رقم الهاتف أو كلمة المرور غير صحيحة'),
  });

  const registerMutation = useMutation({
    mutationFn: async (body: any) => {
      const { data } = await api.post('/api/auth/register', body);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user'], data);
      router.replace('/(tabs)');
    },
    onError: (e: any) =>
      setRegError(e?.response?.data?.message || 'حدث خطأ أثناء إنشاء الحساب'),
  });

  const handleLogin = () => {
    setLoginError('');
    if (!loginPhone || !loginPassword) {
      setLoginError('يرجى تعبئة جميع الحقول'); return;
    }
    loginMutation.mutate({ phone: loginPhone, password: loginPassword });
  };

  const handleRegister = () => {
    setRegError('');
    if (!regStoreName || !regPhone || !regPassword || !regAddress) {
      setRegError('يرجى تعبئة جميع الحقول'); return;
    }
    registerMutation.mutate({
      storeName: regStoreName,
      phone: regPhone,
      password: regPassword,
      address: regAddress,
      role: 'merchant',
    });
  };

  const Field = ({ icon, placeholder, value, onChange, secure = false,
    keyboard = 'default', showPass, togglePass }: any) => (
    <View style={s.fieldBox}>
      {secure && togglePass && (
        <TouchableOpacity onPress={togglePass} style={s.eyeBtn}>
          <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'}
            size={18} color="#9ca3af" />
        </TouchableOpacity>
      )}
      <TextInput style={s.fieldInput}
        placeholder={placeholder} value={value} onChangeText={onChange}
        secureTextEntry={secure && !showPass}
        keyboardType={keyboard} textAlign="right"
        placeholderTextColor="#9ca3af" />
      <Ionicons name={icon} size={20} color="#9ca3af" />
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      {/* Background decor - from-primary/10 */}
      <View style={s.bgTop} />
      <View style={s.bgCircle} />

      <ScrollView style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Logo — inline-flex w-16 h-16 rounded-2xl bg-gradient from-primary to-secondary */}
        <View style={s.logoSection}>
          <LinearGradient colors={[PRIMARY, SECONDARY]}
            style={s.logoBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={s.logoLetter}>ت</Text>
          </LinearGradient>
          {/* text-3xl font-bold gradient */}
          <Text style={s.logoTitle}>منصة تسليم</Text>
          {/* text-gray-500 mt-2 */}
          <Text style={s.logoSub}>منصتك الأولى للدروبشيبينغ في العراق</Text>
        </View>

        {/* Card — max-w-md p-8 shadow-xl bg-white/80 backdrop-blur rounded-3xl */}
        <View style={s.card}>

          {/* Tabs — grid-cols-2 bg-gray-100/50 h-12 rounded-xl */}
          <View style={s.tabsBar}>
            <TouchableOpacity
              style={[s.tabBtn, tab === 'register' && s.tabActive]}
              onPress={() => setTab('register')}>
              <Text style={[s.tabText, tab === 'register' && s.tabTextActive]}>
                إنشاء حساب
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tabBtn, tab === 'login' && s.tabActive]}
              onPress={() => setTab('login')}>
              <Text style={[s.tabText, tab === 'login' && s.tabTextActive]}>
                تسجيل الدخول
              </Text>
            </TouchableOpacity>
          </View>

          {/* LOGIN */}
          {tab === 'login' && (
            <View style={s.form}>
              <Text style={s.label}>رقم الهاتف</Text>
              <Field icon="call-outline" placeholder="07xxxxxxxxx"
                value={loginPhone} onChange={setLoginPhone} keyboard="phone-pad" />

              <Text style={s.label}>كلمة المرور</Text>
              <Field icon="lock-closed-outline" placeholder="••••••••"
                value={loginPassword} onChange={setLoginPassword}
                secure showPass={showLoginPass} togglePass={() => setShowLoginPass(!showLoginPass)} />

              {loginError ? (
                <View style={s.errorBox}>
                  <Text style={s.errorText}>⚠️ {loginError}</Text>
                </View>
              ) : null}

              {/* Button — bg-primary shadow-primary/25 */}
              <TouchableOpacity
                style={[s.btn, { backgroundColor: PRIMARY },
                  loginMutation.isPending && { opacity: 0.7 }]}
                onPress={handleLogin} disabled={loginMutation.isPending}>
                {loginMutation.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnText}>دخول</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* REGISTER */}
          {tab === 'register' && (
            <View style={s.form}>
              <Text style={s.label}>اسم المتجر</Text>
              <Field icon="storefront-outline" placeholder="اسم متجرك"
                value={regStoreName} onChange={setRegStoreName} />

              <Text style={s.label}>رقم الهاتف</Text>
              <Field icon="call-outline" placeholder="07xxxxxxxxx"
                value={regPhone} onChange={setRegPhone} keyboard="phone-pad" />

              <Text style={s.label}>العنوان (المحافظة/المنطقة)</Text>
              <Field icon="location-outline" placeholder="بغداد، الكرادة..."
                value={regAddress} onChange={setRegAddress} />

              <Text style={s.label}>كلمة المرور</Text>
              <Field icon="lock-closed-outline" placeholder="••••••••"
                value={regPassword} onChange={setRegPassword}
                secure showPass={showRegPass} togglePass={() => setShowRegPass(!showRegPass)} />

              {regError ? (
                <View style={s.errorBox}>
                  <Text style={s.errorText}>⚠️ {regError}</Text>
                </View>
              ) : null}

              {/* Button — bg-secondary */}
              <TouchableOpacity
                style={[s.btn, { backgroundColor: SECONDARY },
                  registerMutation.isPending && { opacity: 0.7 }]}
                onPress={handleRegister} disabled={registerMutation.isPending}>
                {registerMutation.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnText}>إنشاء حساب جديد</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Footer — absolute bottom-8 text-gray-400 */}
        <Text style={s.footer}>
          جميع الحقوق محفوظة © {new Date().getFullYear()} تسليم
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f9fafb' },
  scrollContent: { flexGrow: 1, justifyContent: 'center',
    padding: 20, paddingTop: 60 },
  bgTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 384,
    backgroundColor: 'rgba(12,102,121,0.07)' },
  bgCircle: { position: 'absolute', top: -60, right: -60,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(245,160,6,0.07)' },
  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoBox: { width: 68, height: 68, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    shadowColor: PRIMARY, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  logoLetter: { fontSize: 30, fontWeight: 'bold', color: '#fff' },
  logoTitle: { fontSize: 28, fontWeight: 'bold', color: PRIMARY, marginBottom: 6 },
  logoSub: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  card: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 28,
    padding: 24, shadowColor: '#000', shadowOpacity: 0.1,
    shadowRadius: 24, elevation: 8,
    borderWidth: 1, borderColor: 'rgba(241,245,249,0.9)' },
  tabsBar: { flexDirection: 'row', backgroundColor: 'rgba(243,244,246,0.8)',
    borderRadius: 14, padding: 4, marginBottom: 24, height: 50 },
  tabBtn: { flex: 1, justifyContent: 'center',
    alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  tabTextActive: { color: PRIMARY, fontWeight: '700' },
  form: { gap: 2 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151',
    textAlign: 'right', marginBottom: 6, marginTop: 10 },
  fieldBox: { flexDirection: 'row-reverse', alignItems: 'center',
    height: 50, borderRadius: 14, backgroundColor: '#f9fafb',
    borderWidth: 1.5, borderColor: '#e5e7eb',
    paddingHorizontal: 14, marginBottom: 2 },
  fieldInput: { flex: 1, fontSize: 14, color: '#111827', paddingHorizontal: 8 },
  eyeBtn: { padding: 4 },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 10,
    padding: 12, marginTop: 4 },
  errorText: { color: '#dc2626', fontSize: 13, textAlign: 'right' },
  btn: { borderRadius: 14, height: 50, justifyContent: 'center',
    alignItems: 'center', marginTop: 18,
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footer: { textAlign: 'center', color: '#9ca3af',
    fontSize: 12, marginTop: 28, marginBottom: 8 },
});
