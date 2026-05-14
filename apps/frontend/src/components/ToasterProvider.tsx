'use client';
import dynamic from 'next/dynamic';

// Prevent react-hot-toast from rendering server-side (causes hydration mismatch)
const Toaster = dynamic(
  () => import('react-hot-toast').then((m) => ({ default: m.Toaster })),
  { ssr: false },
);

export function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: { borderRadius: '8px', fontSize: '14px' },
      }}
    />
  );
}
