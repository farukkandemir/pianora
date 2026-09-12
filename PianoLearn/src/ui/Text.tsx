import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { useTheme, type Theme, type TypeStyle } from '@/theme';

type Tone = 'ink' | 'muted' | 'faint' | 'accent' | 'onInk' | 'onAccent' | 'onCurtain';

export type TextProps = RNTextProps & {
  /** Type scale entry. Default: body. */
  variant?: TypeStyle;
  /** Color role. Default: ink. */
  tone?: Tone;
  center?: boolean;
};

const toneColor: Record<Tone, keyof Theme['colors']> = {
  ink: 'ink',
  muted: 'inkMuted',
  faint: 'inkFaint',
  accent: 'accentInk',
  onInk: 'onInk',
  onAccent: 'onAccent',
  onCurtain: 'onCurtain',
};

/** Weight the system font should use when Outfit isn't loaded yet. */
const systemWeight = { regular: '400', medium: '500', semibold: '600' } as const;

/**
 * The only way text is rendered in the app. Picks size, line height, weight,
 * and color from the theme so screens never set those by hand.
 */
export function Text({ variant = 'body', tone = 'ink', center, style, ...rest }: TextProps) {
  const theme = useTheme();
  const t = theme.type[variant];
  const fontFamily = theme.fonts[t.weight];
  const base: TextStyle = {
    fontSize: t.fontSize,
    lineHeight: t.lineHeight,
    letterSpacing: t.letterSpacing,
    color: theme.colors[toneColor[tone]],
    ...(fontFamily ? { fontFamily } : { fontWeight: systemWeight[t.weight] }),
    ...(variant === 'label' ? { textTransform: 'uppercase' } : null),
    ...(center ? { textAlign: 'center' } : null),
  };
  return <RNText {...rest} style={[base, style]} />;
}
