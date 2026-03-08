import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';

export default function ProfileEditScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => { const { data } = await api.get('/api/auth/me'); return data; },
  });

  const [storeName, setStoreName]     = useState('');
  const [phone, setPhone]             = useState('');
  const [address, setAddress]         = useState('');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass]         = useState('');
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

      <LinearGradient colors={[PRIMARY, '#0a8a9f']} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-forward" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>تعديل الملف الشخصي</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Avatar */}
        <View style={s.avatarWrap}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{user?.storeName?.substring(0, 1) || 'ت'}</Text>
          </View>
          <Text style={s.avatarName}>{user?.storeName}</Text>
          <Text style={s.avatarId}>ID: {user?.merchantId}</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* معلومات المتجر */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.cardIconBox}>
              <Ionicons name="storefront-outline" size={18} color={PRIMARY} />
            </View>
            <Text style={s.cardTitle}>معلومات المتجر</Text>
          </View>

          <Text style={s.label}>اسم المتجر <Text style={s.req}>*</Text></Text>
          <View style={s.inputWrap}>
            <Ionicons name="storefront-outline" size={18} color="#9ca3af" />
            <TextInput style={s.input} value={storeName} onChangeText={setStoreName}
              textAlign="right" placeholderTextColor="#9ca3af" />
          </View>

          <Text style={s.label}>رقم الهاتف <Text style={s.req}>*</Text></Text>
          <View style={s.inputWrap}>
            <Ionicons name="call-outline" size={18} color="#9ca3af" />
            <TextInput style={s.input} value={phone} onChangeText={setPhone}
              keyboardType="phone-pad" textAlign="right" placeholderTextColor="#9ca3af" />
          </View>

          <Text style={s.label}>العنوان</Text>
          <View style={[s.inputWrap, { height: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
            <Ionicons name="location-outline" size={18} color="#9ca3af" style={{ marginTop: 2 }} />
            <TextInput style={[s.input, { height: 60 }]} value={address}
              onChangeText={setAddress} multiline textAlign="right" placeholderTextColor="#9ca3af" />
          </View>

          <TouchableOpacity style={[s.saveBtn, updateProfile.isPending && { opacity: 0.7 }]}
            onPress={handleSave} disabled={updateProfile.isPending}>
            <LinearGradient colors={[PRIMARY, '#0a8a9f']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtnInner}>
              {updateProfile.isPending
                ? <ActivityIndicator color="#fff" />
                : <><Ionicons name="checkmark-outline" size={18} color="#fff" /><Text style={s.saveBtnText}>حفظ التغييرات</Text></>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* تغيير كلمة المرور */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.cardIconBox}>
              <Ionicons name="lock-closed-outline" size={18} color="#8b5cf6" />
            </View>
            <Text style={s.cardTitle}>تغيير كلمة المرور</Text>
          </View>

          {[
            { label: 'كلمة المرور الحالية', value: currentPass, set: setCurrentPass },
            { label: 'كلمة المرور الجديدة', value: newPass, set: setNewPass },
            { label: 'تأكيد كلمة المرور', value: confirmPass, set: setConfirmPass },
          ].map((f, i) => (
            <View key={i}>
              <Text style={s.label}>{f.label}</Text>
              <View style={s.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" />
                <TextInput style={s.input} value={f.value} onChangeText={f.set}
                  secureTextEntry textAlign="right" placeholderTextColor="#9ca3af" placeholder="••••••••" />
              </View>
            </View>
          ))}

          <TouchableOpacity style={[s.passBtn, updateProfile.isPending && { opacity: 0.7 }]}
            onPress={handleChangePassword} disabled={updateProfile.isPending}>
            {updateProfile.isPending
              ? <ActivityIndicator color={PRIMARY} />
              : <><Ionicons name="key-outline" size={18} color={PRIMARY} /><Text style={s.passBtnText}>تغيير كلمة المرور</Text></>
            }
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8fafc' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:       { paddingHorizontal: 16, paddingBottom: 28 },
  headerRow:    { flexDirection: 'row-reverse', alignItems: 'center',
    justifyContent: 'space-between', paddingTop: 12, marginBottom: 20 },
  backBtn:      { width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle:  { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  avatarWrap:   { alignItems: 'center', gap: 8 },
  avatar:       { width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', marginBottom: 4 },
  avatarText:   { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  avatarName:   { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  avatarId:     { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  scroll:       { padding: 16, paddingBottom: 40 },
  card:         { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardHeader:   { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 16,
    paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  cardIconBox:  { width: 36, height: 36, borderRadius: 10, backgroundColor: `${PRIMARY}12`,
    justifyContent: 'center', alignItems: 'center' },
  cardTitle:    { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  label:        { fontSize: 13, fontWeight: '500', color: '#374151', textAlign: 'right', marginBottom: 6, marginTop: 12 },
  req:          { color: '#ef4444' },
  inputWrap:    { flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 14,
    paddingHorizontal: 14, height: 50, backgroundColor: '#f8fafc' },
  input:        { flex: 1, fontSize: 14, color: '#111827' },
  saveBtn:      { borderRadius: 14, overflow: 'hidden', marginTop: 20,
    shadowColor: PRIMARY, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  saveBtnInner: { height: 50, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnText:  { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  passBtn:      { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: PRIMARY, borderRadius: 14, height: 50, marginTop: 20 },
  passBtnText:  { color: PRIMARY, fontWeight: 'bold', fontSize: 15 },
});
