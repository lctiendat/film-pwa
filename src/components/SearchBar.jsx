import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { SearchOutlined, CloseCircleOutlined, FilterOutlined } from '@ant-design/icons';
import { useDramaStore } from '../store/useDramaStore';

// Zod Schema for search validation
const searchSchema = z.object({
  query: z.string().trim().max(60, 'Từ khóa không được vượt quá 60 ký tự'),
});

const QUICK_TAGS = ['Tất cả', 'Revenge', 'Werewolf', 'Dragon', 'Billionaire', 'Vampire', 'Forbidden Love', 'Erotic', 'Young Adult'];

export function SearchBar() {
  const { searchQuery, setSearchQuery, activeTag, setActiveTag } = useDramaStore();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      query: searchQuery || '',
    },
  });

  const currentQuery = watch('query');

  const onSubmit = (formData) => {
    // Validate with zod
    const validation = searchSchema.safeParse(formData);
    if (validation.success) {
      setSearchQuery(validation.data.query);
    }
  };

  const handleClear = () => {
    setValue('query', '');
    setSearchQuery('');
  };

  const handleTagClick = (tag) => {
    if (tag === 'Tất cả' || activeTag === tag) {
      setActiveTag('all');
    } else {
      setActiveTag(tag);
    }
  };

  return (
    <div className="mb-6">
      <form onSubmit={handleSubmit(onSubmit)} className="relative">
        <div className="relative flex items-center">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
            <SearchOutlined className="text-lg" />
          </div>

          <input
            type="text"
            {...register('query', {
              onChange: (e) => setSearchQuery(e.target.value),
            })}
            placeholder="Tìm kiếm phim, diễn viên, thể loại (ví dụ: Dragon, Werewolf, Alpha, Revenge...)"
            className="w-full rounded-2xl bg-slate-900/90 py-3.5 pl-11 pr-24 text-sm text-white placeholder-slate-400 border border-slate-700/80 shadow-lg focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 backdrop-blur-md transition-all"
          />

          <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1.5">
            {currentQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg text-sm transition-colors cursor-pointer"
              >
                <CloseCircleOutlined />
              </button>
            )}

            <button
              type="submit"
              className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 shadow-md shadow-rose-600/30 transition-all cursor-pointer"
            >
              Tìm
            </button>
          </div>
        </div>

        {errors.query && (
          <p className="mt-1 text-xs text-rose-400 pl-4">{errors.query.message}</p>
        )}
      </form>

      {/* Quick genre filter pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-1 scrollbar-none">
        <span className="text-[11px] text-slate-400 flex items-center gap-1 pl-1 shrink-0 font-medium">
          <FilterOutlined /> Thể loại:
        </span>
        {QUICK_TAGS.map((tag) => {
          const isSelected = (tag === 'Tất cả' && activeTag === 'all') || activeTag === tag;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => handleTagClick(tag)}
              className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                isSelected
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SearchBar;
