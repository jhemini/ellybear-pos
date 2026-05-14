'use client';
import { useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import toast from 'react-hot-toast';
import { useAppDispatch } from '../../store';
import { addItem } from '../../store/slices/cartSlice';
import { toggleScan } from '../../store/slices/posSlice';
import { api } from '../../lib/api';
import { offlineQueue } from '../../lib/offlineQueue';

export function BarcodeScanner() {
  const dispatch = useAppDispatch();
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader.decodeFromVideoDevice(undefined, videoRef.current!, async (result, err) => {
      if (!result) return;

      const barcode = result.getText();
      try {
        // Try live API first, fall back to cached products
        let product: any;
        try {
          const { data } = await api.get(`/products/barcode/${barcode}`);
          product = data.data;
        } catch {
          // Offline fallback
          product = await offlineQueue.getProductByBarcode(barcode);
        }

        if (!product) {
          toast.error(`No product found for barcode: ${barcode}`);
          return;
        }

        dispatch(
          addItem({
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            taxRate: product.taxRate ? Number(product.taxRate.rate) : 0,
            modifiers: [],
            imageUrl: product.imageUrl,
          }),
        );

        toast.success(`Added: ${product.name}`);
        dispatch(toggleScan()); // close scanner after successful scan
      } catch {
        toast.error('Failed to look up barcode');
      }
    });

    return () => {
      reader.reset();
    };
  }, [dispatch]);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center gap-4">
      <div className="relative w-72 h-72 rounded-2xl overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-cover" />
        {/* Scan guide overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-48 border-2 border-white/80 rounded-xl" />
        </div>
      </div>
      <p className="text-white text-sm">Point camera at barcode</p>
      <button
        onClick={() => dispatch(toggleScan())}
        className="btn btn-secondary"
      >
        Cancel
      </button>
    </div>
  );
}
