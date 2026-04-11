import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';
const BG = '#f2f6f9';

export default function ProfileEditScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => { const { data } = await api.get('/api/auth/me'); return data; },
  });

  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [initialized, setInitialized] = useState(false);

  if (user && !initialized) {
    setStoreName(user.storeName || '');
    setPhone(user.phone || '');
    setAddress(user.address || '');
    setInitialized(true);
  }

  const updateProfile = useMutation({
    mutationFn: async (body: any) => { const { data } = await api.patch('/api/auth/profile', body); return data; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['user'] }); Alert.alert('تم!', 'تم تحديث الملف الشخصي بنجاح'); },
    onError: (e: any) => Alert.alert('خطأ', e?.response?.data?.message || 'فشل تحديث الملف الشخصي'),
  });

  const handleSave = () => {
    if (!storeName || !phone) { Alert.alert('خطأ', 'يرجى تعبئة الحقول المطلوبة'); return; }
    updateProfile.mutate({ storeName, phone, address });
  };

  const handleChangePassword = () => {
    if (!currentPass || !newPass || !confirmPass) { Alert.alert('خطأ', 'يرجى تعبئة جميع حقول كلمة المرور'); return; }
    if (newPass !== confirmPass) { Alert.alert('خطأ', 'كلمة المرور الجديدة وتأكيدها غير متطابقين'); return; }
    if (newPass.length < 6) { Alert.alert('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    updateProfile.mutate({ currentPassword: currentPass, newPassword: newPass });
  };

  if (isLoading) return (
    <View style={s.center}><ActivityIndicator size="large" color={PRIMARY} /></View>
  );

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>

      {/* ── Header معكوس RTL ── */}
      <View style={s.header}>
        <View style={s.headerContent}>
          <View style={{ width: 40 }} />
          <Text style={s.headerTitle}>تعديل الملف الشخصي</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── بطاقة المستخدم المطورة ── */}
      <LinearGradient
        colors={[PRIMARY, '#0a8a9f', '#0c6679']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.heroCard}>
        <View style={s.heroContent}>
          <View style={s.userInfo}>
            <Text style={s.userName}>{user?.storeName || 'تاجر'}</Text>
            <Text style={s.userId}>ID: {user?.merchantId || '------'}</Text>
            <View style={s.roleBadge}>
              <Ionicons name={user?.role === 'admin' ? 'shield-checkmark' : 'storefront'} size={12} color="#fff" />
              <Text style={s.roleText}>{user?.role === 'admin' ? 'مدير' : 'تاجر'}</Text>
            </View>
          </View>
          <View style={s.avatarContainer}>
            <View style={s.avatarRing}>
              <Text style={s.avatarText}>{user?.storeName?.charAt(0) || 'ت'}</Text>
            </View>
            <View style={s.editIconBadge}>
              <Ionicons name="camera-outline" size={12} color="#fff" />
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── معلومات المتجر (بطاقة مطورة) ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>معلومات المتجر</Text>
            <View style={s.cardIconBox}>
              <Ionicons name="storefront-outline" size={18} color={PRIMARY} />
            </View>
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.label}>اسم المتجر <Text style={s.req}>*</Text></Text>
            <View style={s.inputWrap}>
              <Ionicons name="storefront-outline" size={16} color="#9ca3af" />
              <TextInput
                style={s.input}
                value={storeName}
                onChangeText={setStoreName}
                textAlign="right"
                placeholderTextColor="#9ca3af"
                placeholder="اسم المتجر"
              />
            </View>
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.label}>رقم الهاتف <Text style={s.req}>*</Text></Text>
            <View style={s.inputWrap}>
              <Ionicons name="call-outline" size={16} color="#9ca3af" />
              <TextInput
                style={s.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                textAlign="right"
                placeholderTextColor="#9ca3af"
                placeholder="07XXXXXXXXX"
              />
            </View>
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.label}>العنوان</Text>
            <View style={[s.inputWrap, s.textareaWrap]}>
              <Ionicons name="location-outline" size={16} color="#9ca3af" style={s.textareaIcon} />
              <TextInput
                style={[s.input, s.textarea]}
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
                textAlign="right"
                placeholderTextColor="#9ca3af"
                placeholder="العنوان التفصيلي"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[s.saveBtn, updateProfile.isPending && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={updateProfile.isPending}>
            {updateProfile.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={s.saveBtnText}>حفظ التغييرات</Text>
                <Ionicons name="checkmark-outline" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── تغيير كلمة المرور (بطاقة مطورة) ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>تغيير كلمة المرور</Text>
            <View style={[s.cardIconBox, { backgroundColor: '#f5f3ff' }]}>
              <Ionicons name="lock-closed-outline" size={18} color="#8b5cf6" />
            </View>
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.label}>كلمة المرور الحالية</Text>
            <View style={s.inputWrap}>
              <Ionicons name="lock-closed-outline" size={16} color="#9ca3af" />
              <TextInput
                style={s.input}
                value={currentPass}
                onChangeText={setCurrentPass}
                secureTextEntry
                textAlign="right"
                placeholderTextColor="#9ca3af"
                placeholder="••••••••"
              />
            </View>
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.label}>كلمة المرور الجديدة</Text>
            <View style={s.inputWrap}>
              <Ionicons name="key-outline" size={16} color="#9ca3af" />
              <TextInput
                style={s.input}
                value={newPass}
                onChangeText={setNewPass}
                secureTextEntry
                textAlign="right"
                placeholderTextColor="#9ca3af"
                placeholder="••••••••"
              />
            </View>
          </View>

          <View style={s.fieldGroup}>
            <Text style={s.label}>تأكيد كلمة المرور</Text>
            <View style={s.inputWrap}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#9ca3af" />
              <TextInput
                style={s.input}
                value={confirmPass}
                onChangeText={setConfirmPass}
                secureTextEntry
                textAlign="right"
                placeholderTextColor="#9ca3af"
                placeholder="••••••••"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[s.passBtn, updateProfile.isPending && { opacity: 0.7 }]}
            onPress={handleChangePassword}
            disabled={updateProfile.isPending}>
            {updateProfile.isPending ? (
              <ActivityIndicator color={PRIMARY} size="small" />
            ) : (
              <>
                <Text style={s.passBtnText}>تغيير كلمة المرور</Text>
                <Ionicons name="refresh-outline" size={18} color={PRIMARY} />
              </>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Header معكوس RTL ──
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0f9fa',
    borderWidth: 1.5,
    borderColor: '#d4eef3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },

  // ── Hero Card مطورة ──
  heroCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 24,
    padding: 20,
    shadowColor: PRIMARY,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfo: {
    alignItems: 'flex-start',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userId: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },

  scroll: { padding: 16, paddingBottom: 40 },

  // ── البطاقات ──
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PRIMARY + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },

  // ── الحقول ──
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'right',
    marginBottom: 6,
  },
  req: {
    color: '#ef4444',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#e8edf2',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    backgroundColor: '#f8fafc',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  textareaWrap: {
    height: 'auto',
    minHeight: 80,
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  textareaIcon: {
    marginTop: 2,
  },
  textarea: {
    height: 60,
    textAlignVertical: 'top',
  },

  // ── الأزرار ──
  saveBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
    gap: 6,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  passBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderRadius: 14,
    height: 48,
    marginTop: 8,
    backgroundColor: '#fff',
  },
  passBtnText: {
    color: PRIMARY,
    fontWeight: 'bold',
    fontSize: 15,
  },
});