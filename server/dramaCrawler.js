// DramaCrawler - Full crawl & streaming pipeline engine for FilmDrama PWA
// Synchronized with upstream narto-drama.com & edge clusters

const BASE_URL = 'https://narto-drama.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export function getHeaders(extraHeaders = {}) {
  const nd_ck = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  return {
    'User-Agent': USER_AGENT,
    'Cookie': `nd_ck=${nd_ck}`,
    'Accept': 'application/json, text/plain, text/html, */*',
    'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
    ...extraHeaders
  };
}

// 1. Live Providers Cache
let cachedProviders = null;
let lastProvidersFetch = 0;

export async function fetchLiveProvidersFromUpstream() {
  try {
    const url = `${BASE_URL}/home/providers/sections?provider=anyreel&lang=en-US&target_lang=en-US`;
    const response = await fetch(url, {
      headers: getHeaders({ 'X-Requested-With': 'XMLHttpRequest' })
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.providers) && data.providers.length > 0) {
        cachedProviders = data.providers;
        lastProvidersFetch = Date.now();
        console.log(`[DramaCrawler] Synced ${cachedProviders.length} providers from upstream`);
        return cachedProviders;
      }
    }
  } catch (err) {
    console.error('[DramaCrawler] Failed to sync live providers:', err.message);
  }
  return cachedProviders || [];
}

export async function getLiveProviders() {
  const now = Date.now();
  if (!cachedProviders || (now - lastProvidersFetch > 5 * 60 * 1000)) {
    await fetchLiveProvidersFromUpstream();
  }
  return cachedProviders || [];
}

// Poster URL normalizers
export function normalizePosterUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('/')) return `${BASE_URL}${trimmed}`;
  return trimmed;
}

export function normalizeItem(item) {
  if (!item || typeof item !== 'object') return item;
  if (item.poster_url) item.poster_url = normalizePosterUrl(item.poster_url);
  if (item.cover_url) item.cover_url = normalizePosterUrl(item.cover_url);
  if (item.cover) item.cover = normalizePosterUrl(item.cover);
  if (item.poster) item.poster = normalizePosterUrl(item.poster);
  return item;
}

// 2. Sections Fetcher with Resilient Multilingual Fallback Chain
export async function fetchSections(provider = 'anyreel', page = 1, query = '', lang = 'vi-VN') {
  async function fetchSectionsFromUpstream(targetLang, useTargetFilter = true) {
    try {
      const params = new URLSearchParams();
      params.set('provider', provider);
      if (targetLang && targetLang !== 'all') {
        params.set('lang', targetLang);
        if (useTargetFilter) {
          params.set('target_lang', targetLang);
        }
      }
      if (query) {
        params.set('q', query);
      } else if (page > 1) {
        const commonTabs = ['home', 'list', 'all', 'all-series', 'for-you', 'feed-stream', 'popular', 'trending', 'latest', 'rank', 'new', 'foryou', 'free', 'new-releases'];
        commonTabs.forEach(t => params.set(`tab_pages[${t}]`, String(page)));
      }

      const url = `${BASE_URL}/home/providers/sections?${params.toString()}`;
      const response = await fetch(url, {
        headers: getHeaders({ 'X-Requested-With': 'XMLHttpRequest' }),
        signal: AbortSignal.timeout(9000),
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      return null;
    }
  }

  // Primary fetch with selected language
  let data = await fetchSectionsFromUpstream(lang, lang !== 'all');

  const countItems = (d) => {
    if (!d || !Array.isArray(d.sections)) return 0;
    return d.sections.reduce((acc, s) => acc + (Array.isArray(s.items) ? s.items.length : 0), 0);
  };

  let totalItems = countItems(data);

  // Fallback 1: If 0 items, retry without strict target_lang filter
  if (totalItems === 0 && !query) {
    const fb1 = await fetchSectionsFromUpstream(lang, false);
    if (countItems(fb1) > 0) {
      data = fb1;
      totalItems = countItems(data);
    }
  }

  // Fallback 2: If still 0 items, fallback to Indonesian (id-ID, upstream native store)
  if (totalItems === 0 && !query && lang !== 'id-ID') {
    const fb2 = await fetchSectionsFromUpstream('id-ID', false);
    if (countItems(fb2) > 0) {
      data = fb2;
      totalItems = countItems(data);
    }
  }

  // Fallback 3: If still 0 items, fallback to English (en-US)
  if (totalItems === 0 && !query && lang !== 'en-US') {
    const fb3 = await fetchSectionsFromUpstream('en-US', false);
    if (countItems(fb3) > 0) {
      data = fb3;
      totalItems = countItems(data);
    }
  }

  if (!data) {
    return { ok: false, active_provider: provider, error: 'Failed to fetch sections from upstream' };
  }

  // Guarantee active_provider matches the requested provider
  data.active_provider = provider;

  if (Array.isArray(data.providers) && data.providers.length > 0) {
    cachedProviders = data.providers;
    lastProvidersFetch = Date.now();
  }

  // Normalize posters across all items
  if (Array.isArray(data.sections)) {
    data.sections.forEach(sec => {
      if (Array.isArray(sec.items)) {
        sec.items.forEach(normalizeItem);
      }
    });
  }

  return {
    ok: true,
    provider,
    active_provider: data.active_provider || provider,
    providers: data.providers || cachedProviders || [],
    sections: data.sections || [],
    tab_pages: data.tab_pages || {}
  };
}

// 3. Search API
export async function searchDramas(query = '', lang = 'vi-VN') {
  if (!query.trim()) {
    return { ok: true, items: [] };
  }

  const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}&limit=50&lang=${encodeURIComponent(lang)}`;
  const response = await fetch(url, {
    headers: getHeaders({ 'X-Requested-With': 'XMLHttpRequest' })
  });

  if (!response.ok) {
    return { ok: false, error: `Upstream search error: ${response.status}`, items: [] };
  }

  const data = await response.json();
  const rawItems = data.items || data || [];
  const items = rawItems.map(normalizeItem);
  return { ok: true, items };
}

// 4. Drama Detail & Episodes Resolver (with Resilient Recovery Strategies)
export async function resolveDrama({ watch_url, slug, ep = '1', lang = 'vi-VN' }) {
  let watchUrl = watch_url;
  if (!watchUrl && slug) {
    watchUrl = `${BASE_URL}/detail/watch/${slug}/${ep}?lang=${encodeURIComponent(lang)}&from=home`;
  }

  if (!watchUrl) {
    return { ok: false, error: 'watch_url or slug is required' };
  }

  if (watchUrl.startsWith('/')) {
    watchUrl = BASE_URL + watchUrl;
  }

  if (watchUrl.includes('lang=')) {
    watchUrl = watchUrl.replace(/lang=[^&]+/, `lang=${encodeURIComponent(lang)}`);
  } else {
    watchUrl += (watchUrl.includes('?') ? '&' : '?') + `lang=${encodeURIComponent(lang)}`;
  }

  const headers = getHeaders();
  let pageRes = await fetch(watchUrl, { headers, redirect: 'follow' });
  let html = await pageRes.text();
  let finalUrl = pageRes.url;

  // Extract metadata
  let title = '';
  const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) {
    title = titleMatch[1].replace(/ - Streaming Gratis.*$/i, '').replace(/^"|"$/g, '').trim();
  }

  let description = '';
  const descMatch = html.match(/<meta name="description" content="([^"]+)"/i);
  if (descMatch) {
    description = descMatch[1].replace(/^"|"$/g, '').trim();
  }

  let poster = '';
  const posterMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
  if (posterMatch) {
    poster = normalizePosterUrl(posterMatch[1]);
  }

  const extractSlug = (u) => {
    try {
      const match = u.match(/\/detail\/watch\/([^\/?#]+)(?:\/(\d+))?/);
      if (match) return match[1];
    } catch(e) {}
    return '';
  };
  const dramaSlug = extractSlug(finalUrl) || extractSlug(watchUrl) || slug || '';

  // Extract refreshSourceContextToken and base url from upstream page if present
  let contextToken = '';
  const tokenMatch = html.match(/refreshSourceContextToken\s*=\s*["']([^"']+)["']/);
  if (tokenMatch) {
    contextToken = tokenMatch[1];
  }

  // Step 1b: If finalUrl was redirected to home page (e.g. narto-drama.com/ or narto-drama.com/?lang=...)
  // it means search/import failed with lang=vi-VN. Try with the native store lang=id-ID / en-US!
  if (finalUrl === BASE_URL || finalUrl === `${BASE_URL}/` || finalUrl.startsWith(`${BASE_URL}/?`)) {
    console.warn(`[DramaCrawler] search/import redirected to home. Retrying with id-ID fallback...`);
    const fallbackUrl = watchUrl.includes('lang=')
      ? watchUrl.replace(/lang=[^&]+/, 'lang=id-ID').replace(/target_lang=[^&]+/, 'target_lang=id-ID')
      : `${watchUrl}&lang=id-ID&target_lang=id-ID`;
    try {
      const fbRes = await fetch(fallbackUrl, { headers, redirect: 'follow' });
      if (fbRes.url !== BASE_URL && fbRes.url !== `${BASE_URL}/`) {
        pageRes = fbRes;
        html = await fbRes.text();
        finalUrl = fbRes.url;
        const fbTokenMatch = html.match(/refreshSourceContextToken\s*=\s*["']([^"']+)["']/);
        if (fbTokenMatch) contextToken = fbTokenMatch[1];
      }
    } catch (e) {
      console.warn('[DramaCrawler] Fallback fetch failed:', e.message);
    }
  }

  // Extract episodeItemsRaw
  let episodes = [];
  const epMatch = html.match(/const episodeItemsRaw = (\[[\s\S]*?\]);/);
  if (epMatch) {
    try {
      episodes = JSON.parse(epMatch[1]);
    } catch (e) {
      console.error('[DramaCrawler] Error parsing episodeItemsRaw:', e);
    }
  }

  // Step 2: If episodes are not in current page, directly fetch /detail/watch/{dramaSlug}/1
  if (episodes.length === 0 && dramaSlug) {
    try {
      const ep1Url = `${BASE_URL}/detail/watch/${dramaSlug}/1?lang=${encodeURIComponent(lang)}&from=home`;
      const pageRes2 = await fetch(ep1Url, { headers });
      const html2 = await pageRes2.text();
      const epMatch2 = html2.match(/const episodeItemsRaw = (\[[\s\S]*?\]);/);
      if (epMatch2) {
        try {
          episodes = JSON.parse(epMatch2[1]);
        } catch (e) {
          console.error('[DramaCrawler] Error parsing episodeItemsRaw (step 2):', e);
        }
      }
      if (html2.includes('class="episode-item"')) {
        html = html2;
      }
    } catch (e) {
      console.warn('[DramaCrawler] Step 2 direct ep1 fetch failed:', e.message);
    }
  }

  // Step 3: Parse HTML <a class="episode-item" ...> links
  if (episodes.length <= 1) {
    const escapedSlug = dramaSlug ? dramaSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '[^"/]+';
    const epItemRegex = new RegExp(`<a[^>]*class="[^"]*episode-item[^"]*"[^>]*href="([^"]*\\/detail\\/watch\\/${escapedSlug}\\/(\\d+)[^"]*)"[^>]*title="([^"]*)"[^>]*>([\\s\\S]*?)<\\/a>`, 'gi');
    let m;
    const htmlEpisodes = [];
    while ((m = epItemRegex.exec(html)) !== null) {
      const epUrl = m[1].replace(/&amp;/g, '&');
      const epTitle = m[3] || m[4].replace(/<[^>]+>/g, '').trim();
      const epNum = parseInt(m[2], 10) || htmlEpisodes.length + 1;
      htmlEpisodes.push({
        id: epNum,
        number: epNum,
        route_episode_number: epNum,
        title: epTitle || `Episode ${epNum}`,
        watch_url: epUrl,
        play_url: (episodes[0] && epNum === (episodes[0].number || 1)) ? episodes[0].play_url : '',
        direct_play_url: (episodes[0] && epNum === (episodes[0].number || 1)) ? episodes[0].direct_play_url : '',
        thumb_url: episodes[0]?.thumb_url || poster
      });
    }
    if (htmlEpisodes.length > episodes.length) {
      episodes = htmlEpisodes;
    }
  }

  // Resilient Recovery
  const hasPlayableStream = episodes.some(e => (e.play_url || e.direct_play_url));
  if (!hasPlayableStream && episodes.length > 0) {
    console.log(`[DramaCrawler] 0 playable episodes found for ${watchUrl}. Attempting resilient recovery...`);
    let recoveredEps = null;

    // Strategy 1: Clean trailing -2, -3 from slug and fetch base drama /1
    const rawUrl = watchUrl.split('?')[0];
    const cleanRaw = rawUrl.replace(/-[2-9]$/, '');
    if (cleanRaw !== rawUrl) {
      try {
        const query = watchUrl.split('?')[1] ? '?' + watchUrl.split('?')[1] : '';
        const targetUrl = (cleanRaw.startsWith('http') ? cleanRaw : `${BASE_URL}${cleanRaw}`) + `/1${query}`;
        const recRes = await fetch(targetUrl, { headers });
        const recHtml = await recRes.text();
        const recMatch = recHtml.match(/const episodeItemsRaw = (\[[\s\S]*?\]);/);
        if (recMatch) {
          const parsed = JSON.parse(recMatch[1]);
          if (parsed.some(e => e.play_url || e.direct_play_url)) {
            recoveredEps = parsed;
            console.log(`[DramaCrawler] Successfully recovered ${parsed.length} playable episodes via clean slug!`);
          }
        }
      } catch (e) {
        console.error('[DramaCrawler] Strategy 1 failed:', e.message);
      }
    }

    // Strategy 2: Search upstream by drama title and find an alternate working entry
    if (!recoveredEps && title) {
      try {
        const cleanSearchTitle = title.replace(/\s*-\s*Free Streaming.*$/i, '').trim();
        const searchRes = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(cleanSearchTitle)}&limit=10&lang=${encodeURIComponent(lang)}`, {
          headers: getHeaders({ 'X-Requested-With': 'XMLHttpRequest' })
        });
        if (searchRes.ok) {
          const sData = await searchRes.json();
          const sItems = sData.items || sData || [];
          const altItem = sItems.find(i => i.url && i.url !== watchUrl && !i.url.includes(watchUrl.split('?')[0]) && i.title && i.title.toLowerCase().trim() === cleanSearchTitle.toLowerCase().trim());
          if (altItem && altItem.url) {
            const altPath = altItem.url.split('?')[0];
            const altUrl = `${BASE_URL}${altPath}/1`;
            const altRes = await fetch(altUrl, { headers });
            const altHtml = await altRes.text();
            const altMatch = altHtml.match(/const episodeItemsRaw = (\[[\s\S]*?\]);/);
            if (altMatch) {
              const parsed = JSON.parse(altMatch[1]);
              if (parsed.some(e => e.play_url || e.direct_play_url)) {
                recoveredEps = parsed;
                console.log(`[DramaCrawler] Successfully recovered ${parsed.length} playable episodes via title search!`);
              }
            }
          }
        }
      } catch (e) {
        console.error('[DramaCrawler] Strategy 2 failed:', e.message);
      }
    }

    if (recoveredEps && recoveredEps.length > 0) {
      episodes = recoveredEps;
    }
  }

  // Format clean episodes
  const cleanEpisodes = episodes.map((item, idx) => {
    const epNum = item.route_episode_number || item.number || idx + 1;
    const playUrl = item.play_url || item.direct_play_url || '';
    const epWatchUrl = item.watch_url || (dramaSlug ? `${BASE_URL}/detail/watch/${dramaSlug}/${epNum}?lang=${encodeURIComponent(lang)}&from=home` : '');
    let subUrl = item.subtitle_url || item.direct_subtitle_url || '';
    if (subUrl && subUrl.startsWith('/')) {
      subUrl = `${BASE_URL}${subUrl}`;
    }
    const multiSubs = Array.isArray(item.multi_subtitles) ? item.multi_subtitles.map(s => ({
      ...s,
      subtitle_url: s.subtitle_url && s.subtitle_url.startsWith('/') ? `${BASE_URL}${s.subtitle_url}` : (s.subtitle_url || '')
    })) : [];

    return {
      id: item.id || idx + 1,
      number: epNum,
      route_episode_number: epNum,
      title: item.title || `Episode ${epNum}`,
      play_url: playUrl,
      direct_play_url: item.direct_play_url || '',
      watch_url: epWatchUrl,
      thumb_url: item.thumb_url || poster,
      subtitle_url: subUrl,
      multi_subtitles: multiSubs,
      rs_ctx: contextToken || '',
      is_playable: true,
      is_hls: playUrl.includes('.m3u8') || item.browser_prefetch_mode === 'hls'
    };
  });

  const isOk = cleanEpisodes.length > 0;

  return {
    ok: isOk,
    slug: dramaSlug,
    title,
    description,
    poster,
    final_url: finalUrl,
    rs_ctx: contextToken || '',
    total_episodes: cleanEpisodes.length,
    episodes: cleanEpisodes,
    error: isOk ? null : 'Hiện chưa có tập phim khả dụng từ nhà cung cấp cho tựa phim này.'
  };
}

// 5. On-Demand Episode Stream Resolver (Tier 1 Edge -> Tier 2 Origin -> Tier 3 HTML)
export async function refreshEpisodeStream({ watch_url, slug, ep = '1', lang = 'vi-VN', rs_ctx = '' }) {
  let epNum = parseInt(ep || '1', 10);
  let dramaSlug = slug;

  if (!dramaSlug && watch_url) {
    try {
      const match = watch_url.match(/\/detail\/watch\/([^\/?#]+)(?:\/(\d+))?/);
      if (match) {
        dramaSlug = match[1];
        if (!ep && match[2]) epNum = parseInt(match[2], 10);
      }
    } catch(e) {}
  }

  // If still no slug and watch_url is search/import, follow redirect to extract slug
  if (!dramaSlug && watch_url && watch_url.includes('/search/import')) {
    try {
      const res = await fetch(watch_url, { headers: getHeaders(), redirect: 'follow' });
      const match = res.url.match(/\/detail\/watch\/([^\/?#]+)(?:\/(\d+))?/);
      if (match) {
        dramaSlug = match[1];
        if (!ep && match[2]) epNum = parseInt(match[2], 10);
      }
    } catch {}
  }

  if (!dramaSlug) {
    return { ok: false, error: 'slug or watch_url is required' };
  }

  const headers = getHeaders({
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': `${BASE_URL}/detail/watch/${dramaSlug}/${epNum}?lang=${lang}&from=home`
  });

  const ctxParam = rs_ctx ? `&rs_ctx=${encodeURIComponent(rs_ctx)}` : '';

  // Tier 1: Query Edge refresh-source (with force_edge & rs_ctx)
  let streamData = null;
  const edgeVariants = [
    `https://edge.narto-drama.com/e/rs/detail/watch/${dramaSlug}/${epNum}/refresh-source?force=1&force_edge=1&lang=${lang}${ctxParam}`,
    `https://edge.narto-drama.com/e/rs/detail/watch/${dramaSlug}/${epNum}/refresh-source?force=1&no_cache=1&lang=${lang}${ctxParam}`,
    `https://edge.narto-drama.com/e/rs/detail/watch/${dramaSlug}/${epNum}/refresh-source?force=1&lang=${lang}${ctxParam}`
  ];

  for (const edgeRefreshUrl of edgeVariants) {
    try {
      const rRes = await fetch(edgeRefreshUrl, { headers });
      if (rRes.ok) {
        const j = await rRes.json();
        if (j && (j.play_url || j.direct_play_url)) {
          streamData = j;
          break;
        }
      }
    } catch (e) {
      console.warn('[DramaCrawler] Edge resolution attempt failed:', e.message);
    }
  }

  // Tier 2: Query Origin refresh-source
  if (!streamData) {
    try {
      const originRefreshUrl = `${BASE_URL}/detail/watch/${dramaSlug}/${epNum}/refresh-source?force=1&force_edge=1&lang=${lang}${ctxParam}`;
      const rRes2 = await fetch(originRefreshUrl, { headers });
      if (rRes2.ok) {
        const j2 = await rRes2.json();
        if (j2 && (j2.play_url || j2.direct_play_url)) {
          streamData = j2;
        }
      }
    } catch (e) {
      console.warn('[DramaCrawler] Tier 2 Origin resolution failed:', e.message);
    }
  }

  if (streamData && (streamData.play_url || streamData.direct_play_url)) {
    const playUrl = streamData.play_url || streamData.direct_play_url;
    let subUrl = streamData.subtitle_url || streamData.direct_subtitle_url || '';
    if (subUrl && subUrl.startsWith('/')) {
      subUrl = `${BASE_URL}${subUrl}`;
    }
    const multiSubs = Array.isArray(streamData.multi_subtitles) ? streamData.multi_subtitles.map(s => ({
      ...s,
      subtitle_url: s.subtitle_url && s.subtitle_url.startsWith('/') ? `${BASE_URL}${s.subtitle_url}` : (s.subtitle_url || '')
    })) : [];

    return {
      ok: true,
      episode_number: epNum,
      play_url: playUrl,
      direct_play_url: streamData.direct_play_url || '',
      subtitle_url: subUrl,
      multi_subtitles: multiSubs,
      is_hls: playUrl.includes('.m3u8') || streamData.direct_play_is_hls === true,
      source_refreshed: streamData.source_refreshed === true
    };
  }

  // Tier 3: Parse HTML page of that episode
  try {
    const epPageUrl = `${BASE_URL}/detail/watch/${dramaSlug}/${epNum}?lang=${lang}&from=home`;
    const pageRes = await fetch(epPageUrl, { headers: getHeaders() });
    if (pageRes.ok) {
      const pageHtml = await pageRes.text();
      const epMatch = pageHtml.match(/const episodeItemsRaw = (\[[\s\S]*?\]);/);
      if (epMatch) {
        const rawList = JSON.parse(epMatch[1]);
        const matched = rawList.find(e => e.number === epNum || e.route_episode_number === epNum);
        if (matched && (matched.play_url || matched.direct_play_url)) {
          const pUrl = matched.play_url || matched.direct_play_url;
          let subUrl = matched.subtitle_url || matched.direct_subtitle_url || '';
          if (subUrl && subUrl.startsWith('/')) {
            subUrl = `${BASE_URL}${subUrl}`;
          }
          const multiSubs = Array.isArray(matched.multi_subtitles) ? matched.multi_subtitles.map(s => ({
            ...s,
            subtitle_url: s.subtitle_url && s.subtitle_url.startsWith('/') ? `${BASE_URL}${s.subtitle_url}` : (s.subtitle_url || '')
          })) : [];

          return {
            ok: true,
            episode_number: epNum,
            play_url: pUrl,
            direct_play_url: matched.direct_play_url || '',
            subtitle_url: subUrl,
            multi_subtitles: multiSubs,
            is_hls: pUrl.includes('.m3u8') || matched.browser_prefetch_mode === 'hls'
          };
        }
      }
    }
  } catch (e) {
    console.error('[DramaCrawler] Tier 3 HTML fallback failed:', e.message);
  }

  return { ok: false, error: `Could not resolve stream for episode ${epNum}` };
}

// 6. Subtitle Proxy (Pass through upstream VTT/SRT with CORS headers)
export async function proxySubtitle(targetUrl) {
  if (!targetUrl) return { ok: false, error: 'Subtitle URL is required' };
  let url = targetUrl;
  if (url.startsWith('/')) {
    url = `${BASE_URL}${url}`;
  }
  try {
    const headers = getHeaders();
    const res = await fetch(url, { headers });
    if (!res.ok) {
      return { ok: false, status: res.status };
    }
    const content = await res.text();
    return {
      ok: true,
      content,
      contentType: res.headers.get('content-type') || 'text/vtt; charset=utf-8'
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

