import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function icon(name: IconName, focused: boolean) {
  return <Ionicons name={focused ? name : `${name}-outline` as IconName} size={24} color={focused ? colors.primary : colors.muted} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 58,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => icon('home', focused),
        }}
      />
      <Tabs.Screen
        name="vehicle"
        options={{
          title: 'Vehicle',
          tabBarIcon: ({ focused }) => icon('car', focused),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: 'Plans',
          tabBarIcon: ({ focused }) => icon('map', focused),
        }}
      />
      <Tabs.Screen
        name="trends"
        options={{
          title: 'Trends',
          tabBarIcon: ({ focused }) => icon('trending-up', focused),
        }}
      />
    </Tabs>
  );
}
