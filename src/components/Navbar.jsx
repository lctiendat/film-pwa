import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Badge, Button } from 'antd';
import {
  PlayCircleFilled,
  HeartFilled,
  HomeFilled,
  DownloadOutlined,
  WifiOutlined,
  DisconnectOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useDramaStore } from '../store/useDramaStore';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function Navbar() {
  const location = useLocation();
  const { favoritesCount, refreshCounts } = useDramaStore();
  const { isInstallable, promptInstall } = useInstallPrompt();
  const { isOnline } = useOnlineStatus();

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  const navLinks = [
    { path: '/', label: 'Trang Chủ', icon: <HomeFilled /> },
    {
      path: '/favorites',
      label: 'Kho Phim (Offline)',
      icon: <HeartFilled />,
      badge: favoritesCount,
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass-nav">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-indigo-600 text-white shadow-lg shadow-rose-600/30 group-hover:scale-105 transition-transform">
              <PlayCircleFilled className="text-xl" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-white font-display">
                  Film<span className="text-rose-500">Drama</span>
                </span>
                <span className="rounded bg-rose-500/10 px-1.5 py-0.2 text-[10px] font-bold text-rose-400 border border-rose-500/20">
                  PWA
                </span>
              </div>
              <span className="text-[10px] text-slate-400 -mt-0.5 hidden sm:inline">
                Kho Phim Ngắn Đa Nền Tảng
              </span>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navLinks.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge > 0 && (
                    <span className="rounded-full bg-rose-600 px-1.5 py-0.2 text-[11px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions: Online badge & Install App */}
          <div className="flex items-center gap-2.5">
            {/* Online Status Indicator */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
              title={isOnline ? 'Đang kết nối' : 'Ngoại tuyến'}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="hidden sm:inline">
                {isOnline ? 'Trực tuyến' : 'Offline'}
              </span>
            </div>

            {/* Install PWA Button */}
            {isInstallable && (
              <Button
                type="primary"
                size="middle"
                icon={<DownloadOutlined />}
                onClick={promptInstall}
                className="hidden sm:inline-flex items-center font-medium rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 border-none shadow-md shadow-rose-600/20 text-xs !h-9 px-3.5"
              >
                Cài Đặt App
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (True PWA Mobile Experience) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090d16]/95 border-t border-slate-800/80 backdrop-blur-xl px-4 py-2">
        <div className="flex items-center justify-around">
          <Link
            to="/"
            className={`flex flex-col items-center py-1 px-3 text-xs font-medium transition-colors ${
              location.pathname === '/' ? 'text-rose-500' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HomeFilled className="text-lg mb-0.5" />
            <span>Trang Chủ</span>
          </Link>

          <Link
            to="/favorites"
            className={`flex flex-col items-center py-1 px-3 text-xs font-medium transition-colors relative ${
              location.pathname === '/favorites' ? 'text-rose-500' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HeartFilled className="text-lg mb-0.5" />
            <span>Kho Phim</span>
            {favoritesCount > 0 && (
              <span className="absolute top-0 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
                {favoritesCount}
              </span>
            )}
          </Link>

          {isInstallable && (
            <button
              onClick={promptInstall}
              className="flex flex-col items-center py-1 px-3 text-xs font-medium text-indigo-400 hover:text-indigo-300"
            >
              <DownloadOutlined className="text-lg mb-0.5" />
              <span>Cài App</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export default Navbar;
