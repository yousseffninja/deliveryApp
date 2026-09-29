import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Button } from '../components/Button';
import { ConflictDialog } from '../components/ConflictDialog';
import { HeaderIconButton, ScreenHeader } from '../components/ScreenHeader';
import { StateView } from '../components/StateViews';
import { computeQueueCounts, useAppStore } from '../store/useAppStore';
import { theme } from '../theme';
import { PendingAction } from '../types';
import { failureReasonLabel, timeAgo } from '../utils/format';

const PROFILE_LABELS: Record<string, string> = {
  online: 'Simulator: Online',
  slow: 'Simulator: Slow 3G',
  flaky: 'Simulator: Flaky server',
  offline: 'Simulator: Airplane mode',
};

export function SyncQueueScreen() {
  const outbox = useAppStore(s => s.outbox);
  const syncedLog = useAppStore(s => s.syncedLog);
  const deliveries = useAppStore(s => s.deliveries);
  const online = useAppStore(s => s.online);
  const deviceConnected = useAppStore(s => s.deviceConnected);
  const simulator = useAppStore(s => s.simulator);
  const syncingNow = useAppStore(s => s.syncingNow);
  const syncNow = useAppStore(s => s.syncNow);
  const retryAction = useAppStore(s => s.retryAction);
  const retryAllFailed = useAppStore(s => s.retryAllFailed);
  const discardAction = useAppStore(s => s.discardAction);

  const [conflictId, setConflictId] = useState<number | null>(null);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();

  const queue = useMemo(
    () => computeQueueCounts(outbox, syncedLog),
    [outbox, syncedLog],
  );

  const actions = useMemo(
    () =>
      Object.values(outbox).sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [outbox],
  );
  const attention = actions.filter(
    a => a.status === 'failed' || a.status === 'conflict',
  );
  const waiting = actions.filter(
    a => a.status === 'waiting' || a.status === 'syncing',
  );

  const syncedEntries = useMemo(
    () =>
      Object.entries(syncedLog)
        .map(([id, record]) => ({ delivery: deliveries[Number(id)], record }))
        .filter(e => e.delivery !== undefined)
        .sort((a, b) => b.record.synced_at.localeCompare(a.record.synced_at))
        .slice(0, 10),
    [syncedLog, deliveries],
  );

  const conflictAction = conflictId !== null ? outbox[conflictId] ?? null : null;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Sync Queue"
        subtitle={`${PROFILE_LABELS[simulator.profile] ?? simulator.profile} · ${
          deviceConnected === false ? 'device offline' : 'device online'
        }`}
        right={
          <HeaderIconButton
            name="settings-outline"
            onPress={() => navigation.navigate('NetworkSimulator')}
          />
        }
      />

      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: insets.bottom + theme.spacing.xl,
        }}
      >
        <View style={styles.statsRow}>
          <StatCard label="Waiting" value={queue.waiting} color={theme.colors.warning} />
          <StatCard label="Failed" value={queue.failed} color={theme.colors.danger} />
          <StatCard label="Synced today" value={queue.syncedToday} color={theme.colors.success} />
        </View>

        <View style={styles.actionsRow}>
          <View style={styles.half}>
            <Button
              label="Sync now"
              onPress={() => void syncNow()}
              loading={syncingNow}
              disabled={!online || queue.total === 0}
            />
          </View>
          <View style={styles.half}>
            <Button
              label="Retry all failed"
              variant="secondary"
              onPress={() => void retryAllFailed()}
              disabled={!online || queue.failed === 0}
            />
          </View>
        </View>

        {actions.length === 0 ? (
          <StateView
            icon="checkmark-done-circle-outline"
            iconBg={theme.colors.successBg}
            iconColor={theme.colors.success}
            title="Queue is clear"
            message="Every confirmation reached the server. Updates made offline will appear here while they wait to sync."
          />
        ) : null}

        {attention.length > 0 ? (
          <SectionTitle text={`Needs attention (${attention.length})`} />
        ) : null}
        {attention.map(action => (
          <ActionCard
            key={action.id}
            action={action}
            customerName={deliveries[action.delivery_id]?.order_number ?? `#${action.delivery_id}`}
            onRetry={() => void retryAction(action.delivery_id)}
            onDiscard={() => void discardAction(action.delivery_id)}
            onResolve={() => setConflictId(action.delivery_id)}
            disabled={!online && action.status !== 'conflict'}
          />
        ))}

        {waiting.length > 0 ? <SectionTitle text={`Waiting to sync (${waiting.length})`} /> : null}
        {waiting.map(action => (
          <ActionCard
            key={action.id}
            action={action}
            customerName={deliveries[action.delivery_id]?.order_number ?? `#${action.delivery_id}`}
            onRetry={() => void retryAction(action.delivery_id)}
            onDiscard={() => void discardAction(action.delivery_id)}
            disabled={!online}
          />
        ))}

        {syncedEntries.length > 0 ? (
          <SectionTitle text="Recently synced" />
        ) : null}
        {syncedEntries.map(({ delivery, record }) => (
          <View key={record.action_id} style={styles.syncedRow}>
            <Icon name="checkmark-circle" size={20} color={theme.colors.success} />
            <View style={styles.syncedTextBlock}>
              <Text style={styles.syncedTitle}>
                {delivery.order_number} ·{' '}
                {record.type === 'complete' ? 'Delivered' : 'Failed report'}
              </Text>
              <Text style={styles.syncedMeta}>
                Synced {timeAgo(record.synced_at)} · OK
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {conflictAction ? (
        <ConflictDialog
          action={conflictAction}
          onDiscard={() => {
            void discardAction(conflictAction.delivery_id);
            setConflictId(null);
          }}
          onKeep={() => setConflictId(null)}
        />
      ) : null}
    </View>
  );
}

function SectionTitle({ text }: { text: string }) {
  return <Text style={styles.sectionTitle}>{text}</Text>;
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionCard({
  action,
  customerName,
  onRetry,
  onDiscard,
  onResolve,
  disabled,
}: {
  action: PendingAction;
  customerName: string;
  onRetry: () => void;
  onDiscard: () => void;
  onResolve?: () => void;
  disabled?: boolean;
}) {
  const isConflict = action.status === 'conflict';
  const isFailed = action.status === 'failed';
  const title = isConflict
    ? 'Conflict — delivery changed on server'
    : isFailed
      ? 'Failed to sync'
      : action.status === 'syncing'
        ? 'Syncing now…'
        : 'Waiting to sync';

  const payloadSummary =
    action.type === 'complete'
      ? `Delivered confirmation · to ${
          (action.payload as { recipient_name?: string }).recipient_name ?? 'recipient'
        }`
      : `Failed report · ${
          'reason' in action.payload
            ? failureReasonLabel((action.payload as { reason: Parameters<typeof failureReasonLabel>[0] }).reason)
            : 'reason'
        }`;

  return (
    <View
      style={[
        styles.actionCard,
        isConflict ? styles.actionCardConflict : isFailed ? styles.actionCardFailed : null,
      ]}
    >
      <View style={styles.actionHeader}>
        <Icon
          name={
            isConflict
              ? 'warning'
              : isFailed
                ? 'alert-circle'
                : action.status === 'syncing'
                  ? 'sync-circle'
                  : 'time-outline'
          }
          size={18}
          color={isConflict ? '#7E22CE' : isFailed ? theme.colors.danger : theme.colors.warning}
        />
        <Text
          style={[
            styles.actionTitle,
            isConflict
              ? { color: '#7E22CE' }
              : isFailed
                ? { color: theme.colors.danger }
                : { color: theme.colors.warning },
          ]}
        >
          {title}
        </Text>
        <Text style={styles.actionTime}>{timeAgo(action.created_at)}</Text>
      </View>

      <Text style={styles.actionOrder}>{customerName}</Text>
      <Text style={styles.actionMeta}>{payloadSummary}</Text>
      <Text style={styles.actionMeta}>
        {action.attempts} attempt{action.attempts === 1 ? '' : 's'}
        {action.last_error ? ` · ${action.last_error}` : ''}
      </Text>

      <View style={styles.actionButtons}>
        {isConflict && onResolve ? (
          <View style={styles.actionButton}>
            <Button label="Resolve" variant="secondary" onPress={onResolve} />
          </View>
        ) : null}
        {!isConflict ? (
          <View style={styles.actionButton}>
            <Button
              label={isFailed ? 'Retry now' : 'Sync now'}
              variant="secondary"
              onPress={onRetry}
              disabled={disabled}
            />
          </View>
        ) : null}
        <View style={styles.actionButton}>
          <Button label="Discard" variant="secondary" onPress={onDiscard} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  half: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  actionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  actionCardFailed: {
    borderColor: theme.colors.dangerBg,
    backgroundColor: '#FFF8F8',
  },
  actionCardConflict: {
    borderColor: '#E9D5FF',
    backgroundColor: '#FAF5FF',
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  actionTime: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  actionOrder: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  actionMeta: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  syncedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  syncedTextBlock: {
    flex: 1,
  },
  syncedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  syncedMeta: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
});
