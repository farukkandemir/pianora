/**
 * Design tokens. The single place the app's look is defined.
 *
 * Web analogy: this is the `:root { --color-... }` block plus tailwind.config's
 * theme section. Components read these through `useTheme()`; screens never
 * hard-code a color, size, or radius.
 *
 * To restyle the app, edit values here. To add dark mode, add a second
 * `ThemeColors` object and let ThemeProvider pick it.
 */

export const colors = {
  /** Screen background. Near white with a whisper of the accent hue. */
  bg: '#FCFBFD',
  /** Cards, sheets, list surfaces. */
  surface: '#FFFFFF',
  /** Chips, fields, quiet panels. */
  surfaceMuted: '#F3F0F6',
  /** Hairlines and card borders. */
  border: '#E9E5EE',

  /** Primary text, and structural primary (buttons, active tab). */
  ink: '#1E2433',
  /** Secondary text. */
  inkMuted: '#6E6480',
  /** Placeholders, chevrons, inactive icons. */
  inkFaint: '#AFA6BB',
  /** Text on ink or accent fills. */
  onInk: '#FFFFFF',

  /** The one expressive color. One element per screen: the thing you'd tap. */
  accent: '#6A4C7C',
  /** Accent tint for badges and selected states. */
  accentTint: '#EFE7F2',

  /** Functional colors. Fixed; shared by keyboard and sheet. */
  rightHand: '#3B6FE0',
  leftHand: '#E8853A',
  correct: '#2FA36B',
  wrong: '#E5484D',
  /** Score cursor band and loop band (with alpha). */
  cursor: 'rgba(59,111,224,0.18)',
  loop: 'rgba(232,133,58,0.12)',

  /** On-screen keyboard. */
  keyWhite: '#FFFFFF',
  keyBlack: '#1E2433',
  keyBorder: '#D9D4DE',
} as const;

export type ThemeColors = { [K in keyof typeof colors]: string };

/** Spacing scale in points. Web: 4px grid. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  /** Standard horizontal screen inset. */
  screen: 20,
} as const;

export const radius = {
  sm: 10,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

/**
 * Font families, keyed by weight. `undefined` means "system font at that
 * weight", which is what the app uses until Outfit has loaded, so nothing
 * ever renders with a missing font.
 */
export type ThemeFonts = { regular?: string; medium?: string; semibold?: string };

export const outfitFonts: Required<ThemeFonts> = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
};

export const systemFonts: ThemeFonts = {};

/** Type scale: size, line height, and which font weight. */
export const type = {
  display: { fontSize: 34, lineHeight: 40, letterSpacing: -0.6, weight: 'semibold' },
  title: { fontSize: 30, lineHeight: 36, letterSpacing: -0.3, weight: 'semibold' },
  heading: { fontSize: 22, lineHeight: 28, letterSpacing: -0.2, weight: 'semibold' },
  subheading: { fontSize: 17, lineHeight: 22, letterSpacing: 0, weight: 'semibold' },
  body: { fontSize: 15, lineHeight: 22, letterSpacing: 0, weight: 'regular' },
  bodyStrong: { fontSize: 15, lineHeight: 22, letterSpacing: 0, weight: 'medium' },
  caption: { fontSize: 13, lineHeight: 18, letterSpacing: 0, weight: 'regular' },
  label: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, weight: 'semibold' },
} as const;

export type TypeStyle = keyof typeof type;

export const shadows = {
  /** Cards that float: hero, found-device, practice panel. */
  card: {
    shadowColor: '#1E2433',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  /** Accent buttons and badges. */
  accent: {
    shadowColor: '#6A4C7C',
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

export type Theme = {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  fonts: ThemeFonts;
  type: typeof type;
  shadows: typeof shadows;
};

export const lightTheme: Theme = { colors, spacing, radius, fonts: systemFonts, type, shadows };
