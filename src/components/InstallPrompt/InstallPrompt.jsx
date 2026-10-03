import React, { useState } from 'react';
import { Button, Modal } from 'antd';
import { DownloadOutlined, CloseOutlined, CheckCircleOutlined, MobileOutlined, ThunderboltOutlined, ExportOutlined, PlusSquareOutlined } from '@ant-design/icons';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

export function InstallPrompt() {
  const { isInstallable, isInstalled, isIOS, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (isInstalled || !isInstallable || dismissed) {
    return null;
  }

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }
    setIsInstalling(true);
    try {
      await promptInstall();
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-3 pb-1">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-900/40 via-purple-900/30 to-slate-900/60 p-4 border border-rose-500/20 shadow-xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-indigo-600 shadow-md shadow-rose-500/20 text-white font-bold text-xl">
                🎬
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-white text-base">Cài đặt FilmDrama App</h4>
                  <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-400 border border-rose-500/20">
                    PWA
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1"><ThunderboltOutlined className="text-amber-400" /> Tốc độ siêu tốc</span>
                  <span className="flex items-center gap-1"><CheckCircleOutlined className="text-emerald-400" /> Xem ngoại tuyến</span>
                  <span className="flex items-center gap-1"><MobileOutlined className="text-cyan-400" /> Không tốn dung lượng</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button
                type="text"
                size="small"
                onClick={() => setDismissed(true)}
                className="text-slate-400 hover:text-white"
              >
                Để sau
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                loading={isInstalling}
                onClick={handleInstall}
                className="font-medium !h-9 px-4 rounded-xl shadow-lg shadow-rose-600/30 bg-rose-600 hover:bg-rose-500 border-none text-white cursor-pointer"
              >
                {isIOS ? 'Cách cài đặt trên iPhone' : 'Cài đặt ứng dụng'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* iOS Safari Install Guide Modal */}
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
            Hệ điều hành iOS Safari hỗ trợ cài đặt ứng dụng web trực tiếp vào màn hình chính mà không cần tải từ App Store:
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

export default InstallPrompt;
