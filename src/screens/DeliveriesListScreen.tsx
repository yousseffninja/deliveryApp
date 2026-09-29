import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeliveryCard } from '../components/DeliveryCard';
import { HeaderIconButton, ScreenHeader } from '../components/ScreenHeader';
import { LoadingView, StateView } from '../components/StateViews';
import { SyncBanner } from '../components/SyncBanner';
import { computeQueueCounts, computeSyncInfo, useAppStore } from '../store/useAppStore';
import { ThemeColors, spacing, radius } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n';
import type { TranslationKey } from '../i18n/translations';
import { DeliveryStatusFilter, RouteStackParamList } from '../navigation/types';
import { Delivery } from '../types';

type Props = NativeStackScreenProps<RouteStackParamList, 'Deliveries'>;

const FILTERS: { key: DeliveryStatusFilter; labelKey: TranslationKey }[] = [
  { key: 'all', labelKey: 'filter.all' },
  { key: 'pending', labelKey: 'filter.pending' },
  { key: 'delivered', labelKey: 'filter.delivered' },
  { key: 'failed', labelKey: 'filter.failed' },
];

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  delivered: 1,
  failed: 2,
  cancelled: 3,
};

export function DeliveriesListScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const styles = makeStyles(colors);

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
          title={t('route.title')}
          subtitle={t('route.loadingSubtitle')}
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
          title={t('route.title')}
          subtitle={t('route.connectionProblem')}
          right={
            <HeaderIconButton
              name="settings-outline"
              onPress={() => navigation.navigate('NetworkSimulator')}
            />
          }
        />
        <StateView
          icon="cloud-offline-outline"
          iconBg={colors.dangerBg}
          iconColor={colors.danger}
          title={t('route.errorTitle')}
          message={loadError ?? t('route.errorBody')}
          actionLabel={t('route.tryAgain')}
          onAction={() => void refresh()}
          hint={t('route.offlineHint')}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={t('route.title')}
        subtitle={t('route.subtitle', { count: counts.pending })}
        right={
          <HeaderIconButton
            name="settings-outline"
            color={online ? colors.text : colors.warning}
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
        <Text style={styles.cachedNote}>{t('route.cached')}</Text>
      ) : null}

      <FlatList
        data={list}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingBottom: insets.bottom + spacing.xl,
          paddingTop: spacing.sm,
        }}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.statsRow}>
              <StatCard
                label={t('stat.pending')}
                value={counts.pending}
                color={colors.primary}
              />
              <StatCard
                label={t('stat.delivered')}
                value={counts.delivered}
                color={colors.success}
              />
              <StatCard
                label={t('stat.failed')}
                value={counts.failed}
                color={colors.danger}
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
                    {t(f.labelKey)} ({counts[f.key]})
                  </Text>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          <StateView
            icon="cube-outline"
            iconBg={colors.primarySoft}
            iconColor={colors.primary}
            title={t('route.emptyTitle')}
            message={
              filter === 'all'
                ? t('route.emptyAll')
                : t('route.emptyFiltered', {
                    filter: t(`filter.${filter}` as TranslationKey),
                  })
            }
            actionLabel={t('route.refresh')}
            onAction={() => void refresh()}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={loading && hasData}
            onRefresh={() => void refresh()}
            tintColor={colors.primary}
            colors={[colors.primary]}
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
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
    },
    listHeader: {
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
      gap: spacing.md,
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.md,
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
    filtersRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    filterChip: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textMuted,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      overflow: 'hidden',
    },
    filterChipActive: {
      color: c.white,
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    cachedNote: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.sm,
      fontSize: 12,
      fontWeight: '600',
      color: c.warning,
    },
  });
