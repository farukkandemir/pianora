import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';

export type ChipProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  /** Selected chips fill with ink; unselected sit on a muted surface. */
  selected?: boolean;
  /** Accent chips are the tinted plum kind, e.g. "Wait Mode". */
  accent?: boolean;
  icon?: ReactNode;
};

/** Small pill for filters and modes. */
export function Chip({ label, selected, accent, icon, ...rest }: ChipProps) {
  const { colors, radius, spacing } = useTheme();
  const bg = accent ? colors.accentTint : selected ? colors.ink : colors.surface;
  const tone = accent ? 'accent' : selected ? 'onInk' : 'ink';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        { borderRadius: radius.pill, backgroundColor: bg, paddingHorizontal: spacing.lg, gap: spacing.sm },
        !selected && !accent && { borderWidth: 1, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      {icon}
      <Text variant="caption" tone={tone} style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, lineHeight: 18 },
  pressed: { opacity: 0.8 },
});
