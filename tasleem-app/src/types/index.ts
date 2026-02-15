export type User = {
  id: number;
  merchantId: string;
  storeName: string;
  phone: string;
  address: string;
  role: 'merchant' | 'admin';
  balance: number;
  pendingBalance: number;
  isActive: boolean;
  avatarUrl?: string;
  bio?: string;
};
export type Product = {
  id: number;
  name: string;
  description: string;
  wholesalePrice: number;
  sellingPriceMin: number;
  quantity: number;
  imageUrl: string;
  imageUrls: string[];
  category: string;
  isActive: boolean;
};
export type Order = {
  id: number;
  merchantId: number;
  customerName: string;
  customerPhone: string;
  province: string;
  address: string;
  status: 'pending' | 'processing' | 'delivered' | 'cancelled';
  totalAmount: number;
  totalProfit: number;
  shippingCost: number;
  notes?: string;
  createdAt: string;
};
export type CartItem = {
  product: Product;
  quantity: number;
  sellingPrice: number;
};
