import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, FlatList, Image,
  Clipboard, Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const SUCCESS = '#10b981';
const DANGER  = '#ef4444';

const STATUS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:    { label: 'قيد الانتظار', color: '#f59e0b', bg: '#fffbeb', icon: 'time-outline' },
  processing: { label: 'قيد المعالجة', color: '#3b82f6', bg: '#eff6ff', icon: 'sync-outline' },
  preparing:  { label: 'قيد التجهيز',  color: '#8b5cf6', bg: '#f5f3ff', icon: 'cube-outline' },
  shipping:   { label: 'قيد التوصيل', color: '#06b6d4', bg: '#ecfeff', icon: 'bicycle-outline' },
  delivered:  { label: 'تم التوصيل',  color: '#10b981', bg: '#ecfdf5', icon: 'checkmark-circle-outline' },
  cancelled:  { label: 'ملغي',         color: '#ef4444', bg: '#fef2f2', icon: 'close-circle-outline' },
  returned:   { label: 'راجع',          color: '#f97316', bg: '#fff7ed', icon: 'arrow-undo-outline' },
  postponed:  { label: 'مؤجل',         color: '#6b7280', bg: '#f9fafb', icon: 'pause-circle-outline' },
};

const FILTERS = [
  { key: 'all',        label: 'الكل' },
  { key: 'pending',    label: 'انتظار' },
  { key: 'processing', label: 'معالجة' },
  { key: 'preparing',  label: 'تجهيز' },
  { key: 'shipping',   label: 'توصيل' },
  { key: 'delivered',  label: 'مُسلَّم' },
  { key: 'cancelled',  label: 'ملغي' },
  { key: 'returned',   label: 'راجع' },
  { key: 'postponed',  label: 'مؤجل' },
];

const getFirstImage = (product: any) => {
  if (!product) return null;
  const imgs = product.images ? product.images.split(',').filter(Boolean) : [];
  return imgs.length > 0 ? imgs[0] : (product.imageUrl || null);
};

export default function OrdersTab() {
  const qc = useQueryClient();
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState('all');
  const [expanded, setExpanded]     = useState<number | null>(null);
  const [dropdownId, setDropdownId] = useState<number | null>(null);
  const [editOrder, setEditOrder]   = useState<any>(null);
  const [editForm, setEditForm]     = useState<any>({});

  const {
    data: ordersData,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['admin-orders', filter, search],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: '20',
        ...(filter !== 'all' && { status: filter }),
        ...(search && { search }),
      });
      const { data } = await api.get(`/api/orders?${params}`);
      return data;
    },
    getNextPageParam: (last: any) => last.hasMore ? last.page + 1 : undefined,
    initialPageParam: 1,
    refetchInterval: 30000,
  });

  const orders = ordersData?.pages.flatMap((p: any) => p.data) ?? [];
  const total  = ordersData?.pages[0]?.total ?? 0;

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
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      setDropdownId(null);
      toast.success('تم تحديث الحالة');
    },
    onError: () => toast.error('فشل تحديث الحالة'),
  });

  const updateOrder = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const res = await api.put(`/api/orders/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      setEditOrder(null);
      toast.success('تم تعديل الطلب');
    },
    onError: () => toast.error('فشل تعديل الطلب'),
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: number) => { await api.delete(`/api/orders/${id}`); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('تم حذف الطلب');
    },
    onError: () => toast.error('فشل حذف الطلب'),
  });

  const getMerchant = (merchantId: number) =>
    users.find((u: any) => u.id === merchantId);

  const copy = (text: string, label: string) => {
    Clipboard.setString(text ?? '');
    toast.success(`تم نسخ ${label}`);
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    const dt = new Date(d);
    const date = dt.toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
    const time = dt.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
    return `${date}  ${time}`;
  };

  const openEdit = (o: any) => {
    setEditForm({
      customerName:  o.customerName  || '',
      customerPhone: o.customerPhone || '',
      province:      o.province      || '',
      address:       o.address       || '',
      notes:         o.notes         || '',
      items: (o.items || []).map((i: any) => ({
        productId:   i.productId,
        productName: i.product?.name || `منتج #${i.productId}`,
        quantity:    String(i.quantity),
        price:       String(i.price),
      })),
    });
    setEditOrder(o);
  };

  const confirmDelete = (o: any) => {
    Alert.alert(
      'حذف الطلب',
      `هل أنت متأكد من حذف الطلب #${o.id}؟\nلا يمكن التراجع عن هذا الإجراء.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف', style: 'destructive', onPress: () => deleteOrder.mutate(o.id) },
      ]
    );
  };

  const handleSaveEdit = () => {
    if (!editForm.customerName.trim()) { toast.warning('يرجى إدخال اسم الزبون'); return; }
    if (!editForm.customerPhone.trim()) { toast.warning('يرجى إدخال رقم الهاتف'); return; }
    const items = editForm.items.map((i: any) => ({
      productId: i.productId,
      quantity:  Number(i.quantity),
      price:     Number(i.price),
    }));
    updateOrder.mutate({ id: editOrder.id, data: { ...editForm, items } });
  };

  const filtered = orders;

  const counts: Record<string, number> = {};
  Object.keys(STATUS).forEach(k => {
    counts[k] = orders.filter((o: any) => o.status === k).length;
  });

  if (isLoading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={PRIMARY} />
      <Text style={s.loadingTxt}>جاري تحميل الطلبات...</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>

      {/* شريط البحث والفلاتر */}
      <View style={s.topBar}>
        <View style={s.searchRow}>
          <Ionicons name="search-outline" size={17} color="#9ca3af" />
          <TextInput
            style={s.searchInput}
            placeholder="ابحث برقم الطلب أو اسم الزبون..."
            value={search} onChangeText={setSearch}
            placeholderTextColor="#9ca3af" textAlign="right"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color="#9ca3af" />
            </TouchableOpacity>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[s.chip, filter === f.key && s.chipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[s.chipTxt, filter === f.key && s.chipTxtActive]}>{f.label}</Text>
              {f.key !== 'all' && counts[f.key] > 0 && (
                <View style={[s.chipBadge, filter === f.key && s.chipBadgeActive]}>
                  <Text style={[s.chipBadgeTxt, filter === f.key && s.chipBadgeTxtActive]}>
                    {counts[f.key]}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* قائمة الطلبات */}
      <FlatList
        data={filtered}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.center}>
            <Ionicons name="bag-outline" size={52} color="#d1d5db" />
            <Text style={s.emptyTxt}>لا توجد طلبات</Text>
          </View>
        }
        renderItem={({ item: o }) => {
          const st       = STATUS[o.status] || STATUS.pending;
          const merchant = getMerchant(o.merchantId);
          const isOpen   = expanded === o.id;
          const items    = o.items || [];

          return (
            <View style={s.card}>

              {/* رأس الكارد */}
              <View style={s.cardHeader}>
                <View style={s.orderIdRow}>
                  <Text style={s.orderId}>#{o.id}</Text>
                  <View style={s.dateRow}>
                    <Ionicons name="time-outline" size={12} color="#9ca3af" />
                    <Text style={s.dateTxt}>{formatDate(o.createdAt)}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[s.statusPill, { backgroundColor: st.bg }]}
                  onPress={() => setDropdownId(dropdownId === o.id ? null : o.id)}
                >
                  <Ionicons name="chevron-down" size={11} color={st.color} />
                  <Ionicons name={st.icon} size={13} color={st.color} />
                  <Text style={[s.statusTxt, { color: st.color }]}>{st.label}</Text>
                </TouchableOpacity>
              </View>

              {/* أزرار التعديل والحذف */}
              <View style={s.actionRow}>
                <TouchableOpacity style={s.deleteBtn} onPress={() => confirmDelete(o)}>
                  <Ionicons name="trash-outline" size={14} color={DANGER} />
                  <Text style={[s.actionBtnTxt, { color: DANGER }]}>حذف</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.editBtn} onPress={() => openEdit(o)}>
                  <Ionicons name="create-outline" size={14} color={PRIMARY} />
                  <Text style={[s.actionBtnTxt, { color: PRIMARY }]}>تعديل</Text>
                </TouchableOpacity>
              </View>

              {/* Dropdown الحالات */}
              {dropdownId === o.id && (
                <View style={s.dropdown}>
                  {Object.entries(STATUS).map(([key, val]) => (
                    <TouchableOpacity
                      key={key}
                      style={[s.dropdownItem, o.status === key && { backgroundColor: val.color + '15' }]}
                      onPress={() => {
                        if (o.status === key) { setDropdownId(null); return; }
                        updateStatus.mutate({ id: o.id, status: key });
                      }}
                      disabled={updateStatus.isPending}
                    >
                      <Ionicons name={val.icon} size={14} color={val.color} />
                      <Text style={[s.dropdownTxt, { color: o.status === key ? val.color : '#374151' }]}>
                        {val.label}
                      </Text>
                      {o.status === key && <Ionicons name="checkmark-circle" size={14} color={val.color} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={s.divider} />

              {/* معلومات الزبون */}
              <View style={s.section}>
                <View style={s.sectionLabelRow}>
                  <Ionicons name="person-outline" size={13} color={PRIMARY} />
                  <Text style={s.sectionLabel}>الزبون</Text>
                </View>
                <View style={s.infoBlock}>
                  <View style={s.infoLine}>
                    <TouchableOpacity style={s.copyBtn} onPress={() => copy(o.customerName, 'الاسم')}>
                      <Ionicons name="copy-outline" size={13} color={PRIMARY} />
                    </TouchableOpacity>
                    <Text style={s.infoVal}>{o.customerName}</Text>
                  </View>
                  <View style={s.infoLine}>
                    <TouchableOpacity style={s.copyBtn} onPress={() => copy(o.customerPhone, 'رقم الهاتف')}>
                      <Ionicons name="copy-outline" size={13} color={PRIMARY} />
                    </TouchableOpacity>
                    <Text style={s.infoSub}>{o.customerPhone}</Text>
                  </View>
                  {(o.province || o.address) && (
                    <View style={s.infoLine}>
                      <TouchableOpacity style={s.copyBtn} onPress={() => copy(`${o.province} - ${o.address}`, 'العنوان')}>
                        <Ionicons name="copy-outline" size={13} color={PRIMARY} />
                      </TouchableOpacity>
                      <Text style={s.infoSub}>{o.province}{o.address ? ` — ${o.address}` : ''}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* معلومات التاجر */}
              {merchant && (
                <>
                  <View style={s.divider} />
                  <View style={s.section}>
                    <View style={s.sectionLabelRow}>
                      <Ionicons name="storefront-outline" size={13} color="#8b5cf6" />
                      <Text style={[s.sectionLabel, { color: '#8b5cf6' }]}>التاجر</Text>
                    </View>
                    <View style={s.infoBlock}>
                      <View style={s.infoLine}>
                        <Text style={s.infoVal}>{merchant.storeName || merchant.name}</Text>
                      </View>
                      {merchant.phone && (
                        <View style={s.infoLine}>
                          <TouchableOpacity style={s.copyBtn} onPress={() => copy(merchant.phone, 'هاتف التاجر')}>
                            <Ionicons name="copy-outline" size={13} color="#8b5cf6" />
                          </TouchableOpacity>
                          <Text style={s.infoSub}>{merchant.phone}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </>
              )}

              {/* الأسعار */}
              <View style={s.divider} />
              <View style={s.priceRow}>
                <View style={s.priceBox}>
                  <Text style={s.priceLabel}>إجمالي الطلب</Text>
                  <Text style={[s.priceVal, { color: PRIMARY }]}>
                    {o.totalAmount?.toLocaleString() ?? '—'} د.ع
                  </Text>
                </View>
                <View style={s.priceDivider} />
                <View style={s.priceBox}>
                  <Text style={s.priceLabel}>التوصيل</Text>
                  <Text style={[s.priceVal, { color: '#06b6d4' }]}>
                    {o.shippingCost?.toLocaleString() ?? '—'} د.ع
                  </Text>
                </View>
                <View style={s.priceDivider} />
                <View style={s.priceBox}>
                  <Text style={s.priceLabel}>الربح</Text>
                  <Text style={[s.priceVal, { color: SUCCESS }]}>
                    {o.totalProfit?.toLocaleString() ?? '—'} د.ع
                  </Text>
                </View>
              </View>

              {/* زر التفاصيل */}
              <TouchableOpacity
                style={s.expandBtn}
                onPress={() => setExpanded(isOpen ? null : o.id)}
              >
                <Ionicons name={isOpen ? 'chevron-up-outline' : 'chevron-down-outline'} size={15} color={PRIMARY} />
                <Text style={s.expandTxt}>{isOpen ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}</Text>
              </TouchableOpacity>

              {/* التفاصيل الموسعة */}
              {isOpen && (
                <View style={s.details}>
                  {items.length > 0 && (
                    <View style={s.itemsBox}>
                      <View style={s.sectionLabelRow}>
                        <Ionicons name="cube-outline" size={13} color={PRIMARY} />
                        <Text style={s.sectionLabel}>المنتجات ({items.length})</Text>
                      </View>
                      {items.map((item: any, idx: number) => {
                        const imgUri = getFirstImage(item.product);
                        return (
                          <View key={idx} style={[s.productRow, idx < items.length - 1 && s.productBorder]}>
                            {imgUri ? (
                              <Image source={{ uri: imgUri }} style={s.productImg} resizeMode="cover" />
                            ) : (
                              <View style={[s.productImg, s.productImgPlaceholder]}>
                                <Ionicons name="image-outline" size={20} color="#d1d5db" />
                              </View>
                            )}
                            <View style={s.productInfo}>
                              <Text style={s.productName} numberOfLines={2}>
                                {item.product?.name || `منتج #${item.productId}`}
                              </Text>
                              <View style={s.productPriceRow}>
                                <View style={s.qtyBadge}>
                                  <Text style={s.qtyTxt}>×{item.quantity}</Text>
                                </View>
                                <View style={s.priceBadge}>
                                  <Text style={s.priceBadgeLabel}>جملة</Text>
                                  <Text style={[s.priceBadgeVal, { color: DANGER }]}>
                                    {item.cost?.toLocaleString() ?? '—'}
                                  </Text>
                                </View>
                                <View style={[s.priceBadge, { backgroundColor: PRIMARY + '10' }]}>
                                  <Text style={s.priceBadgeLabel}>بيع</Text>
                                  <Text style={[s.priceBadgeVal, { color: PRIMARY }]}>
                                    {item.price?.toLocaleString()}
                                  </Text>
                                </View>
                              </View>
                              <Text style={s.itemTotal}>
                                الإجمالي: {(item.price * item.quantity)?.toLocaleString()} د.ع
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  <View style={s.finBox}>
                    {o.shippingCost > 0 && (
                      <View style={s.finRow}>
                        <Ionicons name="bicycle-outline" size={14} color="#6b7280" />
                        <Text style={s.finLabel}>التوصيل</Text>
                        <Text style={s.finVal}>{o.shippingCost?.toLocaleString()} د.ع</Text>
                      </View>
                    )}
                    {o.promoDiscount > 0 && (
                      <View style={s.finRow}>
                        <Ionicons name="pricetag-outline" size={14} color={DANGER} />
                        <Text style={s.finLabel}>خصم {o.promoCode}</Text>
                        <Text style={[s.finVal, { color: DANGER }]}>-{o.promoDiscount?.toLocaleString()} د.ع</Text>
                      </View>
                    )}
                    <View style={[s.finRow, s.finTotal]}>
                      <Ionicons name="wallet-outline" size={14} color={PRIMARY} />
                      <Text style={[s.finLabel, { fontWeight: '700', color: '#111827' }]}>الإجمالي النهائي</Text>
                      <Text style={[s.finVal, { color: PRIMARY, fontWeight: '700', fontSize: 15 }]}>
                        {o.totalAmount?.toLocaleString()} د.ع
                      </Text>
                    </View>
                  </View>

                  {o.notes ? (
                    <View style={s.notesBox}>
                      <Ionicons name="chatbubble-ellipses-outline" size={14} color="#92400e" />
                      <Text style={s.notesTxt}>{o.notes}</Text>
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Modal التعديل */}
      <Modal visible={!!editOrder} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>

              <View style={s.modalHeader}>
                <TouchableOpacity onPress={() => setEditOrder(null)} style={s.modalCloseBtn}>
                  <Ionicons name="close" size={20} color="#6b7280" />
                </TouchableOpacity>
                <Text style={s.modalTitle}>تعديل الطلب #{editOrder?.id}</Text>
              </View>

              <ScrollView contentContainerStyle={s.modalBody} showsVerticalScrollIndicator={false}>

                <Text style={s.modalSection}>معلومات الزبون</Text>

                <Text style={s.inputLabel}>الاسم</Text>
                <TextInput style={s.input} value={editForm.customerName}
                  onChangeText={v => setEditForm((p: any) => ({ ...p, customerName: v }))}
                  placeholder="اسم الزبون" placeholderTextColor="#9ca3af" textAlign="right" />

                <Text style={s.inputLabel}>رقم الهاتف</Text>
                <TextInput style={s.input} value={editForm.customerPhone}
                  onChangeText={v => setEditForm((p: any) => ({ ...p, customerPhone: v }))}
                  placeholder="رقم الهاتف" placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad" textAlign="right" />

                <Text style={s.inputLabel}>المحافظة</Text>
                <TextInput style={s.input} value={editForm.province}
                  onChangeText={v => setEditForm((p: any) => ({ ...p, province: v }))}
                  placeholder="المحافظة" placeholderTextColor="#9ca3af" textAlign="right" />

                <Text style={s.inputLabel}>العنوان</Text>
                <TextInput style={[s.input, { minHeight: 70, textAlignVertical: 'top' }]}
                  value={editForm.address}
                  onChangeText={v => setEditForm((p: any) => ({ ...p, address: v }))}
                  placeholder="العنوان التفصيلي" placeholderTextColor="#9ca3af"
                  multiline textAlign="right" />

                <Text style={s.inputLabel}>ملاحظات</Text>
                <TextInput style={[s.input, { minHeight: 60, textAlignVertical: 'top' }]}
                  value={editForm.notes}
                  onChangeText={v => setEditForm((p: any) => ({ ...p, notes: v }))}
                  placeholder="ملاحظات (اختياري)" placeholderTextColor="#9ca3af"
                  multiline textAlign="right" />

                <Text style={s.modalSection}>المنتجات</Text>

                {(editForm.items || []).map((item: any, idx: number) => (
                  <View key={idx} style={s.editItemRow}>
                    <TouchableOpacity
                      style={s.removeItemBtn}
                      onPress={() => {
                        const newItems = editForm.items.filter((_: any, i: number) => i !== idx);
                        setEditForm((p: any) => ({ ...p, items: newItems }));
                      }}
                    >
                      <Ionicons name="close-circle" size={20} color={DANGER} />
                    </TouchableOpacity>
                    <View style={s.editItemInfo}>
                      <Text style={s.editItemName} numberOfLines={1}>{item.productName}</Text>
                      <View style={s.editItemFields}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.inputLabel}>سعر البيع</Text>
                          <TextInput style={s.inputSm} value={item.price}
                            onChangeText={v => {
                              const newItems = [...editForm.items];
                              newItems[idx] = { ...newItems[idx], price: v };
                              setEditForm((p: any) => ({ ...p, items: newItems }));
                            }}
                            keyboardType="numeric" textAlign="right" placeholderTextColor="#9ca3af" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.inputLabel}>الكمية</Text>
                          <TextInput style={s.inputSm} value={item.quantity}
                            onChangeText={v => {
                              const newItems = [...editForm.items];
                              newItems[idx] = { ...newItems[idx], quantity: v };
                              setEditForm((p: any) => ({ ...p, items: newItems }));
                            }}
                            keyboardType="numeric" textAlign="right" placeholderTextColor="#9ca3af" />
                        </View>
                      </View>
                    </View>
                  </View>
                ))}

              </ScrollView>

              <View style={s.modalFooter}>
                <TouchableOpacity style={s.saveBtn} onPress={handleSaveEdit} disabled={updateOrder.isPending}>
                  {updateOrder.isPending
                    ? <ActivityIndicator color="#fff" />
                    : <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                        <Text style={s.saveBtnTxt}>حفظ التعديلات</Text></>
                  }
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const s = StyleSheet.create({
  totalTxt:    { fontSize: 12, color: '#9ca3af', textAlign: 'right', paddingHorizontal: 14, paddingVertical: 8 },
  loadMoreBtn: { margin: 14, padding: 14, backgroundColor: '#fff', borderRadius: 14,
    alignItems: 'center', borderWidth: 1.5, borderColor: PRIMARY + '40' },
  loadMoreTxt: { color: PRIMARY, fontWeight: 'bold', fontSize: 14 },
  noMoreTxt:   { textAlign: 'center', color: '#9ca3af', fontSize: 12, padding: 16 },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 10 },
  loadingTxt: { fontSize: 14, color: '#9ca3af' },
  emptyTxt:   { fontSize: 16, color: '#9ca3af', fontWeight: '600' },
  topBar:     { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  searchRow:  { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 12, paddingHorizontal: 12, gap: 8, borderWidth: 1.5, borderColor: '#e5e7eb' },
  searchInput:{ flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827' },
  chip:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 16, backgroundColor: '#f3f4f6', marginRight: 7, borderWidth: 1.5, borderColor: '#e5e7eb' },
  chipActive:     { backgroundColor: PRIMARY + '18', borderColor: PRIMARY },
  chipTxt:        { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  chipTxtActive:  { color: PRIMARY },
  chipBadge:      { backgroundColor: '#e5e7eb', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  chipBadgeActive:{ backgroundColor: PRIMARY },
  chipBadgeTxt:   { fontSize: 10, color: '#6b7280', fontWeight: 'bold' },
  chipBadgeTxtActive: { color: '#fff' },
  card:       { backgroundColor: '#fff', borderRadius: 18, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', padding: 14, paddingBottom: 10 },
  orderIdRow: { alignItems: 'flex-end', gap: 4 },
  orderId:    { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  dateRow:    { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  dateTxt:    { fontSize: 11, color: '#9ca3af' },
  statusPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20 },
  statusTxt:  { fontSize: 12, fontWeight: 'bold' },
  actionRow:    { flexDirection: 'row-reverse', gap: 8, paddingHorizontal: 14, paddingBottom: 10 },
  editBtn:      { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: PRIMARY + '12', borderWidth: 1, borderColor: PRIMARY + '30' },
  deleteBtn:    { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: DANGER + '10', borderWidth: 1, borderColor: DANGER + '30' },
  actionBtnTxt: { fontSize: 12, fontWeight: '700' },
  dropdown:     { marginHorizontal: 14, marginBottom: 10, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#e5e7eb', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 5 },
  dropdownItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  dropdownTxt:  { flex: 1, fontSize: 13, fontWeight: '600', textAlign: 'right' },
  divider:      { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 14 },
  section:         { paddingHorizontal: 14, paddingVertical: 12 },
  sectionLabelRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionLabel:    { fontSize: 12, fontWeight: '700', color: PRIMARY },
  infoBlock: { gap: 6 },
  infoLine:  { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  infoVal:   { fontSize: 14, fontWeight: '700', color: '#111827' },
  infoSub:   { fontSize: 13, color: '#6b7280', flex: 1, textAlign: 'right' },
  copyBtn:   { width: 28, height: 28, borderRadius: 8, backgroundColor: PRIMARY + '12', justifyContent: 'center', alignItems: 'center' },
  priceRow:     { flexDirection: 'row-reverse', backgroundColor: '#f8fafc', paddingVertical: 12, paddingHorizontal: 14, gap: 4 },
  priceBox:     { flex: 1, alignItems: 'center', gap: 3 },
  priceDivider: { width: 1, backgroundColor: '#e5e7eb' },
  priceLabel:   { fontSize: 10, color: '#9ca3af', fontWeight: '600' },
  priceVal:     { fontSize: 13, fontWeight: 'bold' },
  expandBtn: { flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 11, borderTopWidth: 1, borderTopColor: '#f3f4f6', backgroundColor: PRIMARY + '06' },
  expandTxt: { fontSize: 13, color: PRIMARY, fontWeight: '700' },
  details:   { padding: 14, gap: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  itemsBox:  { backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, gap: 2 },
  productRow:            { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  productBorder:         { borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  productImg:            { width: 64, height: 64, borderRadius: 12, backgroundColor: '#f3f4f6' },
  productImgPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  productInfo:           { flex: 1, gap: 6 },
  productName:           { fontSize: 13, fontWeight: '700', color: '#111827', textAlign: 'right', lineHeight: 19 },
  productPriceRow:       { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  qtyBadge:        { backgroundColor: PRIMARY + '15', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  qtyTxt:          { fontSize: 12, color: PRIMARY, fontWeight: 'bold' },
  priceBadge:      { flexDirection: 'row-reverse', alignItems: 'center', gap: 3, backgroundColor: '#fef2f2', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  priceBadgeLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },
  priceBadgeVal:   { fontSize: 12, fontWeight: 'bold' },
  itemTotal:       { fontSize: 11, color: '#6b7280', textAlign: 'right' },
  finBox:   { backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, gap: 8 },
  finRow:   { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  finTotal: { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8, marginTop: 2 },
  finLabel: { flex: 1, fontSize: 13, color: '#6b7280', textAlign: 'right' },
  finVal:   { fontSize: 13, fontWeight: '600', color: '#374151' },
  notesBox: { flexDirection: 'row-reverse', gap: 8, backgroundColor: '#fffbeb', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#fde68a' },
  notesTxt: { flex: 1, fontSize: 13, color: '#92400e', textAlign: 'right', lineHeight: 20 },
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard:     { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
  modalHeader:   { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle:    { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  modalCloseBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  modalBody:     { padding: 20, paddingBottom: 10 },
  modalSection:  { fontSize: 14, fontWeight: 'bold', color: PRIMARY, textAlign: 'right', marginTop: 16, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 6 },
  modalFooter:   { padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  inputLabel: { fontSize: 12, color: '#6b7280', textAlign: 'right', marginBottom: 4, fontWeight: '600' },
  input:      { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 11, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb', marginBottom: 10 },
  inputSm:    { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, padding: 9, fontSize: 13, color: '#111827', backgroundColor: '#f9fafb' },
  editItemRow:    { backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, marginBottom: 10, flexDirection: 'row-reverse', gap: 10, alignItems: 'flex-start' },
  removeItemBtn:  { paddingTop: 2 },
  editItemInfo:   { flex: 1 },
  editItemName:   { fontSize: 13, fontWeight: '700', color: '#111827', textAlign: 'right', marginBottom: 8 },
  editItemFields: { flexDirection: 'row-reverse', gap: 10 },
  saveBtn:    { backgroundColor: PRIMARY, borderRadius: 14, height: 50, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 8 },
  saveBtnTxt: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
