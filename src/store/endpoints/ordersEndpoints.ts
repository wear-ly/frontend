import { api } from '@/store/api';
import { unwrapList } from '@/store/api/unwrapList';
import type { CartItem, Order, OrderCreateInput } from '@/store/types';

type ServerCart = { items: { id: number }[] };

export const ordersEndpoints = api.injectEndpoints({
  endpoints: (builder) => ({
    placeOrder: builder.mutation<Order, { items: CartItem[]; order: OrderCreateInput }>({
      async queryFn({ items, order }, _api, _extraOptions, baseQuery) {
        const cart = await baseQuery('/api/shopping-cart/cart/');
        if (cart.error) return { error: cart.error };

        for (const row of (cart.data as ServerCart).items) {
          const removed = await baseQuery({
            url: `/api/shopping-cart/cart-items/${row.id}/`,
            method: 'DELETE',
          });
          if (removed.error) return { error: removed.error };
        }

        for (const item of items) {
          const added = await baseQuery({
            url: '/api/shopping-cart/cart-items/',
            method: 'POST',
            body: { product_variant: item.variantId, quantity: item.quantity },
          });
          if (added.error) return { error: added.error };
        }

        const created = await baseQuery({ url: '/api/orders/', method: 'POST', body: order });
        if (created.error) return { error: created.error };

        return { data: created.data as Order };
      },
      invalidatesTags: ['Order'],
    }),
    getMyOrders: builder.query<Order[], void>({
      query: () => '/api/orders/',
      transformResponse: (response: unknown) => unwrapList<Order>(response),
      providesTags: ['Order'],
    }),
    getOrderById: builder.query<Order, number>({
      query: (id) => `/api/orders/${id}/`,
      providesTags: (_result, _error, id) => [{ type: 'Order', id }],
    }),
  }),
  overrideExisting: process.env.NODE_ENV !== 'production',
});

export const { usePlaceOrderMutation, useGetMyOrdersQuery, useGetOrderByIdQuery } = ordersEndpoints;
