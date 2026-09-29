import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import { DeliveryDetailsScreen } from '../screens/DeliveryDetailsScreen';
import { DeliveriesListScreen } from '../screens/DeliveriesListScreen';
import { CompleteDeliveryScreen } from '../screens/CompleteDeliveryScreen';
import { FailDeliveryScreen } from '../screens/FailDeliveryScreen';
import { NetworkSimulatorScreen } from '../screens/NetworkSimulatorScreen';
import { SyncQueueScreen } from '../screens/SyncQueueScreen';
import { RouteStackParamList, RootTabParamList } from './types';

const RouteStack = createNativeStackNavigator<RouteStackParamList>();

function RouteStackNavigator() {
  const { colors } = useTheme();
  return (
    <RouteStack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700', color: colors.text },
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.card },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <RouteStack.Screen
        name="Deliveries"
        component={DeliveriesListScreen}
        options={{ headerShown: false }}
      />
      <RouteStack.Screen
        name="DeliveryDetails"
        component={DeliveryDetailsScreen}
        options={{ title: 'Delivery Details' }}
      />
      <RouteStack.Screen
        name="CompleteDelivery"
        component={CompleteDeliveryScreen}
        options={{ title: 'Mark as Delivered' }}
      />
      <RouteStack.Screen
        name="FailDelivery"
        component={FailDeliveryScreen}
        options={{ title: 'Report Failed Delivery' }}
      />
      <RouteStack.Screen
        name="NetworkSimulator"
        component={NetworkSimulatorScreen}
        options={{ title: 'Network Simulator' }}
      />
    </RouteStack.Navigator>
  );
}

const Tabs = createBottomTabNavigator<RootTabParamList>();

export function RootNavigator() {
  const queueCount = useAppStore(s => Object.keys(s.outbox).length);
  const { colors } = useTheme();
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: 60,
          paddingBottom: 6,
          paddingTop: 4,
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ color, size }) => {
          const name =
            route.name === 'Route' ? 'map-outline' : 'cloud-upload-outline';
          return <Icon name={name} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="Route" component={RouteStackNavigator} />
      <Tabs.Screen
        name="SyncQueue"
        component={SyncQueueScreen}
        options={{
          tabBarBadge: queueCount > 0 ? queueCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.danger,
            color: colors.white,
            fontSize: 10,
          },
        }}
      />
    </Tabs.Navigator>
  );
}
