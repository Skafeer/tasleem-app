import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, ActivityIndicator, Clipboard, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY  = '#0c6679';
const SUCCESS  = '#10b981';
const DANGER   = '#ef4444';
const WARNING  = '#f59e0b';
const INFO     = '#3b82f6';

const W_STATUS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:  { label: 'قيد المعالجة', color: WARNING, bg: '#fffbeb', icon: 'time-outline' },
  approved: { label: 'تم القبول',    color: INFO,    bg: '#eff6ff', icon: 'checkmark-outline' },
  paid:     { label: 'تم الدفع',     color: SUCCESS, bg: '#ecfdf5', icon: 'cash-outline' },
  rejected: { label: 'مرفوض',        color: DANGER,  bg: '#fef2f2', icon: 'close-circle-outline' },
};

const FILTERS = [
  { key: 'all',      label: 'الكل' },
  { key: 'pending',  label: 'معالجة' },
  { key: 'approved', label: 'مقبول' },
  { key: 'paid',     label: 'مدفوع' },
  { key: 'rejected', label: 'مرفوض' },
];

export default function WithdrawalsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data: withdrawals = [], isLoading } = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: async () => {
      const { data } = await api.get('/api/withdrawals');
      return Array.isArray(data)
        ? [...data].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        : [];
    },
    refetchInterval: 30000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => { const { data } = await api.get('/api/admin/users'); return data; },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: any) => {
      const { data } = await api.patch(`/api/withdrawals/${id}`, { status });
      return data;
    },
    onSuccess: (_: any, vars: any) => {
      qc.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(`تم تحديث الحالة: ${W_STATUS[vars.status]?.label || ''}`);
    },
    onError: () => toast.error('فشل تحديث الحالة'),
  });

  const getMerchant = (merchantId: number) =>
    (users as any[]).find((u: any) => u.id === merchantId);

  const copy = (text: string, label: string) => {
    Clipboard.setString(text ?? '');
    toast.success(`تم نسخ ${label}`);
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    const dt = new Date(d);
    const date = dt.toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
    const time = dt.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
    return `${date} — ${time}`;
  };

  const confirmAction = (w: any, newStatus: string) => {
    const labels: any = {
      approved: { title: 'قبول الطلب',  msg: `هل تريد قبول طلب السحب بمبلغ ${w.amount?.toLocaleString()} د.ع؟`, btn: 'قبول', style: 'default' },
      paid:     { title: 'تأكيد الدفع', msg: `هل تأكدت من دفع مبلغ ${w.amount?.toLocaleString()} د.ع للتاجر؟`,   btn: 'تأكيد', style: 'default' },
      rejected: { title: 'رفض الطلب',   msg: `هل تريد رفض الطلب؟\nسيُعاد المبلغ ${w.amount?.toLocaleString()} د.ع لحساب التاجر.`, btn: 'رفض', style: 'destructive' },
    };
    const l = labels[newStatus];
    if (!l) return;
    Alert.alert(l.title, l.msg, [
      { text: 'إلغاء', style: 'cancel' },
      { text: l.btn, style: l.style, onPress: () => updateStatus.mutate({ id: w.id, status: newStatus }) },
    ]);
  };

  const filtered = (withdrawals as any[]).filter((w: any) =>
    filter === 'all' || w.status === filter
  );

  const counts: Record<string, number> = {};
  FILTERS.forEach(f => {
    counts[f.key] = f.key === 'all'
      ? (withdrawals as any[]).length
      : (withdrawals as any[]).filter((w: any) => w.status === f.key).length;
  });

  if (isLoading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={PRIMARY} />
      <Text style={s.loadingTxt}>جاري تحميل السحوبات...</Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>

      {/* فلاتر الحالة */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={s.filtersScroll} contentContainerStyle={s.filtersContent}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.key}
            style={[s.chip, filter === f.key && s.chipActive]}
            onPress={() => setFilter(f.key)}>
            <Text style={[s.chipTxt, filter === f.key && s.chipTxtActive]}>{f.label}</Text>
            {counts[f.key] > 0 && (
              <View style={[s.chipBadge, filter === f.key && s.chipBadgeActive]}>
                <Text style={[s.chipBadgeTxt, filter === f.key && s.chipBadgeTxtActive]}>
                  {counts[f.key]}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* القائمة */}
      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.id.toString()}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.center}>
            <Ionicons name="cash-outline" size={52} color="#d1d5db" />
            <Text style={s.emptyTxt}>لا توجد طلبات سحب</Text>
          </View>
        }
        renderItem={({ item: w }: any) => {
          const st       = W_STATUS[w.status] || W_STATUS.pending;
          const merchant = getMerchant(w.merchantId);

          return (
            <View style={s.card}>

              {/* رأس الكارد */}
              <View style={s.cardHeader}>
                <View style={[s.statusPill, { backgroundColor: st.bg }]}>
                  <Ionicons name={st.icon} size={13} color={st.color} />
                  <Text style={[s.statusTxt, { color: st.color }]}>{st.label}</Text>
                </View>
                <View style={s.amountBox}>
                  <Text style={s.amount}>{w.amount?.toLocaleString()} د.ع</Text>
                  <View style={s.dateRow}>
                    <Ionicons name="time-outline" size={11} color="#9ca3af" />
                    <Text style={s.dateTxt}>{formatDate(w.createdAt)}</Text>
                  </View>
                </View>
              </View>

              <View style={s.divider} />

              {/* معلومات التاجر */}
              <View style={s.section}>
                <View style={s.sectionLabelRow}>
                  <Ionicons name="storefront-outline" size={13} color="#8b5cf6" />
                  <Text style={[s.sectionLabel, { color: '#8b5cf6' }]}>التاجر</Text>
                </View>
                <View style={s.infoBlock}>
                  <View style={s.infoLine}>
                    <TouchableOpacity style={[s.copyBtn, { backgroundColor: '#8b5cf6' + '15' }]}
                      onPress={() => copy(merchant?.storeName || merchant?.name || '', 'اسم التاجر')}>
                      <Ionicons name="copy-outline" size={13} color="#8b5cf6" />
                    </TouchableOpacity>
                    <Text style={s.infoVal}>{merchant?.storeName || merchant?.name || `تاجر #${w.merchantId}`}</Text>
                  </View>
                  {merchant?.phone && (
                    <View style={s.infoLine}>
                      <TouchableOpacity style={[s.copyBtn, { backgroundColor: '#8b5cf6' + '15' }]}
                        onPress={() => copy(merchant.phone, 'رقم الهاتف')}>
                        <Ionicons name="copy-outline" size={13} color="#8b5cf6" />
                      </TouchableOpacity>
                      <Text style={s.infoSub}>{merchant.phone}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={s.divider} />

              {/* تفاصيل السحب */}
              <View style={s.section}>
                <View style={s.sectionLabelRow}>
                  <Ionicons name="card-outline" size={13} color={PRIMARY} />
                  <Text style={s.sectionLabel}>تفاصيل السحب</Text>
                </View>
                <View style={s.infoBlock}>
                  <View style={s.infoLine}>
                    <TouchableOpacity style={s.copyBtn}
                      onPress={() => copy(w.accountDetails || '', 'رقم البطاقة')}>
                      <Ionicons name="copy-outline" size={13} color={PRIMARY} />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.infoLabel}>رقم البطاقة</Text>
                      <Text style={s.infoVal}>{w.accountDetails || '—'}</Text>
                    </View>
                  </View>
                  <View style={s.infoLine}>
                    <TouchableOpacity style={s.copyBtn}
                      onPress={() => copy(String(w.amount), 'المبلغ')}>
                      <Ionicons name="copy-outline" size={13} color={PRIMARY} />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.infoLabel}>المبلغ</Text>
                      <Text style={[s.infoVal, { color: PRIMARY }]}>{w.amount?.toLocaleString()} د.ع</Text>
                    </View>
                  </View>
                  <View style={s.methodRow}>
                    <Ionicons name="wallet-outline" size={13} color="#6b7280" />
                    <Text style={s.methodTxt}>
                      {w.method === 'mastercard' ? 'ماستر كارد' : w.method}
                    </Text>
                  </View>
                </View>
              </View>

              {/* أزرار pending */}
              {w.status === 'pending' && (
                <>
                  <View style={s.divider} />
                  <View style={s.actionsRow}>
                    <TouchableOpacity style={s.rejectBtn}
                      onPress={() => confirmAction(w, 'rejected')}
                      disabled={updateStatus.isPending}>
                      <Ionicons name="close-circle-outline" size={15} color={DANGER} />
                      <Text style={[s.actionTxt, { color: DANGER }]}>رفض</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.approveBtn}
                      onPress={() => confirmAction(w, 'approved')}
                      disabled={updateStatus.isPending}>
                      <Ionicons name="checkmark-circle-outline" size={15} color={INFO} />
                      <Text style={[s.actionTxt, { color: INFO }]}>قبول</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* أزرار approved */}
              {w.status === 'approved' && (
                <>
                  <View style={s.divider} />
                  <View style={s.actionsRow}>
                    <TouchableOpacity style={s.rejectBtn}
                      onPress={() => confirmAction(w, 'rejected')}
                      disabled={updateStatus.isPending}>
                      <Ionicons name="close-circle-outline" size={15} color={DANGER} />
                      <Text style={[s.actionTxt, { color: DANGER }]}>رفض</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.paidBtn}
                      onPress={() => confirmAction(w, 'paid')}
                      disabled={updateStatus.isPending}>
                      <Ionicons name="cash-outline" size={15} color={SUCCESS} />
                      <Text style={[s.actionTxt, { color: SUCCESS }]}>تأكيد الدفع</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* حالة نهائية */}
              {(w.status === 'paid' || w.status === 'rejected') && (
                <>
                  <View style={s.divider} />
                  <View style={s.finalRow}>
                    <Ionicons
                      name={w.status === 'paid' ? 'checkmark-circle' : 'close-circle'}
                      size={16} color={w.status === 'paid' ? SUCCESS : DANGER} />
                    <Text style={[s.finalTxt, { color: w.status === 'paid' ? SUCCESS : DANGER }]}>
                      {w.status === 'paid' ? 'تم الدفع بنجاح' : 'تم الرفض وإعادة المبلغ للتاجر'}
                    </Text>
                  </View>
                </>
              )}

            </View>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 10 },
  loadingTxt: { fontSize: 14, color: '#9ca3af' },
  emptyTxt:   { fontSize: 16, color: '#9ca3af', fontWeight: '600' },
  filtersScroll:  { maxHeight: 52 },
  filtersContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, alignItems: 'center' },
  chip:            { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 16, backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: '#e5e7eb' },
  chipActive:      { backgroundColor: PRIMARY + '18', borderColor: PRIMARY },
  chipTxt:         { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  chipTxtActive:   { color: PRIMARY },
  chipBadge:       { backgroundColor: '#e5e7eb', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  chipBadgeActive: { backgroundColor: PRIMARY },
  chipBadgeTxt:    { fontSize: 10, color: '#6b7280', fontWeight: 'bold' },
  chipBadgeTxtActive: { color: '#fff' },
  card:       { backgroundColor: '#fff', borderRadius: 18, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', padding: 14 },
  amountBox:  { alignItems: 'flex-end', gap: 4 },
  amount:     { fontSize: 22, fontWeight: 'bold', color: PRIMARY },
  dateRow:    { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  dateTxt:    { fontSize: 11, color: '#9ca3af' },
  statusPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20 },
  statusTxt:  { fontSize: 12, fontWeight: 'bold' },
  divider:    { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 14 },
  section:         { paddingHorizontal: 14, paddingVertical: 12 },
  sectionLabelRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionLabel:    { fontSize: 12, fontWeight: '700', color: PRIMARY },
  infoBlock: { gap: 10 },
  infoLine:  { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  infoLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '600', textAlign: 'right' },
  infoVal:   { fontSize: 14, fontWeight: '700', color: '#111827', textAlign: 'right' },
  infoSub:   { fontSize: 13, color: '#6b7280' },
  copyBtn:   { width: 30, height: 30, borderRadius: 9, backgroundColor: PRIMARY + '12', justifyContent: 'center', alignItems: 'center' },
  methodRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  methodTxt: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  actionsRow: { flexDirection: 'row-reverse', gap: 10, padding: 12 },
  rejectBtn:  { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 14, backgroundColor: DANGER + '10', borderWidth: 1, borderColor: DANGER + '30' },
  approveBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 14, backgroundColor: INFO + '10', borderWidth: 1, borderColor: INFO + '30' },
  paidBtn:    { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 14, backgroundColor: SUCCESS + '10', borderWidth: 1, borderColor: SUCCESS + '30' },
  actionTxt:  { fontSize: 13, fontWeight: '700' },
  finalRow:   { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12 },
  finalTxt:   { fontSize: 13, fontWeight: '600' },
});
