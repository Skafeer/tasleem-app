import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';

export default function ProfileEditScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => { const { data } = await api.get('/api/auth/me'); return data; },
  });

  const [storeName, setStoreName]   = useState('');
  const [phone, setPhone]           = useState('');
  const [address, setAddress]       = useState('');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass]       = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [initialized, setInitialized] = useState(false);

  if (user && !initialized) {
    setStoreName(user.storeName || '');
    setPhone(user.phone || '');
    setAddress(user.address || '');
    setInitialized(true);
  }

  const updateProfile = useMutation({
    mutationFn: async (body: any) => {
      const { data } = await api.patch('/api/auth/profile', body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      Alert.alert('تم!', 'تم تحديث الملف الشخصي بنجاح');
    },
    onError: (e: any) =>
      Alert.alert('خطأ', e?.response?.data?.message || 'فشل تحديث الملف الشخصي'),
  });

  const handleSave = () => {
    if (!storeName || !phone) {
      Alert.alert('خطأ', 'يرجى تعبئة الحقول المطلوبة'); return;
    }
    updateProfile.mutate({ storeName, phone, address });
  };

  const handleChangePassword = () => {
    if (!currentPass || !newPass || !confirmPass) {
      Alert.alert('خطأ', 'يرجى تعبئة جميع حقول كلمة المرور'); return;
    }
    if (newPass !== confirmPass) {
      Alert.alert('خطأ', 'كلمة المرور الجديدة وتأكيدها غير متطابقين'); return;
    }
    if (newPass.length < 6) {
      Alert.alert('خطأ', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return;
    }
    updateProfile.mutate({ currentPassword: currentPass, newPassword: newPass });
  };

  if (isLoading) return (
    <View style={s.center}><ActivityIndicator size="large" color={PRIMARY} /></View>
  );

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-forward" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={s.title}>تعديل الملف الشخصي</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Avatar */}
        <View style={s.avatarBox}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {user?.storeName?.substring(0, 1) || '؟'}
            </Text>
          </View>
          <Text style={s.avatarName}>{user?.storeName}</Text>
          <Text style={s.avatarId}>ID: {user?.merchantId}</Text>
        </View>

        {/* Profile Info */}
        <View style={s.card}>
          <Text style={s.cardTitle}>معلومات المتجر</Text>

          <Text style={s.label}>اسم المتجر <Text style={s.req}>*</Text></Text>
          <View style={s.inputWrap}>
            <TextInput style={s.input} value={storeName}
              onChangeText={setStoreName} textAlign="right"
              placeholderTextColor="#9ca3af" />
            <Ionicons name="storefront-outline" size={18} color="#9ca3af" />
          </View>

          <Text style={s.label}>رقم الهاتف <Text style={s.req}>*</Text></Text>
          <View style={s.inputWrap}>
            <TextInput style={s.input} value={phone}
              onChangeText={setPhone} keyboardType="phone-pad"
              textAlign="right" placeholderTextColor="#9ca3af" />
            <Ionicons name="call-outline" size={18} color="#9ca3af" />
          </View>

          <Text style={s.label}>العنوان</Text>
          <View style={[s.inputWrap, { height: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
            <TextInput style={[s.input, { height: 60 }]}
              value={address} onChangeText={setAddress}
              multiline textAlign="right" placeholderTextColor="#9ca3af" />
            <Ionicons name="location-outline" size={18} color="#9ca3af" style={{ marginTop: 2 }} />
          </View>

          <TouchableOpacity
            style={[s.saveBtn, updateProfile.isPending && { opacity: 0.7 }]}
            onPress={handleSave} disabled={updateProfile.isPending}>
            {updateProfile.isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.saveBtnText}>حفظ التغييرات</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Change Password */}
        <View style={s.card}>
          <Text style={s.cardTitle}>تغيير كلمة المرور</Text>

          <Text style={s.label}>كلمة المرور الحالية</Text>
          <View style={s.inputWrap}>
            <TextInput style={s.input} value={currentPass}
              onChangeText={setCurrentPass} secureTextEntry
              textAlign="right" placeholderTextColor="#9ca3af"
              placeholder="••••••••" />
            <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" />
          </View>

          <Text style={s.label}>كلمة المرور الجديدة</Text>
          <View style={s.inputWrap}>
            <TextInput style={s.input} value={newPass}
              onChangeText={setNewPass} secureTextEntry
              textAlign="right" placeholderTextColor="#9ca3af"
              placeholder="••••••••" />
            <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" />
          </View>

          <Text style={s.label}>تأكيد كلمة المرور</Text>
          <View style={s.inputWrap}>
            <TextInput style={s.input} value={confirmPass}
              onChangeText={setConfirmPass} secureTextEntry
              textAlign="right" placeholderTextColor="#9ca3af"
              placeholder="••••••••" />
            <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" />
          </View>

          <TouchableOpacity style={[s.passBtn, updateProfile.isPending && { opacity: 0.7 }]}
            onPress={handleChangePassword} disabled={updateProfile.isPending}>
            {updateProfile.isPending
              ? <ActivityIndicator color={PRIMARY} />
              : <Text style={s.passBtnText}>تغيير كلمة المرور</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  avatarBox: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 88, height: 88, borderRadius: 44,
    backgroundColor: `${PRIMARY}15`, justifyContent: 'center',
    alignItems: 'center', borderWidth: 3, borderColor: `${PRIMARY}30`, marginBottom: 12 },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: PRIMARY },
  avatarName: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  avatarId: { fontSize: 13, color: '#9ca3af' },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 20,
    marginBottom: 16, shadowColor: '#000',
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827',
    textAlign: 'right', marginBottom: 16,
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  label: { fontSize: 13, fontWeight: '500', color: '#374151',
    textAlign: 'right', marginBottom: 6, marginTop: 10 },
  req: { color: '#ef4444' },
  inputWrap: { flexDirection: 'row-reverse', alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, height: 48, backgroundColor: '#f9fafb' },
  input: { flex: 1, fontSize: 14, color: '#111827', paddingRight: 8 },
  saveBtn: { backgroundColor: PRIMARY, borderRadius: 14, height: 50,
    justifyContent: 'center', alignItems: 'center', marginTop: 20,
    shadowColor: PRIMARY, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  passBtn: { borderWidth: 1.5, borderColor: PRIMARY, borderRadius: 14,
    height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  passBtnText: { color: PRIMARY, fontWeight: 'bold', fontSize: 15 },
});
