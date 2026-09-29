import { ar, en } from '../src/i18n/translations';
import { setI18nLocale, t, isRTL } from '../src/i18n';
import { timeAgo } from '../src/utils/format';

describe('i18n', () => {
  it('Arabic defines exactly the same keys as English', () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
  });

  it('no translation is empty', () => {
    for (const key of Object.keys(en)) {
      const k = key as keyof typeof en;
      expect(en[k].length).toBeGreaterThan(0);
      expect(ar[k].length).toBeGreaterThan(0);
    }
  });

  it('interpolates parameters and falls back to English then the key', () => {
    setI18nLocale('en');
    expect(t('route.subtitle', { count: 3 })).toBe('Today · 3 pending stops');
    expect(t('banner.offlineWaiting', { count: 2 })).toBe(
      'Offline mode — 2 waiting to sync',
    );
  });

  it('switches to Arabic and flags RTL', () => {
    setI18nLocale('ar');
    expect(t('route.title')).toBe('توصيلاتي');
    expect(t('sync.failed')).toBe('فشلت المزامنة');
    expect(isRTL()).toBe(true);
    setI18nLocale('en');
    expect(isRTL()).toBe(false);
  });

  it('formats relative time per locale', () => {
    const now = Date.now();
    const fiveMinAgo = new Date(now - 5 * 60_000).toISOString();
    expect(timeAgo(fiveMinAgo, now, 'en')).toBe('5m ago');
    expect(timeAgo(fiveMinAgo, now, 'ar')).toBe('قبل 5 د');
  });

  it('localises every failure reason', () => {
    setI18nLocale('en');
    expect(t('reason.customer_unavailable')).toBe('Customer unavailable');
    setI18nLocale('ar');
    expect(t('reason.customer_unavailable')).toBe('العميل غير متوفر');
    setI18nLocale('en');
  });
});
