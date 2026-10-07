import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { message, Tooltip } from 'antd';
import { HeartOutlined, HeartFilled, PlayCircleFilled, FireFilled, StarFilled } from '@ant-design/icons';
import { getPosterUrl } from '../../services/api';
import { isFavorite, saveFavorite, removeFavorite } from '../../services/db';
import { useDramaStore } from '../../store/useDramaStore';

export function DramaCard({ drama }) {
  const [bookmarked, setBookmarked] = useState(false);
  const [imgError, setImgError] = useState(false);
  const { refreshCounts } = useDramaStore();

  const bookId = drama.book_id || drama.id;

  useEffect(() => {
    let mounted = true;
    if (bookId) {
      isFavorite(bookId).then((fav) => {
        if (mounted) setBookmarked(fav);
      });
    }
    return () => {
      mounted = false;
    };
  }, [bookId]);

  const toggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!bookId) return;

    if (bookmarked) {
      await removeFavorite(bookId);
      setBookmarked(false);
      message.info('Đã xóa khỏi danh sách yêu thích');
    } else {
      await saveFavorite({ ...drama, book_id: bookId });
      setBookmarked(true);
      message.success('Đã lưu vào danh sách xem offline');
    }
    refreshCounts();
  };

  const posterSrc = imgError
    ? 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=600&auto=format&fit=crop&q=80'
    : getPosterUrl(drama.poster_url || drama.cover_url || drama.poster || drama.cover);

  const watchUrl = drama.watch_url || drama.url || '';
  const watchTarget = `/watch/${bookId}?provider=${encodeURIComponent(drama.category_name || '')}&watch=${encodeURIComponent(watchUrl)}&title=${encodeURIComponent(drama.title || '')}`;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl glass-card transition-all duration-300">
      {/* Poster Image Container */}
      <Link
        to={watchTarget}
        state={{ drama }}
        className="relative aspect-[3/4] w-full overflow-hidden bg-slate-950"
      >
        <img
          src={posterSrc}
          alt={drama.title}
          onError={() => setImgError(true)}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
        />

        {/* Dark overlays */}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none">
          <div className="flex flex-wrap gap-1">
            {drama.category_name && (
              <span className="rounded-lg bg-black/75 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/30 shadow-md">
                {drama.category_name}
              </span>
            )}
            {drama.is_adult && (
              <span className="rounded-lg bg-rose-600/90 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-black text-white shadow-md">
                18+
              </span>
            )}
          </div>

          {/* Favorite Bookmark Button */}
          <button
            onClick={toggleFavorite}
            aria-label="Lưu phim"
            className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-black/60 backdrop-blur-md text-white border border-white/15 transition-all duration-200 hover:scale-115 active:scale-95 shadow-lg hover:border-rose-500/50 cursor-pointer"
          >
            {bookmarked ? (
              <HeartFilled className="text-rose-500 text-sm animate-pulse-subtle" />
            ) : (
              <HeartOutlined className="text-slate-300 hover:text-white text-sm" />
            )}
          </button>
        </div>

        {/* Center Hover Play Circle */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100 z-10 pointer-events-none">
          <div className="flex h-13 w-13 items-center justify-center rounded-full bg-rose-600/90 text-white shadow-xl shadow-rose-600/60 backdrop-blur-md transform scale-75 group-hover:scale-100 transition-all duration-300">
            <PlayCircleFilled className="text-3xl pl-0.5" />
          </div>
        </div>

        {/* Bottom tags overlay */}
        {drama.tag_names && drama.tag_names.length > 0 && (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex flex-wrap gap-1 z-10">
            {drama.tag_names.slice(0, 2).map((tag, idx) => (
              <span
                key={idx}
                className="rounded-md bg-black/75 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-medium text-slate-300 border border-white/10"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </Link>

      {/* Info Body */}
      <div className="flex flex-1 flex-col p-3 sm:p-3.5 bg-slate-900/40">
        <Link
          to={watchTarget}
          state={{ drama }}
          className="font-bold text-xs sm:text-sm text-slate-100 hover:text-rose-400 transition-colors line-clamp-1 mb-1 font-display tracking-tight"
          title={drama.title}
        >
          {drama.title}
        </Link>
        
        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3 flex-1 font-normal">
          {drama.description || 'Xem trọn bộ phim ngắn HD không quảng cáo.'}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
          <span className="flex items-center gap-1 text-amber-400 font-semibold text-[10px]">
            <FireFilled /> HOT
          </span>
          <Link
            to={watchTarget}
            state={{ drama }}
            className="text-rose-400 hover:text-rose-300 font-bold transition-colors inline-flex items-center gap-1"
          >
            Xem ngay &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

export default DramaCard;
