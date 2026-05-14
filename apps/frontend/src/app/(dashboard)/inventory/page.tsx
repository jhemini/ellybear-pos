'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, AlertTriangle, Plus, TrendingDown, RefreshCw,
  Pencil, Trash2, Package, X, Check, ChevronDown, ChevronUp,
  FlaskConical, Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import { formatCurrency } from '../../../lib/utils';
import { useAppSelector } from '../../../store';
import { cn } from '../../../lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Category {
  id: string;
  name: string;
  color?: string;
}

interface RecipeItem {
  ingredientProductId: string;
  ingredientProductName?: string;
  quantity: number;
  unit: string;
  wastagePercent: number;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  price: number;
  cost?: number;
  imageUrl?: string;
  trackInventory: boolean;
  isComposite: boolean;
  category?: Category;
  recipeItems?: {
    ingredientProductId: string;
    quantity: number;
    unit: string;
    wastagePercent: number;
    ingredientProduct: { id: string; name: string };
  }[];
  deletedAt?: string | null;
}

interface InventoryItem {
  id: string;
  quantity: number;
  lowStockAlert: number | null;
  reorderPoint: number | null;
  isLowStock: boolean;
  product: { id: string; name: string; sku?: string; cost?: number; category?: Category };
  variant?: { name: string };
}

const UNITS = ['unit', 'g', 'kg', 'ml', 'L', 'oz', 'lb', 'cup', 'tbsp', 'tsp', 'piece', 'slice'];

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const [tab, setTab] = useState<'products' | 'stock'>('products');

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--color-surface-muted)' }}>
      <div className="bg-white px-6 pt-6 pb-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <h1 className="text-xl font-bold text-gray-900 mb-4">Inventory</h1>
        <div className="flex gap-0">
          {(['products', 'stock'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-5 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize',
                tab === t
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {t === 'products' ? 'Products' : 'Stock Levels'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'products' ? <ProductsTab /> : <StockTab />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Products tab
// ─────────────────────────────────────────────────────────────────────────────
function ProductsTab() {
  const [products, setProducts]     = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch]         = useState('');
  const [isLoading, setIsLoading]   = useState(true);
  const [editProduct, setEditProduct] = useState<Product | 'new' | null>(null);
  const [deleteId, setDeleteId]     = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        api.get('/products', { params: { limit: 200, search } }),
        api.get('/products/categories'),
      ]);
      setProducts(pRes.data.data || []);
      setCategories(cRes.data.data || []);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <button onClick={fetchData} className="btn btn-ghost p-2.5" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
        <button onClick={() => setEditProduct('new')} className="btn btn-primary gap-2">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--color-surface-muted)' }}>
              <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">SKU</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 text-center">Track</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : products.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {p.imageUrl
                              ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                              : <Package className="w-4 h-4 text-brand-300" />
                            }
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{p.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {p.isComposite && (
                                <span className="inline-flex items-center gap-1 text-xs text-purple-600 font-medium">
                                  <FlaskConical className="w-3 h-3" /> Composite
                                </span>
                              )}
                              {p.isComposite && p.recipeItems && p.recipeItems.length > 0 && (
                                <span className="text-xs text-gray-400">
                                  {p.recipeItems.length} ingredient{p.recipeItems.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.category
                          ? <span className="inline-flex items-center gap-1">
                              {p.category.color && (
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.category.color }} />
                              )}
                              {p.category.name}
                            </span>
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{p.sku ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatCurrency(Number(p.price))}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {p.cost ? formatCurrency(Number(p.cost)) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.trackInventory
                          ? <Check className="w-4 h-4 text-green-500 mx-auto" />
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setEditProduct(p)}
                            className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteId(p.id)}
                            className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {!isLoading && products.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="font-medium text-gray-500">No products yet</p>
              <p className="text-sm mt-1">Click &ldquo;Add Product&rdquo; to create your first product</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {editProduct !== null && (
          <ProductFormModal
            key="product-modal"
            product={editProduct === 'new' ? null : editProduct}
            categories={categories}
            allProducts={products}
            onClose={() => setEditProduct(null)}
            onSuccess={() => { setEditProduct(null); fetchData(); }}
          />
        )}
        {deleteId && (
          <ConfirmModal
            key="delete-modal"
            message="Delete this product? This cannot be undone."
            onConfirm={() => handleDelete(deleteId)}
            onCancel={() => setDeleteId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stock tab
// ─────────────────────────────────────────────────────────────────────────────
function StockTab() {
  const user = useAppSelector((s) => s.auth.user);
  const [items, setItems]           = useState<InventoryItem[]>([]);
  const [search, setSearch]         = useState('');
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [isLoading, setIsLoading]   = useState(true);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.storeId) return;
    setIsLoading(true);
    try {
      const { data } = await api.get(`/inventory/stores/${user.storeId}`, {
        params: { search, limit: 100 },
      });
      setItems(data.data);
    } finally {
      setIsLoading(false);
    }
  }, [user?.storeId, search]);

  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  const displayed     = showLowOnly ? items.filter((i) => i.isLowStock) : items;
  const lowStockCount = items.filter((i) => i.isLowStock).length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <button onClick={fetchData} className="btn btn-ghost p-2.5" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowLowOnly(!showLowOnly)}
          className={cn('btn gap-2', showLowOnly ? 'btn-danger' : 'btn-secondary')}
        >
          <AlertTriangle className="w-4 h-4" />
          Low stock {lowStockCount > 0 && `(${lowStockCount})`}
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--color-surface-muted)' }}>
              <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">SKU</th>
                <th className="px-4 py-3 text-right">In Stock</th>
                <th className="px-4 py-3 text-right">Alert Level</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 text-right">Status</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : displayed.map((item) => (
                    <tr key={item.id}
                        className={cn('hover:bg-gray-50 transition-colors', item.isLowStock && 'bg-amber-50/40')}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{item.product.name}</p>
                        {item.variant && <p className="text-xs text-gray-500">{item.variant.name}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{item.product.category?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{item.product.sku ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn('font-semibold', item.isLowStock ? 'text-amber-600' : 'text-gray-900')}>
                          {Number(item.quantity).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">{item.lowStockAlert ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {item.product.cost ? formatCurrency(Number(item.product.cost)) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.isLowStock
                          ? <span className="badge badge-yellow gap-1"><AlertTriangle className="w-3 h-3" />Low</span>
                          : <span className="badge badge-green">OK</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => setAdjustItem(item)} className="btn btn-ghost py-1 px-2 text-xs">
                          Adjust
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {!isLoading && displayed.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <TrendingDown className="w-10 h-10 mx-auto mb-2" />
              <p>No inventory items found</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {adjustItem && (
          <AdjustModal
            key="adjust-modal"
            item={adjustItem}
            storeId={user?.storeId!}
            onClose={() => setAdjustItem(null)}
            onSuccess={() => { setAdjustItem(null); fetchData(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Product form modal (create / edit) — with recipe builder
// ─────────────────────────────────────────────────────────────────────────────
function ProductFormModal({
  product, categories, allProducts, onClose, onSuccess,
}: {
  product: Product | null;
  categories: Category[];
  allProducts: Product[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!product;
  const [activeTab, setActiveTab] = useState<'details' | 'recipe'>('details');

  const [form, setForm] = useState({
    name:           product?.name           ?? '',
    sku:            product?.sku            ?? '',
    price:          product?.price          != null ? String(product.price) : '',
    cost:           product?.cost           != null ? String(product.cost)  : '',
    categoryId:     product?.category?.id   ?? '',
    imageUrl:       product?.imageUrl       ?? '',
    trackInventory: product?.trackInventory ?? true,
    isComposite:    product?.isComposite    ?? false,
    description:    '',
  });

  const [recipe, setRecipe] = useState<RecipeItem[]>(
    product?.recipeItems?.map((r) => ({
      ingredientProductId:   r.ingredientProductId,
      ingredientProductName: r.ingredientProduct.name,
      quantity:              Number(r.quantity),
      unit:                  r.unit,
      wastagePercent:        Number(r.wastagePercent),
    })) ?? []
  );

  const [ingredientSearch, setIngredientSearch] = useState('');
  const [showIngredientSearch, setShowIngredientSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  // Filter products that can be ingredients (not this product itself)
  const ingredientOptions = allProducts.filter(
    (p) =>
      p.id !== product?.id &&
      !recipe.some((r) => r.ingredientProductId === p.id) &&
      p.name.toLowerCase().includes(ingredientSearch.toLowerCase()),
  );

  const addIngredient = (p: Product) => {
    setRecipe((r) => [
      ...r,
      { ingredientProductId: p.id, ingredientProductName: p.name, quantity: 1, unit: 'unit', wastagePercent: 0 },
    ]);
    setIngredientSearch('');
    setShowIngredientSearch(false);
  };

  const updateIngredient = (idx: number, key: keyof RecipeItem, value: string | number) =>
    setRecipe((r) => r.map((item, i) => i === idx ? { ...item, [key]: value } : item));

  const removeIngredient = (idx: number) =>
    setRecipe((r) => r.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.isComposite && recipe.length === 0) {
      toast.error('Add at least one ingredient to the recipe');
      return;
    }
    setIsLoading(true);
    try {
      const payload: any = {
        name:           form.name,
        sku:            form.sku || undefined,
        price:          parseFloat(form.price),
        cost:           form.cost ? parseFloat(form.cost) : undefined,
        categoryId:     form.categoryId || undefined,
        imageUrl:       form.imageUrl   || undefined,
        trackInventory: form.trackInventory,
        isComposite:    form.isComposite,
        description:    form.description || undefined,
      };
      if (form.isComposite) {
        payload.recipe = recipe.map((r) => ({
          ingredientProductId: r.ingredientProductId,
          quantity:            r.quantity,
          unit:                r.unit,
          wastagePercent:      r.wastagePercent,
        }));
      }

      if (isEdit) {
        await api.patch(`/products/${product!.id}`, payload);
        toast.success('Product updated');
      } else {
        await api.post('/products', payload);
        toast.success('Product created');
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
             style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="font-bold text-lg text-gray-900">
            {isEdit ? 'Edit Product' : 'Add Product'}
          </h2>
          <button onClick={onClose}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={cn(
              'px-1 py-2.5 text-sm font-medium border-b-2 mr-5 transition-colors',
              activeTab === 'details' ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-400 hover:text-gray-600',
            )}
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('recipe'); setForm((f) => ({ ...f, isComposite: true })); }}
            className={cn(
              'px-1 py-2.5 text-sm font-medium border-b-2 flex items-center gap-1.5 transition-colors',
              activeTab === 'recipe' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-400 hover:text-gray-600',
            )}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Recipe
            {recipe.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
                {recipe.length}
              </span>
            )}
          </button>
        </div>

        {/* Form content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          {/* ── Details tab ─────────────────────────────────────────────── */}
          {activeTab === 'details' && (
            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Product name <span className="text-red-500">*</span>
                </label>
                <input value={form.name} onChange={set('name')} placeholder="e.g. Caramel Latte"
                       className="input" required />
              </div>

              {/* Price + Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Selling price <span className="text-red-500">*</span>
                  </label>
                  <input type="number" min="0" step="0.01" value={form.price} onChange={set('price')}
                         placeholder="0.00" className="input" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Cost price</label>
                  <input type="number" min="0" step="0.01" value={form.cost} onChange={set('cost')}
                         placeholder="0.00" className="input" />
                </div>
              </div>

              {/* SKU + Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">SKU</label>
                  <input value={form.sku} onChange={set('sku')} placeholder="e.g. BEV-001" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                  <select value={form.categoryId} onChange={set('categoryId')} className="input">
                    <option value="">— None —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Image URL</label>
                <input value={form.imageUrl} onChange={set('imageUrl')}
                       placeholder="https://…" className="input" />
              </div>

              {/* Track inventory toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setForm((f) => ({ ...f, trackInventory: !f.trackInventory }))}
                  className={cn(
                    'relative w-10 h-6 rounded-full transition-colors duration-200 cursor-pointer',
                    form.trackInventory ? 'bg-brand-600' : 'bg-gray-200',
                  )}
                >
                  <div className={cn(
                    'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
                    form.trackInventory ? 'translate-x-5' : 'translate-x-1',
                  )} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Track inventory</p>
                  <p className="text-xs text-gray-400">Deduct stock automatically on sale</p>
                </div>
              </label>

              {/* Composite toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => {
                    setForm((f) => ({ ...f, isComposite: !f.isComposite }));
                    if (!form.isComposite) setActiveTab('recipe');
                  }}
                  className={cn(
                    'relative w-10 h-6 rounded-full transition-colors duration-200 cursor-pointer',
                    form.isComposite ? 'bg-purple-600' : 'bg-gray-200',
                  )}
                >
                  <div className={cn(
                    'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
                    form.isComposite ? 'translate-x-5' : 'translate-x-1',
                  )} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-purple-500" /> Composite product
                  </p>
                  <p className="text-xs text-gray-400">Has a recipe — deducts ingredients on sale</p>
                </div>
              </label>

              {form.isComposite && recipe.length > 0 && (
                <div className="px-3 py-2 rounded-xl bg-purple-50 text-xs text-purple-700 flex items-center gap-2"
                     style={{ border: '1px solid #e9d5ff' }}>
                  <Layers className="w-3.5 h-3.5 flex-shrink-0" />
                  {recipe.length} ingredient{recipe.length > 1 ? 's' : ''} added.
                  <button type="button" className="underline ml-auto" onClick={() => setActiveTab('recipe')}>
                    Edit recipe →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Recipe tab ──────────────────────────────────────────────── */}
          {activeTab === 'recipe' && (
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 px-3 py-3 rounded-xl bg-purple-50"
                   style={{ border: '1px solid #e9d5ff' }}>
                <FlaskConical className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-purple-800">Ingredient Recipe</p>
                  <p className="text-xs text-purple-600 mt-0.5">
                    When this product is sold, the inventory of each ingredient is automatically deducted.
                    For example: 1 Latte = 18g coffee beans + 220ml milk + 1 cup.
                  </p>
                </div>
              </div>

              {/* Recipe items list */}
              {recipe.length > 0 && (
                <div className="space-y-2">
                  {recipe.map((item, idx) => (
                    <div
                      key={item.ingredientProductId}
                      className="flex items-center gap-2 p-3 rounded-xl bg-white"
                      style={{ border: '1px solid var(--color-border)' }}
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.ingredientProductName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {/* Quantity */}
                          <input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={item.quantity}
                            onChange={(e) => updateIngredient(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-20 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400"
                            title="Quantity"
                          />
                          {/* Unit */}
                          <select
                            value={item.unit}
                            onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
                            title="Unit"
                          >
                            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                          {/* Wastage */}
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={item.wastagePercent}
                              onChange={(e) => updateIngredient(idx, 'wastagePercent', parseFloat(e.target.value) || 0)}
                              className="w-14 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400"
                              title="Wastage %"
                            />
                            <span>% waste</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeIngredient(idx)}
                        className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add ingredient */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowIngredientSearch(!showIngredientSearch)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add ingredient
                </button>

                <AnimatePresence>
                  {showIngredientSearch && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg z-10 overflow-hidden"
                      style={{ border: '1px solid var(--color-border)' }}
                    >
                      <div className="p-2">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                          <input
                            autoFocus
                            placeholder="Search ingredient…"
                            value={ingredientSearch}
                            onChange={(e) => setIngredientSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-gray-50 border-0 focus:outline-none focus:ring-1 focus:ring-purple-300"
                          />
                        </div>
                      </div>
                      <div className="max-h-44 overflow-y-auto">
                        {ingredientOptions.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-4">No products found</p>
                        ) : ingredientOptions.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => addIngredient(p)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-purple-50 text-left transition-colors"
                          >
                            <Package className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{p.name}</span>
                            {p.category && (
                              <span className="ml-auto text-xs text-gray-400 flex-shrink-0">{p.category.name}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {recipe.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-4">
                  No ingredients yet. Add products that make up this item.
                </p>
              )}
            </div>
          )}

          {/* ── Sticky footer ───────────────────────────────────────────── */}
          <div className="px-6 py-4 flex gap-3 flex-shrink-0 bg-white"
               style={{ borderTop: '1px solid var(--color-border)' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn btn-primary flex-1">
              {isLoading ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stock adjust modal
// ─────────────────────────────────────────────────────────────────────────────
function AdjustModal({ item, storeId, onClose, onSuccess }: {
  item: InventoryItem; storeId: string; onClose: () => void; onSuccess: () => void;
}) {
  const [qty, setQty]     = useState('');
  const [type, setType]   = useState('ADJUSTMENT');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post('/inventory/adjust', {
        productId: item.product.id,
        variantId: item.variant ? item.id : undefined,
        quantity:  parseFloat(qty),
        type,
        notes,
      });
      toast.success('Stock adjusted');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Adjustment failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl"
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="font-bold text-lg">Adjust Stock</h2>
          <p className="text-sm text-gray-500 mt-0.5">{item.product.name}</p>
          <p className="text-sm text-gray-400">
            Current: <strong className="text-gray-700">{Number(item.quantity).toFixed(2)}</strong>
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity change</label>
            <input type="number" placeholder="+10 or -5" value={qty}
                   onChange={(e) => setQty(e.target.value)} className="input" step="0.01" required />
            <p className="text-xs text-gray-400 mt-1">Positive to add, negative to remove</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="input">
              <option value="ADJUSTMENT">Manual adjustment</option>
              <option value="WASTE">Waste / damage</option>
              <option value="OPENING_STOCK">Opening stock</option>
              <option value="RETURN">Customer return</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="input" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isLoading} className="btn btn-primary flex-1">
              {isLoading ? 'Saving…' : 'Apply'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Confirm modal
// ─────────────────────────────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }: {
  message: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4"
      >
        <p className="text-sm text-gray-700">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn btn-secondary flex-1">Cancel</button>
          <button onClick={onConfirm} className="btn btn-danger flex-1">Delete</button>
        </div>
      </motion.div>
    </div>
  );
}
