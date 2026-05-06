import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Image, RefreshControl, useWindowDimensions, Animated,
  Modal, ScrollView, Keyboard, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/lib/api';
import BannerSlider from '../admin-components/BannerSlider';

const PRIMARY = '#0c6679';
const BG = '#f2f6f9';

// Skeleton Card
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
  card: {
    backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
  },
  img: { backgroundColor: '#e8edf2', width: '100%' },
  body: { padding: 12, gap: 8 },
  line: { height: 11, backgroundColor: '#e8edf2', borderRadius: 6, width: '80%' },
});

// Product Card Component
const ProductCard = React.memo(({
  product,
  isFav,
  CARD_WIDTH,
  onPress,
  onToggleFav,
  onViewDetails
}: any) => {
  const getImages = (p: any) => {
    const imgs = p.images ? p.images.split(',').filter(Boolean) : [];
    return imgs.length > 0 ? imgs : [p.imageUrl].filter(Boolean);
  };

  const imgs = getImages(product);
  const hasDiscount = product.discount > 0;
  const finalPrice = hasDiscount 
    ? product.wholesalePrice * (1 - product.discount / 100) 
    : product.wholesalePrice;

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={onPress}
      style={[styles.productCard, { width: CARD_WIDTH }]}
    >
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: imgs[0] || 'https://via.placeholder.com/300' }} 
          style={styles.productImage} 
          resizeMode="cover"
        />
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{product.discount}%-</Text>
          </View>
        )}
        <TouchableOpacity 
          style={styles.favBtn} 
          onPress={() => onToggleFav(product.id)}
        >
          <Ionicons 
            name={isFav ? "heart" : "heart-outline"} 
            size={22} 
            color={isFav ? "#ef4444" : "#64748b"} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.categoryName}>{product.category?.name || 'عام'}</Text>
        <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
        
        <View style={styles.priceRow}>
          <View>
            <Text style={styles.price}>{finalPrice.toLocaleString()} ر.ي</Text>
            {hasDiscount && (
              <Text style={styles.oldPrice}>{product.wholesalePrice.toLocaleString()} ر.ي</Text>
            )}
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={onViewDetails}>
            <Ionicons name="cart-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);

  // Layout Calculations
  const PADDING = 20;
  const GAP = 15;
  const CARD_WIDTH = (width - (PADDING * 2) - GAP) / 2;

  // Data Fetching
  const { data: products = [], isLoading: loadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get('/products');
      return res.data;
    }
  });

  const { data: categories = [], isLoading: loadingCats } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data;
    }
  });

  const { data: banners = [], isLoading: loadingBanners } = useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const res = await api.get('/banners');
      return res.data;
    }
  });

  // Load Favorites
  useEffect(() => {
    AsyncStorage.getItem('favorites').then(val => {
      if (val) setFavorites(JSON.parse(val));
    });
  }, []);

  const toggleFavorite = useCallback(async (id: number) => {
    const newFavs = favorites.includes(id) 
      ? favorites.filter(f => f !== id) 
      : [...favorites, id];
    setFavorites(newFavs);
    await AsyncStorage.setItem('favorites', JSON.stringify(newFavs));
  }, [favorites]);

  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = activeCategory ? p.categoryId === activeCategory : true;
      return matchSearch && matchCat;
    });
  }, [products, search, activeCategory]);

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['banners'] });
  }, []);

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.welcome}>مرحباً بك في</Text>
          <Text style={styles.brand}>تطبيق تسليم</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/notification')}>
          <Ionicons name="notifications-outline" size={24} color="#333" />
          <View style={styles.notifBadge} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="ابحث عن منتجات..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94a3b8"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#cbd5e1" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Banner Slider */}
      <View style={styles.bannerSection}>
        {loadingBanners ? (
          <View style={[styles.bannerSkeleton, { aspectRatio: 18/7 }]} />
        ) : (
          <BannerSlider banners={banners} />
        )}
      </View>

      {/* Categories */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>الأقسام</Text>
      </View>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.catsList}
      >
        <TouchableOpacity 
          style={[styles.catItem, activeCategory === null && styles.activeCat]}
          onPress={() => setActiveCategory(null)}
        >
          <Text style={[styles.catText, activeCategory === null && styles.activeCatText]}>الكل</Text>
        </TouchableOpacity>
        {categories.map((cat: any) => (
          <TouchableOpacity 
            key={cat.id}
            style={[styles.catItem, activeCategory === cat.id && styles.activeCat]}
            onPress={() => setActiveCategory(cat.id)}
          >
            <Text style={[styles.catText, activeCategory === cat.id && styles.activeCatText]}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>المنتجات</Text>
        <Text style={styles.resultsCount}>{filteredProducts.length} منتج</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <FlatList
        data={loadingProducts ? [1, 2, 3, 4] : filteredProducts}
        keyExtractor={(item: any) => loadingProducts ? item.toString() : item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => loadingProducts ? (
          <SkeletonCard width={CARD_WIDTH} />
        ) : (
          <ProductCard 
            product={item}
            CARD_WIDTH={CARD_WIDTH}
            isFav={favorites.includes(item.id)}
            onPress={() => router.push(`/products/${item.id}`)}
            onToggleFav={toggleFavorite}
            onViewDetails={() => router.push(`/products/${item.id}`)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={onRefresh} colors={[PRIMARY]} />
        }
        ListEmptyComponent={() => !loadingProducts && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={60} color="#cbd5e1" />
            <Text style={styles.emptyText}>لم نجد أي منتجات تطابق بحثك</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  listContent: { paddingBottom: 100 },
  headerContent: { paddingBottom: 10 },
  topBar: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  welcome: { fontSize: 14, color: '#64748b', textAlign: 'right' },
  brand: { fontSize: 22, fontWeight: 'bold', color: PRIMARY, textAlign: 'right' },
  notifBtn: {
    width: 45, height: 45, backgroundColor: '#fff', borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5
  },
  notifBadge: {
    position: 'absolute', top: 12, right: 12, width: 8, height: 8,
    backgroundColor: '#ef4444', borderRadius: 4, borderWidth: 1.5, borderColor: '#fff'
  },
  searchContainer: { paddingHorizontal: 20, marginBottom: 20 },
  searchBox: {
    flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 15, borderRadius: 15, height: 50, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10
  },
  searchInput: { flex: 1, paddingHorizontal: 10, fontSize: 15, textAlign: 'right', color: '#334155' },
  bannerSection: { marginBottom: 25 },
  bannerSkeleton: { 
    marginHorizontal: 20, borderRadius: 15, backgroundColor: '#e2e8f0', 
    width: '90%', alignSelf: 'center' 
  },
  sectionHeader: {
    flexDirection: 'row-reverse', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, marginBottom: 15
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  resultsCount: { fontSize: 13, color: '#94a3b8' },
  catsList: { paddingHorizontal: 20, gap: 10, marginBottom: 25 },
  catItem: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 12,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0'
  },
  activeCat: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  catText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  activeCatText: { color: '#fff' },
  row: { justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 15 },
  productCard: {
    backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12
  },
  imageContainer: { width: '100%', aspectRatio: 1 },
  productImage: { width: '100%', height: '100%' },
  discountBadge: {
    position: 'absolute', top: 10, left: 10, backgroundColor: '#ef4444',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8
  },
  discountText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  favBtn: {
    position: 'absolute', top: 10, right: 10, width: 34, height: 34,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10,
    justifyContent: 'center', alignItems: 'center'
  },
  productInfo: { padding: 12 },
  categoryName: { fontSize: 11, color: '#94a3b8', marginBottom: 4, textAlign: 'right' },
  productName: { fontSize: 15, fontWeight: 'bold', color: '#334155', marginBottom: 8, textAlign: 'right' },
  priceRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 16, fontWeight: 'bold', color: PRIMARY },
  oldPrice: { fontSize: 12, color: '#94a3b8', textDecorationLine: 'line-through' },
  addBtn: {
    width: 32, height: 32, backgroundColor: PRIMARY, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center'
  },
  emptyState: { padding: 50, alignItems: 'center', gap: 15 },
  emptyText: { color: '#94a3b8', fontSize: 15, textAlign: 'center' }
});
