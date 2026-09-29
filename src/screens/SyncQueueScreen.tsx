import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Button } from '../components/Button';
import { ConflictDialog } from '../components/ConflictDialog';
import { HeaderIconButton, ScreenHeader } from '../components/ScreenHeader';
import { StateView } from '../components/StateViews';
import { computeQueueCounts, useAppStore } from '../store/useAppStore';
import { ThemeColors, spacing, radius } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n';
import type { TranslationKey } from '../i18n/translations';
import { PendingAction } from '../types';
import { failureReasonLabel, timeAgo } from '../utils/format';

export function SyncQueueScreen() {
  const { colors } = useTheme();
  const { t: translate, locale } = useI18n();
  const styles = makeStyles(colors);

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
  const navigation =
    useNavigation<NavigationProp<Record<string, object | undefined>>>();

  useEffect(() => {
    navigation.setOptions?.({ title: translate('queue.title') });
  }, [navigation, translate, locale]);

  const profileLabelKeys: Record<string, TranslationKey> = {
    online: 'queue.profileOnline',
    slow: 'queue.profileSlow',
    flaky: 'queue.profileFlaky',
    offline: 'queue.profileOffline',
  };

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
        title={translate('queue.title')}
        subtitle={`${translate(profileLabelKeys[simulator.profile] ?? 'queue.profileOnline')} · ${
          deviceConnected === false
            ? translate('queue.deviceOffline')
            : translate('queue.deviceOnline')
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
          padding: spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
        }}
      >
        <View style={styles.statsRow}>
          <StatCard
            label={translate('queue.statWaiting')}
            value={queue.waiting}
            color={colors.warning}
            styles={styles}
          />
          <StatCard
            label={translate('queue.statFailed')}
            value={queue.failed}
            color={colors.danger}
            styles={styles}
          />
          <StatCard
            label={translate('queue.statSynced')}
            value={queue.syncedToday}
            color={colors.success}
            styles={styles}
          />
        </View>

        <View style={styles.actionsRow}>
          <View style={styles.half}>
            <Button
              label={translate('queue.syncNow')}
              onPress={() => void syncNow()}
              loading={syncingNow}
              disabled={!online || queue.total === 0}
            />
          </View>
          <View style={styles.half}>
            <Button
              label={translate('queue.retryAll')}
              variant="secondary"
              onPress={() => void retryAllFailed()}
              disabled={!online || queue.failed === 0}
            />
          </View>
        </View>

        {actions.length === 0 ? (
          <StateView
            icon="checkmark-done-circle-outline"
            iconBg={colors.successBg}
            iconColor={colors.success}
            title={translate('queue.clearTitle')}
            message={translate('queue.clearBody')}
          />
        ) : null}

        {attention.length > 0 ? (
          <SectionTitle
            text={translate('queue.needsAttention', { count: attention.length })}
            styles={styles}
          />
        ) : null}
        {attention.map(action => (
          <ActionCard
            key={action.id}
            action={action}
            styles={styles}
            colors={colors}
            orderNumber={
              deliveries[action.delivery_id]?.order_number ??
              `#${action.delivery_id}`
            }
            onRetry={() => void retryAction(action.delivery_id)}
            onDiscard={() => void discardAction(action.delivery_id)}
            onResolve={() => setConflictId(action.delivery_id)}
            disabled={!online && action.status !== 'conflict'}
          />
        ))}

        {waiting.length > 0 ? (
          <SectionTitle
            text={translate('queue.waitingSection', { count: waiting.length })}
            styles={styles}
          />
        ) : null}
        {waiting.map(action => (
          <ActionCard
            key={action.id}
            action={action}
            styles={styles}
            colors={colors}
            orderNumber={
              deliveries[action.delivery_id]?.order_number ??
              `#${action.delivery_id}`
            }
            onRetry={() => void retryAction(action.delivery_id)}
            onDiscard={() => void discardAction(action.delivery_id)}
            disabled={!online}
          />
        ))}

        {syncedEntries.length > 0 ? (
          <SectionTitle text={translate('queue.recentlySynced')} styles={styles} />
        ) : null}
        {syncedEntries.map(({ delivery, record }) => (
          <View key={record.action_id} style={styles.syncedRow}>
            <Icon name="checkmark-circle" size={20} color={colors.success} />
            <View style={styles.syncedTextBlock}>
              <Text style={styles.syncedTitle}>
                {translate('queue.syncedType', {
                  order: delivery.order_number,
                  type:
                    record.type === 'complete'
                      ? translate('queue.deliveredShort')
                      : translate('queue.failedShort'),
                })}
              </Text>
              <Text style={styles.syncedMeta}>
                {translate('queue.syncedMeta', {
                  time: timeAgo(record.synced_at, Date.now(), locale),
                })}
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

function SectionTitle({ text, styles }: { text: string; styles: styles_type }) {
  return <Text style={styles.sectionTitle}>{text}</Text>;
}

function StatCard({
  label,
  value,
  color,
  styles,
}: {
  label: string;
  value: number;
  color: string;
  styles: styles_type;
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
  orderNumber,
  onRetry,
  onDiscard,
  onResolve,
  disabled,
  styles,
  colors,
}: {
  action: PendingAction;
  orderNumber: string;
  onRetry: () => void;
  onDiscard: () => void;
  onResolve?: () => void;
  disabled?: boolean;
  styles: styles_type;
  colors: ThemeColors;
}) {
  const { t: translate, locale } = useI18n();
  const isConflict = action.status === 'conflict';
  const isFailed = action.status === 'failed';
  const title = isConflict
    ? translate('queue.conflictTitle')
    : isFailed
      ? translate('sync.failed')
      : action.status === 'syncing'
        ? translate('details.syncing')
        : translate('sync.waiting');

  const payloadSummary =
    action.type === 'complete'
      ? translate('queue.deliveredSummary', {
          name:
            (action.payload as { recipient_name?: string }).recipient_name ??
            translate('queue.recipient'),
        })
      : translate('queue.failedSummary', {
          reason:
            'reason' in action.payload
              ? failureReasonLabel(
                  (action.payload as { reason: Parameters<typeof failureReasonLabel>[0] })
                    .reason,
                )
              : translate('queue.recipient'),
        });

  return (
    <View
      style={[
        styles.actionCard,
        isConflict
          ? styles.actionCardConflict
          : isFailed
            ? styles.actionCardFailed
            : null,
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
          color={
            isConflict ? colors.conflict : isFailed ? colors.danger : colors.warning
          }
        />
        <Text
          style={[
            styles.actionTitle,
            isConflict
              ? { color: colors.conflict }
              : isFailed
                ? { color: colors.danger }
                : { color: colors.warning },
          ]}
        >
          {title}
        </Text>
        <Text style={styles.actionTime}>
          {timeAgo(action.created_at, Date.now(), locale)}
        </Text>
      </View>

      <Text style={styles.actionOrder}>{orderNumber}</Text>
      <Text style={styles.actionMeta}>{payloadSummary}</Text>
      <Text style={styles.actionMeta}>
        {translate('queue.attempts', { count: action.attempts })}
        {action.last_error ? ` · ${action.last_error}` : ''}
      </Text>

      <View style={styles.actionButtons}>
        {isConflict && onResolve ? (
          <View style={styles.actionButton}>
            <Button
              label={translate('queue.resolve')}
              variant="secondary"
              onPress={onResolve}
            />
          </View>
        ) : null}
        {!isConflict ? (
          <View style={styles.actionButton}>
            <Button
              label={isFailed ? translate('details.retryNow') : translate('queue.syncNowAction')}
              variant="secondary"
              onPress={onRetry}
              disabled={disabled}
            />
          </View>
        ) : null}
        <View style={styles.actionButton}>
          <Button label={translate('common.discard')} variant="secondary" onPress={onDiscard} />
        </View>
      </View>
    </View>
  );
}

type styles_type = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    statCard: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    statValue: {
      fontSize: 20,
      fontWeight: '800',
    },
    statLabel: {
      fontSize: 11,
      color: c.textMuted,
      marginTop: 2,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    half: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    actionCard: {
      backgroundColor: c.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    actionCardFailed: {
      borderColor: c.dangerBg,
      backgroundColor: c.dangerBg,
    },
    actionCardConflict: {
      borderColor: c.conflictBg,
      backgroundColor: c.conflictBg,
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
      color: c.textMuted,
    },
    actionOrder: {
      fontSize: 15,
      fontWeight: '800',
      color: c.text,
      marginTop: spacing.sm,
    },
    actionMeta: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 2,
      lineHeight: 17,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    actionButton: {
      flex: 1,
    },
    syncedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.card,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      marginBottom: spacing.sm,
    },
    syncedTextBlock: {
      flex: 1,
    },
    syncedTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: c.text,
    },
    syncedMeta: {
      fontSize: 11,
      color: c.textMuted,
      marginTop: 1,
    },
  });
