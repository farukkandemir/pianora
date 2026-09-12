import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Appearance, StatusBar, useColorScheme } from 'react-native';

import { SettingsProvider, useSettings } from '@/data/useSettings';
import { useMidiAutoReconnect } from '@/practice/useMidiAutoReconnect';
import { darkTheme, lightTheme, ThemeProvider, useAppFonts, useTheme } from '@/theme';
import { CurtainProvider } from '@/ui';

// Hold the splash until settings are read, so a forced theme never flashes the other one.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <SettingsProvider>
      <App />
    </SettingsProvider>
  );
}

/** Below SettingsProvider: the theme takes the hand colours and the scheme, reconnect takes its switch. */
function App() {
  const { settings, loaded } = useSettings();
  const fontsLoaded = useAppFonts();
  // Wait for the saved switch: firing on the default would reconnect even when it is off.
  useMidiAutoReconnect(loaded && settings.autoReconnect);

  // Resolve from the setting itself; the hook only matters when following the phone.
  const system = useColorScheme();
  const scheme = settings.theme === 'system' ? (system ?? 'light') : settings.theme;

  // Force the native scheme too, so alerts, menus, the keyboard, and modals follow the choice.
  useEffect(() => {
    if (!loaded) return;
    Appearance.setColorScheme(settings.theme === 'system' ? 'unspecified' : settings.theme);
    SplashScreen.hideAsync().catch(() => {});
  }, [loaded, settings.theme]);

  return (
    <ThemeProvider theme={scheme === 'dark' ? darkTheme : lightTheme} fontsLoaded={fontsLoaded} hands={{ right: settings.rightHand, left: settings.leftHand }}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <CurtainProvider>
        <Navigator dark={scheme === 'dark'} />
      </CurtainProvider>
    </ThemeProvider>
  );
}

/**
 * The navigator, themed from the tokens. The native stack paints its own
 * container behind screens during transitions, so it needs the page colour
 * too; contentStyle alone leaves react-navigation's light grey showing
 * through the practice fade and the add-music sheet.
 */
function Navigator({ dark }: { dark: boolean }) {
  const { colors } = useTheme();
  const base = dark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    dark,
    colors: { ...base.colors, background: colors.bg, card: colors.surface, text: colors.ink, border: colors.border, primary: colors.accent, notification: colors.wrong },
  };

  // The window colour that peeks during the landscape rotation and modal dismissal.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors.bg]);

  return (
    <NavigationThemeProvider value={navTheme}>
      <Stack screenOptions={{ orientation: 'portrait', contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-music" options={{ headerShown: false, presentation: 'modal' }} />
        {/*
          Practice is the one landscape screen. It is presented as a
          full-screen modal, not pushed: iOS only honours a screen's own
          orientation for the root or a full-screen modal, so this is the
          native way to open a screen already rotated. Cross-fade instead of
          slide; the curtain (see ui/Curtain) hides the rotation itself.
        */}
        <Stack.Screen
          name="song/[id]"
          options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'fade', orientation: 'landscape' }}
        />
      </Stack>
    </NavigationThemeProvider>
  );
}
