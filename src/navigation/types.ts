/**
 * Root stack: wraps the tab navigator and hosts screens reachable from
 * ANY tab (React Navigation can only bubble NAVIGATE actions upward, so a
 * screen shared by both tabs must live above the tab navigator).
 */
export type RootTabParamList = {
  Route: undefined;
  SyncQueue: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  NetworkSimulator: undefined;
};

export type RouteStackParamList = {
  Deliveries: undefined;
  DeliveryDetails: { deliveryId: number };
  CompleteDelivery: { deliveryId: number };
  FailDelivery: { deliveryId: number };
  /**
   * Handled by the root stack (bubbles up); kept in this type so screens
   * inside the Route stack can call navigate('NetworkSimulator') type-safely.
   */
  NetworkSimulator: undefined;
};

export type DeliveryStatusFilter = 'all' | 'pending' | 'delivered' | 'failed';
