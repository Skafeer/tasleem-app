import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';
const BG = '#f2f6f9';

export default function ProfileScreen() {
  const router = useRouter();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => { 
      const { data } = await api.get('/api/auth/me'); 
      return data; 
    },
  });

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    router.replace('/auth');
  };

  const menuItems = [
    { key: 'profile-edit', label: 'الملف الشخصي', icon: 'person-outline', color: '#3b82f6', bg: '#eff6ff', route: '/profile-edit' },
    { key: 'favorites', label: 'المنتجات المفضلة', icon: 'heart-outline', color: '#ef4444', bg: '#fef2f2', route: '/favorites' },
    { key: 'withdrawals', label: 'سجل السحوبات', icon: 'time-outline', color: '#8b5cf6', bg: '#f5f3ff', route: '/withdraw-history' },
    { key: 'stats', label: 'الإحصائيات', icon: 'bar-chart-outline', color: '#10b981', bg: '#ecfdf5', route: '/stats' },
    { key: 'privacy', label: 'سياسة الخصوصية', icon: 'shield-checkmark-outline', color: '#f59e0b', bg: '#fffbeb', route: '/privacy' },
    { key: 'support', label: 'الدعم الفني', icon: 'headset-outline', color: '#8b5cf6', bg: '#f5f3ff', route: '/support' },
    { key: 'contact', label: 'تواصل معنا', icon: 'chatbubble-outline', color: '#06b6d4', bg: '#ecfeff', route: '/contact' },
  ];

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {/* ── Header موحد مع باقي الصفحات ── */}
        <View style={s.header}>
          <View style={s.headerContent}>
            <View style={{ width: 40 }} />
            <Text style={s.headerTitle}>حسابي</Text>
            <View style={s.headerIconBox}>
              <Ionicons name="person-circle-outline" size={22} color={PRIMARY} />
            </View>
          </View>
        </View>

        {/* ── بطاقة المستخدم ── */}
        <View style={s.userCard}>
          <View style={s.userInfo}>
            <Text style={s.userName}>{user?.storeName || 'تاجر'}</Text>
            <Text style={s.userId}>ID: {user?.merchantId || '------'}</Text>
            <View style={s.badge}>
              <Text style={s.badgeText}>{user?.role === 'admin' ? 'مدير' : 'تاجر'}</Text>
            </View>
          </View>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{user?.storeName?.charAt(0) || 'ت'}</Text>
          </View>
        </View>

        {/* ── بطاقات الأرباح ── */}
        <View style={s.balanceRow}>
          <View style={[s.balanceCard, s.balanceCardPending]}>
            <View style={[s.balanceIconBox, s.balanceIconPending]}>
              <Ionicons name="time-outline" size={20} color="#f97316" />
            </View>
            <Text style={[s.balanceLabel, s.balanceLabelPending]}>الأرباح المنتظرة</Text>
            <Text style={[s.balanceValue, s.balanceValuePending]}>
              {(user?.pendingBalance || 0).toLocaleString('ar-IQ')}
            </Text>
            <Text style={s.balanceCurrency}>د.ع</Text>
          </View>

          <View style={[s.balanceCard, s.balanceCardEarned]}>
            <View style={[s.balanceIconBox, s.balanceIconEarned]}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#16a34a" />
            </View>
            <Text style={[s.balanceLabel, s.balanceLabelEarned]}>الأرباح المحققة</Text>
            <Text style={[s.balanceValue, s.balanceValueEarned]}>
              {(user?.balance || 0).toLocaleString('ar-IQ')}
            </Text>
            <Text style={s.balanceCurrency}>د.ع</Text>
          </View>
        </View>

        {/* ── قائمة الخيارات ── */}
        <View style={s.menuContainer}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={item.key}
              style={[s.menuItem, idx === menuItems.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}>
              <View style={[s.menuIconBox, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <Text style={s.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── زر تسجيل الخروج ── */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={s.logoutText}>تسجيل الخروج</Text>
        </TouchableOpacity>

        <Text style={s.version}>إصدار التطبيق 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scrollContent: { paddingBottom: 20 },

  // ── Header موحد ──
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0f9fa',
    borderWidth: 1.5,
    borderColor: '#d4eef3',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── بطاقة المستخدم ──
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  userId: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: PRIMARY + '12',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    color: PRIMARY,
    fontWeight: '600',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d4eef3',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },

  // ── بطاقات الأرباح ──
  balanceRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  balanceCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    alignItems: 'flex-end',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  balanceCardPending: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  balanceCardEarned: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  balanceIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceIconPending: {
    backgroundColor: '#ffedd5',
  },
  balanceIconEarned: {
    backgroundColor: '#dcfce7',
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'right',
  },
  balanceLabelPending: {
    color: '#9a3412',
  },
  balanceLabelEarned: {
    color: '#14532d',
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  balanceValuePending: {
    color: '#ea580c',
  },
  balanceValueEarned: {
    color: '#16a34a',
  },
  balanceCurrency: {
    fontSize: 10,
    fontWeight: '500',
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 2,
  },

  // ── قائمة الخيارات ──
  menuContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e8edf2',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'right',
  },

  // ── زر تسجيل الخروج ──
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: 'bold',
  },

  // ── الإصدار ──
  version: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 20,
  },
});