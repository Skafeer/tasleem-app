// app/admin-components/OrdersTab.tsx
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, FlatList, Image,
  Clipboard, Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import api from '../../src/lib/api';
import { toast } from '../../src/lib/toast';

const PRIMARY = '#0c6679';
const SUCCESS = '#10b981';
const DANGER = '#ef4444';
const BG = '#f2f6f9';

const STATUS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  processing: { label: 'قيد المعالجة', color: '#3b82f6', bg: '#eff6ff', icon: 'sync-outline' },
  shipping: { label: 'قيد التوصيل', color: '#06b6d4', bg: '#ecfeff', icon: 'bicycle-outline' },
  delivered: { label: 'تم التوصيل', color: '#10b981', bg: '#ecfdf5', icon: 'checkmark-circle-outline' },
  cancelled: { label: 'تم الإلغاء', color: '#ef4444', bg: '#fef2f2', icon: 'close-circle-outline' },
  returned: { label: 'تم الرفض', color: '#f97316', bg: '#fff7ed', icon: 'arrow-undo-outline' },
  postponed: { label: 'مؤجل', color: '#6b7280', bg: '#f9fafb', icon: 'pause-circle-outline' },
};

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'processing', label: 'معالجة' },
  { key: 'shipping', label: 'توصيل' },
  { key: 'delivered', label: 'مُسلَّم' },
  { key: 'cancelled', label: 'ملغي' },
  { key: 'returned', label: 'رفض' },
  { key: 'postponed', label: 'مؤجل' },
];

const getFirstImage = (product: any) => {
  if (!product) return null;
  const imgs = product.images ? product.images.split(',').filter(Boolean) : [];
  return imgs.length > 0 ? imgs[0] : (product.imageUrl || null);
};

export default function OrdersTab() {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [dropdownId, setDropdownId] = useState<number | null>(null);
  const [editOrder, setEditOrder] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});

  // ✅ Export states
  const [exporting, setExporting] = useState<false | 'csv' | 'pdf'>(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const {
    data: ordersData,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['admin-orders', filter, debouncedSearch],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: '20',
        ...(filter !== 'all' && { status: filter }),
        ...(debouncedSearch && { search: debouncedSearch }),
      });
      const { data } = await api.get(`/api/orders?${params}`);
      return data;
    },
    getNextPageParam: (last: any) => last.hasMore ? last.page + 1 : undefined,
    initialPageParam: 1,
    refetchInterval: 30000,
  });

  const orders = ordersData?.pages.flatMap((p: any) => p.data) ?? [];
  const total = ordersData?.pages[0]?.total ?? 0;

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await api.get('/api/admin/users');
      return data;
    },
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
    mutationFn: async (id: number) => {
      await api.delete(`/api/orders/${id}`);
    },
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
      customerName: o.customerName || '',
      customerPhone: o.customerPhone || '',
      backupPhone: o.backupPhone || '',
      province: o.province || '',
      address: o.address || '',
      notes: o.notes || '',
      items: (o.items || []).map((i: any) => ({
        productId: i.productId,
        productName: i.product?.name || `منتج #${i.productId}`,
        quantity: String(i.quantity),
        price: String(i.price),
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
    if (!editForm.customerName.trim()) {
      toast.warning('يرجى إدخال اسم الزبون');
      return;
    }
    if (!editForm.customerPhone.trim()) {
      toast.warning('يرجى إدخال رقم الهاتف');
      return;
    }
    const items = editForm.items.map((i: any) => ({
      productId: i.productId,
      quantity: Number(i.quantity),
      price: Number(i.price),
    }));
    const updateData: any = { ...editForm, items };
    if (!updateData.backupPhone) delete updateData.backupPhone;
    updateOrder.mutate({ id: editOrder.id, data: updateData });
  };

  const handleFilterChange = (key: string) => {
    setFilter(key);
    setSearchTerm('');
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  // ═══════════════════════════════════════════
  // ✅ Export as CSV (Google Sheets)
  // ═══════════════════════════════════════════
  const exportCSV = async () => {
    try {
      setExporting('csv');
      setExportMenuOpen(false);

      const params: any = {};
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await api.get('/api/admin/orders/export', {
        params,
        responseType: 'text',
        headers: { Accept: 'text/csv' },
        transformResponse: [(d: any) => d],
      });

      let csvText: string = res.data;
      if (!csvText.startsWith('\uFEFF')) csvText = '\uFEFF' + csvText;

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `tasleem-delivered-${dateStr}.csv`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, csvText, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'فتح الملف في Google Sheets',
          UTI: 'public.comma-separated-values-text',
        });
        toast.success('تم تصدير الملف');
      } else {
        toast.error('المشاركة غير متاحة على هذا الجهاز');
      }
    } catch (e: any) {
      console.error('Export CSV error:', e);
      toast.error(e?.message || 'فشل التصدير');
    } finally {
      setExporting(false);
    }
  };

  // ═══════════════════════════════════════════
  // ✅ Export as PDF — تصميم احترافي
  // ═══════════════════════════════════════════
  const exportPDF = async () => {
    try {
      setExporting('pdf');
      setExportMenuOpen(false);

      const params: any = {};
      if (debouncedSearch) params.search = debouncedSearch;

      const { data } = await api.get('/api/admin/orders/export-json', { params });
      const headers: string[] = data.headers || [];
      const rows: any[][] = data.rows || [];

      if (rows.length === 0) {
        toast.warning('لا توجد طلبات تم توصيلها');
        return;
      }

      const totalProfit = rows.reduce((s, r) => s + (Number(r[7]) || 0), 0);
      const totalSales = rows.reduce((s, r) => s + (Number(r[6]) || 0), 0);
      const totalItems = rows.reduce((s, r) => s + (Number(r[5]) || 0), 0);
      const totalOrders = new Set(rows.map((r) => r[1])).size;

      const fmtNum = (n: number) => Math.round(n).toLocaleString('en-US');

      const today = new Date();
      const dateStr = today.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const timeStr = today.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });

      // ✅ ترقيم الصفحات في الطباعة
      const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تقرير الطلبات - تسليم</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm 8mm;
      @bottom-center {
        content: "صفحة " counter(page) " من " counter(pages);
        font-size: 9px;
        color: #9ca3af;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, 'Segoe UI', Tahoma, Arial, sans-serif;
      padding: 24px 20px;
      color: #111827;
      direction: rtl;
      background: #fff;
    }

    /* ═══ Header ═══ */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 22px;
      padding-bottom: 16px;
      border-bottom: 3px solid #0c6679;
      gap: 20px;
    }
    .header-left { flex: 1; }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .brand-logo {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0c6679 0%, #0a5361 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 20px;
      font-weight: 900;
      box-shadow: 0 4px 10px rgba(12,102,121,0.25);
    }
    .brand-name {
      font-size: 22px;
      font-weight: 900;
      color: #0c6679;
      letter-spacing: -0.5px;
    }
    .brand-sub {
      font-size: 10px;
      color: #6b7280;
      font-weight: 600;
      margin-top: 1px;
      letter-spacing: 2px;
    }
    .header-title {
      font-size: 15px;
      font-weight: 800;
      color: #111827;
      margin-top: 4px;
    }
    .header-right {
      text-align: left;
      font-size: 11px;
      color: #6b7280;
      line-height: 1.7;
    }
    .header-right strong {
      color: #111827;
      font-weight: 700;
      font-size: 12px;
    }

    /* ═══ Summary Cards ═══ */
    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    .sum-item {
      padding: 14px 12px;
      border-radius: 12px;
      text-align: center;
      border: 1.5px solid #e5e7eb;
      background: #f9fafb;
      position: relative;
      overflow: hidden;
    }
    .sum-item::before {
      content: "";
      position: absolute;
      top: 0;
      right: 0;
      left: 0;
      height: 3px;
      background: #0c6679;
    }
    .sum-item.green::before { background: #059669; }
    .sum-item.blue::before { background: #3b82f6; }
    .sum-item.orange::before { background: #f59e0b; }
    .sum-val {
      font-size: 20px;
      font-weight: 900;
      color: #0c6679;
      margin-bottom: 4px;
      font-family: 'Courier New', monospace;
      letter-spacing: -0.5px;
    }
    .sum-item.green .sum-val { color: #059669; }
    .sum-item.blue .sum-val { color: #3b82f6; }
    .sum-item.orange .sum-val { color: #f59e0b; }
    .sum-lbl {
      font-size: 10px;
      color: #6b7280;
      font-weight: 700;
      letter-spacing: 0.3px;
    }

    /* ═══ Table ═══ */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    thead {
      background: #0c6679;
      color: #fff;
    }
    th {
      padding: 10px 6px;
      text-align: center;
      font-weight: 800;
      font-size: 10px;
      border: 1px solid #0a5361;
      white-space: nowrap;
    }
    td {
      padding: 7px 6px;
      text-align: center;
      border: 1px solid #f3f4f6;
      vertical-align: middle;
      color: #374151;
    }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody tr:nth-child(odd) { background: #fff; }
    tbody tr:hover { background: #f0f9fa; }

    td.num {
      font-family: 'Courier New', monospace;
      font-weight: 700;
      color: #111827;
    }
    td.date {
      font-family: 'Courier New', monospace;
      font-weight: 700;
      color: #6b7280;
      font-size: 9px;
    }
    td.order-id {
      font-family: 'Courier New', monospace;
      font-weight: 800;
      color: #0c6679;
    }
    td.customer {
      text-align: right;
      font-weight: 700;
      color: #111827;
      padding-right: 10px;
      font-size: 10px;
    }
    td.product {
      text-align: right;
      font-weight: 600;
      max-width: 220px;
      color: #374151;
      padding-right: 10px;
    }
    td.cost { color: #ef4444; }
    td.price { color: #0c6679; }
    td.profit {
      color: #059669;
      font-weight: 800;
      background: #ecfdf5;
    }
    td.status {
      font-size: 9px;
      font-weight: 700;
      color: #059669;
      background: #ecfdf5;
    }
    td.merchant {
      font-weight: 700;
      color: #8b5cf6;
      font-size: 9.5px;
    }

    /* ═══ Footer ═══ */
    .footer {
      margin-top: 22px;
      padding-top: 14px;
      border-top: 2px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      color: #9ca3af;
    }
    .footer-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      color: #0c6679;
    }
    .footer-brand-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #0c6679;
    }
    .footer-note {
      font-family: 'Courier New', monospace;
    }

    /* ═══ Watermark ═══ */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-25deg);
      font-size: 140px;
      font-weight: 900;
      color: #0c6679;
      opacity: 0.025;
      z-index: -1;
      pointer-events: none;
      letter-spacing: 10px;
    }
  </style>
</head>
<body>

  <div class="watermark">تسليم</div>

  <!-- ═══ Header ═══ -->
  <div class="header">
    <div class="header-left">
      <div class="brand">
        <div class="brand-logo">ت</div>
        <div>
          <div class="brand-name">تسليم</div>
          <div class="brand-sub">TASLEEM</div>
        </div>
      </div>
      <div class="header-title">تقرير الطلبات — تم التوصيل</div>
    </div>
    <div class="header-right">
      <div><strong>التاريخ:</strong> ${dateStr}</div>
      <div><strong>الوقت:</strong> ${timeStr}</div>
      <div><strong>عدد الطلبات:</strong> ${fmtNum(totalOrders)}</div>
    </div>
  </div>

  <!-- ═══ Summary ═══ -->
  <div class="summary">
    <div class="sum-item blue">
      <div class="sum-val">${fmtNum(totalOrders)}</div>
      <div class="sum-lbl">عدد الطلبات</div>
    </div>
    <div class="sum-item orange">
      <div class="sum-val">${fmtNum(totalItems)}</div>
      <div class="sum-lbl">عدد القطع</div>
    </div>
    <div class="sum-item">
      <div class="sum-val">${fmtNum(totalSales)}</div>
      <div class="sum-lbl">إجمالي المبيعات (د.ع)</div>
    </div>
    <div class="sum-item green">
      <div class="sum-val">${fmtNum(totalProfit)}</div>
      <div class="sum-lbl">إجمالي الأرباح (د.ع)</div>
    </div>
  </div>

  <!-- ═══ Table ═══ -->
  <table>
    <thead>
      <tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (row) => `<tr>${row
            .map((cell, i) => {
              let cls = 'num';
              if (i === 0) cls = 'date';
              if (i === 1) cls = 'order-id';
              if (i === 2) cls = 'customer';
              if (i === 3) cls = 'product';
              if (i === 4) cls = 'num cost';
              if (i === 5) cls = 'num';
              if (i === 6) cls = 'num price';
              if (i === 7) cls = 'num profit';
              if (i === 8) cls = 'status';
              if (i === 9) cls = 'merchant';
              return `<td class="${cls}">${cell ?? ''}</td>`;
            })
            .join('')}</tr>`
        )
        .join('')}
    </tbody>
  </table>

  <!-- ═══ Footer ═══ -->
  <div class="footer">
    <div class="footer-brand">
      <span class="footer-brand-dot"></span>
      تم الإنشاء بواسطة تسليم
    </div>
    <div class="footer-note">
      عدد الصفوف: ${rows.length} — ${dateStr} ${timeStr}
    </div>
  </div>

</body>
</html>`;

      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'مشاركة التقرير',
          UTI: 'com.adobe.pdf',
        });
        toast.success('تم إنشاء التقرير');
      } else {
        toast.error('المشاركة غير متاحة');
      }
    } catch (e: any) {
      console.error('Export PDF error:', e);
      toast.error(e?.message || 'فشل إنشاء PDF');
    } finally {
      setExporting(false);
    }
  };

  const filtered = orders;

  const counts: Record<string, number> = {};
  Object.keys(STATUS).forEach(k => {
    counts[k] = orders.filter((o: any) => o.status === k).length;
  });

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={s.loadingTxt}>جاري تحميل الطلبات...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>

      {/* ── شريط البحث + زر التصدير ── */}
      <View style={s.topBar}>
        <View style={s.searchRowWrap}>
          <View style={s.searchRow}>
            <Ionicons name="search-outline" size={17} color="#9ca3af" />
            <TextInput
              style={s.searchInput}
              placeholder="ابحث برقم الطلب أو اسم الزبون..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor="#9ca3af"
              textAlign="right"
            />
            {searchTerm ? (
              <TouchableOpacity onPress={clearSearch}>
                <Ionicons name="close-circle" size={17} color="#9ca3af" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* زر التصدير */}
          <View style={s.exportWrap}>
            <TouchableOpacity
              style={[s.exportBtn, exporting && { opacity: 0.6 }]}
              onPress={() => setExportMenuOpen((v) => !v)}
              disabled={!!exporting}
              activeOpacity={0.85}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={16} color="#fff" />
                  <Ionicons name="chevron-down" size={12} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            {exportMenuOpen && !exporting && (
              <>
                <TouchableOpacity
                  style={s.menuBackdrop}
                  activeOpacity={1}
                  onPress={() => setExportMenuOpen(false)}
                />
                <View style={s.exportMenu}>
                  <TouchableOpacity
                    style={s.exportMenuItem}
                    onPress={exportCSV}
                    activeOpacity={0.7}
                  >
                    <View style={[s.menuIconBox, { backgroundColor: '#10b98115' }]}>
                      <Ionicons name="grid-outline" size={16} color="#10b981" />
                    </View>
                    <View style={s.menuTextWrap}>
                      <Text style={s.menuTitle}>Google Sheets</Text>
                      <Text style={s.menuSubtitle}>CSV — يفتح مباشرة</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={s.menuDivider} />

                  <TouchableOpacity
                    style={s.exportMenuItem}
                    onPress={exportPDF}
                    activeOpacity={0.7}
                  >
                    <View style={[s.menuIconBox, { backgroundColor: '#ef444415' }]}>
                      <Ionicons name="document-text-outline" size={16} color="#ef4444" />
                    </View>
                    <View style={s.menuTextWrap}>
                      <Text style={s.menuTitle}>PDF</Text>
                      <Text style={s.menuSubtitle}>تقرير مصمّم</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[s.chip, filter === f.key && s.chipActive]}
              onPress={() => handleFilterChange(f.key)}>
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
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.center}>
            <Ionicons name="bag-outline" size={52} color="#d1d5db" />
            <Text style={s.emptyTxt}>لا توجد طلبات</Text>
          </View>
        }
        renderItem={({ item: o }) => {
          const st = STATUS[o.status] || STATUS.processing;
          const merchant = getMerchant(o.merchantId);
          const isOpen = expanded === o.id;
          const items = o.items || [];

          return (
            <View style={s.card}>
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
                  onPress={() => setDropdownId(dropdownId === o.id ? null : o.id)}>
                  <Ionicons name="chevron-down" size={11} color={st.color} />
                  <Ionicons name={st.icon} size={13} color={st.color} />
                  <Text style={[s.statusTxt, { color: st.color }]}>{st.label}</Text>
                </TouchableOpacity>
              </View>

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
                      disabled={updateStatus.isPending}>
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
                  {o.backupPhone && (
                    <View style={s.infoLine}>
                      <TouchableOpacity style={s.copyBtn} onPress={() => copy(o.backupPhone, 'رقم الاحتياطي')}>
                        <Ionicons name="copy-outline" size={13} color={PRIMARY} />
                      </TouchableOpacity>
                      <Text style={s.infoSub}>احتياطي: {o.backupPhone}</Text>
                    </View>
                  )}
                  {(o.province || o.address) && (
                    <View style={s.infoLine}>
                      <TouchableOpacity
                        style={s.copyBtn}
                        onPress={() => copy(`${o.province} - ${o.address}`, 'العنوان')}>
                        <Ionicons name="copy-outline" size={13} color={PRIMARY} />
                      </TouchableOpacity>
                      <Text style={s.infoSub}>{o.province}{o.address ? ` — ${o.address}` : ''}</Text>
                    </View>
                  )}
                </View>
              </View>

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

              <TouchableOpacity
                style={s.expandBtn}
                onPress={() => setExpanded(isOpen ? null : o.id)}>
                <Ionicons name={isOpen ? 'chevron-up-outline' : 'chevron-down-outline'} size={15} color={PRIMARY} />
                <Text style={s.expandTxt}>{isOpen ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}</Text>
              </TouchableOpacity>

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
                <TextInput
                  style={s.input}
                  value={editForm.customerName}
                  onChangeText={v => setEditForm((p: any) => ({ ...p, customerName: v }))}
                  placeholder="اسم الزبون"
                  placeholderTextColor="#9ca3af"
                  textAlign="right"
                />

                <Text style={s.inputLabel}>رقم الهاتف</Text>
                <TextInput
                  style={s.input}
                  value={editForm.customerPhone}
                  onChangeText={v => setEditForm((p: any) => ({ ...p, customerPhone: v }))}
                  placeholder="رقم الهاتف"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  textAlign="right"
                />

                <Text style={s.inputLabel}>رقم الهاتف الاحتياطي (اختياري)</Text>
                <TextInput
                  style={s.input}
                  value={editForm.backupPhone || ''}
                  onChangeText={v => setEditForm((p: any) => ({ ...p, backupPhone: v }))}
                  placeholder="07XXXXXXXXX (اختياري)"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  textAlign="right"
                />

                <Text style={s.inputLabel}>المحافظة</Text>
                <TextInput
                  style={s.input}
                  value={editForm.province}
                  onChangeText={v => setEditForm((p: any) => ({ ...p, province: v }))}
                  placeholder="المحافظة"
                  placeholderTextColor="#9ca3af"
                  textAlign="right"
                />

                <Text style={s.inputLabel}>العنوان</Text>
                <TextInput
                  style={[s.input, { minHeight: 70, textAlignVertical: 'top' }]}
                  value={editForm.address}
                  onChangeText={v => setEditForm((p: any) => ({ ...p, address: v }))}
                  placeholder="العنوان التفصيلي"
                  placeholderTextColor="#9ca3af"
                  multiline
                  textAlign="right"
                />

                <Text style={s.inputLabel}>ملاحظات</Text>
                <TextInput
                  style={[s.input, { minHeight: 60, textAlignVertical: 'top' }]}
                  value={editForm.notes}
                  onChangeText={v => setEditForm((p: any) => ({ ...p, notes: v }))}
                  placeholder="ملاحظات (اختياري)"
                  placeholderTextColor="#9ca3af"
                  multiline
                  textAlign="right"
                />

                <Text style={s.modalSection}>المنتجات</Text>

                {(editForm.items || []).map((item: any, idx: number) => (
                  <View key={idx} style={s.editItemRow}>
                    <TouchableOpacity
                      style={s.removeItemBtn}
                      onPress={() => {
                        const newItems = editForm.items.filter((_: any, i: number) => i !== idx);
                        setEditForm((p: any) => ({ ...p, items: newItems }));
                      }}>
                      <Ionicons name="close-circle" size={20} color={DANGER} />
                    </TouchableOpacity>
                    <View style={s.editItemInfo}>
                      <Text style={s.editItemName} numberOfLines={1}>{item.productName}</Text>
                      <View style={s.editItemFields}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.inputLabel}>سعر البيع</Text>
                          <TextInput
                            style={s.inputSm}
                            value={item.price}
                            onChangeText={v => {
                              const newItems = [...editForm.items];
                              newItems[idx] = { ...newItems[idx], price: v };
                              setEditForm((p: any) => ({ ...p, items: newItems }));
                            }}
                            keyboardType="numeric"
                            textAlign="right"
                            placeholderTextColor="#9ca3af"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.inputLabel}>الكمية</Text>
                          <TextInput
                            style={s.inputSm}
                            value={item.quantity}
                            onChangeText={v => {
                              const newItems = [...editForm.items];
                              newItems[idx] = { ...newItems[idx], quantity: v };
                              setEditForm((p: any) => ({ ...p, items: newItems }));
                            }}
                            keyboardType="numeric"
                            textAlign="right"
                            placeholderTextColor="#9ca3af"
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                ))}

              </ScrollView>

              <View style={s.modalFooter}>
                <TouchableOpacity
                  style={s.saveBtn}
                  onPress={handleSaveEdit}
                  disabled={updateOrder.isPending}>
                  {updateOrder.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      <Text style={s.saveBtnTxt}>حفظ التعديلات</Text>
                    </>
                  )}
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
  listContent: { padding: 12, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 10 },
  loadingTxt: { fontSize: 14, color: '#9ca3af' },
  emptyTxt: { fontSize: 16, color: '#9ca3af', fontWeight: '600' },

  topBar: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
  },
  searchRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#e8edf2',
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#111827', textAlign: 'right' },

  exportWrap: { position: 'relative' },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    shadowColor: PRIMARY,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  menuBackdrop: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 5,
  },
  exportMenu: {
    position: 'absolute',
    top: 48,
    right: 0,
    minWidth: 210,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 10,
  },
  exportMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  menuIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111827',
  },
  menuSubtitle: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 8,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    marginRight: 7,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: PRIMARY + '12', borderColor: PRIMARY },
  chipTxt: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  chipTxtActive: { color: PRIMARY },
  chipBadge: { backgroundColor: '#e5e7eb', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  chipBadgeActive: { backgroundColor: PRIMARY },
  chipBadgeTxt: { fontSize: 10, color: '#6b7280', fontWeight: 'bold' },
  chipBadgeTxtActive: { color: '#fff' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
    paddingBottom: 10,
  },
  orderIdRow: { alignItems: 'flex-end', gap: 4 },
  orderId: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateTxt: { fontSize: 11, color: '#9ca3af' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20 },
  statusTxt: { fontSize: 12, fontWeight: 'bold' },

  actionRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 10 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: PRIMARY + '12',
    borderWidth: 1,
    borderColor: PRIMARY + '30',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: DANGER + '10',
    borderWidth: 1,
    borderColor: DANGER + '30',
  },
  actionBtnTxt: { fontSize: 12, fontWeight: '700' },

  dropdown: {
    marginHorizontal: 14,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownTxt: { flex: 1, fontSize: 13, fontWeight: '600', textAlign: 'right' },

  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 14 },

  section: { paddingHorizontal: 14, paddingVertical: 12 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: PRIMARY },
  infoBlock: { gap: 6 },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoVal: { fontSize: 14, fontWeight: '700', color: '#111827' },
  infoSub: { fontSize: 13, color: '#6b7280', flex: 1, textAlign: 'right' },
  copyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: PRIMARY + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },

  priceRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 4,
  },
  priceBox: { flex: 1, alignItems: 'center', gap: 3 },
  priceDivider: { width: 1, backgroundColor: '#e5e7eb' },
  priceLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },
  priceVal: { fontSize: 13, fontWeight: 'bold' },

  expandBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: PRIMARY + '06',
  },
  expandTxt: { fontSize: 13, color: PRIMARY, fontWeight: '700' },

  details: { padding: 14, gap: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  itemsBox: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, gap: 2 },
  productRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  productBorder: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  productImg: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#f3f4f6' },
  productImgPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1, gap: 6 },
  productName: { fontSize: 13, fontWeight: '700', color: '#111827', textAlign: 'right', lineHeight: 19 },
  productPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  qtyBadge: { backgroundColor: PRIMARY + '15', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  qtyTxt: { fontSize: 12, color: PRIMARY, fontWeight: 'bold' },
  priceBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fef2f2', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  priceBadgeLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },
  priceBadgeVal: { fontSize: 12, fontWeight: 'bold' },
  itemTotal: { fontSize: 11, color: '#6b7280', textAlign: 'right' },

  finBox: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, gap: 8 },
  finRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  finTotal: { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8, marginTop: 2 },
  finLabel: { flex: 1, fontSize: 13, color: '#6b7280', textAlign: 'right' },
  finVal: { fontSize: 13, fontWeight: '600', color: '#374151' },

  notesBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  notesTxt: { flex: 1, fontSize: 13, color: '#92400e', textAlign: 'right', lineHeight: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  modalCloseBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  modalBody: { padding: 20, paddingBottom: 10 },
  modalSection: {
    fontSize: 14,
    fontWeight: 'bold',
    color: PRIMARY,
    textAlign: 'right',
    marginTop: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingBottom: 6,
  },
  modalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },

  inputLabel: { fontSize: 12, color: '#6b7280', textAlign: 'right', marginBottom: 4, fontWeight: '600' },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 11,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
    marginBottom: 10,
  },
  inputSm: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 9,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },

  editItemRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  removeItemBtn: { paddingTop: 2 },
  editItemInfo: { flex: 1 },
  editItemName: { fontSize: 13, fontWeight: '700', color: '#111827', textAlign: 'right', marginBottom: 8 },
  editItemFields: { flexDirection: 'row', gap: 10 },

  saveBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveBtnTxt: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});