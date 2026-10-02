import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Spin, Alert, Empty } from 'antd';
import { LoadingOutlined, CheckCircleOutlined, CloudSyncOutlined, DatabaseOutlined } from '@ant-design/icons';
import { fetchProviderSections } from '../services/api';
import { useDramaStore } from '../store/useDramaStore';
import { HeroBanner } from '../features/drama/HeroBanner';
import { SectionRow } from '../features/drama/SectionRow';
import { DramaCard } from '../features/drama/DramaCard';
import { ProviderSelector } from '../components/ProviderSelector';
import { SearchBar } from '../components/SearchBar';

export function Home() {
  const { selectedProvider, setSelectedProvider, searchQuery, activeTag } = useDramaStore();

  // Use TanStack React Query to fetch provider sections
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['provider-sections', selectedProvider],
    queryFn: () => fetchProviderSections(selectedProvider),
    staleTime: 5 * 60 * 1000, // 5 minutes fresh
    gcTime: 30 * 60 * 1000,
  });

  const providers = data?.providers || [];
  const sections = data?.sections || [];
  const activeProvider = data?.active_provider || selectedProvider;

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
      allSearchItems = allSearchItems.filter((item) =>
        item.tag_names?.some((t) => t.toLowerCase() === activeTag.toLowerCase())
      );
    }
  }

  // Data source label
  const dataSource = data?._source;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      {/* Search Bar with React Hook Form & Zod */}
      <SearchBar />

      {/* Provider Selector Bar */}
      {providers.length > 0 && (
        <ProviderSelector
          providers={providers}
          activeProvider={activeProvider}
          onSelect={(provKey) => setSelectedProvider(provKey)}
        />
      )}

      {/* Source Status Indicator */}
      <div className="flex items-center justify-between mb-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          {dataSource === 'network' && (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircleOutlined /> Dữ liệu trực tuyến từ máy chủ
            </span>
          )}
          {dataSource === 'cache' && (
            <span className="flex items-center gap-1 text-amber-400">
              <DatabaseOutlined /> Đang đọc từ bộ nhớ đệm IndexedDB (Offline)
            </span>
          )}
          {dataSource === 'fallback' && (
            <span className="flex items-center gap-1 text-indigo-400">
              <DatabaseOutlined /> Chế độ dự phòng ngoại tuyến
            </span>
          )}
          {isFetching && !isLoading && (
            <span className="text-slate-400 flex items-center gap-1">
              <CloudSyncOutlined className="animate-spin" /> Đang đồng bộ...
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 36, color: '#e11d48' }} spin />} />
          <span className="mt-4 text-sm text-slate-400">Đang tải danh sách phim...</span>
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
        <>
          {/* Top Hero Banner */}
          {featuredHero && <HeroBanner drama={featuredHero} />}

          {/* Render All Sections (Hot, New, Original, Asian, etc.) */}
          {sections.map((section) => (
            <SectionRow
              key={section.tab_key || section.tab_label}
              section={section}
              activeFilter={activeTag}
            />
          ))}
        </>
      )}
    </div>
  );
}

export default Home;
