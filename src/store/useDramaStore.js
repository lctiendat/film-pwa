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
  subtitlesEnabled: typeof window !== 'undefined' ? localStorage.getItem('df_sub_enabled') !== 'false' : true,
  subtitleLanguage: typeof window !== 'undefined' ? (localStorage.getItem('df_sub_lang') || 'vi') : 'vi',
  subtitleFontSize: typeof window !== 'undefined' ? (localStorage.getItem('df_sub_size') || 'md') : 'md',
  subtitleOffset: 0.0,

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
  setSubtitlesEnabled: (val) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('df_sub_enabled', String(val));
    }
    set({ subtitlesEnabled: val });
  },
  setSubtitleLanguage: (lang) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('df_sub_lang', lang);
    }
    set({ subtitleLanguage: lang });
  },
  setSubtitleFontSize: (size) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('df_sub_size', size);
    }
    set({ subtitleFontSize: size });
  },
  setSubtitleOffset: (offset) => set({ subtitleOffset: offset }),


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
