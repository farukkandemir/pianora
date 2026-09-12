import { Tabs, useNavigation, type NativeStackNavigationProp } from 'expo-router';
import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { useTheme } from '@/theme';
import { Icon, useCurtain, type IconName } from '@/ui';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Library', icon: 'home' },
  { name: 'connect', title: 'Connect', icon: 'bluetooth' },
  { name: 'browse', title: 'Browse', icon: 'compass' },
  { name: 'settings', title: 'Settings', icon: 'settings' },
];

type RootStackNavigation = NativeStackNavigationProp<Record<string, object | undefined>>;

/** Bottom tab bar. Web analogy: the app shell's primary nav. */
export default function TabsLayout() {
  const { colors, fonts } = useTheme();
  useLowerCurtainWhenBackInPortrait();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1 },
        sceneStyle: { backgroundColor: colors.bg },
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

/**
 * The Library raises the curtain before opening the landscape practice
 * modal. Lower it only once the tab shell is on screen again (the modal has
 * finished dismissing) and the window is portrait, so the rotation back is
 * never visible.
 */
function useLowerCurtainWhenBackInPortrait() {
  const navigation = useNavigation<RootStackNavigation>();
  const { width, height } = useWindowDimensions();
  const curtain = useCurtain();
  const [appearances, setAppearances] = useState(0);

  useEffect(
    () =>
      navigation.addListener('transitionEnd', (e) => {
        if (!e.data.closing) setAppearances((n) => n + 1);
      }),
    [navigation],
  );

  useEffect(() => {
    if (height > width) curtain.lower();
  }, [appearances, width, height, curtain]);
}
