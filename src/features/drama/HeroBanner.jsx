import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button, Tag, message } from 'antd';
import { PlayCircleFilled, PlusOutlined, CheckOutlined, FireFilled, EyeFilled, StarFilled, ThunderboltFilled } from '@ant-design/icons';
import { getPosterUrl } from '../../services/api';
import { isFavorite, saveFavorite, removeFavorite } from '../../services/db';
import { useDramaStore } from '../../store/useDramaStore';

export function HeroBanner({ drama }) {
  const [bookmarked, setBookmarked] = useState(false);
  const { refreshCounts } = useDramaStore();

  useEffect(() => {
    if (!drama) return;
    let mounted = true;
    isFavorite(drama.book_id).then((fav) => {
      if (mounted) setBookmarked(fav);
    });
    return () => {
      mounted = false;
    };
  }, [drama]);

  if (!drama) return null;

  const toggleFavorite = async () => {
    if (bookmarked) {
      await removeFavorite(drama.book_id);
      setBookmarked(false);
      message.info('Đã xóa khỏi danh sách yêu thích');
    } else {
      await saveFavorite(drama);
      setBookmarked(true);
      message.success('Đã lưu vào danh sách xem offline');
    }
    refreshCounts();
  };

  const poster = getPosterUrl(drama.poster_url);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#0b0f19] border border-slate-800/80 shadow-2xl mb-10 group">
      {/* Background Poster Blur Effect */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={poster}
          alt={drama.title}
          className="h-full w-full object-cover object-center filter blur-3xl opacity-30 scale-125 transition-transform duration-1000 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07090e] via-[#07090e]/90 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/40 to-transparent" />
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-6 sm:p-10 lg:p-12">
        {/* Left Column: Text Info */}
        <div className="lg:col-span-8 flex flex-col items-start">
          {/* Top Trendy Pills */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-rose-600/30 to-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold uppercase tracking-wider shadow-sm">
              <FireFilled className="text-rose-500 animate-pulse" /> #1 THỊNH HÀNH HÔM NAY
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs font-semibold">
              <ThunderboltFilled className="text-amber-400" /> 4K ULTRA HD
            </div>

            <span className="text-xs text-slate-400 font-medium">100% Không quảng cáo</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15] mb-3 font-display">
            {drama.title}
          </h1>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1 text-xs font-bold shadow-sm">
              {drama.category_name || 'Exclusive Series'}
            </span>
            {drama.tag_names?.slice(0, 4).map((tag, i) => (
              <span
                key={i}
                className="rounded-xl bg-slate-900/80 text-slate-300 border border-slate-700/60 px-2.5 py-1 text-xs font-medium hover:border-slate-500 transition-colors"
              >
                #{tag}
              </span>
            ))}
            <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl">
              Trọn bộ Full HD
            </span>
          </div>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl line-clamp-3 mb-6 font-normal">
            {drama.description || 'Khám phá câu chuyện kịch tính, lôi cuốn với các tập phim chuẩn HLS mượt mà, chuyển tập tức thì.'}
          </p>

          <div className="flex flex-wrap items-center gap-3.5">
            <Link
              to={`/watch/${drama.book_id}?provider=${encodeURIComponent(drama.category_name || '')}&watch=${encodeURIComponent(drama.watch_url || '')}&title=${encodeURIComponent(drama.title || '')}`}
              state={{ drama }}
            >
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleFilled />}
                className="!h-13 px-8 rounded-2xl font-bold text-base shadow-xl shadow-rose-600/40 bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 hover:from-rose-500 hover:to-rose-400 border-none text-white flex items-center gap-2 cursor-pointer transform hover:scale-105 active:scale-95 transition-all duration-200"
              >
                Xem Ngay Tập 1
              </Button>
            </Link>

            <Button
              size="large"
              icon={bookmarked ? <CheckOutlined /> : <PlusOutlined />}
              onClick={toggleFavorite}
              className={`!h-13 px-6 rounded-2xl font-semibold text-sm border-slate-700 transition-all cursor-pointer ${
                bookmarked
                  ? 'bg-rose-950/60 border-rose-500/50 text-rose-300 shadow-sm shadow-rose-600/20'
                  : 'bg-slate-900/80 text-slate-200 hover:text-white hover:border-slate-500 hover:bg-slate-800'
              }`}
            >
              {bookmarked ? 'Đã lưu trong kho' : 'Thêm vào kho'}
            </Button>
          </div>
        </div>

        {/* Right Column: Hero Poster Preview with 3D Depth */}
        <div className="hidden lg:flex lg:col-span-4 justify-end">
          <Link
            to={`/watch/${drama.book_id}?provider=${encodeURIComponent(drama.category_name || '')}&watch=${encodeURIComponent(drama.watch_url || '')}&title=${encodeURIComponent(drama.title || '')}`}
            state={{ drama }}
            className="group/card relative block w-64 aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border-2 border-white/10 transform rotate-2 hover:rotate-0 hover:scale-105 transition-all duration-500"
          >
            <img
              src={poster}
              alt={drama.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-600/90 text-white shadow-2xl shadow-rose-600/80 backdrop-blur-md transform scale-90 group-hover/card:scale-100 transition-transform">
                <PlayCircleFilled className="text-3xl pl-1" />
              </div>
            </div>

            <div className="absolute bottom-4 left-4 right-4 text-center py-2 px-3 rounded-2xl bg-black/70 backdrop-blur-md text-white text-xs font-semibold border border-white/10 shadow-lg">
              <span className="text-rose-400 font-bold">4K Cinema</span> • Bấm để xem ngay
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default HeroBanner;
