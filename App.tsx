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
import { I18nProvider, applyRTLPreference } from './src/i18n';
import { settingsRepo, useAppStore } from './src/store/useAppStore';

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
        // Brand splash: matches the native launch screen (blue + white mark)
        // so cold start feels seamless; it hands off to the app on hydration.
        <View style={[styles.splash, { backgroundColor: colors.primary }]}>
          <Text style={[styles.splashTitle, { color: colors.white }]}>
            DriverTrack
          </Text>
          <Text
            style={[styles.splashSubtitle, { color: 'rgba(255,255,255,0.85)' }]}
          >
            Preparing your route…
          </Text>
          <ActivityIndicator
            color={colors.white}
            style={styles.spinner}
          />
        </View>
      )}
    </>
  );
}

function App() {
  useEffect(() => {
    void (async () => {
      // Apply the persisted layout direction before anything renders.
      const settings = await settingsRepo.load();
      applyRTLPreference(settings.locale);
      // Hydrate from disk (cached deliveries + persisted outbox + settings),
      // subscribe to connectivity, and flush queued actions.
      await useAppStore.getState().bootstrap();
    })();
  }, []);

  return (
    <I18nProvider>
      <ThemeProvider>
        <SafeAreaProvider>
          <Root />
        </SafeAreaProvider>
      </ThemeProvider>
    </I18nProvider>
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
