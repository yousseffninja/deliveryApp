import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

/** Placeholder — the delivered/failed forms land in feat/6-delivery-actions. */
export function CompleteDeliveryScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Mark as Delivered</Text>
      <Text style={styles.body}>Form arrives in feat/6-delivery-actions.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
