import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, useFonts } from '@expo-google-fonts/outfit';

/**
 * Loads the app font at runtime. Returns false until ready; the ThemeProvider
 * falls back to the system font meanwhile, so the UI never blocks on fonts.
 * Web analogy: `font-display: swap`.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({ Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold });
  if (error) console.warn('Font load failed, using system font', error);
  return loaded;
}
