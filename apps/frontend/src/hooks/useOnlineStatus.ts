'use client';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAppDispatch } from '../store';
import { setOnline, setSyncing, setSyncedAt, setPendingCount } from '../store/slices/offlineSlice';
import { syncPendingOrders, offlineQueue } from '../lib/offlineQueue';
import { api } from '../lib/api';

export function useOnlineStatus() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const handleOnline = async () => {
      dispatch(setOnline(true));
      toast.success('Back online — syncing orders…');

      const count = await offlineQueue.getPendingCount();
      if (count === 0) return;

      dispatch(setSyncing(true));
      dispatch(setPendingCount(count));

      try {
        await syncPendingOrders((url, data) =>
          api.post(url, data).then((r) => r.data),
        );
        dispatch(setSyncedAt());
        toast.success(`Synced ${count} offline order${count > 1 ? 's' : ''}`);
      } catch {
        dispatch(setSyncing(false));
        toast.error('Some orders failed to sync — will retry');
      }
    };

    const handleOffline = () => {
      dispatch(setOnline(false));
      toast('You are offline. Orders will be saved locally.', { icon: '⚠️' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load pending count on mount
    offlineQueue.getPendingCount().then((count) => {
      dispatch(setPendingCount(count));
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);
}
