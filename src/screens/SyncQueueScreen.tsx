import { StyleSheet, Text, View } from 'react-native';
import { computeQueueCounts, useAppStore } from '../store/useAppStore';
import { theme } from '../theme';

/** Placeholder — the full Sync Queue (stats, retry, conflict resolution) lands in feat/7-sync-queue-ui. */
export function SyncQueueScreen() {
  const outbox = useAppStore(s => s.outbox);
  const syncedLog = useAppStore(s => s.syncedLog);
  const queue = computeQueueCounts(outbox, syncedLog);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Sync Queue</Text>
      <Text style={styles.body}>
        {queue.total} queued · {queue.failed} failed · {queue.syncedToday} synced today.
      </Text>
      <Text style={styles.hint}>Full queue management arrives in the next PR.</Text>
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
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
});
