import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Button } from '../components/Button';
import { ConflictDialog } from '../components/ConflictDialog';
import { DeliveryStatusChip, PaymentChip, SyncStatusChip } from '../components/StatusChips';
import { computeSyncInfo, useAppStore } from '../store/useAppStore';
import { theme } from '../theme';
import { RouteStackParamList } from '../navigation/types';
import { formatMoney, failureReasonLabel, timeAgo } from '../utils/format';

type Props = NativeStackScreenProps<RouteStackParamList, 'DeliveryDetails'>;

export function DeliveryDetailsScreen({ route, navigation }: Props) {
  const { deliveryId } = route.params;
  const delivery = useAppStore(s => s.deliveries[deliveryId]);
  const outbox = useAppStore(s => s.outbox);
  const syncedLog = useAppStore(s => s.syncedLog);
  const retryAction = useAppStore(s => s.retryAction);
  const discardAction = useAppStore(s => s.discardAction);
  const insets = useSafeAreaInsets();
  const [conflictOpen, setConflictOpen] = useState(false);

  if (!delivery) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.muted}>Delivery not found. Pull to refresh on the route screen.</Text>
      </View>
    );
  }

  const syncInfo = computeSyncInfo(outbox, syncedLog, delivery);
  const action = syncInfo.action;
  const isPending = delivery.status === 'pending' && !action;
  const isConflict = action?.status === 'conflict';

  const confirmDiscard = () => {
    Alert.alert(
      'Discard this update?',
      'Your confirmation was never sent to the server. The delivery will go back to pending on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => void discardAction(delivery.id) },
      ],
    );
  };

  const resolveConflict = () => {
    setConflictOpen(true);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: insets.bottom + 120,
        }}
      >
        {/* summary */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.orderNumber}>{delivery.order_number}</Text>
            <PaymentChip method={delivery.payment_method} />
          </View>
          <Text style={styles.customerName}>{delivery.customer_name}</Text>
          <View style={styles.chipRow}>
            <DeliveryStatusChip status={syncInfo.deliveryStatus} />
            <SyncStatusChip syncStatus={syncInfo.syncStatus} />
          </View>

          <View style={styles.divider} />
          <View style={styles.rowBetween}>
            <Text style={styles.muted}>Amount due (on delivery)</Text>
            <Text style={styles.amount}>{formatMoney(delivery.amount_due)}</Text>
          </View>
        </View>

        {/* queued action card */}
        {action && !isConflict ? (
          <View style={[styles.card, styles.noticeCard]}>
            <View style={styles.noticeRow}>
              <Icon
                name={action.status === 'failed' ? 'alert-circle' : 'time-outline'}
                size={20}
                color={action.status === 'failed' ? theme.colors.danger : theme.colors.warning}
              />
              <View style={styles.noticeTextBlock}>
                <Text style={styles.noticeTitle}>
                  {action.status === 'failed'
                    ? 'Failed to sync'
                    : action.status === 'syncing'
                      ? 'Syncing now…'
                      : 'Waiting to sync'}
                </Text>
                <Text style={styles.noticeBody}>
                  {action.type === 'complete' ? 'Delivered' : 'Failed delivery'} report for{' '}
                  {delivery.order_number} · {timeAgo(action.created_at)}
                  {action.attempts > 0 ? ` · ${action.attempts} attempt${action.attempts === 1 ? '' : 's'}` : ''}
                  {action.last_error ? `\n${action.last_error}` : ''}
                </Text>
              </View>
            </View>
            <View style={styles.buttonRow}>
              <View style={styles.halfButton}>
                <Button label="Retry now" variant="secondary" onPress={() => void retryAction(delivery.id)} />
              </View>
              <View style={styles.halfButton}>
                <Button label="Discard" variant="secondary" onPress={confirmDiscard} />
              </View>
            </View>
          </View>
        ) : null}

        {/* conflict card */}
        {isConflict ? (
          <View style={[styles.card, styles.conflictCard]}>
            <View style={styles.noticeRow}>
              <Icon name="warning" size={20} color="#7E22CE" />
              <View style={styles.noticeTextBlock}>
                <Text style={[styles.noticeTitle, { color: '#7E22CE' }]}>
                  Delivery changed on server
                </Text>
                <Text style={styles.noticeBody}>
                  {delivery.order_number} was modified before your{' '}
                  {action?.type === 'complete' ? 'delivered' : 'failed'} report arrived. Review
                  and choose how to resolve it.
                </Text>
              </View>
            </View>
            <Button label="Resolve conflict" onPress={resolveConflict} />
          </View>
        ) : null}

        {/* customer */}
        <SectionCard icon="person-outline" title="Customer">
          <Text style={styles.bodyText}>{delivery.customer_name}</Text>
          <Text style={styles.muted}>+965 {delivery.phone}</Text>
          <View style={styles.buttonRow}>
            <View style={styles.halfButton}>
              <Button
                label="Call customer"
                variant="secondary"
                onPress={() => void Linking.openURL(`tel:${delivery.phone}`)}
              />
            </View>
            <View style={styles.halfButton}>
              <Button
                label="Open in Maps"
                variant="secondary"
                onPress={() =>
                  void Linking.openURL(
                    `https://maps.google.com/?q=${encodeURIComponent(delivery.address)}`,
                  )
                }
              />
            </View>
          </View>
        </SectionCard>

        {/* address + notes */}
        <SectionCard icon="location-outline" title="Delivery address">
          <Text style={styles.bodyText}>{delivery.address}</Text>
          {delivery.note ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>Customer note</Text>
              <Text style={styles.noteText}>{delivery.note}</Text>
            </View>
          ) : null}
          {delivery.status === 'failed' && delivery.failure_reason ? (
            <View style={[styles.noteBox, { backgroundColor: theme.colors.dangerBg }]}>
              <Text style={[styles.noteLabel, { color: theme.colors.danger }]}>Failure reason</Text>
              <Text style={styles.noteText}>
                {failureReasonLabel(delivery.failure_reason)}
              </Text>
            </View>
          ) : null}
          {delivery.status === 'delivered' && delivery.recipient_name ? (
            <View style={[styles.noteBox, { backgroundColor: theme.colors.successBg }]}>
              <Text style={[styles.noteLabel, { color: theme.colors.success }]}>Delivered to</Text>
              <Text style={styles.noteText}>{delivery.recipient_name}</Text>
            </View>
          ) : null}
        </SectionCard>

        <Text style={styles.footerMeta}>
          Last server update {timeAgo(delivery.updated_at)} · v{delivery.version}
          {syncedLog[delivery.id]
            ? ` · your report synced ${timeAgo(syncedLog[delivery.id].synced_at)}`
            : ''}
        </Text>
      </ScrollView>

      {/* primary actions */}
      {isPending ? (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.halfButton}>
            <Button
              label="Report Failed Delivery"
              variant="danger"
              onPress={() => navigation.navigate('FailDelivery', { deliveryId: delivery.id })}
            />
          </View>
          <View style={styles.halfButton}>
            <Button
              label="Mark as Delivered"
              onPress={() => navigation.navigate('CompleteDelivery', { deliveryId: delivery.id })}
            />
          </View>
        </View>
      ) : null}

      {action?.status === 'conflict' && conflictOpen ? (
        <ConflictDialog
          action={action}
          onDiscard={() => {
            setConflictOpen(false);
            void discardAction(delivery.id);
          }}
          onKeep={() => setConflictOpen(false)}
        />
      ) : null}
    </View>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Icon name={icon} size={16} color={theme.colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  noticeCard: {
    borderColor: theme.colors.warningBg,
    backgroundColor: '#FFFBEB',
  },
  conflictCard: {
    borderColor: '#E9D5FF',
    backgroundColor: '#FAF5FF',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 0.4,
  },
  customerName: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: theme.spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  amount: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  bodyText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  muted: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  noteBox: {
    backgroundColor: theme.colors.warningBg,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  noteLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  noteText: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  halfButton: {
    flex: 1,
  },
  noticeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: theme.spacing.sm,
  },
  noticeTextBlock: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.warning,
  },
  noticeBody: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 17,
    marginTop: 2,
  },
  footerMeta: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    backgroundColor: 'rgba(243,245,250,0.97)',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
