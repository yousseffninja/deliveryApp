import { useState } from 'react';
import {
  Alert,
  Image,
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
import { launchImageLibrary } from 'react-native-image-picker';
import { Button } from '../components/Button';
import { useAppStore } from '../store/useAppStore';
import { theme } from '../theme';
import { RouteStackParamList } from '../navigation/types';
import { formatMoney } from '../utils/format';

const MAX_NOTE_LENGTH = 240;

type Props = NativeStackScreenProps<RouteStackParamList, 'CompleteDelivery'>;

export function CompleteDeliveryScreen({ route, navigation }: Props) {
  const { deliveryId } = route.params;
  const delivery = useAppStore(s => s.deliveries[deliveryId]);
  const online = useAppStore(s => s.online);
  const completeDelivery = useAppStore(s => s.completeDelivery);

  const [recipientName, setRecipientName] = useState(delivery?.customer_name ?? '');
  const [note, setNote] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
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

  const pickPhoto = () => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.7, includeBase64: false, selectionLimit: 1 },
      response => {
        const uri = response.assets?.[0]?.uri;
        if (uri) {
          setPhotoUri(uri);
          setError(null);
        }
      },
    );
  };

  const submit = async () => {
    const trimmed = recipientName.trim();
    if (!trimmed) {
      setError('Recipient name is required to confirm a delivery.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await completeDelivery({
      deliveryId,
      recipientName: trimmed,
      note: note.trim() ? note.trim() : null,
      photoUri,
    });
    setSubmitting(false);
    if (!result.ok) {
      Alert.alert('Cannot confirm delivery', result.error ?? 'Unknown error');
      return;
    }
    Alert.alert(
      'Delivery saved on this device',
      online
        ? 'Your confirmation is being synced now.'
        : 'You are offline. The confirmation is safely queued and will sync automatically once you are back online.',
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
          <Text style={styles.amount}>{formatMoney(delivery.amount_due)}</Text>
        </View>

        <Text style={styles.label}>
          Recipient name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          value={recipientName}
          onChangeText={text => {
            setRecipientName(text);
            if (error) {
              setError(null);
            }
          }}
          placeholder="Who received the package?"
          placeholderTextColor={theme.colors.textMuted}
        />
        {error ? (
          <View style={styles.errorRow}>
            <Icon name="alert-circle" size={14} color={theme.colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <Text style={styles.hint}>Required by the platform for proof of delivery.</Text>
        )}

        <Text style={styles.label}>Delivery note</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={MAX_NOTE_LENGTH}
          placeholder="Optional — e.g. left with reception, gate code used…"
          placeholderTextColor={theme.colors.textMuted}
        />
        <Text style={styles.charCount}>
          {note.length}/{MAX_NOTE_LENGTH}
        </Text>

        <View style={styles.proofHeader}>
          <Text style={styles.label}>Photo proof</Text>
          <Text style={styles.optional}>Optional</Text>
        </View>
        {photoUri ? (
          <View style={styles.photoBlock}>
            <Image source={{ uri: photoUri }} style={styles.photo} />
            <TouchableOpacity onPress={() => setPhotoUri(null)}>
              <Text style={styles.removePhoto}>Remove photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.attachBox} onPress={pickPhoto}>
            <Icon name="camera-outline" size={26} color={theme.colors.primary} />
            <Text style={styles.attachText}>Attach photo proof</Text>
            <Text style={styles.attachHint}>
              A photo of the delivered package strongly reduces disputes.
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 12 }]}>
        <Button
          label="Confirm Delivery"
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
  muted: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  summaryCard: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primary,
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
  amount: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  required: {
    color: theme.colors.danger,
  },
  optional: {
    fontSize: 11,
    color: theme.colors.textMuted,
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
  inputError: {
    borderColor: theme.colors.danger,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.danger,
  },
  hint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 6,
  },
  charCount: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  proofHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
  },
  attachBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  attachText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: theme.spacing.sm,
  },
  attachHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  photoBlock: {
    alignItems: 'center',
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.slateBg,
  },
  removePhoto: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.danger,
    marginTop: theme.spacing.md,
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
