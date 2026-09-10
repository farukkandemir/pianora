import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { useTheme, type Theme } from '@/theme';

export type IconName = ComponentProps<typeof Feather>['name'];
type Tone = 'ink' | 'muted' | 'faint' | 'accent' | 'onInk';

export type IconProps = {
  name: IconName;
  size?: number;
  tone?: Tone;
  /** Override the tone with an explicit theme color key (e.g. 'correct'). */
  color?: keyof Theme['colors'];
};

const toneColor: Record<Tone, keyof Theme['colors']> = {
  ink: 'ink', muted: 'inkMuted', faint: 'inkFaint', accent: 'accent', onInk: 'onInk',
};

/** Feather outline icons, colored from the theme. */
export function Icon({ name, size = 20, tone = 'ink', color }: IconProps) {
  const { colors } = useTheme();
  return <Feather name={name} size={size} color={colors[color ?? toneColor[tone]]} />;
}
