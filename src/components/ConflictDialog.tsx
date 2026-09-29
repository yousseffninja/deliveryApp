import { Modal, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Button } from './Button';
import { PendingAction } from '../types';
import { theme } from '../theme';
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
  const server = action.server_delivery;
  const actionLabel =
    action.type === 'complete' ? 'delivered confirmation' : 'failure report';

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onKeep}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Icon name="warning" size={22} color="#7E22CE" />
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16,27,51,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: '#7E22CE',
  },
  body: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 19,
    marginBottom: theme.spacing.md,
  },
  optionBox: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#7E22CE',
    marginBottom: 4,
  },
  optionBody: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
  },
});
