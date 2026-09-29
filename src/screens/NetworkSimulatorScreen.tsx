import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Button } from '../components/Button';
import { useAppStore } from '../store/useAppStore';
import { ThemeColors, spacing, radius } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { NetworkProfile } from '../types';

const PROFILES: { key: NetworkProfile; title: string; desc: string; icon: string }[] = [
  {
    key: 'online',
    title: 'Online',
    desc: 'Normal latency (350-600 ms), no injected failures.',
    icon: 'wifi',
  },
  {
    key: 'slow',
    title: 'Slow 3G',
    desc: '4-8 s responses with occasional stalls that force the client timeout.',
    icon: 'speedometer-outline',
  },
  {
    key: 'flaky',
    title: 'Flaky server',
    desc: '~45% of requests fail with 500s - exercises auto-retry with backoff.',
    icon: 'pulse-outline',
  },
  {
    key: 'offline',
    title: 'Airplane mode',
    desc: 'Every request fails as offline; updates queue locally until you switch back.',
    icon: 'airplane',
  },
];

const APPEARANCE_OPTIONS: { key: 'light' | 'dark' | 'system'; title: string; icon: string }[] = [
  { key: 'light', title: 'Light', icon: 'sunny-outline' },
  { key: 'dark', title: 'Dark', icon: 'moon-outline' },
  { key: 'system', title: 'System', icon: 'phone-portrait-outline' },
];

export function NetworkSimulatorScreen() {
  const deliveries = useAppStore(s => s.deliveries);
  const outbox = useAppStore(s => s.outbox);
  const simulator = useAppStore(s => s.simulator);
  const deviceConnected = useAppStore(s => s.deviceConnected);
  const online = useAppStore(s => s.online);
  const themeMode = useAppStore(s => s.themeMode);
  const setThemeMode = useAppStore(s => s.setThemeMode);
  const setNetworkProfile = useAppStore(s => s.setNetworkProfile);
  const armConflict = useAppStore(s => s.armConflict);
  const simulateServerChange = useAppStore(s => s.simulateServerChange);
  const resetMockServer = useAppStore(s => s.resetMockServer);

  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();

  const pending = Object.values(deliveries)
    .filter(d => d.status === 'pending')
    .sort((a, b) => a.id - b.id);

  const confirmReset = () => {
    Alert.alert(
      'Reset mock server?',
      'Restores the original delivery dataset and clears the duplicate-action registry.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => void resetMockServer(),
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
        }}
      >
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Mocked backend</Text>
          <Text style={styles.infoBody}>
            This build talks to a fully in-app mocked API. Use these controls to
            reproduce the required scenarios: slow responses, failed requests,
            connectivity loss, retry success and server-side changes. The
            profile is persisted, so you can go offline, kill the app, reopen
            it and watch the queue survive.
          </Text>
          <Text style={styles.infoStatus}>
            Device: {deviceConnected === false ? 'offline' : 'online'} ·
            Simulator: {simulator.profile} · Effective:{' '}
            <Text
              style={{
                color: online ? colors.success : colors.warning,
                fontWeight: '800',
              }}
            >
              {online ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.appearanceRow}>
          {APPEARANCE_OPTIONS.map(option => {
            const selected = themeMode === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[
                  styles.appearanceCard,
                  selected ? styles.appearanceSelected : null,
                ]}
                onPress={() => void setThemeMode(option.key)}
              >
                <Icon
                  name={option.icon}
                  size={20}
                  color={selected ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.appearanceTitle,
                    selected ? styles.appearanceTitleSelected : null,
                  ]}
                >
                  {option.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Network profile</Text>
        {PROFILES.map(profile => {
          const selected = simulator.profile === profile.key;
          return (
            <TouchableOpacity
              key={profile.key}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.profileCard, selected ? styles.profileSelected : null]}
              onPress={() => void setNetworkProfile(profile.key)}
            >
              <Icon
                name={profile.icon}
                size={20}
                color={selected ? colors.primary : colors.textMuted}
              />
              <View style={styles.profileTextBlock}>
                <Text
                  style={[
                    styles.profileTitle,
                    selected ? styles.profileTitleSelected : null,
                  ]}
                >
                  {profile.title}
                </Text>
                <Text style={styles.profileDesc}>{profile.desc}</Text>
              </View>
              {selected ? (
                <Icon
                  name="checkmark-circle"
                  size={20}
                  color={colors.primary}
                />
              ) : null}
            </TouchableOpacity>
          );
        })}

        <Text style={styles.sectionTitle}>Conflict scenarios</Text>
        <Text style={styles.sectionHint}>
          "Arm conflict" makes the NEXT submit for that delivery return 409 - the
          server applies a change just before your update lands. "Change now"
          cancels the delivery on the server immediately.
        </Text>
        {pending.length === 0 ? (
          <Text style={styles.emptyText}>
            No pending deliveries left - reset the mock server to replay scenarios.
          </Text>
        ) : null}
        {pending.map(delivery => {
          const armed = simulator.armedConflictDeliveryId === delivery.id;
          const queued = outbox[delivery.id] !== undefined;
          return (
            <View
              key={delivery.id}
              style={[styles.serverCard, armed ? styles.serverCardArmed : null]}
            >
              <View style={styles.serverHeader}>
                <Text style={styles.serverTitle}>{delivery.order_number}</Text>
                {armed ? <Text style={styles.armedBadge}>ARMED</Text> : null}
                {queued ? <Text style={styles.queuedBadge}>QUEUED</Text> : null}
              </View>
              <Text style={styles.serverCustomer}>{delivery.customer_name}</Text>
              <View style={styles.serverButtons}>
                <View style={styles.serverButton}>
                  <Button
                    label="Arm conflict"
                    variant={armed ? 'danger' : 'secondary'}
                    onPress={() => void armConflict(armed ? null : delivery.id)}
                  />
                </View>
                <View style={styles.serverButton}>
                  <Button
                    label="Change now"
                    variant="secondary"
                    onPress={() => {
                      Alert.alert(
                        'Change delivery on server',
                        `${delivery.order_number} will be cancelled on the server (version bump). The app discovers this on the next refresh or submit.`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Apply',
                            style: 'destructive',
                            onPress: () => void simulateServerChange(delivery.id),
                          },
                        ],
                      );
                    }}
                  />
                </View>
              </View>
            </View>
          );
        })}

        <Button
          label="Reset mock server data"
          variant="secondary"
          onPress={confirmReset}
        />
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
    },
    infoCard: {
      backgroundColor: c.primarySoft,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    infoTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: c.primary,
      marginBottom: 4,
    },
    infoBody: {
      fontSize: 13,
      color: c.text,
      lineHeight: 19,
    },
    infoStatus: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: spacing.md,
      fontWeight: '600',
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: spacing.sm,
      marginTop: spacing.sm,
    },
    sectionHint: {
      fontSize: 12,
      color: c.textMuted,
      lineHeight: 17,
      marginBottom: spacing.md,
    },
    appearanceRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    appearanceCard: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
    },
    appearanceSelected: {
      borderColor: c.primary,
      backgroundColor: c.selectedBg,
    },
    appearanceTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textMuted,
    },
    appearanceTitleSelected: {
      color: c.primary,
      fontWeight: '800',
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    profileSelected: {
      borderColor: c.primary,
      backgroundColor: c.selectedBg,
    },
    profileTextBlock: {
      flex: 1,
    },
    profileTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
    },
    profileTitleSelected: {
      color: c.primary,
      fontWeight: '800',
    },
    profileDesc: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 2,
      lineHeight: 16,
    },
    serverCard: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    serverCardArmed: {
      borderColor: c.warning,
      backgroundColor: c.warningBg,
    },
    serverHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    serverTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: c.text,
    },
    armedBadge: {
      fontSize: 9,
      fontWeight: '800',
      color: c.white,
      backgroundColor: c.warning,
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 2,
      overflow: 'hidden',
    },
    queuedBadge: {
      fontSize: 9,
      fontWeight: '800',
      color: c.info,
      backgroundColor: c.infoBg,
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 2,
      overflow: 'hidden',
    },
    serverCustomer: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 2,
      marginBottom: spacing.sm,
    },
    serverButtons: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    serverButton: {
      flex: 1,
    },
    emptyText: {
      fontSize: 13,
      color: c.textMuted,
      marginBottom: spacing.md,
    },
  });
