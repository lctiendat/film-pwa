import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Spin, Empty, Tag } from 'antd';
import {
  SearchOutlined,
  CloseCircleOutlined,
  FireFilled,
  HistoryOutlined,
  ClearOutlined,
  FilterOutlined,
  LoadingOutlined,
  ArrowLeftOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { searchDramas } from '../services/api';
import { DramaCard } from '../features/drama/DramaCard';
import { useDramaStore } from '../store/useDramaStore';

const HOT_KEYWORDS = [
  'Chạy Về Nơi Phía Anh',
  'Vợ Thiếu Soái',
  'Hoàng Đế Không Thoát Nổi',
  'Người Giữ Rừng Hưng An Lĩnh',
  'Yêu Kẻ Tôi Hận',
  'Nữ Tỷ Phú Bị Ruồng Bỏ',
  'Revenge',
  'Billionaire',
  'Werewolf',
  'CEO',
];

const QUICK_GENRES = [
  'Tất cả',
  'Romansa',
  'Revenge',
  'CEO',
  'Billionaire',
  'Werewolf',
  'Fantasi',
  'Urban',
  'Superpowers',
];

export function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setSearchQuery: setStoreSearchQuery } = useDramaStore();

  const urlQuery = searchParams.get('q') || '';
  const urlLang = searchParams.get('lang') || 'vi-VN';

  const [inputValue, setInputValue] = useState(urlQuery);
  const [activeLang, setActiveLang] = useState(urlLang);
  const [selectedGenre, setSelectedGenre] = useState('Tất cả');
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('df_recent_searches') || '[]');
    } catch {
      return [];
    }
  });

  // Sync state if URL query changes
  useEffect(() => {
    setInputValue(urlQuery);
  }, [urlQuery]);

  const saveRecentSearch = (term) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    try {
      const updated = [trimmed, ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
      setRecentSearches(updated);
      localStorage.setItem('df_recent_searches', JSON.stringify(updated));
    } catch {}
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('df_recent_searches');
    } catch {}
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const query = inputValue.trim();
    if (!query) return;

    saveRecentSearch(query);
    setStoreSearchQuery(query);
    setSearchParams({ q: query, lang: activeLang });
  };

  const handleSelectKeyword = (keyword) => {
    setInputValue(keyword);
    saveRecentSearch(keyword);
    setStoreSearchQuery(keyword);
    setSearchParams({ q: keyword, lang: activeLang });
  };

  const handleClearInput = () => {
    setInputValue('');
  };

  // Search query via TanStack Query
  const trimmedUrlQuery = urlQuery.trim();
  const isSearchActive = Boolean(trimmedUrlQuery.length > 0);

  const {
    data: searchResults,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['upstream-search', trimmedUrlQuery, activeLang],
    queryFn: () => searchDramas(trimmedUrlQuery, activeLang),
    enabled: isSearchActive,
    staleTime: 3 * 60 * 1000,
  });

  const rawItems = Array.isArray(searchResults) ? searchResults : [];

  // Filter items by quick genre if selected
  const filteredItems = useMemo(() => {
    if (selectedGenre === 'Tất cả') return rawItems;
    const gLower = selectedGenre.toLowerCase();
    return rawItems.filter((item) => {
      const title = (item.title || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      const cat = (item.category_name || '').toLowerCase();
      const tags = Array.isArray(item.tag_names) ? item.tag_names.map((t) => t.toLowerCase()) : [];
      return title.includes(gLower) || desc.includes(gLower) || cat.includes(gLower) || tags.some((t) => t.includes(gLower));
    });
  }, [rawItems, selectedGenre]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Breadcrumb & Return to Home */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeftOutlined /> Quay lại Trang Chủ
        </button>

        {/* Search Language Toggle */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 hidden sm:inline flex items-center gap-1">
            <GlobalOutlined /> Kho phim:
          </span>
          <button
            type="button"
            onClick={() => {
              setActiveLang('vi-VN');
              if (trimmedUrlQuery) setSearchParams({ q: trimmedUrlQuery, lang: 'vi-VN' });
            }}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              activeLang === 'vi-VN'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            Tiếng Việt
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveLang('id-ID');
              if (trimmedUrlQuery) setSearchParams({ q: trimmedUrlQuery, lang: 'id-ID' });
            }}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              activeLang === 'id-ID'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            Toàn cầu (id-ID)
          </button>
        </div>
      </div>

      {/* Main Search Input Form */}
      <div className="mb-6">
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="relative flex items-center">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <SearchOutlined className="text-xl text-rose-500" />
            </div>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Nhập tên phim cần tìm (ví dụ: Chạy Về Nơi Phía Anh, Vợ Thiếu Soái, Hoàng Đế...)"
              autoFocus
              className="w-full rounded-2xl bg-slate-900/90 py-4 pl-12 pr-28 text-base text-white placeholder-slate-400 border border-slate-700/80 shadow-2xl focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 backdrop-blur-md transition-all font-medium"
            />

            <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 gap-2">
              {inputValue && (
                <button
                  type="button"
                  onClick={handleClearInput}
                  aria-label="Xóa từ khóa"
                  className="text-slate-400 hover:text-white p-2 rounded-xl text-base transition-colors cursor-pointer"
                >
                  <CloseCircleOutlined />
                </button>
              )}

              <button
                type="submit"
                className="rounded-xl bg-rose-600 px-5 py-2 text-sm font-bold text-white hover:bg-rose-500 shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Tìm Kiếm</span>
              </button>
            </div>
          </div>
        </form>

        {/* Hot Trending Keywords */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
          <span className="text-xs font-semibold text-rose-400 flex items-center gap-1 shrink-0">
            <FireFilled /> Phổ biến:
          </span>
          {HOT_KEYWORDS.map((kw) => (
            <button
              key={kw}
              type="button"
              onClick={() => handleSelectKeyword(kw)}
              className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium bg-slate-900/70 hover:bg-rose-600/20 hover:text-rose-300 text-slate-300 border border-slate-800 transition-all cursor-pointer"
            >
              {kw}
            </button>
          ))}
        </div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && !isSearchActive && (
          <div className="mt-4 p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <HistoryOutlined /> Lịch sử tìm kiếm gần đây:
              </span>
              <button
                type="button"
                onClick={clearRecentSearches}
                className="text-[11px] text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ClearOutlined /> Xóa lịch sử
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleSelectKeyword(item)}
                  className="rounded-lg px-2.5 py-1 text-xs text-slate-300 bg-slate-800/60 hover:bg-slate-700/80 hover:text-white transition-colors cursor-pointer border border-slate-700/50"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Genre Filters (when search query is present) */}
      {isSearchActive && rawItems.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-4 scrollbar-none">
          <span className="text-xs text-slate-400 flex items-center gap-1 pl-1 shrink-0 font-medium">
            <FilterOutlined /> Lọc:
          </span>
          {QUICK_GENRES.map((g) => {
            const isSelected = selectedGenre === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGenre(g)}
                className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>
      )}

      {/* Search Results Area */}
      {isSearchActive ? (
        <div>
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800/80">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-white font-display flex items-center gap-2">
                <span>Kết quả cho:</span>
                <span className="text-rose-400 italic">"{trimmedUrlQuery}"</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Dữ liệu tìm kiếm trực tiếp từ hệ thống streaming short drama
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-3.5 py-1 text-xs text-rose-300 font-bold">
                {isLoading ? 'Đang tìm...' : `Tìm thấy ${filteredItems.length} phim`}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Spin indicator={<LoadingOutlined style={{ fontSize: 40, color: '#e11d48' }} spin />} />
              <span className="mt-4 text-sm text-slate-300 font-medium animate-pulse">
                Đang tìm phim "{trimmedUrlQuery}" trực tuyến...
              </span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-20 text-center">
              <Empty
                description={
                  <div className="flex flex-col items-center gap-2 text-slate-400 max-w-md mx-auto">
                    <span className="text-base text-slate-300 font-semibold">
                      Không tìm thấy phim phù hợp với từ khóa "{trimmedUrlQuery}".
                    </span>
                    <span className="text-xs text-slate-500 leading-relaxed">
                      Hãy kiểm tra lại lỗi chính tả hoặc thử các từ khóa phổ biến như{' '}
                      <span className="text-rose-400 font-medium cursor-pointer" onClick={() => handleSelectKeyword('Chạy Về Nơi Phía Anh')}>
                        Chạy Về Nơi Phía Anh
                      </span>
                      ,{' '}
                      <span className="text-rose-400 font-medium cursor-pointer" onClick={() => handleSelectKeyword('Vợ Thiếu Soái')}>
                        Vợ Thiếu Soái
                      </span>
                      ,{' '}
                      <span className="text-rose-400 font-medium cursor-pointer" onClick={() => handleSelectKeyword('Hoàng Đế')}>
                        Hoàng Đế
                      </span>
                      .
                    </span>
                    {activeLang === 'vi-VN' && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveLang('id-ID');
                          setSearchParams({ q: trimmedUrlQuery, lang: 'id-ID' });
                        }}
                        className="mt-3 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer shadow-md shadow-rose-600/30"
                      >
                        Thử tìm kiếm trong toàn bộ kho phim quốc tế (id-ID)
                      </button>
                    )}
                  </div>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-5">
              {filteredItems.map((item, idx) => (
                <DramaCard key={item.book_id || item.id || idx} drama={item} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Empty State with Prompt to search */
        <div className="py-16 text-center max-w-lg mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-3xl mb-4">
            <SearchOutlined />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Tìm kiếm phim short drama</h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            Khám phá hàng chục nghìn tập phim ngắn hấp dẫn: Ngôn tình, Tổng tài, Trọng sinh, Ma cà rồng, Chiến thần...
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {HOT_KEYWORDS.slice(0, 6).map((kw) => (
              <button
                key={kw}
                type="button"
                onClick={() => handleSelectKeyword(kw)}
                className="rounded-xl px-3.5 py-1.5 text-xs font-semibold bg-slate-900/90 text-slate-200 border border-slate-700/80 hover:border-rose-500 hover:text-rose-400 transition-all cursor-pointer shadow-sm"
              >
                {kw} &rarr;
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Search;
