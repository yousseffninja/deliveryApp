import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { Alert, DevSettings, I18nManager } from 'react-native';
import { ar, en, TranslationKey } from './translations';
import { useAppStore } from '../store/useAppStore';

export type Locale = 'en' | 'ar';

let currentLocale: Locale = 'en';

export function isRTL(locale: Locale = currentLocale): boolean {
  return locale === 'ar';
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    params[name] !== undefined ? String(params[name]) : match,
  );
}

/**
 * Translate `key` in the current locale. Falls back to English, then to the
 * key itself. Safe to call outside React (tests, utils) - it reads the
 * module-level locale that the provider keeps in sync with the store.
 */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const dict = currentLocale === 'ar' ? ar : en;
  const template = dict[key] ?? en[key] ?? key;
  return interpolate(template, params);
}

/** Non-React locale switch (tests / early bootstrap). */
export function setI18nLocale(locale: Locale): void {
  currentLocale = locale;
}

/**
 * Applies the layout direction for `locale` at the native level. Called by the
 * App shell BEFORE hydration starts, so the first frame is already mirrored.
 * Lazily requires react-native so unit tests can import this module.
 */
export function applyRTLPreference(locale: Locale): void {
  const { I18nManager } = require('react-native') as {
    I18nManager: { allowRTL: (v: boolean) => void; forceRTL: (v: boolean) => void };
  };
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(isRTL(locale));
}

interface I18nValue {
  t: typeof t;
  locale: Locale;
  isRTL: boolean;
  /** Persists the language and offers a reload when the direction flips. */
  changeLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nValue>({
  t,
  locale: 'en',
  isRTL: false,
  changeLocale: () => undefined,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useAppStore(s => s.locale) as Locale;
  const setLocaleStore = useAppStore(s => s.setLocale);

  useEffect(() => {
    currentLocale = locale;
  }, [locale]);

  const value = useMemo<I18nValue>(
    () => ({
      t,
      locale,
      isRTL: isRTL(locale),
      changeLocale: next => {
        const directionChanged = isRTL(next) !== I18nManager.isRTL;
        void setLocaleStore(next);
        if (directionChanged) {
          Alert.alert(t('lang.restartTitle'), t('lang.restartBody'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('lang.reload'),
              onPress: () => {
                if (__DEV__ && typeof DevSettings?.reload === 'function') {
                  DevSettings.reload();
                }
                // In release builds the user restarts the app manually;
                // text language still applies immediately, only mirroring
                // needs the restart.
              },
            },
          ]);
        }
      },
    }),
    [locale, setLocaleStore],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
