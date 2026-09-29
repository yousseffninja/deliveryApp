import { StyleSheet, Text, View } from 'react-native';
import { DeliveryStatus } from '../types';
import { EffectiveSyncStatus } from '../store/useAppStore';
import { ThemeColors } from '../theme';
import { useTheme } from '../theme/ThemeContext';

interface ChipStyle {
  bg: string;
  fg: string;
}

const chip = (bg: string, fg: string): ChipStyle => ({ bg, fg });

export const deliveryStatusMeta = (
  status: DeliveryStatus,
  c: ThemeColors,
): { label: string; style: ChipStyle } => {
  switch (status) {
    case 'delivered':
      return { label: 'Delivered', style: chip(c.successBg, c.success) };
    case 'failed':
      return { label: 'Failed', style: chip(c.dangerBg, c.danger) };
    case 'cancelled':
      return { label: 'Cancelled', style: chip(c.slateBg, c.slate) };
    default:
      return { label: 'Pending', style: chip(c.slateBg, c.slate) };
  }
};

export const syncStatusMeta = (
  syncStatus: Exclude<EffectiveSyncStatus, null>,
  c: ThemeColors,
): { label: string; style: ChipStyle } => {
  switch (syncStatus) {
    case 'waiting':
      return {
        label: 'Waiting to sync',
        style: chip(c.warningBg, c.warning),
      };
    case 'syncing':
      return { label: 'Syncing…', style: chip(c.infoBg, c.info) };
    case 'failed':
      return { label: 'Failed to sync', style: chip(c.dangerBg, c.danger) };
    case 'conflict':
      return { label: 'Conflict', style: chip(c.conflictBg, c.conflict) };
    default:
      return { label: 'Synced', style: chip(c.successBg, c.success) };
  }
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
      label={cash ? 'Cash on delivery' : 'Card / online'}
      bg={cash ? colors.primarySoft : colors.slateBg}
      fg={cash ? colors.primary : colors.slate}
    />
  );
}
