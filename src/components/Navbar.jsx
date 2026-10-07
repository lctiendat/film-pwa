import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Badge, Button, Tooltip, message } from 'antd';
import {
  PlayCircleFilled,
  HeartFilled,
  HomeFilled,
  SearchOutlined,
  DownloadOutlined,
  WifiOutlined,
  DisconnectOutlined,
  TranslationOutlined,
  ThunderboltFilled,
  FireFilled,
} from '@ant-design/icons';
import { useDramaStore } from '../store/useDramaStore';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { Modal } from 'antd';
import { ExportOutlined, PlusSquareOutlined } from '@ant-design/icons';

export function Navbar() {
  const location = useLocation();
  const { favoritesCount, refreshCounts, autoTranslate, setAutoTranslate } = useDramaStore();
  const { isInstallable, isIOS, promptInstall } = useInstallPrompt();
  const { isOnline } = useOnlineStatus();
  const [showIOSModal, setShowIOSModal] = React.useState(false);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  const navLinks = [
    { path: '/', label: 'Trang Chủ', icon: <HomeFilled /> },
    { path: '/search', label: 'Tìm Kiếm', icon: <SearchOutlined /> },
    {
      path: '/favorites',
      label: 'Kho Phim',
      icon: <HeartFilled />,
      badge: favoritesCount,
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-nav backdrop-blur-2xl transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-600/30 group-hover:scale-105 transition-all duration-300">
              <PlayCircleFilled className="text-xl pl-0.5" />
              <div className="absolute -inset-0.5 rounded-2xl bg-rose-500 opacity-0 group-hover:opacity-40 blur transition-opacity" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white font-display">
                  Drama<span className="text-rose-500">PWA</span>
                </span>
                <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[9px] font-bold text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                  PRO
                </span>
              </div>
              <span className="text-[10px] text-slate-400 -mt-0.5 hidden sm:inline tracking-wide">
                Xem Phim Ngắn 4K • Không Quảng Cáo
              </span>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800/80 shadow-inner">
            {navLinks.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${isActive
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge > 0 && (
                    <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${isActive ? 'bg-white/25 text-white' : 'bg-rose-600 text-white'}`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions: Auto Translate toggle, Online badge & Install App */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Auto Translate Toggle */}
            <Tooltip title={autoTranslate ? 'Dịch AI tiếng Việt: Đang BẬT' : 'Dịch AI tiếng Việt: Đang TẮT'}>
              <button
                onClick={() => {
                  const nextState = !autoTranslate;
                  setAutoTranslate(nextState);
                  if (nextState) {
                    message.success('Đã BẬT dịch AI tự động sang Tiếng Việt');
                  } else {
                    message.info('Đã TẮT tự động dịch');
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer border ${autoTranslate
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-500/10'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
              >
                <TranslationOutlined className={autoTranslate ? 'text-rose-400 text-sm' : 'text-slate-500 text-sm'} />
                <span className="hidden sm:inline">Dịch AI:</span>
                <span className={`text-[10px] uppercase font-bold tracking-wider ${autoTranslate ? 'text-rose-300' : 'text-slate-500'}`}>
                  {autoTranslate ? 'BẬT' : 'TẮT'}
                </span>
              </button>
            </Tooltip>

            {/* Online Status Indicator */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border ${isOnline
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/10'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}
              title={isOnline ? 'Hệ thống đang kết nối trực tuyến' : 'Đang ở chế độ ngoại tuyến'}
            >
              <span
                className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                  }`}
              />
              <span className="hidden sm:inline font-mono">
                {isOnline ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>

            {/* Install PWA Button */}
            {isInstallable && (
              <Button
                type="primary"
                size="middle"
                icon={<DownloadOutlined />}
                onClick={promptInstall}
                className="hidden sm:inline-flex items-center font-bold rounded-xl text-xs !h-9 px-4 cursor-pointer"
              >
                Cài App
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (True PWA Mobile Experience) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#07090e]/95 border-t border-slate-800/80 backdrop-blur-2xl px-4 py-2 shadow-2xl pb-safe">
        <div className="flex items-center justify-around">
          <Link
            to="/"
            className={`flex flex-col items-center py-1 px-3 text-[11px] font-semibold transition-all ${location.pathname === '/' ? 'text-rose-500 scale-105' : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <HomeFilled className="text-xl mb-1" />
            <span>Trang Chủ</span>
          </Link>

          <Link
            to="/search"
            className={`flex flex-col items-center py-1 px-3 text-[11px] font-semibold transition-all ${location.pathname === '/search' ? 'text-rose-500 scale-105' : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <SearchOutlined className="text-xl mb-1" />
            <span>Tìm Kiếm</span>
          </Link>

          <Link
            to="/favorites"
            className={`flex flex-col items-center py-1 px-3 text-[11px] font-semibold transition-all relative ${location.pathname === '/favorites' ? 'text-rose-500 scale-105' : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            <HeartFilled className="text-xl mb-1" />
            <span>Kho Phim</span>
            {favoritesCount > 0 && (
              <span className="absolute top-0 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-extrabold text-white shadow-md shadow-rose-600/50">
                {favoritesCount}
              </span>
            )}
          </Link>

          {isInstallable && (
            <button
              onClick={() => {
                if (isIOS) {
                  setShowIOSModal(true);
                } else {
                  promptInstall();
                }
              }}
              className="flex flex-col items-center py-1 px-4 text-[11px] font-semibold text-rose-400 hover:text-rose-300 cursor-pointer"
            >
              <DownloadOutlined className="text-xl mb-1" />
              <span>Cài App</span>
            </button>
          )}
        </div>
      </div>

      {/* iOS Modal Guide in Navbar */}
      <Modal
        open={showIOSModal}
        onCancel={() => setShowIOSModal(false)}
        footer={[
          <Button
            key="ok"
            type="primary"
            onClick={() => setShowIOSModal(false)}
            className="rounded-xl bg-rose-600 hover:bg-rose-500 font-semibold"
          >
            Đã hiểu
          </Button>
        ]}
        title={<span className="text-white font-bold text-base">Hướng dẫn cài đặt trên iPhone / iPad</span>}
        centered
        className="dark-modal"
      >
        <div className="py-2 text-slate-200 text-sm space-y-3.5 leading-relaxed">
          <p className="text-xs text-slate-400">
            Hệ điều hành iOS Safari hỗ trợ cài đặt ứng dụng web trực tiếp vào màn hình chính mà không cần App Store:
          </p>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 font-bold text-sm">
              1
            </span>
            <div>
              <strong className="text-white block text-xs">Mở thanh công cụ Safari</strong>
              <span className="text-xs text-slate-300">
                Nhấn vào nút <strong className="text-rose-400 inline-flex items-center gap-1">Chia sẻ <ExportOutlined /></strong> ở dưới cùng màn hình Safari.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 font-bold text-sm">
              2
            </span>
            <div>
              <strong className="text-white block text-xs">Thêm vào Màn hình chính</strong>
              <span className="text-xs text-slate-300">
                Cuộn danh sách xuống và chọn <strong className="text-rose-400 inline-flex items-center gap-1">Thêm vào MH chính <PlusSquareOutlined /></strong> (Add to Home Screen).
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 font-bold text-sm">
              3
            </span>
            <div>
              <strong className="text-white block text-xs">Xác nhận Thêm</strong>
              <span className="text-xs text-slate-300">
                Bấm nút <strong className="text-rose-400">Thêm</strong> ở góc trên bên phải để hoàn tất. Biểu tượng ứng dụng FilmDrama sẽ xuất hiện ngay trên màn hình điện thoại!
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default Navbar;
