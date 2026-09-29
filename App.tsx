import { useEffect } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { useAppStore } from './src/store/useAppStore';

function buildNavTheme(colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) {
  const base = isDark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.bg,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.danger,
    },
  };
}

function Root() {
  const { colors, isDark } = useTheme();
  const hydrated = useAppStore(s => s.hydrated);

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {hydrated ? (
        <NavigationContainer theme={buildNavTheme(colors, isDark)}>
          <RootNavigator />
        </NavigationContainer>
      ) : (
        <View style={[styles.splash, { backgroundColor: colors.bg }]}>
          <Text style={[styles.splashTitle, { color: colors.primary }]}>
            DriverTrack
          </Text>
          <Text
            style={[styles.splashSubtitle, { color: colors.textMuted }]}
          >
            Preparing your route…
          </Text>
          <ActivityIndicator
            color={colors.primary}
            style={styles.spinner}
          />
        </View>
      )}
    </>
  );
}

function App() {
  useEffect(() => {
    // Hydrate from disk (cached deliveries + persisted outbox + settings),
    // subscribe to connectivity, and flush queued actions.
    void useAppStore.getState().bootstrap();
  }, []);

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <Root />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashTitle: {
    fontSize: 26,
    fontWeight: '800',
  },
  splashSubtitle: {
    fontSize: 13,
    marginTop: 6,
  },
  spinner: {
    marginTop: 24,
  },
});

export default App;
