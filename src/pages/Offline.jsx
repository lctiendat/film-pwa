import React from 'react';
import { Button, Result } from 'antd';
import { DisconnectOutlined, FolderOpenOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

export function Offline() {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full glass-panel p-8 rounded-3xl text-center border border-slate-700/50 shadow-2xl">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-rose-500/20 to-amber-500/20 border border-rose-500/30 flex items-center justify-center text-4xl mb-6 shadow-inner text-rose-400">
          <DisconnectOutlined />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2 font-display">
          Chế độ Ngoại Tuyến
        </h2>
        
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          Không có kết nối Internet. Dữ liệu đang được đọc từ bộ nhớ IndexedDB của thiết bị. Bạn vẫn có thể xem các nội dung đã lưu từ trước.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleReload}
            className="h-11 rounded-xl font-medium bg-rose-600 hover:bg-rose-500 text-white"
          >
            Thử tải lại
          </Button>
          <Link to="/favorites">
            <Button
              icon={<FolderOpenOutlined />}
              className="h-11 rounded-xl font-medium border-slate-700 text-slate-200 hover:text-white hover:border-slate-500 bg-slate-800/60 w-full"
            >
              Phim đã lưu
            </Button>
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-500">
          💡 Mẹo: Khi có mạng, ứng dụng sẽ tự động đồng bộ danh sách phim mới nhất về thiết bị của bạn.
        </div>
      </div>
    </div>
  );
}

export default Offline;
