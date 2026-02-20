import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';

export default function ProfileScreen() {
  const router = useRouter();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => { const { data } = await api.get('/api/auth/me'); return data; },
  });

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    router.replace('/auth');
  };

  const menuItems = [
    { key: 'profile-edit', label: 'الملف الشخصي', icon: 'person-outline', color: '#3b82f6', bg: '#dbeafe', route: '/profile-edit' },
    { key: 'withdrawals', label: 'سجل السحوبات', icon: 'time-outline', color: '#8b5cf6', bg: '#ede9fe', route: '/withdraw-history' },
    { key: 'stats', label: 'الإحصائيات', icon: 'bar-chart-outline', color: '#10b981', bg: '#d1fae5', route: '/stats' },
    { key: 'privacy', label: 'سياسة الخصوصية والشروط', icon: 'shield-checkmark-outline', color: '#f59e0b', bg: '#fef3c7', route: '/privacy' },
    { key: 'contact', label: 'تواصل معنا', icon: 'chatbubble-outline', color: '#06b6d4', bg: '#cffafe', route: '/contact' },
  ];

  return (
    <SafeAreaView style={s.container}>
      <Text style={s.title}>الإعدادات</Text>
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* User Card */}
        <View style={s.userCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{user?.storeName?.charAt(0) || 'ت'}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={s.userName}>{user?.storeName}</Text>
            <Text style={s.userId}>🆔 ID: {user?.merchantId}</Text>
          </View>
        </View>

        {/* Balance Card */}
        <LinearGradient colors={[PRIMARY, '#0a5566']} style={s.balanceCard}>
          <View style={s.balanceIcon}>
            <Ionicons name="wallet-outline" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={s.balanceLabel}>الرصيد المتاح للسحب</Text>
            <Text style={s.balanceValue}>{(user?.balance || 0).toLocaleString()} د.ع</Text>
          </View>
          <TouchableOpacity style={s.withdrawBtn} onPress={() => router.push('/withdraw')}>
            <Text style={s.withdrawBtnText}>سحب الأرباح</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Menu Items */}
        {menuItems.map(item => (
          <TouchableOpacity key={item.key} style={s.menuItem} onPress={() => router.push(item.route as any)}>
            <Ionicons name="chevron-back" size={20} color="#9ca3af" />
            <Text style={s.menuLabel}>{item.label}</Text>
            <Ionicons name={item.icon as any} size={22} color={PRIMARY} />
          </TouchableOpacity>
        ))}

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Ionicons name="chevron-back" size={20} color="#ef4444" />
          <Text style={s.logoutText}>تسجيل الخروج</Text>
          <Ionicons name="log-out-outline" size={22} color="#ef4444" />
        </TouchableOpacity>

        <Text style={s.version}>إصدار التطبيق 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827', textAlign: 'center', paddingVertical: 16 },
  userCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#e0f2f7',
    justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: PRIMARY },
  userName: { fontSize: 18, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  userId: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  balanceCard: { borderRadius: 18, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  balanceIcon: { position: 'absolute', left: 20, top: 20 },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'right' },
  balanceValue: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 4, textAlign: 'right' },
  withdrawBtn: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12,
    paddingHorizontal: 24, marginTop: 16, alignSelf: 'stretch' },
  withdrawBtnText: { color: PRIMARY, fontSize: 15, fontWeight: 'bold', textAlign: 'center' },
  menuItem: { backgroundColor: '#fff', borderRadius: 14, padding: 16,
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 15, color: '#374151', fontWeight: '500', textAlign: 'right' },
  logoutBtn: { backgroundColor: '#fef2f2', borderRadius: 14, padding: 16,
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginTop: 10,
    borderWidth: 1, borderColor: '#fecaca' },
  logoutText: { flex: 1, fontSize: 15, color: '#ef4444', fontWeight: 'bold', textAlign: 'right' },
  version: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 20 },
});
