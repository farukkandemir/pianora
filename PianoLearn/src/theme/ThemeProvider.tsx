import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { lightTheme, outfitFonts, systemFonts, type Theme } from './tokens';

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
  children: ReactNode;
};

export function ThemeProvider({ theme = lightTheme, fontsLoaded = false, children }: Props) {
  const value = useMemo<Theme>(
    () => ({ ...theme, fonts: fontsLoaded ? outfitFonts : systemFonts }),
    [theme, fontsLoaded],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
