import { FailureReason } from '../types';
import { t } from '../i18n';
import type { Locale } from '../i18n';

export const FAILURE_REASONS: FailureReason[] = [
  'customer_unavailable',
  'wrong_address',
  'refused_delivery',
  'payment_failed',
  'other',
];

/** Amounts are KWD, which uses three decimal places. */
export function formatMoney(amount: number): string {
  return `${amount.toFixed(3)} KWD`;
}

export function timeAgo(
  iso: string,
  now: number = Date.now(),
  locale: Locale = 'en',
): string {
  const diffMs = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return locale === 'ar' ? 'الآن' : 'just now';
  }
  if (minutes < 60) {
    return locale === 'ar' ? `قبل ${minutes} د` : `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return locale === 'ar' ? `قبل ${hours} س` : `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return locale === 'ar' ? `قبل ${days} ي` : `${days}d ago`;
}

/** Localised label for a failure reason (reads the current i18n locale). */
export function failureReasonLabel(reason: FailureReason): string {
  return t(`reason.${reason}` as never);
}
