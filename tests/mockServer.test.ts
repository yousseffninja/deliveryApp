import { ConflictError, NetworkError } from '../src/api/errors';
import { MockServer } from '../src/api/mockServer';
import { CompletePayload, FailPayload } from '../src/types';

function freshServer(): MockServer {
  const server = new MockServer();
  server.latencyScale = 0; // no simulated delays in tests
  return server;
}

describe('MockServer — duplicate submission protection', () => {
  it('applies a complete action once and replays the original result for the same client_action_id', async () => {
    const server = freshServer();
    const payload: CompletePayload = {
      recipient_name: 'Ahmed Ali',
      note: 'Delivered to customer',
      client_action_id: 'client-action-1',
    };

    const first = await server.completeDelivery(1001, payload);
    expect(first.duplicate).toBe(false);
    expect(first.delivery.status).toBe('delivered');
    expect(first.delivery.recipient_name).toBe('Ahmed Ali');
    const versionAfterFirst = first.delivery.version;

    // the same confirmation arriving twice (network retry, race, etc.)
    const second = await server.completeDelivery(1001, payload);
    expect(second.duplicate).toBe(true);
    expect(second.delivery).toEqual(first.delivery);
    expect(second.delivery.version).toBe(versionAfterFirst); // not mutated again
  });

  it('keeps the idempotency guarantee independently per action id', async () => {
    const server = freshServer();
    await server.completeDelivery(1001, {
      recipient_name: 'Ahmed Ali',
      note: null,
      client_action_id: 'a-1',
    });

    await expect(
      server.completeDelivery(1001, {
        recipient_name: 'Someone Else',
        note: null,
        client_action_id: 'a-2',
      }),
    ).rejects.toBeInstanceOf(ConflictError); // delivery is no longer pending
  });
});

describe('MockServer — delivery changed on server', () => {
  it('rejects a late submit with 409 and the authoritative server state', async () => {
    const server = freshServer();
    server.simulateServerChange(1002); // dispatch cancels the order

    await expect(
      server.completeDelivery(1002, {
        recipient_name: 'Fatma Hassan',
        note: null,
        client_action_id: 'c-1',
      }),
    ).rejects.toBeInstanceOf(ConflictError);

    // conflict must NOT be recorded as a processed action
    await expect(
      server.completeDelivery(1002, {
        recipient_name: 'Fatma Hassan',
        note: null,
        client_action_id: 'c-1',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('rejects a fail report for an already-resolved delivery', async () => {
    const server = freshServer();
    await server.failDelivery(1003, {
      reason: 'customer_unavailable',
      note: null,
      client_action_id: 'f-1',
    });

    await expect(
      server.completeDelivery(1003, {
        recipient_name: 'Yousef Al-Rashid',
        note: null,
        client_action_id: 'c-9',
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe('MockServer — connectivity and proof upload', () => {
  it('throws NetworkError while offline and recovers afterwards', async () => {
    const server = freshServer();
    server.configure('offline', null);

    await expect(server.getDeliveries()).rejects.toBeInstanceOf(NetworkError);
    await expect(
      server.completeDelivery(1001, {
        recipient_name: 'Ahmed Ali',
        note: null,
        client_action_id: 'off-1',
      }),
    ).rejects.toBeInstanceOf(NetworkError);

    // connectivity returns -> the very same action now succeeds
    server.configure('online', null);
    const result = await server.completeDelivery(1001, {
      recipient_name: 'Ahmed Ali',
      note: null,
      client_action_id: 'off-1',
    });
    expect(result.delivery.status).toBe('delivered');
  });

  it('attaches uploaded proof to the completed delivery', async () => {
    const server = freshServer();
    const proof = await server.uploadProof(1001, 'photo-xyz.jpg', 'p-1');
    expect(proof.proof_id).toContain('p-1');

    const result = await server.completeDelivery(1001, {
      recipient_name: 'Ahmed Ali',
      note: null,
      client_action_id: 'p-1',
    });
    expect(result.delivery.proof_attached).toBe(true);
  });

  it('records failed reports with their reason', async () => {
    const server = freshServer();
    const payload: FailPayload = {
      reason: 'customer_unavailable',
      note: 'Called twice, no answer',
      client_action_id: 'fail-1',
    };
    const result = await server.failDelivery(1005, payload);
    expect(result.delivery.status).toBe('failed');
    expect(result.delivery.failure_reason).toBe('customer_unavailable');
  });
});
