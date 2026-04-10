import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, RefreshControl, useWindowDimensions, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import api from '../../src/lib/api';
import BannerSlider from '../admin-components/BannerSlider';

const PRIMARY  = '#0c6679';
const BG       = '#f2f6f9';

// ── Skeleton Card ──
function SkeletonCard({ width }: { width: number }) {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[sk.card, { width, opacity: anim }]}>
      <View style={[sk.img, { height: width }]} />
      <View style={sk.body}>
        <View style={sk.line} />
        <View style={[sk.line, { width: '60%' }]} />
        <View style={[sk.line, { width: '40%', marginTop: 4 }]} />
      </View>
    </Animated.View>
  );
}

const sk = StyleSheet.create({
  card:  { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  img:   { backgroundColor: '#e8edf2', width: '100%' },
  body:  { padding: 12, gap: 8 },
  line:  { height: 11, backgroundColor: '#e8edf2', borderRadius: 6, width: '80%' },
});

export default function HomeScreen() {
  const router = useRouter();
  const qc     = useQueryClient();
  const { width } = useWindowDimensions();
  const CARD_WIDTH = (width - 48) / 2;

  const [search, setSearch]                 = useState('');
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [refreshing, setRefreshing]         = useState(false);

  const { data: favoriteIds = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => { const { data } = await api.get('/api/favorites'); return data as number[]; },
  });

  const toggleFav = useMutation({
    mutationFn: async ({ id, isFav }: { id: number; isFav: boolean }) => {
      if (isFav) await api.delete(`/api/favorites/${id}`);
      else        await api.post(`/api/favorites/${id}`);
    },
    onMutate: async ({ id, isFav }) => {
      await qc.cancelQueries({ queryKey: ['favorites'] });
      const prev = qc.getQueryData<number[]>(['favorites']) || [];
      qc.setQueryData(['favorites'], isFav ? prev.filter((x: number) => x !== id) : [...prev, id]);
      return { prev };
    },
    onError: (_: any, __: any, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(['favorites'], ctx.prev);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const { data: allProducts = [], refetch, isLoading } = useQuery({
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

  const { data: rawBanners = [] } = useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const { data } = await api.get('/api/banners');
      return (data as any[]).filter((b: any) => b.isActive).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    },
  });

  const banners    = rawBanners as any[];
  const products   = (allProducts as any[]).filter((p: any) => p.stock > 0);
  
  // ✅ استخدام useMemo لتحسين الأداء
  const categories = useMemo(() => {
    const allCats = products.flatMap((p: any) => 
      p.category ? p.category.split(',').map((c: string) => c.trim()) : []
    );
    return ['الكل', ...Array.from(new Set(allCats))];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p: any) => {
      const cats = p.category ? p.category.split(',').map((c: string) => c.trim()) : [];
      return (activeCategory === 'الكل' || cats.includes(activeCategory)) && 
             (!search || p.name.includes(search));
    });
  }, [products, activeCategory, search]);

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };
  
  const getImages = (p: any) => {
    const imgs = p.images ? p.images.split(',').filter(Boolean) : [];
    return imgs.length > 0 ? imgs : (p.imageUrl ? [p.imageUrl] : []);
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>

      {/* ── Header ── */}
      <View style={s.header}>
        {/* السلة يسار */}
        <TouchableOpacity onPress={() => router.push('/cart')} style={s.cartBtn}>
          <Ionicons name="bag-outline" size={22} color={PRIMARY} />
        </TouchableOpacity>

        {/* الشعار وسط */}
        <View style={s.headerCenter}>
          <Image source={require('../../assets/logo.png')} style={s.headerLogo} resizeMode="contain" />
        </View>

        {/* ترحيب يمين */}
        <View style={s.greetBox}>
          <Text style={s.greetName} numberOfLines={1}>{user?.storeName || 'تاجر'}</Text>
          <Text style={s.greetSub}>{filtered.length} منتج</Text>
        </View>
      </View>

      {/* ── Search ── */}
      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={18} color="#9ca3af" />
        <TextInput
          style={s.searchInput}
          placeholder="ابحث عن منتج..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9ca3af"
          textAlign="right"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 12, paddingTop: 12 }}>
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} width={CARD_WIDTH} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          numColumns={2}
          keyExtractor={(item, index) => (item as any).id?.toString() || index.toString()}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 32, gap: 12 }}
          columnWrapperStyle={{ gap: 12, justifyContent: 'space-between' }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
          ListHeaderComponent={
            <>
              {/* Categories */}
              <View style={s.categoriesWrapper}>
                <FlatList
                  horizontal
                  data={categories}
                  showsHorizontalScrollIndicator={false}
                  style={s.catList}
                  contentContainerStyle={s.catListContent}
                  keyExtractor={item => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[s.catBtn, activeCategory === item && s.catBtnActive]}
                      onPress={() => setActiveCategory(item)}>
                      <Text style={[s.catText, activeCategory === item && s.catTextActive]}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
              {/* Banner */}
              <BannerSlider banners={banners} containerWidth={width} />
            </>
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIconBox}>
                <Ionicons name="cube-outline" size={40} color="#9ca3af" />
              </View>
              <Text style={s.emptyTitle}>لا توجد منتجات</Text>
              <Text style={s.emptyText}>سيتم إضافة منتجات قريباً</Text>
            </View>
          }
          renderItem={({ item: p }: any) => {
            const imgs        = getImages(p);
            const hasDiscount = p.discount > 0;
            const discounted  = hasDiscount ? p.wholesalePrice * (1 - p.discount / 100) : p.wholesalePrice;
            const isFav       = (favoriteIds as number[]).includes(p.id);
            return (
              <TouchableOpacity
                style={[s.card, { width: CARD_WIDTH }]}
                onPress={() => router.push(`/products/${p.id}`)}
                activeOpacity={0.92}>
                <View style={[s.imgBox, { height: CARD_WIDTH }]}>
                  {imgs[0]
                    ? <Image source={{ uri: imgs[0] }} style={s.img} resizeMode="cover" />
                    : <View style={[s.img, s.imgPlaceholder]}>
                        <Ionicons name="image-outline" size={28} color="#d1d5db" />
                      </View>
                  }
                  {/* Badges */}
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
                  {/* عداد الصور */}
                  {imgs.length > 1 && (
                    <View style={s.imgCount}>
                      <Ionicons name="images-outline" size={10} color="#fff" />
                      <Text style={s.imgCountText}>{imgs.length}</Text>
                    </View>
                  )}
                  {/* زر المفضلة */}
                  <TouchableOpacity
                    style={[s.favBtn, isFav && s.favBtnActive]}
                    onPress={() => toggleFav.mutate({ id: p.id, isFav })}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons
                      name={isFav ? 'heart' : 'heart-outline'}
                      size={16}
                      color={isFav ? '#ef4444' : '#fff'} />
                  </TouchableOpacity>
                </View>

                <View style={s.cardBody}>
                  <Text style={s.productName} numberOfLines={2}>{p.name}</Text>

                  <View style={s.priceRow}>
                    {hasDiscount && (
                      <Text style={s.oldPrice}>{p.wholesalePrice.toLocaleString()}</Text>
                    )}
                    <Text style={s.price}>{Math.round(discounted).toLocaleString()} د.ع</Text>
                  </View>

                  <View style={s.bottomRow}>
                    <View style={s.catPill}>
                      <Text style={s.catPillText} numberOfLines={1}>{p.category}</Text>
                    </View>
                    <Text style={[s.stockText, p.stock < 5 && s.stockLow]}>
                      {p.stock < 5 ? '⚠ ' : ''}{p.stock}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // ── Header ──
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e8edf2',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerLogo:   { width: 100, height: 36 },
  cartBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#f0f9fa', borderWidth: 1.5, borderColor: '#d4eef3',
    justifyContent: 'center', alignItems: 'center',
  },
  greetBox:  { alignItems: 'flex-end' },
  greetName: { fontSize: 13, fontWeight: '800', color: '#0d1b2a', maxWidth: 90 },
  greetSub:  { fontSize: 10, color: '#64748b', marginTop: 1 },

  // ── Search ──
  searchBox: {
    flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 12, marginVertical: 10, borderRadius: 14,
    paddingHorizontal: 14, height: 46,
    borderWidth: 1.5, borderColor: '#e8edf2', gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },

  // ── Categories ──
  categoriesWrapper: { marginBottom: 14, marginTop: 4 },
  catList:           { maxHeight: 44 },
  catListContent:    { gap: 8, paddingHorizontal: 4, alignItems: 'center' },
  catBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e8edf2',
  },
  catBtnActive:  { backgroundColor: PRIMARY, borderColor: PRIMARY },
  catText:       { fontSize: 13, color: '#64748b', fontWeight: '600' },
  catTextActive: { color: '#fff' },

  // ── Cards ──
  card: {
    backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    shadowColor: '#0d1b2a', shadowOpacity: 0.07, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
    borderWidth: 1, borderColor: '#e8edf2',
  },
  imgBox:        { position: 'relative', overflow: 'hidden' },
  img:           { width: '100%', height: '100%' },
  imgPlaceholder: { backgroundColor: '#f2f6f9', justifyContent: 'center', alignItems: 'center' },

  renewBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: PRIMARY, borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  renewText: { fontSize: 9, color: '#fff', fontWeight: '700' },

  discountBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: '#ef4444', borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  discountText: { fontSize: 9, color: '#fff', fontWeight: '700' },

  favBtn: {
    position: 'absolute', bottom: 8, left: 8,
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  favBtnActive: { backgroundColor: 'rgba(255,255,255,0.9)' },

  imgCount: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2,
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  imgCountText: { fontSize: 9, color: '#fff', fontWeight: '700' },

  cardBody:    { padding: 10, gap: 5 },
  productName: { fontSize: 12, fontWeight: '700', color: '#0d1b2a', textAlign: 'right', lineHeight: 18 },
  priceRow:    { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  price:       { fontSize: 14, fontWeight: '900', color: PRIMARY },
  oldPrice:    { fontSize: 10, color: '#9ca3af', textDecorationLine: 'line-through' },
  bottomRow:   { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  catPill:     { backgroundColor: PRIMARY + '12', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, maxWidth: '70%' },
  catPillText: { fontSize: 9, color: PRIMARY, fontWeight: '600' },
  stockText:   { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  stockLow:    { color: '#ef4444' },

  // ── Empty ──
  empty:       { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: PRIMARY + '10', justifyContent: 'center', alignItems: 'center' },
  emptyTitle:  { fontSize: 16, fontWeight: '800', color: '#374151' },
  emptyText:   { fontSize: 13, color: '#94a3b8' },
});