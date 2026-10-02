import { create } from 'zustand';
import { getFavorites, getHistory } from '../services/db';

export const useDramaStore = create((set, get) => ({
  selectedProvider: 'anyreel',
  selectedTab: '',
  searchQuery: '',
  activeTag: 'all',
  favoritesCount: 0,
  historyCount: 0,

  setSelectedProvider: (provider) => set({ selectedProvider: provider, selectedTab: '' }),
  setSelectedTab: (tab) => set({ selectedTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveTag: (tag) => set({ activeTag: tag }),

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
