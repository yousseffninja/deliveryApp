import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

/** Placeholder — the network simulator lands in feat/7-sync-queue-ui. */
export function NetworkSimulatorScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Network Simulator</Text>
      <Text style={styles.body}>Controls arrive in feat/7-sync-queue-ui.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
