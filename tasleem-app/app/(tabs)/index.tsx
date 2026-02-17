import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, FlatList, Image, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => { const { data } = await api.get('/api/auth/me'); return data; },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => { const { data } = await api.get('/api/orders'); return data; },
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => { const { data } = await api.get('/api/products'); return data; },
  });

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const raw = await AsyncStorage.getItem('cart');
      return raw ? JSON.parse(raw) : [];
    },
  });

  const categories = Array.from(new Set((products as any[]).map((p: any) => p.category)));

  const filtered = (products as any[]).filter((p: any) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCat || p.category === selectedCat;
    return matchSearch && matchCat;
  });

  const pendingOrders = (orders as any[]).filter((o: any) => o.status === 'pending').length;
  const totalCartItems = (cartItems as any[]).reduce((s: number, i: any) => s + i.quantity, 0);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.push('/cart')} style={s.cartBtn}>
            <Ionicons name="cart-outline" size={24} color="#374151" />
            {totalCartItems > 0 && (
              <View style={s.cartBadge}>
                <Text style={s.cartBadgeText}>{totalCartItems}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={s.logoRow}>
            <Text style={s.logoText}>تسليم</Text>
            <View style={s.logoIcon}>
              <Ionicons name="cube-outline" size={20} color="#fff" />
            </View>
          </View>
        </View>

        <View style={s.content}>
          {/* Welcome */}
          <View style={s.welcomeRow}>
            <Text style={s.welcomeName}>
              مرحباً، {user?.storeName} 👋
            </Text>
            <Text style={s.welcomeSub}>إليك نظرة عامة على نشاطك</Text>
          </View>

          {/* Search */}
          <View style={s.searchBox}>
            <Ionicons name="search-outline" size={20} color="#9ca3af" />
            <TextInput
              style={s.searchInput}
              placeholder="ابحث عن منتج، كود، أو وصف..."
              value={search}
              onChangeText={setSearch}
              textAlign="right"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Categories */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.catsRow}>
            <TouchableOpacity
              style={[s.catChip, !selectedCat && s.catChipActive]}
              onPress={() => setSelectedCat(null)}>
              <Text style={[s.catChipText, !selectedCat && s.catChipTextActive]}>الكل</Text>
            </TouchableOpacity>
            {(categories as string[]).map((cat) => (
              <TouchableOpacity key={cat}
                style={[s.catChip, selectedCat === cat && s.catChipActive]}
                onPress={() => setSelectedCat(cat)}>
                <Text style={[s.catChipText, selectedCat === cat && s.catChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Stats */}
          <View style={s.statsGrid}>
            <View style={s.statCard}>
              <Ionicons name="wallet-outline" size={22} color={PRIMARY} />
              <Text style={s.statVal}>{(user?.balance || 0).toLocaleString()}</Text>
              <Text style={s.statLabel}>الرصيد المتاح</Text>
              <Text style={s.statUnit}>د.ع</Text>
            </View>
            <View style={s.statCard}>
              <Ionicons name="time-outline" size={22} color="#f5a006" />
              <Text style={s.statVal}>{(user?.pendingBalance || 0).toLocaleString()}</Text>
              <Text style={s.statLabel}>رصيد معلق</Text>
              <Text style={s.statUnit}>د.ع</Text>
            </View>
            <View style={s.statCard}>
              <Ionicons name="trending-up-outline" size={22} color="#8b5cf6" />
              <Text style={s.statVal}>{pendingOrders}</Text>
              <Text style={s.statLabel}>الطلبات</Text>
            </View>
          </View>

          {/* Products Title */}
          <View style={s.secHead}>
            <Text style={s.secCount}>
              {search ? `نتائج البحث: ${filtered.length}` : ''}
            </Text>
            <View style={s.secTitleRow}>
              <Ionicons name="cube-outline" size={20} color={PRIMARY} />
              <Text style={s.secTitle}>
                {selectedCat ? `منتجات ${selectedCat}` : 'أحدث المنتجات'}
              </Text>
            </View>
          </View>

          {/* Products Grid */}
          {isLoading ? (
            <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} />
          ) : filtered.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="search-outline" size={48} color="#e5e7eb" />
              <Text style={s.emptyText}>لم نجد أي منتجات تطابق بحثك</Text>
              <TouchableOpacity onPress={() => { setSearch(''); setSelectedCat(null); }}>
                <Text style={s.resetText}>إعادة ضبط البحث</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.grid}>
              {filtered.map((product: any) => (
                <TouchableOpacity key={product.id} style={s.productCard}
                  onPress={() => router.push(`/products/${product.id}`)}>
                  <View style={s.productImgBox}>
                    <Image source={{ uri: product.imageUrl }}
                      style={s.productImg} resizeMode="cover" />
                    <View style={s.productCatBadge}>
                      <Text style={s.productCatText}>{product.category}</Text>
                    </View>
                  </View>
                  <View style={s.productInfo}>
                    <Text style={s.productName} numberOfLines={2}>{product.name}</Text>
                    <Text style={s.productDesc} numberOfLines={1}>{product.description}</Text>
                    <Text style={s.productPrice}>
                      سعر الجملة: {product.wholesalePrice?.toLocaleString()} د.ع
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  logoRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  logoIcon: { width: 34, height: 34, borderRadius: 10,
    backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center' },
  logoText: { fontSize: 20, fontWeight: 'bold', color: PRIMARY },
  cartBtn: { width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center', position: 'relative' },
  cartBadge: { position: 'absolute', top: 0, right: 0,
    backgroundColor: '#ef4444', width: 18, height: 18,
    borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  content: { padding: 16 },
  welcomeRow: { marginBottom: 20 },
  welcomeName: { fontSize: 24, fontWeight: 'bold', color: '#111827',
    textAlign: 'right' },
  welcomeSub: { fontSize: 13, color: '#9ca3af', textAlign: 'right', marginTop: 4 },
  searchBox: { flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16,
    height: 50, marginBottom: 16, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#f3f4f6' },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  catsRow: { gap: 8, paddingVertical: 4, marginBottom: 20 },
  catChip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  catChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY,
    shadowColor: PRIMARY, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3 },
  catChipText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  catChipTextActive: { color: '#fff', fontWeight: 'bold' },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 18,
    padding: 14, alignItems: 'flex-end', gap: 4,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    borderWidth: 1, borderColor: '#f3f4f6' },
  statVal: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  statLabel: { fontSize: 11, color: '#9ca3af' },
  statUnit: { fontSize: 10, color: '#9ca3af' },
  secHead: { flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16 },
  secTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  secTitle: { fontSize: 17, fontWeight: 'bold', color: '#111827' },
  secCount: { fontSize: 12, color: '#9ca3af' },
  emptyBox: { alignItems: 'center', paddingVertical: 48,
    backgroundColor: '#fff', borderRadius: 24,
    borderWidth: 1.5, borderColor: '#e5e7eb', borderStyle: 'dashed', gap: 12 },
  emptyText: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },
  resetText: { fontSize: 14, color: PRIMARY, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  productCard: { width: '47.5%', backgroundColor: '#fff', borderRadius: 18,
    overflow: 'hidden', shadowColor: '#000',
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  productImgBox: { position: 'relative' },
  productImg: { width: '100%', aspectRatio: 1 },
  productCatBadge: { position: 'absolute', top: 8, right: 8,
    backgroundColor: PRIMARY, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3 },
  productCatText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  productInfo: { padding: 10 },
  productName: { fontSize: 13, fontWeight: 'bold', color: '#111827',
    textAlign: 'right', marginBottom: 4 },
  productDesc: { fontSize: 11, color: '#9ca3af', textAlign: 'right', marginBottom: 6 },
  productPrice: { fontSize: 12, fontWeight: 'bold', color: PRIMARY, textAlign: 'right' },
});
