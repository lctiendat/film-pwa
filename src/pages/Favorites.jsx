import React, { useState, useEffect } from 'react';
import { Button, Empty, Modal, message, Spin } from 'antd';
import { HeartFilled, DeleteOutlined, PlayCircleFilled, ArrowLeftOutlined, ExclamationCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { getFavorites, removeFavorite } from '../services/db';
import { DramaCard } from '../features/drama/DramaCard';
import { useDramaStore } from '../store/useDramaStore';

export function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const { refreshCounts } = useDramaStore();

  const loadFavs = async () => {
    setLoading(true);
    try {
      const data = await getFavorites();
      setFavorites(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavs();
  }, []);

  const handleRemove = async (bookId) => {
    await removeFavorite(bookId);
    message.success('Đã xóa phim khỏi kho yêu thích');
    loadFavs();
    refreshCounts();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link to="/" className="text-slate-400 hover:text-white transition-colors text-xs font-semibold flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 w-fit">
              <ArrowLeftOutlined className="text-rose-500" /> Về Trang Chủ
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3 font-display">
            <HeartFilled className="text-rose-500" /> Kho Phim Đã Lưu (Offline)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl font-normal leading-relaxed">
            Các bộ phim này đã được lưu trong cơ sở dữ liệu IndexedDB của trình duyệt. Bạn có thể mở và xem lại ngay cả khi mất kết nối mạng.
          </p>
        </div>

        <span className="rounded-2xl bg-gradient-to-r from-rose-500/20 to-rose-600/10 border border-rose-500/30 px-4 py-2 text-rose-300 font-extrabold text-xs self-start sm:self-auto shadow-sm">
          {favorites.length} phim trong kho
        </span>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-center">
          <div className="relative flex items-center justify-center mb-4">
            <div className="absolute h-16 w-16 rounded-full bg-rose-600/20 blur-lg animate-pulse" />
            <Spin indicator={<LoadingOutlined style={{ fontSize: 36, color: '#e11d48' }} spin />} />
          </div>
          <span className="text-sm font-semibold text-slate-400">Đang tải kho phim offline...</span>
        </div>
      ) : favorites.length === 0 ? (
        <div className="rounded-3xl glass-panel p-12 text-center max-w-md mx-auto my-12 border border-slate-800/90 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 mx-auto flex items-center justify-center text-2xl text-rose-500 mb-4 shadow-inner">
            <HeartFilled />
          </div>
          <h3 className="text-lg font-black text-white mb-2 font-display">Kho phim đang trống</h3>
          <p className="text-xs text-slate-400 mb-6 font-normal leading-relaxed">
            Bạn chưa lưu bộ phim nào. Nhấn biểu tượng trái tim trên bất kỳ bộ phim nào để xem lại bất cứ lúc nào.
          </p>
          <Link to="/">
            <Button type="primary" size="large" className="rounded-xl font-bold px-6 cursor-pointer">
              Khám Phá Phim Ngay
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
          {favorites.map((drama) => (
            <div key={drama.book_id} className="relative group">
              <DramaCard drama={drama} />
              <button
                onClick={() => handleRemove(drama.book_id)}
                className="absolute top-2.5 left-2.5 z-30 opacity-0 group-hover:opacity-100 transition-opacity bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-xl shadow-lg flex items-center gap-1 cursor-pointer border border-rose-400/40"
                title="Xóa khỏi danh sách"
              >
                <DeleteOutlined /> Xóa
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Favorites;
