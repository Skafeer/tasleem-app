import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, useWindowDimensions, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import api from '../src/lib/api';

const PRIMARY = '#0c6679';
const BG = '#f2f6f9';

// Skeleton Card
function SkeletonFavCard({ width }: { width: number }) {
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
    <Animated.View style={[skf.card, { width, opacity: anim }]}>
      <View style={[skf.img, { height: width }]} />
      <View style={skf.body}>
        <View style={skf.line} />
        <View style={[skf.line, { width: '55%' }]} />
      </View>
    </Animated.View>
  );
}

const skf = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#e8edf2', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  img: { backgroundColor: '#e8edf2', width: '100%' },
  body: { padding: 10, gap: 8 },
  line: { height: 12, backgroundColor: '#e8edf2', borderRadius: 6, width: '80%' },
});

export default function FavoritesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { width } = useWindowDimensions();
  const CARD_WIDTH = (width - 48) / 2;

  const { data: favoriteIds = [], isLoading: loadingIds } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => { const { data } = await api.get('/api/favorites'); return data as number[]; },
  });

  const { data: allProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => { const { data } = await api.get('/api/products?activeOnly=true'); return data; },
  });

  const removeFav = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/api/favorites/${id}`); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const favorites = (allProducts as any[]).filter((p: any) => (favoriteIds as number[]).includes(p.id));
  const isLoading = loadingIds || loadingProducts;
  const getImages = (p: any) => p.images ? p.images.split(',').filter(Boolean) : p.imageUrl ? [p.imageUrl] : [];

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>

      {/* ── Header موحد ── */}
      <View style={s.header}>
        <View style={s.headerContent}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-forward" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>المنتجات المفضلة</Text>
          <View style={s.favCountBox}>
            <Ionicons name="heart" size={12} color={PRIMARY} />
            <Text style={s.favCount}>{favorites.length}</Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 14 }}>
          {[...Array(4)].map((_, i) => <SkeletonFavCard key={i} width={CARD_WIDTH} />)}
        </View>
      ) : favorites.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIconBox}>
            <Ionicons name="heart-outline" size={42} color="#9ca3af" />
          </View>
          <Text style={s.emptyTitle}>لا توجد منتجات مفضلة</Text>
          <Text style={s.emptyText}>اضغط على أيقونة القلب على أي منتج لحفظه هنا</Text>
          <TouchableOpacity style={s.browseBtn} onPress={() => router.push('/')}>
            <Ionicons name="cube-outline" size={16} color="#fff" />
            <Text style={s.browseBtnText}>تصفح المنتجات</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item: any) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={s.row}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: p }: any) => {
            const imgs = getImages(p);
            const hasDiscount = p.discount > 0;
            const discounted = hasDiscount ? p.wholesalePrice * (1 - p.discount / 100) : p.wholesalePrice;
            return (
              <TouchableOpacity
                style={[s.card, { width: CARD_WIDTH }]}
                onPress={() => router.push(`/products/${p.id}`)}>
                <View style={[s.imgBox, { height: CARD_WIDTH }]}>
                  {imgs[0]
                    ? <Image source={{ uri: imgs[0] }} style={s.img} resizeMode="cover" />
                    : <View style={[s.img, s.imgPlaceholder]}><Ionicons name="image-outline" size={28} color="#d1d5db" /></View>
                  }
                  {hasDiscount && (
                    <View style={s.discountBadge}>
                      <Text style={s.discountText}>خصم {p.discount}%</Text>
                    </View>
                  )}
                  <TouchableOpacity style={s.favBtn} onPress={() => removeFav.mutate(p.id)}>
                    <Ionicons name="heart" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
                <View style={s.cardBody}>
                  <Text style={s.productName} numberOfLines={2}>{p.name}</Text>
                  <View style={s.priceRow}>
                    {hasDiscount && <Text style={s.oldPrice}>{p.wholesalePrice.toLocaleString()}</Text>}
                    <Text style={s.price}>{Math.round(discounted).toLocaleString()} د.ع</Text>
                  </View>
                  <View style={s.catPill}>
                    <Text style={s.catPillText} numberOfLines={1}>{p.category}</Text>
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

  // Header موحد
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
  favCountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PRIMARY + '12',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  favCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: PRIMARY,
  },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 30 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: PRIMARY + '12', justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151', textAlign: 'center' },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },
  browseBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PRIMARY, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, marginTop: 4 },
  browseBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  list: { padding: 14, gap: 12 },
  row: { justifyContent: 'space-between', marginBottom: 12 },

  card: { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#e8edf2', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  imgBox: { position: 'relative', overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  discountBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#ef4444', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  discountText: { fontSize: 9, color: '#fff', fontWeight: 'bold' },
  favBtn: { position: 'absolute', top: 8, left: 8, width: 30, height: 30, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' },
  cardBody: { padding: 10, gap: 6 },
  productName: { fontSize: 13, fontWeight: '700', color: '#111827', textAlign: 'right' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-start' },
  price: { fontSize: 14, fontWeight: 'bold', color: PRIMARY },
  oldPrice: { fontSize: 11, color: '#9ca3af', textDecorationLine: 'line-through' },
  catPill: { backgroundColor: PRIMARY + '12', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' },
  catPillText: { fontSize: 10, color: PRIMARY, fontWeight: '600' },
});