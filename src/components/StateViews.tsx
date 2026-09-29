import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Button } from './Button';
import { ThemeColors, spacing } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { t } from '../i18n';

interface StateViewProps {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  hint?: string;
}

export function StateView({
  icon,
  iconBg,
  iconColor,
  title,
  message,
  actionLabel,
  onAction,
  hint,
}: StateViewProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <Icon name={icon} size={36} color={iconColor} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} />
      ) : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function LoadingView({ label }: { label?: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{label ?? t('common.loading')}</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: 48,
      paddingHorizontal: spacing.xl,
    },
    iconCircle: {
      width: 84,
      height: 84,
      borderRadius: 42,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: c.text,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    message: {
      fontSize: 14,
      color: c.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: spacing.xl,
    },
    hint: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: spacing.md,
      textAlign: 'center',
    },
  });
