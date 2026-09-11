import { Stack } from 'expo-router';

import { SettingsProvider, useSettings } from '@/data/useSettings';
import { useMidiAutoReconnect } from '@/practice/useMidiAutoReconnect';
import { ThemeProvider, useAppFonts } from '@/theme';
import { CurtainProvider } from '@/ui';

export default function RootLayout() {
  return (
    <SettingsProvider>
      <App />
    </SettingsProvider>
  );
}

/** Below SettingsProvider: the theme takes the hand colours, reconnect takes its switch. */
function App() {
  const { settings } = useSettings();
  const fontsLoaded = useAppFonts();
  useMidiAutoReconnect(settings.autoReconnect);
  return (
    <ThemeProvider fontsLoaded={fontsLoaded} hands={{ right: settings.rightHand, left: settings.leftHand }}>
      <CurtainProvider>
        <Stack screenOptions={{ orientation: 'portrait' }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="midi-setup" options={{ title: 'MIDI setup' }} />
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
      </CurtainProvider>
    </ThemeProvider>
  );
}
