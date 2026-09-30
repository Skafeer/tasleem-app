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
const BORDER = '#e8edf2';

const REWARD_META: Record<string, { label: string; icon: string; color: string; bg: string; desc: string }> = {
  cashback: {
    label: 'كاش باك',
    icon: 'cash-outline',
    color: SUCCESS,
    bg: '#ecfdf5',
    desc: 'يُضاف المبلغ مباشرة لرصيدك',
  },
  shipping_code: {
    label: 'كود خصم توصيل',
    icon: 'bicycle-outline',
    color: PRIMARY,
    bg: '#f0f9fa',
    desc: 'كود يُخصم من كلفة التوصيل',
  },
  free_shipping: {
    label: 'توصيل مجاني',
    icon: 'car-sport-outline',
    color: PURPLE,
    bg: '#f5f3ff',
    desc: 'كود يجعل التوصيل مجانياً',
  },
  product_code: {
    label: 'كود خصم منتج',
    icon: 'pricetag-outline',
    color: SECONDARY,
    bg: '#fffbeb',
    desc: 'كود يُخصم من سعر المنتجات',
  },
};

const ORDER_STATUS: Record<string, { label: string; color: string; icon: string }> = {
  counted:  { label: 'محتسب', color: SUCCESS, icon: 'checkmark-circle' },
  rejected: { label: 'ملغي',  color: DANGER,  icon: 'close-circle' },
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
  if (campaign.rewardType === 'cashback')      return `${Number(campaign.rewardValue).toLocaleString()} د.ع`;
  if (campaign.rewardType === 'shipping_code') return `خصم ${campaign.rewardValue}%`;
  if (campaign.rewardType === 'free_shipping') return 'مجاني';
  if (campaign.rewardType === 'product_code')  return `خصم ${campaign.rewardValue}%`;
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

  // ─── Loading ───
  if (isLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-forward" size={20} color="#111827" />
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

  // ─── Not found ───
  if (!campaign) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-forward" size={20} color="#111827" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>تفاصيل التحدي</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.center}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="alert-circle-outline" size={36} color={PRIMARY} />
          </View>
          <Text style={s.emptyTitle}>التحدي غير موجود</Text>
        </View>
      </SafeAreaView>
    );
  }

  const participant = campaign.participant || {};
  const rewards     = campaign.rewards || [];
  const orders      = campaign.orders || [];

  const progress    = Math.min(100, Math.round(((participant.progressCount || 0) / campaign.targetCount) * 100));
  const productImg  = getProductImage(campaign.product);
  const rewardMeta  = REWARD_META[campaign.rewardType] || REWARD_META.cashback;
  const isExpired   = new Date(campaign.endsAt) < new Date();
  const daysLeft    = getDaysLeft(campaign.endsAt);

  const reached   = participant.targetReached && !participant.rewardClaimed;
  const completed = participant.rewardClaimed;

  const statusColor = completed ? SUCCESS : reached ? SECONDARY : isExpired ? '#9ca3af' : PRIMARY;
  const statusIcon  = completed ? 'checkmark-circle' : reached ? 'flag' : isExpired ? 'time-outline' : 'flash';
  const statusLabel = completed ? 'مستلمة' : reached ? 'وصلت الهدف' : isExpired ? 'انتهى' : 'نشط';

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ─── Header ─── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-forward" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>تفاصيل التحدي</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}>

        {/* ═══ بطاقة التحدي ═══ */}
        <View style={s.card}>

          {/* شارة الحالة */}
          <View style={[s.statusBadge, { backgroundColor: statusColor + '15', alignSelf: 'flex-end' }]}>
            <Ionicons name={statusIcon as any} size={11} color={statusColor} />
            <Text style={[s.statusTxt, { color: statusColor }]}>{statusLabel}</Text>
          </View>

          {/* صورة + معلومات */}
          <View style={s.cardTop}>
            {productImg ? (
              <Image source={{ uri: productImg }} style={s.productImg} resizeMode="cover" />
            ) : (
              <View style={[s.productImg, s.productImgPlaceholder]}>
                <Ionicons name="cube-outline" size={26} color="#d1d5db" />
              </View>
            )}
            <View style={s.infoWrap}>
              <Text style={s.campaignTitle} numberOfLines={2}>{campaign.title}</Text>
              <TouchableOpacity
                style={s.productLink}
                onPress={() => router.push(`/products/${campaign.productId}`)}>
                <Ionicons name="chevron-back" size={12} color={PRIMARY} />
                <Text style={s.productLinkTxt} numberOfLines={1}>
                  {campaign.product?.name || 'المنتج'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* الوصف */}
          {!!campaign.description && (
            <Text style={s.campaignDesc}>{campaign.description}</Text>
          )}
        </View>

        {/* ═══ التقدم ═══ */}
        <View style={s.card}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionHeaderVal, { color: completed || reached ? SUCCESS : PRIMARY }]}>
              {progress}%
            </Text>
            <Text style={s.sectionHeaderLbl}>التقدم</Text>
          </View>

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
                  backgroundColor: completed || reached ? SUCCESS : PRIMARY,
                },
              ]}
            />
          </View>

          {!participant.targetReached && !isExpired && (
            <View style={s.hintRow}>
              <Ionicons name="information-circle-outline" size={13} color="#9ca3af" />
              <Text style={s.hintTxt}>
                يحتاج {campaign.targetCount - (participant.progressCount || 0)} طلب إضافي لإكمال التحدي
              </Text>
            </View>
          )}

          {reached && (
            <View style={[s.hintRow, s.hintRowSuccess]}>
              <Ionicons name="checkmark-circle-outline" size={14} color={SECONDARY} />
              <Text style={[s.hintTxt, { color: SECONDARY }]}>
                ستُصرف المكافأة تلقائياً بعد انتهاء التحدي
              </Text>
            </View>
          )}
        </View>

        {/* ═══ المكافأة ═══ */}
        <View style={s.card}>
          <View style={[s.rewardHeader, { backgroundColor: rewardMeta.bg }]}>
            <View style={[s.rewardIconWrap, { backgroundColor: rewardMeta.color + '25' }]}>
              <Ionicons name={rewardMeta.icon as any} size={22} color={rewardMeta.color} />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={s.rewardLbl}>المكافأة</Text>
              <Text style={[s.rewardTitle, { color: rewardMeta.color }]}>
                {rewardMeta.label}
              </Text>
            </View>
            <Text style={[s.rewardVal, { color: rewardMeta.color }]}>
              {getRewardText(campaign)}
            </Text>
          </View>
          <Text style={s.rewardDesc}>{rewardMeta.desc}</Text>
        </View>

        {/* ═══ الفترة ═══ */}
        <View style={s.card}>
          <View style={s.periodRow}>
            <View style={s.periodItem}>
              <Text style={s.periodLbl}>البداية</Text>
              <Text style={s.periodVal}>{formatDate(campaign.startsAt)}</Text>
            </View>
            <View style={s.periodDivider} />
            <View style={s.periodItem}>
              <Text style={s.periodLbl}>النهاية</Text>
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

        {/* ═══ المكافآت المُستلمة ═══ */}
        {rewards.length > 0 && (
          <View style={s.card}>
            <View style={s.sectionTitleRow}>
              <Ionicons name="gift-outline" size={16} color={PRIMARY} />
              <Text style={s.sectionTitle}>مكافآتك</Text>
            </View>

            {rewards.map((r: any) => (
              <View key={r.id} style={s.rewardItem}>
                <View style={s.rewardItemHeader}>
                  <Text style={s.rewardItemDate}>{formatDate(r.createdAt)}</Text>
                  <View style={[s.rewardItemBadge, { backgroundColor: rewardMeta.color + '15' }]}>
                    <Text style={[s.rewardItemBadgeTxt, { color: rewardMeta.color }]}>
                      {rewardMeta.label}
                    </Text>
                  </View>
                </View>

                {r.cashAmount > 0 && (
                  <View style={s.cashRow}>
                    <Ionicons name="checkmark-circle" size={16} color={SUCCESS} />
                    <Text style={s.cashVal}>
                      +{Number(r.cashAmount).toLocaleString()} د.ع
                    </Text>
                  </View>
                )}

                {r.code && (
                  <TouchableOpacity style={s.codeBox} onPress={() => copyCode(r.code)}>
                    <Ionicons name="copy-outline" size={16} color={PRIMARY} />
                    <Text style={s.codeTxt}>{r.code}</Text>
                  </TouchableOpacity>
                )}

                {r.expiresAt && (
                  <View style={s.codeExpiryRow}>
                    <Ionicons name="time-outline" size={11} color="#9ca3af" />
                    <Text style={s.codeExpiryTxt}>
                      صالح حتى {formatDate(r.expiresAt)}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ═══ الطلبات المحتسبة ═══ */}
        {orders.length > 0 && (
          <View style={s.card}>
            <View style={s.sectionTitleRow}>
              <Ionicons name="cube-outline" size={16} color={PRIMARY} />
              <Text style={s.sectionTitle}>الطلبات المحتسبة ({orders.length})</Text>
            </View>

            {orders.map((o: any) => {
              const st = ORDER_STATUS[o.status] || ORDER_STATUS.counted;
              return (
                <TouchableOpacity
                  key={o.id}
                  style={s.orderRow}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/order-details/${o.orderId}`)}>
                  <View style={s.orderRight}>
                    <Text style={s.orderId}>طلب #{o.orderId}</Text>
                    <Text style={s.orderDate}>{formatDate(o.createdAt)}</Text>
                  </View>
                  <View style={s.orderLeft}>
                    <View style={[s.orderBadge, { backgroundColor: st.color + '15' }]}>
                      <Ionicons name={st.icon as any} size={10} color={st.color} />
                      <Text style={[s.orderBadgeTxt, { color: st.color }]}>
                        {st.label}
                      </Text>
                    </View>
                    <Ionicons name="chevron-back" size={14} color="#9ca3af" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════
// ─── الأنماط ───
// ═════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },

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
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#f0f9fa',
    borderWidth: 1.5, borderColor: '#d4eef3',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#111827' },

  // ─── Empty ───
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: PRIMARY + '10',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151' },

  // ─── Scroll ───
  scroll: { padding: 14, paddingBottom: 30 },

  // ─── Card ───
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // ─── Status Badge ───
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  statusTxt: { fontSize: 10, fontWeight: 'bold' },

  // ─── Card Top ───
  cardTop: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 12,
  },
  productImg: {
    width: 70, height: 70, borderRadius: 14,
    backgroundColor: '#f3f4f6',
  },
  productImgPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  infoWrap: {
    flex: 1, alignItems: 'flex-end', justifyContent: 'center', gap: 6,
  },
  campaignTitle: {
    fontSize: 15, fontWeight: 'bold', color: '#111827',
    textAlign: 'right', lineHeight: 22,
  },
  productLink: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
  },
  productLinkTxt: {
    fontSize: 12, color: PRIMARY, fontWeight: '600',
    textAlign: 'right',
  },
  campaignDesc: {
    fontSize: 13, color: '#6b7280', textAlign: 'right',
    lineHeight: 20, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },

  // ─── Progress ───
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderVal: { fontSize: 26, fontWeight: 'bold' },
  sectionHeaderLbl: { fontSize: 12, color: '#9ca3af', fontWeight: '600' },

  progressHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressCount: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  progressLbl: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },

  progressTrack: {
    height: 10, backgroundColor: '#f3f4f6',
    borderRadius: 5, overflow: 'hidden',
  },
  progressFill: { height: 10, borderRadius: 5 },

  hintRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
  },
  hintRowSuccess: {
    backgroundColor: SECONDARY + '10',
  },
  hintTxt: { flex: 1, fontSize: 11, color: '#6b7280', textAlign: 'right' },

  // ─── Reward ───
  rewardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  rewardIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  rewardLbl: { fontSize: 10, color: '#6b7280', fontWeight: '600' },
  rewardTitle: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  rewardVal: { fontSize: 16, fontWeight: 'bold' },
  rewardDesc: {
    fontSize: 11, color: '#9ca3af',
    textAlign: 'right',
    paddingHorizontal: 4,
  },

  // ─── Period ───
  periodRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  periodItem: { flex: 1, alignItems: 'center', gap: 4 },
  periodDivider: { width: 1, height: 32, backgroundColor: BORDER },
  periodLbl: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },
  periodVal: { fontSize: 12, color: '#111827', fontWeight: 'bold' },

  // ─── Section Title ───
  sectionTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 14, fontWeight: 'bold', color: '#111827',
    flex: 1, textAlign: 'right',
  },

  // ─── Reward Item ───
  rewardItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rewardItemHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rewardItemBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 7,
  },
  rewardItemBadgeTxt: { fontSize: 10, fontWeight: 'bold' },
  rewardItemDate: { fontSize: 11, color: '#9ca3af' },

  cashRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ecfdf5',
    borderRadius: 10,
  },
  cashVal: {
    fontSize: 15, fontWeight: 'bold', color: SUCCESS,
    flex: 1, textAlign: 'right',
  },

  codeBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: PRIMARY + '08',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: PRIMARY + '25',
    borderStyle: 'dashed',
  },
  codeTxt: {
    fontSize: 16, fontWeight: 'bold', color: PRIMARY,
    letterSpacing: 1.5, flex: 1, textAlign: 'right',
  },
  codeExpiryRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  codeExpiryTxt: { fontSize: 10, color: '#9ca3af' },

  // ─── Order Row ───
  orderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  orderRight: { alignItems: 'flex-end', gap: 2 },
  orderId: { fontSize: 13, fontWeight: '600', color: '#111827' },
  orderDate: { fontSize: 10, color: '#9ca3af' },
  orderLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  orderBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  orderBadgeTxt: { fontSize: 10, fontWeight: 'bold' },
});