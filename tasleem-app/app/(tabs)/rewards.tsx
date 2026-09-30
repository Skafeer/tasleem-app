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
const BORDER = '#e8edf2';

const REWARD_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  cashback:      { label: 'كاش باك',        icon: 'cash-outline',        color: SUCCESS,   bg: '#ecfdf5' },
  shipping_code: { label: 'خصم توصيل',      icon: 'bicycle-outline',     color: PRIMARY,   bg: '#f0f9fa' },
  free_shipping: { label: 'توصيل مجاني',    icon: 'car-sport-outline',   color: PURPLE,    bg: '#f5f3ff' },
  product_code:  { label: 'خصم منتج',       icon: 'pricetag-outline',    color: SECONDARY, bg: '#fffbeb' },
};

function getRewardText(c: any): string {
  if (!c) return '';
  if (c.rewardType === 'cashback')      return `${Number(c.rewardValue).toLocaleString()} د.ع`;
  if (c.rewardType === 'shipping_code') return `خصم ${c.rewardValue}%`;
  if (c.rewardType === 'free_shipping') return 'مجاني';
  if (c.rewardType === 'product_code')  return `خصم ${c.rewardValue}%`;
  return '';
}

function getProductImage(product: any): string | null {
  if (!product) return null;
  const imgs = product.images ? product.images.split(',').filter(Boolean) : [];
  return imgs[0] || product.imageUrl || null;
}

function getDaysLeftText(endsAt: string): string {
  if (!endsAt) return '';
  const diff = new Date(endsAt).getTime() - Date.now();
  const days = Math.max(0, Math.ceil(diff / 86400000));
  if (days <= 0) return 'انتهى';
  if (days === 1) return 'يوم واحد';
  if (days === 2) return 'يومان';
  return `${days} أيام`;
}

type FilterKey = 'active' | 'completed' | 'expired';

// ─── شريط التقدم ──────────────────────────────────────────────
function ProgressBar({ count, target, reached, completed }: { count: number; target: number; reached: boolean; completed: boolean }) {
  const pct = Math.min(100, Math.round((count / target) * 100));
  const color = completed ? SUCCESS : reached ? SECONDARY : PRIMARY;

  return (
    <View style={s.progressWrap}>
      <View style={s.progressHeader}>
        <Text style={[s.progressCount, { color }]}>
          {count} / {target}
        </Text>
        <Text style={s.progressLabel}>التقدم</Text>
      </View>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════
// ─── الشاشة ───
// ═════════════════════════════════════════════════════════════
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

  const filtered = useMemo(() => {
    return campaigns.filter((c: any) => {
      if (filter === 'active')    return c.isActive && !c.isExpired;
      if (filter === 'completed') return c.targetReached && c.rewardClaimed;
      if (filter === 'expired')   return c.isExpired;
      return true;
    });
  }, [campaigns, filter]);

  const stats = useMemo(() => {
    const active    = campaigns.filter((c: any) => c.isActive && !c.isExpired).length;
    const completed = campaigns.filter((c: any) => c.targetReached && c.rewardClaimed).length;
    const reached   = campaigns.filter((c: any) => c.targetReached && !c.rewardClaimed).length;
    return { active, completed, reached };
  }, [campaigns]);

  if (isLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={s.loadingTxt}>جاري تحميل التحديات...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ─── Header ─── */}
      <View style={s.header}>
        <View style={s.headerRight}>
          <Text style={s.headerTitle}>التحديات</Text>
          <Text style={s.headerSub}>{stats.active} تحدٍ نشط</Text>
        </View>
        <View style={s.headerIconBox}>
          <Ionicons name="trophy-outline" size={22} color={SECONDARY} />
        </View>
      </View>

      {/* ─── Stats ─── */}
      <View style={s.statsRow}>
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: PRIMARY }]}>{stats.active}</Text>
          <Text style={s.statLbl}>نشطة</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: SECONDARY }]}>{stats.reached}</Text>
          <Text style={s.statLbl}>وصلت</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: SUCCESS }]}>{stats.completed}</Text>
          <Text style={s.statLbl}>مكتملة</Text>
        </View>
      </View>

      {/* ─── Filters ─── */}
      <View style={s.filtersWrap}>
        {([
          ['active', 'نشطة'],
          ['completed', 'مكتملة'],
          ['expired', 'منتهية'],
        ] as [FilterKey, string][]).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[s.chip, filter === key && s.chipActive]}
            onPress={() => setFilter(key)}
            activeOpacity={0.7}
          >
            <Text style={[s.chipTxt, filter === key && s.chipTxtActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── List ─── */}
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
            <View style={s.emptyIconWrap}>
              <Ionicons name="trophy-outline" size={36} color={PRIMARY} />
            </View>
            <Text style={s.emptyTitle}>
              {filter === 'active' ? 'لا توجد تحديات نشطة' : 'لا توجد تحديات'}
            </Text>
            <Text style={s.emptySub}>
              {filter === 'active' ? 'سيتم إطلاق تحديات جديدة قريباً' : 'جرب فلتر آخر'}
            </Text>
          </View>
        }
        renderItem={({ item: c }: any) => {
          const productImg = getProductImage(c.product);
          const rewardMeta = REWARD_META[c.rewardType] || REWARD_META.cashback;
          const isExpired  = c.isExpired;
          const reached    = c.targetReached && !c.rewardClaimed;
          const completed  = c.rewardClaimed;

          const statusColor = completed ? SUCCESS : reached ? SECONDARY : isExpired ? '#9ca3af' : PRIMARY;
          const statusIcon  = completed ? 'checkmark-circle' : reached ? 'flag' : isExpired ? 'time-outline' : 'flash';
          const statusLabel = completed ? 'مستلمة' : reached ? 'وصلت الهدف' : isExpired ? 'انتهت' : 'نشط';

          return (
            <TouchableOpacity
              style={[s.card, isExpired && s.cardExpired]}
              activeOpacity={0.85}
              onPress={() => router.push(`/campaign-details/${c.id}`)}
            >
              {/* ─── Top Row: صورة + معلومات + شارة الحالة ─── */}
              <View style={s.cardTop}>
                {productImg ? (
                  <Image source={{ uri: productImg }} style={s.productImg} resizeMode="cover" />
                ) : (
                  <View style={[s.productImg, s.productImgPlaceholder]}>
                    <Ionicons name="cube-outline" size={24} color="#d1d5db" />
                  </View>
                )}

                <View style={s.infoWrap}>
                  <View style={[s.statusBadge, { backgroundColor: statusColor + '15' }]}>
                    <Ionicons name={statusIcon as any} size={11} color={statusColor} />
                    <Text style={[s.statusTxt, { color: statusColor }]}>{statusLabel}</Text>
                  </View>
                  <Text style={s.productName} numberOfLines={1}>
                    {c.product?.name || `منتج #${c.productId}`}
                  </Text>
                </View>
              </View>

              {/* ─── Progress ─── */}
              <ProgressBar
                count={c.progressCount || 0}
                target={c.targetCount}
                reached={reached}
                completed={completed}
              />

              {/* ─── Footer: المكافأة + التاريخ ─── */}
              <View style={s.footerRow}>
                <View style={[s.rewardBox, { backgroundColor: rewardMeta.bg }]}>
                  <Ionicons name={rewardMeta.icon as any} size={14} color={rewardMeta.color} />
                  <Text style={[s.rewardTxt, { color: rewardMeta.color }]} numberOfLines={1}>
                    {getRewardText(c)}
                  </Text>
                </View>

                {!isExpired && !completed ? (
                  <View style={s.daysWrap}>
                    <Ionicons name="time-outline" size={12} color="#9ca3af" />
                    <Text style={s.daysTxt}>{getDaysLeftText(c.endsAt)}</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-back" size={16} color={PRIMARY} />
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════
// ─── الأنماط ───
// ═════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingTxt: { fontSize: 14, color: '#9ca3af' },

  // ─── Header ───
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerRight: { alignItems: 'flex-end', flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  headerSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  headerIconBox: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: SECONDARY + '15',
    justifyContent: 'center', alignItems: 'center',
  },

  // ─── Stats ───
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 3 },
  statDivider: { width: 1, backgroundColor: BORDER },
  statVal: { fontSize: 20, fontWeight: 'bold' },
  statLbl: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },

  // ─── Filters ───
  filtersWrap: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipTxt: { fontSize: 12, color: '#6b7280', fontWeight: '700' },
  chipTxtActive: { color: '#fff' },

  // ─── List ───
  listContent: { paddingHorizontal: 12, paddingBottom: 40 },

  // ─── Card ───
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardExpired: { opacity: 0.6 },

  // ─── Card Top ───
  cardTop: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 14,
  },
  productImg: {
    width: 60, height: 60, borderRadius: 14,
    backgroundColor: '#f3f4f6',
  },
  productImgPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  infoWrap: {
    flex: 1, alignItems: 'flex-end', justifyContent: 'center', gap: 6,
  },
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusTxt: { fontSize: 9, fontWeight: 'bold' },
  productName: {
    fontSize: 14, fontWeight: 'bold', color: '#111827',
    textAlign: 'right',
  },

  // ─── Progress ───
  progressWrap: { marginBottom: 12 },
  progressHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressCount: { fontSize: 13, fontWeight: 'bold' },
  progressLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  progressTrack: {
    height: 8, backgroundColor: '#f3f4f6',
    borderRadius: 4, overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 4 },

  // ─── Footer ───
  footerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rewardBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  rewardTxt: { fontSize: 12, fontWeight: 'bold' },

  daysWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  daysTxt: { fontSize: 11, color: '#6b7280', fontWeight: '600' },

  // ─── Empty ───
  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: PRIMARY + '10',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
  emptySub: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
});