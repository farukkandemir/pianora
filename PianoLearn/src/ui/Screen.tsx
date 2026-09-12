import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

export type ScreenProps = {
  children: ReactNode;
  /** Scrollable content (most screens). Off for screens that manage their own layout. */
  scroll?: boolean;
  /** Apply the standard horizontal inset. Default on. */
  inset?: boolean;
  /** Pad below the status bar. Turn off when a native header already does. Default on. */
  topInset?: boolean;
  style?: ViewStyle;
};

/**
 * Page background plus safe-area padding. Web analogy: the `<main>` with the
 * page background and container padding. Every portrait screen starts here.
 */
export function Screen({ children, scroll = true, inset = true, topInset = true, style }: ScreenProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const padding = { paddingTop: (topInset ? insets.top : 0) + spacing.sm, paddingHorizontal: inset ? spacing.screen : 0 };
  if (!scroll) {
    return <View style={[styles.fill, { backgroundColor: colors.bg }, padding, style]}>{children}</View>;
  }
  return (
    <ScrollView
      style={[styles.fill, { backgroundColor: colors.bg }]}
      contentContainerStyle={[padding, { paddingBottom: insets.bottom + spacing.xxl }, style]}
      contentInsetAdjustmentBehavior="never"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
