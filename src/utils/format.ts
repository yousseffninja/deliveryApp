import { FailureReason } from '../types';

/** Amounts are KWD, which uses three decimal places. */
export function formatMoney(amount: number): string {
  return `${amount.toFixed(3)} KWD`;
}

export function timeAgo(iso: string, now: number = Date.now()): string {
  const diffMs = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return `${Math.floor(hours / 24)}d ago`;
}

export const FAILURE_REASON_LABELS: Record<FailureReason, string> = {
  customer_unavailable: 'Customer unavailable',
  wrong_address: 'Wrong / missing address',
  refused_delivery: 'Customer refused delivery',
  payment_failed: 'Payment could not be collected',
  other: 'Other reason',
};

export function failureReasonLabel(reason: FailureReason): string {
  return FAILURE_REASON_LABELS[reason] ?? reason;
}
