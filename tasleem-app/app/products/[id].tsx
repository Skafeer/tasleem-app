// /workspaces/tasleem-app/tasleem-app/app/products/[id].tsx
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Modal, TextInput, ActivityIndicator,
  FlatList, Clipboard, Linking, useWindowDimensions, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';

const getCartKey = (userId?: number) => userId ? `cart_${userId}` : null;
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const SUCCESS = '#10b981';
const BG = '#f2f6f9';

// =============================================================
// InternalToast component
// =============================================================
function InternalToast({ message, type, visible }: {
  message: string; type: 'success' | 'error'; visible: boolean;
}) {
  const opacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.delay(2200),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, message]);

  if (!visible) return null;

  return (
    <Animated.View style={[
      s.internalToast,
      type === 'success' ? s.toastSuccess : s.toastError,
      { opacity }
    ]}>
      <Ionicons
        name={type === 'success' ? 'checkmark-circle' : 'close-circle'}
        size={20}
        color="#fff"
      />
      <Text style={s.toastText}>{message}</Text>
    </Animated.View>
  );
}

// =============================================================
// THE FIX: Convert any Cloudinary URL to a direct JPG download
//
// Problem: Cloudinary serves AVIF/WebP based on User-Agent header.
//   expo-file-system gets a binary file it cannot identify,
//   and expo-media-library rejects it because it has no valid extension.
//
// Solution: Inject "fl_attachment,f_jpg" into the Cloudinary URL.
//   fl_attachment  -> forces a download response (no CORS issues)
//   f_jpg          -> forces JPG format regardless of client
//   We strip all existing transformations to get the clean original.
// =============================================================
function toCloudinaryJpg(url: string): string {
  if (!url) return '';
  if (!url.includes('cloudinary.com')) return url;
  // Strip everything between /upload/ and the version or folder segment
  // e.g. /upload/w_800,h_800,c_limit/q_auto/v123/... -> /upload/fl_attachment,f_jpg/v123/...
  return url.replace(/\/upload\/(?:[^/]+\/)*(?=v\d|[^v])/, '/upload/fl_attachment,f_jpg/');
}

// =============================================================
// Main Screen
// =============================================================
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [activeImg, setActiveImg] = useState(0);
  const [showCart, setShowCart] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [sellingPrice, setSellingPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const flatRef = useRef<FlatList>(null);

  // Internal toast state
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [toastVisible, setToastVisible] = useState(false);

  const showInternalToast = (message: string, type: 'success' | 'error') => {
    setToastMsg(message);
    setToastType(type);
    setToastVisible(false);
    setTimeout(() => setToastVisible(true), 20);
    setTimeout(() => setToastVisible(false), 3200);
  };

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => { const { data } = await api.get('/api/auth/me'); return data; },
  });

  const CART_KEY = getCartKey(user?.id);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/products/${id}`);
      return data;
    },
  });

  const getImages = (p: any) => {
    const imgs = p.images ? p.images.split(',').filter(Boolean) : [];
    return imgs.length > 0 ? imgs : (p.imageUrl ? [p.imageUrl] : []);
  };

  const getAdLinks = (p: any) => {
    if (!p.adLinks) return [];
    return p.adLinks.split(',').filter(Boolean);
  };

  const hasDiscount = product?.discount > 0;
  const discountedPrice = hasDiscount
    ? product?.wholesalePrice * (1 - product?.discount / 100)
    : product?.wholesalePrice || 0;

  const profit = sellingPrice ? Number(sellingPrice) - discountedPrice : 0;

  // -----------------------------------------------------------
  // Download single image using Cloudinary JPG trick
  // -----------------------------------------------------------
  const downloadSingleImage = async (url: string) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        showInternalToast('يجب منح صلاحية الوصول للصور', 'error');
        return;
      }

      const downloadUrl = toCloudinaryJpg(url);

      // fetch the image as blob then convert to base64 URI
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        showInternalToast('فشل تحميل الصورة ❌', 'error');
        return;
      }

      const blob = await response.blob();
      const reader = new FileReader();

      reader.onloadend = async () => {
        try {
          // reader.result is "data:image/jpeg;base64,..."
          const asset = await MediaLibrary.createAssetAsync(reader.result as string);
          try {
            const album = await MediaLibrary.getAlbumAsync('Tasleem');
            if (album) {
              await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
            } else {
              await MediaLibrary.createAlbumAsync('Tasleem', asset, false);
            }
          } catch (_) { /* album optional */ }
          showInternalToast('تم حفظ الصورة في المعرض ✅', 'success');
        } catch (_) {
          showInternalToast('فشل حفظ الصورة ❌', 'error');
        }
      };

      reader.onerror = () => showInternalToast('فشل تحميل الصورة ❌', 'error');
      reader.readAsDataURL(blob);

    } catch (_) {
      showInternalToast('فشل تحميل الصورة ❌', 'error');
    }
  };

  // -----------------------------------------------------------
  // Download all images
  // -----------------------------------------------------------
  const downloadAllImages = async (imageUrls: string[]) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        showInternalToast('يجب منح صلاحية الوصول للصور', 'error');
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < imageUrls.length; i++) {
        try {
          const downloadUrl = toCloudinaryJpg(imageUrls[i]);
          const resp = await fetch(downloadUrl);
          if (!resp.ok) { failCount++; continue; }
          const blob = await resp.blob();
          await new Promise<void>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = async () => {
              try {
                const asset = await MediaLibrary.createAssetAsync(reader.result as string);
                try {
                  const album = await MediaLibrary.getAlbumAsync('Tasleem');
                  if (album) {
                    await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
                  } else {
                    await MediaLibrary.createAlbumAsync('Tasleem', asset, false);
                  }
                } catch (_) {}
                successCount++;
              } catch (_) { failCount++; }
              resolve();
            };
            reader.onerror = () => { failCount++; resolve(); };
            reader.readAsDataURL(blob);
          });
        } catch (_) {
          failCount++;
        }
      }

      if (failCount === 0) {
        showInternalToast(`تم حفظ ${successCount} صورة في المعرض ✅`, 'success');
      } else if (successCount === 0) {
        showInternalToast('فشل تحميل جميع الصور ❌', 'error');
      } else {
        showInternalToast(`تم ${successCount} وفشل ${failCount} ⚠️`, 'error');
      }
    } catch (_) {
      showInternalToast('حدث خطأ أثناء التحميل ❌', 'error');
    }
  };

  const handleDownload = (images: string[]) => {
    if (images.length === 1) {
      downloadSingleImage(images[0]);
    } else {
      setShowDownloadMenu(true);
    }
  };

  // -----------------------------------------------------------
  // Cart
  // -----------------------------------------------------------
  const addToCart = async () => {
    if (!sellingPrice || Number(sellingPrice) < product.sellingPriceMin) {
      toast.warning('السعر يجب أن يكون أكبر من سعر الجملة');
      return;
    }
    if (!CART_KEY) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }
    try {
      const cartRaw = await AsyncStorage.getItem(CART_KEY);
      const cart = cartRaw ? JSON.parse(cartRaw) : [];
      const existing = cart.findIndex((i: any) => i.productId === product.id);
      if (existing >= 0) {
        cart[existing].quantity += Number(quantity);
        cart[existing].sellingPrice = Number(sellingPrice);
      } else {
        cart.push({
          productId: product.id,
          name: product.name,
          imageUrl: getImages(product)[0] || '',
          wholesalePrice: discountedPrice,
          sellingPrice: Number(sellingPrice),
          quantity: Number(quantity),
        });
      }
      await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));
      toast.success('تمت الإضافة إلى السلة ✅');
      setTimeout(() => router.push('/cart'), 100);
      setShowCart(false);
      setSellingPrice('');
      setQuantity('1');
    } catch {
      toast.error('فشل الإضافة إلى السلة');
    }
  };

  const copyText = (text: string) => {
    Clipboard.setString(text);
    toast.success('تم النسخ ✅');
  };

  const copyProductId = () => {
    Clipboard.setString(String(product.id));
    toast.success('تم نسخ ID المنتج ✅');
  };

  // -----------------------------------------------------------
  // Render
  // -----------------------------------------------------------
  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={s.center}>
        <Text style={s.notFoundText}>المنتج غير موجود</Text>
      </View>
    );
  }

  const images = getImages(product);
  const adLinks = getAdLinks(product);
  const sliderHeight = Math.min(width, 420);

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* Internal Toast */}
      <InternalToast message={toastMsg} type={toastType} visible={toastVisible} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{product.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {/* Image Slider */}
        <View style={[s.sliderBox, { height: sliderHeight }]}>
          <FlatList
            ref={flatRef}
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={e => {
              setActiveImg(Math.round(e.nativeEvent.contentOffset.x / width));
            }}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={{ width, height: sliderHeight }} resizeMode="cover" />
            )}
          />

          {/* Download Button */}
          <TouchableOpacity
            style={s.downloadBtn}
            onPress={() => handleDownload(images)}>
            <Ionicons name="download-outline" size={18} color="#fff" />
          </TouchableOpacity>

          {images.length > 1 && (
            <View style={s.dots}>
              {images.map((_: any, i: number) => (
                <TouchableOpacity
                  key={i}
                  style={[s.dot, i === activeImg && s.dotActive]}
                  onPress={() => {
                    flatRef.current?.scrollToIndex({ index: i, animated: true });
                    setActiveImg(i);
                  }}
                />
              ))}
            </View>
          )}

          {product.isRenewable && (
            <View style={s.renewBadge}>
              <Ionicons name="refresh-outline" size={12} color="#fff" />
              <Text style={s.renewText}>قابل للتجديد</Text>
            </View>
          )}

          {hasDiscount && (
            <View style={s.discountBadge}>
              <Ionicons name="pricetag-outline" size={12} color="#fff" />
              <Text style={s.discountText}>-{product.discount}%</Text>
            </View>
          )}

          <View style={s.imgCounter}>
            <Ionicons name="images-outline" size={12} color="#fff" />
            <Text style={s.imgCounterText}>{activeImg + 1}/{images.length}</Text>
          </View>
        </View>

        <View style={s.content}>
          <Text style={s.name}>{product.name}</Text>

          <View style={s.codeChip}>
            <Ionicons name="barcode-outline" size={16} color={PRIMARY} />
            <Text style={s.productCode}>ID: {product.id}</Text>
            <TouchableOpacity onPress={copyProductId} style={s.copyCodeBtn}>
              <Ionicons name="copy-outline" size={16} color={PRIMARY} />
            </TouchableOpacity>
          </View>

          {(() => {
            const cats = product.category
              ? product.category.split(',').map((c: string) => c.trim()).filter((c: string) => c && c !== 'عام')
              : [];
            return cats.length > 0 ? (
              <View style={s.catPill}>
                <Ionicons name="pricetags-outline" size={12} color={PRIMARY} />
                <Text style={s.catText}>{cats.join('، ')}</Text>
              </View>
            ) : null;
          })()}

          {/* Info Grid */}
          <View style={s.infoGrid}>
            <View style={s.infoBox}>
              <Ionicons name="cube-outline" size={20} color="#9ca3af" />
              <Text style={s.infoLabel}>المخزون</Text>
              <Text style={[s.infoVal, product.stock < 5 && { color: '#ef4444' }]}>
                {product.stock}
              </Text>
            </View>

            <View style={[s.infoBox, s.suggestedBox]}>
              <Ionicons name="trending-up-outline" size={20} color={SUCCESS} />
              <Text style={s.infoLabel}>السعر المقترح</Text>
              <Text style={[s.infoVal, { color: SUCCESS }]}>
                {(product.suggestedPrice || product.wholesalePrice).toLocaleString()}
              </Text>
            </View>

            <View style={s.infoBox}>
              <Ionicons name="pricetag-outline" size={20} color={PRIMARY} />
              <Text style={s.infoLabel}>سعر الجملة</Text>
              <Text style={[s.infoVal, { color: PRIMARY }]}>
                {Math.round(discountedPrice).toLocaleString()}
              </Text>
              {hasDiscount && (
                <Text style={s.oldPrice}>{product.wholesalePrice.toLocaleString()}</Text>
              )}
            </View>
          </View>

          {/* Ad Links */}
          {adLinks.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Ionicons name="link-outline" size={18} color={PRIMARY} />
                <Text style={s.sectionTitle}>الروابط الإعلانية</Text>
              </View>
              {adLinks.map((link: string, i: number) => (
                <TouchableOpacity
                  key={i}
                  style={s.adLink}
                  onPress={() => Linking.openURL(link.trim())}>
                  <Ionicons name="open-outline" size={14} color="#9ca3af" />
                  <Text style={s.adLinkText} numberOfLines={1}>{link.trim()}</Text>
                  <Ionicons name="link-outline" size={16} color={PRIMARY} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Description */}
          {product.description && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <TouchableOpacity onPress={() => copyText(product.description)} style={s.copyBtn}>
                  <Ionicons name="copy-outline" size={18} color={PRIMARY} />
                </TouchableOpacity>
                <Ionicons name="document-text-outline" size={18} color={PRIMARY} />
                <Text style={s.sectionTitle}>المواصفات</Text>
              </View>
              <Text style={s.description}>{product.description}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Float Button */}
      <View style={s.floatWrapper}>
        <TouchableOpacity style={s.floatBtn} onPress={() => setShowCart(true)}>
          <Ionicons name="cart-outline" size={20} color="#fff" />
          <Text style={s.floatBtnText}>إضافة إلى السلة</Text>
        </TouchableOpacity>
      </View>

      {/* Download Menu Modal */}
      <Modal visible={showDownloadMenu} transparent animationType="fade">
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDownloadMenu(false)}>
          <View style={s.downloadMenuCard}>
            <Text style={s.downloadMenuTitle}>تحميل الصور</Text>

            <TouchableOpacity
              style={s.downloadMenuItem}
              onPress={() => {
                setShowDownloadMenu(false);
                downloadSingleImage(images[activeImg]);
              }}>
              <Ionicons name="image-outline" size={20} color={PRIMARY} />
              <Text style={s.downloadMenuText}>تحميل هذه الصورة</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.downloadMenuItem}
              onPress={() => {
                setShowDownloadMenu(false);
                downloadAllImages(images);
              }}>
              <Ionicons name="images-outline" size={20} color={PRIMARY} />
              <Text style={s.downloadMenuText}>تحميل جميع الصور ({images.length})</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.downloadMenuItem, s.downloadMenuCancel]}
              onPress={() => setShowDownloadMenu(false)}>
              <Text style={s.downloadMenuCancelText}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Cart Modal */}
      <Modal visible={showCart} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setShowCart(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={s.modalTitle}>تحديد السعر والكمية</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.inputLabel}>سعر البيع (د.ع) *</Text>
              <View style={s.priceInputBox}>
                <View style={s.profitBox}>
                  <Text style={[s.profitVal, { color: profit >= 0 ? SUCCESS : '#ef4444' }]}>
                    {profit > 0 ? '+' : ''}{Math.round(profit).toLocaleString()}
                  </Text>
                  <Text style={s.profitLabel}>الربح</Text>
                </View>
                <TextInput
                  style={s.priceInput}
                  placeholder={`الحد الأدنى: ${Math.round(product?.sellingPriceMin || 0).toLocaleString()} د.ع`}
                  value={sellingPrice}
                  onChangeText={setSellingPrice}
                  keyboardType="numeric"
                  textAlign="right"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <Text style={s.inputLabel}>الكمية</Text>
              <View style={s.qtyRow}>
                <TouchableOpacity
                  style={s.qtyBtn}
                  onPress={() => setQuantity(q => String(Math.max(1, Number(q) - 1)))}>
                  <Ionicons name="remove" size={20} color={PRIMARY} />
                </TouchableOpacity>
                <Text style={s.qtyVal}>{quantity}</Text>
                <TouchableOpacity
                  style={s.qtyBtn}
                  onPress={() => {
                    const newQty = Number(quantity) + 1;
                    if (newQty <= product.stock) {
                      setQuantity(String(newQty));
                    } else {
                      toast.warning(`المخزون المتوفر: ${product.stock}`);
                    }
                  }}>
                  <Ionicons name="add" size={20} color={PRIMARY} />
                </TouchableOpacity>
              </View>

              <View style={s.summary}>
                <View style={s.summaryRow}>
                  <Text style={s.summaryVal}>{Math.round(discountedPrice).toLocaleString()} د.ع</Text>
                  <Text style={s.summaryLabel}>سعر الجملة</Text>
                </View>
                {sellingPrice && (
                  <View style={s.summaryRow}>
                    <Text style={s.summaryVal}>{Number(sellingPrice).toLocaleString()} د.ع</Text>
                    <Text style={s.summaryLabel}>سعر البيع</Text>
                  </View>
                )}
                <View style={[s.summaryRow, s.summaryTotal]}>
                  <Text style={[s.summaryVal, { color: profit >= 0 ? SUCCESS : '#ef4444', fontWeight: 'bold', fontSize: 16 }]}>
                    {Math.round(profit).toLocaleString()} د.ع
                  </Text>
                  <Text style={[s.summaryLabel, { fontWeight: 'bold' }]}>صافي الربح</Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={s.addBtn} onPress={addToCart}>
              <Ionicons name="cart-outline" size={20} color="#fff" />
              <Text style={s.addBtnText}>إضافة إلى السلة</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { fontSize: 16, color: '#9ca3af' },
  scrollContent: { paddingBottom: 100 },

  // Internal Toast
  internalToast: {
    position: 'absolute',
    top: 70,
    left: 16,
    right: 16,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  toastSuccess: { backgroundColor: '#10b981' },
  toastError: { backgroundColor: '#ef4444' },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '700', flex: 1, textAlign: 'right' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
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
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },

  // Slider
  sliderBox: { position: 'relative', backgroundColor: '#f3f4f6' },
  downloadBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { width: 18, backgroundColor: '#fff' },
  renewBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#166534',
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  renewText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  discountBadge: {
    position: 'absolute',
    top: 48,
    right: 12,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  discountText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  imgCounter: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  imgCounterText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  // Content
  content: { padding: 16 },
  name: { fontSize: 20, fontWeight: 'bold', color: '#111827', textAlign: 'right', marginBottom: 8 },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PRIMARY + '15',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 4,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  productCode: { fontSize: 13, color: PRIMARY, fontWeight: '600', letterSpacing: 1 },
  copyCodeBtn: { padding: 4, borderRadius: 16 },
  catPill: {
    backgroundColor: PRIMARY + '15',
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 4,
    alignSelf: 'flex-end',
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  catText: { fontSize: 11, color: PRIMARY, fontWeight: 'bold' },

  // Info Grid
  infoGrid: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  infoBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 10,
  },
  suggestedBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  infoLabel: { fontSize: 11, color: '#9ca3af', marginTop: 4, marginBottom: 2 },
  infoVal: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  oldPrice: { fontSize: 10, color: '#9ca3af', textDecorationLine: 'line-through', marginTop: 2 },

  // Section
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e8edf2',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#111827', marginRight: 4 },
  copyBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: PRIMARY + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  description: { fontSize: 13, color: '#374151', lineHeight: 21, textAlign: 'right' },
  adLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 9,
    padding: 9,
    marginBottom: 7,
  },
  adLinkText: { flex: 1, fontSize: 12, color: PRIMARY, textAlign: 'right' },

  // Float Button
  floatWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 20,
  },
  floatBtn: {
    height: 52,
    backgroundColor: PRIMARY,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: PRIMARY,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  floatBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  // Download Menu
  downloadMenuCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    margin: 32,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  downloadMenuTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  downloadMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  downloadMenuText: { fontSize: 14, color: '#111827', fontWeight: '500', flex: 1, textAlign: 'right' },
  downloadMenuCancel: { borderBottomWidth: 0, justifyContent: 'center' },
  downloadMenuCancelText: { fontSize: 14, color: '#ef4444', fontWeight: '600', textAlign: 'center', flex: 1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#111827' },
  inputLabel: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'right',
    marginBottom: 7,
    marginTop: 10,
    fontWeight: '600',
  },
  priceInputBox: { flexDirection: 'row', gap: 9 },
  priceInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e8edf2',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f8fafc',
  },
  profitBox: {
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  profitVal: { fontSize: 15, fontWeight: 'bold' },
  profitLabel: { fontSize: 10, color: '#6b7280' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  qtyBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: PRIMARY + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyVal: { fontSize: 22, fontWeight: 'bold', color: '#111827', minWidth: 36, textAlign: 'center' },
  summary: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, marginTop: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  summaryTotal: { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8, marginTop: 4 },
  summaryLabel: { fontSize: 12, color: '#6b7280' },
  summaryVal: { fontSize: 13, color: '#111827', fontWeight: '600' },
  addBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
