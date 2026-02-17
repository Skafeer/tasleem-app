import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, Dimensions, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import api from '../../src/lib/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;
const PRIMARY = '#0c6679';
const SECONDARY = '#f5a006';

export default function HomeScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [refreshing, setRefreshing] = useState(false);

  const { data: products = [], refetch } = useQuery({
    queryKey: ['products'],
    queryFn: async () => { const { data } = await api.get('/api/products'); return data; },
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => { const { data } = await api.get('/api/auth/me'); return data; },
  });

  const categories = ['الكل', ...Array.from(new Set(products.map((p: any) => p.category))) as string[]];

  const filtered = products.filter((p: any) => {
    const matchCat = activeCategory === 'الكل' || p.category === activeCategory;
    const matchSearch = !search || p.name.includes(search);
    return matchCat && matchSearch;
  });

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const getImages = (p: any) => {
    const imgs = p.images ? p.images.split(',').filter(Boolean) : [];
    return imgs.length > 0 ? imgs : (p.imageUrl ? [p.imageUrl] : []);
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.push('/cart')} style={s.cartBtn}>
          <Ionicons name="cart-outline" size={24} color={PRIMARY} />
        </TouchableOpacity>
        <View>
          <Text style={s.greeting}>أهلاً، {user?.storeName || 'تاجر'} 👋</Text>
          <Text style={s.subtitle}>{filtered.length} منتج متاح</Text>
        </View>
        <View style={s.logo}><Text style={s.logoText}>ت</Text></View>
      </View>

      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={18} color="#9ca3af" />
        <TextInput style={s.searchInput} placeholder="ابحث عن منتج..."
          value={search} onChangeText={setSearch}
          placeholderTextColor="#9ca3af" textAlign="right" />
        {search ? <TouchableOpacity onPress={() => setSearch('')}>
          <Ionicons name="close-circle" size={18} color="#9ca3af" /></TouchableOpacity> : null}
      </View>

      <FlatList horizontal data={categories} showsHorizontalScrollIndicator={false}
        style={s.catList} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        keyExtractor={i => i}
        renderItem={({ item }) => (
          <TouchableOpacity style={[s.catBtn, activeCategory === item && s.catBtnActive]}
            onPress={() => setActiveCategory(item)}>
            <Text style={[s.catText, activeCategory === item && s.catTextActive]}>{item}</Text>
          </TouchableOpacity>
        )} />

      <FlatList data={filtered} numColumns={2}
        keyExtractor={i => String(i.id)}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        columnWrapperStyle={{ gap: 12, flexDirection: 'row-reverse' }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="cube-outline" size={60} color="#d1d5db" />
            <Text style={s.emptyText}>لا توجد منتجات</Text>
          </View>
        }
        renderItem={({ item: p }) => {
          const imgs = getImages(p);
          const hasDiscount = p.discount > 0;
          const discountedPrice = hasDiscount ? p.wholesalePrice * (1 - p.discount / 100) : p.wholesalePrice;
          return (
            <TouchableOpacity style={s.card} onPress={() => router.push(`/products/${p.id}`)}>
              <View style={s.imgBox}>
                {imgs[0]
                  ? <Image source={{ uri: imgs[0] }} style={s.img} resizeMode="cover" />
                  : <View style={[s.img, s.imgPlaceholder]}>
                      <Ionicons name="image-outline" size={32} color="#d1d5db" />
                    </View>
                }
                {p.isRenewable && (
                  <View style={s.renewBadge}><Text style={s.renewText}>قابل للتجديد</Text></View>
                )}
                {hasDiscount && (
                  <View style={s.discountBadge}><Text style={s.discountText}>خصم {p.discount}%</Text></View>
                )}
                {imgs.length > 1 && (
                  <View style={s.imgCount}>
                    <Ionicons name="images-outline" size={12} color="#fff" />
                    <Text style={s.imgCountText}>{imgs.length}</Text>
                  </View>
                )}
              </View>
              <View style={s.cardBody}>
                <Text style={s.productName} numberOfLines={2}>{p.name}</Text>
                <View style={s.priceRow}>
                  {hasDiscount && <Text style={s.oldPrice}>{p.wholesalePrice.toLocaleString()}</Text>}
                  <Text style={s.price}>{Math.round(discountedPrice).toLocaleString()} د.ع</Text>
                </View>
                <View style={s.stockRow}>
                  <Text style={[s.stockText, p.stock < 5 && { color: '#ef4444' }]}>
                    {p.stock < 5 ? '⚠️ ' : ''}{p.stock} قطعة
                  </Text>
                  <View style={s.catPill}><Text style={s.catPillText}>{p.category}</Text></View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  logo: { width: 40, height: 40, borderRadius: 12, backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center' },
  logoText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  greeting: { fontSize: 16, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  subtitle: { fontSize: 12, color: '#6b7280', textAlign: 'right' },
  cartBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: PRIMARY + '12',
    justifyContent: 'center', alignItems: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    margin: 12, borderRadius: 14, paddingHorizontal: 14, height: 44,
    borderWidth: 1, borderColor: '#e5e7eb', gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#111827' },
  catList: { maxHeight: 48, marginBottom: 4 },
  catBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  catBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  catText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  catTextActive: { color: '#fff' },
  card: { width: CARD_WIDTH, backgroundColor: '#fff', borderRadius: 18,
    overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  imgBox: { width: '100%', height: CARD_WIDTH, position: 'relative' },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  renewBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#166534',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  renewText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  discountBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: SECONDARY,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  discountText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  imgCount: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row',
    alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  imgCountText: { color: '#fff', fontSize: 10 },
  cardBody: { padding: 10 },
  productName: { fontSize: 13, fontWeight: 'bold', color: '#111827', textAlign: 'right', marginBottom: 6 },
  priceRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 6 },
  price: { fontSize: 14, fontWeight: 'bold', color: PRIMARY },
  oldPrice: { fontSize: 11, color: '#9ca3af', textDecorationLine: 'line-through' },
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stockText: { fontSize: 11, color: '#6b7280' },
  catPill: { backgroundColor: PRIMARY + '12', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  catPillText: { fontSize: 10, color: PRIMARY, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: '#9ca3af', marginTop: 12 },
});
