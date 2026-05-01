import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const PRIMARY = '#0c6679';
const BG = '#f2f6f9';

const SECTIONS = [
  { icon: 'shield-checkmark-outline', title: 'جمع المعلومات', content: 'نقوم بجمع المعلومات التي تقدمها عند إنشاء حسابك، بما في ذلك اسم المتجر ورقم الهاتف والعنوان. نستخدم هذه المعلومات لتقديم خدماتنا وتحسين تجربتك على المنصة.' },
  { icon: 'lock-closed-outline', title: 'حماية البيانات', content: 'نحن نأخذ أمان بياناتك على محمل الجد. نستخدم تقنيات التشفير المتقدمة لحماية معلوماتك الشخصية والمالية. لا نشارك بياناتك مع أطراف ثالثة دون موافقتك الصريحة.' },
  { icon: 'card-outline', title: 'المعلومات المالية', content: 'جميع المعاملات المالية تتم بشكل آمن عبر قنوات مشفرة. نحتفظ بسجلات المعاملات لأغراض المحاسبة والامتثال القانوني فقط.' },
  { icon: 'notifications-outline', title: 'الإشعارات', content: 'قد نرسل لك إشعارات تتعلق بطلباتك وحسابك وأرباحك. يمكنك التحكم في إعدادات الإشعارات من داخل التطبيق في أي وقت.' },
  { icon: 'people-outline', title: 'مشاركة البيانات', content: 'لا نبيع أو نؤجر معلوماتك الشخصية لأطراف ثالثة. قد نشارك بعض المعلومات مع شركاء التوصيل لإتمام طلباتك فقط.' },
  { icon: 'refresh-outline', title: 'تحديث السياسة', content: 'نحتفظ بحق تعديل سياسة الخصوصية هذه في أي وقت. سيتم إخطارك بأي تغييرات جوهرية عبر التطبيق.' },
  { icon: 'person-outline', title: 'حقوقك', content: 'لديك الحق في الوصول إلى بياناتك الشخصية وتصحيحها أو حذفها. يمكنك طلب ذلك في أي وقت عبر التواصل مع فريق الدعم.' },
];

const TERMS = [
  'يجب أن يكون عمرك 18 عاماً أو أكثر لاستخدام المنصة',
  'أنت مسؤول عن الحفاظ على سرية بيانات حسابك',
  'يُحظر استخدام المنصة لأي أغراض غير مشروعة',
  'نحتفظ بحق تعليق أو إنهاء الحسابات المخالفة للشروط',
  'الأسعار والعمولات قابلة للتغيير مع إشعار مسبق',
  'يتم حل النزاعات وفقاً للقانون العراقي',
];

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* ── Header RTL (زر رجوع يمين، عنوان وسط) ── */}
      <View style={s.header}>
        <View style={s.headerContent}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>سياسة الخصوصية</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* ── بطاقة الترحيب ── */}
      <View style={s.heroCard}>
        <View style={s.heroIcon}>
          <Ionicons name="shield-checkmark-outline" size={28} color={PRIMARY} />
        </View>
        <View style={s.heroText}>
          <Text style={s.heroTitle}>نحن نحمي خصوصيتك</Text>
          <Text style={s.heroSub}>آخر تحديث: يناير 2026</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* الأقسام */}
        {SECTIONS.map((sec, i) => (
          <View key={i} style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.cardIcon}>
                <Ionicons name={sec.icon as any} size={20} color={PRIMARY} />
              </View>
              <Text style={s.cardTitle}>{sec.title}</Text>
            </View>
            <Text style={s.cardContent}>{sec.content}</Text>
          </View>
        ))}

        {/* شروط الاستخدام */}
        <View style={s.termsCard}>
          <View style={s.termsHeader}>
            <View style={[s.cardIcon, { backgroundColor: '#f5f3ff' }]}>
              <Ionicons name="document-text-outline" size={20} color="#8b5cf6" />
            </View>
            <Text style={s.cardTitle}>شروط الاستخدام</Text>
          </View>
          {TERMS.map((term, i) => (
            <View key={i} style={s.termItem}>
              <View style={s.termDot} />
              <Text style={s.termText}>{term}</Text>
            </View>
          ))}
        </View>

        {/* ملاحظة ختامية */}
        <View style={s.footerNote}>
          <Ionicons name="information-circle-outline" size={18} color={PRIMARY} />
          <Text style={s.footerText}>باستخدامك لمنصة تسليم، فإنك توافق على سياسة الخصوصية وشروط الاستخدام المذكورة أعلاه.</Text>
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

  // ── البطاقات ──
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: PRIMARY + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  cardContent: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'right',
    lineHeight: 22,
  },

  // ── شروط الاستخدام ──
  termsCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  termsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  termItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  termDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PRIMARY,
    marginTop: 7,
  },
  termText: {
    flex: 1,
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'right',
    lineHeight: 22,
  },

  // ── ملاحظة ختامية ──
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: PRIMARY + '08',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: PRIMARY + '20',
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    lineHeight: 20,
  },
});