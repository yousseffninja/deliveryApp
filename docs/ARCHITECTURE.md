# Architecture

## Layers

```
┌──────────────────────────────────────────────────────────────┐
│ Screens (list, details, forms, queue, simulator)             │
│   read narrow slices via selectors, call store actions       │
└──────────────┬───────────────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────────────┐
│ Zustand store (src/store/useAppStore)                        │
│   in-memory state: deliveries, outbox, syncedLog, simulator  │
│   actions: bootstrap, refresh, completeDelivery, failDelivery│
│            retryAction, discardAction, syncNow, simulator... │
└───┬──────────────────────┬───────────────────────────────────┘
    │ persists             │ delegates network work
┌───▼──────────────┐   ┌───▼─────────────────────────────────────┐
│ Repositories     │   │ SyncEngine (src/sync/syncEngine)        │
│ (src/storage)    │   │   drains outbox FIFO, one drain at a    │
│ KeyValue port →  │   │   time; backoff; conflict parking;      │
│ AsyncStorage     │   │   emits SyncEvents back to the store    │
└──────────────────┘   └───┬─────────────────────────────────────┘
                           │ Api interface (src/api/types)
                   ┌───────▼──────────────────────────┐
                   │ MockServer (src/api/mockServer)  │
                   │  profiles: online/slow/flaky/    │
                   │  offline; idempotency registry;  │
                   │  409 conflict detection          │
                   └──────────────────────────────────┘
```

Key decisions:

- **Unidirectional flow.** Screens never touch the API, repos, or engine directly.
  Everything goes through the store; the engine reports outcomes as events the
  store applies (and persists).
- **Testable core.** The engine depends on interfaces/ports (`Api`, `KeyValueStore`,
  `isOnline()`), so the whole sync lifecycle is unit-tested in plain Jest with
  in-memory fakes — no emulator, no mocks of React Native internals.

## The outbox pattern (offline queue)

A driver action (complete/fail) never blocks on the network:

1. **Record.** A `PendingAction` is created with a fresh `client_action_id`
   (UUID) and written to the outbox (AsyncStorage). This is the durability
   boundary — crash-safe and restart-safe.
2. **Apply optimistically.** The local delivery cache is updated immediately
   (`status → delivered/failed`), which is what the UI shows.
3. **Hand off.** The engine is poked (`syncAll('submit')`). If offline, nothing
   more happens — the action simply waits.

One action per delivery is enforced by the store (a second submit is rejected),
so the outbox is keyed by `delivery_id`. That is the first layer of duplicate
protection; idempotency on the server is the second.

## Sync lifecycle

```
          ┌─────────┐   submit/connectivity/manual/auto
          │ waiting │◄──────────────┐
          └────┬────┘               │ retryable failure
               │ engine picks it    │ (network/timeout/5xx) & attempts < 3
               ▼                    │ (backoff 5s→10s→20s… capped 60s)
          ┌─────────┐  failure      ─┘
          │ syncing │──────────────► failed  (attempts ≥ 3 or non-retryable 4xx)
          └────┬────┘                 ▲   manual retry resets attempts
               │ 2xx                  │ 409
               ▼                      │
          ┌─────────┐            ┌─────────┐
          │ synced  │            │ conflict│  never auto-retried;
          │ (removed│            │         │  user discards or keeps
          │ from    │            └─────────┘  for dispatch review
          │ outbox) │
          └─────────┘
```

- **What auto-syncs:** `waiting` actions, triggered by (a) connectivity
  offline→online transition, (b) a 20s auto-retry tick that respects each
  action's backoff schedule, (c) cold start with connectivity. `failed`
  actions require an explicit manual retry so that failure stays visible.
- **Trigger sources:** `submit` (right after recording), `connectivity`
  (NetInfo transition / app start online), `manual` (buttons), `auto` (timer).
- **Photo proof** uploads first, exactly once (`proof_uploaded` flag), then the
  complete action is submitted.

## Idempotency — no duplicate submissions

- The client sends the action's stable `client_action_id` on every attempt and
  retry, including after app restarts (it is persisted with the action).
- The server keeps a registry `client_action_id → applied result`. A replay
  returns the original result marked `duplicate: true` and does **not** mutate
  state again. Since sync attempts are serialized (single drain lock) and one
  action per delivery is enforced client-side, duplicates can only arise from
  retries — which the registry absorbs.
- Unit tests cover the registry behavior directly (`tests/mockServer.test.ts`).

## Conflicts — delivery changed on server

The server rejects a resolution when the delivery is no longer `pending`
(`409 CONFLICT` + authoritative `Delivery`). The engine parks the action as
`conflict`, storing the server state. The UI explains what happened and offers:

- **Discard my update** — the action is removed and the local optimistic state
  is reverted to `pending` (a later refresh reconciles with the server anyway).
- **Keep for dispatch review** — the action stays parked in the queue, excluded
  from all automatic sync paths, visible in *Needs attention*.

## Refresh merge strategy (server → client)

`GET /deliveries` merges into the cache with one rule: **a delivery that has a
queued action keeps its local optimistic state** (the queued action represents
the driver's most recent intent). Everything else takes the server version.
Deliveries unknown to the server (e.g. seeded cache) are retained offline.

## Mock API

`MockServer` is an in-memory implementation of the `Api` interface:

- profiles: `online` (350–600 ms), `slow` (4–8 s + stalls that force the client
  timeout), `flaky` (~45% injected 500s), `offline` (instant `NetworkError`);
- idempotency registry (above);
- status-based conflict detection + an *armed conflict* mode where the server
  mutates a delivery right before the next submit, reproducing the
  "delivery changed on server" scenario deterministically;
- client-side 12s timeout wrapper turns stalls into retryable `TimeoutError`s.

The simulator screen persists its settings, so the offline + kill + reopen
scenario works end-to-end.

## Testing

- `tests/mockServer.test.ts` — idempotency, conflicts, offline, proof upload.
- `tests/persistence.test.ts` — outbox/cache/simulator persistence across
  "restarts" (new repo instances over the same storage), corrupt-storage fallback.
- `tests/syncEngine.test.ts` — engine lifecycle: success, offline no-op, flush
  on reconnect, retryable failures with backoff, parking as failed, conflict
  parking without auto-retry, proof-once ordering, backoff math.
- `tests/format.test.ts` — formatting utilities.

The engine is constructed with its dependencies, so tests swap `Api` for a
scripted double and AsyncStorage for an in-memory map (the official AsyncStorage
Jest mock covers the default adapter).
