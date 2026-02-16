import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Image, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';

const STATUS_LABELS: any = {
  pending: { label: 'قيد الانتظار', color: '#f59e0b', bg: '#fffbeb' },
  processing: { label: 'قيد المعالجة', color: '#3b82f6', bg: '#eff6ff' },
  delivered: { label: 'تم التسليم', color: '#10b981', bg: '#ecfdf5' },
  returned: { label: 'مرتجع', color: '#ef4444', bg: '#fef2f2' },
};

export default function AdminScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'users'>('orders');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '', description: '', wholesalePrice: '',
    sellingPriceMin: '', category: 'إلكترونيات', imageUrl: '', stock: '10'
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => { const { data } = await api.get('/api/orders'); return data; },
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => { const { data } = await api.get('/api/products'); return data; },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => { const { data } = await api.get('/api/admin/users'); return data; },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: any) => {
      const { data } = await api.patch(`/api/orders/${id}/status`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('تم تحديث حالة الطلب');
    },
  });

  const addProduct = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/api/products', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('تم إضافة المنتج بنجاح');
      setShowAddProduct(false);
      setProductForm({ name: '', description: '', wholesalePrice: '', sellingPriceMin: '', category: 'إلكترونيات', imageUrl: '', stock: '10' });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'فشل إضافة المنتج'),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/api/products/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.info('تم حذف المنتج');
    },
  });

  const handleAddProduct = () => {
    if (!productForm.name || !productForm.wholesalePrice || !productForm.sellingPriceMin) {
      toast.warning('يرجى ملء الحقول المطلوبة'); return;
    }
    addProduct.mutate({
      name: productForm.name,
      description: productForm.description,
      wholesalePrice: Number(productForm.wholesalePrice),
      sellingPriceMin: Number(productForm.sellingPriceMin),
      category: productForm.category,
      imageUrl: productForm.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
      stock: Number(productForm.stock),
    });
  };

  const TABS = [
    { key: 'orders', label: 'الطلبات', icon: 'bag-outline', count: orders.length },
    { key: 'products', label: 'المنتجات', icon: 'cube-outline', count: products.length },
    { key: 'users', label: 'المستخدمين', icon: 'people-outline', count: users.length },
  ];

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Ionicons name="shield-checkmark-outline" size={24} color={PRIMARY} />
        <Text style={s.title}>لوحة الإدارة</Text>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={[s.tab, activeTab === t.key && s.tabActive]}
            onPress={() => setActiveTab(t.key as any)}>
            <Ionicons name={t.icon as any} size={18}
              color={activeTab === t.key ? PRIMARY : '#9ca3af'} />
            <Text style={[s.tabText, activeTab === t.key && s.tabTextActive]}>{t.label}</Text>
            <View style={[s.tabBadge, activeTab === t.key && { backgroundColor: PRIMARY }]}>
              <Text style={[s.tabBadgeText, activeTab === t.key && { color: '#fff' }]}>{t.count}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Orders */}
        {activeTab === 'orders' && (
          ordersLoading ? <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} /> :
          orders.map((order: any) => (
            <View key={order.id} style={s.orderCard}>
              <View style={s.orderTop}>
                <View style={[s.statusBadge, { backgroundColor: STATUS_LABELS[order.status]?.bg }]}>
                  <Text style={[s.statusText, { color: STATUS_LABELS[order.status]?.color }]}>
                    {STATUS_LABELS[order.status]?.label}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.orderId}>طلب #{order.id}</Text>
                  <Text style={s.orderDate}>
                    {new Date(order.createdAt).toLocaleDateString('ar-IQ')}
                  </Text>
                </View>
              </View>
              <View style={s.orderInfo}>
                <Text style={s.orderCustomer}>{order.customerName}</Text>
                <Text style={s.orderPhone}>{order.customerPhone}</Text>
                <Text style={s.orderAddress}>{order.province} — {order.address}</Text>
              </View>
              <View style={s.orderBottom}>
                <Text style={s.orderProfit}>ربح: {order.totalProfit?.toLocaleString()} د.ع</Text>
                <Text style={s.orderTotal}>{order.totalAmount?.toLocaleString()} د.ع</Text>
              </View>
              <View style={s.statusButtons}>
                {['pending','processing','delivered','returned'].map(status => (
                  <TouchableOpacity key={status}
                    style={[s.statusBtn,
                      order.status === status && { backgroundColor: STATUS_LABELS[status]?.color }]}
                    onPress={() => updateStatus.mutate({ id: order.id, status })}>
                    <Text style={[s.statusBtnText,
                      order.status === status && { color: '#fff' }]}>
                      {STATUS_LABELS[status]?.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))
        )}

        {/* Products */}
        {activeTab === 'products' && (
          <>
            <TouchableOpacity style={s.addBtn} onPress={() => setShowAddProduct(true)}>
              <Ionicons name="add-circle-outline" size={22} color="#fff" />
              <Text style={s.addBtnText}>إضافة منتج جديد</Text>
            </TouchableOpacity>
            {productsLoading ? <ActivityIndicator color={PRIMARY} style={{ marginTop: 40 }} /> :
            products.map((p: any) => (
              <View key={p.id} style={s.productCard}>
                <Image source={{ uri: p.imageUrl }} style={s.productImg} resizeMode="cover" />
                <View style={s.productInfo}>
                  <Text style={s.productName}>{p.name}</Text>
                  <Text style={s.productCat}>{p.category}</Text>
                  <Text style={s.productPrice}>جملة: {p.wholesalePrice?.toLocaleString()} د.ع</Text>
                  <Text style={s.productPrice}>أدنى بيع: {p.sellingPriceMin?.toLocaleString()} د.ع</Text>
                </View>
                <TouchableOpacity style={s.deleteBtn}
                  onPress={() => deleteProduct.mutate(p.id)}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {/* Users */}
        {activeTab === 'users' && users.map((u: any) => (
          <View key={u.id} style={s.userCard}>
            <View style={s.userAvatar}>
              <Text style={s.userAvatarText}>{u.storeName?.substring(0, 1)}</Text>
            </View>
            <View style={s.userInfo}>
              <Text style={s.userName}>{u.storeName}</Text>
              <Text style={s.userPhone}>{u.phone}</Text>
              <Text style={s.userId}>ID: {u.merchantId}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.userBalance}>{u.balance?.toLocaleString()} د.ع</Text>
              <Text style={s.userBalanceLabel}>الرصيد</Text>
              <View style={[s.roleBadge, u.role === 'admin' && { backgroundColor: '#fef3c7' }]}>
                <Text style={[s.roleText, u.role === 'admin' && { color: '#d97706' }]}>
                  {u.role === 'admin' ? 'مدير' : 'تاجر'}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Add Product Modal */}
      <Modal visible={showAddProduct} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>إضافة منتج جديد</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { label: 'اسم المنتج *', key: 'name', placeholder: 'اسم المنتج' },
                { label: 'الوصف', key: 'description', placeholder: 'وصف المنتج' },
                { label: 'سعر الجملة *', key: 'wholesalePrice', placeholder: '0', keyboard: 'numeric' },
                { label: 'أدنى سعر بيع *', key: 'sellingPriceMin', placeholder: '0', keyboard: 'numeric' },
                { label: 'التصنيف', key: 'category', placeholder: 'إلكترونيات' },
                { label: 'رابط الصورة', key: 'imageUrl', placeholder: 'https://...' },
                { label: 'المخزون', key: 'stock', placeholder: '10', keyboard: 'numeric' },
              ].map(field => (
                <View key={field.key}>
                  <Text style={s.inputLabel}>{field.label}</Text>
                  <TextInput
                    style={s.modalInput}
                    placeholder={field.placeholder}
                    value={(productForm as any)[field.key]}
                    onChangeText={(v) => setProductForm(prev => ({ ...prev, [field.key]: v }))}
                    keyboardType={(field as any).keyboard || 'default'}
                    textAlign="right"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={s.confirmBtn} onPress={handleAddProduct}
              disabled={addProduct.isPending}>
              {addProduct.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.confirmText}>إضافة المنتج</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowAddProduct(false)}>
              <Text style={s.cancelText}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16,
    paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tab: { flex: 1, flexDirection: 'column', alignItems: 'center', gap: 4,
    paddingVertical: 8, borderRadius: 12, backgroundColor: '#f9fafb' },
  tabActive: { backgroundColor: `${'#0c6679'}12` },
  tabText: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
  tabTextActive: { color: '#0c6679', fontWeight: '700' },
  tabBadge: { backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  tabBadgeText: { fontSize: 10, color: '#9ca3af', fontWeight: 'bold' },
  orderCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16,
    marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderId: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  orderDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  orderInfo: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, marginBottom: 12 },
  orderCustomer: { fontSize: 14, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  orderPhone: { fontSize: 13, color: '#6b7280', textAlign: 'right', marginTop: 2 },
  orderAddress: { fontSize: 12, color: '#9ca3af', textAlign: 'right', marginTop: 4 },
  orderBottom: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  orderTotal: { fontSize: 16, fontWeight: 'bold', color: '#0c6679' },
  orderProfit: { fontSize: 13, color: '#16a34a', fontWeight: '600' },
  statusButtons: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  statusBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  statusBtnText: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  addBtn: { backgroundColor: '#0c6679', borderRadius: 16, height: 52,
    flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center',
    gap: 8, marginBottom: 16 },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  productCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14,
    flexDirection: 'row-reverse', gap: 12, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  productImg: { width: 70, height: 70, borderRadius: 12 },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  productCat: { fontSize: 12, color: '#0c6679', textAlign: 'right', marginTop: 2 },
  productPrice: { fontSize: 12, color: '#6b7280', textAlign: 'right', marginTop: 2 },
  deleteBtn: { width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' },
  userCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  userAvatar: { width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#0c667915', justifyContent: 'center', alignItems: 'center' },
  userAvatarText: { fontSize: 20, fontWeight: 'bold', color: '#0c6679' },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  userPhone: { fontSize: 13, color: '#6b7280', textAlign: 'right' },
  userId: { fontSize: 11, color: '#9ca3af', textAlign: 'right' },
  userBalance: { fontSize: 15, fontWeight: 'bold', color: '#0c6679' },
  userBalanceLabel: { fontSize: 11, color: '#9ca3af' },
  roleBadge: { backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  roleText: { fontSize: 11, color: '#16a34a', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', textAlign: 'right', marginBottom: 16 },
  inputLabel: { fontSize: 13, color: '#374151', textAlign: 'right', marginBottom: 6, marginTop: 10 },
  modalInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 12, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb' },
  confirmBtn: { backgroundColor: '#0c6679', borderRadius: 14, height: 50,
    justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  confirmText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cancelBtn: { height: 44, justifyContent: 'center', alignItems: 'center' },
  cancelText: { color: '#9ca3af', fontSize: 14 },
});
