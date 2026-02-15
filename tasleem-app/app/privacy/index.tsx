import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const PRIMARY = '#0c6679';

const SECTIONS = [
  {
    icon: 'shield-checkmark-outline',
    title: 'جمع المعلومات',
    content: 'نقوم بجمع المعلومات التي تقدمها عند إنشاء حسابك، بما في ذلك اسم المتجر ورقم الهاتف والعنوان. نستخدم هذه المعلومات لتقديم خدماتنا وتحسين تجربتك على المنصة.',
  },
  {
    icon: 'lock-closed-outline',
    title: 'حماية البيانات',
    content: 'نحن نأخذ أمان بياناتك على محمل الجد. نستخدم تقنيات التشفير المتقدمة لحماية معلوماتك الشخصية والمالية. لا نشارك بياناتك مع أطراف ثالثة دون موافقتك الصريحة.',
  },
  {
    icon: 'card-outline',
    title: 'المعلومات المالية',
    content: 'جميع المعاملات المالية تتم بشكل آمن عبر قنوات مشفرة. نحتفظ بسجلات المعاملات لأغراض المحاسبة والامتثال القانوني فقط.',
  },
  {
    icon: 'notifications-outline',
    title: 'الإشعارات',
    content: 'قد نرسل لك إشعارات تتعلق بطلباتك وحسابك وأرباحك. يمكنك التحكم في إعدادات الإشعارات من داخل التطبيق في أي وقت.',
  },
  {
    icon: 'people-outline',
    title: 'مشاركة البيانات',
    content: 'لا نبيع أو نؤجر معلوماتك الشخصية لأطراف ثالثة. قد نشارك بعض المعلومات مع شركاء التوصيل لإتمام طلباتك فقط.',
  },
  {
    icon: 'refresh-outline',
    title: 'تحديث السياسة',
    content: 'نحتفظ بحق تعديل سياسة الخصوصية هذه في أي وقت. سيتم إخطارك بأي تغييرات جوهرية عبر التطبيق أو البريد الإلكتروني.',
  },
  {
    icon: 'person-outline',
    title: 'حقوقك',
    content: 'لديك الحق في الوصول إلى بياناتك الشخصية وتصحيحها أو حذفها. يمكنك طلب ذلك في أي وقت عبر التواصل مع فريق الدعم.',
  },
];

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-forward" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={s.title}>سياسة الخصوصية والشروط</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <Ionicons name="shield-checkmark-outline" size={44} color={PRIMARY} />
          </View>
          <Text style={s.heroTitle}>سياسة الخصوصية</Text>
          <Text style={s.heroSub}>
            نحن نقدر خصوصيتك ونلتزم بحماية بياناتك الشخصية
          </Text>
          <View style={s.dateBadge}>
            <Text style={s.dateBadgeText}>آخر تحديث: يناير 2026</Text>
          </View>
        </View>

        {/* Sections */}
        {SECTIONS.map((sec, i) => (
          <View key={i} style={s.sectionCard}>
            <View style={s.sectionTop}>
              <View style={s.sectionIcon}>
                <Ionicons name={sec.icon as any} size={22} color={PRIMARY} />
              </View>
              <Text style={s.sectionTitle}>{sec.title}</Text>
            </View>
            <Text style={s.sectionContent}>{sec.content}</Text>
          </View>
        ))}

        {/* Terms */}
        <View style={s.termsCard}>
          <View style={s.termsTop}>
            <Ionicons name="document-text-outline" size={20} color={PRIMARY} />
            <Text style={s.termsTitle}>شروط الاستخدام</Text>
          </View>
          <View style={s.termsList}>
            {[
              'يجب أن يكون عمرك 18 عاماً أو أكثر لاستخدام المنصة',
              'أنت مسؤول عن الحفاظ على سرية بيانات حسابك',
              'يُحظر استخدام المنصة لأي أغراض غير مشروعة',
              'نحتفظ بحق تعليق أو إنهاء الحسابات المخالفة للشروط',
              'الأسعار والعمولات قابلة للتغيير مع إشعار مسبق',
              'يتم حل النزاعات وفقاً للقانون العراقي',
            ].map((term, i) => (
              <View key={i} style={s.termItem}>
                <View style={s.termDot} />
                <Text style={s.termText}>{term}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Ionicons name="information-circle-outline" size={18} color="#9ca3af" />
          <Text style={s.footerText}>
            باستخدامك لمنصة تسليم، فإنك توافق على سياسة الخصوصية وشروط الاستخدام المذكورة أعلاه.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  hero: { alignItems: 'center', paddingVertical: 28 },
  heroIcon: { width: 88, height: 88, borderRadius: 28,
    backgroundColor: `${PRIMARY}12`, justifyContent: 'center',
    alignItems: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  heroSub: { fontSize: 14, color: '#9ca3af',
    textAlign: 'center', lineHeight: 22, marginBottom: 16, paddingHorizontal: 16 },
  dateBadge: { backgroundColor: `${PRIMARY}12`,
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  dateBadgeText: { fontSize: 12, color: PRIMARY, fontWeight: '600' },
  sectionCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18,
    marginBottom: 12, shadowColor: '#000',
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  sectionTop: { flexDirection: 'row-reverse', alignItems: 'center',
    gap: 12, marginBottom: 12 },
  sectionIcon: { width: 44, height: 44, borderRadius: 14,
    backgroundColor: `${PRIMARY}12`,
    justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  sectionContent: { fontSize: 13, color: '#6b7280',
    textAlign: 'right', lineHeight: 22 },
  termsCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20,
    marginBottom: 16, shadowColor: '#000',
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  termsTop: { flexDirection: 'row-reverse', alignItems: 'center',
    gap: 10, marginBottom: 16 },
  termsTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  termsList: { gap: 12 },
  termItem: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 },
  termDot: { width: 8, height: 8, borderRadius: 4,
    backgroundColor: PRIMARY, marginTop: 6 },
  termText: { flex: 1, fontSize: 13, color: '#6b7280',
    textAlign: 'right', lineHeight: 22 },
  footer: { flexDirection: 'row-reverse', alignItems: 'flex-start',
    gap: 8, backgroundColor: '#f3f4f6',
    borderRadius: 16, padding: 16 },
  footerText: { flex: 1, fontSize: 12, color: '#9ca3af',
    textAlign: 'right', lineHeight: 20 },
});
