import React, { useState } from 'react';
import { Select, Modal, Input, Badge, Button } from 'antd';
import { SearchOutlined, AppstoreOutlined, FireOutlined, CheckOutlined } from '@ant-design/icons';
import { useDramaStore } from '../store/useDramaStore';

export function ProviderSelector({ providers = [], activeProvider = 'anyreel', onSelect }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');

  const filteredProviders = providers.filter((p) =>
    p.label.toLowerCase().includes(filterSearch.toLowerCase()) ||
    p.key.toLowerCase().includes(filterSearch.toLowerCase())
  );

  // Top popular providers for quick tabs
  const popularKeys = ['anyreel', 'reelshort', 'dramabox', 'shortmax', 'flextv', 'goodshort', 'kalostv', 'vigloo'];
  const popularProviders = providers.filter((p) => popularKeys.includes(p.key.toLowerCase()));

  // Dynamic pill bar: if activeProvider is set and not 'all', ensure it's visible in the quick pills!
  const activeObj = providers.find((p) => p.key.toLowerCase() === (activeProvider || '').toLowerCase());
  const displayPills = [...popularProviders];
  if (activeObj && !displayPills.some((p) => p.key.toLowerCase() === activeObj.key.toLowerCase())) {
    displayPills.unshift(activeObj);
  }

  const handleSelect = (key) => {
    onSelect(key);
    setModalOpen(false);
  };

  const activeLabel = activeObj?.label || (activeProvider === 'all' ? 'Tất cả' : activeProvider);

  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
            Nhà cung cấp:
          </span>
          <span className="text-sm font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-lg border border-rose-500/20 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
            {activeLabel}
          </span>
        </div>

        <Button
          size="small"
          icon={<AppstoreOutlined />}
          onClick={() => setModalOpen(true)}
          className="bg-slate-800/80 border-slate-700 text-slate-200 hover:text-white rounded-lg text-xs"
        >
          Chọn từ {providers.length} nhà cung cấp khác &rarr;
        </Button>
      </div>

      {/* Quick horizontal scroll pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          type="button"
          onClick={() => handleSelect('all')}
          className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            activeProvider === 'all'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-500/50'
              : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
        >
          {activeProvider === 'all' && <CheckOutlined className="text-[10px] mr-1" />}
          Tất cả
        </button>

        {displayPills.map((prov) => {
          const isActive = prov.key.toLowerCase() === (activeProvider || '').toLowerCase();
          return (
            <button
              key={prov.key}
              type="button"
              onClick={() => handleSelect(prov.key)}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-500/50 font-semibold'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              {isActive && <CheckOutlined className="text-[10px]" />}
              <span>{prov.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800/60 text-slate-400 hover:text-white border border-dashed border-slate-700 hover:border-slate-500 cursor-pointer"
        >
          + Thêm ({Math.max(0, providers.length - displayPills.length)})
        </button>
      </div>

      {/* Modal with Full Provider Grid */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-white">
            <AppstoreOutlined className="text-rose-500" />
            <span>Chọn Nhà Cung Cấp Phim ({providers.length})</span>
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={720}
        className="dark-modal"
        styles={{
          content: {
            backgroundColor: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '1.25rem',
            color: '#f8fafc',
          },
          header: {
            backgroundColor: '#0f172a',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          },
        }}
      >
        <div className="py-2">
          <Input
            prefix={<SearchOutlined className="text-slate-400 mr-1" />}
            placeholder="Tìm kiếm nhà cung cấp (ví dụ: ReelShort, FlexTV, DramaBox...)"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="mb-4 bg-slate-900 border-slate-700 text-white h-10 rounded-xl"
            allowClear
          />

          <div className="max-h-[55vh] overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {filteredProviders.map((prov) => {
              const isActive = prov.key === activeProvider;
              return (
                <button
                  key={prov.key}
                  onClick={() => handleSelect(prov.key)}
                  className={`p-3 rounded-xl text-left transition-all border flex items-center justify-between text-xs font-medium cursor-pointer ${
                    isActive
                      ? 'bg-rose-600/20 border-rose-500 text-rose-300 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span className="truncate">{prov.label}</span>
                  {isActive && <CheckOutlined className="text-rose-400 ml-1 text-xs shrink-0" />}
                </button>
              );
            })}
          </div>

          {filteredProviders.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-xs">
              Không tìm thấy nhà cung cấp nào với từ khóa "{filterSearch}"
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default ProviderSelector;
