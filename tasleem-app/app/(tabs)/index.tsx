import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, ActivityIndicator,
  ScrollView, Image, I18nManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUser } from '../../src/hooks/useAuth';
import { useProducts } from '../../src/hooks/useProducts';
import { useOrders } from '../../src/hooks/useOrders';

I18nManager.forceRTL(true);
const TEAL = '#0c6679';

export default function HomeScreen() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useUser();
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: orders } = useOrders();

  if (userLoading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={TEAL} />
    </View>
  );

  if (!user) { router.replace('/auth'); return null; }

  const categories = [...new Set(products?.map(p => p.category) || [])];
  const filtered = products?.filter(p =>
    (!category || p.category === category) &&
    (!search || p.name.includes(search) || p.description?.includes(search))
  ) || [];
  const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/cart')} style={styles.cartBtn}>
          <Ionicons name="cart-outline" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <Text style={styles.headerTitle}>تسليم</Text>
          <View style={styles.headerIcon}>
            <Ionicons name="cube-outline" size={20} color="#fff" />
          </View>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Welcome */}
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeSub}>إليك نظرة عامة على نشاطك</Text>
              <Text style={styles.welcomeTitle}>مرحباً، {user.storeName} 👋</Text>
            </View>

            {/* Search */}
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color="#aaa" />
              <TextInput
                style={styles.searchInput}
                placeholder="ابحث عن منتج، كود، أو وصف..."
                value={search}
                onChangeText={setSearch}
                textAlign="right"
                placeholderTextColor="#bbb"
              />
            </View>

            {/* Categories */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {['الكل', ...categories].map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catBtn,
                    (cat === 'الكل' ? !category : category === cat) && styles.catActive]}
                  onPress={() => setCategory(cat === 'الكل' ? null : cat)}
                >
                  <Text style={[styles.catText,
                    (cat === 'الكل' ? !category : category === cat) && styles.catTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={styles.statTop}>
                  <Text style={styles.statValue}>{user.balance.toLocaleString()}</Text>
                  <Ionicons name="wallet-outline" size={18} color={TEAL} />
                </View>
                <Text style={styles.statLabel}>الرصيد المتاح</Text>
                <Text style={styles.statUnit}>د.ع</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statTop}>
                  <Text style={styles.statValue}>{user.pendingBalance.toLocaleString()}</Text>
                  <Ionicons name="time-outline" size={18} color="#f59e0b" />
                </View>
                <Text style={styles.statLabel}>رصيد معلق</Text>
                <Text style={styles.statUnit}>د.ع</Text>
              </View>
              <View style={[styles.statCard, { flex: 2 }]}>
                <View style={styles.statTop}>
                  <Text style={styles.statValue}>{pendingOrders}</Text>
                  <Ionicons name="trending-up-outline" size={18} color="#6366f1" />
                </View>
                <Text style={styles.statLabel}>الطلبات النشطة</Text>
              </View>
            </View>

            {/* Section Title */}
            <View style={styles.sectionHeader}>
              <Ionicons name="cube-outline" size={18} color={TEAL} />
              <Text style={styles.sectionTitle}>أحدث المنتجات</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.productCard}
            onPress={() => router.push(`/products/${item.id}`)}
          >
            <View style={styles.productImgBox}>
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.productImage}
                resizeMode="cover"
              />
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{item.category}</Text>
              </View>
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.productDesc} numberOfLines={1}>{item.description}</Text>
              <Text style={styles.productPrice}>
                سعر الجملة: {item.sellingPriceMin.toLocaleString()} د.ع
              </Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}
        ListEmptyComponent={
          productsLoading
            ? <ActivityIndicator size="large" color={TEAL} style={{ marginTop: 40 }} />
            : <Text style={styles.empty}>لا توجد منتجات</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
  headerIcon: { width: 36, height: 36, borderRadius: 10,
    backgroundColor: TEAL, justifyContent: 'center', alignItems: 'center' },
  cartBtn: { position: 'relative', padding: 4 },
  welcomeSection: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16 },
  welcomeTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', textAlign: 'right' },
  welcomeSub: { fontSize: 13, color: '#888', textAlign: 'right', marginTop: 2 },
  searchBox: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16,
    borderRadius: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14,
  },
  searchInput: { flex: 1, paddingVertical: 11,
    fontSize: 13, color: '#333', marginRight: 8 },
  catBtn: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#fff',
  },
  catActive: { backgroundColor: TEAL, borderColor: TEAL },
  catText: { fontSize: 13, color: '#555', fontWeight: '500' },
  catTextActive: { color: '#fff', fontWeight: '600' },
  statsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 8, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statTop: { flexDirection: 'row-reverse',
    justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  statLabel: { fontSize: 12, color: '#888', textAlign: 'right' },
  statUnit: { fontSize: 11, color: '#aaa', textAlign: 'right' },
  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center',
    gap: 6, paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  productCard: {
    flex: 1, margin: 4, backgroundColor: '#fff',
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  productImgBox: { position: 'relative' },
  productImage: { width: '100%', height: 130 },
  categoryBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: TEAL, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  categoryBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  productInfo: { padding: 10 },
  productName: { fontSize: 13, fontWeight: '600',
    textAlign: 'right', color: '#1a1a1a', marginBottom: 3 },
  productDesc: { fontSize: 11, color: '#999',
    textAlign: 'right', marginBottom: 6 },
  productPrice: { fontSize: 12, color: TEAL,
    textAlign: 'right', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
});
