import { useEffect } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Button } from '../components/Button';
import { useAppStore } from '../store/useAppStore';
import { ThemeColors, spacing, radius } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useI18n } from '../i18n';
import type { TranslationKey } from '../i18n/translations';
import type { Locale } from '../i18n';
import { NetworkProfile } from '../types';

const PROFILES: {
  key: NetworkProfile;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  icon: string;
}[] = [
  {
    key: 'online',
    titleKey: 'profile.online.title',
    descKey: 'profile.online.desc',
    icon: 'wifi',
  },
  {
    key: 'slow',
    titleKey: 'profile.slow.title',
    descKey: 'profile.slow.desc',
    icon: 'speedometer-outline',
  },
  {
    key: 'flaky',
    titleKey: 'profile.flaky.title',
    descKey: 'profile.flaky.desc',
    icon: 'pulse-outline',
  },
  {
    key: 'offline',
    titleKey: 'profile.offline.title',
    descKey: 'profile.offline.desc',
    icon: 'airplane',
  },
];

const APPEARANCE_OPTIONS: {
  key: 'light' | 'dark' | 'system';
  labelKey: TranslationKey;
  icon: string;
}[] = [
  { key: 'light', labelKey: 'appearance.light', icon: 'sunny-outline' },
  { key: 'dark', labelKey: 'appearance.dark', icon: 'moon-outline' },
  { key: 'system', labelKey: 'appearance.system', icon: 'phone-portrait-outline' },
];

const LANGUAGES: { key: Locale; labelKey: TranslationKey }[] = [
  { key: 'en', labelKey: 'lang.english' },
  { key: 'ar', labelKey: 'lang.arabic' },
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

  const { t: translate, locale, changeLocale } = useI18n();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NavigationProp<Record<string, object | undefined>>>();

  useEffect(() => {
    navigation.setOptions?.({ title: translate('sim.title') });
  }, [navigation, translate, locale]);

  const changeLanguage = (next: Locale) => changeLocale(next);

  const pending = Object.values(deliveries)
    .filter(d => d.status === 'pending')
    .sort((a, b) => a.id - b.id);

  const confirmReset = () => {
    Alert.alert(translate('sim.resetTitle'), translate('sim.resetBody'), [
      { text: translate('common.cancel'), style: 'cancel' },
      {
        text: translate('common.apply'),
        style: 'destructive',
        onPress: () => void resetMockServer(),
      },
    ]);
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
          <Text style={styles.infoTitle}>{translate('sim.infoTitle')}</Text>
          <Text style={styles.infoBody}>{translate('sim.infoBody')}</Text>
          <Text style={styles.infoStatus}>
            {translate('sim.device', {
              state:
                deviceConnected === false
                  ? translate('sim.offlineLabel')
                  : translate('sim.onlineLabel'),
            })}{' '}
            · {translate('sim.profile', { profile: simulator.profile })} ·{' '}
            {translate('sim.effective')}:{' '}
            <Text
              style={{
                color: online ? colors.success : colors.warning,
                fontWeight: '800',
              }}
            >
              {online
                ? translate('sim.onlineLabel').toUpperCase()
                : translate('sim.offlineLabel').toUpperCase()}
            </Text>
          </Text>
        </View>

        <Text style={styles.sectionTitle}>{translate('sim.appearance')}</Text>
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
                  {translate(option.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>{translate('sim.language')}</Text>
        <View style={styles.appearanceRow}>
          {LANGUAGES.map(option => {
            const selected = locale === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[
                  styles.appearanceCard,
                  selected ? styles.appearanceSelected : null,
                ]}
                onPress={() => changeLanguage(option.key)}
              >
                <Icon
                  name="language-outline"
                  size={20}
                  color={selected ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.appearanceTitle,
                    selected ? styles.appearanceTitleSelected : null,
                  ]}
                >
                  {translate(option.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>{translate('sim.networkProfile')}</Text>
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
                  {translate(profile.titleKey)}
                </Text>
                <Text style={styles.profileDesc}>
                  {translate(profile.descKey)}
                </Text>
              </View>
              {selected ? (
                <Icon name="checkmark-circle" size={20} color={colors.primary} />
              ) : null}
            </TouchableOpacity>
          );
        })}

        <Text style={styles.sectionTitle}>
          {translate('sim.conflictScenarios')}
        </Text>
        <Text style={styles.sectionHint}>{translate('sim.conflictHint')}</Text>
        {pending.length === 0 ? (
          <Text style={styles.emptyText}>{translate('sim.noPending')}</Text>
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
                    label={translate('sim.arm')}
                    variant={armed ? 'danger' : 'secondary'}
                    onPress={() => void armConflict(armed ? null : delivery.id)}
                  />
                </View>
                <View style={styles.serverButton}>
                  <Button
                    label={translate('sim.changeNow')}
                    variant="secondary"
                    onPress={() => {
                      Alert.alert(
                        translate('sim.changeTitle'),
                        translate('sim.changeBody', { order: delivery.order_number }),
                        [
                          { text: translate('common.cancel'), style: 'cancel' },
                          {
                            text: translate('common.apply'),
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
          label={translate('sim.reset')}
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
