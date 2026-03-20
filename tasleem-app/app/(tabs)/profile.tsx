import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
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
    { key: 'favorites', label: 'المنتجات المفضلة', icon: 'heart-outline', color: '#ef4444', bg: '#fee2e2', route: '/favorites' },
    { key: 'withdrawals', label: 'سجل السحوبات', icon: 'time-outline', color: '#8b5cf6', bg: '#ede9fe', route: '/withdraw-history' },
    { key: 'stats', label: 'الإحصائيات', icon: 'bar-chart-outline', color: '#10b981', bg: '#d1fae5', route: '/stats' },
    { key: 'privacy', label: 'سياسة الخصوصية والشروط', icon: 'shield-checkmark-outline', color: '#f59e0b', bg: '#fef3c7', route: '/privacy' },
    { key: 'support', label: 'الدعم الفني', icon: 'headset-outline', color: '#8b5cf6', bg: '#ede9fe', route: '/support' },
    { key: 'contact', label: 'تواصل معنا', icon: 'chatbubble-outline', color: '#06b6d4', bg: '#cffafe', route: '/contact' },
  ];

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header أبيض ── */}
        <View style={s.header}>
          <View style={s.headerTop}>
            <Text style={s.headerTitle}>حسابي</Text>
            <View style={s.headerIconBox}>
              <Ionicons name="person-circle-outline" size={24} color={PRIMARY} />
            </View>
          </View>

          {/* User Card */}
          <View style={s.userCard}>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={s.userName}>{user?.storeName || 'تاجر'}</Text>
              <Text style={s.userId}>ID: {user?.merchantId}</Text>
              <View style={s.badge}>
                <Text style={s.badgeText}>{user?.role === 'admin' ? 'مدير' : 'تاجر'}</Text>
              </View>
            </View>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{user?.storeName?.charAt(0) || 'ت'}</Text>
            </View>
          </View>
        </View>

        {/* Balance Cards */}
        <View style={s.balanceRow}>
          {/* الأرباح المنتظرة - برتقالي */}
          <View style={[s.balanceCard, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
            <View style={[s.balanceIconBox, { backgroundColor: '#ffedd5' }]}>
              <Ionicons name="time-outline" size={20} color="#f97316" />
            </View>
            <Text style={[s.balanceLabel, { color: '#9a3412' }]}>الأرباح المنتظرة</Text>
            <Text style={[s.balanceValue, { color: '#ea580c' }]}>
              {(user?.pendingBalance || 0).toLocaleString('ar-IQ')}
            </Text>
            <Text style={[s.balanceCurrency, { color: '#fb923c' }]}>د.ع</Text>
          </View>

          {/* الأرباح المحققة - أخضر */}
          <View style={[s.balanceCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
            <View style={[s.balanceIconBox, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#16a34a" />
            </View>
            <Text style={[s.balanceLabel, { color: '#14532d' }]}>الأرباح المحققة</Text>
            <Text style={[s.balanceValue, { color: '#16a34a' }]}>
              {(user?.balance || 0).toLocaleString('ar-IQ')}
            </Text>
            <Text style={[s.balanceCurrency, { color: '#22c55e' }]}>د.ع</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={s.menuContainer}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={item.key}
              style={[s.menuItem, idx === menuItems.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => router.push(item.route as any)}>
              <Ionicons name="chevron-back" size={18} color="#d1d5db" />
              <Text style={s.menuLabel}>{item.label}</Text>
              <View style={[s.iconBox, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#ef4444" />
          <Text style={s.logoutText}>تسجيل الخروج</Text>
        </TouchableOpacity>

        <Text style={s.version}>إصدار التطبيق 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: { paddingTop: 14, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#111827' },
  headerIconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#f0f9fa', borderWidth: 1.5, borderColor: '#e0f2f7', justifyContent: 'center', alignItems: 'center' },

  userCard: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  avatarText: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  userId: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  badge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 12,
    paddingVertical: 4, marginTop: 8, alignSelf: 'flex-end' },
  badgeText: { fontSize: 12, color: '#fff', fontWeight: '600' },

  balanceRow:      { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 16, marginBottom: 20 },
  balanceCard:     { flex: 1, borderRadius: 18, padding: 14, alignItems: 'flex-end', borderWidth: 1.5,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  balanceIconBox:  { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  balanceLabel:    { fontSize: 12, fontWeight: '600', marginBottom: 6, textAlign: 'right' },
  balanceValue:    { fontSize: 22, fontWeight: 'bold', textAlign: 'right' },
  balanceCurrency: { fontSize: 11, fontWeight: '600', textAlign: 'right', marginTop: 2 },

  menuContainer: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: -16,
    borderRadius: 20, paddingHorizontal: 4,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 12 },
  iconBox: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 15, color: '#374151', fontWeight: '500', textAlign: 'right' },

  logoutBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: '#fef2f2', marginHorizontal: 16, marginTop: 16,
    borderRadius: 16, paddingVertical: 16, borderWidth: 1, borderColor: '#fecaca' },
  logoutText: { fontSize: 15, color: '#ef4444', fontWeight: 'bold' },

  version: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 16, marginBottom: 8 },
});
