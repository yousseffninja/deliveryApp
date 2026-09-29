export type RootTabParamList = {
  Route: undefined;
  SyncQueue: undefined;
};

export type RouteStackParamList = {
  Deliveries: undefined;
  DeliveryDetails: { deliveryId: number };
  CompleteDelivery: { deliveryId: number };
  FailDelivery: { deliveryId: number };
  NetworkSimulator: undefined;
};

export type DeliveryStatusFilter = 'all' | 'pending' | 'delivered' | 'failed';
