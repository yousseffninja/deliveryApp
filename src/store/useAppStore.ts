import { create } from 'zustand';
import { describeError } from '../api/errors';
import { mockServer } from '../api/mockServer';
import { api } from '../api/client';
import { DeliveriesRepo } from '../storage/deliveriesRepo';
import { OutboxRepo } from '../storage/outboxRepo';
import { SimulatorRepo } from '../storage/simulatorRepo';
import { SyncedLogRepo } from '../storage/syncedLogRepo';
import { connectivity } from '../sync/connectivity';
import { SyncEngine, SyncEvent } from '../sync/syncEngine';
import {
  ActionSyncStatus,
  Delivery,
  DeliveryStatus,
  FailureReason,
  NetworkProfile,
  PendingAction,
  SyncedRecord,
} from '../types';
import { makeUuid } from '../utils/uuid';

/** Module-level repos (AsyncStorage-backed). Tests can construct their own. */
export const deliveriesRepo = new DeliveriesRepo();
export const outboxRepo = new OutboxRepo();
export const syncedLogRepo = new SyncedLogRepo();
export const simulatorRepo = new SimulatorRepo();

export interface CompleteDeliveryInput {
  deliveryId: number;
  recipientName: string;
  note: string | null;
  photoUri: string | null;
}

export interface FailDeliveryInput {
  deliveryId: number;
  reason: FailureReason;
  note: string | null;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

interface AppState {
  hydrated: boolean;
  deliveries: Record<number, Delivery>;
  /** at most one action per delivery, keyed by delivery id */
  outbox: Record<number, PendingAction>;
  syncedLog: Record<number, SyncedRecord>;
  simulator: { profile: NetworkProfile; armedConflictDeliveryId: number | null };
  deviceConnected: boolean | null;
  /** effective connectivity: device reachability AND simulator not forcing offline */
  online: boolean;
  loading: boolean;
  loadError: string | null;
  showingCached: boolean;
  lastRefreshedAt: string | null;
  syncingNow: boolean;

  bootstrap: () => Promise<void>;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
  completeDelivery: (input: CompleteDeliveryInput) => Promise<ActionResult>;
  failDelivery: (input: FailDeliveryInput) => Promise<ActionResult>;
  retryAction: (deliveryId: number) => Promise<void>;
  retryAllFailed: () => Promise<void>;
  discardAction: (deliveryId: number) => Promise<void>;
  syncNow: () => Promise<void>;
  setNetworkProfile: (profile: NetworkProfile) => Promise<void>;
  armConflict: (deliveryId: number | null) => Promise<void>;
  simulateServerChange: (deliveryId: number) => Promise<void>;
  resetMockServer: () => Promise<void>;
}

function indexById(deliveries: Delivery[]): Record<number, Delivery> {
  const map: Record<number, Delivery> = {};
  for (const delivery of deliveries) {
    map[delivery.id] = delivery;
  }
  return map;
}

function indexByDeliveryId(actions: PendingAction[]): Record<number, PendingAction> {
  const map: Record<number, PendingAction> = {};
  for (const action of actions) {
    map[action.delivery_id] = action;
  }
  return map;
}

export const useAppStore = create<AppState>()((set, get) => ({
  hydrated: false,
  deliveries: {},
  outbox: {},
  syncedLog: {},
  simulator: { profile: 'online', armedConflictDeliveryId: null },
  deviceConnected: null,
  online: false,
  loading: false,
  loadError: null,
  showingCached: false,
  lastRefreshedAt: null,
  syncingNow: false,

  bootstrap: async () => {
    if (get().hydrated) {
      return;
    }
    const [cachedDeliveries, queuedActions, syncedLog, simulatorConfig] =
      await Promise.all([
        deliveriesRepo.loadAll(),
        outboxRepo.list(),
        syncedLogRepo.load(),
        simulatorRepo.load(),
      ]);

    mockServer.configure(
      simulatorConfig.profile,
      simulatorConfig.armedConflictDeliveryId,
    );

    const deviceConnected = connectivity.current;
    const online = (deviceConnected ?? false) && simulatorConfig.profile !== 'offline';

    set({
      hydrated: true,
      deliveries: indexById(cachedDeliveries),
      outbox: indexByDeliveryId(queuedActions),
      syncedLog,
      simulator: {
        profile: simulatorConfig.profile,
        armedConflictDeliveryId: simulatorConfig.armedConflictDeliveryId,
      },
      deviceConnected,
      online,
    });

    // On every connectivity flip, re-evaluate effective online state and flush
    // the outbox as soon as the device comes back online.
    connectivity.subscribe(connected => {
      const state = get();
      const nowOnline = connected && state.simulator.profile !== 'offline';
      const wasOnline = state.online;
      set({ deviceConnected: connected, online: nowOnline });
      if (!wasOnline && nowOnline) {
        void syncEngine.syncAll('connectivity');
        void get().refresh({ silent: true });
      }
    });

    syncEngine.startAutoRetry();

    if (online) {
      // Cold start with connectivity: refresh cache AND flush whatever the
      // driver queued while offline (survives app restarts by design).
      void Promise.all([
        get().refresh({ silent: true }),
        syncEngine.syncAll('connectivity'),
      ]);
    }
  },

  refresh: async options => {
    const silent = options?.silent ?? false;
    if (!get().online) {
      const hasCache = Object.keys(get().deliveries).length > 0;
      set({
        loading: false,
        showingCached: hasCache,
        loadError: hasCache
          ? null
          : 'No internet connection. Reconnect to load your assigned deliveries.',
      });
      return;
    }
    if (!silent) {
      set({ loading: true, loadError: null });
    }
    try {
      const list = await api.getDeliveries();
      const state = get();
      // Offline-first merge: a delivery with a queued action keeps its local
      // optimistic state until the server confirms or the driver discards it.
      const merged: Record<number, Delivery> = {};
      for (const server of list) {
        merged[server.id] =
          state.outbox[server.id] !== undefined && state.deliveries[server.id] !== undefined
            ? state.deliveries[server.id]
            : server;
      }
      for (const id of Object.keys(state.deliveries)) {
        const numericId = Number(id);
        if (merged[numericId] === undefined) {
          merged[numericId] = state.deliveries[numericId];
        }
      }
      await deliveriesRepo.saveAll(Object.values(merged));
      set({
        deliveries: merged,
        loading: false,
        loadError: null,
        showingCached: false,
        lastRefreshedAt: new Date().toISOString(),
      });
    } catch (err) {
      const hasCache = Object.keys(get().deliveries).length > 0;
      set({
        loading: false,
        loadError: describeError(err),
        showingCached: hasCache,
      });
    }
  },

  completeDelivery: async input => {
    const state = get();
    const delivery = state.deliveries[input.deliveryId];
    if (!delivery) {
      return { ok: false, error: 'Delivery not found.' };
    }
    if (state.outbox[input.deliveryId] !== undefined) {
      return {
        ok: false,
        error: 'This delivery already has an update waiting to sync.',
      };
    }
    if (delivery.status !== 'pending') {
      return { ok: false, error: 'This delivery has already been resolved.' };
    }

    const actionId = makeUuid();
    const now = new Date().toISOString();
    const action: PendingAction = {
      id: actionId,
      delivery_id: input.deliveryId,
      type: 'complete',
      status: 'waiting',
      payload: {
        recipient_name: input.recipientName.trim(),
        note: input.note,
        client_action_id: actionId,
      },
      attempts: 0,
      created_at: now,
      last_attempt_at: null,
      last_error: null,
      photo_uri: input.photoUri,
      proof_uploaded: false,
      server_delivery: null,
    };

    // 1) persist the action (survives app restarts), 2) optimistic local
    // update, 3) hand off to the engine.
    await outboxRepo.put(action);
    const optimistic: Delivery = {
      ...delivery,
      status: 'delivered',
      recipient_name: input.recipientName.trim(),
      note: input.note ?? delivery.note,
      proof_attached: Boolean(input.photoUri),
      updated_at: now,
    };
    set({
      outbox: { ...state.outbox, [input.deliveryId]: action },
      deliveries: { ...state.deliveries, [input.deliveryId]: optimistic },
    });
    void syncEngine.syncAll('submit');
    return { ok: true };
  },

  failDelivery: async input => {
    const state = get();
    const delivery = state.deliveries[input.deliveryId];
    if (!delivery) {
      return { ok: false, error: 'Delivery not found.' };
    }
    if (state.outbox[input.deliveryId] !== undefined) {
      return {
        ok: false,
        error: 'This delivery already has an update waiting to sync.',
      };
    }
    if (delivery.status !== 'pending') {
      return { ok: false, error: 'This delivery has already been resolved.' };
    }

    const actionId = makeUuid();
    const now = new Date().toISOString();
    const action: PendingAction = {
      id: actionId,
      delivery_id: input.deliveryId,
      type: 'fail',
      status: 'waiting',
      payload: {
        reason: input.reason,
        note: input.note,
        client_action_id: actionId,
      },
      attempts: 0,
      created_at: now,
      last_attempt_at: null,
      last_error: null,
      photo_uri: null,
      proof_uploaded: false,
      server_delivery: null,
    };

    await outboxRepo.put(action);
    const optimistic: Delivery = {
      ...delivery,
      status: 'failed',
      failure_reason: input.reason,
      note: input.note ?? delivery.note,
      updated_at: now,
    };
    set({
      outbox: { ...state.outbox, [input.deliveryId]: action },
      deliveries: { ...state.deliveries, [input.deliveryId]: optimistic },
    });
    void syncEngine.syncAll('submit');
    return { ok: true };
  },

  retryAction: async deliveryId => {
    const action = get().outbox[deliveryId];
    if (!action) {
      return;
    }
    const reset: PendingAction = {
      ...action,
      status: 'waiting',
      attempts: 0,
      last_error: null,
    };
    await outboxRepo.put(reset);
    set({ outbox: { ...get().outbox, [deliveryId]: reset } });
    await syncEngine.syncAll('manual');
  },

  retryAllFailed: async () => {
    const state = get();
    const failed = Object.values(state.outbox).filter(a => a.status === 'failed');
    if (failed.length === 0) {
      return;
    }
    const outbox = { ...state.outbox };
    for (const action of failed) {
      const reset: PendingAction = {
        ...action,
        status: 'waiting',
        attempts: 0,
        last_error: null,
      };
      outbox[action.delivery_id] = reset;
      await outboxRepo.put(reset);
    }
    set({ outbox });
    await syncEngine.syncAll('manual');
  },

  discardAction: async deliveryId => {
    const state = get();
    const action = state.outbox[deliveryId];
    if (!action) {
      return;
    }
    await outboxRepo.remove(action.id);
    const outbox = { ...state.outbox };
    delete outbox[deliveryId];

    let deliveries = state.deliveries;
    const delivery = state.deliveries[deliveryId];
    if (delivery) {
      // The action never reached the server — restore the local pending view.
      // A later refresh reconciles with the authoritative server state.
      const reverted: Delivery = {
        ...delivery,
        status: 'pending',
        recipient_name: null,
        failure_reason: null,
        proof_attached: false,
        updated_at: new Date().toISOString(),
      };
      deliveries = { ...state.deliveries, [deliveryId]: reverted };
      void deliveriesRepo.upsert(reverted);
    }
    set({ outbox, deliveries });
  },

  syncNow: async () => {
    if (get().syncingNow) {
      return;
    }
    set({ syncingNow: true });
    try {
      await syncEngine.syncAll('manual');
    } finally {
      set({ syncingNow: false });
    }
  },

  setNetworkProfile: async profile => {
    const armedConflictDeliveryId = get().simulator.armedConflictDeliveryId;
    mockServer.configure(profile, armedConflictDeliveryId);
    await simulatorRepo.save({ profile, armedConflictDeliveryId });
    const wasOnline = get().online;
    const online = profile !== 'offline' && (get().deviceConnected ?? true);
    set({ simulator: { profile, armedConflictDeliveryId }, online });
    if (!wasOnline && online) {
      void syncEngine.syncAll('connectivity');
      void get().refresh({ silent: true });
    }
    if (wasOnline && !online) {
      // nothing in flight: the engine simply refuses to run while offline
    }
  },

  armConflict: async deliveryId => {
    mockServer.armConflict(deliveryId);
    const profile = get().simulator.profile;
    await simulatorRepo.save({ profile, armedConflictDeliveryId: deliveryId });
    set({ simulator: { profile, armedConflictDeliveryId: deliveryId } });
  },

  simulateServerChange: async deliveryId => {
    const serverDelivery = mockServer.simulateServerChange(deliveryId);
    const state = get();
    if (state.outbox[deliveryId] === undefined) {
      // No queued action to conflict with — show the change immediately.
      set({ deliveries: { ...state.deliveries, [deliveryId]: serverDelivery } });
      void deliveriesRepo.upsert(serverDelivery);
    }
  },

  resetMockServer: async () => {
    mockServer.reset();
    const profile = get().simulator.profile;
    mockServer.configure(profile, null);
    await simulatorRepo.save({ profile, armedConflictDeliveryId: null });
    set({ simulator: { profile, armedConflictDeliveryId: null } });
    await get().refresh({ silent: true });
  },
}));

function applyEngineEvent(event: SyncEvent): void {
  const state = useAppStore.getState();
  if (
    event.type === 'action_updated' ||
    event.type === 'action_failed' ||
    event.type === 'action_conflict'
  ) {
    const action = event.action;
    useAppStore.setState({
      outbox: { ...state.outbox, [action.delivery_id]: action },
    });
    return;
  }
  if (event.type === 'action_synced') {
    const outbox = { ...state.outbox };
    delete outbox[event.action.delivery_id];
    const syncedLog = {
      ...state.syncedLog,
      [event.delivery.id]: {
        action_id: event.action.id,
        type: event.action.type,
        synced_at: new Date().toISOString(),
      },
    };
    useAppStore.setState({
      outbox,
      syncedLog,
      deliveries: { ...state.deliveries, [event.delivery.id]: event.delivery },
    });
    void deliveriesRepo.upsert(event.delivery);
    void syncedLogRepo.save(syncedLog);
  }
}

export const syncEngine = new SyncEngine({
  api,
  outbox: outboxRepo,
  deliveries: deliveriesRepo,
  isOnline: () => useAppStore.getState().online,
  onEvent: applyEngineEvent,
});

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export type EffectiveSyncStatus = ActionSyncStatus | 'synced' | null;

export interface DeliverySyncInfo {
  deliveryStatus: DeliveryStatus;
  syncStatus: EffectiveSyncStatus;
  action: PendingAction | null;
}

/** Pure helper so screens can compute sync chips from narrow slices. */
export function computeSyncInfo(
  outbox: Record<number, PendingAction>,
  syncedLog: Record<number, SyncedRecord>,
  delivery: Delivery,
): DeliverySyncInfo {
  void syncedLog;
  const action = outbox[delivery.id] ?? null;
  if (action) {
    return { deliveryStatus: delivery.status, syncStatus: action.status, action };
  }
  if (delivery.status === 'pending') {
    return { deliveryStatus: delivery.status, syncStatus: null, action: null };
  }
  return { deliveryStatus: delivery.status, syncStatus: 'synced', action: null };
}

/** Per-delivery sync chip: queued action state wins, then synced bookkeeping. */
export function selectSyncInfo(state: AppState, delivery: Delivery): DeliverySyncInfo {
  return computeSyncInfo(state.outbox, state.syncedLog, delivery);
}

export function computeQueueCounts(
  outbox: Record<number, PendingAction>,
  syncedLog: Record<number, SyncedRecord>,
): { waiting: number; failed: number; conflict: number; syncedToday: number; total: number } {
  const actions = Object.values(outbox);
  const dayMs = 24 * 60 * 60 * 1000;
  return {
    waiting: actions.filter(a => a.status === 'waiting' || a.status === 'syncing').length,
    failed: actions.filter(a => a.status === 'failed').length,
    conflict: actions.filter(a => a.status === 'conflict').length,
    syncedToday: Object.values(syncedLog).filter(
      r => Date.now() - new Date(r.synced_at).getTime() < dayMs,
    ).length,
    total: actions.length,
  };
}

export function selectQueueCounts(state: AppState) {
  return computeQueueCounts(state.outbox, state.syncedLog);
}
