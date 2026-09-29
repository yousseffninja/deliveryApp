import { Modal, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Button } from './Button';
import { PendingAction } from '../types';
import { ThemeColors, spacing, radius } from '../theme';
import { useTheme } from '../theme/ThemeContext';
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
  const styles = makeStyles(colors);
  const server = action.server_delivery;
  const actionLabel =
    action.type === 'complete' ? 'delivered confirmation' : 'failure report';

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onKeep}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Icon name="warning" size={22} color={colors.conflict} />
            <Text style={styles.title}>Delivery changed on server</Text>
          </View>

          <Text style={styles.body}>
            {server ? server.order_number : 'This delivery'} was modified on the
            server before your {actionLabel} ({timeAgo(action.created_at)})
            arrived.
            {server
              ? `\n\nServer state now: ${server.status.toUpperCase()}${
                  server.note ? ` — ${server.note}` : ''
                }`
              : ''}
          </Text>

          <View style={styles.optionBox}>
            <Text style={styles.optionTitle}>How do you want to resolve it?</Text>
            <Text style={styles.optionBody}>
              Discard drops your local confirmation and keeps the server state.
              Keep leaves it in the queue untouched for dispatch to review.
            </Text>
          </View>

          <Button label="Discard my update" variant="danger" onPress={onDiscard} />
          <Button
            label="Keep for dispatch review"
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
