import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Spin, Alert, Empty } from 'antd';
import { LoadingOutlined, CheckCircleOutlined, CloudSyncOutlined, DatabaseOutlined, SyncOutlined } from '@ant-design/icons';
import { fetchProviderSections, searchDramas } from '../services/api';
import { useDramaStore } from '../store/useDramaStore';
import { FALLBACK_DATA } from '../services/fallbackData';
import { HeroBanner } from '../features/drama/HeroBanner';
import { SectionRow } from '../features/drama/SectionRow';
import { DramaCard } from '../features/drama/DramaCard';
import { ProviderSelector } from '../components/ProviderSelector';
import { SearchBar } from '../components/SearchBar';

export function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlProvider = searchParams.get('provider') || '';
  const { selectedProvider, setSelectedProvider, searchQuery, activeTag } = useDramaStore();

  // Active provider prioritizes URL query param, falls back to store, then 'anyreel'
  const activeProvider = urlProvider || selectedProvider || 'anyreel';

  // Keep store in sync when URL changes (e.g. browser back/forward, direct link)
  useEffect(() => {
    if (urlProvider && urlProvider !== selectedProvider) {
      setSelectedProvider(urlProvider);
    }
  }, [urlProvider, selectedProvider, setSelectedProvider]);

  // Handle provider selection: update both Zustand and browser URL
  const handleSelectProvider = (provKey) => {
    const key = (!provKey || provKey === 'all') ? 'all' : provKey;
    setSelectedProvider(key);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (key && key !== 'all') {
        next.set('provider', key);
      } else {
        next.delete('provider');
      }
      return next;
    }, { replace: false });
  };

  const queryProvider = activeProvider === 'all' ? 'anyreel' : activeProvider;

  // Use TanStack React Query to fetch provider sections
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['provider-sections', queryProvider],
    queryFn: () => fetchProviderSections(queryProvider),
    staleTime: 5 * 60 * 1000, // 5 minutes fresh
    gcTime: 30 * 60 * 1000,
  });

  const providers = (data?.providers && data.providers.length > 0)
    ? data.providers
    : (FALLBACK_DATA.providers || []);

  const sections = data?.sections || [];

  // Active provider display label
  const activeProviderObj = providers.find((p) => p.key?.toLowerCase() === activeProvider.toLowerCase());
  const activeProviderLabel = activeProviderObj?.label || (activeProvider === 'all' ? 'Tất cả' : activeProvider);

  // Extract featured hero item (first item in Hot section or first available item)
  const hotSection = sections.find((s) => s.tab_label?.toLowerCase().includes('hot')) || sections[0];
  const featuredHero = hotSection?.items?.[0] || null;

  // Live Server Search Query when searchQuery is active
  const trimmedSearchQuery = (searchQuery || '').trim();
  const isSearchActive = Boolean(trimmedSearchQuery.length > 0);

  const {
    data: serverSearchResults,
    isLoading: isSearching,
  } = useQuery({
    queryKey: ['search-dramas-home', trimmedSearchQuery],
    queryFn: () => searchDramas(trimmedSearchQuery, 'vi-VN'),
    enabled: isSearchActive,
    staleTime: 3 * 60 * 1000,
  });

  let allSearchItems = [];
  if (isSearchActive) {
    const seen = new Set();
    if (Array.isArray(serverSearchResults)) {
      serverSearchResults.forEach((item) => {
        const id = item.book_id || item.id;
        if (id && !seen.has(id)) {
          seen.add(id);
          allSearchItems.push(item);
        }
      });
    }

    const qLower = trimmedSearchQuery.toLowerCase();
    sections.forEach((sec) => {
      sec.items?.forEach((item) => {
        const id = item.book_id || item.id;
        if (id && !seen.has(id)) {
          const matchTitle = item.title?.toLowerCase().includes(qLower);
          const matchDesc = item.description?.toLowerCase().includes(qLower);
          const matchTags = item.tag_names?.some((t) => t.toLowerCase().includes(qLower));
          const matchCat = item.category_name?.toLowerCase().includes(qLower);
          if (matchTitle || matchDesc || matchTags || matchCat) {
            seen.add(id);
            allSearchItems.push(item);
          }
        }
      });
    });

    if (activeTag !== 'all') {
      const tagLower = activeTag.toLowerCase().trim();
      allSearchItems = allSearchItems.filter((item) => {
        const matchTag = item.tag_names?.some((t) => t.toLowerCase().includes(tagLower) || tagLower.includes(t.toLowerCase()));
        const matchText = item.title?.toLowerCase().includes(tagLower) || item.description?.toLowerCase().includes(tagLower);
        return matchTag || matchText;
      });
    }
  }

  // Count total matching items across all sections for the active filter
  const totalFilteredCount = sections.reduce((acc, sec) => {
    if (!sec.items) return acc;
    if (activeTag === 'all') return acc + sec.items.length;
    const tagLower = activeTag.toLowerCase().trim();
    const count = sec.items.filter((it) => {
      const matchTag = it.tag_names?.some((t) => t.toLowerCase().includes(tagLower) || tagLower.includes(t.toLowerCase()));
      const matchText = it.title?.toLowerCase().includes(tagLower) || it.description?.toLowerCase().includes(tagLower);
      return matchTag || matchText;
    }).length;
    return acc + count;
  }, 0);

  // Data source label
  const dataSource = data?._source;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      {/* Search Bar with React Hook Form & Zod */}
      <SearchBar />

      {/* Provider Selector Bar - Always mounted with Fallback if needed */}
      <ProviderSelector
        providers={providers}
        activeProvider={activeProvider}
        onSelect={handleSelectProvider}
      />

      {/* Active Genre Filter Indicator Bar */}
      {activeTag !== 'all' && (
        <div className="flex items-center justify-between mb-4 px-4 py-2.5 rounded-2xl bg-rose-600/15 border border-rose-500/30 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-300">Đang lọc theo thể loại:</span>
            <span className="font-semibold text-rose-300 bg-rose-500/25 px-2.5 py-0.5 rounded-lg border border-rose-500/30">
              {activeTag}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTag('all')}
            className="text-rose-400 hover:text-white hover:underline font-semibold cursor-pointer"
          >
            ✕ Xóa bộ lọc (Xem tất cả phim)
          </button>
        </div>
      )}

      {/* Source Status Indicator */}
      <div className="flex items-center justify-between mb-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          {dataSource === 'network' && (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircleOutlined /> Dữ liệu trực tuyến từ máy chủ ({activeProviderLabel})
            </span>
          )}
          {dataSource === 'cache' && (
            <span className="flex items-center gap-1 text-amber-400">
              <DatabaseOutlined /> Đang đọc từ bộ nhớ đệm ({activeProviderLabel})
            </span>
          )}
          {dataSource === 'fallback' && (
            <span className="flex items-center gap-1 text-indigo-400">
              <DatabaseOutlined /> Chế độ dự phòng ngoại tuyến
            </span>
          )}
          {isFetching && (
            <span className="text-rose-400 flex items-center gap-1.5 font-medium animate-pulse">
              <SyncOutlined className="animate-spin" /> Đang tải phim từ {activeProviderLabel}...
            </span>
          )}
        </div>
      </div>

      {isLoading && !data ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 36, color: '#e11d48' }} spin />} />
          <span className="mt-4 text-sm text-slate-400">Đang tải danh sách phim từ {activeProviderLabel}...</span>
        </div>
      ) : isError ? (
        <div className="my-8">
          <Alert
            message="Không thể kết nối máy chủ"
            description={error?.message || 'Vui lòng kiểm tra lại kết nối hoặc thử lại sau.'}
            type="warning"
            showIcon
            action={
              <button
                onClick={() => refetch()}
                className="text-xs font-semibold text-rose-500 hover:underline"
              >
                Tải lại
              </button>
            }
          />
        </div>
      ) : isSearchActive ? (
        /* Search Results View */
        <div className="my-6">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-display flex items-center gap-2">
                <span>Kết quả tìm kiếm:</span>
                <span className="text-rose-400 italic">"{trimmedSearchQuery}"</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Dữ liệu tìm kiếm trực tuyến toàn bộ kho phim
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-3.5 py-1 text-xs text-rose-300 font-bold">
                {isSearching ? 'Đang tìm kiếm...' : `Tìm thấy ${allSearchItems.length} phim`}
              </span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                ✕ Đóng
              </button>
            </div>
          </div>

          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Spin indicator={<LoadingOutlined style={{ fontSize: 36, color: '#e11d48' }} spin />} />
              <span className="mt-4 text-sm text-slate-300 font-medium animate-pulse">
                Đang tìm phim "{trimmedSearchQuery}" trên máy chủ...
              </span>
            </div>
          ) : allSearchItems.length === 0 ? (
            <div className="py-16 text-center">
              <Empty
                description={
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <span>Không tìm thấy phim phù hợp với từ khóa "{trimmedSearchQuery}".</span>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="mt-2 px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                    >
                      Xóa tìm kiếm
                    </button>
                  </div>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-5">
              {allSearchItems.map((item, idx) => (
                <DramaCard key={item.book_id || item.id || idx} drama={item} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Standard Home View */
        <div className={`transition-opacity duration-300 ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
          {/* Top Hero Banner */}
          {featuredHero && <HeroBanner drama={featuredHero} />}

          {/* Render All Sections (Hot, New, Original, Asian, etc.) */}
          {sections.length > 0 && activeTag !== 'all' && totalFilteredCount === 0 ? (
            <div className="py-16 text-center">
              <Empty
                description={
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <span>Không có phim nào thuộc thể loại "{activeTag}" ở nhà cung cấp {activeProviderLabel}.</span>
                    <button
                      type="button"
                      onClick={() => setActiveTag('all')}
                      className="mt-3 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs cursor-pointer shadow-md shadow-rose-600/30"
                    >
                      Xem tất cả phim của {activeProviderLabel}
                    </button>
                  </div>
                }
              />
            </div>
          ) : sections.length > 0 ? (
            sections.map((section) => (
              <SectionRow
                key={section.tab_key || section.tab_label}
                section={section}
                activeFilter={activeTag}
              />
            ))
          ) : !isFetching ? (
            <div className="py-16 text-center">
              <Empty
                description={
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <span>Chưa có danh mục phim hiển thị từ {activeProviderLabel}.</span>
                    <div className="flex items-center gap-2 mt-1">
                      {activeTag !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setActiveTag('all')}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700"
                        >
                          Bỏ lọc thể loại ({activeTag})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => refetch()}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer shadow-md shadow-rose-600/30"
                      >
                        Tải lại danh sách phim
                      </button>
                    </div>
                  </div>
                }
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default Home;
