'use client';
import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Plus, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../store';
import { addItem } from '../../store/slices/cartSlice';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { ModifierModal } from './ModifierModal';

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  sku?: string;
  isComposite: boolean;
  category?: { name: string; color?: string };
  taxRate?: { rate: number };
  modifierGroups: any[];
  variants: any[];
}

const gridVariants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.04 } },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 8 },
  show:   { opacity: 1, scale: 1,    y: 0, transition: { duration: 0.22 } },
};

export function ProductGrid() {
  const dispatch = useAppDispatch();
  const { selectedCategoryId, searchQuery } = useAppSelector((s) => s.pos);
  const [products, setProducts]   = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addingId, setAddingId]   = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { limit: '100' };
      if (selectedCategoryId) params.categoryId = selectedCategoryId;
      if (searchQuery)         params.search     = searchQuery;
      const { data } = await api.get('/products', { params });
      setProducts(data.data || []);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategoryId, searchQuery]);

  useEffect(() => {
    const t = setTimeout(fetchProducts, 200);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  const addToCart = (product: Product, modifiers: any[] = [], variantId?: string) => {
    dispatch(addItem({
      productId: product.id,
      variantId,
      name:      product.name,
      price:     product.price,
      quantity:  1,
      taxRate:   product.taxRate ? Number(product.taxRate.rate) : 0,
      modifiers,
      imageUrl:  product.imageUrl,
    }));
    // Brief flash animation
    setAddingId(product.id);
    setTimeout(() => setAddingId(null), 500);
  };

  const handleProductClick = (product: Product) => {
    if (product.modifierGroups?.length > 0 || product.variants?.length > 0) {
      setSelectedProduct(product);
    } else {
      addToCart(product);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-4 overflow-y-auto content-start">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white animate-pulse overflow-hidden"
               style={{ border: '1px solid var(--color-border)' }}>
            <div className="w-full aspect-[4/3] bg-gray-100" />
            <div className="p-3 space-y-2">
              <div className="h-3.5 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300">
        <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center">
          <Package className="w-9 h-9 text-gray-300" />
        </div>
        <p className="text-sm text-gray-400 font-medium">No products found</p>
        {searchQuery && (
          <p className="text-xs text-gray-400">Try a different search term</p>
        )}
      </div>
    );
  }

  return (
    <>
      <motion.div
        key={`${selectedCategoryId}-${searchQuery}`}
        variants={gridVariants}
        initial="hidden"
        animate="show"
        className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-4 overflow-y-auto content-start"
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isAdding={addingId === product.id}
            onClick={() => handleProductClick(product)}
          />
        ))}
      </motion.div>

      <AnimatePresence>
        {selectedProduct && (
          <ModifierModal
            product={selectedProduct}
            onConfirm={(modifiers, variantId) => {
              addToCart(selectedProduct, modifiers, variantId);
              setSelectedProduct(null);
            }}
            onClose={() => setSelectedProduct(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Product card ────────────────────────────────────────────────────────────
function ProductCard({
  product, isAdding, onClick,
}: {
  product: Product;
  isAdding: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      variants={cardVariants}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className="group relative flex flex-col text-left rounded-2xl bg-white overflow-hidden
                 transition-shadow duration-200 hover:shadow-lg focus:outline-none"
      style={{ border: '1px solid var(--color-border)' }}
    >
      {/* Image area — 4:3 */}
      <div className="relative w-full aspect-[4/3] bg-gray-50 flex-shrink-0 overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Package className="w-10 h-10 text-gray-200" />
          </div>
        )}

        {/* Category badge */}
        {product.category && (
          <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full
                           bg-white/90 backdrop-blur-sm text-xs font-medium text-gray-600 shadow-sm">
            {product.category.color && (
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: product.category.color }} />
            )}
            {product.category.name}
          </span>
        )}

        {/* Add flash overlay */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-500/20 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center shadow-lg"
              >
                <Plus className="w-5 h-5 text-white" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info row */}
      <div className="flex items-start justify-between gap-1 p-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">
            {product.name}
          </p>
          <p className="text-sm font-bold text-brand-600 mt-1">
            {formatCurrency(product.price)}
          </p>
        </div>

        {/* + button */}
        <div
          className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center
                     flex-shrink-0 shadow-sm transition-all duration-150
                     group-hover:bg-brand-700 group-hover:shadow-brand-300/40 group-hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
        </div>
      </div>
    </motion.button>
  );
}
