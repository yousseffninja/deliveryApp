import { Modal, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Button } from './Button';
import { PendingAction } from '../types';
import { ThemeColors, spacing, radius } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { t, useI18n } from '../i18n';
import { timeAgo } from '../utils/format';

interface ConflictDialogProps {
  action: PendingAction;
  onDiscard: () => void;
  onKeep: () => void;
}

/**
 * Shown when the server returned 409: the delivery changed (often cancelled
 * by support) before the driver's confirmation landed.
 */
export function ConflictDialog({ action, onDiscard, onKeep }: ConflictDialogProps) {
  const { colors } = useTheme();
  const { t: translate, locale } = useI18n();
  const styles = makeStyles(colors);
  const server = action.server_delivery;
  const actionType =
    action.type === 'complete'
      ? translate('conflict.completeType')
      : translate('conflict.failType');

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onKeep}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Icon name="warning" size={22} color={colors.conflict} />
            <Text style={styles.title}>{translate('conflict.title')}</Text>
          </View>

          <Text style={styles.body}>
            {translate('conflict.body', {
              order: server ? server.order_number : t('common.notFound'),
              type: actionType,
              time: timeAgo(action.created_at, Date.now(), locale),
            })}
            {server
              ? `\n\n${translate('conflict.serverState', {
                  status: server.status.toUpperCase(),
                })}${server.note ? ` — ${server.note}` : ''}`
              : ''}
          </Text>

          <View style={styles.optionBox}>
            <Text style={styles.optionTitle}>{translate('conflict.howTitle')}</Text>
            <Text style={styles.optionBody}>{translate('conflict.howBody')}</Text>
          </View>

          <Button
            label={translate('conflict.discard')}
            variant="danger"
            onPress={onDiscard}
          />
          <Button
            label={translate('conflict.keep')}
            variant="secondary"
            onPress={onKeep}
          />
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    card: {
      width: '100%',
      backgroundColor: c.card,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    title: {
      flex: 1,
      fontSize: 17,
      fontWeight: '800',
      color: c.conflict,
    },
    body: {
      fontSize: 13,
      color: c.text,
      lineHeight: 19,
      marginBottom: spacing.md,
    },
    optionBox: {
      backgroundColor: c.conflictBg,
      borderWidth: 1,
      borderColor: c.conflictBg,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    optionTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: c.conflict,
      marginBottom: 4,
    },
    optionBody: {
      fontSize: 12,
      color: c.textMuted,
      lineHeight: 17,
    },
  });
