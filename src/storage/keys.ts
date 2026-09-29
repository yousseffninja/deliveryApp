export const STORAGE_KEYS = {
  /** cached server deliveries (last known server state) */
  deliveries: 'drivertrack.deliveries.v1',
  /** outbox: actions recorded locally and waiting to reach the server */
  outbox: 'drivertrack.outbox.v1',
  /** bookkeeping of successfully synced actions, for the "Recently synced" UI */
  syncedLog: 'drivertrack.synced.v1',
  /** persisted network simulator settings */
  simulator: 'drivertrack.simulator.v1',
} as const;
