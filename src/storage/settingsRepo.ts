import { asyncStorageKv, KeyValueStore } from './keyValue';
import { STORAGE_KEYS } from './keys';
import { ThemeModePreference } from '../theme';

export interface AppSettings {
  themeMode: ThemeModePreference;
}

export const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'system',
};

/** Persists user preferences (appearance). Language lands with the i18n PR. */
export class SettingsRepo {
  constructor(private kv: KeyValueStore = asyncStorageKv) {}

  async load(): Promise<AppSettings> {
    const raw = await this.kv.get(STORAGE_KEYS.settings);
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }
    try {
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return {
        themeMode: parsed.themeMode ?? DEFAULT_SETTINGS.themeMode,
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  async save(settings: AppSettings): Promise<void> {
    await this.kv.set(STORAGE_KEYS.settings, JSON.stringify(settings));
  }
}
