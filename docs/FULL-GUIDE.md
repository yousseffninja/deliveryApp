# DriverTrack — The Complete Guided Tour

**For developers.** This document walks through the entire application:
the architecture, every package, every source file and what it does, and
the exact step-by-step behaviour of the most important flows (cold start,
confirming a delivery online and offline, syncing, conflicts, language
switching).

Companion documents:
- `docs/ARCHITECTURE.md` — condensed architecture reference
- `docs/DriverTrack-Client-Guide.pdf` — illustrated usage guide (shared separately, not in the repo)

---

## Table of Contents

1. [The big picture](#1-the-big-picture)
2. [The stack: every package and why](#2-the-stack)
3. [Project structure at a glance](#3-project-structure)
4. [Architecture: the five layers](#4-architecture)
5. [The data model](#5-the-data-model)
6. [File-by-file walkthrough](#6-file-by-file-walkthrough)
   - 6.1 [Entry points](#61-entry-points)
   - 6.2 [Theme (dark mode)](#62-theme--dark-mode)
   - 6.3 [Types](#63-types-srctypesindexts)
   - 6.4 [Utils](#64-utils-srcutils)
   - 6.5 [API layer (the mock backend)](#65-api-layer)
   - 6.6 [Storage layer (persistence)](#66-storage-layer)
   - 6.7 [Sync layer](#67-sync-layer)
   - 6.8 [The store (src/store)](#68-the-store)
   - 6.9 [i18n (Arabic / English / RTL)](#69-i18n)
   - 6.10 [Navigation](#610-navigation)
   - 6.11 [Components](#611-components)
   - 6.12 [Screens](#612-screens)
7. [The native side (Android / iOS)](#7-the-native-side)
8. [The key flows, step by step](#8-the-key-flows)
9. [Testing — what each suite proves](#9-testing)
10. [Build and release](#10-build-and-release)
11. [Design decisions and assumptions](#11-design-decisions)
12. [Common tasks cheat-sheet](#12-common-tasks)

---

## 1. The big picture

DriverTrack is a delivery-driver app. A driver sees today's assigned
deliveries, opens one, and records the outcome — **Delivered** (recipient
name required, optional note, optional photo) or **Failed** (reason
required, optional note).

The engineering constraint that shapes everything: **the network is
unreliable**. So the app is built *offline-first* around one idea:

> A driver's confirmation is written to durable local storage **before**
> any network call is attempted. The network layer is a background job
> that drains a local queue. The UI always reflects the driver's intent,
> clearly labelled with its sync status.

Everything else — the outbox pattern, the sync engine, idempotency keys,
conflict dialogs — follows from that single decision.

The app runs against a **mock backend** that lives inside the app
(`src/api/mockServer.ts`) and can simulate latency, timeouts, random 500s,
total offline mode and server-side changes. It implements the same
interface a real backend would, so going to production means swapping one
file.

---

## 2. The stack

| Package | Version | Why it's here |
|---|---|---|
| `react` | 19.2.3 | UI runtime (React 19, concurrent renderer / Fabric). |
| `react-native` | 0.87.1 | Cross-platform framework: one JS codebase → native views, Hermes engine. |
| `typescript` | ^6.0.3 (dev) | Strict types across every layer; `npx tsc --noEmit` is a quality gate. |
| `@react-navigation/native` | ^7.5.0 | Navigation core (container, themes, hooks). |
| `@react-navigation/native-stack` | ^7.20.0 | Native stack screens (details, forms, simulator). |
| `@react-navigation/bottom-tabs` | ^7.20.0 | The Route / Sync Queue tab bar (with queue badge). |
| `react-native-screens` | ^4.28.0 | Native screen primitives required by `native-stack`. |
| `react-native-safe-area-context` | ^5.5.2 | Notch/home-indicator insets for headers and bottom bars. |
| `zustand` | ^5.0.15 | Global state store. Chosen over Redux: one `create()` call, usable outside React, trivially testable. |
| `@react-native-async-storage/async-storage` | ^2.2.0 | Persistent key-value storage for the delivery cache, outbox, synced log and settings. |
| `@react-native-community/netinfo` | ^11.5.2 | Device connectivity events → triggers auto-sync. |
| `react-native-image-picker` | ^8.2.1 | Photo proof (camera/gallery). |
| `react-native-vector-icons` | ^10.3.0 | Ionicons everywhere (Android fonts via `fonts.gradle`). |

Dev tooling: `jest` + `@react-native/jest-preset` (34 unit tests),
`@types/*`, ESLint/Prettier configs from the RN template.

**Deliberately absent:** Redux (Zustand covers it), axios/fetch libs (the
`Api` interface isolates transport), SQLite/WatermelonDB (AsyncStorage is
enough and keeps the outbox trivially testable), i18n libraries (a small
typed module covers everything).

---

## 3. Project structure

```
deliveryApp/
├── App.tsx                        # Providers + bootstrap + splash hand-off
├── index.js                       # Native entry: registers App
├── app.json                       # App name/display name
├── jest.config.js                 # Jest: node env, AsyncStorage/NetInfo mocks
├── android/                       # Native Android project
│   └── app/src/main/res/          # splash drawables, adaptive icons, themes
├── ios/deliveryApp/               # Native iOS project (LaunchScreen.storyboard)
├── scripts/
│   ├── generate-app-icons.py      # Regenerates every icon (Pillow)
│   └── publish-and-merge-prs.sh   # Pushes stacked branches, merges PRs
├── docs/                          # ARCHITECTURE.md, this guide, screenshots
├── tests/                         # 34 Jest unit tests + fakes
│   └── mocks/netinfo-mock.ts
└── src/
    ├── theme/                     # Palettes + ThemeProvider (dark mode)
    ├── types/                     # Domain types (Delivery, PendingAction…)
    ├── utils/                     # uuid, money/time/reason formatting
    ├── api/                       # Mock server + Api interface + errors
    ├── storage/                   # KeyValue port + 5 repositories
    ├── sync/                      # Connectivity + SyncEngine
    ├── store/                     # Zustand store + selectors
    ├── i18n/                      # en/ar dictionaries + provider
    ├── navigation/                # Root stack + tabs + param types
    ├── components/                # 7 reusable UI pieces
    └── screens/                   # 6 screens
```

---

## 4. Architecture

Five layers, each talking only to its neighbours:

```
┌───────────────────────────────────────────────────────────┐
│ SCREENS (src/screens, src/components)                     │
│   read state via selectors, call store actions            │
│   no fetching, no storage, no engine access               │
└───────────────┬───────────────────────────────────────────┘
                │ useAppStore()
┌───────────────▼───────────────────────────────────────────┐
│ STORE (src/store/useAppStore.ts) — single Zustand store   │
│   deliveries · outbox · syncedLog · settings · simulator  │
│   actions: bootstrap, refresh, completeDelivery,          │
│   failDelivery, retryAction, discardAction, syncNow,      │
│   setThemeMode, setLocale, simulator controls             │
└──────┬─────────────────────────┬──────────────────────────┘
       │ persists via           │ delegates network work
┌──────▼──────────────────┐  ┌──▼──────────────────────────────┐
│ REPOSITORIES (storage)  │  │ SYNC ENGINE (src/sync)          │
│ KeyValueStore port →    │  │  drains outbox FIFO, one drain  │
│ AsyncStorage            │  │  at a time; backoff; conflicts; │
│                         │  │  emits SyncEvents back          │
└─────────────────────────┘  └──┬──────────────────────────────┘
                                │ Api interface (src/api/types.ts)
                ┌───────────────▼────────────────┐
                │ MOCK SERVER (src/api)          │
                │  profiles · idempotency · 409  │
                └────────────────────────────────┘
```

Data flows **one way**. Screens call store actions; the store persists
through repositories and asks the engine to sync; the engine reports
outcomes as events; the store applies events to state and persists them.

**Why the engine is testable:** `SyncEngine` receives its dependencies in
the constructor — an `Api`, an `OutboxRepo`, a `DeliveriesRepo`, an
`isOnline()` callback and an `onEvent` callback. Tests construct it with
in-memory fakes and script failures, so the entire offline lifecycle is
verified in plain Node in ~3 seconds.

**Swapping the mock for a real backend** = implementing
`src/api/types.ts` (`Api`) over HTTP and changing one import. Nothing
else changes.

---

## 5. The data model

Two persisted structures carry the whole feature.

### `Delivery` (server state, cached locally)

| Field | Type | Notes |
|---|---|---|
| `id` / `order_number` | number / string | Identity (`1001`, `ORD-1001`). |
| `customer_name` / `phone` | string | Egyptian sample data; one-tap call. |
| `address` | string | Cairo/Giza/Alexandria; opens Google Maps. |
| `amount_due` | number | EGP, two decimals. |
| `payment_method` | `'cash' \| 'card'` | Rendered as a chip. |
| `status` | `'pending' \| 'delivered' \| 'failed' \| 'cancelled'` | Server-owned outcome. |
| `note` | string \| null | Customer note shown to the driver. |
| `recipient_name` / `failure_reason` | string \| null / FailureReason \| null | Filled by the confirmation/failure flow. |
| `proof_attached` | boolean | Photo proof reached the server. |
| `version` / `updated_at` | number / ISO date | Bumped on every server mutation; conflicts return this. |

### `PendingAction` (the outbox entry)

| Field | Type | Notes |
|---|---|---|
| `id` | UUID string | **The idempotency key** — same value on every retry. |
| `delivery_id` | number | One action per delivery (enforced). |
| `type` | `'complete' \| 'fail'` | Which confirmation. |
| `status` | `'waiting' \| 'syncing' \| 'failed' \| 'conflict'` | The sync state machine. |
| `payload` | `CompletePayload \| FailPayload` | `recipient_name/note` or `reason/note` + `client_action_id`. |
| `attempts` / `last_attempt_at` | number / ISO \| null | Backoff scheduling. |
| `photo_uri` / `proof_uploaded` | string \| null / boolean | Proof uploaded once before `complete`. |
| `server_delivery` | Delivery \| null | Attached to 409 conflicts for the resolution dialog. |

Plus two small persisted structures: `SyncedRecord` (per-delivery
"synced at" markers for the Recently Synced UI) and `AppSettings`
(`themeMode: light/dark/system`, `locale: en/ar`).

---

## 6. File-by-file walkthrough

### 6.1 Entry points

**`index.js`** — the native entry point. Calls
`AppRegistry.registerComponent(appName, () => App)`. Nothing else.

**`app.json`** — `{ name: "deliveryApp", displayName: "DriverTrack" }`.
`name` is the native registration key; `displayName` is what Android/iOS
show.

**`App.tsx`** — the JS root. Three responsibilities:

1. **Providers** (outside-in): `I18nProvider` → `ThemeProvider` →
   `SafeAreaProvider`.
2. **Bootstrap** (once, on mount): before anything renders it
   - loads persisted settings and calls `applyRTLPreference(locale)`
     (sets `I18nManager.forceRTL` so a cold start in Arabic is mirrored
     from frame one),
   - calls `store.bootstrap()` which hydrates all repos from disk,
     subscribes to connectivity and starts the engine's auto-retry timer,
   - gates the UI on `hydrated`.
3. **Splash hand-off**: while `!hydrated` it shows a brand-blue splash
   that matches the native launch screen; once hydrated it renders
   `NavigationContainer` with a theme built from the active palette
   (light/dark) and `RootNavigator`.

### 6.2 Theme / dark mode

**`src/theme/index.ts`** — design tokens. Two complete palettes,
`lightColors` and `darkColors`, exposing **identical token names**
(`primary`, `bg`, `card`, `border`, `text`, `textMuted`, `success(+Bg)`,
`warning(+Bg)`, `danger(+Bg)`, `info(+Bg)`, `conflict(+Bg)`, `slate(+Bg)`,
`white`, `selectedBg`, `actionBarBg`). Because token names match, no
component ever branches on "am I dark?" for colors. `makeTheme(isDark)`
returns `{ colors, isDark }`. Also exports `spacing`, `radius`,
`typography`.

**`src/theme/ThemeContext.tsx`** — `ThemeProvider` reads `themeMode`
(`light` / `dark` / `system`) from the store and the OS scheme from
`useColorScheme()`, resolves the effective palette with `useMemo`, and
provides it via context. Any component calls `useTheme()` to get it.
Changing the setting re-renders the whole tree with the other palette —
dark mode is literally just a different token set.

### 6.3 Types (`src/types/index.ts`)

Single source of truth for domain types (see §5): `Delivery`,
`PendingAction`, `CompletePayload`, `FailPayload`, `SyncedRecord`,
`NetworkProfile`, plus unions (`DeliveryStatus`, `FailureReason`,
`ActionSyncStatus`). Everything downstream imports from here — no
duplicate shapes anywhere.

### 6.4 Utils (`src/utils`)

**`uuid.ts`** — `makeUuid()`: RFC-4122-style v4 id from `crypto.getRandomValues`
when available, with a time+counter fallback. Used as the
`client_action_id` idempotency key.

**`format.ts`** — `formatMoney()` (EGP, two decimals), `timeAgo(iso, now,
locale)` (localized "5m ago" / "قبل 5 د"), `FAILURE_REASONS` list and
`failureReasonLabel()` (reads the current i18n locale).

### 6.5 API layer

**`src/api/types.ts`** — the `Api` **interface**:
`getDeliveries`, `getDelivery`, `completeDelivery`, `failDelivery`,
`uploadProof`, plus the response shapes (`{ delivery, duplicate }`). The
whole app depends only on this interface.

**`src/api/errors.ts`** — typed errors the engine classifies:
`NetworkError` (offline), `TimeoutError` (client gave up), `ApiError`
(status + code), `ConflictError extends ApiError` (409 + carries the
authoritative `serverDelivery`), and `describeError()` for messages.

**`src/api/seed.ts`** — the Egyptian sample dataset: 8 deliveries (6
pending, 1 delivered, 1 failed) across Nasr City, Maadi, Heliopolis, New
Cairo, Dokki, Mohandessin, Smouha and 6th of October City, with 01x
phones and EGP amounts.

**`src/api/mockServer.ts`** — the fake backend (`MockServer` class +
`mockServer` singleton). Internals:

- `deliveries: Map<id, Delivery>` — the "database" (seeded, in-memory).
- `processedActions: Map<client_action_id, Delivery>` — the **idempotency
  registry**: a repeated `client_action_id` returns the original snapshot
  with `duplicate: true` and never mutates again.
- `network(handler)` — every endpoint goes through it: sleeps for the
  profile latency (+jitter), may inject a 500 (`flaky`) or stall for 60s
  (`slow`, forcing the client timeout), or throw `NetworkError`
  immediately (`offline`).
- **Conflicts**: a submit against a delivery whose `status !== 'pending'`
  throws `ConflictError(delivery)`. Also supports *arming*: `armConflict(id)`
  mutates the delivery right before the next submit for it — a
  deterministic way to demo "delivery changed on server".
- `latencyScale` — test hook that multiplies all delays (tests set 0).

**`src/api/client.ts`** — `createApi(server)` adapts the server into the
`Api` interface, wrapping every call in a **12-second timeout**
(`Promise.race`) so a stalled request becomes a retryable `TimeoutError`
instead of hanging the engine forever. Exports the app-wide `api`.

### 6.6 Storage layer

**`keyValue.ts`** — the port: `interface KeyValueStore { get/set/remove }`,
with two implementations: `asyncStorageKv` (real) and `MemoryKv` (tests).

**`keys.ts`** — the storage keys. Data keys are versioned
(`...deliveries.v2`) so a dataset change (like the Egypt migration) can
bump versions and drop old caches cleanly.

**Repos** (all take a `KeyValueStore` in the constructor — DI for tests):

| Repo | Persisted shape | Used for |
|---|---|---|
| `DeliveriesRepo` | `Delivery[]` | Last known server state → instant cold start + offline browsing. `upsert()` merges by id. |
| `OutboxRepo` | `PendingAction[]` | **The durable queue.** `list/get/getByDelivery/hasActionFor/put/remove/clear`. |
| `SyncedLogRepo` | `Record<deliveryId, SyncedRecord>` | "Recently synced" markers. |
| `SimulatorRepo` | `{ profile, armedConflictDeliveryId }` | Persisted so the offline → kill → reopen demo works. |
| `SettingsRepo` | `{ themeMode, locale }` | Dark mode + language preferences. |

### 6.7 Sync layer

**`connectivity.ts`** — wraps NetInfo into a single boolean. `subscribe`
fires only on *changes*; `isInternetReachable !== false` is required so a
brief probe doesn't flap the UI offline. The store subscribes.

**`syncEngine.ts`** — the heart. Constructor deps: `{ api, outbox,
deliveries, isOnline, onEvent, maxAttempts=3 }`.

- `syncAll(reason)` — refuses to run if already draining (`syncing` lock
  → **no parallel submissions**) or offline. Loads the outbox, filters
  actionable items (`waiting` or `failed`), processes them **FIFO**.
- `processOne(action, reason)`:
  - `auto` reason only touches `waiting` actions that are **due**
    (`dueForRetry` = elapsed ≥ backoff),
  - `manual`/`submit`/`connectivity` also retry `failed` ones,
  - marks it `syncing` (persisted + event), uploads photo proof once if
    present, then calls `completeDelivery`/`failDelivery`,
  - success → `outbox.remove` + `deliveries.upsert(serverDelivery)` +
    `action_synced` event,
  - failure → `handleFailure`.
- `handleFailure`:
  - `ConflictError` → park as `conflict` with `server_delivery`,
    emit `action_conflict`. **Never auto-retried.**
  - `NetworkError`/`TimeoutError`/`ApiError ≥ 500` → retryable: `waiting`
    with `attempts+1` while `attempts < 3`, else `failed`.
  - anything else (e.g. 4xx) → `failed` immediately.
- `backoffDelayMs(attempts)` = `min(5000 * 2^(attempts-1), 60000)`.
- `startAutoRetry(20s)` — the timer tick that keeps `waiting` actions
  moving without user interaction.

Events (`SyncEvent`) are the engine's only output channel:
`action_updated`, `action_synced`, `action_failed`, `action_conflict`.

### 6.8 The store

**`src/store/useAppStore.ts`** — one Zustand store, created with
`create<AppState>()(...)`. It owns runtime state, wires the repos +
engine together, and exposes actions. Key members:

State: `hydrated`, `deliveries`, `outbox` (Record keyed by delivery id —
one action per delivery), `syncedLog`, `simulator`, `deviceConnected`,
`online` (device **and** not airplane mode), `themeMode`, `locale`,
`loading/loadError/showingCached`, `syncingNow`.

Actions:

- **`bootstrap()`** — idempotent. Loads all repos in parallel, configures
  the mock server, sets initial state, subscribes to connectivity
  (offline→online transition triggers `syncAll('connectivity')` + a
  silent refresh), starts the auto-retry timer, and — if online —
  refreshes and flushes the queue (cold-start catch-up).
- **`refresh({silent})`** — pulls `GET /deliveries` and **merges
  offline-first**: a delivery that has a queued action keeps its local
  optimistic state (the queue is the driver's latest intent); everything
  else takes the server version. Handles the offline case (cached note or
  hard error) and persists the merged cache.
- **`completeDelivery(input)` / `failDelivery(input)`** — the guard rails:
  rejects if a queued action already exists for the delivery
  (`error.duplicateUpdate`) or if it's already resolved. Then: create
  `PendingAction` (UUID id = `client_action_id`) → `outboxRepo.put()` →
  optimistic delivery update → `syncAll('submit')`. Returns
  `{ ok, error }` where `error` is a **translation key**.
- **`retryAction` / `retryAllFailed`** — reset `attempts` to 0, set
  `waiting`, and `syncAll('manual')`.
- **`discardAction`** — remove from outbox and revert the optimistic
  delivery to pending (the update never reached the server).
- **`syncNow`** — manual drain with a spinner flag.
- Simulator: `setNetworkProfile`, `armConflict`,
  `simulateServerChange`, `resetMockServer` (all persist + configure the
  server).
- Appearance/language: `setThemeMode`, `setLocale` (persist via
  `SettingsRepo`; locale also syncs the i18n module).

**Wiring:** after the store definition, the module creates the real
engine — `new SyncEngine({ api, outboxRepo, deliveriesRepo, isOnline:
() => store.online, onEvent: applyEngineEvent })` — and
`applyEngineEvent` mirrors engine events into store state (and persists
the synced log / server delivery).

**Selectors** (pure functions used by screens so they subscribe narrowly):
`computeSyncInfo(outbox, syncedLog, delivery)` — the sync chip logic —
and `computeQueueCounts(outbox, syncedLog)`.

### 6.9 i18n

**`translations.ts`** — `en` (source of truth for keys) and `ar`
(`Record<keyof typeof en, string>` — a missing/extra Arabic key is a
**compile error**). ~120 keys covering every screen, banner, dialog,
alert, validation message and failure reason, with `{count}`-style
interpolation tokens.

**`index.tsx`** — three pieces:
- `t(key, params)` — reads the module-level locale, falls back
  en → key. Works **outside React** (tests, utils).
- `I18nProvider` — reads `locale` from the store, syncs the module
  locale, provides `{ t, locale, isRTL, changeLocale }`.
  `changeLocale` persists and, if the direction flips, offers
  **Reload now** (`DevSettings.reload()` in dev) because Android's native
  layout direction only changes on restart.
- `applyRTLPreference(locale)` — `I18nManager.allowRTL(true)` +
  `forceRTL(isRTL)`; called by `App.tsx` **before** bootstrap so a cold
  start in Arabic renders mirrored from the first frame.

### 6.10 Navigation

**`types.ts`** — three param lists: `RootStackParamList`
(`Tabs`, `NetworkSimulator`), `RouteStackParamList` (Deliveries,
DeliveryDetails, CompleteDelivery, FailDelivery, + NetworkSimulator for
type-safe bubble-up navigation), `RootTabParamList` (Route, SyncQueue).

**`index.tsx`** — the structure (see the ASCII tree in the file):

```
RootStack
├── Tabs (bottom tabs, badge = queue size)
│   ├── Route → RouteStack (Deliveries → Details → Complete/Fail)
│   └── SyncQueueScreen
└── NetworkSimulator          ← hosted ABOVE the tabs
```

Why: React Navigation bubbles `NAVIGATE` actions **upward only**. A
screen shared by both tabs must live above the tab navigator — this was
an actual bug fix (the gear on Sync Queue originally couldn't reach the
simulator). All navigators are themed from `useTheme()`.

### 6.11 Components

| File | What it does |
|---|---|
| `Button.tsx` | Primary/danger/secondary button with loading + disabled states; themed via `useTheme`. |
| `StateViews.tsx` | `StateView` (icon + title + message + action = the loading/error/empty states) and `LoadingView`. |
| `StatusChips.tsx` | `DeliveryStatusChip`, `SyncStatusChip`, `PaymentChip` — label/color mapping lives in `deliveryStatusMeta` / `syncStatusMeta` (localized). |
| `ScreenHeader.tsx` | In-app header (brand pill + title + optional right icon button) with safe-area padding. |
| `SyncBanner.tsx` | The strip under list/queue headers: offline ("N waiting to sync"), needs-attention, or syncing. |
| `DeliveryCard.tsx` | List card: order/customer/amount/payment chip/address/status+sync chips; chevron flips with RTL. |
| `ConflictDialog.tsx` | Modal for 409s: server state, explanation, Discard my update / Keep for dispatch review. |

### 6.12 Screens

**`DeliveriesListScreen`** — Route tab home. Stats row (pending/
delivered/failed), filter chips (localized, with counts), FlatList of
`DeliveryCard`s, pull-to-refresh, and the four states: first-load
spinner, hard error (Try again + offline hint), empty (per filter), and
normal. A "showing cached data" note appears when a refresh fails but a
cache exists.

**`DeliveryDetailsScreen`** — summary card (order, customer, status
chips, divider, amount due), then:
- queued-action card (waiting/syncing/failed: age, attempts, last error,
  Retry now / Discard),
- conflict card (Resolve conflict → `ConflictDialog`),
- customer card (Call customer via `tel:`, Open in Maps),
- address card (note, failure reason, delivered-to, as applicable),
- footer meta (last server update, version, "your report synced X ago"),
- bottom action bar with the two big buttons when the delivery is still
  actionable.

**`CompleteDeliveryScreen`** — recipient name (required, pre-filled,
inline validation), note (240-char counter), photo proof
(`launchImageLibrary`, thumbnail + remove), Confirm button (loading
state). On submit → store → success alert whose copy depends on
connectivity ("syncing now" vs "queued until back online").

**`FailDeliveryScreen`** — five localized reason radio cards, optional
note, Report button. Same submit/alert pattern.

**`SyncQueueScreen`** — stats (waiting/failed/synced today), Sync now +
Retry all failed, then three sections: **Needs attention** (failed +
conflict cards with error text and Retry/Resolve/Discard), **Waiting to
sync** (age + attempts), **Recently synced**. Opens the ConflictDialog
for conflict items.

**`NetworkSimulatorScreen`** — the demo control panel: info card
(effective connectivity), **Appearance** (Light/Dark/System),
**Language** (English/العربية), **Network profiles** (Online/Slow 3G/
Flaky/Airplane), **Conflict scenarios** (Arm conflict / Change now per
pending delivery), and Reset mock server. Everything persists.

---

## 7. The native side

- **Splash (Android)**: `AppTheme.windowBackground` =
  `drawable/splash_background` (layer-list: `@color/splash_blue` +
  centered vector `splash_logo`). `values-v31/styles.xml` adds the
  Android 12+ system splash attributes
  (`windowSplashScreenBackground`/`AnimatedIcon`).
- **Splash (iOS)**: `LaunchScreen.storyboard` — brand blue background,
  white "DriverTrack" wordmark + tagline.
- **App icon**: `scripts/generate-app-icons.py` (Pillow, 4× supersampled)
  renders the brand mark into `ic_launcher(.png/_round.png)` for all five
  densities, plus **adaptive icons** (`mipmap-anydpi-v26` with a vector
  foreground inside the 66dp safe zone over `@color/ic_launcher_background`),
  plus the full iOS `AppIcon.appiconset` (20–60pt @2x/3x + 1024 marketing,
  RGB, no alpha). Re-run the script to change the artwork everywhere.
- **RTL**: `android:supportsRtl="true"` in the manifest; RN mirrors
  flexboxes automatically when `I18nManager.isRTL` is true.
- **Vector icon fonts**: `fonts.gradle` applied in
  `android/app/build.gradle`.

---

## 8. The key flows

### 8.1 Cold start

1. Native shows the splash (blue + white mark).
2. JS boots → `App` effect: load settings → `applyRTLPreference` →
   `store.bootstrap()`.
3. Bootstrap hydrates deliveries/outbox/synced log/simulator/settings
   from AsyncStorage, configures the mock server, subscribes to
   connectivity, starts the 20s auto-retry timer.
4. If online: silent refresh + flush of any queued actions (this is how
   updates recorded offline yesterday get sent today).
5. `hydrated = true` → navigation renders; the JS splash hands off.

### 8.2 Confirm a delivery — ONLINE

1. Form validates (recipient name required).
2. Store: duplicate guard → `PendingAction` created (UUID) →
   `outboxRepo.put()` → optimistic delivery update → `syncAll('submit')`.
3. Engine marks it `syncing` (chip: "Syncing…"), (uploads proof if any),
   POSTs with `client_action_id`.
4. Server applies (or replays if duplicate) → engine removes the action,
   upserts the server delivery, emits `action_synced`.
5. Store: chip becomes **Synced**, entry appears in Recently synced.
   Total user-visible time: one round trip.

### 8.3 Confirm a delivery — OFFLINE

1. Same as above until step 3, which throws `NetworkError` instantly.
2. Engine parks the action as `waiting` (0–1 attempts used). Nothing is
   lost — the outbox row is already on disk.
3. UI: amber banner "Offline mode — N waiting to sync", delivery chip
   "Waiting to sync", Sync Queue tab badge = N.
4. Killing/reopening the app changes nothing: bootstrap reloads the
   outbox from disk.

### 8.4 Connectivity returns

1. NetInfo fires → store sets `online = true`.
2. Transition handler calls `syncAll('connectivity')` + silent refresh.
3. The engine drains the queue; each action goes through
   §8.2 steps 3–5. Chips flip to Synced; badge disappears.
4. Meanwhile the 20s timer keeps nudging anything still waiting
   (respecting per-action backoff).

### 8.5 Conflict

1. Simulator arms a conflict (or support cancelled the order for real).
2. Driver submits → server answers **409** + its `Delivery`.
3. Engine parks the action as `conflict` (never auto-retried) and emits
   `action_conflict`.
4. Details/Queue show the resolution dialog → **Discard my update**
   (action removed, local state reverted to pending) or **Keep for
   dispatch review** (parked forever until a human decides).

### 8.6 Language switch

1. Settings → العربية/English → `setLocale` persists it; text switches
   immediately (the `t()` dictionary changes).
2. If the layout direction flips, an alert offers **Reload now**
   (JS reload in dev) — Android can only flip the native direction on
   restart. Cold start applies it automatically (§6.9).

---

## 9. Testing

34 tests, ~3 seconds, no emulator. Layout:

| Suite | Proves |
|---|---|
| `tests/mockServer.test.ts` | Same `client_action_id` never applies twice (version unchanged on replay); 409s carry server state and are **not** cached as processed; offline throws then the same action succeeds after reconnect; proof attaches to the completed delivery. |
| `tests/persistence.test.ts` | Outbox/cache/settings survive "restarts" (new repo instances over the same storage); updates/removes persist; corrupt storage falls back to defaults. |
| `tests/syncEngine.test.ts` | Success path; offline no-op; flush on reconnect; retryable 500s keep `waiting` with growing attempts; parking as `failed` at the limit; conflicts park with server state and are skipped by every auto path; proof uploaded once before complete; backoff schedule (5s/10s/20s/60s cap) and due-for-retry maths. |
| `tests/i18n.test.ts` | Arabic has exactly the English keys; no empty strings; interpolation; RTL flag flips; localized relative time. |
| `tests/theme.test.ts` | Light/dark token parity; `makeTheme` selection; dark is actually darker. |
| `tests/format.test.ts` | EGP money format; relative time; reason labels. |

Infrastructure: AsyncStorage → official Jest mock; NetInfo →
`tests/mocks/netinfo-mock.ts` (both via `moduleNameMapper`).

---

## 10. Build and release

```bash
npm test                          # 34 tests
npx tsc --noEmit                  # typecheck
cd android && ./gradlew assembleRelease
#   -> android/app/build/outputs/apk/release/app-release.apk
gh release create vX.Y.Z app-release.apk   # share
```

Release APK: universal (all ABIs), Hermes bytecode embedded, signed with
the debug keystore (RN template default — fine for internal sharing).
Native resource changes (icons/splash) require a rebuild. Published
releases: `v1.0.0`.

---

## 11. Design decisions

1. **Outbox pattern** over "try the request and hope": durability is a
   write, not a network outcome.
2. **One action per delivery** + **stable `client_action_id`**: two
   layers of duplicate protection before the server even answers; the
   server registry is the third.
3. **Engine as a plain class with injected deps**: testability without
   emulator; the store is just its orchestrator.
4. **Errors as translation keys** from the store (`error.duplicateUpdate`)
   — localization happens at the display boundary.
5. **`failed` requires a human** (manual retry) while `waiting` retries
   automatically — failure must stay visible, per the task.
6. **Conflicts are user decisions**, never auto-resolved.
7. **Mock server implements the real interface** — production swap is a
   one-file change.
8. **Theme/i18n as data**: palettes and dictionaries are plain objects
   with parity enforced by types and tests; components stay dumb.
9. **Offline-first refresh merge**: queued intent beats server state for
   that delivery, until the server confirms or the driver discards.
10. **Egyptian sample dataset** (EGP, Cairo/Giza/Alexandria) to make the
    demo feel real.

---

## 12. Common tasks

| Task | Command / where |
|---|---|
| Run tests | `npm test` |
| Typecheck | `npx tsc --noEmit` |
| Run the app | `npm start` + `npm run android` |
| Demo offline mode | Gear → Airplane mode → deliver something |
| Demo a conflict | Gear → Arm conflict on a pending delivery → deliver it |
| Change the icon | Edit `scripts/generate-app-icons.py`, run it, rebuild |
| Build the APK | `cd android && ./gradlew assembleRelease` |
| Regenerate icons | `python scripts/generate-app-icons.py` |
| Add a screen | Create it in `src/screens`, register in `src/navigation`, add strings to both dictionaries |
| Swap in a real backend | Implement `Api` over HTTP, export it from `src/api/client.ts` |

---

*Generated from the actual codebase (v1.1, 18 merged PRs). If the code
and this document disagree, the code wins — then update this file.*
