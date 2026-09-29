// tasleem-app/app/campaign-details/[id].tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl, Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const SECONDARY = '#f5a006';
const SUCCESS = '#10b981';
const DANGER = '#ef4444';
const PURPLE = '#8b5cf6';
const BG = '#f2f6f9';

const REWARD_META: Record<string, { label: string; icon: any; color: string; description: string }> = {
  cashback: {
    label: 'كاش باك',
    icon: 'cash',
    color: SUCCESS,
    description: 'يُضاف المبلغ مباشرة لرصيدك',
  },
  shipping_code: {
    label: 'كود خصم توصيل',
    icon: 'bicycle',
    color: PRIMARY,
    description: 'كود يُخصم من كلفة التوصيل',
  },
  free_shipping: {
    label: 'توصيل مجاني',
    icon: 'car-sport',
    color: PURPLE,
    description: 'كود يجعل التوصيل مجانياً',
  },
  product_code: {
    label: 'كود خصم منتج',
    icon: 'pricetag',
    color: SECONDARY,
    description: 'كود يُخصم من سعر المنتجات',
  },
};

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  counted: { label: 'محتسب', color: SUCCESS, icon: 'checkmark-circle' },
  rejected: { label: 'ملغي', color: DANGER, icon: 'close-circle' },
};

function getProductImage(product: any): string | null {
  if (!product) return null;
  const imgs = product.images ? product.images.split(',').filter(Boolean) : [];
  return imgs[0] || product.imageUrl || null;
}

function formatDate(d: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-IQ', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function getDaysLeft(endsAt: string): number {
  if (!endsAt) return 0;
  const diff = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function getDaysLeftText(endsAt: string): string {
  const days = getDaysLeft(endsAt);
  if (days <= 0) return 'انتهى';
  if (days === 1) return 'يوم واحد';
  if (days === 2) return 'يومان';
  return `${days} أيام`;
}

function getRewardText(campaign: any): string {
  if (!campaign) return '';
  if (campaign.rewardType === 'cashback') {
    return `${Number(campaign.rewardValue).toLocaleString()} د.ع`;
  }
  if (campaign.rewardType === 'shipping_code') {
    return `خصم ${campaign.rewardValue}% على التوصيل`;
  }
  if (campaign.rewardType === 'free_shipping') return 'توصيل مجاني';
  if (campaign.rewardType === 'product_code') {
    return `خصم ${campaign.rewardValue}% على المنتج`;
  }
  return '';
}

export default function CampaignDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: campaign, isLoading, refetch } = useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/campaigns/${id}`);
      return data;
    },
    enabled: !!id,
    refetchInterval: 30000,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const copyCode = (code: string) => {
    Clipboard.setString(code);
    toast.success(`تم نسخ الكود: ${code}`);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-forward" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>تفاصيل التحدي</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  if (!campaign) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-forward" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>تفاصيل التحدي</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={52} color="#9ca3af" />
          <Text style={s.emptyTxt}>التحدي غير موجود</Text>
        </View>
      </SafeAreaView>
    );
  }

  const participant = campaign.participant || {};
  const rewards = campaign.rewards || [];
  const orders = campaign.orders || [];

  const progress = Math.min(100, Math.round(((participant.progressCount || 0) / campaign.targetCount) * 100));
  const productImg = getProductImage(campaign.product);
  const rewardMeta = REWARD_META[campaign.rewardType] || REWARD_META.cashback;
  const isExpired = new Date(campaign.endsAt) < new Date();
  const daysLeft = getDaysLeft(campaign.endsAt);

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-forward" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>تفاصيل التحدي</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}>

        {/* ─── بطاقة الحملة ─── */}
        <View style={s.heroCard}>
          {productImg ? (
            <Image source={{ uri: productImg }} style={s.heroImg} resizeMode="cover" />
          ) : (
            <View style={[s.heroImg, s.heroImgPlaceholder]}>
              <Ionicons name="cube-outline" size={48} color="#9ca3af" />
            </View>
          )}

          <View style={s.heroBody}>
            <View style={s.statusRow}>
              {isExpired ? (
                <View style={[s.statusPill, { backgroundColor: '#f3f4f6' }]}>
                  <Ionicons name="close-circle-outline" size={12} color="#9ca3af" />
                  <Text style={[s.statusTxt, { color: '#9ca3af' }]}>انتهى</Text>
                </View>
              ) : participant.targetReached ? (
                <View style={[s.statusPill, { backgroundColor: SECONDARY + '18' }]}>
                  <Ionicons name="checkmark-done-circle" size={12} color={SECONDARY} />
                  <Text style={[s.statusTxt, { color: SECONDARY }]}>وصلت الهدف 🎯</Text>
                </View>
              ) : (
                <View style={[s.statusPill, { backgroundColor: PRIMARY + '15' }]}>
                  <Ionicons name="flash" size={12} color={PRIMARY} />
                  <Text style={[s.statusTxt, { color: PRIMARY }]}>نشط</Text>
                </View>
              )}
            </View>

            <Text style={s.campaignTitle}>{campaign.title}</Text>
            {!!campaign.description && (
              <Text style={s.campaignDesc}>{campaign.description}</Text>
            )}

            <TouchableOpacity
              style={s.productLink}
              onPress={() => router.push(`/products/${campaign.productId}`)}>
              <Ionicons name="chevron-back" size={14} color={PRIMARY} />
              <Text style={s.productLinkTxt} numberOfLines={1}>
                {campaign.product?.name || 'عرض المنتج'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── الفترة ─── */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>📅 فترة التحدي</Text>
          <View style={s.periodRow}>
            <View style={s.periodItem}>
              <Text style={s.periodLbl}>تاريخ البداية</Text>
              <Text style={s.periodVal}>{formatDate(campaign.startsAt)}</Text>
            </View>
            <View style={s.periodDivider} />
            <View style={s.periodItem}>
              <Text style={s.periodLbl}>تاريخ النهاية</Text>
              <Text style={s.periodVal}>{formatDate(campaign.endsAt)}</Text>
            </View>
            {!isExpired && (
              <>
                <View style={s.periodDivider} />
                <View style={s.periodItem}>
                  <Text style={s.periodLbl}>المتبقي</Text>
                  <Text style={[s.periodVal, daysLeft <= 2 && { color: DANGER }]}>
                    {getDaysLeftText(campaign.endsAt)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* ─── التقدم ─── */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>🎯 تقدمك</Text>

          <View style={s.progressHeader}>
            <Text style={s.progressCount}>
              {participant.progressCount || 0} / {campaign.targetCount}
            </Text>
            <Text style={s.progressLbl}>طلب محتسب</Text>
          </View>

          <View style={s.progressTrack}>
            <View
              style={[
                s.progressFill,
                {
                  width: `${progress}%`,
                  backgroundColor: participant.targetReached ? SUCCESS : PRIMARY,
                },
              ]}
            />
          </View>

          <View style={s.progressFooter}>
            <Text style={[s.progressPct, { color: participant.targetReached ? SUCCESS : PRIMARY }]}>
              {progress}%
            </Text>
            {!participant.targetReached && !isExpired && (
              <Text style={s.progressHint}>
                يحتاج {campaign.targetCount - (participant.progressCount || 0)} طلب إضافي
              </Text>
            )}
          </View>
        </View>

        {/* ─── المكافأة ─── */}
        <View style={[s.card, { borderColor: rewardMeta.color + '30', borderWidth: 1.5 }]}>
          <View style={s.rewardHeader}>
            <View style={[s.rewardIconBox, { backgroundColor: rewardMeta.color + '20' }]}>
              <Ionicons name={rewardMeta.icon} size={22} color={rewardMeta.color} />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={s.rewardLbl}>المكافأة</Text>
              <Text style={[s.rewardTitle, { color: rewardMeta.color }]}>
                {rewardMeta.label}
              </Text>
            </View>
          </View>

          <Text style={s.rewardValue}>{getRewardText(campaign)}</Text>
          <Text style={s.rewardDesc}>{rewardMeta.description}</Text>

          {participant.rewardClaimed && (
            <View style={[s.rewardClaimedBox, { backgroundColor: SUCCESS + '10', borderColor: SUCCESS + '30' }]}>
              <Ionicons name="checkmark-circle" size={18} color={SUCCESS} />
              <Text style={[s.rewardClaimedTxt, { color: SUCCESS }]}>
                تم استلام المكافأة ✅
              </Text>
            </View>
          )}

          {participant.targetReached && !participant.rewardClaimed && (
            <View style={[s.rewardClaimedBox, { backgroundColor: SECONDARY + '10', borderColor: SECONDARY + '30' }]}>
              <Ionicons name="time-outline" size={18} color={SECONDARY} />
              <Text style={[s.rewardClaimedTxt, { color: SECONDARY }]}>
                ستُصرف المكافأة بعد انتهاء التحدي
              </Text>
            </View>
          )}
        </View>

        {/* ─── المكافآت المصروفة ─── */}
        {rewards.length > 0 && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>🎁 مكافآتك من هذا التحدي</Text>

            {rewards.map((r: any) => (
              <View key={r.id} style={s.rewardItem}>
                <View style={s.rewardItemHeader}>
                  <View style={[s.rewardItemBadge, { backgroundColor: rewardMeta.color + '15' }]}>
                    <Text style={[s.rewardItemBadgeTxt, { color: rewardMeta.color }]}>
                      {rewardMeta.label}
                    </Text>
                  </View>
                  <Text style={s.rewardItemDate}>
                    {formatDate(r.createdAt)}
                  </Text>
                </View>

                {/* كاش باك */}
                {r.cashAmount > 0 && (
                  <Text style={[s.rewardItemValue, { color: SUCCESS }]}>
                    +{Number(r.cashAmount).toLocaleString()} د.ع
                  </Text>
                )}

                {/* كود */}
                {r.code && (
                  <TouchableOpacity
                    style={s.codeBox}
                    onPress={() => copyCode(r.code)}>
                    <Ionicons name="copy-outline" size={16} color={PRIMARY} />
                    <Text style={s.codeTxt}>{r.code}</Text>
                  </TouchableOpacity>
                )}

                {r.expiresAt && (
                  <Text style={s.codeExpiry}>
                    صالح حتى {formatDate(r.expiresAt)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ─── الطلبات المحتسبة ─── */}
        {orders.length > 0 && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>📦 الطلبات في التحدي ({orders.length})</Text>

            {orders.map((o: any) => {
              const st = STATUS_LABELS[o.status] || STATUS_LABELS.counted;
              return (
                <View key={o.id} style={s.orderRow}>
                  <View style={s.orderRight}>
                    <Ionicons name={st.icon} size={16} color={st.color} />
                    <Text style={[s.orderStatus, { color: st.color }]}>
                      {st.label}
                    </Text>
                  </View>
                  <View style={s.orderLeft}>
                    <Text style={s.orderId}>طلب #{o.orderId}</Text>
                    <Text style={s.orderDate}>{formatDate(o.createdAt)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 20 }} />

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyTxt: { fontSize: 14, color: '#9ca3af' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#f0f9fa',
    borderWidth: 1.5, borderColor: '#d4eef3',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#111827' },

  scroll: { padding: 14, paddingBottom: 30 },

  // Hero Card
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroImg: { width: '100%', height: 160, backgroundColor: '#f3f4f6' },
  heroImgPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  heroBody: { padding: 16, alignItems: 'flex-end' },
  statusRow: { flexDirection: 'row-reverse', marginBottom: 10 },
  statusPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10,
  },
  statusTxt: { fontSize: 10, fontWeight: 'bold' },
  campaignTitle: {
    fontSize: 18, fontWeight: 'bold', color: '#111827',
    textAlign: 'right', marginBottom: 6,
  },
  campaignDesc: {
    fontSize: 13, color: '#6b7280',
    textAlign: 'right', lineHeight: 20, marginBottom: 10,
  },
  productLink: {
    flexDirection: 'row-reverse',
    alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: PRIMARY + '10',
    borderRadius: 10,
  },
  productLinkTxt: {
    fontSize: 13, color: PRIMARY, fontWeight: '600',
    textAlign: 'right', flex: 1,
  },

  // Generic Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 14, fontWeight: 'bold', color: '#374151',
    textAlign: 'right', marginBottom: 12,
  },

  // Period
  periodRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  periodItem: { flex: 1, alignItems: 'center', gap: 3 },
  periodDivider: { width: 1, height: 30, backgroundColor: '#e8edf2' },
  periodLbl: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },
  periodVal: { fontSize: 12, color: '#111827', fontWeight: 'bold' },

  // Progress
  progressHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  progressCount: { fontSize: 24, fontWeight: 'bold', color: PRIMARY },
  progressLbl: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  progressTrack: {
    height: 10, backgroundColor: '#f3f4f6',
    borderRadius: 5, overflow: 'hidden',
  },
  progressFill: { height: 10, borderRadius: 5 },
  progressFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressPct: { fontSize: 14, fontWeight: 'bold' },
  progressHint: { fontSize: 11, color: '#6b7280' },

  // Reward
  rewardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center', gap: 12,
    marginBottom: 12,
  },
  rewardIconBox: {
    width: 46, height: 46, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  rewardLbl: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  rewardTitle: { fontSize: 15, fontWeight: 'bold', marginTop: 2 },
  rewardValue: {
    fontSize: 20, fontWeight: 'bold', color: '#111827',
    textAlign: 'right', marginBottom: 4,
  },
  rewardDesc: {
    fontSize: 12, color: '#6b7280',
    textAlign: 'right', marginBottom: 10,
  },
  rewardClaimedBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12,
    borderWidth: 1.5,
  },
  rewardClaimedTxt: { fontSize: 12, fontWeight: '700' },

  // Reward Item
  rewardItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rewardItemHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rewardItemBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8,
  },
  rewardItemBadgeTxt: { fontSize: 10, fontWeight: 'bold' },
  rewardItemDate: { fontSize: 11, color: '#9ca3af' },
  rewardItemValue: {
    fontSize: 18, fontWeight: 'bold',
    textAlign: 'right', marginBottom: 6,
  },
  codeBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: PRIMARY + '10',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: PRIMARY + '30',
    borderStyle: 'dashed',
  },
  codeTxt: {
    fontSize: 16, fontWeight: 'bold',
    color: PRIMARY, letterSpacing: 1.5, flex: 1,
    textAlign: 'right',
  },
  codeExpiry: {
    fontSize: 10, color: '#9ca3af',
    textAlign: 'right', marginTop: 6,
  },

  // Orders
  orderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  orderRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center', gap: 6,
  },
  orderStatus: { fontSize: 12, fontWeight: 'bold' },
  orderLeft: { alignItems: 'flex-start' },
  orderId: { fontSize: 13, fontWeight: '600', color: '#111827' },
  orderDate: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
});