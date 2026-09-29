import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Button } from '../components/Button';
import { useAppStore } from '../store/useAppStore';
import { theme } from '../theme';
import { RouteStackParamList } from '../navigation/types';
import { FAILURE_REASON_LABELS } from '../utils/format';
import { FailureReason } from '../types';

const REASONS = Object.entries(FAILURE_REASON_LABELS) as [FailureReason, string][];

type Props = NativeStackScreenProps<RouteStackParamList, 'FailDelivery'>;

export function FailDeliveryScreen({ route, navigation }: Props) {
  const { deliveryId } = route.params;
  const delivery = useAppStore(s => s.deliveries[deliveryId]);
  const online = useAppStore(s => s.online);
  const failDelivery = useAppStore(s => s.failDelivery);

  const [reason, setReason] = useState<FailureReason | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  if (!delivery) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Delivery not found.</Text>
      </View>
    );
  }

  const submit = async () => {
    if (!reason) {
      setError('Select a failure reason to report this delivery.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await failDelivery({
      deliveryId,
      reason,
      note: note.trim() ? note.trim() : null,
    });
    setSubmitting(false);
    if (!result.ok) {
      Alert.alert('Cannot report failure', result.error ?? 'Unknown error');
      return;
    }
    Alert.alert(
      'Report saved on this device',
      online
        ? 'Your report is being synced now.'
        : 'You are offline. The report is safely queued and will sync automatically once you are back online.',
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: insets.bottom + 100,
        }}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.orderNumber}>{delivery.order_number}</Text>
          <Text style={styles.customer}>{delivery.customer_name}</Text>
          <Text style={styles.address} numberOfLines={1}>
            {delivery.address}
          </Text>
        </View>

        <Text style={styles.label}>
          Failure reason <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.reasons}>
          {REASONS.map(([value, label]) => {
            const selected = reason === value;
            return (
              <TouchableOpacity
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.reason, selected ? styles.reasonSelected : null]}
                onPress={() => {
                  setReason(value);
                  if (error) {
                    setError(null);
                  }
                }}
              >
                <Icon
                  name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={selected ? theme.colors.danger : theme.colors.textMuted}
                />
                <Text
                  style={[styles.reasonText, selected ? styles.reasonTextSelected : null]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {error ? (
          <View style={styles.errorRow}>
            <Icon name="alert-circle" size={14} color={theme.colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Note</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={240}
          placeholder="Optional — e.g. called twice, no answer…"
          placeholderTextColor={theme.colors.textMuted}
        />
      </ScrollView>

      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 12 }]}>
        <Button
          label="Report Failed Delivery"
          variant="danger"
          onPress={() => void submit()}
          loading={submitting}
          disabled={submitting}
        />
        <Text style={styles.syncHint}>
          {online
            ? 'Saved instantly and synced to the server.'
            : 'Offline — saved on device, synced automatically later.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  center: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    backgroundColor: theme.colors.dangerBg,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.danger,
    letterSpacing: 0.4,
  },
  customer: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 2,
  },
  address: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  required: {
    color: theme.colors.danger,
  },
  reasons: {
    gap: theme.spacing.sm,
  },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
  },
  reasonSelected: {
    borderColor: theme.colors.danger,
    backgroundColor: '#FFF7F7',
  },
  reasonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  reasonTextSelected: {
    fontWeight: '800',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.danger,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  muted: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    backgroundColor: 'rgba(243,245,250,0.97)',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  syncHint: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
});
