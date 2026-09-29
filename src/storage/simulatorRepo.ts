import { NetworkProfile } from '../types';
import { asyncStorageKv, KeyValueStore } from './keyValue';
import { STORAGE_KEYS } from './keys';

export interface SimulatorConfig {
  profile: NetworkProfile;
  armedConflictDeliveryId: number | null;
}

export const DEFAULT_SIMULATOR_CONFIG: SimulatorConfig = {
  profile: 'online',
  armedConflictDeliveryId: null,
};

/**
 * Simulator settings are persisted on purpose: switching the app to
 * "offline" and killing it is exactly how you demo the outbox surviving
 * a cold start.
 */
export class SimulatorRepo {
  constructor(private kv: KeyValueStore = asyncStorageKv) {}

  async load(): Promise<SimulatorConfig> {
    const raw = await this.kv.get(STORAGE_KEYS.simulator);
    if (!raw) {
      return { ...DEFAULT_SIMULATOR_CONFIG };
    }
    try {
      const parsed = JSON.parse(raw) as Partial<SimulatorConfig>;
      return {
        profile: parsed.profile ?? DEFAULT_SIMULATOR_CONFIG.profile,
        armedConflictDeliveryId: parsed.armedConflictDeliveryId ?? null,
      };
    } catch {
      return { ...DEFAULT_SIMULATOR_CONFIG };
    }
  }

  async save(config: SimulatorConfig): Promise<void> {
    await this.kv.set(STORAGE_KEYS.simulator, JSON.stringify(config));
  }
}
