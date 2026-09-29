import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { theme } from '../theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

/** In-app header for screens that hide the native stack header. */
export function ScreenHeader({ title, subtitle, right }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        <View style={styles.badge}>
          <Icon name="navigate" size={14} color="#FFFFFF" />
          <Text style={styles.badgeText}>DriverTrack</Text>
        </View>
        {right}
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

interface IconButtonProps {
  name: string;
  onPress: () => void;
  color?: string;
}

export function HeaderIconButton({ name, onPress, color }: IconButtonProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      style={styles.iconButton}
      hitSlop={8}
    >
      <Icon name={name} size={20} color={color ?? theme.colors.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.bg,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
