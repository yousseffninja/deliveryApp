import { StyleSheet, Text, View } from 'react-native';
import { DeliveryStatus } from '../types';
import { EffectiveSyncStatus } from '../store/useAppStore';
import { theme } from '../theme';

interface ChipStyle {
  bg: string;
  fg: string;
}

const chip = (bg: string, fg: string): ChipStyle => ({ bg, fg });

export const DELIVERY_STATUS_META: Record<
  DeliveryStatus,
  { label: string; style: ChipStyle }
> = {
  pending: { label: 'Pending', style: chip(theme.colors.slateBg, theme.colors.slate) },
  delivered: { label: 'Delivered', style: chip(theme.colors.successBg, theme.colors.success) },
  failed: { label: 'Failed', style: chip(theme.colors.dangerBg, theme.colors.danger) },
  cancelled: { label: 'Cancelled', style: chip('#F1F5F9', '#94A3B8') },
};

export const SYNC_STATUS_META: Record<
  Exclude<EffectiveSyncStatus, null>,
  { label: string; style: ChipStyle }
> = {
  waiting: { label: 'Waiting to sync', style: chip(theme.colors.warningBg, theme.colors.warning) },
  syncing: { label: 'Syncing…', style: chip(theme.colors.infoBg, theme.colors.info) },
  failed: { label: 'Failed to sync', style: chip(theme.colors.dangerBg, theme.colors.danger) },
  conflict: { label: 'Conflict', style: chip('#F3E8FF', '#7E22CE') },
  synced: { label: 'Synced', style: chip(theme.colors.successBg, theme.colors.success) },
};

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  chipOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

interface StatusChipProps {
  label: string;
  bg: string;
  fg: string;
  outline?: boolean;
}

function Chip({ label, bg, fg, outline }: StatusChipProps) {
  return (
    <View style={[styles.chip, outline ? styles.chipOutline : null, { backgroundColor: bg, borderColor: fg }]}>
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function DeliveryStatusChip({ status }: { status: DeliveryStatus }) {
  const meta = DELIVERY_STATUS_META[status] ?? DELIVERY_STATUS_META.pending;
  return <Chip label={meta.label} bg={meta.style.bg} fg={meta.style.fg} />;
}

export function SyncStatusChip({ syncStatus }: { syncStatus: EffectiveSyncStatus }) {
  if (!syncStatus) {
    return null;
  }
  const meta = SYNC_STATUS_META[syncStatus];
  if (!meta) {
    return null;
  }
  return <Chip label={meta.label} bg={meta.style.bg} fg={meta.style.fg} />;
}

export function PaymentChip({ method }: { method: 'cash' | 'card' }) {
  const cash = method === 'cash';
  return (
    <Chip
      label={cash ? 'Cash on delivery' : 'Card / online'}
      bg={cash ? theme.colors.primarySoft : theme.colors.slateBg}
      fg={cash ? theme.colors.primary : theme.colors.slate}
    />
  );
}
