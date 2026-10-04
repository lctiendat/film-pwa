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
      <div className="fixed bottom-4 left-4 right-4 z-[100] md:hidden">
        <div className="relative mx-auto max-w-md overflow-hidden rounded-[24px] bg-slate-900/95 p-3 border border-rose-500/30 shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-fade-in-up">
          <button
            onClick={() => setDismissed(true)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <CloseOutlined className="text-xs" />
          </button>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-tr from-rose-600 to-indigo-600 shadow-lg shadow-rose-500/30 text-white text-xl border border-white/10">
            🎬
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-extrabold text-white text-[13px] sm:text-sm truncate leading-tight mb-0.5">FilmDrama App</h4>
            <p className="text-[10px] sm:text-[11px] text-slate-300 font-medium truncate leading-tight">Siêu mượt • Lưu ngoại tuyến</p>
          </div>
          
          <Button
            type="primary"
            loading={isInstalling}
            onClick={handleInstall}
            className="font-bold h-9 px-4 rounded-xl shadow-lg shadow-rose-600/40 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 border-none text-white text-[11px] sm:text-xs shrink-0 cursor-pointer"
          >
            {isIOS ? 'H.Dẫn Cài' : 'Cài Đặt'}
          </Button>
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
