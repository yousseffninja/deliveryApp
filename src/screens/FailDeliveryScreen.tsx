import { useEffect, useState } from 'react';
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
import { ThemeColors, spacing, radius } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n';
import type { TranslationKey } from '../i18n/translations';
import { RouteStackParamList } from '../navigation/types';
import { FAILURE_REASONS } from '../utils/format';
import { FailureReason } from '../types';

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

  const { t: translate, locale } = useI18n();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    navigation.setOptions({ title: translate('fail.navTitle') });
  }, [navigation, translate, locale]);

  if (!delivery) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.muted}>{translate('common.notFound')}</Text>
      </View>
    );
  }

  const submit = async () => {
    if (!reason) {
      setError(translate('fail.reasonRequired'));
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
      Alert.alert(
        translate('error.cannotReport'),
        result.error ? translate(result.error as never) : translate('error.unknown'),
      );
      return;
    }
    Alert.alert(
      translate('fail.savedTitle'),
      online ? translate('fail.syncing') : translate('fail.queued'),
      [{ text: translate('common.ok'), onPress: () => navigation.goBack() }],
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
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
          {translate('fail.reason')} <Text style={styles.required}>*</Text>
        </Text>
        <View style={styles.reasons}>
          {FAILURE_REASONS.map(value => {
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
                  color={selected ? colors.danger : colors.textMuted}
                />
                <Text
                  style={[
                    styles.reasonText,
                    selected ? styles.reasonTextSelected : null,
                  ]}
                >
                  {translate(`reason.${value}` as TranslationKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {error ? (
          <View style={styles.errorRow}>
            <Icon name="alert-circle" size={14} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>{translate('fail.note')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={240}
          placeholder={translate('fail.notePlaceholder')}
          placeholderTextColor={colors.textMuted}
        />
      </ScrollView>

      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 12 }]}>
        <Button
          label={translate('details.reportFailed')}
          variant="danger"
          onPress={() => void submit()}
          loading={submitting}
          disabled={submitting}
        />
        <Text style={styles.syncHint}>
          {online ? translate('fail.hintOnline') : translate('fail.hintOffline')}
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    muted: {
      fontSize: 13,
      color: c.textMuted,
    },
    summaryCard: {
      backgroundColor: c.dangerBg,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    orderNumber: {
      fontSize: 12,
      fontWeight: '800',
      color: c.danger,
      letterSpacing: 0.4,
    },
    customer: {
      fontSize: 18,
      fontWeight: '800',
      color: c.text,
      marginTop: 2,
    },
    address: {
      fontSize: 13,
      color: c.textMuted,
      marginTop: 2,
    },
    label: {
      fontSize: 12,
      fontWeight: '800',
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: spacing.sm,
    },
    required: {
      color: c.danger,
    },
    reasons: {
      gap: spacing.sm,
    },
    reason: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
    },
    reasonSelected: {
      borderColor: c.danger,
      backgroundColor: c.dangerBg,
    },
    reasonText: {
      fontSize: 14,
      fontWeight: '600',
      color: c.text,
      flex: 1,
    },
    reasonTextSelected: {
      fontWeight: '800',
    },
    errorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: spacing.sm,
    },
    errorText: {
      fontSize: 12,
      fontWeight: '600',
      color: c.danger,
    },
    input: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      fontSize: 15,
      color: c.text,
      textAlign: 'left',
    },
    textArea: {
      minHeight: 88,
      textAlignVertical: 'top',
    },
    actionBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      backgroundColor: c.actionBarBg,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    syncHint: {
      fontSize: 11,
      color: c.textMuted,
      textAlign: 'center',
      marginTop: 6,
    },
  });
