import { failureReasonLabel, formatMoney, timeAgo } from '../src/utils/format';

describe('formatMoney', () => {
  it('renders EGP with two decimals', () => {
    expect(formatMoney(1250)).toBe('1250.00 EGP');
    expect(formatMoney(0)).toBe('0.00 EGP');
    expect(formatMoney(890.25)).toBe('890.25 EGP');
    expect(formatMoney(2799.99)).toBe('2799.99 EGP');
  });
});

describe('timeAgo', () => {
  const now = Date.parse('2026-09-29T12:00:00.000Z');

  it('describes recent timestamps in minutes and hours', () => {
    expect(timeAgo(new Date(now - 20_000).toISOString(), now)).toBe('just now');
    expect(timeAgo(new Date(now - 5 * 60_000).toISOString(), now)).toBe('5m ago');
    expect(timeAgo(new Date(now - 3 * 3_600_000).toISOString(), now)).toBe('3h ago');
    expect(timeAgo(new Date(now - 2 * 86_400_000).toISOString(), now)).toBe('2d ago');
  });
});

describe('failureReasonLabel', () => {
  it('maps every reason to a human label', () => {
    expect(failureReasonLabel('customer_unavailable')).toBe('Customer unavailable');
    expect(failureReasonLabel('wrong_address')).toBe('Wrong / missing address');
  });
});
