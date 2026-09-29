import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeliveryCard } from '../components/DeliveryCard';
import { HeaderIconButton, ScreenHeader } from '../components/ScreenHeader';
import { LoadingView, StateView } from '../components/StateViews';
import { SyncBanner } from '../components/SyncBanner';
import { computeQueueCounts, computeSyncInfo, useAppStore } from '../store/useAppStore';
import { theme } from '../theme';
import { DeliveryStatusFilter, RouteStackParamList } from '../navigation/types';
import { Delivery } from '../types';

type Props = NativeStackScreenProps<RouteStackParamList, 'Deliveries'>;

const FILTERS: { key: DeliveryStatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'failed', label: 'Failed' },
];

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  delivered: 1,
  failed: 2,
  cancelled: 3,
};

export function DeliveriesListScreen({ navigation }: Props) {
  const deliveries = useAppStore(s => s.deliveries);
  const outbox = useAppStore(s => s.outbox);
  const syncedLog = useAppStore(s => s.syncedLog);
  const loading = useAppStore(s => s.loading);
  const loadError = useAppStore(s => s.loadError);
  const showingCached = useAppStore(s => s.showingCached);
  const online = useAppStore(s => s.online);
  const refresh = useAppStore(s => s.refresh);

  const [filter, setFilter] = useState<DeliveryStatusFilter>('all');
  const insets = useSafeAreaInsets();

  const counts = useMemo(() => {
    const all = Object.values(deliveries);
    return {
      all: all.length,
      pending: all.filter(d => d.status === 'pending').length,
      delivered: all.filter(d => d.status === 'delivered').length,
      failed: all.filter(d => d.status === 'failed' || d.status === 'cancelled')
        .length,
    };
  }, [deliveries]);

  const list = useMemo(() => {
    const all = Object.values(deliveries);
    const filtered =
      filter === 'all' ? all : all.filter(d => d.status === filter);
    return filtered.sort(
      (a, b) =>
        (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) || a.id - b.id,
    );
  }, [deliveries, filter]);

  const queue = useMemo(
    () => computeQueueCounts(outbox, syncedLog),
    [outbox, syncedLog],
  );

  const hasData = Object.keys(deliveries).length > 0;
  const firstLoad = loading && !hasData;
  const hardError = loadError !== null && !hasData;

  const renderItem = ({ item }: { item: Delivery }) => (
    <DeliveryCard
      delivery={item}
      syncInfo={computeSyncInfo(outbox, syncedLog, item)}
      onPress={() => navigation.navigate('DeliveryDetails', { deliveryId: item.id })}
    />
  );

  if (firstLoad) {
    return (
      <View style={styles.screen}>
        <ScreenHeader
          title="My Deliveries"
          subtitle="Loading your route…"
          right={
            <HeaderIconButton
              name="settings-outline"
              onPress={() => navigation.navigate('NetworkSimulator')}
            />
          }
        />
        <LoadingView />
      </View>
    );
  }

  if (hardError) {
    return (
      <View style={styles.screen}>
        <ScreenHeader
          title="My Deliveries"
          subtitle="Connection problem"
          right={
            <HeaderIconButton
              name="settings-outline"
              onPress={() => navigation.navigate('NetworkSimulator')}
            />
          }
        />
        <StateView
          icon="cloud-offline-outline"
          iconBg={theme.colors.dangerBg}
          iconColor={theme.colors.danger}
          title="Can't load deliveries"
          message={
            loadError ??
            'Something went wrong. Check your connection and try again.'
          }
          actionLabel="Try again"
          onAction={() => void refresh()}
          hint="Any delivery you confirm while offline is stored safely on this device."
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="My Deliveries"
        subtitle={`Today · ${counts.pending} pending stop${counts.pending === 1 ? '' : 's'}`}
        right={
          <HeaderIconButton
            name="settings-outline"
            color={online ? theme.colors.text : theme.colors.warning}
            onPress={() => navigation.navigate('NetworkSimulator')}
          />
        }
      />

      <SyncBanner
        online={online}
        queueCount={queue.total}
        conflictCount={queue.conflict}
      />

      {showingCached ? (
        <Text style={styles.cachedNote}>
          Showing cached data — refresh failed, retrying is safe.
        </Text>
      ) : null}

      <FlatList
        data={list}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingBottom: insets.bottom + theme.spacing.xl,
          paddingTop: theme.spacing.sm,
        }}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.statsRow}>
              <StatCard
                label="Pending"
                value={counts.pending}
                color={theme.colors.primary}
              />
              <StatCard
                label="Delivered"
                value={counts.delivered}
                color={theme.colors.success}
              />
              <StatCard
                label="Failed"
                value={counts.failed}
                color={theme.colors.danger}
              />
            </View>
            <View style={styles.filtersRow}>
              {FILTERS.map(f => {
                const active = filter === f.key;
                return (
                  <Text
                    key={f.key}
                    onPress={() => setFilter(f.key)}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                  >
                    {f.label} ({counts[f.key]})
                  </Text>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          <StateView
            icon="cube-outline"
            iconBg={theme.colors.primarySoft}
            iconColor={theme.colors.primary}
            title="No deliveries here"
            message={
              filter === 'all'
                ? 'New deliveries appear here. Pull down or tap refresh to check again.'
                : `No ${filter} deliveries right now.`
            }
            actionLabel="Refresh deliveries"
            onAction={() => void refresh()}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={loading && hasData}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      />
    </View>
  );
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  listHeader: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
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
  filtersRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  filterChip: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  filterChipActive: {
    color: '#FFFFFF',
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  cachedNote: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.warning,
  },
});
