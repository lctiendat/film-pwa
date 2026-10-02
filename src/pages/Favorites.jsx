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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/" className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1">
              <ArrowLeftOutlined /> Quay lại
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3 font-display">
            <HeartFilled className="text-rose-500" /> Kho Phim Đã Lưu (Offline)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Các bộ phim này đã được lưu trong cơ sở dữ liệu IndexedDB của trình duyệt. Bạn có thể mở và xem lại ngay cả khi mất mạng.
          </p>
        </div>

        <span className="rounded-2xl bg-rose-600/10 border border-rose-500/20 px-4 py-2 text-rose-400 font-semibold text-sm self-start sm:self-auto">
          {favorites.length} phim đã lưu
        </span>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-center">
          <div className="relative flex items-center justify-center mb-4">
            <div className="absolute h-16 w-16 rounded-full bg-rose-600/20 blur-lg animate-pulse" />
            <Spin indicator={<LoadingOutlined style={{ fontSize: 36, color: '#e11d48' }} spin />} />
          </div>
          <span className="text-sm font-medium text-slate-400">Đang tải kho phim offline...</span>
        </div>
      ) : favorites.length === 0 ? (
        <div className="rounded-3xl glass-panel p-12 text-center max-w-md mx-auto my-12 border border-slate-800">
          <div className="w-16 h-16 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-2xl text-slate-500 mb-4">
            <HeartFilled />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Kho phim trống</h3>
          <p className="text-xs text-slate-400 mb-6">
            Bạn chưa lưu bộ phim nào. Hãy nhấn biểu tượng trái tim trên bất kỳ bộ phim nào để lưu và xem ngoại tuyến.
          </p>
          <Link to="/">
            <Button type="primary" className="rounded-xl font-medium px-6 bg-rose-600 hover:bg-rose-500">
              Khám phá phim ngay
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
                className="absolute top-2.5 left-2.5 z-30 opacity-0 group-hover:opacity-100 transition-opacity bg-rose-600/90 hover:bg-rose-700 text-white text-xs px-2 py-1 rounded-lg shadow-md flex items-center gap-1 cursor-pointer"
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
