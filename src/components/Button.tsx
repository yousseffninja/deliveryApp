import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { theme } from '../theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
}

const VARIANTS = {
  primary: { bg: theme.colors.primary, fg: '#FFFFFF' },
  danger: { bg: theme.colors.danger, fg: '#FFFFFF' },
  secondary: { bg: theme.colors.primarySoft, fg: theme.colors.primary },
} as const;

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
}: ButtonProps) {
  const colors = VARIANTS[variant];
  const isDisabled = disabled === true || loading === true;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: colors.bg, opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={colors.fg} /> : null}
      <Text style={[styles.label, { color: colors.fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.xs,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
});
