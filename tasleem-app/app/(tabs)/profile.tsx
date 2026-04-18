// /workspaces/tasleem-app/tasleem-app/app/(tabs)/profile.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';
const BG      = '#f2f6f9';

export default function ProfileScreen() {
  const router      = useRouter();

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
    { key: 'profile-edit', label: 'الملف الشخصي',        icon: 'person-outline',           gradient: ['#3b82f6', '#2563eb'], route: '/profile-edit' },
    { key: 'favorites',    label: 'المنتجات المفضلة',     icon: 'heart-outline',            gradient: ['#ef4444', '#dc2626'], route: '/favorites' },
    { key: 'withdrawals',  label: 'سجل السحوبات',         icon: 'time-outline',             gradient: ['#8b5cf6', '#7c3aed'], route: '/withdraw-history' },
    { key: 'stats',        label: 'الإحصائيات',           icon: 'bar-chart-outline',        gradient: ['#10b981', '#059669'], route: '/stats' },
    { key: 'privacy',      label: 'سياسة الخصوصية',       icon: 'shield-checkmark-outline', gradient: ['#f59e0b', '#d97706'], route: '/privacy' },
    { key: 'support',      label: 'الدعم الفني',           icon: 'headset-outline',          gradient: ['#8b5cf6', '#7c3aed'], route: '/support' },
    { key: 'contact',      label: 'تواصل معنا',            icon: 'chatbubble-outline',       gradient: ['#06b6d4', '#0891b2'], route: '/contact' },
  ];

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity style={s.headerIconBox}>
            <Ionicons name="person-circle-outline" size={22} color={PRIMARY} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>حسابي</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── بطاقة المستخدم ── */}
        <LinearGradient
          colors={[PRIMARY, '#0a8a9f', '#0c6679']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.heroCard}>
          <View style={s.heroContent}>
            <View style={s.avatarContainer}>
              <View style={s.avatarRing}>
                <Text style={s.avatarText}>{user?.storeName?.charAt(0) || 'ت'}</Text>
              </View>
              <View style={s.onlineDot} />
            </View>
            <View style={s.userInfo}>
              <Text style={s.userName}>{user?.storeName || 'تاجر'}</Text>
              <Text style={s.userId}>ID: {user?.merchantId || 'ADMIN-001'}</Text>
              <View style={s.roleBadge}>
                <Ionicons name={user?.role === 'admin' ? 'shield-checkmark' : 'storefront'} size={12} color="#fff" />
                <Text style={s.roleText}>{user?.role === 'admin' ? 'مدير' : 'تاجر'}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* ── بطاقات الأرباح ── */}
        <View style={s.statsGrid}>
          <View style={[s.statCard, s.statCardPending]}>
            <View style={s.statIconWrapper}>
              <Ionicons name="time-outline" size={24} color="#f97316" />
            </View>
            <Text style={s.statLabel}>الأرباح المنتظرة</Text>
            <Text style={s.statValue}>{(user?.pendingBalance ?? 0).toLocaleString('ar-IQ')}</Text>
            <Text style={s.statCurrency}>دينار عراقي</Text>
          </View>
          <View style={[s.statCard, s.statCardEarned]}>
            <View style={s.statIconWrapper}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#16a34a" />
            </View>
            <Text style={s.statLabel}>الأرباح المحققة</Text>
            <Text style={s.statValue}>{(user?.balance ?? 0).toLocaleString('ar-IQ')}</Text>
            <Text style={s.statCurrency}>دينار عراقي</Text>
          </View>
        </View>

        {/* ── صقر AI ── للجميع (تاجر وأدمن) ── */}
        <TouchableOpacity
          style={s.saqrSection}
          onPress={() => router.push('/saqr')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#1e3a5f', '#0c6679']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.saqrToggleGradient}
          >
            <View style={s.saqrToggleLeft}>
              <View style={s.saqrIconBox}>
                <Text style={s.saqrEmoji}>🦅</Text>
              </View>
              <View>
                <View style={s.titleRow}>
                  <Text style={s.saqrToggleTitle}>صقر AI</Text>
                  <View style={s.betaBadge}>
                    <Text style={s.betaText}>Beta</Text>
                  </View>
                </View>
                <Text style={s.saqrToggleSub}>محلل المنتجات الذكي</Text>
              </View>
            </View>
            <Ionicons
              name="arrow-back"
              size={20}
              color="rgba(255,255,255,0.7)"
            />
          </LinearGradient>
        </TouchableOpacity>

        {/* ── قائمة الخيارات ── */}
        <View style={s.menuSection}>
          <Text style={s.menuSectionTitle}>القائمة</Text>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={item.key}
              style={[s.menuItem, idx === menuItems.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}>
              <LinearGradient
                colors={item.gradient as any}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={s.menuIconGradient}>
                <Ionicons name={item.icon as any} size={18} color="#fff" />
              </LinearGradient>
              <Text style={s.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-back" size={16} color="#d1d5db" />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── تسجيل الخروج ── */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <LinearGradient
            colors={['#fef2f2', '#fee2e2']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.logoutGradient}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={s.logoutText}>تسجيل الخروج</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={s.version}>إصدار التطبيق 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: BG },
  scrollContent: { paddingBottom: 20 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8edf2' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  headerIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f0f9fa', borderWidth: 1.5, borderColor: '#d4eef3', justifyContent: 'center', alignItems: 'center' },

  heroCard:    { marginHorizontal: 16, marginTop: 16, marginBottom: 20, borderRadius: 24, padding: 20, shadowColor: PRIMARY, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  heroContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarContainer: { position: 'relative' },
  avatarRing:  { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  avatarText:  { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  onlineDot:   { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#4ade80', borderWidth: 2, borderColor: '#fff' },
  userInfo:    { flex: 1, alignItems: 'flex-start' },
  userName:    { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  userId:      { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 8 },
  roleBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  roleText:    { fontSize: 11, color: '#fff', fontWeight: '600' },

  statsGrid:       { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 20 },
  statCard:        { flex: 1, borderRadius: 20, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statCardPending: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa' },
  statCardEarned:  { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  statIconWrapper: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  statLabel:       { fontSize: 11, fontWeight: '600', marginBottom: 6, textAlign: 'center', color: '#374151' },
  statValue:       { fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  statCurrency:    { fontSize: 10, color: '#9ca3af', marginTop: 4, textAlign: 'center' },

  // ── صقر ──
  saqrSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e3a5f22',
    shadowColor: '#0c6679',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  saqrToggleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  saqrToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  saqrIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saqrEmoji: {
    fontSize: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saqrToggleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  betaBadge: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  betaText: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.5,
  },
  saqrToggleSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 1,
  },

  menuSection:      { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, borderRadius: 20, borderWidth: 1, borderColor: '#e8edf2', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  menuSectionTitle: { fontSize: 13, fontWeight: '600', color: '#9ca3af', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, textAlign: 'right' },
  menuItem:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 12 },
  menuIconGradient: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuLabel:        { flex: 1, fontSize: 14, fontWeight: '500', color: '#374151', textAlign: 'right' },

  logoutBtn:      { marginHorizontal: 16, marginTop: 8, marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  logoutGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  logoutText:     { fontSize: 14, color: '#ef4444', fontWeight: 'bold' },

  version: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginBottom: 20 },
});