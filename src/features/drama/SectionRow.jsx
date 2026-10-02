import React, { useState } from 'react';
import { DramaCard } from './DramaCard';
import { AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons';

export function SectionRow({ section, activeFilter = 'all' }) {
  const [showAll, setShowAll] = useState(false);

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

  const displayItems = showAll ? filteredItems : filteredItems.slice(0, 8);

  return (
    <div className="mb-10">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2 font-display">
            <span>{section.tab_label}</span>
          </h2>
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
            {filteredItems.length} phim
          </span>
        </div>

        {filteredItems.length > 8 && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-medium text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
          >
            {showAll ? 'Thu gọn' : `Xem tất cả (${filteredItems.length})`}
          </button>
        )}
      </div>

      {/* Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
        {displayItems.map((item) => (
          <DramaCard key={item.book_id} drama={item} />
        ))}
      </div>
    </div>
  );
}

export default SectionRow;
