/**
 * The tab bar as a pill inset from the screen edges, on the page colour,
 * with content ending above it. Icons are SF Symbols (Feather on other platforms)
 * and the selected one bounces, the two things worth keeping from the
 * native iOS 26 bar. Colours come from the tokens so themes switch cleanly.
 */
import type { Tabs } from 'expo-router';
import { SymbolView, type AnimationSpec, type SFSymbol } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { Icon, Text, type IconName } from '@/ui';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export type TabSpec = { name: string; title: string; sf: SFSymbol; sfSelected: SFSymbol; icon: IconName };

export const TAB_BAR_HEIGHT = 64;
const SIDE = 16;
const BOUNCE: AnimationSpec = { effect: { type: 'bounce', direction: 'up' } };

export function TabBar({ state, navigation, tabs }: TabBarProps & { tabs: TabSpec[] }) {
  const { colors, radius, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.outer, { backgroundColor: colors.bg, paddingHorizontal: SIDE, paddingBottom: Math.max(insets.bottom - 12, 10) }]}>
      <View style={[styles.pill, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.pill }, shadows.card]}>
        {state.routes.map((route, index) => {
          const tab = tabs.find((t) => t.name === route.name);
          if (!tab) return null;
          const focused = state.index === index;
          const color = focused ? colors.accentInk : colors.inkMuted;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tab.title}
              onPress={onPress}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <SymbolView
                name={focused ? tab.sfSelected : tab.sf}
                size={24}
                tintColor={color}
                animationSpec={focused ? BOUNCE : undefined}
                fallback={<Icon name={tab.icon} size={22} tone={focused ? 'accent' : 'muted'} />}
                style={styles.symbol}
              />
              <Text variant="micro" tone={focused ? 'accent' : 'muted'}>{tab.title}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { paddingTop: 6 },
  pill: { height: TAB_BAR_HEIGHT, flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 6 },
  item: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center', gap: 4 },
  symbol: { width: 26, height: 26 },
  pressed: { opacity: 0.6 },
});
