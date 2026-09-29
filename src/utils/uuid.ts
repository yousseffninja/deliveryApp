let fallbackCounter = 0;

/**
 * Generates a unique client action id used as the API's `client_action_id`
 * idempotency key. Prefers Web Crypto when available (Hermes provides it),
 * with a time+counter fallback that is still collision-safe per device.
 */
export function makeUuid(): string {
  const cryptoRef = (globalThis as {
    crypto?: { getRandomValues?: (buf: Uint8Array) => Uint8Array };
  }).crypto;

  if (typeof cryptoRef?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    cryptoRef.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  fallbackCounter += 1;
  return `action-${Date.now().toString(36)}-${fallbackCounter.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
