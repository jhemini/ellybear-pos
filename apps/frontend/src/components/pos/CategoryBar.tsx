'use client';
import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { setCategory } from '../../store/slices/posSlice';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';

interface Category {
  id: string;
  name: string;
  color?: string;
  _count?: { products: number };
}

export function CategoryBar() {
  const dispatch       = useAppDispatch();
  const selectedId     = useAppSelector((s) => s.pos.selectedCategoryId);
  const organizationId = useAppSelector((s) => s.auth.user?.organizationId);
  const [categories, setCategories] = useState<Category[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/products/categories').then(({ data }) => {
      setCategories(data.data || []);
    });
  }, [organizationId]);

  const all = [{ id: null as unknown as string, name: 'All items', color: undefined }];
  const pills = [...all, ...categories];

  return (
    <div
      className="relative flex-shrink-0 bg-white"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <div
        ref={scrollRef}
        className="flex items-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar"
      >
        {pills.map((cat) => {
          const isAll      = cat.id === (null as unknown as string);
          const isSelected = isAll ? selectedId === null : selectedId === cat.id;

          return (
            <button
              key={cat.id ?? '__all__'}
              onClick={() => dispatch(setCategory(isAll ? null : cat.id))}
              className={cn(
                'relative flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold',
                'flex-shrink-0 transition-all duration-150 select-none',
                isSelected
                  ? 'text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
              style={
                isSelected
                  ? { background: cat.color ?? 'var(--color-brand-600, #ef4444)' }
                  : {}
              }
            >
              {isSelected && (
                <motion.div
                  layoutId="category-pill-bg"
                  className="absolute inset-0 rounded-2xl"
                  style={{ background: cat.color ?? 'var(--color-brand-600, #ef4444)' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                />
              )}

              <span className="relative z-10 flex items-center gap-2">
                {isAll ? (
                  <LayoutGrid className="w-3.5 h-3.5" />
                ) : cat.color ? (
                  <span
                    className={cn(
                      'w-2.5 h-2.5 rounded-full flex-shrink-0',
                      isSelected ? 'bg-white/70' : '',
                    )}
                    style={!isSelected ? { background: cat.color } : {}}
                  />
                ) : null}
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
