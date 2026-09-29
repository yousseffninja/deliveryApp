import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { theme } from '../theme';

interface SyncBannerProps {
  online: boolean;
  queueCount: number;
  conflictCount?: number;
}

/**
 * Persistent strip under the header summarising connectivity + queue state:
 * offline with N waiting / N failed, or syncing N updates.
 */
export function SyncBanner({ online, queueCount, conflictCount = 0 }: SyncBannerProps) {
  if (online && queueCount === 0) {
    return null;
  }

  const offline = !online;
  const attention = conflictCount > 0;

  const icon = offline ? 'cloud-offline-outline' : attention ? 'warning-outline' : 'sync-circle-outline';
  const bg = offline ? theme.colors.warningBg : attention ? '#F3E8FF' : theme.colors.infoBg;
  const fg = offline ? theme.colors.warning : attention ? '#7E22CE' : theme.colors.info;

  let message: string;
  if (offline) {
    message =
      queueCount > 0
        ? `Offline mode — ${queueCount} update${queueCount === 1 ? '' : 's'} waiting to sync`
        : 'Offline mode — new updates will be saved on this device';
  } else if (attention) {
    message = `${conflictCount} update${conflictCount === 1 ? '' : 's'} need${conflictCount === 1 ? 's' : ''} your attention`;
  } else {
    message = `Syncing ${queueCount} update${queueCount === 1 ? '' : 's'}…`;
  }

  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <Icon name={icon} size={15} color={fg} />
      <Text style={[styles.text, { color: fg }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
  },
  text: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
});
