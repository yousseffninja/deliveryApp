import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ThemeColors, spacing } from '../theme';
import { useTheme } from '../theme/ThemeContext';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: ButtonProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const colorsByVariant = {
    primary: { bg: colors.primary, fg: colors.white },
    danger: { bg: colors.danger, fg: colors.white },
    secondary: { bg: colors.primarySoft, fg: colors.primary },
  }[variant];
  const isDisabled = disabled === true || loading === true;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: colorsByVariant.bg,
          opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colorsByVariant.fg} />
      ) : null}
      <Text style={[styles.label, { color: colorsByVariant.fg }]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: spacing.lg,
      marginVertical: spacing.xs,
    },
    label: {
      fontSize: 15,
      fontWeight: '700',
    },
  });
