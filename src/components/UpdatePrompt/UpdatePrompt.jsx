import React from 'react';
import { Button } from 'antd';
import { ReloadOutlined, CloseOutlined, CloudSyncOutlined } from '@ant-design/icons';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('[SW] Service Worker Registered:', r);
    },
    onRegisterError(error) {
      console.error('[SW] Service Worker Registration Error:', error);
    },
  });

  if (!needRefresh) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full mx-4 sm:mx-0 p-4 rounded-2xl bg-slate-900/95 border border-indigo-500/30 text-white shadow-2xl backdrop-blur-xl animate-bounce-subtle">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20">
          <CloudSyncOutlined className="text-xl" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm text-slate-100">Đã có bản cập nhật mới</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Ứng dụng có các tính năng và dữ liệu phim mới. Cập nhật để trải nghiệm mượt mà hơn.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Button
              type="primary"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => updateServiceWorker(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-xs rounded-lg font-medium"
            >
              Cập nhật ngay
            </Button>
            <Button
              type="text"
              size="small"
              onClick={() => setNeedRefresh(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Để sau
            </Button>
          </div>
        </div>
        <button
          onClick={() => setNeedRefresh(false)}
          className="text-slate-500 hover:text-slate-300 p-1"
        >
          <CloseOutlined className="text-xs" />
        </button>
      </div>
    </div>
  );
}

export default UpdatePrompt;
