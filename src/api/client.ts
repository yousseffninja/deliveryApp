import { TimeoutError } from './errors';
import { mockServer, MockServer } from './mockServer';
import { Api } from './types';

const DEFAULT_TIMEOUT_MS = 12_000;

/**
 * Client-side timeout so a stalled request becomes a retryable TimeoutError
 * instead of hanging the sync engine forever.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new TimeoutError()), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function createApi(server: MockServer): Api {
  return {
    getDeliveries: () => withTimeout(server.getDeliveries()),
    getDelivery: deliveryId => withTimeout(server.getDelivery(deliveryId)),
    completeDelivery: (deliveryId, payload) =>
      withTimeout(server.completeDelivery(deliveryId, payload)),
    failDelivery: (deliveryId, payload) =>
      withTimeout(server.failDelivery(deliveryId, payload)),
    uploadProof: (deliveryId, fileName, clientActionId) =>
      withTimeout(server.uploadProof(deliveryId, fileName, clientActionId)),
  };
}

/** API handle used by the app; swap `mockServer` for a real HTTP transport later. */
export const api: Api = createApi(mockServer);
