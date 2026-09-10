import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/theme';

export type CardProps = ViewProps & {
  /** surface = white with hairline; muted = tinted panel; floating = white with shadow. */
  variant?: 'surface' | 'muted' | 'floating';
  /** Inner padding in theme spacing steps. Default lg (16). Use 0 for lists with their own rows. */
  padding?: number;
  radius?: 'lg' | 'xl';
};

/** The container everything sits in: list groups, hero, found device, tip boxes. */
export function Card({ variant = 'surface', padding, radius: r = 'lg', style, ...rest }: CardProps) {
  const theme = useTheme();
  const { colors, radius, spacing, shadows } = theme;
  const bg = variant === 'muted' ? colors.surfaceMuted : colors.surface;
  return (
    <View
      {...rest}
      style={[
        { backgroundColor: bg, borderRadius: radius[r], padding: padding ?? spacing.lg, overflow: variant === 'floating' ? 'visible' : 'hidden' },
        variant === 'surface' && { borderWidth: 1, borderColor: colors.border },
        variant === 'floating' && shadows.card,
        style,
      ]}
    />
  );
}
