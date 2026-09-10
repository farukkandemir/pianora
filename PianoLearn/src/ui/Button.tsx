import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';

type Variant = 'accent' | 'ink' | 'muted';
type Size = 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  /** accent = the one plum action on a screen; ink = structural; muted = secondary. */
  variant?: Variant;
  size?: Size;
  /** Leading or trailing icon node (an SVG or symbol). */
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  /** Stretch to the container width. */
  block?: boolean;
  style?: ViewStyle;
};

/** Pill button. Pressed state dims slightly and shrinks a hair, like a native control. */
export function Button({ label, variant = 'ink', size = 'lg', iconLeft, iconRight, block, disabled, style, ...rest }: ButtonProps) {
  const { colors, radius, spacing, shadows } = useTheme();
  const bg = variant === 'accent' ? colors.accent : variant === 'ink' ? colors.ink : colors.surfaceMuted;
  const tone = variant === 'muted' ? 'ink' : 'onInk';
  const height = size === 'lg' ? 54 : 44;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        { height, borderRadius: radius.pill, backgroundColor: bg, paddingHorizontal: spacing.xxl, gap: spacing.sm },
        variant === 'accent' && shadows.accent,
        block && styles.block,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {iconLeft ? <View>{iconLeft}</View> : null}
      <Text variant={size === 'lg' ? 'subheading' : 'bodyStrong'} tone={tone}>{label}</Text>
      {iconRight ? <View>{iconRight}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  block: { alignSelf: 'stretch' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
});
