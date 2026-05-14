/**
 * ─── Offline Sync Layer ────────────────────────────────────────────────────────
 *
 * Architecture:
 *  1. When the device is offline, all orders are saved to IndexedDB.
 *  2. When connectivity is restored, a sync worker iterates the queue and
 *     POSTs each item to the server using the /orders/sync endpoint.
 *  3. Idempotency is guaranteed by offlineId — the server ignores duplicates.
 *  4. Conflict resolution:
 *     - Inventory conflicts: the server deducts stock using the recorded
 *       quantity, and marks any over-sold items for manager review.
 *     - Order conflicts: if the server's price changed, the offline price
 *       is kept (snapshot at time of sale).
 *  5. Products and inventory are cached locally in IndexedDB for offline lookup.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { openDB, IDBPDatabase, DBSchema } from 'idb';

interface PendingOrder {
  offlineId: string;
  storeId: string;
  type: string;
  items: any[];
  payments: any[];
  customerId?: string;
  tableId?: string;
  notes?: string;
  discountIds?: string[];
  isOffline: boolean;
  createdAt: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  failureReason?: string;
  retryCount: number;
}

interface CachedProduct {
  id: string;
  name: string;
  price: number;
  sku?: string;
  barcode?: string;
  categoryId?: string;
  taxRate?: number;
  modifierGroups: any[];
  variants: any[];
  cachedAt: number;
}

interface PosDB extends DBSchema {
  pendingOrders: {
    key: string;
    value: PendingOrder;
    indexes: { syncStatus: string };
  };
  products: {
    key: string;
    value: CachedProduct;
    indexes: { barcode: string; categoryId: string };
  };
  inventory: {
    key: string; // `${storeId}:${productId}:${variantId}`
    value: { storeId: string; productId: string; variantId?: string; quantity: number; cachedAt: number };
  };
}

class OfflineQueue {
  private db: IDBPDatabase<PosDB> | null = null;
  private readonly DB_NAME = 'ellybear-pos';
  private readonly DB_VERSION = 1;

  async getDb(): Promise<IDBPDatabase<PosDB>> {
    if (this.db) return this.db;

    this.db = await openDB<PosDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Pending orders store
        const ordersStore = db.createObjectStore('pendingOrders', {
          keyPath: 'offlineId',
        });
        ordersStore.createIndex('syncStatus', 'syncStatus');

        // Product cache
        const productsStore = db.createObjectStore('products', { keyPath: 'id' });
        productsStore.createIndex('barcode', 'barcode');
        productsStore.createIndex('categoryId', 'categoryId');

        // Inventory cache
        db.createObjectStore('inventory', { keyPath: ['storeId', 'productId', 'variantId'] });
      },
    });

    return this.db;
  }

  // ─── Order queue ─────────────────────────────────────────────────────────────

  async enqueue(order: Omit<PendingOrder, 'syncStatus' | 'retryCount'>) {
    const db = await this.getDb();
    await db.put('pendingOrders', {
      ...order,
      syncStatus: 'pending',
      retryCount: 0,
    });
  }

  async getPendingOrders(): Promise<PendingOrder[]> {
    const db = await this.getDb();
    return db.getAllFromIndex('pendingOrders', 'syncStatus', 'pending');
  }

  async markSynced(offlineId: string) {
    const db = await this.getDb();
    const order = await db.get('pendingOrders', offlineId);
    if (order) {
      await db.put('pendingOrders', { ...order, syncStatus: 'synced' });
    }
  }

  async markFailed(offlineId: string, reason: string) {
    const db = await this.getDb();
    const order = await db.get('pendingOrders', offlineId);
    if (order) {
      await db.put('pendingOrders', {
        ...order,
        syncStatus: order.retryCount >= 3 ? 'failed' : 'pending',
        failureReason: reason,
        retryCount: order.retryCount + 1,
      });
    }
  }

  async getPendingCount(): Promise<number> {
    const pending = await this.getPendingOrders();
    return pending.length;
  }

  // ─── Product cache ────────────────────────────────────────────────────────────

  async cacheProducts(products: CachedProduct[]) {
    const db = await this.getDb();
    const tx = db.transaction('products', 'readwrite');
    await Promise.all([
      ...products.map((p) => tx.store.put({ ...p, cachedAt: Date.now() })),
      tx.done,
    ]);
  }

  async getProductByBarcode(barcode: string): Promise<CachedProduct | undefined> {
    const db = await this.getDb();
    return db.getFromIndex('products', 'barcode', barcode);
  }

  async getAllCachedProducts(): Promise<CachedProduct[]> {
    const db = await this.getDb();
    return db.getAll('products');
  }

  // ─── Inventory cache ──────────────────────────────────────────────────────────

  async cacheInventory(items: Array<{
    storeId: string; productId: string; variantId?: string; quantity: number;
  }>) {
    const db = await this.getDb();
    const tx = db.transaction('inventory', 'readwrite');
    await Promise.all([
      ...items.map((i) => tx.store.put({ ...i, cachedAt: Date.now() })),
      tx.done,
    ]);
  }

  // Optimistically deduct stock from cache when offline
  async deductInventory(storeId: string, productId: string, quantity: number, variantId?: string) {
    const db = await this.getDb();
    const key = IDBKeyRange.only([storeId, productId, variantId]);
    const entry = await db.get('inventory', [storeId, productId, variantId] as any);
    if (entry) {
      await db.put('inventory', { ...entry, quantity: Math.max(0, entry.quantity - quantity) });
    }
  }
}

export const offlineQueue = new OfflineQueue();

// ─── Sync worker ──────────────────────────────────────────────────────────────
// Call this when connectivity is restored (useOnlineStatus hook triggers it)

export async function syncPendingOrders(apiPost: (url: string, data: any) => Promise<any>) {
  const pending = await offlineQueue.getPendingOrders();
  if (pending.length === 0) return;

  console.log(`[Offline Sync] Syncing ${pending.length} pending orders…`);

  for (const order of pending) {
    try {
      await apiPost('/orders/sync', order);
      await offlineQueue.markSynced(order.offlineId);
      console.log(`[Offline Sync] Synced order ${order.offlineId}`);
    } catch (err: any) {
      const reason = err.response?.data?.message || 'Unknown error';
      await offlineQueue.markFailed(order.offlineId, reason);
      console.warn(`[Offline Sync] Failed to sync ${order.offlineId}: ${reason}`);
    }
  }
}
