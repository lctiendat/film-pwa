import React, { useState } from 'react';
import { Button, Modal } from 'antd';
import { DownloadOutlined, CloseOutlined, CheckCircleOutlined, MobileOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

export function InstallPrompt() {
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  if (isInstalled || !isInstallable || dismissed) {
    return null;
  }

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await promptInstall();
    } finally {
      setIsInstalling(false);
    }
  };

  return (
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
              className="font-medium !h-9 px-4 rounded-xl shadow-lg shadow-rose-600/30 bg-rose-600 hover:bg-rose-500 border-none text-white"
            >
              Cài đặt ứng dụng
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InstallPrompt;
