import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import api from '../src/lib/api';

const PRIMARY = '#0c6679';

export default function ReferralsScreen() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  // جلب البيانات مباشرة
  const { data, isLoading } = useQuery({
    queryKey: ['referrals-my'],
    queryFn: async () => {
      const res = await api.get('/api/referrals/my');
      return res.data;
    },
  });

  if (isLoading || !data) {
    return <View style={s.center}><ActivityIndicator size="large" color={PRIMARY} /></View>;
  }

  const handleCopy = async () => {
    await Clipboard.setStringAsync(data.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    await Share.share({ message: data.shareText });
  };

  const totalMax = data.config.reward1 + data.config.reward2 + data.config.reward3;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-forward" size={24} color="#111" /></TouchableOpacity>
        <Text style={s.headerTitle}>الإحالات والمكافآت</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* كرت الكود */}
        <LinearGradient colors={[PRIMARY, '#0a8a9f']} style={s.hero}>
          <Ionicons name="gift" size={40} color="rgba(255,255,255,0.8)" />
          <Text style={s.heroTitle}>اربح حتى {totalMax.toLocaleString()} د.ع</Text>
          <View style={s.codeBox}><Text style={s.codeText}>{data.code}</Text></View>
          <View style={s.row}>
            <TouchableOpacity style={s.btn} onPress={handleCopy}>
              <Ionicons name={copied ? "checkmark" : "copy-outline"} size={18} color={PRIMARY} />
              <Text style={s.btnText}>{copied ? 'تم النسخ' : 'نسخ'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnOutline]} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={18} color="#fff" />
              <Text style={[s.btnText, { color: '#fff' }]}>مشاركة</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* الإحصائيات */}
        <View style={s.row}>
          <View style={s.statCard}><Text style={s.statVal}>{data.stats.totalReferrals}</Text><Text style={s.statLabel}>إحالاتك</Text></View>
          <View style={s.statCard}><Text style={[s.statVal, { color: '#10b981' }]}>{data.stats.totalRewardPaid.toLocaleString()}</Text><Text style={s.statLabel}>أرباحك</Text></View>
        </View>

        {/* القواعد */}
        <View style={s.section}>
          <Text style={s.secTitle}>كيف تربح؟</Text>
          <Text style={s.rule}>• {data.config.threshold1} طلبات = {data.config.reward1.toLocaleString()} د.ع</Text>
          <Text style={s.rule}>• {data.config.threshold2} طلب = {data.config.reward2.toLocaleString()} د.ع</Text>
          <Text style={s.rule}>• {data.config.threshold3} طلب = {data.config.reward3.toLocaleString()} د.ع</Text>
          <Text style={s.note}>* يُحسب الطلب بعد {data.config.daysHold} أيام من التوصيل.</Text>
        </View>

        {/* قائمة التجار */}
        <View style={s.section}>
          <Text style={s.secTitle}>التجار المنضمون عبرك</Text>
          {data.referees.length === 0 ? <Text style={s.empty}>لا يوجد إحالات بعد</Text> : data.referees.map((ref: any, i: number) => (
            <View key={i} style={s.refCard}>
              <View style={s.rowBetween}>
                <Text style={s.refName}>{ref.storeName}</Text>
                <Text style={s.refReward}>{ref.rewardPaid.toLocaleString()} د.ع</Text>
              </View>
              <Text style={s.refOrders}>{ref.deliveredOrdersCount} / {ref.nextThreshold} طلبات</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f2f6f9' },
  container: { flex: 1, backgroundColor: '#f2f6f9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  hero: { padding: 24, borderRadius: 20, alignItems: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginVertical: 10 },
  codeBox: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 10, marginBottom: 16 },
  codeText: { fontSize: 22, fontWeight: 'bold', color: '#fff', letterSpacing: 2 },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: '#fff', padding: 10, borderRadius: 10 },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#fff' },
  btnText: { fontWeight: 'bold', color: PRIMARY },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 16 },
  statVal: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: '#666' },
  section: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 16 },
  secTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  rule: { fontSize: 14, color: '#333', marginBottom: 6 },
  note: { fontSize: 12, color: '#888', marginTop: 8 },
  empty: { textAlign: 'center', color: '#888', marginVertical: 10 },
  refCard: { borderBottomWidth: 1, borderColor: '#eee', paddingVertical: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  refName: { fontSize: 14, fontWeight: 'bold' },
  refReward: { fontSize: 14, color: '#10b981', fontWeight: 'bold' },
  refOrders: { fontSize: 12, color: '#666', marginTop: 4 },
});