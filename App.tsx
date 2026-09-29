import { useEffect } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, View } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation';
import { useAppStore } from './src/store/useAppStore';
import { theme } from './src/theme';

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: theme.colors.primary,
    background: theme.colors.bg,
    card: theme.colors.card,
    text: theme.colors.text,
    border: theme.colors.border,
  },
};

function App() {
  const hydrated = useAppStore(s => s.hydrated);

  useEffect(() => {
    // Hydrate from disk (cached deliveries + persisted outbox + simulator
    // settings), subscribe to connectivity, and flush queued actions.
    void useAppStore.getState().bootstrap();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      {hydrated ? (
        <NavigationContainer theme={navigationTheme}>
          <RootNavigator />
        </NavigationContainer>
      ) : (
        <View style={styles.splash}>
          <Text style={styles.splashTitle}>DriverTrack</Text>
          <Text style={styles.splashSubtitle}>Preparing your route…</Text>
          <ActivityIndicator color={theme.colors.primary} style={styles.spinner} />
        </View>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bg,
  },
  splashTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  splashSubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 6,
  },
  spinner: {
    marginTop: theme.spacing.lg,
  },
});

export default App;
