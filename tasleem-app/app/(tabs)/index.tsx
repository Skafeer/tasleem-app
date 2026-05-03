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
  card: {
    backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2
  },
  img: { backgroundColor: '#e8edf2', width: '100%' },
  body: { padding: 12, gap: 8 },
  line: { height: 11, backgroundColor: '#e8edf2', borderRadius: 6, width: '80%' },
});

// ── Product Card Component ──
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
    return imgs.length > 0 ? imgs : (p.imageUrl ? [p.imageUrl] : []);
  };
  
  const imgs = getImages(product);
  const hasDiscount = product.discount > 0;
  const finalPrice = hasDiscount 
    ? product.wholesalePrice * (1 - product.discount / 100)
    : product.wholesalePrice;
  
  const CARD_HEIGHT = CARD_WIDTH + 155;
  
  return (
    <TouchableOpacity
      style={[s.card, { width: CARD_WIDTH, height: CARD_HEIGHT }]}
      onPress={() => onPress(product.id)}
      activeOpacity={0.92}>
      <View style={[s.imgBox, { height: CARD_WIDTH }]}>
        {imgs[0] ? (
          <Image source={{ uri: imgs[0] }} style={s.img} resizeMode="cover" />
        ) : (
          <View style={[s.img, s.imgPlaceholder]}>
            <Ionicons name="image-outline" size={28} color="#d1d5db" />
          </View>
        )}
        
        {product.isRenewable && (
          <View style={s.renewBadge}>
            <Text style={s.renewText}>قابل للتجديد</Text>
          </View>
        )}
        
        {hasDiscount && (
          <View style={s.discountBadge}>
            <Text style={s.discountText}>-{product.discount}%</Text>
          </View>
        )}
        
        {imgs.length > 1 && (
          <View style={s.imgCount}>
            <Ionicons name="images-outline" size={10} color="#fff" />
            <Text style={s.imgCountText}>{imgs.length}</Text>
          </View>
        )}
        
        <TouchableOpacity
          style={[s.favBtn, isFav && s.favBtnActive]}
          onPress={() => onToggleFav(product.id, isFav)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons
            name={isFav ? 'heart' : 'heart-outline'}
            size={18}
            color={isFav ? '#ef4444' : '#fff'}
          />
        </TouchableOpacity>
      </View>

      <View style={s.cardBody}>
        <Text style={s.productName} numberOfLines={1}>{product.name}</Text>

        <View style={s.priceSection}>
          <View style={s.priceRow}>
            <Text style={s.price}>{Math.round(finalPrice).toLocaleString()}</Text>
            <Text style={s.currency}>د.ع</Text>
          </View>
          {hasDiscount && (
            <Text style={s.oldPrice}>{product.wholesalePrice.toLocaleString()} د.ع</Text>
          )}
        </View>

        <View style={s.bottomRow}>
          {(() => {
            const cats = product.category
              ? product.category.split(',').map((c: string) => c.trim()).filter((c: string) => c && c !== 'عام')
              : [];
            return cats.length > 0 ? (
              <View style={s.catPill}>
                <Text style={s.catPillText} numberOfLines={1}>{cats[0]}</Text>
              </View>
            ) : null;
          })()}
          <Text style={[s.stockText, product.stock < 5 && s.stockLow]}>
            {product.stock < 5 ? '⚠ ' : ''}{product.stock}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={s.detailsBtn}
          onPress={() => onViewDetails(product.id)}>
          <Ionicons name="eye-outline" size={16} color={PRIMARY} />
          <Text style={s.detailsBtnText}>عرض التفاصيل</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

export default function HomeScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { width } = useWindowDimensions();
  const CARD_WIDTH = (width - 48) / 2;

  const [search, setSearch] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [filterModal, setFilterModal] = useState<boolean>(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [cartCount, setCartCount] = useState<number>(0);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    sortBy: 'newest',
  });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['active-categories'],
    queryFn: async () => {
      const { data } = await api.get('/api/categories');
      return data
        .filter((cat: any) => cat.isActive === true)
        .sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    },
  });

  const { data: bestSellerIds = [] } = useQuery({
    queryKey: ['best-sellers-ids'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/api/categories/best-sellers');
        return (data as any[]).map((p: any) => p.id) as number[];
      } catch { return [] as number[]; }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: allProducts = [], refetch, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/api/products?activeOnly=true');
      return data.filter((p: any) => p.isActive !== false && p.stock > 0);
    },
  });

  const { data: unreadCount = 0, refetch: refetchUnreadCount } = useQuery({
    queryKey: ['unread-notifications-count'],
    queryFn: async () => {
      try {
        // أولاً: نجرب الـ endpoint المخصص
        const { data } = await api.get('/api/notifications/unread-count');
        if (typeof data?.count === 'number') return data.count;
        // ثانياً: نحسبه من قائمة الإشعارات كـ fallback
        const [{ data: notifs }, { data: user }] = await Promise.all([
          api.get('/api/notifications'),
          api.get('/api/auth/me'),
        ]);
        if (!Array.isArray(notifs)) return 0;
        return notifs.filter((n: any) =>
          !n.is_read && (!n.user_id || n.user_id === user.id)
        ).length;
      } catch { return 0; }
    },
    refetchInterval: 30000,
  });

  useFocusEffect(useCallback(() => { refetchUnreadCount(); }, [refetchUnreadCount]));

  const fetchCartCount = useCallback(async () => {
    try {
      const { data: user } = await api.get('/api/auth/me');
      if (!user?.id) return;
      const cartKey = `cart_${user.id}`;
      const data = await AsyncStorage.getItem(cartKey);
      const parsed = data ? JSON.parse(data) : [];
      const count = parsed.reduce((sum: number, item: any) => sum + item.quantity, 0);
      setCartCount(count);
    } catch (error) { console.error('Failed to fetch cart count:', error); }
  }, []);

  useFocusEffect(useCallback(() => { fetchCartCount(); }, [fetchCartCount]));

  const { data: favoriteIds = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const { data } = await api.get('/api/favorites');
      return data as number[];
    },
  });

  const toggleFav = useMutation({
    mutationFn: async ({ id, isFav }: { id: number; isFav: boolean }) => {
      if (isFav) await api.delete(`/api/favorites/${id}`);
      else await api.post(`/api/favorites/${id}`);
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

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data } = await api.get('/api/auth/me');
      return data;
    },
  });

  const { data: rawBanners = [] } = useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const { data } = await api.get('/api/banners');
      return (data as any[]).filter((b: any) => b.isActive).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    },
  });
  const banners = rawBanners as any[];
  const products = allProducts as any[];

  const filtered = useMemo(() => {
    let result = [...products];

    if (activeCategoryId === -1) {
      const bsIds = new Set(bestSellerIds as number[]);
      result = result.filter((p: any) => bsIds.has(p.id));
    } else if (activeCategoryId !== null) {
      const selectedCategory = categories.find((c: any) => c.id === activeCategoryId);
      if (selectedCategory) {
        result = result.filter((p: any) => {
          const productCategories = p.category
            ? p.category.split(',').map((c: string) => c.trim()).filter((c: string) => c && c !== 'عام')
            : [];
          return productCategories.includes(selectedCategory.name);
        });
      }
    }

    if (searchQuery) {
      result = result.filter((p: any) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (filters.minPrice) {
      result = result.filter((p: any) => p.wholesalePrice >= Number(filters.minPrice));
    }
    if (filters.maxPrice) {
      result = result.filter((p: any) => p.wholesalePrice <= Number(filters.maxPrice));
    }

    switch (filters.sortBy) {
      case 'price_asc':
        result.sort((a, b) => a.wholesalePrice - b.wholesalePrice);
        break;
      case 'price_desc':
        result.sort((a, b) => b.wholesalePrice - a.wholesalePrice);
        break;
      case 'popular':
        result.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
        break;
      default:
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return result;
  }, [products, activeCategoryId, searchQuery, filters, categories]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchUnreadCount()]);
    await fetchCartCount();
    setRefreshing(false);
  };

  const performSearch = () => {
    Keyboard.dismiss();
    if (search.trim()) {
      setSearchQuery(search);
      if (!recentSearches.includes(search) && search.length > 2) {
        setRecentSearches(prev => [search, ...prev].slice(0, 5));
      }
    } else {
      setSearchQuery('');
    }
  };

  const clearSearch = () => {
    setSearch('');
    setSearchQuery('');
  };

  const handleRecentSearchPress = (term: string) => {
    setSearch(term);
    setSearchQuery(term);
  };

  const clearRecentSearch = (term: string) => {
    setRecentSearches(prev => prev.filter(t => t !== term));
  };

  const handleProductPress = useCallback((id: number) => {
    router.push(`/products/${id}`);
  }, [router]);

  const handleViewDetails = useCallback((id: number) => {
    router.push(`/products/${id}`);
  }, [router]);

  const handleToggleFav = useCallback((id: number, isFav: boolean) => {
    toggleFav.mutate({ id, isFav });
  }, [toggleFav]);

  const applyFilters = () => {
    setFilterModal(false);
  };

  const resetFilters = () => {
    setFilters({
      minPrice: '',
      maxPrice: '',
      sortBy: 'newest',
    });
    setActiveCategoryId(null);
    setSearchQuery('');
    setSearch('');
  };

  const isLoading = isLoadingProducts || isLoadingCategories;

  const displayCategories = useMemo(() => {
    const hasBestSellers = (bestSellerIds as number[]).length > 0;
    return [
      { id: null,  name: 'الكل' },
      ...(hasBestSellers ? [{ id: -1, name: 'الأكثر مبيعاً' }] : []),
      ...categories
    ];
  }, [categories, bestSellerIds]);

  return (
    <View style={s.container}>
      <SafeAreaView style={s.safeArea} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" translucent={false} />
        
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.push('/cart')} style={s.cartBtn}>
            <Ionicons name="cart-outline" size={22} color={PRIMARY} />
            {cartCount > 0 && (
              <View style={s.cartBadge}>
                <Text style={s.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={s.headerCenter}>
            <Image source={require('../../assets/logo.png')} style={s.headerLogo} resizeMode="contain" />
            <Text style={s.welcomeText}>مرحباً {user?.storeName || 'تاجر'} 👋</Text>
          </View>

          <TouchableOpacity onPress={() => router.push('/notification')} style={s.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color={PRIMARY} />
            {unreadCount > 0 && (
              <View style={s.notifBadge}>
                <Text style={s.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={s.searchWrapper}>
          <View style={s.searchBox}>
            <Ionicons name="search-outline" size={18} color="#9ca3af" />
            <TextInput
              style={s.searchInput}
              placeholder="ابحث عن منتج..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#9ca3af"
              textAlign="right"
              returnKeyType="search"
              onSubmitEditing={performSearch}
            />
            {search ? (
              <TouchableOpacity onPress={clearSearch}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity style={s.filterBtn} onPress={() => setFilterModal(true)}>
            <Ionicons name="options-outline" size={20} color={PRIMARY} />
          </TouchableOpacity>
        </View>

        {/* Recent Searches */}
        {searchQuery === '' && recentSearches.length > 0 && (
          <View style={s.recentSearch}>
            <View style={s.recentHeader}>
              <Text style={s.recentTitle}>عمليات البحث الأخيرة</Text>
              <TouchableOpacity onPress={() => setRecentSearches([])}>
                <Text style={s.clearRecentText}>مسح الكل</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.recentList}>
              {recentSearches.map(term => (
                <TouchableOpacity key={term} style={s.recentChip} onPress={() => handleRecentSearchPress(term)}>
                  <Text style={s.recentChipText}>{term}</Text>
                  <TouchableOpacity onPress={() => clearRecentSearch(term)}>
                    <Ionicons name="close-circle" size={14} color="#9ca3af" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {isLoading ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 12, paddingTop: 12 }}>
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} width={CARD_WIDTH} />)}
          </View>
        ) : (
          <FlatList
            data={filtered}
            numColumns={2}
            keyExtractor={(item, index) => (item as any).id?.toString() || index.toString()}
            contentContainerStyle={s.flatListContent}
            columnWrapperStyle={s.columnWrapper}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
            ListHeaderComponent={
              <>
                {displayCategories.length > 0 && (
                  <View style={s.categoriesWrapper}>
                    <FlatList
                      horizontal
                      data={displayCategories}
                      showsHorizontalScrollIndicator={false}
                      style={s.catList}
                      contentContainerStyle={s.catListContent}
                      keyExtractor={item => item.id?.toString() || 'all'}
                      renderItem={({ item }: { item: any }) => (
                        <TouchableOpacity
                          style={[s.catBtn, activeCategoryId === item.id && s.catBtnActive]}
                          onPress={() => setActiveCategoryId(activeCategoryId === item.id ? null : item.id)}>
                          <Text style={[s.catText, activeCategoryId === item.id && s.catTextActive]}>
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                )}
                
                <View style={s.bannerWrapper}>
                  <BannerSlider banners={banners} containerWidth={width} />
                </View>
                
                <View style={s.resultHeader}>
                  <Text style={s.resultCount}>{filtered.length} منتج</Text>
                  <TouchableOpacity onPress={resetFilters}>
                    <Text style={s.resetFilterText}>إعادة تعيين</Text>
                  </TouchableOpacity>
                </View>
              </>
            }
            ListEmptyComponent={
              <View style={s.empty}>
                <View style={s.emptyIconBox}>
                  <Ionicons name="cube-outline" size={40} color="#9ca3af" />
                </View>
                <Text style={s.emptyTitle}>لا توجد منتجات</Text>
                <Text style={s.emptyText}>
                  {searchQuery || activeCategoryId ? 'لا توجد نتائج مطابقة لبحثك' : 'سيتم إضافة منتجات جديدة قريباً'}
                </Text>
                <TouchableOpacity style={s.refreshBtn} onPress={onRefresh}>
                  <Ionicons name="refresh-outline" size={18} color={PRIMARY} />
                  <Text style={s.refreshText}>تحديث</Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item: p }) => (
              <ProductCard
                product={p}
                isFav={(favoriteIds as number[]).includes(p.id)}
                CARD_WIDTH={CARD_WIDTH}
                onPress={handleProductPress}
                onToggleFav={handleToggleFav}
                onViewDetails={handleViewDetails}
              />
            )}
          />
        )}

        {/* Modal الفلترة */}
        <Modal visible={filterModal} animationType="slide" transparent>
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>فلترة المنتجات</Text>
                <TouchableOpacity onPress={() => setFilterModal(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={s.filterLabel}>نطاق السعر (د.ع)</Text>
                <View style={s.priceRange}>
                  <TextInput
                    style={s.priceInput}
                    placeholder="من"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    value={filters.minPrice}
                    onChangeText={(text) => setFilters(prev => ({ ...prev, minPrice: text }))}
                  />
                  <Text style={s.priceDash}>-</Text>
                  <TextInput
                    style={s.priceInput}
                    placeholder="إلى"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    value={filters.maxPrice}
                    onChangeText={(text) => setFilters(prev => ({ ...prev, maxPrice: text }))}
                  />
                </View>

                <Text style={s.filterLabel}>ترتيب حسب</Text>
                {[
                  { id: 'newest', label: 'الأحدث' },
                  { id: 'price_asc', label: 'السعر: من الأقل للأعلى' },
                  { id: 'price_desc', label: 'السعر: من الأعلى للأقل' },
                  { id: 'popular', label: 'الأكثر شهرة' },
                ].map(option => (
                  <TouchableOpacity
                    key={option.id}
                    style={s.sortOption}
                    onPress={() => setFilters(prev => ({ ...prev, sortBy: option.id }))}>
                    <View style={[s.radioCircle, filters.sortBy === option.id && s.radioSelected]} />
                    <Text style={s.sortText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={s.modalFooter}>
                <TouchableOpacity style={s.resetFilterBtn} onPress={resetFilters}>
                  <Text style={s.resetFilterBtnText}>إعادة تعيين</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.applyFilterBtn} onPress={applyFilters}>
                  <Text style={s.applyFilterText}>تطبيق الفلتر</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  headerCenter: { alignItems: 'center' },
  headerLogo: { width: 90, height: 32 },
  welcomeText: { fontSize: 11, color: '#64748b', marginTop: 2 },
  cartBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0f9fa',
    borderWidth: 1.5,
    borderColor: '#d4eef3',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: { fontSize: 10, color: '#fff', fontWeight: 'bold' },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: { fontSize: 10, color: '#fff', fontWeight: 'bold' },
  flatListContent: { paddingHorizontal: 12, paddingBottom: 20, gap: 8 },
  columnWrapper: { gap: 12, justifyContent: 'space-between', alignItems: 'stretch', marginBottom: 8 },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginVertical: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1.5,
    borderColor: '#e8edf2',
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', textAlign: 'right' },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e8edf2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentSearch: {
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentTitle: { fontSize: 12, fontWeight: '600', color: '#374151' },
  clearRecentText: { fontSize: 11, color: '#9ca3af' },
  recentList: { gap: 8, flexDirection: 'row' },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  recentChipText: { fontSize: 12, color: '#374151' },
  categoriesWrapper: { marginBottom: 14, marginTop: 4 },
  catList: { maxHeight: 44 },
  catListContent: { gap: 8, paddingHorizontal: 12, alignItems: 'center', flexDirection: 'row' },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e8edf2',
  },
  catBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  catText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  catTextActive: { color: '#fff' },
  bannerWrapper: {
    marginHorizontal: 0,
    marginBottom: 16,
    overflow: 'visible',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  resultCount: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  resetFilterText: { fontSize: 12, color: PRIMARY, fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#0d1b2a',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  imgBox: { position: 'relative', overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: { backgroundColor: '#f2f6f9', justifyContent: 'center', alignItems: 'center' },
  renewBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 10,
  },
  renewText: { fontSize: 10, color: '#fff', fontWeight: 'bold' },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    zIndex: 10,
  },
  discountText: { fontSize: 9, color: '#fff', fontWeight: '700' },
  favBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favBtnActive: { backgroundColor: 'rgba(255,255,255,0.9)' },
  imgCount: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  imgCountText: { fontSize: 9, color: '#fff', fontWeight: '700' },
  cardBody: { padding: 10, gap: 6, flex: 1, justifyContent: 'space-between' },
  productName: { fontSize: 12, fontWeight: '700', color: '#0d1b2a', textAlign: 'right', lineHeight: 18 },
  priceSection: { 
    marginVertical: 2,
    minHeight: 40,
    justifyContent: 'center',
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, justifyContent: 'flex-start' },
  price: { fontSize: 15, fontWeight: '900', color: PRIMARY },
  currency: { fontSize: 11, color: PRIMARY, fontWeight: '500' },
  oldPrice: { fontSize: 10, color: '#9ca3af', textDecorationLine: 'line-through', marginTop: 2 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  catPill: { backgroundColor: PRIMARY + '12', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, maxWidth: '80%' },
  catPillText: { fontSize: 9, color: PRIMARY, fontWeight: '600' },
  stockText: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  stockLow: { color: '#ef4444' },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: PRIMARY + '10',
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 6,
    height: 34,
  },
  detailsBtnText: { fontSize: 11, color: PRIMARY, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PRIMARY + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#374151' },
  emptyText: { fontSize: 13, color: '#94a3b8' },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PRIMARY + '10',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  refreshText: { fontSize: 13, color: PRIMARY, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  filterLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 10 },
  priceRange: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priceInput: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderColor: '#e8edf2',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  priceDash: { fontSize: 16, color: '#9ca3af' },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  radioSelected: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY,
  },
  sortText: { fontSize: 14, color: '#374151' },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e8edf2',
  },
  resetFilterBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e8edf2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetFilterBtnText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  applyFilterBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyFilterText: { fontSize: 14, color: '#fff', fontWeight: 'bold' },
});