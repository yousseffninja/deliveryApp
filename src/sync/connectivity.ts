import NetInfo from '@react-native-community/netinfo';

type ConnectivityListener = (connected: boolean) => void;

interface ReachabilityState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}

function resolveConnected(state: ReachabilityState): boolean {
  // isInternetReachable can be null while probing — only treat a definite
  // `false` as offline so brief probes don't flap the whole UI.
  return state.isConnected === true && state.isInternetReachable !== false;
}

/**
 * Thin wrapper over NetInfo. The sync engine and the store react to a single
 * boolean so the rest of the app never touches NetInfo directly.
 */
class ConnectivityService {
  current: boolean | null = null;
  private listener: ConnectivityListener | null = null;

  subscribe(listener: ConnectivityListener): () => void {
    this.listener = listener;
    const unsubscribe = NetInfo.addEventListener(state => {
      this.emit(resolveConnected(state));
    });
    void NetInfo.fetch().then(state => {
      this.emit(resolveConnected(state));
    });
    return () => {
      unsubscribe();
      if (this.listener === listener) {
        this.listener = null;
      }
    };
  }

  private emit(connected: boolean): void {
    if (this.current === connected) {
      return;
    }
    this.current = connected;
    this.listener?.(connected);
  }
}

export const connectivity = new ConnectivityService();
