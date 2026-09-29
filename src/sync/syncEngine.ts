import { ApiError, ConflictError, describeError, NetworkError, TimeoutError } from '../api/errors';
import { Api } from '../api/types';
import { DeliveriesRepo } from '../storage/deliveriesRepo';
import { OutboxRepo } from '../storage/outboxRepo';
import { CompletePayload, Delivery, FailPayload, PendingAction } from '../types';

export type SyncReason = 'submit' | 'connectivity' | 'manual' | 'auto';

export type SyncEvent =
  | { type: 'action_updated'; action: PendingAction }
  | { type: 'action_synced'; action: PendingAction; delivery: Delivery; duplicate: boolean }
  | { type: 'action_failed'; action: PendingAction }
  | { type: 'action_conflict'; action: PendingAction; serverDelivery: Delivery };

export interface SyncEngineDeps {
  api: Api;
  outbox: OutboxRepo;
  deliveries: DeliveriesRepo;
  isOnline: () => boolean;
  onEvent: (event: SyncEvent) => void;
  /** attempts before a retryable action is parked as `failed` (manual retry required) */
  maxAttempts?: number;
}

export const DEFAULT_MAX_ATTEMPTS = 3;

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** 5s, 10s, 20s... capped at 60s. */
export function backoffDelayMs(attempts: number): number {
  return Math.min(5_000 * 2 ** Math.max(0, attempts - 1), 60_000);
}

/** Whether the auto-retry tick may attempt this action right now. */
export function dueForRetry(action: PendingAction, now: number = Date.now()): boolean {
  if (!action.last_attempt_at) {
    return true;
  }
  const elapsed = now - new Date(action.last_attempt_at).getTime();
  return elapsed >= backoffDelayMs(action.attempts);
}

function isRetryableError(err: unknown): boolean {
  return (
    err instanceof NetworkError ||
    err instanceof TimeoutError ||
    (err instanceof ApiError && err.status >= 500)
  );
}

/**
 * Drains the outbox in FIFO order.
 *
 * Guarantees:
 * - one queue drain at a time (`syncing` lock), so an action is never
 *   submitted twice concurrently;
 * - every attempt is tagged with the action's stable `client_action_id`,
 *   so even a duplicated submit is idempotent on the server;
 * - network/timeout/5xx failures keep the action `waiting` (auto retry with
 *   backoff) until `maxAttempts`, then park it as `failed` for manual retry;
 * - 409 conflicts park the action as `conflict` with the server state —
 *   never auto-retried, resolved by the user in the UI.
 */
export class SyncEngine {
  private syncing = false;
  private autoTimer: ReturnType<typeof setInterval> | null = null;
  private readonly maxAttempts: number;

  constructor(private deps: SyncEngineDeps) {
    this.maxAttempts = deps.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  }

  get isSyncing(): boolean {
    return this.syncing;
  }

  startAutoRetry(intervalMs = 20_000): void {
    if (this.autoTimer) {
      return;
    }
    this.autoTimer = setInterval(() => {
      void this.syncAll('auto');
    }, intervalMs);
  }

  stopAutoRetry(): void {
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = null;
    }
  }

  async syncAll(reason: SyncReason): Promise<void> {
    if (this.syncing || !this.deps.isOnline()) {
      return;
    }
    const queued = await this.deps.outbox.list();
    const actionable = queued.filter(
      a => a.status === 'waiting' || a.status === 'failed',
    );
    if (actionable.length === 0) {
      return;
    }
    this.syncing = true;
    try {
      for (const action of actionable) {
        if (!this.deps.isOnline()) {
          break;
        }
        await this.processOne(action, reason);
      }
    } finally {
      this.syncing = false;
    }
  }

  private async processOne(queued: PendingAction, reason: SyncReason): Promise<void> {
    if (queued.status !== 'waiting' && queued.status !== 'failed') {
      return;
    }
    if (reason === 'auto') {
      // failed actions require an explicit manual retry;
      // waiting actions respect their backoff schedule
      if (queued.status === 'failed' || !dueForRetry(queued)) {
        return;
      }
    }

    // re-read in case the user discarded/edited it mid-drain
    const live = (await this.deps.outbox.get(queued.id)) ?? queued;
    if (live.status !== 'waiting' && live.status !== 'failed') {
      return;
    }

    const inFlight: PendingAction = {
      ...live,
      status: 'syncing',
      last_attempt_at: new Date().toISOString(),
    };
    await this.deps.outbox.put(inFlight);
    this.deps.onEvent({ type: 'action_updated', action: inFlight });

    try {
      let current = inFlight;

      // photo proof is uploaded separately, but only once per action
      if (current.type === 'complete' && current.photo_uri && !current.proof_uploaded) {
        await this.deps.api.uploadProof(current.delivery_id, current.photo_uri, current.id);
        current = { ...current, proof_uploaded: true };
        await this.deps.outbox.put(current);
        this.deps.onEvent({ type: 'action_updated', action: current });
      }

      const result =
        current.type === 'complete'
          ? await this.deps.api.completeDelivery(
              current.delivery_id,
              current.payload as CompletePayload,
            )
          : await this.deps.api.failDelivery(
              current.delivery_id,
              current.payload as FailPayload,
            );

      await this.deps.outbox.remove(current.id);
      await this.deps.deliveries.upsert(result.delivery);
      this.deps.onEvent({
        type: 'action_synced',
        action: current,
        delivery: result.delivery,
        duplicate: result.duplicate,
      });
    } catch (err) {
      await this.handleFailure(live, err);
    }
  }

  private async handleFailure(attempted: PendingAction, err: unknown): Promise<void> {
    const attempts = attempted.attempts + 1;

    if (err instanceof ConflictError) {
      const conflicted: PendingAction = {
        ...attempted,
        status: 'conflict',
        attempts,
        last_error: 'The delivery changed on the server before your update arrived.',
        server_delivery: err.serverDelivery,
      };
      await this.deps.outbox.put(conflicted);
      this.deps.onEvent({
        type: 'action_conflict',
        action: conflicted,
        serverDelivery: err.serverDelivery,
      });
      return;
    }

    const keepAutoRetrying = isRetryableError(err) && attempts < this.maxAttempts;
    const failed: PendingAction = {
      ...attempted,
      status: keepAutoRetrying ? 'waiting' : 'failed',
      attempts,
      last_error: describeError(err),
    };
    await this.deps.outbox.put(failed);
    this.deps.onEvent({ type: 'action_failed', action: failed });
  }
}
