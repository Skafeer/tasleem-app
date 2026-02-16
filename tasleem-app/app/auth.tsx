import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, I18nManager
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../src/lib/api';
import { toast } from '../src/lib/toast';

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
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showRegPass, setShowRegPass] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async (body: any) => {
      const { data } = await api.post('/api/auth/login', body);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user'], data);
      toast.success('أهلاً بك! ' + data.storeName, 'تم تسجيل الدخول');
      router.replace('/(tabs)');
    },
    onError: (e: any) => setError(e?.response?.data?.message || 'رقم الهاتف أو كلمة المرور غير صحيحة'),
  });

  const registerMutation = useMutation({
    mutationFn: async (body: any) => {
      const { data } = await api.post('/api/auth/register', body);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user'], data);
      toast.success('تم إنشاء حسابك بنجاح!', 'مرحباً');
      router.replace('/(tabs)');
    },
    onError: (e: any) => setError(e?.response?.data?.message || 'حدث خطأ أثناء إنشاء الحساب'),
  });

  const handleLogin = () => {
    setError('');
    if (!loginPhone || !loginPassword) { setError('يرجى تعبئة جميع الحقول'); return; }
    loginMutation.mutate({ phone: loginPhone, password: loginPassword });
  };

  const handleRegister = () => {
    setError('');
    if (!regStoreName || !regPhone || !regPassword || !regAddress) {
      setError('يرجى تعبئة جميع الحقول'); return;
    }
    registerMutation.mutate({ storeName: regStoreName, phone: regPhone, password: regPassword, address: regAddress });
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.bgTop} />
      <View style={s.bgCircle} />

      <ScrollView style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <View style={s.logoSection}>
          <LinearGradient colors={[PRIMARY, SECONDARY]}
            style={s.logoBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={s.logoLetter}>ت</Text>
          </LinearGradient>
          <Text style={s.logoTitle}>منصة تسليم</Text>
          <Text style={s.logoSub}>منصتك الأولى للدروبشيبينغ في العراق</Text>
        </View>

        <View style={s.card}>
          <View style={s.tabsBar}>
            <TouchableOpacity
              style={[s.tabBtn, tab === 'register' && s.tabActive]}
              onPress={() => { setTab('register'); setError(''); }}>
              <Text style={[s.tabText, tab === 'register' && s.tabTextActive]}>إنشاء حساب</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tabBtn, tab === 'login' && s.tabActive]}
              onPress={() => { setTab('login'); setError(''); }}>
              <Text style={[s.tabText, tab === 'login' && s.tabTextActive]}>تسجيل الدخول</Text>
            </TouchableOpacity>
          </View>

          {tab === 'login' && (
            <View>
              <Text style={s.label}>رقم الهاتف</Text>
              <View style={s.fieldBox}>
                <TextInput
                  style={s.fieldInput}
                  placeholder="07xxxxxxxxx"
                  value={loginPhone}
                  onChangeText={setLoginPhone}
                  keyboardType="phone-pad"
                  textAlign="right"
                  placeholderTextColor="#9ca3af"
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                <Ionicons name="call-outline" size={20} color="#9ca3af" />
              </View>

              <Text style={s.label}>كلمة المرور</Text>
              <View style={s.fieldBox}>
                <TouchableOpacity onPress={() => setShowLoginPass(!showLoginPass)} style={s.eyeBtn}>
                  <Ionicons name={showLoginPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9ca3af" />
                </TouchableOpacity>
                <TextInput
                  style={s.fieldInput}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  secureTextEntry={!showLoginPass}
                  textAlign="right"
                  placeholderTextColor="#9ca3af"
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
              </View>

              {error ? <View style={s.errorBox}><Text style={s.errorText}>⚠️ {error}</Text></View> : null}

              <TouchableOpacity style={[s.btn, { backgroundColor: PRIMARY }, isPending && { opacity: 0.7 }]}
                onPress={handleLogin} disabled={isPending}>
                {isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>دخول</Text>}
              </TouchableOpacity>
            </View>
          )}

          {tab === 'register' && (
            <View>
              <Text style={s.label}>اسم المتجر</Text>
              <View style={s.fieldBox}>
                <TextInput style={s.fieldInput} placeholder="اسم متجرك"
                  value={regStoreName} onChangeText={setRegStoreName}
                  textAlign="right" placeholderTextColor="#9ca3af"
                  autoCorrect={false} autoCapitalize="none" />
                <Ionicons name="storefront-outline" size={20} color="#9ca3af" />
              </View>

              <Text style={s.label}>رقم الهاتف</Text>
              <View style={s.fieldBox}>
                <TextInput style={s.fieldInput} placeholder="07xxxxxxxxx"
                  value={regPhone} onChangeText={setRegPhone}
                  keyboardType="phone-pad" textAlign="right"
                  placeholderTextColor="#9ca3af" autoCorrect={false} autoCapitalize="none" />
                <Ionicons name="call-outline" size={20} color="#9ca3af" />
              </View>

              <Text style={s.label}>العنوان</Text>
              <View style={s.fieldBox}>
                <TextInput style={s.fieldInput} placeholder="بغداد، الكرادة..."
                  value={regAddress} onChangeText={setRegAddress}
                  textAlign="right" placeholderTextColor="#9ca3af"
                  autoCorrect={false} autoCapitalize="none" />
                <Ionicons name="location-outline" size={20} color="#9ca3af" />
              </View>

              <Text style={s.label}>كلمة المرور</Text>
              <View style={s.fieldBox}>
                <TouchableOpacity onPress={() => setShowRegPass(!showRegPass)} style={s.eyeBtn}>
                  <Ionicons name={showRegPass ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9ca3af" />
                </TouchableOpacity>
                <TextInput style={s.fieldInput} placeholder="••••••••"
                  value={regPassword} onChangeText={setRegPassword}
                  secureTextEntry={!showRegPass} textAlign="right"
                  placeholderTextColor="#9ca3af" autoCorrect={false} autoCapitalize="none" />
                <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
              </View>

              {error ? <View style={s.errorBox}><Text style={s.errorText}>⚠️ {error}</Text></View> : null}

              <TouchableOpacity style={[s.btn, { backgroundColor: SECONDARY }, isPending && { opacity: 0.7 }]}
                onPress={handleRegister} disabled={isPending}>
                {isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>إنشاء حساب جديد</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
        <Text style={s.footer}>جميع الحقوق محفوظة © {new Date().getFullYear()} تسليم</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f9fafb' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingTop: 60 },
  bgTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 384, backgroundColor: 'rgba(12,102,121,0.07)' },
  bgCircle: { position: 'absolute', top: -60, right: -60, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(245,160,6,0.07)' },
  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoBox: { width: 68, height: 68, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  logoLetter: { fontSize: 30, fontWeight: 'bold', color: '#fff' },
  logoTitle: { fontSize: 28, fontWeight: 'bold', color: PRIMARY, marginBottom: 6 },
  logoSub: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  card: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 28, padding: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 24, elevation: 8 },
  tabsBar: { flexDirection: 'row', backgroundColor: 'rgba(243,244,246,0.8)', borderRadius: 14, padding: 4, marginBottom: 24, height: 50 },
  tabBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  tabTextActive: { color: PRIMARY, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', textAlign: 'right', marginBottom: 6, marginTop: 12 },
  fieldBox: { flexDirection: 'row-reverse', alignItems: 'center', height: 50, borderRadius: 14, backgroundColor: '#f9fafb', borderWidth: 1.5, borderColor: '#e5e7eb', paddingHorizontal: 14, marginBottom: 2 },
  fieldInput: { flex: 1, fontSize: 14, color: '#111827', paddingHorizontal: 8 },
  eyeBtn: { padding: 4 },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 10, padding: 12, marginTop: 8 },
  errorText: { color: '#dc2626', fontSize: 13, textAlign: 'right' },
  btn: { borderRadius: 14, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 18, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footer: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 28 },
});
