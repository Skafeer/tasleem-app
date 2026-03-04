import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, RefreshControl, useWindowDimensions,
  ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import api from '../../src/lib/api';

const PRIMARY   = '#0c6679';
const SECONDARY = '#f5a006';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 160;

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const CARD_WIDTH = (width - 48) / 2;

  const [search, setSearch]               = useState('');
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [refreshing, setRefreshing]        = useState(false);
  const [activeBanner, setActiveBanner]    = useState(0);
  const bannerRef = useRef<ScrollView>(null);

  const { data: allProducts = [], refetch } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/api/products?activeOnly=true');
      return data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => { const { data } = await api.get('/api/auth/me'); return data; },
  });

  const { data: banners = [] } = useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const { data } = await api.get('/api/banners');
      return (data as any[]).filter((b: any) => b.isActive);
    },
  });

  const products      = (allProducts as any[]).filter((p: any) => p.stock > 0);
  const allCats       = products.flatMap((p: any) => p.category ? p.category.split(',').map((c: string) => c.trim()) : []);
  const categories    = ['الكل', ...Array.from(new Set(allCats))];
  const filtered      = products.filter((p: any) => {
    const productCats = p.category ? p.category.split(',').map((c: string) => c.trim()) : [];
    return (activeCategory === 'الكل' || productCats.includes(activeCategory)) &&
           (!search || p.name.includes(search));
  });

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const getImages = (p: any) => {
    const imgs = p.images ? p.images.split(',').filter(Boolean) : [];
    return imgs.length > 0 ? imgs : (p.imageUrl ? [p.imageUrl] : []);
  };

  const handleBannerScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveBanner(idx);
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>

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

      <FlatList
        data={filtered}
        numColumns={2}
        keyExtractor={i => String((i as any).id)}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24, gap: 12 }}
        columnWrapperStyle={{ gap: 12, flexDirection: 'row-reverse' }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}

        ListHeaderComponent={
          <>
            {/* Banners Slider */}
            {(banners as any[]).length > 0 && (
              <View style={s.bannerWrap}>
                <ScrollView
                  ref={bannerRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={handleBannerScroll}
                  style={s.bannerScroll}
                >
                  {(banners as any[]).map((b: any, i: number) => (
                    <Image
                      key={i}
                      source={{ uri: b.imageUrl }}
                      style={s.bannerImg}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
                {/* Dots */}
                {(banners as any[]).length > 1 && (
                  <View style={s.dotsRow}>
                    {(banners as any[]).map((_: any, i: number) => (
                      <View key={i} style={[s.dot, activeBanner === i && s.dotActive]} />
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Categories */}
            <View style={s.categoriesWrapper}>
              <FlatList
                horizontal
                data={categories as string[]}
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
          </>
        }

        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="cube-outline" size={56} color="#d1d5db" />
            <Text style={s.emptyText}>لا توجد منتجات</Text>
          </View>
        }

        renderItem={({ item: p }: any) => {
          const imgs        = getImages(p);
          const hasDiscount = p.discount > 0;
          const discountedPrice = hasDiscount ? p.wholesalePrice * (1 - p.discount / 100) : p.wholesalePrice;

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
                  <View style={s.renewBadge}><Text style={s.renewText}>قابل للتجديد</Text></View>
                )}
                {hasDiscount && (
                  <View style={s.discountBadge}><Text style={s.discountText}>خصم {p.discount}%</Text></View>
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
                  {hasDiscount && <Text style={s.oldPrice}>{p.wholesalePrice.toLocaleString()}</Text>}
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

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 10 },
  headerCenter: { flex: 1, alignItems: 'center' },
  greeting: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  logo: { width: 38, height: 38, borderRadius: 12, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center' },
  logoText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  cartBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: PRIMARY + '12', justifyContent: 'center', alignItems: 'center' },

  searchBox: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 10, borderRadius: 14, paddingHorizontal: 14, height: 46, borderWidth: 1.5, borderColor: '#e5e7eb', gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },

  // Banner
  bannerWrap:   { marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  bannerScroll: { width: SCREEN_WIDTH - 24 },
  bannerImg:    { width: SCREEN_WIDTH - 24, height: BANNER_HEIGHT },
  dotsRow:      { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 },
  dot:          { width: 6, height: 6, borderRadius: 3, backgroundColor: '#d1d5db' },
  dotActive:    { backgroundColor: PRIMARY, width: 18 },

  // Categories
  categoriesWrapper: { marginBottom: 12 },
  catList: { maxHeight: 44 },
  catListContent: { gap: 8, paddingHorizontal: 4, alignItems: 'center' },
  catBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb' },
  catBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  catText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  catTextActive: { color: '#fff' },

  // Product Card
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  imgBox: { position: 'relative', overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  renewBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: PRIMARY, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  renewText: { fontSize: 9, color: '#fff', fontWeight: 'bold' },
  discountBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#ef4444', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  discountText: { fontSize: 9, color: '#fff', fontWeight: 'bold' },
  imgCount: { position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 3 },
  imgCountText: { fontSize: 10, color: '#fff', fontWeight: 'bold' },
  cardBody: { padding: 10, gap: 6 },
  productName: { fontSize: 13, fontWeight: '700', color: '#111827', textAlign: 'right' },
  priceRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  price: { fontSize: 14, fontWeight: 'bold', color: PRIMARY },
  oldPrice: { fontSize: 11, color: '#9ca3af', textDecorationLine: 'line-through' },
  bottomRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  catPill: { backgroundColor: PRIMARY + '12', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, maxWidth: '70%' },
  catPillText: { fontSize: 10, color: PRIMARY, fontWeight: '600' },
  stockText: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, color: '#9ca3af', fontWeight: '600' },
});
