import { SyncedRecord } from '../types';
import { asyncStorageKv, KeyValueStore } from './keyValue';
import { STORAGE_KEYS } from './keys';

/** Persists "successfully synced" markers (per delivery) for the Sync Queue UI. */
export class SyncedLogRepo {
  constructor(private kv: KeyValueStore = asyncStorageKv) {}

  async load(): Promise<Record<number, SyncedRecord>> {
    const raw = await this.kv.get(STORAGE_KEYS.syncedLog);
    if (!raw) {
      return {};
    }
    try {
      return JSON.parse(raw) as Record<number, SyncedRecord>;
    } catch {
      return {};
    }
  }

  async save(log: Record<number, SyncedRecord>): Promise<void> {
    await this.kv.set(STORAGE_KEYS.syncedLog, JSON.stringify(log));
  }

  async clear(): Promise<void> {
    await this.kv.remove(STORAGE_KEYS.syncedLog);
  }
}
