import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Product } from '../types';
export function useProducts(category?: string, search?: string) {
  return useQuery<Product[]>({
    queryKey: ['products', category, search],
    queryFn: async () => {
      const params: any = {};
      if (category) params.category = category;
      if (search) params.search = search;
      const { data } = await api.get('/api/products', { params });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
export function useProduct(id: number) {
  return useQuery<Product>({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data } = await api.get(`/api/products/${id}`);
      return data;
    },
  });
}
