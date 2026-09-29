import { failureReasonLabel, formatMoney, timeAgo } from '../src/utils/format';

describe('formatMoney', () => {
  it('renders KWD with three decimals', () => {
    expect(formatMoney(18.75)).toBe('18.750 KWD');
    expect(formatMoney(0)).toBe('0.000 KWD');
    expect(formatMoney(42)).toBe('42.000 KWD');
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
