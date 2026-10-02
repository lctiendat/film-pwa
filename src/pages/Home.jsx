import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Spin, Alert, Empty } from 'antd';
import { LoadingOutlined, CheckCircleOutlined, CloudSyncOutlined, DatabaseOutlined, SyncOutlined } from '@ant-design/icons';
import { fetchProviderSections } from '../services/api';
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

  // Use TanStack React Query to fetch provider sections with placeholder retention
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
    placeholderData: (previousData) => previousData,
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

  // Global search filtering across all sections if searchQuery is active
  const isSearchActive = Boolean(searchQuery && searchQuery.trim().length > 0);
  
  let allSearchItems = [];
  if (isSearchActive) {
    const q = searchQuery.toLowerCase().trim();
    const seen = new Set();
    sections.forEach((sec) => {
      sec.items?.forEach((item) => {
        if (!seen.has(item.book_id)) {
          const matchTitle = item.title?.toLowerCase().includes(q);
          const matchDesc = item.description?.toLowerCase().includes(q);
          const matchTags = item.tag_names?.some((t) => t.toLowerCase().includes(q));
          const matchCat = item.category_name?.toLowerCase().includes(q);
          if (matchTitle || matchDesc || matchTags || matchCat) {
            seen.add(item.book_id);
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
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-800">
            <h2 className="text-xl font-bold text-white font-display">
              Kết quả tìm kiếm cho "{searchQuery}"
            </h2>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-rose-400 font-semibold">
              Tìm thấy {allSearchItems.length} phim
            </span>
          </div>

          {allSearchItems.length === 0 ? (
            <div className="py-16 text-center">
              <Empty
                description={
                  <span className="text-slate-400">
                    Không tìm thấy phim phù hợp với từ khóa "{searchQuery}". Thử từ khóa khác xem sao!
                  </span>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
              {allSearchItems.map((item) => (
                <DramaCard key={item.book_id} drama={item} />
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
                  <span className="text-slate-400">
                    Chưa có danh mục phim từ {activeProviderLabel}. Vui lòng chọn nhà cung cấp khác.
                  </span>
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
