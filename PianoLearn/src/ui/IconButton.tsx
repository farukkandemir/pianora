import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

type Variant = 'ink' | 'surface' | 'muted' | 'accent';

export type IconButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  icon: ReactNode;
  /** accent = plum (the Library "+"); ink = filled navy; surface = white with border; muted = tinted. */
  variant?: Variant;
  size?: number;
  style?: ViewStyle;
  accessibilityLabel: string;
};

/** Round icon-only button. Always give it an accessibilityLabel; it has no visible text. */
export function IconButton({ icon, variant = 'surface', size = 40, style, ...rest }: IconButtonProps) {
  const { colors, radius } = useTheme();
  const bg = { ink: colors.ink, surface: colors.surface, muted: colors.surfaceMuted, accent: colors.accent }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={6}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: radius.pill, backgroundColor: bg },
        variant === 'surface' && { borderWidth: 1, borderColor: colors.border },
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
});
