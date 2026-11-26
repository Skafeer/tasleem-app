import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, FlatList, Alert, Switch, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const SUCCESS = '#10b981';
const DANGER = '#ef4444';
const WARNING = '#f59e0b';
const BG = '#f2f6f9';

type SubTab = 'stats' | 'list' | 'rewards' | 'settings';

export default function ReferralsTab() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<SubTab>('stats');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // ── Queries ──
  const { data: stats, isLoading: loadStats, refetch: refetchStats } = useQuery({
    queryKey: ['admin-referral-stats'],
    queryFn: async () => (await api.get('/api/admin/referrals/stats')).data,
  });

  const { data: listData, isLoading: loadList, refetch: refetchList } = useQuery({
    queryKey: ['admin-referrals-list', search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' });
      if (search) params.append('search', search);
      return (await api.get(`/api/admin/referrals?${params}`)).data;
    },
  });

  const { data: rewardsData, isLoading: loadRewards, refetch: refetchRewards } = useQuery({
    queryKey: ['admin-referral-rewards'],
    queryFn: async () => (await api.get('/api/admin/referrals/rewards?limit=50')).data,
  });

  const { data: settings, isLoading: loadSettings, refetch: refetchSettings } = useQuery({
    queryKey: ['admin-referral-settings'],
    queryFn: async () => (await api.get('/api/admin/referrals/settings')).data,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchList(), refetchRewards(), refetchSettings()]);
    setRefreshing(false);
  };

  // ── Mutations ──
  const processNow = useMutation({
    mutationFn: async () => (await api.post('/api/admin/referrals/process-now')).data,
    onSuccess: (data) => {
      toast.success(`تم المعالجة: ${data.processed} طلب، مكافآت: ${data.rewardsPaid}`);
      onRefresh();
    },
    onError: () => toast.error('فشل التشغيل'),
  });

  const cancelReward = useMutation({
    mutationFn: async ({ id, stage }: { id: number; stage: number }) =>
      await api.patch(`/api/admin/referrals/${id}/cancel-reward`, { stage, reason: 'إلغاء يدوي من الأدمن' }),
    onSuccess: () => {
      toast.success('تم إلغاء المكافأة وخصمها من الرصيد');
      onRefresh();
    },
    onError: () => toast.error('فشل إلغاء المكافأة'),
  });

  const saveSettings = useMutation({
    mutationFn: async (data: any) => (await api.patch('/api/admin/referrals/settings', data)).data,
    onSuccess: () => {
      toast.success('تم حفظ الإعدادات');
      qc.invalidateQueries({ queryKey: ['admin-referral-settings'] });
    },
    onError: () => toast.error('فشل الحفظ'),
  });

  // ── Sub-Tabs Render ──
  const renderTabs = () => (
    <View style={s.tabsWrap}>
      {[
        { key: 'stats', label: 'إحصائيات', icon: 'bar-chart-outline' },
        { key: 'list', label: 'الإحالات', icon: 'list-outline' },
        { key: 'rewards', label: 'المكافآت', icon: 'cash-outline' },
        { key: 'settings', label: 'الإعدادات', icon: 'settings-outline' },
      ].map((t: any) => (
        <TouchableOpacity
          key={t.key}
          style={[s.tabBtn, activeTab === t.key && s.tabBtnActive]}
          onPress={() => setActiveTab(t.key)}>
          <Ionicons name={t.icon} size={16} color={activeTab === t.key ? '#fff' : '#6b7280'} />
          <Text style={[s.tabTxt, activeTab === t.key && s.tabTxtActive]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStats = () => {
    if (loadStats || !stats) return <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />;
    return (
      <ScrollView contentContainerStyle={s.pad}>
        <View style={s.grid}>
          <View style={s.statBox}><Text style={s.statVal}>{stats.totalReferrals}</Text><Text style={s.statLbl}>إجمالي الإحالات</Text></View>
          <View style={s.statBox}><Text style={s.statVal}>{stats.activeReferrals}</Text><Text style={s.statLbl}>نشطة</Text></View>
          <View style={s.statBox}><Text style={[s.statVal, { color: SUCCESS }]}>{stats.totalRewardPaid.toLocaleString()}</Text><Text style={s.statLbl}>مكافآت مدفوعة</Text></View>
          <View style={s.statBox}><Text style={s.statVal}>{stats.thisMonthReferrals}</Text><Text style={s.statLbl}>هذا الشهر</Text></View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>المراحل</Text>
          <View style={s.rowBetween}><Text style={s.txt}>المرحلة 1 ({stats.config.threshold1} طلبات)</Text><Text style={s.txtGreen}>{stats.stages.s1Count} تاجر</Text></View>
          <View style={s.rowBetween}><Text style={s.txt}>المرحلة 2 ({stats.config.threshold2} طلبات)</Text><Text style={s.txtGreen}>{stats.stages.s2Count} تاجر</Text></View>
          <View style={s.rowBetween}><Text style={s.txt}>المرحلة 3 ({stats.config.threshold3} طلبات)</Text><Text style={s.txtGreen}>{stats.stages.s3Count} تاجر</Text></View>
        </View>

        <TouchableOpacity style={s.primaryBtn} onPress={() => processNow.mutate()} disabled={processNow.isPending}>
          {processNow.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnTxt}>تشغيل المعالجة الآن (يدوي)</Text>}
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderList = () => {
    if (loadList || !listData) return <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />;
    return (
      <View style={{ flex: 1 }}>
        <View style={s.searchWrap}>
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput style={s.searchInput} placeholder="ابحث عن تاجر..." value={search} onChangeText={setSearch} textAlign="right" />
        </View>
        <FlatList
          data={listData.data}
          keyExtractor={(i: any) => i.id.toString()}
          contentContainerStyle={s.pad}
          ListEmptyComponent={<Text style={s.empty}>لا توجد إحالات</Text>}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.rowBetween}>
                <Text style={s.bold}>{item.referee.storeName}</Text>
                <Text style={s.txtGreen}>{item.totalRewardPaid.toLocaleString()} د.ع</Text>
              </View>
              <Text style={s.sub}>الداعي: {item.referrer.storeName}</Text>
              <Text style={s.sub}>الكود: {item.code}</Text>
              <View style={s.progressWrap}>
                <Text style={s.sub}>{item.deliveredOrdersCount} / {item.rewards.s3.paid ? 'مكتمل' : item.rewards.s2.paid ? stats.config.threshold3 : item.rewards.s1.paid ? stats.config.threshold2 : stats.config.threshold1} طلبات</Text>
              </View>
            </View>
          )}
        />
      </View>
    );
  };

  const renderRewards = () => {
    if (loadRewards || !rewardsData) return <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />;
    return (
      <FlatList
        data={rewardsData.data}
        keyExtractor={(i: any) => i.id.toString()}
        contentContainerStyle={s.pad}
        ListEmptyComponent={<Text style={s.empty}>لا توجد مكافآت</Text>}
        renderItem={({ item }) => (
          <View style={[s.card, item.status === 'cancelled' && { opacity: 0.6 }]}>
            <View style={s.rowBetween}>
              <Text style={s.bold}>{item.amount.toLocaleString()} د.ع</Text>
              <Text style={{ color: item.status === 'paid' ? SUCCESS : DANGER, fontWeight: 'bold' }}>{item.status === 'paid' ? 'مدفوعة' : 'ملغاة'}</Text>
            </View>
            <Text style={s.sub}>للتاجر: {item.referrer_store}</Text>
            <Text style={s.sub}>من إحالة: {item.referee_store} (المرحلة {item.stage})</Text>
            {item.status === 'paid' && (
              <TouchableOpacity
                style={s.dangerBtn}
                onPress={() => Alert.alert('إلغاء مكافأة', 'هل تريد إلغاء المكافأة وخصمها؟', [
                  { text: 'تراجع', style: 'cancel' },
                  { text: 'تأكيد', style: 'destructive', onPress: () => cancelReward.mutate({ id: item.referral_id, stage: item.stage }) }
                ])}>
                <Text style={s.dangerBtnTxt}>إلغاء المكافأة</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    );
  };

  const renderSettings = () => {
    if (loadSettings || !settings) return <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />;
    
    const update = (key: string, val: any) => {
      saveSettings.mutate({ [key]: val });
    };

    return (
      <ScrollView contentContainerStyle={s.pad}>
        <View style={s.card}>
          <View style={s.rowBetween}>
            <Text style={s.bold}>تفعيل النظام</Text>
            <Switch value={settings.enabled} onValueChange={(v) => update('enabled', v)} trackColor={{ true: PRIMARY }} />
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>المكافآت</Text>
          {[1, 2, 3].map(stage => (
            <View key={stage} style={s.inputRow}>
              <Text style={s.txt}>مكافأة المرحلة {stage}:</Text>
              <TextInput
                style={s.smallInput}
                keyboardType="numeric"
                defaultValue={String(settings[`reward${stage}` as keyof typeof settings])}
                onEndEditing={(e) => update(`reward${stage}`, Number(e.nativeEvent.text))}
              />
            </View>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>العتبات (عدد الطلبات)</Text>
          {[1, 2, 3].map(stage => (
            <View key={stage} style={s.inputRow}>
              <Text style={s.txt}>عتبة المرحلة {stage}:</Text>
              <TextInput
                style={s.smallInput}
                keyboardType="numeric"
                defaultValue={String(settings[`threshold${stage}` as keyof typeof settings])}
                onEndEditing={(e) => update(`threshold${stage}`, Number(e.nativeEvent.text))}
              />
            </View>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>أيام الانتظار</Text>
          <View style={s.inputRow}>
            <Text style={s.txt}>يُحسب الطلب بعد:</Text>
            <TextInput
              style={s.smallInput}
              keyboardType="numeric"
              defaultValue={String(settings.daysHold)}
              onEndEditing={(e) => update('daysHold', Number(e.nativeEvent.text))}
            />
            <Text style={s.txt}>أيام</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {renderTabs()}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {activeTab === 'stats' && renderStats()}
        {activeTab === 'list' && renderList()}
        {activeTab === 'rewards' && renderRewards()}
        {activeTab === 'settings' && renderSettings()}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 40 },
  tabsWrap: { flexDirection: 'row', backgroundColor: '#fff', padding: 8, gap: 4, borderBottomWidth: 1, borderBottomColor: '#e8edf2' },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10 },
  tabBtnActive: { backgroundColor: PRIMARY },
  tabTxt: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  tabTxtActive: { color: '#fff' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, minWidth: '45%', backgroundColor: '#fff', padding: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e8edf2' },
  statVal: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  statLbl: { fontSize: 11, color: '#6b7280', marginTop: 4 },

  card: { backgroundColor: '#fff', padding: 16, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e8edf2' },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827', marginBottom: 12, textAlign: 'right' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  bold: { fontSize: 14, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  txt: { fontSize: 13, color: '#374151', textAlign: 'right' },
  sub: { fontSize: 12, color: '#6b7280', textAlign: 'right', marginTop: 4 },
  txtGreen: { fontSize: 14, fontWeight: 'bold', color: SUCCESS },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },

  primaryBtn: { backgroundColor: PRIMARY, padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  primaryBtnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  dangerBtn: { backgroundColor: DANGER + '15', padding: 10, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  dangerBtnTxt: { color: DANGER, fontWeight: 'bold', fontSize: 13 },

  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e8edf2' },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827' },

  progressWrap: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  inputRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  smallInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, width: 80, textAlign: 'center', fontSize: 14 },
});