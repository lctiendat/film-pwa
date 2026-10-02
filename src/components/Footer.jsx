import React from 'react';
import { ThunderboltFilled, CloudDownloadOutlined, MobileOutlined, SafetyCertificateFilled, PlayCircleFilled } from '@ant-design/icons';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-800/80 bg-[#07090e]/90 pb-24 md:pb-12 pt-12 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="space-y-3">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-indigo-600 text-white shadow-md shadow-rose-600/30">
                <PlayCircleFilled className="text-base" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-white font-display">
                Drama<span className="text-rose-500">PWA</span> PRO
              </span>
            </Link>
            <p className="text-slate-400 text-xs leading-relaxed font-normal">
              Nền tảng Progressive Web App xem phim ngắn trực tuyến chuẩn HLS siêu tốc, hỗ trợ lưu ngoại tuyến và cài đặt trực tiếp không qua kho ứng dụng.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                <SafetyCertificateFilled /> Bảo mật SSL 256-bit
              </span>
            </div>
          </div>

          <div>
            <h5 className="text-white font-bold text-xs mb-3.5 uppercase tracking-wider font-display">Tính Năng Nổi Bật</h5>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-center gap-2 text-slate-300"><ThunderboltFilled className="text-amber-400" /> Tốc độ cao với CDN Edge Clusters</li>
              <li className="flex items-center gap-2 text-slate-300"><CloudDownloadOutlined className="text-emerald-400" /> Lưu trữ IndexedDB ngoại tuyến</li>
              <li className="flex items-center gap-2 text-slate-300"><MobileOutlined className="text-indigo-400" /> Cài đặt nhanh (PWA Ready)</li>
            </ul>
          </div>

          <div>
            <h5 className="text-white font-bold text-xs mb-3.5 uppercase tracking-wider font-display">Nhà Cung Cấp Đối Tác</h5>
            <p className="text-xs text-slate-400 leading-relaxed font-normal">
              Đồng bộ tự động từ AnyReel, ReelShort, DramaBox, FlexTV, ShortMax, GoodShort, KalosTV, JoyReels, Vigloo và hơn 50 kênh quốc tế.
            </p>
          </div>

          <div>
            <h5 className="text-white font-bold text-xs mb-3.5 uppercase tracking-wider font-display">Bản Quyền & Thông Tin</h5>
            <p className="text-xs text-slate-400 leading-relaxed font-normal">
              Hệ sinh thái phim ngắn trực tuyến. Dữ liệu tập phim và hình ảnh thuộc về các nhà sản xuất và đối tác phát hành nội dung gốc.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <span>© 2026 DramaPWA PRO. Thiết kế với trải nghiệm chuẩn Cinema HLS.</span>
          <div className="flex items-center gap-4 font-mono">
            <span>Phiên bản v2.0 PWA</span>
            <span>HLS Native + MSE</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
