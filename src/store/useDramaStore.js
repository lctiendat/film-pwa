import { create } from 'zustand';
import { getFavorites, getHistory } from '../services/db';

export const useDramaStore = create((set, get) => ({
  selectedProvider: 'anyreel',
  selectedTab: '',
  searchQuery: '',
  activeTag: 'all',
  favoritesCount: 0,
  historyCount: 0,
  autoTranslate: typeof window !== 'undefined' ? localStorage.getItem('df_auto_translate') !== 'false' : true,

  setSelectedProvider: (provider) => set({ selectedProvider: provider, selectedTab: '' }),
  setSelectedTab: (tab) => set({ selectedTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveTag: (tag) => set({ activeTag: tag }),
  setAutoTranslate: (val) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('df_auto_translate', String(val));
    }
    set({ autoTranslate: val });
  },

  refreshCounts: async () => {
    try {
      const favs = await getFavorites();
      const hist = await getHistory();
      set({
        favoritesCount: favs.length,
        historyCount: hist.length,
      });
    } catch (e) {
      console.error(e);
    }
  },
}));
