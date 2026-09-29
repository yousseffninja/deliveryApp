import {
  CompletePayload,
  Delivery,
  FailPayload,
  NetworkProfile,
} from '../types';
import { ApiError, ConflictError, NetworkError, TimeoutError } from './errors';
import { seedDeliveries } from './seed';
import {
  CompleteDeliveryResponse,
  FailDeliveryResponse,
  ProofUploadResponse,
} from './types';

interface ProfileSettings {
  latencyMs: number;
  jitterMs: number;
  /** probability of an injected 500 */
  failureRate: number;
  /** probability of a stalled request that forces the client timeout */
  stallChance: number;
}

const PROFILE_SETTINGS: Record<NetworkProfile, ProfileSettings> = {
  online: { latencyMs: 350, jitterMs: 250, failureRate: 0, stallChance: 0 },
  slow: { latencyMs: 4000, jitterMs: 3500, failureRate: 0.05, stallChance: 0.15 },
  flaky: { latencyMs: 500, jitterMs: 700, failureRate: 0.45, stallChance: 0.05 },
  offline: { latencyMs: 100, jitterMs: 0, failureRate: 0, stallChance: 0 },
};

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/**
 * In-memory stand-in for the real backend. Implements every behavior the task
 * expects the mock API to simulate:
 *
 * - normal successful responses, slow responses, injected 500s, stalls (timeouts)
 * - temporary connectivity loss (`offline` profile) and successful retry afterwards
 * - duplicate submission protection via the `client_action_id` registry:
 *   replays return the original result without mutating state again
 * - a delivery changing on the server before the app submits -> 409 ConflictError
 *   carrying the authoritative server state
 */
export class MockServer {
  /** test hook: multiply all delays (0 makes tests instant) */
  public latencyScale = 1;

  private deliveries = new Map<number, Delivery>();
  private processedActions = new Map<string, Delivery>();
  private proofActions = new Set<string>();
  private profile: NetworkProfile = 'online';
  private armedConflictDeliveryId: number | null = null;

  constructor() {
    this.reset();
  }

  reset(profile?: NetworkProfile): void {
    this.deliveries = new Map(seedDeliveries().map(d => [d.id, d]));
    this.processedActions.clear();
    this.proofActions.clear();
    this.armedConflictDeliveryId = null;
    if (profile) {
      this.profile = profile;
    }
  }

  configure(profile: NetworkProfile, armedConflictDeliveryId: number | null): void {
    this.profile = profile;
    this.armedConflictDeliveryId = armedConflictDeliveryId;
  }

  getState(): { profile: NetworkProfile; armedConflictDeliveryId: number | null } {
    return { profile: this.profile, armedConflictDeliveryId: this.armedConflictDeliveryId };
  }

  armConflict(deliveryId: number | null): void {
    this.armedConflictDeliveryId = deliveryId;
  }

  /** Dispatch-side mutation: the order is cancelled before the driver's update lands. */
  simulateServerChange(deliveryId: number): Delivery {
    const delivery = this.require(deliveryId);
    delivery.status = 'cancelled';
    delivery.note = 'Order cancelled by customer via support line';
    delivery.version += 1;
    delivery.updated_at = new Date().toISOString();
    return clone(delivery);
  }

  getDeliveries(): Promise<Delivery[]> {
    return this.network(() =>
      Array.from(this.deliveries.values())
        .map(clone)
        .sort((a, b) => a.id - b.id),
    );
  }

  getDelivery(deliveryId: number): Promise<Delivery> {
    return this.network(() => clone(this.require(deliveryId)));
  }

  completeDelivery(
    deliveryId: number,
    payload: CompletePayload,
  ): Promise<CompleteDeliveryResponse> {
    return this.network(() =>
      this.applyResolution(deliveryId, payload.client_action_id, delivery => {
        delivery.status = 'delivered';
        delivery.recipient_name = payload.recipient_name;
        delivery.note = payload.note ?? delivery.note;
        delivery.proof_attached = this.proofActions.has(payload.client_action_id);
      }),
    );
  }

  failDelivery(
    deliveryId: number,
    payload: FailPayload,
  ): Promise<FailDeliveryResponse> {
    return this.network(() =>
      this.applyResolution(deliveryId, payload.client_action_id, delivery => {
        delivery.status = 'failed';
        delivery.failure_reason = payload.reason;
        delivery.note = payload.note ?? delivery.note;
      }),
    );
  }

  uploadProof(
    deliveryId: number,
    fileName: string,
    clientActionId: string,
  ): Promise<ProofUploadResponse> {
    return this.network(() => {
      this.require(deliveryId);
      this.proofActions.add(clientActionId);
      return {
        delivery_id: deliveryId,
        proof_id: `proof-${clientActionId.slice(0, 8)}`,
        received_at: new Date().toISOString(),
        file_name: fileName,
      };
    });
  }

  private applyResolution(
    deliveryId: number,
    clientActionId: string,
    mutate: (delivery: Delivery) => void,
  ): CompleteDeliveryResponse | FailDeliveryResponse {
    const delivery = this.require(deliveryId);

    // Idempotency: this action was already applied — replay the original result.
    const previous = this.processedActions.get(clientActionId);
    if (previous) {
      return { delivery: clone(previous), duplicate: true };
    }

    // Armed demo scenario: mutate the server right before this submit lands.
    if (this.armedConflictDeliveryId === deliveryId) {
      this.armedConflictDeliveryId = null;
      this.simulateServerChange(deliveryId);
      throw new ConflictError(clone(this.require(deliveryId)));
    }

    // Status-based conflict: someone else already resolved or cancelled it.
    if (delivery.status !== 'pending') {
      throw new ConflictError(clone(delivery));
    }

    mutate(delivery);
    delivery.version += 1;
    delivery.updated_at = new Date().toISOString();
    this.processedActions.set(clientActionId, clone(delivery));
    return { delivery: clone(delivery), duplicate: false };
  }

  private require(deliveryId: number): Delivery {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) {
      throw new ApiError(404, 'NOT_FOUND', `Delivery ${deliveryId} not found`);
    }
    return delivery;
  }

  private async network<T>(handler: () => T): Promise<T> {
    const settings = PROFILE_SETTINGS[this.profile];

    if (this.profile === 'offline') {
      await delay(settings.latencyMs * this.latencyScale);
      throw new NetworkError();
    }

    if (Math.random() < settings.stallChance) {
      // Dead air: the client-side timeout is the only way out.
      await delay(60_000);
      throw new TimeoutError('Server did not respond');
    }

    await delay(
      (settings.latencyMs + Math.random() * settings.jitterMs) * this.latencyScale,
    );

    if (Math.random() < settings.failureRate) {
      throw new ApiError(500, 'INTERNAL', 'Simulated server error (injected failure)');
    }

    return handler();
  }
}

/** App-wide mock server instance. */
export const mockServer = new MockServer();
