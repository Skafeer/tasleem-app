import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, Dimensions, RefreshControl, useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import api from '../../src/lib/api';

const PRIMARY = '#0c6679';
const SECONDARY = '#f5a006';

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const CARD_WIDTH = (width - 48) / 2;

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [refreshing, setRefreshing] = useState(false);

  const { data: allProducts = [], refetch } = useQuery({
    queryKey: ['products'],
    queryFn: async () => { const { data } = await api.get("/api/products"); return data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); },
  });

  // إخفاء المنتجات المنتهية
  const products = allProducts.filter((p: any) => p.stock > 0);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => { const { data } = await api.get('/api/auth/me'); return data; },
  });

  const allCats = products.flatMap((p: any) => p.category ? p.category.split(',').map((c: string) => c.trim()) : []);
  const categories = ['الكل', ...Array.from(new Set(allCats))];

  const filtered = products.filter((p: any) => {
    const productCats = p.category ? p.category.split(',').map((c: string) => c.trim()) : [];
    const matchCat = activeCategory === 'الكل' || productCats.includes(activeCategory);
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
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.push('/cart')} style={s.cartBtn}>
          <Ionicons name="cart-outline" size={22} color={PRIMARY} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.greeting} numberOfLines={1}>أهلاً، {user?.storeName || 'تاجر'} 👋</Text>
          <Text style={s.subtitle}>{filtered.length} منتج متاح</Text>
        </View>
        <View style={s.logo}><Text style={s.logoText}>ت</Text></View>
      </View>

      {/* Search */}
      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={18} color="#9ca3af" />
        <TextInput style={s.searchInput} placeholder="ابحث عن منتج..."
          value={search} onChangeText={setSearch}
          placeholderTextColor="#9ca3af" textAlign="right" />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Categories - تعديل شامل لحل مشكلة الانضغاط */}
      <View style={s.categoriesWrapper}>
        <FlatList 
          horizontal 
          data={categories}
          showsHorizontalScrollIndicator={false}
          style={s.catList}
          contentContainerStyle={s.catListContent}
          keyExtractor={i => i}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.catBtn, activeCategory === item && s.catBtnActive]}
              onPress={() => setActiveCategory(item)}>
              <Text style={[s.catText, activeCategory === item && s.catTextActive]}>{item}</Text>
            </TouchableOpacity>
          )} 
        />
      </View>

      {/* Products Grid */}
      <FlatList
        data={filtered}
        numColumns={2}
        keyExtractor={i => String(i.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 24, gap: 12 }}
        columnWrapperStyle={{ gap: 12, flexDirection: 'row-reverse' }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="cube-outline" size={56} color="#d1d5db" />
            <Text style={s.emptyText}>لا توجد منتجات</Text>
          </View>
        }
        renderItem={({ item: p }) => {
          const imgs = getImages(p);
          const hasDiscount = p.discount > 0;
          const discountedPrice = hasDiscount
            ? p.wholesalePrice * (1 - p.discount / 100)
            : p.wholesalePrice;

          return (
            <TouchableOpacity
              style={[s.card, { width: CARD_WIDTH }]}
              onPress={() => router.push(`/products/${p.id}`)}>
              <View style={[s.imgBox, { height: CARD_WIDTH }]}>
                {imgs[0]
                  ? <Image source={{ uri: imgs[0] }} style={s.img} resizeMode="cover" />
                  : <View style={[s.img, s.imgPlaceholder]}>
                      <Ionicons name="image-outline" size={28} color="#d1d5db" />
                    </View>
                }
                {p.isRenewable && (
                  <View style={s.renewBadge}>
                    <Text style={s.renewText}>قابل للتجديد</Text>
                  </View>
                )}
                {hasDiscount && (
                  <View style={s.discountBadge}>
                    <Text style={s.discountText}>خصم {p.discount}%</Text>
                  </View>
                )}
                {imgs.length > 1 && (
                  <View style={s.imgCount}>
                    <Ionicons name="images-outline" size={11} color="#fff" />
                    <Text style={s.imgCountText}>{imgs.length}</Text>
                  </View>
                )}
              </View>

              <View style={s.cardBody}>
                <Text style={s.productName} numberOfLines={2}>{p.name}</Text>
                <View style={s.priceRow}>
                  {hasDiscount && (
                    <Text style={s.oldPrice}>{p.wholesalePrice.toLocaleString()}</Text>
                  )}
                  <Text style={s.price}>{Math.round(discountedPrice).toLocaleString()} د.ع</Text>
                </View>
                <View style={s.bottomRow}>
                  <View style={s.catPill}>
                    <Text style={s.catPillText} numberOfLines={1}>{p.category}</Text>
                  </View>
                  <Text style={[s.stockText, p.stock < 5 && { color: '#ef4444' }]}>
                    {p.stock < 5 ? '⚠️' : ''} {p.stock}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 10 },
  logo: { width: 38, height: 38, borderRadius: 11, backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  logoText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerCenter: { flex: 1, alignItems: 'flex-end' },
  greeting: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 11, color: '#6b7280' },
  cartBtn: { width: 38, height: 38, borderRadius: 11, backgroundColor: PRIMARY + '12',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 12, marginVertical: 8, borderRadius: 12, paddingHorizontal: 12,
    height: 42, borderWidth: 1, borderColor: '#e5e7eb', gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#111827' },
  
  // تعديل شامل لل categories
  categoriesWrapper: {
    marginBottom: 8,
    minHeight: 50, // إعطاء ارتفاع كافي
  },
  catList: {
    flexGrow: 0, // منع التمدد
  },
  catListContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
    paddingVertical: 6, // إضافة padding عمودي
  },
  catBtn: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20,
    backgroundColor: '#f3f4f6', 
    borderWidth: 1, 
    borderColor: '#e5e7eb',
    minWidth: 60, // عرض أدنى للأزرار
    alignItems: 'center',
  },
  catBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  catText: { fontSize: 13, color: '#6b7280', fontWeight: '600' }, // تكبير الخط قليلاً
  catTextActive: { color: '#fff' },
  
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  imgBox: { width: '100%', position: 'relative' },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  renewBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: '#166534',
    borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  renewText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  discountBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: SECONDARY,
    borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  discountText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  imgCount: { position: 'absolute', bottom: 6, left: 6, flexDirection: 'row',
    alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 7, paddingHorizontal: 5, paddingVertical: 2 },
  imgCountText: { color: '#fff', fontSize: 10 },
  cardBody: { padding: 9 },
  productName: { fontSize: 12, fontWeight: 'bold', color: '#111827',
    textAlign: 'right', marginBottom: 5, lineHeight: 18 },
  priceRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginBottom: 5 },
  price: { fontSize: 13, fontWeight: 'bold', color: PRIMARY },
  oldPrice: { fontSize: 10, color: '#9ca3af', textDecorationLine: 'line-through' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stockText: { fontSize: 10, color: '#6b7280' },
  catPill: { backgroundColor: PRIMARY + '12', borderRadius: 5,
    paddingHorizontal: 5, paddingVertical: 2, maxWidth: '65%' },
  catPillText: { fontSize: 9, color: PRIMARY, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, color: '#9ca3af', marginTop: 10 },
});