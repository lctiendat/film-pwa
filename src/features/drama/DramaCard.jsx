import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { message, Tooltip } from 'antd';
import { HeartOutlined, HeartFilled, PlayCircleFilled, FireOutlined } from '@ant-design/icons';
import { getPosterUrl } from '../../services/api';
import { isFavorite, saveFavorite, removeFavorite } from '../../services/db';
import { useDramaStore } from '../../store/useDramaStore';

export function DramaCard({ drama }) {
  const [bookmarked, setBookmarked] = useState(false);
  const [imgError, setImgError] = useState(false);
  const { refreshCounts } = useDramaStore();

  const bookId = drama.book_id;

  useEffect(() => {
    let mounted = true;
    isFavorite(bookId).then((fav) => {
      if (mounted) setBookmarked(fav);
    });
    return () => {
      mounted = false;
    };
  }, [bookId]);

  const toggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (bookmarked) {
      await removeFavorite(bookId);
      setBookmarked(false);
      message.info('Đã xóa khỏi danh sách yêu thích');
    } else {
      await saveFavorite(drama);
      setBookmarked(true);
      message.success('Đã lưu vào danh sách xem offline');
    }
    refreshCounts();
  };

  const posterSrc = imgError
    ? 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=600&auto=format&fit=crop&q=80'
    : getPosterUrl(drama.poster_url);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl glass-card transition-all duration-300">
      {/* Poster Image Container */}
      <Link
        to={`/watch/${drama.book_id}?provider=${encodeURIComponent(drama.category_name || '')}&watch=${encodeURIComponent(drama.watch_url || '')}&title=${encodeURIComponent(drama.title || '')}`}
        state={{ drama }}
        className="relative aspect-[3/4] w-full overflow-hidden bg-slate-900"
      >
        <img
          src={posterSrc}
          alt={drama.title}
          onError={() => setImgError(true)}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />

        {/* Gradient dark overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090d16] via-[#090d16]/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Category & Adult Badge */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
          {drama.category_name && (
            <span className="rounded-md bg-black/60 backdrop-blur-md px-2 py-0.5 text-[11px] font-medium text-rose-300 border border-rose-500/20 shadow-sm">
              {drama.category_name}
            </span>
          )}
          {drama.is_adult && (
            <span className="rounded-md bg-rose-600/80 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
              18+
            </span>
          )}
        </div>

        {/* Favorite Bookmark Button */}
        <button
          onClick={toggleFavorite}
          aria-label="Lưu phim"
          className="absolute top-2.5 right-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 backdrop-blur-md text-white border border-white/10 transition-transform hover:scale-110 active:scale-95 shadow-md"
        >
          {bookmarked ? (
            <HeartFilled className="text-rose-500 text-sm" />
          ) : (
            <HeartOutlined className="text-slate-300 hover:text-white text-sm" />
          )}
        </button>

        {/* Hover Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-10 pointer-events-none">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-600/90 text-white shadow-lg shadow-rose-600/50 backdrop-blur-sm transform transition-transform group-hover:scale-110">
            <PlayCircleFilled className="text-2xl" />
          </div>
        </div>

        {/* Bottom tags inside poster */}
        {drama.tag_names && drama.tag_names.length > 0 && (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex flex-wrap gap-1 z-10">
            {drama.tag_names.slice(0, 2).map((tag, idx) => (
              <span
                key={idx}
                className="rounded-md bg-slate-900/80 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-medium text-slate-300 border border-slate-700/50"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </Link>

      {/* Info Section */}
      <div className="flex flex-1 flex-col p-3.5 bg-slate-900/40">
        <Link
          to={`/watch/${drama.book_id}`}
          state={{ drama }}
          className="font-semibold text-sm text-slate-100 hover:text-rose-400 transition-colors line-clamp-1 mb-1 font-display"
          title={drama.title}
        >
          {drama.title}
        </Link>
        
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3 flex-1">
          {drama.description || 'Đang cập nhật tóm tắt nội dung...'}
        </p>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-amber-400/90">
            <FireOutlined /> Phổ biến
          </span>
          <Link
            to={`/watch/${drama.book_id}`}
            state={{ drama }}
            className="text-rose-400 hover:text-rose-300 font-medium transition-colors"
          >
            Xem ngay &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

export default DramaCard;
