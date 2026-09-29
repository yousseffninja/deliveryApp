/** Jest stand-in for @react-native-community/netinfo (no native module in Node). */
const state = {
  type: 'wifi',
  isConnected: true,
  isInternetReachable: true,
  details: null,
};

const netinfoMock = {
  fetch: async () => ({ ...state }),
  addEventListener: (_listener: unknown) => () => undefined,
  configure: () => undefined,
  useNetInfo: () => ({ ...state }),
  refresh: async () => ({ ...state }),
};

export default netinfoMock;
