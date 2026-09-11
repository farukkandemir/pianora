import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { handPalette, lightTheme, outfitFonts, systemFonts, type HandColorKey, type Theme } from './tokens';

/**
 * Web analogy: a CSS variables scope. Wrap the app once; every component
 * reads tokens with `useTheme()`. Swapping `theme` (e.g. for dark mode)
 * restyles everything beneath it.
 */
const ThemeContext = createContext<Theme>(lightTheme);

type Props = {
  theme?: Theme;
  /** True once the Outfit font files are loaded. Until then the system font is used. */
  fontsLoaded?: boolean;
  /** The user's hand colours; override the defaults in the token set. */
  hands?: { right: HandColorKey; left: HandColorKey };
  children: ReactNode;
};

export function ThemeProvider({ theme = lightTheme, fontsLoaded = false, hands, children }: Props) {
  const value = useMemo<Theme>(
    () => ({
      ...theme,
      fonts: fontsLoaded ? outfitFonts : systemFonts,
      colors: hands ? { ...theme.colors, rightHand: handPalette[hands.right], leftHand: handPalette[hands.left] } : theme.colors,
    }),
    [theme, fontsLoaded, hands],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
