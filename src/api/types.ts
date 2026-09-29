import { CompletePayload, Delivery, FailPayload } from '../types';

export interface CompleteDeliveryResponse {
  delivery: Delivery;
  /** true when the server had already processed this `client_action_id` */
  duplicate: boolean;
}

export interface FailDeliveryResponse {
  delivery: Delivery;
  duplicate: boolean;
}

export interface ProofUploadResponse {
  delivery_id: number;
  proof_id: string;
  received_at: string;
  file_name: string;
}

/** Transport-agnostic API surface. The mock server and a future real HTTP client both implement this. */
export interface Api {
  getDeliveries(): Promise<Delivery[]>;
  getDelivery(deliveryId: number): Promise<Delivery>;
  completeDelivery(
    deliveryId: number,
    payload: CompletePayload,
  ): Promise<CompleteDeliveryResponse>;
  failDelivery(
    deliveryId: number,
    payload: FailPayload,
  ): Promise<FailDeliveryResponse>;
  uploadProof(
    deliveryId: number,
    fileName: string,
    clientActionId: string,
  ): Promise<ProofUploadResponse>;
}
