import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const PRIMARY = '#0c6679';
const BG = '#f2f6f9';

const CONTACTS = [
  { label: 'واتساب', desc: 'تواصل معنا عبر واتساب', icon: 'logo-whatsapp', color: '#25d366', bg: '#f0fdf4', url: 'https://wa.me/9647800000000' },
  { label: 'تيليغرام', desc: 'راسلنا على تيليغرام', icon: 'paper-plane-outline', color: '#0088cc', bg: '#eff6ff', url: 'https://t.me/tasleem' },
  { label: 'البريد الإلكتروني', desc: 'support@tasleem.iq', icon: 'mail-outline', color: '#8b5cf6', bg: '#f5f3ff', url: 'mailto:support@tasleem.iq' },
  { label: 'الهاتف', desc: '07800000000', icon: 'call-outline', color: '#f97316', bg: '#fff7ed', url: 'tel:07800000000' },
];

const FAQS = [
  { q: 'كيف أبدأ البيع على تسليم؟', a: 'قم بإنشاء حساب، ثم تصفح المنتجات واختر ما يناسبك، وأضفه مع تحديد سعر البيع، ثم أدخل بيانات الزبون وأرسل الطلب.' },
  { q: 'متى يتم تحويل الأرباح؟', a: 'يتم تحويل الأرباح بعد التأكد من توصيل الطلب. يمكنك طلب السحب في أي وقت من صفحة المحفظة.' },
  { q: 'ما هي طرق الدفع المتاحة للسحب؟', a: 'نوفر السحب عبر الماستر كارد.' },
  { q: 'كيف أتتبع حالة طلباتي؟', a: 'يمكنك متابعة جميع طلباتك من صفحة "طلباتي" حيث تظهر حالة كل طلب بشكل واضح.' },
];

export default function ContactScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ── Header RTL (زر رجوع يمين، عنوان وسط) ── */}
      <View style={s.header}>
        <View style={s.headerContent}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>تواصل معنا</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* ── بطاقة الترحيب ── */}
      <View style={s.heroCard}>
        <View style={s.heroIcon}>
          <Ionicons name="chatbubbles-outline" size={28} color={PRIMARY} />
        </View>
        <View style={s.heroText}>
          <Text style={s.heroTitle}>كيف يمكننا مساعدتك؟</Text>
          <Text style={s.heroSub}>فريق الدعم متاح للمساعدة في أي وقت</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* وسائل التواصل */}
        <Text style={s.sectionTitle}>وسائل التواصل</Text>
        <View style={s.contactsGrid}>
          {CONTACTS.map((c) => (
            <TouchableOpacity key={c.label} style={s.contactCard} onPress={() => Linking.openURL(c.url)} activeOpacity={0.8}>
              <View style={[s.contactIcon, { backgroundColor: c.bg }]}>
                <Ionicons name={c.icon as any} size={24} color={c.color} />
              </View>
              <Text style={s.contactLabel}>{c.label}</Text>
              <Text style={s.contactDesc}>{c.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ساعات العمل */}
        <View style={s.hoursCard}>
          <View style={s.hoursHeader}>
            <View style={s.hoursIcon}>
              <Ionicons name="time-outline" size={18} color={PRIMARY} />
            </View>
            <Text style={s.hoursTitle}>ساعات العمل</Text>
          </View>
          {[
            { day: 'السبت - الخميس', time: '9 صباحاً - 10 مساءً' },
            { day: 'الجمعة', time: '10 صباحاً - 6 مساءً' },
          ].map((r, i) => (
            <View key={i} style={[s.hoursRow, i === 1 && { borderBottomWidth: 0 }]}>
              <Text style={s.hoursDay}>{r.day}</Text>
              <Text style={s.hoursTime}>{r.time}</Text>
            </View>
          ))}
        </View>

        {/* الأسئلة الشائعة */}
        <Text style={s.sectionTitle}>الأسئلة الشائعة</Text>
        <View style={s.faqList}>
          {FAQS.map((faq, i) => (
            <View key={i} style={s.faqCard}>
              <View style={s.faqHeader}>
                <View style={s.faqNumber}>
                  <Text style={s.faqNumberText}>{i + 1}</Text>
                </View>
                <Text style={s.faqQuestion}>{faq.q}</Text>
              </View>
              <Text style={s.faqAnswer}>{faq.a}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // ── Header RTL (زر رجوع يمين، عنوان وسط) ──
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0f9fa',
    borderWidth: 1.5,
    borderColor: '#d4eef3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },

  // ── بطاقة الترحيب ──
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: PRIMARY + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroText: {
    flex: 1,
    alignItems: 'flex-start',
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  heroSub: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },

  scroll: { padding: 16, paddingBottom: 40 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'right',
    marginBottom: 14,
    marginTop: 4,
  },

  // ── جهات الاتصال ──
  contactsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  contactCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  contactIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  contactDesc: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
  },

  // ── ساعات العمل ──
  hoursCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  hoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  hoursIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: PRIMARY + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hoursTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  hoursDay: {
    fontSize: 13,
    color: '#6b7280',
  },
  hoursTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },

  // ── الأسئلة الشائعة ──
  faqList: {
    gap: 12,
  },
  faqCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  faqNumber: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: PRIMARY + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faqNumberText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: PRIMARY,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'right',
    lineHeight: 22,
  },
  faqAnswer: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'right',
    lineHeight: 22,
    paddingRight: 40,
  },
});