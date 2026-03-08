import { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Image, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../src/lib/api';
import { toast } from '../src/lib/toast';

const PRIMARY  = '#0c6679';
const PRIMARY2 = '#0a8a9f';
const ACCENT   = '#f5a006';

export default function AuthScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const switchTab = (login: boolean) => {
    Animated.spring(slideAnim, { toValue: login ? 0 : 1, useNativeDriver: false, tension: 120, friction: 8 }).start();
    setIsLogin(login);
  };

  const loginMutation = useMutation({
    mutationFn: async (data: any) => { const res = await api.post('/api/auth/login', data); return res.data; },
    onSuccess: async (data) => {
      await AsyncStorage.setItem('token', data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      queryClient.clear();
      toast.success('مرحباً بك!');
      setTimeout(() => router.replace('/(tabs)'), 100);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'خطأ في تسجيل الدخول'),
  });

  const registerMutation = useMutation({
    mutationFn: async (data: any) => { const res = await api.post('/api/auth/register', data); return res.data; },
    onSuccess: async (data) => {
      await AsyncStorage.setItem('token', data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      queryClient.clear();
      toast.success('تم إنشاء الحساب بنجاح!');
      setTimeout(() => router.replace('/(tabs)'), 100);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'خطأ في التسجيل'),
  });

  const handleSubmit = () => {
    if (!phone.trim() || !password.trim()) { toast.warning('يرجى ملء جميع الحقول'); return; }
    if (isLogin) {
      loginMutation.mutate({ phone, password });
    } else {
      if (!storeName.trim() || !address.trim()) { toast.warning('يرجى ملء جميع الحقول'); return; }
      registerMutation.mutate({ phone, password, storeName, address });
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  const indicatorRight = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['50%', '0%'],
  });

  return (
    <View style={s.root}>
      <LinearGradient colors={[PRIMARY, PRIMARY2, '#0d9eb8']} style={s.bg} />
      <View style={s.circle1} />
      <View style={s.circle2} />
      <View style={s.circle3} />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            <View style={s.topSection}>
              <Image source={require('../assets/logo.png')} style={s.logoImg} resizeMode="contain" />
              <Text style={s.appName}>تسليم</Text>
              <Text style={s.tagline}>منصتك لإدارة التجارة الإلكترونية</Text>
              <View style={s.dots}>
                {[0, 1, 2].map(i => <View key={i} style={[s.dot, i === 1 && s.dotActive]} />)}
              </View>
            </View>

            <View style={s.card}>

              {/* تبويبات */}
              <View style={s.tabsWrap}>
                <Animated.View style={[s.tabIndicator, { right: indicatorRight }]} />
                <TouchableOpacity style={s.tabBtn} onPress={() => switchTab(false)}>
                  <Text style={[s.tabText, !isLogin && s.tabTextActive]}>إنشاء حساب</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.tabBtn} onPress={() => switchTab(true)}>
                  <Text style={[s.tabText, isLogin && s.tabTextActive]}>تسجيل الدخول</Text>
                </TouchableOpacity>
              </View>

              {/* الحقول */}
              <View style={s.fields}>

                {/* رقم الهاتف */}
                <View style={[s.fieldWrap, focused === 'phone' && s.fieldFocused]}>
                  <Ionicons name="call-outline" size={19} color={focused === 'phone' ? PRIMARY : '#9ca3af'} style={s.fieldIcon} />
                  <TextInput
                    style={s.fieldInput}
                    placeholder="رقم الهاتف"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    textAlign="right"
                    placeholderTextColor="#b0b8c1"
                    onFocus={() => setFocused('phone')}
                    onBlur={() => setFocused(null)}
                  />
                </View>

                {/* كلمة المرور */}
                <View style={[s.fieldWrap, focused === 'password' && s.fieldFocused]}>
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.fieldIcon}>
                    <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={19} color={focused === 'password' ? PRIMARY : '#9ca3af'} />
                  </TouchableOpacity>
                  <TextInput
                    style={s.fieldInput}
                    placeholder="كلمة المرور"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    textAlign="right"
                    placeholderTextColor="#b0b8c1"
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                  />
                </View>

                {/* حقول التسجيل */}
                {!isLogin && (
                  <>
                    <View style={[s.fieldWrap, focused === 'store' && s.fieldFocused]}>
                      <Ionicons name="storefront-outline" size={19} color={focused === 'store' ? PRIMARY : '#9ca3af'} style={s.fieldIcon} />
                      <TextInput
                        style={s.fieldInput}
                        placeholder="اسم المتجر"
                        value={storeName}
                        onChangeText={setStoreName}
                        textAlign="right"
                        placeholderTextColor="#b0b8c1"
                        onFocus={() => setFocused('store')}
                        onBlur={() => setFocused(null)}
                      />
                    </View>

                    <View style={[s.fieldWrap, focused === 'address' && s.fieldFocused]}>
                      <Ionicons name="location-outline" size={19} color={focused === 'address' ? PRIMARY : '#9ca3af'} style={s.fieldIcon} />
                      <TextInput
                        style={s.fieldInput}
                        placeholder="العنوان"
                        value={address}
                        onChangeText={setAddress}
                        textAlign="right"
                        placeholderTextColor="#b0b8c1"
                        onFocus={() => setFocused('address')}
                        onBlur={() => setFocused(null)}
                      />
                    </View>
                  </>
                )}
              </View>

              {/* زر الإرسال */}
              <TouchableOpacity style={[s.submitBtn, isPending && { opacity: 0.7 }]} onPress={handleSubmit} disabled={isPending} activeOpacity={0.85}>
                <LinearGradient colors={[PRIMARY, PRIMARY2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.submitGrad}>
                  {isPending
                    ? <ActivityIndicator color="#fff" />
                    : <>
                        <Ionicons name={isLogin ? 'log-in-outline' : 'person-add-outline'} size={20} color="#fff" />
                        <Text style={s.submitText}>{isLogin ? 'دخول' : 'إنشاء الحساب'}</Text>
                      </>
                  }
                </LinearGradient>
              </TouchableOpacity>

              <View style={s.divider}>
                <View style={s.dividerLine} />
                <Text style={s.dividerText}>أو</Text>
                <View style={s.dividerLine} />
              </View>

              <TouchableOpacity style={s.switchRow} onPress={() => switchTab(!isLogin)}>
                <Text style={s.switchText}>{isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}</Text>
                <Text style={s.switchAccent}>{isLogin ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}</Text>
              </TouchableOpacity>

            </View>

            <Text style={s.footer}>جميع الحقوق محفوظة © تسليم 2026</Text>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1 },
  bg:            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  circle1:       { position: 'absolute', width: 320, height: 320, borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -100, right: -80 },
  circle2:       { position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.04)', top: 120, left: -60 },
  circle3:       { position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(245,160,6,0.07)', bottom: 180, right: -50 },

  scroll:        { flexGrow: 1, paddingBottom: 30 },

  topSection:    { alignItems: 'center', paddingTop: 44, paddingBottom: 36 },
  logoImg:       { width: 110, height: 110, marginBottom: 16 },
  appName:       { fontSize: 38, fontWeight: 'bold', color: '#fff', letterSpacing: 3, marginBottom: 8 },
  tagline:       { fontSize: 13, color: 'rgba(255,255,255,0.72)', letterSpacing: 0.3 },
  dots:          { flexDirection: 'row', gap: 6, marginTop: 20 },
  dot:           { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive:     { width: 22, backgroundColor: ACCENT, borderRadius: 3 },

  card:          { marginHorizontal: 16, borderRadius: 32, backgroundColor: '#fff', padding: 24,
    shadowColor: '#0c6679', shadowOpacity: 0.18, shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 }, elevation: 16 },

  tabsWrap:      { flexDirection: 'row-reverse', backgroundColor: '#f1f5f9',
    borderRadius: 18, padding: 4, marginBottom: 26, position: 'relative', height: 50 },
  tabIndicator:  { position: 'absolute', top: 4, bottom: 4, width: '50%',
    backgroundColor: PRIMARY, borderRadius: 14,
    shadowColor: PRIMARY, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5 },
  tabBtn:        { flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  tabText:       { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  tabTextActive: { color: '#fff' },

  fields:        { gap: 12, marginBottom: 22 },
  fieldWrap:     { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#f8fafc',
    borderRadius: 16, paddingHorizontal: 16, height: 56,
    borderWidth: 1.5, borderColor: '#e5e7eb', gap: 10 },
  fieldFocused:  { borderColor: PRIMARY, backgroundColor: '#f0f9fb',
    shadowColor: PRIMARY, shadowOpacity: 0.12, shadowRadius: 8, elevation: 2 },
  fieldIcon:     { width: 28, justifyContent: 'center', alignItems: 'center' },
  fieldInput:    { flex: 1, fontSize: 15, color: '#111827' },

  submitBtn:     { borderRadius: 18, overflow: 'hidden', marginBottom: 22,
    shadowColor: PRIMARY, shadowOpacity: 0.4, shadowRadius: 14, elevation: 7 },
  submitGrad:    { height: 56, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10 },
  submitText:    { fontSize: 16, fontWeight: 'bold', color: '#fff', letterSpacing: 0.8 },

  divider:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  dividerLine:   { flex: 1, height: 1, backgroundColor: '#f1f5f9' },
  dividerText:   { fontSize: 13, color: '#d1d5db' },

  switchRow:     { alignItems: 'center', gap: 6 },
  switchText:    { fontSize: 13, color: '#9ca3af' },
  switchAccent:  { fontSize: 14, fontWeight: 'bold', color: PRIMARY },

  footer:        { textAlign: 'center', color: 'rgba(255,255,255,0.45)',
    fontSize: 11, marginTop: 26, paddingHorizontal: 20 },
});
