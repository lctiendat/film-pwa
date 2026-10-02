import axios from 'axios';
import { FALLBACK_DATA } from './fallbackData';
import { getSectionsCache, saveSectionsCache, getDB } from './db';
import dragonLordEpisodes from './dragonLordEpisodes.json';

// Create Axios client with sensible timeout
export const apiClient = axios.create({
  timeout: 15000,
  headers: {
    'Accept': 'application/json, text/html',
  },
});

/**
 * Normalizes poster URL
 */
export function getPosterUrl(posterUrl) {
  if (!posterUrl) {
    return 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=600&auto=format&fit=crop&q=80';
  }
  const trimmed = posterUrl.trim();
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://narto-drama.com${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

/**
 * Fetch live providers list from backend crawler
 */
export async function fetchLiveProviders() {
  try {
    const res = await apiClient.get('/api/providers');
    if (res.data && res.data.ok && Array.isArray(res.data.providers)) {
      return res.data.providers;
    }
  } catch (err) {
    console.warn('[API] fetchLiveProviders failed:', err.message);
  }
  return FALLBACK_DATA.providers || [];
}

/**
 * Fetch sections for a provider with offline caching and multi-language support
 */
export async function fetchProviderSections(provider = '', lang = 'vi-VN', page = 1) {
  const provKey = (!provider || provider === 'all') ? 'anyreel' : provider;
  const query = new URLSearchParams({
    provider: provKey,
    lang: lang || 'vi-VN',
    page: String(page || 1),
  }).toString();

  // Tier 1: Local crawler endpoint
  try {
    const response = await apiClient.get(`/api/sections?${query}`);
    if (response.data && response.data.ok) {
      await saveSectionsCache(provKey, response.data);
      return {
        ...response.data,
        active_provider: response.data.active_provider || provKey,
        _source: 'network',
      };
    }
  } catch (err) {
    console.warn(`[API] /api/sections failed:`, err.message);
  }

  // Tier 2: Check IndexedDB cache
  const cached = await getSectionsCache(provKey);
  if (cached && cached.ok) {
    return {
      ...cached,
      active_provider: cached.active_provider || provKey,
      _source: 'cache',
    };
  }

  // Tier 3: Built-in fallback dataset
  return {
    ...FALLBACK_DATA,
    active_provider: provKey,
    _source: 'fallback',
  };
}

/**
 * Upstream Search API
 */
export async function searchDramas(query, lang = 'vi-VN') {
  if (!query || !query.trim()) return [];
  try {
    const res = await apiClient.get(`/api/search?q=${encodeURIComponent(query)}&lang=${encodeURIComponent(lang)}`);
    if (res.data && res.data.ok && Array.isArray(res.data.items)) {
      return res.data.items;
    }
  } catch (err) {
    console.warn('[API] searchDramas failed:', err.message);
  }
  return [];
}

/**
 * Full Drama Detail & Episodes Resolver
 */
export async function fetchDramaDetail({ watch_url, slug, ep = 1, lang = 'vi-VN' }) {
  try {
    const query = new URLSearchParams({
      watch_url: watch_url || '',
      slug: slug || '',
      ep: String(ep || 1),
      lang: lang || 'vi-VN',
    }).toString();

    const res = await apiClient.get(`/api/drama?${query}`);
    if (res.data && res.data.ok) {
      return res.data;
    }
  } catch (err) {
    console.warn('[API] fetchDramaDetail failed:', err.message);
  }
  return null;
}

/**
 * On-Demand Episode Stream Resolver (Tier 1 Edge, Tier 2 Origin, Tier 3 HTML)
 */
export async function refreshEpisodeStream({ watch_url, slug, ep = 1, lang = 'vi-VN' }) {
  try {
    const query = new URLSearchParams({
      watch_url: watch_url || '',
      slug: slug || '',
      ep: String(ep || 1),
      lang: lang || 'vi-VN',
    }).toString();

    const res = await apiClient.get(`/api/episode/refresh?${query}`);
    if (res.data && res.data.ok) {
      return res.data;
    }
  } catch (err) {
    console.warn('[API] refreshEpisodeStream failed:', err.message);
  }
  return null;
}

/**
 * Helper to wrap any HLS or MP4 stream with CORS proxy if direct playback fails
 */
export function getProxyStreamUrl(streamUrl) {
  if (!streamUrl) return '';
  return `/api/proxy-stream?url=${encodeURIComponent(streamUrl)}`;
}

/**
 * Fetch or extract real HLS episode list for ANY drama dynamically
 */
export async function fetchDramaEpisodes(drama, lang = 'vi-VN') {
  if (!drama) return [];

  // 1. Check if we have cached episodes in IndexedDB first (Offline capability)
  try {
    const db = await getDB();
    if (db.objectStoreNames.contains('episodes_cache')) {
      const cached = await db.get('episodes_cache', drama.book_id);
      if (cached && Array.isArray(cached.episodes) && cached.episodes.length > 0) {
        return cached.episodes;
      }
    }
  } catch (e) {
    console.warn('[IndexedDB] Error checking episodes_cache:', e);
  }

  // 2. Pre-bundled episodes for Dragon Lord
  const isDragonLord =
    drama.book_id === '6a97e310be6de7bf87416219' ||
    (drama.title && drama.title.toLowerCase().includes('dragon lord'));

  if (isDragonLord && Array.isArray(dragonLordEpisodes) && dragonLordEpisodes.length > 0) {
    return dragonLordEpisodes;
  }

  // 3. For ANY movie, fetch dynamically via our local crawler /api/drama endpoint
  const watchUrl = drama.watch_url || drama.url || '';
  if (watchUrl) {
    try {
      let detail = await fetchDramaDetail({ watch_url: watchUrl, lang });
      if (!detail || !detail.ok || !Array.isArray(detail.episodes) || detail.episodes.length === 0) {
        // Fallback retry with id-ID (upstream native store)
        detail = await fetchDramaDetail({ watch_url: watchUrl, lang: 'id-ID' });
      }

      if (detail && detail.ok && Array.isArray(detail.episodes) && detail.episodes.length > 0) {
        const episodes = detail.episodes;

        // Cache in IndexedDB for offline viewing
        try {
          const db = await getDB();
          if (db.objectStoreNames.contains('episodes_cache')) {
            await db.put('episodes_cache', {
              book_id: drama.book_id,
              episodes,
              cachedAt: Date.now(),
            });
          }
        } catch (cacheErr) {
          console.warn('[IndexedDB] Cache save error:', cacheErr);
        }

        return episodes;
      }
    } catch (e) {
      console.warn(`[API] Failed to fetch dynamic episodes for "${drama.title}":`, e.message);
    }
  }

  // 4. Fallback: generate on-demand episode placeholders (NEVER inject Dragon Lord into other films!)
  const count = drama.chapter_count || 45;
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    route_episode_number: i + 1,
    number: i + 1,
    title: `Tập ${i + 1}`,
    play_url: '',
    is_playable: true,
    watch_url: drama.watch_url || '',
  }));
}

/**
 * Auto-Translate Content API
 */
export async function translateContent({ text, texts, to = 'vi' }) {
  try {
    if (Array.isArray(texts)) {
      const res = await apiClient.post('/api/translate', { texts, to });
      if (res.data && res.data.ok) {
        return res.data.translatedTexts;
      }
      return texts;
    } else if (text) {
      const res = await apiClient.get(`/api/translate?text=${encodeURIComponent(text)}&to=${encodeURIComponent(to)}`);
      if (res.data && res.data.ok) {
        return res.data.translatedText;
      }
      return text;
    }
  } catch (err) {
    console.warn('[API] translateContent error:', err.message);
  }
  return texts || text || '';
}

