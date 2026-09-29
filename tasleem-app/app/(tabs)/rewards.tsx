// tasleem-app/app/(tabs)/rewards.tsx
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';
const SECONDARY = '#f5a006';
const SUCCESS = '#10b981';
const DANGER = '#ef4444';
const PURPLE = '#8b5cf6';
const BG = '#f2f6f9';

// ─── تسميات المكافآت ────────────────────────────────────────────
const REWARD_META: Record<string, { label: string; icon: any; color: string }> = {
  cashback:      { label: 'كاش باك',        icon: 'cash',        color: SUCCESS },
  shipping_code: { label: 'خصم توصيل',      icon: 'bicycle',     color: PRIMARY },
  free_shipping: { label: 'توصيل مجاني',    icon: 'car-sport',   color: PURPLE },
  product_code:  { label: 'خصم منتج',       icon: 'pricetag',    color: SECONDARY },
};

function getRewardText(campaign: any): string {
  if (!campaign) return '';
  if (campaign.rewardType === 'cashback') {
    return `${Number(campaign.rewardValue).toLocaleString()} د.ع`;
  }
  if (campaign.rewardType === 'shipping_code') {
    return `خصم ${campaign.rewardValue}% على التوصيل`;
  }
  if (campaign.rewardType === 'free_shipping') {
    return 'توصيل مجاني';
  }
  if (campaign.rewardType === 'product_code') {
    return `خصم ${campaign.rewardValue}% على المنتج`;
  }
  return '';
}

function getProductImage(product: any): string | null {
  if (!product) return null;
  const imgs = product.images ? product.images.split(',').filter(Boolean) : [];
  return imgs[0] || product.imageUrl || null;
}

function getDaysLeft(endsAt: string): number {
  if (!endsAt) return 0;
  const diff = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function getDaysLeftText(endsAt: string): string {
  const days = getDaysLeft(endsAt);
  if (days <= 0) return 'انتهى';
  if (days === 1) return 'ينتهي غداً';
  if (days === 2) return 'ينتهي بعد يومين';
  if (days < 7) return `ينتهي بعد ${days} أيام`;
  return `ينتهي بعد ${days} يوم`;
}

type FilterKey = 'all' | 'active' | 'completed' | 'expired';

export default function RewardsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>('active');
  const [refreshing, setRefreshing] = useState(false);

  const { data: campaigns = [], isLoading, refetch } = useQuery({
    queryKey: ['my-campaigns'],
    queryFn: async () => {
      const { data } = await api.get('/api/campaigns/my');
      return data as any[];
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // ─── الفلترة ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return campaigns.filter((c: any) => {
      if (filter === 'active') return c.isActive && !c.isExpired;
      if (filter === 'completed') return c.targetReached && c.rewardClaimed;
      if (filter === 'expired') return c.isExpired;
      return true;
    });
  }, [campaigns, filter]);

  // ─── إحصائيات ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = campaigns.filter((c: any) => c.isActive && !c.isExpired).length;
    const completed = campaigns.filter((c: any) => c.targetReached && c.rewardClaimed).length;
    const reached = campaigns.filter((c: any) => c.targetReached && !c.rewardClaimed).length;
    return { active, completed, reached, total: campaigns.length };
  }, [campaigns]);

  // ─── عرض التحميل ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={s.loadingTxt}>جاري تحميل التحديات...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ─── الهيدر ─── */}
      <View style={s.header}>
        <View style={s.headerRight}>
          <Text style={s.headerTitle}>التحديات</Text>
          <Text style={s.headerSub}>
            {stats.active} تحدٍ نشط · {stats.completed} مكتمل
          </Text>
        </View>
        <View style={s.headerIconBox}>
          <Ionicons name="trophy" size={22} color={SECONDARY} />
        </View>
      </View>

      {/* ─── شريط الإحصائيات ─── */}
      <View style={s.statsRow}>
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: PRIMARY }]}>{stats.active}</Text>
          <Text style={s.statLbl}>نشطة</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: SECONDARY }]}>{stats.reached}</Text>
          <Text style={s.statLbl}>وصلت الهدف</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: SUCCESS }]}>{stats.completed}</Text>
          <Text style={s.statLbl}>مكتملة</Text>
        </View>
      </View>

      {/* ─── الفلاتر ─── */}
      <View style={s.filtersWrap}>
        {([
          ['active', 'نشطة'],
          ['completed', 'مكتملة'],
          ['expired', 'منتهية'],
          ['all', 'الكل'],
        ] as [FilterKey, string][]).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[s.chip, filter === key && s.chipActive]}
            onPress={() => setFilter(key)}
          >
            <Text style={[s.chipTxt, filter === key && s.chipTxtActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── القائمة ─── */}
      <FlatList
        data={filtered}
        keyExtractor={(item: any) => String(item.id)}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
        }
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <View style={s.emptyIconBox}>
              <Ionicons name="trophy-outline" size={48} color="#9ca3af" />
            </View>
            <Text style={s.emptyTitle}>
              {filter === 'active' ? 'لا توجد تحديات نشطة' : 'لا توجد تحديات'}
            </Text>
            <Text style={s.emptySub}>
              {filter === 'active'
                ? 'ستظهر التحديات هنا عند إطلاقها'
                : 'جرب فلتر آخر'}
            </Text>
          </View>
        }
        renderItem={({ item: c }: any) => {
          const productImg = getProductImage(c.product);
          const rewardMeta = REWARD_META[c.rewardType] || REWARD_META.cashback;
          const progress = Math.min(100, Math.round(((c.progressCount || 0) / c.targetCount) * 100));
          const daysLeft = getDaysLeft(c.endsAt);
          const isExpired = c.isExpired;

          return (
            <TouchableOpacity
              style={[s.card, isExpired && s.cardExpired]}
              onPress={() => router.push(`/campaign-details/${c.id}`)}
              activeOpacity={0.85}
            >

              {/* ── شارة الحالة ── */}
              <View style={s.statusBar}>
                {c.rewardClaimed ? (
                  <View style={[s.statusBadge, { backgroundColor: SUCCESS + '18' }]}>
                    <Ionicons name="checkmark-circle" size={12} color={SUCCESS} />
                    <Text style={[s.statusTxt, { color: SUCCESS }]}>مكافأة مستلمة</Text>
                  </View>
                ) : c.targetReached ? (
                  <View style={[s.statusBadge, { backgroundColor: SECONDARY + '18' }]}>
                    <Ionicons name="hourglass-outline" size={12} color={SECONDARY} />
                    <Text style={[s.statusTxt, { color: SECONDARY }]}>وصلت الهدف 🎯</Text>
                  </View>
                ) : isExpired ? (
                  <View style={[s.statusBadge, { backgroundColor: '#f3f4f6' }]}>
                    <Ionicons name="close-circle-outline" size={12} color="#9ca3af" />
                    <Text style={[s.statusTxt, { color: '#9ca3af' }]}>انتهى التحدي</Text>
                  </View>
                ) : (
                  <View style={[s.statusBadge, { backgroundColor: PRIMARY + '15' }]}>
                    <Ionicons name="flash" size={12} color={PRIMARY} />
                    <Text style={[s.statusTxt, { color: PRIMARY }]}>تحدي نشط</Text>
                  </View>
                )}
              </View>

              {/* ── معلومات المنتج ── */}
              <View style={s.productRow}>
                <View style={s.productInfo}>
                  <Text style={s.productName} numberOfLines={2}>
                    {c.product?.name || `منتج #${c.productId}`}
                  </Text>
                  <Text style={s.campaignTitle} numberOfLines={1}>
                    {c.title}
                  </Text>
                </View>

                {productImg ? (
                  <Image source={{ uri: productImg }} style={s.productImg} resizeMode="cover" />
                ) : (
                  <View style={[s.productImg, s.productImgPlaceholder]}>
                    <Ionicons name="cube-outline" size={26} color="#d1d5db" />
                  </View>
                )}
              </View>

              {/* ── المكافأة ── */}
              <View style={[s.rewardBox, { borderColor: rewardMeta.color + '30', backgroundColor: rewardMeta.color + '08' }]}>
                <View style={[s.rewardIconBox, { backgroundColor: rewardMeta.color + '20' }]}>
                  <Ionicons name={rewardMeta.icon} size={16} color={rewardMeta.color} />
                </View>
                <View style={s.rewardInfo}>
                  <Text style={s.rewardLbl}>{rewardMeta.label}</Text>
                  <Text style={[s.rewardVal, { color: rewardMeta.color }]}>
                    {getRewardText(c)}
                  </Text>
                </View>
                <Ionicons name="gift" size={20} color={rewardMeta.color} />
              </View>

              {/* ── شريط التقدم ── */}
              <View style={s.progressBox}>
                <View style={s.progressHeader}>
                  <Text style={s.progressCount}>
                    {(c.progressCount || 0)} / {c.targetCount}
                  </Text>
                  <Text style={s.progressLbl}>التقدم</Text>
                </View>
                <View style={s.progressTrack}>
                  <View
                    style={[
                      s.progressFill,
                      {
                        width: `${progress}%`,
                        backgroundColor: c.targetReached ? SUCCESS : PRIMARY,
                      },
                    ]}
                  />
                </View>
                <View style={s.progressFooter}>
                  <Text style={[s.progressPct, { color: c.targetReached ? SUCCESS : PRIMARY }]}>
                    {progress}%
                  </Text>
                  {!c.targetReached && !isExpired && (
                    <Text style={[s.daysLeft, daysLeft <= 2 && { color: DANGER }]}>
                      ⏰ {getDaysLeftText(c.endsAt)}
                    </Text>
                  )}
                </View>
              </View>

              {/* ── زر التفاصيل ── */}
              <View style={s.footerRow}>
                <Ionicons
                  name={isExpired ? 'lock-closed-outline' : 'chevron-back'}
                  size={16}
                  color={isExpired ? '#9ca3af' : PRIMARY}
                />
                <Text style={[s.footerTxt, isExpired && { color: '#9ca3af' }]}>
                  {isExpired ? 'انتهت الحملة' : 'عرض التفاصيل'}
                </Text>
              </View>

            </TouchableOpacity>
          );
        }}
      />

    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════════
// ─── الأنماط ───
// ══════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingTxt: { fontSize: 14, color: '#9ca3af' },

  // Header
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
  },
  headerRight: { alignItems: 'flex-end', flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  headerSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  headerIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: SECONDARY + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
  },
  statBox: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, backgroundColor: '#e8edf2' },
  statVal: { fontSize: 18, fontWeight: 'bold' },
  statLbl: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },

  // Filters
  filtersWrap: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipTxt: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  chipTxtActive: { color: '#fff' },

  // Cards
  listContent: { paddingHorizontal: 12, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardExpired: { opacity: 0.6, backgroundColor: '#fafafa' },

  statusBar: { flexDirection: 'row-reverse', marginBottom: 10 },
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusTxt: { fontSize: 10, fontWeight: 'bold' },

  // Product
  productRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 12,
  },
  productInfo: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
  productName: {
    fontSize: 15, fontWeight: 'bold', color: '#111827',
    textAlign: 'right', marginBottom: 3,
  },
  campaignTitle: { fontSize: 12, color: '#6b7280', textAlign: 'right' },
  productImg: { width: 64, height: 64, borderRadius: 14, backgroundColor: '#f3f4f6' },
  productImgPlaceholder: { justifyContent: 'center', alignItems: 'center' },

  // Reward
  rewardBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  rewardIconBox: {
    width: 34, height: 34, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  rewardInfo: { flex: 1, alignItems: 'flex-end' },
  rewardLbl: { fontSize: 10, color: '#6b7280', fontWeight: '600' },
  rewardVal: { fontSize: 13, fontWeight: 'bold', marginTop: 1 },

  // Progress
  progressBox: { marginBottom: 10 },
  progressHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLbl: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  progressCount: { fontSize: 13, fontWeight: 'bold', color: '#374151' },
  progressTrack: {
    height: 8, backgroundColor: '#f3f4f6',
    borderRadius: 4, overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 4 },
  progressFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressPct: { fontSize: 11, fontWeight: 'bold' },
  daysLeft: { fontSize: 10, color: '#6b7280', fontWeight: '600' },

  // Footer
  footerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  footerTxt: { fontSize: 12, color: PRIMARY, fontWeight: '700' },

  // Empty
  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIconBox: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center', alignItems: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
  emptySub: { fontSize: 13, color: '#9ca3af' },
});