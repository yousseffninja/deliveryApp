import { asyncStorageKv, KeyValueStore } from './keyValue';
import { STORAGE_KEYS } from './keys';
import { ThemeModePreference } from '../theme';
import type { Locale } from '../i18n';

export interface AppSettings {
  themeMode: ThemeModePreference;
  locale: Locale;
}

export const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'system',
  locale: 'en',
};

/** Persists user preferences: appearance and language. */
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
        locale: parsed.locale === 'ar' ? 'ar' : DEFAULT_SETTINGS.locale,
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  async save(settings: AppSettings): Promise<void> {
    await this.kv.set(STORAGE_KEYS.settings, JSON.stringify(settings));
  }
}
