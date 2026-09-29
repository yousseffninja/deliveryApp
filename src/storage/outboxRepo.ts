import { ActionType, PendingAction } from '../types';
import { asyncStorageKv, KeyValueStore } from './keyValue';
import { STORAGE_KEYS } from './keys';

/**
 * The outbox: durable queue of delivery confirmations that were recorded on
 * the device but not yet accepted by the server. Survives app restarts —
 * the whole point is that a driver's proof of delivery is never lost.
 *
 * Invariant enforced by callers: at most one action per delivery, so actions
 * are indexed by delivery_id.
 */
export class OutboxRepo {
  constructor(private kv: KeyValueStore = asyncStorageKv) {}

  async list(): Promise<PendingAction[]> {
    const raw = await this.kv.get(STORAGE_KEYS.outbox);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw) as PendingAction[];
    } catch {
      return [];
    }
  }

  async get(actionId: string): Promise<PendingAction | null> {
    const all = await this.list();
    return all.find(a => a.id === actionId) ?? null;
  }

  async getByDelivery(deliveryId: number): Promise<PendingAction | null> {
    const all = await this.list();
    return all.find(a => a.delivery_id === deliveryId) ?? null;
  }

  async hasActionFor(deliveryId: number, type?: ActionType): Promise<boolean> {
    const existing = await this.getByDelivery(deliveryId);
    if (!existing) {
      return false;
    }
    return type ? existing.type === type : true;
  }

  async put(action: PendingAction): Promise<void> {
    const all = await this.list();
    const index = all.findIndex(a => a.id === action.id);
    if (index >= 0) {
      all[index] = action;
    } else {
      all.push(action);
    }
    await this.kv.set(STORAGE_KEYS.outbox, JSON.stringify(all));
  }

  async remove(actionId: string): Promise<void> {
    const all = await this.list();
    const next = all.filter(a => a.id !== actionId);
    await this.kv.set(STORAGE_KEYS.outbox, JSON.stringify(next));
  }

  async clear(): Promise<void> {
    await this.kv.remove(STORAGE_KEYS.outbox);
  }
}
