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
  /** Text on ink fills (selected chips, ink buttons). Dark inverts it. */
  onInk: '#FFFFFF',
  /** Text on accent fills and on the Continue card's image scrim. White in both themes. */
  onAccent: '#FFFFFF',

  /** The one expressive color. One element per screen: the thing you'd tap. Fills only. */
  accent: '#6A4C7C',
  /** Accent as text or icon. Same as `accent` in light; lifted in dark so it stays readable. */
  accentInk: '#6A4C7C',
  /** Accent tint for badges and selected states. */
  accentTint: '#EFE7F2',

  /** The rotation curtain and the practice title card. Ink in light, the page in dark. */
  curtain: '#1E2433',
  /** Text on the curtain. */
  onCurtain: '#FFFFFF',
  /** The sheet's page. Light in both themes: the score is printed music, not chrome. */
  paper: '#F3F0F6',

  /** Hand colours. Defaults; the user picks from `handPalette` in Settings. */
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

/**
 * Dark: neutral charcoal, soft grey text, the same plum on fills. Chosen in
 * Paper ("Dark mode" page, Slack-style charcoal, S3). The muted surface is
 * darker than the page, as in light, so fields and segmented tracks keep
 * their relationship to the ground.
 */
export const darkColors: ThemeColors = {
  bg: '#26292E',
  surface: '#30343A',
  surfaceMuted: '#1F2226',
  border: '#44484F',

  ink: '#DADBDC',
  inkMuted: '#B3B4B6',
  inkFaint: '#8A8C90',
  onInk: '#26292E',
  onAccent: '#FFFFFF',

  accent: colors.accent,
  accentInk: '#B99BD0',
  accentTint: '#433A4B',

  curtain: '#26292E',
  onCurtain: '#DADBDC',
  paper: colors.paper,

  rightHand: colors.rightHand,
  leftHand: colors.leftHand,
  correct: colors.correct,
  wrong: colors.wrong,
  cursor: colors.cursor,
  loop: colors.loop,

  keyWhite: colors.keyWhite,
  keyBlack: colors.keyBlack,
  keyBorder: colors.keyBorder,
};

/** Colours a hand can wear. Green and red are kept for correct and wrong keys. */
export const handPalette = {
  cobalt: '#3B6FE0',
  violet: '#7B61C9',
  rose: '#D9587A',
  amber: '#E8853A',
  teal: '#2A9D8F',
} as const;

export type HandColorKey = keyof typeof handPalette;

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
  /** Section titles inside a screen ("Your pieces"). */
  section: { fontSize: 20, lineHeight: 26, letterSpacing: -0.1, weight: 'semibold' },
  subheading: { fontSize: 17, lineHeight: 22, letterSpacing: 0, weight: 'semibold' },
  /** Row titles in settings-style lists. */
  bodyLarge: { fontSize: 17, lineHeight: 22, letterSpacing: 0, weight: 'medium' },
  body: { fontSize: 15, lineHeight: 22, letterSpacing: 0, weight: 'regular' },
  bodyStrong: { fontSize: 15, lineHeight: 22, letterSpacing: 0, weight: 'medium' },
  caption: { fontSize: 13, lineHeight: 18, letterSpacing: 0, weight: 'regular' },
  label: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, weight: 'semibold' },
  /** Captions under icon buttons (practice header). Smallest text in the app. */
  micro: { fontSize: 11, lineHeight: 13, letterSpacing: 0.1, weight: 'semibold' },
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
export const darkTheme: Theme = { colors: darkColors, spacing, radius, fonts: systemFonts, type, shadows };
