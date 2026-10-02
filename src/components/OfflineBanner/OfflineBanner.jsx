import React from 'react';
import { WifiOutlined, DisconnectOutlined, CheckCircleFilled } from '@ant-design/icons';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { Link } from 'react-router-dom';

export function OfflineBanner() {
  const { isOnline, wasOffline } = useOnlineStatus();

  if (isOnline && !wasOffline) {
    return null;
  }

  if (isOnline && wasOffline) {
    return (
      <div className="bg-emerald-600/90 text-white text-xs font-medium py-1.5 px-4 text-center flex items-center justify-center gap-2 backdrop-blur-md shadow-md animate-fade-in transition-all">
        <CheckCircleFilled className="text-emerald-200" />
        <span>Đã khôi phục kết nối Internet. Dữ liệu đang được đồng bộ!</span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-600/95 via-rose-600/95 to-amber-700/95 text-white text-xs font-medium py-2 px-4 shadow-lg backdrop-blur-md sticky top-0 z-50 transition-all border-b border-white/10">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <DisconnectOutlined className="text-base animate-pulse text-amber-200" />
          <span>
            <strong>Bạn đang ngoại tuyến!</strong> Đang sử dụng bộ nhớ đệm IndexedDB.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/favorites"
            className="underline underline-offset-2 hover:text-amber-100 font-semibold text-xs"
          >
            Xem phim đã lưu offline &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

export default OfflineBanner;
