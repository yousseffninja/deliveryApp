import { ApiError, ConflictError } from '../src/api/errors';
import { Api, CompleteDeliveryResponse, FailDeliveryResponse } from '../src/api/types';
import { DeliveriesRepo } from '../src/storage/deliveriesRepo';
import { MemoryKv } from '../src/storage/keyValue';
import { OutboxRepo } from '../src/storage/outboxRepo';
import {
  backoffDelayMs,
  dueForRetry,
  SyncEngine,
  SyncEvent,
} from '../src/sync/syncEngine';
import {
  CompletePayload,
  Delivery,
  FailPayload,
  PendingAction,
} from '../src/types';

/** Scriptable Api double: every endpoint can be made to fail N times first. */
class ScriptedApi implements Api {
  completeCalls = 0;
  failCalls = 0;
  proofCalls = 0;

  constructor(
    private readonly server: Pick<MockServerLike, 'completeDelivery' | 'failDelivery'>,
    private failuresFirst = 0,
  ) {}

  async getDeliveries(): Promise<Delivery[]> {
    return [];
  }

  async getDelivery(): Promise<Delivery> {
    throw new Error('not used in these tests');
  }

  async completeDelivery(
    deliveryId: number,
    payload: CompletePayload,
  ): Promise<CompleteDeliveryResponse> {
    this.completeCalls += 1;
    if (this.failuresFirst > 0) {
      this.failuresFirst -= 1;
      throw new ApiError(500, 'INTERNAL', 'Simulated server error (injected failure)');
    }
    return this.server.completeDelivery(deliveryId, payload);
  }

  async failDelivery(
    deliveryId: number,
    payload: FailPayload,
  ): Promise<FailDeliveryResponse> {
    this.failCalls += 1;
    if (this.failuresFirst > 0) {
      this.failuresFirst -= 1;
      throw new ApiError(500, 'INTERNAL', 'Simulated server error (injected failure)');
    }
    return this.server.failDelivery(deliveryId, payload);
  }

  async uploadProof(
    deliveryId: number,
    fileName: string,
    clientActionId: string,
  ) {
    this.proofCalls += 1;
    return {
      delivery_id: deliveryId,
      proof_id: `proof-${clientActionId.slice(0, 8)}`,
      received_at: new Date().toISOString(),
      file_name: fileName,
    };
  }
}

interface MockServerLike {
  completeDelivery(
    deliveryId: number,
    payload: CompletePayload,
  ): Promise<CompleteDeliveryResponse>;
  failDelivery(
    deliveryId: number,
    payload: FailPayload,
  ): Promise<FailDeliveryResponse>;
}

function sampleServerState(): MockServerLike & { state: Map<number, Delivery> } {
  const state = new Map<number, Delivery>();
  const make = (id: number): Delivery => ({
    id,
    order_number: `ORD-${id}`,
    customer_name: 'Ahmed Ali',
    phone: '55512345',
    address: 'Salmiya, Block 4, Street 12',
    amount_due: 18.75,
    payment_method: 'cash',
    status: 'pending',
    note: null,
    recipient_name: null,
    failure_reason: null,
    proof_attached: false,
    version: 1,
    updated_at: new Date().toISOString(),
  });
  [1001, 1002, 1003, 1004].forEach(id => state.set(id, make(id)));

  const resolve = (deliveryId: number, mode: 'complete' | 'fail') => {
    const delivery = state.get(deliveryId);
    if (!delivery || delivery.status !== 'pending') {
      throw new ConflictError(delivery ?? make(deliveryId));
    }
    if (mode === 'complete') {
      delivery.status = 'delivered';
      delivery.version += 1;
    } else {
      delivery.status = 'failed';
      delivery.version += 1;
    }
    return { delivery: { ...delivery }, duplicate: false };
  };

  return {
    state,
    completeDelivery: (deliveryId: number) => Promise.resolve(resolve(deliveryId, 'complete')),
    failDelivery: (deliveryId: number) => Promise.resolve(resolve(deliveryId, 'fail')),
  };
}

function completeAction(deliveryId: number, overrides?: Partial<PendingAction>): PendingAction {
  const id = `action-${deliveryId}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    delivery_id: deliveryId,
    type: 'complete',
    status: 'waiting',
    payload: { recipient_name: 'Ahmed Ali', note: null, client_action_id: id },
    attempts: 0,
    created_at: new Date().toISOString(),
    last_attempt_at: null,
    last_error: null,
    photo_uri: null,
    proof_uploaded: false,
    server_delivery: null,
    ...overrides,
  };
}

function createEngineEnv(options?: { online?: boolean; maxAttempts?: number }) {
  const connectivityRef = { online: options?.online ?? true };
  const outbox = new OutboxRepo(new MemoryKv());
  const deliveries = new DeliveriesRepo(new MemoryKv());
  const events: SyncEvent[] = [];
  const engine = new SyncEngine({
    api: undefined as unknown as Api, // replaced by caller right after
    outbox,
    deliveries,
    isOnline: () => connectivityRef.online,
    onEvent: event => events.push(event),
    maxAttempts: options?.maxAttempts ?? 3,
  });
  return {
    outbox,
    deliveries,
    events,
    engine,
    setOnline: (value: boolean) => {
      connectivityRef.online = value;
    },
    attachApi: (api: Api) => {
      (engine as unknown as { deps: { api: Api } }).deps.api = api;
    },
  };
}

describe('SyncEngine — happy path', () => {
  it('syncs a queued confirmation, clears the outbox and stores server state', async () => {
    const server = sampleServerState();
    const env = createEngineEnv();
    env.attachApi(new ScriptedApi(server));
    await env.outbox.put(completeAction(1001));

    await env.engine.syncAll('submit');

    expect(await env.outbox.list()).toHaveLength(0);
    const stored = await env.deliveries.loadAll();
    expect(stored[0]?.status).toBe('delivered');
    expect(env.events.at(-1)?.type).toBe('action_synced');
  });

  it('uploads photo proof once, before the complete action', async () => {
    const server = sampleServerState();
    const api = new ScriptedApi(server);
    const env = createEngineEnv();
    env.attachApi(api);
    await env.outbox.put(
      completeAction(1001, {
        photo_uri: 'file:///tmp/proof.jpg',
        payload: {
          recipient_name: 'Ahmed Ali',
          note: null,
          client_action_id: 'action-with-photo',
        },
      }),
    );

    await env.engine.syncAll('submit');

    expect(api.proofCalls).toBe(1);
    expect(api.completeCalls).toBe(1);
    expect(await env.outbox.list()).toHaveLength(0);
  });
});

describe('SyncEngine — offline behavior', () => {
  it('does nothing while offline and keeps the action waiting', async () => {
    const server = sampleServerState();
    const api = new ScriptedApi(server);
    const env = createEngineEnv({ online: false });
    env.attachApi(api);
    const action = completeAction(1001);
    await env.outbox.put(action);

    await env.engine.syncAll('submit');

    expect(api.completeCalls).toBe(0);
    const stored = await env.outbox.get(action.id);
    expect(stored?.status).toBe('waiting');
    expect(stored?.attempts).toBe(0);
  });

  it('flushes the queue once connectivity returns', async () => {
    const server = sampleServerState();
    const api = new ScriptedApi(server);
    const env = createEngineEnv({ online: false });
    env.attachApi(api);
    const action = completeAction(1002);
    await env.outbox.put(action);

    await env.engine.syncAll('connectivity'); // still offline
    expect(api.completeCalls).toBe(0);

    env.setOnline(true);
    await env.engine.syncAll('connectivity'); // back online
    expect(api.completeCalls).toBe(1);
    expect(await env.outbox.list()).toHaveLength(0);
  });
});

describe('SyncEngine — retry after failure', () => {
  it('keeps retrying with backoff until the server accepts, then marks synced', async () => {
    const server = sampleServerState();
    const api = new ScriptedApi(server, 2); // next 2 requests fail (500-style)
    const env = createEngineEnv();
    env.attachApi(api);
    const action = completeAction(1003);
    await env.outbox.put(action);

    await env.engine.syncAll('manual');
    let stored = await env.outbox.get(action.id);
    expect(stored?.status).toBe('waiting'); // attempt 1 -> still auto-retryable
    expect(stored?.attempts).toBe(1);

    await env.engine.syncAll('manual');
    stored = await env.outbox.get(action.id);
    expect(stored?.status).toBe('waiting');
    expect(stored?.attempts).toBe(2);

    await env.engine.syncAll('manual'); // server accepts now
    stored = await env.outbox.get(action.id);
    expect(stored).toBeNull();
    expect(env.events.at(-1)?.type).toBe('action_synced');
  });

  it('parks an action as failed after maxAttempts and requires manual retry', async () => {
    const server = sampleServerState();
    const api = new ScriptedApi(server, Number.MAX_SAFE_INTEGER); // always fails
    const env = createEngineEnv({ maxAttempts: 3 });
    env.attachApi(api);
    const action = completeAction(1004);
    await env.outbox.put(action);

    await env.engine.syncAll('manual');
    await env.engine.syncAll('manual');
    await env.engine.syncAll('manual');

    const stored = await env.outbox.get(action.id);
    expect(stored?.status).toBe('failed');
    expect(stored?.attempts).toBe(3);
    expect(stored?.last_error).toContain('Simulated server error');
  });
});

describe('SyncEngine — conflicts', () => {
  it('parks the action with server state and never auto-retries it', async () => {
    const server = sampleServerState();
    server.state.get(1001)!.status = 'cancelled'; // server changed before submit

    const api = new ScriptedApi(server);
    const env = createEngineEnv();
    env.attachApi(api);
    const action = completeAction(1001);
    await env.outbox.put(action);

    await env.engine.syncAll('submit');

    const stored = await env.outbox.get(action.id);
    expect(stored?.status).toBe('conflict');
    expect(stored?.server_delivery?.status).toBe('cancelled');
    expect(env.events.at(-1)?.type).toBe('action_conflict');

    const callsAfterConflict = api.completeCalls;
    await env.engine.syncAll('auto');
    await env.engine.syncAll('connectivity');
    expect(api.completeCalls).toBe(callsAfterConflict); // untouched
  });
});

describe('backoff schedule', () => {
  it('grows exponentially and respects the last attempt time', () => {
    expect(backoffDelayMs(1)).toBe(5_000);
    expect(backoffDelayMs(2)).toBe(10_000);
    expect(backoffDelayMs(3)).toBe(20_000);
    expect(backoffDelayMs(10)).toBe(60_000); // capped

    const action = completeAction(1001, { attempts: 1 });
    const now = Date.now();
    expect(
      dueForRetry({ ...action, last_attempt_at: new Date(now - 4_000).toISOString() }, now),
    ).toBe(false);
    expect(
      dueForRetry({ ...action, last_attempt_at: new Date(now - 6_000).toISOString() }, now),
    ).toBe(true);
  });
});
