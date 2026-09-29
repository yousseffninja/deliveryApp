module.exports = {
  preset: '@react-native/jest-preset',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    // official mock so repo modules (which default to AsyncStorage) load in plain Jest
    '^@react-native-async-storage/async-storage$': '@react-native-async-storage/async-storage/jest/async-storage-mock',
    // no native NetInfo module under Node - provide a connectivity stub
    '^@react-native-community/netinfo$': '<rootDir>/tests/mocks/netinfo-mock.ts',
  },
};
