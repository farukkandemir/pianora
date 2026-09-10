import { Stack } from 'expo-router';

import { useMidiAutoReconnect } from '@/practice/useMidiAutoReconnect';
import { ThemeProvider, useAppFonts } from '@/theme';

export default function RootLayout() {
  useMidiAutoReconnect();
  const fontsLoaded = useAppFonts();
  return (
    <ThemeProvider fontsLoaded={fontsLoaded}>
      <Stack screenOptions={{ orientation: 'portrait' }}>
        <Stack.Screen name="index" options={{ title: 'Songs' }} />
        <Stack.Screen name="midi-setup" options={{ title: 'MIDI setup' }} />
        <Stack.Screen name="song/[id]" options={{ title: 'Song', orientation: 'landscape' }} />
      </Stack>
    </ThemeProvider>
  );
}
