import React, { useRef } from 'react';
import { Modal, Switch, Radio, Button, message, Tooltip, Spin } from 'antd';
import {
  TranslationOutlined,
  UploadOutlined,
  FontSizeOutlined,
  SyncOutlined,
  CheckCircleFilled,
  LoadingOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useDramaStore } from '../store/useDramaStore';
import { parseLocalSubtitleFile } from '../services/subtitleService';

export function SubtitleSettingsModal({
  open,
  onClose,
  hasOriginalSubtitles,
  rawCuesCount,
  translatedCuesCount,
  isTranslating,
  onCustomSubtitleLoaded,
  customSubtitleName,
}) {
  const {
    subtitlesEnabled,
    setSubtitlesEnabled,
    subtitleLanguage,
    setSubtitleLanguage,
    subtitleFontSize,
    setSubtitleFontSize,
    subtitleOffset,
    setSubtitleOffset,
  } = useDramaStore();

  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await parseLocalSubtitleFile(file);
      if (result.cues.length === 0) {
        message.warning('Tệp phụ đề trống hoặc không đúng định dạng .vtt/.srt');
        return;
      }
      onCustomSubtitleLoaded(result);
      setSubtitlesEnabled(true);
      setSubtitleLanguage('custom');
      message.success(`Đã tải thành công phụ đề "${result.name}" (${result.cues.length} câu thoại)`);
    } catch (err) {
      message.error(`Lỗi khi đọc file phụ đề: ${err.message}`);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        <div className="flex items-center gap-2 text-white font-display text-base">
          <TranslationOutlined className="text-rose-500" />
          <span>Cài Đặt Phụ Đề & Dịch Tự Động (CC)</span>
        </div>
      }
      centered
      className="dark-modal"
      width={480}
    >
      <div className="flex flex-col gap-5 py-2 text-slate-200 text-xs">
        {/* 1. Master Subtitle Switch */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/90 border border-slate-750">
          <div className="flex flex-col">
            <span className="font-bold text-white text-sm">Bật Phụ Đề Phim (CC)</span>
            <span className="text-slate-400 text-xs mt-0.5">
              Hiển thị văn bản phụ đề nổi bật trên video
            </span>
          </div>
          <Switch
            checked={subtitlesEnabled}
            onChange={(checked) => {
              setSubtitlesEnabled(checked);
              if (checked) {
                message.success('Đã BẬT phụ đề');
              } else {
                message.info('Đã TẮT phụ đề');
              }
            }}
            checkedChildren="BẬT"
            unCheckedChildren="TẮT"
            className="bg-slate-700"
          />
        </div>

        {/* 2. Subtitle Language Selection */}
        <div className="flex flex-col gap-2">
          <label className="font-bold text-slate-300 flex items-center justify-between">
            <span>Ngôn ngữ hiển thị:</span>
            {isTranslating && (
              <span className="text-amber-400 font-normal flex items-center gap-1">
                <Spin indicator={<LoadingOutlined style={{ fontSize: 12, color: '#fbbf24' }} spin />} />
                Đang dịch sang Tiếng Việt...
              </span>
            )}
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Vietnamese Translated */}
            <button
              onClick={() => setSubtitleLanguage('vi')}
              className={`flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-all ${
                subtitleLanguage === 'vi'
                  ? 'border-rose-500 bg-rose-500/15 text-white font-semibold'
                  : 'border-slate-850 bg-slate-900/70 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col">
                <span className="flex items-center gap-1.5">
                  <span>🇻🇳 Tiếng Việt</span>
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded border border-rose-500/30">
                    Dịch chuẩn
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  {translatedCuesCount > 0 ? `${translatedCuesCount} câu thoại` : 'Tự động dịch'}
                </span>
              </div>
              {subtitleLanguage === 'vi' && <CheckCircleFilled className="text-rose-400 text-sm" />}
            </button>

            {/* Original Track */}
            <button
              disabled={!hasOriginalSubtitles}
              onClick={() => setSubtitleLanguage('original')}
              className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                !hasOriginalSubtitles
                  ? 'opacity-40 cursor-not-allowed border-slate-800 bg-slate-900/40 text-slate-500'
                  : subtitleLanguage === 'original'
                  ? 'border-rose-500 bg-rose-500/15 text-white font-semibold cursor-pointer'
                  : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 cursor-pointer'
              }`}
            >
              <div className="flex flex-col">
                <span className="flex items-center gap-1.5">
                  <span>🌐 Bản Gốc</span>
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  {rawCuesCount > 0 ? `${rawCuesCount} câu thoại` : 'Chưa có sub gốc'}
                </span>
              </div>
              {subtitleLanguage === 'original' && <CheckCircleFilled className="text-rose-400 text-sm" />}
            </button>
          </div>

          {/* Custom File Upload Option */}
          <div className="mt-1 flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-2">
              <FileTextOutlined className="text-base text-indigo-400" />
              <div className="flex flex-col">
                <span className="font-semibold text-slate-200">
                  {customSubtitleName ? `Đã nạp: ${customSubtitleName}` : 'Tải phụ đề từ máy (.vtt, .srt)'}
                </span>
                <span className="text-[11px] text-slate-400">Hỗ trợ file phụ đề tải về hoặc tự dịch</span>
              </div>
            </div>

            <Button
              icon={<UploadOutlined />}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border-slate-700 bg-slate-800 text-slate-200 text-xs hover:border-slate-600"
            >
              Chọn file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".vtt,.srt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* 3. Subtitle Font Size */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <FontSizeOutlined /> Kích cỡ chữ phụ đề:
          </span>
          <div className="flex gap-1.5">
            {[
              { key: 'sm', label: 'Nhỏ' },
              { key: 'md', label: 'Vừa' },
              { key: 'lg', label: 'Lớn' },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => setSubtitleFontSize(s.key)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  subtitleFontSize === s.key
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Subtitle Sync Offset */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="flex flex-col">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <SyncOutlined /> Khớp thời gian (Sync):
            </span>
            <span className="text-[11px] text-slate-400">
              Độ lệch hiện tại: <strong className="text-rose-400 font-mono">{subtitleOffset > 0 ? `+${subtitleOffset}` : subtitleOffset}s</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSubtitleOffset(Math.max(-5, Math.round((subtitleOffset - 0.5) * 10) / 10))}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-mono cursor-pointer"
            >
              -0.5s
            </button>
            <button
              onClick={() => setSubtitleOffset(0)}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white border border-slate-700 text-xs cursor-pointer"
            >
              Reset
            </button>
            <button
              onClick={() => setSubtitleOffset(Math.min(5, Math.round((subtitleOffset + 0.5) * 10) / 10))}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-mono cursor-pointer"
            >
              +0.5s
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default SubtitleSettingsModal;
