import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { ThemeColors, spacing, radius } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { t } from '../i18n';
import { useI18n } from '../i18n';

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
  const { colors } = useTheme();
  const { t: translate } = useI18n();
  const styles = makeStyles(colors);

  if (online && queueCount === 0) {
    return null;
  }

  const offline = !online;
  const attention = conflictCount > 0;

  const icon = offline
    ? 'cloud-offline-outline'
    : attention
      ? 'warning-outline'
      : 'sync-circle-outline';
  const bg = offline
    ? colors.warningBg
    : attention
      ? colors.conflictBg
      : colors.infoBg;
  const fg = offline
    ? colors.warning
    : attention
      ? colors.conflict
      : colors.info;

  let message: string;
  if (offline) {
    message =
      queueCount > 0
        ? translate('banner.offlineWaiting', { count: queueCount })
        : translate('banner.offline');
  } else if (attention) {
    message = translate('banner.attention', { count: conflictCount });
  } else {
    message = translate('banner.syncing', { count: queueCount });
  }

  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <Icon name={icon} size={15} color={fg} />
      <Text style={[styles.text, { color: fg }]}>{message}</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
    },
    text: {
      flex: 1,
      fontSize: 12,
      fontWeight: '600',
    },
  });
