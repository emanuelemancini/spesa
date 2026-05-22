import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set, get) => ({
      supermarkets: [],
      products: [],
      readNotificationIds: [],
      user: {
        name: 'Emanuele',
        avatar: '/avatar.jpg'
      },
      isAuthenticated: false,
      isUnsynced: false,
      lastPushedAt: 0,
      toast: null, // { message, type, id }
      config: {
        kitchenCategories: ['Fresco', 'Dispensa', 'Surgelati', 'Bevande', 'Altro'],
        homeCategories: ['Igiene', 'Detersivi', 'Accessori', 'Dispensa'],
        dataCleared: false,
        notifications: {
          pushEnabled: true,
          alertExpiring: true,
          alertLowStock: true,
          alertBargains: false
        },
        pin: ''
      },
      
      // User Actions
      updateUser: (updates) => set((state) => ({
        user: { ...state.user, ...updates }
      })),

      markNotificationsRead: (ids) => set((state) => ({
        readNotificationIds: [...new Set([...state.readNotificationIds, ...ids])]
      })),

      login: () => set({ isAuthenticated: true }),
      logout: () => set({ isAuthenticated: false }),

      // Sync Actions
      setIsUnsynced: (val) => set({ isUnsynced: val }),
      setLastPushedAt: (t) => set({ lastPushedAt: t }),

      showToast: (message, type = 'success') => {
        const id = Date.now()
        set({ toast: { message, type, id } })
        setTimeout(() => set((s) => s.toast?.id === id ? { toast: null } : {}), 3000)
      },

      mergeState: (incoming) => set((state) => {
        const mergeById = (local, remote) => {
          const map = {}
          ;[...local, ...remote].forEach(item => { map[item.id] = item })
          return Object.values(map)
        }
        return {
          products: mergeById(state.products, incoming.products || []),
          supermarkets: mergeById(state.supermarkets, incoming.supermarkets || []),
          user: incoming.user || state.user,
        }
      }),

      replaceState: (incoming) => {
        // Normalizza categorie anche sui dati in arrivo dal cloud
        const products = (incoming.products || []).map(p =>
          p.category === 'Igiene Persona' ? { ...p, category: 'Igiene' } : p
        );
        const homeCats = (incoming.config?.homeCategories || []).map(c =>
          c === 'Igiene Persona' ? 'Igiene' : c
        );
        set({
          products,
          supermarkets: incoming.supermarkets || [],
          user: incoming.user || useStore.getState().user,
          readNotificationIds: incoming.readNotificationIds || useStore.getState().readNotificationIds,
          ...(incoming.config ? { config: { ...incoming.config, homeCategories: homeCats } } : {}),
        });
      },

      // Config Actions
      updateConfig: (updates) => set((state) => ({
        config: { ...state.config, ...updates }
      })),

      // Supermarket Actions
      addSupermarket: (supermarket) => set((state) => ({
        isUnsynced: true,
        supermarkets: [...state.supermarkets, {
          id: Date.now().toString(36) + Math.random().toString(36).substring(2),
          categories: [],
          fidelityCard: { cardNumber: '', lastSync: null },
          hours: {
            mon: { open: '08:00', close: '21:00' },
            tue: { open: '08:00', close: '21:00' },
            wed: { open: '08:00', close: '21:00' },
            thu: { open: '08:00', close: '21:00' },
            fri: { open: '08:00', close: '21:00' },
            sat: { open: '08:00', close: '21:00' },
            sun: { open: '09:00', close: '20:00' }
          },
...supermarket
        }]
      })),

      updateSupermarket: (id, updates) => set((state) => ({
        isUnsynced: true,
        supermarkets: state.supermarkets.map(s => s.id === id ? { ...s, ...updates } : s)
      })),

      deleteSupermarket: (id) => set((state) => ({
        isUnsynced: true,
        supermarkets: state.supermarkets.filter(s => s.id !== id),
        products: state.products.filter(p => p.supermarketId !== id)
      })),

      // Product Actions
      addProduct: (product) => set((state) => ({
        isUnsynced: true,
        products: [...state.products, {
          id: Date.now().toString(36) + Math.random().toString(36).substring(2),
          openedDate: null,
          status: 'to-buy',
          quantity: 1,
          ...product
        }]
      })),

      updateProduct: (id, updates) => set((state) => ({
        isUnsynced: true,
        products: state.products.map(p => p.id === id ? { ...p, ...updates } : p)
      })),

      deleteProduct: (id) => set((state) => ({
        isUnsynced: true,
        products: state.products.filter(p => p.id !== id)
      })),

      toggleProductBought: (id) => set((state) => ({
        isUnsynced: true,
        products: state.products.map(p => p.id === id ? {
          ...p,
          status: p.status === 'bought' ? 'to-buy' : 'bought'
        } : p)
      })),

      skipProduct: (id) => set((state) => ({
        isUnsynced: true,
        products: state.products.map(p => p.id === id ? { ...p, status: 'skipped' } : p)
      })),

      openProduct: (id, suggestedDays) => set((state) => ({
        isUnsynced: true,
        products: state.products.map(p => p.id === id ? {
          ...p,
          status: 'opened',
          openedDate: new Date().toISOString(),
          suggestedConsumptionDays: suggestedDays || p.suggestedConsumptionDays
        } : p)
      })),

      reorderProducts: (orderedIds) => set((state) => {
        const idToProduct = Object.fromEntries(state.products.map(p => [p.id, p]));
        const reordered = orderedIds.map(id => idToProduct[id]).filter(Boolean);
        const rest = state.products.filter(p => !orderedIds.includes(p.id));
        return { isUnsynced: true, products: [...reordered, ...rest] };
      }),

      resetStore: () => set({
        supermarkets: [], 
        products: [],
        config: { ...get().config, dataCleared: false } // Reset dataCleared so demo loads again
      }),

      clearStore: () => set((state) => ({ 
        supermarkets: [], 
        products: [],
        config: { ...state.config, dataCleared: true } 
      })),

      seedStore: (data) => set((state) => {
        // Only seed if actually empty and the user hasn't explicitly cleared the data
        if (state.supermarkets.length === 0 && state.products.length === 0 && !state.config.dataCleared) {
          return {
            supermarkets: data.supermarkets,
            products: data.products
          };
        }
        return state;
      }),
    }),
    {
      name: 'spesa-storage',
      version: 12,
      migrate: (persisted, version) => {
        const products = (persisted.products || []).map(p =>
          p.category === 'Igiene Persona' ? { ...p, category: 'Igiene' } : p
        );
        const homeCats = (persisted.config?.homeCategories || [])
          .map(c => c === 'Igiene Persona' ? 'Igiene' : c);
        // Forza ordine corretto
        const ordered = ['Igiene', 'Detersivi', 'Accessori', 'Dispensa'];
        const merged = [...ordered, ...homeCats.filter(c => !ordered.includes(c))];
        return { ...persisted, products, config: { ...persisted.config, homeCategories: merged } };
      },
      partialize: (state) => ({
        supermarkets: state.supermarkets,
        // Escludi immagini base64 dal localStorage (troppo pesanti).
        // Le URL server (https://...) vengono mantenute normalmente.
        products: state.products.map(p =>
          p.image && p.image.startsWith('data:') ? (({ image, ...rest }) => rest)(p) : p
        ),
        user: state.user,
        config: state.config,
        isAuthenticated: state.isAuthenticated,
        isUnsynced: state.isUnsynced,
        lastPushedAt: state.lastPushedAt,
        readNotificationIds: state.readNotificationIds,
      }),
    }
  )
);

export default useStore;
