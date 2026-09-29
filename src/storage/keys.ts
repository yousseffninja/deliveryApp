export const STORAGE_KEYS = {
  /** cached server deliveries (last known server state) */
  deliveries: 'drivertrack.deliveries.v2',
  /** outbox: actions recorded locally and waiting to reach the server */
  outbox: 'drivertrack.outbox.v2',
  /** bookkeeping of successfully synced actions, for the "Recently synced" UI */
  syncedLog: 'drivertrack.synced.v2',
  /** persisted network simulator settings */
  simulator: 'drivertrack.simulator.v1',
  /** user preferences: appearance (light/dark/system), language */
  settings: 'drivertrack.settings.v1',
} as const;
