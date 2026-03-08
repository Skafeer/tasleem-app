import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const PRIMARY = '#0c6679';

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
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>

      <LinearGradient colors={[PRIMARY, '#0a8a9f']} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-forward" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>سياسة الخصوصية والشروط</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={s.heroCard}>
          <View style={s.heroIcon}>
            <Ionicons name="shield-checkmark-outline" size={32} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroTitle}>نحن نحمي خصوصيتك</Text>
            <Text style={s.heroSub}>آخر تحديث: يناير 2026</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {SECTIONS.map((sec, i) => (
          <View key={i} style={s.card}>
            <View style={s.cardTop}>
              <View style={s.cardIcon}>
                <Ionicons name={sec.icon as any} size={20} color={PRIMARY} />
              </View>
              <Text style={s.cardTitle}>{sec.title}</Text>
            </View>
            <Text style={s.cardContent}>{sec.content}</Text>
          </View>
        ))}

        <View style={s.termsCard}>
          <View style={s.termsTop}>
            <View style={s.cardIcon}>
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

        <View style={s.footerNote}>
          <Ionicons name="information-circle-outline" size={18} color={PRIMARY} />
          <Text style={s.footerText}>باستخدامك لمنصة تسليم، فإنك توافق على سياسة الخصوصية وشروط الاستخدام المذكورة أعلاه.</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f8fafc' },
  header:      { paddingHorizontal: 16, paddingBottom: 24 },
  headerRow:   { flexDirection: 'row-reverse', alignItems: 'center',
    justifyContent: 'space-between', paddingTop: 12, marginBottom: 20 },
  backBtn:     { width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
  heroCard:    { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 18, padding: 16,
    flexDirection: 'row-reverse', alignItems: 'center', gap: 14 },
  heroIcon:    { width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  heroTitle:   { fontSize: 16, fontWeight: 'bold', color: '#fff', textAlign: 'right' },
  heroSub:     { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'right' },
  scroll:      { padding: 16, paddingBottom: 40 },
  card:        { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardTop:     { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardIcon:    { width: 40, height: 40, borderRadius: 12, backgroundColor: `${PRIMARY}12`,
    justifyContent: 'center', alignItems: 'center' },
  cardTitle:   { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  cardContent: { fontSize: 13, color: '#6b7280', textAlign: 'right', lineHeight: 22 },
  termsCard:   { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  termsTop:    { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 16 },
  termItem:    { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  termDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: PRIMARY, marginTop: 6 },
  termText:    { flex: 1, fontSize: 13, color: '#6b7280', textAlign: 'right', lineHeight: 22 },
  footerNote:  { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8,
    backgroundColor: `${PRIMARY}08`, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: `${PRIMARY}20` },
  footerText:  { flex: 1, fontSize: 12, color: '#6b7280', textAlign: 'right', lineHeight: 20 },
});
