import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Image, Animated, Modal,
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

// ── مراحل شاشة التسجيل ──────────────────────────────────────────
type Step = 'form' | 'otp';

export default function AuthScreen() {
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const [isLogin,    setIsLogin]    = useState(true);
  const [step,       setStep]       = useState<Step>('form');
  const [phone,      setPhone]      = useState('');
  const [password,   setPassword]   = useState('');
  const [storeName,  setStoreName]  = useState('');
  const [address,    setAddress]    = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [otpDigits,  setOtpDigits]  = useState(['', '', '', '', '', '']);
  const [countdown,  setCountdown]  = useState(0);
  const [agreedToPolicies, setAgreedToPolicies] = useState(false);
  const [policiesModalVisible, setPoliciesModalVisible] = useState(false); // ✅ Modal السياسات
  
  const slideAnim = useRef(new Animated.Value(0)).current;
  const otpRefs   = useRef<(TextInput | null)[]>([]);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── عداد إعادة الإرسال ──────────────────────────────────────
  const startCountdown = (secs = 60) => {
    setCountdown(secs);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ── Validations ──────────────────────────────────────────────
  const validatePhone = (p: string) => /^07[0-9]{9}$/.test(p.trim());
  const formatPhone   = (t: string) => t.replace(/[^0-9]/g, '').slice(0, 11);

  const switchTab = (login: boolean) => {
    Animated.spring(slideAnim, { toValue: login ? 0 : 1, useNativeDriver: false, tension: 120, friction: 8 }).start();
    setIsLogin(login);
    setStep('form');
    setPhone(''); setPassword(''); setStoreName(''); setAddress('');
    setOtpDigits(['', '', '', '', '', '']);
    setAgreedToPolicies(false);
  };

  // ── إرسال OTP ────────────────────────────────────────────────
  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/auth/send-otp', { phone, type: 'register' });
      return res.data;
    },
    onSuccess: () => {
      toast.success('تم إرسال رمز التحقق على واتساب 📲');
      setStep('otp');
      startCountdown(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 400);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل إرسال الرمز'),
  });

  // ── إعادة إرسال OTP ─────────────────────────────────────────
  const resendOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/auth/resend-otp', { phone, type: 'register' });
      return res.data;
    },
    onSuccess: () => {
      toast.success('تم إعادة إرسال الرمز 📲');
      setOtpDigits(['', '', '', '', '', '']);
      startCountdown(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل إعادة الإرسال'),
  });

  // ── تسجيل الدخول ─────────────────────────────────────────────
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

  // ── إنشاء الحساب بعد OTP ─────────────────────────────────────
  const registerMutation = useMutation({
    mutationFn: async (data: any) => { const res = await api.post('/api/auth/register', data); return res.data; },
    onSuccess: async (data) => {
      await AsyncStorage.setItem('token', data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      queryClient.clear();
      toast.success('تم إنشاء الحساب بنجاح! 🎉');
      setTimeout(() => router.replace('/(tabs)'), 100);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'خطأ في التسجيل'),
  });

  // ── تغيير خانة OTP ──────────────────────────────────────────
  const handleOtpChange = (val: string, idx: number) => {
    const cleaned = val.replace(/[^0-9]/g, '');
    const newDigits = [...otpDigits];

    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, 6).split('');
      const filled  = [...pasted, ...Array(6).fill('')].slice(0, 6);
      setOtpDigits(filled);
      const nextEmpty = filled.findIndex(d => d === '');
      otpRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
      return;
    }

    newDigits[idx] = cleaned;
    setOtpDigits(newDigits);
    if (cleaned && idx < 5) otpRefs.current[idx + 1]?.focus();

    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && !fullCode.includes('')) {
      handleVerify(fullCode);
    }
  };

  const handleOtpKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  // ── التحقق من الكود ──────────────────────────────────────────
  const handleVerify = (code?: string) => {
    const otpCode = code || otpDigits.join('');
    if (otpCode.length < 6) { toast.warning('أدخل رمز التحقق كاملاً'); return; }
    registerMutation.mutate({ phone, password, storeName, address, otpCode });
  };

  // ── زر الإرسال الرئيسي ───────────────────────────────────────
  const handleSubmit = () => {
    if (!phone.trim() || !password.trim()) { toast.warning('يرجى ملء جميع الحقول'); return; }
    if (!validatePhone(phone)) { toast.warning('رقم الهاتف يجب أن يبدأ بـ07 ويتكون من 11 رقم'); return; }

    if (isLogin) {
      loginMutation.mutate({ phone, password });
    } else {
      if (!agreedToPolicies) {
        toast.warning('يجب الموافقة على شروط الاستخدام وسياسة الخصوصية');
        return;
      }
      if (!storeName.trim()) { toast.warning('يرجى إدخال اسم المتجر'); return; }
      sendOtpMutation.mutate();
    }
  };

  // ✅ عرض Modal السياسات
  const showPoliciesModal = () => {
    setPoliciesModalVisible(true);
  };

  const isPending = loginMutation.isPending || registerMutation.isPending || sendOtpMutation.isPending;

  const indicatorLeft = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '50%'],
  });

  return (
    <View style={s.root}>
      <LinearGradient colors={[PRIMARY, PRIMARY2, '#0d9eb8']} style={s.bg} />
      <View style={s.circle1} /><View style={s.circle2} /><View style={s.circle3} />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}>
          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            <View style={s.topSection}>
              <Image source={require('../assets/logo.png')} style={s.logoImg} resizeMode="contain" />
              <Text style={s.appName}>تسليم</Text>
              <Text style={s.tagline}>منصتك لإدارة التجارة الإلكترونية</Text>
              <View style={s.dots}>
                {[0, 1, 2].map(i => <View key={i} style={[s.dot, i === 1 && s.dotActive]} />)}
              </View>
            </View>

            <View style={s.card}>

              {/* ── تبويبات ── */}
              <View style={s.tabsWrap}>
                <Animated.View style={[s.tabIndicator, { left: indicatorLeft }]} />
                <TouchableOpacity style={s.tabBtn} onPress={() => switchTab(true)}>
                  <Text style={[s.tabText, isLogin && s.tabTextActive]}>تسجيل الدخول</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.tabBtn} onPress={() => switchTab(false)}>
                  <Text style={[s.tabText, !isLogin && s.tabTextActive]}>إنشاء حساب</Text>
                </TouchableOpacity>
              </View>

              {/* ── شاشة OTP ── */}
              {!isLogin && step === 'otp' ? (
                <View style={s.otpContainer}>
                  <View style={s.otpIconWrap}>
                    <Ionicons name="logo-whatsapp" size={36} color="#25D366" />
                  </View>
                  <Text style={s.otpTitle}>تحقق من رقمك</Text>
                  <Text style={s.otpSub}>
                    أرسلنا رمز تحقق مكون من 6 أرقام{'\n'}إلى واتساب على الرقم{'\n'}
                    <Text style={s.otpPhone}>{phone}</Text>
                  </Text>

                  <View style={s.otpBoxes}>
                    {otpDigits.map((d, i) => (
                      <TextInput
                        key={i}
                        ref={r => { otpRefs.current[i] = r; }}
                        style={[s.otpBox, d && s.otpBoxFilled]}
                        value={d}
                        onChangeText={v => handleOtpChange(v, i)}
                        onKeyPress={e => handleOtpKeyPress(e, i)}
                        keyboardType="number-pad"
                        maxLength={6}
                        textAlign="center"
                        selectTextOnFocus
                      />
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[s.submitBtn, (registerMutation.isPending) && { opacity: 0.7 }]}
                    onPress={() => handleVerify()}
                    disabled={registerMutation.isPending}
                    activeOpacity={0.85}>
                    <LinearGradient colors={[PRIMARY, PRIMARY2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.submitGrad}>
                      {registerMutation.isPending
                        ? <ActivityIndicator color="#fff" />
                        : <>
                            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                            <Text style={s.submitText}>تحقق وأنشئ الحساب</Text>
                          </>
                      }
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={s.resendRow}>
                    {countdown > 0 ? (
                      <Text style={s.countdownText}>
                        إعادة الإرسال خلال <Text style={{ color: PRIMARY, fontWeight: '700' }}>00:{String(countdown).padStart(2, '0')}</Text>
                      </Text>
                    ) : (
                      <TouchableOpacity onPress={() => resendOtpMutation.mutate()} disabled={resendOtpMutation.isPending}>
                        <Text style={s.resendText}>
                          {resendOtpMutation.isPending ? 'جاري الإرسال...' : 'لم تصلك الرسالة؟ إعادة الإرسال'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity style={s.backRow} onPress={() => setStep('form')}>
                    <Ionicons name="arrow-back-outline" size={16} color="#9ca3af" />
                    <Text style={s.backText}>تعديل البيانات</Text>
                  </TouchableOpacity>
                </View>

              ) : (
                /* ── شاشة الفورم ── */
                <>
                  <View style={s.fields}>
                    <View style={s.fieldWrap}>
                      <Ionicons name="call-outline" size={19} color="#9ca3af" style={s.fieldIcon} />
                      <TextInput
                        style={s.fieldInput}
                        placeholder="رقم الهاتف - 07xxxxxxxxx"
                        value={phone}
                        onChangeText={t => setPhone(formatPhone(t))}
                        keyboardType="phone-pad"
                        textAlign="right"
                        placeholderTextColor="#9ca3af"
                        maxLength={11}
                      />
                    </View>

                    <View style={s.fieldWrap}>
                      <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                        <Ionicons name={showPass ? 'eye-outline' : 'eye-off-outline'} size={19} color="#9ca3af" style={s.fieldIcon} />
                      </TouchableOpacity>
                      <TextInput
                        style={s.fieldInput}
                        placeholder="كلمة المرور"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPass}
                        textAlign="right"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>

                    {!isLogin && (
                      <>
                        <View style={s.fieldWrap}>
                          <Ionicons name="storefront-outline" size={19} color="#9ca3af" style={s.fieldIcon} />
                          <TextInput
                            style={s.fieldInput}
                            placeholder="اسم المتجر"
                            value={storeName}
                            onChangeText={setStoreName}
                            textAlign="right"
                            placeholderTextColor="#9ca3af"
                          />
                        </View>
                        <View style={s.fieldWrap}>
                          <Ionicons name="location-outline" size={19} color="#9ca3af" style={s.fieldIcon} />
                          <TextInput
                            style={s.fieldInput}
                            placeholder="العنوان (اختياري)"
                            value={address}
                            onChangeText={setAddress}
                            textAlign="right"
                            placeholderTextColor="#9ca3af"
                          />
                        </View>

                        {/* ✅ حقل الموافقة على السياسات مع Modal داخلي */}
                        <TouchableOpacity 
                          style={s.checkboxRow}
                          onPress={() => setAgreedToPolicies(!agreedToPolicies)}
                          activeOpacity={0.8}>
                          <View style={[s.checkbox, agreedToPolicies && s.checkboxChecked]}>
                            {agreedToPolicies && <Ionicons name="checkmark" size={14} color="#fff" />}
                          </View>
                          <Text style={s.checkboxText}>
                            أوافق على{' '}
                            <Text 
                              style={s.linkText} 
                              onPress={(e) => {
                                e.stopPropagation();
                                showPoliciesModal();
                              }}>
                              شروط الاستخدام
                            </Text>
                            {' '}و{' '}
                            <Text 
                              style={s.linkText} 
                              onPress={(e) => {
                                e.stopPropagation();
                                showPoliciesModal();
                              }}>
                              سياسة الخصوصية
                            </Text>
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>

                  {phone.length > 0 && !validatePhone(phone) && (
                    <Text style={s.phoneHint}>يجب أن يبدأ رقم الهاتف بـ07 ويتكون من 11 رقم</Text>
                  )}

                  <TouchableOpacity
                    style={[s.submitBtn, isPending && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={isPending}
                    activeOpacity={0.85}>
                    <LinearGradient colors={[PRIMARY, PRIMARY2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.submitGrad}>
                      {isPending
                        ? <ActivityIndicator color="#fff" />
                        : <>
                            <Ionicons name={isLogin ? 'log-in-outline' : 'send-outline'} size={20} color="#fff" />
                            <Text style={s.submitText}>{isLogin ? 'دخول' : 'إرسال رمز التحقق'}</Text>
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
                </>
              )}

            </View>

            <Text style={s.footer}>جميع الحقوق محفوظة © تسليم 2026</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ✅ Modal لعرض سياسات تسليم (بدون روابط خارجية) */}
      <Modal
        visible={policiesModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPoliciesModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalContainer}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>سياسات تسليم</Text>
              <TouchableOpacity onPress={() => setPoliciesModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color={PRIMARY} />
              </TouchableOpacity>
            </View>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.modalContent}>
              
              {/* شروط الاستخدام */}
              <Text style={s.modalSectionTitle}>📋 شروط الاستخدام</Text>
              <Text style={s.modalText}>
                <Text style={s.modalBold}>مقدمة:</Text>{"\n"}
                باستخدامك لتطبيق "تسليم"، فأنت توافق على الالتزام بهذه الشروط. المنصة عراقية متخصصة بنظام الدروب شيبينج، وتوفر بيئة آمنة للتجار والزبائن.
                {"\n\n"}
                <Text style={s.modalBold}>التسجيل والحساب:</Text>{"\n"}
                • يجب أن يكون عمر التاجر 18 سنة فأكثر.{"\n"}
                • التاجر مسؤول عن الحفاظ على سرية بيانات حسابه.{"\n"}
                • تسليم تحتفظ بالحق في تعليق أو إلغاء الحساب المخالف.
                {"\n\n"}
                <Text style={s.modalBold}>الخدمة والرسوم:</Text>{"\n"}
                الاشتراك في منصة تسليم مجاني بالكامل بدون أي رسوم شهرية أو سنوية. ربح التاجر هو الفرق بين سعر الجملة وسعر البيع الذي يحدده التاجر بنفسه.
              </Text>

              <View style={s.modalDivider} />

              {/* سياسة الخصوصية */}
              <Text style={s.modalSectionTitle}>🔒 سياسة الخصوصية</Text>
              <Text style={s.modalText}>
                <Text style={s.modalBold}>البيانات التي نجمعها:</Text>{"\n"}
                • الاسم الكامل ورقم الهاتف.{"\n"}
                • معلومات الماستر كارد المخصصة لاستلام الأرباح.{"\n"}
                • بيانات الطلبات والمبيعات.{"\n\n"}
                <Text style={s.modalBold}>كيف نستخدم بياناتك:</Text>{"\n"}
                إدارة حسابك ومعالجة طلبات السحب، إرسال إشعارات الطلبات، تحسين خدماتنا. نحن لا نبيع بياناتك لأي طرف ثالث.
              </Text>

              <View style={s.modalDivider} />

              {/* سياسة الاسترجاع والاستبدال */}
              <Text style={s.modalSectionTitle}>📦 سياسة الاسترجاع والاستبدال</Text>
              <Text style={s.modalText}>
                <Text style={s.modalBold}>شروط الاسترجاع:</Text>{"\n"}
                يحق للزبون استرجاع المنتج خلال 3 أيام من تاريخ الاستلام، بشرط أن يكون بحالته الأصلية غير مستخدم. في حال وجود عيب مصنعي، يُستبدل المنتج أو يُعاد المبلغ مجاناً.
                {"\n\n"}
                <Text style={s.modalBold}>شروط الاستبدال:</Text>{"\n"}
                يمكن استبدال المنتج خلال 7 أيام من تاريخ الاستلام إذا كان بحالته الأصلية. إذا كان سبب الاستبدال تغيير الرأي، يتحمل الزبون تكاليف التوصيل.
              </Text>

              <View style={s.modalDivider} />

              {/* سياسة التوصيل */}
              <Text style={s.modalSectionTitle}>🚚 سياسة التوصيل</Text>
              <Text style={s.modalText}>
                <Text style={s.modalBold}>مناطق التوصيل:</Text> جميع محافظات العراق{"\n"}
                <Text style={s.modalBold}>مدة التوصيل:</Text>{"\n"}
                • داخل محافظة البصرة: 1-2 يوم عمل{"\n"}
                • باقي المحافظات: 2-4 أيام عمل{"\n\n"}
                <Text style={s.modalBold}>أجور التوصيل:</Text>{"\n"}
                • داخل البصرة: 3,000 د.ع{"\n"}
                • باقي المحافظات: 5,000 د.ع
              </Text>

              <View style={s.modalDivider} />

              {/* سياسة السحوبات */}
              <Text style={s.modalSectionTitle}>💰 سياسة السحوبات</Text>
              <Text style={s.modalText}>
                <Text style={s.modalBold}>شروط السحب:</Text>{"\n"}
                يتم سحب الأرباح عبر الماستر كارد فقط. يجب إضافة بيانات الماستر كارد الصحيحة قبل طلب السحب.
                {"\n\n"}
                <Text style={s.modalBold}>معالجة طلبات السحب:</Text>{"\n"}
                يتم مراجعة الطلب وتحويل المبلغ خلال 1-3 أيام عمل من تاريخ الموافقة.
              </Text>

              <View style={s.modalDivider} />

              {/* جهات الاتصال */}
              <Text style={s.modalSectionTitle}>📞 التواصل معنا</Text>
              <Text style={s.modalText}>
                رقم خدمة الزبائن: <Text style={s.modalBold}>07782784995</Text>{"\n"}
                الدعم الفني: متاح داخل التطبيق من قسم "الدعم الفني"
              </Text>

              <Text style={s.modalFooter}>
                آخر تحديث: مايو 2026 {"\n"}
                جميع الحقوق محفوظة © تسليم 2026
              </Text>

              <TouchableOpacity 
                style={s.modalCloseBtn}
                onPress={() => setPoliciesModalVisible(false)}>
                <Text style={s.modalCloseBtnText}>أوافق وأغلق</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  bg:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  circle1: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(255,255,255,0.06)', top: -100, right: -80 },
  circle2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.04)', top: 120, left: -60 },
  circle3: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(245,160,6,0.07)', bottom: 180, right: -50 },
  scroll:  { flexGrow: 1, paddingBottom: 30 },

  topSection: { alignItems: 'center', paddingTop: 44, paddingBottom: 36 },
  logoImg:    { width: 110, height: 110, marginBottom: 16 },
  appName:    { fontSize: 38, fontWeight: 'bold', color: '#fff', letterSpacing: 3, marginBottom: 8 },
  tagline:    { fontSize: 13, color: 'rgba(255,255,255,0.72)' },
  dots:       { flexDirection: 'row', gap: 6, marginTop: 20 },
  dot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive:  { width: 22, backgroundColor: ACCENT, borderRadius: 3 },

  card: { marginHorizontal: 16, borderRadius: 32, backgroundColor: '#fff', padding: 24, shadowColor: '#0c6679', shadowOpacity: 0.18, shadowRadius: 32, shadowOffset: { width: 0, height: 12 }, elevation: 16 },

  tabsWrap:      { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 18, padding: 4, marginBottom: 26, position: 'relative', height: 50 },
  tabIndicator:  { position: 'absolute', top: 4, bottom: 4, width: '50%', backgroundColor: PRIMARY, borderRadius: 14, shadowColor: PRIMARY, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5 },
  tabBtn:        { flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  tabText:       { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  tabTextActive: { color: '#fff' },

  fields:    { gap: 12, marginBottom: 22 },
  fieldWrap: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, paddingHorizontal: 16, height: 56, borderWidth: 1.5, borderColor: '#e5e7eb', gap: 10 },
  fieldIcon: { width: 28, textAlign: 'center' },
  fieldInput:{ flex: 1, fontSize: 15, color: '#111827' },
  phoneHint: { fontSize: 12, color: '#ef4444', marginTop: -10, marginBottom: 10, textAlign: 'right', paddingHorizontal: 8 },

  // أنماط الموافقة على السياسات
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  checkboxText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
    textAlign: 'right',
  },
  linkText: {
    color: PRIMARY,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  submitBtn:  { borderRadius: 18, overflow: 'hidden', marginBottom: 22, shadowColor: PRIMARY, shadowOpacity: 0.4, shadowRadius: 14, elevation: 7 },
  submitGrad: { height: 56, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10 },
  submitText: { fontSize: 16, fontWeight: 'bold', color: '#fff', letterSpacing: 0.8 },

  divider:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#f1f5f9' },
  dividerText: { fontSize: 13, color: '#d1d5db' },
  switchRow:   { alignItems: 'center', gap: 6 },
  switchText:  { fontSize: 13, color: '#9ca3af' },
  switchAccent:{ fontSize: 14, fontWeight: 'bold', color: PRIMARY },

  // OTP
  otpContainer: { alignItems: 'center', paddingVertical: 8 },
  otpIconWrap:  { width: 72, height: 72, borderRadius: 24, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  otpTitle:     { fontSize: 20, fontWeight: '900', color: '#0d1b2a', marginBottom: 10 },
  otpSub:       { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  otpPhone:     { color: PRIMARY, fontWeight: '700' },
  otpBoxes:     { flexDirection: 'row', gap: 10, marginBottom: 28 },
  otpBox: {
    width: 46, height: 54, borderRadius: 14,
    borderWidth: 2, borderColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
    fontSize: 22, fontWeight: '900', color: '#0d1b2a',
  },
  otpBoxFilled: { borderColor: PRIMARY, backgroundColor: PRIMARY + '08' },

  resendRow:     { marginTop: 16, alignItems: 'center' },
  countdownText: { fontSize: 13, color: '#9ca3af' },
  resendText:    { fontSize: 13, color: PRIMARY, fontWeight: '700', textDecorationLine: 'underline' },
  backRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  backText:      { fontSize: 13, color: '#9ca3af' },

  footer: { textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 26, paddingHorizontal: 20 },

  // أنماط Modal السياسات
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 28,
    width: '100%',
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PRIMARY,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: PRIMARY,
    marginBottom: 8,
    marginTop: 8,
  },
  modalText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
    textAlign: 'justify',
  },
  modalBold: {
    fontWeight: 'bold',
    color: '#111827',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#e8edf2',
    marginVertical: 16,
  },
  modalFooter: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  modalCloseBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  modalCloseBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});