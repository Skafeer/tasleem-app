import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const SECONDARY = '#f5a006';
const SUCCESS = '#10b981';

export default function ProfileScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [editForm, setEditForm] = useState({ storeName: '', address: '' });
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => { const { data } = await api.get('/api/auth/me'); return data; },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['user-orders'],
    queryFn: async () => { const { data } = await api.get('/api/orders'); return data; },
  });

  const deliveredOrders = orders.filter((o: any) => o.status === 'delivered');
  const pendingOrders = orders.filter((o: any) => o.status !== 'delivered' && o.status !== 'returned');
  const earnedProfit = deliveredOrders.reduce((s: number, o: any) => s + (o.totalProfit || 0), 0);
  const pendingProfit = pendingOrders.reduce((s: number, o: any) => s + (o.totalProfit || 0), 0);

  const updateProfile = useMutation({
    mutationFn: async (data: any) => { const res = await api.patch('/api/auth/profile', data); return res.data; },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user'] });
      toast.success('تم تحديث المعلومات ✅');
      setShowEditProfile(false);
    },
  });

  const changePassword = useMutation({
    mutationFn: async (data: any) => { const res = await api.post('/api/auth/change-password', data); return res.data; },
    onSuccess: () => {
      toast.success('تم تغيير كلمة المرور ✅');
      setShowChangePassword(false);
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل تغيير كلمة المرور'),
  });

  const requestDelete = useMutation({
    mutationFn: async () => { const res = await api.post('/api/auth/request-delete'); return res.data; },
    onSuccess: () => toast.success('تم إرسال طلب حذف الحساب للإدارة'),
  });

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    qc.clear();
    router.replace('/auth');
  };

  const handleEditProfile = () => {
    setEditForm({ storeName: user?.storeName || '', address: user?.address || '' });
    setShowEditProfile(true);
  };

  const handleChangePassword = () => {
    if (!passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.warning('كلمة المرور غير متطابقة'); return;
    }
    changePassword.mutate({ oldPassword: passwordForm.oldPassword, newPassword: passwordForm.newPassword });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'تأكيد الحذف',
      'هل أنت متأكد من طلب حذف حسابك؟ سيتم مراجعة الطلب من قبل الإدارة.',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'نعم، احذف', style: 'destructive', onPress: () => requestDelete.mutate() },
      ]
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <LinearGradient colors={[PRIMARY, '#0a5566']} style={s.header}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{user?.storeName?.charAt(0) || 'ت'}</Text>
          </View>
          <Text style={s.storeName}>{user?.storeName}</Text>
          <Text style={s.phone}>{user?.phone}</Text>
          <View style={s.idBadge}>
            <Text style={s.idText}>ID: {user?.merchantId}</Text>
          </View>
        </LinearGradient>

        {/* Profit Cards */}
        <View style={s.profitCards}>
          <View style={s.profitCard}>
            <Ionicons name="checkmark-circle" size={28} color={SUCCESS} />
            <Text style={s.profitLabel}>الأرباح المحققة</Text>
            <Text style={[s.profitValue, { color: SUCCESS }]}>{earnedProfit.toLocaleString()} د.ع</Text>
            <Text style={s.profitSub}>من {deliveredOrders.length} طلب مُسلَّم</Text>
          </View>
          <View style={s.profitCard}>
            <Ionicons name="time" size={28} color={SECONDARY} />
            <Text style={s.profitLabel}>الأرباح المنتظرة</Text>
            <Text style={[s.profitValue, { color: SECONDARY }]}>{pendingProfit.toLocaleString()} د.ع</Text>
            <Text style={s.profitSub}>من {pendingOrders.length} طلب قيد المعالجة</Text>
          </View>
        </View>

        {/* Store Info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📦 معلومات المتجر</Text>
          <View style={s.infoBox}>
            <View style={s.infoRow}>
              <Text style={s.infoVal}>{user?.storeName}</Text>
              <Text style={s.infoLabel}>اسم المتجر</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoVal}>{user?.address}</Text>
              <Text style={s.infoLabel}>العنوان</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoVal}>{user?.phone}</Text>
              <Text style={s.infoLabel}>رقم الهاتف</Text>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>⚙️ إعدادات إضافية</Text>
          
          <TouchableOpacity style={s.settingBtn} onPress={handleEditProfile}>
            <Ionicons name="chevron-back" size={18} color="#9ca3af" />
            <Text style={s.settingText}>تعديل المعلومات</Text>
            <Ionicons name="create-outline" size={20} color={PRIMARY} />
          </TouchableOpacity>

          <TouchableOpacity style={s.settingBtn} onPress={() => setShowChangePassword(true)}>
            <Ionicons name="chevron-back" size={18} color="#9ca3af" />
            <Text style={s.settingText}>تغيير كلمة المرور</Text>
            <Ionicons name="key-outline" size={20} color={PRIMARY} />
          </TouchableOpacity>

          <TouchableOpacity style={[s.settingBtn, { borderColor: '#fef2f2' }]} onPress={handleDeleteAccount}>
            <Ionicons name="chevron-back" size={18} color="#9ca3af" />
            <Text style={[s.settingText, { color: '#ef4444' }]}>طلب حذف الحساب</Text>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>

          <TouchableOpacity style={[s.settingBtn, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}
            onPress={handleLogout}>
            <Ionicons name="chevron-back" size={18} color="#ef4444" />
            <Text style={[s.settingText, { color: '#ef4444', fontWeight: 'bold' }]}>تسجيل الخروج</Text>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditProfile} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditProfile(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={s.modalTitle}>تعديل المعلومات</Text>
            </View>
            <Text style={s.inputLabel}>اسم المتجر</Text>
            <TextInput style={s.input} value={editForm.storeName}
              onChangeText={v => setEditForm(p => ({ ...p, storeName: v }))}
              textAlign="right" placeholderTextColor="#9ca3af" />
            <Text style={s.inputLabel}>العنوان</Text>
            <TextInput style={s.input} value={editForm.address}
              onChangeText={v => setEditForm(p => ({ ...p, address: v }))}
              textAlign="right" placeholderTextColor="#9ca3af" />
            <TouchableOpacity style={s.modalBtn}
              onPress={() => updateProfile.mutate(editForm)}
              disabled={updateProfile.isPending}>
              {updateProfile.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.modalBtnText}>حفظ التعديلات</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={showChangePassword} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowChangePassword(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={s.modalTitle}>تغيير كلمة المرور</Text>
            </View>
            <Text style={s.inputLabel}>كلمة المرور الحالية</Text>
            <TextInput style={s.input} secureTextEntry
              value={passwordForm.oldPassword}
              onChangeText={v => setPasswordForm(p => ({ ...p, oldPassword: v }))}
              textAlign="right" placeholderTextColor="#9ca3af" />
            <Text style={s.inputLabel}>كلمة المرور الجديدة</Text>
            <TextInput style={s.input} secureTextEntry
              value={passwordForm.newPassword}
              onChangeText={v => setPasswordForm(p => ({ ...p, newPassword: v }))}
              textAlign="right" placeholderTextColor="#9ca3af" />
            <Text style={s.inputLabel}>تأكيد كلمة المرور</Text>
            <TextInput style={s.input} secureTextEntry
              value={passwordForm.confirmPassword}
              onChangeText={v => setPasswordForm(p => ({ ...p, confirmPassword: v }))}
              textAlign="right" placeholderTextColor="#9ca3af" />
            <TouchableOpacity style={s.modalBtn}
              onPress={handleChangePassword}
              disabled={changePassword.isPending}>
              {changePassword.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.modalBtnText}>تغيير كلمة المرور</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: '#fff' },
  storeName: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  phone: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  idBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 6, marginTop: 8 },
  idText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  profitCards: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: -30 },
  profitCard: { flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 16,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 10, elevation: 4 },
  profitLabel: { fontSize: 12, color: '#6b7280', marginTop: 8, textAlign: 'center' },
  profitValue: { fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  profitSub: { fontSize: 10, color: '#9ca3af', marginTop: 4 },
  section: { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827',
    textAlign: 'right', marginBottom: 12 },
  infoBox: { backgroundColor: '#fff', borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2, gap: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  infoLabel: { fontSize: 13, color: '#6b7280' },
  infoVal: { fontSize: 13, color: '#111827', fontWeight: '600' },
  settingBtn: { backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    marginBottom: 10, borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  settingText: { flex: 1, fontSize: 14, color: '#374151', fontWeight: '500', textAlign: 'right' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  inputLabel: { fontSize: 12, color: '#374151', textAlign: 'right',
    marginBottom: 6, marginTop: 12, fontWeight: '600' },
  input: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 12, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb' },
  modalBtn: { backgroundColor: PRIMARY, borderRadius: 14, height: 50,
    justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  modalBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
