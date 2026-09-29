import { Delivery } from '../types';
import { asyncStorageKv, KeyValueStore } from './keyValue';
import { STORAGE_KEYS } from './keys';

/**
 * Persists the last known list of deliveries so the app can show data
 * instantly on cold start and keep working with no connectivity.
 */
export class DeliveriesRepo {
  constructor(private kv: KeyValueStore = asyncStorageKv) {}

  async loadAll(): Promise<Delivery[]> {
    const raw = await this.kv.get(STORAGE_KEYS.deliveries);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw) as Delivery[];
    } catch {
      return [];
    }
  }

  async saveAll(deliveries: Delivery[]): Promise<void> {
    await this.kv.set(STORAGE_KEYS.deliveries, JSON.stringify(deliveries));
  }

  async upsert(delivery: Delivery): Promise<void> {
    const all = await this.loadAll();
    const index = all.findIndex(d => d.id === delivery.id);
    if (index >= 0) {
      all[index] = delivery;
    } else {
      all.push(delivery);
    }
    await this.saveAll(all);
  }
}
