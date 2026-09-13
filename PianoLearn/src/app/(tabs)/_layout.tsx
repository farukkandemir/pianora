import { Tabs, useNavigation, type NativeStackNavigationProp } from 'expo-router';
import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { TabBar, type TabSpec } from '@/components/TabBar';
import { useTheme } from '@/theme';
import { useCurtain } from '@/ui';

const TABS: TabSpec[] = [
  { name: 'index', title: 'Library', sf: 'music.note.list', sfSelected: 'music.note.list', icon: 'home' },
  { name: 'connect', title: 'Connect', sf: 'pianokeys', sfSelected: 'pianokeys.inverse', icon: 'bluetooth' },
  { name: 'browse', title: 'Browse', sf: 'square.grid.2x2', sfSelected: 'square.grid.2x2.fill', icon: 'compass' },
  { name: 'settings', title: 'Settings', sf: 'gearshape', sfSelected: 'gearshape.fill', icon: 'settings' },
];

type RootStackNavigation = NativeStackNavigationProp<Record<string, object | undefined>>;

/** Bottom tabs with our own floating bar (see components/TabBar). Web analogy: the app shell's primary nav. */
export default function TabsLayout() {
  const { colors } = useTheme();
  useLowerCurtainWhenBackInPortrait();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} tabs={TABS} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.title }} />
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
