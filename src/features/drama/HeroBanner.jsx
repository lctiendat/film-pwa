import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button, Tag, message } from 'antd';
import { PlayCircleFilled, PlusOutlined, CheckOutlined, FireFilled, InfoCircleOutlined } from '@ant-design/icons';
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
    <div className="relative overflow-hidden rounded-3xl bg-slate-950 border border-slate-800/80 shadow-2xl mb-8">
      {/* Background Poster Blur Effect */}
      <div className="absolute inset-0">
        <img
          src={poster}
          alt={drama.title}
          className="h-full w-full object-cover object-center filter blur-xl opacity-35 scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#090d16] via-[#090d16]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090d16] via-transparent to-transparent" />
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-6 sm:p-10 lg:p-12">
        {/* Left Column: Text Info */}
        <div className="lg:col-span-8 flex flex-col items-start">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600/20 border border-rose-500/30 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
            <FireFilled className="text-rose-500 animate-pulse" /> Đang Thịnh Hành Nhất
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-3 font-display">
            {drama.title}
          </h1>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 text-xs font-medium">
              {drama.category_name || 'Drama Ngắn'}
            </span>
            {drama.tag_names?.map((tag, i) => (
              <span
                key={i}
                className="rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60 px-2 py-0.5 text-xs font-medium"
              >
                #{tag}
              </span>
            ))}
            <span className="text-xs text-slate-400 font-mono">Tập trọn bộ HD</span>
          </div>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl line-clamp-3 mb-6">
            {drama.description}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={`/watch/${drama.book_id}?provider=${encodeURIComponent(drama.category_name || '')}&watch=${encodeURIComponent(drama.watch_url || '')}&title=${encodeURIComponent(drama.title || '')}`}
              state={{ drama }}
            >
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleFilled />}
                className="!h-12 px-6 rounded-xl font-semibold text-base shadow-xl shadow-rose-600/40 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 border-none text-white flex items-center"
              >
                Xem Phim Ngay
              </Button>
            </Link>

            <Button
              size="large"
              icon={bookmarked ? <CheckOutlined /> : <PlusOutlined />}
              onClick={toggleFavorite}
              className={`!h-12 px-5 rounded-xl font-medium text-sm border-slate-700 transition-all ${
                bookmarked
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  : 'bg-slate-900/60 text-slate-200 hover:text-white hover:border-slate-500'
              }`}
            >
              {bookmarked ? 'Đã lưu offline' : 'Lưu vào kho'}
            </Button>
          </div>
        </div>

        {/* Right Column: Hero Poster Preview */}
        <div className="hidden lg:flex lg:col-span-4 justify-end">
          <Link
            to={`/watch/${drama.book_id}`}
            state={{ drama }}
            className="group relative block w-56 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10 transform rotate-1 hover:rotate-0 transition-transform duration-300"
          >
            <img
              src={poster}
              alt={drama.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
            <div className="absolute bottom-3 left-3 right-3 text-center py-1.5 px-3 rounded-xl bg-black/60 backdrop-blur-md text-white text-xs font-medium border border-white/10">
              Nhấn để xem trailer & tập 1
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default HeroBanner;
