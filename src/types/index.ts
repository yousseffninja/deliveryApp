/** Domain types shared by the API layer, persistence layer, sync engine and UI. */

export type DeliveryStatus = 'pending' | 'delivered' | 'failed' | 'cancelled';
export type PaymentMethod = 'cash' | 'card';

export type FailureReason =
  | 'customer_unavailable'
  | 'wrong_address'
  | 'refused_delivery'
  | 'payment_failed'
  | 'other';

export interface Delivery {
  id: number;
  order_number: string;
  customer_name: string;
  phone: string;
  address: string;
  amount_due: number;
  payment_method: PaymentMethod;
  status: DeliveryStatus;
  note: string | null;
  recipient_name: string | null;
  failure_reason: FailureReason | null;
  proof_attached: boolean;
  /** bumped on every server-side mutation; used to detect mid-flight changes */
  version: number;
  updated_at: string;
}

export type ActionType = 'complete' | 'fail';

export interface CompletePayload {
  recipient_name: string;
  note: string | null;
  client_action_id: string;
}

export interface FailPayload {
  reason: FailureReason;
  note: string | null;
  client_action_id: string;
}

export type ActionPayload = CompletePayload | FailPayload;

/**
 * Lifecycle of a queued action:
 * waiting -> syncing -> (removed = synced) | failed (manual retry) | conflict (user decision)
 */
export type ActionSyncStatus = 'waiting' | 'syncing' | 'failed' | 'conflict';

export interface PendingAction {
  /** client-generated idempotency key, sent to the API as `client_action_id` */
  id: string;
  delivery_id: number;
  type: ActionType;
  status: ActionSyncStatus;
  payload: ActionPayload;
  attempts: number;
  created_at: string;
  last_attempt_at: string | null;
  last_error: string | null;
  /** local uri of the optional photo proof; uploaded before the complete action */
  photo_uri: string | null;
  proof_uploaded: boolean;
  /** server state carried by a 409 conflict response */
  server_delivery: Delivery | null;
}

/** Bookkeeping for an action that reached the server successfully. */
export interface SyncedRecord {
  action_id: string;
  type: ActionType;
  synced_at: string;
}

/** Scenarios the mock API can simulate, selectable from the in-app simulator. */
export type NetworkProfile = 'online' | 'slow' | 'flaky' | 'offline';

export interface SimulatorState {
  profile: NetworkProfile;
  /** when set, the next submit for this delivery triggers a server-side change + 409 */
  armedConflictDeliveryId: number | null;
}
