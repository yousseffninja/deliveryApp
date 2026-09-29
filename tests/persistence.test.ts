import { DeliveriesRepo } from '../src/storage/deliveriesRepo';
import { MemoryKv } from '../src/storage/keyValue';
import { OutboxRepo } from '../src/storage/outboxRepo';
import { SimulatorRepo } from '../src/storage/simulatorRepo';
import { Delivery, PendingAction } from '../src/types';

function sampleDelivery(id: number, status: Delivery['status'] = 'pending'): Delivery {
  return {
    id,
    order_number: `ORD-${id}`,
    customer_name: 'Ahmed Ali',
    phone: '01012345667',
    address: 'Nasr City, Abbas El Akkad St., Cairo',
    amount_due: 350.0,
    payment_method: 'cash',
    status,
    note: null,
    recipient_name: null,
    failure_reason: null,
    proof_attached: false,
    version: 1,
    updated_at: new Date().toISOString(),
  };
}

function sampleAction(deliveryId: number): PendingAction {
  const id = `action-${deliveryId}`;
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
  };
}

describe('OutboxRepo — durable pending actions', () => {
  it('persists actions across "app restarts" (new repo instance, same storage)', async () => {
    const kv = new MemoryKv();
    const firstSession = new OutboxRepo(kv);
    await firstSession.put(sampleAction(1001));

    // simulate the app being killed and reopened
    const secondSession = new OutboxRepo(kv);
    const queued = await secondSession.list();
    expect(queued).toHaveLength(1);
    expect(queued[0]?.delivery_id).toBe(1001);
    expect(queued[0]?.payload).toEqual({
      recipient_name: 'Ahmed Ali',
      note: null,
      client_action_id: 'action-1001',
    });
  });

  it('updates in place and removes cleanly', async () => {
    const repo = new OutboxRepo(new MemoryKv());
    const action = sampleAction(1002);
    await repo.put(action);

    await repo.put({ ...action, attempts: 2, status: 'failed', last_error: 'boom' });
    let stored = await repo.get(action.id);
    expect(stored?.attempts).toBe(2);
    expect(stored?.status).toBe('failed');

    await repo.remove(action.id);
    stored = await repo.get(action.id);
    expect(stored).toBeNull();
    expect(await repo.list()).toHaveLength(0);
  });

  it('finds actions by delivery and reports duplicates', async () => {
    const repo = new OutboxRepo(new MemoryKv());
    await repo.put(sampleAction(1003));

    expect(await repo.hasActionFor(1003)).toBe(true);
    expect(await repo.hasActionFor(1003, 'complete')).toBe(true);
    expect(await repo.hasActionFor(1003, 'fail')).toBe(false);
    expect(await repo.hasActionFor(9999)).toBe(false);
  });
});

describe('DeliveriesRepo — cached server state', () => {
  it('round-trips the delivery cache and upserts by id', async () => {
    const kv = new MemoryKv();
    const repo = new DeliveriesRepo(kv);
    await repo.saveAll([sampleDelivery(1001), sampleDelivery(1002)]);

    await repo.upsert({ ...sampleDelivery(1002, 'delivered'), version: 2 });
    await repo.upsert(sampleDelivery(1003));

    const all = await new DeliveriesRepo(kv).loadAll(); // fresh instance = restart
    expect(all).toHaveLength(3);
    const d1002 = all.find(d => d.id === 1002);
    expect(d1002?.status).toBe('delivered');
    expect(d1002?.version).toBe(2);
  });
});

describe('SimulatorRepo — persisted simulator settings', () => {
  it('keeps the chosen profile across restarts', async () => {
    const kv = new MemoryKv();
    const repo = new SimulatorRepo(kv);
    await repo.save({ profile: 'offline', armedConflictDeliveryId: 1004 });

    const reloaded = await new SimulatorRepo(kv).load();
    expect(reloaded.profile).toBe('offline');
    expect(reloaded.armedConflictDeliveryId).toBe(1004);
  });

  it('falls back to defaults for empty or corrupt storage', async () => {
    const repo = new SimulatorRepo(new MemoryKv());
    expect(await repo.load()).toEqual({ profile: 'online', armedConflictDeliveryId: null });

    const corrupt = new MemoryKv();
    const repo2 = new SimulatorRepo(corrupt);
    await corrupt.set('drivertrack.simulator.v1', '{not json');
    expect(await repo2.load()).toEqual({ profile: 'online', armedConflictDeliveryId: null });
  });
});
