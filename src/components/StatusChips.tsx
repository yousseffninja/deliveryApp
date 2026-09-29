import { StyleSheet, Text, View } from 'react-native';
import { DeliveryStatus } from '../types';
import { EffectiveSyncStatus } from '../store/useAppStore';
import { ThemeColors } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { t } from '../i18n';
import type { TranslationKey } from '../i18n/translations';

interface ChipStyle {
  bg: string;
  fg: string;
}

const chip = (bg: string, fg: string): ChipStyle => ({ bg, fg });

export const deliveryStatusMeta = (
  status: DeliveryStatus,
  c: ThemeColors,
): { label: string; style: ChipStyle } => {
  const labels: Record<DeliveryStatus, TranslationKey> = {
    pending: 'status.pending',
    delivered: 'status.delivered',
    failed: 'status.failed',
    cancelled: 'status.cancelled',
  };
  const style =
    status === 'delivered'
      ? chip(c.successBg, c.success)
      : status === 'failed'
        ? chip(c.dangerBg, c.danger)
        : chip(c.slateBg, c.slate);
  return { label: t(labels[status]), style };
};

export const syncStatusMeta = (
  syncStatus: Exclude<EffectiveSyncStatus, null>,
  c: ThemeColors,
): { label: string; style: ChipStyle } => {
  const labels: Record<Exclude<EffectiveSyncStatus, null>, TranslationKey> = {
    waiting: 'sync.waiting',
    syncing: 'sync.syncing',
    failed: 'sync.failed',
    conflict: 'sync.conflict',
    synced: 'sync.synced',
  };
  const style =
    syncStatus === 'waiting'
      ? chip(c.warningBg, c.warning)
      : syncStatus === 'syncing'
        ? chip(c.infoBg, c.info)
        : syncStatus === 'failed'
          ? chip(c.dangerBg, c.danger)
          : syncStatus === 'conflict'
            ? chip(c.conflictBg, c.conflict)
            : chip(c.successBg, c.success);
  return { label: t(labels[syncStatus]), style };
};

const useStyles = () => {
  const { colors } = useTheme();
  return StyleSheet.create({
    chip: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 3,
      alignSelf: 'flex-start',
    },
    chipText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
  });
};

interface StatusChipProps {
  label: string;
  bg: string;
  fg: string;
}

function Chip({ label, bg, fg }: StatusChipProps) {
  const styles = useStyles();
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function DeliveryStatusChip({ status }: { status: DeliveryStatus }) {
  const { colors } = useTheme();
  const meta = deliveryStatusMeta(status, colors);
  return <Chip label={meta.label} bg={meta.style.bg} fg={meta.style.fg} />;
}

export function SyncStatusChip({ syncStatus }: { syncStatus: EffectiveSyncStatus }) {
  const { colors } = useTheme();
  if (!syncStatus) {
    return null;
  }
  const meta = syncStatusMeta(syncStatus, colors);
  return <Chip label={meta.label} bg={meta.style.bg} fg={meta.style.fg} />;
}

export function PaymentChip({ method }: { method: 'cash' | 'card' }) {
  const { colors } = useTheme();
  const cash = method === 'cash';
  return (
    <Chip
      label={t(cash ? 'payment.cash' : 'payment.card')}
      bg={cash ? colors.primarySoft : colors.slateBg}
      fg={cash ? colors.primary : colors.slate}
    />
  );
}
