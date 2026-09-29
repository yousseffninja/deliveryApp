import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Button } from './Button';
import { theme } from '../theme';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: theme.spacing.xl,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.xl,
  },
  hint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
});

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

export function LoadingView({ label = 'Loading deliveries…' }: { label?: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{label}</Text>
    </View>
  );
}
