import React from 'react';
import { ThunderboltOutlined, CloudDownloadOutlined, MobileOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-800/80 bg-slate-950/60 pb-20 md:pb-10 pt-10 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm font-display flex items-center gap-2">
              <span className="text-rose-500">🎬</span> FilmDrama PWA
            </h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Nền tảng Progressive Web App xem phim ngắn, drama dọc chất lượng cao từ 50+ kênh quốc tế với khả năng xem ngoại tuyến mượt mà.
            </p>
          </div>

          <div>
            <h5 className="text-white font-semibold text-xs mb-3 uppercase tracking-wider">Tính Năng PWA</h5>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5"><ThunderboltOutlined className="text-amber-400" /> Tải trang tức thì (Service Worker)</li>
              <li className="flex items-center gap-1.5"><CloudDownloadOutlined className="text-emerald-400" /> Lưu trữ IndexedDB ngoại tuyến</li>
              <li className="flex items-center gap-1.5"><MobileOutlined className="text-indigo-400" /> Cài đặt như ứng dụng native</li>
            </ul>
          </div>

          <div>
            <h5 className="text-white font-semibold text-xs mb-3 uppercase tracking-wider">Nhà Cung Cấp Phim</h5>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tổng hợp từ AnyReel, ReelShort, DramaBox, FlexTV, ShortMax, GoodShort, KalosTV, Vigloo và hơn 40 đơn vị khác.
            </p>
          </div>

          <div>
            <h5 className="text-white font-semibold text-xs mb-3 uppercase tracking-wider">Bản Quyền & Thông Tin</h5>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dữ liệu được cập nhật tự động từ hệ sinh thái phim ngắn. Mọi bản quyền thuộc về các đơn vị sản xuất tương ứng.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <span>© 2026 FilmDrama PWA. Xây dựng với React 19, Vite, PWA, Tailwind CSS & Ant Design.</span>
          <div className="flex items-center gap-4">
            <span>Phiên bản 1.0.0 PWA</span>
            <span>IndexedDB Cache</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
