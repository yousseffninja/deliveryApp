import { Delivery } from '../types';

/** Device has no connectivity (real or forced by the simulator). */
export class NetworkError extends Error {
  constructor(message = 'No internet connection') {
    super(message);
    this.name = 'NetworkError';
  }
}

/** Request exceeded the client-side timeout. */
export class TimeoutError extends Error {
  constructor(message = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/** Non-2xx response. Retryable classes are decided by the sync engine. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 409 — the delivery changed on the server before this update landed
 * (status-based conflict: the delivery is no longer `pending` server-side).
 * Carries the authoritative server state so the UI can offer a resolution.
 */
export class ConflictError extends ApiError {
  constructor(public readonly serverDelivery: Delivery) {
    super(409, 'CONFLICT', 'Delivery was modified on the server');
    this.name = 'ConflictError';
  }
}

export function describeError(err: unknown): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return 'Unknown error';
}
