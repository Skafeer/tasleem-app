import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, RefreshControl, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import api from '../../src/lib/api';
import BannerSlider from '../admin-components/BannerSlider';

const PRIMARY       = '#0c6679';

export default function HomeScreen() {
  const router = useRouter();
  const qc = useQueryClient();
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
      else       await api.post(`/api/favorites/${id}`);
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

  const { data: rawBanners = [] } = useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const { data } = await api.get('/api/banners');
      return (data as any[]).filter((b: any) => b.isActive).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    },
  });

  const banners  = rawBanners as any[];
  const products = (allProducts as any[]).filter((p: any) => p.stock > 0);
  const allCats  = products.flatMap((p: any) => p.category ? p.category.split(',').map((c: string) => c.trim()) : []);
  const categories = ['الكل', ...Array.from(new Set(allCats))];
  const filtered = products.filter((p: any) => {
    const cats = p.category ? p.category.split(',').map((c: string) => c.trim()) : [];
    return (activeCategory === 'الكل' || cats.includes(activeCategory)) && (!search || p.name.includes(search));
  });

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };
  const getImages = (p: any) => {
    const imgs = p.images ? p.images.split(',').filter(Boolean) : [];
    return imgs.length > 0 ? imgs : (p.imageUrl ? [p.imageUrl] : []);
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
        {/* شعار التطبيق */}
        <View style={s.logo}>
          <Image source={require('../../assets/logo.png')} style={s.logoImg} resizeMode="contain" />
        </View>
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
            <View style={s.categoriesWrapper}>
              <FlatList
                horizontal data={categories as string[]}
                showsHorizontalScrollIndicator={false}
                style={s.catList} contentContainerStyle={s.catListContent}
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
            <BannerSlider banners={banners} containerWidth={width} />
          </>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="cube-outline" size={56} color="#d1d5db" />
            <Text style={s.emptyText}>لا توجد منتجات</Text>
          </View>
        }
        renderItem={({ item: p }: any) => {
          const imgs = getImages(p);
          const hasDiscount = p.discount > 0;
          const discounted  = hasDiscount ? p.wholesalePrice * (1 - p.discount / 100) : p.wholesalePrice;
          return (
            <TouchableOpacity style={[s.card, { width: CARD_WIDTH }]} onPress={() => router.push(`/products/${p.id}`)}>
              <View style={[s.imgBox, { height: CARD_WIDTH }]}>
                {imgs[0]
                  ? <Image source={{ uri: imgs[0] }} style={s.img} resizeMode="cover" />
                  : <View style={[s.img, s.imgPlaceholder]}><Ionicons name="image-outline" size={28} color="#d1d5db" /></View>
                }
                {p.isRenewable && <View style={s.renewBadge}><Text style={s.renewText}>قابل للتجديد</Text></View>}
                {hasDiscount   && <View style={s.discountBadge}><Text style={s.discountText}>خصم {p.discount}%</Text></View>}
                {imgs.length > 1 && (
                  <View style={s.imgCount}>
                    <Ionicons name="images-outline" size={11} color="#fff" />
                    <Text style={s.imgCountText}>{imgs.length}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={s.favBtn}
                  onPress={() => toggleFav.mutate({ id: p.id, isFav: (favoriteIds as number[]).includes(p.id) })}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons
                    name={(favoriteIds as number[]).includes(p.id) ? 'heart' : 'heart-outline'}
                    size={18}
                    color={(favoriteIds as number[]).includes(p.id) ? '#ef4444' : '#fff'} />
                </TouchableOpacity>
              </View>
              <View style={s.cardBody}>
                <Text style={s.productName} numberOfLines={2}>{p.name}</Text>
                <View style={s.priceRow}>
                  {hasDiscount && <Text style={s.oldPrice}>{p.wholesalePrice.toLocaleString()}</Text>}
                  <Text style={s.price}>{Math.round(discounted).toLocaleString()} د.ع</Text>
                </View>
                <View style={s.bottomRow}>
                  <View style={s.catPill}><Text style={s.catPillText} numberOfLines={1}>{p.category}</Text></View>
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
  container:    { flex: 1, backgroundColor: '#f8fafc' },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 10 },
  headerCenter: { flex: 1, alignItems: 'center' },
  greeting:     { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  subtitle:     { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  logo:         { width: 52, height: 52, borderRadius: 14, backgroundColor: '#f0f9fb', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  logoImg:      { width: 46, height: 46 },
  cartBtn:      { width: 38, height: 38, borderRadius: 12, backgroundColor: PRIMARY + '12', justifyContent: 'center', alignItems: 'center' },
  searchBox:    { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 10, borderRadius: 14, paddingHorizontal: 14, height: 46, borderWidth: 1.5, borderColor: '#e5e7eb', gap: 8 },
  searchInput:  { flex: 1, fontSize: 14, color: '#111827' },
  categoriesWrapper: { marginBottom: 14, marginTop: 4 },
  catList:           { maxHeight: 44 },
  catListContent:    { gap: 8, paddingHorizontal: 4, alignItems: 'center' },
  catBtn:            { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb' },
  catBtnActive:      { backgroundColor: PRIMARY, borderColor: PRIMARY },
  catText:           { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  catTextActive:     { color: '#fff' },
  card:          { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  imgBox:        { position: 'relative', overflow: 'hidden' },
  img:           { width: '100%', height: '100%' },
  imgPlaceholder:{ backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  renewBadge:    { position: 'absolute', top: 8, right: 8, backgroundColor: PRIMARY, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  renewText:     { fontSize: 9, color: '#fff', fontWeight: 'bold' },
  discountBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#ef4444', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  discountText:  { fontSize: 9, color: '#fff', fontWeight: 'bold' },
  favBtn:       { position: 'absolute', top: 8, left: 8, width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  imgCount:      { position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 3 },
  imgCountText:  { fontSize: 10, color: '#fff', fontWeight: 'bold' },
  cardBody:      { padding: 10, gap: 6 },
  productName:   { fontSize: 13, fontWeight: '700', color: '#111827', textAlign: 'right' },
  priceRow:      { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  price:         { fontSize: 14, fontWeight: 'bold', color: PRIMARY },
  oldPrice:      { fontSize: 11, color: '#9ca3af', textDecorationLine: 'line-through' },
  bottomRow:     { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  catPill:       { backgroundColor: PRIMARY + '12', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, maxWidth: '70%' },
  catPillText:   { fontSize: 10, color: PRIMARY, fontWeight: '600' },
  stockText:     { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  empty:         { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText:     { fontSize: 16, color: '#9ca3af', fontWeight: '600' },
});
