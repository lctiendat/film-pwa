import React, { useState, useRef } from 'react';
import { DramaCard } from './DramaCard';
import { AppstoreOutlined, LeftOutlined, RightOutlined, FireFilled } from '@ant-design/icons';

export function SectionRow({ section, activeFilter = 'all' }) {
  const [isGridMode, setIsGridMode] = useState(false);
  const scrollRef = useRef(null);

  if (!section || !section.items || section.items.length === 0) {
    return null;
  }

  // Filter items by tag if specified
  const filteredItems = section.items.filter((item) => {
    if (!activeFilter || activeFilter === 'all') return true;
    const filterLower = activeFilter.toLowerCase().trim();

    // Check in tag_names
    const hasTag = item.tag_names?.some(
      (tag) => tag.toLowerCase().includes(filterLower) || filterLower.includes(tag.toLowerCase())
    );
    if (hasTag) return true;

    // Fallback: Check title, description, or category if tags are missing
    const hasTitle = item.title?.toLowerCase().includes(filterLower);
    const hasDesc = item.description?.toLowerCase().includes(filterLower);
    const hasCat = item.category_name?.toLowerCase().includes(filterLower);
    return hasTitle || hasDesc || hasCat;
  });

  // If no items in this section match the filter, hide this section row
  if (filteredItems.length === 0) {
    return null;
  }

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -420, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 420, behavior: 'smooth' });
    }
  };

  const isHotSection = section.tab_label?.toLowerCase().includes('hot') || section.tab_label?.toLowerCase().includes('thịnh hành');

  return (
    <div className="mb-12">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 font-display">
            {isHotSection && <FireFilled className="text-rose-500 text-lg sm:text-xl" />}
            <span>{section.tab_label}</span>
          </h2>
          <span className="rounded-full bg-slate-900 border border-slate-800 px-2.5 py-0.5 text-xs font-bold text-slate-400">
            {filteredItems.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Grid/Carousel Toggle */}
          <button
            type="button"
            onClick={() => setIsGridMode(!isGridMode)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
          >
            <AppstoreOutlined className="text-rose-400" />
            <span>{isGridMode ? 'Cuộn ngang' : 'Xem dạng lưới'}</span>
          </button>

          {/* Horizontal Scroll Arrows (desktop only) */}
          {!isGridMode && (
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={scrollLeft}
                aria-label="Cuộn trái"
                className="h-8 w-8 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-rose-500/50 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer text-xs"
              >
                <LeftOutlined />
              </button>
              <button
                onClick={scrollRight}
                aria-label="Cuộn phải"
                className="h-8 w-8 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-rose-500/50 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer text-xs"
              >
                <RightOutlined />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content: Carousel Rail or Grid Layout */}
      {isGridMode ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredItems.map((item) => (
            <DramaCard key={item.book_id} drama={item} />
          ))}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex items-stretch gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 scroll-smooth scrollbar-none snap-x"
        >
          {filteredItems.map((item) => (
            <div
              key={item.book_id}
              className="w-[160px] sm:w-[200px] md:w-[220px] shrink-0 snap-start"
            >
              <DramaCard drama={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SectionRow;
