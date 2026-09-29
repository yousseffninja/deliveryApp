import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Delivery } from '../types';
import { formatMoney } from '../utils/format';
import { DeliverySyncInfo } from '../store/useAppStore';
import { DeliveryStatusChip, PaymentChip, SyncStatusChip } from './StatusChips';
import { theme } from '../theme';

interface DeliveryCardProps {
  delivery: Delivery;
  syncInfo: DeliverySyncInfo;
  onPress: () => void;
}

export function DeliveryCard({ delivery, syncInfo, onPress }: DeliveryCardProps) {
  const initials = delivery.customer_name
    .split(' ')
    .map(part => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View style={styles.idBlock}>
          <Text style={styles.orderNumber}>{delivery.order_number}</Text>
          <Text style={styles.customer}>{delivery.customer_name}</Text>
        </View>
        <View style={styles.amountBlock}>
          <Text style={styles.amount}>{formatMoney(delivery.amount_due)}</Text>
          <PaymentChip method={delivery.payment_method} />
        </View>
      </View>

      <View style={styles.addressRow}>
        <Icon name="location-outline" size={13} color={theme.colors.textMuted} />
        <Text style={styles.address} numberOfLines={1}>
          {delivery.address}
        </Text>
      </View>

      <View style={styles.chipRow}>
        <DeliveryStatusChip status={syncInfo.deliveryStatus} />
        <SyncStatusChip syncStatus={syncInfo.syncStatus} />
        <View style={styles.chevron}>
          <Icon name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  idBlock: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  customer: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 2,
  },
  amountBlock: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amount: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: theme.spacing.sm,
  },
  address: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: theme.spacing.md,
  },
  chevron: {
    marginLeft: 'auto',
  },
  initials: {},
});
