import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, ActivityIndicator, TextInput, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sellingPrice, setSellingPrice] = useState('');
  const [showDialog, setShowDialog] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/products/${id}`);
      return data;
    },
  });

  const profit = product && Number(sellingPrice) > 0
    ? Number(sellingPrice) - product.wholesalePrice : 0;

  const handleAddToCart = async () => {
    if (!product) return;
    const minPrice = product.wholesalePrice + 1000;
    if (Number(sellingPrice) < minPrice) {
      toast.error(
        `يجب أن يكون سعر البيع ${minPrice.toLocaleString()} د.ع أو أكثر`,
        'خطأ في السعر'
      );
      return;
    }
    const raw = await AsyncStorage.getItem('cart');
    const cart = raw ? JSON.parse(raw) : [];
    const exists = cart.findIndex((i: any) => i.product.id === product.id);
    if (exists >= 0) {
      cart[exists].quantity += 1;
      cart[exists].sellingPrice = Number(sellingPrice);
    } else {
      cart.push({ product, sellingPrice: Number(sellingPrice), quantity: 1 });
    }
    await AsyncStorage.setItem('cart', JSON.stringify(cart));
    queryClient.invalidateQueries({ queryKey: ['cart'] });
    setShowDialog(false);
    toast.success(`تمت إضافة ${product.name} إلى السلة`, 'تمت الإضافة للسلة 🛒');
  };

  if (isLoading) return (
    <View style={s.center}><ActivityIndicator size="large" color={PRIMARY} /></View>
  );
  if (!product) return (
    <View style={s.center}><Text style={{ color: '#9ca3af' }}>المنتج غير موجود</Text></View>
  );

  const minPrice = product.wholesalePrice + 1000;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-forward" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>تفاصيل المنتج</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={s.imgBox}>
          <Image source={{ uri: product.imageUrl }}
            style={s.img} resizeMode="cover" />
        </View>

        <View style={s.body}>
          <View style={s.metaRow}>
            <View style={s.infoChip}>
              <Ionicons name="information-circle-outline" size={14} color="#6b7280" />
              <Text style={s.infoChipText}>
                رمز المنتج: #{product.id.toString().padStart(6, '0')}
              </Text>
            </View>
            <View style={s.catChip}>
              <Text style={s.catChipText}>{product.category}</Text>
            </View>
          </View>

          <Text style={s.name}>{product.name}</Text>
          <Text style={s.desc}>{product.description}</Text>

          <View style={s.priceBox}>
            <View style={s.priceRow}>
              <Text style={s.priceVal}>{product.wholesalePrice.toLocaleString()} د.ع</Text>
              <Text style={s.priceLabel}>سعر الجملة</Text>
            </View>
            <View style={s.priceRow}>
              <Text style={[s.priceVal, { color: PRIMARY }]}>
                {product.sellingPriceMin.toLocaleString()} د.ع
              </Text>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                <Ionicons name="calculator-outline" size={13} color="#9ca3af" />
                <Text style={s.priceLabel}>أقل سعر بيع مقترح</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={s.addBtn} onPress={() => setShowDialog(true)}>
            <Ionicons name="cart-outline" size={22} color="#fff" />
            <Text style={s.addBtnText}>🛒 أضف للسلة</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showDialog} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>إضافة إلى السلة</Text>
            <View style={s.dialogRow}>
              <View style={s.profitChip}>
                <Text style={s.profitChipLabel}>صافي الربح المتوقع</Text>
                <Text style={s.profitChipVal}>
                  {profit > 0 ? profit.toLocaleString() : 0} د.ع
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.inputLabel}>
                  سعر البيع (د.ع) <Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <TextInput style={s.priceInput}
                  placeholder={minPrice.toString()}
                  value={sellingPrice} onChangeText={setSellingPrice}
                  keyboardType="numeric" textAlign="right"
                  placeholderTextColor="#9ca3af" />
                <Text style={s.inputHint}>
                  يجب أن يكون السعر {minPrice.toLocaleString()} د.ع أو أكثر
                </Text>
              </View>
            </View>
            <TouchableOpacity style={s.confirmBtn} onPress={handleAddToCart}>
              <Text style={s.confirmBtnText}>إضافة للسلة</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowDialog(false)}>
              <Text style={s.cancelBtnText}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  imgBox: { backgroundColor: '#f3f4f6', width: '100%', aspectRatio: 1 },
  img: { width: '100%', height: '100%' },
  body: { padding: 20 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12 },
  catChip: { backgroundColor: `${PRIMARY}18`, paddingHorizontal: 14,
    paddingVertical: 6, borderRadius: 20 },
  catChipText: { color: PRIMARY, fontSize: 13, fontWeight: 'bold' },
  infoChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  infoChipText: { fontSize: 12, color: '#6b7280' },
  name: { fontSize: 26, fontWeight: 'bold', color: '#111827',
    textAlign: 'right', marginBottom: 12 },
  desc: { fontSize: 15, color: '#6b7280', lineHeight: 26,
    textAlign: 'right', marginBottom: 24 },
  priceBox: { backgroundColor: '#f9fafb', borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: '#f3f4f6', marginBottom: 24, gap: 12 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 13, color: '#9ca3af' },
  priceVal: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  addBtn: { backgroundColor: PRIMARY, borderRadius: 16, height: 56,
    flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 10,
    shadowColor: PRIMARY, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  addBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 28,
    borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827',
    textAlign: 'right', marginBottom: 20 },
  dialogRow: { flexDirection: 'row-reverse', gap: 12, marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '500', color: '#374151',
    textAlign: 'right', marginBottom: 6 },
  priceInput: { borderWidth: 1.5, borderColor: `${PRIMARY}40`, borderRadius: 12,
    padding: 12, fontSize: 18, color: '#111827', backgroundColor: '#f9fafb' },
  inputHint: { fontSize: 10, color: '#9ca3af', textAlign: 'right', marginTop: 4 },
  profitChip: { backgroundColor: '#f0fdf4', borderRadius: 14, borderWidth: 1,
    borderColor: '#bbf7d0', padding: 12, justifyContent: 'center',
    alignItems: 'center', minWidth: 110 },
  profitChipLabel: { fontSize: 11, color: '#16a34a', marginBottom: 6 },
  profitChipVal: { fontSize: 18, fontWeight: 'bold', color: '#15803d' },
  confirmBtn: { backgroundColor: PRIMARY, borderRadius: 14, height: 50,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  confirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cancelBtn: { height: 44, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { color: '#9ca3af', fontSize: 14 },
});
