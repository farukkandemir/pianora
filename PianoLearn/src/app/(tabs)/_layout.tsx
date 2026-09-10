import { Tabs } from 'expo-router';

import { useTheme } from '@/theme';
import { Icon, type IconName } from '@/ui';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Library', icon: 'home' },
  { name: 'connect', title: 'Connect', icon: 'bluetooth' },
  { name: 'practice', title: 'Practice', icon: 'music' },
  { name: 'settings', title: 'Settings', icon: 'settings' },
];

/** Bottom tab bar. Web analogy: the app shell's primary nav. */
export default function TabsLayout() {
  const { colors, fonts } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1 },
        tabBarLabelStyle: { fontSize: 11, ...(fonts.medium ? { fontFamily: fonts.medium } : { fontWeight: '500' }) },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ focused }) => <Icon name={t.icon} size={22} tone={focused ? 'ink' : 'faint'} />,
          }}
        />
      ))}
    </Tabs>
  );
}
