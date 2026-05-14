'use client';
import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../../lib/utils';

interface Modifier { id: string; name: string; priceAdjustment: number; isDefault: boolean; }
interface ModifierGroup {
  id: string; name: string; required: boolean;
  minSelect: number; maxSelect: number; modifiers: Modifier[];
}
interface Product {
  id: string; name: string; price: number;
  modifierGroups: ModifierGroup[]; variants: any[];
}

interface Props {
  product: Product;
  onConfirm: (modifiers: { modifierId: string; name: string; priceAdjustment: number }[], variantId?: string) => void;
  onClose: () => void;
}

export function ModifierModal({ product, onConfirm, onClose }: Props) {
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, Set<string>>>(
    Object.fromEntries(
      product.modifierGroups.map((g) => [
        g.id,
        new Set(g.modifiers.filter((m) => m.isDefault).map((m) => m.id)),
      ]),
    ),
  );
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    product.variants[0]?.id,
  );

  const toggleModifier = (groupId: string, modifierId: string, maxSelect: number) => {
    setSelectedModifiers((prev) => {
      const current = new Set(prev[groupId]);
      if (current.has(modifierId)) {
        current.delete(modifierId);
      } else {
        if (maxSelect === 1) current.clear();
        if (current.size < maxSelect) current.add(modifierId);
      }
      return { ...prev, [groupId]: current };
    });
  };

  const handleConfirm = () => {
    const modifiers = product.modifierGroups.flatMap((g) =>
      g.modifiers
        .filter((m) => selectedModifiers[g.id]?.has(m.id))
        .map((m) => ({ modifierId: m.id, name: m.name, priceAdjustment: m.priceAdjustment })),
    );
    onConfirm(modifiers, selectedVariantId);
  };

  const totalModifierPrice = product.modifierGroups
    .flatMap((g) => g.modifiers.filter((m) => selectedModifiers[g.id]?.has(m.id)))
    .reduce((sum, m) => sum + m.priceAdjustment, 0);

  const variant = product.variants.find((v) => v.id === selectedVariantId);
  const finalPrice = (variant?.price ?? product.price) + totalModifierPrice;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col animate-slide-in-up">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-bold text-lg">{product.name}</h2>
            <p className="text-brand-600 font-semibold">{formatCurrency(finalPrice)}</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-6">
          {/* Variants */}
          {product.variants.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-2">Select variant</h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariantId(v.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg border text-sm font-medium transition-all',
                      selectedVariantId === v.id
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-gray-200 hover:border-gray-300',
                    )}
                  >
                    {v.name}
                    {v.price && ` · ${formatCurrency(v.price)}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Modifier groups */}
          {product.modifierGroups.map((group) => (
            <div key={group.id}>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-sm text-gray-700">{group.name}</h3>
                {group.required && <span className="badge badge-red text-xs">Required</span>}
                {group.maxSelect > 1 && (
                  <span className="badge badge-gray text-xs">Pick up to {group.maxSelect}</span>
                )}
              </div>
              <div className="space-y-1.5">
                {group.modifiers.map((modifier) => {
                  const isSelected = selectedModifiers[group.id]?.has(modifier.id);
                  return (
                    <button
                      key={modifier.id}
                      onClick={() => toggleModifier(group.id, modifier.id, group.maxSelect)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-xl border transition-all text-sm',
                        isSelected
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-gray-200 hover:border-gray-300',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-4 h-4 rounded border-2 flex items-center justify-center',
                          group.maxSelect === 1 ? 'rounded-full' : 'rounded',
                          isSelected ? 'border-brand-500 bg-brand-500' : 'border-gray-300',
                        )}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span>{modifier.name}</span>
                      </div>
                      {modifier.priceAdjustment > 0 && (
                        <span className="text-gray-500">+{formatCurrency(modifier.priceAdjustment)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 border-t">
          <button onClick={handleConfirm} className="btn btn-primary btn-lg w-full">
            Add to order · {formatCurrency(finalPrice)}
          </button>
        </div>
      </div>
    </div>
  );
}
